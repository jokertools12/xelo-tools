/**
 * Facebook Message Utilities
 * 
 * A comprehensive set of utilities for sending and managing Facebook messages
 * with reliable delivery, retry mechanisms, rate limiting protection, and personalization.
 * Version 2.0 with enhanced reliability, performance metrics, and advanced features.
 */

const axios = require('axios');
const moment = require('moment');

// Configuration constants for Facebook message delivery
const FB_API_VERSION = 'v18.0'; // Facebook Graph API version
const FB_API_VERSION_CONVERSATION = 'v2.9'; // Special version for t_prefixed conversations
const BASE_RETRY_DELAY = 2000; // Base delay for retries in milliseconds
const MAX_RETRIES = 5; // Increased maximum number of retry attempts
const MIN_SAFE_DELAY = 2000; // Minimum safe delay to avoid rate limiting (ms)
const DEFAULT_BATCH_SIZE = 50; // Default batch size for processing multiple messages
const RATE_LIMIT_CODES = [4, 17, 32, 80, 368, 613]; // Facebook rate limit error codes
const TEMPORARY_ERROR_CODES = [1, 2, 190, 200, 506, 1190, 1545]; // Temporary error codes
const INVALID_TOKEN_CODES = [102, 190]; // Error codes for invalid access tokens

// Metrics tracking for system performance analysis
let globalMetrics = {
  totalSent: 0,
  totalFailed: 0,
  totalRetries: 0,
  avgResponseTime: 0,
  rateErrors: 0,
  lastResetTime: Date.now()
};

/**
 * Validates Facebook recipient ID with support for various formats
 * 
 * @param {string} recipientId - The ID to validate
 * @returns {boolean} - Whether the ID is valid
 */
function validateFacebookRecipientId(recipientId) {
  if (!recipientId) return false;
  
  // Clean up the ID
  const cleanId = recipientId.toString().trim();
  
  // Valid formats:
  // 1. Regular numeric IDs (at least 5 digits)
  // 2. t_prefixed conversation IDs (like t_1234567890)
  // 3. Conversation IDs with specific patterns
  
  // Check for valid formats
  return (
    /^\d{5,}$/.test(cleanId) ||                // Regular numeric IDs
    /^t_\d+$/.test(cleanId) ||                 // t_prefixed conversation IDs
    /^(\d+)$/.test(cleanId)                    // Just numbers (user IDs)
  );
}

/**
 * Sends a direct text message to a Facebook user or conversation with enhanced reliability
 * 
 * @param {string} recipientId - The Facebook user ID or conversation ID (t_prefixed) to send the message to
 * @param {string} messageText - The text content of the message
 * @param {string} accessToken - Page access token for authentication
 * @param {string} pageId - The Facebook page ID sending the message (optional for t_prefixed conversation IDs)
 * @param {Object} options - Additional options for message delivery
 * @returns {Object} - Result object with status and metadata
 */
async function sendFacebookDirectMessage(recipientId, messageText, accessToken, pageId, options = {}) {
  const startTime = Date.now();
  const { 
    retryCount = 0, 
    maxRetries = MAX_RETRIES,
    timeout = 20000, // Increased timeout for better reliability
    tag = "ACCOUNT_UPDATE",
    quickReplyButtons = [] // Support for quick reply buttons
  } = options;
  
  // Check if this is a t_prefixed conversation ID - detect early for parameter validation
  const cleanRecipientId = recipientId ? recipientId.toString().trim() : '';
  const isConversation = cleanRecipientId.startsWith('t_');
  
  // Validate input parameters (different validation for regular IDs vs t_prefixed conversation IDs)
  if (isConversation) {
    // For t_prefixed IDs, only conversationId, messageText and accessToken are required (like VB.NET implementation)
    if (!cleanRecipientId || !messageText || !accessToken) {
      console.error('Missing required parameters for sending Facebook t_prefixed conversation message');
      return {
        success: false,
        error: 'Missing required parameters',
        timestamp: new Date().toISOString(),
        metadata: { recipientId: cleanRecipientId }
      };
    }
  } else {
    // For regular recipient IDs, all parameters are required
    if (!recipientId || !messageText || !accessToken || !pageId) {
      console.error('Missing required parameters for sending Facebook message');
      return {
        success: false,
        error: 'Missing required parameters',
        timestamp: new Date().toISOString(),
        metadata: { recipientId, pageId }
      };
    }
  }
  
  try {
    // Validate recipient ID
    if (!validateFacebookRecipientId(cleanRecipientId)) {
      return {
        success: false,
        error: 'Invalid recipient ID format',
        timestamp: new Date().toISOString(),
        metadata: { recipientId, pageId }
      };
    }
    
    let response;
    
    if (isConversation) {
      // For conversation IDs (t_prefixed), exactly match the VB.NET implementation
      // wc.DownloadData($"https://graph.facebook.com/v2.9/{conversationId}?method=POST&message={formattedText}&access_token={accessToken3}")
      console.log(`Using direct conversation endpoint for t_ ID: ${cleanRecipientId}`);
      
      // Build the URL exactly like the VB.NET implementation, including using method=POST as a parameter
      const url = `https://graph.facebook.com/v2.9/${cleanRecipientId}?method=POST&message=${encodeURIComponent(messageText)}&access_token=${encodeURIComponent(accessToken)}`;
      
      console.log(`Sending t_prefixed message using URL format: ${url.substring(0, url.indexOf('access_token=') + 13)}...`);
      
      // Use GET request with the method=POST parameter as done in VB.NET
      response = await axios.get(url, { timeout });
    } else {
      // For regular user IDs, use the standard messages endpoint
      // Construct message payload with messaging_type and tag
      const messageData = {
        messaging_type: "MESSAGE_TAG",
        tag: tag, // Using specified tag or default
        recipient: {
          id: cleanRecipientId
        },
        message: {
          text: messageText
        }
      };
      
          // Handle different types of buttons and quick replies in the exact format Facebook expects
          if (quickReplyButtons && quickReplyButtons.length > 0) {
            // Create empty containers for different button types
            let quickReplies = [];
            let templateButtons = [];
            
            // Sort buttons by type
            quickReplyButtons.forEach(button => {
              // Normalize button data (handle Mongoose documents or plain objects)
              const buttonData = typeof button.toObject === 'function' ? button.toObject() : button;
              
              if (buttonData.type === 'url') {
                // URL buttons go into button template
                templateButtons.push({
                  type: 'web_url',
                  url: buttonData.url,
                  title: buttonData.text
                });
              } else if (buttonData.type === 'postback' || !buttonData.type) {
                // Put postback buttons in template too (this is the key change)
                templateButtons.push({
                  type: 'postback',
                  payload: buttonData.payload || buttonData.text,
                  title: buttonData.text
                });
              } else {
                // Only special quick reply buttons remain separate
                quickReplies.push({
                  content_type: 'text',
                  title: buttonData.text,
                  payload: buttonData.payload || buttonData.text
                });
              }
            });
            
            // Use a template message for all buttons (URL and postback)
            if (templateButtons.length > 0) {
              messageData.message = {
                attachment: {
                  type: 'template',
                  payload: {
                    template_type: 'button',
                    text: messageText,
                    buttons: templateButtons
                  }
                }
              };
              
              // Add quick replies to template message if any exist
              if (quickReplies.length > 0) {
                messageData.message.quick_replies = quickReplies;
              }
            } 
            // Otherwise just use quick replies with text message (fallback for special types)
            else if (quickReplies.length > 0) {
              messageData.message = {
                text: messageText,
                quick_replies: quickReplies
              };
            }
      }
      
      // Send message using Facebook Graph API
      response = await axios({
        method: 'post',
        url: `https://graph.facebook.com/${FB_API_VERSION}/${pageId}/messages`,
        params: { access_token: accessToken },
        data: messageData,
        timeout: timeout // Configurable timeout for FB API requests
      });
    }
    
    // Calculate response time for metrics
    const responseTime = Date.now() - startTime;
    updatePerformanceMetrics(true, responseTime, retryCount);
    
    // Process successful response
    return {
      success: true,
      messageId: response.data.message_id || response.data.id,
      recipientId: cleanRecipientId,
      timestamp: new Date().toISOString(),
      responseTimeMs: responseTime,
      metadata: {
        recipientId: cleanRecipientId,
        pageId,
        messageLength: messageText.length,
        isConversation
      }
    };
  } catch (error) {
    console.error(`Error sending message to ${recipientId}:`, error.message);
    
    // Extract detailed error information
    const errorResponse = error.response?.data?.error;
    const errorCode = errorResponse?.code;
    const errorSubcode = errorResponse?.error_subcode;
    const errorMessage = errorResponse?.message || error.message;
    const errorData = errorResponse?.error_data;
    
    // Update failure metrics
    updatePerformanceMetrics(false, Date.now() - startTime, retryCount, errorCode);
    
    // Check if we should abort immediately (invalid tokens don't benefit from retries)
    if (INVALID_TOKEN_CODES.includes(errorCode)) {
      return {
        success: false,
        error: `${errorMessage} (Invalid or expired token)`,
        code: errorCode,
        subcode: errorSubcode,
        retriesAttempted: retryCount,
        timestamp: new Date().toISOString(),
        aborted: true,
        metadata: {
          recipientId,
          pageId,
          errorDetails: errorResponse
        }
      };
    }
    
    // Handle rate limiting and temporary errors with enhanced retry logic
    if (shouldRetry(error) && retryCount < maxRetries) {
      // Calculate backoff time with exponential increase and random jitter
      const retryDelay = calculateBackoffDelay(retryCount, errorCode);
      
      console.log(`Retrying message to ${recipientId} in ${retryDelay}ms (Attempt ${retryCount + 1}/${maxRetries})`);
      
      // Wait for the backoff period
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      
      // Retry the message with incremented retry counter
      return sendFacebookDirectMessage(recipientId, messageText, accessToken, pageId, {
        ...options,
        retryCount: retryCount + 1,
        maxRetries,
        // Increase timeout slightly with each retry for network fluctuations
        timeout: timeout + (retryCount * 1000)
      });
    }
    
    // Return detailed error information if retries exhausted or shouldn't retry
    return {
      success: false,
      error: errorMessage,
      code: errorCode,
      subcode: errorSubcode,
      retriesAttempted: retryCount,
      timestamp: new Date().toISOString(),
      metadata: {
        recipientId,
        pageId,
        errorData: errorData,
        errorDetails: errorResponse
      }
    };
  }
}

/**
 * Sends a message directly to a Facebook conversation thread
 * Similar to the VB.NET implementation: fb.Post("/t_2523573327708602", par)
 * 
 * @param {string} conversationId - The Facebook conversation ID (t_prefixed)
 * @param {string} messageText - The text content of the message
 * @param {string} accessToken - Page access token for authentication
 * @param {Object} options - Additional options for message delivery
 * @returns {Object} - Result object with status and metadata
 */
async function sendDirectConversationMessage(conversationId, messageText, accessToken, options = {}) {
  const startTime = Date.now();
  const { 
    retryCount = 0, 
    maxRetries = MAX_RETRIES,
    timeout = 20000,
    quickReplyButtons = []
  } = options;
  
  // Validate input parameters - simplified validation for t_prefixed IDs
  if (!conversationId || !messageText || !accessToken) {
    console.error('Missing required parameters for sending Facebook conversation message');
    return {
      success: false,
      error: 'Missing required parameters',
      timestamp: new Date().toISOString(),
      metadata: { conversationId }
    };
  }
  
  try {
    // Clean conversation ID and ensure it has t_ prefix
    const cleanConversationId = conversationId.toString().trim();
    if (!cleanConversationId.startsWith('t_')) {
      console.warn(`Direct conversation message requires t_ prefixed ID, got: ${cleanConversationId}`);
    }
    
    // Check if we have URL buttons - for t_prefixed conversations, we'll need a different approach
    if (quickReplyButtons && quickReplyButtons.length > 0 && quickReplyButtons.some(btn => btn.type === 'url')) {
      console.log(`URL buttons detected for conversation ${cleanConversationId} - using special approach`);
      
      // First send the text message
      let messageResult = await sendTextOnlyConversationMessage(cleanConversationId, messageText, accessToken, timeout);
      
      // Then send a separate message for each URL button
      const urlButtonResults = [];
      for (const button of quickReplyButtons.filter(btn => btn.type === 'url')) {
        const buttonMessage = `${button.text}: ${button.url}`;
        const result = await sendTextOnlyConversationMessage(cleanConversationId, buttonMessage, accessToken, timeout);
        urlButtonResults.push(result);
      }
      
      // Return combined results
      return {
        success: messageResult.success,
        messageId: messageResult.messageId,
        conversationId: cleanConversationId,
        timestamp: new Date().toISOString(),
        buttonResults: urlButtonResults,
        responseTimeMs: Date.now() - startTime
      };
    }
    
    // For text messages or other button types, use standard approach
    return await sendTextOnlyConversationMessage(cleanConversationId, messageText, accessToken, timeout);
  } catch (error) {
    console.error(`Error sending direct conversation message to ${conversationId}:`, error.message);
    
    // Extract detailed error information
    const errorResponse = error.response?.data?.error;
    const errorCode = errorResponse?.code;
    const errorSubcode = errorResponse?.error_subcode;
    const errorMessage = errorResponse?.message || error.message;
    
    // Update failure metrics
    updatePerformanceMetrics(false, Date.now() - startTime, retryCount, errorCode);
    
    // Handle rate limiting and temporary errors with enhanced retry logic
    if (shouldRetry(error) && retryCount < maxRetries) {
      // Calculate backoff time with exponential increase and random jitter
      const retryDelay = calculateBackoffDelay(retryCount, errorCode);
      
      console.log(`Retrying direct conversation message to ${conversationId} in ${retryDelay}ms (Attempt ${retryCount + 1}/${maxRetries})`);
      
      // Wait for the backoff period
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      
      // Retry the message with incremented retry counter
      return sendDirectConversationMessage(conversationId, messageText, accessToken, {
        ...options,
        retryCount: retryCount + 1,
        maxRetries,
        timeout: timeout + (retryCount * 1000)
      });
    }
    
    // Return detailed error information if retries exhausted or shouldn't retry
    return {
      success: false,
      error: errorMessage,
      code: errorCode,
      subcode: errorSubcode,
      retriesAttempted: retryCount,
      timestamp: new Date().toISOString(),
      metadata: {
        conversationId,
        errorDetails: errorResponse
      }
    };
  }
}

/**
 * Helper function to send a text-only message to a conversation
 * 
 * @param {string} conversationId - The Facebook conversation ID (t_prefixed)
 * @param {string} messageText - The text content of the message
 * @param {string} accessToken - Page access token for authentication
 * @param {number} timeout - Request timeout in milliseconds
 * @returns {Object} - Result object with status and metadata
 */
async function sendTextOnlyConversationMessage(conversationId, messageText, accessToken, timeout) {
  const startTime = Date.now();
  
  // Using the exact approach from VB.NET code 
  const url = `https://graph.facebook.com/v2.9/${conversationId}?method=POST&message=${encodeURIComponent(messageText)}&access_token=${encodeURIComponent(accessToken)}`;
  
  console.log(`Sending t_prefixed conversation message using URL: ${url.substring(0, url.indexOf('access_token=') + 13)}...`);
  
  const response = await axios.get(url, { timeout });
  
  // Calculate response time for metrics
  const responseTime = Date.now() - startTime;
  updatePerformanceMetrics(true, responseTime, 0);
  
  // Process successful response
  return {
    success: true,
    messageId: response.data.id,
    conversationId: conversationId,
    timestamp: new Date().toISOString(),
    responseTimeMs: responseTime
  };
}

/**
 * Sends a media message (image or video) to a Facebook user or conversation with enhanced reliability
 * 
 * @param {string} recipientId - The Facebook user ID or conversation ID (t_prefixed) to send the message to
 * @param {string} messageText - Optional text to accompany the media
 * @param {string} mediaUrl - URL to the image or video content
 * @param {string} accessToken - Page access token for authentication
 * @param {string} pageId - The Facebook page ID sending the message
 * @param {Object} options - Additional options for message delivery
 * @returns {Object} - Result object with status and metadata
 */
async function sendFacebookMediaMessage(recipientId, messageText, mediaUrl, accessToken, pageId, options = {}) {
  const startTime = Date.now();
  const { 
    retryCount = 0, 
    maxRetries = MAX_RETRIES, 
    mediaType = detectMediaType(mediaUrl),
    timeout = 30000,  // Longer timeout for media uploads
    tag = "ACCOUNT_UPDATE",
    sendTextSeparately = true, // Whether to send text in separate message
    quickReplyButtons = [] // Support for quick reply buttons
  } = options;
  
  // Check if this is a t_prefixed conversation ID for validation
  const cleanRecipientId = recipientId ? recipientId.toString().trim() : '';
  const isConversation = cleanRecipientId.startsWith('t_');
  
  // Validate input parameters (with different requirements for t_prefixed IDs)
  if (isConversation) {
    // For t_prefixed IDs, only conversationId, mediaUrl and accessToken are required
    if (!cleanRecipientId || !mediaUrl || !accessToken) {
      console.error('Missing required parameters for sending Facebook t_prefixed media message');
      return {
        success: false,
        error: 'Missing required parameters',
        timestamp: new Date().toISOString(),
        metadata: { recipientId: cleanRecipientId }
      };
    }
  } else {
    // For regular IDs, all parameters are required
    if (!recipientId || !mediaUrl || !accessToken || !pageId) {
      console.error('Missing required parameters for sending Facebook media message');
      return {
        success: false,
        error: 'Missing required parameters',
        timestamp: new Date().toISOString(),
        metadata: { recipientId, pageId }
      };
    }
  }
  
  try {
    // Validate recipient ID
    if (!validateFacebookRecipientId(cleanRecipientId)) {
      return {
        success: false,
        error: 'Invalid recipient ID format',
        timestamp: new Date().toISOString(),
        metadata: { recipientId, pageId }
      };
    }
    
    // For conversation IDs, we need a different approach similar to VB.NET implementation
    if (isConversation) {
      console.log(`Using direct conversation endpoint for media message to t_ ID: ${cleanRecipientId}`);
      
      // First, send the text message if needed
      let textMessageResult = null;
      if (messageText && messageText.trim()) {
        textMessageResult = await sendDirectConversationMessage(
          cleanRecipientId,
          messageText,
          accessToken
        );
        
        // Brief delay between text and media
        if (textMessageResult.success) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // For a media message to a conversation ID, use the VB.NET approach with v2.9 API version
      // Using the exact approach from VB.NET code but with link param for media
      const url = `https://graph.facebook.com/v2.9/${cleanRecipientId}?method=POST&link=${encodeURIComponent(mediaUrl)}&access_token=${encodeURIComponent(accessToken)}`;
      
      console.log(`Sending t_prefixed media message using URL: ${url.substring(0, url.indexOf('access_token=') + 13)}...`);
      
      const response = await axios.get(url, { timeout });
      
      // Send URL buttons if any exist
      let buttonResults = [];
      if (quickReplyButtons && quickReplyButtons.length > 0 && quickReplyButtons.some(btn => btn.type === 'url')) {
        for (const button of quickReplyButtons.filter(btn => btn.type === 'url')) {
          const buttonMessage = `${button.text}: ${button.url}`;
          const result = await sendTextOnlyConversationMessage(cleanRecipientId, buttonMessage, accessToken, timeout);
          buttonResults.push(result);
        }
      }
      
      // Calculate response time for metrics
      const responseTime = Date.now() - startTime;
      updatePerformanceMetrics(true, responseTime, retryCount);
      
      // Process successful response
      return {
        success: true,
        messageId: response.data.id,
        textMessageResult: textMessageResult,
        buttonResults: buttonResults.length > 0 ? buttonResults : undefined,
        recipientId: cleanRecipientId,
        timestamp: new Date().toISOString(),
        responseTimeMs: responseTime,
        metadata: {
          recipientId: cleanRecipientId,
          pageId,
          mediaType,
          mediaUrl,
          isConversation
        }
      };
    }
    
    // Standard handling for regular user IDs
    // Initialize media message payload
    const messageData = {
      messaging_type: "MESSAGE_TAG",
      tag: tag,
      recipient: {
        id: cleanRecipientId
      },
      message: {}
    };
    
    // Handle text message separately if enabled and text is provided
    let textMessageResult = null;
    
    // Sort buttons by type
    let quickReplies = [];
    let urlButtons = [];
    
    if (quickReplyButtons && quickReplyButtons.length > 0) {
      quickReplyButtons.forEach(button => {
        if (button.type === 'url') {
          urlButtons.push({
            type: 'web_url',
            url: button.url,
            title: button.text
          });
        } else {
          // Default to text quick reply
          quickReplies.push({
            content_type: 'text',
            title: button.text,
            payload: button.payload || button.text
          });
        }
      });
    }
    
    if (sendTextSeparately && messageText && messageText.trim()) {
      // First handle text message with buttons if needed
      if (urlButtons.length > 0) {
        // Create a button template message for the text and URL buttons
        const buttonMessageData = {
          messaging_type: "MESSAGE_TAG",
          tag: tag,
          recipient: {
            id: cleanRecipientId
          },
          message: {
            attachment: {
              type: 'template',
              payload: {
                template_type: 'button',
                text: messageText,
                buttons: urlButtons
              }
            }
          }
        };
        
        // Add quick replies to button template if needed
        if (quickReplies.length > 0) {
          buttonMessageData.message.quick_replies = quickReplies;
        }
        
        textMessageResult = await axios({
          method: 'post',
          url: `https://graph.facebook.com/${FB_API_VERSION}/${pageId}/messages`,
          params: { access_token: accessToken },
          data: buttonMessageData,
          timeout: timeout
        });
      } else {
        // Just send text with quick replies if any
        const textOptions = { ...options };
        if (quickReplies.length > 0) {
          textOptions.quickReplyButtons = quickReplyButtons.filter(btn => btn.type !== 'url');
        }
        
        textMessageResult = await sendFacebookDirectMessage(
          cleanRecipientId, 
          messageText, 
          accessToken, 
          pageId, 
          textOptions
        );
      }
      
      // If text message succeeds, apply brief delay before sending media to avoid rate limiting
      if (textMessageResult.success) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } else if (messageText && messageText.trim()) {
      // If not sending separately, add text as caption for the media
      // Note: Facebook doesn't always display captions with media, so separated is better
      messageData.message.text = messageText;
    }
    
    // Determine if we should use a generic template to combine image and buttons
    const useGenericTemplate = options.useGenericTemplate === true && mediaType === 'image' && options.urlButtons && options.urlButtons.length > 0;
    
    if (useGenericTemplate) {
      // Create generic template that combines image and buttons
      messageData.message = {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: [
              {
                title: messageText || ' ', // Facebook requires a title, use space if none provided
                image_url: mediaUrl,
                buttons: options.urlButtons.slice(0, 3) // Facebook supports max 3 buttons
              }
            ]
          }
        }
      };
      
      // Add quick reply buttons if appropriate
      if (quickReplies.length > 0) {
        messageData.message.quick_replies = quickReplies;
      }
    } else {
      // Standard media message if not using generic template
      messageData.message = {
        attachment: {
          type: mediaType,
          payload: {
            url: mediaUrl,
            is_reusable: true // Enable reuse of media for efficiency
          }
        }
      };
      
      // Add quick reply buttons if appropriate (not for URL buttons since they were handled above)
      if (quickReplies.length > 0 && (!sendTextSeparately || !messageText || !messageText.trim() || urlButtons.length === 0)) {
        messageData.message.quick_replies = quickReplies;
      }
    }
    
    // Send media message using Facebook Graph API
    const response = await axios({
      method: 'post',
      url: `https://graph.facebook.com/${FB_API_VERSION}/${pageId}/messages`,
      params: { access_token: accessToken },
      data: messageData,
      timeout: timeout // Longer timeout for media uploads
    });
    
    // Calculate response time for metrics
    const responseTime = Date.now() - startTime;
    updatePerformanceMetrics(true, responseTime, retryCount);
    
    // Process successful response
    return {
      success: true,
      messageId: response.data.message_id,
      textMessageResult: textMessageResult, // Include text message result if sent separately
      recipientId: cleanRecipientId,
      timestamp: new Date().toISOString(),
      responseTimeMs: responseTime,
      metadata: {
        recipientId: cleanRecipientId,
        pageId,
        mediaType,
        mediaUrl
      }
    };
  } catch (error) {
    console.error(`Error sending media message to ${recipientId}:`, error.message);
    
    // Extract detailed error information
    const errorResponse = error.response?.data?.error;
    const errorCode = errorResponse?.code;
    const errorSubcode = errorResponse?.error_subcode;
    const errorMessage = errorResponse?.message || error.message;
    const errorData = errorResponse?.error_data;
    
    // Update failure metrics
    updatePerformanceMetrics(false, Date.now() - startTime, retryCount, errorCode);
    
    // Check if we should abort immediately (invalid tokens don't benefit from retries)
    if (INVALID_TOKEN_CODES.includes(errorCode)) {
      return {
        success: false,
        error: `${errorMessage} (Invalid or expired token)`,
        code: errorCode,
        subcode: errorSubcode,
        retriesAttempted: retryCount,
        timestamp: new Date().toISOString(),
        aborted: true,
        metadata: {
          recipientId,
          pageId,
          mediaType,
          mediaUrl,
          errorDetails: errorResponse
        }
      };
    }
    
    // Handle rate limiting and temporary errors with enhanced retry logic
    if (shouldRetry(error) && retryCount < maxRetries) {
      // Calculate backoff time with exponential increase and random jitter
      const retryDelay = calculateBackoffDelay(retryCount, errorCode);
      console.log(`Retrying media message to ${recipientId} in ${retryDelay}ms (Attempt ${retryCount + 1}/${maxRetries})`);
      
      // Wait for the backoff period
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      
      // For media messages, potentially use different approach after certain retries
      // For example, try without accompanying text, or vice versa
      const modifiedOptions = { ...options, retryCount: retryCount + 1 };
      
      // After 2 retries, try different approach if applicable
      if (retryCount >= 2) {
        // Toggle sendTextSeparately setting to try alternative approach
        modifiedOptions.sendTextSeparately = !sendTextSeparately;
        // Increase timeout with each retry
        modifiedOptions.timeout = timeout + (2000 * retryCount);
      }
      
      // Retry the message with updated options
      return sendFacebookMediaMessage(
        cleanRecipientId,
        messageText,
        mediaUrl,
        accessToken,
        pageId,
        modifiedOptions
      );
    }
    
    // Return detailed error information if retries exhausted or shouldn't retry
    return {
      success: false,
      error: errorMessage,
      code: errorCode,
      subcode: errorSubcode,
      retriesAttempted: retryCount,
      timestamp: new Date().toISOString(),
      metadata: {
        recipientId,
        pageId,
        mediaType,
        mediaUrl,
        errorData: errorData,
        errorDetails: errorResponse
      }
    };
  }
}
/**
 * Personalizes message text by replacing template variables with recipient-specific values
 * Enhanced with validation, fallbacks, and support for more variables
 * 
 * @param {Object} message - The message configuration with personalization settings
 * @param {Object} recipient - The recipient object with data for personalization
 * @returns {string} - The personalized message text
 */
function personalizeMessageText(message, recipient) {
  if (!message || !message.messageText) {
    return message?.messageText || '';
  }
  
  // Create a safe copy of the message text to avoid modifying the original
  let personalized = message.messageText;
  
  // Auto-detect template variables in the message
  const hasTemplateVariables = /\[\[[\w]+\]\]/g.test(personalized);
  
  // Skip personalization if explicitly disabled and no variables are detected
  if (message.personalizeMessage === false && !hasTemplateVariables) {
    return personalized;
  }
  
  const personalization = message.messagePersonalization || {};
  
  try {
    // Validate recipient object to avoid errors
    if (!recipient) {
      console.warn('Invalid recipient object for personalization');
      // Continue with personalization, but with limited capabilities
    }
    
    // Determine if name variables are used in the message
    const hasNameVariable = /\[\[name\]\]|\[\[firstName\]\]|\[\[fullName\]\]/g.test(personalized);
    
    // Process name variables (either when explicitly enabled or when they exist in the message)
    if (hasNameVariable || personalization.includeUserName) {
      // Get recipient name with enhanced lookup
      let recipientName = '';
      
      if (recipient) {
        // Check for name in recipient object directly
        if (recipient.name) {
          recipientName = recipient.name;
        } 
        // Check for first_name and last_name fields (common in Facebook API responses)
        else if (recipient.first_name) {
          recipientName = recipient.first_name;
          if (recipient.last_name) {
            recipientName += ' ' + recipient.last_name;
          }
        }
        // Check if recipient has profile object
        else if (recipient.profile && recipient.profile.name) {
          recipientName = recipient.profile.name;
        }
        // Check if recipient has user object
        else if (recipient.user && recipient.user.name) {
          recipientName = recipient.user.name;
        }
        // Check if recipient is an ID and we have metadata for it
        else if (typeof recipient.id === 'string' && message.recipientMetadata) {
          // Try to get name from recipientMetadata in message object (used in multiple recipient scenario)
          recipientName = message.recipientMetadata[recipient.id] || '';
        }
        // Check if the recipient itself is an ID string and we have metadata
        else if (typeof recipient === 'string' && message.recipientMetadata) {
          recipientName = message.recipientMetadata[recipient] || '';
        }
        // Last resort - check for display name or username
        else if (recipient.displayName || recipient.username) {
          recipientName = recipient.displayName || recipient.username;
        }
      }
      
      // If using batch send with recipient metadata - ENHANCED lookup logic
      if (!recipientName && message.recipientMetadata) {
        console.log('Checking recipient metadata for name, metadata keys:', 
          Object.keys(message.recipientMetadata).length > 0 ? 
          Object.keys(message.recipientMetadata).slice(0, 5).join(', ') + '...' : 
          'none');
        
        // Try multiple approaches to find recipient ID
        let recipientId = null;
        
        // Approach 1: Direct string ID
        if (typeof recipient === 'string') {
          recipientId = recipient;
        } 
        // Approach 2: Common ID properties in objects
        else if (recipient && typeof recipient === 'object') {
          // Check all possible ID fields
          recipientId = recipient.id || recipient.recipientId || recipient.userId || 
                       recipient.user_id || recipient.fbid || recipient.fb_id ||
                       recipient._id;
          
          // If still no ID but recipient has a PSID field (common in FB)
          if (!recipientId && recipient.PSID) {
            recipientId = recipient.PSID;
          }
          
          // Try to get ID from nested objects
          if (!recipientId && recipient.user && recipient.user.id) {
            recipientId = recipient.user.id;
          }
          
          // If recipient has a 'recipient' property (common in FB message structure)
          if (!recipientId && recipient.recipient && recipient.recipient.id) {
            recipientId = recipient.recipient.id;
          }
        }
        
        // Extra logging to debug
        console.log(`Found potential recipient ID: ${recipientId || 'none'}`);
        
        // First try: direct match with the ID
        if (recipientId && message.recipientMetadata[recipientId]) {
          recipientName = message.recipientMetadata[recipientId];
          console.log(`Found name in metadata using direct ID match: "${recipientName}"`);
        }
        // Second try: if ID is numeric, try as string
        else if (recipientId && message.recipientMetadata[recipientId.toString()]) {
          recipientName = message.recipientMetadata[recipientId.toString()];
          console.log(`Found name in metadata using ID.toString(): "${recipientName}"`);
        }
        // Third try: if we have an object recipient but no specific ID was found
        else if (recipient && typeof recipient === 'object') {
          // Try to match any ID in metadata with any property in recipient
          for (const prop in recipient) {
            if (recipient[prop] && message.recipientMetadata[recipient[prop]]) {
              recipientName = message.recipientMetadata[recipient[prop]];
              console.log(`Found name in metadata using recipient.${prop}: "${recipientName}"`);
              break;
            }
          }
          
          // If still no name, iterate through metadata to find a match
          if (!recipientName) {
            for (const metaId in message.recipientMetadata) {
              // Check if any recipient property matches this metadata key
              for (const prop in recipient) {
                const value = recipient[prop];
                if (value && (value.toString() === metaId || metaId.includes(value.toString()))) {
                  recipientName = message.recipientMetadata[metaId];
                  console.log(`Found name by scanning metadata keys, matched on ${prop}: "${recipientName}"`);
                  break;
                }
              }
              if (recipientName) break;
            }
          }
        }
      }
      
      // Try to get name from different sources with specialized extraction
      if (!recipientName) {
        // First try recipientDetails object which often has rich name information
        if (message.recipientDetails) {
          console.log('Checking recipientDetails object for name information');
          recipientName = extractNameFromRecipientDetails(message.recipientDetails, recipient);
          
          if (recipientName) {
            console.log(`Name extraction: Found name in recipientDetails: "${recipientName}"`);
          }
        }
        
        // Next try messageRecipients if available (contains Facebook API user data)
        if (!recipientName && message.messageRecipients) {
          console.log('Checking messageRecipients array for recipient info');
          // Try to find the recipient in the recipients array by ID
          let recipientId = null;
          
          if (typeof recipient === 'string') {
            recipientId = recipient;
          } else if (recipient?.id) {
            recipientId = recipient.id;
          }
          
          if (recipientId && Array.isArray(message.messageRecipients)) {
            const matchedRecipient = message.messageRecipients.find(r => 
              r.id === recipientId || 
              r.recipient_id === recipientId || 
              r.user_id === recipientId);
              
            if (matchedRecipient) {
              if (matchedRecipient.name) {
                recipientName = matchedRecipient.name;
              } else if (matchedRecipient.first_name) {
                recipientName = matchedRecipient.first_name;
                if (matchedRecipient.last_name) recipientName += ' ' + matchedRecipient.last_name;
              }
              
              if (recipientName) {
                console.log(`Name extraction: Found in messageRecipients array: "${recipientName}"`);
              }
            }
          }
        }
        
        // Special handling for broadcast mode - where we're sending to all users
        if (!recipientName && (message.broadcastMode || message.isBroadcast)) {
          console.log('Message is in broadcast mode - checking for special recipient data');
          
          // For broadcast mode, try using recipient name directly from the recipient object
          if (typeof recipient === 'object' && recipient !== null) {
            recipientName = extractNameFromRecipientObject(recipient);
            
            if (recipientName) {
              console.log(`Name extraction: Using direct recipient object for broadcast: "${recipientName}"`);
            }
          }
        }
      }
      
      // Helper function to recursively extract name from recipientDetails
      function extractNameFromRecipientDetails(details, targetRecipient) {
        if (!details) return null;
        
        // Case 1: Direct lookup by ID
        if (typeof targetRecipient === 'string' && details[targetRecipient]) {
          const detail = details[targetRecipient];
          return extractNameFromRecipientObject(detail);
        }
        
        // Case 2: Lookup by recipient.id
        if (targetRecipient?.id && details[targetRecipient.id]) {
          const detail = details[targetRecipient.id]; 
          return extractNameFromRecipientObject(detail);
        }
        
        // Case 3: Search through all details for matching properties
        if (typeof targetRecipient === 'object' && targetRecipient !== null) {
          // Check each ID field in the recipient
          const idFields = ['id', 'recipientId', 'userId', 'fbid', 'PSID'];
          
          for (const field of idFields) {
            if (targetRecipient[field] && details[targetRecipient[field]]) {
              const detail = details[targetRecipient[field]];
              const name = extractNameFromRecipientObject(detail);
              if (name) return name;
            }
          }
          
          // If no match by ID, try to match by scanning all entries
          for (const id in details) {
            const detail = details[id];
            
            // Try to match any property in recipient to this detail's ID
            for (const prop in targetRecipient) {
              if (targetRecipient[prop] && (
                  targetRecipient[prop].toString() === id || 
                  id.includes(targetRecipient[prop].toString())
              )) {
                const name = extractNameFromRecipientObject(detail);
                if (name) {
                  console.log(`Found match in recipientDetails by property ${prop}`);
                  return name;
                }
              }
            }
          }
        }
        
        // Case 4: If we have only one entry in details, use it (common in single-recipient scenarios)
        const detailKeys = Object.keys(details);
        if (detailKeys.length === 1) {
          const onlyDetail = details[detailKeys[0]];
          return extractNameFromRecipientObject(onlyDetail);
        }
        
        return null;
      }
      
      // Helper function to extract name from a recipient object with various formats
      function extractNameFromRecipientObject(obj) {
        if (!obj) return null;
        
        // Direct name properties
        if (obj.name) return obj.name;
        if (obj.fullName) return obj.fullName;
        if (obj.displayName) return obj.displayName;
        
        // First name + last name
        if (obj.first_name) {
          return obj.last_name ? `${obj.first_name} ${obj.last_name}` : obj.first_name;
        }
        
        // Check nested objects
        if (obj.profile && obj.profile.name) return obj.profile.name;
        if (obj.user && obj.user.name) return obj.user.name;
        if (obj.sender && obj.sender.name) return obj.sender.name;
        if (obj.recipient && obj.recipient.name) return obj.recipient.name;
        if (obj.from && obj.from.name) return obj.from.name;
        
        // If the object is a string and looks like a name (not an ID)
        if (typeof obj === 'string' && obj.length > 0 && !/^\d+$/.test(obj)) {
          return obj;
        }
        
        return null;
      }
      
      // Enhanced name extraction logic with less verbose logging
      console.log('Attempting to extract recipient name. Data type:', typeof recipient, 
                 'Is array:', Array.isArray(recipient), 
                 'Has metadata:', message.recipientMetadata ? true : false);
      
      // Comprehensive recipient name extraction from all possible paths
      // Try direct name properties first (most common case)
      if (recipient && recipient.name) {
        recipientName = recipient.name;
        console.log(`Name extraction: Found direct name property: "${recipientName}"`);
      }
      
      // Try first_name/last_name (common in FB API)
      if (!recipientName && recipient && recipient.first_name) {
        recipientName = recipient.first_name;
        if (recipient.last_name) recipientName += ' ' + recipient.last_name;
        console.log(`Name extraction: Found first/last name: "${recipientName}"`);
      }
      
      // Check nested objects
      if (!recipientName && recipient) {
        // Try profile
        if (recipient.profile && recipient.profile.name) {
          recipientName = recipient.profile.name;
          console.log(`Name extraction: Found in profile: "${recipientName}"`);
        }
        // Try user object
        else if (recipient.user && recipient.user.name) {
          recipientName = recipient.user.name;
          console.log(`Name extraction: Found in user object: "${recipientName}"`);
        }
        // Try from object (common in message objects)
        else if (recipient.from && recipient.from.name) {
          recipientName = recipient.from.name;
          console.log(`Name extraction: Found in from object: "${recipientName}"`);
        }
        // Try sender
        else if (recipient.sender && recipient.sender.name) {
          recipientName = recipient.sender.name;
          console.log(`Name extraction: Found in sender object: "${recipientName}"`);
        }
        // Try display name
        else if (recipient.displayName) {
          recipientName = recipient.displayName;
          console.log(`Name extraction: Found display name: "${recipientName}"`);
        }
        // Try username
        else if (recipient.username) {
          recipientName = recipient.username;
          console.log(`Name extraction: Found username: "${recipientName}"`);
        }
      }
      
      // Check metadata mapping (crucial for batch message processing)
      if (!recipientName && message.recipientMetadata) {
        let foundId = null;
        
        if (typeof recipient === 'string') {
          foundId = recipient;
        } 
        else if (recipient?.id) {
          foundId = recipient.id;
        }
        else if (recipient?.recipientId) {
          foundId = recipient.recipientId;
        }
        
        if (foundId && message.recipientMetadata[foundId]) {
          recipientName = message.recipientMetadata[foundId];
          console.log(`Name extraction: Found in metadata by ID ${foundId}: "${recipientName}"`);
        }
      }
      
      // Check array of recipients (batch message case)
      if (!recipientName && Array.isArray(recipient) && recipient.length > 0) {
        const firstRecipient = recipient[0];
        
        if (typeof firstRecipient === 'object') {
          if (firstRecipient.name) {
            recipientName = firstRecipient.name;
            console.log(`Name extraction: Found name in first array item: "${recipientName}"`);
          } 
          else if (firstRecipient.id && message.recipientMetadata && message.recipientMetadata[firstRecipient.id]) {
            recipientName = message.recipientMetadata[firstRecipient.id];
            console.log(`Name extraction: Found in metadata via first array item ID: "${recipientName}"`);
          }
        } 
        else if (typeof firstRecipient === 'string' && message.recipientMetadata) {
          recipientName = message.recipientMetadata[firstRecipient];
          console.log(`Name extraction: Found in metadata via string ID: "${recipientName}"`);
        }
      }
      
      // Check for Mongoose/MongoDB document structure with enhanced detection
      if (!recipientName && recipient && typeof recipient === 'object') {
        // Detect Mongoose/MongoDB document by checking for special properties or ObjectId
        const isMongooseDoc = Object.keys(recipient).some(key => 
          key.startsWith('$__') || key === 'isNew' || key === '_doc' || key === 'errors'
        );
        
        const hasObjectId = recipient._id && 
                          (typeof recipient._id === 'object' || 
                           (typeof recipient._id === 'string' && /^[0-9a-fA-F]{24}$/.test(recipient._id)));
        
        if (isMongooseDoc || hasObjectId) {
          console.log('Name extraction: Detected MongoDB/Mongoose document object');
          
          // Try multiple approaches for MongoDB documents
          
          // Approach 1: Check _doc property which contains the raw document data
          if (recipient._doc) {
            if (recipient._doc.name) {
              recipientName = recipient._doc.name;
              console.log(`Name extraction: Found name in _doc property: "${recipientName}"`);
            } else if (recipient._doc.user && recipient._doc.user.name) {
              recipientName = recipient._doc.user.name;
              console.log(`Name extraction: Found name in _doc.user property: "${recipientName}"`);
            } else if (recipient._doc.recipientName) {
              recipientName = recipient._doc.recipientName;
              console.log(`Name extraction: Found recipientName in _doc property: "${recipientName}"`);
            }
          }
          
          // Approach 2: Try direct property access which might invoke Mongoose getters
          if (!recipientName) {
            // Array of possible name properties in order of preference
            const nameProps = ['name', 'fullName', 'displayName', 'username', 'firstName', 'recipientName'];
            for (const prop of nameProps) {
              if (recipient[prop]) {
                recipientName = recipient[prop];
                console.log(`Name extraction: Found ${prop} using direct property access: "${recipientName}"`);
                break;
              }
            }
          }
          
          // Approach 3: Check nested user object with direct property access
          if (!recipientName && recipient.user) {
            if (typeof recipient.user.get === 'function') {
              // If user is also a Mongoose document with get method
              try {
                recipientName = recipient.user.get('name');
                if (recipientName) {
                  console.log(`Name extraction: Found name using user.get(): "${recipientName}"`);
                }
              } catch (e) {
                // Ignore errors with get method
              }
            }
            
            if (!recipientName && recipient.user.name) {
              recipientName = recipient.user.name;
              console.log(`Name extraction: Found name in user property: "${recipientName}"`);
            }
          }
          
          // Approach 4: Try toObject() or toJSON() conversion
          if (!recipientName) {
            if (typeof recipient.toObject === 'function') {
              try {
                const plainObject = recipient.toObject();
                recipientName = plainObject.name || plainObject.user?.name || 
                               plainObject.fullName || plainObject.displayName || 
                               plainObject.firstName || plainObject.recipientName;
                
                if (recipientName) {
                  console.log(`Name extraction: Found name in toObject() result: "${recipientName}"`);
                }
              } catch (err) {
                console.log('Error in toObject():', err.message);
              }
            } else if (typeof recipient.toJSON === 'function') {
              try {
                const jsonObject = recipient.toJSON();
                recipientName = jsonObject.name || jsonObject.user?.name || 
                               jsonObject.fullName || jsonObject.displayName || 
                               jsonObject.firstName || jsonObject.recipientName;
                
                if (recipientName) {
                  console.log(`Name extraction: Found name in toJSON() result: "${recipientName}"`);
                }
              } catch (err) {
                console.log('Error in toJSON():', err.message);
              }
            }
          }
        }
      }
      
      // Enhanced specialized handling for MongoDB IDs in recipientMetadata
      if (!recipientName && message.recipientMetadata && recipient) {
        console.log('Attempting specialized MongoDB ID matching with recipientMetadata');
        
        // Build a comprehensive list of possible IDs to check
        let possibleIds = [];
        
        // Handle different recipient types
        if (typeof recipient === 'object' && recipient !== null) {
          // MongoDB specific: _id could be ObjectId or string
          if (recipient._id) {
            // Convert ObjectId to string if needed
            const mongoId = typeof recipient._id.toString === 'function' 
              ? recipient._id.toString() 
              : recipient._id;
            
            possibleIds.push(mongoId);
            console.log(`Checking MongoDB _id as string: ${mongoId}`);
            
            // Also try without quotes if it's in the format "5f9d88b7c6a..." (common in exported data)
            if (typeof mongoId === 'string' && mongoId.startsWith('"') && mongoId.endsWith('"')) {
              possibleIds.push(mongoId.substring(1, mongoId.length - 1));
            }
          }
          
          // Standard ID field
          if (recipient.id) {
            possibleIds.push(recipient.id.toString());
          }
          
          // Also add recipientId field if present
          if (recipient.recipientId) {
            possibleIds.push(recipient.recipientId.toString());
          }
          
          // Check all object keys that might be IDs
          const idFields = ['userId', 'user_id', 'fbid', 'psid', 'PSID'];
          for (const field of idFields) {
            if (recipient[field]) {
              possibleIds.push(recipient[field].toString());
            }
          }
        } else if (typeof recipient === 'string') {
          possibleIds.push(recipient);
        }
        
        // Try each possible ID against recipientMetadata with detailed logging
        if (possibleIds.length > 0) {
          console.log(`Checking ${possibleIds.length} possible IDs against recipientMetadata keys:`, 
            Object.keys(message.recipientMetadata).length > 0 ? 
            Object.keys(message.recipientMetadata).slice(0, 5).join(', ') + '...' : 
            'none');
          
          // First try exact matches
          for (const possibleId of possibleIds) {
            if (message.recipientMetadata[possibleId]) {
              recipientName = message.recipientMetadata[possibleId];
              console.log(`Name extraction: Found exact match in recipientMetadata with ID ${possibleId}: "${recipientName}"`);
              break;
            }
          }
          
          // If still no match, try substring matches (for ObjectId cases)
          if (!recipientName) {
            const metadataKeys = Object.keys(message.recipientMetadata);
            for (const possibleId of possibleIds) {
              // Skip short IDs to avoid false matches
              if (possibleId.length < 10) continue;
              
              for (const key of metadataKeys) {
                if (key.includes(possibleId) || possibleId.includes(key)) {
                  recipientName = message.recipientMetadata[key];
                  console.log(`Name extraction: Found partial match in recipientMetadata between ${possibleId} and ${key}: "${recipientName}"`);
                  break;
                }
              }
              if (recipientName) break;
            }
          }
        }
      }
      
      // Enhanced broadcast mode handling and ultimate fallbacks
      if (!recipientName) {
        console.log('All direct lookups failed, applying enhanced fallbacks');
        
        // Special case for broadcast mode with recipient list
        if ((message.broadcastMode || message.isBroadcast) && message.recipients && message.recipientMetadata) {
          console.log('Attempting special broadcast mode handling');
          
          // For broadcast mode, we may have a list of recipients with a matching recipientMetadata map
          // Try to find this specific recipient in the recipients array
          let recipientId = null;
          
          if (typeof recipient === 'object' && recipient !== null) {
            recipientId = recipient.id || recipient._id || recipient.recipientId;
          } else if (typeof recipient === 'string') {
            recipientId = recipient;
          }
          
          if (recipientId) {
            const recipientIndex = message.recipients.findIndex(r => {
              if (typeof r === 'string') return r === recipientId;
              return r.id === recipientId || r._id === recipientId || r.recipientId === recipientId;
            });
            
            // If we found the recipient in the array and have matching metadata
            if (recipientIndex >= 0) {
              // First try direct mapping
              if (message.recipientNames && message.recipientNames[recipientIndex]) {
                recipientName = message.recipientNames[recipientIndex];
                console.log(`Name extraction: Found in recipientNames array at index ${recipientIndex}: "${recipientName}"`);
              } 
              // Try looking up by array index as a string key
              else if (message.recipientMetadata && message.recipientMetadata[recipientIndex.toString()]) {
                recipientName = message.recipientMetadata[recipientIndex.toString()];
                console.log(`Name extraction: Found by array index in recipientMetadata: "${recipientName}"`);
              }
            }
          }
        }
        
          // Ultimate fallback options in order of preference - BUT NO HARDCODED DEFAULT
          if (!recipientName) {
            const fallbackOptions = [
              // Message specific default name
              { source: message.defaultRecipientName, logMessage: 'message.defaultRecipientName' },
              
              // Broadcast mode default
              { 
                source: (message.broadcastMode || message.isBroadcast) ? message.defaultUserName : null,
                logMessage: 'broadcast mode defaultUserName' 
              },
              
              // Generic recipient name
              { source: message.recipientName, logMessage: 'message.recipientName' },
              
              // Single entry in metadata (common for single recipient)
              { 
                source: (message.recipientMetadata && Object.keys(message.recipientMetadata).length === 1) ? 
                       message.recipientMetadata[Object.keys(message.recipientMetadata)[0]] : null,
                logMessage: 'single entry in recipientMetadata'
              }
              
              // REMOVED: Hardcoded default name as per user request
              // We want to preserve the original [[name]] placeholder when no name is found
            ];
            
            // Try each fallback option in order
            for (const option of fallbackOptions) {
              if (option.source) {
                recipientName = option.source;
                console.log(`Name extraction: Using fallback from ${option.logMessage}: "${recipientName}"`);
                break;
              }
            }
            
            // If still no name, log that we'll preserve the original placeholder
            if (!recipientName) {
              console.log('Name extraction: No fallback found, preserving original [[name]] placeholder as required');
            }
          }
      }
      
      // FINAL CHECK: Replace all name variables with the recipient's name or PRESERVE THE ORIGINAL PLACEHOLDER
      if (recipientName) {
        console.log(`Name variables will be replaced with: "${recipientName}"`);
        personalized = personalized
          .replace(/\[\[name\]\]/g, recipientName)
          .replace(/\[\[firstName\]\]/g, recipientName.split(' ')[0])
          .replace(/\[\[fullName\]\]/g, recipientName);
      } else {
        // CRITICAL FIX: PRESERVE the original [[name]] placeholder when no name is found
        // This ensures messages maintain their personalization for downstream systems
        console.warn('⚠️ WARNING: No recipient name found - original [[name]] placeholder will be preserved!');
        // We don't replace anything here, keeping the original [[name]] in the text
      }
    }
    
    // Replace last interaction placeholder if enabled
    if (personalization.includeLastInteraction) {
      const lastInteraction = recipient.lastInteraction;
      if (lastInteraction) {
        const formattedDate = moment(lastInteraction).format('YYYY-MM-DD');
        const relativeTime = moment(lastInteraction).fromNow();
        
        personalized = personalized
          .replace(/\[\[lastInteraction\]\]/g, formattedDate)
          .replace(/\[\[lastInteractionRelative\]\]/g, relativeTime);
      } else {
        // Replace with empty string if last interaction not available
        personalized = personalized
          .replace(/\[\[lastInteraction\]\]/g, '')
          .replace(/\[\[lastInteractionRelative\]\]/g, '');
      }
    }
    
    // Process custom variables if any
    if (personalization.customVariables && Array.isArray(personalization.customVariables)) {
      personalization.customVariables.forEach(variable => {
        if (variable && variable.name && variable.value !== undefined) {
          const pattern = new RegExp(`\\[\\[${variable.name}\\]\\]`, 'g');
          personalized = personalized.replace(pattern, variable.value || '');
        }
      });
    }
    
  // Dynamic values based on current time/date
  const now = new Date();
  personalized = personalized
    // Support both the original and frontend variable formats for compatibility
    .replace(/\[\[currentDate\]\]/g, moment(now).format('YYYY-MM-DD'))
    .replace(/\[\[date\]\]/g, moment(now).format('YYYY-MM-DD'))
    .replace(/\[\[currentTime\]\]/g, moment(now).format('HH:mm'))
    .replace(/\[\[time\]\]/g, moment(now).format('HH:mm'))
    .replace(/\[\[currentDay\]\]/g, moment(now).format('dddd'));
    
  // Add support for greeting variable based on time of day (matches frontend implementation)
  const hour = now.getHours();
  let greeting = 'مساء النور'; // Good evening default
  if (hour < 12) greeting = 'صباح الخير'; // Good morning
  else if (hour < 17) greeting = 'مساء الخير'; // Good afternoon
  
  personalized = personalized.replace(/\[\[greeting\]\]/g, greeting);
    
    // Handle message for empty values to avoid awkward grammar
    // Replace phrases like "Hi, [[name]]!" with just "Hi!" when name is empty
    personalized = personalized
      .replace(/,\s*\[\[.*?\]\]/g, '') // Remove commas followed by empty placeholders
      .replace(/\s+,/g, ',') // Remove spaces before commas
      .replace(/\s{2,}/g, ' ') // Replace multiple spaces with single space
      .trim();
    
    // Clean up any remaining unmatched placeholders EXCEPT name variables that might be preserved
    // We want to keep [[name]] if no name was found, but clean up other variables
    const nameVariables = ['name', 'firstName', 'fullName'];
    const nameVariablePattern = new RegExp(`\\[\\[(${nameVariables.join('|')})\\]\\]`, 'g');
    const otherVariablePattern = new RegExp(`\\[\\[(?!(${nameVariables.join('|')})).*?\\]\\]`, 'g');
    
    // Only clean up non-name variables, preserving name placeholders when needed
    personalized = personalized.replace(otherVariablePattern, '');
    
    return personalized;
  } catch (error) {
    console.error('Error in message personalization:', error);
    return message.messageText; // Return original message if personalization fails
  }
}

/**
 * Sends a media message directly to a Facebook conversation thread
 * Similar to the VB.NET implementation for images: fb.Post($"/{cellValue}", par)
 * 
 * @param {string} conversationId - The Facebook conversation ID (t_prefixed)
 * @param {string} messageText - Optional text to accompany the media
 * @param {string} mediaUrl - URL to the image or video content
 * @param {string} accessToken - Page access token for authentication
 * @param {string} mediaType - Type of media ('image' or 'video')
 * @param {Object} options - Additional options for message delivery
 * @returns {Object} - Result object with status and metadata
 */
async function sendDirectConversationMediaMessage(conversationId, messageText, mediaUrl, accessToken, mediaType = 'image', options = {}) {
  const startTime = Date.now();
  const { 
    retryCount = 0, 
    maxRetries = MAX_RETRIES,
    timeout = 30000,
    quickReplyButtons = []
  } = options;
  
  // Validate input parameters (simplified for t_prefixed IDs)
  if (!conversationId || !mediaUrl || !accessToken) {
    console.error('Missing required parameters for sending Facebook conversation media message');
    return {
      success: false,
      error: 'Missing required parameters',
      timestamp: new Date().toISOString(),
      metadata: { conversationId, mediaType }
    };
  }
  
  try {
    // Clean conversation ID and ensure it has t_ prefix
    const cleanConversationId = conversationId.toString().trim();
    if (!cleanConversationId.startsWith('t_')) {
      console.warn(`Direct conversation media message requires t_ prefixed ID, got: ${cleanConversationId}`);
    }
    
    // This would ideally upload the file first like in VB.NET:
    // fbmediaobject = New FacebookMediaObject() With {.ContentType = "image/png", .FileName = Path.GetFileName(path_)}.SetValue(File.ReadAllBytes(path_))
    // But for now, we'll use the mediaUrl directly as that's what we have
    
    // Create params for the request - using method=POST approach for t_prefixed IDs
    // Use the v2.9 API version to match the VB.NET code
    const url = `https://graph.facebook.com/v2.9/${cleanConversationId}?method=POST${messageText ? `&message=${encodeURIComponent(messageText)}` : ''}&link=${encodeURIComponent(mediaUrl)}&access_token=${encodeURIComponent(accessToken)}`;
    
    console.log(`Sending t_prefixed media message using URL: ${url.substring(0, url.indexOf('access_token=') + 13)}...`);
    
    // Send the request directly to the conversation ID using GET with method=POST parameter
    const response = await axios.get(url, { timeout });
    
    // Send URL buttons if any exist
    let buttonResults = [];
    if (quickReplyButtons && quickReplyButtons.length > 0 && quickReplyButtons.some(btn => btn.type === 'url')) {
      for (const button of quickReplyButtons.filter(btn => btn.type === 'url')) {
        const buttonMessage = `${button.text}: ${button.url}`;
        const result = await sendTextOnlyConversationMessage(cleanConversationId, buttonMessage, accessToken, timeout);
        buttonResults.push(result);
      }
    }
    
    // Calculate response time for metrics
    const responseTime = Date.now() - startTime;
    updatePerformanceMetrics(true, responseTime, retryCount);
    
    // Process successful response
    return {
      success: true,
      messageId: response.data.id,
      conversationId: cleanConversationId,
      timestamp: new Date().toISOString(),
      responseTimeMs: responseTime,
      buttonResults: buttonResults.length > 0 ? buttonResults : undefined,
      metadata: {
        conversationId: cleanConversationId,
        mediaType,
        mediaUrl
      }
    };
  } catch (error) {
    console.error(`Error sending direct conversation media message to ${conversationId}:`, error.message);
    
    // Extract detailed error information
    const errorResponse = error.response?.data?.error;
    const errorCode = errorResponse?.code;
    const errorSubcode = errorResponse?.error_subcode;
    const errorMessage = errorResponse?.message || error.message;
    
    // Update failure metrics
    updatePerformanceMetrics(false, Date.now() - startTime, retryCount, errorCode);
    
    // Handle rate limiting and temporary errors with enhanced retry logic
    if (shouldRetry(error) && retryCount < maxRetries) {
      // Calculate backoff time with exponential increase and random jitter
      const retryDelay = calculateBackoffDelay(retryCount, errorCode);
      
      console.log(`Retrying direct conversation media message to ${conversationId} in ${retryDelay}ms (Attempt ${retryCount + 1}/${maxRetries})`);
      
      // Wait for the backoff period
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      
      // Retry the message with incremented retry counter
      return sendDirectConversationMediaMessage(
        cleanConversationId,
        messageText,
        mediaUrl,
        accessToken,
        mediaType,
        {
          ...options,
          retryCount: retryCount + 1,
          maxRetries,
          timeout: timeout + (retryCount * 1000)
        }
      );
    }
    
    // Return detailed error information if retries exhausted or shouldn't retry
    return {
      success: false,
      error: errorMessage,
      code: errorCode,
      subcode: errorSubcode,
      retriesAttempted: retryCount,
      timestamp: new Date().toISOString(),
      metadata: {
        conversationId,
        mediaType,
        mediaUrl,
        errorDetails: errorResponse
      }
    };
  }
}
/**
 * Calculates appropriate delay between messages with enhanced logic for optimal timing
 * 
 * @param {Object} message - The message configuration with delay settings
 * @param {number} messageIndex - The index of the current message (0-based)
 * @param {Object} options - Additional options for delay calculation
 * @returns {number} - The calculated delay in milliseconds
 */
function calculateDelay(message, messageIndex, options = {}) {
  const { 
    adjustForBurstPrevention = true,
    systemLoad = 'normal', // 'low', 'normal', 'high'
    recentErrors = 0
  } = options;
  
  if (!message || !message.enableDelay) {
    // Default minimal safe delay to prevent rate limiting
    return adjustMinimumSafeDelay(MIN_SAFE_DELAY, systemLoad, recentErrors);
  }
  
  let delayMs = 0;
  
  switch (message.delayMode) {
    case 'fixed':
      delayMs = (message.delaySeconds || 5) * 1000;
      break;
      
    case 'random':
      // Random delay between min and max values with improved randomization
      const minDelay = (message.minDelaySeconds || 3) * 1000;
      const maxDelay = (message.maxDelaySeconds || 10) * 1000;
      // Use improved randomization formula
      delayMs = Math.floor(minDelay + (Math.random() * Math.random() * (maxDelay - minDelay)));
      break;
      
    case 'incremental':
      // Incrementally increasing delay with options for acceleration and deceleration
      const startDelay = (message.incrementalDelayStart || 3) * 1000;
      const stepDelay = (message.incrementalDelayStep || 2) * 1000;
      
      // Apply different growth patterns based on configuration
      const growthFactor = message.incrementalAcceleration || 1; // Default to linear growth
      
      if (growthFactor === 1) {
        // Linear growth (standard)
        delayMs = startDelay + (messageIndex * stepDelay);
      } else if (growthFactor > 1) {
        // Exponential growth (for aggressive throttling)
        delayMs = startDelay + (stepDelay * Math.pow(messageIndex, growthFactor));
      } else {
        // Logarithmic growth (for diminishing returns)
        delayMs = startDelay + (stepDelay * (Math.log(messageIndex + 1) / Math.log(2)));
      }
      break;
      
    case 'adaptive':
      // Adaptive delay based on message index, recent errors and system load
      // More sophisticated than other methods - adjusts dynamically
      const baseDelay = (message.adaptiveBaseDelay || 3) * 1000;
      const maxAdaptiveDelay = (message.adaptiveMaxDelay || 30) * 1000;
      
      // Factor in system load
      let loadFactor = 1;
      if (systemLoad === 'high') loadFactor = 2;
      else if (systemLoad === 'low') loadFactor = 0.8;
      
      // Factor in recent error rate to automatically throttle when needed
      const errorFactor = 1 + (recentErrors * 0.5);
      
      // Calculate adaptive delay that increases non-linearly with index
      delayMs = Math.min(
        baseDelay * loadFactor * errorFactor * (1 + Math.log10(messageIndex + 1)),
        maxAdaptiveDelay
      );
      break;
      
    default:
      // Default fixed delay as fallback
      delayMs = 5000;
  }
  
  // Apply burst prevention for initial messages if enabled
  if (adjustForBurstPrevention && messageIndex < 5) {
    // Add an initial burst prevention delay for the first few messages
    const burstPrevention = Math.max(0, 2000 - (messageIndex * 400));
    delayMs += burstPrevention;
  }
  
  // Adjust based on system conditions
  return adjustMinimumSafeDelay(delayMs, systemLoad, recentErrors);
}

/**
 * Adjusts the delay based on system conditions to ensure safe operation
 * 
 * @param {number} calculatedDelay - The initially calculated delay
 * @param {string} systemLoad - Current system load ('low', 'normal', 'high')
 * @param {number} recentErrors - Number of recent errors encountered
 * @returns {number} - The adjusted delay in milliseconds
 */
function adjustMinimumSafeDelay(calculatedDelay, systemLoad, recentErrors) {
  // Base minimum safe delay
  let minSafeDelay = MIN_SAFE_DELAY;
  
  // Adjust based on system load
  if (systemLoad === 'high') {
    minSafeDelay *= 2; // Double the minimum delay under high load
  } else if (systemLoad === 'low') {
    minSafeDelay *= 0.8; // Slight reduction under low load, but not below certain threshold
  }
  
  // Factor in recent errors - increase minimum delay if errors detected
  if (recentErrors > 0) {
    // Increase minimum delay by 50% for each recent error, up to 4x
    const errorMultiplier = Math.min(1 + (recentErrors * 0.5), 4);
    minSafeDelay *= errorMultiplier;
  }
  
  // Add slight random variation to avoid synchronized patterns (±10%)
  const jitter = minSafeDelay * 0.1 * (Math.random() - 0.5);
  minSafeDelay += jitter;
  
  // Ensure the delay used is not less than our safe minimum
  return Math.max(calculatedDelay, minSafeDelay);
}

/**
 * Analyzes a batch of recipient IDs for validity with enhanced validation
 * 
 * @param {Array<string>} recipientIds - Array of Facebook user IDs
 * @returns {Object} - Analysis results with valid/invalid counts and problematic IDs
 */
function analyzeRecipientBatch(recipientIds) {
  if (!Array.isArray(recipientIds)) {
    return {
      totalCount: 0,
      validCount: 0,
      invalidCount: 0,
      duplicateCount: 0,
      invalidIds: [],
      validIds: [],
      duplicateIds: []
    };
  }
  
  const validIds = [];
  const invalidIds = [];
  const duplicateIds = [];
  const seenIds = new Set();
  
  // Process each ID with enhanced validation
  recipientIds.forEach(id => {
    // Handle different input formats
    let processedId;
    
    if (typeof id === 'object' && id !== null) {
      // Handle object format with id property
      processedId = id.id ? id.id.toString().trim() : null;
    } else if (id) {
      // Handle simple string or number format
      processedId = id.toString().trim();
    } else {
      processedId = null;
    }
    
    // Skip null/undefined values
    if (!processedId) {
      invalidIds.push(id);
      return;
    }
    
    // Check for duplicates
    if (seenIds.has(processedId)) {
      duplicateIds.push(processedId);
      return;
    }
    
    // Validate against Facebook ID patterns
    if (validateFacebookRecipientId(processedId)) {
      validIds.push(processedId);
      seenIds.add(processedId);
    } else {
      invalidIds.push(id);
    }
  });
  
  return {
    totalCount: recipientIds.length,
    validCount: validIds.length,
    invalidCount: invalidIds.length,
    duplicateCount: duplicateIds.length,
    validIds,
    invalidIds,
    duplicateIds,
    uniqueValidIds: [...seenIds]
  };
}

/**
 * Adapts delay based on previous response times
 * 
 * @param {Array<number>} responseTimes - Array of previous response times in ms
 * @param {number} baseDelay - Base delay in milliseconds
 * @param {number} maxDelay - Maximum delay in milliseconds
 * @returns {number} - Adapted delay in milliseconds
 */
function adaptDelayBasedOnResponse(responseTimes, baseDelay, maxDelay) {
  if (!responseTimes || responseTimes.length === 0) {
    return baseDelay;
  }
  
  // Calculate statistics on recent response times
  const avgResponse = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  
  // Calculate variance to detect instability
  const variance = responseTimes.reduce((sum, time) => sum + Math.pow(time - avgResponse, 2), 0) / responseTimes.length;
  const stdDev = Math.sqrt(variance);
  
  // Higher response times or high variance indicate potential issues
  const varianceFactor = stdDev / avgResponse; // Coefficient of variation
  
  let adaptiveFactor = 1.0;
  
  // Adapt based on response time trends
  if (avgResponse > 2000) { // Slow responses
    adaptiveFactor += 0.5;
  }
  
  // Adapt based on response variance
  if (varianceFactor > 0.5) { // High variance
    adaptiveFactor += 0.5;
  }
  
  // Calculate adaptive delay with boundaries
  const adaptiveDelay = Math.min(baseDelay * adaptiveFactor, maxDelay);
  
  // Add small random jitter (±10%) to prevent synchronization issues
  const jitter = adaptiveDelay * 0.1 * (Math.random() - 0.5);
  
  return adaptiveDelay + jitter;
}

/**
 * Gets optimal batch size based on recipient count and system conditions
 * 
 * @param {number} totalRecipients - Total number of recipients
 * @param {number} defaultBatchSize - Default batch size
 * @returns {number} - Optimal batch size
 */
function getOptimalBatchSize(totalRecipients, defaultBatchSize = 50) {
  // For small recipient counts, use smaller batches
  if (totalRecipients < 20) {
    return Math.max(5, Math.min(totalRecipients, 10));
  }
  
  // For medium recipient counts, use standard batch size
  if (totalRecipients < 100) {
    return Math.min(defaultBatchSize, totalRecipients);
  }
  
  // For large recipient counts, optimize for system conditions
  const systemLoad = getSystemLoad();
  
  if (systemLoad === 'high') {
    return Math.min(30, defaultBatchSize);
  } else if (systemLoad === 'low') {
    return Math.min(100, defaultBatchSize * 1.5);
  }
  
  return defaultBatchSize;
}

/**
 * Extracts unique senders who have messaged the page with enhanced data collection
 * 
 * @param {Array<Object>} messages - Array of message objects
 * @param {Object} options - Options for extraction customization
 * @returns {Array<Object>} - Array of unique sender objects with enhanced metadata
 */
function extractUniqueSenders(messages, options = {}) {
  const {
    includeMetadata = true,
    maxResults = 0, // 0 means no limit
    filterFn = null, // Custom filter function
    sortBy = 'lastInteraction', // 'lastInteraction', 'name', 'messageCount'
    sortDirection = 'desc',
    detectBots = true,
    enrichWithStats = true
  } = options;
  
  if (!Array.isArray(messages) || messages.length === 0) {
    return [];
  }
  
  // Create map to identify unique senders by ID with enhanced metadata
  const sendersMap = new Map();
  
  // Process all messages
  messages.forEach(message => {
    if (message.sender && message.sender.id) {
      const senderId = message.sender.id;
      const senderName = message.sender.name || 'Unknown';
      const interactionTime = message.created_time ? new Date(message.created_time) : new Date();
      
      // Get or initialize sender data
      if (!sendersMap.has(senderId)) {
        sendersMap.set(senderId, {
          id: senderId,
          name: senderName,
          firstInteraction: interactionTime,
          lastInteraction: interactionTime,
          messageCount: 1,
          conversationIds: new Set(message.conversationId ? [message.conversationId] : []),
          messageTypes: new Set(message.type ? [message.type] : ['text']),
          interactionDates: [interactionTime],
          messages: includeMetadata ? [{ 
            type: message.type || 'text',
            time: interactionTime,
            messageId: message.id,
            snippet: message.snippet || message.message?.slice(0, 50)
          }] : []
        });
      } else {
        // Update existing sender data
        const existingSender = sendersMap.get(senderId);
        
        // Update name if the existing one is 'Unknown'
        if (existingSender.name === 'Unknown' && senderName !== 'Unknown') {
          existingSender.name = senderName;
        }
        
        // Update interaction times
        if (interactionTime < existingSender.firstInteraction) {
          existingSender.firstInteraction = interactionTime;
        }
        if (interactionTime > existingSender.lastInteraction) {
          existingSender.lastInteraction = interactionTime;
        }
        
        // Update counts and sets
        existingSender.messageCount += 1;
        if (message.conversationId) {
          existingSender.conversationIds.add(message.conversationId);
        }
        if (message.type) {
          existingSender.messageTypes.add(message.type);
        }
        
        // Add to interaction dates
        existingSender.interactionDates.push(interactionTime);
        
        // Add message details if metadata is included
        if (includeMetadata) {
          existingSender.messages.push({ 
            type: message.type || 'text',
            time: interactionTime,
            messageId: message.id,
            snippet: message.snippet || message.message?.slice(0, 50)
          });
        }
      }
    }
  });
  
  // Convert Sets to Arrays for JSON compatibility
  for (const sender of sendersMap.values()) {
    sender.conversationIds = Array.from(sender.conversationIds);
    sender.messageTypes = Array.from(sender.messageTypes);
    
    // Calculate engagement metrics if enrichment is enabled
    if (enrichWithStats) {
      // Calculate time span in days
      const timeSpanDays = Math.max(1, (sender.lastInteraction - sender.firstInteraction) / (1000 * 60 * 60 * 24));
      
      // Calculate metrics
      sender.metrics = {
        messagesPerDay: sender.messageCount / timeSpanDays,
        conversationCount: sender.conversationIds.length,
        daysSinceLastInteraction: (new Date() - sender.lastInteraction) / (1000 * 60 * 60 * 24),
        engagementPeriodDays: timeSpanDays,
        responseRate: calculateResponseRate(sender.interactionDates)
      };
      
      // Detect if sender might be a bot based on message patterns
      if (detectBots) {
        sender.isPossiblyBot = isPossiblyBot(sender);
      }
    }
    
    // Limit message history size for memory efficiency if needed
    if (includeMetadata && sender.messages.length > 50) {
      sender.messages = sender.messages.slice(-50); // Keep only most recent 50 messages
      sender.messageHistoryTruncated = true;
    }
  }
  
  // Convert map to array for further processing
  let senders = Array.from(sendersMap.values());
  
  // Apply custom filter if provided
  if (typeof filterFn === 'function') {
    senders = senders.filter(filterFn);
  }
  
  // Sort the senders based on specified criteria
  senders.sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
        
      case 'messageCount':
        comparison = b.messageCount - a.messageCount;
        break;
        
      case 'lastInteraction':
      default:
        comparison = b.lastInteraction - a.lastInteraction;
        break;
    }
    
    // Apply sort direction
    return sortDirection === 'asc' ? -comparison : comparison;
  });
  
  // Apply result limit if specified
  if (maxResults > 0 && senders.length > maxResults) {
    senders = senders.slice(0, maxResults);
  }
  
  return senders;
}

/**
 * Calculates the response rate based on message timing patterns
 * 
 * @param {Array<Date>} interactionDates - Array of interaction dates
 * @returns {number} - Response rate score between 0-1
 */
function calculateResponseRate(interactionDates) {
  if (!interactionDates || interactionDates.length < 2) {
    return 0;
  }
  
  // Sort dates chronologically
  const sortedDates = [...interactionDates].sort((a, b) => a - b);
  
  // Calculate time gaps between consecutive messages
  const timeGaps = [];
  for (let i = 1; i < sortedDates.length; i++) {
    timeGaps.push(sortedDates[i] - sortedDates[i-1]);
  }
  
  // Count rapid responses (within 10 minutes)
  const rapidResponses = timeGaps.filter(gap => gap < 600000).length;
  
  // Calculate response rate
  return rapidResponses / timeGaps.length;
}

/**
 * Determines if a sender might be a bot based on message patterns
 * 
 * @param {Object} sender - Sender data object with messages and metrics
 * @returns {boolean} - Whether the sender is likely a bot
 */
function isPossiblyBot(sender) {
  // Check message frequency
  if (sender.metrics.messagesPerDay > 100) return true;
  
  // Check message timing
  if (sender.interactionDates.length >= 5) {
    // Calculate variance in message timing
    const timestamps = sender.interactionDates.map(date => date.getTime());
    const gaps = [];
    for (let i = 1; i < timestamps.length; i++) {
      gaps.push(timestamps[i] - timestamps[i-1]);
    }
    
    const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    const variance = gaps.reduce((sum, gap) => sum + Math.pow(gap - avgGap, 2), 0) / gaps.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Very low standard deviation may indicate automated timing
    if (standardDeviation / avgGap < 0.1) return true;
  }
  
  // Check message content patterns if available
  if (sender.messages && sender.messages.length >= 3) {
    // Look for identical messages
    const messageTexts = sender.messages.map(m => m.snippet).filter(Boolean);
    const uniqueTexts = new Set(messageTexts);
    
    // If most messages are identical, likely a bot
    if (uniqueTexts.size === 1 && messageTexts.length >= 3) return true;
  }
  
  return false;
}

/**
 * Verifies the effectiveness of delay settings with enhanced analytics
 * 
 * @param {Array<Object>} delayMetrics - Collected delay metrics data
 * @param {Object} delayConfig - The delay configuration
 * @returns {Object} - Analysis of delay effectiveness and recommendations
 */
function verifyDelayEffectiveness(delayMetrics, delayConfig) {
  if (!Array.isArray(delayMetrics) || delayMetrics.length === 0) {
    return {
      isEffective: true,
      recommendation: 'No delay data available for analysis.'
    };
  }
  
  // Calculate the average target delay
  let targetTotal = 0;
  delayMetrics.forEach(metric => {
    targetTotal += metric.targetMs;
  });
  const avgTargetMs = targetTotal / delayMetrics.length;
  
  // Calculate the average actual delay
  let actualTotal = 0;
  delayMetrics.forEach(metric => {
    actualTotal += metric.actualMs;
  });
  const avgActualMs = actualTotal / delayMetrics.length;
  
  // Calculate minimum and maximum actual delays
  const minActualMs = Math.min(...delayMetrics.map(m => m.actualMs));
  const maxActualMs = Math.max(...delayMetrics.map(m => m.actualMs));
  
  // Calculate variance and standard deviation for stability analysis
  const actualVariance = delayMetrics.reduce((sum, metric) => 
    sum + Math.pow(metric.actualMs - avgActualMs, 2), 0) / delayMetrics.length;
  const actualStdDev = Math.sqrt(actualVariance);
  
  // Calculate the variance percentage between target and actual
  const variancePercentage = ((avgActualMs - avgTargetMs) / avgTargetMs) * 100;
  
  // Calculate coefficient of variation (CV) to assess consistency
  const actualCV = actualStdDev / avgActualMs;
  
  // Enhanced effectiveness criteria
  const isDelayMagnitudeEffective = variancePercentage >= -15; // Allow up to 15% deviation
  const isDelayConsistent = actualCV < 0.3; // CV under 30% indicates consistent delays
  const hasMinimumDelay = minActualMs >= 1000; // Ensure at least 1 second minimum delay
  
  // Combined effectiveness assessment
  const isEffective = isDelayMagnitudeEffective && isDelayConsistent && hasMinimumDelay;
  
  // Generate detailed recommendations
  let recommendation = '';
  let detailedAnalysis = '';
  
  // Problem detection and specific recommendations
  if (!isDelayMagnitudeEffective) {
    detailedAnalysis += `The actual delay (${Math.round(avgActualMs/1000)} seconds) is significantly shorter than the target delay (${Math.round(avgTargetMs/1000)} seconds). `;
  }
  
  if (!isDelayConsistent) {
    detailedAnalysis += `The delay times are inconsistent (CV=${actualCV.toFixed(2)}), which may lead to unpredictable delivery patterns. `;
  }
  
  if (!hasMinimumDelay) {
    detailedAnalysis += `The minimum observed delay (${Math.round(minActualMs/1000)} seconds) is too short to effectively prevent rate limiting. `;
  }
  
  // Mode-specific recommendations
  switch (delayConfig.delayMode) {
    case 'fixed':
      if (!isEffective) {
        recommendation = `${detailedAnalysis}Consider increasing the fixed delay from ${delayConfig.delaySeconds} seconds to at least ${Math.ceil(Math.max(delayConfig.delaySeconds * 1.5, 5))} seconds to ensure proper timing between messages.`;
      } else {
        recommendation = `Fixed delay settings are working as expected. Average delay: ${Math.round(avgActualMs/1000)} seconds.`;
      }
      break;
      
    case 'random':
      if (!isEffective) {
        const suggestedMin = Math.ceil(Math.max(delayConfig.minDelaySeconds * 1.5, 3));
        const suggestedMax = Math.ceil(Math.max(delayConfig.maxDelaySeconds * 1.5, suggestedMin + 5));
        
        recommendation = `${detailedAnalysis}Consider adjusting your random delay range from ${delayConfig.minDelaySeconds}-${delayConfig.maxDelaySeconds} seconds to ${suggestedMin}-${suggestedMax} seconds for more reliable delivery.`;
      } else {
        recommendation = `Random delay settings are working effectively. Average delay: ${Math.round(avgActualMs/1000)} seconds with good variability between ${Math.round(minActualMs/1000)}-${Math.round(maxActualMs/1000)} seconds.`;
      }
      break;
      
    case 'incremental':
      if (!isEffective) {
        const suggestedStart = Math.ceil(Math.max(delayConfig.incrementalDelayStart * 1.5, 3));
        const suggestedStep = Math.ceil(Math.max(delayConfig.incrementalDelayStep * 1.5, 2));
        
        recommendation = `${detailedAnalysis}Consider increasing your incremental delay parameters from start=${delayConfig.incrementalDelayStart}, step=${delayConfig.incrementalDelayStep} to start=${suggestedStart}, step=${suggestedStep} for more reliable message delivery.`;
      } else {
        recommendation = `Incremental delay settings are working as expected. Average delay: ${Math.round(avgActualMs/1000)} seconds with appropriate progression.`;
      }
      break;
      
    default:
      if (!isEffective) {
        recommendation = `${detailedAnalysis}Consider adjusting your delay settings to ensure a minimum of 5 seconds between messages for more reliable delivery.`;
      } else {
        recommendation = `Delay settings are working as expected. Average delay: ${Math.round(avgActualMs/1000)} seconds.`;
      }
  }
  
  return {
    isEffective,
    recommendation,
    metrics: {
      targetAvgMs: avgTargetMs,
      actualAvgMs: avgActualMs,
      actualMinMs: minActualMs,
      actualMaxMs: maxActualMs,
      variancePercentage,
      coefficientOfVariation: actualCV,
      standardDeviation: actualStdDev
    },
    assessments: {
      isDelayMagnitudeEffective,
      isDelayConsistent,
      hasMinimumDelay
    }
  };
}

/**
 * Determines if a failed request should be retried with enhanced logic
 * 
 * @param {Error} error - The error that occurred
 * @returns {boolean} - Whether to retry the request
 */
function shouldRetry(error) {
  // Don't retry if no response
  if (!error.response) {
    // Network errors can sometimes be retried
    return error.code === 'ECONNRESET' || 
           error.code === 'ETIMEDOUT' || 
           error.code === 'ECONNABORTED';
  }
  
  const status = error.response.status;
  const errorCode = error.response?.data?.error?.code;
  const errorMessage = error.response?.data?.error?.message || '';
  
  // Never retry invalid token errors
  if (INVALID_TOKEN_CODES.includes(errorCode)) {
    return false;
  }
  
  // Retry on rate limiting errors
  if (RATE_LIMIT_CODES.includes(errorCode)) {
    return true;
  }
  
  // Retry on temporary error codes
  if (TEMPORARY_ERROR_CODES.includes(errorCode)) {
    return true;
  }
  
  // Retry on specific HTTP status codes that indicate temporary issues
  if ([429, 500, 502, 503, 504].includes(status)) {
    return true;
  }
  
  // Retry based on error message patterns for temporary issues
  const temporaryErrorPatterns = [
    /try again/i,
    /temporarily unavailable/i,
    /limit reached/i,
    /too many requests/i,
    /server is busy/i,
    /timeout/i,
    /too fast/i,
    /temporarily blocked/i
  ];
  
  for (const pattern of temporaryErrorPatterns) {
    if (pattern.test(errorMessage)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Calculates exponential backoff delay for retries with enhanced jitter
 * 
 * @param {number} retryCount - The current retry attempt (0-based)
 * @param {number} errorCode - Optional error code for specialized handling
 * @returns {number} - The backoff delay in milliseconds
 */
function calculateBackoffDelay(retryCount, errorCode = null) {
  // Determine base retry delay with adjustments for specific errors
  let adjustedBaseDelay = BASE_RETRY_DELAY;
  
  // Adjust base delay for rate limiting errors
  if (RATE_LIMIT_CODES.includes(errorCode)) {
    adjustedBaseDelay *= 2; // Use longer delays for rate limiting
  }
  
  // Calculate exponential base
  const exponentialDelay = adjustedBaseDelay * Math.pow(2, retryCount);
  
  // Add full jitter to prevent thundering herd problem
  // Formula: random value between base delay and exponential delay
  const jitter = Math.random() * exponentialDelay;
  
  // Cap at reasonable maximum
  return Math.min(
    adjustedBaseDelay + jitter, 
    60000 // Maximum 60-second delay
  );
}

/**
 * Detects media type based on URL with enhanced format detection
 * 
 * @param {string} url - The media URL
 * @returns {string} - The detected media type ('image' or 'video')
 */
function detectMediaType(url) {
  if (!url) return 'image'; // Default to image
  
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.tiff', '.ico'];
  const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.flv', '.wmv', '.mpg', '.mpeg', '.m4v'];
  
  try {
    const lowercaseUrl = url.toLowerCase();
    
    // Check file extensions
    for (const ext of imageExtensions) {
      if (lowercaseUrl.endsWith(ext)) return 'image';
    }
    
    for (const ext of videoExtensions) {
      if (lowercaseUrl.endsWith(ext)) return 'video';
    }
    
    // Check video hosting services
    const videoHostingPatterns = [
      /youtube\.com/i,
      /youtu\.be/i,
      /vimeo\.com/i,
      /dailymotion\.com/i,
      /facebook\.com\/watch/i,
      /fb\.watch/i,
      /twitch\.tv/i,
      /streamable\.com/i,
      /watch\?/i, // Common in video URLs
      /\/video\//i
    ];
    
    for (const pattern of videoHostingPatterns) {
      if (pattern.test(lowercaseUrl)) return 'video';
    }
    
    // Check image hosting services
    const imageHostingPatterns = [
      /imgur\.com/i,
      /flickr\.com/i,
      /unsplash\.com/i,
      /pexels\.com/i,
      /\.jpg|\.jpeg|\.png|\.gif|\.webp|\.bmp/i, // Look for extensions in query params
      /\/photos\//i,
      /\/images\//i
    ];
    
    for (const pattern of imageHostingPatterns) {
      if (pattern.test(lowercaseUrl)) return 'image';
    }
    
    // Check for data URLs
    if (lowercaseUrl.startsWith('data:image/')) return 'image';
    if (lowercaseUrl.startsWith('data:video/')) return 'video';
    
    // Parse URL to look for extension in the path
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();
      
      for (const ext of imageExtensions) {
        if (pathname.includes(ext)) return 'image';
      }
      
      for (const ext of videoExtensions) {
        if (pathname.includes(ext)) return 'video';
      }
    } catch (e) {
      // URL parsing failed, continue with other detection methods
    }
    
    // Default to image if unable to determine
    return 'image';
  } catch (error) {
    console.error('Error detecting media type:', error);
    return 'image'; // Safe default
  }
}

/**
 * Updates global performance metrics for system analysis
 * 
 * @param {boolean} success - Whether the operation succeeded
 * @param {number} responseTimeMs - Response time in milliseconds
 * @param {number} retryCount - Number of retries performed
 * @param {number} errorCode - Optional error code for categorization
 */
function updatePerformanceMetrics(success, responseTimeMs, retryCount = 0, errorCode = null) {
  // Reset metrics if older than 1 hour to maintain recent relevance
  const now = Date.now();
  if (now - globalMetrics.lastResetTime > 3600000) {
    globalMetrics = {
      totalSent: 0,
      totalFailed: 0,
      totalRetries: 0,
      avgResponseTime: 0,
      rateErrors: 0,
      lastResetTime: now
    };
  }
  
  // Update total counts
  if (success) {
    globalMetrics.totalSent++;
  } else {
    globalMetrics.totalFailed++;
    if (RATE_LIMIT_CODES.includes(errorCode)) {
      globalMetrics.rateErrors++;
    }
  }
  
  // Update retry count
  globalMetrics.totalRetries += retryCount;
  
  // Update average response time with running average
  const totalOperations = globalMetrics.totalSent + globalMetrics.totalFailed;
  globalMetrics.avgResponseTime = 
    (globalMetrics.avgResponseTime * (totalOperations - 1) + responseTimeMs) / totalOperations;
}

/**
 * Gets current system load based on performance metrics
 * 
 * @returns {string} - Current system load ('low', 'normal', 'high')
 */
function getSystemLoad() {
  // Calculate error rate
  const totalOperations = globalMetrics.totalSent + globalMetrics.totalFailed;
  if (totalOperations < 10) return 'normal'; // Not enough data
  
  const errorRate = globalMetrics.totalFailed / totalOperations;
  const rateErrorRatio = globalMetrics.rateErrors / Math.max(1, totalOperations);
  
  if (rateErrorRatio > 0.05 || errorRate > 0.2) {
    return 'high';
  } else if (errorRate < 0.05 && globalMetrics.avgResponseTime < 1000) {
    return 'low';
  } else {
    return 'normal';
  }
}

/**
 * Batch processes a group of messages with optimal chunking and delay
 * 
 * @param {Array<Object>} recipients - Array of recipients to message
 * @param {Function} messagingFunction - The function to use for sending messages
 * @param {Object} messageConfig - Configuration for the messages
 * @param {Object} options - Additional options for batch processing
 * @returns {Object} - Results of the batch processing
 */
async function batchProcessMessages(recipients, messagingFunction, messageConfig, options = {}) {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    progressCallback = null,
    cancelToken = null,
    adaptiveBatching = true
  } = options;
  
  if (!Array.isArray(recipients) || recipients.length === 0 || typeof messagingFunction !== 'function') {
    return {
      success: false,
      error: 'Invalid recipients array or messaging function',
      timestamp: new Date().toISOString()
    };
  }
  
  // Initialize results
  const results = {
    totalCount: recipients.length,
    successCount: 0,
    failureCount: 0,
    inProgressCount: recipients.length,
    startTime: new Date().toISOString(),
    endTime: null,
    results: [],
    canceled: false
  };
  
  // Process recipients in optimized batches
  let currentBatchSize = batchSize;
  let currentSystemLoad = 'normal';
  let consecutiveErrors = 0;
  
  // Process recipients
  for (let i = 0; i < recipients.length; i++) {
    // Check for cancellation
    if (cancelToken && cancelToken.isCanceled) {
      results.canceled = true;
      break;
    }
    
    const recipient = recipients[i];
    
    try {
      // Calculate delay based on current system conditions
      const delay = calculateDelay(
        messageConfig, 
        i, 
        { 
          systemLoad: currentSystemLoad,
          recentErrors: consecutiveErrors
        }
      );
      
      // Apply delay if not the first message
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Process this recipient
      const result = await messagingFunction(recipient, messageConfig);
      results.results.push(result);
      
      // Update success/failure counts
      if (result.success) {
        results.successCount++;
        consecutiveErrors = Math.max(0, consecutiveErrors - 1); // Reduce error count on success
      } else {
        results.failureCount++;
        consecutiveErrors++;
      }
      
      // Update in-progress count
      results.inProgressCount--;
      
      // Call progress callback if provided
      if (typeof progressCallback === 'function') {
        progressCallback({
          currentIndex: i,
          totalCount: recipients.length,
          successCount: results.successCount,
          failureCount: results.failureCount,
          result: result
        });
      }
      
      // Adapt batch size based on results if enabled
      if (adaptiveBatching && i > 0 && i % currentBatchSize === 0) {
        currentSystemLoad = getSystemLoad();
        
        // Adjust batch size based on system load and error rate
        if (currentSystemLoad === 'high') {
          currentBatchSize = Math.max(5, Math.floor(currentBatchSize * 0.7));
        } else if (currentSystemLoad === 'low' && consecutiveErrors === 0) {
          currentBatchSize = Math.min(100, Math.floor(currentBatchSize * 1.2));
        }
      }
    } catch (error) {
      console.error(`Unexpected error in batch processing for recipient ${i}:`, error);
      
      // Record error in results
      const errorResult = {
        success: false,
        error: error.message || 'Unknown batch processing error',
        timestamp: new Date().toISOString(),
        recipientIndex: i,
        recipient: recipient
      };
      
      results.results.push(errorResult);
      results.failureCount++;
      results.inProgressCount--;
      consecutiveErrors++;
      
      // Call progress callback with error
      if (typeof progressCallback === 'function') {
        progressCallback({
          currentIndex: i,
          totalCount: recipients.length,
          successCount: results.successCount,
          failureCount: results.failureCount,
          result: errorResult
        });
      }
    }
  }
  
  // Set completion timestamp
  results.endTime = new Date().toISOString();
  results.processingTimeMs = new Date(results.endTime) - new Date(results.startTime);
  
  return results;
}

module.exports = {
  // Core messaging functions
  sendFacebookDirectMessage,
  sendFacebookMediaMessage,
  personalizeMessageText,
  calculateDelay,
  
  // Analysis and optimization
  analyzeRecipientBatch,
  extractUniqueSenders,
  verifyDelayEffectiveness,
  detectMediaType,
  
  // Advanced batch processing
  batchProcessMessages,
  
  // Validation functions
  validateFacebookRecipientId,
  
  // Helper functions for adaptive messaging
  adaptDelayBasedOnResponse,
  getOptimalBatchSize,
  
  // Helper functions exposed for testing and metrics
  shouldRetry,
  calculateBackoffDelay,
  getSystemLoad,
  
  // Direct conversation functions
  sendDirectConversationMessage,
  sendDirectConversationMediaMessage,
  
  // Constants for external configuration
  constants: {
    FB_API_VERSION,
    FB_API_VERSION_CONVERSATION,
    MIN_SAFE_DELAY,
    MAX_RETRIES,
    DEFAULT_BATCH_SIZE
  }
};