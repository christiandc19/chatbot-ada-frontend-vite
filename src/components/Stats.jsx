import React from 'react';
import Header from './Header';

const Stats = ({ user, onLogout }) => {
  return (
    <div style={{ marginLeft: '250px', minHeight: '100vh', width: 'calc(100% - 250px)', background: '#f5f7fa' }}>
      <Header user={user} onLogout={onLogout} />
      <div style={{ padding: '32px' }}>
        <h1>Stats</h1>
        <p>Stats page coming soon...</p>
      </div>
    </div>
  );
};

export default Stats;
