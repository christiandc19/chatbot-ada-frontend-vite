/**
 * Utility functions for consistent date and time formatting across the application.
 * All functions automatically use the user's local timezone and locale.
 *
 * IMPORTANT:
 * Server timestamps are assumed to be in UTC format.
 * If a timestamp doesn't have timezone info, we append "Z" to treat it as UTC.
 */

const ensureUTCFormat = (timestamp) => {
  if (!timestamp) return null;

  if (timestamp instanceof Date) return timestamp;

  if (typeof timestamp === "string") {
    const hasTimezone =
      timestamp.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(timestamp);

    if (!hasTimezone) {
      return timestamp + "Z";
    }
  }

  return timestamp;
};

export const formatLocalDate = (timestamp) => {
  if (!timestamp) return "N/A";

  try {
    const utcTimestamp = ensureUTCFormat(timestamp);
    const date = new Date(utcTimestamp);
    return date.toLocaleDateString();
  } catch (error) {
    console.warn("Invalid date format:", timestamp);
    return "Invalid Date";
  }
};

export const formatLocalTime = (timestamp) => {
  if (!timestamp) return "N/A";

  try {
    const utcTimestamp = ensureUTCFormat(timestamp);
    const date = new Date(utcTimestamp);

    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch (error) {
    console.warn("Invalid date format:", timestamp);
    return "Invalid Time";
  }
};

export const formatLocalDateTime = (timestamp) => {
  if (!timestamp) return "N/A";

  try {
    const utcTimestamp = ensureUTCFormat(timestamp);
    const date = new Date(utcTimestamp);

    return date.toLocaleString([], {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch (error) {
    console.warn("Invalid date format:", timestamp);
    return "Invalid Date";
  }
};

export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return "N/A";

  try {
    const utcTimestamp = ensureUTCFormat(timestamp);
    const date = new Date(utcTimestamp);
    const now = new Date();

    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return "Just now";

    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`;
    }

    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`;
    }

    if (diffInDays === 1) return "Yesterday";

    if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    }

    return formatLocalDateTime(timestamp);
  } catch (error) {
    console.warn("Invalid date format:", timestamp);
    return "Invalid Date";
  }
};

/**
 * Formats dates inside message bubble text.
 *
 * Example:
 * "Call Request: 2026-05-07 9:00 AM"
 *
 * Becomes:
 * "Call Request: May 07, 2026 at 9:00AM"
 */
export const formatBubbleDateText = (text) => {
  if (!text) return "";

  return text.replace(
    /Call Request:\s*(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})\s*(AM|PM|am|pm)?/g,
    (_, datePart, timePart, meridiem) => {
      const rawDate = `${datePart} ${timePart} ${meridiem || ""}`.trim();
      const date = new Date(rawDate);

      if (Number.isNaN(date.getTime())) {
        return `Call Request: ${datePart} ${timePart}`;
      }

      const formattedDate = date.toLocaleDateString("en-US", {
        month: "long",
        day: "2-digit",
        year: "numeric",
      });

      const formattedTime = date
        .toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
        .replace(" ", "");

      return `Call Request: ${formattedDate} at ${formattedTime}`;
    }
  );
};