import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import DemandForecast, { weatherTypeLabel } from './DemandForecast';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));
jest.mock('../../hooks/useSriLankanHolidays', () => () => ({
  holidayDates: {},
  loading: false,
  error: '',
}));
jest.mock('recharts', () => {
  const ReactModule = require('react');
  const chart = ({ children }) => ReactModule.createElement('div', null, children);
  const empty = () => null;
  return {
    Area: empty,
    Bar: empty,
    BarChart: chart,
    CartesianGrid: empty,
    Cell: empty,
    ComposedChart: chart,
    Line: empty,
    LineChart: chart,
    ReferenceLine: empty,
    ResponsiveContainer: chart,
    Tooltip: empty,
    XAxis: empty,
    YAxis: empty,
  };
});

const services = [
  {
    id: 'Colombo Fort|Anuradhapura|Express',
    origin_station: 'Colombo Fort',
    destination_station: 'Anuradhapura',
    line_name: 'Northern Line',
    distance_km: 205,
    train_type: 'Express',
    label: 'Colombo Fort → Anuradhapura (Express)',
    default_capacity: { '1st Class': 50, '2nd Class': 250, '3rd Class': 600 },
  },
  {
    id: 'Colombo Fort|Kandy|Night Mail',
    origin_station: 'Colombo Fort',
    destination_station: 'Kandy',
    line_name: 'Main Line',
    distance_km: 120,
    train_type: 'Night Mail',
    label: 'Colombo Fort → Kandy (Night Mail)',
    default_capacity: { '1st Class': 40, '2nd Class': 200, '3rd Class': 500 },
  },
  ...['Express', 'Night Mail', 'Special'].map((trainType) => ({
    id: `Ratnapura|${trainType}`,
    origin_station: ' colombo fort ',
    destination_station: 'RATNAPURA ',
    line_name: 'Sabaragamuwa Line',
    distance_km: 100,
    train_type: trainType,
    label: `Colombo Fort → Ratnapura (${trainType})`,
    default_capacity: { '1st Class': 40, '2nd Class': 200, '3rd Class': 500 },
  })),
];

const weather = (origin, destination, date) => ({
  date,
  origin_station: origin,
  destination_station: destination,
  weather_data_type: 'climate_estimate',
  weather_label: 'Historical Climate Estimate',
  weather_note: 'Monthly estimate from local ERA5 history; not an exact forecast.',
  average_temperature: 26,
  total_route_rain: 2,
  origin_weather_code: 0,
  destination_weather_code: 61,
  origin_weather: {
    temperature_2m_mean: 26,
    rain_sum: 1,
    wind_speed_10m_max: 10,
    weather_code: 0,
    weather_description: 'Clear sky',
  },
  destination_weather: {
    temperature_2m_mean: 26,
    rain_sum: 1,
    wind_speed_10m_max: 10,
    weather_code: 61,
    weather_description: 'Slight rain',
  },
});

const analysisResponse = (service, date, holiday) => ({
  success: true,
  context: {
    origin_station: service.origin_station,
    destination_station: service.destination_station,
    train_type: service.train_type,
    date,
    is_public_holiday: holiday,
  },
  aggregation: { demand: 'Daily demand summed across classes.' },
  availability: { historical_demand: true, historical_weather: true },
  weekday_weekend: [
    { category: 'Weekday', average_demand: 694.87, sample_count: 20 },
    { category: 'Weekend', average_demand: 710.2, sample_count: 8 },
  ],
  day_of_week: [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  ].map((category, index) => ({
    category,
    average_demand: 650 + index,
    sample_count: 4,
  })),
  weather_demand: [
    { category: 'No rain', average_demand: 600, sample_count: 30 },
    { category: 'Light rain', average_demand: 610, sample_count: 20 },
    { category: 'Moderate rain', average_demand: 620, sample_count: 10 },
    { category: 'Heavy rain', average_demand: 630, sample_count: 5 },
  ],
  weather_conditions: [
    { category: 'Clear sky', average_demand: 600, sample_count: 30 },
    { category: 'Slight rain', average_demand: 610, sample_count: 20 },
  ],
});

beforeEach(() => {
  axios.get.mockImplementation((url, config = {}) => {
    if (url.endsWith('/train_services')) {
      return Promise.resolve({ data: { success: true, train_services: services } });
    }
    if (url.endsWith('/route_weather')) {
      const params = config.params;
      return Promise.resolve({
        data: {
          success: true,
          weather: weather(params.origin_station, params.destination_station, params.date),
        },
      });
    }
    if (url.includes('/demand_analysis?')) {
      const params = new URLSearchParams(url.split('?')[1]);
      const service = services.find((item) => (
        item.origin_station === params.get('origin_station')
        && item.destination_station === params.get('destination_station')
      ));
      return Promise.resolve({
        data: analysisResponse(
          service,
          params.get('date'),
          params.get('is_public_holiday') === '1'
        ),
      });
    }
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
  axios.post.mockImplementation((url, body) => {
    if (!url.endsWith('/predict_demand')) return Promise.reject(new Error(`Unexpected POST ${url}`));
    const classDemand = {
      '1st Class': 20,
      '2nd Class': 80,
      '3rd Class': 200,
    };
    const predictedDemandByClass = Object.fromEntries(
      Object.entries(classDemand).map(([name, demand]) => [
        name,
        {
          predicted_demand: Math.min(demand, body.class_capacity[name]),
          seat_capacity: body.class_capacity[name],
          expected_utilization_pct: 50,
        },
      ])
    );
    const selectedService = services.find((item) => (
      item.origin_station === body.origin_station
      && item.destination_station === body.destination_station
    ));
    return Promise.resolve({
      data: {
        success: true,
        date: body.date,
        predicted_demand_by_class: predictedDemandByClass,
        total_predicted_demand: 300,
        weather: weather(body.origin_station, body.destination_station, body.date),
        prediction_validation: {
          validated: false,
          note: 'This is an unvalidated extrapolation.',
        },
        service: selectedService,
      },
    });
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

test('labels weather from its actual source type', () => {
  expect(weatherTypeLabel({ weather_data_type: 'forecast' })).toBe('Live Forecast');
  expect(weatherTypeLabel({ weather_data_type: 'cached_forecast' })).toBe('Cached Weather Forecast');
  expect(weatherTypeLabel({ weather_data_type: 'historical' })).toBe('Historical Reanalysis');
  expect(weatherTypeLabel({ weather_data_type: 'climate_estimate' })).toBe('Historical Climate Estimate');
});

test('hides every Colombo Fort to Ratnapura service while preserving other choices', async () => {
  render(<DemandForecast />);
  const select = await screen.findByRole('combobox');
  await waitFor(() => expect(select.querySelectorAll('option')).toHaveLength(3));

  expect(screen.getByRole('option', { name: 'Colombo Fort → Anuradhapura (Express)' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Colombo Fort → Kandy (Night Mail)' })).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: /Ratnapura/ })).not.toBeInTheDocument();
});

test('keeps all four charts synchronized after changing train and future date', async () => {
  render(<DemandForecast />);
  const select = await screen.findByRole('combobox');
  const dateInput = screen.getByDisplayValue('');
  const forecastButton = screen.getByRole('button', { name: 'Forecast Demand' });

  fireEvent.change(select, { target: { value: services[0].id } });
  fireEvent.change(dateInput, { target: { value: '2026-10-20' } });
  fireEvent.click(forecastButton);

  await screen.findByText(/Analysis for: Colombo Fort → Anuradhapura/);
  expect(screen.getAllByText(/2026-10-20/).length).toBeGreaterThan(0);
  expect(screen.getByText(/unvalidated extrapolation/)).toBeInTheDocument();
  expect(screen.getAllByRole('heading', { name: 'Weekday vs Weekend Demand' })).toHaveLength(1);
  expect(screen.getAllByRole('heading', { name: 'Demand by Day of Week' })).toHaveLength(1);
  expect(screen.getAllByRole('heading', { name: 'Weather vs Passenger Demand' })).toHaveLength(1);
  expect(screen.getAllByRole('heading', { name: 'Weather Condition vs Passenger Demand' })).toHaveLength(1);

  fireEvent.change(select, { target: { value: services[1].id } });
  fireEvent.change(dateInput, { target: { value: '2027-01-13' } });
  await waitFor(() => expect(screen.queryByText(/Analysis for:/)).not.toBeInTheDocument());
  expect(screen.queryByText('Model-estimated Demand')).not.toBeInTheDocument();

  fireEvent.click(forecastButton);
  await screen.findByText(/Analysis for: Colombo Fort → Kandy/);
  await waitFor(() => {
    const contexts = document.querySelectorAll('.df-chart-context');
    expect(contexts).toHaveLength(4);
    contexts.forEach((context) => {
      expect(context.textContent).toContain('Colombo Fort → Kandy');
      expect(context.textContent).toContain('2027-01-13');
    });
  });
  expect(screen.getByText(/Historical Climate Estimate/)).toBeInTheDocument();
  expect(forecastButton).toBeEnabled();

  fireEvent.click(screen.getByRole('checkbox', { name: 'Public Holiday' }));
  await waitFor(() => expect(screen.queryByText(/Analysis for:/)).not.toBeInTheDocument());
  expect(screen.queryByText('Model-estimated Demand')).not.toBeInTheDocument();
  fireEvent.click(forecastButton);
  await screen.findByText(/Analysis for: Colombo Fort → Kandy/);
  expect(axios.get.mock.calls.some(([url]) => (
    url.includes('/demand_analysis?') && url.includes('is_public_holiday=1')
  ))).toBe(true);
});
