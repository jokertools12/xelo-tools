const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const commentResponseController = require('../../controllers/commentResponseController');

// Rules routes
router.route('/rules')
  .post(protect, commentResponseController.createRule)
  .get(protect, commentResponseController.getRules);

router.route('/rules/:id')
  .get(protect, commentResponseController.getRuleById)
  .put(protect, commentResponseController.updateRule)
  .delete(protect, commentResponseController.deleteRule);

// Monitor routes
router.route('/monitors')
  .post(protect, commentResponseController.createMonitor)
  .get(protect, commentResponseController.getMonitors);

router.route('/monitors/:id')
  .get(protect, commentResponseController.getMonitorById)
  .put(protect, commentResponseController.updateMonitor)
  .delete(protect, commentResponseController.deleteMonitor);

router.route('/monitors/:id/status')
  .patch(protect, commentResponseController.updateMonitorStatus);

router.route('/monitors/:id/responses')
  .get(protect, commentResponseController.getMonitorResponses);

// New: Manual trigger for comment check
router.route('/monitors/:id/check')
  .post(protect, commentResponseController.triggerMonitorCheck);

// Response history
router.route('/history')
  .get(protect, commentResponseController.getResponseHistory);

// Proxy routes
router.route('/facebook/posts')
  .get(protect, commentResponseController.getFacebookPosts);

router.route('/facebook/pages')
  .get(protect, commentResponseController.getFacebookPages);

// Statistics
router.route('/stats')
  .get(protect, commentResponseController.getStats);

// Admin routes
router.route('/system-health')
  .get(protect, commentResponseController.getSystemHealth);

module.exports = router;