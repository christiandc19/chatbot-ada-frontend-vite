// Handles GA4 API calls to your .NET backend.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export async function getAnalyticsTraffic(clientKey = "default") {
  // NEW: Add the selected clientKey to the analytics request.
  // Example:
  // /api/analytics/traffic?clientKey=evergreen-heights
  const url = `${API_BASE_URL}/analytics/traffic?clientKey=${encodeURIComponent(
    clientKey
  )}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch analytics data");
  }

  return response.json();
}