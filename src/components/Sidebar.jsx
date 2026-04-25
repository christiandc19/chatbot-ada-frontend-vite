import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { trackEvent } from "../utils/analytics";
import "./Sidebar.css";

const Sidebar = ({ onLogout }) => {
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

    if (onLogout) {
      onLogout();
    }

    navigate("/login");
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">Chatbot</div>

      <ul className="sidebar-menu">
        {menuItems.map((item) => (
          <li key={item.path}>
            <Link
              to={item.path}
              className={location.pathname === item.path ? "active" : ""}
              onClick={() =>
                trackEvent("Navigation", "Sidebar Click", item.label)
              }
            >
              <span className="sidebar-menu-icon">{item.icon}</span>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      <div className="sidebar-footer">
        <button onClick={handleLogout} className="logout-button">
          <span className="sidebar-menu-icon">🚪</span>
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;