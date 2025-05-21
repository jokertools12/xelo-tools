const mongoose = require('mongoose');

const achievementSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    titleKey: {
      type: String,
      trim: true,
      default: ''
    },
    descriptionKey: {
      type: String,
      default: ''
    },
    icon: {
      type: String,
      default: 'https://cdn-icons-png.flaticon.com/512/2997/2997017.png'
    },
    type: {
      type: String,
      enum: ['login', 'profile', 'points', 'level', 'posts', 'comments', 'reactions', 'extraction', 'explorer', 'other'],
      default: 'other'
    },
    requirement: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    pointsReward: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// إنشاء الكائن من النموذج
const Achievement = mongoose.model('Achievement', achievementSchema);

module.exports = Achievement;