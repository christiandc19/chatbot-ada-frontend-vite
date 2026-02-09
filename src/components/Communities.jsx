import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import './Communities.css';
import Header from './Header';
import apiService from '../services/apiService';

const Communities = ({ user, onLogout }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    urlAddress: '',
    companyName: ''
  });
  const [errors, setErrors] = useState({});
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  // Fetch companies when component mounts
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const companiesData = await apiService.getCompanies();
        setCompanies(companiesData);
      } catch (error) {
        console.error('Failed to load companies:', error);
        showNotification('Failed to load companies', 'error');
      }
    };

    fetchCompanies();
  }, []);

  const handleNavigateToUpdateCommunity = () => {
    navigate('/communities/update-community');
  };

  const openModal = () => {
    setIsModalOpen(true);
    setFormData({
      email: '',
      phone: '',
      urlAddress: '',
      companyName: ''
    });
    setErrors({});
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    } else if (!/^\d+$/.test(formData.phone)) {
      newErrors.phone = 'Phone must contain only numbers';
    }
    
    if (!formData.urlAddress.trim()) {
      newErrors.urlAddress = 'URL Address is required';
    } else if (!/^https?:\/\/.+\..+/.test(formData.urlAddress)) {
      newErrors.urlAddress = 'Please enter a valid URL (starting with http:// or https://)';
    }
    
    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      setLoading(true);
      
      try {
        const communityData = {
          email: formData.email,
          phone: formData.phone,
          urlAddress: formData.urlAddress,
          companyId: parseInt(formData.companyName)
        };
        
        await apiService.createCommunity(communityData);
        
        // Show success notification
        showNotification('Community added successfully!', 'success');
        
        // Reset form and close modal on success
        closeModal();
      } catch (error) {
        console.error('Error creating community:', error);
        showNotification('Failed to add community. Please try again.', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="communities-container">
      <Header user={user} onLogout={onLogout} />

      <div className="communities-content">
        <div className="page-title-section">
          <div className="page-icon">🏘️</div>
          <h1 className="page-title">Communities</h1>
        </div>
        
        <button 
          className="btn btn-communities" 
          style={{ marginTop: '20px' }}
          onClick={openModal}
        >
          Add Community
        </button>
        
        <button 
          className="btn btn-communities" 
          style={{ marginTop: '12px' }}
          onClick={handleNavigateToUpdateCommunity}
        >
          Update Community
        </button>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Add Community</h2>
              <button
                onClick={closeModal}
                className="modal-close-btn"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">
                  Email <span className="required">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  placeholder="Enter email address"
                />
                {errors.email && (
                  <span className="error-message">
                    {errors.email}
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
                  className={`form-input ${errors.phone ? 'error' : ''}`}
                  placeholder="Enter phone number"
                />
                {errors.phone && (
                  <span className="error-message">
                    {errors.phone}
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
                  className={`form-input ${errors.urlAddress ? 'error' : ''}`}
                  placeholder="https://example.com"
                />
                {errors.urlAddress && (
                  <span className="error-message">
                    {errors.urlAddress}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Company <span className="required">*</span>
                </label>
                <select
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  className={`form-input ${errors.companyName ? 'error' : ''}`}
                >
                  <option value="">Select a company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.companyName}
                    </option>
                  ))}
                </select>
                {errors.companyName && (
                  <span className="error-message">
                    {errors.companyName}
                  </span>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={loading}
                >
                  {loading ? 'Adding...' : 'Add Community'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Communities;
