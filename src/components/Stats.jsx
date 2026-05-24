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

  // NEW: Traffic analytics icons
  Globe,
  Activity,
  Eye,
  Layers3,
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

  // NEW: Used for the Traffic Channels horizontal bar chart.
  BarChart,
  Bar,
  LabelList,
} from "recharts";

// These are the main dashboard tabs.
// We are keeping "Overview" for the current KPI cards and charts.
// The new tabs are organized by analytics category.
const TABS = [
  "Overview",
  "Traffic",
  "Leads",
  "Chatbot",
  "Surveys",
  "Audience",
  "Reports",
];

const DEFAULT_REPORT_NAME = "Web Analytics Report";
const REPORT_HISTORY_STORAGE_KEY = "reportHistory";

const SOURCE_COLORS = {
  chatbot: "#2563eb",
  survey: "#16a34a",
  webform: "#f97316",
  manual: "#7c3aed",
  other: "#94a3b8",
};

const Stats = ({ user, onLogout }) => {
  const [leadTrendData, setLeadTrendData] = useState([]);
  const [sourceData, setSourceData] = useState([]);
  const [totalLeads, setTotalLeads] = useState(0);
  // NEW:
  // Default the Stats dashboard to Evergreen Heights.
  // This automatically filters the page to the Evergreen Heights community
  // when the dashboard first loads.
  const [selectedCommunity, setSelectedCommunity] = useState("evergreen-heights");
  // Controls the Lead Source dropdown filter.
  const [selectedLeadSource, setSelectedLeadSource] = useState("all");  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gaData, setGaData] = useState(null);
  const [activeTabName, setActiveTabName] = useState("Overview");
  const [selectedRange, setSelectedRange] = useState("30");
  const [reportName, setReportName] = useState("");
  const [savedReportName, setSavedReportName] = useState("");
  // NEW:
  // Controls the tooltip shown when the Generate Report button is disabled.
  const [showReportTooltip, setShowReportTooltip] = useState(false);
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

  // NEW:
  // The report name now comes directly from the input.
  // The Generate Report button stays disabled until the user types a name.
  const reportDisplayName = useMemo(() => {
    return reportName.trim();
  }, [reportName]);

    const getLeadSourceType = (lead) => {
      const source = (lead?.source || lead?.leadSource || "").toLowerCase();

      if (source.includes("webform")) return "webform";
      if (source.includes("survey")) return "survey";
      if (source.includes("manual")) return "manual";
      if (source.includes("chat") || source.includes("chatbot")) return "chatbot";

      // Blank source should still default to chatbot for older existing leads.
      if (!source) return "chatbot";

      return "other";
    };

    const formatSourceName = (source) => {
      if (source === "webform") return "Web Form";
      if (source === "survey") return "Survey";
      if (source === "chatbot") return "Chatbot";
      if (source === "manual") return "Manual";

      return "Other";
    };


    // Converts clientKey values into a safe format for comparison.
    // Example: " Evergreen-Heights " becomes "evergreen-heights".
    const normalizeClientKey = (value) => {
      return String(value || "").trim().toLowerCase();
    };

  // NEW:
  // Converts clientKey values into readable community names.
  // Example:
  // "asbury-heights" → "Asbury Heights"
  const formatCommunityName = (clientKey) => {
    if (!clientKey) return "Unknown Community";

    const communityNames = {
      "evergreen-heights": "Evergreen Heights",
      "asbury-heights": "Asbury Heights",
      "robin-run": "Robin Run",
      "web-smart-assistant": "Web Smart Assistant",
    };

    // Use custom name if available.
    if (communityNames[clientKey]) {
      return communityNames[clientKey];
    }

    // Fallback formatting for future communities.
    return clientKey
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
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

  // NEW:
  // Updates the report name as the user types.
  // No separate "Save" button is needed anymore.
  const handleReportNameChange = (event) => {
    setReportName(event.target.value);
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
        // NEW: Send the selected community/client to the analytics endpoint.
        // For now, "all" uses the default GA4 property.
        const analyticsClientKey =
          selectedCommunity === "all" ? "default" : selectedCommunity;

        let ga = null;

        try {
          ga = await getAnalyticsTraffic(analyticsClientKey);
        } catch (gaError) {
          console.warn(
            "No GA data available for this community:",
            analyticsClientKey,
            gaError
          );

          ga = {
            totals: {
              activeUsers: 0,
              sessions: 0,
              screenPageViews: 0,
            },
            daily: [],
            trafficChannels: [],
            topPages: [],
          };
        }

        setGaData(ga);

        // NEW: Load communities dynamically from the database.
        const communitiesData = await apiService.getCommunities();

        // Convert database communities into dropdown-friendly names.
        // Example:
        // "https://asburyheights.org"
        // becomes:
        // "asbury-heights"
        const formattedCommunities = communitiesData
          .map((community) => {
            if (!community.clientKey) return null;
            return community.clientKey;
          })
          .filter(Boolean);

        setCommunities([...new Set(formattedCommunities)]);


        const filteredLeads = leads.filter((lead) => {

        const leadClientKey =
          lead.clientKey ||
          lead.ClientKey ||
          "";

        const matchesCommunity =
          selectedCommunity === "all" ||
          String(leadClientKey).toLowerCase() ===
            String(selectedCommunity).toLowerCase();

          // Lead source filter
          const leadSourceType = getLeadSourceType(lead);

          const matchesLeadSource =
            selectedLeadSource === "all" ||
            leadSourceType === selectedLeadSource;

          return matchesCommunity && matchesLeadSource;
        });

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
      }, [selectedCommunity, selectedRange, selectedLeadSource]);

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
                placeholder="Enter Report Name"
                value={reportName}
                onChange={handleReportNameChange}
              />

            </div>

          <div
            className="report-generate-wrap"
            onMouseEnter={() => {
              if (!reportName.trim()) setShowReportTooltip(true);
            }}
            onMouseLeave={() => setShowReportTooltip(false)}
          >
            <button
              className="stats-primary-button"
              onClick={handleGeneratePdf}
              disabled={!reportName.trim()}
            >
              Generate Report
            </button>

            {showReportTooltip && !reportName.trim() && (
              <div className="report-tooltip">
                Enter a Report Name
              </div>
            )}
          </div>

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
          {/* 
            NEW:
            "All Communities" is for admin-wide reporting.
            For now, Evergreen Heights is added manually so the default value
            has a matching dropdown option.
          */}
          <option value="all">All Communities</option>

          <option value="evergreen-heights">Evergreen Heights</option>

          {communities
            .filter((community) => community !== "evergreen-heights")
            .map((community) => (
              <option key={community} value={community}>
                {formatCommunityName(community)}
              </option>
            ))}
            </select>

          <select
            value={selectedLeadSource}
            onChange={(event) => setSelectedLeadSource(event.target.value)}
          >
            <option value="all">All Lead Sources</option>
            <option value="chatbot">Chatbot</option>
            <option value="survey">Survey</option>
            <option value="webform">Web Form</option>
            <option value="manual">Manual</option>
            <option value="other">Other</option>
          </select>

          {/* <select>
            <option>Filter Channels</option>
            <option>Website</option>
          </select> */}
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
                <div className="stats-loading">
        <div className="stats-loader-spinner" />

        <div className="stats-loader-text">
          Loading analytics...
        </div>
      </div>
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
                      <ResponsiveContainer width="100%" height={240}>
                        <AreaChart
                          data={leadTrendData}
                          margin={{ top: 10, right: 10, left: -30, bottom: 0 }}
                        >
                          <CartesianGrid
                              stroke="#e2e8f0"
                              vertical={false}
                            />
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



        {/* Traffic tab - GA4 website traffic data will go here */}
        {/* ========================================
            Traffic Analytics Tab
        ======================================== */}
        {activeTabName === "Traffic" && (
          <section className="stats-chart-grid">

            {/* Traffic channels card */}
            <div className="stats-card">
              <h3>Traffic Channels</h3>

              <p className="stats-card-subtitle">
                Website traffic sources from Google Analytics.
              </p>

              {!gaData?.trafficChannels?.length ? (
                <p className="stats-empty">
                  No traffic channel data available yet.
                </p>
              ) : (
                <>
                  {/* NEW: Horizontal bar chart for traffic channels */}
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={gaData.trafficChannels}
                      layout="vertical"
                      margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
                    >
                      <CartesianGrid
                        stroke="#e2e8f0"
                        vertical={false}
                      />

                      {/* Bottom numbers */}
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        axisLine={false}
                        tickLine={false}
                      />

                      {/* Left channel labels */}
                      <YAxis
                        type="category"
                        dataKey="channel"
                        width={120}
                        axisLine={false}
                        tickLine={false}
                      />

                        <Tooltip
                          cursor={{ fill: "rgba(37, 99, 235, 0.06)" }}
                          contentStyle={{
                            border: "1px solid #e2e8f0",
                            borderRadius: "14px",
                            boxShadow: "0 18px 40px rgba(15, 23, 42, 0.12)",
                            padding: "10px 12px",
                          }}
                          labelStyle={{
                            color: "#0f172a",
                            fontWeight: 700,
                            marginBottom: "4px",
                          }}
                          itemStyle={{
                            color: "#2563eb",
                            fontWeight: 600,
                          }}
                        />

                      {/* NEW: Shows users by traffic channel */}
                      <Bar
                        dataKey="activeUsers"
                        name="Users"
                        fill="#2563eb"
                        radius={[0, 8, 8, 0]}
                      >
                        {/* NEW: Shows the user count at the end of each bar */}
                        <LabelList
                          dataKey="activeUsers"
                          position="right"
                          formatter={(value) => `${formatNumber(value)} users`}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                </>
              )}

            </div>


          {/* Top pages card */}
          <div className="stats-card">
            <h3>Top Pages</h3>

            <p className="stats-card-subtitle">
              Most visited pages from Google Analytics.
            </p>

            {!gaData?.topPages?.length ? (
              <p className="stats-empty">
                No top page data available yet.
              </p>
            ) : (
              <div className="traffic-summary-list">

                {gaData.topPages.map((page) => (
                  <div
                    key={page.pageTitle}
                    className="traffic-summary-item"
                  >
                    <div className="traffic-summary-label">
                      <Eye size={16} />

                      <span title={page.pageTitle}>
                        {shortenText(page.pageTitle)}
                      </span>
                    </div>

                      {formatNumber(page.views)} views
                  </div>
                ))}

              </div>
            )}
          </div>


          {/* ========================================
              Traffic Overview Summary
          ======================================== */}
          <div className="stats-card traffic-overview-wide">
            <h3>Traffic Overview</h3>

            <p className="stats-card-subtitle">
              Quick summary of overall website performance.
            </p>

            <div className="traffic-overview-grid">

              <div className="traffic-overview-stat">
                <div className="traffic-summary-label">
                  <Globe size={16} />
                  <span>Total Visitors</span>
                </div>

                <strong>
                  {formatNumber(gaData?.totals?.activeUsers || 0)}
                </strong>
              </div>

              <div className="traffic-overview-stat">
                <div className="traffic-summary-label">
                  <Activity size={16} />
                  <span>Total Sessions</span>
                </div>

                <strong>
                  {formatNumber(gaData?.totals?.sessions || 0)}
                </strong>
              </div>

              <div className="traffic-overview-stat">
                <div className="traffic-summary-label">
                  <Eye size={16} />
                  <span>Page Views</span>
                </div>

                <strong>
                  {formatNumber(gaData?.totals?.screenPageViews || 0)}
                </strong>
              </div>

              <div className="traffic-overview-stat">
                <div className="traffic-summary-label">
                  <Layers3 size={16} />
                  <span>Pages / Session</span>
                </div>

                <strong>
                  {gaData?.totals?.sessions > 0
                    ? (
                        gaData.totals.screenPageViews /
                        gaData.totals.sessions
                      ).toFixed(1)
                    : "0.0"}
                </strong>
              </div>

            </div>
          </div>

          </section>
        )}




        {/* ========================================
            Leads Analytics Tab
        ======================================== */}
        {activeTabName === "Leads" && (
          <section className="stats-chart-grid">

            {/* Lead source breakdown */}
            <div className="stats-card">
              <h3>Lead Sources</h3>

              <p className="stats-card-subtitle">
                Breakdown of lead generation channels.
              </p>

              {sourceData.length === 0 ? (
                <p className="stats-empty">
                  No lead source data available.
                </p>
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
                          fill={
                            SOURCE_COLORS[entry.key] ||
                            SOURCE_COLORS.other
                          }
                        />
                      ))}
                    </Pie>

                    <Legend
                      verticalAlign="bottom"
                      align="center"
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Lead performance summary */}
            {/* Lead performance summary */}
            <div className="stats-card">
              <h3>AI Insights</h3>

              <p className="stats-card-subtitle">
                Smart recommendations based on your current lead activity.
              </p>

              {/* 
                NEW:
                Display AI-style recommendations generated from dashboard data.
              */}
              <div className="ai-insights-list">

                {generateRecommendations().map((item, index) => (
                  <div key={index} className="ai-insight-item">

                    <h4>{item.title}</h4>

                    <p className="ai-insight-text">
                      {item.insight}
                    </p>

                    <p className="ai-insight-recommendation">
                      {item.recommendation}
                    </p>

                  </div>
                ))}

              </div>



            </div>
          </section>
        )}


        {/* ========================================
            Chatbot Analytics Tab
        ======================================== */}
        {activeTabName === "Chatbot" && (
          <section className="stats-chatbot-grid">

            {/* Chatbot KPI cards */}
            <section className="stats-kpi-grid">

              <Metric
                label="Chat Leads"
                value={chatLeads}
                subtext="Generated from chatbot"
                icon={MessageSquareText}
                variant="orange"
              />

              <Metric
                label="Total Conversations"
                value={chatLeads}
                subtext="Tracked chatbot sessions"
                icon={Users}
                variant="blue"
              />

              <Metric
                label="Lead Conversion"
                value={`${totalLeads > 0
                  ? Math.round((chatLeads / totalLeads) * 100)
                  : 0}%`}
                subtext="Chatbot contribution"
                icon={CheckCircle2}
                variant="green"
              />

            </section>

            {/* Chatbot Insights */}
            <div className="stats-card">
              <h3>Chatbot Insights</h3>

              <p className="stats-card-subtitle">
                AI-powered chatbot performance recommendations.
              </p>

              <div className="ai-insights-list">

                <div className="ai-insight-item">
                  <h4>Chatbot Engagement</h4>

                  <p className="ai-insight-text">
                    {chatLeads} leads were generated from chatbot conversations.
                  </p>

                  <p className="ai-insight-recommendation">
                    Continue optimizing chatbot flows to improve lead capture.
                  </p>
                </div>

                <div className="ai-insight-item">
                  <h4>Lead Conversion Opportunity</h4>

                  <p className="ai-insight-text">
                    Chatbot leads represent {
                      totalLeads > 0
                        ? Math.round((chatLeads / totalLeads) * 100)
                        : 0
                    }% of all leads.
                  </p>

                  <p className="ai-insight-recommendation">
                    Add stronger calls-to-action like tours and pricing prompts.
                  </p>
                </div>

              </div>
            </div>

          </section>
        )}

          {/* ========================================
              Survey Analytics Tab
          ======================================== */}
          {activeTabName === "Surveys" && (
            <section className="stats-chatbot-grid">

              <section className="stats-kpi-grid">
                <Metric
                  label="Survey Leads"
                  value={surveyLeads}
                  subtext="Generated from assessments"
                  icon={CheckCircle2}
                  variant="teal"
                />

                <Metric
                  label="Survey Share"
                  value={`${totalLeads > 0 ? Math.round((surveyLeads / totalLeads) * 100) : 0}%`}
                  subtext="Of total leads"
                  icon={ClipboardList}
                  variant="green"
                />
              </section>

              <div className="stats-card">
                <h3>Survey Insights</h3>

                <p className="stats-card-subtitle">
                  Smart recommendations based on assessment lead activity.
                </p>

                <div className="ai-insights-list">
                  <div className="ai-insight-item">
                    <h4>Assessment Performance</h4>

                    <p className="ai-insight-text">
                      {surveyLeads} leads were generated from surveys.
                    </p>

                    <p className="ai-insight-recommendation">
                      Keep surveys visible on key pages to capture families who are still researching.
                    </p>
                  </div>
                </div>
              </div>

            </section>
          )}

          {/* ========================================
              Audience Analytics Tab
          ======================================== */}
          {activeTabName === "Audience" && (
            <section className="stats-chatbot-grid">

              {/* Audience KPI cards */}
              <section className="stats-kpi-grid">

                <Metric
                  label="Visitors"
                  value={gaData?.totals?.activeUsers || 0}
                  subtext="Active website visitors"
                  icon={Users}
                  variant="blue"
                />

                <Metric
                  label="Sessions"
                  value={gaData?.totals?.sessions || 0}
                  subtext="Website sessions"
                  icon={Activity}
                  variant="green"
                />

                <Metric
                  label="Page Views"
                  value={gaData?.totals?.screenPageViews || 0}
                  subtext="Viewed pages"
                  icon={Eye}
                  variant="purple"
                />

                <Metric
                  label="Pages / Session"
                  value={
                    gaData?.totals?.sessions > 0
                      ? (
                          gaData.totals.screenPageViews /
                          gaData.totals.sessions
                        ).toFixed(1)
                      : "0.0"
                  }
                  subtext="Average engagement"
                  icon={Layers3}
                  variant="orange"
                />

              </section>

              {/* Audience Insights */}
              <div className="stats-card">
                <h3>Audience Insights</h3>

                <p className="stats-card-subtitle">
                  AI-powered visitor engagement insights.
                </p>

                <div className="ai-insights-list">

                  <div className="ai-insight-item">
                    <h4>Visitor Activity</h4>

                    <p className="ai-insight-text">
                      {formatNumber(gaData?.totals?.activeUsers || 0)} visitors interacted with the website during the selected period.
                    </p>

                    <p className="ai-insight-recommendation">
                      Continue publishing useful content and optimizing landing pages to increase engagement.
                    </p>
                  </div>

                  <div className="ai-insight-item">
                    <h4>Engagement Quality</h4>

                    <p className="ai-insight-text">
                      Visitors viewed an average of {
                        gaData?.totals?.sessions > 0
                          ? (
                              gaData.totals.screenPageViews /
                              gaData.totals.sessions
                            ).toFixed(1)
                          : "0.0"
                      } pages per session.
                    </p>

                    <p className="ai-insight-recommendation">
                      Higher pages per session usually indicate stronger visitor engagement and exploration.
                    </p>
                  </div>

                </div>
              </div>

            </section>
          )}

        {/* Reports tab - this keeps your existing report history feature */}
        {activeTabName === "Reports" && (
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

const shortenText = (text, maxLength = 52) => {
  if (!text) return "Untitled Page";
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

const formatNumber = (num) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num;
};

export default Stats;
