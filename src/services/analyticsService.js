// 🔥 NEW: Handles GA4 API calls to your .NET backend

const API_BASE_URL = "http://localhost:5297";

export async function getAnalyticsTraffic() {
  const response = await fetch(`${API_BASE_URL}/api/analytics/traffic`);

  if (!response.ok) {
    throw new Error("Failed to fetch analytics data");
  }

  return response.json();
}