import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { trackEvent } from "../utils/analytics";
import logo from "../assets/images/logo-white.png";
import "./Sidebar.css";

const Sidebar = ({ onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { path: "/stats", label: "Stats", icon: "📊" },
    { path: "/conversations", label: "All Conversations", icon: "💬" },
    { path: "/communities", label: "Communities", icon: "👥" },
    { path: "/settings", label: "Settings", icon: "⚙️" },
  ];

  const handleLogout = () => {
    trackEvent("Auth", "Logout", "User logged out");

    // ✅ Clear saved login/auth data
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("isAuthenticated");

    sessionStorage.clear();

    // ✅ Update parent login state
    if (onLogout) {
      onLogout();
    }

    // ✅ Close mobile menu after logout
    setIsOpen(false);

    // ✅ Send user back to login page
    navigate("/login", { replace: true });
  };

  const handleMenuClick = (label) => {
    trackEvent("Navigation", "Sidebar Click", label);
    setIsOpen(false);
  };

  return (
    <div className={`sidebar ${isOpen ? "mobile-open" : ""}`}>
      <div className="sidebar-top">
        <div className="sidebar-header">
          <img src={logo} alt="Smart WebAssistant" className="sidebar-logo" />
        </div>

        <button
          className="hamburger-button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          ☰
        </button>
      </div>

      <div className="sidebar-mobile-panel">
        <ul className="sidebar-menu">
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={location.pathname === item.path ? "active" : ""}
                onClick={() => handleMenuClick(item.label)}
              >
                <span className="sidebar-menu-icon">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="sidebar-footer">
          <button type="button" onClick={handleLogout} className="logout-button">
            <span className="sidebar-menu-icon">🚪</span>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;