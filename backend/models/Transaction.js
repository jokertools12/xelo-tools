const mongoose = require('mongoose');

const transactionSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'subscription', 
      'refund', 
      'other', 
      'admin', 
      'achievement',
      'wallet_deposit',
      'wallet_withdrawal',
      'wallet_purchase',
      'wallet_payment',
      'points_purchase',
      'points_award',
      'points_deduction',
      'campaign'
    ]
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  description: {
    type: String
  },
  reference: {
    type: String
  },
  // Flag to indicate if this is a debit (money out) or credit (money in) transaction
  isDebit: {
    type: Boolean,
    default: false
  },
  // Additional metadata for transaction context
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;