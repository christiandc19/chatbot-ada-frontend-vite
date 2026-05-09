import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Header.css';

const Header = ({ user, onLogout }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Used to navigate to the My Profile page.
  const navigate = useNavigate();

  // Creates the full name displayed in the header.
  const fullName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
    : 'User';

  // Creates initials for the green avatar circle.
  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
    : 'U';

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Closes the dropdown when clicking outside the user menu.
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Opens the My Profile page.
  const handleProfileClick = () => {
    setIsDropdownOpen(false);
    navigate('/profile');
  };

  // Logs the user out.
  const handleSignOut = () => {
    setIsDropdownOpen(false);

    if (onLogout) {
      onLogout();
    }
  };

  return (
    <div className="page-header">
      <div className="notification-icon">
        <span>🔔</span>
      </div>

      <div className="user-info" ref={dropdownRef}>
        <span className="user-name">{fullName}</span>

        <button
          type="button"
          className="user-avatar"
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          aria-label="Open user menu"
        >
          {initials}
        </button>

        {isDropdownOpen && (
          <div className="user-dropdown">
            <div className="dropdown-user-card">
              <div className="dropdown-avatar">{initials}</div>

              <div>
                <p className="dropdown-user-name">{fullName}</p>
                <p className="dropdown-user-email">{user?.email || 'No email'}</p>
              </div>
            </div>

            <div className="dropdown-divider" />

            <button className="dropdown-item" onClick={handleProfileClick}>
              <span className="dropdown-icon">👤</span>
              My Profile
            </button>

            <button className="dropdown-item" onClick={handleSignOut}>
              <span className="dropdown-icon">🚪</span>
              Log Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;