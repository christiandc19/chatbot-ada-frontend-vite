import React, { useEffect, useMemo, useState } from "react";
import Header from "./Header";
import { getAnalyticsTraffic } from "../services/analyticsService";
import apiService from "../services/apiService";
import { generateDashboardPdf } from "../utils/pdfGenerator";
import "./Stats.css";

import {
  Users,
  UserRoundCheck,
  ClipboardList,
  MessageSquareText,
  CheckCircle2,
  CalendarDays,
  House,
} from "lucide-react";

import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Legend,
  Cell,
} from "recharts";

const TABS = [
  "Overview",
  "Insights",
  "Conversation Analytics",
  "Instant Answers Analytics",
  "Report History",
];

const DEFAULT_REPORT_NAME = "Web Analytics Report";
const REPORT_HISTORY_STORAGE_KEY = "reportHistory";

const SOURCE_COLORS = {
  chatbot: "#2563eb",
  survey: "#16a34a",
  webform: "#f97316",
  other: "#94a3b8",
};

const Stats = ({ user, onLogout }) => {
  const [leadTrendData, setLeadTrendData] = useState([]);
  const [sourceData, setSourceData] = useState([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [selectedCommunity, setSelectedCommunity] = useState("all");
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gaData, setGaData] = useState(null);
  const [activeTabName, setActiveTabName] = useState("Overview");
  const [selectedRange, setSelectedRange] = useState("30");
  const [reportName, setReportName] = useState("");
  const [savedReportName, setSavedReportName] = useState("");
  const [reportHistory, setReportHistory] = useState([]);

  // Lead source KPI counts.
  const [webformLeads, setWebformLeads] = useState(0);
  const [chatLeads, setChatLeads] = useState(0);
  const [surveyLeads, setSurveyLeads] = useState(0);

  // Status-based KPI counts.
  const [toursScheduled, setToursScheduled] = useState(0);
  const [moveIns, setMoveIns] = useState(0);

  // Load locally saved report history once when this page opens.
  useEffect(() => {
    try {
      const savedHistory = JSON.parse(
        localStorage.getItem(REPORT_HISTORY_STORAGE_KEY)
      );

      setReportHistory(Array.isArray(savedHistory) ? savedHistory : []);
    } catch (error) {
      console.error("Unable to load report history:", error);
      setReportHistory([]);
    }
  }, []);

  // This is the name used by the generated PDF and report history.
  const reportDisplayName = useMemo(() => {
    return savedReportName || DEFAULT_REPORT_NAME;
  }, [savedReportName]);

  const getLeadSourceType = (lead) => {
    const source = (lead?.source || lead?.leadSource || "").toLowerCase();

    if (source.includes("webform")) return "webform";
    if (source.includes("survey")) return "survey";
    if (source.includes("chat") || source.includes("chatbot")) return "chatbot";

    // Keep this aligned with All Conversations: blank source defaults to Chatbot.
    if (!source) return "chatbot";

    return "other";
  };

  const formatSourceName = (source) => {
    if (source === "webform") return "Web Form";
    if (source === "survey") return "Survey";
    if (source === "chatbot") return "Chatbot";

    return "Other";
  };

  const normalizeDateKey = (key) => {
    if (!key) return "";

    const stringKey = String(key);

    // GA4 may return dates as YYYYMMDD. Convert to YYYY-MM-DD for chart matching.
    if (stringKey.length === 8 && !stringKey.includes("-")) {
      return `${stringKey.slice(0, 4)}-${stringKey.slice(4, 6)}-${stringKey.slice(
        6,
        8
      )}`;
    }

    return stringKey;
  };

  const saveReportToHistory = () => {
    const newReport = {
      id: Date.now(),
      reportName: reportDisplayName,
      selectedRange,
      selectedCommunity,
      activeTabName,
      createdAt: new Date().toISOString(),
      fileType: "PDF",
    };

    const updatedHistory = [newReport, ...reportHistory];

    localStorage.setItem(
      REPORT_HISTORY_STORAGE_KEY,
      JSON.stringify(updatedHistory)
    );
    setReportHistory(updatedHistory);
  };

  const handleSaveReportName = () => {
    const cleanName = reportName.trim();

    // Empty names intentionally fall back to the default report name.
    if (!cleanName) {
      setSavedReportName("");
      return;
    }

    setSavedReportName(cleanName);
  };

  const handleReportNameChange = (event) => {
    setReportName(event.target.value);

    // If the user edits the input after saving, require them to save the new name.
    setSavedReportName("");
  };

  const handleDeleteReport = (reportId) => {
    const updatedHistory = reportHistory.filter(
      (report) => report.id !== reportId
    );

    localStorage.setItem(
      REPORT_HISTORY_STORAGE_KEY,
      JSON.stringify(updatedHistory)
    );
    setReportHistory(updatedHistory);
  };

  const generateRecommendations = () => {
    const visitors = gaData?.totals?.activeUsers || 0;
    const leads = totalLeads;
    const conversionRate = visitors > 0 ? (leads / visitors) * 100 : 0;
    const topSource = [...sourceData].sort((a, b) => b.value - a.value)[0];
    const recommendations = [];

    if (visitors > 30 && conversionRate < 3) {
      recommendations.push({
        title: "Improve Lead Conversion",
        insight: `${visitors} visitors but only ${leads} leads.`,
        recommendation:
          "Improve your CTA, simplify forms, or offer a guide before asking for contact information.",
      });
    }

    if (visitors > 50 && leads === 0) {
      recommendations.push({
        title: "Traffic Not Converting",
        insight: `${visitors} visitors with zero leads.`,
        recommendation:
          "Move the chatbot earlier in the visitor journey and highlight scheduling or pricing faster.",
      });
    }

    if (visitors < 20) {
      recommendations.push({
        title: "Increase Traffic",
        insight: `Only ${visitors} visitors.`,
        recommendation: "Focus on SEO, local pages, and paid campaigns.",
      });
    }

    if (topSource) {
      recommendations.push({
        title: "Top Lead Source",
        insight: `${topSource.name} is your strongest lead source.`,
        recommendation: "Double down on this channel and optimize it further.",
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        title: "Performance Stable",
        insight: "Your traffic and leads look healthy.",
        recommendation: "Keep monitoring. More insights will appear as data grows.",
      });
    }

    return recommendations;
  };

  const handleGeneratePdf = () => {
    try {
      generateDashboardPdf({
        reportName: reportDisplayName,
        selectedRange,
        selectedCommunity,
        activeTabName,
        visitors: gaData?.totals?.activeUsers || 0,
        totalLeads,
        webformLeads,
        chatLeads,
        surveyLeads,
        toursScheduled,
        moveIns,
        leadTrendData,
        sourceData,
        recommendations: generateRecommendations(),
      });

      saveReportToHistory();
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("Failed to generate PDF");
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);

        const leads = await apiService.getLeads();
        const ga = await getAnalyticsTraffic();

        setGaData(ga);

        const uniqueCommunities = [
          ...new Set(
            leads.map((lead) => lead.communityName || lead.community || "Unknown")
          ),
        ];

        setCommunities(uniqueCommunities);

        const filteredLeads =
          selectedCommunity === "all"
            ? leads
            : leads.filter(
                (lead) =>
                  (lead.communityName || lead.community || "Unknown") ===
                  selectedCommunity
              );

        setTotalLeads(filteredLeads.length);

        const webformCount = filteredLeads.filter(
          (lead) => getLeadSourceType(lead) === "webform"
        ).length;

        const surveyCount = filteredLeads.filter(
          (lead) => getLeadSourceType(lead) === "survey"
        ).length;

        const chatCount = filteredLeads.filter(
          (lead) => getLeadSourceType(lead) === "chatbot"
        ).length;

        setWebformLeads(webformCount);
        setSurveyLeads(surveyCount);
        setChatLeads(chatCount);

        setToursScheduled(
          filteredLeads.filter(
            (lead) => (lead.status || "").toLowerCase() === "tour scheduled"
          ).length
        );

        setMoveIns(
          filteredLeads.filter(
            (lead) => (lead.status || "").toLowerCase() === "converted"
          ).length
        );

        const grouped = {};
        const sourceMap = {};

        filteredLeads.forEach((lead) => {
          if (!lead.createdAt) return;

          const dateObj = new Date(lead.createdAt);
          const dateKey = dateObj.toISOString().split("T")[0];
          const sourceType = getLeadSourceType(lead);

          grouped[dateKey] = (grouped[dateKey] || 0) + 1;
          sourceMap[sourceType] = (sourceMap[sourceType] || 0) + 1;
        });

        const gaDaily = [...(ga?.daily || [])].sort(
          (a, b) =>
            new Date(normalizeDateKey(a.dateKey)) -
            new Date(normalizeDateKey(b.dateKey))
        );

        const gaMap = gaDaily.reduce((map, day) => {
          const normalizedKey = normalizeDateKey(day.dateKey);
          map[normalizedKey] = Number(day.activeUsers) || 0;
          return map;
        }, {});

        let chartData = [];

        if (selectedRange === "all") {
          const allDates = [
            ...new Set([...Object.keys(gaMap), ...Object.keys(grouped)]),
          ].sort();

          chartData = allDates.map((key) => {
            const leadCount = grouped[key] || 0;

            return {
              date: new Date(key).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
              visitors: gaMap[key] || 0,
              leads: leadCount,
              interactions: leadCount * 3,
            };
          });
        } else {
          const days = Number(selectedRange);
          const today = new Date();

          for (let i = days - 1; i >= 0; i -= 1) {
            const date = new Date();
            date.setDate(today.getDate() - i);

            const key = date.toISOString().split("T")[0];
            const leadCount = grouped[key] || 0;

            chartData.push({
              date: date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
              visitors: gaMap[key] || 0,
              leads: leadCount,
              interactions: leadCount * 3,
            });
          }
        }

        setLeadTrendData(chartData);

        const totalSourceCount = Object.values(sourceMap).reduce(
          (sum, count) => sum + count,
          0
        );

        setSourceData(
          Object.keys(sourceMap).map((key) => ({
            key,
            name: formatSourceName(key),
            value: sourceMap[key],
            percent:
              totalSourceCount > 0
                ? Math.round((sourceMap[key] / totalSourceCount) * 100)
                : 0,
          }))
        );
      } catch (error) {
        console.error("Error loading stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [selectedCommunity, selectedRange]);

  return (
    <div className="stats-page">
      <Header user={user} onLogout={onLogout} />

      <main id="report-content" className="stats-content">
        <section className="stats-top-row">
          <div>
            <h1 className="stats-title">Web Analytics Report</h1>
            <p className="stats-subtitle">
              Chatbot performance and lead activity
            </p>
          </div>

          <div className="stats-actions">
            <div
              className={`report-name-field ${
                savedReportName ? "is-saved" : ""
              }`}
            >
              <input
                type="text"
                placeholder="Enter report name"
                value={reportName}
                onChange={handleReportNameChange}
              />

              {reportName.trim() && (
                <button
                  type="button"
                  className="report-name-save-btn"
                  onClick={handleSaveReportName}
                  aria-label="Save report name"
                >
                  {savedReportName ? "Saved ✓" : "Save"}
                </button>
              )}
            </div>

            <button className="stats-primary-button" onClick={handleGeneratePdf}>
              Generate Report
            </button>
          </div>
        </section>

        <section className="stats-filters">
          <select
            value={selectedRange}
            onChange={(event) => setSelectedRange(event.target.value)}
          >
            <option value="30">Last 30 days</option>
            <option value="7">Last 7 days</option>
            <option value="all">All time</option>
          </select>

          <select
            value={selectedCommunity}
            onChange={(event) => setSelectedCommunity(event.target.value)}
          >
            <option value="all">Any community or group</option>

            {communities.map((community) => (
              <option key={community} value={community}>
                {community}
              </option>
            ))}
          </select>

          <select>
            <option>Filter Traffic Sources</option>
            <option>Chatbot</option>
            <option>Survey</option>
            <option>Web Form</option>
          </select>

          <select>
            <option>Filter Channels</option>
            <option>Website</option>
          </select>
        </section>

        <section className="stats-tabs">
          {TABS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setActiveTabName(item)}
              className={activeTabName === item ? "active" : ""}
            >
              {item}
            </button>
          ))}
        </section>

        {loading ? (
          <div className="stats-loading">Loading analytics...</div>
        ) : (
          <>
            {activeTabName === "Overview" && (
              <>
                <section className="stats-kpi-grid">
                  <Metric
                    label="Visitors"
                    value={gaData?.totals?.activeUsers || 0}
                    subtext="Live from Google Analytics"
                    icon={Users}
                    variant="blue"
                  />

                  <Metric
                    label="Total Leads"
                    value={totalLeads}
                    subtext="All lead sources"
                    icon={UserRoundCheck}
                    variant="purple"
                  />

                  <Metric
                    label="Webform Leads"
                    value={webformLeads}
                    subtext="From web forms"
                    icon={ClipboardList}
                    variant="green"
                  />

                  <Metric
                    label="Chat Leads"
                    value={chatLeads}
                    subtext="From chatbot"
                    icon={MessageSquareText}
                    variant="orange"
                  />

                  <Metric
                    label="Survey Leads"
                    value={surveyLeads}
                    subtext="From assessments"
                    icon={CheckCircle2}
                    variant="teal"
                  />

                  <Metric
                    label="Tours Scheduled"
                    value={toursScheduled}
                    subtext="Based on lead status"
                    icon={CalendarDays}
                    variant="blue"
                  />

                  <Metric
                    label="Move-ins"
                    value={moveIns}
                    subtext="Converted leads"
                    icon={House}
                    variant="green"
                  />
                </section>

                <section className="stats-chart-grid">
                  <div className="stats-card">
                    <h3>Visitors, Leads, and Interactions</h3>

                    {leadTrendData.length === 0 ? (
                      <p className="stats-empty">No analytics data available yet.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={320}>
                        <AreaChart
                          data={leadTrendData}
                          margin={{ top: 10, right: 10, left: -30, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />

                          <Area
                            type="natural"
                            dataKey="visitors"
                            stroke="#2563eb"
                            fill="#dbeafe"
                            strokeWidth={2}
                          />

                          <Line
                            type="natural"
                            dataKey="leads"
                            stroke="#f97316"
                            strokeWidth={3}
                            dot={{ r: 4 }}
                          />

                          <Line
                            type="natural"
                            dataKey="interactions"
                            stroke="#16a34a"
                            strokeWidth={3}
                            dot={{ r: 4 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  <div className="stats-card">
                    <h3>Leads by Source</h3>

                    {sourceData.length === 0 ? (
                      <p className="stats-empty">No source data available.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={320}>
                        <PieChart>
                          <Pie
                            data={sourceData}
                            dataKey="value"
                            nameKey="name"
                            outerRadius={100}
                            legendType="circle"
                          >
                            {sourceData.map((entry) => (
                              <Cell
                                key={entry.key}
                                fill={SOURCE_COLORS[entry.key] || SOURCE_COLORS.other}
                              />
                            ))}
                          </Pie>

                          <Legend
                            verticalAlign="bottom"
                            align="center"
                            iconType="circle"
                            formatter={(value, entry) => {
                              const percent = entry?.payload?.percent ?? 0;
                              return `${value}: ${percent}%`;
                            }}
                            wrapperStyle={{
                              paddingTop: "18px",
                              fontSize: "14px",
                              fontWeight: 500,
                              color: "#475569",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </section>
              </>
            )}

            {activeTabName === "Insights" && (
              <section className="stats-insights-grid">
                {generateRecommendations().map((item) => (
                  <div key={item.title} className="stats-insight-card">
                    <p className="stats-insight-label">AI Recommendation</p>
                    <h3>{item.title}</h3>
                    <p>
                      <strong>Insight:</strong> {item.insight}
                    </p>
                    <p>
                      <strong>Recommendation:</strong> {item.recommendation}
                    </p>
                  </div>
                ))}
              </section>
            )}

            {activeTabName === "Conversation Analytics" && (
              <PlaceholderTab
                title="Conversation Analytics"
                description="Conversation volume, common questions, chatbot engagement, drop-off points, and user behavior patterns will appear here."
              />
            )}

            {activeTabName === "Instant Answers Analytics" && (
              <PlaceholderTab
                title="Instant Answers Analytics"
                description="Instant answer usage, unresolved questions, helpful responses, and content gaps will appear here."
              />
            )}

            {activeTabName === "Report History" && (
              <ReportHistory
                reportHistory={reportHistory}
                onDeleteReport={handleDeleteReport}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};

const Metric = ({ label, value, subtext, icon: Icon, variant = "blue" }) => (
  <div className={`stats-metric-card metric-${variant}`}>
    <div className="stats-metric-icon">
      {Icon && <Icon size={22} strokeWidth={2.4} />}
    </div>

    <p className="stats-metric-label">{label}</p>
    <p className="stats-metric-value">{formatNumber(value)}</p>
    <p className="stats-metric-subtext">{subtext}</p>
  </div>
);

const PlaceholderTab = ({ title, description }) => (
  <div className="stats-placeholder-card">
    <h2>{title}</h2>
    <p>{description}</p>
    <div>Coming soon</div>
  </div>
);

const ReportHistory = ({ reportHistory, onDeleteReport }) => (
  <section className="report-history-card">
    <div className="report-history-header">
      <div>
        <h2>Report History</h2>
        <p>Recently generated PDF reports from this browser.</p>
      </div>
    </div>

    {reportHistory.length === 0 ? (
      <div className="report-history-empty">
        <h3>No reports generated yet</h3>
        <p>Generate a report to see it listed here.</p>
      </div>
    ) : (
      <div className="report-history-list">
        {reportHistory.map((report) => (
          <div key={report.id} className="report-history-item">
            <div>
              <h3>{report.reportName}</h3>

              <p>
                {report.fileType} • {new Date(report.createdAt).toLocaleDateString()}
              </p>

              <p className="report-history-meta">
                Range:{" "}
                {report.selectedRange === "all"
                  ? "All time"
                  : `Last ${report.selectedRange} days`}{" "}
                • Community:{" "}
                {report.selectedCommunity === "all"
                  ? "Any community or group"
                  : report.selectedCommunity}
              </p>
            </div>

            <button
              type="button"
              className="report-delete-button"
              onClick={() => onDeleteReport(report.id)}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    )}
  </section>
);

const formatNumber = (num) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num;
};

export default Stats;
