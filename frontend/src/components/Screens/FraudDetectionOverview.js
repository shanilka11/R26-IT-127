import React, { useEffect, useState } from 'react';
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

function ChartCard({ title, description, children, values, footer, showDataList = true }) {
  const dataList = <ul className={showDataList ? undefined : 'fd-overview-sr-only'} aria-label={`${title} values`}>
    {values.map(({ name, count }) => <li key={name}><span>{name}</span><strong>{count.toLocaleString()}</strong></li>)}
  </ul>;
  return (
    <section className="fd-overview-card">
      <h2>{title}</h2>
      <p className="fd-overview-note">{description}</p>
      {values.length ? <>
        <div className="fd-overview-chart" aria-hidden="true">{children}</div>
        {footer}
        {showDataList ? <details className="fd-overview-chart-values">
          <summary>View {title.toLowerCase()} data</summary>
          {dataList}
        </details> : dataList}
      </> : <p className="fd-overview-empty">No matching data for this chart.</p>}
    </section>
  );
}

export default function FraudDetectionOverview() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState({ search: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setData(null);
    axios.get(API, { params: query, signal: controller.signal }).then(({ data: result }) => {
      if (!active) return;
      if (!result.success) throw new Error(result.error || 'Unable to load the dashboard.');
      setData(result);
    }).catch((failure) => {
      if (active) setError(failure.response?.data?.error || 'Dashboard service unavailable. Please try again.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; controller.abort(); };
  }, [query]);

  const load = (filters) => {
    setError('');
    setData(null);
    setLoading(true);
    setQuery({ ...filters });
  };
  const apply = (event) => {
    event.preventDefault();
    load({ search: search.trim() });
  };

  const summary = data?.summary;
  const performance = data?.model_performance;
  const trend = data?.fraud_detection_trend.map((month) => ({ name: month.month, count: month.total_transactions })) || [];
  const types = Object.entries(data?.fraud_type_distribution || {}).map(([name, count]) => ({ name, count }));
  const categories = Object.entries(data?.ticket_category_distribution || {}).map(([name, count]) => ({ name, count }));

  return (
    <div className="fd-overview">
      <form className="fd-overview-filters" onSubmit={apply} aria-label="Dashboard search">
        <label className="fd-overview-search">Search transactions<input type="search" name="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Transaction, passenger, or route" /></label>
        <button className="fd-overview-apply" type="submit">Apply</button>
      </form>
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
          {!summary.total_ticket_transactions && <p className="fd-overview-empty" role="status">No assessed transactions match this search. Try another transaction, passenger, or route, or clear the search and select Apply.</p>}
          <div className="fd-overview-charts">
            <ChartCard title="Ticket Transactions Over Time" description="Monthly counts of matching assessed transactions" values={trend} showDataList={false}>
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
