const express = require('express');
const router = express.Router();
const { 
  createSupportMessage, 
  getAllSupportMessages,
  getUserSupportMessages,
  getSupportMessageById,
  updateMessageStatus,
  respondToMessage,
  userReplyToMessage,
  markMessageAsRead,
  markMessageAsViewed,
  getSupportStatistics,
  // Template management
  getResponseTemplates,
  getResponseTemplateById,
  createResponseTemplate,
  updateResponseTemplate,
  deleteResponseTemplate,
  incrementTemplateUsage,
  // Admin team and analytics
  getAdminTeam,
  getSupportAnalytics,
  // Enhanced message management
  assignMessageToAdmin,
  addInternalNote
} = require('../../controllers/supportController');
const { protect, admin } = require('../../middleware/auth');

// User Routes - Requires user authentication
router.route('/message').post(protect, createSupportMessage);
router.route('/messages').get(protect, getUserSupportMessages);
router.route('/messages/:id').get(protect, getSupportMessageById);
router.route('/messages/:id/reply').post(protect, userReplyToMessage);
router.route('/messages/:id/viewed').put(protect, markMessageAsViewed);

// Admin Routes - Requires both authentication and admin role
router.route('/admin/messages').get(protect, admin, getAllSupportMessages); 
router.route('/admin/messages/:id/status').put(protect, admin, updateMessageStatus);
router.route('/admin/messages/:id/respond').post(protect, admin, respondToMessage);
router.route('/admin/messages/:id/read').put(protect, admin, markMessageAsRead);
router.route('/admin/messages/:id/assign').put(protect, admin, assignMessageToAdmin);
router.route('/admin/messages/:id/note').post(protect, admin, addInternalNote);
router.route('/admin/statistics').get(protect, admin, getSupportStatistics);
router.route('/admin/analytics').get(protect, admin, getSupportAnalytics);

// Template Routes - Requires both authentication and admin role
router.route('/templates').get(protect, admin, getResponseTemplates);
router.route('/templates').post(protect, admin, createResponseTemplate);
router.route('/templates/:id').get(protect, admin, getResponseTemplateById);
router.route('/templates/:id').put(protect, admin, updateResponseTemplate);
router.route('/templates/:id').delete(protect, admin, deleteResponseTemplate);
router.route('/templates/:id/use').put(protect, admin, incrementTemplateUsage);

module.exports = router;