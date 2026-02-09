import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import Header from './Header';
import apiService from '../services/apiService';
import './Settings.css';

const Settings = ({ user, onLogout }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [companyError, setCompanyError] = useState('');
  const [companyLoading, setCompanyLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    role: '',
    email: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [companyData, setCompanyData] = useState({
    companyName: '',
    email: '',
    phone: '',
    website: ''
  });
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  // Fetch roles when component mounts
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const rolesData = await apiService.getRolesForSettings();
        setRoles(rolesData);
      } catch (error) {
        setError('Failed to load roles. Please refresh the page or try again later.');
      }
    };

    fetchRoles();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCompanyInputChange = (e) => {
    const { name, value } = e.target;
    setCompanyData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const userData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        roleId: formData.role && !isNaN(formData.role) ? parseInt(formData.role) : null,
        email: formData.email
      };
      
      // Validate that we have a valid roleId
      if (!userData.roleId) {
        setError('Please select a valid role');
        return;
      }
      
      await apiService.createUser(userData);
      
      // Show success notification
      showNotification('Successfully Saved!', 'success');
      
      // Reset form and close modal on success
      setIsModalOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        role: '',
        email: ''
      });
    } catch (error) {
      setError(error.message || 'Failed to create user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError('');
    
    // Validate passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      setPasswordLoading(false);
      return;
    }
    
    // Validate password strength (optional)
    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      setPasswordLoading(false);
      return;
    }
    
    try {
      // Call API to change password - pass user ID as first parameter
      await apiService.changePassword(user.id, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword
      });
      
      // Show success notification
      showNotification('Password changed successfully!', 'success');
      
      // Reset form and close modal on success
      handleClosePasswordModal();
    } catch (error) {
      setPasswordError(error.message || 'Failed to change password. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setError('');
    setFormData({
      firstName: '',
      lastName: '',
      role: '',
      email: ''
    });
  };

  const handleClosePasswordModal = () => {
    setIsPasswordModalOpen(false);
    setPasswordError('');
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  const handleNavigateToUpdateUser = () => {
    navigate('/settings/update-user');
  };

  const handleChangePassword = () => {
    setIsPasswordModalOpen(true);
  };

  const handleAddCompany = () => {
    setIsAddCompanyModalOpen(true);
  };

  const handleUpdateCompany = () => {
    navigate('/settings/update-company');
  };

  const handleCloseCompanyModal = () => {
    setIsAddCompanyModalOpen(false);
    setCompanyError('');
    setCompanyData({
      companyName: '',
      email: '',
      phone: '',
      website: ''
    });
  };

  const handleCompanySubmit = async (e) => {
    e.preventDefault();
    setCompanyLoading(true);
    setCompanyError('');
    
    // Validate required fields
    if (!companyData.companyName.trim()) {
      setCompanyError('Company Name is required');
      setCompanyLoading(false);
      return;
    }
    if (!companyData.email.trim()) {
      setCompanyError('Email is required');
      setCompanyLoading(false);
      return;
    }
    if (!companyData.phone.trim()) {
      setCompanyError('Phone is required');
      setCompanyLoading(false);
      return;
    }
    if (!companyData.website.trim()) {
      setCompanyError('Website is required');
      setCompanyLoading(false);
      return;
    }
    
    // Validate email format
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(companyData.email)) {
      setCompanyError('Please enter a valid email address');
      setCompanyLoading(false);
      return;
    }
    
    // Validate phone length
    if (companyData.phone.length > 20) {
      setCompanyError('Phone number must not exceed 20 characters');
      setCompanyLoading(false);
      return;
    }
    
    // Validate website format
    const websiteRegex = /^https?:\/\/(localhost(:\d+)?|.+\..+)/;
    if (!websiteRegex.test(companyData.website)) {
      setCompanyError('Please enter a valid website URL (starting with http:// or https://)');
      setCompanyLoading(false);
      return;
    }
    
    try {
      const companyPayload = {
        companyName: companyData.companyName,
        email: companyData.email,
        phone: companyData.phone,
        website: companyData.website
      };
      
      await apiService.createCompany(companyPayload);
      
      // Show success notification
      showNotification('Company added successfully!', 'success');
      
      // Reset form and close modal on success
      handleCloseCompanyModal();
    } catch (error) {
      setCompanyError(error.message || 'Failed to add company. Please try again.');
    } finally {
      setCompanyLoading(false);
    }
  };

  return (
    <div style={{ marginLeft: '250px', minHeight: '100vh', width: 'calc(100% - 250px)', background: '#f5f7fa' }}>
      <Header user={user} onLogout={onLogout} />
      <div style={{ padding: '32px' }}>
        <div className="page-title-section">
          <div className="page-icon">⚙️</div>
          <h1 className="page-title">Settings</h1>
        </div>
        <button 
          className="btn btn-settings" 
          style={{ marginTop: '20px' }}
          onClick={() => setIsModalOpen(true)}
        >
          Add User
        </button>
        
        <button 
          className="btn btn-settings" 
          style={{ marginTop: '12px' }}
          onClick={handleNavigateToUpdateUser}
        >
          Update User
        </button>
        
        <button 
          className="btn btn-settings" 
          style={{ marginTop: '12px' }}
          onClick={handleChangePassword}
        >
          Change Password
        </button>
        
        <button 
          className="btn btn-settings" 
          style={{ marginTop: '12px' }}
          onClick={handleAddCompany}
        >
          Add Company
        </button>
        
        <button 
          className="btn btn-settings" 
          style={{ marginTop: '12px' }}
          onClick={handleUpdateCompany}
        >
          Update Company
        </button>
      </div>

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add User</h2>
              <button className="modal-close" onClick={handleCloseModal}>
                ×
              </button>
            </div>
            {error && (
              <div className="error-message" style={{ margin: '0 24px 20px', padding: '12px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '6px', fontSize: '14px' }}>
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="firstName">First Name <span className="required-asterisk">*</span></label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="lastName">Last Name <span className="required-asterisk">*</span></label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="role">Role <span className="required-asterisk">*</span></label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  required
                >
                  <option key="default" value="">Select a role</option>
                  {roles.map((role) => {
                    return (
                      <option key={role.roleId || role.id} value={role.roleId || role.id}>
                        {role.roleName || role.name}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="email">Email Address <span className="required-asterisk">*</span></label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-cancel" onClick={handleCloseModal} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-settings" disabled={loading}>
                  {loading ? 'Creating User...' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Change Password</h2>
              <button className="modal-close" onClick={handleClosePasswordModal}>
                ×
              </button>
            </div>
            {passwordError && (
              <div className="error-message" style={{ margin: '0 24px 20px', padding: '12px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '6px', fontSize: '14px' }}>
                {passwordError}
              </div>
            )}
            <form onSubmit={handlePasswordSubmit}>
              <div className="form-group">
                <label htmlFor="currentPassword">Current Password <span className="required-asterisk">*</span></label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="newPassword">New Password <span className="required-asterisk">*</span></label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password <span className="required-asterisk">*</span></label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordInputChange}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-cancel" onClick={handleClosePasswordModal} disabled={passwordLoading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-settings" disabled={passwordLoading}>
                  {passwordLoading ? 'Changing Password...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Company Modal */}
      {isAddCompanyModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Company</h2>
              <button className="modal-close" onClick={handleCloseCompanyModal}>
                ×
              </button>
            </div>
            {companyError && (
              <div className="error-message" style={{ margin: '0 24px 20px', padding: '12px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '6px', fontSize: '14px' }}>
                {companyError}
              </div>
            )}
            <form onSubmit={handleCompanySubmit}>
              <div className="form-group">
                <label htmlFor="companyName">Company Name <span className="required-asterisk">*</span></label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={companyData.companyName}
                  onChange={handleCompanyInputChange}
                  placeholder="Enter company name"
                  maxLength={255}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email <span className="required-asterisk">*</span></label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={companyData.email}
                  onChange={handleCompanyInputChange}
                  placeholder="Enter email address"
                  maxLength={255}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Phone <span className="required-asterisk">*</span></label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={companyData.phone}
                  onChange={handleCompanyInputChange}
                  placeholder="Enter phone number"
                  maxLength={20}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="website">Website <span className="required-asterisk">*</span></label>
                <input
                  type="url"
                  id="website"
                  name="website"
                  value={companyData.website}
                  onChange={handleCompanyInputChange}
                  placeholder="https://example.com"
                  maxLength={500}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-cancel" onClick={handleCloseCompanyModal} disabled={companyLoading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-settings" disabled={companyLoading}>
                  {companyLoading ? 'Adding Company...' : 'Add Company'}
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
