const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const apiRoutes = require('./routes/api');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const AchievementService = require('./utils/achievementService');
const { checkAchievements, trackSectionVisit } = require('./middleware/achievementMiddleware');
const Achievement = require('./models/Achievement');
const UserAchievement = require('./models/UserAchievement');
const Language = require('./models/Language');

// تضمين النماذج (إذا كان ذلك ضروريًا في تطبيقك)
require('./models/User');
require('./models/AccessToken');
// Models are already imported above with full references

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

// تهيئة نماذج قاعدة البيانات للمشاركة في التطبيق
const models = {
  User: mongoose.model('User'),
  UserAction: mongoose.model('UserAction'),
  Achievement: mongoose.model('Achievement'),
  UserAchievement: mongoose.model('UserAchievement'),
  Transaction: mongoose.model('Transaction'),
  Language: mongoose.model('Language')
};

// Connect to MongoDB database
const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/admin-dashboard', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB Connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    // Don't exit process on MongoDB error to allow MySQL to still work
  }
};

const app = express();
// Initialize database connections
connectMongoDB();
// إضافة إنشاء المجلدات اللازمة عند بدء التشغيل

// إنشاء إنجازات افتراضية إذا لم تكن موجودة
const seedDefaultAchievements = async () => {
  try {
    const count = await Achievement.countDocuments();
    if (count === 0) {
      console.log('تهيئة الإنجازات الافتراضية...');
      
      const defaultAchievements = [
        {
          title: 'achievement_title_welcome',
          description: 'achievement_desc_welcome',
          titleKey: 'achievement_title_welcome',
          descriptionKey: 'achievement_desc_welcome',
          type: 'login',
          icon: 'https://cdn-icons-png.flaticon.com/512/3237/3237472.png',
          requirement: {
            type: 'count',
            action: 'login',
            target: 1
          },
          pointsReward: 50,
          isActive: true
        },
        {
          title: 'achievement_title_explorer',
          description: 'achievement_desc_explorer',
          titleKey: 'achievement_title_explorer',
          descriptionKey: 'achievement_desc_explorer',
          type: 'explorer',
          icon: 'https://cdn-icons-png.flaticon.com/512/2997/2997017.png',
          requirement: {
            type: 'visit_all_sections',
            target: 5
          },
          pointsReward: 150,
          isActive: true
        },
        {
          title: 'achievement_title_profile_complete',
          description: 'achievement_desc_profile_complete',
          titleKey: 'achievement_title_profile_complete',
          descriptionKey: 'achievement_desc_profile_complete',
          type: 'profile',
          icon: 'https://cdn-icons-png.flaticon.com/512/3135/3135789.png',
          requirement: {
            type: 'profile_completion',
            target: 100
          },
          pointsReward: 250,
          isActive: true
        },
        {
          title: 'achievement_title_persistent',
          description: 'achievement_desc_persistent',
          titleKey: 'achievement_title_persistent',
          descriptionKey: 'achievement_desc_persistent',
          type: 'login',
          icon: 'https://cdn-icons-png.flaticon.com/512/2091/2091739.png',
          requirement: {
            type: 'streak',
            action: 'login',
            target: 7
          },
          pointsReward: 350,
          isActive: true
        },
        {
          title: 'achievement_title_participant',
          description: 'achievement_desc_participant',
          titleKey: 'achievement_title_participant',
          descriptionKey: 'achievement_desc_participant',
          type: 'posts',
          icon: 'https://cdn-icons-png.flaticon.com/512/4712/4712109.png',
          requirement: {
            type: 'count',
            action: 'post',
            target: 10
          },
          pointsReward: 500,
          isActive: true
        }
      ];
      
      await Achievement.insertMany(defaultAchievements);
      console.log(`تم إنشاء ${defaultAchievements.length} إنجازات افتراضية`);
    }
  } catch (error) {
    console.error('Error seeding default achievements:', error);
  }
};

// تنفيذ تهيئة الإنجازات الافتراضية عند بدء التشغيل
seedDefaultAchievements();

// Add a function to seed default languages (Arabic and English) when the server starts
const seedDefaultLanguages = async () => {
  try {
    const count = await Language.countDocuments();
    if (count === 0) {
      console.log('تهيئة اللغات الافتراضية...');
      
      const defaultLanguages = [
        {
          name: 'Arabic',
          nativeName: 'العربية',
          code: 'ar',
          direction: 'rtl',
          isActive: true,
          isDefault: true,
          icon: '/public/flags/ar.png'
        },
        {
          name: 'English',
          nativeName: 'English',
          code: 'en',
          direction: 'ltr',
          isActive: true,
          isDefault: false,
          icon: '/public/flags/en.png'
        }
      ];
      
      await Language.insertMany(defaultLanguages);
      console.log(`تم إنشاء ${defaultLanguages.length} لغة افتراضية`);
    }
  } catch (error) {
    console.error('Error seeding default languages:', error);
  }
};

// Run the seedDefaultLanguages function when the server starts
seedDefaultLanguages();

// تهيئة خدمة الإنجازات بعد إنشاء التطبيق
const achievementService = new AchievementService(models);
app.set('achievementService', achievementService);
app.set('models', models);
console.log('Achievement Service initialized');
// إنشاء المجلدات اللازمة إذا لم تكن موجودة
const createRequiredDirs = () => {
  const dirs = [
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'uploads/avatars'),
    path.join(__dirname, 'public')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`تم إنشاء المجلد: ${dir}`);
    }
  });
};

// استدعاء الدالة قبل بدء الخادم
createRequiredDirs();
// تحسين إعدادات CORS

// وسيط تتبع زيارة الأقسام المختلفة
app.use(trackSectionVisit);
// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : 'http://localhost:3000',
  credentials: true
}));
// Aumentar límites para permitir subir archivos más grandes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
// إضافة معالج وسيط لتصفية طلبات webpack HMR
// أضف هذا الكود قبل التعريفات الأخرى للوسطاء
// تجاهل طلبات webpack hot update
app.use((req, res, next) => {
  if (req.url.includes('hot-update')) {
    // تجاهل طلبات التحديث الساخن
    return res.status(200).end();
  }
  next(); // استمرار للطلبات الأخرى
});
// تعديل مسارات الملفات الثابتة
// إنشاء مجلد للأصول الثابتة
app.use(express.static(path.join(__dirname, 'public')));
// تحسين خدمة الملفات الثابتة
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// توجيه لملفات الأفاتار افتراضية لتجنب الأخطاء 404
app.get('/public/default-avatar.png', (req, res) => {
  // استخدام صورة افتراضية احتياطية إذا لم تكن موجودة
  res.sendFile(path.join(__dirname, 'public', 'default-avatar.png'), err => {
    if (err) {
      console.log('Default avatar not found, sending fallback');
      // إرسال أيقونة مستخدم بسيطة
      const fallbackPath = path.join(__dirname, 'public', 'fallback-avatar.png');
      if (fs.existsSync(fallbackPath)) {
        res.sendFile(fallbackPath);
      } else {
        res.status(404).send('Avatar not found');
      }
    }
  });
});
// إضافة معالج خاص لـ favicon.ico
app.get('/favicon.ico', (req, res) => {
  // إذا كان لديك ملف favicon.ico، قم بتقديمه
  if (fs.existsSync(path.join(__dirname, 'public', 'favicon.ico'))) {
    res.sendFile(path.join(__dirname, 'public', 'favicon.ico'));
  } else {
    // إذا لم يكن موجوداً، قم بإرسال استجابة فارغة بحالة 204 (No Content)
    res.status(204).end();
  }
});
// الملفات المرفوعة
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Points system routes
const pointsController = require('./controllers/pointsController');
const dataSecretController = require('./controllers/dataSecretController');
const { protect } = require('./middleware/auth');
app.post('/api/check-points', protect, pointsController.checkPoints);
app.post('/api/deduct-points', protect, pointsController.deductPoints);
app.post('/api/add-points', protect, pointsController.addPoints);
// DataSecret routes
app.post('/api/extract-user-data', protect, dataSecretController.extractUserData);

// مسارات الإنجازات
app.use('/api/achievements', require('./routes/achievementRoutes'));

// تطبيق وسيط فحص الإنجازات على جميع مسارات API
app.use('/api', checkAchievements);
// API routes
app.use('/api', apiRoutes);
app.use('/api/templates', require('./routes/api/templates'));
app.use('/api/group-lists', require('./routes/api/groupLists'));
app.use('/api/post-history', require('./routes/api/postHistory'));
app.use('/api/scheduled-posts', require('./routes/api/scheduledPosts'));
app.use('/api/ai', require('./routes/api/ai'));

// Scheduler service to process scheduled posts
const checkScheduledPosts = async () => {
  try {
    // Find all pending scheduled posts that are due to run
    const ScheduledPost = require('./models/ScheduledPost');
    const PostHistory = require('./models/PostHistory');
    const now = new Date();
    const pendingPosts = await ScheduledPost.find({
      status: 'pending',
      scheduledTime: { $lte: now }
    }).populate('user', 'accessToken');

    console.log(`Found ${pendingPosts.length} pending scheduled posts to process`);
    
    for (const post of pendingPosts) {
      console.log(`Processing scheduled post: ${post._id}`);
      
      // Mark post as processing to prevent duplicate processing
      post.status = 'processing';
      await post.save();
      
      try {
        // First try to use the access token stored in the scheduled post itself
        // This ensures each post uses the token that was active when it was scheduled
        let accessToken = post.accessToken;
        
        // Fall back to user's access token only if the post doesn't have one (for backwards compatibility)
        if (!accessToken) {
          if (!post.user || !post.user.accessToken) {
            throw new Error('رمز الوصول غير متوفر في المنشور المجدول أو للمستخدم');
          }
          accessToken = post.user.accessToken;
          console.log(`Using user's current access token as fallback for post ${post._id}`);
        }
        
        // Track start time for the entire process
        const processStartTime = Date.now();
        
        // Actual implementation that calls the Facebook API for each group
        let successCount = 0;
        let failureCount = 0;
        let postTimes = []; // To track individual post times
        
        // Generate random code if enabled
        let randomCode = '';
        if (post.enableRandomCode) {
          const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
          for (let i = 0; i < 6; i++) {
            randomCode += characters.charAt(Math.floor(Math.random() * characters.length));
          }
        }
        
        // Process each group with proper delay
        for (const groupId of post.groups) {
          try {
            // Validate group ID format before attempting to post
            // Facebook group IDs are typically numeric and at least 5 digits
            const isValidGroupId = /^\d{5,}$/.test(groupId.toString().trim());
            
            if (!isValidGroupId) {
              console.warn(`Invalid group ID format: ${groupId}. Skipping this group.`);
              failureCount++;
              continue; // Skip to next group
            }
            
            // Prepare message and parameters based on post type
            let formattedText = post.messageText;
            
            // Add random code if enabled
            if (post.enableRandomCode && randomCode) {
              formattedText += `\n\nCode: ${randomCode}`;
            }
            
            const url = `https://graph.facebook.com/v18.0/${groupId}/feed`;
            let params = {
              message: formattedText,
              access_token: accessToken
            };
            
            // Add link parameter for image or video posts
            if (post.postType === 'imageUrl' && post.imageUrl) {
              params.link = post.imageUrl;
            } else if (post.postType === 'videoUrl' && post.videoUrl) {
              params.link = post.videoUrl;
            }
            
            // Make the API call to Facebook
            const axios = require('axios');
            const response = await axios.post(url, null, { params });
            
            if (response.data && response.data.id) {
              successCount++;
              console.log(`Successfully posted to group ${groupId}`);
            } else {
              failureCount++;
              console.log(`Failed to post to group ${groupId} - no post ID returned`);
            }
            
            // Add delay between posts if enabled
            if (post.enableDelay && post.delay > 0 && groupId !== post.groups[post.groups.length - 1]) {
              console.log(`Adding delay of ${post.delay} seconds before next post`);
              
              // Make delay more robust with explicit promise handling
              const delayPromise = new Promise(resolve => {
                const startTime = Date.now();
                const timer = setTimeout(() => {
                  const actualDelay = (Date.now() - startTime) / 1000;
                  console.log(`Delay completed. Actual delay time: ${actualDelay.toFixed(2)} seconds`);
                  resolve();
                }, post.delay * 1000);
                
                // Ensure timer reference is maintained
                timer.unref();
              });
              
              // Explicitly await the delay promise
              await delayPromise;
              console.log(`Delay completed, continuing to next group post`);
            }
          } catch (groupError) {
            failureCount++;
            
            // Enhanced error logging with more specific information
            if (groupError.response) {
              // The request was made and the server responded with a status code
              // that falls out of the range of 2xx
              console.error(`Error posting to group ${groupId}: Status ${groupError.response.status} - ${groupError.response.statusText}`);
              console.error(`Error details: ${JSON.stringify(groupError.response.data || {})}`);
            } else if (groupError.request) {
              // The request was made but no response was received
              console.error(`Error posting to group ${groupId}: No response received from server`);
            } else {
              // Something happened in setting up the request that triggered an Error
              console.error(`Error posting to group ${groupId}: ${groupError.message}`);
            }
          }
        }
        
        // Calculate total process time
        const processEndTime = Date.now();
        const totalProcessingTime = (processEndTime - processStartTime) / 1000; // in seconds
        const totalPosts = successCount + failureCount;
        const averagePostTime = totalPosts > 0 ? (totalProcessingTime / totalPosts) : 0;
        
        // تحديد تكلفة النقاط لكل منشور وتنبيهات النقاط (يجب أن تكون متطابقة مع قيمة في المتحكمات الأخرى)
        const POINTS_PER_POST = 1;

        // أنواع التنبيهات لتوحيد الرسائل
        const NOTIFICATION_TYPES = {
          POINTS_DEDUCTED: 'تم خصم النقاط',
          POINTS_REFUNDED: 'تم استرداد النقاط',
          POINTS_INSUFFICIENT: 'رصيد النقاط غير كافٍ'
        };

        // Calculate failed posts and refund points if needed
        if (failureCount > 0) {
          try {
            const User = require('./models/User');
            const Transaction = require('./models/Transaction');
            const UserAction = require('./models/UserAction');
            
          // Get the user
          const user = await User.findById(post.user._id);
          
          if (user) {
            // Get the total number of groups
            const totalPosts = post.groups.length;
            
            // Use deductedPoints if available, otherwise fall back to total posts count
            // This ensures backward compatibility with posts that don't have deductedPoints
            const totalPointsDeducted = post.deductedPoints || totalPosts;
            
            // Calculate how many points to refund based on the proportion of failed posts
            // This ensures fair refunding proportional to failure rate
            const proportionalRefund = totalPosts > 0 
              ? Math.round((failureCount / totalPosts) * totalPointsDeducted)
              : 0;
              
            // Ensure we don't refund more than what was deducted
            const pointsToRefund = Math.min(proportionalRefund, totalPointsDeducted);
            
            // Only proceed if we have points to refund
            if (pointsToRefund > 0) {
              // Refund points for failed posts - ONLY update points field, not allPoints
              // We already deducted points upfront, so this is just a refund
              user.points += pointsToRefund;
              
              // Record the transaction with more detailed description
              const transaction = new Transaction({
                userId: user._id,
                type: 'refund',
                amount: pointsToRefund,
                status: 'completed',
                description: `${NOTIFICATION_TYPES.POINTS_REFUNDED}: ${pointsToRefund} نقطة من أصل ${totalPointsDeducted}: فشل النشر في ${failureCount} مجموعة من ${totalPosts}`
              });
              
              // Record user action with more detailed info
              const userAction = new UserAction({
                userId: user._id,
                actionType: 'refund',
                details: {
                  points: pointsToRefund,
                  operation: 'refund',
                  failedPosts: failureCount,
                  totalPosts: totalPosts,
                  deductedPoints: totalPointsDeducted
                },
                module: 'points'
              });
              
              // Save all changes
              await Promise.all([
                user.save(),
                transaction.save(),
                userAction.save()
              ]);

              // Update post with refund info for transparency
              post.pointsRefunded = (post.pointsRefunded || 0) + pointsToRefund;
              await post.save();
                
                console.log(`Refunded ${pointsToRefund} points to user ${user._id} for ${failureCount} failed scheduled posts out of ${totalPointsDeducted} points originally deducted`);
              }
            }
          } catch (pointsError) {
            console.error('Error refunding points:', pointsError);
          }
        }
        
        // Update post status and results with properly initialized results object
        post.status = 'completed';
        // Initialize the results object to ensure it exists with timing information
        post.results = {
          successCount: successCount,
          failureCount: failureCount,
          completedAt: new Date(),
          totalTime: totalProcessingTime.toFixed(2),
          averageTime: averagePostTime.toFixed(2)
        };
        await post.save();
        
        // No longer creating a post history entry for scheduled posts
        // This ensures scheduled posts only appear in the scheduled posts tab
        // and are not duplicated in the regular post history
        
        console.log(`Completed scheduled post ${post._id} with ${successCount} successes and ${failureCount} failures`);
      } catch (error) {
        console.error(`Error processing scheduled post ${post._id}:`, error);
        
        // Mark as failed with properly initialized results
        post.status = 'failed';
        // Initialize the results object to ensure it exists
        post.results = {
          successCount: 0,
          failureCount: 0,
          completedAt: new Date()
        };
        await post.save();
      }
    }
  } catch (err) {
    console.error('Error checking scheduled posts:', err);
  }
};

// Cleanup old scheduled posts that are older than 3 days
const cleanupOldScheduledPosts = async () => {
  try {
    const ScheduledPost = require('./models/ScheduledPost');
    const { retryDbOperation } = require('./utils/delayUtils');
    
    // Calculate cutoff date (3 days ago)
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 72);
    
    // Find and delete completed or failed posts older than 3 days with retry mechanism
    const result = await retryDbOperation(async () => {
      return await ScheduledPost.deleteMany({
        status: { $in: ['completed', 'failed'] },
        'results.completedAt': { $lt: cutoffDate }
      });
    });
    
    if (result.deletedCount > 0) {
      console.log(`Cleanup: Deleted ${result.deletedCount} scheduled posts older than 3 days`);
    }
  } catch (err) {
    console.error('Error cleaning up old scheduled posts:', err);
  }
};

// Scheduler service to process scheduled messages
const checkScheduledMessages = async () => {
  try {
    // Find all pending scheduled messages that are due to run
    const ScheduledMessage = require('./models/ScheduledMessage');
    const User = require('./models/User');
    const Transaction = require('./models/Transaction');
    const UserAction = require('./models/UserAction');
    
    const now = new Date();
    const pendingMessages = await ScheduledMessage.find({
      status: 'pending',
      scheduledTime: { $lte: now }
    });

    console.log(`Found ${pendingMessages.length} pending scheduled messages to process`);
    
    for (const message of pendingMessages) {
      console.log(`Processing scheduled message: ${message._id}`);
      
      // Mark message as processing to prevent duplicate processing
      message.status = 'processing';
      message.processingStartedAt = new Date();
      await message.save();
      
      try {
        // Use the access token stored in the scheduled message
        const accessToken = message.accessToken;
        
        if (!accessToken) {
          throw new Error('رمز الوصول غير متوفر في الرسالة المجدولة');
        }
        
        // Track start time for the entire process
        const processStartTime = Date.now();
        
        // Actual implementation that calls the Facebook API for each recipient
        let successCount = 0;
        let failureCount = 0;
        let results = [];
        const axios = require('axios');
        
        // Process each recipient with proper delay
        for (let i = 0; i < message.recipients.length; i++) {
          const recipient = message.recipients[i];
          
          try {
            // Validate recipient ID format
            if (!recipient || !recipient.trim()) {
              console.warn(`Invalid recipient ID format: ${recipient}. Skipping this recipient.`);
              failureCount++;
              results.push({
                recipient: { id: recipient, name: '' },
                success: false,
                error: 'رقم المستلم غير صالح',
                sentAt: new Date()
              });
              continue; // Skip to next recipient
            }
            
            // Exactly match the VB implementation pattern for sending messages
            const conversationId = recipient; // Using the recipient ID as conversation ID
            let apiSuccess = false;
            let messageId = '';
            let apiError = null;
            
            // Helper function to send Facebook message using thread ID format with t_ prefix
            const sendFacebookDirectMessage = async (conversationId, messageText, accessToken) => {
              try {
                // Important: Use thread ID with t_ prefix as seen in VB code sample: fb.Post("/t_2523573327708602", par)
                const threadId = conversationId.startsWith('t_') ? conversationId : `t_${conversationId}`;
                const formattedText = `\n${messageText}`; // Add newline prefix as in VB code
                
                // Log what we're trying to do with obscured ID for debugging
                console.log(`Trying to send message using thread format: /t_${conversationId.replace(/^t_/, '')} and v2.9 API`);
                
                // Use POST like the VB code
                const postUrl = `https://graph.facebook.com/v2.9/${threadId}`;
                const postData = {
                  message: formattedText,
                  access_token: accessToken
                };
                
                const response = await axios.post(postUrl, postData);
                console.log(`Message sent successfully to ${threadId}`);
                
                return { 
                  success: true, 
                  messageId: response.data?.id || 'message_sent'
                };
              } catch (err) {
                console.error(`Error sending to thread ${conversationId}:`, err.message);
                if (err.response) {
                  console.error(`Response status: ${err.response.status}`);
                  console.error(`Response data:`, JSON.stringify(err.response.data || {}));
                }
                
                // Try alternate approaches
                try {
                  // Try the messages API if thread approach fails
                  console.log(`Thread approach failed, trying /me/messages API`);
                  const messageData = {
                    recipient: { id: conversationId },
                    message: { text: `\n${messageText}` },
                    access_token: accessToken
                  };
                  
                  const meResponse = await axios.post(
                    'https://graph.facebook.com/v2.9/me/messages', 
                    messageData
                  );
                  
                  return {
                    success: true,
                    messageId: meResponse.data?.message_id || 'message_sent' 
                  };
                } catch (altErr) {
                  console.error(`Alternative approach also failed:`, altErr.message);
                  
                  // Try one more approach - original VB-like approach with GET
                  try {
                    console.log(`Trying original GET approach with v2.9 API`);
                    const formattedText = `\n${messageText}`;
                    const messageUrl = `https://graph.facebook.com/v2.9/${conversationId}?method=POST&message=${encodeURIComponent(formattedText)}&access_token=${accessToken}`;
                    await axios.get(messageUrl);
                    return { 
                      success: true, 
                      messageId: 'message_sent' 
                    };
                  } catch (getErr) {
                    console.error(`GET approach also failed:`, getErr.message);
                  }
                }
                
                // Handle rate limits with retry
                if (err.response && (err.response.status === 429 || 
                    (err.response.data?.error?.code === 613 || 
                     err.response.data?.error?.message?.includes('too many requests')))) {
                  
                  // Wait 3 seconds and try once more
                  await new Promise(resolve => setTimeout(resolve, 3000));
                  
                  try {
                    const threadId = conversationId.startsWith('t_') ? conversationId : `t_${conversationId}`;
                    const postUrl = `https://graph.facebook.com/v2.9/${threadId}`;
                    const postData = {
                      message: `\n${messageText}`,
                      access_token: accessToken
                    };
                    
                    const response = await axios.post(postUrl, postData);
                    return { 
                      success: true, 
                      messageId: response.data?.id || 'message_sent' 
                    };
                  } catch (retryErr) {
                    console.error(`Retry failed:`, retryErr.message);
                  }
                }
                
                return {
                  success: false,
                  error: err.response?.data?.error?.message || err.message
                };
              }
            };
            
            // Helper function to send media messages using thread ID approach
            const sendFacebookMediaMessage = async (conversationId, messageText, mediaUrl, accessToken) => {
              try {
                // First try to send text if provided
                if (messageText && messageText.trim()) {
                  try {
                    await sendFacebookDirectMessage(conversationId, messageText, accessToken);
                  } catch (textError) {
                    console.warn(`Error sending text portion to recipient ${conversationId}, continuing with media`);
                  }
                }
                
                // Format the ID with t_ prefix as in VB code
                const threadId = conversationId.startsWith('t_') ? conversationId : `t_${conversationId}`;
                
                // Send media URL directly as text message - simplest approach
                const postUrl = `https://graph.facebook.com/v2.9/${threadId}`;
                const postData = {
                  message: `\n${mediaUrl}`, // Send URL as text with newline prefix
                  access_token: accessToken
                };
                
                const response = await axios.post(postUrl, postData);
                console.log(`Media URL sent successfully to ${threadId}`);
                
                return { 
                  success: true, 
                  messageId: response.data?.id || 'message_sent' 
                };
              } catch (err) {
                console.error(`Error sending media to ${conversationId}:`, err.message);
                if (err.response) {
                  console.error(`Response status: ${err.response.status}`);
                  console.error(`Response data:`, JSON.stringify(err.response.data || {}));
                }
                
                // Try to send as a link attachment instead
                try {
                  console.log(`Trying to send media as link attachment instead`);
                  const threadId = conversationId.startsWith('t_') ? conversationId : `t_${conversationId}`;
                  const postUrl = `https://graph.facebook.com/v2.9/${threadId}/photos`;
                  const postData = {
                    url: mediaUrl,
                    access_token: accessToken
                  };
                  
                  const response = await axios.post(postUrl, postData);
                  return { 
                    success: true, 
                    messageId: response.data?.id || 'message_sent' 
                  };
                } catch (altErr) {
                  console.error(`Alternative media approach failed:`, altErr.message);
                }
                
                return {
                  success: false,
                  error: err.response?.data?.error?.message || err.message
                };
              }
            };
            
            console.log(`Attempting to send message to recipient ${recipient}`);
            
          try {
            // Process based on message type using modern Facebook API approach
            if (message.messageType === 'text') {
              // Use modern API approach with proper parameters
              try {
                // Validate and clean recipient ID
                const recipientId = conversationId.toString().replace(/^t_/, '').trim();
                
                // Check if ID is a valid PSID (numeric and at least 5 digits)
                if (!/^\d{5,}$/.test(recipientId)) {
                  throw new Error(`Invalid recipient ID format: ${recipientId}`);
                }
                
                // Use page/messages endpoint with proper parameters
                const response = await axios({
                  method: 'post',
                  url: `https://graph.facebook.com/v18.0/${message.pageId}/messages`,
                  data: {
                    recipient: { id: recipientId },
                    message: { text: message.messageText.trim() },
                    messaging_type: 'MESSAGE_TAG',
                    tag: 'ACCOUNT_UPDATE', // Valid business tag
                    access_token: accessToken
                  }
                });
                
                console.log(`Successfully sent text message to ${recipientId}`);
                apiSuccess = true;
                messageId = response.data?.message_id || 'message_sent';
              } catch (primaryErr) {
                console.error(`Primary message approach failed: ${primaryErr.message}`);
                
                // Log detailed error information
                if (primaryErr.response) {
                  const errData = primaryErr.response.data?.error;
                  console.error(`Error details: Status ${primaryErr.response.status}, code: ${errData?.code}, message: ${errData?.message}`);
                }
                
                // Try fallback approach - direct conversation
                try {
                  const recipientId = conversationId.toString().replace(/^t_/, '').trim();
                  const conversationPath = `t_${recipientId}`;
                  
                  const response = await axios({
                    method: 'post',
                    url: `https://graph.facebook.com/v18.0/${conversationPath}`,
                    data: {
                      message: message.messageText.trim(),
                      access_token: accessToken
                    }
                  });
                  
                  console.log(`Fallback approach succeeded for ${recipientId}`);
                  apiSuccess = true;
                  messageId = response.data?.id || 'message_sent';
                } catch (fallbackErr) {
                  console.error(`All approaches failed: ${fallbackErr.message}`);
                  apiSuccess = false;
                  apiError = fallbackErr.response?.data?.error?.message || fallbackErr.message;
                }
              }
            } else if (message.messageType === 'image') {
              // Handle image with proper attachment format
              try {
                const recipientId = conversationId.toString().replace(/^t_/, '').trim();
                
                // Send text portion first if available
                if (message.messageText && message.messageText.trim()) {
                  try {
                    await axios({
                      method: 'post',
                      url: `https://graph.facebook.com/v18.0/${message.pageId}/messages`,
                      data: {
                        recipient: { id: recipientId },
                        message: { text: message.messageText.trim() },
                        messaging_type: 'MESSAGE_TAG',
                        tag: 'ACCOUNT_UPDATE',
                        access_token: accessToken
                      }
                    });
                    console.log(`Sent text portion before image to ${recipientId}`);
                  } catch (textErr) {
                    console.warn(`Error sending text before image: ${textErr.message}`);
                  }
                }
                
                // Send image as proper attachment
                const response = await axios({
                  method: 'post',
                  url: `https://graph.facebook.com/v18.0/${message.pageId}/messages`,
                  data: {
                    recipient: { id: recipientId },
                    message: { 
                      attachment: {
                        type: 'image',
                        payload: {
                          url: message.imageUrl,
                          is_reusable: false
                        }
                      }
                    },
                    messaging_type: 'MESSAGE_TAG',
                    tag: 'ACCOUNT_UPDATE',
                    access_token: accessToken
                  }
                });
                
                console.log(`Successfully sent image to ${recipientId}`);
                apiSuccess = true;
                messageId = response.data?.message_id || 'message_sent';
              } catch (imgErr) {
                console.error(`Image sending failed: ${imgErr.message}`);
                
                // Fallback to sending URL as text
                try {
                  const recipientId = conversationId.toString().replace(/^t_/, '').trim();
                  
                  const response = await axios({
                    method: 'post',
                    url: `https://graph.facebook.com/v18.0/${message.pageId}/messages`,
                    data: {
                      recipient: { id: recipientId },
                      message: { text: message.imageUrl },
                      messaging_type: 'MESSAGE_TAG',
                      tag: 'ACCOUNT_UPDATE',
                      access_token: accessToken
                    }
                  });
                  
                  console.log(`Sent image URL as text to ${recipientId}`);
                  apiSuccess = true;
                  messageId = response.data?.message_id || 'message_sent';
                } catch (fallbackErr) {
                  apiSuccess = false;
                  apiError = fallbackErr.response?.data?.error?.message || fallbackErr.message;
                }
              }
            } else if (message.messageType === 'video') {
              // Handle video with proper format
              try {
                const recipientId = conversationId.toString().replace(/^t_/, '').trim();
                
                // Send text portion first if available
                if (message.messageText && message.messageText.trim()) {
                  try {
                    await axios({
                      method: 'post',
                      url: `https://graph.facebook.com/v18.0/${message.pageId}/messages`,
                      data: {
                        recipient: { id: recipientId },
                        message: { text: message.messageText.trim() },
                        messaging_type: 'MESSAGE_TAG',
                        tag: 'ACCOUNT_UPDATE',
                        access_token: accessToken
                      }
                    });
                    console.log(`Sent text portion before video to ${recipientId}`);
                  } catch (textErr) {
                    console.warn(`Error sending text before video: ${textErr.message}`);
                  }
                }
                
                // Send video as URL first (simpler approach)
                const response = await axios({
                  method: 'post',
                  url: `https://graph.facebook.com/v18.0/${message.pageId}/messages`,
                  data: {
                    recipient: { id: recipientId },
                    message: { text: message.videoUrl },
                    messaging_type: 'MESSAGE_TAG',
                    tag: 'ACCOUNT_UPDATE',
                    access_token: accessToken
                  }
                });
                
                console.log(`Successfully sent video URL to ${recipientId}`);
                apiSuccess = true;
                messageId = response.data?.message_id || 'message_sent';
              } catch (videoErr) {
                console.error(`Video sending failed: ${videoErr.message}`);
                apiSuccess = false;
                apiError = videoErr.response?.data?.error?.message || videoErr.message;
              }
            }
            } catch (msgError) {
              console.error(`Error in message sending to ${recipient}:`, msgError);
              apiSuccess = false;
              apiError = msgError.response?.data?.error?.message || msgError.message;
            }
            
            // Process result
            if (apiSuccess) {
              successCount++;
              results.push({
                recipient: {
                  id: recipient,
                  name: '' // We don't have recipient names at this point
                },
                success: true,
                messageId: messageId, // Use the messageId variable returned from sendFacebookMessage
                sentAt: new Date()
              });
              console.log(`Successfully sent message to recipient ${recipient}`);
            } else {
              failureCount++;
              results.push({
                recipient: {
                  id: recipient,
                  name: ''
                },
                success: false,
                error: apiError || 'Unknown error',
                sentAt: new Date()
              });
              console.log(`Failed to send message to recipient ${recipient} - no message ID returned`);
            }
            
            // Add delay between messages if enabled
            if (message.enableDelay && message.delaySeconds > 0 && i < message.recipients.length - 1) {
              console.log(`Adding delay of ${message.delaySeconds} seconds before next message`);
              
              // Make delay more robust with explicit promise handling
              const delayPromise = new Promise(resolve => {
                const startTime = Date.now();
                const timer = setTimeout(() => {
                  const actualDelay = (Date.now() - startTime) / 1000;
                  console.log(`Delay completed. Actual delay time: ${actualDelay.toFixed(2)} seconds`);
                  resolve();
                }, message.delaySeconds * 1000);
                
                // Ensure timer reference is maintained
                timer.unref();
              });
              
              // Explicitly await the delay promise
              await delayPromise;
              console.log(`Delay completed, continuing to next recipient`);
            }
          } catch (recipientError) {
            failureCount++;
            
            // Enhanced error logging
            let errorMessage = '';
            if (recipientError.response) {
              // The request was made and the server responded with an error status
              console.error(`Error sending to recipient ${recipient}: Status ${recipientError.response.status} - ${recipientError.response.statusText}`);
              errorMessage = recipientError.response.data && recipientError.response.data.error 
                ? recipientError.response.data.error.message 
                : `Status ${recipientError.response.status}`;
            } else if (recipientError.request) {
              // The request was made but no response was received
              console.error(`Error sending to recipient ${recipient}: No response received`);
              errorMessage = 'No response received from server';
            } else {
              // Something else happened
              console.error(`Error sending to recipient ${recipient}: ${recipientError.message}`);
              errorMessage = recipientError.message;
            }
            
            results.push({
              recipient: {
                id: recipient,
                name: ''
              },
              success: false,
              error: errorMessage,
              sentAt: new Date()
            });
          }
        }
        
        // Calculate total process time
        const processEndTime = Date.now();
        const totalProcessingTime = (processEndTime - processStartTime) / 1000; // in seconds
        
        // Handle point refunds for failed messages
        if (failureCount > 0 && message.deductedPoints) {
          try {
            // Get the user
            const user = await User.findById(message.user);
            
            if (user) {
              // Calculate how many points to refund based on failed messages
              const pointsToRefund = failureCount;
              
              // Refund points for failed messages
              user.points += pointsToRefund;
              
              // Record the transaction
              const transaction = new Transaction({
                userId: user._id,
                type: 'refund',
                amount: pointsToRefund,
                status: 'completed',
                description: `استرداد ${pointsToRefund} نقطة للرسائل الفاشلة من أصل ${message.totalRecipients} رسالة مجدولة`
              });
              
              // Record user action
              const userAction = new UserAction({
                userId: user._id,
                actionType: 'refund',
                details: {
                  points: pointsToRefund,
                  operation: 'refund',
                  failedMessages: failureCount,
                  totalMessages: message.totalRecipients
                },
                module: 'points'
              });
              
              // Save all changes
              await Promise.all([
                user.save(),
                transaction.save(),
                userAction.save()
              ]);
              
              console.log(`Refunded ${pointsToRefund} points to user ${user._id} for ${failureCount} failed scheduled messages`);
            }
          } catch (pointsError) {
            console.error('Error refunding points:', pointsError);
          }
        }
        
        // Update message status and results
        message.status = 'completed';
        message.sent = successCount;
        message.failed = failureCount;
        message.results = results;
        message.processingCompletedAt = new Date();
        await message.save();
        
        // Add a UserAction for stats and achievements if there are successful messages
        if (successCount > 0) {
          try {
            await UserAction.create({
              userId: message.user,
              actionType: 'message',
              details: {
                messageType: message.messageType,
                recipientCount: message.recipients.length,
                successCount: successCount,
                scheduledMessageId: message._id
              },
              module: 'pagemanagement',
              count: successCount // Count each successful message
            });
          } catch (actionError) {
            console.error('Error recording scheduled message activity:', actionError);
          }
        }
        
        console.log(`Completed scheduled message ${message._id} with ${successCount} successes and ${failureCount} failures`);
      } catch (error) {
        console.error(`Error processing scheduled message ${message._id}:`, error);
        
        // Mark as failed
        message.status = 'failed';
        message.processingCompletedAt = new Date();
        message.sent = 0;
        message.failed = message.totalRecipients;
        await message.save();
        
        // Refund all points since nothing was sent
        try {
          if (message.deductedPoints) {
            const user = await User.findById(message.user);
            if (user) {
              // Refund all points
              const pointsToRefund = message.deductedPoints;
              user.points += pointsToRefund;
              
              // Record the transaction
              const transaction = new Transaction({
                userId: user._id,
                type: 'refund',
                amount: pointsToRefund,
                status: 'completed',
                description: `استرداد كامل النقاط (${pointsToRefund}) بسبب فشل الرسائل المجدولة`
              });
              
              await Promise.all([
                user.save(),
                transaction.save()
              ]);
              
              console.log(`Refunded all ${pointsToRefund} points to user ${user._id} due to complete failure of scheduled message`);
            }
          }
        } catch (refundError) {
          console.error('Error refunding points after complete failure:', refundError);
        }
      }
    }
  } catch (err) {
    console.error('Error checking scheduled messages:', err);
  }
};

// Cleanup old scheduled messages that are older than 3 days
const cleanupOldScheduledMessages = async () => {
  try {
    const ScheduledMessage = require('./models/ScheduledMessage');
    const { retryDbOperation } = require('./utils/delayUtils');
    
    // Calculate cutoff date (3 days ago)
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 72);
    
    // Find and delete completed or failed messages older than 3 days with retry mechanism
    const result = await retryDbOperation(async () => {
      return await ScheduledMessage.deleteMany({
        status: { $in: ['completed', 'failed'] },
        processingCompletedAt: { $lt: cutoffDate }
      });
    });
    
    if (result.deletedCount > 0) {
      console.log(`Cleanup: Deleted ${result.deletedCount} scheduled messages older than 3 days`);
    }
  } catch (err) {
    console.error('Error cleaning up old scheduled messages:', err);
  }
};

// Cleanup old instant messages that are older than 3 days
const cleanupOldInstantMessages = async () => {
  try {
    const InstantMessage = require('./models/InstantMessage');
    const { retryDbOperation } = require('./utils/delayUtils');
    
    // Calculate cutoff date (3 days ago)
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 72);
    
    // Find and delete completed or failed messages older than 3 days with retry mechanism
    const result = await retryDbOperation(async () => {
      return await InstantMessage.deleteMany({
        status: { $in: ['completed', 'failed'] },
        processingCompletedAt: { $lt: cutoffDate }
      });
    });
    
    if (result.deletedCount > 0) {
      console.log(`Cleanup: Deleted ${result.deletedCount} instant messages older than 3 days`);
    }
  } catch (err) {
    console.error('Error cleaning up old instant messages:', err);
  }
};

// Cleanup old instant group posts that are older than 3 days
const cleanupOldInstantGroupPosts = async () => {
  try {
    const InstantGroupPost = require('./models/InstantGroupPost');
    const { retryDbOperation } = require('./utils/delayUtils');
    
    // Calculate cutoff date (3 days ago)
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 72);
    
    // Find and delete completed or failed posts older than 3 days with retry mechanism
    const result = await retryDbOperation(async () => {
      return await InstantGroupPost.deleteMany({
        status: { $in: ['completed', 'failed'] },
        processingCompletedAt: { $lt: cutoffDate }
      });
    });
    
    if (result.deletedCount > 0) {
      console.log(`Cleanup: Deleted ${result.deletedCount} instant group posts older than 3 days`);
    }
  } catch (err) {
    console.error('Error cleaning up old instant group posts:', err);
  }
};

// Import subscription controller for auto-renewal
const { processAutoRenewals } = require('./controllers/subscriptionController');

// Import utilities first to prevent reference errors
const { retryDbOperation } = require('./utils/delayUtils');

// Import dedicated processors
const campaignProcessor = require('./utils/campaignProcessor');
const immediateMessageProcessor = require('./utils/immediateMessageProcessor');
const pageMessageCampaignProcessor = require('./utils/pageMessageCampaignProcessor');
const commentMonitorProcessor = require('./utils/commentMonitorProcessor');

// Check for page message campaigns using the dedicated processor
const checkPageMessageCampaigns = async () => {
  try {
    console.log('Running scheduled campaign check...');
    const result = await pageMessageCampaignProcessor.checkScheduledCampaigns();
    return result;
  } catch (error) {
    console.error('Error in page message campaign check:', error);
    return { success: false, error: error.message };
  }
};

// Function to reset campaigns that are stuck in wrong state
const resetScheduledCampaignsStatus = async () => {
  try {
    // Import required model
    const PageMessageCampaign = require('./models/PageMessageCampaign');
    
    // Get current date/time
    const now = new Date();
    
    // Find completed campaigns that are scheduled for the future
    // These were likely marked completed incorrectly
    const incorrectStatusCampaigns = await PageMessageCampaign.find({
      status: { $in: ['completed', 'failed'] },
      scheduled: true,
      scheduledTime: { $gt: now }
    });
    
    if (incorrectStatusCampaigns.length > 0) {
      console.log(`[Campaign Reset] Found ${incorrectStatusCampaigns.length} campaigns with incorrect status`);
      
      // Reset each campaign to pending status
      for (const campaign of incorrectStatusCampaigns) {
        console.log(`[Campaign Reset] Resetting campaign ${campaign._id} from ${campaign.status} to pending`);
        campaign.status = 'pending';
        campaign.processingStartedAt = null;
        campaign.processingCompletedAt = null;
        await campaign.save();
      }
    }
    
    // Also find stuck campaigns in processing state (older than 30 minutes)
    const stuckCampaigns = await pageMessageCampaignProcessor.resetStuckCampaigns();
    if (stuckCampaigns > 0) {
      console.log(`[Campaign Reset] Reset ${stuckCampaigns} stuck campaigns`);
    }
    
    return {
      incorrectStatus: incorrectStatusCampaigns.length,
      stuckCampaigns: stuckCampaigns
    };
  } catch (error) {
    console.error('[Campaign Reset] Error resetting campaign status:', error);
    return { success: false, error: error.message };
  }
};

// Cleanup old page message campaigns
const cleanupOldPageMessageCampaigns = async () => {
  try {
    const PageMessageCampaign = require('./models/PageMessageCampaign');
    const { retryDbOperation } = require('./utils/delayUtils');
    
    // Calculate cutoff date (3 days ago)
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 72);
    
    // Find and delete completed or failed campaigns older than 3 days with retry mechanism
    const result = await retryDbOperation(async () => {
      return await PageMessageCampaign.deleteMany({
        status: { $in: ['completed', 'failed'] },
        processingCompletedAt: { $lt: cutoffDate }
      });
    });
    
    if (result.deletedCount > 0) {
      console.log(`Cleanup: Deleted ${result.deletedCount} page message campaigns older than 3 days`);
    }
  } catch (err) {
    console.error('Error cleaning up old page message campaigns:', err);
  }
};

// Initialize messaging components for reliable background processing
console.log('Initializing enhanced message processors...');

// Initialize message processors
console.log('Initializing enhanced message processors...');

// Initialize immediate message processor for database-backed message processing
immediateMessageProcessor.initialize();

// Initialize page message campaign processor for reliable campaign handling
pageMessageCampaignProcessor.initialize();

// Initialize comment monitor processor for automatic comment responses
commentMonitorProcessor.initialize();

// Process any missed or stuck campaigns on startup
setTimeout(async () => {
  try {
    console.log('Checking for pending campaigns and messages on startup...');
    
    // Reset any stuck processors
    await immediateMessageProcessor.resetStuckProcessing();
    await pageMessageCampaignProcessor.resetStuckCampaigns();
    
    // Process any queued messages
    immediateMessageProcessor.processIndividualQueue();
    immediateMessageProcessor.processBulkQueue();
    immediateMessageProcessor.processCampaignQueue();
    
    // Process any queued campaigns
    await pageMessageCampaignProcessor.processQueuedCampaigns();
    
    // Check for scheduled campaigns
    await pageMessageCampaignProcessor.checkScheduledCampaigns();
    
    console.log('Initial campaign and message checks completed');
  } catch (error) {
    console.error('Error during startup campaign and message checks:', error);
  }
}, 10000);

// Run the schedulers at regular intervals
setInterval(checkScheduledPosts, 60000);
setInterval(checkScheduledMessages, 60000);
setInterval(checkPageMessageCampaigns, 60000);
setInterval(resetScheduledCampaignsStatus, 300000); // Every 5 minutes
setInterval(() => {
  try {
    commentMonitorProcessor.processCommentMonitors();
  } catch (error) {
    console.error('Error processing comment monitors:', error);
  }
}, 60000); // Check for comments every minute

// Set up periodic background processing for message queues
setInterval(() => {
  try {
    immediateMessageProcessor.processIndividualQueue();
    immediateMessageProcessor.processBulkQueue();
    immediateMessageProcessor.processCampaignQueue();
  } catch (error) {
    console.error('Error processing message queues:', error);
  }
}, 30000);

// Run cleanup every hour
setInterval(cleanupOldScheduledPosts, 3600000);
setInterval(cleanupOldScheduledMessages, 3600000);
setInterval(cleanupOldInstantMessages, 3600000);
setInterval(cleanupOldInstantGroupPosts, 3600000);
setInterval(cleanupOldPageMessageCampaigns, 3600000);

// Process any currently pending campaigns on server start
const checkPendingCampaigns = async () => {
  try {
    const PageMessageCampaign = require('./models/PageMessageCampaign');
    
    // Find campaigns in processing state
    const pendingCampaigns = await PageMessageCampaign.find({
      status: 'processing'
    });
    
    console.log(`Found ${pendingCampaigns.length} campaigns in processing state at startup, resuming...`);
    
    // Reset stuck campaigns from previous server run
    await pageMessageCampaignProcessor.resetStuckCampaigns();
    
    // Reset incorrect status campaigns
    await resetScheduledCampaignsStatus();
    
    // Resume processing for each campaign 
    pendingCampaigns.forEach(campaign => {
      try {
        console.log(`Resuming processing for campaign: ${campaign._id} - ${campaign.name}`);
        // Queue campaign for processing
        pageMessageCampaignProcessor.queueCampaign(campaign._id).catch(err => {
          console.error(`Error queuing campaign ${campaign._id}:`, err);
        });
      } catch (err) {
        console.error(`Error setting up resume for campaign ${campaign._id}:`, err);
      }
    });
    
    // Process any scheduled campaigns that should be running
    await pageMessageCampaignProcessor.checkScheduledCampaigns();
  } catch (error) {
    console.error('Error checking for pending campaigns at startup:', error);
  }
};

// Run subscription auto-renewal check daily (at server start and then every 24 hours)
const runAutoRenewalCheck = async () => {
  try {
    console.log('Running automated subscription renewal check...');
    const result = await processAutoRenewals();
    console.log('Auto-renewal check completed:', result);
  } catch (error) {
    console.error('Error in subscription auto-renewal process:', error);
  }
};

// Set auto-renewal to run daily (24 hours = 86400000 ms)
setInterval(runAutoRenewalCheck, 86400000);

// Run initial checks on server startup
checkScheduledPosts();
checkScheduledMessages();
checkPageMessageCampaigns();
checkPendingCampaigns(); // Check for pending campaigns on startup
cleanupOldScheduledPosts();
cleanupOldScheduledMessages();
cleanupOldInstantMessages();
cleanupOldInstantGroupPosts();
cleanupOldPageMessageCampaigns();
runAutoRenewalCheck(); // Run auto-renewal check on startup

// Error handler
app.use(notFound);
app.use(errorHandler);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));

  app.get('*', (req, res) =>
    res.sendFile(path.resolve(__dirname, '../frontend', 'build', 'index.html'))
  );
} else {
  // في بيئة التطوير، عرض رسالة تشير إلى استخدام خادم التطوير
  app.get('/', (req, res) => {
    res.send('API قيد التشغيل. في بيئة التطوير، استخدم خادم React للواجهة الأمامية.');
  });
  
  // Add a catch-all route for frontend-side routing paths in development mode
  // This ensures URLs like /reset-password/:token work correctly when accessed directly
  app.get('/reset-password/*', (req, res) => {
    res.redirect((process.env.FRONTEND_URL || 'http://localhost:3000') + req.originalUrl);
  });
}

const PORT = process.env.PORT || 5000;

// Improved server startup with port conflict handling
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is already in use. The server might already be running.`);
    console.log('You can either:');
    console.log(`1. Stop the process using port ${PORT} and try again`);
    console.log('2. Use a different port by setting the PORT environment variable');
    
    // Try with a different port automatically
    const newPort = PORT + 1;
    console.log(`Attempting to use port ${newPort} instead...`);
    
    server.close();
    app.listen(newPort, () => {
      console.log(`Server running on alternate port ${newPort}`);
    });
  } else {
    console.error('Error starting server:', err);
  }
});