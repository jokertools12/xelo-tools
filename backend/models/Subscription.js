const mongoose = require('mongoose');

const subscriptionSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MembershipPlan',
    required: true
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled', 'pending'],
    default: 'pending'
  },
  autoRenew: {
    type: Boolean,
    default: false
  },
  renewalHistory: [{
    date: Date,
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MembershipPlan'
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    }
  }],
  renewalAttempts: [{
    date: Date,
    status: {
      type: String,
      enum: ['failed', 'success'],
      default: 'failed'
    },
    reason: String,
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MembershipPlan'
    },
    planPrice: Number,
    availableBalance: Number
  }],
  createdBy: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  }
}, {
  timestamps: true
});

// Index to make queries faster
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ endDate: 1, status: 1 });

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;