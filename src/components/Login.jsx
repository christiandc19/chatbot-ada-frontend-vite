import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import workingPersonImage from "../assets/images/working-person.png";
import apiService from "../services/apiService";
import { trackEvent } from "../utils/analytics";

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleForgotPassword = () => {
    trackEvent("Auth", "Forgot Password Click", "Login page");
    navigate("/resetpassword");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await apiService.login(email, password);

      trackEvent("Auth", "Login Success", "User logged in");

      if (onLoginSuccess) {
        onLoginSuccess(response);
      }
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");

      trackEvent("Auth", "Login Failed", "Invalid login attempt");

      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <div className="illustration">
          <img src={workingPersonImage} alt="Person working on computer" />
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <h2>Hello!</h2>
          <p className="subtitle">Sign Up to Get Started</p>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <span className="input-icon">✉</span>
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <span className="input-icon">🔒</span>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <button
            type="button"
            className="forgot-password"
            onClick={handleForgotPassword}
          >
            Forgot Password
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;