import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Conversations.css";
import Header from "./Header";
import apiService from "../services/apiService";
import { formatLocalDate, formatLocalTime } from "../utils/dateUtils";
import { trackEvent } from "../utils/analytics";
import { useNotification } from "../contexts/NotificationContext";

const Conversations = ({ user, onLogout }) => {
  const navigate = useNavigate();

  // Search, pagination, and lead list state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTimer, setSearchTimer] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [leadsPerPage, setLeadsPerPage] = useState(10);
  // Stores which field the user wants to filter/search by.
  // Default is "all", meaning the search checks name, email, and phone.
  // Controls the dropdown filter beside the search box.
  // Example values: all, source:survey form, source:webform, community:none
  const [leadFilter, setLeadFilter] = useState("all");

  // NEW: Controls which community/client leads are shown.
  // "all" means show leads from every community.
  const [selectedCommunity, setSelectedCommunity] = useState("all");

  // NEW: Stores the community options shown in the dropdown.
  const [communities, setCommunities] = useState([]);  

  // Notification and polling helpers
  const { showNotification } = useNotification();

  // Stores the lead IDs we already know about.
  // This helps us detect if a new lead was added later.
  const knownLeadIdsRef = useRef(new Set());

  // Prevents notification spam when the page first loads.
  // We only want alerts AFTER the first load.
  const hasLoadedLeadsOnceRef = useRef(false);

  // Toolbar and Add Lead modal state
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Controls the Filter dropdown menu.
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // This points to the Actions dropdown container.
  // We use it to know if the user clicked inside or outside the dropdown.
  const actionsDropdownRef = useRef(null);

  // Used to detect outside clicks for the Filter dropdown.
  const filterDropdownRef = useRef(null);

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

  // Creates the label used in the notification popup.
  // Example: Webform, Survey, Chat
  const getLeadNotificationSource = (lead) => {
    const source = (lead.source || lead.leadSource || "").toLowerCase();

    if (source.includes("webform")) return "Webform";
    if (source.includes("survey")) return "Survey";
    if (source.includes("chat") || source.includes("chatbot")) return "Chat";

    // Your current dashboard treats empty source as Chatbot.
    return "Chat";
  };



  // NEW: Converts a saved clientKey into a readable community name.
  // Example: "evergreen-heights" becomes "Evergreen Heights".
  // This lets us use clientKey as the real database value,
  // while showing a nice name in the dashboard table.
  const formatCommunityName = (clientKey) => {
    // If the lead has no clientKey yet, show N/A.
    if (!clientKey) return "N/A";

    // Custom display names for known communities.
    const communityNames = {
      "evergreen-heights": "Evergreen Heights",
      "asbury-heights": "Asbury Heights",
      "robin-run": "Robin Run",
      "web-smart-assistant": "Web Smart Assistant",
    };

    // If the clientKey exists in the list above, use that name.
    if (communityNames[clientKey]) {
      return communityNames[clientKey];
    }

    // Fallback:
    // If a new clientKey is not listed above,
    // convert "sample-community" into "Sample Community".
    return clientKey
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };


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


  // Returns the saved lead status from the backend.
  // Defaults to "New Lead" when older leads do not have a status yet.
  const getLeadStatus = (lead) => {
    return lead?.status || lead?.Status || "New Lead";
  };

  // Creates a CSS class for each status badge.
  // Example: "Tour Scheduled" becomes "status-tour-scheduled".
  const getStatusClass = (status) => {
    return `lead-status-badge status-${String(status)
      .toLowerCase()
      .replace(/\s+/g, "-")}`;
  };


  // Load leads and poll for new leads so the dashboard stays fresh.
  useEffect(() => {
    trackEvent("Conversations", "Page View", "Conversations Page");

    const fetchConversations = async (isPolling = false) => {
      try {
        if (!isPolling) {
          setLoading(true);
        }

        const data = await apiService.getLeads();

        // NEW: Load communities from the database so the dropdown is dynamic.
        const communitiesData = await apiService.getCommunities();

        // NEW: Convert community website URLs into client keys.
        // Example: https://asburyheights.org → asbury-heights
        const formattedCommunities = communitiesData
          .map((community) => {
            if (!community.urlAddress) return null;

            return community.urlAddress
              .replace(/^https?:\/\//, "")
              .replace(/^www\./, "")
              .split(".")[0]
              .toLowerCase()
              .replace("asburyheights", "asbury-heights");
          })
          .filter(Boolean);

        // NEW: Remove duplicates before saving dropdown options.
        setCommunities([...new Set(formattedCommunities)]);


                // Create a Set of the current lead IDs.
        // This helps us compare old leads vs new leads.
        const currentLeadIds = new Set(
          Array.isArray(data)
            ? data.map((lead) => lead.id).filter(Boolean)
            : []
        );

        // Find leads that did NOT exist before.
        const newLeads = Array.isArray(data)
          ? data.filter(
              (lead) =>
                lead?.id &&
                !knownLeadIdsRef.current.has(lead.id)
            )
          : [];

        // IMPORTANT:
        // Skip notifications on the FIRST load.
        // Otherwise every old lead would trigger alerts.
        if (hasLoadedLeadsOnceRef.current && newLeads.length > 0) {

          // Loop through all newly detected leads.
          newLeads.forEach((lead) => {

            // Build lead name safely.
            const leadName =
              `${lead.firstName || ""} ${lead.lastName || ""}`.trim() ||
              "New Lead";

            // Detect source type.
            const sourceLabel = getLeadNotificationSource(lead);

            // Show notification popup.
            showNotification(
              `New ${sourceLabel} lead received: ${leadName}`,
              "success",
              5000
            );
          });
        }

        // Save the latest lead IDs for the NEXT polling cycle.
        knownLeadIdsRef.current = currentLeadIds;

        // Marks the first load as complete.
        hasLoadedLeadsOnceRef.current = true;

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
  }, [selectedCommunity]);


  // This closes the Actions dropdown when clicking outside of it.
  useEffect(() => {
    const handleClickOutside = (event) => {
      // If the dropdown exists AND the clicked item is not inside it,
      // close the dropdown.
      // Close Actions dropdown if clicked outside.
      if (
        actionsDropdownRef.current &&
        !actionsDropdownRef.current.contains(event.target)
      ) {
        setShowActionsMenu(false);
      }

      // Close Filter dropdown if clicked outside.
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target)
      ) {
        setShowFilterMenu(false);
      }
    };

    // Listen for clicks anywhere on the page.
    document.addEventListener("mousedown", handleClickOutside);

    // Cleanup when component unmounts.
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);



  // Debounced search analytics and filter reset.
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

// Filter, search, paginate, and summarize leads for the table.
// Search and dropdown filter now work together.
const filteredConversations = Array.isArray(conversations)
  ? conversations.filter((conv) => {
      if (!conv) return false;

    // NEW: Community/client filter.
    // If "all" is selected, show every lead.
    // Otherwise, only show leads that match the selected clientKey.
    const leadClientKey = String(conv.clientKey || "").toLowerCase();

    const matchesSelectedCommunity =
      selectedCommunity === "all" || leadClientKey === selectedCommunity;

if (!matchesSelectedCommunity) return false;

      const query = searchQuery.trim().toLowerCase();

      const leadName = `${conv.firstName || ""} ${
        conv.lastName || ""
      }`.trim();

      const lead = leadName.toLowerCase();
      const leadEmail = conv.email ? String(conv.email).toLowerCase() : "";
      const leadPhone = conv.phone ? String(conv.phone).toLowerCase() : "";
      const leadSource = getLeadSource(conv).toLowerCase();

      const leadCommunity = conv.community
        ? String(conv.community).toLowerCase()
        : "";

      const leadCreatedDate = conv.createdAt
        ? formatLocalDate(conv.createdAt).toLowerCase()
        : "";

      // Search works across the main fields.
      const matchesSearch =
        !query ||
        lead.includes(query) ||
        leadEmail.includes(query) ||
        leadPhone.includes(query) ||
        leadSource.includes(query) ||
        leadCommunity.includes(query) ||
        leadCreatedDate.includes(query);

      // Dropdown filter works even when search is empty.
      let matchesFilter = true;

      if (leadFilter.startsWith("source:")) {
        const selectedSource = leadFilter.replace("source:", "");
        matchesFilter = leadSource === selectedSource;
      }

      if (leadFilter === "community:has") {
        matchesFilter = leadCommunity && leadCommunity !== "n/a";
      }

      if (leadFilter === "community:none") {
        matchesFilter = !leadCommunity || leadCommunity === "n/a";
      }

      if (leadFilter === "created:this-week") {
        matchesFilter = isThisWeek(conv.createdAt);
      }

      return matchesSearch && matchesFilter;
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


  // Renders the lead rows in the table.
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

          {/* 
            NEW:
            Display the readable community name using clientKey.
            Example:
            "evergreen-heights" → "Evergreen Heights"
          */}
          <td>{formatCommunityName(conv.clientKey)}</td>

            <td>
              <span className={getSourceClass(leadSource)}>{leadSource}</span>
            </td>

            <td>
              <span className={getStatusClass(getLeadStatus(conv))}>
                {getLeadStatus(conv)}
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
          <div className="toolbar-left">

          {/* NEW: Community filter dropdown */}
          <select
            className="community-filter-dropdown"
            value={selectedCommunity}
            onChange={(e) => {
              setSelectedCommunity(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Communities</option>

            {communities.map((community) => (
              <option key={community} value={community}>
                {community}
              </option>
            ))}
          </select>              


            {/* Search box */}
            <div className="search-box">
              <span className="search-icon">🔍</span>

              <input
                type="text"
                placeholder="Search leads by name, email, phone, source, or community"
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>

            {/* Filter dropdown */}
          {/* Premium Filter Dropdown */}
          <div
            className="actions-dropdown filter-dropdown"
            ref={filterDropdownRef}
          >
            <button
              type="button"
              className="btn btn-filter"
              onClick={() => {
                setShowFilterMenu((prev) => !prev);
              }}
            >
              {leadFilter === "all" && "All Leads"}
              {leadFilter === "source:survey form" && "Survey Form"}
              {leadFilter === "source:webform" && "Webform"}
              {leadFilter === "source:chatbot" && "Chatbot"}
              {leadFilter === "source:manual" && "Manual Lead"}
              {leadFilter === "community:has" && "Has Community"}
              {leadFilter === "community:none" && "No Community"}
              {leadFilter === "created:this-week" && "This Week"}

              <span className="filter-caret">▾</span>
            </button>

            {showFilterMenu && (
              <div className="actions-menu filter-menu">

                <button
                  type="button"
                  onClick={() => {
                    setLeadFilter("all");
                    setShowFilterMenu(false);
                  }}
                >
                  All Leads
                </button>

                <div className="actions-divider" />

                <button
                  type="button"
                  onClick={() => {
                    setLeadFilter("source:survey form");
                    setShowFilterMenu(false);
                  }}
                >
                  Survey Form
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLeadFilter("source:webform");
                    setShowFilterMenu(false);
                  }}
                >
                  Webform
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLeadFilter("source:chatbot");
                    setShowFilterMenu(false);
                  }}
                >
                  Chatbot
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLeadFilter("source:manual");
                    setShowFilterMenu(false);
                  }}
                >
                  Manual Lead
                </button>

                <div className="actions-divider" />

                <button
                  type="button"
                  onClick={() => {
                    setLeadFilter("community:has");
                    setShowFilterMenu(false);
                  }}
                >
                  Has Community
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLeadFilter("community:none");
                    setShowFilterMenu(false);
                  }}
                >
                  No Community
                </button>

                <div className="actions-divider" />

                <button
                  type="button"
                  onClick={() => {
                    setLeadFilter("created:this-week");
                    setShowFilterMenu(false);
                  }}
                >
                  Created This Week
                </button>

              </div>
            )}
          </div>


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
