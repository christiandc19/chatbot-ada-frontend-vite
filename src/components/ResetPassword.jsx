import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ResetPassword.css";
import elderlyCoupleImage from "../assets/images/elderly-couple.webp";
import logo from "../assets/images/logo.png";
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
    <main className="reset-page">
      <section className="reset-shell">
        <div className="reset-image-panel">
          <img src={elderlyCoupleImage} alt="Elderly couple smiling together" />

          <div className="reset-image-overlay">
            <span>Password Help</span>
            <h1>Let’s get you back into your dashboard.</h1>
            <p>
              Enter your email address and we’ll send instructions to reset your
              password.
            </p>
          </div>
        </div>

        <div className="reset-form-panel">
          <div className="reset-card">
            <div className="reset-logo">
              <img src={logo} alt="Web Smart Assistant Logo" />
            </div>

            <div className="reset-card-header">
              <span className="reset-badge">Account Recovery</span>
              <h2>Reset Password</h2>
              <p>
                No worries. Enter the email connected to your account and we’ll
                help you create a new password.
              </p>
            </div>

            {error && <div className="reset-alert reset-alert-error">{error}</div>}

            {success && (
              <div className="reset-alert reset-alert-success">{success}</div>
            )}

            <form onSubmit={handleSubmit} className="reset-form">
              <label htmlFor="reset-email">Email Address</label>

              <div className="reset-input-wrap">
                <span>✉</span>
                <input
                  id="reset-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="reset-submit" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>

            <button
              type="button"
              className="reset-back-button"
              onClick={handleBackToLogin}
            >
              Back to Login
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default ResetPassword;