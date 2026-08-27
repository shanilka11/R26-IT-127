import React, { useState, useEffect, useCallback } from 'react';
import ButterToast, { Cinnamon } from 'butter-toast';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import axios from 'axios';
import LocalIP from './../LocalIP';
import './FraudDashboard.css';

const API = `${LocalIP}:5555`;

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

const tierClass = (tier) => `tier-${(tier || '').toLowerCase().replace(/\s+/g, '-')}`;

const TABS = [
  { key: 'main', label: 'Main Dashboard' },
  { key: 'fraud', label: 'Fraud Detection' },
  { key: 'anomaly', label: 'Anomaly Detection' },
  { key: 'risk', label: 'Risk Analysis' },
  { key: 'verification', label: 'Passenger Verification' },
  { key: 'workload', label: 'Inspection Workload' },
  { key: 'predict', label: 'Future Prediction' },
];

const KpiCard = ({ label, value, tone }) => (
  <div className="fd-kpi-card">
    <span>{label}</span>
    <strong className={tone ? `fd-kpi-${tone}` : ''}>{value}</strong>
  </div>
);

const BarList = ({ data, labelKey, valueKey, colorFn }) => {
  const max = Math.max(1, ...data.map((d) => Number(d[valueKey]) || 0));
  return (
    <div className="fd-barlist">
      {data.map((d, i) => (
        <div className="fd-barlist-row" key={i}>
          <span className="fd-barlist-label">{d[labelKey]}</span>
          <div className="fd-barlist-track">
            <div
              className="fd-barlist-fill"
              style={{
                width: `${(100 * (Number(d[valueKey]) || 0)) / max}%`,
                background: colorFn ? colorFn(d) : undefined,
              }}
            />
          </div>
          <span className="fd-barlist-value">{d[valueKey]}</span>
        </div>
      ))}
    </div>
  );
};

const Donut = ({ segments }) => {
  // segments: [{label, value, color}]
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let acc = 0;
  const stops = segments.map((s) => {
    const start = (acc / total) * 360;
    acc += s.value;
    const end = (acc / total) * 360;
    return `${s.color} ${start}deg ${end}deg`;
  });
  return (
    <div className="fd-donut-wrap">
      <div className="fd-donut" style={{ background: `conic-gradient(${stops.join(',')})` }}>
        <div className="fd-donut-hole">
          <strong>{total}</strong>
          <span>total</span>
        </div>
      </div>
      <div className="fd-donut-legend">
        {segments.map((s, i) => (
          <div key={i} className="fd-legend-row">
            <span className="fd-legend-dot" style={{ background: s.color }} />
            {s.label}: {s.value}
          </div>
        ))}
      </div>
    </div>
  );
};

const LoadingBlock = () => <div className="fd-loading">Loading...</div>;
const ErrorBlock = ({ msg }) => <div className="fd-error-block">{msg}</div>;

function useApiGet(path, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    axios
      .get(`${API}${path}`)
      .then((res) => setData(res.data))
      .catch(() => setError('Could not reach the server. Please try again.'))
      .finally(() => setLoading(false));
  }, deps);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload };
}

const MainDashboardTab = () => {
  const { data, loading, error } = useApiGet('/dashboard/summary');
  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock msg={error} />;
  return (
    <div className="fd-kpi-grid">
      <KpiCard label="Total Ticket Transactions" value={data.total_ticket_transactions.toLocaleString()} />
      <KpiCard label="Suspicious Transactions" value={data.suspicious_transactions.toLocaleString()} tone="amber" />
      <KpiCard label="High-Risk Passengers" value={data.high_risk_passengers.toLocaleString()} tone="red" />
      <KpiCard label="Fraud Detection Rate" value={`${data.fraud_detection_rate_pct}%`} tone="green" />
      <KpiCard label="Average Risk Score" value={data.average_risk_score} />
      <KpiCard label="Passengers Flagged for Inspection" value={data.passengers_flagged_for_inspection.toLocaleString()} tone="amber" />
    </div>
  );
};

const FraudDetectionTab = () => {
  const { data, loading, error } = useApiGet('/fraud-detection/overview');
  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock msg={error} />;

  return (
    <div className="fd-section-grid">
      <div className="fd-card">
        <h3>Normal vs Suspicious Transactions</h3>
        <Donut
          segments={[
            { label: 'Normal', value: data.normal_vs_suspicious.normal, color: 'var(--accent-blue)' },
            { label: 'Suspicious', value: data.normal_vs_suspicious.suspicious, color: 'var(--accent-red)' },
          ]}
        />
      </div>

      <div className="fd-card">
        <h3>Fraud Type Distribution</h3>
        <BarList
          data={Object.entries(data.fraud_type_distribution).map(([k, v]) => ({ type: k, count: v }))}
          labelKey="type"
          valueKey="count"
          colorFn={() => 'var(--accent-purple)'}
        />
      </div>

      <div className="fd-card fd-card-wide">
        <h3>Fraud Detection Trend</h3>
        <BarList
          data={data.fraud_detection_trend.map((m) => ({ label: m.month, count: m.actual_fraud }))}
          labelKey="label"
          valueKey="count"
          colorFn={() => 'var(--accent-red)'}
        />
      </div>

      <div className="fd-card">
        <h3>Fraud by Route</h3>
        <BarList
          data={data.fraud_by_route}
          labelKey="route"
          valueKey="fraud_rate_pct"
          colorFn={() => 'var(--accent-amber)'}
        />
      </div>

      <div className="fd-card fd-card-wide">
        <h3>Recent Fraud Alerts</h3>
        <div className="fd-table-wrap">
          <table className="fd-table">
            <thead>
              <tr>
                <th>Transaction</th><th>Passenger</th><th>Date</th><th>Route</th>
                <th>Risk Score</th><th>Type</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_fraud_alerts.map((a) => (
                <tr key={a.transaction_id} className="fd-row-flagged">
                  <td>{a.transaction_id}</td>
                  <td>{a.passenger_name}</td>
                  <td>{a.date}</td>
                  <td>{a.route}</td>
                  <td>{a.risk_score}</td>
                  <td>{a.suspected_fraud_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ModelBlock = ({ title, block }) => (
  <div className="fd-card">
    <h3>{title}</h3>
    {block ? (
      <div className="fd-kpi-grid fd-kpi-grid-compact">
        <KpiCard label="Flagged (score ≥ 0.5)" value={block.flagged_count} />
        <KpiCard label="Mean Score" value={block.mean_score} />
      </div>
    ) : (
      <p className="fd-muted">Not available yet — see notebook_patch_instructions.md</p>
    )}
  </div>
);

const AnomalyDetectionTab = () => {
  const { data, loading, error } = useApiGet('/anomaly-detection/overview');
  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock msg={error} />;

  return (
    <div className="fd-section-grid">
      <ModelBlock title="Isolation Forest Results" block={data.isolation_forest_results} />
      <ModelBlock title="One-Class SVM Results" block={data.one_class_svm_results} />
      <ModelBlock title="Autoencoder Results" block={data.autoencoder_results} />

      <div className="fd-card fd-card-wide">
        <h3>Model Performance Comparison</h3>
        {data.model_performance_comparison ? (
          <div className="fd-table-wrap">
            <table className="fd-table">
              <thead>
                <tr><th>Model</th><th>Precision</th><th>Recall</th><th>F1-score</th><th>ROC-AUC</th></tr>
              </thead>
              <tbody>
                {data.model_performance_comparison.map((m) => (
                  <tr key={m.Model}>
                    <td>{m.Model}</td><td>{m.Precision}</td><td>{m.Recall}</td>
                    <td>{m['F1-score']}</td><td>{m['ROC-AUC']}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="fd-muted">Not available yet — see notebook_patch_instructions.md</p>
        )}
      </div>

      <div className="fd-card fd-card-wide">
        <h3>Anomaly Score Distribution (ensemble risk score)</h3>
        <BarList
          data={data.anomaly_score_distribution.ensemble}
          labelKey="bucket"
          valueKey="count"
          colorFn={() => 'var(--accent-blue)'}
        />
      </div>
    </div>
  );
};

const RiskAnalysisTab = () => {
  const { data, loading, error } = useApiGet('/risk-analysis/overview');
  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock msg={error} />;

  return (
    <div className="fd-section-grid">
      <div className="fd-card">
        <h3>High / Medium / Low Risk Transactions</h3>
        <Donut
          segments={[
            { label: 'High', value: data.risk_tier_breakdown.High, color: 'var(--accent-red)' },
            { label: 'Medium', value: data.risk_tier_breakdown.Medium, color: 'var(--accent-amber)' },
            { label: 'Low', value: data.risk_tier_breakdown.Low, color: 'var(--accent-green)' },
          ]}
        />
      </div>

      <div className="fd-card fd-card-wide">
        <h3>Risk Score Distribution</h3>
        <BarList
          data={data.risk_score_distribution}
          labelKey="bucket"
          valueKey="count"
          colorFn={() => 'var(--accent-purple)'}
        />
      </div>

      <div className="fd-card">
        <h3>Top Risk Factors (Explainable)</h3>
        <BarList
          data={data.top_risk_factors}
          labelKey="reason"
          valueKey="count"
          colorFn={() => 'var(--accent-amber)'}
        />
      </div>

      <div className="fd-card">
        <h3>Risk by Fraud Type</h3>
        <BarList
          data={data.risk_by_fraud_type}
          labelKey="suspected_fraud_type"
          valueKey="avg_risk_score"
          colorFn={() => 'var(--accent-red)'}
        />
      </div>
    </div>
  );
};

const PassengerVerificationTab = () => {
  const [riskTier, setRiskTier] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const { data, loading, error, reload } = useApiGet(
    `/passenger-verification/list?risk_tier=${riskTier}&search=${encodeURIComponent(search)}&page=${page}&page_size=${pageSize}`,
    [riskTier, search, page]
  );

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  return (
    <div className="fd-card fd-card-wide">
      <div className="fd-verification-controls">
        <select
          className="fbc-input"
          value={riskTier}
          onChange={(e) => { setRiskTier(e.target.value); setPage(1); }}
        >
          <option value="">All Risk Tiers</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <input
          className="fbc-input"
          placeholder="Search passenger / transaction..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <button className="fbc-submit-btn fd-btn-compact" onClick={reload}>Refresh</button>
      </div>

      {loading ? <LoadingBlock /> : error ? <ErrorBlock msg={error} /> : (
        <>
          <div className="fd-table-wrap">
            <table className="fd-table">
              <thead>
                <tr>
                  <th>Transaction</th><th>Passenger</th><th>Date</th><th>Route</th>
                  <th>Risk Score</th><th>Risk Tier</th><th>Fraud Type</th>
                  <th>Reason for Flagging</th><th>Verification Status</th>
                </tr>
              </thead>
              <tbody>
                {data.passengers.map((p) => (
                  <tr key={p.transaction_id} className="fd-row-flagged">
                    <td>{p.transaction_id}</td>
                    <td>{p.passenger_name} ({p.passenger_id})</td>
                    <td>{p.date}</td>
                    <td>{p.route}</td>
                    <td>{p.risk_score}</td>
                    <td><span className={`fbc-chip ${tierClass(p.risk_category)}`}>{p.risk_category}</span></td>
                    <td>{p.suspected_fraud_type}</td>
                    <td className="fd-reason-cell">{p.reason_for_flagging}</td>
                    <td>{p.verification_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="fd-pagination">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <span>Page {page} of {totalPages} ({data.total} results)</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </>
      )}
    </div>
  );
};

const InspectionWorkloadTab = () => {
  const { data, loading, error } = useApiGet('/inspection-workload/overview');
  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock msg={error} />;

  return (
    <div className="fd-section-grid">
      <div className="fd-kpi-grid fd-card-wide">
        <KpiCard label="Passengers Flagged for Inspection" value={data.passengers_flagged_for_inspection} tone="amber" />
        <KpiCard label="Inspection Rate" value={`${data.inspection_rate_pct}%`} />
        <KpiCard label="Fraud Detection Rate" value={`${data.fraud_detection_rate_pct}%`} tone="green" />
        <KpiCard label="Recommended Risk Threshold" value={data.recommended_risk_threshold} tone="red" />
      </div>

      <div className="fd-card fd-card-wide">
        <h3>Inspector Workload vs Detection Performance</h3>
        <div className="fd-table-wrap">
          <table className="fd-table">
            <thead>
              <tr><th>Threshold</th><th>Inspection Rate %</th><th>Detection Rate %</th></tr>
            </thead>
            <tbody>
              {data.workload_vs_detection_curve.map((row) => (
                <tr key={row.threshold} className={row.threshold === data.recommended_risk_threshold ? 'fd-row-flagged' : ''}>
                  <td>{row.threshold}</td>
                  <td>{row.inspection_rate_pct}</td>
                  <td>{row.detection_rate_pct}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const FuturePredictionTab = () => {
  const [routes, setRoutes] = useState([]);
  const [trainRoute, setTrainRoute] = useState('');
  const [date, setDate] = useState('');
  const [nPassengers, setNPassengers] = useState('40');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    axios.get(`${API}/meta/options`).then((res) => setRoutes(res.data.routes || []));
  }, []);

  const validation = () => {
    if (!trainRoute) { raiseError('Validation Error!', 'Please select a train route.'); return false; }
    if (!date) { raiseError('Validation Error!', 'Please select a date.'); return false; }
    if (!nPassengers || Number(nPassengers) <= 0) {
      raiseError('Validation Error!', 'Passenger count must be a positive number.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validation()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await axios.post(`${API}/predict_batch`, {
        train_route: trainRoute,
        date,
        n_passengers: Number(nPassengers),
      }, { headers: { 'Content-Type': 'application/json' } });

      if (res.data.success) {
        setResult(res.data);
      } else {
        raiseError('Prediction Failed', res.data.error || 'Something went wrong.');
      }
    } catch (err) {
      raiseError('Network Error!', 'Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="fd-card fd-card-wide">
      <p className="fd-muted" style={{ marginBottom: 16 }}>
        Select an upcoming route &amp; date to simulate expected ticket transactions and see
        the model's predicted fraud exposure before the service runs.
      </p>

      <div className="fbc-form">
        <select className="fbc-input" value={trainRoute} onChange={(e) => setTrainRoute(e.target.value)}>
          <option value="">Select Train Route</option>
          {routes.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>

        <input
          className="fbc-input"
          type="date"
          min={todayStr}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <input
          className="fbc-input"
          type="number"
          min="1"
          placeholder="Number of Passengers"
          value={nPassengers}
          onChange={(e) => setNPassengers(e.target.value)}
        />
      </div>

      <button className="fbc-submit-btn" onClick={handleSubmit} disabled={loading} style={{ marginTop: 20 }}>
        {loading ? 'Running Simulation...' : 'Run Simulation'}
      </button>

      {result && (
        <div className="fbc-result" style={{ marginTop: 28 }}>
          <h3 className="fbc-result-title">
            {result.summary.train_route} · {result.summary.date} ({result.summary.day_of_week})
          </h3>

          <div className="fbc-stat-row">
            <div className="fbc-stat-card"><span>Total Passengers</span><strong>{result.summary.total_passengers}</strong></div>
            <div className="fbc-stat-card"><span>Flagged as Fraud</span><strong className="fbc-stat-danger">{result.summary.predicted_fraud_count}</strong></div>
            <div className="fbc-stat-card"><span>Fraud Rate</span><strong className="fbc-stat-danger">{result.summary.fraud_rate_pct}%</strong></div>
          </div>

          <div className="fbc-breakdown">
            <div>
              <p className="fbc-breakdown-label">Risk Tier Breakdown</p>
              <div className="fbc-chip-row">
                {Object.entries(result.summary.risk_tier_breakdown).map(([tier, count]) => (
                  <span key={tier} className={`fbc-chip ${tierClass(tier)}`}>{tier}: {count}</span>
                ))}
              </div>
            </div>
            {Object.keys(result.summary.fraud_type_breakdown).length > 0 && (
              <div>
                <p className="fbc-breakdown-label">Fraud Type Breakdown</p>
                <div className="fbc-chip-row">
                  {Object.entries(result.summary.fraud_type_breakdown).map(([type, count]) => (
                    <span key={type} className="fbc-chip tier-flagged">{type}: {count}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <p className="fbc-breakdown-label" style={{ marginTop: 20 }}>Transactions</p>
          <div className="fbc-table-wrap">
            <table className="fbc-table">
              <thead>
                <tr><th>Transaction</th><th>Risk Score</th><th>Risk Tier</th><th>Fraud Type</th></tr>
              </thead>
              <tbody>
                {result.predictions.map((p) => (
                  <tr key={p.transaction_id} className={p.is_flagged_fraud ? 'fbc-row-flagged' : ''}>
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
    </div>
  );
};

const FraudDashboard = () => {
  const [activeTab, setActiveTab] = useState('main');

  const renderTab = () => {
    switch (activeTab) {
      case 'main': return <MainDashboardTab />;
      case 'fraud': return <FraudDetectionTab />;
      case 'anomaly': return <AnomalyDetectionTab />;
      case 'risk': return <RiskAnalysisTab />;
      case 'verification': return <PassengerVerificationTab />;
      case 'workload': return <InspectionWorkloadTab />;
      case 'predict': return <FuturePredictionTab />;
      default: return null;
    }
  };

  return (
    <div className="fbc-page">
      <h1 className="fbc-heading">Ticket Fraud Detection Dashboard</h1>
      <p className="fbc-subheading">Sri Lanka Railways — Intelligent Risk-Aware Passenger Verification</p>

      <div className="fd-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`fd-tab ${activeTab === t.key ? 'fd-tab-active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="fd-tab-content">
        {renderTab()}
      </div>
    </div>
  );
};

export default FraudDashboard;
