const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * PageMessageCampaign Schema for professional campaign management with
 * rich messaging features, scheduling, and detailed tracking
 */
const PageMessageCampaignSchema = new Schema({
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
  // Recipients from page messages
  recipients: [{
    id: String,
    name: String,
    lastInteraction: Date,
    metadata: Schema.Types.Mixed // Additional data that may be useful
  }],
  recipientCount: {
    type: Number,
    default: function() {
      return this.recipients ? this.recipients.length : 0;
    }
  },
  // Message content
  messageType: {
    type: String,
    enum: ['text', 'image', 'video', 'buttons', 'quickReplies', 'enhancedButtons'],
    default: 'text',
    required: true
  },
  messageText: {
    type: String,
    trim: true,
    validate: {
      validator: function(value) {
        // Require text for text messages
        return this.messageType !== 'text' || (value && value.trim().length > 0);
      },
      message: 'يجب توفير نص الرسالة عند اختيار نوع الرسالة النصي'
    }
  },
  imageUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(value) {
        // Require image URL for image messages
        return this.messageType !== 'image' || (value && value.trim().length > 0);
      },
      message: 'يجب توفير رابط الصورة عند اختيار نوع الرسالة صورة'
    }
  },
  videoUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(value) {
        // Require video URL for video messages
        return this.messageType !== 'video' || (value && value.trim().length > 0);
      },
      message: 'يجب توفير رابط الفيديو عند اختيار نوع الرسالة فيديو'
    }
  },
  // Buttons (quick replies and URL buttons)
  quickReplyButtons: [{
    type: {
      type: String,
      enum: ['text', 'url', 'postback', 'quickReply'],
      default: 'text'
    },
    text: {
      type: String,
      required: true,
      trim: true
    },
    payload: {
      type: String,
      trim: true
    },
    url: {
      type: String,
      trim: true,
      validate: {
        validator: function(value) {
          // URL is required only for URL button type
          return this.type !== 'url' || (value && value.trim().length > 0);
        },
        message: 'يجب توفير رابط للزر من نوع رابط'
      }
    }
  }],
  // Scheduling options
  scheduled: {
    type: Boolean,
    default: false
  },
  scheduledTime: {
    type: Date,
    validate: {
      validator: function(value) {
        // Bypass validation completely for existing campaigns that are being processed
        // or already past their scheduled time but are being handled
        if (!this.isNew && ['processing', 'completed', 'paused', 'failed', 'canceled'].includes(this.status)) {
          return true;
        }
        
        // For new campaigns or campaigns being updated (in 'draft', 'pending', or 'review' status),
        // only enforce date validation if scheduling is enabled
        if (!this.scheduled) {
          return true; // No validation needed if not scheduled
        }
        
        // For 'pending' or 'review' campaigns that already exist, allow save operations without validation
        if ((this.status === 'pending' || this.status === 'review') && !this.isNew) {
          return true;
        }
        
        // For immediate execution (when scheduledTime is within 1 minute of current time)
        const currentTime = new Date();
        const oneMinuteFromNow = new Date(currentTime.getTime() + 60000); // 1 minute in milliseconds
        
        if (value && value <= oneMinuteFromNow && value >= currentTime) {
          return true; // Allow scheduling within the next minute
        }
        
        // Otherwise ensure the date is in the future
        return value && value > currentTime;
      },
      message: 'تاريخ الجدولة يجب أن يكون في المستقبل'
    }
  },
  // Enhanced delay options for advanced throttling
  enableDelay: {
    type: Boolean,
    default: true
  },
  delayMode: {
    type: String,
    enum: ['fixed', 'random', 'incremental', 'adaptive'],
    default: 'fixed'
  },
  delaySeconds: {
    type: Number,
    default: 5,
    min: 2,
    max: 60
  },
  // Random delay mode options
  minDelaySeconds: {
    type: Number,
    default: 3,
    min: 2
  },
  maxDelaySeconds: {
    type: Number,
    default: 10,
    min: 3
  },
  // Incremental delay mode options
  incrementalDelayStart: {
    type: Number,
    default: 3,
    min: 2
  },
  incrementalDelayStep: {
    type: Number,
    default: 2,
    min: 1
  },
  // Message personalization options
  personalizeMessage: {
    type: Boolean,
    default: true
  },
  messagePersonalization: {
    includeUserName: {
      type: Boolean,
      default: true
    },
    includeLastInteraction: {
      type: Boolean,
      default: false
    },
    customVariables: [{
      name: String,
      value: String
    }]
  },
  // Campaign status tracking
  status: {
    type: String,
    enum: ['draft', 'pending', 'review', 'processing', 'paused', 'completed', 'failed', 'canceled'],
    default: 'draft'
  },
  // Performance tracking
  sent: {
    type: Number,
    default: 0
  },
  failed: {
    type: Number,
    default: 0
  },
  // Message results with detailed analytics
  results: [{
    recipient: {
      id: String,
      name: String
    },
    success: Boolean,
    messageId: String,
    error: String,
    errorCode: Number,
    retries: {
      type: Number,
      default: 0
    },
    responseTimeMs: Number,
    sentAt: Date
  }],
  // Metrics for messaging efficiency
  delayMetrics: [{
    messageIndex: Number,
    recipientId: String,
    targetMs: Number,
    actualMs: Number,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  // Delivery stats analysis
  deliveryStats: {
    avgResponseTimeMs: Number,
    avgDelayMs: Number,
    successRate: Number,
    completionTimeMinutes: Number,
    lastDeliveryDate: Date,
    deliveryStartDate: Date
  },
  // Point tracking
  deductedPoints: {
    type: Number,
    default: 0
  },
  pointsRefunded: {
    type: Number,
    default: 0
  },
  processingStartedAt: Date,
  processingCompletedAt: Date,
  processingAttempts: {
    type: Number,
    default: 0
  },
  // Current position for progress tracking
  current: {
    type: Number,
    default: 0
  },
  // Batch processing configuration
  batchSize: {
    type: Number,
    default: 50,
    min: 5,
    max: 200
  },
  // Campaign type
  campaignType: {
    type: String,
    enum: ['oneTime', 'recurring', 'triggered'],
    default: 'oneTime'
  },
  // For recurring campaigns
  recurringConfig: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly']
    },
    daysOfWeek: [Number], // 0=Sunday, 1=Monday, etc.
    dayOfMonth: Number,
    timeOfDay: String, // HH:MM format
    endAfterCount: Number, // End after this many occurrences
    endDate: Date // Or end on this date
  }
}, { timestamps: true });

// Add virtual for completion percentage
PageMessageCampaignSchema.virtual('completionPercentage').get(function() {
  if (!this.recipientCount) return 0;
  const processed = this.sent + this.failed;
  return Math.round((processed / this.recipientCount) * 100);
});

// Validate URL buttons have URLs
PageMessageCampaignSchema.pre('validate', function(next) {
  if (this.quickReplyButtons && this.quickReplyButtons.length > 0) {
    this.quickReplyButtons.forEach((button, index) => {
      if (button.type === 'url' && (!button.url || !button.url.trim())) {
        this.invalidate(`quickReplyButtons.${index}.url`, 'يجب توفير رابط للزر من نوع رابط');
      }
    });
  }
  
  // Validate scheduling requirements
  if (this.scheduled && !this.scheduledTime) {
    this.invalidate('scheduledTime', 'يجب تحديد وقت للجدولة');
  }
  
  // Set recipient count for new campaigns
  if (this.isNew || this.isModified('recipients')) {
    this.recipientCount = this.recipients ? this.recipients.length : 0;
  }
  
  next();
});

// Add indexes for faster querying
PageMessageCampaignSchema.index({ user: 1, status: 1 });
PageMessageCampaignSchema.index({ pageId: 1 });
PageMessageCampaignSchema.index({ scheduledTime: 1 }, { sparse: true });
PageMessageCampaignSchema.index({ createdAt: 1 });
PageMessageCampaignSchema.index({ status: 1, scheduled: 1 });

module.exports = mongoose.model('PageMessageCampaign', PageMessageCampaignSchema);