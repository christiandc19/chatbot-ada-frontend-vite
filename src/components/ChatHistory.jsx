import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ChatHistory.css';
import Header from './Header';
import apiService from '../services/apiService';

const ChatHistory = ({ user, onLogout }) => {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [leadName, setLeadName] = useState('');
  const [communityName, setCommunityName] = useState('');
  const [newNote, setNewNote] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    const fetchConversations = async (isPolling = false) => {
      try {
        // Only show loading spinner on initial load, not during polling
        if (!isPolling) {
          setLoading(true);
        }
        
        console.log('Fetching conversations for lead:', leadId);
        const data = await apiService.getConversationsByLead(leadId);
        console.log('Conversations data received:', data);
        
        // Extract lead information from the API response (only on initial load)
        if (!isPolling) {
          if (data.firstName && data.lastName) {
            const fullName = `${data.firstName} ${data.lastName}`.trim();
            setLeadName(fullName);
          }
          
          if (data.community) {
            setCommunityName(data.community.name || data.community);
          }
        }
        
        // Handle conversations array from the payload
        const conversationsArray = data.conversations || data.messages || [];
        
        // Sort conversations by createdAt in ascending order (oldest first)
        const sortedConversations = conversationsArray.sort((a, b) => {
          const dateA = new Date(a.createdAt);
          const dateB = new Date(b.createdAt);
          return dateA - dateB; // Ascending order
        });
        
        // Only update messages if there are changes to prevent unnecessary re-renders
        setMessages(prevMessages => {
          const prevIds = prevMessages.map(m => m.id).sort().join(',');
          const newIds = sortedConversations.map(m => m.id).sort().join(',');
          
          // Only update if messages actually changed
          if (prevIds !== newIds) {
            return sortedConversations;
          }
          return prevMessages;
        });
        
        setError(null);
      } catch (err) {
        console.error('Error fetching conversations:', err);
        console.error('Error details:', {
          message: err.message,
          stack: err.stack,
          leadId
        });
        
        // Provide more specific error message based on error type
        let errorMessage = 'Failed to load conversation history. ';
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
        
        // Mark initial load as complete
        if (isInitialLoad) {
          setIsInitialLoad(false);
        }
      }
    };

    if (leadId) {
      // Initial fetch
      fetchConversations(false);
      
      // Set up polling every 5 seconds for responsive chat experience
      const pollingInterval = setInterval(() => {
        fetchConversations(true); // Pass true for polling calls
      }, 5000); // 5 seconds - good balance for chat apps
      
      // Cleanup interval on component unmount or leadId change
      return () => {
        clearInterval(pollingInterval);
      };
    }
  }, [leadId]);

  const handleBackToConversations = () => {
    navigate('/conversations');
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      // Add note functionality - you can implement this later
      console.log('Adding note:', newNote);
      setNewNote('');
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatMessageText = (text) => {
    if (!text) return '';
    return text.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <div className="chat-history-container">
      <Header user={user} onLogout={onLogout} />
      
      <div className="chat-content">
        <div className="chat-header">
          <div className="breadcrumb">
            <button 
              className="breadcrumb-link" 
              onClick={handleBackToConversations}
            >
              ALL CONVERSATIONS
            </button>
            <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-current">
              {leadName.toUpperCase()} ({communityName.toUpperCase()})
            </span>
          </div>
          <h1 className="chat-title">{leadName}</h1>
        </div>

        <div className="chat-messages-container">
          {loading ? (
            <div className="loading-state">
              <p>Loading conversation...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>{error}</p>
              <button onClick={() => window.location.reload()} className="btn-retry">
                Retry
              </button>
            </div>
          ) : (
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="no-messages">
                  <p>No messages found for this conversation.</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  // Determine if message is from bot based on content patterns
                  const messageText = message.message || message.content || message.text || '';
                  const isBot = messageText.includes('How can I help') || 
                               messageText.includes('BOT') ||
                               message.sender === 'BOT' || 
                               message.sender === 'bot' || 
                               message.isBot || 
                               message.type === 'bot';
                  
                  const senderName = isBot ? 'BOT' : leadName;
                  
                  // Generate initials for avatar using lead's actual name
                  const getInitials = (name) => {
                    if (!name || !name.trim()) return 'U';
                    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
                  };
                  
                  const initials = isBot ? 'BOT' : getInitials(leadName);
                  const avatarColor = isBot ? '#4f46e5' : '#6b7280';
                  
                  return (
                    <div 
                      key={message.id || index} 
                      className={`message-wrapper ${isBot ? 'message-wrapper-bot' : 'message-wrapper-user'}`}
                    >
                      {!isBot && (
                        <div className="message-avatar" style={{ backgroundColor: avatarColor }}>
                          {initials}
                        </div>
                      )}
                      
                      <div className={`message-bubble ${isBot ? 'message-bubble-bot' : 'message-bubble-user'}`}>
                        <div className="message-header">
                          <span className="message-sender">{senderName}</span>
                          <span className="message-time">
                            {formatTime(message.timestamp || message.createdAt)}
                          </span>
                          {isBot && <span className="bot-badge">BOT</span>}
                        </div>
                        <div className="message-text">
                          {formatMessageText(message.message || message.content || message.text)}
                        </div>
                      </div>
                      
                      {isBot && (
                        <div className="message-avatar" style={{ backgroundColor: avatarColor }}>
                          {initials}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="chat-input-container">
          <div className="add-note-section">
            <button className="add-note-btn" onClick={handleAddNote}>
              + Add Note
            </button>
          </div>
          
          <div className="message-input-section">
            <textarea
              className="message-input"
              placeholder="Type a message..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
            />
            <button className="send-btn" onClick={handleAddNote}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatHistory;