import React from 'react';
import Header from './Header';
import './Profile.css';

const Profile = ({ user, onLogout }) => {
  // Creates the full name shown on the profile page.
  const fullName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
    : 'User';

  // Creates initials for the profile avatar.
  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
    : 'U';

  return (
    <div className="profile-page">
      <Header user={user} onLogout={onLogout} />

      <main className="profile-content">
        
        <section className="profile-hero-card">
        <div className="profile-hero-top">
            <div className="profile-avatar">{initials}</div>

            <div className="profile-hero-info">
            <p className="profile-kicker">My Profile</p>

            <h1>{fullName}</h1>

            <p>{user?.email || 'No email available'}</p>

            <div className="profile-actions">
                <button
                type="button"
                className="profile-action-button primary"
                onClick={() => alert("Edit Profile will be connected later.")}
                >
                ✏️ Edit
                </button>

                <button
                type="button"
                className="profile-action-button secondary"
                onClick={() => alert("Reset Password will be connected later.")}
                >
                🔑 Reset Password
                </button>

                <button
                type="button"
                className="profile-action-button danger"
                onClick={onLogout}
                >
                🚪 Log Out
                </button>
            </div>
            </div>
        </div>
        </section>

        <section className="profile-details-card">
          <div className="profile-card-header">
            <div>
              <h2>Account Information</h2>
              <p>Basic user details from your current logged-in session.</p>
            </div>
          </div>

          <div className="profile-details-grid">
            <div className="profile-detail-item">
              <span>First Name</span>
              <strong>{user?.firstName || 'N/A'}</strong>
            </div>

            <div className="profile-detail-item">
              <span>Last Name</span>
              <strong>{user?.lastName || 'N/A'}</strong>
            </div>

            <div className="profile-detail-item">
              <span>Email</span>
              <strong>{user?.email || 'N/A'}</strong>
            </div>

            <div className="profile-detail-item">
              <span>Role</span>
              <strong>{user?.roleName || user?.role || 'N/A'}</strong>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Profile;