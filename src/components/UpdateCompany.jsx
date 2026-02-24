import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import Header from './Header';
import apiService from '../services/apiService';
import { formatLocalDateTime } from '../utils/dateUtils';
import './Communities.css';
import './UpdateCommunity.css';

const UpdateCompany = ({ user, onLogout }) => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    phone: '',
    urlAddress: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true);
        const companiesData = await apiService.getCompanies();
        setCompanies(companiesData);
      } catch (error) {
        setError('Failed to load companies. Please refresh the page or try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  const handleBackToSettings = () => {
    navigate('/settings');
  };

  const handleUpdateClick = (company) => {
    setSelectedCompany(company);
    setFormData({
      companyName: company.companyName || '',
      email: company.email || '',
      phone: company.phone || '',
      urlAddress: company.urlAddress || ''
    });
    setFormErrors({});
    setIsUpdateModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsUpdateModalOpen(false);
    setSelectedCompany(null);
    setFormData({
      companyName: '',
      email: '',
      phone: '',
      urlAddress: ''
    });
    setFormErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    } else if (formData.phone.length > 20) {
      newErrors.phone = 'Phone must not exceed 20 characters';
    }
    
    if (!formData.urlAddress.trim()) {
      newErrors.urlAddress = 'URL Address is required';
    } else if (!/^https?:\/\/(localhost(:\d+)?|.+\..+)/.test(formData.urlAddress)) {
      newErrors.urlAddress = 'Please enter a valid URL (starting with http:// or https://)';
    }
    
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      setFormLoading(true);
      
      try {
        const companyData = {
          id: selectedCompany.id,
          companyName: formData.companyName,
          email: formData.email,
          phone: formData.phone,
          urlAddress: formData.urlAddress
        };
        
        await apiService.updateCompany(companyData);
        
        // Show success notification
        showNotification('Company updated successfully!', 'success');
        
        // Update the companies list
        setCompanies(prev => prev.map(company => 
          company.id === selectedCompany.id 
            ? { ...company, ...companyData }
            : company
        ));
        
        // Close modal
        handleCloseModal();
      } catch (error) {
        console.error('Error updating company:', error);
        showNotification('Failed to update company. Please try again.', 'error');
      } finally {
        setFormLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="communities-container">
        <Header user={user} onLogout={onLogout} />
        <div className="communities-content">
          <div className="loading">Loading companies...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="communities-container">
        <Header user={user} onLogout={onLogout} />
        <div className="communities-content">
          <div className="error">{error}</div>
          <button onClick={handleBackToSettings} className="btn btn-communities">
            Back to Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="communities-container">
      <Header user={user} onLogout={onLogout} />

      <div className="communities-content">
        <div className="page-title-section">
          <div className="page-icon">🏢</div>
          <h1 className="page-title">Update Company</h1>
        </div>

        <button onClick={handleBackToSettings} className="btn btn-back">
          ◄ back
        </button>

        <div className="communities-list">
          {companies.length === 0 ? (
            <p>No companies found.</p>
          ) : (
            <table className="communities-table">
              <thead>
                <tr>
                  <th>COMPANY NAME</th>
                  <th>EMAIL</th>
                  <th>CONTACT</th>
                  <th>WEB SITE</th>
                  <th>CREATED DATE</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id}>
                    <td>{company.companyName}</td>
                    <td>{company.email}</td>
                    <td>{company.phone}</td>
                    <td>
                      <a href={company.urlAddress} target="_blank" rel="noopener noreferrer" className="url-link">
                        {company.urlAddress}
                      </a>
                    </td>
                    <td>{formatLocalDateTime(company.createdAt)}</td>
                    <td>
                      <button
                        onClick={() => handleUpdateClick(company)}
                        className="btn btn-update-action"
                        title="Edit Company"
                      >
                        ✏️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Update Modal */}
      {isUpdateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Update Company</h2>
              <button
                onClick={handleCloseModal}
                className="modal-close-btn"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">
                  Company Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  className={`form-input ${formErrors.companyName ? 'error' : ''}`}
                  placeholder="Enter company name"
                  maxLength={255}
                />
                {formErrors.companyName && (
                  <span className="error-message">
                    {formErrors.companyName}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Email <span className="required">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`form-input ${formErrors.email ? 'error' : ''}`}
                  placeholder="Enter email address"
                  maxLength={255}
                />
                {formErrors.email && (
                  <span className="error-message">
                    {formErrors.email}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Phone <span className="required">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`form-input ${formErrors.phone ? 'error' : ''}`}
                  placeholder="Enter phone number"
                  maxLength={20}
                />
                {formErrors.phone && (
                  <span className="error-message">
                    {formErrors.phone}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  URL Address <span className="required">*</span>
                </label>
                <input
                  type="url"
                  name="urlAddress"
                  value={formData.urlAddress}
                  onChange={handleInputChange}
                  className={`form-input ${formErrors.urlAddress ? 'error' : ''}`}
                  placeholder="https://example.com"
                  maxLength={500}
                />
                {formErrors.urlAddress && (
                  <span className="error-message">
                    {formErrors.urlAddress}
                  </span>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={formLoading}
                >
                  {formLoading ? 'Updating...' : 'Update Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdateCompany;