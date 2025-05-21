const mongoose = require('mongoose');
const User = mongoose.model('User');

/**
 * خدمة الإنجازات - مسؤولة عن منطق فحص الإنجازات وتتبع التقدم وفتح الإنجازات الجديدة
 */
class AchievementService {
  /**
   * إنشاء مثيل جديد من خدمة الإنجازات
   * @param {Object} models - نماذج قاعدة البيانات
   */
  constructor(models) {
    this.models = models;
    this.throttleMap = new Map(); // لتحديد معدل فحص الإنجازات
    this.throttleTime = 60 * 1000; // دقيقة واحدة بين عمليات الفحص (بالمللي ثانية)
    
    // مستويات السجل للتحكم في كمية الرسائل
    this.logLevels = {
      ERROR: 0,   // أخطاء حرجة فقط
      WARN: 1,    // تحذيرات وأخطاء
      INFO: 2,    // معلومات مهمة + تحذيرات + أخطاء
      DEBUG: 3,   // معلومات تفصيلية للتصحيح
      TRACE: 4    // كل شيء، بما في ذلك تفاصيل دقيقة
    };
    
    // ضبط مستوى السجل الحالي - يمكن تغييره ديناميكيًا
    this.currentLogLevel = process.env.NODE_ENV === 'production' 
      ? this.logLevels.INFO  // في بيئة الإنتاج، استخدم INFO فقط
      : this.logLevels.INFO; // في بيئة التطوير، يمكن ضبطها إلى DEBUG أو TRACE حسب الحاجة
  }
  
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

  /**
   * فحص إنجازات المستخدم فوراً
   * @param {String} userId - معرف المستخدم
   * @param {Object} options - خيارات الفحص
   * @returns {Promise<Array>} - الإنجازات الجديدة المفتوحة
   */
  async checkUserAchievementsNow(userId, options = {}) {
    try {
      // التحقق من معدل الفحص لتجنب الضغط على قاعدة البيانات
      const lastCheck = this.throttleMap.get(userId);
      const now = Date.now();
      
      if (!options.bypassThrottle && lastCheck && (now - lastCheck < this.throttleTime)) {
        return [];
      }
      
      // تحديث وقت آخر فحص
      this.throttleMap.set(userId, now);
      
      // الحصول على بيانات المستخدم
      const user = await this.models.User.findById(userId);
      if (!user) {
        throw new Error('المستخدم غير موجود');
      }
      
      // الحصول على الإنجازات غير المفتوحة للمستخدم
      const userAchievements = await this.models.UserAchievement.find({ 
        userId, 
        unlocked: false 
      }).populate('achievementId');
      
      // التهيئة إذا لم تكن هناك إنجازات متتبعة
      if (!userAchievements || userAchievements.length === 0) {
        await this.initializeUserAchievements(userId);
        return [];
      }
      
      // تهيئة مصفوفة الإنجازات الجديدة
      const newAchievements = [];
      
      // فحص كل إنجاز
      for (const userAchievement of userAchievements) {
        const achievement = userAchievement.achievementId;
        if (!achievement || !achievement.requirement) continue;
        
        let unlocked = false;
        let progress = userAchievement.progress || 0;
        
        // فحص نوع متطلبات الإنجاز
        const requirementType = achievement.requirement.type;
        
        switch (requirementType) {
          case 'count':
            // فحص إنجازات العدد (عدد مرات القيام بنشاط معين)
            const { updatedProgress, isUnlocked } = await this.checkCountAchievement(
              userId, 
              achievement.requirement, 
              userAchievement.progress || 0
            );
            progress = updatedProgress;
            unlocked = isUnlocked;
            break;
            
          case 'level':
            // فحص إنجازات المستوى
            progress = user.level || 1;
            unlocked = progress >= (achievement.requirement.target || 1);
            break;
            
          case 'points':
            // فحص إنجازات النقاط
            progress = user.allPoints || 0;
            unlocked = progress >= (achievement.requirement.target || 1);
            break;
            
          case 'profile_completion':
            // فحص إنجازات اكتمال الملف الشخصي
            const completionPercentage = this.calculateProfileCompletion(user);
            progress = completionPercentage;
            unlocked = completionPercentage >= (achievement.requirement.target || 100);
            break;
            
          case 'streak':
            // فحص إنجازات الاستمرارية (مثل تسجيل الدخول لأيام متتالية)
            const { streak, isStreakAchieved } = await this.checkStreakAchievement(
              userId, 
              achievement.requirement
            );
            progress = streak;
            unlocked = isStreakAchieved;
            break;
            
          case 'visit_all_sections':
            // فحص إنجازات زيارة جميع أقسام المنصة
            const { visitedSections, allSectionsVisited } = await this.checkSectionsVisited(userId);
            progress = Math.round((visitedSections.size / this.getSectionsList().length) * 100);
            unlocked = allSectionsVisited;
            break;
        }
        
        // تحديث الإنجاز إذا تغير
        if (unlocked || progress !== userAchievement.progress) {
          // تحديث حالة الإنجاز
          userAchievement.progress = progress;
          
          // فتح الإنجاز إذا تم استيفاء المتطلبات
          if (unlocked && !userAchievement.unlocked) {
            userAchievement.unlocked = true;
            userAchievement.unlockDate = new Date();
            
            // إضافة الإنجاز الجديد للمصفوفة
            newAchievements.push({
              id: achievement._id,
              title: achievement.title,
              description: achievement.description,
              type: achievement.type,
              icon: achievement.icon,
              pointsAwarded: achievement.pointsReward || 0
            });
            
            // منح نقاط المكافأة إذا كانت محددة
            if (achievement.pointsReward && achievement.pointsReward > 0) {
              await this.awardAchievementPoints(userId, achievement.pointsReward, achievement.title);
            }
            
            // تسجيل فتح الإنجاز في سجل الأنشطة
            await this.logAchievementUnlock(userId, achievement);
          }
          
          // حفظ التغييرات
          await userAchievement.save();
        }
      }
      
      return newAchievements;
    } catch (error) {
      console.error('[Achievement Service Error]', error);
      return [];
    }
  }
  
  /**
   * فحص إنجازات الاستكشاف (زيارة جميع أقسام المنصة)
   * @param {String} userId - معرف المستخدم
   * @returns {Promise<boolean>} - نتيجة الفحص
   */
  async checkExplorerAchievements(userId) {
    try {
      this.log('INFO', 'Explorer', `Checking explorer achievements for user ${userId}`);
      
      // فحص زيارات الأقسام - نفعل ذلك أولاً للحصول على التفاصيل
      const { visitedSections, allSectionsVisited } = await this.checkSectionsVisited(userId);
      
      // سجل التفاصيل في مستوى DEBUG فقط
      this.log('DEBUG', 'Explorer', `User sections: ${Array.from(visitedSections).join(', ')}`);
      this.log('INFO', 'Explorer', `Total visited: ${visitedSections.size} out of ${this.getSectionsList().length}`);
      this.log('INFO', 'Explorer', `All sections visited: ${allSectionsVisited ? 'YES' : 'NO'}`);
      
      // استخدام استعلام أفضل للعثور على إنجازات الاستكشاف
      let explorerAchievements = await this.models.UserAchievement.find({ 
        userId
      }).populate({
        path: 'achievementId',
        match: {
          $or: [
            { type: 'explorer' },
            { 'requirement.type': 'visit_all_sections' }
          ]
        }
      }).then(results => results.filter(ua => ua.achievementId)); // تصفية النتائج الفارغة
      
      if (!explorerAchievements || explorerAchievements.length === 0) {
        this.log('INFO', 'Explorer', `No explorer achievements found. Checking system achievements...`);
      
        // البحث عن إنجازات النظام المتعلقة بالاستكشاف
        const systemExplorerAchievements = await this.models.Achievement.find({
          $or: [
            { type: 'explorer' },
            { 'requirement.type': 'visit_all_sections' }
          ],
          isActive: true
        });
        
        // عثرنا على إنجازات في النظام، نحتاج إلى تهيئتها للمستخدم
        if (systemExplorerAchievements.length > 0) {
          this.log('INFO', 'Explorer', `Found ${systemExplorerAchievements.length} system explorer achievements to initialize`);
          
          try {
            // تهيئة كل إنجاز بشكل فردي لتجنب أخطاء النسخ المكرر
            for (const achievement of systemExplorerAchievements) {
              // التحقق مما إذا كان المستخدم لديه بالفعل هذا الإنجاز
              const exists = await this.models.UserAchievement.findOne({
                userId,
                achievementId: achievement._id
              });
              
              if (!exists) {
                this.log('DEBUG', 'Explorer', `Initializing explorer achievement ${achievement.title} for user`);
                
                // إنشاء إنجاز جديد للمستخدم
                await this.models.UserAchievement.create({
                  userId,
                  achievementId: achievement._id,
                  unlocked: false,
                  progress: 0,
                  unlockDate: null
                });
              }
            }
            
            // حاول مرة أخرى الآن بعد التهيئة
            return await this.checkExplorerAchievements(userId);
          } catch (initError) {
            this.log('ERROR', 'Explorer', `Error initializing achievements: ${initError.message}`);
            if (initError.code !== 11000) { // تجاهل أخطاء التكرار
              throw initError;
            }
          }
        }
        
        this.log('WARN', 'Explorer', `No explorer achievements found in the system. Nothing to update.`);
        return false;
      }
      
      this.log('INFO', 'Explorer', `Found ${explorerAchievements.length} explorer achievement(s) to check`);
      
      // تحديث كل إنجاز استكشاف
      let updated = false;
      
      for (const userAchievement of explorerAchievements) {
        // إذا كان الإنجاز مفتوحاً بالفعل، تخطي
        if (userAchievement.unlocked) {
          this.log('DEBUG', 'Explorer', `Achievement ${userAchievement.achievementId.title} already unlocked. Skipping.`);
          continue;
        }
        
        const achievement = userAchievement.achievementId;
        this.log('INFO', 'Explorer', `Processing achievement: ${achievement.title}`);
        
        // تفاصيل حالة الإنجاز الحالية
        if (this.currentLogLevel >= this.logLevels.DEBUG) {
          this.log('DEBUG', 'Explorer', `Current progress: ${userAchievement.progress || 0}%`);
        }
        
        // حساب نسبة دقيقة (12.5% لكل قسم لـ 8 أقسام)
        const totalSections = this.getSectionsList().length;
        const progress = Math.floor((visitedSections.size / totalSections) * 100);
        
        this.log('INFO', 'Explorer', `Progress: ${progress}%, Sections: ${visitedSections.size}/${totalSections}`);
        
        // تحديث البيانات فقط إذا كان هناك تغيير
        if (progress !== userAchievement.progress || allSectionsVisited !== userAchievement.unlocked) {
          // تحديث التقدم دائماً
          userAchievement.progress = progress;
          updated = true;
          
          // فتح الإنجاز إذا تمت زيارة جميع الأقسام
          if (allSectionsVisited && !userAchievement.unlocked) {
            this.log('INFO', 'Explorer', `All sections visited! Unlocking achievement.`);
            
            userAchievement.unlocked = true;
            userAchievement.unlockDate = new Date();
            
            // منح المكافأة إذا كانت محددة
            if (achievement.pointsReward && achievement.pointsReward > 0) {
              this.log('INFO', 'Explorer', `Awarding ${achievement.pointsReward} points for achievement.`);
              await this.awardAchievementPoints(
                userId, 
                achievement.pointsReward, 
                achievement.title
              );
            }
            
            // تسجيل فتح الإنجاز
            await this.logAchievementUnlock(userId, achievement);
          }
          
          // استخدام updateOne بدلاً من save() لتجنب مشاكل التزامن
          try {
            await this.models.UserAchievement.updateOne(
              { _id: userAchievement._id },
              { 
                $set: { 
                  progress: progress,
                  unlocked: allSectionsVisited,
                  unlockDate: allSectionsVisited ? new Date() : null
                }
              }
            );
            this.log('DEBUG', 'Explorer', `Achievement progress updated successfully!`);
          } catch (error) {
            this.log('ERROR', 'Explorer', `Error updating achievement: ${error.message}`);
            throw error;
          }
        }
      }
      
      this.log('INFO', 'Explorer', `Check completed. Updated: ${updated ? 'YES' : 'NO'}`);
      return updated;
    } catch (error) {
      this.log('ERROR', 'Explorer', `Check failed: ${error.message}`);
      return false;
    }
  }
  
  /**
   * التحقق من الأقسام التي تمت زيارتها
   * @param {String} userId - معرف المستخدم
   * @returns {Promise<Object>} - الأقسام المزارة وما إذا كانت جميع الأقسام قد تمت زيارتها
   */
  async checkSectionsVisited(userId) {
    // الحصول على قائمة الأقسام المتاحة
    const sections = this.getSectionsList();
    
    // الحصول على زيارات المستخدم
    const visitActions = await this.models.UserAction.find({
      userId,
      actionType: 'visit',
      'details.section': { $exists: true }
    });
    
    // إنشاء مجموعة الأقسام المزارة
    const visitedSections = new Set();
    
    visitActions.forEach(action => {
      if (action.details && action.details.section) {
        visitedSections.add(action.details.section);
      }
    });
    
    // التحقق مما إذا كانت جميع الأقسام قد تمت زيارتها
    const allSectionsVisited = sections.every(section => visitedSections.has(section));
    
    return { visitedSections, allSectionsVisited };
  }
  
  /**
   * الحصول على قائمة أقسام المنصة
   * @returns {Array<String>} - قائمة الأقسام
   */
  getSectionsList() {
    // المسارات التي تظهر في الشريط الجانبي (بدون قسم الإدارة)
    return [
      'dashboard',           // الرئيسية 
      'get-access-token',    // الحصول على رمز الوصول
      'auto-post-group',     // النشر التلقائي في المجموعات
      'mygroup-extractor',   // استخراج المجموعات
      'comment-extractor',   // استخراج التعليقات
      'reaction-extractor',  // استخراج التفاعلات
      'achievements',        // الإنجازات
      'profile'              // الملف الشخصي
    ];
  }
  
  /**
   * حساب نسبة اكتمال الملف الشخصي
   * @param {Object} user - بيانات المستخدم
   * @returns {Number} - نسبة الاكتمال (0-100)
   */
  calculateProfileCompletion(user) {
    // تحديد الحقول المطلوبة لاكتمال الملف الشخصي
    const requiredFields = ['name', 'email', 'username', 'phone', 'address', 'bio', 'avatar'];
    
    // حساب عدد الحقول المكتملة
    let completedFields = 0;
    
    for (const field of requiredFields) {
      if (user[field] && 
          (typeof user[field] !== 'string' || user[field].trim() !== '') && 
          (field !== 'avatar' || !user[field].includes('default'))) {
        completedFields++;
      }
    }
    
    // حساب نسبة الاكتمال
    return Math.round((completedFields / requiredFields.length) * 100);
  }
  
  /**
   * فحص إنجازات العدد (عدد مرات القيام بنشاط معين)
   * @param {String} userId - معرف المستخدم
   * @param {Object} requirement - متطلبات الإنجاز
   * @param {Number} currentProgress - التقدم الحالي
   * @returns {Promise<Object>} - التقدم المحدث وحالة الإنجاز
   */
  async checkCountAchievement(userId, requirement, currentProgress) {
    try {
      const { action, target } = requirement;
      
      // الحصول على جميع العمليات من النوع المطلوب
      const userActions = await this.models.UserAction.find({
        userId,
        actionType: action
      });
      
      // حساب مجموع العد لكل الإجراءات
      let totalCount = 0;
      
      for (const action of userActions) {
        // إضافة قيمة count من كل إجراء (إذا كانت موجودة)، وإلا إضافة 1
        totalCount += (action.count || 1);
      }
      
      console.log(`[Achievement Debug] User ${userId} has total ${totalCount} actions of type ${action}`);
      
      // تحديث التقدم
      const updatedProgress = Math.max(currentProgress, totalCount);
      
      // التحقق من استيفاء المتطلبات
      const isUnlocked = updatedProgress >= target;
      
      return { updatedProgress, isUnlocked };
    } catch (error) {
      console.error('[Count Achievement Error]', error);
      return { updatedProgress: currentProgress, isUnlocked: false };
    }
  }
  
  /**
   * فحص إنجازات الاستمرارية (مثل تسجيل الدخول لأيام متتالية)
   * @param {String} userId - معرف المستخدم
   * @param {Object} requirement - متطلبات الإنجاز
   * @returns {Promise<Object>} - معلومات الاستمرارية
   */
  async checkStreakAchievement(userId, requirement) {
    try {
      const { action, target } = requirement;
      
      // الحصول على تاريخ اليوم
      const today = new Date();
      today.setHours(0, 0, 0, 0); // تنسيق لبداية اليوم
      
      // تحديد فترة الـ 30 يوم السابقة للتحقق
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // الحصول على عمليات المستخدم بالترتيب الزمني
      const loginActions = await this.models.UserAction.find({
        userId,
        actionType: action,
        createdAt: { $gte: thirtyDaysAgo }
      }).sort({ createdAt: 1 });
      
      // التحقق من وجود المستخدم
      const userExists = await this.models.User.exists({ _id: userId });
      
      // إذا كان المستخدم موجود ولكن لا توجد إجراءات تسجيل دخول، نعتبر أن هناك تتابع بقيمة 1 على الأقل
      // هذا يضمن أن المستخدم الذي سجل دخوله مرة واحدة يبدأ بقيمة 1/7 بدلاً من 0/7
      if (!loginActions || loginActions.length === 0) {
        if (userExists) {
          return { streak: 1, isStreakAchieved: 1 >= target };
        }
        return { streak: 0, isStreakAchieved: false };
      }
      
      // تنظيم الأيام التي سجل فيها دخول (يوم واحد فقط لكل يوم تقويمي)
      const daysMap = new Map();
      
      loginActions.forEach(action => {
        const date = new Date(action.createdAt);
        date.setHours(0, 0, 0, 0); // تنسيق لبداية اليوم
        
        const dayKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        if (!daysMap.has(dayKey)) {
          daysMap.set(dayKey, date);
        }
      });
      
      // تحويل إلى مصفوفة مرتبة زمنياً
      const loginDates = Array.from(daysMap.values()).sort((a, b) => a - b);
      
      // حساب أطول تتابع متوالي
      let currentStreak = 1; // بدء العد من 1 لليوم الأول
      let maxStreak = 1;
      
      // فحص التتابع المتوالي - طريقة محسنة
      for (let i = 1; i < loginDates.length; i++) {
        // الحصول على تاريخ تسجيل الدخول السابق والحالي
        const prevDate = loginDates[i-1];
        const currDate = loginDates[i];
        
        // حساب الفرق بالأيام بين تاريخي تسجيل الدخول
        const diffTime = Math.abs(currDate - prevDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // إذا كانت التواريخ متتالية (بفارق يوم واحد)
        if (diffDays === 1) {
          currentStreak++;
          // تحديث أطول تتابع إذا كان الحالي أكبر
          maxStreak = Math.max(maxStreak, currentStreak);
        } else {
          // إعادة تعيين التتابع إذا لم تكن التواريخ متتالية
          currentStreak = 1;
        }
      }
      
      // التحقق مما إذا كان التتابع نشطًا (يشمل اليوم أو الأمس)
      const lastLoginDate = new Date(loginDates[loginDates.length - 1]);
      lastLoginDate.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      // إذا كان آخر تسجيل دخول هو اليوم، حافظ على التتابع
      // إذا كان بالأمس، حافظ على نشاط التتابع
      // خلاف ذلك، أعد تعيين التتابع الحالي (ولكن يبقى أطول تتابع)
      const isStreakActive = (
        lastLoginDate.getTime() === today.getTime() || 
        lastLoginDate.getTime() === yesterday.getTime()
      );
      
      // استخدام التتابع الحالي إذا كان نشطًا، وإلا استخدام الحد الأدنى
      let streak = isStreakActive ? currentStreak : 1;
      
      // إذا كان هناك أطول تتابع سابق أكبر، استخدمه بدلاً من ذلك
      streak = Math.max(streak, maxStreak);
      
      // تسجيل تفاصيل التتابع للتصحيح
      console.log(`[Streak Debug] User ${userId}, LoginDates: ${loginDates.length}, MaxStreak: ${maxStreak}, CurrentStreak: ${currentStreak}, IsActive: ${isStreakActive}, FinalStreak: ${streak}`);
      
      return { 
        streak, 
        isStreakAchieved: streak >= target 
      };
    } catch (error) {
      console.error('[Streak Achievement Error]', error);
      return { streak: 0, isStreakAchieved: false };
    }
  }
  
  /**
   * منح نقاط مكافأة للإنجاز
   * @param {String} userId - معرف المستخدم
   * @param {Number} points - عدد النقاط
   * @param {String} achievementTitle - عنوان الإنجاز
   * @returns {Promise<void>}
   */
  async awardAchievementPoints(userId, points, achievementTitle) {
    try {
      // التأكد من أن النقاط رقم صحيح موجب
      points = Math.max(0, parseInt(points) || 0);
      
      if (points <= 0) return;
      
      // تحديث نقاط المستخدم
      const user = await this.models.User.findById(userId);
      if (!user) return;
      
      user.points += points;
      user.allPoints += points;
      await user.save();
      
      // تسجيل النقاط في الحركات المالية
      await this.models.Transaction.create({
        userId,
        amount: points,
        type: 'achievement',
        status: 'completed',
        description: `مكافأة إنجاز: ${achievementTitle}`,
        details: {
          achievementTitle
        }
      });
      
    } catch (error) {
      console.error('[Award Points Error]', error);
    }
  }
  
  /**
   * تسجيل فتح الإنجاز في سجل الأنشطة
   * @param {String} userId - معرف المستخدم
   * @param {Object} achievement - بيانات الإنجاز
   * @returns {Promise<void>}
   */
  async logAchievementUnlock(userId, achievement) {
    try {
      await this.models.UserAction.create({
        userId,
        actionType: 'achievement',
        details: {
          title: `فتح إنجاز جديد: ${achievement.title}`,
          description: achievement.description,
          achievementId: achievement._id,
          achievementType: achievement.type
        },
        module: 'achievement',
        count: 1
      });
    } catch (error) {
      console.error('[Log Achievement Unlock Error]', error);
    }
  }
  
  /**
   * تهيئة إنجازات المستخدم
   * @param {String} userId - معرف المستخدم
   * @returns {Promise<void>}
   */
  async initializeUserAchievements(userId) {
    try {
      this.log('INFO', 'Achievement', `Initializing achievements for user ${userId}`);
      
      // الحصول على المستخدم
      const user = await this.models.User.findById(userId);
      if (!user) {
        throw new Error('المستخدم غير موجود');
      }
      
      // الحصول على جميع الإنجازات النشطة
      const achievements = await this.models.Achievement.find({ isActive: true });
      this.log('DEBUG', 'Achievement', `Found ${achievements.length} active achievements to initialize`);
      
      // الحصول على إنجازات المستخدم الحالية
      const existingUserAchievements = await this.models.UserAchievement.find({ userId });
      
      // إنشاء مجموعة من معرفات الإنجازات الموجودة بالفعل
      const existingAchievementIds = new Set(
        existingUserAchievements.map(ua => ua.achievementId.toString())
      );
      
      this.log('DEBUG', 'Achievement', `User already has ${existingUserAchievements.length} achievements`);
      
      // تهيئة الإنجازات بشكل فردي لتجنب أخطاء النسخ المكرر
      let achievementsCreated = 0;
      
      for (const achievement of achievements) {
        // التحقق مما إذا كان المستخدم لديه بالفعل هذا الإنجاز
        if (existingAchievementIds.has(achievement._id.toString())) {
          this.log('DEBUG', 'Achievement', `Achievement ${achievement.title} already exists for user`);
          continue;
        }
        
        // تحديد ما إذا كان يجب فتح الإنجاز بالفعل
        let unlocked = false;
        let progress = 0;
        
        // إجراء الفحوصات الأولية بناءً على نوع الإنجاز
        if (achievement.type === 'login' && achievement.requirement.type === 'count' && achievement.requirement.target === 1) {
          // فتح إنجاز أول تسجيل دخول تلقائيًا
          unlocked = true;
          progress = 1;
        } else if (achievement.requirement.type === 'level') {
          // التحقق من المستوى
          progress = user.level || 1;
          unlocked = progress >= achievement.requirement.target;
        } else if (achievement.requirement.type === 'points') {
          // التحقق من النقاط
          progress = user.allPoints || 0;
          unlocked = progress >= achievement.requirement.target;
        } else if (achievement.requirement.type === 'profile_completion') {
          // حساب نسبة اكتمال الملف الشخصي
          progress = this.calculateProfileCompletion(user);
          unlocked = progress >= achievement.requirement.target;
        }
        
        try {
          // إنشاء الإنجاز بشكل فردي باستخدام upsert لتجنب الازدواجية
          // نحذف createdAt و updatedAt لأن mongoose يديرها تلقائيًا مع timestamps: true
          const result = await this.models.UserAchievement.findOneAndUpdate(
            {
              userId,
              achievementId: achievement._id
            },
            {
              $setOnInsert: {
                userId,
                achievementId: achievement._id,
                unlocked,
                progress,
                unlockDate: unlocked ? new Date() : null,
                viewed: false
                // لا نحدد createdAt أو updatedAt لتجنب التعارض مع timestamps
              }
            },
            {
              upsert: true, // إنشاء إذا لم يكن موجوداً
              new: true,     // إرجاع الوثيقة بعد التحديث
              includeResultMetadata: true // استبدال rawResult لتجنب تحذير الإهمال
            }
          );
          
          const isNewAchievement = result.lastErrorObject?.upserted !== undefined;
          
          if (isNewAchievement) {
            achievementsCreated++;
            this.log('DEBUG', 'Achievement', `Created new achievement ${achievement.title} for user`);
            
            // إذا تم فتح الإنجاز، قم بإنشاء الإجراءات المرتبطة
            if (unlocked) {
              // منح نقاط المكافأة إذا كانت محددة
              if (achievement.pointsReward && achievement.pointsReward > 0) {
                await this.awardAchievementPoints(userId, achievement.pointsReward, achievement.title);
              }
              
              // تسجيل فتح الإنجاز
              await this.logAchievementUnlock(userId, achievement);
            }
          }
        } catch (error) {
          // تجاهل أخطاء المفتاح المكرر، لكن سجل الأخطاء الأخرى
          if (error.code !== 11000) {
            this.log('ERROR', 'Achievement', `Error creating achievement ${achievement.title}: ${error.message}`);
          }
        }
      }
      
      this.log('INFO', 'Achievement', `Initialized ${achievementsCreated} new achievements for user ${userId}`);
    } catch (error) {
      this.log('ERROR', 'Achievement', `Initialize achievements error: ${error.message}`);
    }
  }
  
  /**
   * الحصول على إنجازات المستخدم
   * @param {String} userId - معرف المستخدم
   * @param {Object} options - خيارات الفرز والتصفية
   * @returns {Promise<Array>} - قائمة الإنجازات
   */
  async getUserAchievements(userId, options = {}) {
    try {
      // التأكد من وجود تهيئة لإنجازات المستخدم
      const userAchievementsCount = await this.models.UserAchievement.countDocuments({ userId });
      
      if (userAchievementsCount === 0) {
        await this.initializeUserAchievements(userId);
      }
      
      // خيارات الفلترة
      const filter = { userId };
      
      if (options.type) {
        filter['achievementId.type'] = options.type;
      }
      
      if (options.unlocked === true || options.unlocked === false) {
        filter.unlocked = options.unlocked;
      }
      
      // خيارات الترتيب
      const sort = {};
      
      if (options.sort) {
        const [field, order] = options.sort.split(':');
        sort[field] = order === 'desc' ? -1 : 1;
      } else {
        // الترتيب الافتراضي: المفتوحة أولاً، ثم حسب التاريخ (الأحدث أولاً)
        sort.unlocked = -1;
        sort.unlockDate = -1;
      }
      
      // الحصول على الإنجازات
      const userAchievements = await this.models.UserAchievement.find(filter)
        .populate('achievementId')
        .sort(sort)
        .limit(options.limit || 100);
      
      // تنسيق النتائج
      return userAchievements.map(ua => {
        const achievement = ua.achievementId;
        
        return {
          id: achievement._id,
          title: achievement.title,
          description: achievement.description,
          titleKey: achievement.titleKey || '',
          descriptionKey: achievement.descriptionKey || '',
          type: achievement.type,
          icon: achievement.icon,
          unlocked: ua.unlocked,
          progress: ua.progress || 0,
          target: achievement.requirement?.target || 1,
          date: ua.unlocked ? ua.unlockDate : null,
          viewed: ua.viewed,
          pointsAwarded: achievement.pointsReward || 0
        };
      });
    } catch (error) {
      console.error('[Get User Achievements Error]', error);
      return [];
    }
  }
  
  /**
   * الحصول على إحصائيات الإنجازات للمستخدم
   * @param {String} userId - معرف المستخدم
   * @returns {Promise<Object>} - إحصائيات الإنجازات
   */
  async getAchievementStats(userId) {
    try {
      // الحصول على كل إنجازات المستخدم
      const userAchievements = await this.models.UserAchievement.find({ userId })
        .populate('achievementId');
      
      if (!userAchievements || userAchievements.length === 0) {
        return {
          total: 0,
          unlocked: 0,
          completion: 0,
          types: {}
        };
      }
      
      // حساب الإحصائيات
      const totalAchievements = userAchievements.length;
      const unlockedAchievements = userAchievements.filter(ua => ua.unlocked).length;
      const completion = Math.round((unlockedAchievements / totalAchievements) * 100);
      
      // حساب الإحصائيات حسب النوع
      const types = {};
      
      // معالجة أكثر قوة للبيانات
      try {
        for (const ua of userAchievements) {
          try {
            // تحقق من وجود الإنجاز والنوع - استخدام optional chaining
            const achievementType = ua?.achievementId?.type;
            
            // تخطي الإنجازات غير الصالحة
            if (!achievementType) {
              console.warn(`[Achievement Stats] Invalid achievement reference for user ${userId}: ${ua?._id}`);
              continue;
            }
            
            // إنشاء القيم الافتراضية إذا لم تكن موجودة
            if (!types[achievementType]) {
              types[achievementType] = {
                total: 0,
                unlocked: 0,
                completion: 0
              };
            }
            
            // زيادة عداد الإجمالي
            types[achievementType].total++;
            
            // زيادة عداد المفتوحة إذا كان الإنجاز مفتوحًا
            if (ua.unlocked) {
              types[achievementType].unlocked++;
            }
          } catch (innerError) {
            // تسجيل الخطأ لهذا الإنجاز المحدد ولكن استمر في المعالجة
            console.error(`[Achievement Stats Inner Error] Error processing achievement: ${innerError.message}`);
          }
        }
      } catch (loopError) {
        console.error(`[Achievement Stats Loop Error] ${loopError.message}`);
      }
      
      // حساب نسبة الإكمال لكل نوع
      Object.keys(types).forEach(type => {
        types[type].completion = Math.round(
          (types[type].unlocked / types[type].total) * 100
        );
      });
      
      return {
        total: totalAchievements,
        unlocked: unlockedAchievements,
        completion,
        types
      };
    } catch (error) {
      console.error('[Achievement Stats Error]', error);
      return {
        total: 0,
        unlocked: 0,
        completion: 0,
        types: {}
      };
    }
  }
}

module.exports = AchievementService;