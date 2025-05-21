/**
 * Delay Utility Module
 * Provides advanced delay functionality for message sending operations
 * with support for different delay modes and high-precision timing
 * 
 * Enhanced for reliable operation in background processes
 */

// Track active delays for debugging and management
const activeDelays = new Map();

/**
 * Apply a delay based on the specified configuration
 * @param {Object} config - Delay configuration
 * @param {String} config.mode - 'fixed', 'random', or 'incremental'
 * @param {Number} config.delaySeconds - Base delay in seconds (for fixed mode)
 * @param {Number} config.minDelaySeconds - Minimum delay in seconds (for random mode)
 * @param {Number} config.maxDelaySeconds - Maximum delay in seconds (for random mode)
 * @param {Number} config.incrementalDelayStart - Starting delay in seconds (for incremental mode)
 * @param {Number} config.incrementalDelayStep - Step size in seconds (for incremental mode)
 * @param {Number} config.index - Current message index (for incremental mode)
 * @param {Boolean} config.hasMedia - Whether the message contains media (affects delay calculation)
 * @returns {Promise<Object>} - Resolves with delay metrics
 */
const applyMessageDelay = async (config) => {
  // Default values
  const DEFAULT_DELAY = 2000; // 2 seconds default delay in ms
  
  // Extract configuration with defaults
  const mode = config.mode || 'fixed';
  const delaySeconds = config.delaySeconds || 2;
  const minDelaySeconds = config.minDelaySeconds || 1;
  const maxDelaySeconds = config.maxDelaySeconds || 5;
  const incrementalDelayStart = config.incrementalDelayStart || 1;
  const incrementalDelayStep = config.incrementalDelayStep || 0.5;
  const index = config.index || 0;
  const hasMedia = config.hasMedia || false;
  
  // Calculate delay based on mode
  let delayMs = DEFAULT_DELAY;
  let delayDescription = "default";
  
  if (mode === 'fixed') {
    delayMs = delaySeconds * 1000;
    delayDescription = `fixed ${delaySeconds}s`;
  } 
  else if (mode === 'random' && minDelaySeconds && maxDelaySeconds) {
    const min = minDelaySeconds * 1000;
    const max = maxDelaySeconds * 1000;
    delayMs = Math.floor(Math.random() * (max - min + 1)) + min;
    delayDescription = `random ${delayMs/1000}s (range: ${minDelaySeconds}-${maxDelaySeconds}s)`;
  } 
  else if (mode === 'incremental') {
    const startMs = incrementalDelayStart * 1000;
    const stepMs = incrementalDelayStep * 1000;
    delayMs = startMs + (index * stepMs);
    delayDescription = `incremental ${delayMs/1000}s (start: ${incrementalDelayStart}s, step: ${incrementalDelayStep}s, index: ${index})`;
  }
  
  // Add extra delay for media content (1 second)
  if (hasMedia) {
    delayMs += 1000;
    delayDescription += " +1s for media";
  }
  
  // Create unique ID for this delay
  const delayId = `delay_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  
  // Track this delay
  activeDelays.set(delayId, {
    id: delayId,
    mode,
    targetMs: delayMs,
    startTime: Date.now(),
    description: delayDescription
  });
  
  // Log the calculated delay
  console.log(`[Delay Utils] Applying ${delayMs}ms delay (${delayDescription})`);
  
  // Apply the delay with high precision
  const startTime = Date.now();
  await preciseDelay(delayMs);
  const actualDelay = Date.now() - startTime;
  
  // Remove from active delays
  activeDelays.delete(delayId);
  
  // Return delay metrics
  return {
    targetMs: delayMs,
    actualMs: actualDelay,
    mode: mode,
    description: delayDescription,
    timestamp: new Date()
  };
};

/**
 * High-precision delay implementation with compensation
 * Enhanced for reliability in background contexts
 * @param {Number} ms - Delay in milliseconds
 * @returns {Promise<void>}
 */
const preciseDelay = async (ms) => {
  return new Promise(resolve => {
    // For very short delays, use a more precise timer
    if (ms < 50) {
      const start = Date.now();
      const checkTime = () => {
        if (Date.now() - start >= ms) {
          resolve();
        } else {
          setImmediate(checkTime);
        }
      };
      checkTime();
    } else {
      // For longer delays, use a reliable setTimeout
      // The timer reference is kept to prevent garbage collection
      const timer = setTimeout(() => {
        resolve();
      }, ms);
      
      // Ensure the timer doesn't keep Node.js process alive
      if (timer.unref) {
        timer.unref();
      }
    }
  });
};

/**
 * Dynamic delay calculation based on batch size and message characteristics
 * @param {Object} params - Parameters for dynamic delay calculation
 * @param {Number} params.batchSize - Size of current message batch
 * @param {Number} params.totalMessages - Total messages to be sent
 * @param {Number} params.messageComplexity - 1-10 scale of message complexity
 * @param {Boolean} params.hasMedia - Whether message contains media
 * @returns {Number} - Calculated delay in milliseconds
 */
const calculateDynamicDelay = (params) => {
  // Default parameters
  const batchSize = params.batchSize || 10;
  const totalMessages = params.totalMessages || 100;
  const messageComplexity = params.messageComplexity || 5;
  const hasMedia = params.hasMedia || false;
  
  // Base delay (milliseconds)
  let baseDelay = 2000;
  
  // Adjust for batch size (larger batches need more time between)
  const batchFactor = Math.log10(batchSize + 1) * 1000;
  
  // Adjust for complexity (more complex messages need more time)
  const complexityFactor = messageComplexity * 100;
  
  // Media content requires additional delay
  const mediaFactor = hasMedia ? 1000 : 0;
  
  // Calculate total delay
  const calculatedDelay = baseDelay + batchFactor + complexityFactor + mediaFactor;
  
  // Cap the delay to prevent excessive waiting (max 10 seconds)
  return Math.min(calculatedDelay, 10000);
};

/**
 * Batch processing with dynamic delays
 * Enhanced for reliable operation in background
 * @param {Array} items - Items to process
 * @param {Function} processFn - Function to process each item
 * @param {Object} options - Processing options
 * @returns {Promise<Array>} - Processing results
 */
const processBatchWithDelay = async (items, processFn, options = {}) => {
  const results = [];
  const batchSize = options.batchSize || 20;
  const delayMode = options.mode || 'fixed';
  const delayOptions = {
    mode: delayMode,
    delaySeconds: options.delaySeconds || 2,
    minDelaySeconds: options.minDelaySeconds || 1,
    maxDelaySeconds: options.maxDelaySeconds || 5,
    incrementalDelayStart: options.incrementalDelayStart || 1,
    incrementalDelayStep: options.incrementalDelayStep || 0.5,
    hasMedia: options.hasMedia || false
  };
  
  // Process in batches
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchStartTime = Date.now();
    
    // Process current batch
    const batchPromises = batch.map(item => {
      try {
        return processFn(item);
      } catch (error) {
        console.error('[Delay Utils] Error in batch processing item:', error);
        return Promise.resolve({
          error: error.message || 'Error processing item',
          success: false
        });
      }
    });
    
    try {
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Add results
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            error: result.reason?.message || 'Unknown error in batch processing',
            success: false
          });
        }
      });
    } catch (batchError) {
      console.error('[Delay Utils] Error in batch processing:', batchError);
      
      // Add failure result for all items in batch
      batch.forEach(() => {
        results.push({
          error: batchError.message || 'Batch processing error',
          success: false
        });
      });
    }
    
    // Apply delay between batches (if not the last batch)
    if (i + batchSize < items.length) {
      delayOptions.index = i / batchSize; // For incremental delay
      
      // Track batch metrics
      const batchProcessTime = Date.now() - batchStartTime;
      console.log(`[Delay Utils] Batch ${i / batchSize + 1} processed in ${batchProcessTime}ms`);
      
      // Apply delay
      await applyMessageDelay(delayOptions);
    }
  }
  
  return results;
};

/**
 * Create a cancellable delay
 * Useful for delays that might need to be interrupted
 * @param {Number} ms - Delay time in milliseconds
 * @returns {Object} - Delay control object with promise and cancel method
 */
const createCancellableDelay = (ms) => {
  let cancel;
  
  const promise = new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    
    // Ensure timer doesn't keep Node.js alive
    if (timer.unref) {
      timer.unref();
    }
    
    // Store cancel function
    cancel = () => {
      clearTimeout(timer);
      reject(new Error('Delay cancelled'));
    };
  });
  
  return { 
    promise,
    cancel
  };
};

/**
 * Retry a database operation with exponential backoff
 * Specifically designed to handle MongoDB connection issues like PoolClearedError
 * 
 * @param {Function} operation - Async function that performs the database operation
 * @param {Object} options - Retry options
 * @param {Number} options.maxRetries - Maximum number of retry attempts (default: 5)
 * @param {Number} options.initialDelayMs - Initial delay in milliseconds (default: 1000)
 * @param {Number} options.maxDelayMs - Maximum delay in milliseconds (default: 30000)
 * @param {Function} options.onRetry - Callback function called on each retry with attempt count and error
 * @returns {Promise<any>} - Resolves with the operation result or rejects after max retries
 */
const retryDbOperation = async (operation, options = {}) => {
  const maxRetries = options.maxRetries || 5;
  const initialDelayMs = options.initialDelayMs || 1000;
  const maxDelayMs = options.maxDelayMs || 30000;
  const onRetry = options.onRetry || ((attempt, error) => {
    console.log(`[Delay Utils] Retry attempt ${attempt} after error: ${error.message}`);
  });

  let attempt = 0;
  let lastError = null;

  while (attempt <= maxRetries) {
    try {
      // Attempt the operation
      return await operation();
    } catch (error) {
      lastError = error;
      attempt++;
      
      // If we've reached max retries, throw the last error
      if (attempt > maxRetries) {
        console.error(`[Delay Utils] Failed after ${maxRetries} retries:`, error);
        throw error;
      }
      
      // Check if this is a connection-related error that we should retry
      const isRetryableError = 
        error.name === 'MongoNetworkError' || 
        error.name === 'MongoTimeoutError' || 
        error.name === 'PoolClearedError' ||
        (error.code && [
          'ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET', 
          'ENOTFOUND', 'ENETUNREACH', 'EHOSTUNREACH'
        ].includes(error.code)) ||
        (error[Symbol.for('errorLabels')] && 
         error[Symbol.for('errorLabels')].has('RetryableWriteError'));
      
      if (!isRetryableError) {
        // Don't retry errors that aren't connection-related
        throw error;
      }
      
      // Calculate exponential backoff delay with jitter
      const backoffDelay = Math.min(
        maxDelayMs,
        initialDelayMs * Math.pow(2, attempt - 1) * (0.5 + Math.random() / 2)
      );
      
      // Log retry and call onRetry callback
      console.log(`[Delay Utils] Database operation failed (attempt ${attempt}/${maxRetries}), retrying in ${Math.round(backoffDelay)}ms: ${error.message}`);
      onRetry(attempt, error);
      
      // Wait before retrying
      await preciseDelay(backoffDelay);
    }
  }
};

/**
 * Get the current status of active delays
 * Useful for monitoring and debugging
 * @returns {Array} - List of active delays with metadata
 */
const getActiveDelays = () => {
  const now = Date.now();
  return Array.from(activeDelays.values()).map(delay => {
    return {
      ...delay,
      elapsedMs: now - delay.startTime,
      remainingMs: Math.max(0, delay.targetMs - (now - delay.startTime))
    };
  });
};

module.exports = {
  applyMessageDelay,
  preciseDelay,
  calculateDynamicDelay,
  processBatchWithDelay,
  createCancellableDelay,
  retryDbOperation,
  getActiveDelays
};