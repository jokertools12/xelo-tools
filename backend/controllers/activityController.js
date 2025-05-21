const asyncHandler = require('express-async-handler');
const UserAction = require('../models/UserAction');
const User = require('../models/User');

// @desc    الحصول على أنشطة المستخدم
// @route   GET /api/users/activities
// @access  Private
// أنواع الأنشطة المهمة التي سيتم عرضها - تم إزالة الأنشطة المتعلقة بالاشتراكات والمحفظة
const IMPORTANT_ACTIVITY_TYPES = [
  'login', 'account_add', 'achievement', 'points', 'profile', 'security'
];

// أنواع الأنشطة التي يجب استبعادها من النتائج
const EXCLUDED_ACTIVITY_TYPES = [
  'subscription_create', 'subscription_cancel', 'subscription_update', 
  'wallet_deposit', 'points_purchase', 'admin', 'admin_log' // أضفنا 'admin_log' لاستبعاد إشعارات موافقة المشرف على طلبات لا تمنح نقاطًا
];

// وحدات النظام التي يجب استبعادها
const EXCLUDED_MODULES = ['membership', 'wallet', 'payments', 'admin']; // أضفنا 'admin' لاستبعاد الإشعارات الإدارية

const getUserActivities = asyncHandler(async (req, res) => {
  try {
    // الحصول على معرف المستخدم من التوكن
    const userId = req.user._id;
    
    // خيارات التصفية والترتيب
    const limit = parseInt(req.query.limit) || 10; // تقليل الحد الافتراضي إلى 10
    const sortField = req.query.sort?.split(':')[0] || 'createdAt';
    const sortOrder = req.query.sort?.split(':')[1] === 'asc' ? 1 : -1;
    const type = req.query.type;
    
    // إنشاء مرشح البحث مع تضمين الأنشطة المهمة فقط واستبعاد الأنشطة غير المرغوب فيها
    const filter = { userId };
    
    // قائمة بالشروط التي يجب استبعادها
    const excludeConditions = [
      { actionType: { $in: EXCLUDED_ACTIVITY_TYPES } },
      { module: { $in: EXCLUDED_MODULES } }
    ];
    
    // إضافة شروط للبحث عن الكلمات المفتاحية في العنوان والوصف
    excludeConditions.push({
      title: { $regex: /اشتراك|محفظة|subscription|wallet|نقطة|points/i }
    });
    
    excludeConditions.push({
      description: { $regex: /اشتراك|محفظة|subscription|wallet|نقطة|points/i }
    });
    
    // استبعاد الأنشطة التي تحتوي على معلومات عن الاشتراكات أو المحفظة أو نقاط بقيمة صفر
    // Exclude activities related to subscriptions, wallet, or zero-point activities
    filter.$nor = excludeConditions;
    
    // Exclude activities with zero points more comprehensively
    filter.$nor.push({
      actionType: 'points',
      'details.points': 0
    });
    
    // Additional check to exclude zero points notifications that might use a different structure
    filter.$nor.push({
      actionType: 'points',
      details: { $regex: /0 نقطة|0 نقاط|0 points|صفر نقطة|صفر نقاط|zero points/i }
    });
    
    // Exclude any activity where title or description mentions zero points
    filter.$nor.push({
      title: { $regex: /حصل على 0 نقطة|حصل على 0 نقاط|got 0 points|الجوكر حصل على 0 نقطة|earned 0 points/i }
    });
    
    // Exclude description mentions of zero points
    filter.$nor.push({
      description: { $regex: /حصل على 0 نقطة|حصل على 0 نقاط|got 0 points|الجوكر حصل على 0 نقطة|earned 0 points/i }
    });
    
    // إذا تم تحديد نوع، تحقق من أنه ضمن الأنشطة المهمة
    if (type) {
      if (IMPORTANT_ACTIVITY_TYPES.includes(type)) {
        filter.actionType = type;
      } else {
        // إذا كان النوع غير مهم، أرجع قائمة فارغة
        return res.json([]);
      }
    } else {
      // إذا لم يتم تحديد نوع، اعرض فقط الأنشطة المهمة
      filter.actionType = { $in: IMPORTANT_ACTIVITY_TYPES };
    }
    
    // حذف الأنشطة القديمة للحفاظ على حجم قاعدة البيانات
    await cleanupOldActivities(userId);
    
    // البحث عن أنشطة المستخدم المهمة الـ 10 الأخيرة
    const activities = await UserAction.find(filter)
      .sort({ [sortField]: sortOrder })
      .limit(limit)
      .populate('userId', 'name avatar'); // جلب معلومات المستخدم لعرض الاسم والصورة

    // التحقق مما إذا كان المستخدم لديه أي أنشطة مهمة
    if (!activities || activities.length === 0) {
      // محاولة تهيئة الأنشطة الافتراضية
      await initializeActivities(req, res);
      
      // إعادة محاولة جلب الأنشطة بعد التهيئة
      const retryActivities = await UserAction.find(filter)
        .sort({ [sortField]: sortOrder })
        .limit(limit)
        .populate('userId', 'name avatar');
      
      if (retryActivities && retryActivities.length > 0) {
        const formattedActivities = formatActivities(retryActivities);
        return res.json(formattedActivities);
      }
      
      // إذا لم توجد أنشطة بعد التهيئة، أرجع مصفوفة فارغة
      return res.json([]);
    }

    // تنسيق البيانات للعرض
    const formattedActivities = formatActivities(activities);
    res.json(formattedActivities);
  } catch (error) {
    console.error('Error fetching user activities:', error);
    res.status(500);
    throw new Error('فشل في جلب أنشطة المستخدم: ' + error.message);
  }
});

// @desc    تهيئة أنشطة المستخدم الافتراضية
// @route   POST /api/users/activities/initialize
// @access  Private
const initializeActivities = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    
    // التحقق من إذا كان المستخدم موجود
    const user = await User.findById(userId);
    if (!user) {
      res.status(404);
      throw new Error('المستخدم غير موجود');
    }

    // قائمة الأنشطة الافتراضية
    const defaultActivities = [
      {
        userId,
        actionType: 'login',
        details: {
          action: 'تسجيل الدخول',
          device: req.headers['user-agent'] || 'غير معروف'
        },
        title: 'تسجيل دخول جديد',
        description: 'تم تسجيل الدخول من جهاز جديد',
        module: 'auth'
      },
      {
        userId,
        actionType: 'profile',
        details: {
          action: 'زيارة',
          section: 'profile'
        },
        title: 'زيارة الملف الشخصي',
        description: 'تم الوصول إلى صفحة الملف الشخصي لأول مرة',
        module: 'users'
      }
    ];

    // إنشاء الأنشطة في قاعدة البيانات
    const activities = await UserAction.insertMany(defaultActivities);
    
    // تنسيق البيانات للعرض
    const formattedActivities = formatActivities(activities);
    
    if (req.method === 'POST') {
      return res.status(201).json({
        message: 'تم تهيئة الأنشطة بنجاح',
        activities: formattedActivities
      });
    }
    
    return formattedActivities;
  } catch (error) {
    console.error('Error initializing activities:', error);
    
    if (req.method === 'POST') {
      res.status(500);
      throw new Error('فشل في تهيئة الأنشطة: ' + error.message);
    }
    
    return [];
  }
});

// @desc    إضافة نشاط جديد
// @route   POST /api/users/activities
// @access  Private
const addActivity = asyncHandler(async (req, res) => {
  try {
    const { title, description, type, details } = req.body;
    const userId = req.user._id;
    
    // التحقق من البيانات المطلوبة
    if (!title || !type) {
      res.status(400);
      throw new Error('العنوان والنوع مطلوبان');
    }
    
    // إنشاء النشاط الجديد
    const newActivity = new UserAction({
      userId,
      actionType: type,
      details: {
        ...details,
        title: title,
        description: description || title
      },
      module: 'users'
    });
    
    // حفظ النشاط
    const savedActivity = await newActivity.save();
    
    // تنسيق البيانات للعرض
    const formattedActivity = {
      id: savedActivity._id,
      title: savedActivity.details?.title || mapActionTypeToTitle(savedActivity.actionType),
      description: savedActivity.details?.description || '',
      date: savedActivity.createdAt,
      type: savedActivity.actionType
    };
    
    res.status(201).json(formattedActivity);
  } catch (error) {
    console.error('Error adding activity:', error);
    res.status(500);
    throw new Error('فشل في إضافة النشاط: ' + error.message);
  }
});

/**
 * دالة لحذف الأنشطة القديمة للمستخدم
 * تحتفظ فقط بأحدث 10 أنشطة مهمة لكل مستخدم
 */
const cleanupOldActivities = async (userId) => {
  try {
    // عدد الأنشطة المهمة التي نريد الإبقاء عليها
    const keepCount = 10;
    
    // البحث عن جميع أنشطة المستخدم المهمة مرتبة من الأحدث إلى الأقدم
    const activities = await UserAction.find({
      userId,
      actionType: { $in: IMPORTANT_ACTIVITY_TYPES }
    }).sort({ createdAt: -1 });
    
    // إذا كان عدد الأنشطة أكثر من 10، احذف الباقي
    if (activities.length > keepCount) {
      const activitiesToDelete = activities.slice(keepCount);
      const idsToDelete = activitiesToDelete.map(activity => activity._id);
      
      // حذف الأنشطة القديمة
      await UserAction.deleteMany({ _id: { $in: idsToDelete } });
      
      console.log(`Deleted ${idsToDelete.length} old activities for user ${userId}`);
    }
  } catch (error) {
    console.error('Error cleaning up old activities:', error);
    // لا نريد إيقاف تنفيذ الكود في حالة حدوث خطأ أثناء التنظيف
  }
};

// دالة مساعدة لتنسيق الأنشطة
const formatActivities = (activities) => {
  return activities.map(activity => ({
    id: activity._id,
    userId: activity.userId?._id || activity.userId,
    title: activity.details?.title || mapActionTypeToTitle(activity.actionType),
    description: activity.details?.description || '',
    date: activity.createdAt,
    type: activity.actionType,
    user: activity.userId && typeof activity.userId !== 'string' ? {
      name: activity.userId.name,
      avatar: activity.userId.avatar
    } : null
  }));
};

// دالة مساعدة لتعيين عناوين افتراضية للأنشطة
const mapActionTypeToTitle = (actionType) => {
  const titles = {
    'login': 'تسجيل دخول',
    'profile': 'تحديث الملف الشخصي',
    'security': 'تحديث إعدادات الأمان',
    'points': 'تحديث النقاط',
    'extraction': 'استخراج بيانات',
    'comment': 'استخراج تعليقات',
    'reaction': 'استخراج تفاعلات',
    'post': 'استخراج منشورات',
    'settings': 'تحديث الإعدادات',
    'account_add': 'إضافة حساب',
    'subscription_create': 'اشتراك جديد',
    'subscription_cancel': 'إلغاء الاشتراك',
    'subscription_update': 'تحديث الاشتراك',
    'wallet_deposit': 'إيداع في المحفظة',
    'points_reward': 'مكافأة نقاط',
    'points_purchase': 'شراء نقاط',
    'other': 'نشاط آخر'
  };
  
  return titles[actionType] || 'نشاط غير معروف';
};

// @desc    Get activities from all users
// @route   GET /api/activities
// @access  Private
const getAllActivities = asyncHandler(async (req, res) => {
  try {
    // خيارات التصفية والترتيب
    const limit = parseInt(req.query.limit) || 5; // Default to 5 for global activities
    const sortField = req.query.sort?.split(':')[0] || 'createdAt';
    const sortOrder = req.query.sort?.split(':')[1] === 'asc' ? 1 : -1;
    
    // قائمة بالشروط التي يجب استبعادها
    const excludeConditions = [
      { actionType: { $in: EXCLUDED_ACTIVITY_TYPES } },
      { module: { $in: EXCLUDED_MODULES } }
    ];
    
    // إضافة شروط للبحث عن الكلمات المفتاحية في العنوان والوصف
    excludeConditions.push({
      title: { $regex: /اشتراك|محفظة|subscription|wallet/i }
    });
    
    excludeConditions.push({
      description: { $regex: /اشتراك|محفظة|subscription|wallet/i }
    });
    
    // البحث عن جميع الأنشطة المهمة بدون تصفية حسب المستخدم واستبعاد الأنشطة غير المرغوب فيها
    const filter = {
      actionType: { $in: IMPORTANT_ACTIVITY_TYPES },
      $nor: excludeConditions
    };
    
    // Also exclude zero-point activities from global feed
    filter.$nor.push({
      actionType: 'points',
      'details.points': 0
    });
    
    // Exclude zero points that might use different text structures
    filter.$nor.push({
      actionType: 'points',
      details: { $regex: /0 نقطة|0 نقاط|0 points|صفر نقطة|صفر نقاط|zero points/i }
    });
    
    // Exclude activities that mention zero points in title or description
    filter.$nor.push({
      title: { $regex: /حصل على 0 نقطة|حصل على 0 نقاط|got 0 points|الجوكر حصل على 0 نقطة|earned 0 points/i }
    });
    
    // Exclude description mentions of zero points in global feed
    filter.$nor.push({
      description: { $regex: /حصل على 0 نقطة|حصل على 0 نقاط|got 0 points|الجوكر حصل على 0 نقطة|earned 0 points/i }
    });
    
    // البحث عن أحدث الأنشطة من جميع المستخدمين
    const activities = await UserAction.find(filter)
      .sort({ [sortField]: sortOrder })
      .limit(limit)
      .populate('userId', 'name avatar username'); // جلب معلومات المستخدم لعرض الاسم والصورة

    // تنسيق البيانات للعرض
    const formattedActivities = formatActivities(activities);
    res.json(formattedActivities);
  } catch (error) {
    console.error('Error fetching all activities:', error);
    res.status(500);
    throw new Error('فشل في جلب الأنشطة: ' + error.message);
  }
});

module.exports = {
  getUserActivities,
  getAllActivities,
  initializeActivities,
  addActivity
};
