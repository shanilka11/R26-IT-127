import React, { useState, useEffect } from "react"
import "../../App.css"
import PmsLogo from "../../assets/logo-temp.png"
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
      <Card bordered={false} style={{ textAlign: "center", backgroundColor: '#f5f5f5' }}>
        <img
          src={PmsLogo}
          alt="React Icon"
          style={{ width: "450px", padding: 30 }}
        />
        <p style={{ padding: 15, fontWeight: "bold" }}>Admin Dashboard</p>

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
    </div>
  );
}

export default Admin;