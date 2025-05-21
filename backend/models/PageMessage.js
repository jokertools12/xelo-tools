const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PageMessageSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
  senders: [{
    id: String,
    name: String,
    lastInteraction: Date
  }],
  extractedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Add index for more efficient lookups
PageMessageSchema.index({ user: 1, pageId: 1 });

module.exports = mongoose.model('PageMessage', PageMessageSchema);