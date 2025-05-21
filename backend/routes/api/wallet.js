const express = require('express');
const router = express.Router();
const { protect, admin } = require('../../middleware/auth');
const {
  getWalletBalance,
  depositToWallet,
  confirmDeposit,
  subscribeUsingWallet,
  getWalletTransactions,
  purchasePoints
} = require('../../controllers/walletController');

// User wallet routes
router.get('/balance', protect, getWalletBalance);
router.post('/deposit', protect, depositToWallet);
router.post('/subscribe', protect, subscribeUsingWallet);
router.get('/transactions', protect, getWalletTransactions);
router.post('/purchase-points', protect, purchasePoints);

// Admin routes
router.put('/deposit/:id/confirm', protect, admin, confirmDeposit);

module.exports = router;