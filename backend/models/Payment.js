const mongoose = require('mongoose');

const paymentSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: false
  },
  amount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['vodafone_cash', 'etisalat_cash', 'electronic_wallets', 'wallet']
  },
  referenceNumber: {
    type: String,
    required: function() {
      // Only required for non-wallet payment methods
      return this.paymentMethod !== 'wallet';
    }
  },
  phoneNumber: {
    type: String,
    required: function() {
      // Only required for non-wallet payment methods
      return this.paymentMethod !== 'wallet';
    }
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'rejected'],
    default: 'pending'
  },
  adminNote: {
    type: String
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: {
    type: Date
  },
  screenshot: {
    type: String // URL to a payment screenshot uploaded by the user
  }
}, {
  timestamps: true
});

// Create index for userId for faster queries
paymentSchema.index({ userId: 1 });
// Create index for status
paymentSchema.index({ status: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;