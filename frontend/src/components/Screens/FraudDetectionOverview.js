import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import LocalIP from '../LocalIP';

const API = `${LocalIP}:5555/fraud-detection/overview`;
const COLORS = ['var(--accent-blue)', 'var(--accent-purple)', 'var(--accent-green)',
  'var(--accent-amber)', 'var(--accent-red)', 'var(--text-secondary)'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FRAUD_LABELS = { 'Abnormal Concession Usage': 'Concession', 'Suspicious Resale': 'Resale', 'Ticket Reuse': 'Reuse' };
const percent = (value) => value == null ? 'N/A' : `${value.toFixed(2)}%`;
const tooltipStyle = { backgroundColor: 'var(--chart-tooltip-bg)', borderColor: 'var(--chart-tooltip-border)', borderRadius: 10, color: 'var(--text-primary)' };

function ChartCard({ title, description, children, values, footer }) {
  return (
    <section className="fd-overview-card">
      <h2>{title}</h2>
      <p className="fd-overview-note">{description}</p>
      {values.length ? <>
        <div className="fd-overview-chart" aria-hidden="true">{children}</div>
        {footer}
        <details className="fd-overview-chart-values">
          <summary>View {title.toLowerCase()} data</summary>
          <ul>{values.map(({ name, count }) => <li key={name}><span>{name}</span><strong>{count.toLocaleString()}</strong></li>)}</ul>
        </details>
      </> : <p className="fd-overview-empty">No matching data for this chart.</p>}
    </section>
  );
}

export default function FraudDetectionOverview() {
  const [draft, setDraft] = useState({ start_date: '', end_date: '', search: '' });
  const [query, setQuery] = useState({});
  const [range, setRange] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [validation, setValidation] = useState('');
  const initialized = useRef(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setData(null);
    axios.get(API, { params: query, signal: controller.signal }).then(({ data: result }) => {
      if (!active) return;
      if (!result.success) throw new Error(result.error || 'Unable to load the dashboard.');
      setRange(result.available_date_range);
      if (!initialized.current) {
        initialized.current = true;
        setDraft({ ...result.available_date_range, search: '' });
      }
      setData(result);
    }).catch((failure) => {
      if (active) setError(failure.response?.data?.error || 'Dashboard service unavailable. Please try again.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; controller.abort(); };
  }, [query]);

  const load = (filters) => {
    setValidation('');
    setError('');
    setData(null);
    setLoading(true);
    setQuery({ ...filters });
  };
  const apply = (event) => {
    event.preventDefault();
    if (!draft.start_date || !draft.end_date) {
      setValidation('Choose both a start date and an end date.');
    } else if (draft.start_date > draft.end_date) {
      setValidation('Start date must be on or before end date.');
    } else {
      load({ ...draft, search: draft.search.trim() });
    }
  };
  const reset = () => {
    const filters = { ...range, search: '' };
    setDraft(filters);
    load(filters);
  };
  const update = (event) => {
    setDraft({ ...draft, [event.target.name]: event.target.value });
    setValidation('');
  };

  const summary = data?.summary;
  const performance = data?.model_performance;
  const filtersChanged = data && !loading && Object.keys(draft).some((key) =>
    draft[key].trim() !== (data.applied_filters[key] || ''));
  const trend = data?.fraud_detection_trend.map((month) => ({ name: month.month, count: month.total_transactions })) || [];
  const types = Object.entries(data?.fraud_type_distribution || {}).map(([name, count]) => ({ name, count }));
  const categories = Object.entries(data?.ticket_category_distribution || {}).map(([name, count]) => ({ name, count }));

  return (
    <div className="fd-overview">
      <form className="fd-overview-filters" onSubmit={apply} aria-label="Dashboard filters">
        <label>Start date<input type="date" name="start_date" value={draft.start_date || ''} onChange={update} required /></label>
        <label>End date<input type="date" name="end_date" value={draft.end_date || ''} onChange={update} required /></label>
        <label className="fd-overview-search">Search transactions<input type="search" name="search" value={draft.search} onChange={update} placeholder="Transaction, passenger, or route" /></label>
        <button className="fd-overview-apply" type="submit" disabled={!range}>Apply filters</button>
        <button type="button" onClick={reset} disabled={!range}>Reset</button>
      </form>
      {filtersChanged && <p className="fd-overview-note" role="status">Filters changed — select Apply filters.</p>}
      {validation && <p className="fd-overview-error" role="alert">{validation}</p>}
      <div aria-busy={loading}>
        {loading && <p className="fd-overview-status" role="status">Loading dashboard…</p>}
        {error && <div className="fd-overview-error" role="alert"><p>{error}</p><button type="button" onClick={() => load(query)}>Retry</button></div>}
        {data && <>
          <div className="fd-overview-kpis">
            {[
              ['Flagged Anomalies', summary.flagged_anomalies.toLocaleString(), 'slate', `Saved risk score at or above ${performance.risk_threshold}/100; suspected cases`],
              ['High Risk Passenger Alerts', summary.high_risk_passengers.toLocaleString(), 'red', 'Distinct passengers with a saved High-risk category'],
              ['Fraud Detection Rate', percent(summary.fraud_detection_rate_pct), 'blue', 'Recall: proportion of labeled fraud transactions flagged for review'],
            ].map(([label, value, tone, description]) => <section key={label} className={`fd-overview-kpi fd-overview-kpi-${tone}`} title={description}>
              <h2>{label}</h2><strong>{value}</strong><span className="fd-overview-sr-only">{description}</span>
            </section>)}
          </div>
          {!summary.total_ticket_transactions && <p className="fd-overview-empty" role="status">No assessed transactions match these filters. Adjust your dates or search, or select Reset.</p>}
          <div className="fd-overview-charts">
            <ChartCard title="Ticket Transactions Over Time" description="Monthly counts of matching assessed transactions" values={trend}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 12, right: 12, left: -22, bottom: 8 }}>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--chart-axis)', fontSize: 11 }} interval="preserveStartEnd" tickFormatter={(month) => MONTHS[Number(month.slice(5)) - 1]} />
                  <YAxis allowDecimals={false} tick={{ fill: 'var(--chart-axis)', fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: 'var(--text-primary)' }} />
                  <Area type="linear" dataKey="count" name="Transactions" stroke="var(--accent-blue)" fill="var(--accent-blue)" fillOpacity={0.14} strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Suspected Fraud Types" description="Flagged transactions grouped by suspected type" values={types}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={types} margin={{ top: 12, right: 8, left: -22, bottom: 8 }}>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--chart-axis)', fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={56} tickFormatter={(name) => FRAUD_LABELS[name] || name} />
                  <YAxis allowDecimals={false} tick={{ fill: 'var(--chart-axis)', fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: 'var(--text-primary)' }} cursor={{ fill: 'var(--bg-hover)' }} />
                  <Bar dataKey="count" name="Flagged transactions" radius={[5, 5, 0, 0]} isAnimationActive={false}>
                    {types.map((type, i) => <Cell key={type.name} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Ticket Category Distribution" description="Actual ticket types across all matching assessments" values={categories}
              footer={<ul className="fd-overview-legend">{categories.map((category, i) => <li key={category.name}>
                <span className="fd-overview-dot" style={{ background: COLORS[i % COLORS.length] }} />
                <span>{category.name}</span><strong>{(100 * category.count / summary.total_ticket_transactions).toFixed(1)}%</strong>
              </li>)}</ul>}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categories} dataKey="count" nameKey="name" innerRadius="50%" outerRadius="78%" paddingAngle={2} isAnimationActive={false} stroke="var(--bg-elevated)">
                    {categories.map((category, i) => <Cell key={category.name} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: 'var(--text-primary)' }} formatter={(value) => [`${value.toLocaleString()} (${(100 * value / summary.total_ticket_transactions).toFixed(1)}%)`, 'Transactions']} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <section className="fd-overview-card fd-overview-performance">
              <div><h2>Historical Model Performance</h2><p className="fd-overview-note">Retrospective evaluation of {performance.sample_count.toLocaleString()} saved assessments against historical fraud labels, using a {performance.risk_threshold}/100 flagging threshold. These values do not establish held-out or production performance.</p></div>
              <dl>{[['Precision', percent(performance.precision_pct)], ['Recall', percent(performance.recall_pct)], ['F1 Score', percent(performance.f1_pct)], ['ROC-AUC', performance.roc_auc == null ? 'N/A' : performance.roc_auc.toFixed(4)]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
              <p className="fd-overview-note">N/A means the filtered data cannot define that metric. Fraud Detection Rate is recall.</p>
            </section>
          </div>
          <div className="fd-overview-details">
            <section className="fd-overview-card"><h2>Fraud by Route</h2><p className="fd-overview-note">Flagged share of assessed transactions on each route</p>
              {data.fraud_by_route.length ? <div className="fd-overview-route-list">{data.fraud_by_route.map((route) => <div key={route.route}>
                <span>{route.route}</span><strong>{percent(route.fraud_rate_pct)}</strong>
                <progress value={route.fraud_rate_pct} max="100" aria-label={`${route.route}: flagged share`} />
                <small>{route.flagged.toLocaleString()} flagged / {route.total.toLocaleString()} assessed</small>
              </div>)}</div> : <p className="fd-overview-empty">No matching routes.</p>}
            </section>
            <section className="fd-overview-card"><h2>Recent High-risk Alerts</h2><p className="fd-overview-note">Latest 15 matching transactions with a saved High-risk category</p>
              {data.recent_fraud_alerts.length ? <div className="fd-table-wrap" tabIndex={0} role="region" aria-label="Recent High-risk Alerts table"><table className="fd-table"><thead><tr><th scope="col">Transaction</th><th scope="col">Passenger</th><th scope="col">Date</th><th scope="col">Route</th><th scope="col">Risk Score (0–100)</th><th scope="col">Suspected Type</th></tr></thead>
                <tbody>{data.recent_fraud_alerts.map((alert) => <tr key={alert.transaction_id}><td>{alert.transaction_id}</td><td>{alert.passenger_name}</td><td>{alert.date}</td><td>{alert.route}</td><td>{alert.risk_score}</td><td>{alert.suspected_fraud_type}</td></tr>)}</tbody>
              </table></div> : <p className="fd-overview-empty">No matching High-risk alerts.</p>}
            </section>
          </div>
        </>}
      </div>
    </div>
  );
}
