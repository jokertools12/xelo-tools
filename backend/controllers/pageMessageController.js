const asyncHandler = require('express-async-handler');
const axios = require('axios');
const PageMessage = require('../models/PageMessage');
const AccessToken = require('../models/AccessToken');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const delayUtils = require('../utils/delayUtils');
const immediateMessageProcessor = require('../utils/immediateMessageProcessor');

// تحديد تكلفة النقاط لكل رسالة (يمكن تحويلها لإعداد في المستقبل)
const POINTS_PER_MESSAGE = 1;

// لإضافة تنبيهات أكثر وضوحًا للنقاط
const NOTIFICATION_TYPES = {
  POINTS_DEDUCTED: 'تم خصم النقاط',
  POINTS_REFUNDED: 'تم استرداد النقاط',
  POINTS_INSUFFICIENT: 'رصيد النقاط غير كافٍ'
};

/**
 * @desc    Get all user access tokens
 * @route   GET /api/pagemessages/tokens
 * @access  Private
 */
const getUserAccessTokens = asyncHandler(async (req, res) => {
  const tokens = await AccessToken.find({ user: req.user._id }).select('name token');
  
  if (!tokens || tokens.length === 0) {
    return res.status(200).json({
      success: true,
      data: []
    });
  }
  
  res.status(200).json({
    success: true,
    count: tokens.length,
    data: tokens
  });
});

/**
 * @desc    Extract pages from access token
 * @route   POST /api/pagemessages/extract-pages
 * @access  Private
 */
const extractPages = asyncHandler(async (req, res) => {
  // Support both GET and POST requests by checking query params and body
  const accessToken = req.method === 'GET' ? req.query.accessToken : req.body.accessToken;
  
  if (!accessToken) {
    res.status(400);
    throw new Error('الرجاء توفير رمز الوصول');
  }
  
  try {
    // Call Facebook Graph API to get pages
    const response = await axios.get(
      `https://graph.facebook.com/v13.0/me/accounts?access_token=${accessToken}&fields=name,id,access_token,category`
    );
    
    if (!response.data || !response.data.data) {
      res.status(400);
      throw new Error('فشل في استخراج الصفحات، تأكد من صلاحية رمز الوصول');
    }
    
    const pages = response.data.data.map(page => ({
      id: page.id,
      name: page.name,
      accessToken: page.access_token,
      category: page.category
    }));
    
    res.status(200).json({
      success: true,
      count: pages.length,
      data: pages
    });
    
  } catch (error) {
    res.status(400);
    throw new Error(error.response?.data?.error?.message || 'فشل في استخراج الصفحات');
  }
});

/**
 * @desc    Extract message senders from a page
 * @route   POST /api/pagemessages/extract-senders
 * @access  Private
 */
const extractMessageSenders = asyncHandler(async (req, res) => {
  // Support both GET and POST requests by checking query params and body
  const pageId = req.method === 'GET' ? req.query.pageId : req.body.pageId;
  const pageName = req.method === 'GET' ? req.query.pageName : req.body.pageName;
  const accessToken = req.method === 'GET' ? req.query.accessToken : req.body.accessToken;
  
  if (!pageId || !accessToken) {
    res.status(400);
    throw new Error('الرجاء توفير معرف الصفحة ورمز الوصول');
  }
  
  console.log(`Extracting senders for pageId: ${pageId}, method: ${req.method}`);
  
  try {
    // First, try to get the page name if it's not provided
    let pageNameToUse = pageName;
    if (!pageNameToUse) {
      try {
        // Try to get the page details from Facebook
        const pageDetailsUrl = `https://graph.facebook.com/v13.0/${pageId}?fields=name&access_token=${accessToken}`;
        console.log(`Fetching page name from: ${pageDetailsUrl}`);
        
        const pageDetailsResponse = await axios.get(pageDetailsUrl);
        if (pageDetailsResponse.data && pageDetailsResponse.data.name) {
          pageNameToUse = pageDetailsResponse.data.name;
          console.log(`Found page name: ${pageNameToUse}`);
        } else {
          console.log(`Could not find page name, using pageId as name`);
          pageNameToUse = `Page ${pageId}`;
        }
      } catch (pageNameError) {
        console.error(`Error fetching page name: ${pageNameError.message}`);
        pageNameToUse = `Page ${pageId}`;
      }
    }
    
    let url = `https://graph.facebook.com/v13.0/me/conversations?fields=senders,id&access_token=${accessToken}&limit=100`;
    console.log(`Initial API URL: ${url.substring(0, url.indexOf('access_token=') + 13)}[TOKEN_HIDDEN]`);
    
    let allSenders = [];
    let hasNextPage = true;
    let uniqueSenderIds = new Set();
    
    while (hasNextPage) {
      console.log(`Making request to FB API...`);
      const response = await axios.get(url);
      
      if (!response.data) {
        console.log(`No data in response`);
        break;
      }
      
      if (!response.data.data) {
        console.log(`No data array in response. Response structure: ${JSON.stringify(Object.keys(response.data))}`);
        break;
      }
      
      console.log(`Received ${response.data.data.length} conversations`);
      
      // Process conversation data
      for (const conversation of response.data.data) {
        const conversationId = conversation.id;
        
        if (conversationId && conversationId.startsWith('t_') && conversation.senders && conversation.senders.data) {
          for (const sender of conversation.senders.data) {
            const senderId = sender.id;
            const senderName = sender.name;
            
            // Only add unique senders
            if (!uniqueSenderIds.has(senderId)) {
              uniqueSenderIds.add(senderId);
              allSenders.push({
                id: senderId,
                name: senderName,
                lastInteraction: new Date()
              });
            }
          }
        }
      }
      
      // Handle pagination
      if (response.data.paging && 
          response.data.paging.cursors && 
          response.data.paging.cursors.after) {
        url = `https://graph.facebook.com/v13.0/me/conversations?fields=senders,id&access_token=${accessToken}&limit=100&after=${response.data.paging.cursors.after}`;
      } else {
        hasNextPage = false;
      }
    }
    
    console.log(`Found ${allSenders.length} unique senders`);
    
    // Save to database
    let pageMessage = await PageMessage.findOne({ 
      user: req.user._id,
      pageId
    });
    
    if (pageMessage) {
      // Update existing record
      console.log(`Updating existing record for page ${pageId}`);
      pageMessage.senders = allSenders;
      pageMessage.extractedAt = new Date();
      await pageMessage.save();
    } else {
      // Create new record
      console.log(`Creating new record for page ${pageId} with name ${pageNameToUse}`);
      pageMessage = await PageMessage.create({
        user: req.user._id,
        pageId,
        pageName: pageNameToUse,
        accessToken,
        senders: allSenders,
        extractedAt: new Date()
      });
    }
    
    res.status(200).json({
      success: true,
      count: allSenders.length,
      data: {
        pageId,
        pageName: pageNameToUse,
        senders: allSenders
      }
    });
    
  } catch (error) {
    console.error('Error extracting senders:', error);
    console.error('Error details:', JSON.stringify(error.response?.data || 'No response data'));
    
    // More informative error message
    let errorMessage = 'فشل في استخراج المراسلين';
    if (error.response?.data?.error?.message) {
      errorMessage = error.response.data.error.message;
    } else if (error.response?.data?.error) {
      errorMessage = JSON.stringify(error.response.data.error);
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(400);
    throw new Error(errorMessage);
  }
});

/**
 * @desc    Get all extracted pages with senders
 * @route   GET /api/pagemessages/pages
 * @access  Private
 */
const getExtractedPages = asyncHandler(async (req, res) => {
  const pages = await PageMessage.find({ user: req.user._id })
    .select('pageId pageName extractedAt')
    .lean();
  
  // Add sender count to each page
  const pagesWithCounts = await Promise.all(pages.map(async (page) => {
    const fullPage = await PageMessage.findOne({ 
      user: req.user._id,
      pageId: page.pageId
    });
    
    return {
      ...page,
      senderCount: fullPage.senders ? fullPage.senders.length : 0
    };
  }));
  
  res.status(200).json({
    success: true,
    count: pages.length,
    data: pagesWithCounts
  });
});

/**
 * @desc    Get all senders for a specific page
 * @route   GET /api/pagemessages/senders/:pageId
 * @access  Private
 */
const getPageSenders = asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  
  const pageMessage = await PageMessage.findOne({
    user: req.user._id,
    pageId
  });
  
  if (!pageMessage) {
    res.status(404);
    throw new Error('لم يتم العثور على الصفحة');
  }
  
  res.status(200).json({
    success: true,
    count: pageMessage.senders.length,
    data: pageMessage.senders,
    pageId: pageMessage.pageId,
    pageName: pageMessage.pageName
  });
});

/**
 * @desc    Send message to page sender
 * @route   POST /api/pagemessages/send
 * @access  Private
 */
const sendMessage = asyncHandler(async (req, res) => {
  const { 
    pageId, 
    accessToken, 
    senderId, 
    messageType, 
    messageText, 
    mediaUrl,
    quickReplyButtons
  } = req.body;
  
  if (!pageId || !accessToken || !senderId) {
    res.status(400);
    throw new Error('الرجاء توفير معرف الصفحة ومعرف المستلم ورمز الوصول');
  }
  
  if (messageType === 'text' && (!messageText || messageText.trim() === '')) {
    res.status(400);
    throw new Error('الرجاء توفير نص الرسالة');
  }
  
  if ((messageType === 'image' || messageType === 'video') && (!mediaUrl || mediaUrl.trim() === '')) {
    res.status(400);
    throw new Error('الرجاء توفير رابط الوسائط');
  }
  
  // التحقق من رصيد النقاط قبل الإرسال
  try {
    // جلب المستخدم للتحقق من النقاط
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('المستخدم غير موجود');
    }
    
    // التحقق من وجود رصيد كافٍ
    if (user.points < POINTS_PER_MESSAGE) {
      res.status(400);
      throw new Error(`لا يوجد رصيد كافٍ من النقاط. مطلوب ${POINTS_PER_MESSAGE} نقطة لإرسال رسالة`);
    }
    
    // خصم النقاط قبل إضافة الرسالة للقائمة
    user.points -= POINTS_PER_MESSAGE;
    await user.save();
    
    // إضافة الرسالة لقائمة المعالجة بدلاً من الإرسال المباشر
    try {
      // إعداد بيانات الرسالة للقائمة
      const messageData = {
        pageId,
        accessToken,
        senderId,
        messageType,
        messageText,
        mediaUrl,
        quickReplyButtons,
        userId: req.user._id // تخزين معرف المستخدم لإدارة النقاط
      };
      
      // إضافة الرسالة للقائمة
      const queueResult = await immediateMessageProcessor.queueIndividualMessage(messageData);
      
      res.status(200).json({
        success: true,
        message: 'تم إضافة الرسالة لقائمة المعالجة',
        pointsDeducted: POINTS_PER_MESSAGE,
        newPointsBalance: user.points,
        queueInfo: queueResult
      });
    } catch (fbError) {
      // استرداد النقاط في حالة فشل إضافة الرسالة للقائمة
      user.points += POINTS_PER_MESSAGE;
      await user.save();
      
      // تسجيل المعاملة كاسترداد نقاط
      try {
        const refundTransaction = new Transaction({
          userId: user._id,
          type: 'refund',
          amount: POINTS_PER_MESSAGE,
          status: 'completed',
          description: `استرداد نقاط - فشل إضافة رسالة للقائمة لصفحة ${pageId}`,
          isDebit: false,
          meta: {
            messageType: 'instant',
            pageId: pageId,
            recipientId: senderId,
            failureReason: fbError.message || 'فشل في إضافة الرسالة للقائمة'
          }
        });
        await refundTransaction.save();
      } catch (refundError) {
        console.error('خطأ في تسجيل استرداد النقاط:', refundError);
      }
      
      res.status(400);
      throw new Error(fbError.message || 'فشل في إضافة الرسالة لقائمة المعالجة وتم استرداد النقاط');
    }
    
  } catch (error) {
    res.status(error.statusCode || 400);
    throw new Error(error.message || 'حدث خطأ أثناء إرسال الرسالة');
  }
});

/**
 * @desc    Bulk send message to multiple page senders
 * @route   POST /api/pagemessages/bulk-send
 * @access  Private
 */
const bulkSendMessage = asyncHandler(async (req, res) => {
  const { 
    pageId, 
    accessToken, 
    senderIds, 
    messageType, 
    messageText, 
    mediaUrl,
    quickReplyButtons,
    enableDelay,
    delayMode,
    delaySeconds,
    minDelaySeconds,
    maxDelaySeconds,
    incrementalDelayStart,
    incrementalDelayStep
  } = req.body;
  
  if (!pageId || !accessToken || !senderIds || !senderIds.length) {
    res.status(400);
    throw new Error('الرجاء توفير معرف الصفحة وقائمة المستلمين ورمز الوصول');
  }
  
  if (messageType === 'text' && (!messageText || messageText.trim() === '')) {
    res.status(400);
    throw new Error('الرجاء توفير نص الرسالة');
  }
  
  try {
    // حساب إجمالي النقاط المطلوبة
    const totalPointsRequired = POINTS_PER_MESSAGE * senderIds.length;
    
    // جلب المستخدم للتحقق من النقاط
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('المستخدم غير موجود');
    }
    
    // التحقق من وجود رصيد كافٍ
    if (user.points < totalPointsRequired) {
      res.status(400);
      throw new Error(`لا يوجد رصيد كافٍ من النقاط. مطلوب ${totalPointsRequired} نقطة لإرسال ${senderIds.length} رسالة`);
    }
    
    // خصم النقاط مقدماً
    user.points -= totalPointsRequired;
    await user.save();
    
    // الحصول على معلومات المستلمين الكاملة إذا كانت متوفرة
    let fullRecipients = [];
    try {
      // محاولة الحصول على معلومات المستلمين من قاعدة البيانات
      const pageMessage = await PageMessage.findOne({
        user: req.user._id,
        pageId
      });
      
      if (pageMessage && pageMessage.senders && pageMessage.senders.length > 0) {
        // بناء خريطة للعثور على المستلمين بسرعة
        const sendersMap = new Map();
        pageMessage.senders.forEach(sender => {
          sendersMap.set(sender.id, sender);
        });
        
        // إنشاء مصفوفة كاملة للمستلمين مع أسمائهم وأوقات تفاعلهم
        fullRecipients = senderIds.map(id => {
          const sender = sendersMap.get(id);
          if (sender) {
            return {
              id,
              name: sender.name || '',
              lastInteraction: sender.lastInteraction || new Date()
            };
          }
          return { id, name: '', lastInteraction: new Date() };
        });
      }
    } catch (err) {
      console.error('Error fetching recipients data:', err);
      // في حالة وجود خطأ، استخدم المعرفات فقط
      fullRecipients = senderIds.map(id => ({ 
        id, 
        name: '', 
        lastInteraction: new Date() 
      }));
    }
    
    // إضافة الرسائل المجمعة لقائمة المعالجة بدلاً من المعالجة المباشرة
    try {
      // إعداد بيانات الرسائل المجمعة للقائمة
      const bulkMessageData = {
        pageId,
        accessToken,
        senderIds, // للتوافق مع الإصدارات السابقة
        recipients: fullRecipients, // إضافة معلومات المستلمين الكاملة
        messageType,
        messageText,
        mediaUrl,
        quickReplyButtons,
        userId: req.user._id, // تخزين معرف المستخدم لإدارة النقاط
        // معلومات التأخير
        enableDelay,
        delayMode,
        delaySeconds,
        minDelaySeconds,
        maxDelaySeconds,
        incrementalDelayStart,
        incrementalDelayStep
      };
      
      // إضافة الرسائل المجمعة للقائمة
      const queueResult = await immediateMessageProcessor.queueBulkMessage(bulkMessageData);
      
      res.status(200).json({
        success: true,
        message: 'تم إضافة الرسائل المجمعة لقائمة المعالجة',
        pointsDeducted: totalPointsRequired,
        newPointsBalance: user.points,
        recipientCount: senderIds.length,
        queueInfo: queueResult
      });
    } catch (queueError) {
      // استرداد النقاط في حالة فشل إضافة الرسائل للقائمة
      user.points += totalPointsRequired;
      await user.save();
      
      // تسجيل معاملة استرداد النقاط
      try {
        const refundTransaction = new Transaction({
          userId: user._id,
          type: 'refund',
          amount: totalPointsRequired,
          status: 'completed',
          description: `استرداد نقاط - فشل إضافة ${senderIds.length} رسالة للقائمة لصفحة ${pageId}`,
          isDebit: false,
          meta: {
            messageType: 'bulk',
            pageId: pageId,
            recipientCount: senderIds.length,
            failureReason: queueError.message || 'فشل في إضافة الرسائل للقائمة'
          }
        });
        await refundTransaction.save();
      } catch (refundError) {
        console.error('خطأ في تسجيل استرداد النقاط للرسائل المجمعة:', refundError);
      }
      
      res.status(400);
      throw new Error(queueError.message || 'فشل في إضافة الرسائل المجمعة لقائمة المعالجة وتم استرداد النقاط');
    }
    
  } catch (error) {
    res.status(400);
    throw new Error(error.message || 'فشل في إرسال الرسائل المجمعة');
  }
});

/**
 * @desc    Get message queue status
 * @route   GET /api/pagemessages/queue-status
 * @access  Private
 */
const getQueueStatus = asyncHandler(async (req, res) => {
  const queueStatus = immediateMessageProcessor.getQueueStatus();
  
  res.status(200).json({
    success: true,
    data: queueStatus
  });
});

module.exports = {
  getUserAccessTokens,
  extractPages,
  extractMessageSenders,
  getExtractedPages,
  getPageSenders,
  sendMessage,
  bulkSendMessage,
  getQueueStatus // تصدير الدالة الجديدة
};