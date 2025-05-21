/**
 * Page Message Campaign Processor
 * 
 * A reliable background service for processing page message campaigns
 * ensuring campaigns continue running even if users close their browsers.
 * 
 * This enhanced implementation uses atomic database operations and proper locking
 * to ensure reliable processing even with concurrent operations and server restarts.
 */
const PageMessageCampaign = require('../models/PageMessageCampaign');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const axios = require('axios');
const delayUtils = require('./delayUtils');
const mongoose = require('mongoose');

// Constants for messaging and points
const POINTS_PER_MESSAGE = 1;
const MAX_RETRIES = 2;
const PROCESSING_TIMEOUT_MINUTES = 30;
const PROCESSING_BATCH_SIZE = 10;

// Notification types for consistent messaging
const NOTIFICATION_TYPES = {
  POINTS_DEDUCTED: 'تم خصم النقاط',
  POINTS_REFUNDED: 'تم استرداد النقاط',
  POINTS_INSUFFICIENT: 'رصيد النقاط غير كافٍ'
};

// Processing tracking
const activeProcessingMap = new Map(); // Track campaigns being processed
let isProcessingQueue = false;

/**
 * Add a campaign to the processing queue
 * @param {String} campaignId - ID of the campaign to process
 * @returns {Promise<Object>} Result of queuing operation
 */
const queueCampaign = async (campaignId) => {
  try {
    // Check if campaign is already being processed
    if (activeProcessingMap.has(campaignId)) {
      return {
        success: true,
        message: 'Campaign already being processed',
        status: 'processing'
      };
    }
    
    // Try to acquire lock on campaign by setting processingLock with atomic operation
    const lockExpirationTime = new Date();
    lockExpirationTime.setMinutes(lockExpirationTime.getMinutes() - PROCESSING_TIMEOUT_MINUTES);
    
    const campaign = await PageMessageCampaign.findOneAndUpdate(
      { 
        _id: campaignId,
        status: { $in: ['pending', 'draft', 'processing'] },
        $or: [
          { processingLock: { $ne: true } },
          { processingLockAcquiredAt: { $lt: lockExpirationTime } }
        ]
      },
      { 
        $set: { 
          processingLock: true,
          processingLockAcquiredAt: new Date()
        }
      },
      { new: true }
    );
    
    if (!campaign) {
      // Either campaign doesn't exist, is in wrong state, or already locked
      const existingCampaign = await PageMessageCampaign.findById(campaignId);
      if (!existingCampaign) {
        return { success: false, error: 'Campaign not found' };
      }
      
      return { 
        success: false, 
        error: `Campaign is in ${existingCampaign.status} state or already being processed` 
      };
    }
    
    // For scheduled campaigns that aren't yet due, don't process now
    if (campaign.scheduled && campaign.scheduledTime) {
      const now = new Date();
      if (campaign.scheduledTime > now) {
        // Release lock and return - it's not time yet
        await PageMessageCampaign.updateOne(
          { _id: campaign._id },
          { 
            $set: { 
              processingLock: false,
              status: 'pending' // Ensure it stays in pending status
            }
          }
        );
        
        return {
          success: true,
          scheduled: true,
          message: 'Campaign is scheduled for future execution',
          scheduledTime: campaign.scheduledTime
        };
      }
    }
    
    // Add to active processing map
    activeProcessingMap.set(campaignId, {
      timestamp: new Date(),
      campaignId: campaignId,
      status: 'queued'
    });
    
    // Update campaign status to processing if not already
    if (campaign.status !== 'processing') {
      await PageMessageCampaign.updateOne(
        { _id: campaign._id },
        { 
          $set: { 
            status: 'processing',
            processingStartedAt: new Date()
          },
          $inc: { processingAttempts: 1 }
        }
      );
    }
    
    // Start processing (process immediately but don't block this function)
    setTimeout(() => {
      processCampaign(campaignId).catch(err => {
        console.error(`[Page Campaign Processor] Error processing campaign ${campaignId}:`, err.message);
      });
    }, 0);
    
    return { 
      success: true, 
      message: 'Campaign queued for immediate processing',
      status: 'queued'
    };
  } catch (error) {
    console.error(`[Page Campaign Processor] Error queuing campaign ${campaignId}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Process a campaign, sending messages to all recipients with proper delay
 * @param {String} campaignId - ID of the campaign to process
 * @returns {Promise<Object>} - Processing results
 */
const processCampaign = async (campaignId) => {
  // Update tracking status
  if (activeProcessingMap.has(campaignId)) {
    const tracking = activeProcessingMap.get(campaignId);
    tracking.status = 'processing';
    tracking.processingStartedAt = new Date();
  } else {
    activeProcessingMap.set(campaignId, {
      timestamp: new Date(),
      campaignId: campaignId,
      status: 'processing',
      processingStartedAt: new Date()
    });
  }
  
  try {
    // Get campaign data
    let campaign = await PageMessageCampaign.findById(campaignId);
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }
    
    // Double-check if this is a scheduled campaign that's not yet due
    if (campaign.scheduled && campaign.scheduledTime) {
      const now = new Date();
      if (campaign.scheduledTime > now) {
        // Release lock and return - it's not time yet
        await PageMessageCampaign.updateOne(
          { _id: campaign._id },
          { 
            $set: { 
              processingLock: false,
              status: 'pending' // Ensure it stays in pending status
            }
          }
        );
        
        // Remove from active processing map
        activeProcessingMap.delete(campaignId);
        
        return {
          success: true,
          scheduled: true,
          message: 'Campaign is scheduled for future execution',
          scheduledTime: campaign.scheduledTime
        };
      }
    }
    
    // Validate campaign data
    validateCampaign(campaign);
    
    // Track metrics
    const processStartTime = Date.now();
    let successCount = 0;
    let failureCount = 0;
    let results = [];
    
    // Get current progress (for resuming interrupted campaigns)
    let currentPosition = campaign.current || 0;
    
    // Process all recipients from current position
    for (let i = currentPosition; i < campaign.recipients.length; i++) {
      const recipient = campaign.recipients[i];
      if (!recipient || !recipient.id) {
        console.warn(`[Page Campaign Processor] Invalid recipient at index ${i}, skipping`);
        continue;
      }
      
      try {
        // Send message to recipient
        const sendResult = await sendMessageToRecipient(campaign, recipient);
        
        // Track result atomically
        if (sendResult.success) {
          successCount++;
          
          // Don't store too much in memory, just the latest result for this batch
          results.push({
            recipient: {
              id: recipient.id,
              name: recipient.name || ''
            },
            success: true,
            messageId: sendResult.messageId,
            sentAt: new Date()
          });
          
          // Update database every batch size or at the end
          if (results.length >= PROCESSING_BATCH_SIZE || i === campaign.recipients.length - 1) {
            await PageMessageCampaign.updateOne(
              { _id: campaign._id },
              { 
                $set: { current: i + 1 },
                $inc: { sent: results.length },
                $push: { 
                  results: {
                    $each: results,
                    $slice: -50 // Keep only the most recent 50 results
                  }
                }
              }
            );
            
            // Clear results after updating
            results = [];
            
            // Log progress
            console.log(`[Page Campaign Processor] Campaign ${campaignId}: processed ${i + 1}/${campaign.recipients.length} recipients (${successCount} success, ${failureCount} failed)`);
          }
        } else {
          failureCount++;
          
          // Don't store too much in memory, just the latest result for this batch
          results.push({
            recipient: {
              id: recipient.id,
              name: recipient.name || ''
            },
            success: false,
            error: sendResult.error || 'Failed to send message',
            sentAt: new Date()
          });
          
          // Update database every batch size or at the end
          if (results.length >= PROCESSING_BATCH_SIZE || i === campaign.recipients.length - 1) {
            await PageMessageCampaign.updateOne(
              { _id: campaign._id },
              { 
                $set: { current: i + 1 },
                $inc: { failed: results.length },
                $push: { 
                  results: {
                    $each: results,
                    $slice: -50 // Keep only the most recent 50 results
                  }
                }
              }
            );
            
            // Clear results after updating
            results = [];
            
            // Log progress
            console.log(`[Page Campaign Processor] Campaign ${campaignId}: processed ${i + 1}/${campaign.recipients.length} recipients (${successCount} success, ${failureCount} failed)`);
          }
        }
        
        // Add appropriate delay between recipients
        if (i < campaign.recipients.length - 1) {
          await applyDelay(campaign, i);
        }
      } catch (error) {
        console.error(`[Page Campaign Processor] Error processing recipient ${recipient.id}:`, error.message);
        failureCount++;
        
        // Update database with the failure
        results.push({
          recipient: {
            id: recipient.id,
            name: recipient.name || ''
          },
          success: false,
          error: error.message || 'Unknown error',
          sentAt: new Date()
        });
        
        // Update database every batch size or at the end
        if (results.length >= PROCESSING_BATCH_SIZE || i === campaign.recipients.length - 1) {
          await PageMessageCampaign.updateOne(
            { _id: campaign._id },
            { 
              $set: { current: i + 1 },
              $inc: { failed: results.length },
              $push: { 
                results: {
                  $each: results,
                  $slice: -50 // Keep only the most recent 50 results
                }
              }
            }
          );
          
          // Clear results after updating
          results = [];
          
          // Log progress
          console.log(`[Page Campaign Processor] Campaign ${campaignId}: processed ${i + 1}/${campaign.recipients.length} recipients (${successCount} success, ${failureCount} failed)`);
        }
      }
    }
    
    // Handle point refunds for failed messages
    if (failureCount > 0) {
      try {
        // Refresh campaign data to get latest counts
        campaign = await PageMessageCampaign.findById(campaignId);
        await refundPointsForFailedMessages(campaign, failureCount);
      } catch (refundError) {
        console.error(`[Page Campaign Processor] Error refunding points:`, refundError.message);
      }
    }
    
    // Calculate metrics
    const processEndTime = Date.now();
    const totalProcessingTime = (processEndTime - processStartTime) / 1000; // seconds
    
    // Update campaign to completed status using atomic update
    await PageMessageCampaign.updateOne(
      { _id: campaign._id },
      { 
        $set: { 
          status: 'completed',
          processingCompletedAt: new Date(),
          processingLock: false,
          deliveryStats: {
            avgDelayMs: campaign.delaySeconds ? campaign.delaySeconds * 1000 : 0,
            successRate: campaign.recipients.length > 0 ? 
              (successCount / (successCount + failureCount)) * 100 : 0,
            completionTimeMinutes: totalProcessingTime / 60,
            lastDeliveryDate: new Date(),
            deliveryStartDate: campaign.processingStartedAt
          }
        }
      }
    );
    
    console.log(`[Page Campaign Processor] Completed campaign ${campaignId}: ${successCount} succeeded, ${failureCount} failed`);
    
    // Remove from active processing map
    activeProcessingMap.delete(campaignId);
    
    return {
      success: true,
      campaignId,
      successCount,
      failureCount,
      totalProcessingTime
    };
  } catch (error) {
    console.error(`[Page Campaign Processor] Error in campaign ${campaignId}:`, error.message);
    
    // Update campaign to failed status using atomic update
    await PageMessageCampaign.updateOne(
      { _id: campaignId },
      { 
        $set: { 
          status: 'failed',
          processingCompletedAt: new Date(),
          processingLock: false,
          processingError: error.message
        }
      }
    );
    
    // Try to refund points for remaining messages
    try {
      const campaign = await PageMessageCampaign.findById(campaignId);
      if (campaign) {
        const remainingRecipients = (campaign.recipientCount || 0) - (campaign.sent || 0) - (campaign.failed || 0);
        if (remainingRecipients > 0) {
          await refundPointsForFailedMessages(campaign, remainingRecipients);
        }
      }
    } catch (refundError) {
      console.error(`[Page Campaign Processor] Error refunding points:`, refundError.message);
    }
    
    // Remove from active processing map
    activeProcessingMap.delete(campaignId);
    
    return {
      success: false,
      campaignId,
      error: error.message
    };
  }
};

/**
 * Personalize message text for a specific recipient
 * @param {String} text - Original message text
 * @param {Object} recipient - Recipient object with name and lastInteraction data
 * @returns {String} - Personalized message text
 */
const personalizeMessage = (text, recipient) => {
  if (!text) return text;
  
  // Create a copy of the text to avoid modifying the original
  let personalizedText = text;
  
  try {
    // Replace recipient name
    if (recipient && recipient.name) {
      personalizedText = personalizedText.replace(/#recipient_name#/g, recipient.name);
    }
    
    // Replace date and time
    const now = new Date();
    const dateString = now.toLocaleDateString();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    personalizedText = personalizedText
      .replace(/#date#/g, dateString)
      .replace(/#time#/g, timeString);
    
    return personalizedText;
  } catch (error) {
    console.error('Error in message personalization:', error);
    return text; // Return original text if personalization fails
  }
};

/**
 * Send a message to a single recipient with retries
 * @param {Object} campaign - Campaign data
 * @param {Object} recipient - Recipient to send to
 * @returns {Promise<Object>} - Result with success/failure
 */
const sendMessageToRecipient = async (campaign, recipient) => {
  let retries = 0;
  let lastError = null;

  // Try up to MAX_RETRIES times
  while (retries <= MAX_RETRIES) {
    try {
      // Personalize message text if message includes variables and personalization isn't explicitly disabled
      let messageText = campaign.messageText;
      if (campaign.personalizeMessage !== false && messageText) {
        messageText = personalizeMessage(messageText, recipient);
      }
      
      // Send based on message type
      if (campaign.messageType === 'text') {
        const response = await axios({
          method: 'post',
          url: `https://graph.facebook.com/v18.0/${campaign.pageId}/messages`,
          data: {
            recipient: { id: recipient.id },
            message: { text: messageText },
            messaging_type: 'MESSAGE_TAG',
            tag: 'ACCOUNT_UPDATE',
            access_token: campaign.accessToken
          }
        });
        
        if (response.data && response.data.message_id) {
          return {
            success: true,
            messageId: response.data.message_id
          };
        }
      }
      else if (campaign.messageType === 'image') {
        // Send text part first if provided
        if (campaign.messageText) {
          try {
            await axios({
              method: 'post',
              url: `https://graph.facebook.com/v18.0/${campaign.pageId}/messages`,
              data: {
                recipient: { id: recipient.id },
                message: { text: campaign.messageText },
                messaging_type: 'MESSAGE_TAG',
                tag: 'ACCOUNT_UPDATE',
                access_token: campaign.accessToken
              }
            });
          } catch (textError) {
            console.warn(`[Page Campaign Processor] Error sending text before image: ${textError.message}`);
          }
        }
        
        // Send image
        const response = await axios({
          method: 'post',
          url: `https://graph.facebook.com/v18.0/${campaign.pageId}/messages`,
          data: {
            recipient: { id: recipient.id },
            message: {
              attachment: {
                type: 'image',
                payload: {
                  url: campaign.imageUrl,
                  is_reusable: false
                }
              }
            },
            messaging_type: 'MESSAGE_TAG',
            tag: 'ACCOUNT_UPDATE',
            access_token: campaign.accessToken
          }
        });
        
        if (response.data && response.data.message_id) {
          return {
            success: true,
            messageId: response.data.message_id
          };
        }
      }
      else if (campaign.messageType === 'video') {
        // Send text part first if provided
        if (campaign.messageText) {
          try {
            await axios({
              method: 'post',
              url: `https://graph.facebook.com/v18.0/${campaign.pageId}/messages`,
              data: {
                recipient: { id: recipient.id },
                message: { text: campaign.messageText },
                messaging_type: 'MESSAGE_TAG',
                tag: 'ACCOUNT_UPDATE',
                access_token: campaign.accessToken
              }
            });
          } catch (textError) {
            console.warn(`[Page Campaign Processor] Error sending text before video: ${textError.message}`);
          }
        }
        
        // Send video
        const response = await axios({
          method: 'post',
          url: `https://graph.facebook.com/v18.0/${campaign.pageId}/messages`,
          data: {
            recipient: { id: recipient.id },
            message: {
              attachment: {
                type: 'video',
                payload: {
                  url: campaign.videoUrl,
                  is_reusable: false
                }
              }
            },
            messaging_type: 'MESSAGE_TAG',
            tag: 'ACCOUNT_UPDATE',
            access_token: campaign.accessToken
          }
        });
        
        if (response.data && response.data.message_id) {
          return {
            success: true,
            messageId: response.data.message_id
          };
        }
      }
      else if ((campaign.messageType === 'buttons' || campaign.messageType === 'enhancedButtons') && campaign.quickReplyButtons && campaign.quickReplyButtons.length > 0) {
        // First, categorize the buttons properly
        const templateButtons = [];
        const quickReplies = [];
        
        // Process all buttons and categorize them
        campaign.quickReplyButtons.forEach(button => {
          if (button.type === 'url') {
            // URL buttons go in the template
            templateButtons.push({
              type: 'web_url',
              url: button.url,
              title: button.text,
              webview_height_ratio: 'full'
            });
          } else if (button.type === 'quickReply') {
            // Quick reply buttons go in quick_replies
            quickReplies.push({
              content_type: 'text',
              title: button.text,
              payload: button.payload || button.text
            });
          } else {
            // Other buttons (text, postback, or undefined type) go in template by default
            templateButtons.push({
              type: 'postback',
              title: button.text,
              payload: button.payload || button.text
            });
          }
        });
        
        // Limit to Facebook's maximum
        const limitedTemplateButtons = templateButtons.slice(0, 3);
        const limitedQuickReplies = quickReplies.slice(0, 13); // Facebook allows up to 13 quick replies
        
        // Check if this is an enhanced button message with an image
        if (campaign.messageType === 'enhancedButtons' && campaign.imageUrl) {
          // Create message payload with template for the main content
          const messagePayload = {
            attachment: {
              type: 'template',
              payload: {
                template_type: 'generic',
                elements: [
                  {
                    title: campaign.messageText || ' ', // Facebook requires a title
                    image_url: campaign.imageUrl,
                    buttons: limitedTemplateButtons.length > 0 ? limitedTemplateButtons : undefined
                  }
                ]
              }
            }
          };
          
          // Add quick replies if we have any
          if (limitedQuickReplies.length > 0) {
            messagePayload.quick_replies = limitedQuickReplies;
          }
          
          const response = await axios({
            method: 'post',
            url: `https://graph.facebook.com/v18.0/${campaign.pageId}/messages`,
            data: {
              recipient: { id: recipient.id },
              message: messagePayload,
              messaging_type: 'MESSAGE_TAG',
              tag: 'ACCOUNT_UPDATE',
              access_token: campaign.accessToken
            }
          });
          
          if (response.data && response.data.message_id) {
            return {
              success: true,
              messageId: response.data.message_id
            };
          }
        } else {
          // Regular text + buttons
          // Build message payload based on what types of buttons we have
          let messagePayload;
          
          if (limitedTemplateButtons.length > 0) {
            // We have template buttons, use button template
            messagePayload = {
              attachment: {
                type: 'template',
                payload: {
                  template_type: 'button',
                  text: campaign.messageText,
                  buttons: limitedTemplateButtons
                }
              }
            };
          } else {
            // No template buttons, just use regular text
            messagePayload = {
              text: campaign.messageText
            };
          }
          
          // Add quick replies if we have any
          if (limitedQuickReplies.length > 0) {
            messagePayload.quick_replies = limitedQuickReplies;
          }
          
          const response = await axios({
            method: 'post',
            url: `https://graph.facebook.com/v18.0/${campaign.pageId}/messages`,
            data: {
              recipient: { id: recipient.id },
              message: messagePayload,
              messaging_type: 'MESSAGE_TAG',
              tag: 'ACCOUNT_UPDATE',
              access_token: campaign.accessToken
            }
          });
          
          if (response.data && response.data.message_id) {
            return {
              success: true,
              messageId: response.data.message_id
            };
          }
        }
      }
      
      // If we reach here without returning, something went wrong
      throw new Error('No message ID received from Facebook API');
      
    } catch (error) {
      lastError = error;
      
      // Determine if we should retry (network errors, rate limits, etc.)
      if (shouldRetry(error) && retries < MAX_RETRIES) {
        retries++;
        
        // Calculate backoff delay
        const backoffDelay = Math.min(1000 * Math.pow(2, retries), 5000); // Exponential backoff up to 5 seconds
        
        console.log(`[Page Campaign Processor] Retrying message to ${recipient.id} after error (attempt ${retries}): ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        continue;
      }
      
      // If we shouldn't retry or reached max retries, return error
      break;
    }
  }
  
  // Return failure with error details
  return {
    success: false,
    error: lastError?.response?.data?.error?.message || lastError?.message || 'Unknown error sending message',
    retries
  };
};

/**
 * Apply delay between messages based on campaign settings
 * Uses the unified delayUtils for consistent behavior
 * @param {Object} campaign - Campaign with delay settings
 * @param {Number} index - Current index in recipient list
 * @returns {Promise<void>}
 */
const applyDelay = async (campaign, index) => {
  // Skip delay if not enabled
  if (!campaign.enableDelay) {
    return;
  }
  
  // Create delay options for delayUtils
  const delayOptions = {
    mode: campaign.delayMode || 'fixed',
    delaySeconds: campaign.delaySeconds || 3,
    minDelaySeconds: campaign.minDelaySeconds || 1,
    maxDelaySeconds: campaign.maxDelaySeconds || 5,
    incrementalDelayStart: campaign.incrementalDelayStart || 1,
    incrementalDelayStep: campaign.incrementalDelayStep || 0.5,
    hasMedia: ['image', 'video'].includes(campaign.messageType),
    index: index
  };
  
  // Use the delayUtils for consistent behavior
  const delayResult = await delayUtils.applyMessageDelay(delayOptions);
  
  // Log delay for debugging
  console.log(`[Page Campaign Processor] Applied ${delayResult.actualMs}ms delay for message ${index + 1} (target: ${delayResult.targetMs}ms)`);
};

/**
 * Refund points for failed messages
 * @param {Object} campaign - Campaign object
 * @param {Number} failureCount - Number of failed messages
 * @returns {Promise<Object>} - Refund result
 */
const refundPointsForFailedMessages = async (campaign, failureCount) => {
  try {
    if (failureCount <= 0) {
      return { success: true, refunded: 0 };
    }
    
    // Get user
    const user = await User.findById(campaign.user);
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
    // Calculate points to refund
    const pointsToRefund = failureCount * POINTS_PER_MESSAGE;
    
    // Add points back to user
    user.points += pointsToRefund;
    
    // Create refund transaction
    const transaction = new Transaction({
      userId: user._id,
      type: 'refund',
      amount: pointsToRefund,
      status: 'completed',
      description: `${NOTIFICATION_TYPES.POINTS_REFUNDED}: ${pointsToRefund} نقطة للرسائل الفاشلة (${failureCount} رسالة فاشلة) من حملة "${campaign.name}"`,
      isDebit: false,
      meta: {
        campaignId: campaign._id,
        campaignName: campaign.name,
        failedMessages: failureCount,
        pointsPerMessage: POINTS_PER_MESSAGE
      }
    });
    
    // Save changes
    await Promise.all([user.save(), transaction.save()]);
    
    // Update campaign's refunded points using atomic update
    await PageMessageCampaign.updateOne(
      { _id: campaign._id },
      { $inc: { pointsRefunded: pointsToRefund } }
    );
    
    console.log(`[Page Campaign Processor] Refunded ${pointsToRefund} points to user ${user._id} for ${failureCount} failed messages in campaign ${campaign._id}`);
    
    return {
      success: true,
      refunded: pointsToRefund,
      user: user._id
    };
  } catch (error) {
    console.error(`[Page Campaign Processor] Error refunding points:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Validate campaign data before processing
 * @param {Object} campaign - Campaign to validate
 * @throws {Error} If campaign data is invalid
 */
const validateCampaign = (campaign) => {
  if (!campaign.accessToken) {
    throw new Error('رمز الوصول غير متوفر في حملة الرسائل');
  }
  
  if (!campaign.pageId) {
    throw new Error('معرف الصفحة غير متوفر في حملة الرسائل');
  }
  
  if (!campaign.recipients || campaign.recipients.length === 0) {
    throw new Error('لا يوجد مستلمين في حملة الرسائل');
  }
  
  // Message type specific validations
  if (campaign.messageType === 'text' && (!campaign.messageText || campaign.messageText.trim() === '')) {
    throw new Error('نص الرسالة مطلوب للرسائل النصية');
  }
  
  if (campaign.messageType === 'image' && (!campaign.imageUrl || campaign.imageUrl.trim() === '')) {
    throw new Error('رابط الصورة مطلوب لرسائل الصور');
  }
  
  if (campaign.messageType === 'video' && (!campaign.videoUrl || campaign.videoUrl.trim() === '')) {
    throw new Error('رابط الفيديو مطلوب لرسائل الفيديو');
  }
};

/**
 * Determine if an error should trigger a retry
 * @param {Error} error - The error to check
 * @returns {Boolean} Whether to retry
 */
const shouldRetry = (error) => {
  // Network errors should be retried
  if (!error.response) {
    return true;
  }
  
  // Rate limiting (429) should be retried
  if (error.response.status === 429) {
    return true;
  }
  
  // Certain Facebook API errors should be retried
  const fbError = error.response?.data?.error;
  if (fbError) {
    // Common retryable error codes
    const retryableCodes = [1, 2, 4, 17, 613];
    if (retryableCodes.includes(fbError.code)) {
      return true;
    }
    
    // Check message content
    if (fbError.message && (
      fbError.message.includes('temporarily') ||
      fbError.message.includes('try again') ||
      fbError.message.includes('too many') ||
      fbError.message.includes('rate limit')
    )) {
      return true;
    }
  }
  
  return false;
};

/**
 * Find and reset stuck campaigns that have been in processing state too long
 * @returns {Promise<Array>} - Reset campaigns
 */
const resetStuckCampaigns = async () => {
  try {
    // Calculate cutoff time (campaigns in processing for more than PROCESSING_TIMEOUT_MINUTES)
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - PROCESSING_TIMEOUT_MINUTES);
    
    // Find and reset stuck campaigns atomically
    const result = await PageMessageCampaign.updateMany(
      {
        status: 'processing',
        processingStartedAt: { $lt: cutoffTime }
      },
      {
        $set: {
          status: 'pending',
          processingLock: false,
          processingError: 'Campaign reset after timeout'
        }
      }
    );
    
    const resetCount = result.modifiedCount || 0;
    if (resetCount > 0) {
      console.log(`[Page Campaign Processor] Reset ${resetCount} stuck campaigns`);
    }
    
    return resetCount;
  } catch (error) {
    console.error(`[Page Campaign Processor] Error resetting stuck campaigns:`, error.message);
    return 0;
  }
};

/**
 * Check for scheduled campaigns that are due and queue them for processing
 * This is now the primary scheduler for all campaigns since campaignScheduleChecker has been removed
 * @returns {Promise<Array>} - Campaigns queued for processing
 */
const checkScheduledCampaigns = async () => {
  try {
    // Get current date/time
    const now = new Date();
    
    // Find all scheduled campaigns that are due but not yet locked for processing
    const pendingCampaigns = await PageMessageCampaign.find({
      status: 'pending',
      scheduled: true,
      scheduledTime: { $lte: now },
      processingLock: { $ne: true } // Only get campaigns that aren't locked
    });
    
    if (pendingCampaigns.length === 0) {
      return [];
    }
    
    console.log(`[Page Campaign Processor] Found ${pendingCampaigns.length} scheduled campaigns to process`);
    
    // Process each campaign with atomic locking to prevent duplicate processing
    const queueResults = [];
    for (const campaign of pendingCampaigns) {
      try {
        console.log(`[Page Campaign Processor] Processing campaign: ${campaign._id} - ${campaign.name}`);
        
        // Use atomic update to lock the campaign before processing
        const lockedCampaign = await PageMessageCampaign.findOneAndUpdate(
          { 
            _id: campaign._id, 
            processingLock: { $ne: true } // Only lock if not already locked
          },
          { 
            $set: { 
              processingLock: true,
              processingLockAcquiredAt: new Date()
            }
          },
          { new: true }
        );
        
        // Skip if we couldn't lock the campaign (another processor got it first)
        if (!lockedCampaign) {
          console.log(`[Page Campaign Processor] Campaign ${campaign._id} already being processed, skipping`);
          continue;
        }
        
        const result = await queueCampaign(campaign._id);
        queueResults.push({
          campaignId: campaign._id,
          campaignName: campaign.name,
          result
        });
      } catch (queueError) {
        console.error(`[Page Campaign Processor] Error queuing scheduled campaign ${campaign._id}:`, queueError.message);
        
        // On error, release the lock
        try {
          await PageMessageCampaign.updateOne(
            { _id: campaign._id },
            { 
              $set: { 
                processingLock: false,
                processingError: queueError.message
              }
            }
          );
        } catch (unlockError) {
          console.error(`[Page Campaign Processor] Error releasing lock for campaign ${campaign._id}:`, unlockError.message);
        }
        
        queueResults.push({
          campaignId: campaign._id,
          campaignName: campaign.name,
          error: queueError.message
        });
      }
    }
    
    return queueResults;
  } catch (error) {
    console.error(`[Page Campaign Processor] Error checking scheduled campaigns:`, error.message);
    return [];
  }
};

/**
 * Process campaigns that are already queued in the database
 * @returns {Promise<Object>} - Processing results
 */
const processQueuedCampaigns = async () => {
  if (isProcessingQueue) {
    return { success: true, message: 'Already processing queue' };
  }
  
  isProcessingQueue = true;
  
  try {
    // Find campaigns that are already in queued state
    const queuedCampaigns = await PageMessageCampaign.find({
      status: { $in: ['processing', 'queued'] },
      processingLock: { $ne: true }
    }).limit(5); // Process 5 at a time to avoid overloading
    
    if (queuedCampaigns.length === 0) {
      isProcessingQueue = false;
      return { success: true, processed: 0 };
    }
    
    console.log(`[Page Campaign Processor] Found ${queuedCampaigns.length} queued campaigns to process`);
    
    // Process each campaign
    const results = [];
    for (const campaign of queuedCampaigns) {
      try {
        const result = await queueCampaign(campaign._id);
        results.push({
          campaignId: campaign._id,
          success: result.success,
          message: result.message
        });
      } catch (error) {
        console.error(`[Page Campaign Processor] Error processing queued campaign ${campaign._id}:`, error.message);
        results.push({
          campaignId: campaign._id,
          success: false,
          error: error.message
        });
      }
    }
    
    isProcessingQueue = false;
    return {
      success: true,
      processed: results.length,
      results
    };
  } catch (error) {
    console.error(`[Page Campaign Processor] Error processing queued campaigns:`, error.message);
    isProcessingQueue = false;
    return { 
      success: false,
      error: error.message
    };
  }
};

/**
 * Initialize the campaign processor
 * Sets up periodic tasks for checking and maintenance
 * 
 * This processor is now the primary handler for all campaign processing since
 * campaignScheduleChecker.js has been removed to prevent duplicate processing.
 */
const initialize = () => {
  console.log('[Page Campaign Processor] Initializing as primary campaign processor...');
  
  // Reset any stuck campaigns on startup
  setTimeout(async () => {
    try {
      const resetCount = await resetStuckCampaigns();
      if (resetCount > 0) {
        console.log(`[Page Campaign Processor] Reset ${resetCount} stuck campaigns on startup`);
      }
      
      // Process any queued campaigns
      await processQueuedCampaigns();
      
      // Check for all scheduled campaigns that are due - no filters needed now
      await checkScheduledCampaigns();
    } catch (error) {
      console.error(`[Page Campaign Processor] Error during initialization:`, error.message);
    }
  }, 5000);
  
  console.log('[Page Campaign Processor] Initialization complete');
};

module.exports = {
  queueCampaign,
  processCampaign,
  checkScheduledCampaigns,
  resetStuckCampaigns,
  processQueuedCampaigns,
  initialize
};