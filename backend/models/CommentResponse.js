const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Enhanced Comment Response Schema
 * Tracks comment responses sent through the auto-response system
 * with automatic cleanup and enforced limits to prevent database bloat.
 */
const CommentResponseSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Reference to the monitor that triggered this response
  monitor: {
    type: Schema.Types.ObjectId,
    ref: 'CommentMonitor',
    required: true
  },
  // Reference to the rule that matched (if any)
  rule: {
    type: Schema.Types.ObjectId,
    ref: 'CommentResponseRule'
  },
  // Facebook page info
  pageId: {
    type: String,
    required: true
  },
  pageName: {
    type: String,
    required: true
  },
  // Facebook post info
  postId: {
    type: String,
    required: true
  },
  // Comment details
  commentId: {
    type: String,
    required: true
  },
  // Modified to handle empty comments with fallback
  commentText: {
    type: String,
    default: '(No text content)',
    maxlength: 500 // Reduced from 1000 to further prevent DB bloat
  },
  commentCreatedTime: {
    type: Date,
    required: true
  },
  commenterName: String,
  commenterId: String,
  // Response details
  responseText: {
    type: String,
    default: '(No response content)',
    maxlength: 500 // Reduced from 1000 to further prevent DB bloat
  },
  // Response status
  success: {
    type: Boolean,
    default: false
  },
  // Facebook message ID (if sent successfully)
  responseMessageId: String,
  // Error details (if any)
  error: {
    message: String,
    code: String
  },
  // Processing details
  processingTimeMs: Number,
  retryCount: {
    type: Number,
    default: 0
  },
  // Enhanced features
  // Sentiment analysis of comment
  sentiment: {
    type: String,
    enum: ['positive', 'negative', 'neutral'],
    default: 'neutral'
  },
  // Source of the response (rule, default, etc.)
  responseSource: {
    type: String,
    enum: ['rule', 'default', 'recovery', ''],
    default: ''
  },
  // Was this comment detected as potential spam
  isSpam: {
    type: Boolean,
    default: false
  },
  // Meta tags for analytics and filtering (limited to 5 tags max)
  tags: {
    type: [String],
    validate: [arrayLimit, 'Tags exceed the limit of 5 items']
  },
  // System-managed expiration date - automatically set to 3 days from creation
  expiresAt: {
    type: Date,
    default: function() {
      const date = new Date();
      date.setDate(date.getDate() + 3); // Default 3 days TTL
      return date;
    },
    index: true // Add index for TTL cleanup
  }
}, { 
  timestamps: true
});

// Validator for limiting array size
function arrayLimit(val) {
  return val.length <= 5;
}

// Create indexes for efficient querying
CommentResponseSchema.index({ user: 1 });
CommentResponseSchema.index({ monitor: 1 });
CommentResponseSchema.index({ 'rule': 1 });
CommentResponseSchema.index({ postId: 1 });
CommentResponseSchema.index({ commentId: 1 }, { unique: true }); // Ensure no duplicate responses
CommentResponseSchema.index({ createdAt: 1 });
CommentResponseSchema.index({ success: 1 });
CommentResponseSchema.index({ sentiment: 1 });
CommentResponseSchema.index({ isSpam: 1 });

// TTL index for automatic cleanup of old records
// Records will be automatically deleted after 3 days by default
CommentResponseSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for the age of the response (for filtering/display)
CommentResponseSchema.virtual('age').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24)); // Age in days
});

// Pre-save middleware to ensure TTL can't be extended too far
CommentResponseSchema.pre('save', function(next) {
  // Calculate maximum allowed TTL (7 days from now)
  const maxExpiryDate = new Date();
  maxExpiryDate.setDate(maxExpiryDate.getDate() + 7);
  
  // If expiresAt is more than 7 days away, set it to 7 days
  if (this.expiresAt > maxExpiryDate) {
    this.expiresAt = maxExpiryDate;
  }
  
  next();
});

// Add static method for cleaning up old responses
CommentResponseSchema.statics.cleanupOldResponses = async function(days = 3) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  try {
    const result = await this.deleteMany({ createdAt: { $lt: cutoffDate } });
    return {
      success: true,
      deletedCount: result.deletedCount,
      message: `Deleted ${result.deletedCount} responses older than ${days} days`
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
};

module.exports = mongoose.model('CommentResponse', CommentResponseSchema);