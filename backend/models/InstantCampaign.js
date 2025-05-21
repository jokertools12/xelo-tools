const mongoose = require('mongoose');

const instantCampaignSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['queued', 'processing', 'completed', 'failed'],
      default: 'queued'
    },
    pageId: {
      type: String,
      required: true
    },
    accessToken: {
      type: String,
      required: true
    },
    messageType: {
      type: String,
      required: true,
      enum: ['text', 'image', 'video', 'buttons', 'enhancedButtons', 'quickReplies']
    },
    messageText: {
      type: String,
      required: false,
      default: ''
    },
    imageUrl: {
      type: String,
      required: false
    },
    videoUrl: {
      type: String,
      required: false
    },
    quickReplyButtons: [{
      type: {
        type: String,
        enum: ['postback', 'url', 'quickReply']
      },
      text: String,
      payload: String,
      url: String
    }],
    recipients: [{
      id: String,
      name: String
    }],
    totalRecipients: {
      type: Number,
      default: 0
    },
    deductedPoints: {
      type: Number,
      default: 0
    },
    pointsRefunded: {
      type: Number,
      default: 0
    },
    enableDelay: {
      type: Boolean,
      default: true
    },
    delaySeconds: {
      type: Number,
      default: 3
    },
    delayMode: {
      type: String,
      enum: ['fixed', 'random', 'incremental'],
      default: 'fixed'
    },
    minDelaySeconds: {
      type: Number,
      default: 1
    },
    maxDelaySeconds: {
      type: Number,
      default: 5
    },
    incrementalDelayStart: {
      type: Number,
      default: 1
    },
    incrementalDelayStep: {
      type: Number,
      default: 1
    },
    current: {
      type: Number,
      default: 0
    },
    sent: {
      type: Number,
      default: 0
    },
    failed: {
      type: Number,
      default: 0
    },
    results: [{
      recipient: {
        id: String,
        name: String
      },
      success: Boolean,
      messageId: String,
      error: String,
      sentAt: Date
    }],
    processingStartedAt: {
      type: Date
    },
    processingCompletedAt: {
      type: Date
    },
    processingAttempts: {
      type: Number,
      default: 0
    },
    pointsInfo: {
      totalPointsDeducted: Number,
      pointsRefunded: Number,
      pointsPerMessage: Number,
      refundPolicy: String,
      lastRefundDate: Date
    },
    deliveryStats: {
      avgResponseTimeMs: Number,
      avgDelayMs: Number,
      successRate: Number,
      completionTimeMinutes: Number,
      lastDeliveryDate: Date,
      deliveryStartDate: Date
    },
    delayMetrics: [{
      messageIndex: Number,
      recipientId: String,
      targetMs: Number,
      actualMs: Number,
      mode: String,
      timestamp: Date
    }]
  },
  {
    timestamps: true
  }
);

instantCampaignSchema.pre('save', function(next) {
  // If totalRecipients is not set yet, set it based on recipients length
  if (!this.totalRecipients && this.recipients && this.recipients.length > 0) {
    this.totalRecipients = this.recipients.length;
  }
  next();
});

const InstantCampaign = mongoose.model('InstantCampaign', instantCampaignSchema);

module.exports = InstantCampaign;