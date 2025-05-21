const asyncHandler = require('express-async-handler');

/**
 * نظام تسجيل موحد لوسائط الإنجازات
 */
const logger = {
  // مستويات السجل للتحكم في كمية الرسائل
  logLevels: {
    ERROR: 0,   // أخطاء حرجة فقط
    WARN: 1,    // تحذيرات وأخطاء
    INFO: 2,    // معلومات مهمة + تحذيرات + أخطاء
    DEBUG: 3,   // معلومات تفصيلية للتصحيح
    TRACE: 4    // كل شيء، بما في ذلك تفاصيل دقيقة
  },
  
  // ضبط مستوى السجل الحالي - يمكن تغييره ديناميكيًا
  currentLogLevel: process.env.NODE_ENV === 'production' 
    ? 2 // INFO في بيئة الإنتاج
    : 2, // INFO في بيئة التطوير، يمكن ضبطها إلى DEBUG أو TRACE حسب الحاجة
  
  /**
   * تسجيل رسالة بناءً على مستوى السجل المحدد
   * @param {string} level - مستوى السجل
   * @param {string} category - فئة/موضوع الرسالة
   * @param {string|object} message - الرسالة أو الكائن للتسجيل
   */
  log(level, category, message) {
    // لا تقم بالتسجيل إذا كان المستوى أقل من المستوى الحالي
    if (this.logLevels[level] > this.currentLogLevel) return;
    
    const prefix = `[${category}]`;
    
    if (typeof message === 'object') {
      console.log(prefix, level, JSON.stringify(message));
    } else {
      console.log(prefix, message);
    }
  }
};

/**
 * وسيط لفحص الإنجازات تلقائياً بعد تنفيذ العمليات
 * يتم تنفيذه بعد إكمال الطلب والاستجابة
 */
const checkAchievements = asyncHandler(async (req, res, next) => {
  try {
    // تنفيذ الطلب أولاً
    await next();
    
    // إذا كان هناك خطأ (رمز الاستجابة >= 400)، تخطي فحص الإنجازات
    if (res.statusCode >= 400) return;

    // الحصول على معرف المستخدم من الطلب
    const userId = req.user?._id;
    if (!userId) return; // تخطي إذا لم يكن المستخدم مسجل الدخول
    
    // الحصول على نوع النشاط من الطلب
    const activityType = req.body?.activityType || req.query?.activityType || req.originalUrl.split('/').pop() || 'unknown';
    
    // سجل التفاصيل في مستوى DEBUG فقط
    logger.log('DEBUG', 'Achievement', `Checking achievements for user ${userId}, activity: ${activityType}`);
    
    // استدعاء خدمة فحص الإنجازات (سيتم تنفيذها بدون انتظار)
    req.app.get('achievementService').checkUserAchievementsNow(userId, {
      bypassThrottle: Boolean(req.body._forceCheck || activityType === 'profile'),
      activity: activityType,
      details: req.body || {},
      route: req.originalUrl
    }).catch(error => {
      logger.log('ERROR', 'Achievement', `Check error: ${error.message}`);
    });
    
  } catch (error) {
    logger.log('ERROR', 'Achievement', `Middleware error: ${error.message}`);
    // لا نريد توقف تنفيذ الطلب إذا فشل فحص الإنجازات
  }
});

/**
 * وسيط لتتبع زيارة الأقسام المختلفة
 * يستخدم لإنجازات استكشاف المنصة
 */
const trackSectionVisit = asyncHandler(async (req, res, next) => {
  try {
    // تنفيذ الطلب أولاً
    await next();
    
    // إذا كان هناك خطأ، تخطي التتبع
    if (res.statusCode >= 400) return;

    // الحصول على معرف المستخدم من الطلب
    const userId = req.user?._id;
    if (!userId) return; // تخطي إذا لم يكن المستخدم مسجل الدخول
    
    // استخلاص القسم من الطلب باستخدام قائمة الأقسام المعتمدة
    let section = '';
    
    if (req.body?.section) {
      // إذا تم تحديد القسم صراحةً في الطلب، استخدمه مباشرةً
      section = req.body.section;
    } else {
      // الحصول على قائمة الأقسام المعتمدة من خدمة الإنجازات
      const achievementService = req.app.get('achievementService');
      const validSections = achievementService ? achievementService.getSectionsList() : [];
      
      // التحقق أولاً مما إذا كان هذا طلب واجهة API - في هذه الحالة نتجاهله لتتبع زيارة الأقسام
      const path = req.originalUrl.toLowerCase();
      
      // تجاهل طلبات API تمامًا - هذه ليست زيارات أقسام حقيقية
      if (path.startsWith('/api/')) {
        // تسجيل في المستوى DEBUG فقط لتقليل الضوضاء في السجلات
        logger.log('DEBUG', 'SectionTrack', `Ignoring API request: ${path}`);
        section = ''; // تعيين القسم إلى فارغ لتجاهل المعالجة
        return; // العودة مبكرًا
      }
      
      // استخراج المسار الفعلي من عنوان URL للصفحة
      // إزالة معلمات الاستعلام إن وجدت
      const cleanPath = path.split('?')[0];
      const pathSegments = cleanPath.split('/').filter(segment => segment);
      
      // خريطة المطابقة المحسنة بين مسارات URL وأسماء الأقسام المعتمدة
      const pathToSectionMap = {
        '': 'dashboard',           // المسار الجذر للوحة القيادة
        'dashboard': 'dashboard',
        'profile': 'profile',      
        'get-access-token': 'get-access-token',
        'auto-post-group': 'auto-post-group',
        'mygroup-extractor': 'mygroup-extractor',
        'comment-extractor': 'comment-extractor',
        'reaction-extractor': 'reaction-extractor',
        'achievements': 'achievements'
      };
      
      // تحديد القسم بناءً على المسار
      if (pathSegments.length === 0) {
        // الصفحة الرئيسية
        section = 'dashboard';
      } else if (pathSegments[0] === 'admin') {
        // تجاهل قسم الإدارة حيث أنه ليس جزءًا من إنجاز المستكشف
        section = '';
      } else {
        // البحث عن القسم بناءً على الجزء الأول من المسار 
        // تعامل خاص مع المسارات التي تحتوي على شرطات
        const segmentKey = pathSegments[0];
        section = pathToSectionMap[segmentKey] || '';
      }
      
      // سجل معلومات تصحيح مفصلة في المستوى DEBUG فقط
      logger.log('DEBUG', 'SectionTrack', `URL: ${req.originalUrl}, Detected section: ${section}`);
      
      // التحقق من أن القسم المحدد معتمد
      if (!validSections.includes(section)) {
        logger.log('DEBUG', 'SectionTrack', `Section "${section}" not in valid sections list, ignoring.`);
        section = ''; // إذا لم يكن القسم معتمدًا، إعادة تعيينه إلى قيمة فارغة
      }
    }
    
    // تسجيل الزيارة إذا تم تحديد القسم
    if (section) {
      const achievementService = req.app.get('achievementService');
      const validSections = achievementService ? achievementService.getSectionsList() : [];
      
      logger.log('INFO', 'SectionTrack', `Received request to track section: ${section}, userId: ${userId}`);
      logger.log('DEBUG', 'SectionTrack', `Valid sections: ${validSections.join(', ')}`);
      
      const UserAction = req.app.get('models').UserAction;
      
      // التحقق مما إذا كان المستخدم قد زار هذا القسم اليوم بالفعل
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const existingVisit = await UserAction.findOne({
        userId,
        actionType: 'visit',
        'details.section': section,
        createdAt: { $gte: today }
      });
      
      // إذا لم تكن هناك زيارة سابقة اليوم، سجل زيارة جديدة
      if (!existingVisit) {
        const newVisit = await UserAction.create({
          userId,
          actionType: 'visit',
          details: {
            section,
            path: req.originalUrl
          },
          module: 'navigation',
          count: 1
        });
        
        logger.log('INFO', 'SectionTrack', `Created new visit record for section ${section}, userId: ${userId}, record ID: ${newVisit._id}`);
        
        // الحصول على معلومات تقدم إنجاز المستكشف للتشخيص
        const { visitedSections, allSectionsVisited } = await achievementService.checkSectionsVisited(userId);
        
        logger.log('INFO', 'SectionTrack', `Visited sections: ${Array.from(visitedSections).join(', ')}`);
        logger.log('INFO', 'SectionTrack', `All sections visited: ${allSectionsVisited ? 'YES' : 'NO'}`);
        logger.log('INFO', 'SectionTrack', `Total visited: ${visitedSections.size}/${validSections.length}`);
        
        if (allSectionsVisited) {
          logger.log('INFO', 'SectionTrack', `All sections have been visited. Unlocking Explorer achievement...`);
        }
        
        // فحص إنجازات الاستكشاف
        const updated = await achievementService.checkExplorerAchievements(userId)
          .catch(error => {
            logger.log('ERROR', 'SectionTrack', `Explorer achievement check failed: ${error.message}`);
            return false;
          });
          
        logger.log('INFO', 'SectionTrack', `Explorer achievement ${allSectionsVisited ? 'unlocked' : 'progress updated'}: ${updated ? 'YES' : 'NO'}`);
      } else {
        logger.log('INFO', 'SectionTrack', `User ${userId} already visited section ${section} today`);
      }
    }
  } catch (error) {
    logger.log('ERROR', 'SectionTrack', `Error: ${error.message}`);
    // لا نريد توقف تنفيذ الطلب إذا فشل تتبع الزيارة
  }
});

module.exports = {
  checkAchievements,
  trackSectionVisit
};