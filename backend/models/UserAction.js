const mongoose = require('mongoose');

const userActionSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    actionType: {
      type: String,
      required: true,
      enum: [
        'extraction', 'post', 'comment', 'reaction', 'account_add', 'other', 
        'login', 'profile', 'security', 'points', 'settings', 'achievement', 
        'visit', 'avatar', 'refund', 'message', 
        'subscription_create', 'subscription_cancel', 'wallet_deposit', 'points_reward', 
        'subscription_update', 'points_purchase' // تمت إضافة نوع شراء النقاط
      ]
    },
    details: {
      type: mongoose.Schema.Types.Mixed
    },
    module: {
      type: String,
      required: true
    },
    count: {
      type: Number,
      default: 1
    }
  },
  {
    timestamps: true
  }
);

// إضافة مؤشر للبحث عن العمليات اليومية للمستخدم
userActionSchema.index({ userId: 1, createdAt: 1 });

const UserAction = mongoose.model('UserAction', userActionSchema);

module.exports = UserAction;
