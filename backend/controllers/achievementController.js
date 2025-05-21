const asyncHandler = require('express-async-handler');
const Achievement = require('../models/Achievement');
const UserAchievement = require('../models/UserAchievement');
const User = require('../models/User');
const UserAction = require('../models/UserAction');

// @desc    الحصول على جميع الإنجازات (للمشرفين)
// @route   GET /api/achievements
// @access  Admin
const getAllAchievements = asyncHandler(async (req, res) => {
  try {
    // خيارات الفلترة والترتيب
    const filter = {};
    
    if (req.query.type) {
      filter.type = req.query.type;
    }
    
    if (req.query.isActive === 'true' || req.query.isActive === 'false') {
      filter.isActive = req.query.isActive === 'true';
    }
    
    // البحث عن جميع الإنجازات
    const achievements = await Achievement.find(filter).sort({ type: 1, title: 1 });
    
    res.json(achievements);
  } catch (error) {
    console.error('Error fetching all achievements:', error);
    res.status(500);
    throw new Error('فشل في جلب الإنجازات: ' + error.message);
  }
});

// @desc    الحصول على إنجاز محدد بالمعرف (للمشرفين)
// @route   GET /api/achievements/:id
// @access  Admin
const getAchievementById = asyncHandler(async (req, res) => {
  try {
    const achievement = await Achievement.findById(req.params.id);
    
    if (!achievement) {
      res.status(404);
      throw new Error('الإنجاز غير موجود');
    }
    
    res.json(achievement);
  } catch (error) {
    console.error(`Error fetching achievement ID ${req.params.id}:`, error);
    
    if (error.kind === 'ObjectId') {
      res.status(404);
      throw new Error('الإنجاز غير موجود');
    }
    
    res.status(500);
    throw new Error('فشل في جلب الإنجاز: ' + error.message);
  }
});

// @desc    إنشاء إنجاز جديد (للمشرفين)
// @route   POST /api/achievements
// @access  Admin
const createAchievement = asyncHandler(async (req, res) => {
  try {
    const { 
      title, 
      description, 
      titleKey,
      descriptionKey,
      type, 
      icon, 
      requirement,
      pointsReward = 0,
      isActive = true
    } = req.body;
    
    // التحقق من البيانات المطلوبة
    if (!title || !description || !type || !requirement) {
      res.status(400);
      throw new Error('جميع الحقول مطلوبة: العنوان، الوصف، النوع، المتطلبات');
    }
    
    // Generate translation keys if not provided
    let generatedTitleKey = titleKey || '';
    let generatedDescriptionKey = descriptionKey || '';
    
    // If translation keys are not provided, try to generate based on type or common achievements
    if (!generatedTitleKey) {
      // Check for common achievement titles
      const titleKeyMap = {
        'مرحباً بك!': 'achievement_title_welcome',
        'مرحبا بك!': 'achievement_title_welcome',
        'المستكشف': 'achievement_title_explorer',
        'الملف الشخصي المكتمل': 'achievement_title_profile_complete',
        'المثابر': 'achievement_title_persistent',
        'المشارك': 'achievement_title_participant',
        'المنشور الأول': 'achievement_title_first_post',
        'المجدول': 'achievement_title_first_scheduled',
        'ملك المنشورات': 'achievement_title_master_poster',
      };
      
      // Use the map or fallback to type-based key
      generatedTitleKey = titleKeyMap[title] || `achievement_type_${type}`;
    }
    
    if (!generatedDescriptionKey) {
      // Check for common achievement descriptions
      const descKeyMap = {
        'قم بتسجيل الدخول للمرة الأولى': 'achievement_desc_welcome',
        'قم بزيارة جميع أقسام التطبيق': 'achievement_desc_explorer',
        'أكمل معلومات ملفك الشخصي': 'achievement_desc_profile_complete',
        'قم بتسجيل الدخول لمدة 7 أيام متتالية': 'achievement_desc_persistent',
        'قم بإجراء 10 عمليات نشر (يدوية أو مجدولة)': 'achievement_desc_participant',
        'قم بإنشاء أول منشور لك': 'achievement_desc_first_post',
        'قم بجدولة أول منشور لك': 'achievement_desc_first_scheduled',
        'قم بإنشاء 50 منشورًا': 'achievement_desc_master_poster',
      };
      
      // Use the map or generate a default key based on the achievement title
      generatedDescriptionKey = descKeyMap[description] || `achievement_desc_${type}`;
    }
    
    // إنشاء الإنجاز الجديد
    const newAchievement = new Achievement({
      title,
      description,
      titleKey: generatedTitleKey,
      descriptionKey: generatedDescriptionKey,
      type,
      icon: icon || '',
      requirement,
      pointsReward,
      isActive
    });
    
    // حفظ الإنجاز
    const savedAchievement = await newAchievement.save();
    
    res.status(201).json(savedAchievement);
  } catch (error) {
    console.error('Error creating achievement:', error);
    res.status(500);
    throw new Error('فشل في إنشاء الإنجاز: ' + error.message);
  }
});

// @desc    تحديث إنجاز موجود (للمشرفين)
// @route   PUT /api/achievements/:id
// @access  Admin
const updateAchievement = asyncHandler(async (req, res) => {
  try {
    const { 
      title, 
      description, 
      titleKey,
      descriptionKey,
      type, 
      icon, 
      requirement,
      pointsReward,
      isActive
    } = req.body;
    
    // البحث عن الإنجاز
    const achievement = await Achievement.findById(req.params.id);
    
    if (!achievement) {
      res.status(404);
      throw new Error('الإنجاز غير موجود');
    }
    
    // تحديث البيانات
    achievement.title = title || achievement.title;
    achievement.description = description || achievement.description;
    achievement.type = type || achievement.type;
    
    // Update translation keys if provided
    if (titleKey !== undefined) {
      achievement.titleKey = titleKey;
    }
    
    if (descriptionKey !== undefined) {
      achievement.descriptionKey = descriptionKey;
    }
    
    // If title or type changed but titleKey not provided, try to generate a key
    if ((title && title !== achievement.title || type && type !== achievement.type) && titleKey === undefined) {
      // Check common achievement titles
      const titleKeyMap = {
        'مرحباً بك!': 'achievement_title_welcome',
        'مرحبا بك!': 'achievement_title_welcome',
        'المستكشف': 'achievement_title_explorer',
        'الملف الشخصي المكتمل': 'achievement_title_profile_complete',
        'المثابر': 'achievement_title_persistent',
        'المشارك': 'achievement_title_participant',
        'المنشور الأول': 'achievement_title_first_post',
        'المجدول': 'achievement_title_first_scheduled',
        'ملك المنشورات': 'achievement_title_master_poster',
      };
      
      // Use mapped key or generate from type
      const newTitle = title || achievement.title;
      const newType = type || achievement.type;
      achievement.titleKey = titleKeyMap[newTitle] || `achievement_type_${newType}`;
    }
    
    // If description changed but descriptionKey not provided, try to generate a key
    if (description && description !== achievement.description && descriptionKey === undefined) {
      // Check common achievement descriptions
      const descKeyMap = {
        'قم بتسجيل الدخول للمرة الأولى': 'achievement_desc_welcome',
        'قم بزيارة جميع أقسام التطبيق': 'achievement_desc_explorer',
        'أكمل معلومات ملفك الشخصي': 'achievement_desc_profile_complete',
        'قم بتسجيل الدخول لمدة 7 أيام متتالية': 'achievement_desc_persistent',
        'قم بإجراء 10 عمليات نشر (يدوية أو مجدولة)': 'achievement_desc_participant',
        'قم بإنشاء أول منشور لك': 'achievement_desc_first_post',
        'قم بجدولة أول منشور لك': 'achievement_desc_first_scheduled',
        'قم بإنشاء 50 منشورًا': 'achievement_desc_master_poster',
      };
      
      // Use mapped key or generate from type
      const newType = type || achievement.type;
      achievement.descriptionKey = descKeyMap[description] || `achievement_desc_${newType}`;
    }
    
    if (icon) {
      achievement.icon = icon;
    }
    
    if (requirement) {
      achievement.requirement = requirement;
    }
    
    if (pointsReward !== undefined) {
      achievement.pointsReward = pointsReward;
    }
    
    if (isActive !== undefined) {
      achievement.isActive = isActive;
    }
    
    // حفظ التغييرات
    const updatedAchievement = await achievement.save();
    
    res.json(updatedAchievement);
  } catch (error) {
    console.error(`Error updating achievement ID ${req.params.id}:`, error);
    
    if (error.kind === 'ObjectId') {
      res.status(404);
      throw new Error('الإنجاز غير موجود');
    }
    
    res.status(500);
    throw new Error('فشل في تحديث الإنجاز: ' + error.message);
  }
});

// @desc    حذف إنجاز (للمشرفين)
// @route   DELETE /api/achievements/:id
// @access  Admin
const deleteAchievement = asyncHandler(async (req, res) => {
  try {
    // البحث عن الإنجاز
    const achievement = await Achievement.findById(req.params.id);
    
    if (!achievement) {
      res.status(404);
      throw new Error('الإنجاز غير موجود');
    }
    
    // حذف الإنجاز
    await achievement.deleteOne();
    
    // حذف إنجازات المستخدمين المرتبطة
    await UserAchievement.deleteMany({ achievementId: req.params.id });
    
    res.json({ message: 'تم حذف الإنجاز بنجاح' });
  } catch (error) {
    console.error(`Error deleting achievement ID ${req.params.id}:`, error);
    
    if (error.kind === 'ObjectId') {
      res.status(404);
      throw new Error('الإنجاز غير موجود');
    }
    
    res.status(500);
    throw new Error('فشل في حذف الإنجاز: ' + error.message);
  }
});

// @desc    تحديد إنجاز كمشاهد
// @route   PUT /api/achievements/:id/viewed
// @access  Private
const markAchievementViewed = asyncHandler(async (req, res) => {
  try {
    const achievementId = req.params.id;
    const userId = req.user._id;
    
    // البحث عن إنجاز المستخدم
    const userAchievement = await UserAchievement.findOne({
      userId,
      achievementId
    });
    
    if (!userAchievement) {
      res.status(404);
      throw new Error('الإنجاز غير موجود');
    }
    
    // التحقق من أن الإنجاز مفتوح
    if (!userAchievement.unlocked) {
      res.status(400);
      throw new Error('لا يمكن تحديد إنجاز غير مفتوح كمشاهد');
    }
    
    // تحديث حالة المشاهدة
    userAchievement.viewed = true;
    await userAchievement.save();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking achievement as viewed:', error);
    res.status(500);
    throw new Error('فشل في تحديث حالة الإنجاز: ' + error.message);
  }
});

// @desc    الحصول على إنجازات المستخدم
// @route   GET /api/achievements/user
// @access  Private
const getUserAchievements = asyncHandler(async (req, res) => {
  try {
    // الحصول على معرف المستخدم من التوكن
    const userId = req.user._id;
    
    // خيارات الاستعلام
    const options = {
      type: req.query.type,
      unlocked: req.query.unlocked === 'true' ? true : (req.query.unlocked === 'false' ? false : undefined),
      sort: req.query.sort || 'unlocked:desc',
      limit: parseInt(req.query.limit) || 100
    };
    
    // استخدام خدمة الإنجازات للحصول على إنجازات المستخدم
    const achievementService = req.app.get('achievementService');
    const achievements = await achievementService.getUserAchievements(userId, options);
    
    res.json(achievements);
  } catch (error) {
    console.error('Error fetching user achievements:', error);
    res.status(500);
    throw new Error('فشل في جلب الإنجازات: ' + error.message);
  }
});

// @desc    الحصول على إحصائيات إنجازات المستخدم
// @route   GET /api/achievements/user/stats
// @access  Private
const getAchievementStats = asyncHandler(async (req, res) => {
  try {
    // الحصول على معرف المستخدم من التوكن
    const userId = req.user._id;
    
    // استخدام خدمة الإنجازات للحصول على إحصائيات الإنجازات
    const achievementService = req.app.get('achievementService');
    const stats = await achievementService.getAchievementStats(userId);
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching achievement stats:', error);
    res.status(500);
    throw new Error('فشل في جلب إحصائيات الإنجازات: ' + error.message);
  }
});

// @desc    تهيئة إنجازات المستخدم الافتراضية
// @route   POST /api/achievements/initialize
// @access  Private
const initializeAchievements = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    
    // التحقق من إذا كان المستخدم موجود
    const user = await User.findById(userId);
    if (!user) {
      res.status(404);
      throw new Error('المستخدم غير موجود');
    }
    
    // استخدام خدمة الإنجازات لتهيئة إنجازات المستخدم
    const achievementService = req.app.get('achievementService');
    await achievementService.initializeUserAchievements(userId);
    
    // إرجاع الإنجازات بعد التهيئة
    const achievements = await achievementService.getUserAchievements(userId);
    
    res.status(201).json({
      message: 'تم تهيئة الإنجازات بنجاح',
      achievements
    });
  } catch (error) {
    console.error('Error initializing achievements:', error);
    res.status(500);
    throw new Error('فشل في تهيئة الإنجازات: ' + error.message);
  }
});

// @desc    التحقق من الإنجازات الجديدة
// @route   POST /api/achievements/check
// @access  Private
const checkNewAchievements = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    
    // استخدام خدمة الإنجازات للتحقق من الإنجازات الجديدة
    const achievementService = req.app.get('achievementService');
    const newAchievements = await achievementService.checkUserAchievementsNow(userId, {
      bypassThrottle: true
    });
    
    res.json({
      newAchievements,
      updatedAchievements: newAchievements.length
    });
  } catch (error) {
    console.error('Error checking achievements:', error);
    res.status(500);
    throw new Error('فشل في التحقق من الإنجازات: ' + error.message);
  }
});

module.exports = {
  getUserAchievements,
  getAllAchievements,
  getAchievementById,
  createAchievement,
  updateAchievement,
  deleteAchievement,
  markAchievementViewed,
  initializeAchievements,
  checkNewAchievements,
  getAchievementStats
};