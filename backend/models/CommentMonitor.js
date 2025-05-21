const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Enhanced Comment Monitor Schema
 * Defines which Facebook posts to monitor for comments
 * with enforced system limits and automatic cleanup to prevent
 * database bloat and excessive server load.
 */
const CommentMonitorSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100 // Prevent excessively long names
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500 // Prevent excessively long descriptions
  },
  // Facebook page information
  pageId: {
    type: String,
    required: true
  },
  pageName: {
    type: String,
    required: true
  },
  accessToken: {
    type: String,
    required: true
  },
  // Posts to monitor - empty array means monitor all posts on the page
  posts: [{
    id: {
      type: String,
      required: true
    },
    // Optional post message/content for reference
    message: String,
    // When post was created
    createdTime: Date,
    // Track when we last checked this post for comments
    lastChecked: {
      type: Date,
      default: Date.now
    },
    // Post-specific statistics
    stats: {
      commentsFound: {
        type: Number,
        default: 0
      },
      commentsResponded: {
        type: Number,
        default: 0
      }
    }
  }],
  // Whether to apply to all posts (true) or just the specified posts (false)
  monitorAllPosts: {
    type: Boolean,
    default: false
  },
  // Maximum number of posts to monitor (to limit processing load)
  maxPostsToMonitor: {
    type: Number,
    default: 20, // Reduced from 50 to limit load
    min: 1,
    max: 50 // Reduced from 200 to limit load
  },
  // Response rules to apply (limited to max 10 rules)
  responseRules: {
    type: [{
      type: Schema.Types.ObjectId,
      ref: 'CommentResponseRule'
    }],
    validate: [arrayLimit10, 'Exceeded limit of 10 response rules per monitor']
  },
  // Whether to respond to all comments (if true) or only those matching rules (if false)
  respondToAll: {
    type: Boolean,
    default: false
  },
  // Default response if respondToAll is true and no rules match
  defaultResponse: {
    type: String,
    trim: true,
    maxlength: 500 // Prevent excessively long default responses
  },
  // Advanced filtering options
  filters: {
    // Skip comments from specific users or IDs (comma-separated)
    excludeCommenters: {
      type: String,
      trim: true,
      default: '',
      maxlength: 1000 // Limit length to prevent excessive data
    },
    // Only reply to comments containing specific text (comma-separated)
    mustContain: {
      type: String,
      trim: true,
      default: '',
      maxlength: 1000 // Limit length
    },
    // Never reply to comments containing this text (comma-separated)
    mustNotContain: {
      type: String,
      trim: true,
      default: '',
      maxlength: 1000 // Limit length
    },
    // Min comment length to respond to (to avoid responding to very short comments)
    minCommentLength: {
      type: Number,
      default: 0,
      min: 0,
      max: 50 // Reasonable limit
    },
    // Skip comments that appear to be spam
    skipSpam: {
      type: Boolean,
      default: true
    }
  },
  // Intelligent response behavior
  responseBehavior: {
    // Use sentiment analysis to select appropriate responses
    useSentimentAnalysis: {
      type: Boolean,
      default: true
    },
    // Whether to rotate through responses (vs random selection)
    rotateResponses: {
      type: Boolean,
      default: false
    },
    // Custom prompt-based responses (may require integration with AI provider)
    enableCustomPrompts: {
      type: Boolean,
      default: false
    },
    // Prompt template (used if enableCustomPrompts is true)
    promptTemplate: {
      type: String,
      default: 'Reply to the following comment in a friendly and helpful tone: {comment}',
      maxlength: 500 // Limit length
    }
  },
  // Rate limiting to prevent too many responses - ENFORCED WITH HARD CAPS
  rateLimiting: {
    // Maximum responses per hour (0 = unlimited, but system will enforce max 30/hour regardless)
    maxResponsesPerHour: {
      type: Number,
      default: 30, // Reduced from 60 to limit load
      min: 0,
      max: 30 // Hard cap to prevent abuse
    },
    // Minimum seconds between responses
    minSecondsBetweenResponses: {
      type: Number,
      default: 30, // Increased from 10 to limit load
      min: 10, // Minimum enforced delay
      max: 3600 // Maximum 1 hour
    },
    // Prioritize newer comments when rate limited
    prioritizeNewerComments: {
      type: Boolean,
      default: true
    }
  },
  // Monitoring status
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'failed', 'archived'],
    default: 'active'
  },
  // When to stop monitoring - with enforced maximum duration
  endDate: {
    type: Date,
    validate: {
      validator: function(value) {
        if (!value) return true;
        const maxAllowedDate = new Date();
        maxAllowedDate.setDate(maxAllowedDate.getDate() + 30); // Max 30 days from now
        return value <= maxAllowedDate;
      },
      message: 'End date cannot be more than 30 days in the future'
    }
  },
  // Automatically expire this monitor (set when created)
  expiresAt: {
    type: Date,
    default: function() {
      const date = new Date();
      date.setDate(date.getDate() + 30); // Default 30 days TTL
      return date;
    }
  },
  // Monitoring frequency in minutes (how often to check for new comments)
  checkFrequencyMinutes: {
    type: Number,
    default: 15, // Increased from 5 to reduce load
    min: 5, // Minimum 5 minutes
    max: 60 // Maximum 1 hour (reduced from 1440)
  },
  // Whether to reply to comments older than the monitor creation
  replyToExistingComments: {
    type: Boolean,
    default: false
  },
  // Data management
  dataManagement: {
    // Only keep the most recent N responses in the database
    responseRetentionLimit: {
      type: Number,
      default: 300, // Reduced from 1000 to limit storage
      min: 100,
      max: 1000 // Reduced from 10000 to limit storage
    },
    // Automatically archive monitor after N days of inactivity
    autoArchiveAfterDays: {
      type: Number,
      default: 7, // Reduced from 30 to be more aggressive
      min: 1,
      max: 14 // Maximum 2 weeks
    }
  },
  // Enhanced statistics
  stats: {
    // Basic counts
    commentsFound: {
      type: Number,
      default: 0
    },
    commentsResponded: {
      type: Number,
      default: 0
    },
    totalErrorCount: {
      type: Number,
      default: 0
    },
    spamDetected: {
      type: Number,
      default: 0
    },
    // Timing
    lastCommentCheckedTime: Date,
    lastResponseTime: Date,
    // Response breakdown by sentiment
    sentimentStats: {
      positive: {
        type: Number,
        default: 0
      },
      negative: {
        type: Number,
        default: 0
      },
      neutral: {
        type: Number,
        default: 0
      }
    },
    // Response rates
    averageResponseTimeMs: {
      type: Number,
      default: 0
    }
  },
  // Notification settings
  notifications: {
    // Notify on errors
    notifyOnErrors: {
      type: Boolean,
      default: true
    },
    // Notify when rate limits are hit
    notifyOnRateLimits: {
      type: Boolean,
      default: true
    },
    // Email to notify (if empty, uses user's email)
    notificationEmail: {
      type: String,
      trim: true,
      maxlength: 100 // Reasonable limit
    }
  },
  // Errors encountered during monitoring
  lastError: {
    message: String,
    date: Date,
    code: String
  },
  // For enterprise users - log all activity
  enableDetailedLogging: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Validation function to limit array size to 10
function arrayLimit10(val) {
  return val.length <= 10;
}

// Create indexes for efficient querying
CommentMonitorSchema.index({ user: 1 });
CommentMonitorSchema.index({ status: 1 });
CommentMonitorSchema.index({ pageId: 1 });
CommentMonitorSchema.index({ 'posts.id': 1 });
CommentMonitorSchema.index({ user: 1, name: 1 }, { unique: true });
CommentMonitorSchema.index({ lastError: 1 });
CommentMonitorSchema.index({ 'stats.lastCommentCheckedTime': 1 });
CommentMonitorSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Pre-save middleware to enforce system limits
CommentMonitorSchema.pre('save', function(next) {
  // Enforce maximum limits regardless of user settings
  if (this.rateLimiting && this.rateLimiting.maxResponsesPerHour > 30) {
    this.rateLimiting.maxResponsesPerHour = 30;
  }

  if (this.rateLimiting && this.rateLimiting.minSecondsBetweenResponses < 10) {
    this.rateLimiting.minSecondsBetweenResponses = 10;
  }

  // Enforce data management limits
  if (this.dataManagement && this.dataManagement.responseRetentionLimit > 1000) {
    this.dataManagement.responseRetentionLimit = 1000;
  }

  if (this.dataManagement && this.dataManagement.autoArchiveAfterDays > 14) {
    this.dataManagement.autoArchiveAfterDays = 14;
  }

  // Ensure monitor expires automatically (system enforced)
  const maxExpiryDate = new Date();
  maxExpiryDate.setDate(maxExpiryDate.getDate() + 30); // Max 30 days
  
  if (!this.expiresAt || this.expiresAt > maxExpiryDate) {
    this.expiresAt = maxExpiryDate;
  }
  
  next();
});

// Add method to limit number of monitors per user
CommentMonitorSchema.statics.countByUser = async function(userId) {
  return this.countDocuments({ user: userId, status: { $ne: 'archived' } });
};

// Add statics method for cleanup of inactive monitors
CommentMonitorSchema.statics.cleanupInactiveMonitors = async function() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7); // 7 days of inactivity

  try {
    // Find inactive monitors
    const inactiveMonitors = await this.find({
      status: 'active',
      'stats.lastCommentCheckedTime': { $lt: cutoffDate }
    });

    // Update them to archived status
    for (const monitor of inactiveMonitors) {
      monitor.status = 'archived';
      await monitor.save();
    }

    return {
      success: true,
      archivedCount: inactiveMonitors.length
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
};

// Virtual for monitor health status
CommentMonitorSchema.virtual('healthStatus').get(function() {
  if (this.lastError && this.lastError.date) {
    const errorAge = (Date.now() - new Date(this.lastError.date).getTime()) / (1000 * 60);
    if (errorAge < 60) { // Error in the last hour
      return 'error';
    }
  }
  
  if (!this.stats.lastCommentCheckedTime) {
    return 'unknown';
  }
  
  const lastCheckAge = (Date.now() - new Date(this.stats.lastCommentCheckedTime).getTime()) / (1000 * 60);
  if (lastCheckAge > this.checkFrequencyMinutes * 2) {
    return 'warning';
  }
  
  return 'healthy';
});

// Virtual for response efficiency
CommentMonitorSchema.virtual('responseEfficiency').get(function() {
  if (this.stats.commentsFound === 0) {
    return 0;
  }
  return (this.stats.commentsResponded / this.stats.commentsFound) * 100;
});

// Virtual for active status (includes time-based checks)
CommentMonitorSchema.virtual('isActive').get(function() {
  if (this.status !== 'active') {
    return false;
  }
  
  if (this.endDate && new Date(this.endDate) < new Date()) {
    return false;
  }
  
  return true;
});

module.exports = mongoose.model('CommentMonitor', CommentMonitorSchema);