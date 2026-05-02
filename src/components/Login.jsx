import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import workingPersonImage from "../assets/images/login.webp";
import logo from "../assets/images/logo.png";
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
    <div className="login-page">
      {/* LEFT BRAND PANEL */}
      <section className="login-brand-panel">
        <div className="login-overlay"></div>

        <img
          src={workingPersonImage}
          alt="Senior living engagement"
          className="login-bg-image"
        />

        <div className="login-brand-content">

          <div className="login-brand-message">
            <h1>Turn website visitors into meaningful conversations.</h1>
            <p>
              Manage leads, conversations, surveys, and community engagement
              from one simple dashboard.
            </p>

              <a
                href="https://websmartassistant.com/#demo"
                className="login-cta-button"
              >
                Talk to Our Team
              </a>
          </div>



          <div className="login-testimonial">
            <div className="stars">★★★★★</div>
            <p>
              “Helping communities respond faster, capture better insights, and
              support families at the right moment.”
            </p>
            <strong>WebSmartAssistant Platform</strong>
          </div>
        </div>
      </section>

      {/* RIGHT LOGIN PANEL */}


      <section className="login-form-panel">

        <div className="form-wrapper">


          <div className="login-logo">
            <img src={logo} alt="WebSmartAssistant logo" />
          </div>

        <div className="login-form-wrap">
          <div className="login-form-header">
            <h2>Log in</h2>
            <p>Enter your email address and password below.</p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <label className="field-label">Email address</label>
            <input
              type="email"
              className="login-input"
              placeholder=""
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label className="field-label">Password</label>
            <input
              type="password"
              className="login-input"
              placeholder=""
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Logging in..." : "Next"}
            </button>
          </form>

          <button
            type="button"
            className="forgot-password"
            onClick={handleForgotPassword}
          >
            Forgot password?
          </button>
        </div>





        </div>

      </section>
    </div>
  );
};

export default Login;