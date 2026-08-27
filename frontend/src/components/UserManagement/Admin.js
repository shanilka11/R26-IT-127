import React, { useState, useEffect } from "react"
import "../../App.css"
import { Card, Button } from "antd"
import { useHistory } from "react-router-dom"
import swal from 'sweetalert'
import axios from "axios";
import LocalIP from "../LocalIP";

function Admin() {

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
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "80vh",
      }}
    >
      <Card bordered={false} className="admin-panel">
        <p className="dashboard-kicker">ADMINISTRATION</p>
        <h1>System Administration</h1>
        <p className="admin-copy">Manage account access and operational platform settings.</p>

        <Button
          type="primary"
          htmlType="submit"
          className="settings-button"
          onClick={() => { history.push("/settings") }}
        >
          Account Settings
        </Button>
        <br />
        <br />
      </Card>
    </div>
  );
}

export default Admin;