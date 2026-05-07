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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [leadsPerPage, setLeadsPerPage] = useState(10);  

  const getLeadSource = (conv) => {
    const rawSource = conv.source || conv.leadSource || "";

    if (!rawSource || rawSource.trim() === "") {
      return "Chatbot";
    }

    const normalizedSource = rawSource.toLowerCase();

    if (normalizedSource.includes("webform")) return "Webform";
    if (normalizedSource.includes("survey")) return "Survey Form";
    if (normalizedSource.includes("chatbot")) return "Chatbot";

    return rawSource;
  };

  const getSourceClass = (source) => {
    return `source-badge source-${source.toLowerCase().replace(/\s+/g, "-")}`;
  };

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
    setCurrentPage(1);

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


    const totalPages = Math.ceil(filteredConversations.length / leadsPerPage);

    const startIndex = (currentPage - 1) * leadsPerPage;
    const endIndex = startIndex + leadsPerPage;

    const paginatedConversations = filteredConversations.slice(
      startIndex,
      endIndex
    );


  const today = new Date();

const isThisWeek = (date) => {
  if (!date) return false;

  const createdDate = new Date(date);

  const weekAgo = new Date();
  weekAgo.setDate(today.getDate() - 7);

  return createdDate >= weekAgo;
};

const weeklyLeads = conversations.filter((conv) =>
  isThisWeek(conv.createdAt)
);

const weeklyWebformLeads = conversations.filter(
  (conv) =>
    getLeadSource(conv) === "Webform" &&
    isThisWeek(conv.createdAt)
);

const weeklyChatbotLeads = conversations.filter(
  (conv) =>
    getLeadSource(conv) === "Chatbot" &&
    isThisWeek(conv.createdAt)
);

const weeklySurveyLeads = conversations.filter(
  (conv) =>
    getLeadSource(conv) === "Survey Form" &&
    isThisWeek(conv.createdAt)
);


  const leadStats = {
    total: Array.isArray(conversations) ? conversations.length : 0,
    webform: Array.isArray(conversations)
      ? conversations.filter((conv) => getLeadSource(conv) === "Webform").length
      : 0,
    chatbot: Array.isArray(conversations)
      ? conversations.filter((conv) => getLeadSource(conv) === "Chatbot").length
      : 0,
    survey: Array.isArray(conversations)
      ? conversations.filter((conv) => getLeadSource(conv) === "Survey Form").length
      : 0,
  };

  const renderLeadRows = () => {
    if (filteredConversations.length === 0) {
      return (
        <tr>
          <td colSpan="6" className="no-data">
            {searchQuery ? "No leads match your search." : "No leads found."}
          </td>
        </tr>
      );
    }

      return paginatedConversations.map((conv) => {
      const leadName =
        `${conv.firstName || ""} ${conv.lastName || ""}`.trim() || "Unknown";

      const leadSource = getLeadSource(conv);

      const initials =
        conv.initials ||
        leadName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase();

      const handleLeadClick = () => {
        trackEvent("Conversations", "Viewed Lead", "Lead opened");

        if (conv.id) {
          navigate(`/conversations/${conv.id}`);
        }
      };

      return (
        <tr key={conv.id}>
          <td>
            <div className="lead-cell">
              <div className="lead-avatar">{initials}</div>

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
            <div>{conv.phone || "N/A"}</div>
            <div className="contact-email">{conv.email || "N/A"}</div>
          </td>

          <td>{conv.community || "N/A"}</td>

          <td>
            <span className={getSourceClass(leadSource)}>{leadSource}</span>
          </td>

          <td>
            <span className={`status-badge status-${conv.status?.toLowerCase()}`}>
              {conv.status || "-"}
            </span>
          </td>

          <td className="created-cell">
            <span>{conv.created?.date || formatLocalDate(conv.createdAt)}</span>
            <span className="created-time">
              {conv.created?.time || formatLocalTime(conv.createdAt)}
            </span>
          </td>
        </tr>
      );
    });
  };


  return (
    <div className="conversations-container">
      <Header user={user} onLogout={onLogout} />

      <div className="conversations-content">
        <div className="page-title-section">
          <div>
            <div className="page-kicker">Lead Inbox</div>
            <h1 className="page-title">All Conversations</h1>
            <p className="page-subtitle">
              Review leads from chat, webforms, and surveys in one place.
            </p>
          </div>
        </div>

        <div className="stats-grid">

        <div className="stat-card">
          <span className="stat-label">Total Leads</span>
          <strong>{leadStats.total}</strong>
          <span className="stat-trend">
            +{weeklyLeads.length} this week
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Webform Leads</span>
          <strong>{leadStats.webform}</strong>
          <span className="stat-trend">
            +{weeklyWebformLeads.length} this week
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Chatbot Leads</span>
          <strong>{leadStats.chatbot}</strong>
          <span className="stat-trend">
            +{weeklyChatbotLeads.length} this week
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Survey Leads</span>
          <strong>{leadStats.survey}</strong>
          <span className="stat-trend">
            +{weeklySurveyLeads.length} this week
          </span>
        </div>
          
        </div>

        <div className="conversations-toolbar">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search leads by name, email, or phone"
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
  <>
    <table>
      <thead>
        <tr>
          <th>LEAD</th>
          <th>CONTACT</th>
          <th>COMMUNITY</th>
          <th>SOURCE</th>
          <th>STATUS</th>
          <th>CREATED</th>
        </tr>
      </thead>

      <tbody>{renderLeadRows()}</tbody>
    </table>

    <div className="pagination-bar">
      <div className="pagination-size">
        <span>Rows per page</span>

        <select
          value={leadsPerPage}
          onChange={(e) => {
            setLeadsPerPage(Number(e.target.value));
            setCurrentPage(1);
          }}
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
      </div>

      <div className="pagination-controls">
        <span>
          Page {currentPage} of {totalPages || 1}
        </span>

        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((prev) => prev - 1)}
        >
          Previous
        </button>

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => setCurrentPage((prev) => prev + 1)}
        >
          Next
        </button>
      </div>
    </div>
  </>
)}

        </div>
      </div>
    </div>
  );
};

export default Conversations;
