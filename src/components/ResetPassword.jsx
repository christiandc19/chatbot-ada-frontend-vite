import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css"; // Reuse the same styling as Login
import workingPersonImage from "../assets/images/working-person.png";
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
      // Call API to send reset password email
      await apiService.resetPassword(email);
      setSuccess("Password reset email has been sent to your email address.");
    } catch (err) {
      setError(err.message || "Failed to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/');
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
          <p className="subtitle">Please provide email address</p>

          {error && <div className="error-message">{error}</div>}
          {success && (
            <div className="success-message" style={{
              backgroundColor: '#e8f5e8',
              color: '#2e7d32',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '14px',
              border: '1px solid #a5d6a7'
            }}>
              {success}
            </div>
          )}

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

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Sending..." : "Reset Password"}
            </button>
          </form>

          <button type="button" className="forgot-password" onClick={handleBackToLogin}>
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;