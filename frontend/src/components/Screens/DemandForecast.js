import React, { useEffect, useRef, useState } from 'react';
import ButterToast, { Cinnamon } from 'butter-toast';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import axios from 'axios';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import LocalIP from './../LocalIP';
import useSriLankanHolidays from '../../hooks/useSriLankanHolidays';
import getApiErrorMessage from '../../utils/apiErrorMessage';
import {
  buildAnalysisRows,
  buildWeatherConditionRows,
  DAYS_OF_WEEK,
  formatMetric,
  getSelectedDay,
  getSelectedDayType,
  getSelectedWeatherCategories,
  hasDemandValue,
  RAINFALL_CATEGORIES,
  toFiniteNumber,
} from './DemandForecastChartUtils';
import './DemandForecast.css';

const CLASSES = ['1st Class', '2nd Class', '3rd Class'];
const API = `${LocalIP}:4444`;
const formatNumber = (value) => Number(value || 0).toLocaleString();
const selectableTrainServices = (trainServices) => trainServices.filter((item) => (
  !(String(item.origin_station || '').trim().toLowerCase() === 'colombo fort'
    && String(item.destination_station || '').trim().toLowerCase() === 'ratnapura')
));
const addDays = (value, days) => {
  const [year, month, day] = value.split('-').map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day + days));
  return [calendarDate.getUTCFullYear(), String(calendarDate.getUTCMonth() + 1).padStart(2, '0'), String(calendarDate.getUTCDate()).padStart(2, '0')].join('-');
};
const raiseError = (title, content) => ButterToast.raise({ content: <Cinnamon.Crisp title={title} content={content} scheme={Cinnamon.Crisp.SCHEME_RED} icon={<ErrorOutlineIcon />} /> });
const requestBody = (service, date, holiday) => ({
  date,
  origin_station: service.origin_station,
  destination_station: service.destination_station,
  line_name: service.line_name,
  train_type: service.train_type,
  distance_km: service.distance_km,
  class_capacity: service.default_capacity,
  is_public_holiday: holiday ? 1 : 0,
});
export const weatherTypeLabel = (weather) => ({
  historical: 'Historical Reanalysis',
  current: 'Live Current-Day Forecast',
  forecast: 'Live Forecast',
  cached_forecast: 'Cached Weather Forecast',
  climate_estimate: 'Historical Climate Estimate',
  mixed: 'Mixed Weather Sources',
}[weather?.weather_data_type] || weather?.weather_label || 'Weather');

const CHART_COLORS = {
  historical: '#94A3B8',
  prediction: '#2563EB',
  capacity: '#EF4444',
  rainfall: ['#DDF6FF', '#BFE7F8', '#7BC9E8', '#1F6FD8'],
};

const buildChartContext = (service, date) => {
  if (!service || !date) return 'Selected route and date';
  return `${service.origin_station} → ${service.destination_station} · ${service.train_type} · ${date}`;
};

const DemandForecast = () => {
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [serviceId, setServiceId] = useState('');
  const [service, setService] = useState(null);
  const [date, setDate] = useState('');
  const [holiday, setHoliday] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentForecast, setCurrentForecast] = useState(null);
  const [forecastTrend, setForecastTrend] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [routeWeather, setRouteWeather] = useState(null);
  const [routeWeatherLoading, setRouteWeatherLoading] = useState(false);
  const [routeWeatherError, setRouteWeatherError] = useState('');
  const [error, setError] = useState('');
  const [forecastWarning, setForecastWarning] = useState('');
  const [analysisError, setAnalysisError] = useState('');
  const forecastRequestId = useRef(0);
  const { holidayDates, loading: holidayCalendarLoading, error: holidayCalendarError } =
    useSriLankanHolidays(API, date, 7);

  useEffect(() => {
    axios.get(`${API}/train_services`)
      .then((res) => {
        if (res.data.success) setServices(selectableTrainServices(res.data.train_services));
        else raiseError('Failed to Load Trains', 'Could not load train services.');
      })
      .catch((requestError) => raiseError(
        'Train Services Failed',
        getApiErrorMessage(requestError, 'Train services')
      ))
      .finally(() => setServicesLoading(false));
  }, []);

  const clearResults = () => {
    setCurrentForecast(null);
    setForecastTrend([]);
    setAnalysis(null);
    setError('');
    setForecastWarning('');
    setAnalysisError('');
  };

  useEffect(() => {
    if (holidayDates[date] !== undefined) setHoliday(holidayDates[date]);
  }, [date, holidayDates]);

  useEffect(() => {
    let active = true;
    setRouteWeather(null);
    setRouteWeatherError('');
    if (!service || !date) {
      setRouteWeatherLoading(false);
      return () => {
        active = false;
      };
    }

    setRouteWeatherLoading(true);
    axios.get(`${API}/route_weather`, {
      params: {
        origin_station: service.origin_station,
        destination_station: service.destination_station,
        date,
      },
    })
      .then((response) => {
        if (!response.data?.success || !response.data.weather) {
          throw new Error(response.data?.error || 'The weather service returned an invalid response.');
        }
        if (active) setRouteWeather(response.data.weather);
      })
      .catch((requestError) => {
        if (active) setRouteWeatherError(getApiErrorMessage(requestError, 'Route weather'));
      })
      .finally(() => {
        if (active) setRouteWeatherLoading(false);
      });

    return () => {
      active = false;
    };
  }, [service, date]);

  const handleRun = async () => {
    if (!service || !date) {
      raiseError('Validation Error!', service ? 'Date is required!' : 'Please select a train.');
      return;
    }
    if (holidayCalendarLoading || holidayCalendarError) {
      raiseError(
        'Public Holiday Lookup Failed',
        holidayCalendarError || 'Wait for the public holiday calendar to finish loading.'
      );
      return;
    }
    const requestId = ++forecastRequestId.current;
    setLoading(true);
    clearResults();
    const dates = Array.from({ length: 7 }, (_, index) => addDays(date, index));
    const forecastRequest = Promise.allSettled(
      dates.map((forecastDate) => {
        const dateHoliday = Boolean(
          holidayDates[forecastDate] || (forecastDate === date && holiday)
        );
        return axios.post(
          `${API}/predict_demand`,
          requestBody(service, forecastDate, dateHoliday)
        ).then((response) => {
          if (!response.data?.success) {
            const requestError = new Error(response.data?.error || 'Forecast failed.');
            requestError.forecastDate = forecastDate;
            throw requestError;
          }
          return response.data;
        }).catch((requestError) => {
          requestError.forecastDate = requestError.forecastDate || forecastDate;
          throw requestError;
        });
      })
    ).then((settledResults) => {
      const data = settledResults
        .filter((item) => item.status === 'fulfilled')
        .map((item) => item.value);
      const failures = settledResults
        .filter((item) => item.status === 'rejected')
        .map((item) => item.reason);
      const selectedForecast = data.find((item) => item.date === date);
      if (!selectedForecast) {
        const selectedDateFailure = failures.find((item) => item.forecastDate === date);
        throw selectedDateFailure || new Error(`Forecast response did not include the selected date ${date}.`);
      }
      return { data, selectedForecast, failures };
    });
    const analysisParams = new URLSearchParams({
      origin_station: service.origin_station,
      destination_station: service.destination_station,
      train_type: service.train_type,
      date,
      is_public_holiday: selectedHoliday ? '1' : '0',
    });
    const analysisRequest = axios.get(`${API}/demand_analysis?${analysisParams.toString()}`)
      .then((response) => {
        if (!response.data?.success) {
          throw new Error(response.data?.error || 'Demand analysis failed.');
        }
        const { context } = response.data;
        if (context?.origin_station !== service.origin_station
            || context?.destination_station !== service.destination_station
            || context?.train_type !== service.train_type
            || context?.date !== date
            || Boolean(context?.is_public_holiday) !== selectedHoliday) {
          throw new Error('Demand analysis response does not match the selected service and date.');
        }
        return response.data;
      });

    const [forecastResult, analysisResult] = await Promise.allSettled([forecastRequest, analysisRequest]);
    if (requestId !== forecastRequestId.current) return;
    if (forecastResult.status === 'fulfilled') {
      setCurrentForecast(forecastResult.value.selectedForecast);
      setRouteWeather(forecastResult.value.selectedForecast.weather);
      setForecastTrend(forecastResult.value.data);
      if (forecastResult.value.failures.length > 0) {
        setForecastWarning(
          `The selected-date forecast is available, but ${forecastResult.value.failures.length} of the following six trend dates could not be forecast.`
        );
      }
    } else {
      const forecastError = forecastResult.reason;
      const operation = forecastError.forecastDate
        ? `Demand forecast for ${forecastError.forecastDate}`
        : 'Demand forecast';
      const message = getApiErrorMessage(forecastError, operation);
      setError(message);
      raiseError('Forecast Failed', message);
    }
    if (analysisResult.status === 'fulfilled') {
      setAnalysis(analysisResult.value);
    } else {
      const message = getApiErrorMessage(analysisResult.reason, `Demand analysis for ${date}`);
      setAnalysisError(message);
      if (forecastResult.status === 'fulfilled') {
        raiseError('Demand Analysis Unavailable', message);
      }
    }
    setLoading(false);
  };

  const result = currentForecast;
  const selectedHoliday = Boolean(holiday || holidayDates[date]);
  const rows = result ? CLASSES.map((name) => ({ name, ...result.predicted_demand_by_class[name] })) : [];
  const totals = result ? rows.reduce((sum, row) => ({
    demand: sum.demand + Number(row.predicted_demand || 0),
    capacity: sum.capacity + Number(row.seat_capacity || 0),
  }), { demand: 0, capacity: 0 }) : { demand: 0, capacity: 0 };
  const chartData = forecastTrend.map((item) => ({
    date: item.date,
    demand: item.total_predicted_demand,
    capacity: CLASSES.reduce((sum, name) => sum + Number(item.predicted_demand_by_class[name]?.seat_capacity || 0), 0),
  }));
  const selectedWeather = routeWeather || result?.weather;
  const selectedDay = result?.date === date ? getSelectedDay(date) : null;
  const selectedDayType = result?.date === date ? getSelectedDayType(date) : null;
  const selectedWeatherCategories = getSelectedWeatherCategories(selectedWeather);
  const chartPrediction = result?.date === date ? totals.demand : null;
  const chartCapacity = result?.date === date
    ? totals.capacity
    : Object.values(service?.default_capacity || {}).reduce((sum, capacity) => sum + (toFiniteNumber(capacity) || 0), 0);
  const weekdayWeekendData = analysis
    ? buildAnalysisRows(analysis.weekday_weekend, ['Weekday', 'Weekend'], selectedDayType, chartPrediction, chartCapacity)
    : [];
  const dayOfWeekData = analysis
    ? buildAnalysisRows(analysis.day_of_week, DAYS_OF_WEEK, selectedDay, chartPrediction, chartCapacity)
    : [];
  const weatherDemandData = analysis
    ? buildAnalysisRows(analysis.weather_demand, RAINFALL_CATEGORIES, selectedWeatherCategories.rainfall, chartPrediction, null)
      .map((item) => item.is_selected_category
        ? {
          ...item,
          selected_rainfall_mm: selectedWeatherCategories.rainfallAmount,
          selected_weather_data_type: selectedWeather?.weather_data_type,
          selected_weather_note: selectedWeather?.weather_note,
        }
        : item)
    : [];
  const weatherConditionData = analysis
    ? buildWeatherConditionRows(analysis.weather_conditions, selectedWeatherCategories.condition)
    : [];

  const selectedService = (event) => {
    const selected = services.find((item) => item.id === event.target.value) || null;
    forecastRequestId.current += 1;
    setLoading(false);
    setServiceId(event.target.value);
    setService(selected);
    clearResults();
  };

  return (
    <div className="df-page">
      <h1 className="df-heading">Passenger Demand Forecast</h1>
      <p className="df-subheading">AI-powered prediction of passenger demand across railway routes and travel classes.</p>
      <div className="df-form">
        <select className="df-input" value={serviceId} onChange={selectedService} disabled={servicesLoading}>
          <option value="">{servicesLoading ? 'Loading trains...' : 'Select Train'}</option>
          {services.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <input className="df-input" type="date" value={date} onChange={(event) => { forecastRequestId.current += 1; setLoading(false); setDate(event.target.value); clearResults(); }} />
        {service && <div className="df-route-summary"><span><strong>Line:</strong> {service.line_name}</span><span><strong>Distance:</strong> {service.distance_km} km</span></div>}
      </div>
      <div className="df-checkbox-row"><label className="df-checkbox"><input type="checkbox" checked={selectedHoliday} onChange={(event) => { forecastRequestId.current += 1; setLoading(false); setHoliday(holidayDates[date] ? true : event.target.checked); clearResults(); }} />Public Holiday</label></div>
      {holidayCalendarLoading && date && <div className="df-state">Loading Sri Lankan public holiday calendar...</div>}
      {holidayCalendarError && <div className="df-state df-error">Public holiday calendar unavailable: {holidayCalendarError}</div>}
      <button className="df-submit-btn" onClick={handleRun} disabled={loading || holidayCalendarLoading || Boolean(holidayCalendarError)}>{loading ? 'Forecasting...' : 'Forecast Demand'}</button>
      {loading && <div className="df-state">Loading forecast...</div>}
      {error && !loading && <div className="df-state df-error">{error}</div>}
      {forecastWarning && !loading && <div className="df-state">{forecastWarning}</div>}
      {!loading && !result && !error && <div className="df-state">Select a train and date, then click Forecast Demand.</div>}
      {service?.demand_model_supported === false && <div className="df-state df-error">The trained demand model does not support this route yet. Route weather is retrieved separately; demand predictions require verified route training data.</div>}
      {routeWeatherLoading && <div className="df-state">Loading route weather for {date}...</div>}
      {routeWeatherError && !routeWeatherLoading && !selectedWeather && <div className="df-state df-error">Route weather unavailable: {routeWeatherError}</div>}
      {selectedWeather && !routeWeatherLoading && (
        <section className="df-section">
          <h2>Weather for Selected Date</h2>
          <p className="df-weather-note">
            {weatherTypeLabel(selectedWeather)}: {selectedWeather.weather_note}
          </p>
          <div className="df-weather-grid">
            {[
              ['Origin', selectedWeather.origin_station, selectedWeather.origin_weather, selectedWeather.origin_location_note],
              ['Destination', selectedWeather.destination_station, selectedWeather.destination_weather, selectedWeather.destination_location_note],
            ].map(([label, station, weather, locationNote]) => (
              <div className="df-weather-item" key={label}>
                <strong>{label} — {station}</strong>
                {locationNote && <span>{locationNote}</span>}
                <span>Temperature: {Number(weather.temperature_2m_mean).toFixed(1)} °C</span>
                <span>Rainfall: {Number(weather.rain_sum).toFixed(1)} mm</span>
                <span>Wind Speed: {Number(weather.wind_speed_10m_max).toFixed(1)} km/h</span>
                <span>Condition: {weather.weather_description || `WMO code ${weather.weather_code}`}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {result && !loading && <>
        <p className="df-weather-note">Passenger demand values are estimates from the trained model, not recorded actual passenger counts.</p>
        {result.prediction_validation?.note && <p className="df-chart-note">{result.prediction_validation.note}</p>}
        <div className="df-summary-grid"><div><span>Model-estimated Demand</span><strong>{formatNumber(totals.demand)}</strong></div><div><span>Total Capacity</span><strong>{formatNumber(totals.capacity)}</strong></div><div><span>Utilization</span><strong>{totals.capacity ? `${((totals.demand / totals.capacity) * 100).toFixed(2)}%` : '0%'}</strong></div></div>
        <section className="df-section"><h2>Class-wise Demand, Capacity and Utilization</h2><div className="df-table-wrap"><table className="df-table"><thead><tr><th>Class</th><th>Predicted Demand</th><th>Train Capacity</th><th>Utilization %</th></tr></thead><tbody>{rows.map((row) => <tr key={row.name}><td>{row.name}</td><td>{formatNumber(row.predicted_demand)}</td><td>{formatNumber(row.seat_capacity)}</td><td>{row.expected_utilization_pct}%</td></tr>)}<tr className="df-total-row"><td>Total</td><td>{formatNumber(totals.demand)}</td><td>{formatNumber(totals.capacity)}</td><td>{totals.capacity ? ((totals.demand / totals.capacity) * 100).toFixed(2) : 0}%</td></tr></tbody></table></div></section>
        <section className="df-section"><h2>Demand Forecast Trend (Next 7 Days)</h2><div className="df-chart"><ResponsiveContainer width="100%" height={320}><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" /><XAxis dataKey="date" stroke="var(--chart-axis)" /><YAxis stroke="var(--chart-axis)" /><Tooltip contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--chart-tooltip-border)' }} /><Line type="monotone" dataKey="demand" name="Predicted Demand" stroke="#2563EB" strokeWidth={3} /><Line type="monotone" dataKey="capacity" name="Train Capacity" stroke="#EF4444" strokeWidth={2} strokeDasharray="6 4" /></LineChart></ResponsiveContainer></div></section>
      </>}
      {analysisError && !loading && <div className="df-state df-error">Demand analysis unavailable: {analysisError}</div>}
      {analysis && !loading && <>
        <section className="df-section">
          <h2>Analysis Context</h2>
          <p className="df-weather-note">Analysis for: {analysis.context.origin_station} → {analysis.context.destination_station} ({analysis.context.train_type}) · {analysis.context.date} · Public Holiday: {analysis.context.is_public_holiday ? 'Yes' : 'No'}</p>
          <p className="df-chart-subtitle">{analysis.aggregation?.demand || 'Daily historical passenger totals across all travel classes.'} Historical samples count distinct service dates.</p>
          {!analysis.availability?.historical_demand && <p className="df-chart-note">No historical passenger records are available for this route, service and holiday context.</p>}
          {!analysis.availability?.historical_weather && <p className="df-chart-note">{analysis.availability?.historical_weather_reason || 'Historical weather comparisons are unavailable for this route.'}</p>}
        </section>
        <div className="df-analysis-grid">
          <WeekdayWeekendChart data={weekdayWeekendData} selectedCategory={selectedDayType} capacity={chartCapacity} selectedPrediction={chartPrediction} context={buildChartContext(service, date)} />
          <DayOfWeekChart data={dayOfWeekData} selectedCategory={selectedDay} capacity={chartCapacity} selectedPrediction={chartPrediction} context={buildChartContext(service, date)} />
          <WeatherDemandChart data={weatherDemandData} selectedCategory={selectedWeatherCategories.rainfall} selectedWeather={selectedWeather} context={buildChartContext(service, date)} />
          <WeatherConditionChart data={weatherConditionData} selectedCategory={selectedWeatherCategories.condition} selectedWeather={selectedWeather} context={buildChartContext(service, date)} />
        </div>
      </>}
    </div>
  );
};

const ChartCard = ({ title, subtitle, context, children }) => (
  <section className="df-section df-analysis-card">
    <div className="df-chart-header">
      <div>
        <h2>{title}</h2>
        {subtitle && <p className="df-chart-subtitle">{subtitle}</p>}
      </div>
      {context && <span className="df-chart-context">{context}</span>}
    </div>
    {children}
  </section>
);

const ChartLegend = ({ items }) => (
  <div className="df-chart-legend">
    {items.map((item) => (
      <div key={item.label} className="df-chart-legend-item">
        <span
          className={`df-chart-legend-swatch df-chart-legend-${item.kind || 'bar'}`}
          style={item.gradient ? { background: item.gradient } : { backgroundColor: item.color, borderColor: item.color }}
        />
        <span>{item.label}</span>
      </div>
    ))}
  </div>
);

const ChartEmptyState = ({ children }) => <div className="df-chart-empty">{children}</div>;
const unavailableCategories = (data) => data
  .filter((item) => toFiniteNumber(item.historical_average) === null)
  .map((item) => item.category);

const WeekdayWeekendChart = ({ data, selectedCategory, capacity, selectedPrediction, context }) => {
  const prediction = toFiniteNumber(selectedPrediction);
  const chartData = (data || []).map((item) => ({
    ...item,
    historical_average: toFiniteNumber(item.historical_average),
    selected_prediction: item.category === selectedCategory && prediction !== null && prediction >= 0 ? prediction : null,
    capacity: toFiniteNumber(capacity) > 0 ? toFiniteNumber(capacity) : null,
  }));
  const missingCategories = unavailableCategories(chartData);

  return (
    <ChartCard title="Weekday vs Weekend Demand" subtitle="Historical daily route demand across all travel classes. Capacity is the sum of class capacities returned for this service." context={context}>
      <ChartLegend items={[
        { label: 'Historical Average', color: CHART_COLORS.historical },
        { label: 'Selected-Date Prediction', color: CHART_COLORS.prediction, kind: 'marker' },
        { label: 'Capacity', color: CHART_COLORS.capacity, kind: 'line' },
      ]} />
      {missingCategories.length > 0 && <p className="df-chart-note">Historical average unavailable for: {missingCategories.join(', ')}. No zero-height values are substituted.</p>}
      <div className="df-chart">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="category" stroke="#334155" tickLine={false} axisLine={false} />
            <YAxis stroke="#334155" tickLine={false} axisLine={false} tickFormatter={formatMetric} />
            <Tooltip content={<AnalysisTooltip />} />
            {chartData.some((item) => item.capacity !== null) && (
              <ReferenceLine y={chartData[0]?.capacity} stroke={CHART_COLORS.capacity} strokeDasharray="6 6" strokeWidth={2} ifOverflow="extendDomain" />
            )}
            <Bar dataKey="historical_average" name="Historical Average" fill={CHART_COLORS.historical} barSize={42} radius={[10, 10, 0, 0]} />
            <Line dataKey="selected_prediction" name="Selected-Date Prediction" stroke={CHART_COLORS.prediction} strokeWidth={0} dot={{ r: 6, fill: CHART_COLORS.prediction, stroke: '#FFFFFF', strokeWidth: 2 }} activeDot={{ r: 7 }} connectNulls={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
};

const DayOfWeekAxisTick = ({ x, y, payload, selectedCategory }) => (
  <text
    x={x}
    y={y}
    dy={12}
    textAnchor="end"
    transform={`rotate(-25 ${x} ${y})`}
    fill={payload.value === selectedCategory ? CHART_COLORS.prediction : '#334155'}
    fontWeight={payload.value === selectedCategory ? 700 : 400}
    fontSize={11}
  >
    {payload.value}{payload.value === selectedCategory ? ' (selected)' : ''}
  </text>
);

const DayOfWeekChart = ({ data, selectedCategory, capacity, selectedPrediction, context }) => {
  const prediction = toFiniteNumber(selectedPrediction);
  const chartData = DAYS_OF_WEEK.map((day) => {
    const item = (data || []).find((entry) => entry.category === day);
    const historicalAverage = toFiniteNumber(item?.historical_average);
    return {
      category: day,
      historical_average: historicalAverage !== null && historicalAverage >= 0 ? historicalAverage : null,
      selected_prediction: day === selectedCategory && prediction !== null && prediction >= 0 ? prediction : null,
      capacity: toFiniteNumber(capacity) > 0 ? toFiniteNumber(capacity) : null,
      sample_count: toFiniteNumber(item?.sample_count),
    };
  });
  const missingCategories = unavailableCategories(chartData);

  return (
    <ChartCard title="Demand by Day of Week" subtitle="Historical daily route averages across all travel classes. The selected-date estimate is shown only on its calendar weekday." context={context}>
      <ChartLegend items={[
        { label: 'Historical Average', color: CHART_COLORS.historical, kind: 'line' },
        { label: 'Selected-Date Prediction', color: CHART_COLORS.prediction },
        { label: 'Capacity', color: CHART_COLORS.capacity, kind: 'line' },
      ]} />
      {missingCategories.length === DAYS_OF_WEEK.length
        ? <p className="df-chart-note">No historical weekday averages are available. The selected-date prediction, when valid, remains shown separately.</p>
        : missingCategories.length > 0 && <p className="df-chart-note">Historical average unavailable for: {missingCategories.join(', ')}. Missing days are not connected or treated as zero.</p>}
      <div className="df-chart">
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 34 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="category" interval={0} height={58} tickLine={false} axisLine={false} tick={<DayOfWeekAxisTick selectedCategory={selectedCategory} />} />
            <YAxis stroke="#334155" tickLine={false} axisLine={false} tickFormatter={formatMetric} />
            <Tooltip content={<AnalysisTooltip />} />
            {chartData.some((item) => item.capacity !== null) && (
              <ReferenceLine y={chartData[0]?.capacity} stroke={CHART_COLORS.capacity} strokeDasharray="6 6" strokeWidth={2} />
            )}
            <Area type="monotone" dataKey="historical_average" name="Historical Average" stroke={CHART_COLORS.historical} fill="#E2E8F0" fillOpacity={0.3} strokeWidth={2.5} connectNulls={false} />
            <Bar dataKey="selected_prediction" name="Selected-Date Prediction" fill={CHART_COLORS.prediction} radius={[8, 8, 0, 0]} barSize={30} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
};

const WeatherDemandChart = ({ data, selectedCategory, selectedWeather, context }) => {
  const chartData = (data || []).map((item, index) => ({
    ...item,
    historical_average: toFiniteNumber(item.historical_average),
    fill: CHART_COLORS.rainfall[index],
  }));
  const selectedCategoryAvailable = chartData.some((item) => item.category === selectedCategory);
  const missingCategories = unavailableCategories(chartData);
  const climateEstimated = selectedWeather?.weather_data_type === 'climate_estimate'
    || Object.values(selectedWeather?.weather_sources || {}).includes('Historical Climate Estimate');
  const subtitle = selectedCategory
    ? `Route rainfall total: No rain ≤0 mm; Light rain >0–5 mm; Moderate rain >5–20 mm; Heavy rain >20 mm. Thresholds match /demand_analysis.${climateEstimated ? ' The selected category is derived from a monthly climate estimate, not an exact-date observation or forecast.' : ''}`
    : 'Selected-date rainfall is unavailable or estimated; only historical category averages are shown.';

  return (
    <ChartCard title="Weather vs Passenger Demand" subtitle={subtitle} context={context}>
      <ChartLegend items={[
        { label: 'Historical Average · rainfall severity', gradient: 'linear-gradient(90deg, #DDF6FF, #BFE7F8, #7BC9E8, #1F6FD8)' },
        { label: 'Selected-Date Prediction', color: CHART_COLORS.prediction, kind: 'marker' },
      ]} />
      {selectedCategory && !selectedCategoryAvailable && <p className="df-chart-note">The selected-date rainfall category is not represented in the returned historical categories; no prediction marker is shown.</p>}
      {missingCategories.length > 0 && <p className="df-chart-note">Historical average unavailable for: {missingCategories.join(', ')}.</p>}
      <div className="df-chart">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="category" interval={0} height={42} stroke="#334155" tickLine={false} axisLine={false} />
            <YAxis stroke="#334155" tickLine={false} axisLine={false} tickFormatter={formatMetric} />
            <Tooltip content={<AnalysisTooltip />} />
            <Bar dataKey="historical_average" name="Historical Average" radius={[10, 10, 0, 0]}>
              {chartData.map((entry) => (
                <Cell key={`${entry.category}-rain`} fill={entry.fill || CHART_COLORS.historical} />
              ))}
            </Bar>
            <Line dataKey="selected_prediction" name="Selected-Date Prediction" stroke={CHART_COLORS.prediction} strokeWidth={0} dot={{ r: 6, fill: CHART_COLORS.prediction, stroke: '#FFFFFF', strokeWidth: 2 }} activeDot={{ r: 7 }} connectNulls={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
};

const WeatherConditionChart = ({ data, selectedCategory, selectedWeather, context }) => {
  const chartData = (data || []).map((item) => ({
    ...item,
    historical_average: toFiniteNumber(item.historical_average),
    fill: item.is_selected_category ? CHART_COLORS.prediction : CHART_COLORS.historical,
  }));
  const chartReady = hasDemandValue(chartData);
  const selectedCondition = chartData.find((item) => item.is_selected_category);
  const canShowChart = chartData.length > 0 && (chartReady || Boolean(selectedCondition));
  const subtitle = 'Historical association between route weather condition and average passenger demand; this does not establish causation.';
  const selectedConditionIsEstimate = selectedWeather?.weather_data_type === 'climate_estimate'
    || Object.values(selectedWeather?.weather_sources || {}).includes('Historical Climate Estimate');

  return (
    <ChartCard title="Weather Condition vs Passenger Demand" subtitle={subtitle} context={context}>
      <ChartLegend items={[
        { label: 'Historical Average', color: CHART_COLORS.historical },
        { label: 'Selected Condition', color: CHART_COLORS.prediction },
      ]} />
      {selectedCondition && (
        <p className="df-chart-note" aria-live="polite">
          {selectedConditionIsEstimate ? 'Estimated selected condition' : 'Selected condition'}: <strong>{selectedCategory}</strong>.{' '}
          {toFiniteNumber(selectedCondition.historical_average) === null
            ? 'Historical average unavailable for this condition.'
            : `Historical average: ${formatMetric(selectedCondition.historical_average)} passengers.`}
          {selectedConditionIsEstimate && ' The condition is based on monthly climate averages, not exact-date weather.'}
        </p>
      )}
      {!selectedCondition && selectedCategory && (
        <p className="df-chart-note">Selected-date weather condition is not available from reliable date-specific weather data; no condition is highlighted.</p>
      )}
      {canShowChart ? (
        <div className="df-chart">
          <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 36)}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 12, right: 12, left: 10, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
              <XAxis type="number" stroke="#334155" tickLine={false} axisLine={false} tickFormatter={formatMetric} />
              <YAxis
                type="category"
                dataKey="category"
                width={150}
                interval={0}
                stroke="#334155"
                tickLine={false}
                axisLine={false}
                tick={<WeatherConditionAxisTick selectedCategory={selectedCondition?.category} />}
              />
              <Tooltip content={<AnalysisTooltip />} />
              <Bar dataKey="historical_average" name="Historical Average" radius={[0, 8, 8, 0]}>
                {chartData.map((entry) => (
                  <Cell key={`${entry.category}-weather`} fill={entry.fill} stroke={entry.is_selected_category ? '#1D4ED8' : 'transparent'} strokeWidth={entry.is_selected_category ? 2 : 0} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : <ChartEmptyState>No historical weather-condition averages are available for this service.</ChartEmptyState>}
    </ChartCard>
  );
};

const WeatherConditionAxisTick = ({ x, y, payload, selectedCategory }) => (
  <text
    x={x}
    y={y}
    dy={4}
    textAnchor="end"
    fill={payload.value === selectedCategory ? CHART_COLORS.prediction : '#334155'}
    fontWeight={payload.value === selectedCategory ? 700 : 400}
    fontSize={11}
  >
    {payload.value}{payload.value === selectedCategory ? ' (selected)' : ''}
  </text>
);

const AnalysisTooltip = ({ active, payload, label }) => {
  const point = payload?.find((item) => item?.payload)?.payload;
  if (!active || !point) return null;
  const labelText = point.category || label || 'Selected category';
  const hasHistoricalAverage = toFiniteNumber(point.historical_average) !== null;
  const hasPrediction = toFiniteNumber(point.selected_prediction) !== null;
  const hasCapacity = toFiniteNumber(point.capacity) > 0;
  const sampleCount = toFiniteNumber(point.sample_count);
  const rainfall = toFiniteNumber(point.selected_rainfall_mm);
  const estimatedRainfall = point.selected_weather_data_type === 'climate_estimate'
    || /climate estimate/i.test(point.selected_weather_note || '');
  return (
    <div className="df-chart-tooltip">
      <strong>{labelText}</strong>
      {hasHistoricalAverage && <div>Historical Average: {formatMetric(point.historical_average)} passengers</div>}
      {point.is_selected_category && !hasHistoricalAverage && <div>Historical average unavailable for this category</div>}
      {hasPrediction && <div>Selected-Date Prediction: {formatMetric(point.selected_prediction)} passengers</div>}
      {hasCapacity && <div>Capacity: {formatMetric(point.capacity)} seats</div>}
      {sampleCount !== null && <div>Historical samples: {formatMetric(sampleCount)}</div>}
      {rainfall !== null && <div>{estimatedRainfall ? 'Estimated route rainfall' : 'Selected-date route rainfall'}: {rainfall.toLocaleString(undefined, { maximumFractionDigits: 1 })} mm</div>}
    </div>
  );
};

export default DemandForecast;
