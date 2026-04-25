import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Conversations.css";
import "./ConversationsExtra.css";
import Header from "./Header";
import apiService from "../services/apiService";
import { formatLocalDate, formatLocalTime } from "../utils/dateUtils";
import { trackEvent } from "../utils/analytics";

const Conversations = ({ user, onLogout }) => {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchTimer, setSearchTimer] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    trackEvent("Conversations", "Page View", "Conversations Page");

    const fetchConversations = async (isPolling = false) => {
      try {
        if (!isPolling) {
          setLoading(true);
        }

        const data = await apiService.getLeads();

        setConversations((prevConversations) => {
          const prevIds = Array.isArray(prevConversations)
            ? prevConversations.map((c) => c.id).sort().join(",")
            : "";

          const newIds = Array.isArray(data)
            ? data.map((c) => c.id).sort().join(",")
            : "";

          if (prevIds !== newIds) {
            return data;
          }

          return prevConversations;
        });

        if (!isPolling) {
          trackEvent("Conversations", "Leads Loaded", "Fetch success");
        }

        setError(null);
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
        if (!isPolling) {
          setLoading(false);
        }
      }
    };

    fetchConversations(false);

    const pollingInterval = setInterval(() => {
      fetchConversations(true);
    }, 5000);

    return () => {
      clearInterval(pollingInterval);
    };
  }, []);

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

  const filteredConversations = Array.isArray(conversations)
    ? conversations.filter((conv) => {
        if (!conv || !searchQuery) return true;

        const query = searchQuery.toLowerCase();

        const leadName = `${conv.firstName || ""} ${
          conv.lastName || ""
        }`.trim();

        const lead = leadName.toLowerCase();
        const leadEmail = conv.email ? String(conv.email).toLowerCase() : "";
        const leadPhone = conv.phone ? String(conv.phone).toLowerCase() : "";

        return (
          lead.includes(query) ||
          leadEmail.includes(query) ||
          leadPhone.includes(query)
        );
      })
    : [];

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
              onChange={handleSearchChange}
            />
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
                      {searchQuery
                        ? "No leads match your search."
                        : "No leads found."}
                    </td>
                  </tr>
                ) : (
                  filteredConversations.map((conv) => {
                    const leadName =
                      `${conv.firstName || ""} ${
                        conv.lastName || ""
                      }`.trim() || "Unknown";

                    const initials =
                      conv.initials ||
                      (leadName
                        ? leadName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                        : "?");

                    const color =
                      conv.color ||
                      `hsl(${((conv.id || 0) * 137.508) % 360}, 70%, 60%)`;

                    const handleLeadClick = () => {
                      trackEvent(
                        "Conversations",
                        "Viewed Lead",
                        "Lead opened"
                      );

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
                          <div className="contact-phone">
                            {conv.phone || "N/A"}
                          </div>
                          <div className="contact-email">
                            {conv.email || "N/A"}
                          </div>
                        </td>

                        <td>{conv.community}</td>

                        <td>
                          <span className="source-badge">
                            - <br />
                            {conv.source}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`status-badge status-${conv.status?.toLowerCase()}`}
                          >
                            {conv.status}
                          </span>
                        </td>

                        <td className="created-cell">
                          <span className="created-date">
                            {conv.created?.date ||
                              formatLocalDate(conv.createdAt)}
                          </span>
                          <span className="created-time">
                            {conv.created?.time ||
                              formatLocalTime(conv.createdAt)}
                          </span>
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