import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import Header from './Header';
import apiService from '../services/apiService';
import './Communities.css';
import './UpdateCommunity.css';

const UpdateCommunity = ({ user, onLogout }) => {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    urlAddress: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        setLoading(true);
        const communitiesData = await apiService.getCommunities();
        setCommunities(communitiesData);
      } catch (error) {
        setError('Failed to load communities. Please refresh the page or try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchCommunities();
  }, []);

  const handleBackToCommunities = () => {
    navigate('/communities');
  };

  const handleUpdateClick = (community) => {
    setSelectedCommunity(community);
    setFormData({
      email: community.email || '',
      phone: community.phone || '',
      urlAddress: community.urlAddress || ''
    });
    setFormErrors({});
    setIsUpdateModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsUpdateModalOpen(false);
    setSelectedCommunity(null);
    setFormData({
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
    
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      setFormLoading(true);
      
      try {
        const communityData = {
          id: selectedCommunity.id,
          email: formData.email,
          phone: formData.phone,
          urlAddress: formData.urlAddress
        };
        
        await apiService.updateCommunity(communityData);
        
        // Show success notification
        showNotification('Community updated successfully!', 'success');
        
        // Update the communities list
        setCommunities(prev => prev.map(community => 
          community.id === selectedCommunity.id 
            ? { ...community, ...communityData }
            : community
        ));
        
        // Close modal
        handleCloseModal();
      } catch (error) {
        console.error('Error updating community:', error);
        showNotification('Failed to update community. Please try again.', 'error');
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
          <div className="loading">Loading communities...</div>
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
          <button onClick={handleBackToCommunities} className="btn btn-communities">
            Back to Communities
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
          <div className="page-icon">🏘️</div>
          <h1 className="page-title">Update Community</h1>
        </div>

        <button onClick={handleBackToCommunities} className="btn btn-back">
          ◄ back
        </button>

        <div className="communities-list">
          {communities.length === 0 ? (
            <p>No communities found.</p>
          ) : (
            <table className="communities-table">
              <thead>
                <tr>
                  <th>EMAIL</th>
                  <th>CONTACT</th>
                  <th>WEB SITE</th>
                  <th>CREATED DATE</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {communities.map((community) => (
                  <tr key={community.id}>
                    <td>{community.email}</td>
                    <td>{community.phone}</td>
                    <td>
                      <a href={community.urlAddress} target="_blank" rel="noopener noreferrer" className="url-link">
                        {community.urlAddress}
                      </a>
                    </td>
                    <td>{new Date(community.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        onClick={() => handleUpdateClick(community)}
                        className="btn btn-update-action"
                        title="Edit Community"
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
              <h2 className="modal-title">Update Community</h2>
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
                  Email <span className="required">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`form-input ${formErrors.email ? 'error' : ''}`}
                  placeholder="Enter email address"
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
                  {formLoading ? 'Updating...' : 'Update Community'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdateCommunity;