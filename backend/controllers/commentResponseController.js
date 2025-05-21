const asyncHandler = require('express-async-handler');
const CommentResponseRule = require('../models/CommentResponseRule');
const CommentMonitor = require('../models/CommentMonitor');
const CommentResponse = require('../models/CommentResponse');
const AccessToken = require('../models/AccessToken');
const axios = require('axios');
const commentMonitorProcessor = require('../utils/commentMonitorProcessor');

/**
 * @desc    Create a new comment response rule
 * @route   POST /api/comment-responses/rules
 * @access  Private
 */
const createRule = asyncHandler(async (req, res) => {
  const { 
    name, 
    description, 
    keywords, 
    responses, 
    sentimentResponses,
    randomizeResponses, 
    caseSensitive, 
    exactMatch,
    matchingOptions,
    scheduleSettings,
    templateSettings,
    priority
  } = req.body;

  // Validate required fields
  if (!name || !keywords || keywords.length === 0 || !responses || responses.length === 0) {
    res.status(400);
    throw new Error('يرجى ملء الحقول المطلوبة: الاسم والكلمات المفتاحية والردود');
  }

  // Check if rule with same name already exists for this user
  const existingRule = await CommentResponseRule.findOne({
    user: req.user._id,
    name: name.trim()
  });

  if (existingRule) {
    res.status(400);
    throw new Error('توجد قاعدة بنفس الاسم بالفعل');
  }

  // Create the new rule with enhanced options
  const rule = await CommentResponseRule.create({
    user: req.user._id,
    name: name.trim(),
    description: description || '',
    keywords: keywords.map(keyword => keyword.trim()).filter(keyword => keyword),
    responses: responses.map(response => response.trim()).filter(response => response),
    // Handle sentiment-specific responses if provided
    sentimentResponses: sentimentResponses || {
      positive: [],
      negative: [],
      neutral: []
    },
    randomizeResponses: randomizeResponses !== undefined ? randomizeResponses : true,
    caseSensitive: caseSensitive !== undefined ? caseSensitive : false,
    exactMatch: exactMatch !== undefined ? exactMatch : false,
    // Add advanced matching options if provided
    matchingOptions: matchingOptions || {
      enableRegex: false,
      minCommentLength: 0,
      maxCommentLength: 0,
      applyToQuestions: true,
      applyToMediaComments: true
    },
    // Add scheduling settings if provided
    scheduleSettings: scheduleSettings || {
      enableScheduling: false,
      activeDays: [0, 1, 2, 3, 4, 5, 6],
      startTime: '00:00',
      endTime: '23:59'
    },
    // Add template settings if provided
    templateSettings: templateSettings || {
      enableTemplates: false,
      customVariables: '{}'
    },
    isActive: true,
    priority: priority || 0,
    stats: {
      timesTriggered: 0,
      sentimentStats: {
        positive: 0,
        negative: 0,
        neutral: 0
      }
    }
  });

  if (rule) {
    res.status(201).json(rule);
  } else {
    res.status(500);
    throw new Error('فشل في إنشاء قاعدة الرد. يرجى المحاولة مرة أخرى');
  }
});

/**
 * @desc    Get all comment response rules for the logged-in user
 * @route   GET /api/comment-responses/rules
 * @access  Private
 */
const getRules = asyncHandler(async (req, res) => {
  const rules = await CommentResponseRule.find({ user: req.user._id })
    .sort({ priority: -1, createdAt: -1 });

  res.status(200).json(rules);
});

/**
 * @desc    Get a single comment response rule by ID
 * @route   GET /api/comment-responses/rules/:id
 * @access  Private
 */
const getRuleById = asyncHandler(async (req, res) => {
  const rule = await CommentResponseRule.findById(req.params.id);

  if (!rule) {
    res.status(404);
    throw new Error('لم يتم العثور على القاعدة');
  }

  // Check user ownership
  if (rule.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
    res.status(403);
    throw new Error('غير مصرح بالوصول');
  }

  res.status(200).json(rule);
});

/**
 * @desc    Update a comment response rule
 * @route   PUT /api/comment-responses/rules/:id
 * @access  Private
 */
const updateRule = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    keywords,
    responses,
    sentimentResponses,
    randomizeResponses,
    responseRotation,
    caseSensitive,
    exactMatch,
    isActive,
    matchingOptions,
    scheduleSettings,
    templateSettings,
    priority
  } = req.body;

  // Find the rule
  const rule = await CommentResponseRule.findById(req.params.id);

  if (!rule) {
    res.status(404);
    throw new Error('لم يتم العثور على القاعدة');
  }

  // Check user ownership
  if (rule.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
    res.status(403);
    throw new Error('غير مصرح بالوصول');
  }

  // If name is being changed, check for duplicates
  if (name && name !== rule.name) {
    const existingRule = await CommentResponseRule.findOne({
      user: req.user._id,
      name: name.trim(),
      _id: { $ne: req.params.id } // Exclude current rule
    });

    if (existingRule) {
      res.status(400);
      throw new Error('توجد قاعدة بنفس الاسم بالفعل');
    }
  }

  // Validate required fields
  if ((keywords && keywords.length === 0) || (responses && responses.length === 0)) {
    res.status(400);
    throw new Error('يجب توفير كلمة مفتاحية واحدة ورد واحد على الأقل');
  }

  // Update the rule with enhanced features
  if (name) rule.name = name;
  if (description !== undefined) rule.description = description;
  if (keywords) rule.keywords = keywords.map(keyword => keyword.trim()).filter(keyword => keyword);
  if (responses) rule.responses = responses.map(response => response.trim()).filter(response => response);
  if (sentimentResponses) rule.sentimentResponses = sentimentResponses;
  if (randomizeResponses !== undefined) rule.randomizeResponses = randomizeResponses;
  if (responseRotation) rule.responseRotation = responseRotation;
  if (caseSensitive !== undefined) rule.caseSensitive = caseSensitive;
  if (exactMatch !== undefined) rule.exactMatch = exactMatch;
  if (isActive !== undefined) rule.isActive = isActive;
  if (matchingOptions) rule.matchingOptions = matchingOptions;
  if (scheduleSettings) rule.scheduleSettings = scheduleSettings;
  if (templateSettings) rule.templateSettings = templateSettings;
  if (priority !== undefined) rule.priority = priority;

  const updatedRule = await rule.save();

  res.status(200).json(updatedRule);
});

/**
 * @desc    Delete a comment response rule
 * @route   DELETE /api/comment-responses/rules/:id
 * @access  Private
 */
const deleteRule = asyncHandler(async (req, res) => {
  const rule = await CommentResponseRule.findById(req.params.id);

  if (!rule) {
    res.status(404);
    throw new Error('لم يتم العثور على القاعدة');
  }

  // Check user ownership
  if (rule.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
    res.status(403);
    throw new Error('غير مصرح بالوصول');
  }

  // Check if rule is used by any monitors
  const usingMonitors = await CommentMonitor.find({
    responseRules: rule._id
  });

  if (usingMonitors.length > 0) {
    res.status(400);
    throw new Error('لا يمكن حذف هذه القاعدة لأنها مستخدمة في مراقبات نشطة');
  }

  await CommentResponseRule.deleteOne({ _id: rule._id });

  res.status(200).json({ message: 'تم حذف القاعدة بنجاح' });
});

/**
 * @desc    Create a new comment monitor
 * @route   POST /api/comment-responses/monitors
 * @access  Private
 */
const createMonitor = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    pageId,
    pageName,
    accessToken,
    posts,
    monitorAllPosts,
    maxPostsToMonitor,
    responseRules,
    respondToAll,
    defaultResponse,
    filters,
    responseBehavior,
    rateLimiting,
    dataManagement,
    checkFrequencyMinutes,
    replyToExistingComments,
    notifications,
    enableDetailedLogging
  } = req.body;

  // Validate required fields
  if (!name || !pageId || !pageName || !accessToken) {
    res.status(400);
    throw new Error('يرجى ملء الحقول المطلوبة: الاسم ومعلومات الصفحة');
  }

  // Validate response configuration
  if ((!responseRules || responseRules.length === 0) && (!respondToAll || !defaultResponse)) {
    res.status(400);
    throw new Error('يجب تحديد قواعد الرد أو تفعيل "الرد على الكل" مع تحديد رد افتراضي');
  }

  // Check if monitor with same name already exists for this user
  const existingMonitor = await CommentMonitor.findOne({
    user: req.user._id,
    name: name.trim()
  });

  if (existingMonitor) {
    res.status(400);
    throw new Error('توجد مراقبة بنفس الاسم بالفعل');
  }

  // Validate posts if not monitoring all
  if (!monitorAllPosts && (!posts || posts.length === 0)) {
    res.status(400);
    throw new Error('يجب تحديد منشورات للمراقبة أو تفعيل "مراقبة جميع المنشورات"');
  }

  // Create the monitor with enhanced features
  const monitor = await CommentMonitor.create({
    user: req.user._id,
    name: name.trim(),
    description: description || '',
    pageId,
    pageName,
    accessToken,
    posts: posts || [],
    monitorAllPosts: monitorAllPosts || false,
    maxPostsToMonitor: maxPostsToMonitor || 50,
    responseRules: responseRules || [],
    respondToAll: respondToAll || false,
    defaultResponse: defaultResponse || '',
    // Add advanced filtering options
    filters: filters || {
      excludeCommenters: '',
      mustContain: '',
      mustNotContain: '',
      minCommentLength: 0,
      skipSpam: true
    },
    // Add intelligent response behavior
    responseBehavior: responseBehavior || {
      useSentimentAnalysis: true,
      rotateResponses: false,
      enableCustomPrompts: false,
      promptTemplate: 'Reply to the following comment in a friendly and helpful tone: {comment}'
    },
    // Add rate limiting settings
    rateLimiting: rateLimiting || {
      maxResponsesPerHour: 60,
      minSecondsBetweenResponses: 10,
      prioritizeNewerComments: true
    },
    // Add data management settings
    dataManagement: dataManagement || {
      responseRetentionLimit: 1000,
      autoArchiveAfterDays: 30
    },
    status: 'active',
    checkFrequencyMinutes: checkFrequencyMinutes || 5,
    replyToExistingComments: replyToExistingComments || false,
    // Add notification settings
    notifications: notifications || {
      notifyOnErrors: true,
      notifyOnRateLimits: true,
      notificationEmail: ''
    },
    enableDetailedLogging: enableDetailedLogging || false,
    stats: {
      commentsFound: 0,
      commentsResponded: 0,
      totalErrorCount: 0,
      spamDetected: 0,
      sentimentStats: {
        positive: 0,
        negative: 0,
        neutral: 0
      },
      averageResponseTimeMs: 0
    }
  });

  if (monitor) {
    // Populate the response rules before returning
    const populatedMonitor = await CommentMonitor.findById(monitor._id)
      .populate('responseRules');
    
    res.status(201).json(populatedMonitor);
  } else {
    res.status(500);
    throw new Error('فشل في إنشاء المراقبة. يرجى المحاولة مرة أخرى');
  }
});

/**
 * @desc    Get all comment monitors for the logged-in user
 * @route   GET /api/comment-responses/monitors
 * @access  Private
 */
const getMonitors = asyncHandler(async (req, res) => {
  const monitors = await CommentMonitor.find({ user: req.user._id })
    .populate('responseRules')
    .sort({ createdAt: -1 });

  // Add virtual properties
  const monitorsWithVirtuals = monitors.map(monitor => {
    const monitorObj = monitor.toObject({ virtuals: true });
    return monitorObj;
  });

  res.status(200).json(monitorsWithVirtuals);
});

/**
 * @desc    Get a single comment monitor by ID
 * @route   GET /api/comment-responses/monitors/:id
 * @access  Private
 */
const getMonitorById = asyncHandler(async (req, res) => {
  const monitor = await CommentMonitor.findById(req.params.id)
    .populate('responseRules');

  if (!monitor) {
    res.status(404);
    throw new Error('لم يتم العثور على المراقبة');
  }

  // Check user ownership
  if (monitor.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
    res.status(403);
    throw new Error('غير مصرح بالوصول');
  }

  // Add virtual properties
  const monitorWithVirtuals = monitor.toObject({ virtuals: true });

  res.status(200).json(monitorWithVirtuals);
});

/**
 * @desc    Update a comment monitor
 * @route   PUT /api/comment-responses/monitors/:id
 * @access  Private
 */
const updateMonitor = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    posts,
    monitorAllPosts,
    maxPostsToMonitor,
    responseRules,
    respondToAll,
    defaultResponse,
    filters,
    responseBehavior,
    rateLimiting,
    dataManagement,
    status,
    checkFrequencyMinutes,
    replyToExistingComments,
    notifications,
    enableDetailedLogging
  } = req.body;

  // Find the monitor
  const monitor = await CommentMonitor.findById(req.params.id);

  if (!monitor) {
    res.status(404);
    throw new Error('لم يتم العثور على المراقبة');
  }

  // Check user ownership
  if (monitor.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
    res.status(403);
    throw new Error('غير مصرح بالوصول');
  }

  // If name is being changed, check for duplicates
  if (name && name !== monitor.name) {
    const existingMonitor = await CommentMonitor.findOne({
      user: req.user._id,
      name: name.trim(),
      _id: { $ne: req.params.id } // Exclude current monitor
    });

    if (existingMonitor) {
      res.status(400);
      throw new Error('توجد مراقبة بنفس الاسم بالفعل');
    }
  }

  // Validate posts if not monitoring all
  if (monitorAllPosts === false && (!posts || posts.length === 0)) {
    res.status(400);
    throw new Error('يجب تحديد منشورات للمراقبة أو تفعيل "مراقبة جميع المنشورات"');
  }

  // Update fields if provided
  if (name) monitor.name = name;
  if (description !== undefined) monitor.description = description;
  if (posts) monitor.posts = posts;
  if (monitorAllPosts !== undefined) monitor.monitorAllPosts = monitorAllPosts;
  if (maxPostsToMonitor) monitor.maxPostsToMonitor = maxPostsToMonitor;
  if (responseRules) monitor.responseRules = responseRules;
  if (respondToAll !== undefined) monitor.respondToAll = respondToAll;
  if (defaultResponse !== undefined) monitor.defaultResponse = defaultResponse;
  if (filters) monitor.filters = filters;
  if (responseBehavior) monitor.responseBehavior = responseBehavior;
  if (rateLimiting) monitor.rateLimiting = rateLimiting;
  if (dataManagement) monitor.dataManagement = dataManagement;
  if (status && ['active', 'paused', 'completed', 'failed', 'archived'].includes(status)) {
    monitor.status = status;
  }
  if (checkFrequencyMinutes) monitor.checkFrequencyMinutes = checkFrequencyMinutes;
  if (replyToExistingComments !== undefined) monitor.replyToExistingComments = replyToExistingComments;
  if (notifications) monitor.notifications = notifications;
  if (enableDetailedLogging !== undefined) monitor.enableDetailedLogging = enableDetailedLogging;

  const updatedMonitor = await monitor.save();
  const populatedMonitor = await CommentMonitor.findById(updatedMonitor._id)
    .populate('responseRules');

  // Add virtual properties
  const monitorWithVirtuals = populatedMonitor.toObject({ virtuals: true });

  res.status(200).json(monitorWithVirtuals);
});

/**
 * @desc    Delete a comment monitor
 * @route   DELETE /api/comment-responses/monitors/:id
 * @access  Private
 */
const deleteMonitor = asyncHandler(async (req, res) => {
  const monitor = await CommentMonitor.findById(req.params.id);

  if (!monitor) {
    res.status(404);
    throw new Error('لم يتم العثور على المراقبة');
  }

  // Check user ownership
  if (monitor.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
    res.status(403);
    throw new Error('غير مصرح بالوصول');
  }

  await CommentMonitor.deleteOne({ _id: monitor._id });

  res.status(200).json({ message: 'تم حذف المراقبة بنجاح' });
});

/**
 * @desc    Pause or resume a comment monitor
 * @route   PATCH /api/comment-responses/monitors/:id/status
 * @access  Private
 */
const updateMonitorStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!status || !['active', 'paused', 'archived'].includes(status)) {
    res.status(400);
    throw new Error('يرجى توفير حالة صالحة (active، paused، أو archived)');
  }

  const monitor = await CommentMonitor.findById(req.params.id);

  if (!monitor) {
    res.status(404);
    throw new Error('لم يتم العثور على المراقبة');
  }

  // Check user ownership
  if (monitor.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
    res.status(403);
    throw new Error('غير مصرح بالوصول');
  }

  monitor.status = status;
  const updatedMonitor = await monitor.save();

  res.status(200).json({ message: `تم تحديث حالة المراقبة إلى ${status}`, status });
});

/**
 * @desc    Get comment responses for a specific monitor
 * @route   GET /api/comment-responses/monitors/:id/responses
 * @access  Private
 */
const getMonitorResponses = asyncHandler(async (req, res) => {
  const monitor = await CommentMonitor.findById(req.params.id);

  if (!monitor) {
    res.status(404);
    throw new Error('لم يتم العثور على المراقبة');
  }

  // Check user ownership
  if (monitor.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
    res.status(403);
    throw new Error('غير مصرح بالوصول');
  }

  // Get responses with pagination and filtering
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  
  // Handle filtering
  const filter = { monitor: monitor._id };
  
  if (req.query.success) {
    filter.success = req.query.success === 'true';
  }
  
  if (req.query.sentiment) {
    filter.sentiment = req.query.sentiment;
  }
  
  if (req.query.search) {
    filter.$or = [
      { commentText: { $regex: req.query.search, $options: 'i' } },
      { responseText: { $regex: req.query.search, $options: 'i' } },
      { commenterName: { $regex: req.query.search, $options: 'i' } }
    ];
  }

  const responses = await CommentResponse.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('rule', 'name');

  const total = await CommentResponse.countDocuments(filter);

  res.status(200).json({
    responses,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * @desc    Manually trigger a check for new comments on a monitor
 * @route   POST /api/comment-responses/monitors/:id/check
 * @access  Private
 */
const triggerMonitorCheck = asyncHandler(async (req, res) => {
  const monitor = await CommentMonitor.findById(req.params.id);

  if (!monitor) {
    res.status(404);
    throw new Error('لم يتم العثور على المراقبة');
  }

  // Check user ownership
  if (monitor.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
    res.status(403);
    throw new Error('غير مصرح بالوصول');
  }

  // Check if monitor is active
  if (monitor.status !== 'active') {
    res.status(400);
    throw new Error('لا يمكن فحص المراقبة غير النشطة. يرجى تنشيطها أولاً');
  }

  try {
    // Process the monitor
    const result = await commentMonitorProcessor.processMonitor(monitor);
    
    res.status(200).json({
      message: 'تم بدء فحص المراقبة. قد يستغرق معالجة جميع التعليقات بعض الوقت',
      result
    });
  } catch (error) {
    res.status(500);
    throw new Error(`حدث خطأ أثناء فحص المراقبة: ${error.message}`);
  }
});

/**
 * @desc    Fetch Facebook posts for a page
 * @route   GET /api/comment-responses/facebook/posts
 * @access  Private
 */
const getFacebookPosts = asyncHandler(async (req, res) => {
  const { pageId, accessToken } = req.query;

  if (!pageId || !accessToken) {
    res.status(400);
    throw new Error('يرجى توفير معرف الصفحة ورمز الوصول');
  }

  try {
    const response = await axios.get(`https://graph.facebook.com/v18.0/${pageId}/posts`, {
      params: {
        fields: 'id,message,created_time',
        limit: 100,
        access_token: accessToken
      }
    });

    if (response.data && response.data.data) {
      // Transform for easier use in frontend
      const posts = response.data.data.map(post => ({
        id: post.id,
        message: post.message || '(بدون نص)',
        createdTime: post.created_time
      }));

      res.status(200).json(posts);
    } else {
      res.status(404);
      throw new Error('لم يتم العثور على منشورات');
    }
  } catch (error) {
    console.error('Facebook API error:', error.response?.data || error.message);
    res.status(error.response?.status || 500);
    throw new Error(error.response?.data?.error?.message || 'حدث خطأ أثناء استرداد المنشورات من فيسبوك');
  }
});

/**
 * @desc    Fetch Facebook pages for the user
 * @route   GET /api/comment-responses/facebook/pages
 * @access  Private
 */
const getFacebookPages = asyncHandler(async (req, res) => {
  const { accessToken } = req.query;
  let accessTokenToUse;

  if (!accessToken) {
    // If no token provided in query, get active token from user's account
    const activeToken = await AccessToken.findOne({
      userId: req.user._id,
      isActive: true
    });

    if (!activeToken) {
      res.status(400);
      throw new Error('لا يوجد رمز وصول نشط. يرجى تفعيل رمز وصول أولاً');
    }

    accessTokenToUse = activeToken.accessToken;
  } else {
    accessTokenToUse = accessToken;
  }

  try {
    const response = await axios.get('https://graph.facebook.com/v18.0/me/accounts', {
      params: {
        access_token: accessTokenToUse
      }
    });

    if (response.data && response.data.data) {
      // Transform for easier use in frontend
      const pages = response.data.data.map(page => ({
        id: page.id,
        name: page.name,
        accessToken: page.access_token,
        category: page.category
      }));

      res.status(200).json(pages);
    } else {
      res.status(404);
      throw new Error('لم يتم العثور على صفحات');
    }
  } catch (error) {
    console.error('Facebook API error:', error.response?.data || error.message);
    res.status(error.response?.status || 500);
    throw new Error(error.response?.data?.error?.message || 'حدث خطأ أثناء استرداد الصفحات من فيسبوك');
  }
});

/**
 * @desc    Get all comment response history for the user
 * @route   GET /api/comment-responses/history
 * @access  Private
 */
const getResponseHistory = asyncHandler(async (req, res) => {
  // Get responses with pagination and filtering
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  
  // Handle filtering
  const filter = { user: req.user._id };
  
  if (req.query.monitorId) {
    filter.monitor = req.query.monitorId;
  }

  if (req.query.ruleId) {
    filter.rule = req.query.ruleId;
  }
  
  if (req.query.success) {
    filter.success = req.query.success === 'true';
  }
  
  if (req.query.sentiment) {
    filter.sentiment = req.query.sentiment;
  }
  
  if (req.query.search) {
    filter.$or = [
      { commentText: { $regex: req.query.search, $options: 'i' } },
      { responseText: { $regex: req.query.search, $options: 'i' } },
      { commenterName: { $regex: req.query.search, $options: 'i' } }
    ];
  }

  const responses = await CommentResponse.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('rule', 'name')
    .populate('monitor', 'name pageId pageName');

  const total = await CommentResponse.countDocuments(filter);

  res.status(200).json({
    responses,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * @desc    Get statistics for comment responses
 * @route   GET /api/comment-responses/stats
 * @access  Private
 */
const getStats = asyncHandler(async (req, res) => {
  // Get counts
  const activeMonitorsCount = await CommentMonitor.countDocuments({
    user: req.user._id,
    status: 'active'
  });

  const rulesCount = await CommentResponseRule.countDocuments({
    user: req.user._id
  });

  const totalResponsesCount = await CommentResponse.countDocuments({
    user: req.user._id
  });

  const successfulResponsesCount = await CommentResponse.countDocuments({
    user: req.user._id,
    success: true
  });

  // Get sentiment statistics
  const positiveSentimentCount = await CommentResponse.countDocuments({
    user: req.user._id,
    sentiment: 'positive'
  });

  const negativeSentimentCount = await CommentResponse.countDocuments({
    user: req.user._id,
    sentiment: 'negative'
  });

  const neutralSentimentCount = await CommentResponse.countDocuments({
    user: req.user._id,
    sentiment: 'neutral'
  });

  // Get most active rules (top 5)
  const topRules = await CommentResponseRule.find({
    user: req.user._id
  })
    .sort({ 'stats.timesTriggered': -1 })
    .limit(5)
    .select('name stats.timesTriggered');

  // Get most active monitors (top 5)
  const topMonitors = await CommentMonitor.find({
    user: req.user._id
  })
    .sort({ 'stats.commentsResponded': -1 })
    .limit(5)
    .select('name stats.commentsResponded stats.commentsFound');

  // Get recent responses (5 most recent)
  const recentResponses = await CommentResponse.find({
    user: req.user._id
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('rule', 'name')
    .populate('monitor', 'name');

  // Get performance over time (last 30 days)
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const dailyStats = await CommentResponse.aggregate([
    {
      $match: {
        user: req.user._id,
        createdAt: { $gte: thirtyDaysAgo }
      }
    },
    {
      $group: {
        _id: { 
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } 
        },
        total: { $sum: 1 },
        successful: { 
          $sum: { $cond: [{ $eq: ["$success", true] }, 1, 0] }
        },
        positive: { 
          $sum: { $cond: [{ $eq: ["$sentiment", "positive"] }, 1, 0] }
        },
        negative: { 
          $sum: { $cond: [{ $eq: ["$sentiment", "negative"] }, 1, 0] }
        },
        neutral: { 
          $sum: { $cond: [{ $eq: ["$sentiment", "neutral"] }, 1, 0] }
        }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  res.status(200).json({
    totalMonitors: activeMonitorsCount,
    totalRules: rulesCount,
    totalResponses: totalResponsesCount,
    successfulResponses: successfulResponsesCount,
    sentimentStats: {
      positive: positiveSentimentCount,
      negative: negativeSentimentCount,
      neutral: neutralSentimentCount
    },
    successRate: totalResponsesCount > 0 ? 
      Math.round((successfulResponsesCount / totalResponsesCount) * 100) : 0,
    topRules,
    topMonitors,
    recentResponses,
    dailyStats
  });
});

/**
 * @desc    Get system health status
 * @route   GET /api/comment-responses/system-health
 * @access  Private/Admin
 */
const getSystemHealth = asyncHandler(async (req, res) => {
  // Check if user is admin
  if (!req.user.isAdmin) {
    res.status(403);
    throw new Error('غير مصرح بالوصول. مطلوب صلاحيات المسؤول');
  }

  // Get overall system stats
  const totalUsers = await CommentMonitor.distinct('user').countDocuments();
  const totalMonitors = await CommentMonitor.countDocuments();
  const activeMonitors = await CommentMonitor.countDocuments({ status: 'active' });
  const totalRules = await CommentResponseRule.countDocuments();
  const totalResponses = await CommentResponse.countDocuments();
  
  // Get error rate
  const successfulResponses = await CommentResponse.countDocuments({ success: true });
  const errorRate = totalResponses > 0 ? 
    (100 - Math.round((successfulResponses / totalResponses) * 100)) : 0;
  
  // Get recent errors
  const recentErrors = await CommentResponse.find({ 
    success: false,
    error: { $exists: true }
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .select('error createdAt monitor commentId')
    .populate('monitor', 'name');
  
  // Get processing time stats
  const processingTimeStats = await CommentResponse.aggregate([
    {
      $match: {
        processingTimeMs: { $exists: true, $ne: null }
      }
    },
    {
      $group: {
        _id: null,
        averageTime: { $avg: "$processingTimeMs" },
        maxTime: { $max: "$processingTimeMs" },
        minTime: { $min: "$processingTimeMs" }
      }
    }
  ]);

  res.status(200).json({
    totalUsers,
    totalMonitors,
    activeMonitors,
    totalRules,
    totalResponses,
    successfulResponses,
    errorRate,
    recentErrors,
    processingTimeStats: processingTimeStats[0] || {
      averageTime: 0,
      maxTime: 0,
      minTime: 0
    }
  });
});

module.exports = {
  // Rule endpoints
  createRule,
  getRules,
  getRuleById,
  updateRule,
  deleteRule,
  
  // Monitor endpoints
  createMonitor,
  getMonitors,
  getMonitorById,
  updateMonitor,
  deleteMonitor,
  updateMonitorStatus,
  getMonitorResponses,
  triggerMonitorCheck,
  
  // Response history
  getResponseHistory,
  
  // Facebook API endpoints
  getFacebookPosts,
  getFacebookPages,
  
  // Statistics
  getStats,
  
  // Admin endpoints
  getSystemHealth
};