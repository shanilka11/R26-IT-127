import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Route integration: feature components have their own API/interaction tests.
jest.mock('./components/Login', () => () => <div>Login page</div>);
jest.mock('./components/Register', () => () => null);
jest.mock('./components/Screens/TrainData', () => () => null);
jest.mock('./components/Screens/SeatAllocationDashboard', () => () => null);
jest.mock('./components/Screens/Adaptivedemanddashboard', () => () => null);
jest.mock('./components/Screens/FraudDashboard', () => () => <div>Fraud dashboard</div>);
jest.mock('./components/Screens/FraudBatchCheck', () => () => <div>Passenger verification page</div>);
jest.mock('./components/Screens/VerificationAdmin', () => () => <div>Verification administration page</div>);
jest.mock('./components/Screens/DemandForecast', () => () => null);
jest.mock('./components/UserManagement/Settings', () => () => null);
jest.mock('./components/UserManagement/AllUsers', () => () => null);
jest.mock('./components/UserManagement/Admin', () => () => <div>Administration page</div>);
jest.mock('./components/UserManagement/Dashboard', () => () => null);
jest.mock('./components/Nav', () => () => null);
jest.mock('./components/Sidebar', () => () => null);
jest.mock('./components/footer', () => () => null);
jest.mock('./components/Home', () => () => null);
jest.mock('butter-toast', () => ({ __esModule: true, default: () => null }));

beforeEach(() => localStorage.clear());
test.each([
  ['/Admin/Verifications', 'Verification administration page'],
  ['/Admin', 'Administration page'],
  ['/FraudBatchCheck', 'Passenger verification page'],
  ['/FraudDashboard', 'Fraud dashboard'],
])('signed-in route %s renders its own screen', (path, text) => {
  localStorage.setItem('loginAccess', 'true');
  window.history.replaceState({}, '', path);
  render(<App />);
  expect(screen.getByText(text)).toBeInTheDocument();
});
test('signed-out user can reach login', () => {
  window.history.replaceState({}, '', '/login'); render(<App />);
  expect(screen.getByText('Login page')).toBeInTheDocument();
});
