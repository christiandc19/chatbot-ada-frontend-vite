import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./ChatHistory.css";
import Header from "./Header";
import apiService from "../services/apiService";
import { formatLocalTime, formatBubbleDateText } from "../utils/dateUtils";

const ChatHistory = ({ user, onLogout }) => {
  const { leadId } = useParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [leadName, setLeadName] = useState("");
  const [communityName, setCommunityName] = useState("");
  const [newNote, setNewNote] = useState("");

  useEffect(() => {
    const fetchConversations = async (isPolling = false) => {
      try {
        if (!isPolling) setLoading(true);

        const data = await apiService.getConversationsByLead(leadId);

        if (!isPolling) {
          if (data.firstName || data.lastName) {
            setLeadName(`${data.firstName || ""} ${data.lastName || ""}`.trim());
          }

          if (data.community) {
            setCommunityName(data.community.name || data.community);
          }
        }

        const conversationsArray = data.conversations || data.messages || [];

        const sortedConversations = conversationsArray.sort((a, b) => {
          return new Date(a.createdAt) - new Date(b.createdAt);
        });

        setMessages(sortedConversations);
        setError(null);
      } catch (err) {
        console.error("Error fetching conversations:", err);

        let errorMessage = "Failed to load conversation history. ";

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
      } finally {
        if (!isPolling) setLoading(false);
      }
    };

    if (leadId) {
      fetchConversations(false);

      const pollingInterval = setInterval(() => {
        fetchConversations(true);
      }, 5000);

      return () => clearInterval(pollingInterval);
    }
  }, [leadId]);

  const handleBackToConversations = () => {
    navigate("/conversations");
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;

    console.log("Adding note:", newNote);
    setNewNote("");
  };

  const getInitials = (name) => {
    if (!name || !name.trim()) return "U";

    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const formatMessageText = (text) => {
    if (!text) return "";

    const cleanText = formatBubbleDateText(text);

    return cleanText.split("\n").map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < cleanText.split("\n").length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <div className="chat-history-container">
      <Header user={user} onLogout={onLogout} />

      <div className="chat-content">
        <div className="chat-header">
          <div className="breadcrumb">
            <button className="breadcrumb-link" onClick={handleBackToConversations}>
              ALL CONVERSATIONS
            </button>

            <span className="breadcrumb-separator">›</span>

            <span className="breadcrumb-current">
              {(leadName || "Lead").toUpperCase()}{" "}
              {communityName ? `(${communityName.toUpperCase()})` : ""}
            </span>
          </div>

          <h1 className="chat-title">{leadName || "Conversation"}</h1>
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
                  const isBot = message.sender === "bot";
                  const senderName = isBot ? "BOT" : leadName;
                  const initials = isBot ? "BOT" : getInitials(leadName);
                  const avatarColor = isBot ? "#4f46e5" : "#64748b";
                  const messageText =
                    message.message || message.content || message.text || "";

                  return (
                    <div
                      key={message.id || index}
                      className={`message-wrapper ${
                        isBot ? "message-wrapper-bot" : "message-wrapper-user"
                      }`}
                    >
                      <div
                        className="message-avatar"
                        style={{ backgroundColor: avatarColor }}
                      >
                        {initials}
                      </div>

                      <div
                        className={`message-bubble ${
                          isBot ? "message-bubble-bot" : "message-bubble-user"
                        }`}
                      >
                        <div className="message-header">
                          <span className="message-sender">{senderName}</span>
                          <span className="message-time">
                            {formatLocalTime(message.timestamp || message.createdAt)}
                          </span>
                          {isBot && <span className="bot-badge">BOT</span>}
                        </div>

                        <div className="message-text">
                          {formatMessageText(messageText)}
                        </div>
                      </div>
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