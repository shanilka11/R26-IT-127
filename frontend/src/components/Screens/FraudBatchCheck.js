import React, { useState } from 'react';
import ButterToast, { Cinnamon } from 'butter-toast';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import { Modal } from 'antd';
import axios from "axios"
import LocalIP from "./../LocalIP";
import './FraudBatchCheck.css';

const ROUTE_OPTIONS = [
  "Colombo Fort - Kandy",
  "Colombo Fort - Galle",
  "Colombo Fort - Jaffna",
  "Colombo Fort - Badulla",
  "Colombo Fort - Trincomalee",
  "Colombo Fort - Matara",
];

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

const tierClass = (tier) => `tier-${(tier || "").toLowerCase().replace(/\s+/g, "-")}`;

const FraudBatchCheck = () => {
  const [trainRoute, setTrainRoute] = useState('');
  const [date, setDate] = useState('');
  const [nPassengers, setNPassengers] = useState('40');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const validation = () => {
    if (trainRoute === "") {
      raiseError("Validation Error!", "Please select a train route.");
      return false;
    }
    if (date === "") {
      raiseError("Validation Error!", "Please select a date.");
      return false;
    }
    if (!nPassengers || Number(nPassengers) <= 0) {
      raiseError("Validation Error!", "Passenger count must be a positive number.");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validation()) return;

    setLoading(true);
    try {
      const res = await axios.post(
        `${LocalIP}:3333/predict_batch`,
        {
          train_route: trainRoute,
          date,
          n_passengers: Number(nPassengers),
        },
        { headers: { "Content-Type": "application/json" } }
      );

      if (res.data.success) {
        setResult(res.data);
      } else {
        raiseError("Prediction Failed", res.data.error || "Something went wrong.");
      }
    } catch (err) {
      raiseError("Network Error!", "Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fbc-page">
      <h1 className="fbc-heading">Fraud Batch Check</h1>
      <p className="fbc-subheading">Analyze passenger records in bulk and identify potential fraud patterns.</p>

      <div className="fbc-form">
        <select
          className="fbc-input"
          value={trainRoute}
          onChange={(e) => setTrainRoute(e.target.value)}
        >
          <option value="">Select Train Route</option>
          {ROUTE_OPTIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <input
          className="fbc-input"
          type="date"
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

      <button className="fbc-submit-btn" onClick={handleSubmit} disabled={loading}>
        {loading ? "Running Simulation..." : "Run Simulation"}
      </button>

      <Modal
        open={!!result}
        onCancel={() => setResult(null)}
        footer={null}
        centered
        width={720}
        className="fbc-result-modal"
      >
        {result && (
          <div className="fbc-result">
            <h3 className="fbc-result-title">
              {result.summary.train_route} · {result.summary.date} ({result.summary.day_of_week})
            </h3>

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
            <div className="fbc-table-wrap">
              <table className="fbc-table">
                <thead>
                  <tr>
                    <th>Transaction</th>
                    <th>Risk Score</th>
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
    </div>
  );
};

export default FraudBatchCheck;
