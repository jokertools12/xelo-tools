const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const InstantGroupPost = require('../../models/InstantGroupPost');
const User = require('../../models/User');
const UserAction = require('../../models/UserAction');
const Transaction = require('../../models/Transaction');
const axios = require('axios');

// @route   GET api/instant-group-posts
// @desc    Get all instant group posts for the current user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const instantGroupPosts = await InstantGroupPost.find({ 
      user: req.user.id, 
      status: { $in: ['pending', 'processing', 'completed', 'failed', 'canceled'] } 
    }).sort({ createdAt: -1 });
    
    res.json(instantGroupPosts);
  } catch (err) {
    console.error('Error fetching instant group posts:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/instant-group-posts/:id
// @desc    Get a specific instant group post
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const instantGroupPost = await InstantGroupPost.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });
    
    if (!instantGroupPost) {
      return res.status(404).json({ msg: 'Instant group post not found' });
    }
    
    res.json(instantGroupPost);
  } catch (err) {
    console.error('Error fetching instant group post:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Instant group post not found' });
    }
    res.status(500).send('Server Error');
  }
});

// Helper function to post to Facebook group 
const postToFacebookGroup = async (groupId, postData, accessToken) => {
  try {
    const url = `https://graph.facebook.com/v18.0/${groupId}/feed`;
    const params = {
      ...postData,
      access_token: accessToken
    };
    
    const response = await axios.post(url, null, { params });
    
    if (response.data && response.data.id) {
      return { success: true, postId: response.data.id };
    } else {
      return { success: false, error: 'لا يوجد معرف منشور في الاستجابة' };
    }
  } catch (err) {
    throw err;
  }
};

// @route   POST api/instant-group-posts
// @desc    Create a new instant group post for background processing
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { 
      groups,
      postType,
      messageText,
      imageUrl,
      videoUrl,
      enableRandomCode,
      accessToken,
      enableDelay,
      delay
    } = req.body;

    // Validate required fields
    if (!postType || !messageText || !groups || !Array.isArray(groups) || groups.length === 0 || !accessToken) {
      return res.status(400).json({ msg: 'Please include all required fields' });
    }
    
    // Check if user has enough points (1 point per group)
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    const requiredPoints = groups.length;
    if (user.points < requiredPoints) {
      return res.status(400).json({ 
        msg: 'لا يوجد لديك نقاط كافية للنشر في كل هذه المجموعات', 
        currentPoints: user.points, 
        requiredPoints: requiredPoints 
      });
    }
    
    // Deduct points upfront (1 point per group)
    user.points -= requiredPoints;
    
    // Create new instant group post with deducted points count
    const newInstantGroupPost = new InstantGroupPost({
      user: req.user.id,
      groups,
      postType,
      messageText,
      imageUrl: postType === 'imageUrl' ? imageUrl : '',
      videoUrl: postType === 'videoUrl' ? videoUrl : '',
      enableRandomCode: enableRandomCode || false,
      accessToken,
      enableDelay: enableDelay || false,
      delay: delay || 3,
      deductedPoints: requiredPoints // Store the number of points deducted
    });
    
    // Save both the updated user and the new instant group post
    await user.save();
    
    // Record the points transaction
    const transaction = new Transaction({
      userId: req.user.id,
      type: 'other',
      amount: requiredPoints,
      status: 'completed',
      description: `خصم ${requiredPoints} نقطة لنشر منشورات فورية في ${groups.length} مجموعة`
    });
    
    // Save the transaction and the instant group post
    const [savedTransaction, savedInstantGroupPost] = await Promise.all([
      transaction.save(),
      newInstantGroupPost.save()
    ]);
    
    // Start processing in the background (non-blocking)
    processInstantGroupPost(savedInstantGroupPost._id).catch(error => {
      console.error(`Background processing error for group post ${savedInstantGroupPost._id}:`, error);
    });
    
    // Return the saved post immediately
    res.json(savedInstantGroupPost);
  } catch (err) {
    console.error('Error creating instant group post:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        msg: 'Validation error', 
        errors: Object.values(err.errors).map(e => e.message) 
      });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/instant-group-posts/:id
// @desc    Cancel and delete an instant group post
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const query = req.user.isAdmin 
      ? { _id: req.params.id } // Admins can delete any post
      : { _id: req.params.id, user: req.user.id }; // Regular users can only delete their own posts
    
    const instantGroupPost = await InstantGroupPost.findOne(query);
    
    if (!instantGroupPost) {
      return res.status(404).json({ msg: 'Instant group post not found' });
    }
    
    // For posts in processing or pending status, we need to cancel and refund first
    if (instantGroupPost.status === 'pending' || instantGroupPost.status === 'processing') {
      // Update status to canceled for posts that are in progress
      instantGroupPost.status = 'canceled';
      
      // Refund points for groups that haven't been posted to yet
      if (instantGroupPost.deductedPoints) {
        const postedCount = instantGroupPost.successCount + instantGroupPost.failureCount;
        const totalCount = instantGroupPost.totalGroups || instantGroupPost.groups.length;
        const remainingCount = totalCount - postedCount;
        
        if (remainingCount > 0) {
          const user = await User.findById(instantGroupPost.user);
          if (user) {
            // Calculate points to refund
            const pointsToRefund = remainingCount;
            
            // Refund points
            user.points += pointsToRefund;
            
            // Record the refund transaction
            const transaction = new Transaction({
              userId: user._id,
              type: 'refund',
              amount: pointsToRefund,
              status: 'completed',
              description: `استرجاع ${pointsToRefund} نقطة: إلغاء المنشورات الفورية`
            });
            
            // Save user and transaction
            await Promise.all([
              user.save(),
              transaction.save()
            ]);
            
            console.log(`Refunded ${pointsToRefund} points to user ${user._id} for canceled instant group post`);
          }
        }
      }
      
      // Save the updated status before deletion
      await instantGroupPost.save();
    }
    
    // Now actually delete the record from the database
    await InstantGroupPost.findByIdAndDelete(instantGroupPost._id);
    
    res.json({ msg: 'Instant group post deleted successfully' });
  } catch (err) {
    console.error('Error canceling instant group post:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Instant group post not found' });
    }
    res.status(500).send('Server Error');
  }
});

// Generate random code function
const generateRandomCode = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// Background processing function
async function processInstantGroupPost(postId) {
  try {
    // Find the instant group post
    const post = await InstantGroupPost.findById(postId);
    
    if (!post || post.status !== 'pending') {
      console.log(`Post ${postId} is not found or not pending. Status: ${post?.status}`);
      return;
    }
    
    // Update post status to processing
    post.status = 'processing';
    post.processingStartedAt = new Date();
    await post.save();
    
    console.log(`Processing instant group post: ${post._id}`);
    
    try {
      // Use the access token stored in the post
      const accessToken = post.accessToken;
      
      if (!accessToken) {
        throw new Error('رمز الوصول غير متوفر في المنشور الفوري');
      }
      
      // Track start time for the entire process
      const processStartTime = Date.now();
      
      // Counter variables
      let successCount = 0;
      let failureCount = 0;
      let results = [];
      
      // Generate random code if enabled
      let randomCode = '';
      if (post.enableRandomCode) {
        randomCode = generateRandomCode();
      }
      
      // Process each group with proper delay
      for (let i = 0; i < post.groups.length; i++) {
        const groupId = post.groups[i];
        
        try {
          // Skip invalid group IDs
          if (!groupId || !groupId.trim()) {
            console.warn(`Invalid group ID format: ${groupId}. Skipping this group.`);
            failureCount++;
            results.push({
              group: { id: groupId },
              success: false,
              error: 'معرف المجموعة غير صالح',
              postedAt: new Date()
            });
            continue;
          }
          
          // Validate group ID format (Facebook group IDs are typically numeric and at least 5 digits)
          const isValidGroupId = /^\d{5,}$/.test(groupId.toString().trim());
          
          if (!isValidGroupId) {
            console.warn(`Invalid group ID format: ${groupId}. Skipping this group.`);
            failureCount++;
            results.push({
              group: { id: groupId },
              success: false,
              error: 'صيغة معرف المجموعة غير صالحة',
              postedAt: new Date()
            });
            continue;
          }
          
          // Prepare message and parameters based on post type
          let formattedText = post.messageText;
          
          // Add random code if enabled
          if (post.enableRandomCode && randomCode) {
            formattedText += `\n\nCode: ${randomCode}`;
          }
          
          let postData = {
            message: formattedText
          };
          
          // Add link parameter for image or video posts
          if (post.postType === 'imageUrl' && post.imageUrl) {
            postData.link = post.imageUrl;
          } else if (post.postType === 'videoUrl' && post.videoUrl) {
            postData.link = post.videoUrl;
          }
          
          // Post to the group
          const result = await postToFacebookGroup(groupId, postData, accessToken);
          
          // Process result
          if (result.success) {
            successCount++;
            results.push({
              group: {
                id: groupId
              },
              success: true,
              postId: result.postId,
              postedAt: new Date()
            });
            console.log(`Successfully posted to group ${groupId}`);
          } else {
            failureCount++;
            results.push({
              group: {
                id: groupId
              },
              success: false,
              error: result.error || 'Unknown error',
              postedAt: new Date()
            });
            console.log(`Failed to post to group ${groupId} - no post ID returned`);
          }
          
          // Add delay between posts if enabled
          if (post.enableDelay && post.delay > 0 && i < post.groups.length - 1) {
            console.log(`Adding delay of ${post.delay} seconds before next post`);
            
            // Make delay more robust with explicit promise handling
            const delayPromise = new Promise(resolve => {
              const startTime = Date.now();
              const timer = setTimeout(() => {
                const actualDelay = (Date.now() - startTime) / 1000;
                console.log(`Delay completed. Actual delay time: ${actualDelay.toFixed(2)} seconds`);
                resolve();
              }, post.delay * 1000);
              
              // Ensure timer reference is maintained
              timer.unref();
            });
            
            // Explicitly await the delay promise
            await delayPromise;
            console.log(`Delay completed, continuing to next group post`);
          }
          
          // Periodically update the post status to show progress
          if (i % 5 === 0 || i === post.groups.length - 1) {
            post.successCount = successCount;
            post.failureCount = failureCount;
            post.results = results;
            await post.save();
          }
          
        } catch (groupError) {
          failureCount++;
          
          // Enhanced error logging
          let errorMessage = '';
          if (groupError.response) {
            // The request was made and the server responded with an error status
            console.error(`Error posting to group ${groupId}: Status ${groupError.response.status}`);
            errorMessage = groupError.response.data && groupError.response.data.error 
              ? groupError.response.data.error.message 
              : `Status ${groupError.response.status}`;
          } else if (groupError.request) {
            // The request was made but no response was received
            console.error(`Error posting to group ${groupId}: No response received`);
            errorMessage = 'No response received from server';
          } else {
            // Something else happened
            console.error(`Error posting to group ${groupId}: ${groupError.message}`);
            errorMessage = groupError.message;
          }
          
          results.push({
            group: {
              id: groupId
            },
            success: false,
            error: errorMessage,
            postedAt: new Date()
          });
        }
      }
      
      // Calculate total process time
      const processEndTime = Date.now();
      const totalProcessingTime = (processEndTime - processStartTime) / 1000; // in seconds
      
      // Handle point refunds for failed posts
      if (failureCount > 0 && post.deductedPoints) {
        try {
          // Get the user
          const user = await User.findById(post.user);
          
          if (user) {
            // Calculate how many points to refund based on failed posts
            const pointsToRefund = failureCount;
            
            // Refund points for failed posts
            user.points += pointsToRefund;
            
            // Record the transaction
            const transaction = new Transaction({
              userId: user._id,
              type: 'refund',
              amount: pointsToRefund,
              status: 'completed',
              description: `استرداد ${pointsToRefund} نقطة للمنشورات الفاشلة من أصل ${post.totalGroups} منشور فوري`
            });
            
            // Record user action
            const userAction = new UserAction({
              userId: user._id,
              actionType: 'refund',
              details: {
                points: pointsToRefund,
                operation: 'refund',
                failedPosts: failureCount,
                totalPosts: post.totalGroups
              },
              module: 'points'
            });
            
            // Save all changes
            await Promise.all([
              user.save(),
              transaction.save(),
              userAction.save()
            ]);
            
            console.log(`Refunded ${pointsToRefund} points to user ${user._id} for ${failureCount} failed instant group posts`);
          }
        } catch (pointsError) {
          console.error('Error refunding points:', pointsError);
        }
      }
      
      // Update post status and results
      post.status = 'completed';
      post.successCount = successCount;
      post.failureCount = failureCount;
      post.results = results;
      post.processingCompletedAt = new Date();
      await post.save();
      
      // Add a UserAction for stats and achievements if there are successful posts
      if (successCount > 0) {
        try {
          await UserAction.create({
            userId: post.user,
            actionType: 'post',
            details: {
              postType: post.postType,
              groupCount: post.groups.length,
              successCount: successCount,
              instantGroupPostId: post._id
            },
            module: 'autopost',
            count: successCount // Count each successful post
          });
        } catch (actionError) {
          console.error('Error recording instant group post activity:', actionError);
        }
      }
      
      // Save to post history if needed
      try {
        const PostHistory = require('../../models/PostHistory');
        
        const historyEntry = new PostHistory({
          user: post.user,
          date: new Date(),
          postType: post.postType,
          groupCount: post.groups.length,
          successCount: successCount,
          failureCount: failureCount,
          totalTime: totalProcessingTime,
          successRate: post.groups.length > 0 ? (successCount / post.groups.length * 100).toFixed(1) : "0.0",
          averageTime: successCount + failureCount > 0 ? (totalProcessingTime / (successCount + failureCount)).toFixed(2) : "0.00"
        });
        
        await historyEntry.save();
      } catch (historyError) {
        console.error('Error saving post history:', historyError);
      }
      
      console.log(`Completed instant group post ${post._id} with ${successCount} successes and ${failureCount} failures`);
    } catch (error) {
      console.error(`Error processing instant group post ${post._id}:`, error);
      
      // Mark as failed
      post.status = 'failed';
      post.processingCompletedAt = new Date();
      post.successCount = 0;
      post.failureCount = post.totalGroups;
      await post.save();
      
      // Refund all points since nothing was sent
      try {
        if (post.deductedPoints) {
          const user = await User.findById(post.user);
          if (user) {
            // Refund all points
            const pointsToRefund = post.deductedPoints;
            user.points += pointsToRefund;
            
            // Record the transaction
            const transaction = new Transaction({
              userId: user._id,
              type: 'refund',
              amount: pointsToRefund,
              status: 'completed',
              description: `استرداد كامل النقاط (${pointsToRefund}) بسبب فشل المنشورات الفورية`
            });
            
            await Promise.all([
              user.save(),
              transaction.save()
            ]);
            
            console.log(`Refunded all ${pointsToRefund} points to user ${user._id} due to complete failure of instant group post`);
          }
        }
      } catch (refundError) {
        console.error('Error refunding points after complete failure:', refundError);
      }
    }
  } catch (err) {
    console.error('Error in processInstantGroupPost function:', err);
  }
}

// Cleanup old instant group posts
async function cleanupOldInstantGroupPosts() {
  try {
    // Calculate cutoff date (3 days ago - changed from 48 hours as requested)
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 72);
    
    // Find and delete completed or failed posts older than 3 days
    const result = await InstantGroupPost.deleteMany({
      status: { $in: ['completed', 'failed'] },
      processingCompletedAt: { $lt: cutoffDate }
    });
    
    if (result.deletedCount > 0) {
      console.log(`Cleanup: Deleted ${result.deletedCount} instant group posts older than 3 days`);
    }
  } catch (err) {
    console.error('Error cleaning up old instant group posts:', err);
  }
}

// Run cleanup every hour
setInterval(cleanupOldInstantGroupPosts, 3600000);

module.exports = router;