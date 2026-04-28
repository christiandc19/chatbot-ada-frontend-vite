import React, { useEffect, useState } from "react";
import Header from "./Header";
import { getAnalyticsTraffic } from "../services/analyticsService";
import apiService from "../services/apiService";
import "./Stats.css";

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
} from "recharts";

const tabs = [
  "Overview",
  "Insights",
  "Conversation Analytics",
  "Instant Answers Analytics",
  "Saved Reports",
];

const Stats = ({ user, onLogout }) => {
  const [leadTrendData, setLeadTrendData] = useState([]);
  const [sourceData, setSourceData] = useState([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [weekLeads, setWeekLeads] = useState(0);
  const [selectedCommunity, setSelectedCommunity] = useState("all");
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gaData, setGaData] = useState(null);
  const [activeTabName, setActiveTabName] = useState("Overview");
  const [selectedRange, setSelectedRange] = useState("30");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);

        const leads = await apiService.getLeads();
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

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 6);
        oneWeekAgo.setHours(0, 0, 0, 0);

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

          if (dateObj >= oneWeekAgo) weekCount++;
        });

        setWeekLeads(weekCount);

        const normalizeDateKey = (key) => {
          if (!key) return "";

          const stringKey = String(key);

          if (stringKey.length === 8 && !stringKey.includes("-")) {
            return `${stringKey.slice(0, 4)}-${stringKey.slice(
              4,
              6
            )}-${stringKey.slice(6, 8)}`;
          }

          return stringKey;
        };

        const gaDaily = [...(ga?.daily || [])].sort(
          (a, b) =>
            new Date(normalizeDateKey(a.dateKey)) -
            new Date(normalizeDateKey(b.dateKey))
        );

        const gaMap = {};

        gaDaily.forEach((day) => {
          const normalizedKey = normalizeDateKey(day.dateKey);
          gaMap[normalizedKey] = Number(day.activeUsers) || 0;
        });

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

          for (let i = days - 1; i >= 0; i--) {
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
  }, [selectedCommunity, selectedRange]);

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
          "Improve CTA, simplify forms, or offer a guide before asking for contact info.",
      });
    }

    if (visitors > 50 && leads === 0) {
      recommendations.push({
        title: "Traffic Not Converting",
        insight: `${visitors} visitors with zero leads.`,
        recommendation:
          "Move chatbot earlier and highlight scheduling or pricing faster.",
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
        recommendation:
          "Keep monitoring. More insights will appear as data grows.",
      });
    }

    return recommendations;
  };

  return (
    <div className="stats-page">
      <Header user={user} onLogout={onLogout} />

      <main className="stats-content">
        <section className="stats-top-row">
          <div>
            <h1 className="stats-title">Web Analytics Report</h1>
            <p className="stats-subtitle">
              Chatbot performance and lead activity
            </p>
          </div>

          <div className="stats-actions">
            <button className="stats-primary-button">Save Report</button>
            <button className="stats-primary-button">Send As PDF</button>
          </div>
        </section>

        <section className="stats-filters">
          <select
            value={selectedRange}
            onChange={(e) => setSelectedRange(e.target.value)}
          >
            <option value="30">Last 30 days</option>
            <option value="7">Last 7 days</option>
            <option value="all">All time</option>
          </select>

          <select
            value={selectedCommunity}
            onChange={(e) => setSelectedCommunity(e.target.value)}
          >
            <option value="all">Any community or group</option>

            {communities.map((community, index) => (
              <option key={index} value={community}>
                {community}
              </option>
            ))}
          </select>

          <select>
            <option>Filter Traffic Sources</option>
            <option>Chatbot</option>
          </select>

          <select>
            <option>Filter Channels</option>
            <option>Website</option>
          </select>
        </section>

        <section className="stats-tabs">
          {tabs.map((item) => (
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
                  />

                  <Metric
                    label="Interactions"
                    value={totalLeads * 3 || 0}
                    subtext="Estimated chatbot activity"
                  />

                  <Metric
                    label="Leads"
                    value={totalLeads}
                    subtext={`${weekLeads} this week`}
                  />

                  <Metric label="Tours Scheduled" value={0} subtext="Coming soon" />

                  <Metric label="Move-ins" value={0} subtext="Coming soon" />
                </section>

                <section className="stats-chart-grid">
                  <div className="stats-card">
                    <h3>Visitors, Leads, and Interactions</h3>

                    {leadTrendData.length === 0 ? (
                      <p className="stats-empty">No analytics data available yet.</p>
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
                </section>
              </>
            )}

            {activeTabName === "Insights" && (
              <section className="stats-insights-grid">
                {generateRecommendations().map((item, index) => (
                  <div key={index} className="stats-insight-card">
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

            {activeTabName === "Saved Reports" && (
              <PlaceholderTab
                title="Saved Reports"
                description="Saved PDF reports, scheduled exports, and shared analytics reports will appear here."
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};

const Metric = ({ label, value, subtext }) => (
  <div className="stats-metric-card">
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

const formatNumber = (num) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num;
};

export default Stats;