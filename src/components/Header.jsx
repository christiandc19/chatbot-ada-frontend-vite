import React, { useState, useRef, useEffect } from 'react';
import './Header.css';

const Header = ({ user, onLogout }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
        <span className="user-name">
          {user ? `${user.firstName} ${user.lastName}` : 'User'}
        </span>
        <div 
          className="user-avatar" 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          {user ? (user.firstName[0] + user.lastName[0]).toUpperCase() : 'U'}
        </div>
        {isDropdownOpen && (
          <div className="user-dropdown">
            <button className="dropdown-item" onClick={handleSignOut}>
              <span className="dropdown-icon">🚪</span>
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;
