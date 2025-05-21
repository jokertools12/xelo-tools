const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ScheduledPostSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  scheduledTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'canceled'],
    default: 'pending'
  },
  postType: {
    type: String,
    required: true,
    enum: ['text', 'imageUrl', 'videoUrl']
  },
  messageText: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    default: ''
  },
  videoUrl: {
    type: String,
    default: ''
  },
  enableRandomCode: {
    type: Boolean,
    default: false
  },
  groups: {
    type: [String],
    required: true
  },
  enableDelay: {
    type: Boolean,
    default: false
  },
  delay: {
    type: Number,
    default: 3
  },
  accessToken: {
    type: String,
    required: true
  },
  deductedPoints: {
    type: Number,
    default: 0
  },
  results: {
    successCount: {
      type: Number,
      default: 0
    },
    failureCount: {
      type: Number,
      default: 0
    },
    completedAt: {
      type: Date,
      default: null
    },
    totalTime: {
      type: Number,
      default: 0
    },
    averageTime: {
      type: Number,
      default: 0
    }
  }
  // Retry functionality has been removed as per requirements
}, { timestamps: true });

// Create an index on scheduledTime for efficient querying
ScheduledPostSchema.index({ scheduledTime: 1 });

// Create an index on user for efficient querying
ScheduledPostSchema.index({ user: 1 });

module.exports = mongoose.model('scheduledPost', ScheduledPostSchema);