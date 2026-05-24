import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';
import './Header.css';

  const Header = ({ user, onLogout }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  // NEW:
  // Controls the notification dropdown visibility.
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // NEW:
  // Stores notifications for the logged-in user.
  const [notifications, setNotifications] = useState([]);
  const dropdownRef = useRef(null);
  // NEW:
  // Used to redirect when clicking a notification.
  const navigate = useNavigate();

  // Used to navigate to the My Profile page.
  
  // TEMP DEBUG:
  // Used to confirm the logged-in user object shape.
  console.log("Logged in user:", user);

  // Creates the full name displayed in the header.
  const fullName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
    : 'User';

  // Creates initials for the green avatar circle.
  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
    : 'U';


  // NEW:
  // Loads notifications for the logged-in user.
  useEffect(() => {
    // Prevent fetch if user is not ready yet.
    if (!user?.id) return;

    const loadNotifications = async () => {
      try {
        const data = await apiService.getUserNotifications(user.id);

        // Save notifications into state.
        setNotifications(data);
      } catch (error) {
        console.error("Failed to load notifications:", error);
      }
    };

    loadNotifications();
  }, [user]);

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
    <div
      className="notification-icon"
      onClick={() =>
        setIsNotificationsOpen((prev) => !prev)
      }
    >
      <span>🔔</span>

      {/* NEW:
          Shows unread notification count.
      */}
      {notifications.filter((n) => !n.isRead).length > 0 && (
        <div className="notification-badge">
          {
            notifications.filter((n) => !n.isRead).length
          }
        </div>
      )}

      {/* NEW:
          Notification dropdown.
      */}
      {isNotificationsOpen && (
        <div className="notifications-dropdown">

          {notifications.length === 0 ? (
            <div className="notification-empty">
              No notifications yet
            </div>
          ) : (
            notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${
                    notification.isRead ? "read" : "unread"
                  }`}
                  onClick={async () => {
                    try {
                      await apiService.markNotificationAsRead(notification.id);

                      setNotifications((prev) =>
                        prev.map((item) =>
                          item.id === notification.id
                            ? { ...item, isRead: true }
                            : item
                        )
                      );

                      setIsNotificationsOpen(false);

                    const leadId =
                      notification.leadId ||
                      notification.LeadId ||
                      notification.leadID;

                    console.log("Clicked notification:", notification);
                    console.log("Notification leadId:", leadId);

                    if (leadId) {
                      navigate(`/conversations/${leadId}`);
                    }
                    
                    } catch (error) {
                      console.error("Failed to open notification:", error);
                    }
                  }}
                >
                <div className="notification-title">
                  {notification.title}
                </div>

                <div className="notification-message">
                  {notification.message}
                </div>
              </div>
            ))
          )}
        </div>
      )}
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