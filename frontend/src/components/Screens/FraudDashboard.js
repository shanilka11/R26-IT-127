import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useHistory, useLocation } from 'react-router-dom';
import LocalIP from './../LocalIP';
import './FraudDashboard.css';
import FraudSimulation from './FraudSimulation';
import FraudDetectionOverview from './FraudDetectionOverview';

const API = `${LocalIP}:5555`;

const TABS = [
  { key: 'main', label: 'Main Dashboard' },
  { key: 'anomaly', label: 'Anomaly Detection' },
  { key: 'risk', label: 'Risk Analysis' },
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

const AnomalyDetectionTab = () => {
  const { data, loading, error } = useApiGet('/anomaly-detection/overview');
  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock msg={error} />;

  return (
    <div className="fd-section-grid">
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

const FraudDashboard = () => {
  const history = useHistory();
  const location = useLocation();
  const requestedTab = new URLSearchParams(location.search).get('tab');
  const activeTab = TABS.some((tab) => tab.key === requestedTab) ? requestedTab : 'main';

  useEffect(() => {
    if (requestedTab === 'fraud') {
      const params = new URLSearchParams(location.search);
      params.set('tab', 'main');
      history.replace({ ...location, search: `?${params.toString()}` });
    }
  }, [history, location, requestedTab]);

  const selectTab = (key) => {
    if (key === activeTab) return;
    const params = new URLSearchParams(location.search);
    params.set('tab', key);
    history.push({ ...location, search: `?${params.toString()}` });
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'main': return <FraudDetectionOverview />;
      case 'anomaly': return <AnomalyDetectionTab />;
      case 'risk': return <RiskAnalysisTab />;
      case 'workload': return <InspectionWorkloadTab />;
      case 'predict': return <FraudSimulation />;
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
            type="button"
            aria-pressed={activeTab === t.key}
            className={`fd-tab ${activeTab === t.key ? 'fd-tab-active' : ''}`}
            onClick={() => selectTab(t.key)}
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
