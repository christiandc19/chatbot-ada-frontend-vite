import React, { useEffect, useState } from "react";
import Header from "./Header";
// 🔥 NEW: Import GA4 API
import { getAnalyticsTraffic } from "../services/analyticsService";
import apiService from "../services/apiService";
import {
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Legend,
} from "recharts";

const Stats = ({ user, onLogout }) => {
  const [leadTrendData, setLeadTrendData] = useState([]);
  const [sourceData, setSourceData] = useState([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [todayLeads, setTodayLeads] = useState(0);
  const [weekLeads, setWeekLeads] = useState(0);
  const [selectedCommunity, setSelectedCommunity] = useState("all");
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  // 🔥 NEW: GA4 analytics state
  const [gaData, setGaData] = useState(null);

useEffect(() => {
  const fetchStats = async () => {
    try {
      setLoading(true);

      // 🔥 EXISTING: Leads data
      const leads = await apiService.getLeads();

      // 🔥 NEW: Fetch GA4 data
      const ga = await getAnalyticsTraffic();
      setGaData(ga);

      const uniqueCommunities = [
        ...new Set(
          leads.map(
            (lead) => lead.communityName || lead.community || "Unknown"
          )
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

      const today = new Date();
      const todayKey = today.toISOString().split("T")[0];

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 6);
      oneWeekAgo.setHours(0, 0, 0, 0);

      let todayCount = 0;
      let weekCount = 0;
      const grouped = {};
      const sourceMap = {};

      filteredLeads.forEach((lead) => {
        if (!lead.createdAt) return;

        const dateObj = new Date(lead.createdAt);
        const dateKey = dateObj.toISOString().split("T")[0];

        grouped[dateKey] = (grouped[dateKey] || 0) + 1;

        const source = lead.source || "Chatbot";
        sourceMap[source] = (sourceMap[source] || 0) + 1;

        if (dateKey === todayKey) todayCount++;
        if (dateObj >= oneWeekAgo) weekCount++;
      });

      setTodayLeads(todayCount);
      setWeekLeads(weekCount);

      const chartData = Object.keys(grouped)
        .sort()
        .map((key) => ({
          date: new Date(key).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          leads: grouped[key],

          // 🔥 UPDATED: Replace fake calculations with GA data fallback
          interactions: grouped[key] * 3,
          visitors: ga?.totals?.activeUsers || 0,
        }));

      setLeadTrendData(chartData);

      const pieData = Object.keys(sourceMap).map((key) => ({
        name: key,
        value: sourceMap[key],
      }));

      setSourceData(pieData);
    } catch (err) {
      console.error("Error loading stats:", err);
    } finally {
      setLoading(false);
    }
  };

  fetchStats();
}, [selectedCommunity]);


  return (
    <div style={pageWrapper}>
      <Header user={user} onLogout={onLogout} />

      <div style={contentWrapper}>
        <div style={topRow}>
          <div>
            <h1 style={pageTitle}>Web Analytics Report</h1>
            <p style={pageSubtitle}>Chatbot performance and lead activity</p>
          </div>

          <div style={buttonGroup}>
            <button style={primaryButton}>Save Report</button>
            <button style={outlineButton}>Send As PDF</button>
          </div>
        </div>

        <div style={filterRow}>
          <select style={filterSelect}>
            <option>Last 30 days</option>
            <option>Last 7 days</option>
            <option>All time</option>
          </select>

          <select
            value={selectedCommunity}
            onChange={(e) => setSelectedCommunity(e.target.value)}
            style={filterSelect}
          >
            <option value="all">Any community or group</option>

            {communities.map((community, index) => (
              <option key={index} value={community}>
                {community}
              </option>
            ))}
          </select>

          <select style={filterSelect}>
            <option>Filter Traffic Sources</option>
            <option>Chatbot</option>
          </select>

          <select style={filterSelect}>
            <option>Filter Channels</option>
            <option>Website</option>
          </select>
        </div>

        <div style={tabsRow}>
          <span style={activeTab}>Overview</span>
          <span style={tab}>Insights</span>
          <span style={tab}>Conversation Analytics</span>
          <span style={tab}>Instant Answers Analytics</span>
          <span style={tab}>Saved Reports</span>
        </div>

        {loading ? (
          <div style={loadingBox}>Loading analytics...</div>
        ) : (
          <>
            <div style={kpiRow}>
              <Metric
                label="Visitors"
                value={gaData?.totals?.activeUsers || 0} // 🔥 REAL GA4 DATA
                subtext="Live from Google Analytics"
              />
              <Metric
                label="Interactions"
                value={totalLeads * 3 || 0} // (still estimated)
                subtext="Estimated chatbot activity"
              />
              <Metric
                label="Leads"
                value={totalLeads}
                subtext={`${weekLeads} this week`}
              />
              <Metric
                label="Tours Scheduled"
                value={0}
                subtext="Coming soon"
              />
              <Metric label="Move-ins" value={0} subtext="Coming soon" />
            </div>

            <div style={chartGrid}>
              <div style={chartCard}>
                <h3 style={chartTitle}>Visitors, Leads, and Interactions</h3>

                {leadTrendData.length === 0 ? (
                  <p style={emptyText}>
                    No lead activity yet for this selection.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={leadTrendData}>
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
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div style={chartCard}>
                <h3 style={chartTitle}>Leads by Source</h3>

                {sourceData.length === 0 ? (
                  <p style={emptyText}>No source data available.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={sourceData}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={110}
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const formatNumber = (num) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num;
};

const Metric = ({ label, value, subtext }) => (
  <div style={metricBox}>
    <p style={metricLabel}>{label}</p>
    <p style={metricValue}>{formatNumber(value)}</p>
    <p style={metricSubtext}>{subtext}</p>
  </div>
);

const pageWrapper = {
  marginLeft: "250px",
  minHeight: "100vh",
  width: "calc(100% - 250px)",
  background: "#f5f7fa",
};

const contentWrapper = {
  padding: "32px",
};

const topRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "28px",
};

const pageTitle = {
  margin: 0,
  fontSize: "28px",
};

const pageSubtitle = {
  marginTop: "8px",
  color: "#6b7280",
};

const buttonGroup = {
  display: "flex",
  gap: "10px",
};

const primaryButton = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  padding: "10px 16px",
  borderRadius: "6px",
  fontWeight: 600,
  cursor: "pointer",
};

const outlineButton = {
  background: "#fff",
  color: "#2563eb",
  border: "1px solid #2563eb",
  padding: "10px 16px",
  borderRadius: "6px",
  fontWeight: 600,
  cursor: "pointer",
};

const filterRow = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "16px",
  marginBottom: "24px",
};

const filterSelect = {
  height: "42px",
  padding: "0 12px",
  background: "#fff",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
};

const tabsRow = {
  display: "flex",
  gap: "26px",
  borderBottom: "1px solid #d1d5db",
  marginBottom: "34px",
};

const activeTab = {
  paddingBottom: "12px",
  borderBottom: "2px solid #111827",
  fontWeight: 700,
};

const tab = {
  paddingBottom: "12px",
  color: "#111827",
};

const kpiRow = {
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  borderTop: "1px solid #e5e7eb",
  borderBottom: "1px solid #e5e7eb",
  marginBottom: "42px",
};

const metricBox = {
  padding: "16px 20px",
  borderRight: "1px solid #e5e7eb",
};

const metricLabel = {
  margin: 0,
  fontSize: "12px",
  color: "#6b7280",
  fontWeight: 500,
};

const metricValue = {
  margin: "6px 0 0",
  fontSize: "26px",
  fontWeight: 600,
};

const metricSubtext = {
  margin: "4px 0 0",
  fontSize: "12px",
  color: "#6b7280",
};

const chartGrid = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr",
  gap: "24px",
};

const chartCard = {
  background: "#fff",
  padding: "24px",
  borderRadius: "12px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
};

const chartTitle = {
  marginTop: 0,
  marginBottom: "20px",
};

const emptyText = {
  color: "#6b7280",
};

const loadingBox = {
  background: "#fff",
  padding: "32px",
  borderRadius: "12px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
  color: "#6b7280",
};

export default Stats;