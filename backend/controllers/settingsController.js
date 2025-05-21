const asyncHandler = require('express-async-handler');
const UserSettings = require('../models/UserSettings');
const UserAction = require('../models/UserAction');
const User = require('../models/User');
const Language = require('../models/Language');

// @desc    الحصول على إعدادات المستخدم
// @route   GET /api/users/settings
// @access  Private
const getUserSettings = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    
    // البحث عن إعدادات المستخدم
    let userSettings = await UserSettings.findOne({ userId });
    
    // إذا لم تكن موجودة، إنشاء إعدادات افتراضية
    if (!userSettings) {
      userSettings = await UserSettings.createDefaultSettings(userId);
    }
    
    res.json(userSettings);
  } catch (error) {
    console.error('Error fetching user settings:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'حدث خطأ في جلب إعدادات المستخدم'
    });
  }
});

// @desc    تحديث إعدادات المستخدم
// @route   PUT /api/users/settings
// @access  Private
const updateUserSettings = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const updatedSettings = req.body;
    
    // التحقق من وجود الإعدادات
    let userSettings = await UserSettings.findOne({ userId });
    
    // إذا لم تكن موجودة، إنشاء إعدادات افتراضية
    if (!userSettings) {
      userSettings = await UserSettings.createDefaultSettings(userId);
    }
    
    // تحديث حقول الإعدادات
    if (updatedSettings.notifications) {
      if (updatedSettings.notifications.email) {
        if (updatedSettings.notifications.email.enabled !== undefined) {
          userSettings.notifications.email.enabled = updatedSettings.notifications.email.enabled;
        }
        if (updatedSettings.notifications.email.types) {
          Object.keys(updatedSettings.notifications.email.types).forEach(key => {
            if (userSettings.notifications.email.types[key] !== undefined) {
              userSettings.notifications.email.types[key] = updatedSettings.notifications.email.types[key];
            }
          });
        }
      }
      
      if (updatedSettings.notifications.inApp) {
        if (updatedSettings.notifications.inApp.enabled !== undefined) {
          userSettings.notifications.inApp.enabled = updatedSettings.notifications.inApp.enabled;
        }
        if (updatedSettings.notifications.inApp.types) {
          Object.keys(updatedSettings.notifications.inApp.types).forEach(key => {
            if (userSettings.notifications.inApp.types[key] !== undefined) {
              userSettings.notifications.inApp.types[key] = updatedSettings.notifications.inApp.types[key];
            }
          });
        }
      }
    }
    
    if (updatedSettings.privacy) {
      if (updatedSettings.privacy.profileVisibility) {
        userSettings.privacy.profileVisibility = updatedSettings.privacy.profileVisibility;
      }
      if (updatedSettings.privacy.activityVisibility !== undefined) {
        userSettings.privacy.activityVisibility = updatedSettings.privacy.activityVisibility;
      }
      if (updatedSettings.privacy.achievementsVisibility !== undefined) {
        userSettings.privacy.achievementsVisibility = updatedSettings.privacy.achievementsVisibility;
      }
      if (updatedSettings.privacy.pointsVisibility !== undefined) {
        userSettings.privacy.pointsVisibility = updatedSettings.privacy.pointsVisibility;
      }
    }
    
    if (updatedSettings.theme) {
      if (updatedSettings.theme.mode) {
        userSettings.theme.mode = updatedSettings.theme.mode;
      }
      if (updatedSettings.theme.color) {
        userSettings.theme.color = updatedSettings.theme.color;
      }
    }
    
    if (updatedSettings.language) {
      // تحديث اللغة المفضلة
      // إذا كان المرسل هو رمز اللغة (مثل 'ar' أو 'en')، نبحث عن اللغة بالرمز
      if (typeof updatedSettings.language === 'string') {
        const language = await Language.findOne({ code: updatedSettings.language });
        if (language) {
          userSettings.language = language._id;
          
          // تحديث اللغة المفضلة في نموذج المستخدم أيضاً
          await User.findByIdAndUpdate(userId, { preferredLanguage: updatedSettings.language });
        }
      } else {
        // إذا كان المرسل هو معرف اللغة مباشرة
        userSettings.language = updatedSettings.language;
      }
    }
    
    // تحديث تاريخ آخر تعديل
    userSettings.lastUpdated = Date.now();
    
    // حفظ التغييرات
    const savedSettings = await userSettings.save();
    
    // تسجيل الإجراء
    await UserAction.create({
      userId,
      actionType: 'settings',
      details: {
        action: 'update_settings'
      },
      module: 'profile'
    });
    
    res.json({
      success: true,
      settings: savedSettings
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'حدث خطأ في تحديث إعدادات المستخدم'
    });
  }
});

// @desc    إعادة تعيين إعدادات المستخدم إلى الإعدادات الافتراضية
// @route   POST /api/users/settings/reset
// @access  Private
const resetUserSettings = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    
    // حذف الإعدادات الحالية
    await UserSettings.deleteOne({ userId });
    
    // إنشاء إعدادات افتراضية جديدة
    const defaultSettings = await UserSettings.createDefaultSettings(userId);
    
    // تسجيل الإجراء
    await UserAction.create({
      userId,
      actionType: 'settings',
      details: {
        action: 'reset_settings'
      },
      module: 'profile'
    });
    
    res.json({
      success: true,
      message: 'تمت إعادة تعيين الإعدادات بنجاح',
      settings: defaultSettings
    });
  } catch (error) {
    console.error('Error resetting user settings:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'حدث خطأ في إعادة تعيين إعدادات المستخدم'
    });
  }
});

module.exports = {
  getUserSettings,
  updateUserSettings,
  resetUserSettings
};