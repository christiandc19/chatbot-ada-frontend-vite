import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Conversations.css";
import Header from "./Header";
import apiService from "../services/apiService";
import { formatLocalDate, formatLocalTime } from "../utils/dateUtils";
import { trackEvent } from "../utils/analytics";

// Status options used by the custom status dropdown.
const statusOptions = [
  "New",
  "Attempted Contact",
  "Contacted",
  "Qualified",
  "Tour Scheduled",
  "Converted",
  "Closed",
];

const Conversations = ({ user, onLogout }) => {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchTimer, setSearchTimer] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [leadsPerPage, setLeadsPerPage] = useState(10); 

  // Tracks which lead's status dropdown is currently open.
  const [openStatusLeadId, setOpenStatusLeadId] = useState(null);

  // Controls whether the Actions dropdown is open or closed.
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // This points to the Actions dropdown container.
  // We use it to know if the user clicked inside or outside the dropdown.
  const actionsDropdownRef = useRef(null);

  // Controls whether the Add Lead modal is open or closed.
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);

  // Stores the form values typed into the Add Lead modal.
  const [newLead, setNewLead] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    source: "manual",
    clientKey: "web-smart-assistant",
    status: "New",
    notes: "",
  });

  // Tracks when the Create Lead button is submitting.
  const [creatingLead, setCreatingLead] = useState(false);

  // Stores any error from creating a manual lead.
  const [createLeadError, setCreateLeadError] = useState("");

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


  // This closes the Actions dropdown when clicking outside of it.
  useEffect(() => {
    const handleClickOutside = (event) => {
      // If the dropdown exists AND the clicked item is not inside it,
      // close the dropdown.
      if (
        actionsDropdownRef.current &&
        !actionsDropdownRef.current.contains(event.target)
      ) {
        setShowActionsMenu(false);
      }
    };

    // Listen for clicks anywhere on the page.
    document.addEventListener("mousedown", handleClickOutside);

    // Cleanup when component unmounts.
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
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


  // Updates one field in the Add Lead form.
  // Example: typing in First Name updates newLead.firstName.
  const handleNewLeadChange = (e) => {
    const { name, value } = e.target;

    setNewLead((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Resets the Add Lead form back to the default empty values.
  const resetNewLeadForm = () => {
    setNewLead({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      source: "manual",
      clientKey: "web-smart-assistant",
      status: "New",
      notes: "",
    });

    setCreateLeadError("");
  };

  // Sends the new lead to the backend, then refreshes the table.
  const handleCreateLead = async (e) => {
    e.preventDefault();

    setCreateLeadError("");

    // Basic beginner-friendly validation before calling the API.
    if (!newLead.firstName.trim() || !newLead.lastName.trim()) {
      setCreateLeadError("First name and last name are required.");
      return;
    }

    if (!newLead.email.trim() && !newLead.phone.trim()) {
      setCreateLeadError("Please add either an email or phone number.");
      return;
    }

    try {
      setCreatingLead(true);

      await apiService.createLead(newLead);

      // Reload leads after creating a new one.
      const updatedLeads = await apiService.getLeads();
      setConversations(updatedLeads);

      // Close and reset the modal after success.
      setShowAddLeadModal(false);
      resetNewLeadForm();

      trackEvent("Conversations", "Create Lead", "Manual lead created");
    } catch (err) {
      console.error("Create lead failed:", err);
      setCreateLeadError(err.message || "Failed to create lead.");
    } finally {
      setCreatingLead(false);
    }
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
            {/* 
              Status dropdown for each lead.
              If the lead does not have a status yet, we show "New" by default.
            */}
          <div className="status-menu-wrapper">
            <button
              type="button"
              className={`status-select status-${(conv.status || "New")
                .toLowerCase()
                .replace(/\s+/g, "-")}`}
              onClick={() =>
                setOpenStatusLeadId((prev) => (prev === conv.id ? null : conv.id))
              }
            >
              <span>{conv.status || "New"}</span>
              <span className="status-caret">⌄</span>
            </button>

            {openStatusLeadId === conv.id && (
              <div className="status-options-menu">
                {statusOptions.map((status) => (
                  <button
                    key={status}
                    type="button"
                    className="status-option"
                    onClick={() => {
                      setConversations((prevConversations) =>
                        prevConversations.map((lead) =>
                          lead.id === conv.id ? { ...lead, status } : lead
                        )
                      );

                      setOpenStatusLeadId(null);
                      trackEvent("Conversations", "Status Changed", status);
                    }}
                  >
                    <span
                      className={`status-dot status-dot-${status
                        .toLowerCase()
                        .replace(/\s+/g, "-")}`}
                    />
                    {status}
                  </button>
                ))}
              </div>
            )}
          </div>          

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
            {/* Opens the Add Lead modal */}
            <button
              className="btn btn-add-lead"
              onClick={() => {
                setShowAddLeadModal(true);
                trackEvent("Conversations", "Add Lead Click", "Opened modal");
              }}
            >
              <span>＋</span>
              Add Lead
            </button>

            <button
              className="btn btn-download"
              onClick={() =>
                trackEvent("Conversations", "Download CSV", "Export leads")
              }
            >
              <span>📄</span>
              Download .csv
            </button>

{/* Actions dropdown wrapper */}
    <div
      className="actions-dropdown"
      ref={actionsDropdownRef}
    >  <button
    type="button"
    className="btn btn-actions"
    onClick={() => {
      // Opens/closes the dropdown menu.
      setShowActionsMenu((prev) => !prev);

      trackEvent(
        "Conversations",
        "Actions Click",
        "Opened actions menu"
      );
    }}
  >
    Actions ▾
  </button>

  {/* Only show the menu when showActionsMenu is true */}
  {showActionsMenu && (
    <div className="actions-menu">
      <button
        type="button"
        onClick={() => {
          setShowActionsMenu(false);
          trackEvent("Conversations", "Export CSV", "Clicked");
        }}
      >
        <span>📄</span>
        Export CSV
      </button>

      <button
        type="button"
        onClick={() => {
          setShowActionsMenu(false);
          alert("Import Leads will be connected later.");
        }}
      >
        <span>⬆️</span>
        Import Leads
      </button>

      <div className="actions-divider" />

      <button
        type="button"
        onClick={() => {
          setShowActionsMenu(false);
          alert("Bulk mark as contacted will be connected later.");
        }}
      >
        <span>✅</span>
        Mark as Contacted
      </button>

      <button
        type="button"
        onClick={() => {
          setShowActionsMenu(false);
          alert("Assign Leads will be connected later.");
        }}
      >
        <span>👤</span>
        Assign Leads
      </button>

      <button
        type="button"
        onClick={() => {
          setShowActionsMenu(false);
          alert("Archive Leads will be connected later.");
        }}
      >
        <span>🗄️</span>
        Archive Leads
      </button>

      <button
        type="button"
        className="danger-action"
        onClick={() => {
          setShowActionsMenu(false);
          alert("Bulk Delete will be connected later.");
        }}
      >
        <span>🗑️</span>
        Bulk Delete
      </button>
    </div>
  )}
</div>



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

      {/* Add Lead Modal */}
      {/* This only appears when showAddLeadModal is true. */}
      {showAddLeadModal && (
        <div className="add-lead-overlay">
          <div className="add-lead-modal">
            <div className="add-lead-header">
              <div>
                <span className="add-lead-kicker">Manual Entry</span>
                <h2>Add A Lead</h2>
                <p>Create a new lead directly from the dashboard.</p>
              </div>

              <button
                type="button"
                className="add-lead-close"
                onClick={() => {
                  setShowAddLeadModal(false);
                  resetNewLeadForm();
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="add-lead-form">
              {createLeadError && (
                <div className="add-lead-error">{createLeadError}</div>
              )}

              <div className="add-lead-grid">
                <label>
                  First Name
                  <input
                    name="firstName"
                    value={newLead.firstName}
                    onChange={handleNewLeadChange}
                    placeholder="John"
                  />
                </label>

                <label>
                  Last Name
                  <input
                    name="lastName"
                    value={newLead.lastName}
                    onChange={handleNewLeadChange}
                    placeholder="Smith"
                  />
                </label>
              </div>

              <div className="add-lead-grid">
                <label>
                  Email
                  <input
                    name="email"
                    type="email"
                    value={newLead.email}
                    onChange={handleNewLeadChange}
                    placeholder="john@example.com"
                  />
                </label>

                <label>
                  Phone
                  <input
                    name="phone"
                    value={newLead.phone}
                    onChange={handleNewLeadChange}
                    placeholder="555-555-5555"
                  />
                </label>
              </div>

              <div className="add-lead-grid">
                <label>
                  Source
                  <select
                    name="source"
                    value={newLead.source}
                    onChange={handleNewLeadChange}
                  >
                    <option value="manual">Manual Lead</option>
                    <option value="phone-call">Phone Call</option>
                    <option value="walk-in">Walk-in</option>
                    <option value="referral">Referral</option>
                    <option value="chatbot">Chatbot</option>
                    <option value="webform">Webform</option>
                    <option value="survey">Survey</option>
                  </select>
                </label>

                <label>
                  Status
                  <select
                    name="status"
                    value={newLead.status}
                    onChange={handleNewLeadChange}
                  >
                    <option value="New">New</option>
                    <option value="Pending">Pending</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Closed">Closed</option>
                  </select>
                </label>
              </div>

              <label>
                Client Key
                <input
                  name="clientKey"
                  value={newLead.clientKey}
                  onChange={handleNewLeadChange}
                  placeholder="web-smart-assistant"
                />
              </label>

              <label>
                Notes
                <textarea
                  name="notes"
                  value={newLead.notes}
                  onChange={handleNewLeadChange}
                  placeholder="Example: Called asking about assisted living pricing."
                  rows="4"
                />
              </label>

              <div className="add-lead-actions">
                <button
                  type="button"
                  className="btn btn-actions"
                  onClick={() => {
                    setShowAddLeadModal(false);
                    resetNewLeadForm();
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-add-lead"
                  disabled={creatingLead}
                >
                  {creatingLead ? "Creating..." : "Create Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Conversations;
