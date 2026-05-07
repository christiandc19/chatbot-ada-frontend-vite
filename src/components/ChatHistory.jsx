import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./ChatHistory.css";
import Header from "./Header";
import apiService from "../services/apiService";
import { formatLocalTime } from "../utils/dateUtils";

const ChatHistory = ({ user, onLogout }) => {
  const { leadId } = useParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [leadDetails, setLeadDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [leadName, setLeadName] = useState("");
  const [communityName, setCommunityName] = useState("");
  const [newNote, setNewNote] = useState("");
  const [notes, setNotes] = useState([]);
  const [activeTab, setActiveTab] = useState("notes");

  const firstName = leadDetails?.firstName || "N/A";
  const lastName = leadDetails?.lastName || "N/A";

  useEffect(() => {
    const savedNotes = localStorage.getItem(`lead-notes-${leadId}`);

    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    }
  }, [leadId]);

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

  const handleBackToConversations = () => {
    navigate("/conversations");
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;

    const newNoteObject = {
      id: Date.now(),
      text: newNote,
      createdAt: new Date().toISOString(),
      createdBy: user?.name || "Admin",
    };

    const updatedNotes = [newNoteObject, ...notes];

    setNotes(updatedNotes);
    localStorage.setItem(`lead-notes-${leadId}`, JSON.stringify(updatedNotes));

    setNewNote("");
    setActiveTab("notes");
  };

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

  const status = leadDetails?.status || latestMessage?.status || "New Lead";

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

  const assignedTo =
    leadDetails?.assignedTo || leadDetails?.assignedUserName || "Unassigned";

  const priority = leadDetails?.priority || leadDetails?.leadPriority || "Medium";

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

  // NEW:
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
    falls: "Fall History",
    emergencies: "Emergency Needs",
    homeSafety: "Home Safety",
    memory: "Memory Concerns",
    confusion: "Confusion Frequency",
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
            <span className="lead-status-pill">{status}</span>
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
                    <InfoRow label="Inquiring For" value={inquiryType} />
                    <InfoRow label="Connection Preference" value={connectionType} />
                    <InfoRow label="Preferred Date" value={preferredDate} />
                    <InfoRow label="Preferred Time" value={preferredTime} />
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

                  {/* NEW:
                      Compact assessment metadata row */}
                  <div className="survey-meta-grid">
                    <div className="survey-meta-item">
                      <span>Survey Type</span>
                      <strong>{surveyKey || "—"}</strong>
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
                    notes.length === 0 ? (
                      <div className="empty-notes-state">
                        <h3>No Notes Yet</h3>
                        <p>Add a note below to keep track of this lead.</p>
                      </div>
                    ) : (
                      <div className="notes-list">
                        {notes.map((note) => (
                          <div key={note.id} className="note-card">
                            <div className="note-card-header">
                              <strong>{note.createdBy}</strong>
                              <span>
                                {new Date(note.createdAt).toLocaleDateString()} •{" "}
                                {new Date(note.createdAt).toLocaleTimeString([], {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>

                            <p>{note.text}</p>
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

                  <button className="add-note-submit" onClick={handleAddNote}>
                    Add Note
                  </button>
                </div>
              </section>
            </main>

            <aside className="lead-details-panel">
              <div className="details-card">
                <div className="details-card-header">
                  <h3>Lead Overview</h3>
                </div>

                <DetailRow label="Status" value={status} highlight="green" />
                <DetailRow label="Assigned To" value={assignedTo} />
                <DetailRow label="Priority" value={priority} highlight="orange" />
              </div>

              <div className="details-card">
                <div className="details-card-header">
                  <h3>Community</h3>
                </div>

                <DetailRow label="Community Name" value={communityName || "N/A"} />
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