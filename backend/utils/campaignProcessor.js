/**
 * Campaign Processor - Advanced utility for handling Facebook Page Message Campaigns
 * with improved delay management, point handling, and error recovery
 */
const axios = require('axios');
const User = require('../models/User');
const PageMessageCampaign = require('../models/PageMessageCampaign');
const Transaction = require('../models/Transaction');
const delayUtils = require('./delayUtils');

// Constants for campaign processing
const POINTS_PER_MESSAGE = 1;
const MAX_RETRY_ATTEMPTS = 2;

// Notification types for consistent messaging
const NOTIFICATION_TYPES = {
  POINTS_DEDUCTED: 'تم خصم النقاط',
  POINTS_REFUNDED: 'تم استرداد النقاط',
  POINTS_INSUFFICIENT: 'رصيد النقاط غير كافٍ'
};

/**
 * Process a campaign with reliable delay handling and point management
 * @param {string} campaignId - The ID of the campaign to process
 * @returns {Promise<Object>} - Processing results
 */
const processCampaign = async (campaignId) => {
  console.log(`[Campaign Processor] Starting to process campaign: ${campaignId}`);
  let campaign = null;
  
  try {
    // Get campaign with populated user (for point handling)
    campaign = await PageMessageCampaign.findById(campaignId);
    
    if (!campaign) {
      throw new Error(`Campaign with ID ${campaignId} not found`);
    }
    
    // Mark as processing if not already
    if (campaign.status !== 'processing') {
      campaign.status = 'processing';
      campaign.processingStartedAt = new Date();
      campaign.processingAttempts += 1;
      await campaign.save();
    }
    
    // Validate campaign data
    if (!campaign.accessToken) {
      throw new Error('رمز الوصول غير متوفر في حملة الرسائل');
    }
    
    if (!campaign.pageId) {
      throw new Error('معرف الصفحة غير متوفر في حملة الرسائل');
    }
    
    if (!campaign.recipients || campaign.recipients.length === 0) {
      throw new Error('لا يوجد مستلمين في حملة الرسائل');
    }
    
    // Set up metrics for tracking
    const processStartTime = Date.now();
    let successCount = 0;
    let failureCount = 0;
    let results = [];
    let delayMetrics = [];
    
    // Get current position (or reset to 0)
    let currentPosition = campaign.current || 0;
    
    // Process recipients starting from current position
    for (let i = currentPosition; i < campaign.recipients.length; i++) {
      const recipient = campaign.recipients[i];
      if (!recipient || !recipient.id) {
        console.warn(`[Campaign Processor] Invalid recipient at index ${i}. Skipping.`);
        continue;
      }
      
      try {
        // Process message sending with retries
        const processingStart = Date.now();
        const result = await sendMessage(campaign, recipient);
        const processingEnd = Date.now();
        
        // Record result
        if (result.success) {
          successCount++;
          results.push({
            recipient: {
              id: recipient.id,
              name: recipient.name || ''
            },
            success: true,
            messageId: result.messageId,
            responseTimeMs: processingEnd - processingStart,
            retries: result.retries || 0,
            sentAt: new Date()
          });
        } else {
          failureCount++;
          results.push({
            recipient: {
              id: recipient.id,
              name: recipient.name || ''
            },
            success: false,
            error: result.error || 'فشل في إرسال الرسالة',
            errorCode: result.errorCode,
            retries: result.retries || 0,
            sentAt: new Date()
          });
        }
        
        // Apply intelligent delay between messages if not the last message
        if (i < campaign.recipients.length - 1) {
          const delayResult = await applyDelay(campaign, i);
          
          // Track enhanced delay metrics
          delayMetrics.push({
            messageIndex: i,
            recipientId: recipient.id,
            targetMs: delayResult.targetMs,
            actualMs: delayResult.actualMs,
            mode: delayResult.mode || campaign.delayMode || 'fixed',
            timestamp: delayResult.timestamp || new Date()
          });
          
          // Update campaign with the latest delay info more frequently
          if ((i + 1) % 3 === 0) { // Update every 3 recipients for better tracking
            try {
              await PageMessageCampaign.updateOne(
                { _id: campaign._id },
                { 
                  $set: { 
                    lastProcessedIndex: i,
                    lastDelayMetric: {
                      appliedAt: new Date(),
                      messageIndex: i,
                      targetMs: delayResult.targetMs,
                      actualMs: delayResult.actualMs,
                      mode: delayResult.mode || campaign.delayMode
                    }
                  }
                }
              );
              
              console.log(`[Campaign Processor] Updated campaign with latest delay metrics at index ${i}`);
            } catch (updateErr) {
              console.warn(`[Campaign Processor] Failed to update delay metrics: ${updateErr.message}`);
            }
          }
        }
        
        // Update progress periodically (every 5 messages or at the end)
        if ((i + 1) % 5 === 0 || i === campaign.recipients.length - 1) {
          campaign.current = i + 1;
          campaign.sent = successCount;
          campaign.failed = failureCount;
          campaign.delayMetrics = [...campaign.delayMetrics || [], ...delayMetrics];
          await campaign.save();
        }
      } catch (recipientError) {
        console.error(`[Campaign Processor] Error processing recipient ${recipient.id}:`, recipientError);
        failureCount++;
        
        results.push({
          recipient: {
            id: recipient.id,
            name: recipient.name || ''
          },
          success: false,
          error: recipientError.message || 'خطأ غير معروف',
          sentAt: new Date()
        });
      }
    }
    
    // Calculate metrics
    const processEndTime = Date.now();
    const totalProcessingTime = (processEndTime - processStartTime) / 1000; // in seconds
    
    // Handle point refunds for failed messages
    if (failureCount > 0) {
      await handlePointRefunds(campaign, failureCount);
    }
    
    // Update campaign completion status
    campaign.status = 'completed';
    campaign.sent = successCount;
    campaign.failed = failureCount;
    campaign.results = results;
    campaign.processingCompletedAt = new Date();
    campaign.delayMetrics = [...campaign.delayMetrics || [], ...delayMetrics];
    
    // Add delivery statistics
    campaign.deliveryStats = calculateDeliveryStats(campaign, totalProcessingTime, successCount, failureCount, delayMetrics);
    
    await campaign.save();
    
    console.log(`[Campaign Processor] Completed campaign ${campaignId} with ${successCount} successes and ${failureCount} failures in ${totalProcessingTime.toFixed(2)} seconds`);
    
    return {
      success: true,
      campaignId,
      successCount,
      failureCount,
      totalProcessingTime,
      pointsRefunded: campaign.pointsRefunded || 0
    };
  } catch (error) {
    console.error(`[Campaign Processor] Fatal error processing campaign ${campaignId}:`, error);
    
    // Update campaign status to failed
    if (campaign) {
      campaign.status = 'failed';
      campaign.processingCompletedAt = new Date();
      await campaign.save();
      
      // Refund all remaining points
      const remainingRecipients = campaign.recipientCount - (campaign.sent || 0) - (campaign.failed || 0);
      if (remainingRecipients > 0) {
        await handlePointRefunds(campaign, remainingRecipients);
      }
    }
    
    return {
      success: false,
      campaignId,
      error: error.message
    };
  }
};

/**
 * Send a message to a recipient with retry logic
 * @param {Object} campaign - The campaign object
 * @param {Object} recipient - The recipient to send to
 * @returns {Promise<Object>} - Result of the send operation
 */
const sendMessage = async (campaign, recipient) => {
  let retries = 0;
  let lastError = null;
  
  // Try up to MAX_RETRY_ATTEMPTS times (configurable)
  while (retries <= MAX_RETRY_ATTEMPTS) {
    try {
      const recipientId = recipient.id;
      let response;
      
      // Different handling based on message type
      if (campaign.messageType === 'text') {
        // Send text message
        response = await axios({
          method: 'post',
          url: `https://graph.facebook.com/v18.0/${campaign.pageId}/messages`,
          data: {
            recipient: { id: recipientId },
            message: { text: campaign.messageText },
            messaging_type: 'MESSAGE_TAG',
            tag: 'ACCOUNT_UPDATE',
            access_token: campaign.accessToken
          }
        });
        
        if (response.data && response.data.message_id) {
          return {
            success: true,
            messageId: response.data.message_id,
            retries
          };
        }
      } 
      else if (campaign.messageType === 'image') {
        // Send text first if provided
        if (campaign.messageText) {
          try {
            await axios({
              method: 'post',
              url: `https://graph.facebook.com/v18.0/${campaign.pageId}/messages`,
              data: {
                recipient: { id: recipientId },
                message: { text: campaign.messageText },
                messaging_type: 'MESSAGE_TAG',
                tag: 'ACCOUNT_UPDATE',
                access_token: campaign.accessToken
              }
            });
          } catch (textErr) {
            console.warn(`[Campaign Processor] Error sending text before image: ${textErr.message}`);
          }
        }
        
        // Send image
        response = await axios({
          method: 'post',
          url: `https://graph.facebook.com/v18.0/${campaign.pageId}/messages`,
          data: {
            recipient: { id: recipientId },
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
            messageId: response.data.message_id,
            retries
          };
        }
      }
      else if (campaign.messageType === 'video') {
        // Send text first if provided
        if (campaign.messageText) {
          try {
            await axios({
              method: 'post',
              url: `https://graph.facebook.com/v18.0/${campaign.pageId}/messages`,
              data: {
                recipient: { id: recipientId },
                message: { text: campaign.messageText },
                messaging_type: 'MESSAGE_TAG',
                tag: 'ACCOUNT_UPDATE',
                access_token: campaign.accessToken
              }
            });
          } catch (textErr) {
            console.warn(`[Campaign Processor] Error sending text before video: ${textErr.message}`);
          }
        }
        
        // Send video
        response = await axios({
          method: 'post',
          url: `https://graph.facebook.com/v18.0/${campaign.pageId}/messages`,
          data: {
            recipient: { id: recipientId },
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
            messageId: response.data.message_id,
            retries
          };
        }
      }
      else if (campaign.messageType === 'buttons' && campaign.quickReplyButtons && campaign.quickReplyButtons.length > 0) {
        // Check if we have quick reply buttons
        const quickReplyButtons = campaign.quickReplyButtons.filter(button => 
          button.type === 'quickReply'
        );
        
        const standardButtons = campaign.quickReplyButtons.filter(button => 
          button.type !== 'quickReply'
        );
        
        // Check if image is provided along with buttons
        const hasImage = campaign.imageUrl && campaign.imageUrl.trim() !== '';
        
        if (quickReplyButtons.length > 0) {
          // If there's an image, send it first
          if (hasImage) {
            await axios({
              method: 'post',
              url: `https://graph.facebook.com/v18.0/${campaign.pageId}/messages`,
              data: {
                recipient: { id: recipientId },
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
          }
          
          // Handle as enhanced quick replies (like the quickReplies message type)
          const quickReplies = quickReplyButtons.map(button => ({
            content_type: 'text',
            title: button.text,
            payload: button.payload || button.text
          }));
          
          // Send message with quick replies
          response = await axios({
            method: 'post',
            url: `https://graph.facebook.com/v18.0/${campaign.pageId}/messages`,
            data: {
              recipient: { id: recipientId },
              message: {
                text: campaign.messageText,
                quick_replies: quickReplies
              },
              messaging_type: 'MESSAGE_TAG',
              tag: 'ACCOUNT_UPDATE',
              access_token: campaign.accessToken
            }
          });
          
          if (response.data && response.data.message_id) {
            return {
              success: true,
              messageId: response.data.message_id,
              retries
            };
          }
        } else {
          // Create buttons for template (standard behavior)
          const buttons = standardButtons.map(button => {
            if (button.type === 'url') {
              return {
                type: 'web_url',
                url: button.url,
                title: button.text,
                webview_height_ratio: 'full'
              };
            } else {
              return {
                type: 'postback',
                title: button.text,
                payload: button.payload || button.text
              };
            }
          }).slice(0, 3); // Facebook limits to 3 buttons
          
          // For buttons with images, use generic template to integrate image with buttons
          if (hasImage) {
            // Log for debugging
            console.log(`[Campaign Processor] Regular buttons with image: ${campaign.imageUrl}`);
            
            // Make sure image URL is properly formatted - exact same as pageMessageController.js
            const imageUrl = campaign.imageUrl.trim();
            
            // Use generic template with image and buttons together exactly like in pageMessageController.js
            // Add try-catch with fallback for consistent error handling across button types
            try {
              console.log(`[Campaign Processor] Sending generic template with image for regular buttons`);
              console.log(`[Campaign Processor] Image URL in regular buttons template: ${imageUrl}`);
              
              const templateData = {
                recipient: { id: recipientId },
                message: {
                  attachment: {
                    type: 'template',
                    payload: {
                      template_type: 'generic',
                      elements: [
                        {
                          title: campaign.messageText,
                          image_url: imageUrl,
                          subtitle: '', // Empty string exactly as in pageMessageController.js
                          buttons: buttons.slice(0, 3) // Facebook limits to 3 buttons
                        }
                      ]
                    }
                  }
                },
                messaging_type: 'MESSAGE_TAG',
                tag: 'ACCOUNT_UPDATE',
                access_token: campaign.accessToken
              };
              
              // Apply the same validation logging as in enhanced buttons
              console.log(`[Campaign Processor] Regular buttons template validation:`);
              console.log(`  - Has title: ${!!templateData.message.attachment.payload.elements[0].title}`);
              console.log(`  - Has image_url: ${!!templateData.message.attachment.payload.elements[0].image_url}`);
              console.log(`  - Has buttons: ${templateData.message.attachment.payload.elements[0].buttons.length}`);
              
              response = await axios({
                method: 'post',
                url: `https://graph.facebook.com/v18.0/${campaign.pageId}/messages`,
                data: templateData
              });
            } catch (templateError) {
              // Provide the same fallback mechanism as in enhanced buttons
              console.error(`[Campaign Processor] Error sending regular buttons template with image:`, templateError.message);
              if (templateError.response?.data?.error) {
                console.error(`[Campaign Processor] FB API error in regular buttons:`, templateError.response.data.error);
              }
              
              // Try alternative approach - send image and buttons separately as fallback
              console.log(`[Campaign Processor] Fallback: Sending image and regular buttons separately`);
              
              // First send the image
              await axios({
                method: 'post',
                url: `https://graph.facebook.com/v18.0/${campaign.pageId}/messages`,
                data: {
                  recipient: { id: recipientId },
                  message: {
                    attachment: {
                      type: 'image',
                      payload: {
                        url: imageUrl,
                        is_reusable: false
                      }
                    }
                  },
                  messaging_type: 'MESSAGE_TAG',
                  tag: 'ACCOUNT_UPDATE',
                  access_token: campaign.accessToken
                }
              });
              
              // Then send buttons
              response = await axios({
                method: 'post',
                url: `https://graph.facebook.com/v18.0/${campaign.pageId}/messages`,
                data: {
                  recipient: { id: recipientId },
                  message: {
                    attachment: {
                      type: 'template',
                      payload: {
                        template_type: 'button',
                        text: campaign.messageText,
                        buttons: buttons.slice(0, 3)
                      }
                    }
                  },
                  messaging_type: 'MESSAGE_TAG',
                  tag: 'ACCOUNT_UPDATE',
                  access_token: campaign.accessToken
                }
              });
            }
          } else {
            // No image, use regular button template
            response = await axios({
              method: 'post',
              url: `https://graph.facebook.com/v18.0/${campaign.pageId}/messages`,
              data: {
                recipient: { id: recipientId },
                message: {
                  attachment: {
                    type: 'template',
                    payload: {
                      template_type: 'button',
                      text: campaign.messageText,
                      buttons: buttons
                    }
                  }
                },
                messaging_type: 'MESSAGE_TAG',
                tag: 'ACCOUNT_UPDATE',
                access_token: campaign.accessToken
              }
            });
          }
        
          if (response.data && response.data.message_id) {
            return {
              success: true,
              messageId: response.data.message_id,
              retries
            };
          }
        }
      }
      else if (campaign.messageType === 'enhancedButtons' && campaign.quickReplyButtons && campaign.quickReplyButtons.length > 0) {
        if (!campaign.messageText || campaign.messageText.trim() === '') {
          throw new Error('نص الرسالة مطلوب لإرسال الأزرار المحسنة');
        }
        
        // Check for quick reply buttons
        const quickReplyButtons = campaign.quickReplyButtons.filter(button => 
          button.type === 'quickReply'
        );
        
        const standardButtons = campaign.quickReplyButtons.filter(button => 
          button.type !== 'quickReply'
        );
        
        // Validate and prepare image URL
        if (!campaign.imageUrl || campaign.imageUrl.trim() === '') {
          throw new Error('صورة مطلوبة لإرسال الأزرار المحسنة');
        }
        
        const imageUrl = campaign.imageUrl.trim();
        console.log(`[Campaign Processor] Enhanced buttons image URL: ${imageUrl}`);
        
        try {
          // For enhanced buttons, use the generic template to combine image, text and buttons
          // This creates an integrated card with image and buttons - exact match to pageMessageController.js
          if (standardButtons.length > 0) {
            const buttons = standardButtons.map(button => {
              if (button.type === 'url') {
                return {
                  type: 'web_url',
                  url: button.url,
                  title: button.text,
                  webview_height_ratio: 'full'
                };
              } else {
                return {
                  type: 'postback',
                  title: button.text,
                  payload: button.payload || button.text
                };
              }
            }).filter(Boolean).slice(0, 3); // Facebook limits to 3 buttons
            
            console.log(`[Campaign Processor] Sending integrated generic template for enhanced buttons`);
            
            // Use generic template for enhanced buttons (combines image with text/buttons)
            const templateData = {
              recipient: { id: recipientId },
              message: {
                attachment: {
                  type: 'template',
                  payload: {
                    template_type: 'generic',
                    elements: [
                      {
                        title: campaign.messageText,
                        image_url: imageUrl,
                        subtitle: '',
                        buttons: buttons
                      }
                    ]
                  }
                }
              },
              messaging_type: 'MESSAGE_TAG',
              tag: 'ACCOUNT_UPDATE',
              access_token: campaign.accessToken
            };
            
            // Deep check the template data structure
            console.log(`[Campaign Processor] Enhanced buttons template validation:`);
            console.log(`  - Has title: ${!!templateData.message.attachment.payload.elements[0].title}`);
            console.log(`  - Has image_url: ${!!templateData.message.attachment.payload.elements[0].image_url}`);
            console.log(`  - Has buttons: ${templateData.message.attachment.payload.elements[0].buttons.length}`);
            
            response = await axios({
              method: 'post',
              url: `https://graph.facebook.com/v18.0/${campaign.pageId}/messages`,
              data: templateData
            });
          } 
          // For quick replies, handle them separately
          else if (quickReplyButtons.length > 0) {
            // First send the image
            await axios({
              method: 'post',
              url: `https://graph.facebook.com/v18.0/${campaign.pageId}/messages`,
              data: {
                recipient: { id: recipientId },
                message: {
                  attachment: {
                    type: 'image',
                    payload: {
                      url: imageUrl,
                      is_reusable: false
                    }
                  }
                },
                messaging_type: 'MESSAGE_TAG',
                tag: 'ACCOUNT_UPDATE',
                access_token: campaign.accessToken
              }
            });
            
            // Then send quick replies
            const quickReplies = quickReplyButtons.map(button => ({
              content_type: 'text',
              title: button.text,
              payload: button.payload || button.text
            }));
            
            console.log(`[Campaign Processor] Sending quick reply buttons for enhanced buttons`);
            
            response = await axios({
              method: 'post',
              url: `https://graph.facebook.com/v18.0/${campaign.pageId}/messages`,
              data: {
                recipient: { id: recipientId },
                message: {
                  text: campaign.messageText,
                  quick_replies: quickReplies
                },
                messaging_type: 'MESSAGE_TAG',
                tag: 'ACCOUNT_UPDATE',
                access_token: campaign.accessToken
              }
            });
          }
          
          if (response && response.data && response.data.message_id) {
            return {
              success: true,
              messageId: response.data.message_id,
              retries
            };
          }
        } catch (error) {
          console.error(`[Campaign Processor] Error sending enhanced buttons:`, error.message);
          if (error.response?.data?.error) {
            console.error(`[Campaign Processor] FB API error:`, error.response.data.error);
          }
          
          // Fallback: try sending image and buttons separately if the template fails
          try {
            console.log(`[Campaign Processor] Template failed, using fallback approach`);
            
            // First send the image
            await axios({
              method: 'post',
              url: `https://graph.facebook.com/v18.0/${campaign.pageId}/messages`,
              data: {
                recipient: { id: recipientId },
                message: {
                  attachment: {
                    type: 'image',
                    payload: {
                      url: imageUrl,
                      is_reusable: false
                    }
                  }
                },
                messaging_type: 'MESSAGE_TAG',
                tag: 'ACCOUNT_UPDATE',
                access_token: campaign.accessToken
              }
            });
            
            // Then send either quick replies or standard buttons
            if (quickReplyButtons.length > 0) {
              const quickReplies = quickReplyButtons.map(button => ({
                content_type: 'text',
                title: button.text,
                payload: button.payload || button.text
              }));
              
              response = await axios({
                method: 'post',
                url: `https://graph.facebook.com/v18.0/${campaign.pageId}/messages`,
                data: {
                  recipient: { id: recipientId },
                  message: {
                    text: campaign.messageText,
                    quick_replies: quickReplies
                  },
                  messaging_type: 'MESSAGE_TAG',
                  tag: 'ACCOUNT_UPDATE',
                  access_token: campaign.accessToken
                }
              });
            } else if (standardButtons.length > 0) {
              const buttons = standardButtons.map(button => {
                if (button.type === 'url') {
                  return {
                    type: 'web_url',
                    url: button.url,
                    title: button.text,
                    webview_height_ratio: 'full'
                  };
                } else {
                  return {
                    type: 'postback',
                    title: button.text,
                    payload: button.payload || button.text
                  };
                }
              }).filter(Boolean).slice(0, 3);
              
              response = await axios({
                method: 'post',
                url: `https://graph.facebook.com/v18.0/${campaign.pageId}/messages`,
                data: {
                  recipient: { id: recipientId },
                  message: {
                    attachment: {
                      type: 'template',
                      payload: {
                        template_type: 'button',
                        text: campaign.messageText,
                        buttons: buttons
                      }
                    }
                  },
                  messaging_type: 'MESSAGE_TAG',
                  tag: 'ACCOUNT_UPDATE',
                  access_token: campaign.accessToken
                }
              });
            }
            
            if (response && response.data && response.data.message_id) {
              return {
                success: true,
                messageId: response.data.message_id,
                retries,
                fallback: true
              };
            }
          } catch (fallbackError) {
            console.error(`[Campaign Processor] Fallback also failed:`, fallbackError.message);
            throw fallbackError; // Let the retry mechanism handle it
          }
        }
      }
      else if (campaign.messageType === 'quickReplies' && campaign.quickReplyButtons && campaign.quickReplyButtons.length > 0) {
        if (!campaign.messageText || campaign.messageText.trim() === '') {
          throw new Error('نص الرسالة مطلوب للرد السريع');
        }
        
        // Create quick replies
        const quickReplies = campaign.quickReplyButtons.map(button => {
          // Ensure we only use buttons that can be formatted as quickReplies
          if (button.type === 'quickReply' || button.type === 'text' || button.type === 'postback') {
            return {
              content_type: 'text',
              title: button.text,
              payload: button.payload || button.text
            };
          }
          return null;
        }).filter(Boolean); // Remove any null entries
        
        // Send message with quick replies
        response = await axios({
          method: 'post',
          url: `https://graph.facebook.com/v18.0/${campaign.pageId}/messages`,
          data: {
            recipient: { id: recipientId },
            message: {
              text: campaign.messageText,
              quick_replies: quickReplies
            },
            messaging_type: 'MESSAGE_TAG',
            tag: 'ACCOUNT_UPDATE',
            access_token: campaign.accessToken
          }
        });
        
        if (response.data && response.data.message_id) {
          return {
            success: true,
            messageId: response.data.message_id,
            retries
          };
        }
      }
      
      // If we got here but didn't return, something went wrong
      throw new Error('لم يتم الحصول على معرف الرسالة من فيسبوك');
      
    } catch (error) {
      lastError = error;
      
      // Determine if we should retry based on error type
      const shouldRetry = isRetryableError(error);
      if (!shouldRetry || retries >= MAX_RETRY_ATTEMPTS) {
        break;
      }
      
      // Incremental backoff delay
      const backoffDelay = calculateBackoffDelay(retries);
      console.log(`[Campaign Processor] Retrying after ${backoffDelay}ms (attempt ${retries + 1})...`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      retries++;
    }
  }
  
  // Return error details if all retries failed
  return {
    success: false,
    error: lastError?.response?.data?.error?.message || lastError?.message || 'فشل في إرسال الرسالة',
    errorCode: lastError?.response?.data?.error?.code,
    retries
  };
};

/**
 * Apply an intelligent delay between message sends based on campaign settings
 * Uses the delayUtils for consistent behavior across the application
 * @param {Object} campaign - The campaign object with delay settings
 * @param {Number} messageIndex - Current message index
 * @returns {Promise<Object>} - Enhanced delay metrics
 */
const applyDelay = async (campaign, messageIndex) => {
  // Skip delay if not enabled
  if (!campaign.enableDelay) {
    return { targetMs: 0, actualMs: 0, mode: 'none', timestamp: new Date() };
  }
  
  // Configure delay options based on campaign settings
  const delayOptions = {
    mode: campaign.delayMode || 'fixed',
    delaySeconds: campaign.delaySeconds || 2,
    minDelaySeconds: campaign.minDelaySeconds || 1,
    maxDelaySeconds: campaign.maxDelaySeconds || 5,
    incrementalDelayStart: campaign.incrementalDelayStart || 1,
    incrementalDelayStep: campaign.incrementalDelayStep || 0.5,
    index: messageIndex,
    hasMedia: ['image', 'video', 'enhancedButtons'].includes(campaign.messageType)
  };
  
  console.log(`[Campaign Processor] Applying delay between recipients (mode: ${delayOptions.mode})`);
  
  try {
    // Use the centralized delay utility for consistency
    const delayResult = await delayUtils.applyMessageDelay(delayOptions);
    
    console.log(`[Campaign Processor] Delay applied: ${delayResult.actualMs}ms (target: ${delayResult.targetMs}ms)`);
    
    return delayResult;
  } catch (err) {
    console.error(`[Campaign Processor] Error applying delay: ${err.message}`);
    // Return basic metrics even if delay fails
    return { 
      targetMs: delayOptions.delaySeconds * 1000, 
      actualMs: 0, 
      mode: delayOptions.mode,
      error: err.message,
      timestamp: new Date()
    };
  }
};

/**
 * Handle refunding points for failed messages
 * @param {Object} campaign - The campaign object
 * @param {Number} failureCount - Number of failed messages
 * @returns {Promise<Object>} - Refund result
 */
const handlePointRefunds = async (campaign, failureCount) => {
  try {
    if (failureCount <= 0) {
      return { refunded: false, reason: 'No failed messages' };
    }
    
    // Get the user
    const user = await User.findById(campaign.user);
    if (!user) {
      return { refunded: false, reason: 'User not found' };
    }
    
    // Calculate points to refund (1 point per failed message)
    const pointsToRefund = failureCount * POINTS_PER_MESSAGE;
    
    // Process the refund
    user.points += pointsToRefund;
    
    // Record the transaction
    const transaction = new Transaction({
      userId: user._id,
      type: 'refund',
      amount: pointsToRefund,
      status: 'completed',
      description: `${NOTIFICATION_TYPES.POINTS_REFUNDED}: ${pointsToRefund} نقطة - فشل إرسال ${failureCount} رسالة من حملة "${campaign.name}"`,
      isDebit: false,
      meta: {
        campaignId: campaign._id,
        campaignName: campaign.name,
        failedMessages: failureCount,
        pointsPerMessage: POINTS_PER_MESSAGE,
        operation: 'auto_refund'
      }
    });
    
    // Update campaign with refund info
    campaign.pointsRefunded = (campaign.pointsRefunded || 0) + pointsToRefund;
    
    // Save everything
    await Promise.all([
      user.save(),
      transaction.save()
    ]);
    
    console.log(`[Campaign Processor] Refunded ${pointsToRefund} points to user ${user._id} for ${failureCount} failed messages`);
    
    return {
      refunded: true,
      points: pointsToRefund,
      user: user._id
    };
  } catch (error) {
    console.error('[Campaign Processor] Error refunding points:', error);
    return {
      refunded: false,
      reason: error.message
    };
  }
};

/**
 * Calculate delivery statistics for campaign
 * @param {Object} campaign - The campaign object
 * @param {Number} totalProcessingTime - Total processing time in seconds
 * @param {Number} successCount - Number of successful messages
 * @param {Number} failureCount - Number of failed messages
 * @param {Array} delayMetrics - Array of delay metrics
 * @returns {Object} - Delivery statistics
 */
const calculateDeliveryStats = (campaign, totalProcessingTime, successCount, failureCount, delayMetrics) => {
  // Calculate average response time
  const avgResponseTimeMs = campaign.results && campaign.results.length > 0 
    ? campaign.results.reduce((sum, r) => sum + (r.responseTimeMs || 0), 0) / campaign.results.length
    : 0;
  
  // Calculate average delay
  const avgDelayMs = delayMetrics.length > 0 
    ? delayMetrics.reduce((sum, d) => sum + d.actualMs, 0) / delayMetrics.length
    : (campaign.delaySeconds || 0) * 1000;
  
  // Calculate success rate
  const totalProcessed = successCount + failureCount;
  const successRate = totalProcessed > 0 
    ? (successCount / totalProcessed) * 100
    : 0;
  
  return {
    avgResponseTimeMs,
    avgDelayMs,
    successRate,
    completionTimeMinutes: totalProcessingTime / 60,
    lastDeliveryDate: new Date(),
    deliveryStartDate: campaign.processingStartedAt
  };
};

/**
 * Check if an error is retryable
 * @param {Error} error - The error to check
 * @returns {Boolean} - Whether the error is retryable
 */
const isRetryableError = (error) => {
  // Network errors are always retryable
  if (!error.response) {
    return true;
  }
  
  // Rate limiting errors are retryable
  if (error.response.status === 429) {
    return true;
  }
  
  // Some Facebook API errors are retryable
  const fbError = error.response?.data?.error;
  if (fbError) {
    // Check for known retryable error codes
    const retryableCodes = [1, 2, 4, 17, 341, 368, 613];
    if (retryableCodes.includes(fbError.code)) {
      return true;
    }
    
    // Check for rate limit or temporary errors in message
    if (fbError.message && (
      fbError.message.includes('too many requests') ||
      fbError.message.includes('temporarily unavailable') ||
      fbError.message.includes('try again later')
    )) {
      return true;
    }
  }
  
  return false;
};

/**
 * Calculate backoff delay for retries using exponential backoff strategy
 * @param {Number} attempt - Current retry attempt (0-based)
 * @returns {Number} - Delay in milliseconds
 */
const calculateBackoffDelay = (attempt) => {
  // Base delay is 1 second, doubles with each attempt
  const baseDelay = 1000;
  const maxDelay = 10000; // Cap at 10 seconds
  
  // Add jitter (± 100ms) to prevent thundering herd
  const jitter = Math.random() * 200 - 100;
  
  // Calculate delay with exponential backoff
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay) + jitter;
  
  return Math.max(delay, 500); // Ensure minimum 500ms delay
};

module.exports = {
  processCampaign
};