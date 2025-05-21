const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { 
  generateEnhancedPrompt,
  generateChatPrompt,
  generateReasonerPrompt,
  generateImagePrompt,
  checkPrompt,
  savePromptToFavorites,
  streamPromptResponse
} = require('../../controllers/aiPromptController');

/**
 * @route   POST /api/ai/prompts/enhance
 * @desc    Generate enhanced AI prompt
 * @access  Private
 */
router.post('/enhance', protect, generateEnhancedPrompt);

/**
 * @route   POST /api/ai/prompts/chat
 * @desc    Generate chat-style AI prompt
 * @access  Private
 */
router.post('/chat', protect, generateChatPrompt);

/**
 * @route   POST /api/ai/prompts/reasoner
 * @desc    Generate reasoning AI prompt
 * @access  Private
 */
router.post('/reasoner', protect, generateReasonerPrompt);

/**
 * @route   POST /api/ai/prompts/image
 * @desc    Generate image AI prompt
 * @access  Private
 */
router.post('/image', protect, generateImagePrompt);

/**
 * @route   POST /api/ai/prompts/checker
 * @desc    Check and analyze AI prompts
 * @access  Private
 */
router.post('/checker', protect, checkPrompt);

/**
 * @route   POST /api/ai/prompts/favorites
 * @desc    Save prompt to favorites
 * @access  Private
 */
router.post('/favorites', protect, savePromptToFavorites);

/**
 * @route   POST /api/ai/prompts/stream/:type
 * @desc    Stream AI prompt response
 * @access  Private
 */
router.post('/stream/:type', protect, streamPromptResponse);

/**
 * @route   GET /api/ai/prompts/stream/:type
 * @desc    Stream AI prompt response (for EventSource)
 * @access  Private
 */
router.get('/stream/:type', protect, streamPromptResponse);

module.exports = router;