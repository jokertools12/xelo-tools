const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const userController = require('../controllers/userController');
const adminController = require('../controllers/adminController');
const achievementController = require('../controllers/achievementController');
const settingsController = require('../controllers/settingsController');
const activityController = require('../controllers/activityController');
const { upload } = require('../middleware/upload');

// استيراد مسارات الدعم الفني
const supportRoutes = require('./api/support');
// استيراد مسارات اللغات
const languageRoutes = require('./api/language');
// استيراد مسارات الرسائل المجدولة
const scheduledMessagesRoutes = require('./api/scheduledMessages');
// استيراد مسارات الرسائل الفورية
const instantMessagesRoutes = require('./api/instantMessages');
// استيراد مسارات النشر الفوري في المجموعات
const instantGroupPostsRoutes = require('./api/instantGroupPosts');
// استيراد مسارات نظام العضوية
const membershipPlansRoutes = require('./api/membershipPlans');
// استيراد مسارات رسائل الصفحات
const pageMessagesRoutes = require('./api/pageMessages');
const subscriptionRoutes = require('./api/subscriptions');
const paymentRoutes = require('./api/payments');
// استيراد مسارات المحفظة
const walletRoutes = require('./api/wallet');
// استيراد مسارات أسعار الصرف
const currencyRatesRoutes = require('./api/currencyRates');
// استيراد مسارات النقاط
const pointsRoutes = require('./api/points');
// استيراد مسارات الوكيل لـ Facebook API
const facebookProxyRoutes = require('./api/facebookProxy');
// استيراد مسارات الذكاء الاصطناعي
const aiRoutes = require('./api/ai');
// استيراد مسارات نظام الرد على التعليقات
const commentResponsesRoutes = require('./api/commentResponses');

// تسجيل مسارات الدعم الفني
router.use('/support', supportRoutes);
// تسجيل مسارات اللغات
router.use('/languages', languageRoutes);
// تسجيل مسارات الرسائل المجدولة
router.use('/scheduled-messages', scheduledMessagesRoutes);
// تسجيل مسارات الرسائل الفورية
router.use('/instant-messages', instantMessagesRoutes);
// تسجيل مسارات النشر الفوري في المجموعات
router.use('/instant-group-posts', instantGroupPostsRoutes);
// تسجيل مسارات نظام العضوية
router.use('/membership-plans', membershipPlansRoutes);
// تسجيل مسارات رسائل الصفحات
router.use('/pagemessages', pageMessagesRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/payments', paymentRoutes);
// تسجيل مسارات المحفظة
router.use('/wallet', walletRoutes);
// تسجيل مسارات أسعار الصرف
router.use('/currency-rates', currencyRatesRoutes);
// تسجيل مسارات النقاط
router.use('/points', pointsRoutes);
// تسجيل مسارات الوكيل لـ Facebook API
router.use('/facebook', facebookProxyRoutes);
// تسجيل مسارات الذكاء الاصطناعي
router.use('/ai', aiRoutes);
// تسجيل مسارات نظام الرد على التعليقات
router.use('/comment-responses', commentResponsesRoutes);

// مسارات المستخدم
router.post('/users/register', userController.registerUser);
router.post('/users/login', userController.loginUser);
router.get('/users/profile', protect, userController.getProfile);
router.put('/users/profile', protect, userController.updateProfile);
router.put('/users/change-password', protect, userController.changePassword);
router.post('/users/upload-avatar', protect, upload.single('avatar'), userController.uploadAvatar);
router.post('/users/save-access-token', protect, userController.saveAccessToken);
router.get('/users/access-tokens', protect, userController.getUserAccessTokens);
router.delete('/users/access-tokens/:id', protect, userController.deleteAccessToken);
router.patch('/users/access-tokens/:id/set-active', protect, userController.setAccessTokenActive);
router.put('/users/stats', protect, userController.updateUserStats);
router.get('/users/transactions', protect, userController.getUserTransactions);
router.post('/users/basic-info', protect, userController.getUsersBasicInfo);

// مسارات إعادة تعيين كلمة المرور
router.post('/users/forgot-password', userController.forgotPassword);
router.post('/users/reset-password/:token', userController.resetPassword);

// إزالة المسار المكرر للأنشطة
// router.get('/users/activities', protect, userController.getUserActivities);

// مسارات الإنجازات
router.get('/achievements', protect, admin, achievementController.getAllAchievements);
router.post('/achievements', protect, admin, achievementController.createAchievement);
router.get('/users/achievements', protect, achievementController.getUserAchievements);
router.put('/users/achievements/:id/viewed', protect, achievementController.markAchievementViewed);
router.post('/users/check-achievements', protect, achievementController.checkNewAchievements);
router.post('/users/achievements/initialize', protect, achievementController.initializeAchievements);

// مسارات الإعدادات
router.get('/users/settings', protect, settingsController.getUserSettings);
router.put('/users/settings', protect, settingsController.updateUserSettings);
router.post('/users/settings/reset', protect, settingsController.resetUserSettings);

// مسارات الأنشطة
router.get('/users/activities', protect, activityController.getUserActivities);
router.post('/users/activities', protect, activityController.addActivity);
router.post('/users/activities/initialize', protect, activityController.initializeActivities);
router.get('/activities', protect, activityController.getAllActivities); // مسار جديد لجلب الأنشطة من جميع المستخدمين

// مسارات لوحة التحكم
router.get('/dashboard', protect, userController.getDashboardData);

// مسارات المشرف (Admin)
router.get('/admin/users', protect, admin, adminController.getAllUsers);
router.post('/admin/users', protect, admin, adminController.createUser);
router.put('/admin/users/:id', protect, admin, adminController.updateUser);
router.delete('/admin/users/:id', protect, admin, adminController.deleteUser);
router.post('/admin/reset-password/:id', protect, admin, adminController.resetPassword);
router.post('/admin/add-points', protect, admin, adminController.addPointsToUser);
router.get('/admin/user-activities/:userId', protect, admin, adminController.getUserActivities);
router.get('/admin/points-history/:userId', protect, admin, adminController.getUserPointsHistory);

// مسارات فريق الدعم (Support Team)
const { getAdminTeam } = require('../controllers/supportController');
router.get('/admin/team', protect, admin, getAdminTeam);

// تصدير الموجه
module.exports = router;