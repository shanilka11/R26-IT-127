import React, { useState, useEffect } from 'react';
import ButterToast, { Cinnamon } from 'butter-toast';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import { Modal } from 'antd';
import axios from "axios"
import LocalIP from "../LocalIP";
import './DemandForecast.css';

const CLASSES = ["1st Class", "2nd Class", "3rd Class"];

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

const DemandForecast = () => {
  const [trainServices, setTrainServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);

  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedService, setSelectedService] = useState(null);

  const [date, setDate] = useState('');
  const [isPublicHoliday, setIsPublicHoliday] = useState(false);
  const [isCovidLockdown, setIsCovidLockdown] = useState(false);

  const [classCapacity, setClassCapacity] = useState({
    "1st Class": '', "2nd Class": '', "3rd Class": '',
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await axios.get(`${LocalIP}:4444/train_services`);
        if (res.data.success) {
          setTrainServices(res.data.train_services);
        } else {
          raiseError("Failed to Load Trains", "Could not load the list of trains from the server.");
        }
      } catch (err) {
        console.log(err)
        raiseError("Network Error!", "Could not reach the server to load train services.");
      } finally {
        setServicesLoading(false);
      }
    };
    fetchServices();
  }, []);
  
  const handleServiceChange = (e) => {
    const id = e.target.value;
    setSelectedServiceId(id);

    const service = trainServices.find((s) => s.id === id) || null;
    setSelectedService(service);

    if (service) {
      setClassCapacity({
        "1st Class": service.default_capacity["1st Class"],
        "2nd Class": service.default_capacity["2nd Class"],
        "3rd Class": service.default_capacity["3rd Class"],
      });
    } else {
      setClassCapacity({ "1st Class": '', "2nd Class": '', "3rd Class": '' });
    }
  };

  const handleCapacityChange = (cls, value) => {
    setClassCapacity((prev) => ({ ...prev, [cls]: value }));
  };

  const validation = () => {
    if (!selectedService) {
      raiseError("Validation Error!", "Please select a train.");
      return false;
    }
    if (!date) {
      raiseError("Validation Error!", "Date is required!");
      return false;
    }
    for (const cls of CLASSES) {
      const v = classCapacity[cls];
      if (v === '' || v === null || Number(v) <= 0) {
        raiseError("Validation Error!", `${cls} capacity must be a positive number.`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validation()) return;

    setLoading(true);
    try {
      const res = await axios.post(
        `${LocalIP}:4444/predict_demand`,
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
    <div className="df-page">
      <h1 className="df-heading">Passenger Demand Forecast</h1>
      <p className="df-subheading">AI-powered prediction of passenger demand across railway routes and travel classes.</p>

      <div className="df-form">
        <select
          className="df-input"
          value={selectedServiceId}
          onChange={handleServiceChange}
          disabled={servicesLoading}
        >
          <option value="">
            {servicesLoading ? "Loading trains..." : "Select Train"}
          </option>
          {trainServices.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>

        <input
          className="df-input"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        {/* Auto-filled from the selected train, shown read-only for confirmation */}
        {selectedService && (
          <div className="df-route-summary">
            <span><strong>Line:</strong> {selectedService.line_name}</span>
            <span><strong>Distance:</strong> {selectedService.distance_km} km</span>
          </div>
        )}
      </div>

      <div className="df-checkbox-row">
        <label className="df-checkbox">
          <input
            type="checkbox"
            checked={isPublicHoliday}
            onChange={(e) => setIsPublicHoliday(e.target.checked)}
          />
          Public Holiday
        </label>
        <label className="df-checkbox">
          <input
            type="checkbox"
            checked={isCovidLockdown}
            onChange={(e) => setIsCovidLockdown(e.target.checked)}
          />
          COVID Lockdown Period
        </label>
      </div>

      {/* Seat capacity per class - auto-filled when a train is picked, editable
          in case coaches have been reconfigured */}
      <div className="df-capacity-row">
        {CLASSES.map((cls) => (
          <label key={cls} className="df-capacity-field">
            <span>{cls} Capacity</span>
            <input
              className="df-input df-capacity-input"
              type="number"
              min="0"
              value={classCapacity[cls]}
              onChange={(e) => handleCapacityChange(cls, e.target.value)}
              disabled={!selectedService}
            />
          </label>
        ))}
      </div>

      <p className="df-hint">
        Pick a train from the dropdown to auto-fill its route and default seat capacity.
        Capacity values can be adjusted if coaches have been reconfigured.
      </p>

      <button className="df-submit-btn" onClick={handleSubmit} disabled={loading}>
        {loading ? "Forecasting..." : "Forecast Demand"}
      </button>

      <Modal
        open={!!result}
        onCancel={() => setResult(null)}
        footer={null}
        centered
        width={640}
        className="df-result-modal"
      >
        {result && (
          <div className="df-result">
            <h3 className="df-result-title">
              {result.route} · {result.date} · {result.train_type}
            </h3>

            <div className="df-total-card">
              <span>Total Predicted Demand</span>
              <strong>{result.total_predicted_demand}</strong>
            </div>

            <div className="df-class-list">
              {CLASSES.map((cls) => {
                const c = result.predicted_demand_by_class[cls];
                if (!c) return null;
                return (
                  <div key={cls} className="df-class-card">
                    <div className="df-class-header">
                      <span>{cls}</span>
                      <strong>{c.expected_utilization_pct}%</strong>
                    </div>
                    <div className="df-progress-track">
                      <div
                        className="df-progress-fill"
                        style={{ width: `${Math.min(100, c.expected_utilization_pct)}%` }}
                      />
                    </div>
                    <div className="df-class-footer">
                      <span>{c.predicted_demand} predicted</span>
                      <span>{c.seat_capacity} seats</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DemandForecast;
