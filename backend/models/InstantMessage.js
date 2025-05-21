const mongoose = require('mongoose');

const instantMessageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['individual', 'bulk'],
      default: 'individual'
    },
    pageId: {
      type: String,
      required: true
    },
    pageName: {
      type: String
    },
    accessToken: {
      type: String,
      required: true
    },
    recipient: {
      id: {
        type: String,
        required: true
      },
      name: {
        type: String,
        default: ''
      }
    },
    messageType: {
      type: String,
      required: true,
      enum: ['text', 'image', 'video', 'buttons', 'enhancedButtons', 'quickReplies']
    },
    messageText: {
      type: String,
      default: ''
    },
    mediaUrl: {
      type: String
    },
    imageUrl: {
      type: String
    },
    videoUrl: {
      type: String
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
    status: {
      type: String,
      enum: ['queued', 'processing', 'completed', 'failed'],
      default: 'queued'
    },
    deductedPoints: {
      type: Number,
      default: 1
    },
    pointsRefunded: {
      type: Number,
      default: 0
    },
    refundTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    },
    result: {
      success: Boolean,
      messageId: String,
      error: String,
      errorCode: String,
      processingTimeMs: Number
    },
    messageId: {
      type: String
    },
    processingLock: {
      type: Boolean,
      default: false
    },
    processingLockAcquiredAt: {
      type: Date
    },
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
    processingError: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

// Create index for efficient processing queries
instantMessageSchema.index({ status: 1, processingLock: 1 });
instantMessageSchema.index({ status: 1, processingLockAcquiredAt: 1 });
instantMessageSchema.index({ user: 1, status: 1 });

const InstantMessage = mongoose.model('InstantMessage', instantMessageSchema);

module.exports = InstantMessage;