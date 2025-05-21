const asyncHandler = require('express-async-handler');
const axios = require('axios');
const PageMessageCampaign = require('../models/PageMessageCampaign');
const PageMessage = require('../models/PageMessage');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// تحديد تكلفة النقاط لكل رسالة (يجب أن تكون متطابقة مع قيمة POINTS_PER_MESSAGE في pageMessageController.js)
const POINTS_PER_MESSAGE = 1;

// لإضافة تنبيهات أكثر وضوحًا للنقاط
const NOTIFICATION_TYPES = {
  POINTS_DEDUCTED: 'تم خصم النقاط',
  POINTS_REFUNDED: 'تم استرداد النقاط',
  POINTS_INSUFFICIENT: 'رصيد النقاط غير كافٍ'
};

/**
 * @desc    Create a new page message campaign (all campaigns must be scheduled)
 * @route   POST /api/page-campaigns
 * @access  Private
 */
const createCampaign = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    pageId,
    pageName,
    accessToken,
    recipients,
    messageType,
    messageText,
    imageUrl,
    videoUrl,
    quickReplyButtons,
    scheduledTime,
    enableDelay,
    delayMode,
    delaySeconds,
    minDelaySeconds,
    maxDelaySeconds,
    personalizeMessage,
    messagePersonalization,
    campaignType,
    recurringConfig,
    batchSize
  } = req.body;

  // Validate required fields
  if (!name || !pageId || !pageName || !accessToken) {
    res.status(400);
    throw new Error('الرجاء توفير اسم الحملة ومعرف الصفحة واسم الصفحة ورمز الوصول');
  }

  // Always require scheduledTime - all campaigns must be scheduled
  if (!scheduledTime) {
    res.status(400);
    throw new Error('الرجاء توفير وقت للجدولة - جميع الحملات يجب أن تكون مجدولة');
  }

  // Validate scheduled time is in the future
  const scheduledDate = new Date(scheduledTime);
  const now = new Date();
  if (scheduledDate <= now) {
    res.status(400);
    throw new Error('وقت الجدولة يجب أن يكون في المستقبل');
  }

  // Validate message content
  if (messageType === 'text' && (!messageText || messageText.trim() === '')) {
    res.status(400);
    throw new Error('الرجاء توفير نص الرسالة');
  }

  if (messageType === 'image' && (!imageUrl || imageUrl.trim() === '')) {
    res.status(400);
    throw new Error('الرجاء توفير رابط الصورة');
  }

  if (messageType === 'video' && (!videoUrl || videoUrl.trim() === '')) {
    res.status(400);
    throw new Error('الرجاء توفير رابط الفيديو');
  }

  try {
    // Process recipients if provided directly
    let finalRecipients = recipients || [];
    let recipientCount = finalRecipients.length;
    
    // متغير لتخزين النقاط المخصومة
    let deductedPoints = 0;
    
    // التحقق من رصيد النقاط قبل إنشاء الحملة - تطبيق على جميع الحملات
    if (recipientCount > 0) {
      const totalPointsRequired = POINTS_PER_MESSAGE * recipientCount;
      
      // جلب المستخدم للتحقق من النقاط
      const user = await User.findById(req.user._id);
      if (!user) {
        res.status(404);
        throw new Error('المستخدم غير موجود');
      }
      
      // التحقق من وجود رصيد كافٍ
      if (user.points < totalPointsRequired) {
        res.status(400);
        throw new Error(`لا يوجد رصيد كافٍ من النقاط. مطلوب ${totalPointsRequired} نقطة لإرسال ${recipientCount} رسالة`);
      }
      
      // خصم النقاط مقدماً لجميع أنواع الحملات
      user.points -= totalPointsRequired;
      await user.save();
      
      // تسجيل معاملة خصم النقاط باستخدام نوع 'campaign'
      const transaction = new Transaction({
        userId: user._id,
        type: 'campaign',
        amount: totalPointsRequired,
        status: 'completed',
        description: `${NOTIFICATION_TYPES.POINTS_DEDUCTED}: ${totalPointsRequired} نقطة - حملة رسائل مجدولة "${name}" لـ ${recipientCount} مستلم`,
        isDebit: true,
        meta: {
          campaignName: name,
          recipientCount: recipientCount,
          pointsPerMessage: POINTS_PER_MESSAGE,
          scheduled: true
        }
      });
      
      await transaction.save();
      
      // تخزين قيمة النقاط المخصومة
      deductedPoints = totalPointsRequired;
    }
    
    // Create campaign with pending status - all campaigns are scheduled
    const campaign = await PageMessageCampaign.create({
      user: req.user._id,
      name,
      description,
      pageId,
      pageName,
      accessToken,
      recipients: finalRecipients,
      recipientCount,
      messageType,
      messageText,
      imageUrl,
      videoUrl,
      quickReplyButtons,
      scheduled: true, // Always scheduled
      scheduledTime: scheduledTime,
      enableDelay,
      delayMode,
      delaySeconds,
      minDelaySeconds,
      maxDelaySeconds,
      personalizeMessage,
      messagePersonalization,
      campaignType: campaignType || 'oneTime',
      recurringConfig,
      batchSize: batchSize || 50,
      status: 'pending', // Always pending for scheduled campaigns
      deductedPoints: deductedPoints,
      pointsPerMessage: POINTS_PER_MESSAGE
    });

    // Queue the campaign for processing at scheduled time
    const pageMessageCampaignProcessor = require('../utils/pageMessageCampaignProcessor');
    try {
      // This will add the campaign to the queue but won't process until scheduled time
      const queueResult = await pageMessageCampaignProcessor.queueCampaign(campaign._id);
      console.log(`[Campaign Controller] Campaign ${campaign._id} queued for scheduled processing: ${JSON.stringify(queueResult)}`);
    } catch (queueErr) {
      console.error(`[Campaign Controller] Error queueing campaign ${campaign._id} for scheduled processing:`, queueErr);
      // Don't fail the request, as the campaign is already saved
      // The background scheduler will pick it up later at the scheduled time
    }

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الحملة المجدولة بنجاح وخصم النقاط مقدماً',
      data: campaign,
      pointsInfo: {
        pointsPerMessage: POINTS_PER_MESSAGE,
        totalPointsRequired: recipientCount * POINTS_PER_MESSAGE,
        recipientCount: recipientCount,
        pointsDeductionPolicy: 'سيتم استرداد النقاط للرسائل الفاشلة',
        scheduledTime: scheduledTime
      }
    });
  } catch (error) {
    res.status(400);
    throw new Error(error.message || 'فشل في إنشاء الحملة');
  }
});

/**
 * @desc    Get all user campaigns
 * @route   GET /api/page-campaigns
 * @access  Private
 */
const getUserCampaigns = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  // Build query for filtering
  const query = { user: req.user._id };
  if (status && status !== 'all') {
    query.status = status;
  }

  // Get total count for pagination
  const total = await PageMessageCampaign.countDocuments(query);

  // Get campaigns with pagination
  const campaigns = await PageMessageCampaign.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .select('name status recipientCount sent failed pageId pageName scheduledTime scheduled createdAt');

  res.status(200).json({
    success: true,
    count: campaigns.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    data: campaigns
  });
});

/**
 * @desc    Get a campaign by ID
 * @route   GET /api/page-campaigns/:id
 * @access  Private
 */
const getCampaign = asyncHandler(async (req, res) => {
  const campaign = await PageMessageCampaign.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!campaign) {
    res.status(404);
    throw new Error('لم يتم العثور على الحملة');
  }

  res.status(200).json({
    success: true,
    data: campaign
  });
});

/**
 * @desc    Update a campaign
 * @route   PUT /api/page-campaigns/:id
 * @access  Private
 */
const updateCampaign = asyncHandler(async (req, res) => {
  let campaign = await PageMessageCampaign.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!campaign) {
    res.status(404);
    throw new Error('لم يتم العثور على الحملة');
  }

  // Can only update campaigns that are in pending status
  if (campaign.status !== 'pending') {
    res.status(400);
    throw new Error('لا يمكن تعديل الحملة في حالتها الحالية');
  }

  // Ensure the campaign remains scheduled
  if (req.body.scheduled === false) {
    res.status(400);
    throw new Error('لا يمكن تحويل الحملة إلى غير مجدولة - جميع الحملات يجب أن تكون مجدولة');
  }

  // If scheduledTime is being updated, validate it's in the future
  if (req.body.scheduledTime) {
    const scheduledDate = new Date(req.body.scheduledTime);
    const now = new Date();
    if (scheduledDate <= now) {
      res.status(400);
      throw new Error('وقت الجدولة يجب أن يكون في المستقبل');
    }
  }

  const updatedCampaign = await PageMessageCampaign.findByIdAndUpdate(
    req.params.id,
    { ...req.body, scheduled: true }, // Ensure scheduled remains true
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    data: updatedCampaign
  });
});

/**
 * @desc    Delete a campaign
 * @route   DELETE /api/page-campaigns/:id
 * @access  Private
 */
const deleteCampaign = asyncHandler(async (req, res) => {
  const campaign = await PageMessageCampaign.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!campaign) {
    res.status(404);
    throw new Error('لم يتم العثور على الحملة');
  }

  // Can only delete campaigns that are in pending, completed, or failed status
  if (!['pending', 'completed', 'failed', 'canceled'].includes(campaign.status)) {
    res.status(400);
    throw new Error('لا يمكن حذف الحملة في حالتها الحالية');
  }

  await PageMessageCampaign.findByIdAndDelete(campaign._id);

  res.status(200).json({
    success: true,
    data: {}
  });
});

/**
 * @desc    Add recipients to a campaign
 * @route   POST /api/page-campaigns/:id/recipients
 * @access  Private
 */
const addRecipients = asyncHandler(async (req, res) => {
  const { recipients, pageId } = req.body;

  let campaign = await PageMessageCampaign.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!campaign) {
    res.status(404);
    throw new Error('لم يتم العثور على الحملة');
  }

  // Can only add recipients to campaigns in pending status
  if (campaign.status !== 'pending') {
    res.status(400);
    throw new Error('لا يمكن إضافة مستلمين للحملة في حالتها الحالية');
  }

  // If specific recipients are provided
  if (recipients && recipients.length > 0) {
    // Add only unique recipients
    const existingIds = new Set(campaign.recipients.map(r => r.id));
    const newRecipients = recipients.filter(r => !existingIds.has(r.id));
    
    if (newRecipients.length > 0) {
      campaign.recipients.push(...newRecipients);
      campaign.recipientCount = campaign.recipients.length;
      await campaign.save();
    }
  }
  // If only pageId is provided, get all senders from that page
  else if (pageId) {
    const pageMessage = await PageMessage.findOne({
      user: req.user._id,
      pageId
    });

    if (!pageMessage) {
      res.status(404);
      throw new Error('لم يتم العثور على الصفحة');
    }

    // Add only unique recipients
    const existingIds = new Set(campaign.recipients.map(r => r.id));
    const newRecipients = pageMessage.senders.filter(s => !existingIds.has(s.id));
    
    if (newRecipients.length > 0) {
      campaign.recipients.push(...newRecipients);
      campaign.recipientCount = campaign.recipients.length;
      await campaign.save();
    }
  } else {
    res.status(400);
    throw new Error('الرجاء توفير قائمة المستلمين أو معرف الصفحة');
  }

  res.status(200).json({
    success: true,
    recipientCount: campaign.recipientCount,
    data: campaign
  });
});

/**
 * @desc    Remove recipients from a campaign
 * @route   DELETE /api/page-campaigns/:id/recipients
 * @access  Private
 */
const removeRecipients = asyncHandler(async (req, res) => {
  const { recipientIds } = req.body;

  if (!recipientIds || recipientIds.length === 0) {
    res.status(400);
    throw new Error('الرجاء توفير قائمة معرفات المستلمين للإزالة');
  }

  let campaign = await PageMessageCampaign.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!campaign) {
    res.status(404);
    throw new Error('لم يتم العثور على الحملة');
  }

  // Can only remove recipients from campaigns in pending status
  if (campaign.status !== 'pending') {
    res.status(400);
    throw new Error('لا يمكن إزالة مستلمين من الحملة في حالتها الحالية');
  }

  // Remove specified recipients
  campaign.recipients = campaign.recipients.filter(r => !recipientIds.includes(r.id));
  campaign.recipientCount = campaign.recipients.length;
  await campaign.save();

  res.status(200).json({
    success: true,
    recipientCount: campaign.recipientCount,
    data: campaign
  });
});

/**
 * @desc    Reschedule a campaign
 * @route   POST /api/page-campaigns/:id/reschedule
 * @access  Private
 */
const rescheduleCampaign = asyncHandler(async (req, res) => {
  const { scheduledTime } = req.body;

  if (!scheduledTime) {
    res.status(400);
    throw new Error('الرجاء توفير وقت جديد للجدولة');
  }

  // Validate scheduled time is in the future
  const scheduledDate = new Date(scheduledTime);
  const now = new Date();
  if (scheduledDate <= now) {
    res.status(400);
    throw new Error('وقت الجدولة يجب أن يكون في المستقبل');
  }

  let campaign = await PageMessageCampaign.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!campaign) {
    res.status(404);
    throw new Error('لم يتم العثور على الحملة');
  }

  // Can only reschedule campaigns in pending status
  if (campaign.status !== 'pending') {
    res.status(400);
    throw new Error('لا يمكن إعادة جدولة الحملة في حالتها الحالية');
  }

  // Update campaign with new scheduled time
  campaign.scheduledTime = scheduledTime;
  await campaign.save();

  res.status(200).json({
    success: true,
    message: 'تم إعادة جدولة الحملة بنجاح',
    data: {
      id: campaign._id,
      status: campaign.status,
      scheduledTime: campaign.scheduledTime
    }
  });
});

/**
 * @desc    Pause a campaign
 * @route   POST /api/page-campaigns/:id/pause
 * @access  Private
 */
const pauseCampaign = asyncHandler(async (req, res) => {
  let campaign = await PageMessageCampaign.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!campaign) {
    res.status(404);
    throw new Error('لم يتم العثور على الحملة');
  }

  // Can only pause campaigns that are processing
  if (campaign.status !== 'processing') {
    res.status(400);
    throw new Error('يمكن إيقاف الحملات التي قيد المعالجة فقط');
  }

  // Update campaign status
  campaign.status = 'paused';
  await campaign.save();

  res.status(200).json({
    success: true,
    message: 'تم إيقاف الحملة مؤقتًا بنجاح',
    data: {
      id: campaign._id,
      status: campaign.status
    }
  });
});

/**
 * @desc    Resume a paused campaign
 * @route   POST /api/page-campaigns/:id/resume
 * @access  Private
 */
const resumeCampaign = asyncHandler(async (req, res) => {
  let campaign = await PageMessageCampaign.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!campaign) {
    res.status(404);
    throw new Error('لم يتم العثور على الحملة');
  }

  // Can only resume campaigns that are paused
  if (campaign.status !== 'paused') {
    res.status(400);
    throw new Error('يمكن استئناف الحملات المتوقفة مؤقتًا فقط');
  }

  // Update campaign status
  campaign.status = 'processing';
  await campaign.save();

  res.status(200).json({
    success: true,
    message: 'تم استئناف الحملة بنجاح',
    data: {
      id: campaign._id,
      status: campaign.status
    }
  });
});

/**
 * @desc    Cancel a campaign
 * @route   POST /api/page-campaigns/:id/cancel
 * @access  Private
 */
const cancelCampaign = asyncHandler(async (req, res) => {
  try {
    let campaign = await PageMessageCampaign.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!campaign) {
      res.status(404);
      throw new Error('لم يتم العثور على الحملة');
    }

    // Can only cancel campaigns that are pending, processing, or paused
    if (!['pending', 'processing', 'paused'].includes(campaign.status)) {
      res.status(400);
      throw new Error('لا يمكن إلغاء الحملة في حالتها الحالية');
    }

    // تهيئة متغير الرسائل المراد استرداد نقاطها
    let messagesToRefund = 0;
    let pointsToRefund = 0;

    // استرداد النقاط للرسائل التي لم يتم إرسالها بعد
    if (campaign.deductedPoints > 0) {
      messagesToRefund = campaign.recipientCount - (campaign.sent || 0) - (campaign.failed || 0);
      if (messagesToRefund > 0) {
        pointsToRefund = messagesToRefund * POINTS_PER_MESSAGE;
        
        // جلب المستخدم لإضافة النقاط المستردة
        const user = await User.findById(req.user._id);
        if (user) {
          // إضافة النقاط مباشرة إلى المستخدم (مرة واحدة فقط)
          user.points += pointsToRefund;
          await user.save();
          
          // تسجيل معاملة استرداد النقاط
          try {
            const transaction = new Transaction({
              userId: user._id,
              type: 'refund',
              amount: pointsToRefund,
              status: 'completed',
              description: `${NOTIFICATION_TYPES.POINTS_REFUNDED}: ${pointsToRefund} نقطة - إلغاء حملة "${campaign.name}" (${messagesToRefund} رسالة غير مرسلة)`,
              isDebit: false,
              meta: {
                campaignId: campaign._id,
                campaignName: campaign.name,
                refundReason: 'campaign_cancel',
                messagesToRefund: messagesToRefund,
                pointsPerMessage: POINTS_PER_MESSAGE
              }
            });
            
            await transaction.save();
            
            // تحديث حقل النقاط المستردة في الحملة
            campaign.pointsRefunded = (campaign.pointsRefunded || 0) + pointsToRefund;
          } catch (refundError) {
            console.error('خطأ في تسجيل استرداد النقاط من إلغاء الحملة:', refundError);
          }
        }
      }
    }

    // Update campaign status
    campaign.status = 'canceled';
    await campaign.save();

    res.status(200).json({
      success: true,
      message: 'تم إلغاء الحملة بنجاح',
      pointsInfo: {
        pointsRefunded: campaign.pointsRefunded || 0,
        refundReason: 'استرداد النقاط للرسائل غير المرسلة',
        messagesToRefund: messagesToRefund,
        pointsPerMessage: POINTS_PER_MESSAGE
      },
      data: {
        id: campaign._id,
        status: campaign.status
      }
    });
  } catch (error) {
    res.status(error.statusCode || 400);
    throw new Error(error.message || 'حدث خطأ أثناء إلغاء الحملة');
  }
});

/**
 * @desc    Get campaign statistics
 * @route   GET /api/page-campaigns/:id/stats
 * @access  Private
 */
const getCampaignStats = asyncHandler(async (req, res) => {
  const campaign = await PageMessageCampaign.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!campaign) {
    res.status(404);
    throw new Error('لم يتم العثور على الحملة');
  }

  // Calculate completion percentage
  const completionPercentage = campaign.recipientCount > 0
    ? Math.round(((campaign.sent + campaign.failed) / campaign.recipientCount) * 100)
    : 0;

  // Calculate success rate
  const successRate = campaign.sent > 0
    ? Math.round((campaign.sent / (campaign.sent + campaign.failed)) * 100)
    : 0;

  // Calculate time metrics
  let processingTimeMinutes = 0;
  if (campaign.processingStartedAt) {
    const endTime = campaign.processingCompletedAt || new Date();
    processingTimeMinutes = Math.round((endTime - campaign.processingStartedAt) / (1000 * 60));
  }

  // إضافة إحصائيات النقاط
  const totalPoints = campaign.recipientCount * POINTS_PER_MESSAGE;
  const pointsDeducted = campaign.deductedPoints || 0;
  const pointsRefunded = campaign.pointsRefunded || 0;
  const netPointsCost = pointsDeducted - pointsRefunded;

  const stats = {
    recipientCount: campaign.recipientCount,
    sent: campaign.sent,
    failed: campaign.failed,
    completionPercentage,
    successRate,
    processingTimeMinutes,
    status: campaign.status,
    current: campaign.current,
    scheduledTime: campaign.scheduledTime,
    deliveryStats: campaign.deliveryStats || {},
    // إضافة معلومات النقاط
    pointsInfo: {
      totalPointsRequired: totalPoints,
      pointsDeducted: pointsDeducted,
      pointsRefunded: pointsRefunded,
      netPointsCost: netPointsCost
    },
    lastUpdate: campaign.updatedAt
  };

  res.status(200).json({
    success: true,
    data: stats
  });
});

/**
 * @desc    استرداد النقاط للرسائل الفاشلة
 * @route   POST /api/page-campaigns/:id/refund-failed
 * @access  Private
 */
const refundFailedMessages = asyncHandler(async (req, res) => {
  try {
    let campaign = await PageMessageCampaign.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!campaign) {
      res.status(404);
      throw new Error('لم يتم العثور على الحملة');
    }

    // يمكن فقط استرداد النقاط للحملات المكتملة أو الفاشلة
    if (!['completed', 'failed'].includes(campaign.status)) {
      res.status(400);
      throw new Error('يمكن استرداد النقاط فقط للحملات المكتملة أو الفاشلة');
    }

    // التحقق من وجود رسائل فاشلة
    if (campaign.failed <= 0) {
      res.status(400);
      throw new Error('لا توجد رسائل فاشلة لاسترداد نقاطها');
    }

    // التحقق من أن النقاط لم يتم استردادها من قبل للرسائل الفاشلة
    if (campaign.pointsRefunded && campaign.pointsRefunded >= campaign.failed * campaign.pointsPerMessage) {
      res.status(400);
      throw new Error('تم استرداد النقاط للرسائل الفاشلة بالفعل');
    }

    // حساب النقاط المستحقة للاسترداد
    const pointsToRefund = campaign.failed * (campaign.pointsPerMessage || POINTS_PER_MESSAGE);
    
    // جلب المستخدم لإضافة النقاط المستردة
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('المستخدم غير موجود');
    }
    
    // إضافة النقاط إلى رصيد المستخدم
    user.points += pointsToRefund;
    await user.save();
    
    // تسجيل معاملة استرداد النقاط
    const transaction = new Transaction({
      userId: user._id,
      type: 'refund',
      amount: pointsToRefund,
      status: 'completed',
      description: `${NOTIFICATION_TYPES.POINTS_REFUNDED}: ${pointsToRefund} نقطة - حملة "${campaign.name}" (${campaign.failed} رسالة فاشلة)`,
      isDebit: false,
      meta: {
        campaignId: campaign._id,
        campaignName: campaign.name,
        refundReason: 'failed_messages',
        failedMessages: campaign.failed,
        pointsPerMessage: campaign.pointsPerMessage || POINTS_PER_MESSAGE
      }
    });
    
    await transaction.save();
    
    // تحديث حقل النقاط المستردة في الحملة
    campaign.pointsRefunded = (campaign.pointsRefunded || 0) + pointsToRefund;
    campaign.lastRefundTransactionId = transaction._id;
    await campaign.save();

    res.status(200).json({
      success: true,
      message: `تم استرداد ${pointsToRefund} نقطة بنجاح للرسائل الفاشلة`,
      pointsInfo: {
        pointsRefunded: pointsToRefund,
        refundReason: 'استرداد النقاط للرسائل الفاشلة',
        failedMessages: campaign.failed,
        pointsPerMessage: campaign.pointsPerMessage || POINTS_PER_MESSAGE,
        newPointsBalance: user.points
      },
      data: {
        id: campaign._id,
        status: campaign.status,
        pointsRefunded: campaign.pointsRefunded
      }
    });
  } catch (error) {
    res.status(error.statusCode || 400);
    throw new Error(error.message || 'حدث خطأ أثناء استرداد النقاط');
  }
});

/**
 * @desc    استرداد تلقائي للنقاط بعد اكتمال الحملة
 * @route   POST /api/page-campaigns/:id/process-completion
 * @access  Private
 */
const processCompletion = asyncHandler(async (req, res) => {
  try {
    let campaign = await PageMessageCampaign.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!campaign) {
      res.status(404);
      throw new Error('لم يتم العثور على الحملة');
    }

    // إذا كانت الحملة مكتملة وهناك رسائل فاشلة ولم يتم استرداد النقاط
    if (campaign.status === 'completed' && campaign.failed > 0) {
      const alreadyRefunded = campaign.pointsRefunded || 0;
      const refundNeeded = campaign.failed * (campaign.pointsPerMessage || POINTS_PER_MESSAGE);
      
      if (alreadyRefunded < refundNeeded) {
        const pointsToRefund = refundNeeded - alreadyRefunded;
        
        // جلب المستخدم لإضافة النقاط المستردة
        const user = await User.findById(req.user._id);
        if (!user) {
          res.status(404);
          throw new Error('المستخدم غير موجود');
        }
        
        // إضافة النقاط إلى رصيد المستخدم
        user.points += pointsToRefund;
        await user.save();
        
        // تسجيل معاملة استرداد النقاط
        const transaction = new Transaction({
          userId: user._id,
          type: 'refund',
          amount: pointsToRefund,
          status: 'completed',
          description: `${NOTIFICATION_TYPES.POINTS_REFUNDED}: ${pointsToRefund} نقطة - استرداد تلقائي عند اكتمال حملة "${campaign.name}" (${campaign.failed} رسالة فاشلة)`,
          isDebit: false,
          meta: {
            campaignId: campaign._id,
            campaignName: campaign.name,
            refundReason: 'automatic_completion',
            failedMessages: campaign.failed,
            pointsPerMessage: campaign.pointsPerMessage || POINTS_PER_MESSAGE
          }
        });
        
        await transaction.save();
        
        // تحديث حقل النقاط المستردة في الحملة
        campaign.pointsRefunded = (campaign.pointsRefunded || 0) + pointsToRefund;
        campaign.lastRefundTransactionId = transaction._id;
        await campaign.save();
        
        return res.status(200).json({
          success: true,
          message: `تم استرداد ${pointsToRefund} نقطة تلقائياً للرسائل الفاشلة عند اكتمال الحملة`,
          pointsInfo: {
            pointsRefunded: pointsToRefund,
            refundReason: 'استرداد تلقائي عند الاكتمال',
            failedMessages: campaign.failed,
            pointsPerMessage: campaign.pointsPerMessage || POINTS_PER_MESSAGE,
            newPointsBalance: user.points
          },
          data: campaign
        });
      }
    }
    
    // إذا لم يتم استرداد أي نقاط (لا حاجة للاسترداد)
    res.status(200).json({
      success: true,
      message: 'لا توجد نقاط للاسترداد',
      data: campaign
    });
  } catch (error) {
    res.status(error.statusCode || 400);
    throw new Error(error.message || 'حدث خطأ أثناء معالجة اكتمال الحملة');
  }
});

module.exports = {
  createCampaign,
  getUserCampaigns,
  getCampaign,
  updateCampaign,
  deleteCampaign,
  addRecipients,
  removeRecipients,
  rescheduleCampaign, // Renamed from startCampaign to rescheduleCampaign
  pauseCampaign,
  resumeCampaign,
  cancelCampaign,
  getCampaignStats,
  refundFailedMessages,
  processCompletion
};