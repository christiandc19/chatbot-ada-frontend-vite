import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Conversations.css";
import Header from "./Header";
import apiService from "../services/apiService";
import { formatLocalDate, formatLocalTime } from "../utils/dateUtils";
import { trackEvent } from "../utils/analytics";

const Conversations = ({ user, onLogout }) => {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchTimer, setSearchTimer] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);

  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newNote, setNewNote] = useState("");

  useEffect(() => {
    trackEvent("Conversations", "Page View", "Conversations Page");

    const fetchConversations = async (isPolling = false) => {
      try {
        if (!isPolling) setLoading(true);

        const data = await apiService.getLeads();

        const leads = Array.isArray(data) ? data : [];

        setConversations(leads);

        setSelectedLead((currentLead) => {
          if (currentLead) {
            return leads.find((lead) => lead.id === currentLead.id) || currentLead;
          }

          return leads.length > 0 ? leads[0] : null;
        });

        setError(null);

        if (!isPolling) {
          trackEvent("Conversations", "Leads Loaded", "Fetch success");
        }
      } catch (err) {
        console.error("Error fetching conversations:", err);

        let errorMessage = "Failed to load leads. ";

        if (err.message.includes("500")) {
          errorMessage +=
            "Server error - please check if the backend service is running properly.";
        } else if (
          err.message.includes("Failed to fetch") ||
          err.message.includes("Network")
        ) {
          errorMessage +=
            "Network connection error - please check if the server is accessible.";
        } else {
          errorMessage += `Error: ${err.message}`;
        }

        setError(errorMessage);

        if (!isPolling) {
          trackEvent("Conversations", "Leads Load Failed", "Fetch error");
        }
      } finally {
        if (!isPolling) setLoading(false);
      }
    };

    fetchConversations(false);

    const pollingInterval = setInterval(() => {
      fetchConversations(true);
    }, 5000);

    return () => clearInterval(pollingInterval);
  }, []);

  useEffect(() => {
    if (!selectedLead?.id) return;

    const fetchLeadMessages = async (isPolling = false) => {
      try {
        if (!isPolling) {
          setMessagesLoading(true);
        }

        const data = await apiService.getConversationsByLead(selectedLead.id);

        const conversationsArray = data.conversations || data.messages || [];

        const sortedMessages = conversationsArray.sort((a, b) => {
          return new Date(a.createdAt) - new Date(b.createdAt);
        });

        setMessages(sortedMessages);
        setMessagesError(null);
      } catch (err) {
        console.error("Error fetching lead messages:", err);
        setMessagesError("Failed to load this conversation.");
      } finally {
        if (!isPolling) {
          setMessagesLoading(false);
        }
      }
    };

    fetchLeadMessages(false);

    const pollingInterval = setInterval(() => {
      fetchLeadMessages(true);
    }, 5000);

    return () => clearInterval(pollingInterval);
  }, [selectedLead?.id]);

  const getLeadName = (lead) => {
    return `${lead?.firstName || ""} ${lead?.lastName || ""}`.trim() || "Unknown";
  };

  const getInitials = (name) => {
    if (!name || !name.trim()) return "U";

    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const getAvatarColor = (lead) => {
    return (
      lead?.color ||
      `hsl(${((lead?.id || 0) * 137.508) % 360}, 70%, 58%)`
    );
  };

  const getMessageText = (message) => {
    return message.message || message.content || message.text || "";
  };

  const formatBubbleMessage = (text) => {
    if (!text) return "";

    return text.replace(
      /Call Request:\s*(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})\s*(AM|PM|am|pm)?/g,
      (_, datePart, timePart, meridiem) => {
        const rawDate = `${datePart} ${timePart} ${meridiem || ""}`.trim();
        const date = new Date(rawDate);

        if (Number.isNaN(date.getTime())) {
          return `Call Request: ${datePart} ${timePart}`;
        }

        const formattedDate = date.toLocaleDateString("en-US", {
          month: "long",
          day: "2-digit",
          year: "numeric",
        });

        const formattedTime = date
          .toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })
          .replace(" ", "");

        return `Call Request: ${formattedDate} at ${formattedTime}`;
      }
    );
  };

  const renderMessageText = (text) => {
    const cleanText = formatBubbleMessage(text);

    return cleanText.split("\n").map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < cleanText.split("\n").length - 1 && <br />}
      </React.Fragment>
    ));
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (searchTimer) {
      clearTimeout(searchTimer);
    }

    const timer = setTimeout(() => {
      if (value.trim()) {
        trackEvent("Conversations", "Search Leads", "Search used");
      }
    }, 800);

    setSearchTimer(timer);
  };

  const handleSelectLead = (lead) => {
    setSelectedLead(lead);
    trackEvent("Conversations", "Selected Lead", "Lead opened in split view");
  };

  const handleOpenFullPage = () => {
    if (selectedLead?.id) {
      navigate(`/conversations/${selectedLead.id}`);
    }
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;

    console.log("Add note/message:", newNote);
    setNewNote("");
  };

  const filteredConversations = Array.isArray(conversations)
    ? conversations.filter((conv) => {
        if (!conv || !searchQuery) return true;

        const query = searchQuery.toLowerCase();
        const leadName = getLeadName(conv).toLowerCase();
        const leadEmail = conv.email ? String(conv.email).toLowerCase() : "";
        const leadPhone = conv.phone ? String(conv.phone).toLowerCase() : "";

        return (
          leadName.includes(query) ||
          leadEmail.includes(query) ||
          leadPhone.includes(query)
        );
      })
    : [];

  const selectedLeadName = getLeadName(selectedLead);
  const selectedLeadInitials = getInitials(selectedLeadName);

  return (
    <div className="conversations-container">
      <Header user={user} onLogout={onLogout} />

      <div className="conversations-content">
        <div className="conversations-page-header">
          <div>
            <div className="page-title-section">
              <div className="page-icon">💬</div>
              <div>
                <h1 className="page-title">All Conversations</h1>
                <p className="page-subtitle">
                  View leads, conversations, and contact details in one place.
                </p>
              </div>
            </div>
          </div>

          <div className="controls-actions">
            <button
              className="btn btn-download"
              onClick={() =>
                trackEvent("Conversations", "Download CSV", "Export leads")
              }
            >
              <span>📄</span>
              Download .csv
            </button>

            <button
              className="btn btn-actions"
              onClick={() =>
                trackEvent(
                  "Conversations",
                  "Actions Click",
                  "Opened actions menu"
                )
              }
            >
              Actions ▼
            </button>
          </div>
        </div>

        {loading ? (
          <div className="conversation-state-card">Loading leads...</div>
        ) : error ? (
          <div className="conversation-state-card error">
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className="btn btn-retry">
              Retry
            </button>
          </div>
        ) : (
          <div className="conversation-workspace">
            <aside className="conversation-list-panel">
              <div className="search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search leads and conversations"
                  value={searchQuery}
                  onChange={handleSearchChange}
                />
              </div>

              <div className="conversation-tabs">
                <button className="active">All</button>
                <button>Open</button>
                <button>Closed</button>
              </div>

              <div className="conversation-list">
                {filteredConversations.length === 0 ? (
                  <div className="empty-list">
                    {searchQuery ? "No leads match your search." : "No leads found."}
                  </div>
                ) : (
                  filteredConversations.map((lead) => {
                    const leadName = getLeadName(lead);
                    const initials = getInitials(leadName);
                    const color = getAvatarColor(lead);
                    const isActive = selectedLead?.id === lead.id;

                    return (
                      <button
                        key={lead.id}
                        className={`conversation-list-item ${isActive ? "active" : ""}`}
                        onClick={() => handleSelectLead(lead)}
                      >
                        <div className="lead-avatar" style={{ background: color }}>
                          {initials}
                        </div>

                        <div className="lead-preview">
                          <div className="lead-preview-top">
                            <strong>{leadName}</strong>
                            <span>{lead.created?.time || formatLocalTime(lead.createdAt)}</span>
                          </div>

                          <p>{lead.email || lead.phone || "No contact info"}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>
          
            
            <main className="conversation-chat-panel">
              {!selectedLead ? (
                <div className="empty-chat-state">
                  <h2>Select a conversation</h2>
                  <p>Choose a lead from the left to view messages.</p>
                </div>
              ) : (
                <>
                  <div className="chat-panel-header">
                    <div className="chat-lead-title">
                      <div
                        className="lead-avatar large"
                        style={{ background: getAvatarColor(selectedLead) }}
                      >
                        {selectedLeadInitials}
                      </div>

                      <div>
                        <h2>{selectedLeadName}</h2>
                        <p>
                          Lead · Created{" "}
                          {selectedLead.created?.date ||
                            formatLocalDate(selectedLead.createdAt)}
                          {" · "}
                          {selectedLead.created?.time ||
                            formatLocalTime(selectedLead.createdAt)}
                        </p>
                      </div>
                    </div>

                    <button className="view-profile-btn" onClick={handleOpenFullPage}>
                      View Full Page
                    </button>
                  </div>

                  <div className="chat-messages-area">
                    {messagesLoading ? (
                      <div className="conversation-state-card">Loading conversation...</div>
                    ) : messagesError ? (
                      <div className="conversation-state-card error">
                        {messagesError}
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="empty-chat-state">
                        <h2>No messages yet</h2>
                        <p>This lead does not have conversation history yet.</p>
                      </div>
                    ) : (
                      messages.map((message, index) => {
                        const isBot = message.sender === "bot";
                        const senderName = isBot ? "BOT" : selectedLeadName;
                        const messageInitials = isBot ? "BOT" : selectedLeadInitials;

                        return (
                          <div
                            key={message.id || index}
                            className={`message-row ${isBot ? "bot" : "user"}`}
                          >
                            <div
                              className="message-avatar"
                              style={{
                                background: isBot ? "#4f46e5" : getAvatarColor(selectedLead),
                              }}
                            >
                              {messageInitials}
                            </div>

                            <div className={`message-bubble ${isBot ? "bot" : "user"}`}>
                              <div className="message-meta">
                                <strong>{senderName}</strong>
                                <span>
                                  {formatLocalTime(
                                    message.timestamp || message.createdAt
                                  )}
                                </span>
                                {isBot && <em>BOT</em>}
                              </div>

                              <div className="message-text">
                                {renderMessageText(getMessageText(message))}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="chat-composer">
                    <div className="composer-actions">
                      <button type="button" onClick={handleAddNote}>
                        + Add Note
                      </button>
                    </div>

                    <div className="composer-row">
                      <textarea
                        placeholder="Type a message..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        rows={3}
                      />

                      <button type="button" onClick={handleAddNote}>
                        Send
                      </button>
                    </div>
                  </div>
                </>
              )}
            </main>

            <aside className="lead-details-panel">
              {!selectedLead ? (
                <div className="empty-details">No lead selected.</div>
              ) : (
                <>
                  <div className="lead-details-card">
                    <h3>Lead Details</h3>

                    <div className="details-group">
                      <span>Contact Information</span>

                      <label>Email</label>
                      <p>{selectedLead.email || "N/A"}</p>

                      <label>Phone</label>
                      <p>{selectedLead.phone || "N/A"}</p>
                    </div>

                    <div className="details-group">
                      <span>Community</span>
                      <p>{selectedLead.community || "N/A"}</p>
                    </div>

                    <div className="details-group">
                      <span>Lead Source</span>
                      <p>{selectedLead.source || "Website Chatbot"}</p>
                    </div>

                    <div className="details-group">
                      <span>Status</span>
                      <p>
                        <span className={`status-badge status-${selectedLead.status?.toLowerCase()}`}>
                          {selectedLead.status || "Open"}
                        </span>
                      </p>
                    </div>

                    <div className="details-group">
                      <span>Created</span>
                      <p>
                        {selectedLead.created?.date ||
                          formatLocalDate(selectedLead.createdAt)}
                        <br />
                        <small>
                          {selectedLead.created?.time ||
                            formatLocalTime(selectedLead.createdAt)}
                        </small>
                      </p>
                    </div>
                  </div>
                </>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
};

export default Conversations;