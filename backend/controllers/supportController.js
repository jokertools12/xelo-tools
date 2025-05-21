const SupportMessage = require('../models/SupportMessage');
const ResponseTemplate = require('../models/ResponseTemplate');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

/**
 * @desc    Create a new support message
 * @route   POST /api/support/message
 * @access  Private
 */
const createSupportMessage = asyncHandler(async (req, res) => {
  const { subject, message, category, priority } = req.body;
  const user = req.user;

  if (!subject || !message) {
    res.status(400);
    throw new Error('الرجاء إدخال الموضوع والرسالة');
  }

  // Create the initial support message
  const supportMessage = await SupportMessage.create({
    userId: user._id,
    userName: user.name,
    userEmail: user.email,
    subject,
    message,
    category: category || 'general',
    priority: priority || 'medium',
    status: 'new'
  });

  if (supportMessage) {
    // Find an appropriate template for auto-response based on category
    let template = null;
    try {
      // Find category-specific template or fallback to general
      const categoryTemplates = await ResponseTemplate.find({ 
        category: supportMessage.category,
        isActive: true 
      }).sort({ usageCount: -1 }).limit(1);
      
      // If no category-specific template found, try general template
      if (categoryTemplates.length === 0) {
        template = await ResponseTemplate.findOne({ 
          category: 'general',
          isActive: true 
        }).sort({ usageCount: -1 });
      } else {
        template = categoryTemplates[0];
      }
      
      // If a template was found, add automatic response
      if (template) {
        // Create automatic admin response with valid ObjectId types
        const autoResponse = {
          userId: supportMessage.userId, // Use the actual user's ID (required)
          userName: 'النظام التلقائي',
          adminId: null, // This is optional, so null is valid
          adminName: 'النظام التلقائي',
          message: template.content,
          isAdminResponse: true,
          isAutomatic: true
        };
        
        // Add response to the message
        supportMessage.responses.push(autoResponse);
        supportMessage.status = 'in-progress';  // Update status since it's been responded to
        supportMessage.lastAdminResponseAt = new Date();
        
        // Update message with auto-response
        await supportMessage.save();
        
        // Increment template usage count
        template.usageCount += 1;
        await template.save();
        
        console.log(`Auto-response template applied to ticket ${supportMessage._id}`);
      }
    } catch (error) {
      // Log error but don't fail the request
      console.error('Error applying auto-response template:', error);
      // Continue silently - message is still created, just without auto-response
    }
    
    // Return the message (with auto-response if applied)
    res.status(201).json(supportMessage);
  } else {
    res.status(400);
    throw new Error('بيانات غير صالحة');
  }
});

/**
 * @desc    Get all support messages (admin only)
 * @route   GET /api/support/admin/messages
 * @access  Private/Admin
 */
const getAllSupportMessages = asyncHandler(async (req, res) => {
  const messages = await SupportMessage.find({})
    .sort({ createdAt: -1 })
    .lean();

  res.json(messages);
});

/**
 * @desc    Get user's support messages
 * @route   GET /api/support/messages
 * @access  Private
 */
const getUserSupportMessages = asyncHandler(async (req, res) => {
  const messages = await SupportMessage.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .lean();

  res.json(messages);
});

/**
 * @desc    Get a support message by ID
 * @route   GET /api/support/messages/:id
 * @access  Private
 */
const getSupportMessageById = asyncHandler(async (req, res) => {
  const message = await SupportMessage.findById(req.params.id);

  if (message) {
    // Check if the user is the owner or an admin
    if (message.userId.toString() === req.user._id.toString() || req.user.role === 'admin') {
      res.json(message);
    } else {
      res.status(403);
      throw new Error('غير مصرح بالوصول');
    }
  } else {
    res.status(404);
    throw new Error('الرسالة غير موجودة');
  }
});

/**
 * @desc    Update support message status (admin only)
 * @route   PUT /api/support/admin/messages/:id/status
 * @access  Private/Admin
 */
const updateMessageStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!['new', 'in-progress', 'resolved'].includes(status)) {
    res.status(400);
    throw new Error('حالة غير صالحة');
  }

  const message = await SupportMessage.findById(req.params.id);

  if (message) {
    message.status = status;
    const updatedMessage = await message.save();
    res.json(updatedMessage);
  } else {
    res.status(404);
    throw new Error('الرسالة غير موجودة');
  }
});

/**
 * @desc    Add response to a support message (admin only)
 * @route   POST /api/support/admin/messages/:id/respond
 * @access  Private/Admin
 */
const respondToMessage = asyncHandler(async (req, res) => {
  const { message: responseText } = req.body;

  if (!responseText) {
    res.status(400);
    throw new Error('الرجاء إدخال نص الرد');
  }

  const message = await SupportMessage.findById(req.params.id);

  if (message) {
    // Development fallback for when req.user might be undefined
    const adminId = req.user?._id || 'dev-admin-id';
    const adminName = req.user?.name || 'مدير النظام';
    
    const response = {
      userId: adminId,
      userName: adminName,
      adminId: adminId,
      adminName: adminName,
      message: responseText,
      isAdminResponse: true
    };

    message.responses.push(response);
    if (message.status === 'new') {
      message.status = 'in-progress';
    }

    // Set lastAdminResponseAt to track when an admin last responded
    message.lastAdminResponseAt = new Date();
    // Set viewed to false since there's a new admin response that user hasn't seen
    message.viewed = false;

    const updatedMessage = await message.save();
    res.json(updatedMessage);
  } else {
    res.status(404);
    throw new Error('الرسالة غير موجودة');
  }
});

/**
 * @desc    User reply to a support message
 * @route   POST /api/support/messages/:id/reply
 * @access  Private
 */
const userReplyToMessage = asyncHandler(async (req, res) => {
  const { message: replyText } = req.body;

  if (!replyText) {
    res.status(400);
    throw new Error('الرجاء إدخال نص الرد');
  }

  const message = await SupportMessage.findById(req.params.id);

  if (!message) {
    res.status(404);
    throw new Error('الرسالة غير موجودة');
  }

  // Check if the user is the owner of the message
  if (message.userId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('غير مصرح بالوصول');
  }

  const userReply = {
    userId: req.user._id,
    userName: req.user.name,
    message: replyText,
    isAdminResponse: false
    // adminId and adminName will use default null values from schema
  };

  message.responses.push(userReply);
  
  // Automatically mark as viewed when user replies
  message.viewed = true;
  message.lastViewedByUser = new Date();
  
  // If the message was resolved, reopen it
  if (message.status === 'resolved') {
    message.status = 'in-progress';
  }

  const updatedMessage = await message.save();
  res.json(updatedMessage);
});

/**
 * @desc    Mark a message as read (admin only)
 * @route   PUT /api/support/admin/messages/:id/read
 * @access  Private/Admin
 */
const markMessageAsRead = asyncHandler(async (req, res) => {
  const message = await SupportMessage.findById(req.params.id);

  if (message) {
    message.isRead = true;
    const updatedMessage = await message.save();
    res.json(updatedMessage);
  } else {
    res.status(404);
    throw new Error('الرسالة غير موجودة');
  }
});

/**
 * @desc    Mark a message as viewed by user
 * @route   PUT /api/support/messages/:id/viewed
 * @access  Private
 */
const markMessageAsViewed = asyncHandler(async (req, res) => {
  const message = await SupportMessage.findById(req.params.id);

  if (!message) {
    res.status(404);
    throw new Error('الرسالة غير موجودة');
  }

  // Check if the user is the owner of the message
  if (message.userId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('غير مصرح بالوصول');
  }

  // Set the viewed flag and update the lastViewedByUser timestamp
  message.viewed = true;
  message.lastViewedByUser = new Date();
  
  const updatedMessage = await message.save();
  res.json(updatedMessage);
});

/**
 * @desc    Get statistics of support messages (admin only)
 * @route   GET /api/support/admin/statistics
 * @access  Private/Admin
 */
const getSupportStatistics = asyncHandler(async (req, res) => {
  const total = await SupportMessage.countDocuments();
  const newCount = await SupportMessage.countDocuments({ status: 'new' });
  const inProgressCount = await SupportMessage.countDocuments({ status: 'in-progress' });
  const resolvedCount = await SupportMessage.countDocuments({ status: 'resolved' });

  const statistics = {
    total,
    new: newCount,
    inProgress: inProgressCount,
    resolved: resolvedCount
  };

  res.json(statistics);
});

/**
 * @desc    Get all response templates
 * @route   GET /api/support/templates
 * @access  Private/Admin
 */
const getResponseTemplates = asyncHandler(async (req, res) => {
  const { category } = req.query;
  
  const query = { isActive: true };
  if (category && category !== 'all') {
    query.category = category;
  }
  
  const templates = await ResponseTemplate.find(query)
    .sort({ usageCount: -1, createdAt: -1 })
    .lean();
  
  res.json(templates);
});

/**
 * @desc    Get a response template by ID
 * @route   GET /api/support/templates/:id
 * @access  Private/Admin
 */
const getResponseTemplateById = asyncHandler(async (req, res) => {
  const template = await ResponseTemplate.findById(req.params.id);
  
  if (template) {
    res.json(template);
  } else {
    res.status(404);
    throw new Error('القالب غير موجود');
  }
});

/**
 * @desc    Create a new response template
 * @route   POST /api/support/templates
 * @access  Private/Admin
 */
const createResponseTemplate = asyncHandler(async (req, res) => {
  const { name, category, content } = req.body;
  
  if (!name || !content) {
    res.status(400);
    throw new Error('الرجاء إدخال اسم ومحتوى القالب');
  }
  
  // Development fallback for when req.user might be undefined
  const adminId = req.user?._id || 'dev-admin-id';
  const adminName = req.user?.name || 'مدير النظام';
  
  const template = await ResponseTemplate.create({
    name,
    category: category || 'general',
    content,
    createdBy: adminId,
    creatorName: adminName
  });
  
  if (template) {
    res.status(201).json(template);
  } else {
    res.status(400);
    throw new Error('بيانات غير صالحة');
  }
});

/**
 * @desc    Update a response template
 * @route   PUT /api/support/templates/:id
 * @access  Private/Admin
 */
const updateResponseTemplate = asyncHandler(async (req, res) => {
  const { name, category, content, isActive } = req.body;
  
  const template = await ResponseTemplate.findById(req.params.id);
  
  if (template) {
    template.name = name || template.name;
    template.category = category || template.category;
    template.content = content || template.content;
    
    // Only update isActive if explicitly provided
    if (isActive !== undefined) {
      template.isActive = isActive;
    }
    
    const updatedTemplate = await template.save();
    res.json(updatedTemplate);
  } else {
    res.status(404);
    throw new Error('القالب غير موجود');
  }
});

/**
 * @desc    Delete a response template
 * @route   DELETE /api/support/templates/:id
 * @access  Private/Admin
 */
const deleteResponseTemplate = asyncHandler(async (req, res) => {
  const template = await ResponseTemplate.findById(req.params.id);
  
  if (template) {
    await template.remove();
    res.json({ message: 'تم حذف القالب' });
  } else {
    res.status(404);
    throw new Error('القالب غير موجود');
  }
});

/**
 * @desc    Increment usage count for a template
 * @route   PUT /api/support/templates/:id/use
 * @access  Private/Admin
 */
const incrementTemplateUsage = asyncHandler(async (req, res) => {
  const template = await ResponseTemplate.findById(req.params.id);
  
  if (template) {
    template.usageCount += 1;
    const updatedTemplate = await template.save();
    res.json(updatedTemplate);
  } else {
    res.status(404);
    throw new Error('القالب غير موجود');
  }
});

/**
 * @desc    Get all admin users for team assignment
 * @route   GET /api/admin/team
 * @access  Private/Admin
 */
const getAdminTeam = asyncHandler(async (req, res) => {
  const adminUsers = await User.find({ role: 'admin' })
    .select('_id name email avatar isAvailable lastActive')
    .lean();
  
  res.json(adminUsers);
});

/**
 * @desc    Get detailed support analytics with time range
 * @route   GET /api/support/admin/analytics
 * @access  Private/Admin
 */
const getSupportAnalytics = asyncHandler(async (req, res) => {
  const { timeRange } = req.query;
  
  // Calculate date range based on timeRange parameter
  const now = new Date();
  let startDate = new Date(now);
  
  switch(timeRange) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'quarter':
      startDate.setMonth(now.getMonth() - 3);
      break;
    case 'year':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      // Default to 'week' if no valid timeRange
      startDate.setDate(now.getDate() - 7);
  }
  
  // Get message volume by day
  const messageVolume = await SupportMessage.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: now }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    },
    {
      $project: {
        date: '$_id',
        count: 1,
        _id: 0
      }
    }
  ]);
  
  // Get response times
  const responseTimes = await SupportMessage.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: now },
        lastAdminResponseAt: { $ne: null }
      }
    },
    {
      $addFields: {
        responseTime: { 
          $divide: [
            { $subtract: ['$lastAdminResponseAt', '$createdAt'] }, 
            3600000 // convert ms to hours
          ]
        }
      }
    },
    {
      $group: {
        _id: '$category',
        averageResponseTime: { $avg: '$responseTime' },
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        category: '$_id',
        averageResponseTime: 1,
        count: 1,
        _id: 0
      }
    }
  ]);
  
  // Get message status breakdown
  const statusBreakdown = await SupportMessage.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: now }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        status: '$_id',
        count: 1,
        _id: 0
      }
    }
  ]);
  
  // Get category breakdown
  const categoryBreakdown = await SupportMessage.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: now }
      }
    },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        category: '$_id',
        count: 1,
        _id: 0
      }
    }
  ]);
  
  // Get admin performance stats
  const adminPerformance = await SupportMessage.aggregate([
    {
      $match: {
        'responses.isAdminResponse': true,
        'responses.adminId': { $ne: null },
        createdAt: { $gte: startDate, $lte: now }
      }
    },
    {
      $unwind: '$responses'
    },
    {
      $match: {
        'responses.isAdminResponse': true,
        'responses.adminId': { $ne: null }
      }
    },
    {
      $group: {
        _id: {
          adminId: '$responses.adminId',
          adminName: '$responses.adminName'
        },
        responseCount: { $sum: 1 },
        messagesResolved: {
          $sum: {
            $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0]
          }
        }
      }
    },
    {
      $project: {
        adminId: '$_id.adminId',
        adminName: '$_id.adminName',
        responseCount: 1,
        messagesResolved: 1,
        resolutionRate: {
          $cond: [
            { $eq: ['$responseCount', 0] },
            0,
            { $divide: ['$messagesResolved', '$responseCount'] }
          ]
        },
        _id: 0
      }
    }
  ]);
  
  // Collect all analytics data
  const analyticsData = {
    messageVolume,
    responseTimes,
    statusBreakdown,
    categoryBreakdown,
    adminPerformance,
    timeRange,
    totalMessages: await SupportMessage.countDocuments({
      createdAt: { $gte: startDate, $lte: now }
    }),
    averageResponseTime: responseTimes.length > 0 
      ? responseTimes.reduce((acc, curr) => acc + curr.averageResponseTime, 0) / responseTimes.length
      : 0
  };
  
  res.json(analyticsData);
});

/**
 * @desc    Assign a message to an admin
 * @route   PUT /api/support/admin/messages/:id/assign
 * @access  Private/Admin
 */
const assignMessageToAdmin = asyncHandler(async (req, res) => {
  const { adminId, adminName } = req.body;
  
  if (!adminId || !adminName) {
    res.status(400);
    throw new Error('الرجاء إدخال معلومات المشرف');
  }
  
  const message = await SupportMessage.findById(req.params.id);
  
  if (message) {
    // Development fallback for when req.user might be undefined
    const currentAdminId = req.user?._id || 'dev-admin-id';
    
    message.assignedTo = {
      adminId,
      adminName,
      assignedAt: new Date(),
      assignedBy: currentAdminId
    };
    
    if (message.status === 'new') {
      message.status = 'in-progress';
    }
    
    const updatedMessage = await message.save();
    res.json(updatedMessage);
  } else {
    res.status(404);
    throw new Error('الرسالة غير موجودة');
  }
});

/**
 * @desc    Add an internal note to a message (not visible to users)
 * @route   POST /api/support/admin/messages/:id/note
 * @access  Private/Admin
 */
const addInternalNote = asyncHandler(async (req, res) => {
  const { note } = req.body;
  
  if (!note) {
    res.status(400);
    throw new Error('الرجاء إدخال نص الملاحظة');
  }
  
  const message = await SupportMessage.findById(req.params.id);
  
  if (message) {
    // Initialize internalNotes array if it doesn't exist
    if (!message.internalNotes) {
      message.internalNotes = [];
    }
    
    // Development fallback for when req.user might be undefined
    const adminId = req.user?._id || 'dev-admin-id';
    const adminName = req.user?.name || 'مدير النظام';
    
    message.internalNotes.push({
      adminId: adminId,
      adminName: adminName,
      note,
      createdAt: new Date()
    });
    
    const updatedMessage = await message.save();
    res.json(updatedMessage);
  } else {
    res.status(404);
    throw new Error('الرسالة غير موجودة');
  }
});

module.exports = {
  createSupportMessage,
  getAllSupportMessages,
  getUserSupportMessages,
  getSupportMessageById,
  updateMessageStatus,
  respondToMessage,
  userReplyToMessage,
  markMessageAsRead,
  markMessageAsViewed,
  getSupportStatistics,
  // Template functions
  getResponseTemplates,
  getResponseTemplateById,
  createResponseTemplate,
  updateResponseTemplate,
  deleteResponseTemplate,
  incrementTemplateUsage,
  // Admin functions
  getAdminTeam,
  getSupportAnalytics,
  assignMessageToAdmin,
  addInternalNote
};