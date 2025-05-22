const express = require('express');
const router = express.Router();
const axios = require('axios');
const { protect } = require('../../middleware/auth');

/**
 * @route   GET /api/facebook/groups
 * @desc    Proxy requests to Facebook Graph API to get user's groups
 * @access  Private
 */
router.get('/groups', protect, async (req, res) => {
  try {
    // Extract access token from query
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ message: 'Access token is required' });
    }
    
    // Make request to Facebook Graph API
    const response = await axios.get(`https://graph.facebook.com/v18.0/me/groups`, {
      params: {
        access_token: token,
        fields: 'id,name,privacy,member_count',
        limit: 100
      },
      headers: {
        'Accept': 'application/json',
      },
      timeout: 15000 // 15 second timeout
    });
    
    // Return Facebook's response to the client
    return res.json(response.data);
    
  } catch (error) {
    console.error('Facebook groups API error:', error.message);
    
    // Return specific error from Facebook if available
    if (error.response && error.response.data) {
      return res.status(error.response.status || 500).json({
        message: 'Facebook API error',
        error: error.response.data
      });
    }
    
    // Handle network errors, timeouts, etc.
    return res.status(500).json({
      message: 'Error proxying request to Facebook API',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/facebook/group/:groupId/posts
 * @desc    Proxy requests to Facebook Graph API to get posts from a specific group
 * @access  Private
 */
router.get('/group/:groupId/posts', protect, async (req, res) => {
  try {
    // Extract parameters from request
    const { groupId } = req.params;
    const { token, limit, after } = req.query;
    
    if (!token) {
      return res.status(400).json({ message: 'Access token is required' });
    }
    
    // Make request to Facebook Graph API
    const response = await axios.get(`https://graph.facebook.com/v18.0/${groupId}/feed`, {
      params: {
        access_token: token,
        fields: 'id,message,created_time,type,permalink_url,reactions.summary(total_count),comments.summary(total_count)',
        limit: limit || 25,
        after: after || undefined
      },
      headers: {
        'Accept': 'application/json',
      },
      timeout: 15000 // 15 second timeout
    });
    
    // Return Facebook's response to the client
    return res.json(response.data);
    
  } catch (error) {
    console.error('Facebook group posts API error:', error.message);
    
    // Return specific error from Facebook if available
    if (error.response && error.response.data) {
      return res.status(error.response.status || 500).json({
        message: 'Facebook API error',
        error: error.response.data
      });
    }
    
    // Handle network errors, timeouts, etc.
    return res.status(500).json({
      message: 'Error proxying request to Facebook API',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/facebook/group/:groupId/members
 * @desc    Proxy requests to Facebook Graph API to get members from a specific group
 * @access  Private
 */
router.get('/group/:groupId/members', protect, async (req, res) => {
  try {
    // Extract parameters from request
    const { groupId } = req.params;
    const { token, limit, after } = req.query;
    
    if (!token) {
      return res.status(400).json({ message: 'Access token is required' });
    }
    
    // Make request to Facebook Graph API
    const response = await axios.get(`https://graph.facebook.com/v18.0/${groupId}/members`, {
      params: {
        access_token: token,
        fields: 'id,name,administrator',
        limit: limit || 25,
        after: after || undefined
      },
      headers: {
        'Accept': 'application/json',
      },
      timeout: 15000 // 15 second timeout
    });
    
    // Return Facebook's response to the client
    return res.json(response.data);
    
  } catch (error) {
    console.error('Facebook group members API error:', error.message);
    
    // Return specific error from Facebook if available
    if (error.response && error.response.data) {
      return res.status(error.response.status || 500).json({
        message: 'Facebook API error',
        error: error.response.data
      });
    }
    
    // Handle network errors, timeouts, etc.
    return res.status(500).json({
      message: 'Error proxying request to Facebook API',
      error: error.message
    });
  }
});

module.exports = router;