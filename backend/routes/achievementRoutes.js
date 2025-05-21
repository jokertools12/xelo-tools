const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const achievementController = require('../controllers/achievementController');
const Achievement = require('../models/Achievement');
const UserAchievement = require('../models/UserAchievement');
const { protect, admin } = require('../middleware/auth');
const { checkAchievements, trackSectionVisit } = require('../middleware/achievementMiddleware');

/**
 * @route   GET /api/achievements/test-models
 * @desc    تجربة عمل نماذج الإنجازات - للتأكد من عمل النظام
 * @access  Public
 */
router.get('/test-models', asyncHandler(async (req, res) => {
  try {
    const achievementCount = await Achievement.countDocuments();
    const userAchievementCount = await UserAchievement.countDocuments();
    
    res.json({
      success: true,
      message: 'Achievement models are working correctly',
      counts: {
        achievements: achievementCount,
        userAchievements: userAchievementCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error testing achievement models',
      error: error.message
    });
  }
}));

/**
 * @route   GET /api/achievements
 * @desc    الحصول على جميع الإنجازات (للمشرفين)
 * @access  Admin
 */
router.get('/', protect, admin, achievementController.getAllAchievements);

/**
 * @route   POST /api/achievements
 * @desc    إنشاء إنجاز جديد (للمشرفين)
 * @access  Admin
 */
router.post('/', protect, admin, achievementController.createAchievement);

// ======== مسارات خاصة بالمستخدم - MUST BE BEFORE PARAMETRIC ROUTES ========

/**
 * @route   GET /api/achievements/user
 * @desc    الحصول على إنجازات المستخدم الحالي
 * @access  Private
 */
router.get('/user', protect, trackSectionVisit, achievementController.getUserAchievements);

/**
 * @route   GET /api/achievements/user/stats
 * @desc    الحصول على إحصائيات إنجازات المستخدم
 * @access  Private
 */
router.get('/user/stats', protect, achievementController.getAchievementStats);

/**
 * @route   POST /api/achievements/check
 * @desc    فحص الإنجازات الجديدة للمستخدم
 * @access  Private
 */
router.post('/check', protect, achievementController.checkNewAchievements);

/**
 * @route   POST /api/achievements/initialize
 * @desc    تهيئة إنجازات المستخدم
 * @access  Private
 */
router.post('/initialize', protect, achievementController.initializeAchievements);

/**
 * @route   POST /api/achievements/track-section
 * @desc    تتبع زيارة قسم معين في التطبيق
 * @access  Private
 */
router.post('/track-section', protect, asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { section } = req.body;
  
  console.log(`[Section Tracking API] Received request to track section: ${section}, userId: ${userId}`);
  
  // التحقق من صحة البيانات
  if (!section) {
    console.log('[Section Tracking API] Missing section parameter');
    return res.status(400).json({ success: false, message: 'يجب تحديد القسم' });
  }
  
  // الحصول على خدمة الإنجازات
  const achievementService = req.app.get('achievementService');
  
  // التأكد من أن القسم صالح
  const validSections = achievementService.getSectionsList();
  console.log(`[Section Tracking API] Valid sections: ${validSections.join(', ')}`);
  
  if (!validSections.includes(section)) {
    console.log(`[Section Tracking API] Invalid section: ${section}`);
    return res.status(400).json({ 
      success: false, 
      message: 'قسم غير صالح',
      validSections 
    });
  }
  
  // التحقق من زيارة سابقة في نفس اليوم
  const UserAction = req.app.get('models').UserAction;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const existingVisit = await UserAction.findOne({
    userId,
    actionType: 'visit',
    'details.section': section,
    createdAt: { $gte: today }
  });
  
  if (existingVisit) {
    console.log(`[Section Tracking API] User ${userId} already visited section ${section} today`);
    return res.json({ 
      success: true, 
      message: 'تم تسجيل زيارة القسم مسبقًا اليوم',
      alreadyVisited: true
    });
  }
  
  // تسجيل زيارة جديدة لجميع الأقسام بما فيها الملف الشخصي
  let newVisit;
  // إنشاء سجل نشاط لجميع الأقسام بما فيها صفحة الملف الشخصي
  newVisit = await UserAction.create({
    userId,
    actionType: 'visit',
    details: {
      section,
      path: req.body.path || `/${section}`
    },
    module: 'navigation',
    count: 1
  });
  
  console.log(`[Section Tracking API] Created new visit record for section ${section}, userId: ${userId}, record ID: ${newVisit?._id}`);
  
  // التحقق من إنجازات الاستكشاف - فحص موسع
  console.log(`[Section Tracking API] Checking Explorer achievement for user ${userId}...`);
  
  // الحصول على الأقسام المزارة لإظهارها
  const { visitedSections, allSectionsVisited } = await achievementService.checkSectionsVisited(userId);
  
  console.log(`[Section Tracking API] Visited sections: ${Array.from(visitedSections).join(', ')}`);
  console.log(`[Section Tracking API] All sections visited: ${allSectionsVisited ? 'YES' : 'NO'}`);
  console.log(`[Section Tracking API] Total visited: ${visitedSections.size}/${achievementService.getSectionsList().length}`);
  
  // إذا كانت جميع الأقسام مزارة، فتح الإنجاز فوراً
  if (allSectionsVisited) {
    console.log(`[Section Tracking API] All sections have been visited. Unlocking Explorer achievement...`);
    const updated = await achievementService.checkExplorerAchievements(userId);
    console.log(`[Section Tracking API] Explorer achievement unlocked: ${updated ? 'YES' : 'NO'}`);
  } else {
    // محاولة التحقق من الإنجاز حتى لو لم تكتمل جميع الأقسام لتحديث التقدم
    const updated = await achievementService.checkExplorerAchievements(userId);
    console.log(`[Section Tracking API] Explorer achievement progress updated: ${updated ? 'YES' : 'NO'}`);
  }
  
  // إرجاع النتيجة
  res.json({ 
    success: true, 
    message: 'تم تسجيل زيارة القسم بنجاح' 
  });
}));

// ======== مسارات التعامل مع إنجازات محددة ========

/**
 * @route   GET /api/achievements/:id
 * @desc    الحصول على تفاصيل إنجاز محدد (للمشرفين)
 * @access  Admin
 */
router.get('/:id', protect, admin, achievementController.getAchievementById);

/**
 * @route   PUT /api/achievements/:id
 * @desc    تحديث إنجاز موجود (للمشرفين)
 * @access  Admin
 */
router.put('/:id', protect, admin, achievementController.updateAchievement);

/**
 * @route   DELETE /api/achievements/:id
 * @desc    حذف إنجاز (للمشرفين)
 * @access  Admin
 */
router.delete('/:id', protect, admin, achievementController.deleteAchievement);

/**
 * @route   PUT /api/achievements/:id/viewed
 * @desc    تحديد إنجاز كمشاهد
 * @access  Private
 */
router.put('/:id/viewed', protect, achievementController.markAchievementViewed);

module.exports = router;