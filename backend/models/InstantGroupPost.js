const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InstantGroupPostSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  groups: {
    type: [String],
    required: true,
    validate: [
      {
        validator: function(arr) {
          return arr.length > 0;
        },
        message: 'يجب تحديد مجموعة واحدة على الأقل'
      }
    ]
  },
  totalGroups: {
    type: Number,
    default: function() {
      return this.groups.length;
    }
  },
  postType: {
    type: String,
    required: true,
    enum: ['text', 'imageUrl', 'videoUrl']
  },
  messageText: {
    type: String,
    required: true,
    trim: true
  },
  imageUrl: {
    type: String,
    trim: true,
    default: ''
  },
  videoUrl: {
    type: String,
    trim: true,
    default: ''
  },
  enableRandomCode: {
    type: Boolean,
    default: false
  },
  accessToken: {
    type: String,
    required: true
  },
  enableDelay: {
    type: Boolean,
    default: false
  },
  delay: {
    type: Number,
    default: 3,
    min: 1,
    max: 60
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'canceled'],
    default: 'pending'
  },
  successCount: {
    type: Number,
    default: 0
  },
  failureCount: {
    type: Number,
    default: 0
  },
  results: [
    {
      group: {
        id: String
      },
      success: Boolean,
      postId: String,
      error: String,
      postedAt: Date
    }
  ],
  processingStartedAt: Date,
  processingCompletedAt: Date,
  deductedPoints: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Add index for faster querying
InstantGroupPostSchema.index({ user: 1, status: 1 });
InstantGroupPostSchema.index({ createdAt: 1 });

module.exports = mongoose.model('InstantGroupPost', InstantGroupPostSchema);