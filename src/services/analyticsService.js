// 🔥 NEW: Handles GA4 API calls to your .NET backend

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export async function getAnalyticsTraffic() {
  const response = await fetch(`${API_BASE_URL}/analytics/traffic`);

  if (!response.ok) {
    throw new Error("Failed to fetch analytics data");
  }

  return response.json();
}