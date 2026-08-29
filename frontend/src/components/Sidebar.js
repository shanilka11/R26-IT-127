import React from "react";
import { Menu } from "antd";
import { useHistory } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { MdManageAccounts, MdDashboard, MdAnalytics, MdSecurity, MdTrain, MdTune } from "react-icons/md";

import './Sidebar.css'; // Import custom CSS file

function Sidebar() {
    let history = useHistory();
    const location = useLocation();
    const navigate = (path) => { history.push(path); };
    const selectedPath = location.pathname === '/' ? '/dashboard' : location.pathname;
    const menuItems = [
        { key: "/dashboard", icon: <MdDashboard />, label: "Dashboard", onClick: () => navigate("/dashboard") },
        { key: "/DemandForecast", icon: <MdAnalytics />, label: "Demand Forecast", onClick: () => navigate("/DemandForecast") },
        { key: "/Adaptivedemanddashboard", icon: <MdTrain />, label: "Adaptive Seat Allocation", onClick: () => navigate("/Adaptivedemanddashboard") },
        { key: "/SeatAllocationDashboard", icon: <MdTrain />, label: "Seat Allocation Dashboard", onClick: () => navigate("/SeatAllocationDashboard") },
        { key: "/TrainData", icon: <MdTrain />, label: "Train Data", onClick: () => navigate("/TrainData") },
        { key: "/tracking", icon: <MdTrain />, label: "Train Tracking & Delay", disabled: true },
        { key: "/schedule", icon: <MdTune />, label: "Schedule Optimization", disabled: true },
        { key: "/FraudDashboard", icon: <MdSecurity />, label: "Fraud Detection", onClick: () => navigate("/FraudDashboard") },
        { key: "/FraudBatchCheck", icon: <MdSecurity />, label: "Fraud Batch Check", onClick: () => navigate("/FraudBatchCheck") },
        { key: "/settings", icon: <MdManageAccounts />, label: "Account Settings", onClick: () => navigate("/settings") }
    ];

    if (localStorage.getItem("loginAccess") === "true") {
        return (
            <div>
                <aside className="sidenav">
                    <div className="sidebar-brand"><img src="/assets/Logo.png" alt="Ceylon Railway logo" /><div><strong>Ceylon Railway</strong><small>AI OPERATIONS</small></div></div>
                    <div className="sidebar-label">CONTROL CENTRE</div>
                    <Menu
                        mode="inline"
                        selectedKeys={[selectedPath]}
                        className="custom-sidebar-menu"
                        items={menuItems}
                    />
                </aside>
            </div>
        )
    } else {
        return (<div></div>)
    }
}

export default Sidebar;