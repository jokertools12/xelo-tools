const mongoose = require('mongoose');

/**
 * نموذج UserAchievement لتخزين الإنجازات المفتوحة للمستخدمين
 * يربط بين المستخدمين وإنجازاتهم مع تتبع التقدم والحالة
 */
const userAchievementSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    achievementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Achievement',
      required: true
    },
    unlocked: {
      type: Boolean,
      default: false
    },
    progress: {
      type: Number,
      default: 0
    },
    unlockDate: {
      type: Date,
      default: null
    },
    viewed: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// إنشاء فهرس مركب لضمان عدم تكرار الإنجازات لنفس المستخدم
userAchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });

// إنشاء الكائن من النموذج
const UserAchievement = mongoose.model('UserAchievement', userAchievementSchema);

module.exports = UserAchievement;