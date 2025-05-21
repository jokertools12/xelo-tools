/**
 * Comment Monitor Processor
 * 
 * Handles the processing of monitored Facebook posts to check for new comments,
 * analyze sentiment, apply filtering rules, and post intelligent responses
 * based on configured rules with rate limiting and error handling.
 * 
 * Enhanced with system-wide limits, optimized processing, and automatic cleanup
 * to prevent database bloat and excessive server load.
 */
const axios = require('axios');
const CommentMonitor = require('../models/CommentMonitor');
const CommentResponseRule = require('../models/CommentResponseRule');
const CommentResponse = require('../models/CommentResponse');
const User = require('../models/User');

// Track if processor is already running to prevent overlaps
let isProcessing = false;
// Track interval timer
let processingInterval = null;
// Track cleanup interval timer
let cleanupInterval = null;

// Global rate limiter to control overall system load
const globalRateLimits = {
  // Maximum responses across all users per minute
  maxResponsesPerMinute: 60,
  // Count of responses in current minute
  responsesThisMinute: 0,
  // Last minute reset timestamp
  lastMinuteReset: Date.now(),
  // Maximum monitors to process in one batch
  maxMonitorsPerBatch: 10,
  // System-wide pause
  isPaused: false
};

// Simple sentiment analysis function - can be replaced with more advanced NLP solution
const analyzeSentiment = (text) => {
  if (!text) return 'neutral';
  
  // Lists of positive and negative words (basic implementation)
  const positiveWords = [
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'beautiful', 'love', 'happy', 
    'thanks', 'thank', 'awesome', 'perfect', 'nice', 'best', 'fantastic', 'helpful', 
    'impressive', 'excited', 'appreciate', 'pleased', 'جميل', 'رائع', 'ممتاز', 'أحسنت', 
    'شكرا', 'شكراً', 'حلو', 'جيد', 'عظيم', 'أعجبني', 'أحب', 'سعيد', 'سعيدة', 'ممتنة'
  ];
  
  const negativeWords = [
    'bad', 'terrible', 'awful', 'horrible', 'poor', 'disappointed', 'disappointing', 
    'waste', 'worst', 'hate', 'useless', 'boring', 'expensive', 'difficult', 'annoying', 
    'problem', 'issue', 'complaint', 'fail', 'failure', 'سيء', 'رديء', 'مزعج', 'مشكلة', 
    'غالي', 'كره', 'أكره', 'سيئة', 'محبط', 'محبطة', 'صعب', 'فشل', 'غير'
  ];
  
  // Convert to lowercase for case-insensitive matching
  const lowerText = text.toLowerCase();
  
  // Count occurrences of positive and negative words
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) positiveCount += matches.length;
  });
  
  negativeWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) negativeCount += matches.length;
  });
  
  // Determine sentiment based on counts
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
};

// Check if a comment appears to be spam
const detectSpam = (comment) => {
  if (!comment) return false;
  
  // Simple spam detection rules
  const spamIndicators = [
    // Excessive capitalization
    comment.toUpperCase() === comment && comment.length > 10,
    
    // Repeated characters
    /(.)\1{4,}/.test(comment),
    
    // Common spam phrases
    /\b(buy now|cheap|discount|free|www\.|http:|https:|\.com|\.net|click here)\b/i.test(comment),
    
    // Excessive emojis
    (comment.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g) || []).length > comment.length / 5,
    
    // Arabic spam indicators
    /\b(اشتري الآن|خصم|مجانا|اضغط هنا|رابط)\b/i.test(comment)
  ];
  
  // If any spam indicators are true, consider it spam
  return spamIndicators.some(indicator => indicator === true);
};

// Process template variables in a response
const processTemplate = (template, variables) => {
  if (!template) return '';
  
  let result = template;
  
  // Replace each variable placeholder with its value
  Object.keys(variables).forEach(key => {
    const placeholder = `{${key}}`;
    result = result.replace(new RegExp(placeholder, 'g'), variables[key]);
  });
  
  return result;
};

// Check if the comment matches filter criteria
const matchesFilters = (comment, filters) => {
  if (!filters) return true;
  
  // Check minimum comment length
  if (filters.minCommentLength > 0 && comment.message.length < filters.minCommentLength) {
    return false;
  }
  
  // Check if commenter is excluded
  if (filters.excludeCommenters) {
    const excludedIds = filters.excludeCommenters.split(',').map(id => id.trim());
    if (excludedIds.includes(comment.from.id)) {
      return false;
    }
  }
  
  // Check if comment must contain specific text
  if (filters.mustContain) {
    const requiredTexts = filters.mustContain.split(',').map(text => text.trim());
    const hasRequired = requiredTexts.some(text => 
      comment.message.toLowerCase().includes(text.toLowerCase())
    );
    
    if (!hasRequired) {
      return false;
    }
  }
  
  // Check if comment must NOT contain specific text
  if (filters.mustNotContain) {
    const forbiddenTexts = filters.mustNotContain.split(',').map(text => text.trim());
    const hasForbidden = forbiddenTexts.some(text => 
      comment.message.toLowerCase().includes(text.toLowerCase())
    );
    
    if (hasForbidden) {
      return false;
    }
  }
  
  // Check for spam
  if (filters.skipSpam && detectSpam(comment.message)) {
    return false;
  }
  
  return true;
};

// Find matching rules for a comment
const findMatchingRules = (comment, rules) => {
  if (!rules || !rules.length) return [];
  
  const matches = [];
  
  rules.forEach(rule => {
    // Skip inactive rules or rules that aren't currently in their schedule
    if (!rule.isActive || (rule.isActiveNow && !rule.isActiveNow())) {
      return;
    }
    
    // Check advanced matching options if they exist
    if (rule.matchingOptions) {
      // Check comment length constraints
      const commentLength = comment.message.length;
      
      if (rule.matchingOptions.minCommentLength > 0 && 
          commentLength < rule.matchingOptions.minCommentLength) {
        return;
      }
      
      if (rule.matchingOptions.maxCommentLength > 0 && 
          commentLength > rule.matchingOptions.maxCommentLength) {
        return;
      }
      
      // Check if this is a question and if we should apply to questions
      const isQuestion = comment.message.includes('?');
      if (isQuestion && !rule.matchingOptions.applyToQuestions) {
        return;
      }
    }
    
    // Check if comment matches any keyword
    let isMatch = false;
    
    for (const keyword of rule.keywords) {
      // Skip empty keywords
      if (!keyword.trim()) continue;
      
      const commentText = rule.caseSensitive ? comment.message : comment.message.toLowerCase();
      const keywordText = rule.caseSensitive ? keyword : keyword.toLowerCase();
      
      if (rule.exactMatch) {
        // Exact word match
        const wordBoundary = new RegExp(`\\b${keywordText}\\b`, rule.caseSensitive ? '' : 'i');
        if (wordBoundary.test(commentText)) {
          isMatch = true;
          break;
        }
      } else if (rule.matchingOptions && rule.matchingOptions.enableRegex) {
        // Regex matching
        try {
          const regex = new RegExp(keywordText, rule.caseSensitive ? '' : 'i');
          if (regex.test(commentText)) {
            isMatch = true;
            break;
          }
        } catch (error) {
          console.error(`Invalid regex in rule ${rule.name}: ${keywordText}`);
        }
      } else {
        // Substring match
        if (commentText.includes(keywordText)) {
          isMatch = true;
          break;
        }
      }
    }
    
    if (isMatch) {
      matches.push(rule);
    }
  });
  
  // Sort matches by priority (higher first)
  matches.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  
  return matches;
};

// Check global rate limits across the entire system
const checkGlobalRateLimits = () => {
  // Reset counter if we're in a new minute
  const now = Date.now();
  if (now - globalRateLimits.lastMinuteReset > 60000) {
    globalRateLimits.responsesThisMinute = 0;
    globalRateLimits.lastMinuteReset = now;
    return true;
  }
  
  // Check if we've exceeded the global limit
  if (globalRateLimits.responsesThisMinute >= globalRateLimits.maxResponsesPerMinute) {
    console.log(`[SYSTEM] Global rate limit reached (${globalRateLimits.maxResponsesPerMinute} responses per minute)`);
    return false;
  }
  
  return true;
};

// Check rate limits for a monitor and user
const checkRateLimits = async (monitor, userId) => {
  // First check global rate limits
  if (!checkGlobalRateLimits()) {
    return false;
  }
  
  // Then check monitor-specific limits
  if (!monitor.rateLimiting) return true;
  
  const { maxResponsesPerHour, minSecondsBetweenResponses } = monitor.rateLimiting;
  
  // Check minimum time between responses
  if (minSecondsBetweenResponses > 0 && monitor.stats.lastResponseTime) {
    const lastResponseTime = new Date(monitor.stats.lastResponseTime).getTime();
    const currentTime = Date.now();
    const secondsSinceLastResponse = (currentTime - lastResponseTime) / 1000;
    
    // Enforce system minimum (10 seconds) regardless of user setting
    if (secondsSinceLastResponse < Math.max(10, minSecondsBetweenResponses)) {
      return false;
    }
  }
  
  // Check maximum responses per hour
  if (maxResponsesPerHour > 0) {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    const responseCount = await CommentResponse.countDocuments({
      monitor: monitor._id,
      createdAt: { $gte: oneHourAgo }
    });
    
    // Enforce system maximum (30/hour) regardless of user setting
    if (responseCount >= Math.min(30, maxResponsesPerHour)) {
      return false;
    }
  }
  
  // Also check user's overall hourly limit across all monitors (max 50/hour)
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);
  
  const userTotalResponses = await CommentResponse.countDocuments({
    user: userId,
    createdAt: { $gte: oneHourAgo }
  });
  
  if (userTotalResponses >= 50) {
    console.log(`User ${userId} exceeded hourly response limit of 50`);
    return false;
  }
  
  return true;
};

// Generate a response for a comment using a rule
const generateResponse = (comment, rule, monitor) => {
  if (!rule) return monitor.defaultResponse || 'Thank you for your comment!';
  
  let response;
  
  if (monitor.responseBehavior && monitor.responseBehavior.useSentimentAnalysis) {
    // Analyze sentiment if enabled
    const sentiment = analyzeSentiment(comment.message);
    
    // Try to get a sentiment-specific response first
    if (rule.sentimentResponses && 
        rule.sentimentResponses[sentiment] && 
        rule.sentimentResponses[sentiment].length > 0) {
      response = rule.getNextResponse(sentiment);
    } else {
      // Fall back to regular responses
      response = rule.getNextResponse();
    }
    
    // Update sentiment stats
    if (monitor.stats && monitor.stats.sentimentStats) {
      monitor.stats.sentimentStats[sentiment] = (monitor.stats.sentimentStats[sentiment] || 0) + 1;
    }
  } else {
    // Use regular responses without sentiment analysis
    response = rule.getNextResponse();
  }
  
  // Apply template processing if enabled
  if (monitor.responseBehavior && 
      monitor.responseBehavior.enableCustomPrompts && 
      monitor.responseBehavior.promptTemplate) {
    // Create variables object for template processing
    const variables = {
      comment: comment.message,
      name: comment.from.name || 'there',
      page: monitor.pageName,
      time: new Date().toLocaleTimeString()
    };
    
    // Add custom variables if defined
    if (rule.templateSettings && rule.templateSettings.customVariables) {
      try {
        const customVars = JSON.parse(rule.templateSettings.customVariables);
        Object.assign(variables, customVars);
      } catch (error) {
        console.error(`Error parsing custom variables for rule ${rule.name}: ${error.message}`);
      }
    }
    
    // Process the template
    response = processTemplate(response, variables);
  }
  
  // Enforce response length limit
  if (response && response.length > 500) {
    response = response.substring(0, 497) + '...';
  }
  
  return response;
};

// Post a response to a comment
const postResponse = async (commentId, message, accessToken) => {
  try {
    const url = `https://graph.facebook.com/v18.0/${commentId}/comments`;
    const response = await axios.post(url, null, {
      params: {
        message,
        access_token: accessToken
      }
    });
    
    // Increment global rate limiter counter
    globalRateLimits.responsesThisMinute++;
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error posting response:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error || { message: error.message }
    };
  }
};

// Process a single comment
const processComment = async (comment, monitor, rules) => {
  try {
    // Start timer for processing
    const startTime = Date.now();
    
    // Check if we've already responded to this comment
    const existingResponse = await CommentResponse.findOne({
      commentId: comment.id,
      monitor: monitor._id
    });
    
    if (existingResponse) {
      return {
        success: true,
        alreadyProcessed: true,
        comment
      };
    }
    
    // Check if comment passes filters
    if (!matchesFilters(comment, monitor.filters)) {
      // Add to spam count if the reason was spam
      if (monitor.filters.skipSpam && detectSpam(comment.message)) {
        monitor.stats.spamDetected = (monitor.stats.spamDetected || 0) + 1;
        await monitor.save();
      }
      
      return {
        success: true,
        filtered: true,
        comment
      };
    }
    
    // Check rate limits
    const withinRateLimits = await checkRateLimits(monitor, monitor.user);
    if (!withinRateLimits) {
      console.log(`Rate limit reached for monitor ${monitor.name}, skipping response`);
      
      if (monitor.notifications && monitor.notifications.notifyOnRateLimits) {
        // Log notification for rate limit reached (would be expanded in a full implementation)
        console.log(`Rate limit notification for monitor ${monitor.name}`);
      }
      
      return {
        success: true,
        rateLimited: true,
        comment
      };
    }
    
    // Find matching rules
    const matchingRules = findMatchingRules(comment, rules);
    
    // Determine if we should respond
    let shouldRespond = false;
    let selectedRule = null;
    let responseText = '';
    
    if (matchingRules.length > 0) {
      shouldRespond = true;
      selectedRule = matchingRules[0]; // Use highest priority rule
      responseText = generateResponse(comment, selectedRule, monitor);
    } else if (monitor.respondToAll) {
      shouldRespond = true;
      responseText = monitor.defaultResponse || 'Thank you for your comment!';
    }
    
    // Record processing time
    const processingTimeMs = Date.now() - startTime;
    
    // If we shouldn't respond, just return
    if (!shouldRespond) {
      return {
        success: true,
        noResponseNeeded: true,
        comment
      };
    }
    
    // Post the response
    const postResult = await postResponse(comment.id, responseText, monitor.accessToken);
    
    // Define comment expiration date (3 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 3);
    
    // Create response record
    const commentResponse = new CommentResponse({
      user: monitor.user,
      monitor: monitor._id,
      rule: selectedRule ? selectedRule._id : null,
      // Add required page info from monitor
      pageId: monitor.pageId,
      pageName: monitor.pageName,
      postId: comment.post_id || comment.id.split('_')[0],
      commentId: comment.id,
      commentText: comment.message,
      commenterName: comment.from.name,
      commenterId: comment.from.id,
      commentCreatedTime: new Date(comment.created_time), // Fixed field name
      responseText,
      success: postResult.success,
      responseMessageId: postResult.success ? postResult.data?.id : null,
      error: postResult.success ? null : { 
        message: postResult.error?.message,
        code: postResult.error?.code
      },
      processingTimeMs,
      sentiment: monitor.responseBehavior?.useSentimentAnalysis ? analyzeSentiment(comment.message) : null,
      expiresAt
    });
    
    await commentResponse.save();
    
    // Update monitor stats
    monitor.stats.commentsResponded = (monitor.stats.commentsResponded || 0) + 1;
    monitor.stats.lastResponseTime = new Date();
    
    // Update average processing time
    if (!monitor.stats.averageResponseTimeMs) {
      monitor.stats.averageResponseTimeMs = processingTimeMs;
    } else {
      // Simple moving average
      monitor.stats.averageResponseTimeMs = 
        (monitor.stats.averageResponseTimeMs * 0.9) + (processingTimeMs * 0.1);
    }
    
    // Update rule stats if a rule was used
    if (selectedRule) {
      selectedRule.stats.timesTriggered = (selectedRule.stats.timesTriggered || 0) + 1;
      selectedRule.stats.lastTriggered = new Date();
      
      // Update sentiment-specific stats
      if (monitor.responseBehavior?.useSentimentAnalysis) {
        const sentiment = analyzeSentiment(comment.message);
        selectedRule.stats.sentimentStats = selectedRule.stats.sentimentStats || {
          positive: 0,
          negative: 0,
          neutral: 0
        };
        selectedRule.stats.sentimentStats[sentiment] += 1;
      }
      
      await selectedRule.save();
    }
    
    await monitor.save();
    
    return {
      success: true,
      responded: true,
      comment,
      response: responseText,
      rule: selectedRule,
      commentResponse
    };
  } catch (error) {
    console.error(`Error processing comment ${comment.id}:`, error);
    
    // Update error stats
    try {
      monitor.stats.totalErrorCount = (monitor.stats.totalErrorCount || 0) + 1;
      monitor.lastError = {
        message: error.message,
        date: new Date(),
        code: error.code || 'PROCESS_ERROR'
      };
      await monitor.save();
      
      // Send notification if enabled
      if (monitor.notifications && monitor.notifications.notifyOnErrors) {
        // Log notification for error (would be expanded in a full implementation)
        console.log(`Error notification for monitor ${monitor.name}: ${error.message}`);
      }
    } catch (saveError) {
      console.error('Error updating monitor with error info:', saveError);
    }
    
    return {
      success: false,
      error: error.message,
      comment
    };
  }
};

// Fetch comments for a post
const fetchCommentsForPost = async (postId, accessToken) => {
  try {
    const response = await axios.get(`https://graph.facebook.com/v18.0/${postId}/comments`, {
      params: {
        fields: 'id,message,from,created_time',
        access_token: accessToken,
        limit: 50 // Reduced from 100 to limit load
      }
    });
    
    let comments = response.data.data || [];
    let nextPageUrl = response.data.paging?.next;
    
    // Fetch additional pages if available
    while (nextPageUrl) {
      const nextPageResponse = await axios.get(nextPageUrl);
      comments = comments.concat(nextPageResponse.data.data || []);
      nextPageUrl = nextPageResponse.data.paging?.next;
      
      // Limit to reasonable number to prevent excessive API calls
      if (comments.length >= 200) break; // Reduced from 500
    }
    
    return comments;
  } catch (error) {
    console.error(`Error fetching comments for post ${postId}:`, error.response?.data || error.message);
    throw error;
  }
};

// Fetch recent posts for a page
const fetchRecentPosts = async (pageId, accessToken, limit = 50) => { // Reduced from 100
  try {
    const response = await axios.get(`https://graph.facebook.com/v18.0/${pageId}/posts`, {
      params: {
        fields: 'id,message,created_time',
        access_token: accessToken,
        limit
      }
    });
    
    return response.data.data || [];
  } catch (error) {
    console.error(`Error fetching posts for page ${pageId}:`, error.response?.data || error.message);
    throw error;
  }
};

// Process a single monitored post
const processPost = async (post, monitor, rules) => {
  try {
    // Skip processing if global rate limit paused
    if (globalRateLimits.isPaused) {
      return {
        postId: post.id,
        skipped: true,
        reason: 'system_paused'
      };
    }
    
    // Fetch comments for this post
    const comments = await fetchCommentsForPost(post.id, monitor.accessToken);
    
    // Update post stats
    post.stats = post.stats || { commentsFound: 0, commentsResponded: 0 };
    post.stats.commentsFound = (post.stats.commentsFound || 0) + comments.length;
    post.lastChecked = new Date();
    
    // Update monitor's total comment count
    monitor.stats.commentsFound = (monitor.stats.commentsFound || 0) + comments.length;
    
    // Sort comments by date (newest first) if prioritizing newer comments
    if (monitor.rateLimiting && monitor.rateLimiting.prioritizeNewerComments) {
      comments.sort((a, b) => new Date(b.created_time) - new Date(a.created_time));
    }
    
    // Process each comment
    const results = [];
    
    for (const comment of comments) {
      // Skip if global rate limit paused
      if (globalRateLimits.isPaused) {
        break;
      }
      
      // Skip older comments if not enabled
      if (!monitor.replyToExistingComments) {
        const commentDate = new Date(comment.created_time);
        const monitorCreatedDate = new Date(monitor.createdAt);
        
        if (commentDate < monitorCreatedDate) {
          continue;
        }
      }
      
      const result = await processComment(comment, monitor, rules);
      results.push(result);
      
      // Short pause between processing to avoid API rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return {
      postId: post.id,
      results
    };
  } catch (error) {
    console.error(`Error processing post ${post.id}:`, error);
    return {
      postId: post.id,
      error: error.message
    };
  }
};

/**
 * Check if user has exceeded their monitor limit
 * @param {ObjectId} userId - The user ID to check
 * @returns {Promise<Boolean>} True if user has exceeded limit, false otherwise
 */
const hasUserExceededMonitorLimit = async (userId) => {
  try {
    // Get user's subscription level
    const user = await User.findById(userId);
    
    if (!user) {
      return true; // User not found, consider as exceeded
    }
    
    // Default limit is 2 active monitors per user
    let maxMonitors = 2;
    
    // Check if user has a membership/subscription that increases this limit
    if (user.membership && user.membership.level) {
      switch (user.membership.level) {
        case 'basic':
          maxMonitors = 3;
          break;
        case 'premium':
          maxMonitors = 5;
          break;
        case 'enterprise':
          maxMonitors = 10;
          break;
        default:
          maxMonitors = 2;
      }
    }
    
    // Count user's active monitors
    const activeMonitorCount = await CommentMonitor.countDocuments({
      user: userId,
      status: 'active'
    });
    
    return activeMonitorCount >= maxMonitors;
  } catch (error) {
    console.error(`Error checking user monitor limit for ${userId}:`, error);
    return true; // Error occurred, be safe and consider as exceeded
  }
};

/**
 * Process a single comment monitor
 * @param {Object} monitor - The monitor document to process
 * @returns {Object} Processing results
 */
const processMonitor = async (monitorId) => {
  let monitor;
  
  try {
    // Get the monitor with populated rules
    if (typeof monitorId === 'string') {
      monitor = await CommentMonitor.findById(monitorId).populate('responseRules');
    } else {
      monitor = monitorId;
      if (!monitor.populated('responseRules')) {
        await monitor.populate('responseRules');
      }
    }
    
    if (!monitor) {
      throw new Error('Monitor not found');
    }
    
    // Skip if monitor is not active
    if (monitor.status !== 'active') {
      return {
        success: false,
        monitorId: monitor._id,
        error: 'Monitor is not active'
      };
    }
    
    // Check if user has exceeded their monitor limit
    const hasExceededLimit = await hasUserExceededMonitorLimit(monitor.user);
    if (hasExceededLimit) {
      return {
        success: false,
        monitorId: monitor._id,
        error: 'User has exceeded monitor limit'
      };
    }
    
    // Check system-wide limits
    if (globalRateLimits.isPaused) {
      return {
        success: false,
        monitorId: monitor._id,
        error: 'System is temporarily paused due to high load'
      };
    }
    
    // Get all response rules for this monitor
    const rules = monitor.responseRules || [];
    
    // List of posts to process
    let postsToProcess = [];
    
    // If monitoring all posts, fetch recent posts from the page
    if (monitor.monitorAllPosts) {
      const recentPosts = await fetchRecentPosts(
        monitor.pageId, 
        monitor.accessToken, 
        Math.min(monitor.maxPostsToMonitor || 20, 50) // Enforce lower limit
      );
      
      // Convert to format used in the posts array
      postsToProcess = recentPosts.map(post => ({
        id: post.id,
        message: post.message,
        createdTime: post.created_time
      }));
    } else {
      // Use the specified posts (limited to 20 max)
      postsToProcess = (monitor.posts || []).slice(0, 20);
    }
    
    // Update monitor stats
    monitor.stats.lastCommentCheckedTime = new Date();
    await monitor.save();
    
    // Process each post
    const results = [];
    
    for (const post of postsToProcess) {
      // Skip if global rate limit paused during processing
      if (globalRateLimits.isPaused) {
        break;
      }
      
      const result = await processPost(post, monitor, rules);
      results.push(result);
    }
    
    // Save updated monitor
    await monitor.save();
    
    // Check the response retention limit and delete excess responses if needed
    await enforceRetentionLimits(monitor);
    
    return {
      success: true,
      monitorId: monitor._id,
      postsProcessed: postsToProcess.length,
      results
    };
  } catch (error) {
    console.error(`Error processing monitor ${monitorId}:`, error);
    
    // Update error information
    if (monitor) {
      monitor.lastError = {
        message: error.message,
        date: new Date(),
        code: error.code || 'PROCESS_ERROR'
      };
      monitor.stats.totalErrorCount = (monitor.stats.totalErrorCount || 0) + 1;
      await monitor.save();
    }
    
    return {
      success: false,
      monitorId: monitor ? monitor._id : monitorId,
      error: error.message
    };
  }
};

/**
 * Enforce response retention limits for a monitor
 * @param {Object} monitor - The monitor to enforce limits for
 */
const enforceRetentionLimits = async (monitor) => {
  try {
    if (!monitor || !monitor.dataManagement || !monitor.dataManagement.responseRetentionLimit) {
      return; // No retention limits to enforce
    }
    
    const limit = Math.min(monitor.dataManagement.responseRetentionLimit, 1000); // Hard cap at 1000
    
    // Count total responses for this monitor
    const totalResponses = await CommentResponse.countDocuments({
      monitor: monitor._id
    });
    
    // If over the limit, delete oldest responses
    if (totalResponses > limit) {
      const excessCount = totalResponses - limit;
      
      // Find oldest responses
      const oldestResponses = await CommentResponse.find({
        monitor: monitor._id
      })
        .sort({ createdAt: 1 })
        .limit(excessCount);
      
      // Delete them
      if (oldestResponses.length > 0) {
        const ids = oldestResponses.map(r => r._id);
        await CommentResponse.deleteMany({ _id: { $in: ids } });
        
        console.log(`Deleted ${ids.length} old responses for monitor ${monitor._id} (retention limit: ${limit})`);
      }
    }
  } catch (error) {
    console.error(`Error enforcing retention limits for monitor ${monitor._id}:`, error);
  }
};

/**
 * Process all active monitors
 * @returns {Array} Results for each monitor
 */
const processAllMonitors = async () => {
  try {
    // Find all active monitors
    const monitors = await CommentMonitor.find({ status: 'active' });
    
    // Limit the number of monitors processed in one batch
    const monitorsToProcess = monitors.slice(0, globalRateLimits.maxMonitorsPerBatch);
    
    console.log(`Processing ${monitorsToProcess.length} active monitors (out of ${monitors.length} total)`);
    
    const results = [];
    
    // Process each monitor
    for (const monitor of monitorsToProcess) {
      // Skip if global rate limit paused
      if (globalRateLimits.isPaused) {
        break;
      }
      
      const result = await processMonitor(monitor);
      results.push(result);
      
      // Short pause between monitors to avoid overloading the system
      await new Promise(resolve => setTimeout(resolve, 2000)); // Increased from 1000ms
    }
    
    return {
      success: true,
      monitorsProcessed: monitorsToProcess.length,
      totalMonitors: monitors.length,
      results
    };
  } catch (error) {
    console.error('Error processing monitors:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Automatic archive check
const checkForAutoArchive = async () => {
  try {
    const monitors = await CommentMonitor.find({ status: 'active' });
    
    for (const monitor of monitors) {
      if (monitor.dataManagement && monitor.dataManagement.autoArchiveAfterDays > 0) {
        // Use the lower of the user setting or system max (14 days)
        const archiveDays = Math.min(monitor.dataManagement.autoArchiveAfterDays, 14);
        
        // Check if monitor has been inactive for the specified period
        const lastActivity = monitor.stats.lastCommentCheckedTime || monitor.updatedAt;
        const inactiveDays = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24);
        
        if (inactiveDays >= archiveDays) {
          console.log(`Auto-archiving monitor ${monitor._id} after ${inactiveDays.toFixed(1)} days of inactivity`);
          
          monitor.status = 'archived';
          await monitor.save();
        }
      }
    }
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error checking for auto-archive:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Response data retention management - now runs more aggressively
const manageResponseRetention = async () => {
  try {
    // Delete all responses older than 7 days regardless of monitor settings
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const oldResponsesResult = await CommentResponse.deleteMany({
      createdAt: { $lt: sevenDaysAgo }
    });
    
    console.log(`Deleted ${oldResponsesResult.deletedCount} responses older than 7 days`);
    
    // Process monitor-specific retention limits
    const monitors = await CommentMonitor.find({
      'dataManagement.responseRetentionLimit': { $gt: 0 }
    });
    
    for (const monitor of monitors) {
      await enforceRetentionLimits(monitor);
    }
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error managing response retention:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Check system load and adjust processing parameters
const checkSystemLoad = async () => {
  try {
    // Count active users with monitors
    const activeUserCount = await CommentMonitor.distinct('user', { status: 'active' }).countDocuments();
    
    // Count total active monitors
    const activeMonitorCount = await CommentMonitor.countDocuments({ status: 'active' });
    
    // Count responses in the last hour
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    const recentResponseCount = await CommentResponse.countDocuments({
      createdAt: { $gte: oneHourAgo }
    });
    
    // Calculate response rate per minute
    const responseRate = recentResponseCount / 60;
    
    console.log(`System load: ${activeUserCount} active users, ${activeMonitorCount} active monitors, ${responseRate.toFixed(2)} responses/minute`);
    
    // Adjust system parameters based on load
    if (responseRate > globalRateLimits.maxResponsesPerMinute * 0.8) {
      // System is near capacity, reduce batch size
      globalRateLimits.maxMonitorsPerBatch = Math.max(3, globalRateLimits.maxMonitorsPerBatch - 2);
      console.log(`High load detected, reducing batch size to ${globalRateLimits.maxMonitorsPerBatch}`);
    } else if (responseRate < globalRateLimits.maxResponsesPerMinute * 0.5) {
      // System has capacity, increase batch size
      globalRateLimits.maxMonitorsPerBatch = Math.min(10, globalRateLimits.maxMonitorsPerBatch + 1);
    }
    
    // If system is overloaded, pause processing temporarily
    if (responseRate > globalRateLimits.maxResponsesPerMinute * 1.2) {
      console.log(`System overloaded! Pausing processing for 5 minutes`);
      globalRateLimits.isPaused = true;
      
      // Resume after 5 minutes
      setTimeout(() => {
        console.log(`Resuming system after load-induced pause`);
        globalRateLimits.isPaused = false;
      }, 5 * 60 * 1000);
    }
    
    return {
      success: true,
      stats: {
        activeUsers: activeUserCount,
        activeMonitors: activeMonitorCount,
        responseRate,
        isPaused: globalRateLimits.isPaused
      }
    };
  } catch (error) {
    console.error('Error checking system load:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Initialize the comment monitor processor
 * Sets up periodic processing and validates database connections
 */
const initialize = () => {
  console.log('Initializing comment monitor processor...');
  
  // Clear any existing intervals to prevent duplicates on hot reloads
  if (processingInterval) {
    clearInterval(processingInterval);
  }
  
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
  
  // Set up periodic processing of comment monitors - every 5 minutes
  processingInterval = setInterval(() => {
    processCommentMonitors();
  }, 5 * 60 * 1000); // Changed from 1 minute to 5 minutes
  
  // Set up automatic cleanup jobs - every hour
  cleanupInterval = setInterval(() => {
    try {
      checkForAutoArchive().catch(err => {
        console.error('Error in auto-archive check:', err);
      });
      
      manageResponseRetention().catch(err => {
        console.error('Error in response retention management:', err);
      });
      
      checkSystemLoad().catch(err => {
        console.error('Error in system load check:', err);
      });
    } catch (error) {
      console.error('Error in comment monitor maintenance tasks:', error);
    }
  }, 60 * 60 * 1000); // Run cleanup tasks hourly
  
  console.log('Comment monitor processor initialized successfully');
};

/**
 * Process all active comment monitors
 * Ensures only one processing run happens at a time
 */
const processCommentMonitors = async () => {
  // Skip if already processing
  if (isProcessing) {
    console.log('Comment monitors already being processed, skipping this run');
    return;
  }
  
  // Skip if system is paused
  if (globalRateLimits.isPaused) {
    console.log('System is currently paused due to high load, skipping this run');
    return;
  }
  
  isProcessing = true;
  
  try {
    console.log('Processing active comment monitors...');
    const result = await processAllMonitors();
    
    if (result.success) {
      console.log(`Finished processing ${result.monitorsProcessed} comment monitors`);
    } else {
      console.error(`Error processing comment monitors: ${result.error}`);
    }
  } catch (error) {
    console.error('Error processing comment monitors:', error);
  } finally {
    isProcessing = false;
  }
};

module.exports = {
  initialize,
  processMonitor,
  processAllMonitors,
  analyzeSentiment,
  checkForAutoArchive,
  manageResponseRetention,
  processCommentMonitors,
  checkSystemLoad // Exported for testing/dashboard
};