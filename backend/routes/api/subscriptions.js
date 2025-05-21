const express = require('express');
const router = express.Router();
const { 
  getMySubscription, 
  createSubscription, 
  getAllSubscriptions,
  getSubscriptionById,
  cancelSubscription,
  toggleAutoRenew,
  checkFeatureAccess,
  getSubscriptionStats,
  confirmSubscription,
  rejectSubscription
} = require('../../controllers/subscriptionController');
const { protect, admin } = require('../../middleware/auth');

// User routes - manage own subscription
router.get('/my', protect, getMySubscription);
router.post('/', protect, createSubscription);
router.put('/:id/cancel', protect, cancelSubscription);
router.put('/:id/auto-renew', protect, toggleAutoRenew);
router.post('/check-access', protect, checkFeatureAccess);

// Admin routes - manage all subscriptions
router.get('/', protect, admin, getAllSubscriptions);
router.get('/stats', protect, admin, getSubscriptionStats);
router.get('/:id', protect, getSubscriptionById);

// Admin routes - confirm or reject subscriptions
router.put('/:id/confirm', protect, admin, confirmSubscription);
router.put('/:id/reject', protect, admin, rejectSubscription);

module.exports = router;