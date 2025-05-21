const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const InstantMessage = require('../../models/InstantMessage');
const User = require('../../models/User');
const UserAction = require('../../models/UserAction');
const Transaction = require('../../models/Transaction');
const { 
  sendFacebookDirectMessage, 
  sendFacebookMediaMessage, 
  personalizeMessageText, 
  calculateDelay,
  analyzeRecipientBatch,
  extractUniqueSenders,
  verifyDelayEffectiveness,
  validateFacebookRecipientId,
  adaptDelayBasedOnResponse,
  getOptimalBatchSize
} = require('../../utils/facebookMessageUtils');

// Configure logging level (error, warn, info, debug)
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

/**
 * Structured, leveled logging utility to keep logs professional and controlled
 */
const logger = {
  error: (message, data = null) => {
    if (LOG_LEVELS[LOG_LEVEL] >= LOG_LEVELS.error) {
      console.error(`[ERROR] ${message}`, data ? data : '');
    }
  },
  warn: (message, data = null) => {
    if (LOG_LEVELS[LOG_LEVEL] >= LOG_LEVELS.warn) {
      console.warn(`[WARN] ${message}`, data ? data : '');
    }
  },
  info: (message, data = null) => {
    if (LOG_LEVELS[LOG_LEVEL] >= LOG_LEVELS.info) {
      console.log(`[INFO] ${message}`, data ? data : '');
    }
  },
  debug: (message, data = null) => {
    if (LOG_LEVELS[LOG_LEVEL] >= LOG_LEVELS.debug) {
      console.log(`[DEBUG] ${message}`, data ? data : '');
    }
  },
  transaction: (messageId, userId, points, operation) => {
    if (LOG_LEVELS[LOG_LEVEL] >= LOG_LEVELS.info) {
      console.log(`[TRANSACTION] Message=${messageId.substring(0, 8)}... User=${userId.substring(0, 8)}... Points=${points} Operation=${operation}`);
    }
  }
};

/**
 * @route   GET api/instant-messages
 * @desc    Get all instant messages for the current user
 * @access  Private
 */
/**
 * @route   GET api/instant-messages/analytics
 * @desc    Get analytics for instant messages
 * @access  Private
 */
router.get('/analytics', protect, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    // Calculate date range based on period
    const endDate = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '1d':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }
    
    // Query messages in the date range
    const messages = await InstantMessage.find({
      user: req.user.id,
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    // Calculate analytics
    const analytics = {
      totalMessages: messages.length,
      successfulMessages: 0,
      failedMessages: 0,
      totalRecipients: 0,
      successfulRecipients: 0,
      failedRecipients: 0,
      averageDelay: 0,
      pointsSpent: 0,
      pointsRefunded: 0,
      delayModes: {},
      messageTypes: {},
      errorTypes: {}
    };
    
    // Calculate totals
    messages.forEach(message => {
      analytics.totalRecipients += message.recipientCount || message.recipients.length;
      analytics.successfulRecipients += message.sent || 0;
      analytics.failedRecipients += message.failed || 0;
      analytics.pointsSpent += message.deductedPoints || 0;
      analytics.pointsRefunded += message.pointsRefunded || 0;
      
      // Count message status
      if (message.status === 'completed') {
        analytics.successfulMessages++;
      } else if (message.status === 'failed') {
        analytics.failedMessages++;
      }
      
      // Track delay modes
      const delayMode = message.delayMode || 'fixed';
      if (!analytics.delayModes[delayMode]) {
        analytics.delayModes[delayMode] = 0;
      }
      analytics.delayModes[delayMode]++;
      
      // Track message types
      const messageType = message.messageType || 'text';
      if (!analytics.messageTypes[messageType]) {
        analytics.messageTypes[messageType] = 0;
      }
      analytics.messageTypes[messageType]++;
      
      // Track error types
      if (message.results) {
        message.results.forEach(result => {
          if (!result.success && result.error) {
            const errorType = result.error.substring(0, 50); // Truncate long error messages
            if (!analytics.errorTypes[errorType]) {
              analytics.errorTypes[errorType] = 0;
            }
            analytics.errorTypes[errorType]++;
          }
        });
      }
      
      // Calculate average delay
      if (message.delayStats && message.delayStats.averageDelay) {
        analytics.averageDelay += message.delayStats.averageDelay;
      }
    });
    
    // Calculate overall average delay
    if (messages.length > 0) {
      analytics.averageDelay = Math.round(analytics.averageDelay / messages.length);
    }
    
    // Calculate success rates
    analytics.messageSuccessRate = analytics.totalMessages > 0 
      ? Math.round((analytics.successfulMessages / analytics.totalMessages) * 100) 
      : 0;
    
    analytics.recipientSuccessRate = analytics.totalRecipients > 0 
      ? Math.round((analytics.successfulRecipients / analytics.totalRecipients) * 100) 
      : 0;
    
    res.json({
      period,
      dateRange: {
        from: startDate,
        to: endDate
      },
      analytics
    });
  } catch (err) {
    logger.error('Error generating message analytics:', err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   GET api/instant-messages
 * @desc    Get all instant messages for the current user
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const { status, limit = 50, page = 1, sort = 'createdAt', order = 'desc' } = req.query;
    
    const filter = { user: req.user.id };
    
    // Filter by status if provided
    if (status && ['pending', 'processing', 'completed', 'failed', 'canceled'].includes(status)) {
      filter.status = status;
    } else if (!status) {
      filter.status = { $in: ['pending', 'processing', 'completed', 'failed', 'canceled'] };
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Determine sort order
    const sortOptions = {};
    sortOptions[sort] = order === 'asc' ? 1 : -1;
    
    const instantMessages = await InstantMessage.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const total = await InstantMessage.countDocuments(filter);
    
    res.json({
      messages: instantMessages,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    logger.error('Error fetching instant messages:', err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   GET api/instant-messages/:id
 * @desc    Get a specific instant message with detailed analytics
 * @access  Private
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const message = await InstantMessage.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });
    
    if (!message) {
      return res.status(404).json({ msg: 'Message not found' });
    }
    
    // Calculate delivery statistics
    const stats = {
      sent: message.sent || 0,
      failed: message.failed || 0,
      total: message.recipientCount || message.recipients.length,
      successRate: message.sent ? (message.sent / message.recipientCount * 100).toFixed(1) : 0,
      processingTime: message.processingCompletedAt && message.processingStartedAt 
        ? Math.round((message.processingCompletedAt - message.processingStartedAt) / 1000)
        : null,
      pointsRefunded: message.pointsRefunded || 0,
      current: message.current || 0
    };
    
    // Add detailed delay analysis if available
    if (message.delayMetrics && message.delayMetrics.length > 0) {
      stats.delayAnalysis = {
        averageDelay: (message.delayStats?.averageDelay / 1000).toFixed(2) || 0,
        minDelay: (message.delayStats?.minDelay / 1000).toFixed(2) || 0,
        maxDelay: (message.delayStats?.maxDelay / 1000).toFixed(2) || 0,
        isEffective: message.delayStats?.isEffective || false,
        recommendation: message.delayStats?.recommendation || ''
      };
    }
    
    // Add error analysis if there were failures
    if (message.failed > 0 && message.results) {
      const errorTypes = {};
      let mostCommonError = { error: "Unknown", count: 0 };
      
      message.results.forEach(result => {
        if (!result.success && result.error) {
          if (!errorTypes[result.error]) {
            errorTypes[result.error] = 0;
          }
          errorTypes[result.error]++;
          
          if (errorTypes[result.error] > mostCommonError.count) {
            mostCommonError = { error: result.error, count: errorTypes[result.error] };
          }
        }
      });
      
      stats.errorAnalysis = {
        types: Object.keys(errorTypes).length,
        mostCommon: mostCommonError.error,
        errorCounts: errorTypes
      };
    }
    
    res.json({
      message,
      stats
    });
  } catch (err) {
    logger.error('Error fetching message:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Message not found' });
    }
    res.status(500).send('Server Error');
  }
});

/**
 * @route   POST api/instant-messages
 * @desc    Create a new instant message with advanced options (background processing)
 * @access  Private
 */
router.post('/', protect, async (req, res) => {
  try {
    const { 
      recipients,
      messageType,
      messageText,
      imageUrl,
      videoUrl,
      pageId,
      pageName,
      accessToken,
      // Buttons for interactive messages (support both legacy and new format)
      buttons,
      quickReplyButtons,
      // Enhanced delay options
      enableDelay,
      delayMode,
      delaySeconds,
      minDelaySeconds,
      maxDelaySeconds,
      incrementalDelayStart,
      incrementalDelayStep,
      incrementalAcceleration,
      adaptiveBaseDelay,
      adaptiveMaxDelay,
      // Personalization options
      personalizeMessage,
      messagePersonalization,
      // Batch processing options
      batchSize,
      adaptiveBatching
    } = req.body;

    // Validate required fields
    if (!messageType || !recipients || !Array.isArray(recipients) || recipients.length === 0 || !pageId || !pageName || !accessToken) {
      return res.status(400).json({ msg: 'Please include all required fields' });
    }
    
    if (messageType === 'text' && (!messageText || messageText.trim() === '')) {
      return res.status(400).json({ msg: 'Please provide message text for text messages' });
    }
    
    if (messageType === 'image' && (!imageUrl || imageUrl.trim() === '')) {
      return res.status(400).json({ msg: 'Please provide an image URL for image messages' });
    }
    
    if (messageType === 'video' && (!videoUrl || videoUrl.trim() === '')) {
      return res.status(400).json({ msg: 'Please provide a video URL for video messages' });
    }
    
    // Analyze recipient IDs for validity - IMPROVED to handle both object and string formats
    const validatedRecipients = [];
    const invalidRecipients = [];
    
    for (const recipient of recipients) {
      // Check if recipient is an object with ID or just a string ID
      const recipientId = typeof recipient === 'object' && recipient !== null ? recipient.id : recipient;
      const recipientName = typeof recipient === 'object' && recipient !== null && recipient.name ? recipient.name : '';
      
      if (!recipientId || !validateFacebookRecipientId(recipientId)) {
        invalidRecipients.push(recipient);
      } else {
        // Add as standardized object with ID
        validatedRecipients.push({
          id: recipientId,
          name: recipientName
        });
      }
    }
    
    if (invalidRecipients.length > 0) {
      return res.status(400).json({
        msg: `${invalidRecipients.length} recipient IDs are invalid`,
        invalidRecipients,
        totalInvalid: invalidRecipients.length
      });
    }
    
    // Validate delay mode parameters
    if (enableDelay) {
      if (delayMode === 'random' && minDelaySeconds >= maxDelaySeconds) {
        return res.status(400).json({ msg: 'Minimum delay must be less than maximum delay' });
      }
      
      if (delayMode === 'adaptive' && adaptiveBaseDelay >= adaptiveMaxDelay) {
        return res.status(400).json({ msg: 'Adaptive base delay must be less than adaptive maximum delay' });
      }
      
      // Set minimum safe values for delays to prevent rate limiting
      if (delayMode === 'fixed' && delaySeconds < 2) {
        return res.status(400).json({ msg: 'Fixed delay must be at least 2 seconds to avoid rate limiting' });
      }
      
      if (delayMode === 'random' && minDelaySeconds < 2) {
        return res.status(400).json({ msg: 'Minimum delay must be at least 2 seconds to avoid rate limiting' });
      }
      
      if (delayMode === 'incremental' && incrementalDelayStart < 2) {
        return res.status(400).json({ msg: 'Starting delay must be at least 2 seconds to avoid rate limiting' });
      }
      
      if (delayMode === 'adaptive' && adaptiveBaseDelay < 2) {
        return res.status(400).json({ msg: 'Adaptive base delay must be at least 2 seconds to avoid rate limiting' });
      }
    }
    
    // Check batch size limits
    const effectiveBatchSize = batchSize || 50;
    if (effectiveBatchSize < 5 || effectiveBatchSize > 200) {
      return res.status(400).json({ msg: 'Batch size must be between 5 and 200' });
    }
    
    // Check if user has enough points (1 point per recipient)
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    const requiredPoints = validatedRecipients.length;
    if (user.points < requiredPoints) {
      return res.status(400).json({ 
        msg: 'لا يوجد لديك نقاط كافية لإرسال رسائل لكل هؤلاء المستلمين', 
        currentPoints: user.points, 
        requiredPoints: requiredPoints 
      });
    }
    
    // Deduct points upfront (1 point per recipient)
    user.points -= requiredPoints;
    
    // Calculate estimated completion time
    let estimatedCompletionTime = new Date();
    
    if (enableDelay && validatedRecipients.length > 1) {
      let totalDelaySeconds = 0;
      
      switch(delayMode) {
        case 'fixed':
          totalDelaySeconds = (validatedRecipients.length - 1) * (delaySeconds || 5);
          break;
        case 'random':
          const avgDelaySeconds = ((minDelaySeconds || 3) + (maxDelaySeconds || 10)) / 2;
          totalDelaySeconds = (validatedRecipients.length - 1) * avgDelaySeconds;
          break;
        case 'incremental':
          const start = incrementalDelayStart || 3;
          const step = incrementalDelayStep || 2;
          const acceleration = incrementalAcceleration || 1.0;
          
          // Calculate total delay with acceleration factor
          if (acceleration === 1.0) {
            // Linear growth
            totalDelaySeconds = (validatedRecipients.length - 1) * start + 
                                (step * (validatedRecipients.length - 1) * (validatedRecipients.length - 2)) / 2;
          } else if (acceleration > 1.0) {
            // Exponential growth
            let currentDelay = start;
            for (let i = 1; i < validatedRecipients.length; i++) {
              totalDelaySeconds += currentDelay;
              currentDelay += step * Math.pow(i, acceleration - 1);
            }
          } else {
            // Logarithmic growth (slower increase)
            let currentDelay = start;
            for (let i = 1; i < validatedRecipients.length; i++) {
              totalDelaySeconds += currentDelay;
              currentDelay += step * Math.pow(i, acceleration);
            }
          }
          break;
        case 'adaptive':
          // For estimation, use average of base and max
          const avgAdaptiveDelay = ((adaptiveBaseDelay || 3) + (adaptiveMaxDelay || 30)) / 2;
          totalDelaySeconds = (validatedRecipients.length - 1) * avgAdaptiveDelay;
          break;
        default:
          totalDelaySeconds = (validatedRecipients.length - 1) * 5; // Default 5 seconds
      }
      
      // Add batch processing time estimate (5% overhead)
      if (validatedRecipients.length > effectiveBatchSize) {
        const batchCount = Math.ceil(validatedRecipients.length / effectiveBatchSize);
        totalDelaySeconds *= 1.05; // 5% overhead for batch processing
        totalDelaySeconds += batchCount * 2; // 2 seconds per batch for processing overhead
      }
      
      // Add estimated total delay to completion time
      estimatedCompletionTime.setSeconds(estimatedCompletionTime.getSeconds() + totalDelaySeconds);
    }
    
    // Extract just the string IDs for the recipient array (model requires strings)
    const recipientIds = validatedRecipients.map(recipient => recipient.id);
    
    // Store recipient names in a separate array for later use in personalization
    const recipientNames = {};
    validatedRecipients.forEach(recipient => {
      recipientNames[recipient.id] = recipient.name || '';
    });

    // Process button data - Support both legacy buttons and new quickReplyButtons format
    // Convert all buttons to the new quickReplyButtons format with type field
    const processedButtons = [];
    
    // First check for the new quickReplyButtons format
    if (quickReplyButtons && Array.isArray(quickReplyButtons) && quickReplyButtons.length > 0) {
      processedButtons.push(...quickReplyButtons);
    } 
    // Then check for legacy buttons format and convert
    else if (buttons && Array.isArray(buttons) && buttons.length > 0) {
      buttons.forEach(button => {
        if (button.url) {
          // This looks like a URL button
          processedButtons.push({
            type: 'url',
            text: button.text,
            url: button.url
          });
        } else {
          // This is a regular text button
          processedButtons.push({
            type: 'text',
            text: button.text,
            payload: button.payload || button.text
          });
        }
      });
    }
    
    // Create new instant message with enhanced options
    const newMessage = new InstantMessage({
      user: req.user.id,
      recipients: recipientIds,
      recipientCount: validatedRecipients.length,
      messageType,
      messageText: messageType === 'text' || personalizeMessage ? messageText : '',
      imageUrl: messageType === 'image' ? imageUrl : '',
      videoUrl: messageType === 'video' ? videoUrl : '',
      pageId,
      pageName,
      accessToken,
      // Add processed buttons in the new format
      quickReplyButtons: processedButtons,
      // Enhanced delay options
      enableDelay: enableDelay !== undefined ? enableDelay : true, // Default to true for better reliability
      delayMode: delayMode || 'fixed',
      delaySeconds: delaySeconds || 5,
      minDelaySeconds: minDelaySeconds || 3,
      maxDelaySeconds: maxDelaySeconds || 10,
      incrementalDelayStart: incrementalDelayStart || 3,
      incrementalDelayStep: incrementalDelayStep || 2,
      incrementalAcceleration: incrementalAcceleration || 1.0,
      adaptiveBaseDelay: adaptiveBaseDelay || 3,
      adaptiveMaxDelay: adaptiveMaxDelay || 30,
      // Personalization options
      personalizeMessage: personalizeMessage || false,
      messagePersonalization: messagePersonalization || {
        includeUserName: true,
        includeLastInteraction: false,
        customVariables: []
      },
      // Batch processing options
      batchSize: effectiveBatchSize,
      adaptiveBatching: adaptiveBatching !== undefined ? adaptiveBatching : true,
      // Status tracking
      status: 'pending',
      deductedPoints: requiredPoints,
      estimatedCompletionTime,
      sent: 0,
      failed: 0,
      current: 0, // Initialize current position to 0
      pointsRefunded: 0, // Initialize refunded points to 0
      // Store recipient names for personalization
      recipientMetadata: recipientNames
    });
    
    // Save both the updated user and the new message
    await user.save();
    
    // Record the points transaction
    const transaction = new Transaction({
      userId: req.user.id,
      type: 'other', // Using 'other' instead of 'deduction' to match valid enum values
      amount: -requiredPoints, // Use negative amount to indicate deduction
      status: 'completed',
      description: `خصم ${requiredPoints} نقطة لإرسال رسائل إلى ${validatedRecipients.length} مستلم`
    });
    
    // Save the transaction and the message
    const [savedTransaction, savedMessage] = await Promise.all([
      transaction.save(),
      newMessage.save()
    ]);
    
    logger.transaction(savedMessage._id.toString(), req.user.id.toString(), requiredPoints, 'deduction');
    
    res.json({
      message: savedMessage,
      transactionId: savedTransaction._id,
      estimatedCompletionTime: estimatedCompletionTime
    });
    
    // Start background processing without blocking the response
    logger.info(`Creating background message task for ${savedMessage._id}`);
    setImmediate(() => processInstantMessage(savedMessage._id));
    
  } catch (err) {
    logger.error('Error creating instant message:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        msg: 'Validation error', 
        errors: Object.values(err.errors).map(e => e.message) 
      });
    }
    res.status(500).send('Server Error');
  }
});

/**
 * Helper function to process instant messages in the background with enhanced processing
 * @param {string} messageId - The ID of the message to process
 */
const processInstantMessage = async (messageId) => {
  // Track overall processing stats
  const processingStats = {
    retriesPerformed: 0,
    totalResponseTime: 0,
    successfulRequests: 0,
    failedRequests: 0
  };
  
  // Track recipients tried with errors to avoid excessive retries
  const recipientErrorCache = new Map();
  
  // Track stats for progress updates
  let sent = 0;
  let failed = 0;
  let current = 0;
  let lastDbUpdateTime = Date.now();
  let pendingDbUpdates = false;
  let pointsRefunded = 0; // Track points refunded during processing
  const updateInterval = 500; // 500ms between database updates (reduced for more frequent updates)
  const results = [];
  const delayMetrics = [];
  
  try {
    // Find the message
    const message = await InstantMessage.findById(messageId);
    
    if (!message || message.status !== 'pending') {
      logger.info(`Message ${messageId} already processed or not found`);
      return;
    }
    
    // Update status to processing
    message.status = 'processing';
    message.processingStartedAt = new Date();
    message.processingAttempts = 1;
    message.current = 0; // Initialize current position to 0
    await message.save();
    
    // Get the recipient names from metadata if available
    const recipientMetadata = message.recipientMetadata || {};
    
    // Determine batch size based on total recipients and settings
    let currentBatchSize = message.batchSize || 50;
    if (message.adaptiveBatching) {
      currentBatchSize = getOptimalBatchSize(message.recipients.length, currentBatchSize);
    }
    
    logger.info(`Processing message ${messageId} with ${message.recipients.length} recipients using batch size ${currentBatchSize}`);
    
    // Process in batches if recipient count is large
    const batches = [];
    for (let i = 0; i < message.recipients.length; i += currentBatchSize) {
      batches.push(message.recipients.slice(i, i + currentBatchSize));
    }
    
    // Track previous response times for adaptive delay
    let previousResponseTimes = [];
    
    // Function to update the database with current progress
    const updateDatabase = async (force = false) => {
      const now = Date.now();
      
      // Only update if forced or if enough time has passed since last update
      if (force || (now - lastDbUpdateTime >= updateInterval)) {
        try {
          await InstantMessage.updateOne(
            { _id: messageId },
            { 
              $set: { 
                sent,
                failed,
                current,
                pointsRefunded, // Update refunded points in database
                results: results // Store results incrementally
              },
              $push: { 
                delayMetrics: { $each: delayMetrics.splice(0) } // Add and clear delay metrics
              }
            }
          );
          
          lastDbUpdateTime = now;
          pendingDbUpdates = false;
        } catch (error) {
          logger.error(`Error updating message ${messageId} progress:`, error);
          pendingDbUpdates = true;
        }
      } else {
        pendingDbUpdates = true;
      }
    };
    
    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      if (batchIndex === 0 || batchIndex === batches.length - 1 || batchIndex % 3 === 0) {
        logger.debug(`Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} recipients`);
      }
      
      // Send messages to each recipient in this batch
      for (const recipientId of batch) {
        // Check for cancellation before processing each recipient
        const freshMessage = await InstantMessage.findById(messageId);
        if (!freshMessage || freshMessage.status === 'canceled') {
          // Apply any pending updates before exiting
          if (pendingDbUpdates) {
            await updateDatabase(true);
          }
          
          logger.info(`Message ${messageId} was canceled, stopping processing at recipient ${current + 1}/${message.recipients.length}`);
          
          // Calculate pending recipients for proper refund
          const totalRecipients = message.recipients.length;
          const processed = current;
          const pending = totalRecipients - processed;
          
          logger.transaction(
            messageId.toString(), 
            message.user.toString(), 
            pending, 
            'refund-cancel'
          );
          
          return;
        }
        
        // Skip recipients that have consistently failed with the same error
        if (recipientErrorCache.has(recipientId)) {
          const errorData = recipientErrorCache.get(recipientId);
          if (errorData.retries >= 3) {
            current++;
            failed++;
            
            // Add failed result without further attempts
            results.push({
              recipient: {
                id: recipientId,
                name: recipientMetadata[recipientId] || ''
              },
              success: false,
              error: errorData.error,
              errorCode: errorData.errorCode,
              retries: errorData.retries,
              responseTimeMs: 0,
              sentAt: new Date()
            });
            
            // Increment points refunded by 1 (1 point per failed message)
            pointsRefunded++;
            
            pendingDbUpdates = true;
            continue;
          }
        }
        
        // Update current recipient counter
        current++;
        
        // Calculate delay for this recipient
        let delay = 0;
        const messageIndex = current - 1;
        
        if (message.enableDelay && current > 1) {
          if (message.delayMode === 'adaptive' && previousResponseTimes.length > 0) {
            // Use previous response times to adapt the delay
            delay = adaptDelayBasedOnResponse(
              previousResponseTimes,
              message.adaptiveBaseDelay * 1000,
              message.adaptiveMaxDelay * 1000
            );
          } else {
            // Use standard delay calculation
            delay = calculateDelay(message, messageIndex);
          }
        }
        
        // Apply delay if needed
        let actualDelay = 0;
        if (delay > 0) {
          const delayStart = Date.now();
          await new Promise(resolve => setTimeout(resolve, delay));
          actualDelay = Date.now() - delayStart;
          
          // Record delay metrics
          delayMetrics.push({
            messageIndex,
            recipientId: recipientId,
            targetMs: delay,
            actualMs: actualDelay,
            timestamp: new Date()
          });
        }
        
        // Track retry count for this recipient
        let retryCount = 0;
        let success = false;
        let result = null;
        let responseTimeMs = 0;
        
        // Try sending with retries for each recipient
        while (retryCount < 3 && !success) {
          try {
            // Check for cancellation before each retry attempt
            const cancelCheck = await InstantMessage.findById(messageId);
            if (!cancelCheck || cancelCheck.status === 'canceled') {
              // Apply any pending updates before exiting
              if (pendingDbUpdates) {
                await updateDatabase(true);
              }
              
              logger.info(`Message ${messageId} was canceled during retry attempt, stopping immediately`);
              return;
            }
            
            const startTime = Date.now();
            
            // Create a proper recipient object for personalization
            const recipientObject = {
              id: recipientId,
              name: recipientMetadata[recipientId] || '' // Use stored name or empty string
            };
            
            // Personalize message if enabled
            let finalMessageText = message.messageText;
            if (message.personalizeMessage) {
              finalMessageText = personalizeMessageText(message, recipientObject);
            }
            
            // Send message based on type
            if (message.messageType === 'text') {
              // Prepare options with buttons if available
              const options = {};
              
              // Add buttons if available and transform to the format expected by Facebook API
              if (message.quickReplyButtons && message.quickReplyButtons.length > 0) {
                // Map buttons based on their type - support both URL and text buttons
                options.quickReplyButtons = message.quickReplyButtons.map(button => {
                  if (button.type === 'url') {
                    return {
                      type: 'url',
                      text: button.text,
                      url: button.url
                    };
                  } else {
                    // Default to text type
                    return {
                      type: 'text',
                      text: button.text,
                      payload: button.payload || button.text
                    };
                  }
                });
              } 
              // Legacy format fallback
              else if (message.buttons && message.buttons.length > 0) {
                options.quickReplyButtons = message.buttons.map(button => ({
                  type: 'text',
                  text: button.text,
                  payload: button.payload || button.text
                }));
              }
              
              result = await sendFacebookDirectMessage(
                recipientId,
                finalMessageText,
                message.accessToken,
                message.pageId,
                options
              );
            } else if (message.messageType === 'image') {
              result = await sendFacebookMediaMessage(
                recipientId,
                finalMessageText, // Optional text to accompany image
                message.imageUrl,
                message.accessToken,
                message.pageId,
                'image'
              );
            } else if (message.messageType === 'video') {
              result = await sendFacebookMediaMessage(
                recipientId,
                finalMessageText, // Optional text to accompany video
                message.videoUrl,
                message.accessToken,
                message.pageId,
                'video'
              );
            }
            
            responseTimeMs = Date.now() - startTime;
            
            // Store response time for adaptive delay
            previousResponseTimes.push(responseTimeMs);
            // Keep only the last 10 response times
            if (previousResponseTimes.length > 10) {
              previousResponseTimes.shift();
            }
            
            // Update processing stats
            processingStats.totalResponseTime += responseTimeMs;
            
            // If successful, break retry loop
            if (result.success) {
              success = true;
              processingStats.successfulRequests++;
            } else {
              // If not successful, increment retry count and try again
              retryCount++;
              processingStats.failedRequests++;
              processingStats.retriesPerformed++;
              
              // Log error only on first retry attempt to reduce log volume
              if (retryCount === 1) {
                logger.error(`Error sending message to ${recipientId}: ${result.error}`);
                
                // Cache the error for this recipient
                recipientErrorCache.set(recipientId, { 
                  error: result.error, 
                  errorCode: result.errorCode,
                  retries: retryCount
                });
              } else {
                // Update retry count in cache
                if (recipientErrorCache.has(recipientId)) {
                  const errorData = recipientErrorCache.get(recipientId);
                  errorData.retries = retryCount;
                  recipientErrorCache.set(recipientId, errorData);
                }
              }
              
              // Wait before retry (exponential backoff)
              const retryDelay = Math.min(2000 * Math.pow(2, retryCount - 1), 8000);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
          } catch (err) {
            // Only log first retry to reduce console spam
            if (retryCount === 0) {
              logger.error(`Error sending message to ${recipientId}: ${err.message}`);
            }
            
            // Record error result
            result = {
              success: false,
              error: err.message || 'Unknown error',
              errorCode: err.code || 500
            };
            
            // Cache the error for this recipient
            recipientErrorCache.set(recipientId, { 
              error: err.message, 
              errorCode: err.code || 500,
              retries: retryCount + 1
            });
            
            retryCount++;
            processingStats.failedRequests++;
            processingStats.retriesPerformed++;
            
            // Wait before retry (exponential backoff)
            const retryDelay = Math.min(2000 * Math.pow(2, retryCount - 1), 8000);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
        
        // Add final result to results array
        const finalResult = {
          recipient: {
            id: recipientId,
            name: recipientMetadata[recipientId] || ''
          },
          success: success,
          messageId: result?.messageId || null,
          error: result?.error || null,
          errorCode: result?.errorCode || null,
          retries: retryCount,
          responseTimeMs: responseTimeMs,
          sentAt: new Date()
        };
        
        results.push(finalResult);
        
        // Update counters
        if (success) {
          sent++;
        } else {
          failed++;
          // Increment points refunded by 1 (1 point per failed message)
          pointsRefunded++;
        }
        
        // Update database frequently to ensure accurate tracking
        await updateDatabase();
        
        // Check for cancellation after processing
        const postProcessCancelCheck = await InstantMessage.findById(messageId);
        if (!postProcessCancelCheck || postProcessCancelCheck.status === 'canceled') {
          // Apply any pending updates before exiting
          if (pendingDbUpdates) {
            await updateDatabase(true);
          }
          
          logger.info(`Message ${messageId} was canceled after processing recipient ${current}/${message.recipients.length}`);
          return;
        }
      }
      
      // Brief pause between batches to avoid rate limiting
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Update database after each batch
      await updateDatabase(true);
    }
    
    // Ensure any pending updates are applied
    if (pendingDbUpdates) {
      await updateDatabase(true);
    }
    
    // Final message update
    const finalMessage = await InstantMessage.findById(messageId);
    
    if (finalMessage) {
      // Skip updates if message was canceled
      if (finalMessage.status === 'canceled') {
        return;
      }
      
      // Set final status
      finalMessage.status = sent > 0 ? (failed > 0 ? 'completed' : 'completed') : 'failed';
      finalMessage.processingCompletedAt = new Date();
      finalMessage.sent = sent;
      finalMessage.failed = failed;
      finalMessage.results = results;
      finalMessage.pointsRefunded = pointsRefunded; // Store refunded points
      finalMessage.current = current; // Store final position
      
      // Store any remaining delay metrics not yet stored
      if (delayMetrics.length > 0) {
        finalMessage.delayMetrics.push(...delayMetrics);
      }
      
      // Calculate delay statistics if metrics exist
      if (finalMessage.delayMetrics && finalMessage.delayMetrics.length > 0) {
        // Use the addDelayMetric method to calculate statistics
        await finalMessage.addDelayMetric(
          0, // Dummy message index for analysis
          'summary',
          0,
          0
        );
      }
      
      // Store processing statistics
      finalMessage.processingStats = {
        avgResponseTimeMs: processingStats.successfulRequests > 0 
          ? Math.round(processingStats.totalResponseTime / processingStats.successfulRequests) 
          : 0,
        retriesPerformed: processingStats.retriesPerformed,
        successfulRequests: processingStats.successfulRequests,
        failedRequests: processingStats.failedRequests
      };
      
      await finalMessage.save();
      
      // Handle refunds for failed messages
      if (failed > 0) {
        try {
          const user = await User.findById(finalMessage.user);
          if (user) {
            // Refund points for failed messages
            const pointsToRefund = pointsRefunded;
            
            user.points += pointsToRefund;
            
            // Record the refund transaction
            const transaction = new Transaction({
              userId: user._id,
              type: 'refund',
              amount: pointsToRefund,
              status: 'completed',
              description: `استرداد ${pointsToRefund} نقطة للرسائل الفاشلة من أصل ${finalMessage.recipients.length} رسالة`
            });
            
            await Promise.all([
              user.save(),
              transaction.save()
            ]);
            
            logger.transaction(
              finalMessage._id.toString(), 
              user._id.toString(), 
              pointsToRefund, 
              'refund-failed'
            );
          }
        } catch (refundError) {
          logger.error('Error refunding points for failed messages:', refundError);
          // Non-blocking - continue even if refund fails
        }
      }
      
      // Record activity for achievements system
      if (sent > 0) {
        try {
          await UserAction.create({
            userId: finalMessage.user,
            actionType: 'message',
            details: {
              messageType: finalMessage.messageType,
              recipientCount: finalMessage.recipients.length,
              successCount: sent,
              instantMessageId: finalMessage._id,
              delayMode: finalMessage.delayMode,
              personalizeMessage: finalMessage.personalizeMessage
            },
            module: 'pagemanagement',
            count: sent // Count each successful message
          });
          logger.debug(`Created message activity record for user ${finalMessage.user} with ${sent} successful messages`);
        } catch (actionError) {
          logger.error('Error recording message activity for achievements:', actionError);
          // Non-blocking - don't fail the process if activity recording fails
        }
      }
    }
  } catch (err) {
    logger.error(`Error processing instant message ${messageId}:`, err);
    
    // Mark message as failed if there was an error
    try {
      const message = await InstantMessage.findById(messageId);
      if (message && message.status !== 'canceled') {
        message.status = 'failed';
        message.error = err.message || 'Unknown error during processing';
        message.processingCompletedAt = new Date();
        message.sent = sent;
        message.failed = failed;
        message.current = current; // Store current position for refund calculation
        await message.save();
        
        // Refund all points since the entire process failed
        try {
          const user = await User.findById(message.user);
          if (user && message.deductedPoints) {
            // Calculate points to refund based on processed messages
            const processedCount = sent + failed;
            const totalRecipients = message.recipients.length;
            const pendingRecipients = totalRecipients - processedCount;
            const pointsToRefund = pendingRecipients + failed; // Refund for both failed and unprocessed
            
            user.points += pointsToRefund;
            
            // Record the refund transaction
            const transaction = new Transaction({
              userId: user._id,
              type: 'refund',
              amount: pointsToRefund,
              status: 'completed',
              description: `استرداد ${pointsToRefund} نقطة بسبب فشل إرسال الرسائل`
            });
            
            await Promise.all([
              user.save(),
              transaction.save()
            ]);
            
            // Update message with refund info
            message.pointsRefunded = pointsToRefund;
            await message.save();
            
            logger.transaction(
              message._id.toString(), 
              user._id.toString(), 
              pointsToRefund, 
              'refund-error'
            );
          }
        } catch (refundError) {
          logger.error('Error refunding points:', refundError);
        }
      }
    } catch (updateError) {
      logger.error(`Error updating message ${messageId} status to failed:`, updateError);
    }
  }
};

/**
 * @route   GET api/instant-messages/status/:id
 * @desc    Get the current status of an instant message with detailed metrics
 * @access  Private
 */
router.get('/status/:id', protect, async (req, res) => {
  try {
    const message = await InstantMessage.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });
    
    if (!message) {
      return res.status(404).json({ msg: 'Message not found' });
    }
    
    // Calculate completion percentage
    const total = message.recipientCount || message.recipients.length;
    const processed = (message.sent || 0) + (message.failed || 0);
    const percentComplete = total > 0 ? Math.round((processed / total) * 100) : 0;
    
    // Calculate time remaining if processing
    let timeRemaining = null;
    if (message.status === 'processing' && message.processingStartedAt && processed > 0) {
      const elapsedMs = Date.now() - new Date(message.processingStartedAt).getTime();
      const msPerMessage = elapsedMs / processed;
      const remainingMessages = total - processed;
      timeRemaining = Math.round(msPerMessage * remainingMessages / 1000);
    }
    
    const response = {
      id: message._id,
      status: message.status,
      sent: message.sent || 0,
      failed: message.failed || 0,
      total: total,
      current: message.current || 0,
      progress: percentComplete,
      processingStartedAt: message.processingStartedAt,
      processingCompletedAt: message.processingCompletedAt,
      estimatedCompletionTime: message.estimatedCompletionTime,
      timeRemainingSec: timeRemaining,
      pointsRefunded: message.pointsRefunded || 0,
      error: message.error,
      processingAttempts: message.processingAttempts || 1
    };
    
    // Add delay analysis if available
    if (message.delayMetrics && message.delayMetrics.length > 0) {
      response.delayStats = {
        averageDelay: (message.delayStats?.averageDelay / 1000).toFixed(2) || 0,
        minDelay: (message.delayStats?.minDelay / 1000).toFixed(2) || 0,
        maxDelay: (message.delayStats?.maxDelay / 1000).toFixed(2) || 0,
        isEffective: message.delayStats?.isEffective || false,
        recommendation: message.delayStats?.recommendation || ''
      };
    }
    
    // Add processing stats if available
    if (message.processingStats) {
      response.processingStats = message.processingStats;
    }
    
    res.json(response);
  } catch (err) {
    logger.error('Error fetching message status:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Message not found' });
    }
    res.status(500).send('Server Error');
  }
});

/**
 * @route   PUT api/instant-messages/:id/cancel
 * @desc    Cancel an in-progress instant message
 * @access  Private
 */
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const message = await InstantMessage.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });
    
    if (!message) {
      return res.status(404).json({ msg: 'Message not found' });
    }
    
    // Only allow cancellation of pending or processing messages
    if (!['pending', 'processing'].includes(message.status)) {
      return res.status(400).json({ 
        msg: `Cannot cancel message with status: ${message.status}` 
      });
    }
    
    // Mark message as canceled (this will stop processing immediately)
    message.status = 'canceled';
    message.processingCompletedAt = new Date();
    
    // Save the cancellation state first to ensure processing stops ASAP
    await message.save();
    
    // Wait a moment to ensure the cancelation is processed
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Now get the most up-to-date state after processing has stopped
    const freshMessage = await InstantMessage.findById(message._id);
    
    // Calculate points to refund based on actual processed messages
    const processedCount = (freshMessage.sent || 0) + (freshMessage.failed || 0);
    const totalRecipients = freshMessage.recipients.length;
    
    // Use the current position for accurate refund calculation
    const currentPosition = freshMessage.current || processedCount;
    const pendingRecipients = totalRecipients - currentPosition;
    
    // Get current refunded points (for failed messages)
    const alreadyRefunded = freshMessage.pointsRefunded || 0;
    
    // Only refund points for messages that haven't been processed yet
    // The failed ones have already been refunded during processing
    const pointsToRefund = pendingRecipients;
    
    logger.info(`Canceling message ${freshMessage._id}: Total=${totalRecipients}, Current Position=${currentPosition}, Pending=${pendingRecipients}, Already Refunded=${alreadyRefunded}`);
    
    // Only refund points for messages that haven't been processed yet
    if (pointsToRefund > 0) {
      const user = await User.findById(freshMessage.user);
      if (user) {
        // Refund points for pending/unprocessed messages
        user.points += pointsToRefund;
        
        // Record the refund transaction
        const transaction = new Transaction({
          userId: user._id,
          type: 'refund',
          amount: pointsToRefund,
          status: 'completed',
          description: `استرجاع ${pointsToRefund} نقطة بسبب إلغاء إرسال ${pendingRecipients} رسالة`
        });
        
        // Save user and transaction
        await Promise.all([
          user.save(),
          transaction.save()
        ]);
        
        // Update total refunded points (add newly refunded to already refunded)
        const totalRefunded = alreadyRefunded + pointsToRefund;
        freshMessage.pointsRefunded = totalRefunded;
        await freshMessage.save();
        
        logger.transaction(
          freshMessage._id.toString(), 
          user._id.toString(), 
          pointsToRefund, 
          'refund-cancel'
        );
      }
    }
    
    res.json({ 
      msg: 'Message canceled successfully',
      refundedPoints: pointsToRefund,
      totalRefunded: alreadyRefunded + pointsToRefund,
      processedMessages: processedCount,
      pendingMessages: pendingRecipients
    });
  } catch (err) {
    logger.error('Error canceling message:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Message not found' });
    }
    res.status(500).send('Server Error');
  }
});

/**
 * @route   GET api/instant-messages/extract-senders/:pageId
 * @desc    Extract unique senders who have messaged the page with advanced filtering
 * @access  Private
 */
router.get('/extract-senders/:pageId', protect, async (req, res) => {
  try {
    const { pageId } = req.params;
    const { 
      accessToken, 
      limit = 100, 
      dateFrom, 
      dateTo,
      includeLastInteraction = true
    } = req.query;
    
    if (!pageId || !accessToken) {
      return res.status(400).json({ msg: 'Page ID and access token are required' });
    }
    
    // For demonstration, we'll extract senders from existing message history
    // In production, this would make API calls to Facebook to get conversation data
    const messageQuery = {
      user: req.user.id,
      pageId: pageId
    };
    
    // Add date filters if provided
    if (dateFrom || dateTo) {
      messageQuery.createdAt = {};
      if (dateFrom) {
        messageQuery.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        messageQuery.createdAt.$lte = new Date(dateTo);
      }
    }
    
    const messages = await InstantMessage.find(messageQuery)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    // Collect all results for sender extraction
    const allResults = [];
    
    messages.forEach(message => {
      if (message.results && Array.isArray(message.results)) {
        message.results.forEach(result => {
          if (result.recipient) {
            // Format as a message object for extraction
            allResults.push({
              sender: {
                id: result.recipient.id,
                name: result.recipient.name
              },
              created_time: result.sentAt || message.createdAt,
              success: result.success,
              messageId: result.messageId,
              conversationId: result.messageId || `conv_${result.recipient.id}`
            });
          }
        });
      }
    });
    
    // Extract unique senders with advanced metadata
    const uniqueSenders = extractUniqueSenders(allResults, includeLastInteraction);
    
    // Sort by most recent interaction (if available)
    if (includeLastInteraction) {
      uniqueSenders.sort((a, b) => {
        if (!a.lastInteraction) return 1;
        if (!b.lastInteraction) return -1;
        return new Date(b.lastInteraction) - new Date(a.lastInteraction);
      });
    }
    
    res.json({
      pageId,
      totalSenders: uniqueSenders.length,
      senders: uniqueSenders,
      metadata: {
        dateFrom: dateFrom || 'all time',
        dateTo: dateTo || 'present',
        limit: parseInt(limit),
        messagesAnalyzed: messages.length
      }
    });
  } catch (err) {
    logger.error('Error extracting senders:', err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   GET api/instant-messages/analytics
 * @desc    Get analytics for instant messages
 * @access  Private
 */
router.get('/analytics', protect, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    // Calculate date range based on period
    const endDate = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '1d':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }
    
    // Query messages in the date range
    const messages = await InstantMessage.find({
      user: req.user.id,
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    // Calculate analytics
    const analytics = {
      totalMessages: messages.length,
      successfulMessages: 0,
      failedMessages: 0,
      totalRecipients: 0,
      successfulRecipients: 0,
      failedRecipients: 0,
      averageDelay: 0,
      pointsSpent: 0,
      pointsRefunded: 0,
      delayModes: {},
      messageTypes: {},
      errorTypes: {}
    };
    
    // Calculate totals
    messages.forEach(message => {
      analytics.totalRecipients += message.recipientCount || message.recipients.length;
      analytics.successfulRecipients += message.sent || 0;
      analytics.failedRecipients += message.failed || 0;
      analytics.pointsSpent += message.deductedPoints || 0;
      analytics.pointsRefunded += message.pointsRefunded || 0;
      
      // Count message status
      if (message.status === 'completed') {
        analytics.successfulMessages++;
      } else if (message.status === 'failed') {
        analytics.failedMessages++;
      }
      
      // Track delay modes
      const delayMode = message.delayMode || 'fixed';
      if (!analytics.delayModes[delayMode]) {
        analytics.delayModes[delayMode] = 0;
      }
      analytics.delayModes[delayMode]++;
      
      // Track message types
      const messageType = message.messageType || 'text';
      if (!analytics.messageTypes[messageType]) {
        analytics.messageTypes[messageType] = 0;
      }
      analytics.messageTypes[messageType]++;
      
      // Track error types
      if (message.results) {
        message.results.forEach(result => {
          if (!result.success && result.error) {
            const errorType = result.error.substring(0, 50); // Truncate long error messages
            if (!analytics.errorTypes[errorType]) {
              analytics.errorTypes[errorType] = 0;
            }
            analytics.errorTypes[errorType]++;
          }
        });
      }
      
      // Calculate average delay
      if (message.delayStats && message.delayStats.averageDelay) {
        analytics.averageDelay += message.delayStats.averageDelay;
      }
    });
    
    // Calculate overall average delay
    if (messages.length > 0) {
      analytics.averageDelay = Math.round(analytics.averageDelay / messages.length);
    }
    
    // Calculate success rates
    analytics.messageSuccessRate = analytics.totalMessages > 0 
      ? Math.round((analytics.successfulMessages / analytics.totalMessages) * 100) 
      : 0;
    
    analytics.recipientSuccessRate = analytics.totalRecipients > 0 
      ? Math.round((analytics.successfulRecipients / analytics.totalRecipients) * 100) 
      : 0;
    
    res.json({
      period,
      dateRange: {
        from: startDate,
        to: endDate
      },
      analytics
    });
  } catch (err) {
    logger.error('Error generating message analytics:', err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;