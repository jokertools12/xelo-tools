const express = require('express');
const router = express.Router();
const { 
  getMembershipPlans, 
  getMembershipPlanById, 
  createMembershipPlan, 
  updateMembershipPlan, 
  deleteMembershipPlan 
} = require('../../controllers/membershipController');
const { protect, admin } = require('../../middleware/auth');

// Public routes - accessible to all users
router.get('/', getMembershipPlans);
router.get('/:id', getMembershipPlanById);

// Admin-only routes - for managing membership plans
router.post('/', protect, admin, createMembershipPlan);
router.put('/:id', protect, admin, updateMembershipPlan);
router.delete('/:id', protect, admin, deleteMembershipPlan);

module.exports = router;