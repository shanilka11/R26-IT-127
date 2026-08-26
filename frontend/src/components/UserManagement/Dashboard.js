import React, { useState, useEffect } from "react"
import "../../App.css"
import { useHistory } from "react-router-dom"
import swal from 'sweetalert'
import axios from "axios";
import LocalIP from "../LocalIP";
import './Dashboard.css';
import { MdAnalytics, MdTrain, MdSecurity, MdSchedule, MdAltRoute } from 'react-icons/md';

function Dashboard() {

  let history = useHistory();
  useEffect(() => onReload(), []);

  const logout = () => {
    localStorage.clear();
    history.push("/");
    window.location.reload(true)
  }

  const onReload = () => {
    console.log("new")
    console.log(localStorage.getItem("loginAccess"))
    if (localStorage.getItem("loginAccess") != null) {
      console.log(localStorage.getItem("loginDate"))
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

  return (
    <div
      className="sa-page"
    >
      <div className="operations-dashboard">
        <div className="dashboard-intro"><div><p className="dashboard-kicker">LIVE NETWORK OVERVIEW</p><h1>Railway Operations Intelligence</h1><p>AI-powered decision support for smarter, safer and more efficient railway operations.</p></div><span className="status-pill"><i /> Systems ready</span></div>
        <div className="dashboard-kpis"><div><span>Passenger demand</span><strong>Awaiting data</strong><small>Connect a forecast to view</small></div><div><span>Seat utilization</span><strong>Awaiting data</strong><small>Allocation intelligence</small></div><div><span>Active trains</span><strong>Awaiting data</strong><small>Live tracking unavailable</small></div><div><span>Delay risk</span><strong>Awaiting data</strong><small>Probabilistic ETA layer</small></div></div>
        <div className="dashboard-grid"><section className="dashboard-panel dashboard-panel-large"><div className="panel-heading"><div><p className="dashboard-kicker">DECISION SUPPORT</p><h2>Operational intelligence modules</h2></div><span className="panel-tag">5 MODULES</span></div><div className="module-list"><button onClick={() => history.push('/DemandForecast')}><span className="module-number"><MdAnalytics />01</span><span><strong>Passenger Demand Forecast</strong><small>Spatio-temporal predictions by route and class</small></span><b>→</b></button><button onClick={() => history.push('/Adaptivedemanddashboard')}><span className="module-number"><MdTrain />02</span><span><strong>Adaptive Seat Allocation</strong><small>Capacity plans shaped by predicted demand</small></span><b>→</b></button><button onClick={() => history.push('/FraudDashboard')}><span className="module-number"><MdSecurity />03</span><span><strong>Intelligent Fraud Detection</strong><small>Risk scoring and explainable inspection signals</small></span><b>→</b></button><div className="module-list-disabled"><span className="module-number"><MdTrain />04</span><span><strong>Train Tracking &amp; Delay Prediction</strong><small>Awaiting live operational feed</small></span><b>—</b></div><div className="module-list-disabled"><span className="module-number"><MdSchedule />05</span><span><strong>Schedule Optimization</strong><small>Awaiting timetable and network data</small></span><b>—</b></div></div></section><section className="dashboard-panel"><p className="dashboard-kicker">NETWORK STATUS</p><h2>Data readiness</h2><div className="empty-state"><span>◎</span><strong>Awaiting operational feed</strong><p>Connect a live data source to populate network measures and predictive insights.</p></div></section></div>
        <section className="pipeline-panel"><div><p className="dashboard-kicker">AI DECISION PIPELINE</p><h2>From network signals to confident action.</h2></div><div className="pipeline-steps"><span><MdAltRoute /><b>DATA</b></span><i>→</i><span><MdAnalytics /><b>AI ANALYTICS</b></span><i>→</i><span><MdSchedule /><b>OPTIMIZATION</b></span><i>→</i><span><MdSecurity /><b>DECISION SUPPORT</b></span></div></section>

      </div>
    </div>
  );
}

export default Dashboard;