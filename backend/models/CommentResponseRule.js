const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Enhanced Comment Response Rule Schema
 * Defines intelligent rules for automatically responding to Facebook post comments
 * with support for sentiment analysis, dynamic response templates, and advanced matching
 */
const CommentResponseRuleSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  // Keywords that trigger this rule
  keywords: [{
    type: String,
    required: true,
    trim: true
  }],
  // Possible responses to use when rule matches
  responses: [{
    type: String,
    required: true,
    trim: true
  }],
  // Sentiment-specific responses (optional, for more intelligent replies)
  // If provided, these will be used instead of general responses when sentiment is detected
  sentimentResponses: {
    positive: [{
      type: String,
      trim: true
    }],
    negative: [{
      type: String,
      trim: true
    }],
    neutral: [{
      type: String,
      trim: true
    }]
  },
  // If true, response will be randomly selected from responses array
  // If false, responses will be used in order (cycling back to the beginning when exhausted)
  randomizeResponses: {
    type: Boolean,
    default: true
  },
  // Response rotation tracking - used if randomizeResponses is false
  responseRotation: {
    lastUsedIndex: {
      type: Number,
      default: 0
    },
    resetAfterAllUsed: {
      type: Boolean,
      default: true
    }
  },
  // Whether to use case-sensitive matching for keywords
  caseSensitive: {
    type: Boolean,
    default: false
  },
  // Whether rule is active
  isActive: {
    type: Boolean,
    default: true
  },
  // Whether to match exact words only (vs. substring matches)
  exactMatch: {
    type: Boolean,
    default: false
  },
  // Advanced matching options
  matchingOptions: {
    // Whether to use regex matching for keywords
    enableRegex: {
      type: Boolean,
      default: false
    },
    // Minimum comment length to apply this rule (to avoid very short comments)
    minCommentLength: {
      type: Number,
      default: 0
    },
    // Maximum comment length to apply this rule (to avoid very long comments)
    maxCommentLength: {
      type: Number,
      default: 0
    },
    // Whether to apply rule to comments that appear to be questions
    applyToQuestions: {
      type: Boolean,
      default: true
    },
    // Whether to apply rule to comments with images/attachments
    applyToMediaComments: {
      type: Boolean,
      default: true
    }
  },
  // Time-based activation
  scheduleSettings: {
    // Whether to enable time-based activation
    enableScheduling: {
      type: Boolean,
      default: false
    },
    // Days of week to activate rule (0-6, Sunday is 0)
    activeDays: {
      type: [Number],
      default: [0, 1, 2, 3, 4, 5, 6]
    },
    // Start time (24-hour format, '08:00')
    startTime: {
      type: String,
      default: '00:00'
    },
    // End time (24-hour format, '20:00')
    endTime: {
      type: String,
      default: '23:59'
    }
  },
  // Response template settings
  templateSettings: {
    // Whether to enable template processing in responses
    enableTemplates: {
      type: Boolean,
      default: false
    },
    // Custom variables for templates (JSON string)
    customVariables: {
      type: String,
      default: '{}'
    }
  },
  // Statistics
  stats: {
    timesTriggered: {
      type: Number,
      default: 0
    },
    lastTriggered: Date,
    // Detailed stats by sentiment
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
    // Which responses were used how many times
    responseUsage: [{
      responseIndex: Number,
      count: {
        type: Number,
        default: 0
      }
    }],
    // Success rate
    successRate: {
      type: Number,
      default: 0
    }
  },
  // Priority for rule application (higher priority rules are processed first)
  priority: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Make sure each user has unique rule names
CommentResponseRuleSchema.index({ user: 1, name: 1 }, { unique: true });
CommentResponseRuleSchema.index({ isActive: 1 });
CommentResponseRuleSchema.index({ priority: 1 });

// Virtual for response count
CommentResponseRuleSchema.virtual('responseCount').get(function() {
  return this.responses.length;
});

// Method to check if rule is currently active based on scheduling
CommentResponseRuleSchema.methods.isActiveNow = function() {
  // If rule isn't active at all, return false
  if (!this.isActive) {
    return false;
  }
  
  // If scheduling isn't enabled, it's active if the rule itself is active
  if (!this.scheduleSettings || !this.scheduleSettings.enableScheduling) {
    return true;
  }
  
  // Check if current time is within scheduled time
  const now = new Date();
  const day = now.getDay(); // 0-6, Sunday is 0
  
  // Check if current day is in active days
  if (!this.scheduleSettings.activeDays.includes(day)) {
    return false;
  }
  
  // Parse start and end times
  const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes
  
  let startTimeParts = (this.scheduleSettings.startTime || '00:00').split(':');
  let endTimeParts = (this.scheduleSettings.endTime || '23:59').split(':');
  
  const startTimeMinutes = parseInt(startTimeParts[0]) * 60 + parseInt(startTimeParts[1]);
  const endTimeMinutes = parseInt(endTimeParts[0]) * 60 + parseInt(endTimeParts[1]);
  
  // Check if current time is between start and end times
  return currentTime >= startTimeMinutes && currentTime <= endTimeMinutes;
};

// Method to get next response based on rule settings
CommentResponseRuleSchema.methods.getNextResponse = function(sentiment) {
  // If sentiment-specific responses are defined and sentiment is provided, use those
  if (sentiment && 
      this.sentimentResponses && 
      this.sentimentResponses[sentiment] && 
      this.sentimentResponses[sentiment].length > 0) {
    
    // Select from sentiment-specific responses
    if (this.randomizeResponses) {
      // Random selection
      const randomIndex = Math.floor(Math.random() * this.sentimentResponses[sentiment].length);
      return this.sentimentResponses[sentiment][randomIndex];
    } else {
      // Sequential selection
      const nextIndex = this.responseRotation.lastUsedIndex % this.sentimentResponses[sentiment].length;
      // Update rotation index
      this.responseRotation.lastUsedIndex = (this.responseRotation.lastUsedIndex + 1) % this.sentimentResponses[sentiment].length;
      // Save is handled by the caller
      return this.sentimentResponses[sentiment][nextIndex];
    }
  }
  
  // Fall back to regular responses
  if (!this.responses || this.responses.length === 0) {
    return 'Thank you for your comment!';
  }
  
  if (this.randomizeResponses) {
    // Random selection
    const randomIndex = Math.floor(Math.random() * this.responses.length);
    return this.responses[randomIndex];
  } else {
    // Sequential selection
    const nextIndex = this.responseRotation.lastUsedIndex % this.responses.length;
    // Update rotation index
    this.responseRotation.lastUsedIndex = (this.responseRotation.lastUsedIndex + 1) % this.responses.length;
    // Save is handled by the caller
    return this.responses[nextIndex];
  }
};

module.exports = mongoose.model('CommentResponseRule', CommentResponseRuleSchema);