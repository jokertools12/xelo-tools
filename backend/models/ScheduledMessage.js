const mongoose = require('mongoose');

/**
 * Enhanced ScheduledMessage Schema with advanced delay options,
 * metrics collection, and improved validation
 */
const ScheduledMessageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    scheduledTime: {
      type: Date,
      required: true,
      validate: {
        validator: function(value) {
          // Ensure scheduled time is in the future ONLY for new documents
          // or when the scheduledTime field is explicitly modified
          if (this.isNew || this.isModified('scheduledTime')) {
            return value > new Date();
          }
          return true; // Allow processing of existing scheduled messages
        },
        message: 'وقت الجدولة يجب أن يكون في المستقبل'
      }
    },
    recipients: {
      type: [String],
      required: true,
      validate: [
        {
          validator: function(arr) {
            return arr.length > 0;
          },
          message: 'يجب تحديد مستلم واحد على الأقل'
        },
        {
          // Validate recipient format
          validator: function(arr) {
            return arr.every(id => {
              // Accept both regular numeric IDs and t_prefixed conversation IDs
              return /^\d{5,}$/.test(id) || /^t_\d+$/.test(id) || /^(\d+)$/.test(id);
            });
          },
          message: 'بعض معرفات المستلمين غير صالحة'
        }
      ]
    },
    recipientCount: {
      type: Number,
      default: function() {
        return this.recipients.length;
      }
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
    messageType: {
      type: String,
      enum: ['text', 'image', 'video'],
      default: 'text'
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
    // Enhanced buttons support for quick replies and URL buttons
    quickReplyButtons: [{
      type: {
        type: String,
        enum: ['text', 'url'],
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
    // Enhanced delay options
    enableDelay: {
      type: Boolean,
      default: true // Default to true for better reliability
    },
    delayMode: {
      type: String,
      enum: ['fixed', 'random', 'incremental', 'adaptive'],
      default: 'fixed'
    },
    delaySeconds: {
      type: Number,
      default: 5,
      min: 2, // Increased minimum for better reliability
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
    incrementalAcceleration: {
      type: Number,
      default: 1.0, // 1.0 = linear, >1 = exponential, <1 = logarithmic
      min: 0.5,
      max: 2.0
    },
    // Adaptive delay mode options
    adaptiveBaseDelay: {
      type: Number,
      default: 3,
      min: 2
    },
    adaptiveMaxDelay: {
      type: Number,
      default: 30,
      min: 5
    },
    // Message personalization options
    personalizeMessage: {
      type: Boolean,
      default: true // Default to true for better engagement
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
      customVariables: [
        {
          name: String,
          value: String
        }
      ]
    },
    // Enhanced status tracking
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'canceled'],
      default: 'pending'
    },
    sent: {
      type: Number,
      default: 0
    },
    failed: {
      type: Number,
      default: 0
    },
    // Track current position in the recipients array for proper refund calculation
    current: {
      type: Number,
      default: 0
    },
    totalRecipients: {
      type: Number,
      default: 0
    },
    deductedPoints: {
      type: Number,
      default: 0
    },
    // Track refunded points separately for proper accounting
    pointsRefunded: {
      type: Number,
      default: 0
    },
    // Metric collection for advanced analytics
    delayMetrics: [
      {
        messageIndex: Number,
        recipientId: String,
        targetMs: Number,
        actualMs: Number,
        timestamp: {
          type: Date,
          default: Date.now
        }
      }
    ],
    // Delay analysis for feedback
    delayAnalysis: {
      isEffective: {
        type: Boolean,
        default: true
      },
      averageDelay: {
        type: Number,
        default: 0
      },
      minDelay: {
        type: Number,
        default: 0
      },
      maxDelay: {
        type: Number,
        default: 0
      },
      recommendation: String
    },
    // Detailed results for each message
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
    // Processing timestamps
    processingStartedAt: Date,
    processingCompletedAt: Date,
    // Estimated completion time for user interface
    estimatedCompletionTime: {
      type: Date
    },
    // Batch processing configuration
    batchSize: {
      type: Number,
      default: 50,
      min: 5,
      max: 200
    },
    adaptiveBatching: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Calculate total recipients on save
ScheduledMessageSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('recipients')) {
    this.totalRecipients = this.recipients.length;
    this.recipientCount = this.recipients.length;
  }
  next();
});

// Enhanced validation for delay settings
ScheduledMessageSchema.pre('validate', function(next) {
  // Validate random delay range
  if (this.delayMode === 'random' && this.minDelaySeconds >= this.maxDelaySeconds) {
    this.invalidate('minDelaySeconds', 'الحد الأدنى للتأخير يجب أن يكون أقل من الحد الأقصى');
    return next();
  }
  
  // Validate adaptive delay range
  if (this.delayMode === 'adaptive' && this.adaptiveBaseDelay >= this.adaptiveMaxDelay) {
    this.invalidate('adaptiveBaseDelay', 'تأخير الأساس التكيفي يجب أن يكون أقل من الحد الأقصى');
    return next();
  }
  
  // Validate scheduling time is in the future ONLY for new documents or explicit updates
  if ((this.isNew || this.isModified('scheduledTime')) && this.scheduledTime && this.scheduledTime <= new Date()) {
    this.invalidate('scheduledTime', 'وقت الجدولة يجب أن يكون في المستقبل');
    return next();
  }
  
  // Validate message content based on type
  if (this.messageType === 'text' && (!this.messageText || !this.messageText.trim())) {
    this.invalidate('messageText', 'يجب توفير نص الرسالة لنوع الرسالة النصي');
  } else if (this.messageType === 'image' && (!this.imageUrl || !this.imageUrl.trim())) {
    this.invalidate('imageUrl', 'يجب توفير رابط الصورة لنوع الرسالة صورة');
  } else if (this.messageType === 'video' && (!this.videoUrl || !this.videoUrl.trim())) {
    this.invalidate('videoUrl', 'يجب توفير رابط الفيديو لنوع الرسالة فيديو');
  }
  
  // Validate URL buttons have URLs
  if (this.quickReplyButtons && this.quickReplyButtons.length > 0) {
    this.quickReplyButtons.forEach((button, index) => {
      if (button.type === 'url' && (!button.url || !button.url.trim())) {
        this.invalidate(`quickReplyButtons.${index}.url`, 'يجب توفير رابط للزر من نوع رابط');
      }
    });
  }
  
  next();
});

// Add virtual for completion percentage
ScheduledMessageSchema.virtual('completionPercentage').get(function() {
  if (!this.totalRecipients) return 0;
  const processed = this.sent + this.failed;
  return Math.round((processed / this.totalRecipients) * 100);
});

// Method to update delay metrics
ScheduledMessageSchema.methods.addDelayMetric = function(messageIndex, recipientId, targetMs, actualMs) {
  this.delayMetrics.push({
    messageIndex,
    recipientId,
    targetMs,
    actualMs,
    timestamp: new Date()
  });
  
  // Update delay analysis statistics
  if (this.delayMetrics.length > 0) {
    const metrics = this.delayMetrics.map(m => m.actualMs);
    this.delayAnalysis.averageDelay = metrics.reduce((a, b) => a + b, 0) / metrics.length;
    this.delayAnalysis.minDelay = Math.min(...metrics);
    this.delayAnalysis.maxDelay = Math.max(...metrics);
    
    // Check effectiveness (within 15% of target on average)
    const targetAvg = this.delayMetrics.reduce((a, b) => a + b.targetMs, 0) / this.delayMetrics.length;
    const variancePercentage = ((this.delayAnalysis.averageDelay - targetAvg) / targetAvg) * 100;
    
    this.delayAnalysis.isEffective = variancePercentage >= -15;
    
    // Generate recommendation if needed
    if (!this.delayAnalysis.isEffective) {
      if (this.delayMode === 'fixed') {
        this.delayAnalysis.recommendation = 
          `التأخير الفعلي (${Math.round(this.delayAnalysis.averageDelay/1000)} ثانية) أقل بكثير من التأخير المحدد (${this.delaySeconds} ثانية). يُنصح بزيادة قيمة التأخير.`;
      } else if (this.delayMode === 'random') {
        this.delayAnalysis.recommendation = 
          `متوسط التأخير الفعلي (${Math.round(this.delayAnalysis.averageDelay/1000)} ثانية) أقل من النطاق المتوقع (${this.minDelaySeconds}-${this.maxDelaySeconds} ثانية). يُنصح بتعديل نطاق التأخير.`;
      } else {
        this.delayAnalysis.recommendation = 
          `التأخير الفعلي أقل من المتوقع. يُنصح بتعديل إعدادات التأخير لضمان توزيع الرسائل بشكل أفضل.`;
      }
    }
  }
  
  return this;
};

// Indexes for query performance
ScheduledMessageSchema.index({ user: 1, status: 1 });
ScheduledMessageSchema.index({ scheduledTime: 1, status: 1 });
ScheduledMessageSchema.index({ createdAt: 1 });
ScheduledMessageSchema.index({ 'results.recipient.id': 1 });

const ScheduledMessage = mongoose.model('ScheduledMessage', ScheduledMessageSchema);

module.exports = ScheduledMessage;