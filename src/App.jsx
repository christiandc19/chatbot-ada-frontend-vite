import './App.css';
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { NotificationProvider } from './contexts/NotificationContext';
import Notification from './components/Notification';
import Login from './components/Login';
import ResetPassword from './components/ResetPassword';
import Sidebar from './components/Sidebar';
import Conversations from './components/Conversations';
import Stats from './components/Stats';
import Communities from './components/Communities';
import Settings from './components/Settings';
import UpdateUser from './components/UpdateUser';

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  // Protected Route wrapper
  const ProtectedRoute = ({ children }) => {
    if (isLoading) {
      return <div>Loading...</div>; // Or a loading spinner component
    }
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  return (
    <NotificationProvider>
      <div className="App">
        <Notification />
        <Router>
          <Routes>
            <Route path="/login" element={
              isLoading ? <div>Loading...</div> : 
              user ? <Navigate to="/conversations" replace /> : 
              <Login onLoginSuccess={handleLoginSuccess} />
            } />
            <Route path="/resetpassword" element={
              <ResetPassword />
            } />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <div style={{ display: 'flex' }}>
                    <Sidebar onLogout={handleLogout} />
                    <Routes>
                      <Route path="/" element={<Navigate to="/conversations" replace />} />
                      <Route path="/stats" element={<Stats user={user} onLogout={handleLogout} />} />
                      <Route path="/conversations" element={<Conversations user={user} onLogout={handleLogout} />} />
                      <Route path="/communities" element={<Communities user={user} onLogout={handleLogout} />} />
                      <Route path="/settings" element={<Settings user={user} onLogout={handleLogout} />} />
                      <Route path="/settings/update-user" element={<UpdateUser user={user} onLogout={handleLogout} />} />
                    </Routes>
                  </div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </div>
    </NotificationProvider>
  );
}

export default App;
