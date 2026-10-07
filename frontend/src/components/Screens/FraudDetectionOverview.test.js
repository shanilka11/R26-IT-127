import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import axios from 'axios';
import FraudDetectionOverview from './FraudDetectionOverview';

jest.mock('axios', () => ({ get: jest.fn() }));
// Keep real chart rendering while supplying dimensions unavailable in JSDOM.
jest.mock('recharts', () => {
  const React = require('react');
  return { ...jest.requireActual('recharts'), ResponsiveContainer: ({ children }) => React.cloneElement(children, { width: 380, height: 240 }) };
});

const fixture = (overrides = {}) => ({
  success: true,
  summary: { total_ticket_transactions: 2750, flagged_anomalies: 386, high_risk_passengers: 136, fraud_detection_rate_pct: 90.35 },
  available_date_range: { start_date: '2024-01-01', end_date: '2024-12-31' },
  applied_filters: { start_date: '2024-01-01', end_date: '2024-12-31', search: '' },
  model_performance: { sample_count: 2750, risk_threshold: 45, precision_pct: 60.62, recall_pct: 90.35, f1_pct: 72.56, roc_auc: .9583, evaluation: 'historical' },
  fraud_detection_trend: [{ month: '2024-01', total_transactions: 200, actual_fraud: 25 }],
  fraud_type_distribution: { 'Ticket Reuse': 101, Unclassified: 156 },
  ticket_category_distribution: { 'Full Fare': 1402, 'Student Concession': 424 },
  fraud_by_route: [{ route: 'Colombo Fort - Kandy', total: 100, flagged: 20, fraud_rate_pct: 20 }],
  recent_fraud_alerts: [{ transaction_id: 'TXN107055', passenger_name: 'Sample Passenger', date: '2024-05-10', route: 'Colombo Fort - Kandy', risk_score: 80, suspected_fraud_type: 'Ticket Reuse' }],
  ...overrides,
});
const response = (body = fixture()) => ({ data: body });
const filteredFixture = () => fixture({
  summary: { total_ticket_transactions: 38, flagged_anomalies: 9, high_risk_passengers: 3, fraud_detection_rate_pct: 83.33 },
  applied_filters: { start_date: '2024-01-01', end_date: '2024-12-31', search: 'kandy' },
  model_performance: { sample_count: 38, risk_threshold: 45, precision_pct: 55.56, recall_pct: 83.33, f1_pct: 66.67, roc_auc: .9740, evaluation: 'historical' },
  fraud_detection_trend: [{ month: '2024-01', total_transactions: 38 }],
  fraud_type_distribution: { 'Abnormal Concession Usage': 1, 'Suspicious Resale': 2, 'Ticket Reuse': 2, Unclassified: 4 },
  ticket_category_distribution: { 'Full Fare': 23, 'Season Ticket': 7, 'Student Concession': 2, 'Senior Citizen Concession': 3, 'Government Employee Concession': 2, 'Disability Concession': 1 },
  fraud_by_route: [{ route: 'Colombo Fort - Kandy', total: 22, flagged: 5, fraud_rate_pct: 22.73 }, { route: 'Kandy - Badulla (Upcountry local)', total: 16, flagged: 4, fraud_rate_pct: 25 }],
  recent_fraud_alerts: [{ transaction_id: 'TXN_FILTERED', passenger_name: 'Filtered Passenger', date: '2024-01-10', route: 'Colombo Fort - Kandy', risk_score: 81, suspected_fraud_type: 'Ticket Reuse' }],
});
const apply = () => fireEvent.submit(screen.getByRole('form', { name: 'Dashboard search' }));
const ready = () => screen.findByText('386');
const pending = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

beforeEach(() => { axios.get.mockReset(); });

test('renders real API counts, charts, historical metrics and existing details', async () => {
  axios.get.mockResolvedValue(response());
  render(<FraudDetectionOverview />);
  await ready();
  expect(axios.get.mock.calls[0][0]).toBe('http://localhost:5555/fraud-detection/overview');
  expect(axios.get.mock.calls[0][1].params).toEqual({ search: '' });
  expect(screen.queryByLabelText('Reporting period')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Start date')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('End date')).not.toBeInTheDocument();
  expect(screen.queryByText('About available dates')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
  const form = screen.getByRole('form', { name: 'Dashboard search' });
  expect(within(form).getAllByRole('button')).toHaveLength(1);
  expect(within(form).getByRole('button', { name: 'Apply' })).toBeInTheDocument();
  expect(screen.queryByText(/Historical saved assessments/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Historical assessed transactions available/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Showing .*matching assessed transactions/)).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Assessed Ticket Transactions' })).not.toBeInTheDocument();
  expect(screen.queryByText(/Filters changed/)).not.toBeInTheDocument();
  expect(screen.getByText('386')).toBeInTheDocument();
  expect(screen.getByText('136')).toBeInTheDocument();
  expect(screen.getAllByText('90.35%')).toHaveLength(2);
  expect(screen.getByText('60.62%')).toBeInTheDocument();
  expect(screen.getByText('72.56%')).toBeInTheDocument();
  expect(screen.getByText('0.9583')).toBeInTheDocument();
  expect(screen.getByText(/do not establish held-out or production performance/)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Ticket Category Distribution' })).toBeInTheDocument();
  const transactions = screen.getByRole('heading', { name: 'Ticket Transactions Over Time' }).closest('section');
  expect(within(transactions).getByText('200', { selector: 'strong' })).toBeInTheDocument();
  expect(within(transactions).queryByText('25')).not.toBeInTheDocument();
  expect(within(transactions).queryByText('View ticket transactions over time data')).not.toBeInTheDocument();
  expect(within(transactions).getByRole('list', { name: 'Ticket Transactions Over Time values' })).toHaveClass('fd-overview-sr-only');
  expect(transactions.querySelector('.recharts-area')).not.toBeNull();
  expect(screen.getByText('View suspected fraud types data')).toBeInTheDocument();
  expect(document.querySelectorAll('.recharts-surface')).toHaveLength(3);
  expect(screen.getByRole('region', { name: 'Recent High-risk Alerts table' })).toHaveTextContent('TXN107055');
});

test('applies search across all dates, updates every section, and restores all records when cleared', async () => {
  const request = pending();
  axios.get.mockResolvedValueOnce(response()).mockReturnValueOnce(request.promise).mockResolvedValueOnce(response());
  render(<FraudDetectionOverview />);
  await ready();
  fireEvent.change(screen.getByLabelText('Search transactions'), { target: { value: '  kandy  ' } });
  expect(screen.getByText('386')).toBeInTheDocument();
  expect(axios.get).toHaveBeenCalledTimes(1);
  apply();
  expect(screen.queryByText('386')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Loading dashboard');
  expect(axios.get.mock.calls[1][1].params).toEqual({ search: 'kandy' });
  await act(async () => request.resolve(response(filteredFixture())));
  expect(screen.queryByText(/Filters changed/)).not.toBeInTheDocument();
  const card = (title) => screen.getByRole('heading', { name: title }).closest('section');
  expect(within(card('Flagged Anomalies')).getByText('9')).toBeInTheDocument();
  expect(within(card('High Risk Passenger Alerts')).getByText('3')).toBeInTheDocument();
  expect(within(card('Fraud Detection Rate')).getByText('83.33%')).toBeInTheDocument();
  expect(within(card('Ticket Transactions Over Time')).getByText('38', { selector: 'strong' })).toBeInTheDocument();
  expect(within(card('Suspected Fraud Types')).getByText('4', { selector: 'strong' })).toBeInTheDocument();
  expect(within(card('Ticket Category Distribution')).getByText('23', { selector: 'strong' })).toBeInTheDocument();
  const performance = within(card('Historical Model Performance'));
  for (const value of ['55.56%', '83.33%', '66.67%', '0.9740']) expect(performance.getByText(value)).toBeInTheDocument();
  expect(performance.getByText(/evaluation of 38 saved assessments/)).toBeInTheDocument();
  expect(within(card('Fraud by Route')).getByText('5 flagged / 22 assessed')).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Recent High-risk Alerts table' })).toHaveTextContent('TXN_FILTERED');
  expect(screen.queryByText('TXN107055')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Search transactions'), { target: { value: '   ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
  await ready();
  expect(screen.getByLabelText('Search transactions')).toHaveValue('   ');
  expect(screen.queryByLabelText('Start date')).not.toBeInTheDocument();
  expect(axios.get.mock.calls[2][1].params).toEqual({ search: '' });
  expect(screen.queryByText(/Filters changed/)).not.toBeInTheDocument();
});

test('typing and clearing search does not fetch until Apply is selected', async () => {
  axios.get.mockResolvedValue(response());
  render(<FraudDetectionOverview />);
  await ready();
  fireEvent.change(screen.getByLabelText('Search transactions'), { target: { value: 'Kandy' } });
  expect(screen.getByText('386')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Search transactions'), { target: { value: '   ' } });
  expect(screen.queryByText(/Filters changed/)).not.toBeInTheDocument();
  expect(axios.get).toHaveBeenCalledTimes(1);
});

test('ignores an older response after a newer search completes', async () => {
  const older = pending();
  const newer = pending();
  axios.get.mockResolvedValueOnce(response()).mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
  render(<FraudDetectionOverview />);
  await ready();
  fireEvent.change(screen.getByLabelText('Search transactions'), { target: { value: 'old' } });
  apply();
  const oldSignal = axios.get.mock.calls[1][1].signal;
  fireEvent.change(screen.getByLabelText('Search transactions'), { target: { value: 'new' } });
  apply();
  expect(oldSignal.aborted).toBe(true);
  await act(async () => newer.resolve(response({ ...filteredFixture(), applied_filters: { start_date: '2024-01-01', end_date: '2024-12-31', search: 'new' } })));
  await act(async () => older.resolve(response(fixture({ applied_filters: { start_date: '2024-01-01', end_date: '2024-12-31', search: 'old' } }))));
  const anomalies = screen.getByRole('heading', { name: 'Flagged Anomalies' }).closest('section');
  expect(within(anomalies).getByText('9')).toBeInTheDocument();
  expect(screen.queryByText('386')).not.toBeInTheDocument();
  expect(screen.queryByText(/Filters changed/)).not.toBeInTheDocument();
});

test('shows service errors with retry and no previous results', async () => {
  axios.get.mockRejectedValueOnce({ request: {} }).mockResolvedValueOnce(response()).mockRejectedValueOnce({ response: { data: { error: 'Dashboard temporarily unavailable' } } });
  render(<FraudDetectionOverview />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Dashboard service unavailable');
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await ready();
  apply();
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Dashboard temporarily unavailable'));
  expect(screen.queryByText('386')).not.toBeInTheDocument();
});

test('empty and unmeasurable results display zero counts and N/A', async () => {
  axios.get.mockResolvedValue(response(fixture({
    summary: { total_ticket_transactions: 0, flagged_anomalies: 0, high_risk_passengers: 0, fraud_detection_rate_pct: null },
    model_performance: { sample_count: 0, risk_threshold: 45, precision_pct: null, recall_pct: null, f1_pct: null, roc_auc: null },
    fraud_detection_trend: [], fraud_type_distribution: {}, ticket_category_distribution: {}, fraud_by_route: [], recent_fraud_alerts: [],
  })));
  render(<FraudDetectionOverview />);
  expect(await screen.findByText(/No assessed transactions match this search/)).toHaveAttribute('role', 'status');
  expect(screen.getByRole('status')).toHaveTextContent('clear the search and select Apply');
  expect(screen.getAllByText('N/A')).toHaveLength(5);
  expect(screen.getAllByText('0')).toHaveLength(2);
  expect(screen.getAllByText('No matching data for this chart.')).toHaveLength(3);
  expect(screen.getByText('No matching High-risk alerts.')).toBeInTheDocument();
});

test('aborts requests on unmount without updating removed content', async () => {
  const request = pending();
  axios.get.mockReturnValue(request.promise);
  const view = render(<FraudDetectionOverview />);
  const signal = axios.get.mock.calls[0][1].signal;
  view.unmount();
  expect(signal.aborted).toBe(true);
  await act(async () => request.resolve(response()));
  expect(screen.queryByText('386')).not.toBeInTheDocument();
});
