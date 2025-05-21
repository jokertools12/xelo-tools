const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const PostHistory = require('../../models/PostHistory');
const UserAction = require('../../models/UserAction');

// @route   GET api/post-history
// @desc    Get all post history for the current user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const postHistory = await PostHistory.find({ user: req.user.id }).sort({ date: -1 });
    res.json(postHistory);
  } catch (err) {
    console.error('Error fetching post history:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/post-history
// @desc    Create a new post history entry
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { 
      date, 
      postType, 
      groupCount, 
      successCount, 
      failureCount, 
      totalTime,
      successRate,
      averageTime 
    } = req.body;

    // Validate required fields
    if (!postType || groupCount === undefined || successCount === undefined || failureCount === undefined || totalTime === undefined) {
      return res.status(400).json({ msg: 'Please include all required fields' });
    }

    // Ensure fields are proper types and convert if needed
    const validatedEntry = {
      user: req.user.id,
      date: date || new Date(),
      postType,
      groupCount: Number(groupCount),
      successCount: Number(successCount),
      failureCount: Number(failureCount),
      totalTime: Number(totalTime),
      successRate: successRate || undefined,
      averageTime: averageTime || undefined
    };

    const newPostHistory = new PostHistory(validatedEntry);
    const savedPostHistory = await newPostHistory.save();
    
    // Create a UserAction record to track this post for the achievement system
    try {
      await UserAction.create({
        userId: req.user.id,
        actionType: 'post',
        details: {
          postType,
          groupCount: Number(groupCount),
          successCount: Number(successCount),
          postHistoryId: savedPostHistory._id
        },
        module: 'autopost',
        count: Number(successCount) // Count each successful post
      });
      console.log(`Created post activity record for user ${req.user.id} with ${successCount} successful posts`);
    } catch (actionError) {
      console.error('Error recording post activity for achievements:', actionError);
      // Non-blocking - don't fail the main request if activity recording fails
    }
    
    res.json(savedPostHistory);
  } catch (err) {
    console.error('Error saving post history:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        msg: 'Validation error', 
        errors: Object.values(err.errors).map(e => e.message) 
      });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router;
