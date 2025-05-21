const express = require('express');
const router = express.Router();
const { protect, admin } = require('../../middleware/auth');
const { 
  checkPoints,
  deductPoints,
  addPoints, 
  getPointTransactions,
  adminAddPoints,
  adminGetAllPointTransactions 
} = require('../../controllers/pointsController');

// Regular user routes
router.post('/check', protect, checkPoints);
router.post('/deduct', protect, deductPoints);
router.post('/add', protect, addPoints);
router.get('/transactions', protect, getPointTransactions);

// Admin routes
router.post('/admin/add', protect, admin, adminAddPoints);
router.get('/admin/transactions', protect, admin, adminGetAllPointTransactions);

module.exports = router;