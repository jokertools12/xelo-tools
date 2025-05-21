const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const ScheduledPost = require('../../models/ScheduledPost');
const User = require('../../models/User');
const UserAction = require('../../models/UserAction');

// @route   GET api/scheduled-posts
// @desc    Get all scheduled posts for the current user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const scheduledPosts = await ScheduledPost.find({ 
      user: req.user.id, 
      status: { $in: ['pending', 'completed', 'failed'] } 
    }).sort({ scheduledTime: -1 });
    
    res.json(scheduledPosts);
  } catch (err) {
    console.error('Error fetching scheduled posts:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/scheduled-posts/:id
// @desc    Get a specific scheduled post
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const scheduledPost = await ScheduledPost.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });
    
    if (!scheduledPost) {
      return res.status(404).json({ msg: 'Scheduled post not found' });
    }
    
    res.json(scheduledPost);
  } catch (err) {
    console.error('Error fetching scheduled post:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Scheduled post not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   POST api/scheduled-posts
// @desc    Create a new scheduled post
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { 
      scheduledTime,
      postType,
      messageText,
      imageUrl,
      videoUrl,
      enableRandomCode,
      groups,
      enableDelay,
      delay,
      accessToken
    } = req.body;
    
    // Note: retry settings have been removed as per requirements

    // Validate required fields
    if (!scheduledTime || !postType || !messageText || !groups || !Array.isArray(groups) || groups.length === 0 || !accessToken) {
      return res.status(400).json({ msg: 'Please include all required fields' });
    }

    // Make sure scheduled time is in the future
    const scheduledDate = new Date(scheduledTime);
    if (scheduledDate <= new Date()) {
      return res.status(400).json({ msg: 'Scheduled time must be in the future' });
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
    
    // Create new scheduled post with deducted points count
    const newScheduledPost = new ScheduledPost({
      user: req.user.id,
      scheduledTime: scheduledDate,
      postType,
      messageText,
      imageUrl: imageUrl || '',
      videoUrl: videoUrl || '',
      enableRandomCode: enableRandomCode || false,
      groups,
      enableDelay: enableDelay || false,
      delay: delay || 3,
      accessToken,
      deductedPoints: requiredPoints // Store the number of points deducted
    });
    
    // Save both the updated user and the new scheduled post
    await user.save();
    
    // Record the points transaction
    const Transaction = require('../../models/Transaction');
    const transaction = new Transaction({
      userId: req.user.id,
      type: 'other', // Using 'other' instead of 'deduction' to match valid enum values
      amount: requiredPoints, // Use negative amount to indicate deduction
      status: 'completed',
      description: `خصم ${requiredPoints} نقطة مقدماً لجدولة منشور في ${groups.length} مجموعة`
    });
    
    // Save the transaction and the scheduled post
    const [savedTransaction, savedScheduledPost] = await Promise.all([
      transaction.save(),
      newScheduledPost.save()
    ]);
    
    res.json(savedScheduledPost);
  } catch (err) {
    console.error('Error creating scheduled post:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        msg: 'Validation error', 
        errors: Object.values(err.errors).map(e => e.message) 
      });
    }
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/scheduled-posts/:id/cancel
// @desc    Cancel a scheduled post (now deletes it)
// @access  Private
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const scheduledPost = await ScheduledPost.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });
    
    if (!scheduledPost) {
      return res.status(404).json({ msg: 'Scheduled post not found' });
    }
    
    // Only allow cancellation of pending posts
    if (scheduledPost.status !== 'pending') {
      return res.status(400).json({ 
        msg: `Cannot cancel post with status: ${scheduledPost.status}` 
      });
    }
    
    // Refund points if any were deducted
    if (scheduledPost.deductedPoints) {
      const user = await User.findById(req.user.id);
      if (user) {
        // Refund points
        user.points += scheduledPost.deductedPoints;
        
        // Record the refund transaction
        const Transaction = require('../../models/Transaction');
        const transaction = new Transaction({
          userId: user._id,
          type: 'refund',
          amount: scheduledPost.deductedPoints,
          status: 'completed',
          description: `استرجاع ${scheduledPost.deductedPoints} نقطة: إلغاء المنشور المجدول`
        });
        
        // Save user and transaction
        await Promise.all([
          user.save(),
          transaction.save()
        ]);
        
        console.log(`Refunded ${scheduledPost.deductedPoints} points to user ${user._id} for canceled scheduled post`);
      }
    }
    
    // Delete the post instead of marking as canceled
    await scheduledPost.deleteOne();
    
    res.json({ msg: 'Scheduled post deleted successfully' });
  } catch (err) {
    console.error('Error canceling/deleting scheduled post:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Scheduled post not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/scheduled-posts/:id
// @desc    Delete a scheduled post (for both users and admins)
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const query = req.user.isAdmin 
      ? { _id: req.params.id } // Admins can delete any post
      : { _id: req.params.id, user: req.user.id }; // Regular users can only delete their own posts
    
    const scheduledPost = await ScheduledPost.findOne(query);
    
    if (!scheduledPost) {
      return res.status(404).json({ msg: 'Scheduled post not found' });
    }
    
    // Refund points if this is a pending post with deducted points
    if (scheduledPost.status === 'pending' && scheduledPost.deductedPoints) {
      const user = await User.findById(scheduledPost.user);
      if (user) {
        // Refund points
        user.points += scheduledPost.deductedPoints;
        
        // Record the refund transaction
        const Transaction = require('../../models/Transaction');
        const transaction = new Transaction({
          userId: user._id,
          type: 'refund',
          amount: scheduledPost.deductedPoints,
          status: 'completed',
          description: `استرجاع ${scheduledPost.deductedPoints} نقطة: حذف المنشور المجدول`
        });
        
        // Save user and transaction
        await Promise.all([
          user.save(),
          transaction.save()
        ]);
        
        console.log(`Refunded ${scheduledPost.deductedPoints} points to user ${user._id} for deleted scheduled post`);
      }
    }
    
    await scheduledPost.deleteOne();
    
    res.json({ msg: 'Scheduled post removed' });
  } catch (err) {
    console.error('Error deleting scheduled post:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Scheduled post not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/scheduled-posts/:id/reschedule
// @desc    Update the scheduled time for a pending post
// @access  Private
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
    
    // Find the post (user can only update their own posts)
    const scheduledPost = await ScheduledPost.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });
    
    if (!scheduledPost) {
      return res.status(404).json({ msg: 'Scheduled post not found' });
    }
    
    // Only allow rescheduling of pending posts
    if (scheduledPost.status !== 'pending') {
      return res.status(400).json({ 
        msg: `Cannot reschedule post with status: ${scheduledPost.status}` 
      });
    }
    
    // Update the scheduled time
    scheduledPost.scheduledTime = newScheduledDate;
    await scheduledPost.save();
    
    res.json(scheduledPost);
  } catch (err) {
    console.error('Error rescheduling post:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Scheduled post not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   GET api/scheduled-posts/pending
// @desc    Get all pending scheduled posts that are due to run (used by server cron job)
// @access  Private (secured by API key in production)
router.get('/pending/due', async (req, res) => {
  try {
    // This would be secured in production with API key or other server-only auth
    // For demo purposes, we allow this endpoint to be accessed
    
    const now = new Date();
    const pendingPosts = await ScheduledPost.find({
      status: 'pending',
      scheduledTime: { $lte: now }
    });
    
    res.json(pendingPosts);
  } catch (err) {
    console.error('Error fetching pending scheduled posts:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/scheduled-posts/:id/process
// @desc    Mark a scheduled post as being processed (server only)
// @access  Private (secured in production)
router.put('/:id/process', async (req, res) => {
  try {
    // This would be secured in production with API key or other server-only auth
    const { status, successCount, failureCount } = req.body;
    
    if (!['completed', 'failed'].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status' });
    }
    
    const scheduledPost = await ScheduledPost.findById(req.params.id);
    
    if (!scheduledPost) {
      return res.status(404).json({ msg: 'Scheduled post not found' });
    }
    
    // Update post status and results - ensure results object exists
    scheduledPost.status = status;
    
    // Initialize the results object to ensure it exists
    scheduledPost.results = {
      successCount: successCount || 0,
      failureCount: failureCount || 0,
      completedAt: new Date()
    };
    
    await scheduledPost.save();
    
    // Create UserAction record for completed posts to track for achievement system
    if (status === 'completed' && successCount > 0) {
      try {
        await UserAction.create({
          userId: scheduledPost.user,
          actionType: 'post',
          details: {
            postType: scheduledPost.postType,
            groupCount: scheduledPost.groups.length,
            successCount: successCount,
            scheduledPostId: scheduledPost._id
          },
          module: 'autopost',
          count: successCount // Count each successful post
        });
        console.log(`Created post activity record for user ${scheduledPost.user} with ${successCount} successful scheduled posts`);
      } catch (actionError) {
        console.error('Error recording scheduled post activity for achievements:', actionError);
        // Non-blocking - don't fail the main request if activity recording fails
      }
    }
    
    res.json(scheduledPost);
  } catch (err) {
    console.error('Error processing scheduled post:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Scheduled post not found' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router;