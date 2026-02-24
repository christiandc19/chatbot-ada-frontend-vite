/**
 * Utility functions for consistent date and time formatting across the application
 * All functions automatically use the user's local timezone and locale
 * 
 * IMPORTANT: Server timestamps are assumed to be in UTC format.
 * If a timestamp doesn't have timezone info (no 'Z' or '+' offset), 
 * we append 'Z' to explicitly treat it as UTC before converting to local time.
 */

/**
 * Helper function to convert server timestamps to proper UTC format
 * @param {string|Date} timestamp - The timestamp from server
 * @returns {string} Properly formatted timestamp string
 */
const ensureUTCFormat = (timestamp) => {
  if (!timestamp) return null;
  
  // If it's already a Date object, return as is
  if (timestamp instanceof Date) return timestamp;
  
  // If timestamp is a string and doesn't have timezone info, treat as UTC
  if (typeof timestamp === 'string') {
    // Check if it already has timezone info (Z, +HH:mm, or -HH:mm pattern)
    const hasTimezone = timestamp.endsWith('Z') || 
                       /[+-]\d{2}:?\d{2}$/.test(timestamp);
    
    if (!hasTimezone) {
      return timestamp + 'Z'; // Add 'Z' to indicate UTC
    }
  }
  
  return timestamp;
};

/**
 * Format a date to show date only in user's local timezone
 * @param {string|Date} timestamp - The timestamp to format (assumed to be UTC from server)
 * @returns {string} Formatted date string (e.g., "2/24/2026")
 */
export const formatLocalDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  try {
    const utcTimestamp = ensureUTCFormat(timestamp);
    const date = new Date(utcTimestamp);
    return date.toLocaleDateString();
  } catch (error) {
    console.warn('Invalid date format:', timestamp);
    return 'Invalid Date';
  }
};

/**
 * Format a timestamp to show time only in user's local timezone
 * @param {string|Date} timestamp - The timestamp to format (assumed to be UTC from server)
 * @returns {string} Formatted time string (e.g., "3:45 PM")
 */
export const formatLocalTime = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  try {
    const utcTimestamp = ensureUTCFormat(timestamp);
    const date = new Date(utcTimestamp);
    return date.toLocaleTimeString([], { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  } catch (error) {
    console.warn('Invalid date format:', timestamp);
    return 'Invalid Time';
  }
};

/**
 * Format a timestamp to show both date and time in user's local timezone
 * @param {string|Date} timestamp - The timestamp to format (assumed to be UTC from server)
 * @returns {string} Formatted date and time string (e.g., "2/24/2026, 3:45 PM")
 */
export const formatLocalDateTime = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  try {
    const utcTimestamp = ensureUTCFormat(timestamp);
    const date = new Date(utcTimestamp);
    return date.toLocaleString([], {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.warn('Invalid date format:', timestamp);
    return 'Invalid Date';
  }
};

/**
 * Format a timestamp to show a relative time (e.g., "2 hours ago", "Yesterday")
 * Falls back to absolute date/time for older timestamps
 * @param {string|Date} timestamp - The timestamp to format (assumed to be UTC from server)
 * @returns {string} Formatted relative or absolute time string
 */
export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  try {
    const utcTimestamp = ensureUTCFormat(timestamp);
    const date = new Date(utcTimestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      // For older dates, show the full date and time
      return formatLocalDateTime(timestamp);
    }
  } catch (error) {
    console.warn('Invalid date format:', timestamp);
    return 'Invalid Date';
  }
};