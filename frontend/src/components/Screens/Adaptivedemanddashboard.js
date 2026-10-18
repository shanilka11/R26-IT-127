import React, { useEffect, useState } from 'react';
import ButterToast, { Cinnamon } from 'butter-toast';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import axios from 'axios';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import LocalIP from './../LocalIP';
import useSriLankanHolidays from '../../hooks/useSriLankanHolidays';
import getApiErrorMessage from '../../utils/apiErrorMessage';
import './Adaptivedemanddashboard.css';

const API = `${LocalIP}:4444`;
const CLASSES = ['1st Class', '2nd Class', '3rd Class'];
const formatNumber = (value) => Number(value || 0).toLocaleString();
const raiseError = (title, content) => ButterToast.raise({ content: <Cinnamon.Crisp title={title} content={content} scheme={Cinnamon.Crisp.SCHEME_RED} icon={<ErrorOutlineIcon />} /> });

const bodyFor = (service, date, holiday) => ({
  date,
  origin_station: service.origin_station,
  destination_station: service.destination_station,
  line_name: service.line_name,
  train_type: service.train_type,
  distance_km: service.distance_km,
  is_public_holiday: holiday ? 1 : 0,
  class_capacity: service.default_capacity,
});

const Adaptivedemanddashboard = () => {
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [service, setService] = useState(null);
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState('');
  const [holiday, setHoliday] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const { holidayDates, loading: holidayCalendarLoading, error: holidayCalendarError } =
    useSriLankanHolidays(API, date);

  useEffect(() => {
    axios.get(`${API}/train_services`)
      .then((res) => {
        if (res.data.success) setServices(res.data.train_services);
        else raiseError('Failed to Load Trains', 'Could not load train services.');
      })
      .catch((requestError) => raiseError(
        'Train Services Failed',
        getApiErrorMessage(requestError, 'Train services')
      ))
      .finally(() => setServicesLoading(false));
  }, []);

  useEffect(() => {
    if (holidayDates[date] !== undefined) setHoliday(holidayDates[date]);
  }, [date, holidayDates]);

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
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await axios.post(`${API}/seat_allocation`, bodyFor(service, date, selectedHoliday));
      if (res.data.success) setResult(res.data);
      else throw new Error(res.data.error);
    } catch (err) {
      const message = getApiErrorMessage(err, 'Seat allocation');
      setError(message);
      raiseError('Allocation Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const rows = result ? CLASSES.map((name) => ({ name, ...result.allocation_by_class[name], capacity: service.default_capacity[name] })) : [];
  const chartData = rows.map((row) => ({ class: row.name, 'Predicted Demand': row.predicted_demand, 'Allocated Seats': row.allocated_seats, 'Train Capacity': row.capacity }));
  const totals = rows.reduce((sum, row) => ({
    demand: sum.demand + Number(row.predicted_demand || 0),
    capacity: sum.capacity + Number(row.capacity || 0),
    allocated: sum.allocated + Number(row.allocated_seats || 0),
    unmet: sum.unmet + Number(row.unmet_demand || 0),
  }), { demand: 0, capacity: 0, allocated: 0, unmet: 0 });
  const selectedHoliday = Boolean(holiday || holidayDates[date]);

  return (
    <div className="add-page">
      <div className="add-header"><h1 className="add-heading">Adaptive Seat Allocation</h1><p className="add-subheading">Seat allocation based on predicted passenger demand and available train capacity.</p></div>
      <div className="add-card add-controls">
        <select className="add-input" value={serviceId} onChange={(event) => { setServiceId(event.target.value); setService(services.find((item) => item.id === event.target.value) || null); setResult(null); }} disabled={servicesLoading}>
          <option value="">{servicesLoading ? 'Loading trains...' : 'Select Train'}</option>
          {services.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <input className="add-input" type="date" value={date} onChange={(event) => { setDate(event.target.value); setHoliday(false); setResult(null); }} />
        <label className="add-checkbox"><input type="checkbox" checked={selectedHoliday} onChange={(event) => { setHoliday(holidayDates[date] ? true : event.target.checked); setResult(null); }} />Public Holiday</label>
        <button className="add-run-btn" onClick={handleRun} disabled={loading || holidayCalendarLoading || Boolean(holidayCalendarError)}>{loading ? 'Running...' : 'Run'}</button>
      </div>
      {holidayCalendarLoading && date && <div className="add-state">Loading Sri Lankan public holiday calendar...</div>}
      {holidayCalendarError && <div className="add-state add-error">Public holiday calendar unavailable: {holidayCalendarError}</div>}
      {service && <div className="add-route-summary"><span><strong>Route:</strong> {service.label}</span><span><strong>Line:</strong> {service.line_name}</span><span><strong>Distance:</strong> {service.distance_km} km</span></div>}
      {loading && <div className="add-state">Loading allocation...</div>}
      {error && !loading && <div className="add-state add-error">{error}</div>}
      {result && !loading && <>
        <p className="add-state">Predicted passenger counts are estimates from the trained model.</p>
        <div className="add-allocation-stats"><div className="add-stat"><span className="add-stat-label">Predicted Demand</span><span className="add-stat-value">{formatNumber(totals.demand)}</span></div><div className="add-stat"><span className="add-stat-label">Train Capacity</span><span className="add-stat-value">{formatNumber(totals.capacity)}</span></div><div className="add-stat"><span className="add-stat-label">Allocated Seats</span><span className="add-stat-value">{formatNumber(totals.allocated)}</span></div><div className="add-stat"><span className="add-stat-label">Unmet Demand</span><span className="add-stat-value">{formatNumber(totals.unmet)}</span></div></div>
        <div className="add-card add-chart-card"><h2 className="add-card-title">Predicted Demand vs Allocated Seats vs Train Capacity</h2><ResponsiveContainer width="100%" height={320}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" /><XAxis dataKey="class" stroke="var(--chart-axis)" /><YAxis stroke="var(--chart-axis)" /><Tooltip /><Legend /><Bar dataKey="Predicted Demand" fill="#4C8DFF" /><Bar dataKey="Allocated Seats" fill="#A855F7" /><Bar dataKey="Train Capacity" fill="#22C55E" /></BarChart></ResponsiveContainer></div>
        <div className="add-card add-allocation-card"><h3 className="add-card-title">Allocation by Class</h3><table className="add-allocation-table"><thead><tr><th>Class</th><th>Predicted Demand</th><th>Allocated Seats</th><th>Unmet Demand</th><th>Utilization</th></tr></thead><tbody>{rows.map((row) => <tr key={row.name}><td>{row.name}</td><td>{row.predicted_demand}</td><td>{row.allocated_seats}</td><td>{row.unmet_demand}</td><td>{row.expected_utilization_pct}%</td></tr>)}</tbody></table></div>
      </>}
    </div>
  );
};

export default Adaptivedemanddashboard;
