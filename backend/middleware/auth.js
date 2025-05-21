const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

/**
 * Middleware to protect routes requiring authentication
 * Verifies JWT token and attaches user to request object
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for Authorization header with Bearer token
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Extract token from Authorization header
      token = req.headers.authorization.split(' ')[1];

      // Verify token using JWT_SECRET
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find user by ID extracted from token
      // Exclude password from returned user object
      const user = await User.findById(decoded.id).select('-password');

      // If user not found despite valid token
      if (!user) {
        console.error(`User not found for ID: ${decoded.id}`);
        res.status(401);
        throw new Error('Not authorized, user not found');
      }
      
      // Check if user has membership and if it's expired
      if (user.hasMembership && user.membershipExpires) {
        const now = new Date();
        const expiry = new Date(user.membershipExpires);
        
        // If membership has expired, update user record
        if (expiry < now) {
          console.log(`Membership expired for user ${user._id}, updating status`);
          user.hasMembership = false;
          user.membershipType = 'free';
          user.currentSubscriptionId = null;
          user.membershipExpires = null;
          await user.save();
        }
      }

      // Initialize walletBalance if it doesn't exist
      if (user.walletBalance === undefined) {
        user.walletBalance = 0;
        await user.save();
        console.log(`Initialized walletBalance for user ${user._id}`);
      }

      // Attach user to request object
      req.user = user;
      next();
    } catch (error) {
      console.error('Authentication error:', error.message);
      
      // Handle different types of JWT errors
      if (error.name === 'JsonWebTokenError') {
        res.status(401);
        throw new Error('Not authorized, invalid token');
      } else if (error.name === 'TokenExpiredError') {
        res.status(401);
        throw new Error('Not authorized, token expired');
      } else {
        res.status(401);
        throw new Error('Not authorized, token failed');
      }
    }
  } 
  // Support for EventSource - Check for token in query parameters
  else if (req.query && req.query.token) {
    try {
      // Extract token from query parameter
      token = req.query.token;
      
      // Verify token using JWT_SECRET
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Find user by ID extracted from token
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        console.error(`User not found for ID: ${decoded.id}`);
        res.status(401);
        throw new Error('Not authorized, user not found');
      }
      
      // Check membership expiration (same as above)
      if (user.hasMembership && user.membershipExpires) {
        const now = new Date();
        const expiry = new Date(user.membershipExpires);
        
        if (expiry < now) {
          console.log(`Membership expired for user ${user._id}, updating status`);
          user.hasMembership = false;
          user.membershipType = 'free';
          user.currentSubscriptionId = null;
          user.membershipExpires = null;
          await user.save();
        }
      }
      
      // Initialize walletBalance if needed
      if (user.walletBalance === undefined) {
        user.walletBalance = 0;
        await user.save();
        console.log(`Initialized walletBalance for user ${user._id}`);
      }
      
      // Attach user to request object
      req.user = user;
      next();
    } catch (error) {
      console.error('Query parameter authentication error:', error.message);
      
      // Handle different types of JWT errors
      if (error.name === 'JsonWebTokenError') {
        res.status(401);
        throw new Error('Not authorized, invalid token');
      } else if (error.name === 'TokenExpiredError') {
        res.status(401);
        throw new Error('Not authorized, token expired');
      } else {
        res.status(401);
        throw new Error('Not authorized, token failed');
      }
    }
  } else {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

/**
 * Middleware to restrict routes to admin users only
 * Must be used after protect middleware
 */
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403);
    throw new Error('Not authorized as an admin');
  }
};

module.exports = { protect, admin };