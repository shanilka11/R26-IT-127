import React, { useEffect, useState } from 'react';
import ButterToast, { Cinnamon } from 'butter-toast';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import axios from 'axios';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import LocalIP from './../LocalIP';
import './DemandForecast.css';

const CLASSES = ['1st Class', '2nd Class', '3rd Class'];
const API = `${LocalIP}:4444`;
const formatNumber = (value) => Number(value || 0).toLocaleString();
const addDays = (value, days) => { const date = new Date(`${value}T00:00:00`); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); };
const raiseError = (title, content) => ButterToast.raise({ content: <Cinnamon.Crisp title={title} content={content} scheme={Cinnamon.Crisp.SCHEME_RED} icon={<ErrorOutlineIcon />} /> });
const requestBody = (service, date, holiday, lockdown) => ({ date, origin_station: service.origin_station, destination_station: service.destination_station, line_name: service.line_name, train_type: service.train_type, distance_km: service.distance_km, is_public_holiday: holiday ? 1 : 0, is_covid_lockdown_period: lockdown ? 1 : 0 });

const DemandForecast = () => {
  const [services, setServices] = useState([]); const [servicesLoading, setServicesLoading] = useState(true);
  const [serviceId, setServiceId] = useState(''); const [service, setService] = useState(null); const [date, setDate] = useState('');
  const [holiday, setHoliday] = useState(false); const [lockdown, setLockdown] = useState(false); const [loading, setLoading] = useState(false);
  const [currentForecast, setCurrentForecast] = useState(null); const [forecastTrend, setForecastTrend] = useState([]); const [error, setError] = useState('');

  useEffect(() => { axios.get(`${API}/train_services`).then((res) => { if (res.data.success) setServices(res.data.train_services); else raiseError('Failed to Load Trains', 'Could not load train services.'); }).catch(() => raiseError('Network Error!', 'Could not reach the server to load train services.')).finally(() => setServicesLoading(false)); }, []);

  const handleRun = async () => {
    if (!service || !date) { raiseError('Validation Error!', service ? 'Date is required!' : 'Please select a train.'); return; }
    setLoading(true); setError(''); setCurrentForecast(null); setForecastTrend([]);
    try {
      const dates = Array.from({ length: 7 }, (_, index) => addDays(date, index));
      const responses = await Promise.all(dates.map((forecastDate) => axios.post(`${API}/predict_demand`, requestBody(service, forecastDate, holiday, lockdown))));
      const data = responses.map((response) => response.data);
      if (data.every((item) => item.success)) {
        const selectedDateForecast = data.find((item) => item.date === date) || data[0];
        setCurrentForecast(selectedDateForecast);
        setForecastTrend(data);
      } else {
        throw new Error(data.find((item) => !item.success)?.error || 'Forecast failed.');
      }
    } catch (err) { setError('Unable to load forecast data'); raiseError('Forecast Failed', err.message || 'Could not reach the prediction server.'); } finally { setLoading(false); }
  };

  const result = currentForecast;
  const rows = result ? CLASSES.map((name) => ({ name, ...result.predicted_demand_by_class[name] })) : [];
  const totals = result ? rows.reduce((sum, row) => ({ demand: sum.demand + Number(row.predicted_demand || 0), capacity: sum.capacity + Number(row.seat_capacity || 0) }), { demand: 0, capacity: 0 }) : { demand: 0, capacity: 0 };
  const chartData = forecastTrend.map((item) => ({ date: item.date, demand: item.total_predicted_demand, capacity: CLASSES.reduce((sum, name) => sum + Number(item.predicted_demand_by_class[name]?.seat_capacity || 0), 0) }));
  const selectService = (event) => { const selected = services.find((item) => item.id === event.target.value) || null; setServiceId(event.target.value); setService(selected); setCurrentForecast(null); setForecastTrend([]); };

  return <div className="df-page"><h1 className="df-heading">Passenger Demand Forecast</h1><p className="df-subheading">AI-powered prediction of passenger demand across railway routes and travel classes.</p>
    <div className="df-form"><select className="df-input" value={serviceId} onChange={selectService} disabled={servicesLoading}><option value="">{servicesLoading ? 'Loading trains...' : 'Select Train'}</option>{services.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><input className="df-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />{service && <div className="df-route-summary"><span><strong>Line:</strong> {service.line_name}</span><span><strong>Distance:</strong> {service.distance_km} km</span></div>}</div>
    <div className="df-checkbox-row"><label className="df-checkbox"><input type="checkbox" checked={holiday} onChange={(event) => setHoliday(event.target.checked)} />Public Holiday</label><label className="df-checkbox"><input type="checkbox" checked={lockdown} onChange={(event) => setLockdown(event.target.checked)} />COVID Lockdown Period</label></div><button className="df-submit-btn" onClick={handleRun} disabled={loading}>{loading ? 'Forecasting...' : 'Forecast Demand'}</button>
    {loading && <div className="df-state">Loading forecast...</div>}{error && !loading && <div className="df-state df-error">{error}</div>}
    {result && !loading && <><div className="df-summary-grid"><div><span>Predicted Demand</span><strong>{formatNumber(totals.demand)}</strong></div><div><span>Total Capacity</span><strong>{formatNumber(totals.capacity)}</strong></div><div><span>Utilization</span><strong>{totals.capacity ? `${((totals.demand / totals.capacity) * 100).toFixed(2)}%` : '0%'}</strong></div></div><section className="df-section"><h2>Class-wise Demand, Capacity and Utilization</h2><div className="df-table-wrap"><table className="df-table"><thead><tr><th>Class</th><th>Predicted Demand</th><th>Train Capacity</th><th>Utilization %</th></tr></thead><tbody>{rows.map((row) => <tr key={row.name}><td>{row.name}</td><td>{formatNumber(row.predicted_demand)}</td><td>{formatNumber(row.seat_capacity)}</td><td>{row.expected_utilization_pct}%</td></tr>)}<tr className="df-total-row"><td>Total</td><td>{formatNumber(totals.demand)}</td><td>{formatNumber(totals.capacity)}</td><td>{totals.capacity ? ((totals.demand / totals.capacity) * 100).toFixed(2) : 0}%</td></tr></tbody></table></div></section><section className="df-section"><h2>Demand Forecast Trend (Next 7 Days)</h2><div className="df-chart"><ResponsiveContainer width="100%" height={320}><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" /><XAxis dataKey="date" stroke="var(--chart-axis)" /><YAxis stroke="var(--chart-axis)" /><Tooltip contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--chart-tooltip-border)' }} /><Line type="monotone" dataKey="demand" name="Predicted Demand" stroke="#4C8DFF" strokeWidth={3} /><Line type="monotone" dataKey="capacity" name="Train Capacity" stroke="#22C55E" strokeWidth={2} /></LineChart></ResponsiveContainer></div></section></>}{!loading && !error && !result && <div className="df-state">Select a train and date to load forecast data.</div>}
  </div>;
};
export default DemandForecast;
