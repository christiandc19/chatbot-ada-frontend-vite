import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ResetPassword.css";
import logo from "../assets/images/logo.png";
import workingPersonImage from "../assets/images/elderly-couple.webp";
import apiService from "../services/apiService";

const ResetPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await apiService.resetPassword(email);
      setSuccess("Password reset email has been sent to your email address.");
    } catch (err) {
      setError(err.message || "Failed to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate("/");
  };

return (
  <div className="reset-login-page">
    <div className="reset-login-left">
      <img src={workingPersonImage} alt="Senior couple" />

      <div className="reset-login-overlay">
        <div>
          <h2>Turn website visitors into meaningful conversations.</h2>
          <p>
            Manage leads, conversations, surveys, and community engagement from
            one simple dashboard.
          </p>

          <button
            type="button"
            className="reset-talk-button"
            onClick={() => window.open("https://websmartassistant.com/#demo", "_blank")}
          >
            Talk to Our Team
          </button>
        </div>

        <div className="reset-testimonial">
          <div className="reset-stars">★★★★★</div>
          <p>
            “Helping communities respond faster, capture better insights, and
            support families at the right moment.”
          </p>
          <strong>WebSmartAssistant Platform</strong>
        </div>
      </div>
    </div>

    <div className="reset-login-right">
      <div className="reset-login-card">
        <img src={logo} alt="WebSmartAssistant logo" className="reset-logo" />

        <h1>Reset Password</h1>

        <p className="reset-subtitle">
          Enter your email address and we’ll send reset instructions.
        </p>

        {error && <div className="reset-error-message">{error}</div>}
        {success && <div className="reset-success-message">{success}</div>}

        <form onSubmit={handleSubmit} className="reset-form">
          <label htmlFor="reset-email">Email address</label>

          <input
            id="reset-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button type="submit" className="reset-submit-button" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <button
          type="button"
          className="reset-back-button"
          onClick={handleBackToLogin}
        >
          Back to login
        </button>
      </div>
    </div>
  </div>
);

};

export default ResetPassword;