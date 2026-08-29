import React, { useState, useEffect } from 'react';
import ButterToast, { Cinnamon } from 'butter-toast';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline';
import axios from "axios"
import LocalIP from "./../LocalIP";
import './DemandForecast.css';

const CLASSES = ["1st Class", "2nd Class", "3rd Class"];

// Maps the UI's class labels to the API's column-style keys (1c, 2c, 3c)
const CLASS_TO_API_KEY = {
  "1st Class": "1c",
  "2nd Class": "2c",
  "3rd Class": "3c",
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

const raiseSuccess = (title, content) => {
  ButterToast.raise({
    content: (
      <Cinnamon.Crisp
        title={title}
        content={content}
        scheme={Cinnamon.Crisp.SCHEME_GREEN}
        icon={<CheckCircleOutlineIcon />}
      />
    ),
  });
};

const ActualDemandInsert = () => {
  const [trainServices, setTrainServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);

  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedService, setSelectedService] = useState(null);

  const [date, setDate] = useState('');

  const [actualDemand, setActualDemand] = useState({
    "1st Class": '', "2nd Class": '', "3rd Class": '',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

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
    setSelectedService(trainServices.find((s) => s.id === id) || null);
    setErrors((prev) => ({ ...prev, service: undefined }));
  };

  const handleActualChange = (cls, value) => {
    setActualDemand((prev) => ({ ...prev, [cls]: value }));
    setErrors((prev) => ({ ...prev, [cls]: undefined }));
  };

  const validate = () => {
    const next = {};

    if (!selectedService) {
      next.service = "Please select a train.";
    }
    if (!date) {
      next.date = "Date is required.";
    }

    CLASSES.forEach((cls) => {
      const raw = actualDemand[cls];
      if (raw === '' || raw === null || raw === undefined) {
        next[cls] = "Required.";
      } else if (Number.isNaN(Number(raw))) {
        next[cls] = "Must be a number.";
      } else if (Number(raw) < 0) {
        next[cls] = "Cannot be negative.";
      }
    });

    setErrors(next);

    if (Object.keys(next).length > 0) {
      raiseError("Validation Error!", "Please fix the highlighted fields before submitting.");
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setSelectedServiceId('');
    setSelectedService(null);
    setDate('');
    setActualDemand({ "1st Class": '', "2nd Class": '', "3rd Class": '' });
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await axios.post(
        `${LocalIP}:4000/train/train_data`,
        {
          origin: selectedService.origin_station,
          destination: selectedService.destination_station,
          train_type: selectedService.train_type,
          date,
          class1: Number(actualDemand["1st Class"]),
          class2: Number(actualDemand["2nd Class"]),
          class3: Number(actualDemand["3rd Class"]),
        },
        { headers: { "Content-Type": "application/json" } }
      );

      if (res.data && res.data.success) {
        raiseSuccess("Saved", "Actual demand data was inserted successfully.");
        resetForm();
      } else {
        raiseError("Insert Failed", (res.data && res.data.error) || "Something went wrong.");
      }
    } catch (err) {
      // Handle duplicate error (409 status)
      if (err.response && err.response.status === 409) {
        raiseError("Duplicate Record", err.response.data?.error || "Actual demand has already been recorded for this train and date.");
      } else {
        raiseError("Network Error!", "Could not reach the server. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="df-page">
      <h1 className="df-heading">Insert Actual Demand</h1>
      <p className="df-subheading">Record real observed passenger demand per class for a completed train service.</p>

      <div className="df-form">
        <div>
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
          {errors.service && <span className="df-field-error">{errors.service}</span>}
        </div>

        <div>
          <input
            className="df-input"
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setErrors((prev) => ({ ...prev, date: undefined }));
            }}
          />
          {errors.date && <span className="df-field-error">{errors.date}</span>}
        </div>

        {selectedService && (
          <div className="df-route-summary">
            <span><strong>Line:</strong> {selectedService.line_name}</span>
            <span><strong>Type:</strong> {selectedService.train_type}</span>
            <span><strong>Distance:</strong> {selectedService.distance_km} km</span>
          </div>
        )}
      </div>

      <div className="df-capacity-row">
        {CLASSES.map((cls) => (
          <div className="df-capacity-field" key={cls}>
            <span>{cls} — Actual Demand</span>
            <input
              className="df-input"
              type="number"
              min="0"
              placeholder="e.g. 150"
              value={actualDemand[cls]}
              onChange={(e) => handleActualChange(cls, e.target.value)}
            />
            {errors[cls] && <span className="df-field-error">{errors[cls]}</span>}
          </div>
        ))}
      </div>

      <p className="df-hint">
        Select the train and date the service ran on, then enter the actual number of passengers
        recorded per class. This feeds the Actual vs Predicted comparison on the dashboard.
      </p>

      <button className="df-submit-btn" onClick={handleSubmit} disabled={submitting}>
        {submitting ? "Saving..." : "Save Actual Demand"}
      </button>
    </div>
  );
};

export default ActualDemandInsert;
