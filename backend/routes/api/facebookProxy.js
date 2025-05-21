const express = require('express');
const router = express.Router();
const axios = require('axios');
const { protect } = require('../../middleware/auth');

/**
 * @route   GET /api/facebook/proxy
 * @desc    Proxy requests to Facebook Graph API to avoid CORS issues
 * @access  Private
 */
router.get('/proxy', protect, async (req, res) => {
  try {
    // Extract parameters from query
    const { endpoint, fields, accessToken, limit, after, url } = req.query;
    
    let requestUrl;
    
    // If a complete URL is provided (for pagination), use it directly
    if (url) {
      requestUrl = decodeURIComponent(url);
    } else if (endpoint) {
      // Otherwise build URL from components
      requestUrl = `https://graph.facebook.com/v18.0${endpoint}`;
      
      // Build query parameters
      const params = new URLSearchParams();
      
      if (fields) {
        params.append('fields', decodeURIComponent(fields));
      }
      
      if (accessToken) {
        params.append('access_token', decodeURIComponent(accessToken));
      }
      
      if (limit) {
        params.append('limit', limit);
      }
      
      if (after) {
        params.append('after', decodeURIComponent(after));
      }
      
      // Append query parameters to URL
      const queryString = params.toString();
      if (queryString) {
        requestUrl += `?${queryString}`;
      }
    } else {
      return res.status(400).json({ message: 'Missing required parameters: either url or endpoint+accessToken' });
    }
    
    // Make request to Facebook Graph API
    const response = await axios.get(requestUrl, {
      headers: {
        'Accept': 'application/json',
      },
      timeout: 15000 // 15 second timeout
    });
    
    // Return Facebook's response to the client
    return res.json(response.data);
    
  } catch (error) {
    console.error('Facebook proxy error:', error.message);
    
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