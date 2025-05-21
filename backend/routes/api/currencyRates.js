const express = require('express');
const router = express.Router();
const { 
  getCurrentRate, 
  getRateHistory, 
  updateExchangeRate, 
  convertUsdToEgp 
} = require('../../controllers/currencyRateController');
const { protect, admin } = require('../../middleware/auth');

// Public routes
router.get('/current', getCurrentRate);
router.get('/convert', convertUsdToEgp);

// Admin routes
router.get('/history', protect, admin, getRateHistory);
router.post('/', protect, admin, updateExchangeRate);

module.exports = router;