import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import "./ChatHistory.css";
import Header from "./Header";
import apiService from "../services/apiService";
import { formatLocalTime } from "../utils/dateUtils";
import { useNotification } from "../contexts/NotificationContext";


// =====================================================
// Lead Overview Priority Options
// Used by the custom Priority dropdown in the CRM sidebar.
// =====================================================
const priorityOptions = ["Low", "Medium", "High", "Urgent"];

const ChatHistory = ({ user, onLogout }) => {
  const { leadId } = useParams();
  const navigate = useNavigate();

  // =====================================================
  // Toast notifications
  // Used after saving CRM overview changes.
  // =====================================================
  const { showNotification } = useNotification();

  // =====================================================
  // Core Lead Page State
  // Stores lead details, messages, notes, users, and loading state.
  // =====================================================
  const [messages, setMessages] = useState([]);
  const [leadDetails, setLeadDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [leadName, setLeadName] = useState("");
  const [communityName, setCommunityName] = useState("");
  const [newNote, setNewNote] = useState("");
  const [notes, setNotes] = useState([]);
  // =====================================================
  // Frontend CRM Activity Logs
  // These show immediate timeline feedback when status,
  // assignment, or priority changes before backend activity
  // persistence is added later.
  // =====================================================
  const [activityLogs, setActivityLogs] = useState([]);
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

  // NEW:
  // Reference to the dashboard conversation container.
  // Used for auto-scrolling to the newest message.
  const conversationThreadRef = useRef(null);

  // NEW:
  // Prevents forcing the user back to the bottom
  // while reading older messages.
  const hasInitialAutoScrolledRef = useRef(false);

  // Tracks the previous message count.
  const previousMessageCountRef = useRef(0);

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
      // NEW: position correctly even when page is scrolled
      top: rect.bottom + window.scrollY + 8,
      left: rect.right + window.scrollX - 210,
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



  // =====================================================
  // Handle Status Change
  // Updates the local draft, enables Save Changes,
  // and adds a temporary CRM activity log.
  // =====================================================
  const handleStatusChange = (statusId) => {
    const selectedStatus = leadStatuses.find(
      (s) => Number(s.id ?? s.Id) === Number(statusId)
    );

    const statusName =
      selectedStatus?.statusName ||
      selectedStatus?.StatusName ||
      selectedStatus?.name ||
      selectedStatus?.Name ||
      "Updated";

    addActivityLog(
      `Status changed to ${statusName}`,
      "CRM status updated"
    );

    setLeadOverviewDraft((prev) => ({
      ...prev,
      leadStatusId: statusId,
    }));

    setHasOverviewChanges(true);
    setShowStatusMenu(false);
  };


  // =====================================================
  // Adds a new CRM activity item
  // =====================================================
  const addActivityLog = (title, description = "") => {
    const newLog = {
      id: Date.now(),
      title,
      description,
      createdAt: new Date().toISOString(),
    };

    setActivityLogs((prev) => [newLog, ...prev]);
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
      showNotification("Lead overview saved successfully.", "success", 3000);

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

console.log("FULL leadDetails:", leadDetails);
console.log("LATEST message:", latestMessage);
console.log("RAW message:", rawMessage);

  const getValueFromMessage = (label) => {
    const line = rawMessage
      .split("\n")
      .find((item) => item.toLowerCase().startsWith(label.toLowerCase()));

    return line ? line.replace(label, "").trim() : "";
  };

  const displayValue = (value) => {
    return value && value !== "N/A" ? value : "—";
  };

  // NEW:
  // Extracts a specific field from a saved webform conversation message.
  // Example: "Preferred Date: 2026-05-30"
  const getValueFromSpecificMessage = (messageText, label) => {
    if (!messageText) return "";

    const line = messageText
      .split("\n")
      .find((item) =>
        item.toLowerCase().startsWith(label.toLowerCase())
      );

    return line ? line.replace(label, "").trim() : "";
  };

  // NEW:
// Webform submission history.
// This lets duplicate/merged webform leads still show previous submissions.
const webformSubmissionHistory = messages
  .filter((message) => {
    const text =
      message.message ||
      message.content ||
      message.text ||
      "";

    return text.toLowerCase().includes("webform submission");
  })
  .map((message) => {
    const text =
      message.message ||
      message.content ||
      message.text ||
      "";

    return {
      id: message.id,
      createdAt: message.createdAt,
      inquiryFor: getValueFromSpecificMessage(text, "I am inquiring for:"),
      connectionPreference: getValueFromSpecificMessage(
        text,
        "How would you like to connect?:"
      ),
      preferredDate: getValueFromSpecificMessage(text, "Preferred Date:"),
      preferredTime: getValueFromSpecificMessage(text, "Preferred Time:"),
      visitorMessage: getValueFromSpecificMessage(text, "Message:"),
    };
  });

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
    getValueFromMessage("Inquiring For:") ||
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
    latestMessage?.connectionType ||
    getValueFromMessage("How would you like to connect?:") ||
    getValueFromMessage("Connection Preference:") ||
    "N/A";

  const visitorMessage =
    leadDetails?.visitorMessage ||
    getValueFromMessage("Message:") ||
    rawMessage ||
    "No message provided.";


    /* ========================================
      SMART CRM AUTO SCROLL

      First load:
      Scroll to newest message.

      After that:
      Only scroll when a NEW message arrives.
      Do NOT fight the user while they are
      reviewing older conversation history.
    ======================================== */
    useEffect(() => {
      const container = conversationThreadRef.current;

      if (!container) return;

      const currentMessageCount = messages.length;

      // First load
      if (!hasInitialAutoScrolledRef.current) {
        hasInitialAutoScrolledRef.current = true;
        previousMessageCountRef.current = currentMessageCount;

        setTimeout(() => {
          container.scrollTop = container.scrollHeight;
        }, 150);

        return;
      }

      // New message arrived
      if (currentMessageCount > previousMessageCountRef.current) {
        previousMessageCountRef.current = currentMessageCount;

        setTimeout(() => {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth",
          });
        }, 150);
      }
    }, [messages]);    


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


    // NEW: builds smart CRM tags from the lead data
    const dynamicLeadTags = [];

    dynamicLeadTags.push(leadSourceLabel);

    if (connectionType !== "N/A") {
      if (connectionType.toLowerCase().includes("visit")) {
        dynamicLeadTags.push("Tour Requested");
      } else {
        dynamicLeadTags.push(connectionType);
      }
    }

    if (inquiryType !== "N/A") {
      dynamicLeadTags.push(`For ${inquiryType}`);
    }

    if (
      leadOverviewDraft.priority === "High" ||
      leadOverviewDraft.priority === "Urgent"
    ) {
      dynamicLeadTags.push(`${leadOverviewDraft.priority} Priority`);
    }

    const getLeadTagClass = (tag) => {
      const normalized = tag.toLowerCase();

      if (normalized.includes("webform")) return "lead-tag lead-tag-webform";
      if (normalized.includes("survey")) return "lead-tag lead-tag-survey";
      if (normalized.includes("chatbot")) return "lead-tag lead-tag-chatbot";
      if (normalized.includes("tour") || normalized.includes("visit")) return "lead-tag lead-tag-tour";
      if (normalized.includes("priority")) return "lead-tag lead-tag-hot";

      return "lead-tag lead-tag-neutral";
    };


// ========================================
// Dynamic Lead Score Calculator
// Uses leadDetails because this page stores
// the current lead in leadDetails state.
// ========================================

const calculateLeadScore = () => {
  let score = 0;

  // Contact info
  if (leadEmail && leadEmail !== "N/A") score += 15;
  if (leadPhone && leadPhone !== "N/A") score += 15;

  // Lead source
  if (isWebformLead) score += 15;
  if (isChatbotLead) score += 10;
  if (isSurveyLead) score += 20;

  // Status
  switch (status) {
    case "Qualified":
      score += 20;
      break;
    case "Tour Scheduled":
      score += 25;
      break;
    case "Converted":
      score += 30;
      break;
    case "Contacted":
      score += 10;
      break;
    default:
      break;
  }

  // Tour / visit intent
  if (
    connectionType !== "N/A" &&
    connectionType.toLowerCase().includes("visit")
  ) {
    score += 20;
  }

  // Conversation activity
  if (messages?.length >= 5) score += 10;

  return Math.min(score, 100);
};

const leadScore = calculateLeadScore();
    
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
              <span>{communityName} {formatCommunityName(leadDetails?.clientKey)} </span>
            </div>
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
                  {isChatbotLead ? (
                    <div className="submission-message-panel">
                      <div className="submission-panel-header">
                        <h3>Conversation</h3>
                      </div>

                      <div
                          className="embedded-conversation-thread"
                          ref={conversationThreadRef}
                        >
                            {messages.map((message, index) => {
                              const isBot = message.sender === "bot";

                              const messageText =
                                message.message ||
                                message.content ||
                                message.text ||
                                "No message";

                              // NEW:
                              // Simple chatbot click/navigation messages should display as
                              // activity lines instead of large chat bubbles.
                              const isSimpleActivityMessage =
                                messageText.startsWith("Community action:") ||
                                messageText === "Back to Main Menu" ||
                                messageText === "Living Options" ||
                                messageText === "Community Life" ||
                                messageText === "View Floor Plans" ||
                                messageText === "Contact Us" ||
                                messageText === "Job Inquiry";

                              if (isSimpleActivityMessage) {
                                const cleanText = messageText
                                  .replace("Community action:", "")
                                  .trim();

                                return (
                                  <div key={message.id || index} className="thread-activity-line">
                                    <span>
                                      {leadName} clicked a link: {cleanText}
                                    </span>

                                    <em>
                                      {message.createdAt
                                        ? new Date(message.createdAt).toLocaleDateString() +
                                          " • " +
                                          new Date(message.createdAt).toLocaleTimeString([], {
                                            hour: "numeric",
                                            minute: "2-digit",
                                          })
                                        : formatLocalTime(message.timestamp)}
                                    </em>
                                  </div>
                                );
                              }

                              return (                            
                              
                              <div
                              key={message.id || index}
                              className={`thread-message ${
                                isBot ? "thread-message-bot" : "thread-message-user"
                              }`}
                            >
                              <div
                                className={`thread-bubble ${
                                  isBot ? "assistant" : "user"
                                }`}
>
                                <div className="thread-meta">
                                  <strong>{isBot ? "Assistant" : leadName}</strong>
                                    <span>
                                      {message.createdAt
                                        ? new Date(message.createdAt).toLocaleDateString() +
                                          " • " +
                                          new Date(message.createdAt).toLocaleTimeString([], {
                                            hour: "numeric",
                                            minute: "2-digit",
                                          })
                                        : formatLocalTime(message.timestamp)}
                                    </span>
                                </div>


                                {(() => {
                                  const messageText =
                                    message.message ||
                                    message.content ||
                                    message.text ||
                                    "No message";

                                // NEW:
                                // Simple chatbot click/navigation messages should display as
                                // activity lines instead of large chat bubbles.
                                const isSimpleActivityMessage =
                                  messageText.startsWith("Community action:") ||
                                  messageText === "Back to Main Menu" ||
                                  messageText === "Living Options" ||
                                  messageText === "Community Life" ||
                                  messageText === "View Floor Plans" ||
                                  messageText === "Contact Us" ||
                                  messageText === "Job Inquiry";

                                  const scheduleMatch = messageText.match(
                                    /schedule visit:\s*(\d{4}-\d{2}-\d{2})\s+(.+)/i
                                  );

                                  if (scheduleMatch) {
                                    return (
                                      <div className="chatbot-schedule-card">
                                      <div className="lead-info-grid">
                                        {inquiryType !== "N/A" && (
                                          <div className="lead-info-item">
                                            <span>Inquiring For</span>
                                            <strong>{displayValue(inquiryType)}</strong>
                                          </div>
                                        )}

                                        {connectionType !== "N/A" && (
                                          <div className="lead-info-item">
                                            <span>Connection Preference</span>
                                            <strong>{displayValue(connectionType)}</strong>
                                          </div>
                                        )}

                                        {preferredDate !== "N/A" && (
                                          <div className="lead-info-item">
                                            <span>Preferred Date</span>
                                            <strong>{displayValue(preferredDate)}</strong>
                                          </div>
                                        )}

                                        {preferredTime !== "N/A" && (
                                          <div className="lead-info-item">
                                            <span>Preferred Time</span>
                                            <strong>{displayValue(preferredTime)}</strong>
                                          </div>
                                        )}
                                      </div>


                                    {inquiryType === "N/A" &&
                                      connectionType === "N/A" &&
                                      preferredDate === "N/A" &&
                                      preferredTime === "N/A" && (
                                        <div className="lead-info-empty-state">
                                          No additional form details were submitted.
                                        </div>
                                      )}

                                      </div>
                                    );
                                  }

                                  return <p>{messageText}</p>;
                                })()}


                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : isSurveyLead ? (
                    <div className="submission-split-layout">

                      {/* ========================================
                          SURVEY FORM LEAD INFORMATION
                          Survey leads should show contact details,
                          not webform appointment fields.
                      ======================================== */}
                      <div className="submission-message-panel">
                        <div className="submission-panel-header">
                          <h3>Lead Information</h3>
                        </div>

                        <div className="info-list">
                          <InfoRow label="First Name" value={leadDetails?.firstName} />
                          <InfoRow label="Last Name" value={leadDetails?.lastName} />
                          <InfoRow label="Email" value={leadDetails?.email} />
                          <InfoRow label="Phone" value={leadDetails?.phone} />
                        </div>
                      </div>

                      {/* ========================================
                          SURVEY RESULT MESSAGE
                          Prefer the submitted survey completion
                          message, then fall back to SurveyResult.
                      ======================================== */}
                      <div className="submission-message-panel">
                        <div className="submission-panel-header">
                          <h3>Result Message</h3>
                        </div>

                        <div className="submission-message-content">
                          <p>
                            {displayValue(
                              visitorMessage && visitorMessage !== "No message provided."
                                ? visitorMessage
                                : surveyResult
                            )}
                          </p>
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="submission-message-panel">

                      {/* ========================================
                          WEBFORM LEAD DETAILS
                          Shows structured appointment/contact
                          fields from the public webform.
                      ======================================== */}
                      <div className="submission-panel-header">
                        <h3>Lead Information</h3>
                      </div>

                      <div className="lead-info-grid">

                        <div className="lead-info-item">
                          <span>Inquiring For</span>
                          <strong>{displayValue(inquiryType)}</strong>
                        </div>

                        <div className="lead-info-item">
                          <span>Connection Preference</span>
                          <strong>{displayValue(connectionType)}</strong>
                        </div>

                        <div className="lead-info-item">
                          <span>Preferred Date</span>
                          <strong>{displayValue(preferredDate)}</strong>
                        </div>

                        <div className="lead-info-item">
                          <span>Preferred Time</span>
                          <strong>{displayValue(preferredTime)}</strong>
                        </div>

                      </div>

                      {/* ========================================
                          VISITOR MESSAGE
                      ======================================== */}
                      <div className="submission-panel-header visitor-message-header">
                        <h3>Visitor Message</h3>
                      </div>

                      <div className="submission-message-content">
                        <p>{displayValue(visitorMessage)}</p>
                      </div>

                      {/* NEW:
                      Shows previous webform submissions for merged duplicate leads.
                      This prevents older schedule visit requests from being hidden.
                  */}

                  {/* NEW:
                      Compact timeline view for merged webform submissions.
                  */}
                  {webformSubmissionHistory.length > 1 && (
                    <>
                      <div className="submission-panel-header visitor-message-header">
                        <h3>Submission History</h3>
                      </div>

                      <div className="webform-history-timeline">
                        {webformSubmissionHistory
                          .slice()
                          .reverse()
                          .map((item, index) => {
                            const isLatest = index === 0;

                            return (
                              <div key={item.id} className="webform-history-event">
                                <div className="webform-history-dot" />

                                <div className="webform-history-body">
                                  <div className="webform-history-topline">
                                    <span className="webform-history-label">
                                      {isLatest ? "Latest Request" : "Previous Request"}
                                    </span>

                                    <span className="webform-history-submitted">
                                      {item.createdAt
                                        ? new Date(item.createdAt).toLocaleDateString() +
                                          " • " +
                                          new Date(item.createdAt).toLocaleTimeString([], {
                                            hour: "numeric",
                                            minute: "2-digit",
                                          })
                                        : "Date unavailable"}
                                    </span>
                                  </div>

                                  <h4>
                                    Tour requested for {displayValue(item.preferredDate)} at{" "}
                                    {displayValue(item.preferredTime)}
                                  </h4>

                                  <p>
                                    <strong>{displayValue(item.inquiryFor)}</strong> selected{" "}
                                    <strong>{displayValue(item.connectionPreference)}</strong>.
                                  </p>

                                  {item.visitorMessage && (
                                    <p className="webform-history-note">
                                      “{item.visitorMessage}”
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </>
                  )}
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

                    {connectionType !== "N/A" && (
                      <div className="activity-timeline-item">
                        <div className="activity-timeline-dot note-dot" />

                        <div className="activity-timeline-body">
                          <strong>
                            {connectionType.toLowerCase().includes("visit")
                              ? "Tour request submitted"
                              : "Connection preference submitted"}
                          </strong>

                          <span>
                            {preferredDate !== "N/A" ? preferredDate : "Date not provided"}
                            {preferredTime !== "N/A" ? ` • ${preferredTime}` : ""}
                          </span>

                          <p>
                            Inquiring for: {displayValue(inquiryType)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* =========================================
                        DYNAMIC CRM ACTIVITY LOGS
                    ========================================= */}
                    {activityLogs.map((log) => (
                      <div key={log.id} className="activity-timeline-item">

                        <div className="activity-timeline-dot crm-dot" />

                        <div className="activity-timeline-body">

                          <strong>{log.title}</strong>

                          <span>
                            {new Date(log.createdAt).toLocaleDateString()} •{" "}
                            {new Date(log.createdAt).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>

                          {log.description && (
                            <p>{log.description}</p>
                          )}

                        </div>
                      </div>
                    ))}




                    {/* NEW: Current CRM status activity */}
                    {status && (
                      <div className="activity-timeline-item">
                        <div className="activity-timeline-dot crm-dot" />

                        <div className="activity-timeline-body">
                          <strong>Status is currently {status}</strong>

                          <span>CRM status</span>
                        </div>
                      </div>
                    )}

                    {/* NEW: Assignment activity */}
                    {leadOverviewDraft.assignedUserId && (
                      <div className="activity-timeline-item">
                        <div className="activity-timeline-dot assignment-dot" />

                        <div className="activity-timeline-body">
                          <strong>
                            Assigned to{" "}
                            {users.find((u) => String(u.id) === String(leadOverviewDraft.assignedUserId))
                              ? `${users.find((u) => String(u.id) === String(leadOverviewDraft.assignedUserId)).firstName || ""} ${users.find((u) => String(u.id) === String(leadOverviewDraft.assignedUserId)).lastName || ""}`.trim()
                              : "team member"}
                          </strong>

                          <span>Lead owner</span>
                        </div>
                      </div>
                    )}




                    {/* NEW: Lead created / submitted activity */}
                    <div className="activity-timeline-item">
                      
                      <div className="activity-timeline-dot" />

                      <div className="activity-timeline-body">
                        <strong>{leadSourceLabel} submitted</strong>

                        <span>
                          {leadDetails?.createdAt
                            ? new Date(leadDetails.createdAt).toLocaleDateString() +
                              " • " +
                              new Date(leadDetails.createdAt).toLocaleTimeString([], {
                                hour: "numeric",
                                minute: "2-digit",
                              })
                            : "Date unavailable"}
                        </span>
                      </div>
                    </div>

                    {/* NEW: Notes become activity events */}
                    {notes.map((note) => (
                      <div key={note.id} className="activity-timeline-item">
                        <div className="activity-timeline-dot note-dot" />

                        <div className="activity-timeline-body">
                          <strong>Internal note added</strong>

                          <span>
                            {new Date(note.createdAt).toLocaleDateString()} •{" "}
                            {new Date(note.createdAt).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>

                          <p>{note.message}</p>
                        </div>
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

              {/* =========================================
                  NEW: Lead Snapshot Card
                  Gives the CRM sidebar a more operational feel
              ========================================= */}
              <div className="details-card lead-snapshot-card">

                <div className="details-card-header">
                  <h3>Lead Snapshot</h3>
                </div>

                <div className="lead-snapshot-content">

                  {/* Lead initials avatar */}
                  <div className="lead-snapshot-avatar">
                    {firstName?.charAt(0)}
                    {lastName?.charAt(0)}
                  </div>

                  {/* Lead basic info */}
                  <div className="lead-snapshot-name">
                    <h2>{leadName}</h2>

                    <span className="lead-source-pill">
                      {leadSourceLabel}
                    </span>
                  </div>

                  {/* Quick CRM details */}
                  <div className="lead-snapshot-grid">

                    <div className="snapshot-item">
                      <span>Email</span>
                      <strong>{leadEmail}</strong>
                    </div>

                    <div className="snapshot-item">
                      <span>Phone</span>
                      <strong>{leadPhone}</strong>
                    </div>

                    <div className="snapshot-item">
                      <span>Community</span>
                      <strong>
                        {formatCommunityName(leadDetails?.clientKey)}
                      </strong>
                    </div>

                    <div className="snapshot-item">
                      <span>Created</span>

                      <strong>
                        {leadDetails?.createdAt
                          ? new Date(leadDetails.createdAt).toLocaleDateString()
                          : "—"}
                      </strong>
                    </div>

                  </div>
                </div>
              </div>




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
                    const selectedUserId = e.target.value;

                    const selectedUser = users.find(
                      (u) => String(u.id) === String(selectedUserId)
                    );

                    const selectedUserName = selectedUser
                      ? `${selectedUser.firstName || ""} ${selectedUser.lastName || ""}`.trim() || selectedUser.email
                      : "Unassigned";

                    // NEW: add a temporary CRM activity log.
                    addActivityLog(
                      selectedUserId
                        ? `Assigned to ${selectedUserName}`
                        : "Lead unassigned",
                      "Lead owner updated"
                    );

                    // Update local draft only.
                    // The change is saved after clicking Save Changes.
                    setLeadOverviewDraft((prev) => ({
                      ...prev,
                      assignedUserId: selectedUserId,
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
                            // NEW: add a temporary CRM activity log.
                            addActivityLog(
                              `Priority changed to ${option}`,
                              "Lead priority updated"
                            );

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

              {/* =========================================
                  NEW: CRM Tags
                  Gives the lead operational labels
              ========================================= */}
              <div className="lead-tags-section">
                {dynamicLeadTags.map((tag) => (
                  <span key={tag} className={getLeadTagClass(tag)}>
                    {tag}
                  </span>
                ))}
              </div>



              {/* =========================================
                  NEW: Lead Score
                  Simple frontend-only CRM score
              ========================================= */}
              <div className="lead-score-card">
                <div className="lead-score-header">
                  <span>Lead Score</span>
                  <strong>{leadScore} / 100</strong>
                </div>

                <div className="lead-score-bar">
                  <div
                    className="lead-score-fill"
                    style={{ width: `${leadScore}%` }}
                  />
                </div>
              </div>



                {/* Save button for Lead Overview draft changes */}
                <div className="lead-overview-save-row">
                  {hasOverviewChanges && (
                    <p className="unsaved-changes-text">
                      You have unsaved changes
                    </p>
                  )}
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
