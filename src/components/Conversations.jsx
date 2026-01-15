import React, { useState } from 'react';
import './Conversations.css';
import Header from './Header';

const Conversations = ({ user, onLogout }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations] = useState([
    {
      id: 1,
      lead: 'Arn Clavio',
      initials: 'AC',
      color: '#60a5fa',
      contact: {
        phone: '4244535695',
        email: 'arn@gmail.com'
      },
      community: 'Foxwood Springs Senior Living',
      source: 'Chat',
      status: 'Blocked',
      created: {
        date: 'Nov 21 2025',
        time: '6:28 PM'
      }
    },
    {
      id: 2,
      lead: 'Je Cabe',
      initials: 'JC',
      color: '#f87171',
      contact: {
        phone: '4244535695',
        email: 'jvc@gmail.com'
      },
      community: 'Foxwood Springs Senior Living',
      source: 'Chat',
      status: 'Submitted',
      created: {
        date: 'Nov 21 2025',
        time: '6:22 PM'
      }
    }
  ]);

  const filteredConversations = conversations.filter(conv =>
    conv.lead.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.contact.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="conversations-container">
      <Header user={user} onLogout={onLogout} />

      <div className="conversations-content">
        <div className="page-title-section">
          <div className="page-icon">💬</div>
          <h1 className="page-title">All Conversations</h1>
        </div>

        <div className="conversations-controls">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search leads and conversations"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="controls-actions">
            <button className="btn btn-download">
              <span>📄</span>
              Download .csv
            </button>
            <button className="btn btn-actions">
              Actions ▼
            </button>
          </div>
        </div>

        <div className="conversations-table">
          <table>
            <thead>
              <tr>
                <th>LEAD</th>
                <th>CONTACT</th>
                <th>COMMUNITY</th>
                <th>SOURCE</th>
                <th>STATUS</th>
                <th>
                  CREATED
                  <span className="filter-icon">⚙️</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredConversations.map((conv) => (
                <tr key={conv.id}>
                  <td>
                    <div className="lead-cell">
                      <div 
                        className="lead-avatar" 
                        style={{ background: conv.color }}
                      >
                        {conv.initials}
                      </div>
                      <span className="lead-name">{conv.lead}</span>
                    </div>
                  </td>
                  <td className="contact-cell">
                    <div className="contact-phone">{conv.contact.phone}</div>
                    <div className="contact-email">{conv.contact.email}</div>
                  </td>
                  <td>{conv.community}</td>
                  <td>
                    <span className="source-badge">
                      - <br />
                      {conv.source}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge status-${conv.status.toLowerCase()}`}>
                      {conv.status}
                    </span>
                  </td>
                  <td className="created-cell">
                    <span className="created-date">{conv.created.date}</span>
                    <span className="created-time">{conv.created.time}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Conversations;
