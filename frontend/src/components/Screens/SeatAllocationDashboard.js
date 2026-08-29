import React, { useState, useEffect, useMemo } from 'react';
import ButterToast, { Cinnamon } from 'butter-toast';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import axios from 'axios';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import LocalIP from './../LocalIP';
import './Adaptivedemanddashboard.css';

const FLASK_API_BASE = `${LocalIP}:4444`;

const NODE_API_BASE = `${LocalIP}:4000`;

const CLASSES = ['1st Class', '2nd Class', '3rd Class'];
const CLASS_COLORS = {
  '1st Class': '#4C8DFF',
  '2nd Class': '#A855F7',
  '3rd Class': '#22C55E',
};

// Maps database column names (1c, 2c, 3c) to class display names
const API_KEY_TO_CLASS = {
  '1c': '1st Class',
  '2c': '2nd Class',
  '3c': '3rd Class',
};

const raiseError = (title, content) => {
  ButterToast.raise({
    content: (
      <Cinnamon.Crisp
        title={title}
        content={content}
        scheme={Cinnamon.Crisp.SCHEME_RED}
        icon={<ErrorOutlineIcon />}
      />
    ),
  });
};

function computeSeatAllocation(predictedByClass, capacityByClass) {
  const trainCapacity = CLASSES.reduce((s, c) => s + (capacityByClass[c] || 0), 0);
  const totalPredicted = CLASSES.reduce((s, c) => s + (predictedByClass[c] || 0), 0);

  const allocated = {};
  if (totalPredicted <= trainCapacity) {
    CLASSES.forEach((c) => {
      allocated[c] = Math.min(predictedByClass[c] || 0, capacityByClass[c] || 0);
    });
  } else {
    CLASSES.forEach((c) => {
      const share = totalPredicted > 0 ? (predictedByClass[c] || 0) / totalPredicted : 0;
      allocated[c] = Math.min(predictedByClass[c] || 0, Math.round(share * trainCapacity));
    });
  }

  const rows = CLASSES.map((c) => {
    const predicted = predictedByClass[c] || 0;
    const seats = allocated[c] || 0;
    const unmet = Math.max(0, predicted - seats);
    const utilization = predicted > 0 ? Math.round((seats / predicted) * 10000) / 100 : 0;
    return { class: c, predicted, allocated: seats, unmet, utilization };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      predicted: acc.predicted + r.predicted,
      allocated: acc.allocated + r.allocated,
      unmet: acc.unmet + r.unmet,
    }),
    { predicted: 0, allocated: 0, unmet: 0 }
  );
  const totalUtilization = totals.predicted > 0
    ? Math.round((totals.allocated / totals.predicted) * 10000) / 100
    : 0;

  return { rows, trainCapacity, totals: { ...totals, utilization: totalUtilization } };
}

const AdaptiveDemandDashboard = () => {
  const [trainServices, setTrainServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);

  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedService, setSelectedService] = useState(null);

  const [date, setDate] = useState('');
  const [isPublicHoliday, setIsPublicHoliday] = useState(false);
  const [isCovidLockdown, setIsCovidLockdown] = useState(false);

  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null); // raw /predict_demand response
  const [actualByClass, setActualByClass] = useState(null); // {class: number} | null
  const [actualError, setActualError] = useState(false);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await axios.get(`${FLASK_API_BASE}/train_services`);
        if (res.data.success) {
          setTrainServices(res.data.train_services);
        } else {
          raiseError('Failed to Load Trains', 'Could not load the list of trains from the server.');
        }
      } catch (err) {
        raiseError('Network Error!', 'Could not reach the server to load train services.');
      } finally {
        setServicesLoading(false);
      }
    };
    fetchServices();
  }, []);

  const handleServiceChange = (e) => {
    const id = e.target.value;
    setSelectedServiceId(id);
    setSelectedService(trainServices.find((s) => s.id === id) || null);
    setPrediction(null);
    setActualByClass(null);
  };

  const validation = () => {
    if (!selectedService) {
      raiseError('Validation Error!', 'Please select a train.');
      return false;
    }
    if (!date) {
      raiseError('Validation Error!', 'Date is required!');
      return false;
    }
    return true;
  };

  const fetchActualDemand = async (service, forDate) => {
    try {
      const res = await axios.get(`${NODE_API_BASE}/train/actual_demand`, {
        params: {
          origin: service.origin_station,
          destination: service.destination_station,
          train_type: service.train_type,
          date: forDate,
        },
      });
      if (res.data && res.data.success) {
        // Transform database fields (1c, 2c, 3c) to class-based object
        const actualByClassMap = {
          '1st Class': res.data['1c'] || 0,
          '2nd Class': res.data['2c'] || 0,
          '3rd Class': res.data['3c'] || 0,
        };
        setActualByClass(actualByClassMap);
        setActualError(false);
      } else {
        setActualByClass(null);
        setActualError(true);
      }
    } catch (err) {
      setActualByClass(null);
      setActualError(true);
    }
  };

  const handleRun = async () => {
    if (!validation()) return;

    setLoading(true);
    setPrediction(null);
    setActualByClass(null);
    setActualError(false);

    try {
      const res = await axios.post(
        `${FLASK_API_BASE}/predict_demand`,
        {
          date,
          origin_station: selectedService.origin_station,
          destination_station: selectedService.destination_station,
          line_name: selectedService.line_name,
          train_type: selectedService.train_type,
          distance_km: selectedService.distance_km,
          is_public_holiday: isPublicHoliday ? 1 : 0,
          is_covid_lockdown_period: isCovidLockdown ? 1 : 0,
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (res.data.success) {
        setPrediction(res.data);
        fetchActualDemand(selectedService, date); // best-effort, doesn't block
      } else {
        raiseError('Prediction Failed', res.data.error || 'Something went wrong.');
      }
    } catch (err) {
      raiseError('Network Error!', 'Could not reach the prediction server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const predictedByClass = useMemo(() => {
    if (!prediction) return null;
    const out = {};
    CLASSES.forEach((c) => {
      out[c] = prediction.predicted_demand_by_class[c]?.predicted_demand ?? 0;
    });
    return out;
  }, [prediction]);

  const capacityByClass = useMemo(() => {
    if (!prediction) return null;
    const out = {};
    CLASSES.forEach((c) => {
      out[c] = prediction.predicted_demand_by_class[c]?.seat_capacity ?? 0;
    });
    return out;
  }, [prediction]);

  const donutData = useMemo(() => {
    if (!predictedByClass) return [];
    return CLASSES.map((c) => ({ name: c, value: predictedByClass[c] }));
  }, [predictedByClass]);

  const totalPredicted = useMemo(
    () => (predictedByClass ? CLASSES.reduce((s, c) => s + predictedByClass[c], 0) : 0),
    [predictedByClass]
  );

  const actualVsPredictedData = useMemo(() => {
    if (!predictedByClass) return [];
    return CLASSES.map((c) => ({
      class: c,
      Predicted: predictedByClass[c],
      Actual: actualByClass ? (actualByClass[c] ?? 0) : null,
    }));
  }, [predictedByClass, actualByClass]);

  const allocation = useMemo(() => {
    if (!predictedByClass || !capacityByClass) return null;
    return computeSeatAllocation(predictedByClass, capacityByClass);
  }, [predictedByClass, capacityByClass]);

  return (
    <div className="add-page">
      <div className="add-header">
        <h1 className="add-heading">Actual vs Predicted Seat Allocation</h1>
        <p className="add-subheading">Demand analysis and adaptive capacity planning across travel classes.</p>
      </div>

      <div className="add-card add-controls">
        <select
          className="add-input"
          value={selectedServiceId}
          onChange={handleServiceChange}
          disabled={servicesLoading}
        >
          <option value="">{servicesLoading ? 'Loading trains...' : 'Select Train'}</option>
          {trainServices.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>

        <input
          className="add-input"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <label className="add-checkbox">
          <input
            type="checkbox"
            checked={isPublicHoliday}
            onChange={(e) => setIsPublicHoliday(e.target.checked)}
          />
          Public Holiday
        </label>

        <label className="add-checkbox">
          <input
            type="checkbox"
            checked={isCovidLockdown}
            onChange={(e) => setIsCovidLockdown(e.target.checked)}
          />
          COVID Lockdown Period
        </label>

        <button className="add-run-btn" onClick={handleRun} disabled={loading}>
          {loading ? 'Running...' : 'Run'}
        </button>
      </div>

      {selectedService && (
        <div className="add-route-summary">
          <span><strong>Route:</strong> {selectedService.label}</span>
          <span><strong>Line:</strong> {selectedService.line_name}</span>
          <span><strong>Distance:</strong> {selectedService.distance_km} km</span>
        </div>
      )}

      {prediction && (
        <div className="add-grid">
          {/* --- Donut: Demand by Travel Class (Predicted) --- */}
          <div className="add-card add-chart-card">
            <h3 className="add-card-title">Demand by Travel Class (Predicted)</h3>
            <div className="add-donut-wrap">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {donutData.map((entry) => (
                      <Cell key={entry.name} fill={CLASS_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--chart-tooltip-border)', borderRadius: 8 }}
                    formatter={(value, name) => [
                      `${value} (${totalPredicted ? ((value / totalPredicted) * 100).toFixed(1) : 0}%)`,
                      name,
                    ]}
                  />
                  <Legend
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    formatter={(value) => {
                      const item = donutData.find((d) => d.name === value);
                      const pct = totalPredicted ? ((item.value / totalPredicted) * 100).toFixed(1) : 0;
                      return `${value}  ${item.value} (${pct}%)`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="add-donut-center">
                <span className="add-donut-label">Total</span>
                <span className="add-donut-total">{totalPredicted.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* --- Actual vs Predicted --- */}
          <div className="add-card add-chart-card">
            <h3 className="add-card-title">Actual vs Predicted Demand</h3>
            {actualError && (
              <p className="add-hint-warning">
                Actual data unavailable for this route/date — showing predicted demand only.
              </p>
            )}
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={actualVsPredictedData} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="class" stroke="var(--chart-axis)" />
                <YAxis stroke="var(--chart-axis)" />
                <Tooltip
                  contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--chart-tooltip-border)', borderRadius: 8 }}
                />
                <Legend />
                <Bar dataKey="Actual" fill="#3EA6FF" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Predicted" fill="#A855F7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* --- Adaptive Seat Allocation --- */}
          {allocation && (
            <div className="add-card add-allocation-card">
              <div className="add-allocation-header">
                <div>
                  <h3 className="add-card-title">Adaptive Seat Allocation</h3>
                  <p className="add-allocation-sub">
                    {selectedService.label} &middot; Date: {date}
                  </p>
                </div>
              </div>

              <div className="add-allocation-stats">
                <div className="add-stat">
                  <span className="add-stat-label">Train Capacity</span>
                  <span className="add-stat-value">{allocation.trainCapacity.toLocaleString()}</span>
                  <span className="add-stat-unit">Seats</span>
                </div>
                <div className="add-stat">
                  <span className="add-stat-label">Predicted Demand</span>
                  <span className="add-stat-value">{allocation.totals.predicted.toLocaleString()}</span>
                  <span className="add-stat-unit">Passengers</span>
                </div>
                <div className="add-stat">
                  <span className="add-stat-label">Allocated Seats</span>
                  <span className="add-stat-value">{allocation.totals.allocated.toLocaleString()}</span>
                  <span className="add-stat-unit">Seats</span>
                </div>
                <div className="add-stat">
                  <span className="add-stat-label">Unmet Demand</span>
                  <span className="add-stat-value">{allocation.totals.unmet.toLocaleString()}</span>
                  <span className="add-stat-unit">Passengers</span>
                </div>
              </div>

              <table className="add-allocation-table">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Predicted Demand</th>
                    <th>Allocated Seats</th>
                    <th>Unmet Demand</th>
                    <th>Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {allocation.rows.map((r) => (
                    <tr key={r.class}>
                      <td>
                        <span
                          className="add-class-dot"
                          style={{ background: CLASS_COLORS[r.class] }}
                        />
                        {r.class}
                      </td>
                      <td>{r.predicted}</td>
                      <td>{r.allocated}</td>
                      <td>{r.unmet}</td>
                      <td>{r.utilization}%</td>
                    </tr>
                  ))}
                  <tr className="add-total-row">
                    <td>Total</td>
                    <td>{allocation.totals.predicted}</td>
                    <td>{allocation.totals.allocated}</td>
                    <td>{allocation.totals.unmet}</td>
                    <td>{allocation.totals.utilization}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdaptiveDemandDashboard;
