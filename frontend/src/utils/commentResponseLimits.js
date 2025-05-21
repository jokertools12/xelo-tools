/**
 * System limits for Comment Response System
 * 
 * This file defines the minimum and maximum values for various settings
 * in the comment response system. These limits are enforced both in the
 * frontend and backend to ensure consistency and system stability.
 */

// Rate limiting constraints
export const RATE_LIMITS = {
  MIN_SECONDS_BETWEEN_RESPONSES: 10,
  MAX_RESPONSES_PER_HOUR: 30,
};

// Monitoring constraints
export const MONITOR_LIMITS = {
  MIN_CHECK_FREQUENCY_MINUTES: 5,
  MAX_CHECK_FREQUENCY_MINUTES: 60,
  MIN_POSTS: 1,
  MAX_POSTS_PER_MONITOR: {
    free: 50,
    basic: 100,
    premium: 200,
    enterprise: 500
  }
};

// Data retention constraints
export const DATA_LIMITS = {
  MIN_RESPONSE_RETENTION: 100,
  MAX_RESPONSE_RETENTION: 10000,
  MIN_AUTO_ARCHIVE_DAYS: 1,
  MAX_AUTO_ARCHIVE_DAYS: 14,
};

// Comment filtering constraints
export const FILTER_LIMITS = {
  MIN_COMMENT_LENGTH: 0,
  MAX_COMMENT_LENGTH: 1000,
};

// Get max posts limit based on membership level
export const getMaxPostsLimit = (membershipLevel) => {
  const level = membershipLevel?.toLowerCase() || 'free';
  return MONITOR_LIMITS.MAX_POSTS_PER_MONITOR[level] || MONITOR_LIMITS.MAX_POSTS_PER_MONITOR.free;
};

// Default values for new monitors
export const DEFAULT_MONITOR_SETTINGS = {
  checkFrequencyMinutes: 5,
  maxPostsToMonitor: 50,
  rateLimiting: {
    maxResponsesPerHour: 30,
    minSecondsBetweenResponses: 10,
    prioritizeNewerComments: true
  },
  dataManagement: {
    responseRetentionLimit: 1000,
    autoArchiveAfterDays: 7
  },
  filters: {
    minCommentLength: 0,
    skipSpam: true
  }
};

export default {
  RATE_LIMITS,
  MONITOR_LIMITS,
  DATA_LIMITS,
  FILTER_LIMITS,
  getMaxPostsLimit,
  DEFAULT_MONITOR_SETTINGS
};