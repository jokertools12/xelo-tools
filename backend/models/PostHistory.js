const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PostHistorySchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  date: {
    type: Date,
    default: Date.now,
    // Add index with TTL (Time To Live) of 24 hours (86400 seconds)
    expires: 86400
  },
  postType: {
    type: String,
    required: true,
    enum: ['text', 'imageUrl', 'videoUrl']
  },
  groupCount: {
    type: Number,
    required: true,
    min: 0
  },
  successCount: {
    type: Number,
    required: true,
    min: 0
  },
  failureCount: {
    type: Number,
    required: true,
    min: 0
  },
  totalTime: {
    type: Number,
    required: true,
    min: 0
  },
  // Add new fields to store more statistics
  successRate: {
    type: String,
    default: "0.0"
  },
  averageTime: {
    type: String,
    default: "0.00"
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add virtual property for calculated success rate if it's not provided
PostHistorySchema.virtual('calculatedSuccessRate').get(function() {
  const total = this.successCount + this.failureCount;
  if (total === 0) return "0.0";
  return ((this.successCount / total) * 100).toFixed(1);
});

// Add virtual property for calculated average time if it's not provided
PostHistorySchema.virtual('calculatedAverageTime').get(function() {
  const total = this.successCount + this.failureCount;
  if (total === 0) return "0.00";
  return (this.totalTime / total).toFixed(2);
});

module.exports = mongoose.model('postHistory', PostHistorySchema);
