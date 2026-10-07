import React, { useEffect, useRef, useState } from 'react';
import { Modal } from 'antd';
import axios from 'axios';
import { verificationAPI, demoActor, requestUUID, apiError, colomboTime, simulationMode } from './verificationApi';
import './FraudBatchCheck.css';

const tierClass = (tier) => `tier-${tier.toLowerCase().replace(/\s+/g, '-')}`;
const localToday = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export default function FraudSimulation() {
  const initial = useRef(new URLSearchParams(window.location.search));
  const [mode, setMode] = useState(initial.current.get('mode') === 'historical_replay' ? 'historical_replay' : 'future');
  const [options, setOptions] = useState(null);
  const [optionsError, setOptionsError] = useState('');
  const [reload, setReload] = useState(0);
  const [trainRoute, setTrainRoute] = useState(initial.current.get('route') || '');
  const [date, setDate] = useState(initial.current.get('date') || '');
  const [nPassengers, setNPassengers] = useState('40');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const mutation = useRef(null);
  const pending = useRef(false);
  useEffect(() => {
    const abort = new AbortController();
    setOptionsError('');
    axios.get(`${verificationAPI}/journey-predictions/options`, { signal: abort.signal, timeout: 15000 })
      .then(({ data }) => { if (!abort.signal.aborted) setOptions(data); })
      .catch(err => { if (!abort.signal.aborted) setOptionsError(apiError(err, 'Simulation options unavailable. Start the prediction service and retry.')); });
    return () => abort.abort();
  }, [reload]);
  const controller = useRef(null);
  const resultTitle = useRef(null);
  useEffect(() => () => controller.current?.abort(), []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (pending.current) return;
    setResult(null);
    setError('');
    const count = Number(nPassengers);
    if (!options?.routes.includes(trainRoute)) { setError('Please select a train route.'); return; }
    if (mode === 'future' && (!date || date < (options.today || localToday()))) { setError('Choose today or a future date.'); return; }
    if (mode === 'historical_replay' && !options.historical_dates[trainRoute]?.includes(date)) { setError('Choose an imported route/date pair.'); return; }
    if (!demoActor()) { setError('Sign in with an active demo account before saving simulations.'); return; }
    if (!Number.isInteger(count) || count < 1 || count > 2000) {
      setError('Passenger count must be a whole number between 1 and 2,000.'); return;
    }
    const body = { train_route: trainRoute, date, n_passengers: count, mode, actor_user_id: demoActor() };
    const key = JSON.stringify(body);
    if (mutation.current?.key !== key) mutation.current = { key, id: requestUUID() };
    pending.current = true;
    setLoading(true);
    controller.current = new AbortController();
    try {
      const response = await axios.post(`${verificationAPI}/journey-predictions`, {
        ...body, request_id: mutation.current.id,
      }, { signal: controller.current.signal, timeout: 75000 });
      if (!response.data.success) throw new Error(response.data.error || 'Simulation failed.');
      setResult(response.data);
      mutation.current = null;
    } catch (err) {
      if (!axios.isCancel(err)) setError(err.response?.data?.error ||
        (err.request ? 'Simulation service unavailable. Please try again.' : err.message));
    } finally {
      pending.current = false;
      if (!controller.current.signal.aborted) setLoading(false);
    }
  };

  return (
    <section className="fraud-simulation" aria-label="Future fraud simulation">
      <p className="fd-muted">Save a simulation for a route and date. Historical Replay generates synthetic transactions; it does not reconstruct the passengers who travelled. Simulated IDs cannot be searched as imported tickets.</p>
      {initial.current.get('transaction_id') && <p><a href={`/FraudBatchCheck?transaction_id=${encodeURIComponent(initial.current.get('transaction_id'))}`}>Return to ticket verification and refresh saved journey risk</a></p>}
      {optionsError && <p role="alert">{optionsError} <button className="fbc-submit-btn" onClick={() => setReload(value => value + 1)}>Retry Options</button></p>}
      {!options && !optionsError && <p role="status">Loading supported routes…</p>}
      <form onSubmit={handleSubmit} noValidate>
        <label className="fbc-mode">Simulation mode<select className="fbc-input" value={mode} disabled={loading} onChange={event => { setMode(event.target.value); setDate(''); setError(''); }}>
          <option value="future">Future Simulation</option><option value="historical_replay">Historical Replay</option>
        </select></label>
        <div className="fbc-form">
          <label>Train route
            <select aria-label="Train route" className="fbc-input" value={trainRoute} onChange={(event) => { setTrainRoute(event.target.value); setDate(''); }} disabled={loading || !options}>
              <option value="">Select Train Route</option>
              {(options?.routes || []).map((route) => <option key={route} value={route}>{route}</option>)}
            </select>
          </label>
          <label>Simulation date
            {mode === 'historical_replay' ? <select className="fbc-input" value={date} onChange={event => setDate(event.target.value)} disabled={loading || !options}>
              <option value="">Select recorded date</option>{(options?.historical_dates[trainRoute] || []).map(value => <option key={value}>{value}</option>)}
            </select> : <input className="fbc-input" type="date" min={options?.today || localToday()} value={date} onChange={(event) => setDate(event.target.value)} disabled={loading} />}
          </label>
          <label>Number of passengers
            <input className="fbc-input" type="number" min="1" max="2000" step="1" value={nPassengers} onChange={(event) => setNPassengers(event.target.value)} disabled={loading} />
          </label>
        </div>
        {error && <p className="fraud-form-error" role="alert">{error}</p>}
        <button className="fbc-submit-btn" type="submit" disabled={loading || !options}>{loading ? 'Running Simulation...' : 'Run Simulation'}</button>
        {loading && <p role="status">Running simulation…</p>}
      </form>
      <Modal
        open={!!result}
        title="Simulation results"
        zIndex={1200}
        afterOpenChange={(open) => { if (open) resultTitle.current?.focus(); }}
        onCancel={() => setResult(null)}
        footer={null}
        centered
        width={720}
        className="fbc-result-modal"
      >
        {result && (
          <div className="fbc-result">
            <h3 className="fbc-result-title" ref={resultTitle} tabIndex={-1}>
              {result.summary.train_route} · {result.summary.date} ({result.summary.day_of_week})
            </h3>

            {result.journey_prediction && <div className="fbc-saved-journey" role="status">
              <strong>Saved · Simulation Journey Risk: {result.journey_prediction.risk_tier}</strong>
              <p>{simulationMode(result.journey_prediction.mode)} · Mean score {Number(result.journey_prediction.mean_risk_score).toFixed(3)} / 1<br />
                Generated {colomboTime(result.journey_prediction.created_at)} (Asia/Colombo)</p>
              <p>Derived mean of simulated passenger scores, not a separately validated route-risk model.</p>
            </div>}
            <div className="fbc-stat-row">
              <div className="fbc-stat-card">
                <span>Total Passengers</span>
                <strong>{result.summary.total_passengers}</strong>
              </div>
              <div className="fbc-stat-card">
                <span>Flagged as Fraud</span>
                <strong className="fbc-stat-danger">{result.summary.predicted_fraud_count}</strong>
              </div>
              <div className="fbc-stat-card">
                <span>Fraud Rate</span>
                <strong className="fbc-stat-danger">{result.summary.fraud_rate_pct}%</strong>
              </div>
            </div>

            <div className="fbc-breakdown">
              <div>
                <p className="fbc-breakdown-label">Risk Tier Breakdown</p>
                <div className="fbc-chip-row">
                  {Object.entries(result.summary.risk_tier_breakdown).map(([tier, count]) => (
                    <span key={tier} className={`fbc-chip ${tierClass(tier)}`}>
                      {tier}: {count}
                    </span>
                  ))}
                </div>
              </div>
              {Object.keys(result.summary.fraud_type_breakdown).length > 0 && (
                <div>
                  <p className="fbc-breakdown-label">Fraud Type Breakdown</p>
                  <div className="fbc-chip-row">
                    {Object.entries(result.summary.fraud_type_breakdown).map(([type, count]) => (
                      <span key={type} className="fbc-chip tier-flagged">
                        {type}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <p className="fbc-breakdown-label" style={{ marginTop: 20 }}>Transactions</p>
            <div className="fbc-table-wrap" tabIndex={0} role="region" aria-label="Simulated transactions">
              <table className="fbc-table">
                <thead>
                  <tr>
                    <th>Transaction</th>
                    <th>Risk Score (0–1)</th>
                    <th>Risk Tier</th>
                    <th>Fraud Type</th>
                  </tr>
                </thead>
                <tbody>
                  {result.predictions.map((p) => (
                    <tr key={p.transaction_id} className={p.is_flagged_fraud ? "fbc-row-flagged" : ""}>
                      <td>{p.transaction_id}</td>
                      <td>{p.ensemble_risk_score}</td>
                      <td><span className={`fbc-chip ${tierClass(p.risk_tier)}`}>{p.risk_tier}</span></td>
                      <td>{p.likely_fraud_type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
