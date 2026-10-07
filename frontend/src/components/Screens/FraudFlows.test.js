import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import axios from 'axios';
import FraudBatchCheck from './FraudBatchCheck';
import FraudSimulation from './FraudSimulation';
import VerificationAdmin from './VerificationAdmin';

jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn(), isCancel: jest.fn(() => false) }));
jest.mock('antd', () => ({ Modal: ({ open, children, onCancel }) => open ? <div role="dialog"><button onClick={onCancel}>Close results</button>{children}</div> : null }));
const transaction = { transaction_id: 'TXN100004', passenger_id: 'PSG1', passenger_name: 'Sample Passenger', ticket_type: 'Full Fare', route: 'Colombo Fort - Kandy', date: '2024-05-10', time: '14:30', travel_class: '3rd Class', seat_number: null, is_fraud: 0 };
const verification = { ticket_status: 'Valid — demo checks', ticket_usage: 'First Use', ticket_scan_count: 1, inspection_status: 'Not Inspected', fraud_status: 'Clear', fraud_types: [], concession_required: false, acceptance_blocked: false };
const result = { success: true, transaction, verification, state: { state_version: 0 }, assessment: null, reasons: ['Ticket Reuse', 'Abnormal Concession Usage', 'Other'] };
const history = { success: true, records: [], total: 0, page: 1, page_size: 10 };
const options = { success: true, routes: ['Colombo Fort - Kandy', 'Vavuniya - Colombo Fort'], historical_dates: { 'Colombo Fort - Kandy': ['2024-05-10'] }, today: '2026-10-06' };
const record = { verification_id: 'event1', transaction_id: transaction.transaction_id, verification_status: 'Verified', inspector_action: 'Accept', actor_user_id: 1, actor_name: 'Demo Inspector', eligibility_result: 'not_required', before_state: { ticket_scan_count: 1 }, after_state: { ticket_scan_count: 2 }, verified_at: '2026-10-06T00:00:00.000Z', verification_result: { fraud_status: 'Clear', fraud_types: [] }, can_void: true };
const search = (id = 'TXN100004') => {
  fireEvent.change(screen.getByLabelText('Transaction ID'), { target: { value: id } });
  fireEvent.submit(screen.getByRole('button', { name: 'Verify Ticket' }).closest('form'));
};
const lookupMock = value => axios.get.mockImplementation(url => Promise.resolve({ data: url.includes('/history') ? history : value }));
const fillSimulation = async (count = '40') => {
  await screen.findByRole('option', { name: 'Colombo Fort - Kandy' });
  fireEvent.change(screen.getByLabelText('Train route'), { target: { value: 'Colombo Fort - Kandy' } });
  fireEvent.change(screen.getByLabelText('Simulation date'), { target: { value: '2099-10-16' } });
  fireEvent.change(screen.getByLabelText('Number of passengers'), { target: { value: count } });
};
beforeAll(() => { Object.defineProperty(window, 'crypto', { value: { getRandomValues: bytes => require('crypto').randomFillSync(bytes) }, configurable: true }); });
beforeEach(() => { jest.resetAllMocks(); localStorage.setItem('id', '1'); window.history.replaceState({}, '', '/'); axios.get.mockResolvedValue({ data: options }); });

test('blank lookup validates without requests', () => {
  render(<FraudBatchCheck />); search('  ');
  expect(screen.getByRole('alert')).toHaveTextContent('Enter a Transaction ID');
  expect(axios.get).not.toHaveBeenCalled();
});
test('database lookup exposes operational checks without inventing ML or journey risk', async () => {
  lookupMock(result); render(<FraudBatchCheck />); search(' txn100004 ');
  await screen.findByText('Sample Passenger');
  expect(axios.get.mock.calls[0][0]).toBe('http://localhost:4000/passenger-verification/transaction');
  expect(axios.get.mock.calls[0][1].params.transaction_id).toBe('TXN100004');
  expect(screen.getByText(/Not Assessed/)).toBeInTheDocument();
  expect(screen.getByText('Not Assigned')).toBeInTheDocument();
  expect(screen.getByText('Journey Risk Unavailable')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Accept Ticket' })).toBeEnabled();
  expect(screen.queryByRole('button', { name: /Void/ })).not.toBeInTheDocument();
});
test('accept saves one decision, confirms count and explicit re-verification shows reuse', async () => {
  lookupMock(result); axios.post.mockResolvedValue({ data: { success: true, record } });
  render(<FraudBatchCheck />); search(); await screen.findByText('Sample Passenger');
  fireEvent.click(screen.getByRole('button', { name: 'Accept Ticket' }));
  await screen.findByText('Decision saved: Verified');
  expect(screen.getByText(/Scan count: 1 → 2/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Accept Ticket' })).toBeDisabled();
  expect(axios.post.mock.calls[0][1]).toMatchObject({ action: 'Accept', expected_version: 0, actor_user_id: 1 });
  lookupMock({ ...result, verification: { ...verification, ticket_scan_count: 2, ticket_usage: 'Already Used', fraud_status: 'Flagged', fraud_types: ['Ticket Reuse'], acceptance_blocked: true } });
  search(); await screen.findByText(/Already Used/);
  expect(axios.post).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Accept Ticket' })).toBeDisabled();
});
test('network retry reuses decision ID; eligibility and reasons are persisted', async () => {
  lookupMock({ ...result, verification: { ...verification, concession_required: true } });
  axios.post.mockRejectedValue({ request: {} });
  render(<FraudBatchCheck />); search(); await screen.findByText('Sample Passenger');
  expect(screen.getByRole('button', { name: 'Accept Ticket' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Concession eligibility'), { target: { value: 'ineligible' } });
  fireEvent.click(screen.getByRole('button', { name: 'Flag Ticket' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Choose a reason');
  fireEvent.change(screen.getByLabelText('Flag / rejection reason'), { target: { value: 'Other' } });
  fireEvent.change(screen.getByLabelText('Remarks (required for Other)'), { target: { value: 'Document does not match' } });
  fireEvent.click(screen.getByRole('button', { name: 'Flag Ticket' }));
  await screen.findByText(/Unable to confirm the saved decision/);
  fireEvent.click(screen.getByRole('button', { name: 'Flag Ticket' }));
  await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(2));
  expect(axios.post.mock.calls[0][1]).toEqual(axios.post.mock.calls[1][1]);
  expect(axios.post.mock.calls[1][1]).toMatchObject({ eligibility: 'ineligible', remarks: 'Document does not match' });
});
test.each([[404, 'Transaction not found'], [503, 'Verification service unavailable']])('lookup error %s', async (status, text) => {
  axios.get.mockRejectedValue({ response: { status } }); render(<FraudBatchCheck />); search();
  expect(await screen.findByRole('alert')).toHaveTextContent(text);
});
test('stale responses cannot replace a new lookup', async () => {
  let resolveOld;
  axios.get.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
  render(<FraudBatchCheck />); search('OLD');
  lookupMock({ ...result, transaction: { ...transaction, passenger_name: 'Newest Passenger' } });
  search('NEW'); await screen.findByText('Newest Passenger');
  await act(async () => resolveOld({ data: result }));
  expect(screen.queryByText('Sample Passenger')).not.toBeInTheDocument();
});
test('administration void requires reason and displays retained audit', async () => {
  axios.get.mockResolvedValue({ data: { ...history, records: [record], total: 1 } });
  axios.post.mockResolvedValue({ data: { success: true } });
  render(<VerificationAdmin />); fireEvent.click(await screen.findByRole('button', { name: 'Void Decision' }));
  fireEvent.submit(screen.getByRole('button', { name: 'Confirm Void' }).closest('form'));
  expect(screen.getByRole('alert')).toHaveTextContent('Enter a correction reason');
  fireEvent.change(screen.getByLabelText('Correction reason'), { target: { value: 'Incorrect ticket selected' } });
  axios.get.mockResolvedValue({ data: { ...history, records: [{ ...record, voided_at: record.verified_at, voided_by_name: 'Demo Inspector', void_reason: 'Incorrect ticket selected' }], total: 1 } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm Void' }));
  await screen.findByText('· Voided');
  expect(axios.post.mock.calls[0][1]).toEqual({ actor_user_id: 1, reason: 'Incorrect ticket selected' });
});
test.each(['0', '1.5', '2001'])('simulation rejects count %s', async count => {
  render(<FraudSimulation />); await fillSimulation(count);
  fireEvent.submit(screen.getByRole('button', { name: 'Run Simulation' }).closest('form'));
  expect(screen.getByRole('alert')).toHaveTextContent('whole number between 1 and 2,000');
  expect(axios.post).not.toHaveBeenCalled();
});
test('future mode rejects past date', async () => {
  render(<FraudSimulation />); await fillSimulation();
  fireEvent.change(screen.getByLabelText('Simulation date'), { target: { value: '2024-05-10' } });
  fireEvent.click(screen.getByRole('button', { name: 'Run Simulation' }));
  expect(screen.getByRole('alert')).toHaveTextContent('today or a future date');
});
test('historical shortcut saves through Node, blocks duplicates and shows saved badge', async () => {
  window.history.replaceState({}, '', '/FraudDashboard?mode=historical_replay&route=Colombo+Fort+-+Kandy&date=2024-05-10&transaction_id=TXN100004');
  let resolveRequest; axios.post.mockImplementation(() => new Promise(resolve => { resolveRequest = resolve; }));
  render(<FraudSimulation />); await screen.findByRole('option', { name: '2024-05-10' });
  const form = screen.getByRole('button', { name: 'Run Simulation' }).closest('form');
  fireEvent.submit(form); fireEvent.submit(form);
  expect(axios.post).toHaveBeenCalledTimes(1);
  expect(axios.post.mock.calls[0][0]).toBe('http://localhost:4000/journey-predictions');
  expect(axios.post.mock.calls[0][1]).toMatchObject({ train_route: 'Colombo Fort - Kandy', date: '2024-05-10', mode: 'historical_replay', n_passengers: 40 });
  await act(async () => resolveRequest({ data: { success: true,
    journey_prediction: { mode: 'historical_replay', risk_tier: 'High', mean_risk_score: .8, created_at: record.verified_at },
    summary: { train_route: 'Colombo Fort - Kandy', date: '2024-05-10', day_of_week: 'Friday', total_passengers: 40, predicted_fraud_count: 1, fraud_rate_pct: 2.5, risk_tier_breakdown: { 'Low Risk': 39, 'High Risk': 1 }, fraud_type_breakdown: { 'Ticket Reuse': 1 } },
    predictions: [{ transaction_id: 'SIM1', ensemble_risk_score: .8, risk_tier: 'High Risk', is_flagged_fraud: true, likely_fraud_type: 'Ticket Reuse' }],
  } }));
  const modal = within(screen.getByRole('dialog'));
  expect(modal.getByText(/Saved · Simulation Journey Risk: High/)).toBeInTheDocument();
  expect(modal.getByText('2.5%')).toBeInTheDocument();
  expect(modal.getByText('Risk Score (0–1)')).toBeInTheDocument();
});
test('options failure provides retry', async () => {
  axios.get.mockRejectedValueOnce({ request: {} }); render(<FraudSimulation />);
  await screen.findByRole('alert'); expect(screen.getByRole('button', { name: 'Run Simulation' })).toBeDisabled();
  axios.get.mockResolvedValue({ data: options }); fireEvent.click(screen.getByRole('button', { name: 'Retry Options' }));
  await screen.findByRole('option', { name: 'Colombo Fort - Kandy' });
  expect(screen.getByRole('button', { name: 'Run Simulation' })).toBeEnabled();
});
