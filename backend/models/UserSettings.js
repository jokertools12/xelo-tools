const mongoose = require('mongoose');

const userSettingsSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    notifications: {
      email: {
        enabled: {
          type: Boolean,
          default: true
        },
        types: {
          security: {
            type: Boolean,
            default: true
          },
          activity: {
            type: Boolean,
            default: true
          },
          marketing: {
            type: Boolean,
            default: false
          },
          updates: {
            type: Boolean,
            default: true
          }
        }
      },
      inApp: {
        enabled: {
          type: Boolean,
          default: true
        },
        types: {
          achievements: {
            type: Boolean,
            default: true
          },
          pointsChanges: {
            type: Boolean,
            default: true
          },
          levelChanges: {
            type: Boolean,
            default: true
          },
          system: {
            type: Boolean,
            default: true
          }
        }
      }
    },
    privacy: {
      profileVisibility: {
        type: String,
        enum: ['public', 'registered', 'private'],
        default: 'registered'
      },
      activityVisibility: {
        type: Boolean,
        default: true
      },
      achievementsVisibility: {
        type: Boolean,
        default: true
      },
      pointsVisibility: {
        type: Boolean,
        default: true
      }
    },
    theme: {
      mode: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system'
      },
      color: {
        type: String,
        default: 'blue'
      }
    },
    language: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Language',
      default: null
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// إنشاء إعدادات افتراضية للمستخدم
userSettingsSchema.statics.createDefaultSettings = async function(userId) {
  try {
    // التحقق إذا كان المستخدم لديه إعدادات بالفعل
    const existingSettings = await this.findOne({ userId });
    
    // إذا لم تكن موجودة، إنشاء إعدادات افتراضية
    if (!existingSettings) {
      const defaultSettings = new this({
        userId,
        notifications: {
          email: { enabled: true, types: { security: true, activity: true, marketing: false, updates: true } },
          inApp: { enabled: true, types: { achievements: true, pointsChanges: true, levelChanges: true, system: true } }
        },
        privacy: {
          profileVisibility: 'registered',
          activityVisibility: true,
          achievementsVisibility: true,
          pointsVisibility: true
        },
        theme: { mode: 'system', color: 'blue' },
        language: null
      });
      
      return await defaultSettings.save();
    }
    
    return existingSettings;
  } catch (error) {
    console.error('خطأ في إنشاء الإعدادات الافتراضية:', error);
    throw error;
  }
};

const UserSettings = mongoose.model('UserSettings', userSettingsSchema);

module.exports = UserSettings;