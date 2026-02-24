import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Conversations.css';
import './ConversationsExtra.css';
import Header from './Header';
import apiService from '../services/apiService';
import { formatLocalDate, formatLocalTime } from '../utils/dateUtils';

const Conversations = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchConversations = async (isPolling = false) => {
      try {
        // Only show loading spinner on initial load, not during polling
        if (!isPolling) {
          setLoading(true);
        }
        
        console.log('Fetching leads from API...');
        const data = await apiService.getLeads();
        console.log('Leads data received:', data);
        
        // Only update conversations if there are changes to prevent unnecessary re-renders
        setConversations(prevConversations => {
          const prevIds = Array.isArray(prevConversations) 
            ? prevConversations.map(c => c.id).sort().join(',') 
            : '';
          const newIds = Array.isArray(data) 
            ? data.map(c => c.id).sort().join(',') 
            : '';
          
          // Only update if conversations actually changed
          if (prevIds !== newIds) {
            return data;
          }
          return prevConversations;
        });
        
        setError(null);
      } catch (err) {
        console.error('Error fetching conversations:', err);
        console.error('Error details:', {
          message: err.message,
          stack: err.stack,
          name: err.name
        });
        
        // Provide more specific error message based on error type
        let errorMessage = 'Failed to load leads. ';
        if (err.message.includes('500')) {
          errorMessage += 'Server error - please check if the backend service is running properly.';
        } else if (err.message.includes('Failed to fetch') || err.message.includes('Network')) {
          errorMessage += 'Network connection error - please check if the server is accessible.';
        } else {
          errorMessage += `Error: ${err.message}`;
        }
        
        setError(errorMessage);
      } finally {
        // Only set loading to false on initial load
        if (!isPolling) {
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchConversations(false);
    
    // Set up polling every 5 seconds for real-time updates
    const pollingInterval = setInterval(() => {
      fetchConversations(true); // Pass true for polling calls
    }, 5000); // 5 seconds
    
    // Cleanup interval on component unmount
    return () => {
      clearInterval(pollingInterval);
    };
  }, []);

  const filteredConversations = Array.isArray(conversations) ? conversations.filter(conv => {
    if (!conv || !searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    
    // Get lead name from firstName and lastName properties
    const leadName = `${conv.firstName || ''} ${conv.lastName || ''}`.trim();
    
    const lead = leadName.toLowerCase();
    const leadEmail = conv.email ? String(conv.email).toLowerCase() : '';
    const leadPhone = conv.phone ? String(conv.phone).toLowerCase() : '';
    
    return lead.includes(query) || leadEmail.includes(query) || leadPhone.includes(query);
  }) : [];

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
          {loading ? (
            <div className="loading-state">
              <p>Loading leads...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="btn btn-retry"
              >
                Retry
              </button>
            </div>
          ) : (
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
                {filteredConversations.length === 0 && !loading ? (
                  <tr>
                    <td colSpan="6" className="no-data">
                      {searchQuery ? 'No leads match your search.' : 'No leads found.'}
                    </td>
                  </tr>
                ) : (
                  filteredConversations.map((conv) => {
                    // Get lead name from firstName and lastName
                    const leadName = `${conv.firstName || ''} ${conv.lastName || ''}`.trim() || 'Unknown';
                    
                    // Generate initials from lead name if not provided
                    const initials = conv.initials || 
                      (leadName && typeof leadName === 'string' ? 
                        leadName.split(' ').map(n => n[0]).join('').toUpperCase() : 
                        '?');
                    // Generate a color if not provided
                    const color = conv.color || `hsl(${(conv.id || 0) * 137.508 % 360}, 70%, 60%)`;
                    
                    const handleLeadClick = () => {
                      if (conv.id) {
                        navigate(`/conversations/${conv.id}`);
                      }
                    };
                    
                    return (
                      <tr key={conv.id}>
                        <td>
                          <div className="lead-cell">
                            <div 
                              className="lead-avatar" 
                              style={{ background: color }}
                            >
                              {initials}
                            </div>
                            <span 
                              className="lead-name clickable" 
                              onClick={handleLeadClick}
                              title="View conversation history"
                            >
                              {leadName}
                            </span>
                          </div>
                        </td>
                        <td className="contact-cell">
                          <div className="contact-phone">{conv.phone || 'N/A'}</div>
                          <div className="contact-email">{conv.email || 'N/A'}</div>
                        </td>
                        <td>{conv.community}</td>
                        <td>
                          <span className="source-badge">
                            - <br />
                            {conv.source}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge status-${conv.status?.toLowerCase()}`}>
                            {conv.status}
                          </span>
                        </td>
                        <td className="created-cell">
                          <span className="created-date">{conv.created?.date || formatLocalDate(conv.createdAt)}</span>
                          <span className="created-time">{conv.created?.time || formatLocalTime(conv.createdAt)}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Conversations;
