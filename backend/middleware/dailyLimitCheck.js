const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const mongoose = require('mongoose');

// مراقبة استخدام المستخدم للعمليات اليومية
const checkDailyLimit = asyncHandler(async (req, res, next) => {
  try {
    // تأكد من وجود نموذج UserAction
    let UserAction;
    try {
      UserAction = mongoose.model('UserAction');
    } catch (error) {
      // إنشاء النموذج إذا لم يكن موجوداً
      const userActionSchema = new mongoose.Schema(
        {
          userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
          },
          actionType: {
            type: String,
            required: true,
            enum: ['extraction', 'post', 'comment', 'reaction', 'account_add', 'other']
          },
          details: {
            type: mongoose.Schema.Types.Mixed
          },
          module: {
            type: String,
            required: true
          },
          count: {
            type: Number,
            default: 1
          }
        },
        { timestamps: true }
      );

      // مؤشر للبحث عن العمليات اليومية للمستخدم
      userActionSchema.index({ userId: 1, createdAt: 1 });
  
      UserAction = mongoose.model('UserAction', userActionSchema);
    }

    const user = await User.findById(req.user._id);
    
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // حساب عدد العمليات اليوم
    const totalActionsToday = await UserAction.aggregate([
      { 
        $match: { 
          userId: user._id,
          createdAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$count" }
        }
      }
    ]);
    
    const totalCount = totalActionsToday.length > 0 ? totalActionsToday[0].total : 0;
    const dailyLimit = user.membershipFeatures?.dailyLimit || 10;
    
    // إضافة معلومات الحد اليومي إلى الطلب لاستخدامها في المراقبين
    req.userDailyUsage = {
      current: totalCount,
      limit: dailyLimit,
      remaining: Math.max(0, dailyLimit - totalCount)
    };
    
    // التحقق من تجاوز الحد
    if (totalCount >= dailyLimit) {
      res.status(403);
      throw new Error(`You have reached your daily operations limit (${dailyLimit}). Please upgrade your membership or try again tomorrow.`);
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = { checkDailyLimit };