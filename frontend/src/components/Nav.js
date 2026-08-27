import React from "react";
import PmsLogo from "../assets/logo-temp.png";
import { useHistory } from "react-router-dom";
import { Avatar, Col, Row, Typography, Dropdown } from "antd";
import { UserOutlined, DownOutlined, BellOutlined } from "@ant-design/icons";

// ---- Dark theme tokens, matched to the AI Railway dashboard ----
const theme = {
  bg: "#0B1120",
  bgElevated: "#111A2E",
  border: "rgba(255,255,255,0.08)",
  textPrimary: "#F1F5F9",
  textSecondary: "#94A3B8",
  accentBlue: "#3B82F6",
  accentPurple: "#8B5CF6",
};

const ROLE_LABELS = {
  user: "User",
  admin: "Admin",
  manager: "Manager",
};

function UserProfile({ onLogout }) {
  const fname = localStorage.getItem("fname") || "";
  const lname = localStorage.getItem("lname") || "";
  const role = localStorage.getItem("role");
  const fullName = [fname, lname].filter(Boolean).join(" ") || "Account";
  const roleLabel = ROLE_LABELS[role] || "Manager";

  const items = [
    {
      label: (
        <a onClick={onLogout} style={{ color: theme.textPrimary }}>
          Log Out
        </a>
      ),
      key: "0",
    },
  ];

  return (
    <Row align="middle" style={{ marginInlineEnd: 24, columnGap: 12 }}>
      <Col>
        <BellOutlined style={{ fontSize: 18, color: theme.textSecondary }} />
      </Col>
      <Col>
        <Avatar
          size="large"
          icon={<UserOutlined />}
          style={{
            backgroundColor: theme.accentBlue,
            fontSize: 18,
          }}
        />
      </Col>
      <Col>
        <Row>
          <Text
            style={{ fontSize: 15, color: theme.textPrimary }}
            strong
          >
            {fullName}
          </Text>
        </Row>
        <Row>
          <Text style={{ fontSize: 12, color: theme.textSecondary }}>
            {roleLabel}
          </Text>
        </Row>
      </Col>
      <Dropdown menu={{ items }} trigger={["click"]}>
        <Col style={{ marginLeft: 6, cursor: "pointer" }}>
          <DownOutlined style={{ fontSize: 12, color: theme.textSecondary }} />
        </Col>
      </Dropdown>
    </Row>
  );
}

const { Text } = Typography;

function Nav() {
  const history = useHistory();
  const isLoggedIn = localStorage.getItem("loginAccess") === "true";

  const handleLogout = () => {
    localStorage.clear();
    history.push("/");
    window.location.reload();
  };

  const goTo = (path) => (e) => {
    e.preventDefault();
    history.push(path);
  };

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 24px",
        backgroundColor: theme.bg,
        borderBottom: `1px solid ${theme.border}`,
      }}
    >
      <a
        href={isLoggedIn ? "/Dashboard" : "/"}
        onClick={goTo(isLoggedIn ? "/Dashboard" : "/")}
        style={{ display: "flex", alignItems: "center", gap: 10 }}
      >
        <img src={PmsLogo} alt="PMS Logo" style={{ width: "40px" }} />
        <Text style={{ color: theme.textPrimary, fontSize: 18 }} strong>
          AI Railway
        </Text>
      </a>

      {isLoggedIn ? (
        <UserProfile onLogout={handleLogout} />
      ) : (
        <div style={{ display: "flex", gap: 24 }}>
          <a
            href="/login"
            onClick={goTo("/login")}
            style={{ color: theme.textSecondary, fontWeight: 500 }}
          >
            Login
          </a>
          <a
            href="/Register"
            onClick={goTo("/Register")}
            style={{ color: theme.accentBlue, fontWeight: 500 }}
          >
            Register
          </a>
        </div>
      )}
    </nav>
  );
}

export default Nav;