import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../contexts/NotificationContext";
import Header from "./Header";
import apiService from "../services/apiService";
import "./Settings.css";

const Settings = ({ user, onLogout }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);

  const [roles, setRoles] = useState([]);
  const [companies, setCompanies] = useState([]);

  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [companyLoading, setCompanyLoading] = useState(false);

  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [companyError, setCompanyError] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    role: "",
    email: "",
    companyName: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [companyData, setCompanyData] = useState({
    companyName: "",
    email: "",
    phone: "",
    website: "",
  });

  const navigate = useNavigate();
  const { showNotification } = useNotification();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rolesData, companiesData] = await Promise.all([
          apiService.getRolesForSettings(),
          apiService.getCompanies(),
        ]);

        setRoles(rolesData);
        setCompanies(companiesData);
      } catch {
        setError("Failed to load data. Please refresh the page or try again later.");
      }
    };

    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCompanyInputChange = (e) => {
    const { name, value } = e.target;
    setCompanyData((prev) => ({ ...prev, [name]: value }));
  };

  const resetUserForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      role: "",
      email: "",
      companyName: "",
    });
  };

  const resetPasswordForm = () => {
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  const resetCompanyForm = () => {
    setCompanyData({
      companyName: "",
      email: "",
      phone: "",
      website: "",
    });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setError("");
    resetUserForm();
  };

  const handleClosePasswordModal = () => {
    setIsPasswordModalOpen(false);
    setPasswordError("");
    resetPasswordForm();
  };

  const handleCloseCompanyModal = () => {
    setIsAddCompanyModalOpen(false);
    setCompanyError("");
    resetCompanyForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const userData = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      roleId: formData.role && !isNaN(formData.role) ? parseInt(formData.role) : null,
      email: formData.email,
      companyId:
        formData.companyName && !isNaN(formData.companyName)
          ? parseInt(formData.companyName)
          : null,
    };

    if (!userData.roleId) {
      setError("Please select a valid role");
      setLoading(false);
      return;
    }

    if (!userData.companyId) {
      setError("Please select a valid company");
      setLoading(false);
      return;
    }

    try {
      await apiService.createUser(userData);
      showNotification("Successfully Saved!", "success");
      handleCloseModal();
    } catch (error) {
      setError(error.message || "Failed to create user. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError("");

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New passwords do not match");
      setPasswordLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long");
      setPasswordLoading(false);
      return;
    }

    try {
      await apiService.changePassword(user.id, passwordData);
      showNotification("Password changed successfully!", "success");
      handleClosePasswordModal();
    } catch (error) {
      setPasswordError(error.message || "Failed to change password. Please try again.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleCompanySubmit = async (e) => {
    e.preventDefault();
    setCompanyLoading(true);
    setCompanyError("");

    if (!companyData.companyName.trim()) {
      setCompanyError("Company Name is required");
      setCompanyLoading(false);
      return;
    }

    if (!companyData.email.trim()) {
      setCompanyError("Email is required");
      setCompanyLoading(false);
      return;
    }

    if (!companyData.phone.trim()) {
      setCompanyError("Phone is required");
      setCompanyLoading(false);
      return;
    }

    if (!companyData.website.trim()) {
      setCompanyError("Website is required");
      setCompanyLoading(false);
      return;
    }

    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(companyData.email)) {
      setCompanyError("Please enter a valid email address");
      setCompanyLoading(false);
      return;
    }

    const websiteRegex = /^https?:\/\/(localhost(:\d+)?|.+\..+)/;
    if (!websiteRegex.test(companyData.website)) {
      setCompanyError("Please enter a valid website URL starting with http:// or https://");
      setCompanyLoading(false);
      return;
    }

    try {
      await apiService.createCompany(companyData);
      showNotification("Company added successfully!", "success");
      handleCloseCompanyModal();
    } catch (error) {
      setCompanyError(error.message || "Failed to add company. Please try again.");
    } finally {
      setCompanyLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <Header user={user} onLogout={onLogout} />

      <main className="settings-content">
        <div className="page-title-section">
          <div className="page-icon">⚙️</div>
          <h1 className="page-title">Settings</h1>
        </div>

        <div className="settings-btn">
          <button className="settings-action settings-action-primary" onClick={() => setIsModalOpen(true)}>
            Add User
          </button>

          <button className="settings-action settings-action-primary" onClick={() => navigate("/settings/update-user")}>
            Update User
          </button>

          <button className="settings-action settings-action-primary" onClick={() => setIsPasswordModalOpen(true)}>
            Change Password
          </button>

          <button className="settings-action settings-action-primary" onClick={() => setIsAddCompanyModalOpen(true)}>
            Add Company
          </button>

          <button className="settings-action settings-action-primary" onClick={() => navigate("/settings/update-company")}>
            Update Company
          </button>
        </div>
      </main>

      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="modal-eyebrow">User Management</p>
                <h2>Add User</h2>
              </div>
              <button className="modal-close" onClick={handleCloseModal}>×</button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>First Name <span className="required-asterisk">*</span></label>
                  <input name="firstName" value={formData.firstName} onChange={handleInputChange} required />
                </div>

                <div className="form-group">
                  <label>Last Name <span className="required-asterisk">*</span></label>
                  <input name="lastName" value={formData.lastName} onChange={handleInputChange} required />
                </div>
              </div>

              <div className="form-group">
                <label>Role <span className="required-asterisk">*</span></label>
                <select name="role" value={formData.role} onChange={handleInputChange} required>
                  <option value="">Select a role</option>
                  {roles.map((role) => (
                    <option key={role.roleId || role.id} value={role.roleId || role.id}>
                      {role.roleName || role.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Company <span className="required-asterisk">*</span></label>
                <select name="companyName" value={formData.companyName} onChange={handleInputChange} required>
                  <option value="">Select a company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.companyName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Email Address <span className="required-asterisk">*</span></label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} required />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-cancel" onClick={handleCloseModal} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-settings" disabled={loading}>
                  {loading ? "Creating User..." : "Add User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPasswordModalOpen && (
        <div className="modal-overlay" onClick={handleClosePasswordModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Change Password</h2>
              <button className="modal-close" onClick={handleClosePasswordModal}>×</button>
            </div>

            {passwordError && <div className="error-message">{passwordError}</div>}

            <form onSubmit={handlePasswordSubmit} className="modal-form">
              <div className="form-group">
                <label>Current Password <span className="required-asterisk">*</span></label>
                <input type="password" name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordInputChange} required />
              </div>

              <div className="form-group">
                <label>New Password <span className="required-asterisk">*</span></label>
                <input type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordInputChange} required />
              </div>

              <div className="form-group">
                <label>Confirm Password <span className="required-asterisk">*</span></label>
                <input type="password" name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordInputChange} required />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-cancel" onClick={handleClosePasswordModal} disabled={passwordLoading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-settings" disabled={passwordLoading}>
                  {passwordLoading ? "Changing Password..." : "Change Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddCompanyModalOpen && (
        <div className="modal-overlay" onClick={handleCloseCompanyModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Company</h2>
              <button className="modal-close" onClick={handleCloseCompanyModal}>×</button>
            </div>

            {companyError && <div className="error-message">{companyError}</div>}

            <form onSubmit={handleCompanySubmit} className="modal-form">
              <div className="form-group">
                <label>Company Name <span className="required-asterisk">*</span></label>
                <input name="companyName" value={companyData.companyName} onChange={handleCompanyInputChange} required />
              </div>

              <div className="form-group">
                <label>Email <span className="required-asterisk">*</span></label>
                <input type="email" name="email" value={companyData.email} onChange={handleCompanyInputChange} required />
              </div>

              <div className="form-group">
                <label>Phone <span className="required-asterisk">*</span></label>
                <input type="tel" name="phone" value={companyData.phone} onChange={handleCompanyInputChange} required />
              </div>

              <div className="form-group">
                <label>Website <span className="required-asterisk">*</span></label>
                <input type="url" name="website" value={companyData.website} onChange={handleCompanyInputChange} placeholder="https://example.com" required />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-cancel" onClick={handleCloseCompanyModal} disabled={companyLoading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-settings" disabled={companyLoading}>
                  {companyLoading ? "Adding Company..." : "Add Company"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;