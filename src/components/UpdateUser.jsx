import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import Header from './Header';
import apiService from '../services/apiService';
import './Settings.css';
import './UpdateUser.css';

const UpdateUser = ({ user, onLogout }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    role: '',
    email: '',
    isActive: true
  });
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [usersData, rolesData] = await Promise.all([
          apiService.getUsers(),
          apiService.getRolesForSettings()
        ]);
        setUsers(usersData);
        setRoles(rolesData);
      } catch (error) {
        setError('Failed to load data. Please refresh the page or try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleBackToSettings = () => {
    navigate('/settings');
  };

  const handleUpdateUser = (userToUpdate) => {
    setSelectedUser(userToUpdate);
    setFormData({
      firstName: userToUpdate.firstName || '',
      lastName: userToUpdate.lastName || '',
      role: userToUpdate.roleId?.toString() || '',
      email: userToUpdate.email || '',
      isActive: userToUpdate.isActive !== undefined ? userToUpdate.isActive : true
    });
    setIsUpdateModalOpen(true);
  };

  const handleCloseUpdateModal = () => {
    setIsUpdateModalOpen(false);
    setSelectedUser(null);
    setError('');
    setFormData({
      firstName: '',
      lastName: '',
      role: '',
      email: '',
      isActive: true
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');
    
    try {
      const userData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        roleId: formData.role && !isNaN(formData.role) ? parseInt(formData.role) : null,
        email: formData.email,
        isActive: formData.isActive
      };
      
      if (!userData.roleId) {
        setError('Please select a valid role');
        return;
      }
      
      await apiService.updateUser(selectedUser.userId || selectedUser.id, userData);
      
      // Refresh users list
      const updatedUsers = await apiService.getUsers();
      setUsers(updatedUsers);
      
      // Show success notification
      showNotification('Successfully Saved!', 'success');
      
      // Reset form and close modal on success
      setIsUpdateModalOpen(false);
      setSelectedUser(null);
      setFormData({
        firstName: '',
        lastName: '',
        role: '',
        email: '',
        isActive: true
      });
    } catch (error) {
      setError(error.message || 'Failed to update user. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="update-user-container">
        <Header user={user} onLogout={onLogout} />
        <div className="update-user-content">
          <div className="loading-container">
            <div className="loading-text">Loading users...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="update-user-container">
        <Header user={user} onLogout={onLogout} />
        <div className="update-user-content">
          <div className="page-title-section">
            <div className="page-icon">👥</div>
            <h1 className="page-title">Update User</h1>
          </div>
          <button 
            className="back-button"
            onClick={handleBackToSettings}
          >
            ◀ back
          </button>
          <div className="error-message-custom">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="update-user-container">
      <Header user={user} onLogout={onLogout} />
      <div className="update-user-content">
        <div className="page-title-section">
          <div className="page-icon">👥</div>
          <h1 className="page-title">Update User</h1>
        </div>
        
        <button 
          className="back-button-main"
          onClick={handleBackToSettings}
        >
          ◀ back
        </button>

        {users.length === 0 ? (
          <div className="no-users-container">
            <div className="no-users-text">No users found.</div>
          </div>
        ) : (
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr className="users-table-header">
                  <th>
                    Full Name
                  </th>
                  <th>
                    Email
                  </th>
                  <th>
                    Active
                  </th>
                  <th>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((userItem, index) => {
                  const userId = userItem.userId || userItem.id;
                  const fullName = `${userItem.firstName || ''} ${userItem.lastName || ''}`.trim() || 'N/A';
                  const email = userItem.email || 'N/A';
                  const isActive = userItem.isActive !== undefined ? userItem.isActive : true;
                  
                  return (
                    <tr 
                      key={userId} 
                      className="users-table-row"
                    >
                      <td className="users-table-cell users-table-cell-name">
                        {fullName}
                      </td>
                      <td className="users-table-cell users-table-cell-email">
                        {email}
                      </td>
                      <td className="users-table-cell">
                        <span className={`status-badge ${isActive ? 'status-badge-active' : 'status-badge-inactive'}`}>
                          {isActive ? '● Active' : '● Inactive'}
                        </span>
                      </td>
                      <td className="users-table-cell">
                        <button
                          className="btn btn-update-action"
                          onClick={() => handleUpdateUser(userItem)}
                          title="Edit User"
                        >
                          ✏️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Update User Modal */}
      {isUpdateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Update User</h2>
              <button className="modal-close" onClick={handleCloseUpdateModal}>
                ×
              </button>
            </div>
            {error && (
              <div className="modal-error-message">
                {error}
              </div>
            )}
            <form onSubmit={handleUpdateSubmit}>
              <div className="form-group">
                <label htmlFor="updateFirstName">First Name <span className="required-asterisk">*</span></label>
                <input
                  type="text"
                  id="updateFirstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="updateLastName">Last Name <span className="required-asterisk">*</span></label>
                <input
                  type="text"
                  id="updateLastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="updateRole">Role <span className="required-asterisk">*</span></label>
                <select
                  id="updateRole"
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
                <label htmlFor="updateEmail">Email Address <span className="required-asterisk">*</span></label>
                <input
                  type="email"
                  id="updateEmail"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <div className="active-status-container">
                  <label htmlFor="updateActive" className="active-status-label">Active Status</label>
                  <input
                    type="checkbox"
                    id="updateActive"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={(e) => handleInputChange({ target: { name: 'isActive', value: e.target.checked } })}
                    className="active-status-checkbox"
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-cancel" onClick={handleCloseUpdateModal} disabled={formLoading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-settings" disabled={formLoading}>
                  {formLoading ? 'Updating User...' : 'Update User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdateUser;