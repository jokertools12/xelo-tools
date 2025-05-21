const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const ScheduledMessage = require('../../models/ScheduledMessage');
const User = require('../../models/User');
const UserAction = require('../../models/UserAction');
const Transaction = require('../../models/Transaction');
const { 
  analyzeRecipientBatch, 
  calculateDelay, 
  verifyDelayEffectiveness,
  validateFacebookRecipientId,
  personalizeMessageText,
  sendFacebookDirectMessage,
  sendFacebookMediaMessage,
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
      // Convert messageId and userId to strings to ensure substring works
      const messageIdStr = String(messageId);
      const userIdStr = String(userId);
      console.log(`[TRANSACTION] Message=${messageIdStr.substring(0, 8)}... User=${userIdStr.substring(0, 8)}... Points=${points} Operation=${operation}`);
    }
  }
};

/**
 * @route   GET api/scheduled-messages
 * @desc    Get all scheduled messages for the current user with pagination
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const { status, limit = 50, page = 1, sort = 'scheduledTime', order = 'desc' } = req.query;
    
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
    
    const scheduledMessages = await ScheduledMessage.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const total = await ScheduledMessage.countDocuments(filter);
    
    res.json({
      messages: scheduledMessages,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    logger.error('Error fetching scheduled messages:', err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   GET api/scheduled-messages/analytics
 * @desc    Get analytics for scheduled messages
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
    const messages = await ScheduledMessage.find({
      user: req.user.id,
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    // Calculate analytics
    const analytics = {
      totalMessages: messages.length,
      successfulMessages: 0,
      failedMessages: 0,
      pendingMessages: 0,
      canceledMessages: 0,
      totalRecipients: 0,
      successfulRecipients: 0,
      failedRecipients: 0,
      pointsSpent: 0,
      pointsRefunded: 0,
      averageDelay: 0,
      schedulingDistribution: {
        morning: 0, // 6:00 - 11:59
        afternoon: 0, // 12:00 - 17:59
        evening: 0, // 18:00 - 23:59
        night: 0 // 0:00 - 5:59
      },
      delayModes: {},
      messageTypes: {},
      errorTypes: {}
    };
    
    // Calculate totals
    messages.forEach(message => {
      analytics.totalRecipients += message.totalRecipients || message.recipients.length;
      analytics.successfulRecipients += message.sent || 0;
      analytics.failedRecipients += message.failed || 0;
      analytics.pointsSpent += message.deductedPoints || 0;
      analytics.pointsRefunded += message.pointsRefunded || 0;
      
      // Count message status
      if (message.status === 'completed') {
        analytics.successfulMessages++;
      } else if (message.status === 'failed') {
        analytics.failedMessages++;
      } else if (message.status === 'pending') {
        analytics.pendingMessages++;
      } else if (message.status === 'canceled') {
        analytics.canceledMessages++;
      }
      
      // Categorize by scheduling time
      if (message.scheduledTime) {
        const hour = new Date(message.scheduledTime).getHours();
        if (hour >= 6 && hour < 12) {
          analytics.schedulingDistribution.morning++;
        } else if (hour >= 12 && hour < 18) {
          analytics.schedulingDistribution.afternoon++;
        } else if (hour >= 18 && hour < 24) {
          analytics.schedulingDistribution.evening++;
        } else {
          analytics.schedulingDistribution.night++;
        }
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
      
      // Calculate average delay from metrics or configuration
      if (message.delayAnalysis && message.delayAnalysis.averageDelay) {
        analytics.averageDelay += message.delayAnalysis.averageDelay;
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
    logger.error('Error generating scheduled message analytics:', err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   GET api/scheduled-messages/pending/due
 * @desc    Get all pending scheduled messages that are due to run (used by server cron job)
 * @access  Private (secured by API key in production)
 */
router.get('/pending/due', async (req, res) => {
  try {
    // This would be secured in production with API key or other server-only auth
    
    const now = new Date();
    const pendingMessages = await ScheduledMessage.find({
      status: 'pending',
      scheduledTime: { $lte: now }
    });
    
    // Group by user for better processing
    const byUser = {};
    pendingMessages.forEach(message => {
      const userId = message.user.toString();
      if (!byUser[userId]) {
        byUser[userId] = [];
      }
      byUser[userId].push(message);
    });
    
    res.json({
      total: pendingMessages.length,
      byUser: Object.keys(byUser).length,
      messages: pendingMessages
    });
  } catch (err) {
    logger.error('Error fetching pending scheduled messages:', err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   GET api/scheduled-messages/status/:id
 * @desc    Get detailed status of a scheduled message
 * @access  Private
 */
router.get('/status/:id', protect, async (req, res) => {
  try {
    const message = await ScheduledMessage.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });
    
    if (!message) {
      return res.status(404).json({ msg: 'Scheduled message not found' });
    }
    
    // Calculate time until scheduled or time since scheduled
    const now = new Date();
    const scheduledDate = new Date(message.scheduledTime);
    const timeDiffMs = scheduledDate - now;
    
    let timeStatus;
    if (timeDiffMs > 0) {
      // Not yet scheduled
      const minutes = Math.floor(timeDiffMs / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      
      if (days > 0) {
        timeStatus = `Scheduled in ${days} day${days > 1 ? 's' : ''} and ${hours % 24} hour${(hours % 24) !== 1 ? 's' : ''}`;
      } else if (hours > 0) {
        timeStatus = `Scheduled in ${hours} hour${hours > 1 ? 's' : ''} and ${minutes % 60} minute${(minutes % 60) !== 1 ? 's' : ''}`;
      } else {
        timeStatus = `Scheduled in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
      }
    } else {
      // Already scheduled
      if (message.status === 'pending') {
        timeStatus = 'Due for processing (queued)';
      } else if (message.status === 'processing') {
        timeStatus = 'Currently processing';
      } else {
        // Calculate elapsed time since scheduled
        const elapsedMs = Math.abs(timeDiffMs);
        const elapsedMinutes = Math.floor(elapsedMs / 60000);
        const elapsedHours = Math.floor(elapsedMinutes / 60);
        const elapsedDays = Math.floor(elapsedHours / 24);
        
        if (elapsedDays > 0) {
          timeStatus = `Scheduled ${elapsedDays} day${elapsedDays > 1 ? 's' : ''} ago`;
        } else if (elapsedHours > 0) {
          timeStatus = `Scheduled ${elapsedHours} hour${elapsedHours > 1 ? 's' : ''} ago`;
        } else {
          timeStatus = `Scheduled ${elapsedMinutes} minute${elapsedMinutes !== 1 ? 's' : ''} ago`;
        }
      }
    }
    
    // Calculate completion percentage if processing has started
    const total = message.totalRecipients || message.recipients.length;
    const processed = (message.sent || 0) + (message.failed || 0);
    const percentComplete = message.status === 'processing' && total > 0 
      ? Math.round((processed / total) * 100) 
      : (message.status === 'completed' ? 100 : 0);
    
    // Prepare enhanced status response
    const response = {
      id: message._id,
      status: message.status,
      timeStatus: timeStatus,
      scheduledTime: message.scheduledTime,
      timeTillScheduledSec: Math.max(0, Math.round(timeDiffMs / 1000)),
      sent: message.sent || 0,
      failed: message.failed || 0,
      total: total,
      current: message.current || 0,
      progress: percentComplete,
      processingStartedAt: message.processingStartedAt,
      processingCompletedAt: message.processingCompletedAt,
      estimatedCompletionTime: message.estimatedCompletionTime,
      pointsRefunded: message.pointsRefunded || 0,
      error: message.error
    };
    
    // Add delay analysis if available
    if (message.delayMetrics && message.delayMetrics.length > 0) {
      response.delayStats = {
        averageDelay: (message.delayAnalysis?.averageDelay / 1000).toFixed(2) || 0,
        minDelay: (message.delayAnalysis?.minDelay / 1000).toFixed(2) || 0,
        maxDelay: (message.delayAnalysis?.maxDelay / 1000).toFixed(2) || 0,
        isEffective: message.delayAnalysis?.isEffective || false,
        recommendation: message.delayAnalysis?.recommendation || ''
      };
    }
    
    // Add processing stats if available
    if (message.processingStats) {
      response.processingStats = message.processingStats;
    }
    
    res.json(response);
  } catch (err) {
    logger.error('Error fetching scheduled message status:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Scheduled message not found' });
    }
    res.status(500).send('Server Error');
  }
});

/**
 * @route   GET api/scheduled-messages/:id
 * @desc    Get a specific scheduled message with detailed analytics
 * @access  Private
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const scheduledMessage = await ScheduledMessage.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });
    
    if (!scheduledMessage) {
      return res.status(404).json({ msg: 'Scheduled message not found' });
    }
    
    // Calculate delivery statistics if processing has started
    const stats = {
      sent: scheduledMessage.sent || 0,
      failed: scheduledMessage.failed || 0,
      total: scheduledMessage.totalRecipients || scheduledMessage.recipients.length,
      successRate: scheduledMessage.sent ? (scheduledMessage.sent / scheduledMessage.totalRecipients * 100).toFixed(1) : 0,
      processingTime: scheduledMessage.processingCompletedAt && scheduledMessage.processingStartedAt 
        ? Math.round((scheduledMessage.processingCompletedAt - scheduledMessage.processingStartedAt) / 1000)
        : null,
      pointsRefunded: scheduledMessage.pointsRefunded || 0,
      scheduledTime: scheduledMessage.scheduledTime,
      timeTillScheduled: scheduledMessage.scheduledTime > new Date() 
        ? Math.round((scheduledMessage.scheduledTime - new Date()) / 1000)
        : 0
    };
    
    // Add detailed delay analysis if available
    if (scheduledMessage.delayMetrics && scheduledMessage.delayMetrics.length > 0) {
      stats.delayAnalysis = {
        averageDelay: (scheduledMessage.delayAnalysis?.averageDelay / 1000).toFixed(2) || 0,
        minDelay: (scheduledMessage.delayAnalysis?.minDelay / 1000).toFixed(2) || 0,
        maxDelay: (scheduledMessage.delayAnalysis?.maxDelay / 1000).toFixed(2) || 0,
        isEffective: scheduledMessage.delayAnalysis?.isEffective || false,
        recommendation: scheduledMessage.delayAnalysis?.recommendation || ''
      };
    }
    
    // Add error analysis if there were failures
    if (scheduledMessage.failed > 0 && scheduledMessage.results) {
      const errorTypes = {};
      let mostCommonError = { error: "Unknown", count: 0 };
      
      scheduledMessage.results.forEach(result => {
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
      message: scheduledMessage,
      stats
    });
  } catch (err) {
    logger.error('Error fetching scheduled message:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Scheduled message not found' });
    }
    res.status(500).send('Server Error');
  }
});

/**
 * @route   POST api/scheduled-messages
 * @desc    Create a new scheduled message with advanced options
 * @access  Private
 */
router.post('/', protect, async (req, res) => {
  try {
    const { 
      scheduledTime,
      recipients,
      messageType,
      messageText,
      imageUrl,
      videoUrl,
      pageId,
      pageName,
      accessToken,
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
      adaptiveBatching,
      // Buttons (support both legacy and new formats)
      buttons,
      quickReplyButtons
    } = req.body;

    // Validate required fields
    if (!scheduledTime || !messageType || !recipients || !Array.isArray(recipients) || recipients.length === 0 || !pageId || !pageName || !accessToken) {
      return res.status(400).json({ msg: 'Please include all required fields' });
    }

    // Make sure scheduled time is in the future
    const scheduledDate = new Date(scheduledTime);
    const now = new Date();
    
    if (scheduledDate <= now) {
      return res.status(400).json({ msg: 'Scheduled time must be in the future' });
    }
    
    // Validate message type specific content
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
    
    // Calculate expected delivery time based on settings
    let estimatedCompletionTime = new Date(scheduledDate);
    
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
    
    // Create new scheduled message with all the enhanced options
    const newScheduledMessage = new ScheduledMessage({
      user: req.user.id,
      scheduledTime: scheduledDate,
      recipients: recipientIds,
      recipientCount: validatedRecipients.length,
      totalRecipients: validatedRecipients.length,
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
      deductedPoints: requiredPoints,
      pointsRefunded: 0, // Initialize refunded points to 0
      estimatedCompletionTime,
      status: 'pending',
      current: 0, // Initialize current position to 0
    });
    
    // Save both the updated user and the new scheduled message
    await user.save();
    
    // Record the points transaction
    const transaction = new Transaction({
      userId: req.user.id,
      type: 'other', // Using 'other' instead of 'deduction' to match valid enum values
      amount: -requiredPoints, // Use negative amount to indicate deduction
      status: 'completed',
      description: `خصم ${requiredPoints} نقطة مقدماً لجدولة رسائل إلى ${validatedRecipients.length} مستلم`
    });
    
    // Save the transaction and the scheduled message
    const [savedTransaction, savedScheduledMessage] = await Promise.all([
      transaction.save(),
      newScheduledMessage.save()
    ]);
    
    logger.transaction(savedScheduledMessage._id, req.user.id, requiredPoints, 'deduction');
    
    res.json({
      message: savedScheduledMessage,
      transactionId: savedTransaction._id,
      estimatedCompletionTime
    });
  } catch (err) {
    logger.error('Error creating scheduled message:', err);
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
 * @route   DELETE api/scheduled-messages/:id
 * @desc    Cancel a scheduled message and refund points
 * @access  Private
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const query = req.user.isAdmin 
      ? { _id: req.params.id } // Admins can delete any message
      : { _id: req.params.id, user: req.user.id }; // Regular users can only delete their own messages
    
    const scheduledMessage = await ScheduledMessage.findOne(query);
    
    if (!scheduledMessage) {
      return res.status(404).json({ msg: 'Scheduled message not found' });
    }
    
    // Only allow deletion of pending messages
    if (scheduledMessage.status !== 'pending') {
      return res.status(400).json({ 
        msg: `Cannot delete message with status: ${scheduledMessage.status}` 
      });
    }
    
    // Change status to canceled instead of deleting 
    scheduledMessage.status = 'canceled';
    scheduledMessage.processingCompletedAt = new Date();
    await scheduledMessage.save();
    
    // Refund points if any were deducted
    if (scheduledMessage.deductedPoints) {
      const user = await User.findById(scheduledMessage.user);
      if (user) {
        // Refund all points since the message was not yet sent
        const pointsToRefund = scheduledMessage.deductedPoints;
        
        user.points += pointsToRefund;
        
        // Record the refund transaction
        const transaction = new Transaction({
          userId: user._id,
          type: 'refund',
          amount: pointsToRefund,
          status: 'completed',
          description: `استرجاع ${pointsToRefund} نقطة: إلغاء الرسائل المجدولة`
        });
        
        // Save user and transaction
        await Promise.all([
          user.save(),
          transaction.save()
        ]);
        
        // Update message with refund info
        scheduledMessage.pointsRefunded = pointsToRefund;
        await scheduledMessage.save();
        
        logger.transaction(scheduledMessage._id, user._id, pointsToRefund, 'refund');
      }
    }
    
    res.json({ 
      msg: 'Scheduled message canceled',
      refundedPoints: scheduledMessage.deductedPoints || 0
    });
  } catch (err) {
    logger.error('Error canceling scheduled message:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Scheduled message not found' });
    }
    res.status(500).send('Server Error');
  }
});

/**
 * @route   PUT api/scheduled-messages/:id/reschedule
 * @desc    Update the scheduled time for a pending message
 * @access  Private
 */
router.put('/:id/reschedule', protect, async (req, res) => {
  try {
    const { scheduledTime } = req.body;
    
    // Validate required field
    if (!scheduledTime) {
      return res.status(400).json({ msg: 'Scheduled time is required' });
    }
    
    // Make sure scheduled time is in the future
    const newScheduledDate = new Date(scheduledTime);
    if (newScheduledDate <= new Date()) {
      return res.status(400).json({ msg: 'Scheduled time must be in the future' });
    }
    
    // Find the message (user can only update their own messages)
    const scheduledMessage = await ScheduledMessage.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });
    
    if (!scheduledMessage) {
      return res.status(404).json({ msg: 'Scheduled message not found' });
    }
    
    // Only allow rescheduling of pending messages
    if (scheduledMessage.status !== 'pending') {
      return res.status(400).json({ 
        msg: `Cannot reschedule message with status: ${scheduledMessage.status}` 
      });
    }
    
    // Calculate new estimated completion time
    let estimatedCompletionTime = new Date(newScheduledDate);
    const recipientCount = scheduledMessage.totalRecipients || scheduledMessage.recipients.length;
    
    if (scheduledMessage.enableDelay && recipientCount > 1) {
      let totalDelaySeconds = 0;
      
      switch(scheduledMessage.delayMode) {
        case 'fixed':
          totalDelaySeconds = (recipientCount - 1) * (scheduledMessage.delaySeconds || 5);
          break;
        case 'random':
          const avgDelaySeconds = ((scheduledMessage.minDelaySeconds || 3) + (scheduledMessage.maxDelaySeconds || 10)) / 2;
          totalDelaySeconds = (recipientCount - 1) * avgDelaySeconds;
          break;
        case 'incremental':
          const start = scheduledMessage.incrementalDelayStart || 3;
          const step = scheduledMessage.incrementalDelayStep || 2;
          const acceleration = scheduledMessage.incrementalAcceleration || 1.0;
          
          // Calculate total delay with acceleration factor
          if (acceleration === 1.0) {
            // Linear growth
            totalDelaySeconds = (recipientCount - 1) * start + 
                                (step * (recipientCount - 1) * (recipientCount - 2)) / 2;
          } else if (acceleration > 1.0) {
            // Exponential growth
            let currentDelay = start;
            for (let i = 1; i < recipientCount; i++) {
              totalDelaySeconds += currentDelay;
              currentDelay += step * Math.pow(i, acceleration - 1);
            }
          } else {
            // Logarithmic growth (slower increase)
            let currentDelay = start;
            for (let i = 1; i < recipientCount; i++) {
              totalDelaySeconds += currentDelay;
              currentDelay += step * Math.pow(i, acceleration);
            }
          }
          break;
        case 'adaptive':
          // For estimation, use average of base and max
          const avgAdaptiveDelay = ((scheduledMessage.adaptiveBaseDelay || 3) + (scheduledMessage.adaptiveMaxDelay || 30)) / 2;
          totalDelaySeconds = (recipientCount - 1) * avgAdaptiveDelay;
          break;
        default:
          totalDelaySeconds = (recipientCount - 1) * 5; // Default 5 seconds
      }
      
      // Add batch processing time estimate (5% overhead)
      const effectiveBatchSize = scheduledMessage.batchSize || 50;
      if (recipientCount > effectiveBatchSize) {
        const batchCount = Math.ceil(recipientCount / effectiveBatchSize);
        totalDelaySeconds *= 1.05; // 5% overhead for batch processing
        totalDelaySeconds += batchCount * 2; // 2 seconds per batch for processing overhead
      }
      
      // Add estimated total delay to completion time
      estimatedCompletionTime.setSeconds(estimatedCompletionTime.getSeconds() + totalDelaySeconds);
    }
    
    // Update the scheduled time and estimated completion time
    scheduledMessage.scheduledTime = newScheduledDate;
    scheduledMessage.estimatedCompletionTime = estimatedCompletionTime;
    
    await scheduledMessage.save();
    
    res.json({
      message: scheduledMessage,
      estimatedCompletionTime
    });
  } catch (err) {
    logger.error('Error rescheduling message:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Scheduled message not found' });
    }
    res.status(500).send('Server Error');
  }
});

/**
 * @route   PUT api/scheduled-messages/:id/update-options
 * @desc    Update delivery options for a pending message
 * @access  Private
 */
router.put('/:id/update-options', protect, async (req, res) => {
  try {
    const { 
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
      personalizeMessage,
      messagePersonalization,
      batchSize,
      adaptiveBatching,
      // Add support for updating buttons
      buttons,
      quickReplyButtons
    } = req.body;
    
    // Find the message (user can only update their own messages)
    const scheduledMessage = await ScheduledMessage.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });
    
    if (!scheduledMessage) {
      return res.status(404).json({ msg: 'Scheduled message not found' });
    }
    
    // Only allow updating of pending messages
    if (scheduledMessage.status !== 'pending') {
      return res.status(400).json({ 
        msg: `Cannot update options for message with status: ${scheduledMessage.status}` 
      });
    }
    
    // Validate delay mode parameters if being updated
    if (enableDelay !== undefined) {
      scheduledMessage.enableDelay = enableDelay;
    }
    
    if (delayMode) {
      // Validate based on mode
      if (delayMode === 'random' && 
         ((minDelaySeconds !== undefined && maxDelaySeconds !== undefined && minDelaySeconds >= maxDelaySeconds) ||
          (minDelaySeconds === undefined && maxDelaySeconds !== undefined && scheduledMessage.minDelaySeconds >= maxDelaySeconds) ||
          (minDelaySeconds !== undefined && maxDelaySeconds === undefined && minDelaySeconds >= scheduledMessage.maxDelaySeconds) ||
          (minDelaySeconds === undefined && maxDelaySeconds === undefined && scheduledMessage.minDelaySeconds >= scheduledMessage.maxDelaySeconds))) {
        return res.status(400).json({ msg: 'Minimum delay must be less than maximum delay' });
      }
      
      if (delayMode === 'adaptive' && 
         ((adaptiveBaseDelay !== undefined && adaptiveMaxDelay !== undefined && adaptiveBaseDelay >= adaptiveMaxDelay) ||
          (adaptiveBaseDelay === undefined && adaptiveMaxDelay !== undefined && scheduledMessage.adaptiveBaseDelay >= adaptiveMaxDelay) ||
          (adaptiveBaseDelay !== undefined && adaptiveMaxDelay === undefined && adaptiveBaseDelay >= scheduledMessage.adaptiveMaxDelay) ||
          (adaptiveBaseDelay === undefined && adaptiveMaxDelay === undefined && scheduledMessage.adaptiveBaseDelay >= scheduledMessage.adaptiveMaxDelay))) {
        return res.status(400).json({ msg: 'Adaptive base delay must be less than adaptive maximum delay' });
      }
      
      scheduledMessage.delayMode = delayMode;
    }
    
    // Update delay parameters if provided
    if (delaySeconds !== undefined && delaySeconds >= 2) {
      scheduledMessage.delaySeconds = delaySeconds;
    } else if (delaySeconds !== undefined && delaySeconds < 2) {
      return res.status(400).json({ msg: 'Fixed delay must be at least 2 seconds to avoid rate limiting' });
    }
    
    if (minDelaySeconds !== undefined && minDelaySeconds >= 2) {
      scheduledMessage.minDelaySeconds = minDelaySeconds;
    } else if (minDelaySeconds !== undefined && minDelaySeconds < 2) {
      return res.status(400).json({ msg: 'Minimum delay must be at least 2 seconds to avoid rate limiting' });
    }
    
    if (maxDelaySeconds !== undefined && maxDelaySeconds >= 3) {
      scheduledMessage.maxDelaySeconds = maxDelaySeconds;
    }
    
    if (incrementalDelayStart !== undefined && incrementalDelayStart >= 2) {
      scheduledMessage.incrementalDelayStart = incrementalDelayStart;
    } else if (incrementalDelayStart !== undefined && incrementalDelayStart < 2) {
      return res.status(400).json({ msg: 'Starting delay must be at least 2 seconds to avoid rate limiting' });
    }
    
    if (incrementalDelayStep !== undefined && incrementalDelayStep >= 1) {
      scheduledMessage.incrementalDelayStep = incrementalDelayStep;
    }
    
    if (incrementalAcceleration !== undefined && incrementalAcceleration >= 0.5 && incrementalAcceleration <= 2.0) {
      scheduledMessage.incrementalAcceleration = incrementalAcceleration;
    }
    
    if (adaptiveBaseDelay !== undefined && adaptiveBaseDelay >= 2) {
      scheduledMessage.adaptiveBaseDelay = adaptiveBaseDelay;
    } else if (adaptiveBaseDelay !== undefined && adaptiveBaseDelay < 2) {
      return res.status(400).json({ msg: 'Adaptive base delay must be at least 2 seconds to avoid rate limiting' });
    }
    
    if (adaptiveMaxDelay !== undefined && adaptiveMaxDelay >= 5) {
      scheduledMessage.adaptiveMaxDelay = adaptiveMaxDelay;
    }
    
    // Update personalization options if provided
    if (personalizeMessage !== undefined) {
      scheduledMessage.personalizeMessage = personalizeMessage;
    }
    
    if (messagePersonalization) {
      scheduledMessage.messagePersonalization = {
        ...scheduledMessage.messagePersonalization,
        ...messagePersonalization
      };
    }
    
    // Update batch processing options if provided
    if (batchSize !== undefined) {
      if (batchSize < 5 || batchSize > 200) {
        return res.status(400).json({ msg: 'Batch size must be between 5 and 200' });
      }
      scheduledMessage.batchSize = batchSize;
    }
    
    if (adaptiveBatching !== undefined) {
      scheduledMessage.adaptiveBatching = adaptiveBatching;
    }
    
    // Update buttons if provided
    if (quickReplyButtons || buttons) {
      // Process button data - Support both legacy buttons and new quickReplyButtons format
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
      
      // Only update if we have buttons to update
      if (processedButtons.length > 0) {
        scheduledMessage.quickReplyButtons = processedButtons;
      }
    }
    
    // Recalculate estimated completion time based on new settings
    const recipientCount = scheduledMessage.totalRecipients || scheduledMessage.recipients.length;
    let estimatedCompletionTime = new Date(scheduledMessage.scheduledTime);
    
    if (scheduledMessage.enableDelay && recipientCount > 1) {
      let totalDelaySeconds = 0;
      
      switch(scheduledMessage.delayMode) {
        case 'fixed':
          totalDelaySeconds = (recipientCount - 1) * scheduledMessage.delaySeconds;
          break;
        case 'random':
          const avgDelaySeconds = (scheduledMessage.minDelaySeconds + scheduledMessage.maxDelaySeconds) / 2;
          totalDelaySeconds = (recipientCount - 1) * avgDelaySeconds;
          break;
        case 'incremental':
          const start = scheduledMessage.incrementalDelayStart;
          const step = scheduledMessage.incrementalDelayStep;
          const acceleration = scheduledMessage.incrementalAcceleration;
          
          // Calculate total delay with acceleration factor
          if (acceleration === 1.0) {
            // Linear growth
            totalDelaySeconds = (recipientCount - 1) * start + 
                                (step * (recipientCount - 1) * (recipientCount - 2)) / 2;
          } else if (acceleration > 1.0) {
            // Exponential growth
            let currentDelay = start;
            for (let i = 1; i < recipientCount; i++) {
              totalDelaySeconds += currentDelay;
              currentDelay += step * Math.pow(i, acceleration - 1);
            }
          } else {
            // Logarithmic growth (slower increase)
            let currentDelay = start;
            for (let i = 1; i < recipientCount; i++) {
              totalDelaySeconds += currentDelay;
              currentDelay += step * Math.pow(i, acceleration);
            }
          }
          break;
        case 'adaptive':
          // For estimation, use average of base and max
          const avgAdaptiveDelay = (scheduledMessage.adaptiveBaseDelay + scheduledMessage.adaptiveMaxDelay) / 2;
          totalDelaySeconds = (recipientCount - 1) * avgAdaptiveDelay;
          break;
        default:
          totalDelaySeconds = (recipientCount - 1) * 5; // Default 5 seconds
      }
      
      // Add batch processing time estimate (5% overhead)
      const effectiveBatchSize = scheduledMessage.batchSize;
      if (recipientCount > effectiveBatchSize) {
        const batchCount = Math.ceil(recipientCount / effectiveBatchSize);
        totalDelaySeconds *= 1.05; // 5% overhead for batch processing
        totalDelaySeconds += batchCount * 2; // 2 seconds per batch for processing overhead
      }
      
      // Add estimated total delay to completion time
      estimatedCompletionTime.setSeconds(estimatedCompletionTime.getSeconds() + totalDelaySeconds);
    }
    
    scheduledMessage.estimatedCompletionTime = estimatedCompletionTime;
    
    // Save the updated scheduled message
    await scheduledMessage.save();
    
    res.json({
      message: scheduledMessage,
      estimatedCompletionTime
    });
  } catch (err) {
    logger.error('Error updating message options:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Scheduled message not found' });
    }
    res.status(500).send('Server Error');
  }
});

/**
 * Helper function to process scheduled messages with enhanced processing
 * @param {ScheduledMessage} message - The scheduled message to process
 * @returns {Promise<Object>} Processing results
 */
const processScheduledMessage = async (message) => {
  logger.info(`Processing scheduled message ${message._id.toString()} with ${message.recipients.length} recipients`);
  
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
  const updateInterval = 1000; // 1 second between database updates (reduced from 2s for more frequent updates)
  const results = [];
  const delayMetrics = [];
  
  try {
    // Function to update the database with current progress
    const updateDatabase = async (force = false) => {
      const now = Date.now();
      
      // Only update if forced or if enough time has passed since last update
      if (force || (now - lastDbUpdateTime >= updateInterval)) {
        try {
          await ScheduledMessage.updateOne(
            { _id: message._id },
            { 
              $set: { 
                sent,
                failed,
                current,
                pointsRefunded, // Update refunded points in database
                results // Store results incrementally
              },
              $push: { 
                delayMetrics: { $each: delayMetrics.splice(0) } // Add and clear delay metrics
              }
            }
          );
          
          lastDbUpdateTime = now;
          pendingDbUpdates = false;
        } catch (error) {
          logger.error(`Error updating message ${message._id} progress:`, error);
          pendingDbUpdates = true;
        }
      } else {
        pendingDbUpdates = true;
      }
    };
    
    // Determine batch size based on total recipients and settings
    let currentBatchSize = message.batchSize || 50;
    if (message.adaptiveBatching) {
      currentBatchSize = getOptimalBatchSize(message.recipients.length, currentBatchSize);
    }
    
    // Process in batches if recipient count is large
    const batches = [];
    for (let i = 0; i < message.recipients.length; i += currentBatchSize) {
      batches.push(message.recipients.slice(i, i + currentBatchSize));
    }
    
    // Track previous response times for adaptive delay
    let previousResponseTimes = [];
    
    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      // Reduce log volume by only logging key batches 
      if (batchIndex === 0 || batchIndex === batches.length - 1 || batchIndex % 5 === 0) {
        logger.debug(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} recipients)`);
      }
      
      // Send messages to each recipient in this batch
      for (let recipientId of batch) {
        // Check for cancellation before processing each recipient
        const freshMessage = await ScheduledMessage.findById(message._id);
        if (!freshMessage || freshMessage.status === 'canceled') {
          // Apply any pending updates before exiting
          if (pendingDbUpdates) {
            await updateDatabase(true);
          }
          
          logger.info(`Message ${message._id} was canceled, stopping at recipient ${current + 1}/${message.recipients.length}`);
          
          // Calculate pending recipients for proper refund
          const totalRecipients = message.recipients.length;
          const processed = current;
          const pending = totalRecipients - processed;
          
          logger.transaction(
            message._id.toString(), 
            message.user.toString(), 
            pending, 
            'refund-cancel'
          );
          
          return {
            sent,
            failed,
            results,
            delayMetrics,
            processingStats,
            pointsRefunded,
            canceled: true
          };
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
                name: ''
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
            recipientId,
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
            const cancelCheck = await ScheduledMessage.findById(message._id);
            if (!cancelCheck || cancelCheck.status === 'canceled') {
              // Apply any pending updates before exiting
              if (pendingDbUpdates) {
                await updateDatabase(true);
              }
              
              logger.info(`Message ${message._id} was canceled during retry, stopping immediately`);
              return {
                sent,
                failed,
                results,
                delayMetrics,
                processingStats,
                pointsRefunded,
                canceled: true
              };
            }
            
            const startTime = Date.now();
            
            // Create a proper recipient object for personalization
            const recipientObject = {
              id: recipientId,
              name: ''
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
              
              // Add buttons if available - EXACTLY matching the pattern in instantMessages.js
              if (message.quickReplyButtons && message.quickReplyButtons.length > 0) {
                console.log("Processing quick reply buttons for scheduled message:", 
                  message.quickReplyButtons.length,
                  "First button sample:", 
                  JSON.stringify(message.quickReplyButtons[0]));
                
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
              // Legacy format fallback - EXACTLY matching instantMessages.js
              else if (message.buttons && message.buttons.length > 0) {
                console.log("Processing legacy button format for scheduled message:", 
                  message.buttons.length);
                
                options.quickReplyButtons = message.buttons.map(button => ({
                  type: 'text',
                  text: button.text,
                  payload: button.payload || button.text
                }));
              }
              
              if (options.quickReplyButtons && options.quickReplyButtons.length > 0) {
                console.log("Final button configuration:", 
                  JSON.stringify({
                    buttonCount: options.quickReplyButtons.length,
                    sample: options.quickReplyButtons[0]
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
                logger.error(`Error sending to ${recipientId}: ${result.error}`);
                
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
            name: ''
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
        
        // Update database periodically to avoid too many operations
        await updateDatabase();
        
        // Check for cancellation after processing
        const postProcessCancelCheck = await ScheduledMessage.findById(message._id);
        if (!postProcessCancelCheck || postProcessCancelCheck.status === 'canceled') {
          // Apply any pending updates before exiting
          if (pendingDbUpdates) {
            await updateDatabase(true);
          }
          
          logger.info(`Message ${message._id} was canceled after processing recipient ${current}/${message.recipients.length}`);
          return {
            sent,
            failed,
            results,
            delayMetrics,
            processingStats,
            pointsRefunded,
            canceled: true
          };
        }
      }
      
      // Brief pause between batches to avoid rate limiting
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Force update database after each batch
      await updateDatabase(true);
    }
    
    // Ensure any pending updates are applied
    if (pendingDbUpdates) {
      await updateDatabase(true);
    }
    
    // Return processing results
    return {
      sent,
      failed,
      results,
      delayMetrics,
      processingStats,
      pointsRefunded,
      canceled: false
    };
  } catch (err) {
    logger.error(`Error processing scheduled message ${message._id}:`, err);
    throw err;
  }
};

/**
 * @route   PUT api/scheduled-messages/:id/process
 * @desc    Process a scheduled message (server only)
 * @access  Private (secured in production)
 */
router.put('/:id/process', async (req, res) => {
  try {
    // This would be secured in production with API key or other server-only auth
    const scheduledMessage = await ScheduledMessage.findById(req.params.id);
    
    if (!scheduledMessage) {
      return res.status(404).json({ msg: 'Scheduled message not found' });
    }
    
    // Only process pending messages
    if (scheduledMessage.status !== 'pending') {
      return res.status(400).json({ 
        msg: `Cannot process message with status: ${scheduledMessage.status}` 
      });
    }
    
    // Update status to processing
    scheduledMessage.status = 'processing';
    scheduledMessage.processingStartedAt = new Date();
    scheduledMessage.current = 0; // Initialize current position to 0
    scheduledMessage.pointsRefunded = 0; // Initialize points refunded to 0
    await scheduledMessage.save();
    
    try {
      // Process the message
      const { sent, failed, results, delayMetrics, processingStats, pointsRefunded, canceled } = await processScheduledMessage(scheduledMessage);
      
      // Skip further updates if message was canceled
      if (canceled) {
        return res.json({
          message: await ScheduledMessage.findById(scheduledMessage._id),
          status: 'canceled',
          processed: sent + failed,
          total: scheduledMessage.totalRecipients || scheduledMessage.recipients.length
        });
      }
      
      // Update the message with results
      const finalMessage = await ScheduledMessage.findById(scheduledMessage._id);
      
      // Ensure message exists and wasn't deleted/canceled
      if (!finalMessage) {
        return res.status(404).json({ msg: 'Scheduled message no longer exists' });
      }
      
      finalMessage.status = sent > 0 ? (failed > 0 ? 'completed' : 'completed') : 'failed';
      finalMessage.processingCompletedAt = new Date();
      finalMessage.sent = sent;
      finalMessage.failed = failed;
      finalMessage.results = results;
      finalMessage.pointsRefunded = pointsRefunded;
      
      // Store delay metrics for analysis
      if (delayMetrics && delayMetrics.length > 0) {
        finalMessage.delayMetrics = delayMetrics;
        
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
            // Refund points for failed messages only (already tracked in pointsRefunded)
            const pointsToRefund = pointsRefunded;
            
            user.points += pointsToRefund;
            
            // Record the refund transaction
            const transaction = new Transaction({
              userId: user._id,
              type: 'refund',
              amount: pointsToRefund,
              status: 'completed',
              description: `استرداد ${pointsToRefund} نقطة للرسائل الفاشلة من أصل ${finalMessage.totalRecipients || finalMessage.recipients.length} رسالة مجدولة`
            });
            
            await Promise.all([
              user.save(),
              transaction.save()
            ]);
            
            // Log transaction with less verbosity
            if (pointsToRefund > 0) {
              logger.transaction(finalMessage._id.toString(), user._id.toString(), pointsToRefund, 'refund-failed');
            }
          }
        } catch (refundError) {
          logger.error('Error refunding points for failed messages:', refundError);
          // Non-blocking - continue even if refund fails
        }
      }
      
      // Create UserAction record for completed messages (for achievement system)
      if (sent > 0) {
        try {
          await UserAction.create({
            userId: finalMessage.user,
            actionType: 'message',
            details: {
              messageType: finalMessage.messageType,
              recipientCount: finalMessage.recipients.length,
              successCount: sent,
              scheduledMessageId: finalMessage._id,
              delayMode: finalMessage.delayMode,
              personalizeMessage: finalMessage.personalizeMessage,
              scheduled: true
            },
            module: 'pagemanagement',
            count: sent // Count each successful message
          });
          logger.debug(`Created message activity record for user ${finalMessage.user} with ${sent} successful scheduled messages`);
        } catch (actionError) {
          logger.error('Error recording scheduled message activity for achievements:', actionError);
          // Non-blocking - don't fail the main request if activity recording fails
        }
      }
      
      res.json({
        message: finalMessage,
        processingStats: {
          sent,
          failed,
          total: finalMessage.totalRecipients || finalMessage.recipients.length,
          pointsRefunded: finalMessage.pointsRefunded || 0
        }
      });
    } catch (processingError) {
      // If processing fails, mark the message as failed
      logger.error(`Error processing scheduled message ${scheduledMessage._id}:`, processingError);
      
      scheduledMessage.status = 'failed';
      scheduledMessage.error = processingError.message || 'Error during processing';
      scheduledMessage.processingCompletedAt = new Date();
      await scheduledMessage.save();
      
      // Refund all points since the entire process failed
      try {
        const user = await User.findById(scheduledMessage.user);
        if (user && scheduledMessage.deductedPoints) {
          // Calculate points to refund based on processed messages
          const processedCount = scheduledMessage.sent + scheduledMessage.failed;
          const totalRecipients = scheduledMessage.recipients.length;
          const pendingRecipients = totalRecipients - processedCount;
          const pointsToRefund = pendingRecipients + scheduledMessage.failed; // Refund for both failed and unprocessed
          
          user.points += pointsToRefund;
          
          // Record the refund transaction
          const transaction = new Transaction({
            userId: user._id,
            type: 'refund',
            amount: pointsToRefund,
            status: 'completed',
            description: `استرداد ${pointsToRefund} نقطة بسبب فشل إرسال الرسائل المجدولة`
          });
          
          await Promise.all([
            user.save(),
            transaction.save()
          ]);
          
          // Update message with refund info
          scheduledMessage.pointsRefunded = pointsToRefund;
          await scheduledMessage.save();
          
          logger.transaction(scheduledMessage._id.toString(), user._id.toString(), pointsToRefund, 'refund-error');
        }
      } catch (refundError) {
        logger.error('Error refunding points:', refundError);
      }
      
      res.status(500).json({
        msg: 'Error processing scheduled message',
        error: processingError.message,
        messageId: scheduledMessage._id
      });
    }
  } catch (err) {
    logger.error('Error processing scheduled message:', err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;