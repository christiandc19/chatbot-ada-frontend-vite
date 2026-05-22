import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import "./ChatHistory.css";
import Header from "./Header";
import apiService from "../services/apiService";
import { formatLocalTime } from "../utils/dateUtils";

// New: options used by the custom Priority dropdown
const priorityOptions = ["Low", "Medium", "High", "Urgent"];

const ChatHistory = ({ user, onLogout }) => {
  const { leadId } = useParams();
  const navigate = useNavigate();

  // Core lead data
  const [messages, setMessages] = useState([]);
  const [leadDetails, setLeadDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [leadName, setLeadName] = useState("");
  const [communityName, setCommunityName] = useState("");
  const [newNote, setNewNote] = useState("");
  const [notes, setNotes] = useState([]);
  const [activeTab, setActiveTab] = useState("notes");

  // New: stores dashboard users for the "Assigned To" dropdown
  const [users, setUsers] = useState([]);

  // Stores the list of available lead statuses fetched from the API.
  const [leadStatuses, setLeadStatuses] = useState([]);


// =========================================
// Lead Overview Draft State
// Stores unsaved Lead Overview changes locally
// until the user clicks Save Changes.
// =========================================
  const [leadOverviewDraft, setLeadOverviewDraft] = useState({
  leadStatusId: "",
  assignedUserId: "",
  priority: "Medium",
});

// Tracks if the user changed anything
// so we can enable/disable the Save button.
const [hasOverviewChanges, setHasOverviewChanges] = useState(false);

// Shows saving state on the button
const [isSavingOverview, setIsSavingOverview] = useState(false);


  // New: controls whether the custom Priority dropdown menu is open
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);

  // Status dropdown state
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [statusMenuPosition, setStatusMenuPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  const statusButtonRef = useRef(null);

  // New: used to detect clicks outside the Priority dropdown
  const priorityMenuRef = useRef(null);

  const firstName = leadDetails?.firstName || "N/A";
  const lastName = leadDetails?.lastName || "N/A";

  const [notesLoading, setNotesLoading] = useState(false);

  // Load notes for this lead from the backend.
  useEffect(() => {
    if (!leadId) return;

    const fetchNotes = async () => {
      try {
        setNotesLoading(true);
        const data = await apiService.getNotesByLead(leadId);
        setNotes(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load notes:", err);
      } finally {
        setNotesLoading(false);
      }
    };

    fetchNotes();
  }, [leadId]);

  // Close the status dropdown when the user clicks outside of it.
  useEffect(() => {
      const handleClickOutsideStatusMenu = (event) => {
      const clickedStatusButton = statusButtonRef.current?.contains(event.target);
      const clickedStatusMenu = event.target.closest(".status-options-menu");

      if (!clickedStatusButton && !clickedStatusMenu) {
        setShowStatusMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutsideStatusMenu);

    return () => {
      document.removeEventListener("mousedown", handleClickOutsideStatusMenu);
    };
  }, []);


      // =========================================
      // Closes Priority dropdown when clicking
      // anywhere outside the menu
      // =========================================
      useEffect(() => {

        const handleClickOutsidePriorityMenu = (event) => {

          // If user clicked OUTSIDE the priority dropdown,
          // close the menu.
          if (
            priorityMenuRef.current &&
            !priorityMenuRef.current.contains(event.target)
          ) {
            setShowPriorityMenu(false);
          }
        };

        // Listen for clicks on the page
        document.addEventListener(
          "mousedown",
          handleClickOutsidePriorityMenu
        );

        // Cleanup when component unmounts
        return () => {
          document.removeEventListener(
            "mousedown",
            handleClickOutsidePriorityMenu
          );
        };

      }, []);

  // New: loads dashboard users for the "Assigned To" dropdown
    useEffect(() => {
      const fetchUsers = async () => {
        try {
          const data = await apiService.getUsers();
          setUsers(Array.isArray(data) ? data : []);
        } catch (error) {
          console.error("Failed to load users:", error);
          setUsers([]);
        }
      };

      const fetchLeadStatuses = async () => {
        try {
          const statuses = await apiService.getLeadStatuses();
          setLeadStatuses(Array.isArray(statuses) ? statuses : []);
        } catch (err) {
          console.error("Failed to load lead statuses:", err);
          setLeadStatuses([{ id: -1, Name: `Error: ${err.message}` }]);
        }
      };

      fetchUsers();
      fetchLeadStatuses();
    }, []);

  // Load this lead and refresh messages every few seconds.
  useEffect(() => {
    const fetchConversations = async (isPolling = false) => {
      try {
        if (!isPolling) setLoading(true);

        const data = await apiService.getConversationsByLead(leadId);


        if (!isPolling) {
          setLeadDetails(data);

          const fullName = `${data.firstName || ""} ${data.lastName || ""}`.trim();
          setLeadName(fullName || "Unknown Lead");

          if (data.community) {
            setCommunityName(data.community.name || data.community);
          }
        }

        const conversationsArray = data.conversations || data.messages || [];

        const sortedConversations = conversationsArray.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );

        setMessages(sortedConversations);
        setError(null);
      } catch (err) {
        console.error("Error fetching conversations:", err);
        setError("Failed to load lead details. Please try again.");
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

  // Navigate back to the main conversations list.
  const handleBackToConversations = () => {
    navigate("/conversations");
  };

  const [isAddingNote, setIsAddingNote] = useState(false);

  // Add an internal note by calling the backend API.
  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      setIsAddingNote(true);

      const created = await apiService.createNote({
        message: newNote.trim(),
        createdBy: user?.id,
        leadsId: Number(leadId),
      });

      setNotes((prev) => [created, ...prev]);
      setNewNote("");
      setActiveTab("notes");
    } catch (err) {
      console.error("Failed to add note:", err);
      alert("Failed to save note. Please try again.");
    } finally {
      setIsAddingNote(false);
    }
  };

  // Position and open/close the custom status dropdown.
  const handleStatusMenuToggle = () => {
    if (statusButtonRef.current) {
      const rect = statusButtonRef.current.getBoundingClientRect();

      setStatusMenuPosition({
        top: rect.bottom + 8,
        left: rect.right - 210,
        width: 210,
      });
    }

    setShowStatusMenu((prev) => !prev);
  };



  // NEW:
  // Converts clientKey into a readable community name.
  // Example: "evergreen-heights" → "Evergreen Heights"
  const formatCommunityName = (clientKey) => {
    if (!clientKey) return "—";

    const communityNames = {
      "evergreen-heights": "Evergreen Heights",
      "asbury-heights": "Asbury Heights",
      "robin-run": "Robin Run",
      "web-smart-assistant": "Web Smart Assistant",
    };

    if (communityNames[clientKey]) {
      return communityNames[clientKey];
    }

    return clientKey
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };



  // Updates the Status dropdown locally only.
  // Nothing is saved to the backend until the user clicks Save Changes.
  const handleStatusChange = (statusId) => {
    setLeadOverviewDraft((prev) => ({
      ...prev,
      leadStatusId: statusId,
    }));

    setHasOverviewChanges(true);
    setShowStatusMenu(false);
  };

  // Saves all Lead Overview fields together:
  // Status + Assigned To + Priority.
  const handleSaveLeadOverview = async () => {
    try {
      setIsSavingOverview(true);

      await apiService.updateLead(leadId, {
        Email: leadDetails?.email || "",
        FirstName: leadDetails?.firstName || "",
        LastName: leadDetails?.lastName || "",
        Phone: leadDetails?.phone || "",

        // Editable Lead Overview fields.
        LeadStatusId: leadOverviewDraft.leadStatusId ? Number.parseInt(leadOverviewDraft.leadStatusId, 10) : null,
        AssignedUserId: leadOverviewDraft.assignedUserId || null,
        Priority: leadOverviewDraft.priority,
      });

      // Keep this page updated after a successful save.
      setLeadDetails((prev) => ({
        ...(prev || {}),
        leadStatusId: leadOverviewDraft.leadStatusId,
        assignedUserId: leadOverviewDraft.assignedUserId,
        priority: leadOverviewDraft.priority,
      }));

      setHasOverviewChanges(false);
    } catch (err) {
      console.error("Failed to save lead overview:", err);
      alert("Failed to save lead overview. Please try again.");
    } finally {
      setIsSavingOverview(false);
    }
  };

  // Derived values used by the lead detail UI.
  const latestMessage =
    messages.find((message) => message.sender !== "bot") || messages[0];

  const rawMessage =
    latestMessage?.message || latestMessage?.content || latestMessage?.text || "";

  const getValueFromMessage = (label) => {
    const line = rawMessage
      .split("\n")
      .find((item) => item.toLowerCase().startsWith(label.toLowerCase()));

    return line ? line.replace(label, "").trim() : "";
  };

  const displayValue = (value) => {
    return value && value !== "N/A" ? value : "—";
  };

  const leadEmail = leadDetails?.email || latestMessage?.email || "N/A";
  const leadPhone = leadDetails?.phone || latestMessage?.phone || "N/A";

  const leadSource =
    leadDetails?.source ||
    leadDetails?.leadSource ||
    leadDetails?.formSource ||
    latestMessage?.source ||
    latestMessage?.leadSource ||
    rawMessage ||
    "";

  const normalizedLeadSource = leadSource.toLowerCase();

  const isWebformLead =
    normalizedLeadSource.includes("webform") ||
    normalizedLeadSource.includes("web form") ||
    normalizedLeadSource.includes("form submission");

  const isSurveyLead =
    normalizedLeadSource.includes("survey") ||
    normalizedLeadSource.includes("assessment");

  const isChatbotLead =
    normalizedLeadSource.includes("chatbot") ||
    normalizedLeadSource.includes("bot") ||
    (!isWebformLead && !isSurveyLead);

  const leadSourceLabel = isWebformLead
    ? "Webform Submission"
    : isSurveyLead
    ? "Survey Form"
    : isChatbotLead
    ? "Chatbot Lead"
    : "Chatbot Lead";

  // Current editable status shown in Lead Overview
  // Resolved to the name string by looking up leadStatusId in leadStatuses.
  const status = (() => {
    const targetId = Number(leadOverviewDraft.leadStatusId);
    const found = leadStatuses.find((s) => Number(s.id ?? s.Id) === targetId);
    return found ? (found.statusName || found.StatusName || found.name || found.Name || "") : "";
  })();

  const inquiryType =
    leadDetails?.inquiryType ||
    leadDetails?.details?.inquiryType ||
    latestMessage?.inquiryType ||
    getValueFromMessage("I am inquiring for:") ||
    "N/A";

  const preferredDate =
    leadDetails?.preferredDate ||
    leadDetails?.details?.preferredDate ||
    latestMessage?.preferredDate ||
    getValueFromMessage("Preferred Date:") ||
    "N/A";

  const preferredTime =
    leadDetails?.preferredTime ||
    leadDetails?.details?.preferredTime ||
    latestMessage?.preferredTime ||
    getValueFromMessage("Preferred Time:") ||
    "N/A";

  const connectionType =
    leadDetails?.connectionType ||
    leadDetails?.preferredContact ||
    getValueFromMessage("How would you like to connect?:") ||
    "N/A";

  const visitorMessage =
    leadDetails?.visitorMessage ||
    getValueFromMessage("Message:") ||
    rawMessage ||
    "No message provided.";

  // New: keeps the Lead Overview draft in sync when lead details load.
  // =========================================
  // Sync saved backend lead values into
  // the editable Lead Overview form.
  // =========================================
  useEffect(() => {
    if (!leadDetails) return;

    setLeadOverviewDraft({
      leadStatusId:
        leadDetails?.leadStatusId != null ? Number(leadDetails.leadStatusId) :
        leadDetails?.LeadStatusId != null ? Number(leadDetails.LeadStatusId) :
        "",

      assignedUserId:
        leadDetails?.assignedUserId ||
        leadDetails?.AssignedUserId ||
        "",

      priority:
        leadDetails?.priority ||
        leadDetails?.Priority ||
        "Medium",
    });
  }, [leadDetails]);

  const surveyDetails = leadDetails?.details || leadDetails?.Details || null;

  const surveyResult =
    surveyDetails?.surveyResult || surveyDetails?.SurveyResult || "";

  const surveyScore =
    surveyDetails?.surveyScore || surveyDetails?.SurveyScore || null;

  const surveyKey =
    surveyDetails?.surveyKey || surveyDetails?.SurveyKey || "";

  const surveyAnswersRaw =
    surveyDetails?.surveyAnswersJson ||
    surveyDetails?.SurveyAnswersJson ||
    "";

  const surveyAnswers = (() => {
    try {
      return surveyAnswersRaw ? JSON.parse(surveyAnswersRaw) : null;
    } catch {
      return null;
    }
  })();

  // Converts internal survey question IDs into readable labels
  // so the dashboard feels user-friendly for sales and marketing teams.
  const surveyQuestionLabels = {
    whoFor: "Who Is This For?",
    age: "Age Range",
    whyNow: "Current Concerns",
    timeline: "Decision Timeline",

    bathing: "Bathing Assistance",
    dressing: "Dressing Assistance",
    mobility: "Mobility",
    meals: "Meal Support",
    medication: "Medication Support",
    medicationSupport: "Medication Support",

    falls: "Fall History",
    emergencies: "Emergency Needs",

    homeSafety: "Home Safety",
    dailyRoutine: "Daily Routine",

    memory: "Memory Concerns",
    memoryConcern: "Memory Concern",

    confusion: "Confusion Frequency",

    wandering: "Wandering",

    caregiverStress: "Caregiver Stress",

    supervision: "Supervision",

    decisionTimeline: "Decision Timeline",

    spaceNeed: "Space Needs",

    maintenance: "Home Maintenance",

    safety: "Safety Concerns",

    stairs: "Stairs & Mobility",

    clutter: "Clutter",

    emotionalReadiness: "Emotional Readiness",

    support: "Support System",

    futureLifestyle: "Future Lifestyle",

    decisionMaking: "Decision Making",

    social: "Social Connection",

    mood: "Mood",

    engagement: "Engagement",

    caregiver: "Caregiver Support",

    stress: "Stress Level",

    sustainability: "Sustainability",

    openness: "Openness to Change",

  };

  const formatSurveyKey = (key = "") => {
    return key
      .replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <div className="chat-history-container">
      <Header user={user} onLogout={onLogout} />

      <div className="chat-content">
        <div className="lead-page-header">
          <div>
            <div className="breadcrumb">
              <button className="breadcrumb-link" onClick={handleBackToConversations}>
                ALL CONVERSATIONS
              </button>
              <span className="breadcrumb-separator">›</span>
              <span className="breadcrumb-current">{leadName}</span>
            </div>

            <h1 className="chat-title">{leadName}</h1>

            <div className="lead-meta-row">
              <span>{leadSourceLabel}</span>
              <span>•</span>
              <span>{communityName || "No community assigned"}</span>
            </div>
          </div>

          <div className="lead-actions">
            <button className="lead-action-btn">Assign</button>
            <button className="lead-action-btn">Actions</button>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">Loading lead details...</div>
        ) : error ? (
          <div className="error-state">
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className="btn-retry">
              Retry
            </button>
          </div>
        ) : (
          <div className="lead-workspace">
            <main className="lead-main-panel">
              <section className="activity-card">
                <div className="activity-card-header">
                  <div className="timeline-icon">📋</div>

                  <div>
                    <h2>{leadSourceLabel}</h2>
                    <p>
                      {preferredDate !== "N/A"
                        ? preferredDate
                        : "Submitted lead details"}
                      {preferredTime !== "N/A" ? ` • ${preferredTime}` : ""}
                    </p>
                  </div>

                  <span className="form-type-badge">
                    {displayValue(connectionType)}
                  </span>
                </div>

                <div className="submission-layout">
                  <div className="submission-info-panel">
                    <div className="submission-panel-header">
                      <h3>Lead Information</h3>
                    </div>

                    <InfoRow label="First Name" value={firstName} />
                    <InfoRow label="Last Name" value={lastName} />
                    <InfoRow label="Email" value={leadEmail} />
                    <InfoRow label="Phone" value={leadPhone} />

                    {!isSurveyLead && (
                      <>
                        <InfoRow label="Inquiring For" value={inquiryType} />

                        <InfoRow
                          label="Connection Preference"
                          value={connectionType}
                        />

                        <InfoRow
                          label="Preferred Date"
                          value={preferredDate}
                        />

                        <InfoRow
                          label="Preferred Time"
                          value={preferredTime}
                        />
                      </>
                    )}
                  </div>

                  {isChatbotLead ? (
                    <div className="submission-message-panel">
                      <div className="submission-panel-header">
                        <h3>Conversation</h3>
                      </div>

                      <div className="embedded-conversation-thread">
                        {messages.map((message, index) => {
                          const isBot = message.sender === "bot";

                          return (
                            <div
                              key={message.id || index}
                              className={`thread-message ${
                                isBot ? "thread-message-bot" : "thread-message-user"
                              }`}
                            >
                              <div className="thread-bubble">
                                <div className="thread-meta">
                                  <strong>{isBot ? "Assistant" : leadName}</strong>
                                  <span>
                                    {formatLocalTime(
                                      message.timestamp || message.createdAt
                                    )}
                                  </span>
                                </div>

                                <p>
                                  {message.message ||
                                    message.content ||
                                    message.text ||
                                    "No message"}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="submission-message-panel">
                      <div className="submission-panel-header">
                        <h3>Visitor Message</h3>
                      </div>

                      <div className="submission-message-content">
                        <p>{displayValue(visitorMessage)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {isSurveyLead && (
                <section className="survey-result-card">
                  <div className="survey-result-header">
                    <div>
                      <span className="survey-result-kicker">
                        Assessment Result
                      </span>
                      <h2>{surveyResult || "Survey Result"}</h2>
                    </div>

                    {surveyScore !== null && (
                      <span className="survey-score-pill">
                        Score: {surveyScore}
                      </span>
                    )}
                  </div>

                  <div className="survey-meta-grid">
                    <div className="survey-meta-item">
                      <span>Survey Type</span>
                  <strong>{formatSurveyKey(surveyKey) || "—"}</strong>                    
                  </div>

                    <div className="survey-meta-item">
                      <span>Recommendation</span>
                      <strong>{surveyResult || "—"}</strong>
                    </div>
                  </div>

                  {surveyAnswers && (
                    <div className="survey-answers-list">
                      <h3>Selected Answers</h3>

                      {Object.entries(surveyAnswers).map(([questionId, answer]) => (
                        <div key={questionId} className="survey-answer-item">
                          <span>{surveyQuestionLabels[questionId] || questionId}</span>
                          <strong>
                            {Array.isArray(answer)
                              ? answer
                                  .map((item) => item.label || item.value)
                                  .join(", ")
                              : answer?.label || answer?.value || "—"}
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              <section className="notes-panel">
                <div className="notes-tabs">
                  <button
                    className={activeTab === "notes" ? "active" : ""}
                    onClick={() => setActiveTab("notes")}
                  >
                    Notes ({notes.length})
                  </button>

                  <button
                    className={activeTab === "activity" ? "active" : ""}
                    onClick={() => setActiveTab("activity")}
                  >
                    Activity
                  </button>
                </div>

                <div className="notes-content">
                  {activeTab === "notes" ? (
                    notesLoading ? (
                      <div className="empty-notes-state"><p>Loading notes...</p></div>
                    ) : notes.length === 0 ? (
                      <div className="empty-notes-state">
                        <h3>No Notes Yet</h3>
                        <p>Add a note below to keep track of this lead.</p>
                      </div>
                    ) : (
                      <div className="notes-list">
                        {notes.map((note) => (
                          <div key={note.id} className="note-card">
                            <div className="note-card-header">
                              <strong>
                                {users.find((u) => u.id === note.createdBy)
                                  ? `${users.find((u) => u.id === note.createdBy).firstName || ""} ${users.find((u) => u.id === note.createdBy).lastName || ""}`.trim()
                                  : `User #${note.createdBy}`}
                              </strong>
                              <span>
                                {new Date(note.createdAt).toLocaleDateString()} •{" "}
                                {new Date(note.createdAt).toLocaleTimeString([], {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>

                            <p>{note.message}</p>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    <div className="activity-tab-content">
                      <div className="activity-tab-item">
                        <strong>{leadSourceLabel} submitted</strong>
                        <span>
                          {displayValue(preferredDate)} •{" "}
                          {displayValue(preferredTime)}
                        </span>
                      </div>

                      {notes.map((note) => (
                        <div key={note.id} className="activity-tab-item">
                          <strong>Note added</strong>
                          <span>
                            {new Date(note.createdAt).toLocaleDateString()} •{" "}
                            {new Date(note.createdAt).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="note-composer">
                <textarea
                  className="message-input"
                  placeholder="Type a note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                />

                <div className="note-composer-footer">
                  <span>Internal Note</span>

                  <button
                    className="add-note-submit"
                    onClick={handleAddNote}
                    disabled={isAddingNote}
                  >
                    {isAddingNote ? "Saving..." : "Add Note"}
                  </button>
                </div>
              </section>
            </main>

            <aside className="lead-details-panel">
              <div className="details-card">
                <div className="details-card-header">
                  <h3>Lead Overview</h3>
                </div>

                <div className="detail-row">
                  <span>Status</span>

                  <div className="status-menu-wrapper">
                    <button
                      ref={statusButtonRef}
                      type="button"
                      className={`status-select${status ? ` status-${status.toLowerCase().replace(/\s+/g, "-")}` : " status-unset"}`}
                      onClick={handleStatusMenuToggle}
                    >
                      <span>{status || "Select Status"}</span>
                      <span className="status-caret">⌄</span>
                    </button>
                  </div>

                  {showStatusMenu &&
                    createPortal(
                      <div
                        className="status-options-menu"
                        style={{
                          top: `${statusMenuPosition.top}px`,
                          left: `${statusMenuPosition.left}px`,
                          width: `${statusMenuPosition.width}px`,
                        }}
                      >
                        {leadStatuses.length === 0 && (
                          <div style={{ padding: "10px 14px", color: "#94a3b8", fontSize: "13px" }}>
                            No statuses available
                          </div>
                        )}
                        {leadStatuses.map((s) => {
                          const sId = s.id ?? s.Id;
                          const sName = s.statusName || s.StatusName || s.name || s.Name || "";
                          return (
                            <button
                              key={sId}
                              type="button"
                              className="status-option"
                              onClick={() => handleStatusChange(sId)}
                            >
                              <span
                                className={`status-dot status-dot-${sName
                                  .toLowerCase()
                                  .replace(/\s+/g, "-")}`}
                              />

                              {sName}
                            </button>
                          );
                        })}
                      </div>,
                      document.body
                    )}
                </div>

              <div className="detail-row">
                <span>Assigned To</span>

                {/* New: dropdown for assigning this lead to a dashboard user */}
                <select
                  className="assigned-user-select"
                  value={leadOverviewDraft.assignedUserId}
                  onChange={(e) => {
                    // Update local draft only.
                    // The change is saved after clicking Save Changes.
                    setLeadOverviewDraft((prev) => ({
                      ...prev,
                      assignedUserId: e.target.value,
                    }));

                    setHasOverviewChanges(true);
                  }}                >
                  {/* Default option when no user is assigned */}
                  <option value="">Unassigned</option>

                  {/* New: dynamically show users loaded from apiService.getUsers() */}
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {`${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email}
                    </option>
                  ))}
                </select>
              </div>                
              
              <div className="detail-row">
                <span>Priority</span>

                {/* =========================================
                    Custom Priority Dropdown
                    Premium SaaS-style dropdown menu
                ========================================= */}
                  <div className="priority-menu-wrapper" ref={priorityMenuRef}>
                  {/* Dropdown trigger button */}
                  <button
                    type="button"
                    className={`priority-select priority-${leadOverviewDraft.priority.toLowerCase()}`}
                    onClick={() => {
                      // Opens/closes the dropdown menu
                      setShowPriorityMenu((prev) => !prev);
                    }}
                  >
                    <span>{leadOverviewDraft.priority}</span>

                    <span className="priority-caret">⌄</span>
                  </button>

                  {/* Dropdown options menu */}
                  {showPriorityMenu && (
                    <div className="priority-options-menu">

                      {priorityOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          className="priority-option"
                          onClick={() => {

                            // Update local draft only.
                            // The change is saved after clicking Save Changes.
                            setLeadOverviewDraft((prev) => ({
                              ...prev,
                              priority: option,
                            }));

                            setHasOverviewChanges(true);
                            setShowPriorityMenu(false);
                          }}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

                {/* Save button for Lead Overview draft changes */}
                <div className="lead-overview-save-row">
                  <button
                    type="button"
                    className="save-overview-btn"
                    onClick={handleSaveLeadOverview}
                    disabled={!hasOverviewChanges || isSavingOverview}
                  >
                    {isSavingOverview ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>

              <div className="details-card">
                <div className="details-card-header">
                  <h3>Community</h3>
                </div>

                <DetailRow
                label="Community Name"
                value={formatCommunityName(leadDetails?.clientKey)}
              />
              </div>

              <div className="details-card">
                <div className="details-card-header">
                  <h3>Technical Details</h3>
                </div>

                <DetailRow label="Lead Source" value={leadSourceLabel} />
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
};

const InfoRow = ({ label, value }) => {
  return (
    <div className="info-row">
      <span>{label}</span>
      <strong>{value && value !== "N/A" ? value : "—"}</strong>
    </div>
  );
};

const DetailRow = ({ label, value, highlight }) => {
  const className = highlight ? `detail-value ${highlight}` : "detail-value";

  return (
    <div className="detail-row">
      <span>{label}</span>
      <strong className={className}>
        {value && value !== "N/A" ? value : "—"}
      </strong>
    </div>
  );
};

export default ChatHistory;
