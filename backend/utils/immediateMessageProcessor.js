/**
 * Immediate Message Processor
 * 
 * A utility for processing immediate message requests in the background
 * allowing messages to continue sending even if the user closes their browser.
 * 
 * This enhanced processor uses database storage instead of in-memory queues
 * to ensure message persistence across server restarts and browser closures.
 */
const axios = require('axios');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const delayUtils = require('./delayUtils');
const facebookMessageUtils = require('./facebookMessageUtils');
const InstantCampaign = require('../models/InstantCampaign');
const InstantMessage = require('../models/InstantMessage');
const mongoose = require('mongoose');

// Constants for message processing
const POINTS_PER_MESSAGE = 1;
const MAX_RETRY_ATTEMPTS = 2;
const PROCESSING_BATCH_SIZE = 10;
const LOCK_EXPIRATION_MINUTES = 30;

// Notification types for consistent messaging
const NOTIFICATION_TYPES = {
  POINTS_DEDUCTED: 'تم خصم النقاط',
  POINTS_REFUNDED: 'تم استرداد النقاط',
  POINTS_INSUFFICIENT: 'رصيد النقاط غير كافٍ'
};

// Active processing flags to prevent duplicate processing
let isProcessingIndividual = false;
let isProcessingBulk = false;
let isProcessingCampaign = false;

/**
 * Add an individual message to the database queue
 * @param {Object} messageData - The message data
 * @returns {Object} - Queue information
 */
const queueIndividualMessage = async (messageData) => {
  // Validate required fields
  if (!messageData.pageId || !messageData.accessToken || !messageData.senderId) {
    throw new Error('Missing required fields for individual message');
  }

  try {
    // Create a new InstantMessage document in the database
    const instantMessage = new InstantMessage({
      user: messageData.userId,
      type: 'individual',
      pageId: messageData.pageId,
      accessToken: messageData.accessToken,
      recipient: {
        id: messageData.senderId,
        name: messageData.senderName || ''
      },
      messageType: messageData.messageType,
      messageText: messageData.messageText,
      mediaUrl: messageData.mediaUrl,
      quickReplyButtons: messageData.quickReplyButtons,
      status: 'queued',
      deductedPoints: POINTS_PER_MESSAGE,
      processingLock: false
    });

    await instantMessage.save();
    console.log(`[Immediate Message Processor] Queued individual message ${instantMessage._id} for ${messageData.senderId}`);

    // Start processing if not already active
    if (!isProcessingIndividual) {
      processIndividualQueue();
    }

    return {
      success: true,
      queuedAt: instantMessage.createdAt,
      messageId: instantMessage._id,
      status: 'queued'
    };
  } catch (error) {
    console.error('[Immediate Message Processor] Error queueing individual message:', error);
    throw error;
  }
};

/**
 * Add a bulk message batch to the database queue
 * @param {Object} bulkMessageData - The bulk message data with recipients
 * @returns {Object} - Queue information
 */
const queueBulkMessage = async (bulkMessageData) => {
  // Validate required fields
  if (!bulkMessageData.pageId || !bulkMessageData.accessToken || !bulkMessageData.senderIds || !bulkMessageData.senderIds.length) {
    throw new Error('Missing required fields for bulk message');
  }

  try {
  // Create a new InstantCampaign document for the bulk messages
    const instantCampaign = new InstantCampaign({
      user: bulkMessageData.userId,
      name: bulkMessageData.name || `Bulk Message ${new Date().toISOString()}`,
      status: 'queued',
      pageId: bulkMessageData.pageId,
      accessToken: bulkMessageData.accessToken,
      messageType: bulkMessageData.messageType,
      messageText: bulkMessageData.messageText,
      imageUrl: bulkMessageData.imageUrl || bulkMessageData.mediaUrl,
      videoUrl: bulkMessageData.videoUrl,
      quickReplyButtons: bulkMessageData.quickReplyButtons,
      // Use full recipient data if provided, otherwise map IDs to basic objects
      recipients: bulkMessageData.recipients || bulkMessageData.senderIds.map(id => ({ 
        id, 
        name: '', 
        lastInteraction: new Date() 
      })),
      totalRecipients: (bulkMessageData.recipients || bulkMessageData.senderIds).length,
      deductedPoints: bulkMessageData.senderIds.length * POINTS_PER_MESSAGE,
      enableDelay: bulkMessageData.enableDelay !== false, // Default to true
      delayMode: bulkMessageData.delayMode || 'fixed',
      delaySeconds: bulkMessageData.delaySeconds || 3,
      minDelaySeconds: bulkMessageData.minDelaySeconds || 1,
      maxDelaySeconds: bulkMessageData.maxDelaySeconds || 5,
      incrementalDelayStart: bulkMessageData.incrementalDelayStart || 1,
      incrementalDelayStep: bulkMessageData.incrementalDelayStep || 1
    });

    await instantCampaign.save();
    console.log(`[Immediate Message Processor] Queued bulk message ${instantCampaign._id} with ${bulkMessageData.senderIds.length} recipients`);

    // Start processing if not already active
    if (!isProcessingBulk) {
      processBulkQueue();
    }

    return {
      success: true,
      queuedAt: instantCampaign.createdAt,
      campaignId: instantCampaign._id,
      status: 'queued',
      recipientCount: bulkMessageData.senderIds.length
    };
  } catch (error) {
    console.error('[Immediate Message Processor] Error queueing bulk message:', error);
    throw error;
  }
};

/**
 * Process the individual message queue from database
 * Messages are processed one at a time to ensure reliability
 */
const processIndividualQueue = async () => {
  // Set processing flag to prevent multiple concurrent processing
  if (isProcessingIndividual) {
    return;
  }
  
  isProcessingIndividual = true;

  try {
    let continueProcessing = true;
    
    while (continueProcessing) {
      // Calculate lock expiration time
      const lockExpirationTime = new Date();
      lockExpirationTime.setMinutes(lockExpirationTime.getMinutes() - LOCK_EXPIRATION_MINUTES);
      
      // Find an unlocked message or one with an expired lock
      const message = await InstantMessage.findOneAndUpdate(
        {
          type: 'individual',
          status: 'queued',
          $or: [
            { processingLock: false },
            { processingLockAcquiredAt: { $lt: lockExpirationTime } }
          ]
        },
        {
          $set: {
            processingLock: true,
            processingLockAcquiredAt: new Date(),
            status: 'processing',
            processingStartedAt: new Date()
          },
          $inc: { processingAttempts: 1 }
        },
        { new: true }
      );
      
      if (!message) {
        // No messages to process
        continueProcessing = false;
        continue;
      }
      
      console.log(`[Immediate Message Processor] Processing individual message ${message._id} for ${message.recipient.id}`);
      
      try {
        // Prepare message data
        const messageData = {
          pageId: message.pageId,
          accessToken: message.accessToken,
          senderId: message.recipient.id,
          messageType: message.messageType,
          messageText: message.messageText,
          mediaUrl: message.mediaUrl || message.imageUrl || message.videoUrl,
          quickReplyButtons: message.quickReplyButtons,
          userId: message.user
        };
        
        // Send the message
        const result = await sendIndividualMessage(messageData);
        
        // Update message status based on result
        if (result.success) {
          message.status = 'completed';
          message.messageId = result.messageId;
          message.processingCompletedAt = new Date();
          message.processingLock = false;
          message.result = { 
            success: true,
            messageId: result.messageId,
            processingTimeMs: result.processingTimeMs
          };
          
          console.log(`[Immediate Message Processor] Successfully sent message ${message._id} to ${message.recipient.id}`);
        } else {
          message.status = 'failed';
          message.processingCompletedAt = new Date();
          message.processingLock = false;
          message.result = {
            success: false,
            error: result.error,
            errorCode: result.errorCode,
            processingTimeMs: result.processingTimeMs
          };
          
          console.error(`[Immediate Message Processor] Failed to send message ${message._id} to ${message.recipient.id}:`, result.error);
          
          // Handle point refunds for failed messages
          await handleMessageFailureRefund(message);
        }
        
        await message.save();
      } catch (error) {
        // Handle unexpected errors
        console.error(`[Immediate Message Processor] Error processing individual message ${message._id}:`, error);
        
        message.status = 'failed';
        message.processingCompletedAt = new Date();
        message.processingLock = false;
        message.result = {
          success: false,
          error: error.message || 'Unknown error processing message'
        };
        
        await message.save();
        
        // Handle point refunds for failed messages
        await handleMessageFailureRefund(message);
      }
    }
  } catch (error) {
    console.error('[Immediate Message Processor] Error in individual queue processing:', error);
  } finally {
    // Reset processing flag
    isProcessingIndividual = false;
  }
};

/**
 * Process the bulk message queue from database
 * Each bulk message is processed as a campaign
 */
const processBulkQueue = async () => {
  // Set processing flag to prevent multiple concurrent processing
  if (isProcessingBulk) {
    return;
  }
  
  isProcessingBulk = true;

  try {
    let continueProcessing = true;
    
    while (continueProcessing) {
      // Calculate lock expiration time
      const lockExpirationTime = new Date();
      lockExpirationTime.setMinutes(lockExpirationTime.getMinutes() - LOCK_EXPIRATION_MINUTES);
      
      // Find an unlocked bulk message campaign or one with an expired lock
      const campaign = await InstantCampaign.findOneAndUpdate(
        {
          status: 'queued',
          $or: [
            { processingLock: { $ne: true } },
            { processingLockAcquiredAt: { $lt: lockExpirationTime } }
          ]
        },
        {
          $set: {
            processingLock: true,
            processingLockAcquiredAt: new Date(),
            status: 'processing',
            processingStartedAt: new Date()
          },
          $inc: { processingAttempts: 1 }
        },
        { new: true }
      );
      
      if (!campaign) {
        // No campaigns to process
        continueProcessing = false;
        continue;
      }
      
      console.log(`[Immediate Message Processor] Processing bulk message campaign ${campaign._id} with ${campaign.recipients.length} recipients`);
      
      try {
        // Process the campaign
        await processCampaign(campaign);
      } catch (error) {
        console.error(`[Immediate Message Processor] Error processing bulk message campaign ${campaign._id}:`, error);
        
        // Handle campaign failure
        campaign.status = 'failed';
        campaign.processingCompletedAt = new Date();
        campaign.processingLock = false;
        campaign.processingError = error.message || 'Unknown error processing campaign';
        await campaign.save();
        
        // Handle point refunds for failed campaign
        try {
          const remainingRecipients = campaign.totalRecipients - (campaign.sent || 0) - (campaign.failed || 0);
          if (remainingRecipients > 0) {
            await refundPointsForFailedMessages(campaign, remainingRecipients);
          }
        } catch (refundError) {
          console.error(`[Immediate Message Processor] Error refunding points:`, refundError);
        }
      }
    }
  } catch (error) {
    console.error('[Immediate Message Processor] Error in bulk queue processing:', error);
  } finally {
    // Reset processing flag
    isProcessingBulk = false;
  }
};

/**
 * Queue a campaign for background processing
 * @param {Object} campaignData - Campaign data to process
 * @returns {Object} - Queue information and campaign ID
 */
const queueCampaign = async (campaignData) => {
  try {
    // Validate required fields
    if (!campaignData.pageId || !campaignData.accessToken || !campaignData.recipients || campaignData.recipients.length === 0) {
      throw new Error('Missing required fields for campaign');
    }

    // Create a new InstantCampaign record
    const campaign = new InstantCampaign({
      user: campaignData.userId,
      name: campaignData.name || `Campaign ${new Date().toISOString()}`,
      status: 'queued',
      pageId: campaignData.pageId,
      accessToken: campaignData.accessToken,
      messageType: campaignData.messageType,
      messageText: campaignData.messageText,
      imageUrl: campaignData.imageUrl,
      videoUrl: campaignData.videoUrl,
      quickReplyButtons: campaignData.quickReplyButtons,
      recipients: campaignData.recipients,
      totalRecipients: campaignData.recipients.length,
      deductedPoints: campaignData.deductedPoints || campaignData.recipients.length, // 1 point per recipient by default
      enableDelay: campaignData.enableDelay !== false, // Default to true
      delaySeconds: campaignData.delaySeconds || 3,
      delayMode: campaignData.delayMode || 'fixed',
      minDelaySeconds: campaignData.minDelaySeconds || 1,
      maxDelaySeconds: campaignData.maxDelaySeconds || 5,
      incrementalDelayStart: campaignData.incrementalDelayStart || 1,
      incrementalDelayStep: campaignData.incrementalDelayStep || 1
    });

    // Save to database
    await campaign.save();
    
    console.log(`[Immediate Message Processor] Queued campaign ${campaign._id} with ${campaign.recipients.length} recipients`);

    // Start processing if not already active
    if (!isProcessingCampaign) {
      processCampaignQueue();
    }

    return {
      success: true,
      campaignId: campaign._id,
      queuedAt: campaign.createdAt,
      recipientCount: campaign.recipients.length,
      status: 'queued'
    };
  } catch (error) {
    console.error('[Immediate Message Processor] Error queueing campaign:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Process the campaign queue from database
 * Each campaign is processed one at a time
 */
const processCampaignQueue = async () => {
  // Set processing flag to prevent multiple concurrent processing
  if (isProcessingCampaign) {
    return;
  }
  
  isProcessingCampaign = true;

  try {
    let continueProcessing = true;
    
    while (continueProcessing) {
      // Calculate lock expiration time
      const lockExpirationTime = new Date();
      lockExpirationTime.setMinutes(lockExpirationTime.getMinutes() - LOCK_EXPIRATION_MINUTES);
      
      // Find an unlocked campaign or one with an expired lock
      const campaign = await InstantCampaign.findOneAndUpdate(
        {
          status: 'queued',
          $or: [
            { processingLock: { $ne: true } },
            { processingLockAcquiredAt: { $lt: lockExpirationTime } }
          ]
        },
        {
          $set: {
            processingLock: true,
            processingLockAcquiredAt: new Date(),
            status: 'processing',
            processingStartedAt: new Date()
          },
          $inc: { processingAttempts: 1 }
        },
        { new: true }
      );
      
      if (!campaign) {
        // No campaigns to process
        continueProcessing = false;
        continue;
      }
      
      console.log(`[Immediate Message Processor] Processing campaign ${campaign._id} with ${campaign.recipients.length} recipients`);
      
      try {
        // Process the campaign
        await processCampaign(campaign);
      } catch (error) {
        console.error(`[Immediate Message Processor] Error processing campaign ${campaign._id}:`, error);
        
        // Handle campaign failure
        campaign.status = 'failed';
        campaign.processingCompletedAt = new Date();
        campaign.processingLock = false;
        campaign.processingError = error.message || 'Unknown error processing campaign';
        await campaign.save();
        
        // Handle point refunds for failed campaign
        try {
          const remainingRecipients = campaign.totalRecipients - (campaign.sent || 0) - (campaign.failed || 0);
          if (remainingRecipients > 0) {
            await refundPointsForFailedMessages(campaign, remainingRecipients);
          }
        } catch (refundError) {
          console.error(`[Immediate Message Processor] Error refunding points:`, refundError);
        }
      }
    }
  } catch (error) {
    console.error('[Immediate Message Processor] Error in campaign queue processing:', error);
  } finally {
    // Reset processing flag
    isProcessingCampaign = false;
  }
};

/**
 * Send an individual message with retry logic
 * @param {Object} message - The message data
 * @returns {Object} - Result of sending
 */
const sendIndividualMessage = async (message) => {
  try {
    // Extract message components
    const { 
      pageId, 
      accessToken, 
      senderId, 
      messageType, 
      messageText, 
      mediaUrl,
      quickReplyButtons,
      userId 
    } = message;

    // Prepare message payload based on type
    let response;
    const startTime = Date.now();

    // Use the facebookMessageUtils for reliable delivery
    if (messageType === 'text') {
      // Send text message
      response = await facebookMessageUtils.sendFacebookDirectMessage(
        senderId,
        messageText,
        accessToken,
        pageId,
        { 
          tag: "ACCOUNT_UPDATE",
          quickReplyButtons: quickReplyButtons
        }
      );
    } 
    else if (messageType === 'image' || messageType === 'video') {
      // Send media message
      response = await facebookMessageUtils.sendFacebookMediaMessage(
        senderId,
        messageText,
        mediaUrl,
        accessToken,
        pageId,
        { 
          mediaType: messageType,
          tag: "ACCOUNT_UPDATE",
          quickReplyButtons: quickReplyButtons 
        }
      );
    }
    else if (messageType === 'buttons' || messageType === 'enhancedButtons') {
      // For button messages, use the advanced utilities
      if (messageType === 'enhancedButtons' && mediaUrl) {
      // Enhanced buttons with image - need to separate URL buttons from quick reply buttons
      // URL buttons need to be part of the template with the image
      const urlButtons = [];
      const quickReplies = [];
      
      if (quickReplyButtons && quickReplyButtons.length > 0) {
        // Sort buttons by type
        quickReplyButtons.forEach(button => {
          if (button.type === 'url') {
            // URL buttons will be attached to the image in a template
            urlButtons.push({
              type: 'web_url',
              url: button.url,
              title: button.text
            });
          } else if (button.type === 'postback' || !button.type) {
            // Postback buttons will also be attached to the image in a template
            urlButtons.push({
              type: 'postback',
              payload: button.payload || button.text,
              title: button.text
            });
          } else {
            // Only special quick reply buttons remain separate
            quickReplies.push(button);
          }
        });
      }
      
      response = await facebookMessageUtils.sendFacebookMediaMessage(
        senderId,
        messageText,
        mediaUrl,
        accessToken,
        pageId,
        {
          tag: "ACCOUNT_UPDATE",
          mediaType: 'image',
          urlButtons: urlButtons, // Pass URL buttons separately from quick replies
          quickReplyButtons: quickReplies,
          useGenericTemplate: true, // Signal to use a generic template for image+buttons
          sendTextSeparately: false // Crucial: Don't send text separately from the template
        }
      );
      } else {
        // Regular buttons
        response = await facebookMessageUtils.sendFacebookDirectMessage(
          senderId,
          messageText,
          accessToken,
          pageId,
          {
            tag: "ACCOUNT_UPDATE",
            quickReplyButtons: quickReplyButtons
          }
        );
      }
    }
    else if (messageType === 'quickReplies') {
      // Quick replies message
      response = await facebookMessageUtils.sendFacebookDirectMessage(
        senderId,
        messageText,
        accessToken,
        pageId,
        {
          tag: "ACCOUNT_UPDATE",
          quickReplyButtons: quickReplyButtons
        }
      );
    }
    
    // Handle response
    if (response.success) {
      // Record successful transaction if user ID is provided
      if (userId) {
        try {
          const transaction = new Transaction({
            userId: userId,
            type: 'points_deduction',
            amount: POINTS_PER_MESSAGE,
            status: 'completed',
            description: `خصم ${POINTS_PER_MESSAGE} نقطة: إرسال رسالة لصفحة ${pageId}`,
            isDebit: true,
            meta: {
              messageType: 'instant',
              pageId: pageId,
              recipientId: senderId
            }
          });
          
          await transaction.save();
        } catch (txError) {
          console.error('[Immediate Message Processor] Error recording transaction:', txError);
          // Continue despite transaction error - message was sent
        }
      }
      
      // Return success
      return {
        success: true,
        messageId: response.messageId,
        senderId: senderId,
        processingTimeMs: Date.now() - startTime
      };
    } else {
      // Message failed - no refund here, will be handled separately
      return {
        success: false,
        error: response.error || 'Unknown error sending message',
        errorCode: response.code,
        senderId: senderId,
        processingTimeMs: Date.now() - startTime
      };
    }
  } catch (error) {
    // Handle unexpected errors
    return {
      success: false,
      error: error.message || 'Unexpected error sending message',
      senderId: message.senderId
    };
  }
};

/**
 * Handle refund for a failed individual message
 * @param {Object} message - The InstantMessage document
 * @returns {Promise<void>}
 */
const handleMessageFailureRefund = async (message) => {
  if (!message.user || !message.deductedPoints) {
    return;
  }
  
  try {
    // Restore points to user
    const user = await User.findById(message.user);
    if (user) {
      user.points += message.deductedPoints;
      await user.save();
      
      // Record refund transaction
      const refundTransaction = new Transaction({
        userId: message.user,
        type: 'refund',
        amount: message.deductedPoints,
        status: 'completed',
        description: `استرداد نقاط - فشل إرسال رسالة لصفحة ${message.pageId}`,
        isDebit: false,
        meta: {
          messageType: 'instant',
          pageId: message.pageId,
          recipientId: message.recipient.id,
          failureReason: message.result?.error || 'فشل في الإرسال'
        }
      });
      await refundTransaction.save();
      
      // Update message with refund information
      message.pointsRefunded = message.deductedPoints;
      message.refundTransactionId = refundTransaction._id;
      await message.save();
      
      console.log(`[Immediate Message Processor] Refunded ${message.deductedPoints} points to user ${message.user} for failed message ${message._id}`);
    }
  } catch (refundError) {
    console.error('[Immediate Message Processor] Error refunding points:', refundError);
  }
};

/**
 * Process a single campaign
 * @param {Object} campaign - The campaign object from database
 * @returns {Promise<void>}
 */
const processCampaign = async (campaign) => {
  // Initialize tracking variables
  let successCount = 0;
  let failureCount = 0;
  let results = [];
  
  // Calculate delay options based on campaign settings
  const delayOptions = {
    mode: campaign.delayMode,
    delaySeconds: campaign.delaySeconds,
    minDelaySeconds: campaign.minDelaySeconds,
    maxDelaySeconds: campaign.maxDelaySeconds,
    incrementalDelayStart: campaign.incrementalDelayStart,
    incrementalDelayStep: campaign.incrementalDelayStep,
    hasMedia: ['image', 'video', 'enhancedButtons'].includes(campaign.messageType)
  };
  
  // Process start time for metrics
  const processStartTime = Date.now();
  
  // Get current position (for resuming interrupted campaigns)
  let currentPosition = campaign.current || 0;
  
  // Process each recipient with proper delay
  for (let i = currentPosition; i < campaign.recipients.length; i++) {
    const recipient = campaign.recipients[i];
    if (!recipient || !recipient.id) {
      console.warn(`[Immediate Message Processor] Invalid recipient at index ${i}. Skipping.`);
      failureCount++;
      continue;
    }
    
    try {
      // Send message to the recipient
      const sendResult = await sendCampaignMessage(campaign, recipient);
      
      // Track result with MongoDB atomic update
      if (sendResult.success) {
        successCount++;
        
        // Create result object for this recipient
        const resultObj = {
          recipient: {
            id: recipient.id,
            name: recipient.name || ''
          },
          success: true,
          messageId: sendResult.messageId,
          sentAt: new Date()
        };
        
        // Add to in-memory results for the batch
        results.push(resultObj);
        
        // Update campaign in the database with atomic operations
        await InstantCampaign.updateOne(
          { _id: campaign._id },
          {
            $set: { current: i + 1 },
            $inc: { sent: 1 },
            $push: {
              results: { 
                $each: [resultObj],
                $slice: -50 // Keep only the most recent 50 results
              }
            }
          }
        );
      } else {
        failureCount++;
        
        // Create result object for this recipient
        const resultObj = {
          recipient: {
            id: recipient.id,
            name: recipient.name || ''
          },
          success: false,
          error: sendResult.error || 'Unknown error',
          sentAt: new Date()
        };
        
        // Add to in-memory results for the batch
        results.push(resultObj);
        
        // Update campaign in the database with atomic operations
        await InstantCampaign.updateOne(
          { _id: campaign._id },
          {
            $set: { current: i + 1 },
            $inc: { failed: 1 },
            $push: {
              results: { 
                $each: [resultObj],
                $slice: -50 // Keep only the most recent 50 results
              }
            }
          }
        );
      }
      
      // Update the database periodically with batch operations
      if (results.length >= PROCESSING_BATCH_SIZE || i === campaign.recipients.length - 1) {
        console.log(`[Immediate Message Processor] Campaign ${campaign._id}: Processed ${i + 1}/${campaign.recipients.length} recipients (${successCount} success, ${failureCount} failures)`);
        
        // Clear the batch results after updating
        results = [];
      }
      
      // Apply delay between messages if enabled and not the last message
      if (campaign.enableDelay && i < campaign.recipients.length - 1) {
        // Set the index for incremental delay
        delayOptions.index = i;
        
        // Apply delay
        await delayUtils.applyMessageDelay(delayOptions);
      }
    } catch (error) {
      console.error(`[Immediate Message Processor] Error processing campaign recipient ${recipient.id}:`, error);
      
      failureCount++;
      
      // Update campaign in the database
      await InstantCampaign.updateOne(
        { _id: campaign._id },
        {
          $set: { current: i + 1 },
          $inc: { failed: 1 },
          $push: {
            results: { 
              $each: [{
                recipient: {
                  id: recipient.id,
                  name: recipient.name || ''
                },
                success: false,
                error: error.message || 'Error processing recipient',
                sentAt: new Date()
              }],
              $slice: -50 // Keep only the most recent 50 results
            }
          }
        }
      );
    }
  }
  
  // Handle point refunds for failed messages
  if (failureCount > 0) {
    try {
      await refundPointsForFailedMessages(campaign, failureCount);
    } catch (refundError) {
      console.error(`[Immediate Message Processor] Error refunding points:`, refundError);
    }
  }
  
  // Calculate process time
  const processEndTime = Date.now();
  const totalProcessingTime = (processEndTime - processStartTime) / 1000; // in seconds
  
  // Update campaign with final results
  campaign.status = 'completed';
  campaign.processingCompletedAt = new Date();
  campaign.processingLock = false;
  
  // Add delivery stats
  campaign.deliveryStats = {
    avgResponseTimeMs: 0, // Can be calculated if we track response times per message
    avgDelayMs: campaign.delaySeconds * 1000,
    successRate: campaign.recipients.length > 0 ? (successCount / campaign.recipients.length) * 100 : 0,
    completionTimeMinutes: totalProcessingTime / 60,
    lastDeliveryDate: new Date(),
    deliveryStartDate: campaign.processingStartedAt
  };
  
  // Add points info
  if (!campaign.pointsInfo) {
    campaign.pointsInfo = {};
  }
  
  campaign.pointsInfo = {
    totalPointsDeducted: campaign.deductedPoints || campaign.recipients.length,
    pointsRefunded: campaign.pointsRefunded || 0,
    pointsPerMessage: POINTS_PER_MESSAGE,
    refundPolicy: 'يتم استرداد نقطة واحدة لكل رسالة فاشلة',
    lastRefundDate: failureCount > 0 ? new Date() : null
  };
  
  // Save final update
  await campaign.save();
  
  console.log(`[Immediate Message Processor] Campaign ${campaign._id} completed: ${successCount} succeeded, ${failureCount} failed`);
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
    
    // If facebookMessageUtils is available, use its personalization function after our replacements
    if (facebookMessageUtils && typeof facebookMessageUtils.personalizeMessageText === 'function') {
      // Convert our format to facebookMessageUtils format
      personalizedText = personalizedText
        .replace(/#recipient_name#/g, '[[name]]')
        .replace(/#date#/g, '[[currentDate]]')
        .replace(/#time#/g, '[[currentTime]]');
      
      // Apply facebookMessageUtils personalization with recipient data
      personalizedText = facebookMessageUtils.personalizeMessageText(
        { messageText: personalizedText, personalizeMessage: true },
        recipient
      );
    }
    
    return personalizedText;
  } catch (error) {
    console.error('Error in message personalization:', error);
    return text; // Return original text if personalization fails
  }
};

/**
 * Send a campaign message to a single recipient
 * @param {Object} campaign - The campaign object
 * @param {Object} recipient - The recipient object
 * @returns {Promise<Object>} - Send result
 */
const sendCampaignMessage = async (campaign, recipient) => {
  try {
    // Extract recipient data
    const recipientId = recipient.id;
    
    // Personalize message text if enabled
    let messageText = campaign.messageText;
    if (campaign.personalizeMessage !== false && messageText) {
      messageText = personalizeMessage(messageText, recipient);
    }
    
    // Send based on message type using existing utilities
    let response;
    
    if (campaign.messageType === 'text') {
      response = await facebookMessageUtils.sendFacebookDirectMessage(
        recipientId,
        messageText,
        campaign.accessToken,
        campaign.pageId,
        { 
          tag: "ACCOUNT_UPDATE",
          quickReplyButtons: campaign.quickReplyButtons
        }
      );
    } 
    else if (campaign.messageType === 'image') {
      response = await facebookMessageUtils.sendFacebookMediaMessage(
        recipientId,
        messageText,
        campaign.imageUrl,
        campaign.accessToken,
        campaign.pageId,
        { 
          mediaType: 'image',
          tag: "ACCOUNT_UPDATE",
          quickReplyButtons: campaign.quickReplyButtons 
        }
      );
    }
    else if (campaign.messageType === 'video') {
      response = await facebookMessageUtils.sendFacebookMediaMessage(
        recipientId,
        campaign.messageText,
        campaign.videoUrl,
        campaign.accessToken,
        campaign.pageId,
        { 
          mediaType: 'video',
          tag: "ACCOUNT_UPDATE",
          quickReplyButtons: campaign.quickReplyButtons 
        }
      );
    }
    else if (campaign.messageType === 'buttons' || campaign.messageType === 'enhancedButtons') {
      if (campaign.messageType === 'enhancedButtons' && campaign.imageUrl) {
        // Enhanced buttons with image - need to separate URL buttons from quick reply buttons
        const urlButtons = [];
        const quickReplies = [];
        
        if (campaign.quickReplyButtons && campaign.quickReplyButtons.length > 0) {
          // Sort buttons by type
          campaign.quickReplyButtons.forEach(button => {
            if (button.type === 'url') {
              // URL buttons will be attached to the image in a template
              urlButtons.push({
                type: 'web_url',
                url: button.url,
                title: button.text
              });
            } else if (button.type === 'postback' || !button.type) {
              // Postback buttons will also be attached to the image in a template
              urlButtons.push({
                type: 'postback',
                payload: button.payload || button.text,
                title: button.text
              });
            } else {
              // Only special quick reply buttons remain separate
              quickReplies.push(button);
            }
          });
        }
        
        response = await facebookMessageUtils.sendFacebookMediaMessage(
          recipientId,
          campaign.messageText,
          campaign.imageUrl,
          campaign.accessToken,
          campaign.pageId,
          {
            mediaType: 'image',
            tag: "ACCOUNT_UPDATE",
            urlButtons: urlButtons, // Pass URL buttons separately
            quickReplyButtons: quickReplies,
            useGenericTemplate: true // Signal to use a generic template
          }
        );
      } else {
        // Regular buttons
        response = await facebookMessageUtils.sendFacebookDirectMessage(
          recipientId,
          campaign.messageText,
          campaign.accessToken,
          campaign.pageId,
          {
            tag: "ACCOUNT_UPDATE",
            quickReplyButtons: campaign.quickReplyButtons
          }
        );
      }
    }
    else if (campaign.messageType === 'quickReplies') {
      response = await facebookMessageUtils.sendFacebookDirectMessage(
        recipientId,
        campaign.messageText,
        campaign.accessToken,
        campaign.pageId,
        {
          tag: "ACCOUNT_UPDATE",
          quickReplyButtons: campaign.quickReplyButtons
        }
      );
    }
    
    // Return result based on response
    if (response && response.success) {
      return {
        success: true,
        messageId: response.messageId || 'message_sent',
        recipientId
      };
    } else {
      return {
        success: false,
        error: response?.error || 'Unknown error sending message',
        recipientId
      };
    }
  } catch (error) {
    console.error(`[Immediate Message Processor] Error sending campaign message to ${recipient.id}:`, error);
    return {
      success: false,
      error: error.message,
      recipientId: recipient.id
    };
  }
};

/**
 * Refund points for failed messages in a campaign
 * @param {Object} campaign - Campaign object
 * @param {Number} failureCount - Number of failed messages
 * @returns {Promise<Object>} - Refund result
 */
const refundPointsForFailedMessages = async (campaign, failureCount) => {
  if (failureCount <= 0 || !campaign.user) {
    return { success: true, refunded: 0 };
  }
  
  try {
    // Calculate points to refund
    const pointsToRefund = failureCount * POINTS_PER_MESSAGE;
    
    // Get user
    const user = await User.findById(campaign.user);
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
    // Add points back to user
    user.points += pointsToRefund;
    
    // Create refund transaction
    const transaction = new Transaction({
      userId: user._id,
      type: 'refund',
      amount: pointsToRefund,
      status: 'completed',
      description: `استرداد ${pointsToRefund} نقطة للرسائل الفاشلة (${failureCount} رسالة فاشلة) من حملة "${campaign.name}"`,
      isDebit: false,
      meta: {
        campaignId: campaign._id,
        campaignName: campaign.name,
        failedMessages: failureCount
      }
    });
    
    // Save changes
    await Promise.all([
      user.save(),
      transaction.save()
    ]);
    
    // Update campaign's refund tracking using atomic update
    await InstantCampaign.updateOne(
      { _id: campaign._id },
      { 
        $inc: { pointsRefunded: pointsToRefund },
        $set: { 'pointsInfo.lastRefundDate': new Date() }
      }
    );
    
    return {
      success: true,
      refunded: pointsToRefund,
      userId: user._id
    };
  } catch (error) {
    console.error(`[Immediate Message Processor] Error refunding points:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Find and reset stuck messages and campaigns
 * @returns {Promise<Object>} - Reset results
 */
const resetStuckProcessing = async () => {
  try {
    const lockExpirationTime = new Date();
    lockExpirationTime.setMinutes(lockExpirationTime.getMinutes() - LOCK_EXPIRATION_MINUTES);
    
    // Reset stuck individual messages
    const stuckMessages = await InstantMessage.updateMany(
      {
        status: 'processing',
        processingLockAcquiredAt: { $lt: lockExpirationTime }
      },
      {
        $set: {
          status: 'queued',
          processingLock: false,
          processingError: 'Reset after timeout'
        }
      }
    );
    
    // Reset stuck campaigns
    const stuckCampaigns = await InstantCampaign.updateMany(
      {
        status: 'processing',
        processingLockAcquiredAt: { $lt: lockExpirationTime }
      },
      {
        $set: {
          status: 'queued',
          processingLock: false,
          processingError: 'Reset after timeout'
        }
      }
    );
    
    console.log(`[Immediate Message Processor] Reset ${stuckMessages.modifiedCount} stuck messages and ${stuckCampaigns.modifiedCount} stuck campaigns`);
    
    return {
      stuckMessages: stuckMessages.modifiedCount,
      stuckCampaigns: stuckCampaigns.modifiedCount
    };
  } catch (error) {
    console.error('[Immediate Message Processor] Error resetting stuck processing:', error);
    return { error: error.message };
  }
};

/**
 * Get queue status information
 * @returns {Promise<Object>} - Queue status
 */
const getQueueStatus = async () => {
  try {
    // Count pending individual messages
    const individualCount = await InstantMessage.countDocuments({
      type: 'individual',
      status: 'queued'
    });
    
    // Count pending campaigns
    const campaignCount = await InstantCampaign.countDocuments({
      status: 'queued'
    });
    
    // Get processing statuses
    const processingMessages = await InstantMessage.countDocuments({
      type: 'individual',
      status: 'processing'
    });
    
    const processingCampaigns = await InstantCampaign.countDocuments({
      status: 'processing'
    });
    
    return {
      individual: {
        queued: individualCount,
        processing: processingMessages > 0 || isProcessingIndividual
      },
      bulk: {
        queued: campaignCount,
        processing: processingCampaigns > 0 || isProcessingBulk || isProcessingCampaign
      },
      timestamp: new Date()
    };
  } catch (error) {
    console.error('[Immediate Message Processor] Error getting queue status:', error);
    return {
      error: error.message,
      timestamp: new Date()
    };
  }
};

/**
 * Initialize the processor
 * Sets up scheduled tasks for maintenance
 */
const initialize = () => {
  console.log('[Immediate Message Processor] Initializing...');
  
  // Reset any stuck messages and campaigns
  resetStuckProcessing().catch(err => {
    console.error('[Immediate Message Processor] Error during initialization reset:', err);
  });
  
  // Start the processing loops
  setTimeout(() => {
    processIndividualQueue().catch(err => {
      console.error('[Immediate Message Processor] Error starting individual queue:', err);
    });
    
    processBulkQueue().catch(err => {
      console.error('[Immediate Message Processor] Error starting bulk queue:', err);
    });
    
    processCampaignQueue().catch(err => {
      console.error('[Immediate Message Processor] Error starting campaign queue:', err);
    });
  }, 2000);
  
  console.log('[Immediate Message Processor] Initialization complete');
};

module.exports = {
  queueIndividualMessage,
  queueBulkMessage,
  queueCampaign,
  getQueueStatus,
  resetStuckProcessing,
  initialize,
  // Expose these for testing/debugging
  processIndividualQueue,
  processBulkQueue,
  processCampaignQueue
};