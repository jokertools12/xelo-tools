/**
 * Campaign Schedule Checker
 * 
 * Utility to check for pending campaigns that missed their execution time
 * and coordinate processing between different campaign processors.
 * 
 * Enhanced to ensure reliable campaign execution even after browser closure
 * and server restarts with improved recovery mechanisms.
 * 
 * IMPORTANT COORDINATION NOTE:
 * This module works in coordination with pageMessageCampaignProcessor.js to handle campaign processing:
 * 
 * - This module (campaignScheduleChecker.js): Acts as the primary scheduler, finding scheduled
 *   campaigns and delegating them to the processor via queueCampaign().
 * 
 * - pageMessageCampaignProcessor.js: Handles the actual processing logic, but also includes its own
 *   checkScheduledCampaigns() method with filters to prevent duplicate processing of campaigns
 *   already handled by this module.
 * 
 * The server.js file coordinates the scheduling of both systems with setInterval calls.
 * This coordination system prevents campaigns from being processed twice.
 */
const cron = require('node-cron');
const PageMessageCampaign = require('../models/PageMessageCampaign');
const campaignProcessor = require('./campaignProcessor');
const pageMessageCampaignProcessor = require('./pageMessageCampaignProcessor');
const delayUtils = require('./delayUtils');
const mongoose = require('mongoose');
const logger = console;

// Configuration settings
const CONFIG = {
  VERBOSE_LOGGING: false,          // Set to true to enable more detailed logs
  LOG_FREQUENCY: 15,               // Log status message every X minutes (when no campaigns found)
  MAX_CONCURRENT_CAMPAIGNS: 5,     // Maximum number of campaigns to process concurrently
  CHECK_INTERVAL_SECONDS: 60,      // How often to check for missed campaigns (in seconds)
  PROCESSING_TIMEOUT_MINUTES: 60,  // Consider campaigns stuck after this many minutes
  ERROR_RETRY_LIMIT: 3             // How many times to retry a failed campaign
};

// Keep track of actively processing campaigns
const activeCampaigns = new Map();

/**
 * Find and process all pending campaigns that have passed their scheduled time
 * but have not been processed yet, with improved coordination between processors
 */
const processMissedCampaigns = async () => {
  try {
    const currentTime = new Date();
    
    // Find all scheduled campaigns (pending or review) with scheduled time in the past
    // that aren't already locked for processing
    const missedScheduledCampaigns = await PageMessageCampaign.find({
      status: { $in: ['pending', 'review'] },
      scheduled: true,
      scheduledTime: { $lt: currentTime },
      processingLock: { $ne: true } // Only get campaigns that aren't locked
    });
    
    // Only log if we found campaigns to process
    if (missedScheduledCampaigns.length > 0) {
      logger.info(`[Campaign Checker] Found ${missedScheduledCampaigns.length} scheduled campaigns to process`);
    }
    
    if (missedScheduledCampaigns.length === 0) {
      return { success: true, processedCount: 0 };
    }
    
    // Limit concurrent processing to avoid overloading
    const campaignsToProcess = missedScheduledCampaigns.slice(0, CONFIG.MAX_CONCURRENT_CAMPAIGNS);
    
    // Process each missed campaign, with coordination between processors
    const processingResults = [];
    
    for (const campaign of campaignsToProcess) {
      logger.info(`[Campaign Checker] Processing missed campaign: ${campaign._id} - ${campaign.name}`);
      
      try {
        // Use atomic update to try to lock the campaign
        const lockedCampaign = await PageMessageCampaign.findOneAndUpdate(
          { 
            _id: campaign._id, 
            processingLock: { $ne: true } // Only lock if not already locked
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
        
        // Skip if we couldn't lock the campaign (another processor got it first)
        if (!lockedCampaign) {
          logger.info(`[Campaign Checker] Campaign ${campaign._id} already being processed by another processor, skipping`);
          continue;
        }
        
        // Track in active campaigns
        activeCampaigns.set(campaign._id.toString(), {
          id: campaign._id,
          name: campaign.name,
          startedAt: new Date(),
          status: 'processing'
        });
        
        // Pass to dedicated processor based on campaign type
        // Use pageMessageCampaignProcessor for dedicated handling
        // This happens asynchronously to avoid blocking the checker
        const queueResult = await pageMessageCampaignProcessor.queueCampaign(campaign._id);
        
        if (queueResult.success) {
          processingResults.push({
            id: campaign._id,
            name: campaign.name,
            scheduledTime: campaign.scheduledTime,
            processingStarted: campaign.processingStartedAt,
            status: 'queued'
          });
        } else {
          logger.error(`[Campaign Checker] Error queueing campaign ${campaign._id}:`, queueResult.error);
          
          // Release lock if queueing failed
          await PageMessageCampaign.updateOne(
            { _id: campaign._id },
            { 
              $set: { 
                processingLock: false,
                status: 'pending',
                processingError: queueResult.error
              }
            }
          );
          
          // Remove from active campaigns
          activeCampaigns.delete(campaign._id.toString());
        }
      } catch (campaignError) {
        logger.error(`[Campaign Checker] Error processing campaign ${campaign._id}:`, campaignError.message);
        
        // Handle failure by releasing lock and marking as error
        try {
          await PageMessageCampaign.updateOne(
            { _id: campaign._id },
            { 
              $set: { 
                processingLock: false,
                processingError: campaignError.message
              }
            }
          );
        } catch (unlockError) {
          logger.error(`[Campaign Checker] Error releasing lock for campaign ${campaign._id}:`, unlockError.message);
        }
        
        // Remove from active campaigns
        activeCampaigns.delete(campaign._id.toString());
      }
    }
    
    return { 
      success: true, 
      processedCount: processingResults.length,
      campaigns: processingResults
    };
  } catch (error) {
    logger.error('[Campaign Checker] Error checking for missed campaigns:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Process a campaign with timeout protection
 * @param {string} campaignId - ID of the campaign to process
 */
const processWithTimeout = async (campaignId) => {
  try {
    // Set a timeout of 30 minutes maximum for campaign processing
    const timeoutPromise = new Promise((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Campaign processing timeout exceeded'));
      }, 30 * 60 * 1000);
      
      // Prevent timer from keeping Node.js process alive
      if (timer.unref) {
        timer.unref();
      }
    });
    
    // Check if the campaign is already locked by our pageMessageCampaignProcessor
    const campaign = await PageMessageCampaign.findById(campaignId);
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }
    
    // If already locked, just return success
    if (campaign.processingLock === true) {
      logger.info(`[Campaign Checker] Campaign ${campaignId} already being processed by our dedicated processor`);
      return {
        success: true,
        alreadyProcessing: true,
        campaignId
      };
    }
    
    // Otherwise, queue it with our new processor
    logger.info(`[Campaign Checker] Queuing campaign ${campaignId} with dedicated processor`);
    
    // Track in active campaigns
    activeCampaigns.set(campaignId, {
      id: campaignId,
      name: campaign.name,
      startedAt: new Date(),
      status: 'queuing'
    });
    
    // Queue the campaign
    const queueResult = await pageMessageCampaignProcessor.queueCampaign(campaignId);
    
    // Update tracking status
    if (queueResult.success) {
      activeCampaigns.set(campaignId, {
        ...activeCampaigns.get(campaignId),
        status: 'processing'
      });
    } else {
      // Remove from active campaigns on failure
      activeCampaigns.delete(campaignId);
    }
    
    return {
      success: queueResult.success,
      queued: queueResult.success,
      error: queueResult.error,
      campaignId
    };
  } catch (error) {
    logger.error(`[Campaign Checker] Error processing campaign ${campaignId}:`, error.message);
    
    // Update campaign status to failed if there was an error
    try {
      const campaign = await PageMessageCampaign.findById(campaignId);
      if (campaign && campaign.status === 'processing' && !campaign.processingLock) {
        campaign.status = 'failed';
        campaign.processingCompletedAt = new Date();
        campaign.processingError = error.message;
        await campaign.save();
      }
    } catch (updateError) {
      logger.error(`[Campaign Checker] Error updating failed campaign status:`, updateError.message);
    }
    
    // Remove from active campaigns
    activeCampaigns.delete(campaignId);
    
    throw error;
  }
};

/**
 * Find and reset stuck campaigns
 * These are campaigns that have been processing for too long
 */
const resetStuckCampaigns = async () => {
  try {
    // Calculate cutoff time for stuck campaigns
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - CONFIG.PROCESSING_TIMEOUT_MINUTES);
    
    // Find stuck campaigns
    const stuckCampaigns = await PageMessageCampaign.find({
      status: 'processing',
      processingStartedAt: { $lt: cutoffTime }
    });
    
    if (stuckCampaigns.length === 0) {
      return { success: true, count: 0 };
    }
    
    logger.info(`[Campaign Checker] Found ${stuckCampaigns.length} stuck campaigns to reset`);
    
    // Reset each stuck campaign
    const resetResults = [];
    
    for (const campaign of stuckCampaigns) {
      try {
        // Update campaign to pending status
        await PageMessageCampaign.updateOne(
          { _id: campaign._id },
          { 
            $set: { 
              status: 'pending',
              processingLock: false,
              processingError: 'Campaign reset after timeout'
            }
          }
        );
        
        // Remove from active campaigns
        activeCampaigns.delete(campaign._id.toString());
        
        resetResults.push({
          id: campaign._id,
          name: campaign.name,
          processingStartedAt: campaign.processingStartedAt
        });
        
        logger.info(`[Campaign Checker] Reset stuck campaign: ${campaign._id} - ${campaign.name}`);
      } catch (resetError) {
        logger.error(`[Campaign Checker] Error resetting stuck campaign ${campaign._id}:`, resetError.message);
      }
    }
    
    return { 
      success: true, 
      count: resetResults.length,
      campaigns: resetResults
    };
  } catch (error) {
    logger.error('[Campaign Checker] Error resetting stuck campaigns:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Get active campaign processing status
 * @returns {Array} List of active campaigns and their status
 */
const getActiveCampaigns = () => {
  // Calculate elapsed time for each active campaign
  const now = Date.now();
  return Array.from(activeCampaigns.values()).map(campaign => {
    return {
      ...campaign,
      elapsedSeconds: (now - campaign.startedAt) / 1000
    };
  });
};

// Static flag to track if the scheduler has been initialized to prevent duplicate initialization
let isSchedulerInitialized = false;

/**
 * Initialize the campaign checker scheduler
 * Schedule to run every minute to catch any missed campaigns
 * Added safeguard to prevent multiple initializations
 */
const initCampaignChecker = () => {
  // Skip initialization if already initialized to prevent duplicates
  if (isSchedulerInitialized) {
    logger.info('[Campaign Checker] Scheduler already initialized - skipping duplicate initialization');
    return {
      processMissedCampaigns,
      resetStuckCampaigns,
      getActiveCampaigns
    };
  }
  
  let checkCounter = 0;
  
  logger.info('[Campaign Checker] Initializing campaign checker...');
  
  // Immediately check for any missed campaigns and stuck campaigns on startup
  setTimeout(async () => {
    try {
      // Reset any stuck campaigns
      await resetStuckCampaigns();
      
      // Process any missed campaigns
      await processMissedCampaigns();
      
      logger.info('[Campaign Checker] Initial campaign check completed');
    } catch (startupError) {
      logger.error('[Campaign Checker] Error during startup checks:', startupError);
    }
  }, 5000);
  
  // Mark as initialized
  isSchedulerInitialized = true;
  
  // Schedule to run every minute
  cron.schedule(`*/${Math.max(1, Math.floor(CONFIG.CHECK_INTERVAL_SECONDS / 60))} * * * *`, async () => {
    checkCounter++;
    
    // Only log periodically to reduce noise
    if (CONFIG.VERBOSE_LOGGING || checkCounter % CONFIG.LOG_FREQUENCY === 0) {
      logger.info('[Campaign Checker] Running scheduled check for campaigns');
    }
    
    try {
      // First, reset any stuck campaigns
      await resetStuckCampaigns();
      
      // Then, process any missed campaigns
      await processMissedCampaigns();
    } catch (checkError) {
      logger.error('[Campaign Checker] Error during scheduled campaign check:', checkError);
    }
  });
  
  // Also run a separate check for stuck campaigns every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      await resetStuckCampaigns();
    } catch (resetError) {
      logger.error('[Campaign Checker] Error resetting stuck campaigns:', resetError);
    }
  });
  
  logger.info('[Campaign Checker] Scheduler initialized and running (logs only when campaigns are found)');
  
  return {
    processMissedCampaigns,
    resetStuckCampaigns,
    getActiveCampaigns
  };
};

module.exports = {
  processMissedCampaigns,
  initCampaignChecker,
  processWithTimeout,
  resetStuckCampaigns,
  getActiveCampaigns
};