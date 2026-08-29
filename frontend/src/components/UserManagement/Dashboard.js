import React, { useState, useEffect } from "react"
import "../../App.css"
import { useHistory } from "react-router-dom"
import swal from 'sweetalert'
import axios from "axios";
import LocalIP from "../LocalIP";
import './Dashboard.css';
import { MdAnalytics, MdTrain, MdSecurity, MdSchedule, MdLocationOn } from 'react-icons/md';

const API_TRAIN = `${LocalIP}:4444`;
const API_FRAUD = `${LocalIP}:5555`;

const stationNodes = [
  { name: 'Colombo', x: 120, y: 220 },
  { name: 'Kandy', x: 250, y: 130 },
  { name: 'Kurunegala', x: 180, y: 175 },
  { name: 'Anuradhapura', x: 320, y: 105 },
  { name: 'Galle', x: 140, y: 260 },
  { name: 'Matara', x: 170, y: 285 },
  { name: 'Badulla', x: 420, y: 210 },
  { name: 'Batticaloa', x: 540, y: 165 },
  { name: 'Jaffna', x: 500, y: 75 },
];

function Dashboard() {
  let history = useHistory();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [trainCount, setTrainCount] = useState('Data unavailable');
  const [stationCount, setStationCount] = useState('Data unavailable');
  const [dailyPassengers, setDailyPassengers] = useState('Data unavailable');
  const [systemStatus, setSystemStatus] = useState('Checking...');

  const logout = () => {
    localStorage.clear();
    history.push("/");
    window.location.reload(true)
  }

  const onReload = () => {
    if (localStorage.getItem("loginAccess") != null) {
      if ((new Date(localStorage.getItem("loginDate"))) <= (new Date())) {
        swal({
          title: "Session Expired",
          text: "Your session has expired. Do you want to logout?",
          icon: "warning",
          buttons: ["Cancel", "Logout"],
          dangerMode: true,
        }).then((willLogout) => {
          if (willLogout) {
            logout()
          }
        });
      }
    } else {
      history.push("/");
    }
  };

  useEffect(() => onReload(), []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      axios.get(`${API_TRAIN}/train_services`).then((res) => {
        if (res.data && res.data.success && Array.isArray(res.data.train_services)) {
          const services = res.data.train_services;
          const stations = new Set();
          services.forEach((service) => {
            if (service.origin_station) stations.add(service.origin_station);
            if (service.destination_station) stations.add(service.destination_station);
          });

          if (isMounted) {
            setTrainCount(services.length ? services.length.toLocaleString() : 'Data unavailable');
            setStationCount(stations.size ? stations.size.toLocaleString() : 'Data unavailable');
          }
          return;
        }

        if (isMounted) {
          setTrainCount('Data unavailable');
          setStationCount('Data unavailable');
        }
      }).catch(() => {
        if (isMounted) {
          setTrainCount('Data unavailable');
          setStationCount('Data unavailable');
        }
      }),

      axios.get(`${API_FRAUD}/dashboard/summary`).then((res) => {
        if (isMounted && res.data && res.data.total_ticket_transactions != null) {
          setDailyPassengers(Number(res.data.total_ticket_transactions).toLocaleString());
        }
      }).catch(() => {
        if (isMounted) setDailyPassengers('Data unavailable');
      }),

      axios.get(`${API_FRAUD}/health`).then((res) => {
        if (isMounted) {
          setSystemStatus(res.data && res.data.status === 'ok' ? 'Active' : 'Reference data');
        }
      }).catch(() => {
        if (isMounted) setSystemStatus('Connection unavailable');
      })
    ]);

    return () => {
      isMounted = false;
    };
  }, []);

  const clockTime = new Intl.DateTimeFormat('en-LK', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Asia/Colombo',
  }).format(currentTime);

  const clockDate = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Colombo',
  }).format(currentTime);

  const updates = [
    { label: 'Demand Forecast module available', note: 'Operational model module' },
    { label: 'Adaptive Seat Allocation module available', note: 'Capacity planning ready' },
    { label: 'Fraud Detection module available', note: 'Risk-aware analysis active' },
    { label: 'Operational updates will appear here when live railway data is connected.', note: 'Reference state' },
  ];

  return (
    <div className="sa-page">
      <div className="operations-dashboard">
        <section
          className="dashboard-hero"
          style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/assets/img1.jpg)` }}
        >
          <div className="dashboard-hero-content">
            <span className="dashboard-badge">AI OPERATIONS CENTRE</span>
            <h1>Sri Lankan Railway Operations</h1>
            <p>AI-powered intelligence for smarter railway operations.</p>
          </div>
        </section>

        <section className="dashboard-kpis">
          <div className="dashboard-kpi-card">
            <span>🚆 Railway Trains</span>
            <strong>{trainCount}</strong>
            <small>Reference service catalog</small>
          </div>
          <div className="dashboard-kpi-card">
            <span>📍 Railway Stations</span>
            <strong>{stationCount}</strong>
            <small>Network reference nodes</small>
          </div>
          <div className="dashboard-kpi-card">
            <span> System Status</span>
            <strong className={systemStatus === 'Connection unavailable' ? 'status-alert' : 'status-good'}>{systemStatus}</strong>
            <small>{systemStatus === '🟢 Active' ? '' : 'Reference or local status'}</small>
          </div>
        </section>

        <div className="dashboard-main-grid">
          <section className="dashboard-panel dashboard-panel-large">
            <div className="dashboard-section-header">
              <p className="dashboard-kicker">NETWORK</p>
              <h2>Sri Lanka Railway Network</h2>
            </div>

            <div className="rail-network-visual">
              <svg className="network-svg" viewBox="0 0 680 360" preserveAspectRatio="xMidYMid meet" aria-label="Sri Lanka railway network map">
                <defs>
                  <linearGradient id="rail-line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8ecae6" />
                    <stop offset="100%" stopColor="#2f97ca" />
                  </linearGradient>
                </defs>
                <path d="M80 240 C150 200, 200 180, 260 140 S390 110, 510 150 S610 170, 630 110" />
                <path d="M150 300 C200 250, 250 210, 320 200 S440 215, 520 190" />
                <path d="M250 90 L330 160 L440 200 L520 120" />
                <path d="M290 165 L290 245 L350 300" />

                {stationNodes.map((station) => (
                  <g key={station.name} className="network-station-group">
                    <circle cx={station.x} cy={station.y} r="7" className="network-station" />
                    <text x={station.x + 12} y={station.y - 10} className="network-label">{station.name}</text>
                  </g>
                ))}
              </svg>
            </div>
          </section>

          <div className="dashboard-side-stack">
            <section className="dashboard-panel clock-panel">
              <div className="dashboard-section-header compact-header">
                <p className="dashboard-kicker">TIMING</p>
                <h2>Current Sri Lanka Time</h2>
              </div>

              <div className="clock-box">
                <div className="clock-icon" aria-hidden="true">◔</div>
                <div className="clock-time">{clockTime}</div>
                <div className="clock-date">{clockDate}</div>
                <div className="clock-zone">Sri Lanka Standard Time (SLST)</div>
                <div className="clock-offset">UTC +5:30</div>
              </div>
            </section>

            <section className="dashboard-panel">
              <div className="dashboard-section-header compact-header">
                <p className="dashboard-kicker">UPDATES</p>
                <h2>Railway Updates</h2>
              </div>

              <div className="update-list">
                {updates.map((entry) => (
                  <div className="update-item" key={entry.label}>
                    <div className="update-dot" aria-hidden="true" />
                    <div>
                      <strong>{entry.label}</strong>
                      <small>{entry.note}</small>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        <section className="dashboard-panel modules-panel">
          <div className="dashboard-section-header">
            <p className="dashboard-kicker">AI OPERATIONS</p>
            <h2>AI Operations</h2>
          </div>

          <div className="module-grid">
            <button className="operation-card" onClick={() => history.push('/DemandForecast')}>
              <span className="operation-icon"><MdAnalytics /></span>
              <div>
                <h3>Passenger Demand Forecast</h3>
                <p>AI-powered passenger demand prediction</p>
              </div>
              <span className="view-action">View →</span>
            </button>

            <button className="operation-card" onClick={() => history.push('/Adaptivedemanddashboard')}>
              <span className="operation-icon"><MdTrain /></span>
              <div>
                <h3>Adaptive Seat Allocation</h3>
                <p>Capacity allocation based on predicted demand</p>
              </div>
              <span className="view-action">View →</span>
            </button>

            <button className="operation-card" onClick={() => history.push('/FraudDashboard')}>
              <span className="operation-icon"><MdSecurity /></span>
              <div>
                <h3>Intelligent Fraud Detection</h3>
                <p>Risk-aware passenger transaction analysis</p>
              </div>
              <span className="view-action">View →</span>
            </button>

            <button className="operation-card" onClick={() => history.push('/tracking')}>
              <span className="operation-icon"><MdTrain /></span>
              <div>
                <h3>Train Tracking &amp; Delay</h3>
                <p>Train tracking and delay intelligence</p>
              </div>
              <span className="view-action">View →</span>
            </button>

            <button className="operation-card" onClick={() => history.push('/schedule')}>
              <span className="operation-icon"><MdSchedule /></span>
              <div>
                <h3>Schedule Optimization</h3>
                <p>Timetable and operational optimization</p>
              </div>
              <span className="view-action">View →</span>
            </button>
          </div>
        </section>

        <section className="dashboard-panel about-panel">
          <div className="dashboard-section-header compact-header">
            <p className="dashboard-kicker">ABOUT</p>
            <h2>About Sri Lanka Railways</h2>
          </div>

          <div className="about-row">
            <div className="about-icon"><MdLocationOn /></div>
            <p>
              Sri Lanka Railways connects communities, cities and regions across the island through a national rail network that supports passenger mobility, regional access and essential economic movement.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Dashboard;