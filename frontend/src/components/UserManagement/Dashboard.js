import React, { useState, useEffect } from "react"
import "../../App.css"
import PmsLogo from "../../assets/logo-temp.png"
import { Card, Button } from "antd"
import { useHistory } from "react-router-dom"
import swal from 'sweetalert'
import axios from "axios";
import LocalIP from "../LocalIP";
import './Dashboard.css';

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
      <br />
      <Card bordered={false} style={{ textAlign: "center", backgroundColor: '#f5f5f5', margin: '20px 10px' }}>
        <img
          src={PmsLogo}
          alt="React Icon"
          style={{ width: "450px", padding: 30 }}
        />
        <p style={{ padding: 15, fontWeight: "bold" }}>Dashboard</p>

        <Button
          type="primary"
          htmlType="submit"
          style={{ width: 200, backgroundColor: 'black' }}
          onClick={() => { history.push("/DemandForecast") }}
        >
          Demand Forecast
        </Button>
        <br />
        <br />
        <Button
          type="primary"
          htmlType="submit"
          style={{ width: 200, backgroundColor: 'black' }}
          onClick={() => { history.push("/Adaptivedemanddashboard") }}
        >
          Adaptive Demand Dashboard
        </Button>
        <br />
        <br />
        <Button
          type="primary"
          htmlType="submit"
          style={{ width: 200, backgroundColor: 'black' }}
          onClick={() => { history.push("/FraudDashboard") }}
        >
          Fraud Dashboard
        </Button>
        <br />
        <br />
        <Button
          type="primary"
          htmlType="submit"
          style={{ width: 200, backgroundColor: 'black' }}
          onClick={() => { history.push("/FraudBatchCheck") }}
        >
          Fraud Batch Check
        </Button>
        <br />
        <br />
        <Button
          type="primary"
          htmlType="submit"
          style={{ width: 200, backgroundColor: 'black' }}
          onClick={() => { history.push("/AllUsers") }}
        >
          System Users
        </Button>
        <br />
        <br />
        <Button
          type="primary"
          htmlType="submit"
          style={{ width: 200, backgroundColor: 'black' }}
          onClick={() => { history.push("/settings") }}
        >
          Profile Settings
        </Button>
        <br />
        <br />
      </Card>
      <br />
    </div>
  );
}

export default Dashboard;