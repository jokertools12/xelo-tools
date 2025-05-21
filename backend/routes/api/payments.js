const express = require('express');
const router = express.Router();
const { 
  getAllPayments, 
  getPaymentById, 
  getMyPayments,
  confirmPayment,
  rejectPayment,
  uploadPaymentScreenshot,
  updatePayment
} = require('../../controllers/paymentController');
const { protect, admin } = require('../../middleware/auth');

// User routes - manage own payments
router.get('/my', protect, getMyPayments);
router.put('/:id/upload-screenshot', protect, uploadPaymentScreenshot);
router.put('/:id', protect, updatePayment);

// Admin routes - manage all payments
router.get('/', protect, admin, getAllPayments);
router.get('/:id', protect, getPaymentById);
router.put('/:id/confirm', protect, admin, confirmPayment);
router.put('/:id/reject', protect, admin, rejectPayment);

module.exports = router;