import React, { useState } from "react";
import { Menu, Button, Drawer } from "antd";
import { useHistory } from "react-router-dom";
import { MenuOutlined } from "@ant-design/icons";
import { MdManageAccounts } from "react-icons/md";
import { FaList, FaUserPlus, FaCar, FaPrint } from "react-icons/fa";
import { MdDashboard } from "react-icons/md";
import { IoDuplicateSharp } from "react-icons/io5";
import { BsNoiseReduction } from "react-icons/bs";
import { SiEnvoyproxy } from "react-icons/si";
import { MdFeedback } from "react-icons/md";

import './Sidebar.css'; // Import custom CSS file

function Sidebar() {
    let history = useHistory();
    const [visible, setVisible] = useState(false);

    const showDrawer = () => {
        setVisible(true);
    };

    const onClose = () => {
        setVisible(false);
    };

    if (localStorage.getItem("loginAccess") === "true") {
        return (
            <div>
                <div className="sidenav">
                    <Menu
                        theme="light"
                        mode="inline"
                        defaultSelectedKeys={[localStorage.getItem("pageNumber")]}
                        className="custom-sidebar-menu" // Add custom CSS class
                        items={[
                            {
                                key: "1",
                                icon: <MdDashboard style={{ color: "black" }} />,
                                label: "Dashboard",
                                onClick: () => history.push("/dashboard"),
                            },
                            {
                                key: "2",
                                icon: <MdDashboard style={{ color: "black" }} />,
                                label: "Demand Forecast",
                                onClick: () => history.push("/DemandForecast"),
                            },
                            {
                                key: "3",
                                icon: <MdDashboard style={{ color: "black" }} />,
                                label: "Adaptive Demand Dashboard",
                                onClick: () => history.push("/Adaptivedemanddashboard"),
                            },
                            {
                                key: "4",
                                icon: <MdDashboard style={{ color: "black" }} />,
                                label: "Fraud Dashboard",
                                onClick: () => history.push("/FraudDashboard"),
                            },
                            {
                                key: "5",
                                icon: <MdDashboard style={{ color: "black" }} />,
                                label: "Fraud Batch Check",
                                onClick: () => history.push("/FraudBatchCheck"),
                            },
                            {
                                key: "7",
                                icon: <MdManageAccounts style={{ color: "black" }} />,
                                label: "Account Settings",
                                onClick: () => history.push("/settings"),
                            }
                        ]}
                    />
                </div>
            </div>
        )
    } else {
        return (<div></div>)
    }
}

export default Sidebar;