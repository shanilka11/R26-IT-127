import React from "react";
import { useHistory } from "react-router-dom";
import { Avatar, Col, Row, Typography, Dropdown } from "antd";
import { UserOutlined, DownOutlined, BellOutlined, LogoutOutlined } from "@ant-design/icons";

const ROLE_LABELS = {
  user: "User",
  admin: "Admin",
  manager: "Manager",
};

function ThemeToggle({ themeMode, onToggleTheme }) {
  return (
    <button
      type="button"
      className={`theme-toggle ${themeMode === "light" ? "active-light" : "active-dark"}`}
      onClick={onToggleTheme}
      aria-label="Toggle color theme"
      title={`Switch to ${themeMode === "dark" ? "light" : "dark"} mode`}
    >
      <span className="sun" aria-hidden="true">☀</span>
      <span className="theme-arrow" aria-hidden="true">⇄</span>
      <span className="moon" aria-hidden="true">🌙</span>
      <span className="theme-label">{themeMode === "light" ? "Light" : "Dark"}</span>
    </button>
  );
}

function UserProfile({ onLogout, onSettings, onToggleTheme, themeMode }) {
  const fname = localStorage.getItem("fname") || "";
  const lname = localStorage.getItem("lname") || "";
  const role = localStorage.getItem("role");
  const fullName = [fname, lname].filter(Boolean).join(" ") || "Account";
  const roleLabel = ROLE_LABELS[role] || "Manager";

  const items = [
    { label: <span className="rail-account-item" onClick={onSettings}>Account Settings</span>, key: "settings" },
    {
      label: (
        <span className="rail-logout-item" onClick={onLogout}><LogoutOutlined /> Log Out</span>
      ),
      key: "0",
    },
  ];

  return (
    <Row align="middle" className="profile-row">
      <Col>
        <BellOutlined className="nav-icon" />
      </Col>
      <Col>
        <ThemeToggle themeMode={themeMode} onToggleTheme={onToggleTheme} />
      </Col>
      <Col>
        <Avatar
          size="large"
          icon={<UserOutlined />}
          className="profile-avatar"
        />
      </Col>
      <Col>
        <Row className="profile-meta">
          <Text className="profile-name" strong>
            {fullName}
          </Text>
        </Row>
        <Row className="profile-meta">
          <Text className="profile-role">
            {roleLabel}
          </Text>
        </Row>
      </Col>
      <Dropdown menu={{ items }} trigger={["click"]} popupClassName="rail-profile-menu">
        <Col className="profile-arrow">
          <DownOutlined style={{ fontSize: 12 }} className="nav-icon" />
        </Col>
      </Dropdown>
    </Row>
  );
}

const { Text } = Typography;

function Nav() {
  const history = useHistory();
  const isLoggedIn = localStorage.getItem("loginAccess") === "true";
  const [themeMode, setThemeMode] = React.useState(document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");

  React.useEffect(() => {
    const syncTheme = () => {
      const saved = localStorage.getItem("theme");
      const resolvedTheme = saved === "light" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", resolvedTheme);
      setThemeMode(resolvedTheme);
    };

    syncTheme();
    window.addEventListener("themechange", syncTheme);

    return () => {
      window.removeEventListener("themechange", syncTheme);
    };
  }, []);

  const toggleTheme = () => {
    const next = themeMode === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    setThemeMode(next);
    window.dispatchEvent(new Event("themechange"));
  };

  const handleLogout = () => {
    const savedTheme = localStorage.getItem("theme");
    localStorage.clear();
    if (savedTheme) localStorage.setItem("theme", savedTheme);
    history.push("/");
    window.location.reload();
  };

  const goTo = (path) => (e) => {
    e.preventDefault();
    history.push(path);
  };

  const goToSettings = () => history.push("/settings");

  return (
    <nav className="nav-shell">
      <a
        href={isLoggedIn ? "/Dashboard" : "/"}
        onClick={goTo(isLoggedIn ? "/Dashboard" : "/")}
        className="brand-link"
      >
        <img src="/assets/Logo.png" alt="Ceylon Railway logo" />
        <span>Ceylon Railway</span>
      </a>

      {isLoggedIn ? (
        <UserProfile onLogout={handleLogout} onSettings={goToSettings} onToggleTheme={toggleTheme} themeMode={themeMode} />
      ) : (
        <div className="public-links">
          <ThemeToggle themeMode={themeMode} onToggleTheme={toggleTheme} />
          <a
            href="/login"
            onClick={goTo("/login")}
          >
            Login
          </a>
          <a
            href="/Register"
            onClick={goTo("/Register")}
          >
            Register
          </a>
        </div>
      )}
    </nav>
  );
}

export default Nav;