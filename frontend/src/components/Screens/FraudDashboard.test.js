import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import axios from 'axios';
import FraudDashboard from './FraudDashboard';

jest.mock('axios', () => ({ get: jest.fn() }));
jest.mock('./FraudDetectionOverview', () => () => <h2>Filtered historical overview</h2>);
jest.mock('./FraudSimulation', () => {
  const { useLocation } = require('react-router-dom');
  return () => <h2>Simulation {useLocation().search}</h2>;
});

const mount = (url = '/FraudDashboard') => {
  const history = createMemoryHistory({ initialEntries: [url] });
  render(<Router history={history}><FraudDashboard /></Router>);
  return history;
};

beforeEach(() => {
  axios.get.mockReset();
  axios.get.mockResolvedValue({ data: {
    anomaly_score_distribution: { ensemble: [] },
    risk_tier_breakdown: { High: 1, Medium: 2, Low: 3 },
    risk_score_distribution: [], top_risk_factors: [], risk_by_fraud_type: [],
    passengers_flagged_for_inspection: 276, inspection_rate_pct: 10,
    fraud_detection_rate_pct: 90.35, recommended_risk_threshold: 45,
    workload_vs_detection_curve: [],
  } });
});

test.each(['', '?tab=main', '?tab=fraud', '?tab=unknown'])('opens the consolidated Main Dashboard for %s', (query) => {
  const history = mount(`/FraudDashboard${query}`);
  expect(screen.getByRole('heading', { name: 'Filtered historical overview' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Main Dashboard' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getAllByRole('button')).toHaveLength(5);
  expect(screen.queryByRole('button', { name: 'Fraud Detection', exact: true })).not.toBeInTheDocument();
  expect(screen.queryByText('Average Risk Score')).not.toBeInTheDocument();
  expect(axios.get).not.toHaveBeenCalled();
  if (query === '?tab=fraud') expect(history.location.search).toBe('?tab=main');
});

test.each([
  ['anomaly', 'Anomaly Detection', 'Anomaly Score Distribution (ensemble risk score)'],
  ['risk', 'Risk Analysis', 'High / Medium / Low Risk Transactions'],
  ['workload', 'Inspection Workload', 'Inspector Workload vs Detection Performance'],
])('opens and reloads the %s deep link', async (key, label, heading) => {
  const history = mount(`/FraudDashboard?tab=${key}`);
  expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-pressed', 'true');
  expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
  expect(history.location.search).toBe(`?tab=${key}`);
  expect(axios.get.mock.calls[0][0]).not.toContain('/dashboard/summary');
});

test('tab navigation, Back and Forward preserve Historical Replay context', async () => {
  const replay = '?tab=predict&mode=historical_replay&route=Colombo+Fort+-+Kandy&date=2024-05-10&transaction_id=TXN100004';
  const history = mount(`/FraudDashboard${replay}#journey`);
  expect(screen.getByRole('button', { name: 'Future Prediction' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('heading', { name: /^Simulation/ })).toHaveTextContent('historical_replay');

  fireEvent.click(screen.getByRole('button', { name: 'Main Dashboard' }));
  expect(new URLSearchParams(history.location.search).get('tab')).toBe('main');
  expect(new URLSearchParams(history.location.search).get('transaction_id')).toBe('TXN100004');
  expect(history.location.hash).toBe('#journey');
  expect(screen.getByRole('heading', { name: 'Filtered historical overview' })).toBeInTheDocument();

  act(() => history.goBack());
  expect(history.location.search).toBe(replay);
  expect(screen.getByRole('button', { name: 'Future Prediction' })).toHaveAttribute('aria-pressed', 'true');
  act(() => history.goForward());
  expect(screen.getByRole('button', { name: 'Main Dashboard' })).toHaveAttribute('aria-pressed', 'true');

  fireEvent.click(screen.getByRole('button', { name: 'Risk Analysis' }));
  expect(await screen.findByRole('heading', { name: 'Risk Score Distribution' })).toBeInTheDocument();
  expect(new URLSearchParams(history.location.search).get('route')).toBe('Colombo Fort - Kandy');
  expect(new URLSearchParams(history.location.search).get('date')).toBe('2024-05-10');
});

test('legacy fraud links are replaced without adding a Back navigation step', () => {
  const history = mount('/FraudDashboard?tab=fraud&transaction_id=TXN100004');
  expect(history.entries).toHaveLength(1);
  expect(new URLSearchParams(history.location.search).get('tab')).toBe('main');
  expect(new URLSearchParams(history.location.search).get('transaction_id')).toBe('TXN100004');
});
