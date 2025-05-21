const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { 
  extractFacebookToken, 
  saveFacebookToken,
  generateSuggestions,
  rephraseText
} = require('../../controllers/aiController');

// Import AI Prompts routes
const aiPromptsRoutes = require('./aiPrompts');
/**
 * @route   /api/ai/prompts/*
 * @desc    Routes for AI prompt generation
 * @access  Private
 */
router.use('/prompts', aiPromptsRoutes);
/**
 * @route   POST /api/ai/extract-facebook-token
 * @desc    Extract Facebook access token
 * @access  Private
 */
router.post('/extract-facebook-token', protect, extractFacebookToken);

/**
 * @route   POST /api/ai/save-facebook-token
 * @desc    Save extracted Facebook token to user account
 * @access  Private
 */
router.post('/save-facebook-token', protect, saveFacebookToken);

/**
 * @route   POST /api/ai/suggestions
 * @desc    Generate content suggestions using Gemini AI
 * @access  Private
 */
router.post('/suggestions', protect, generateSuggestions);

/**
 * @route   POST /api/ai/rephrase
 * @desc    Rephrase text using Gemini AI
 * @access  Private
 */
router.post('/rephrase', protect, rephraseText);


module.exports = router;