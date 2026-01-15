import React from 'react';
import Header from './Header';

const Communities = ({ user, onLogout }) => {
  return (
    <div style={{ marginLeft: '250px', minHeight: '100vh', width: 'calc(100% - 250px)', background: '#f5f7fa' }}>
      <Header user={user} onLogout={onLogout} />
      <div style={{ padding: '32px' }}>
        <h1>Communities</h1>
        <p>Communities page coming soon...</p>
      </div>
    </div>
  );
};

export default Communities;
