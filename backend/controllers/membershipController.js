const asyncHandler = require('express-async-handler');
const MembershipPlan = require('../models/MembershipPlan');

// @desc    Get all membership plans
// @route   GET /api/memberships
// @access  Public
const getMembershipPlans = asyncHandler(async (req, res) => {
  try {
    // Get only active plans if not admin
    const query = req.user && req.user.role === 'admin' ? {} : { isActive: true };
    
    const plans = await MembershipPlan.find(query).sort({ price: 1 });
    
    res.json(plans);
  } catch (error) {
    console.error('Error fetching membership plans:', error);
    res.status(500);
    throw new Error('خطأ في جلب خطط العضوية');
  }
});

// @desc    Get single membership plan by ID
// @route   GET /api/memberships/:id
// @access  Public
const getMembershipPlanById = asyncHandler(async (req, res) => {
  try {
    const plan = await MembershipPlan.findById(req.params.id);
    
    if (!plan) {
      res.status(404);
      throw new Error('خطة العضوية غير موجودة');
    }
    
    // If not admin and plan is not active, restrict access
    if ((!req.user || req.user.role !== 'admin') && !plan.isActive) {
      res.status(404);
      throw new Error('خطة العضوية غير موجودة');
    }
    
    res.json(plan);
  } catch (error) {
    console.error('Error fetching membership plan:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'خطأ في جلب خطة العضوية');
  }
});

// @desc    Create new membership plan
// @route   POST /api/memberships
// @access  Admin
const createMembershipPlan = asyncHandler(async (req, res) => {
  try {
    const { name, description, price, duration, points, discount, features, isActive } = req.body;
    
    // Validate input
    if (!name || !description || !price || !duration) {
      res.status(400);
      throw new Error('يرجى تقديم جميع البيانات المطلوبة');
    }
    
    // Check if a plan with the same name already exists
    const existingPlan = await MembershipPlan.findOne({ name });
    if (existingPlan) {
      res.status(400);
      throw new Error('يوجد بالفعل خطة عضوية بهذا الاسم');
    }
    
    // Create new plan
    const plan = await MembershipPlan.create({
      name,
      description,
      price,
      duration,
      points: points || 0,
      discount: discount || 0,
      features: features || [],
      isActive: isActive !== undefined ? isActive : true
    });
    
    res.status(201).json(plan);
  } catch (error) {
    console.error('Error creating membership plan:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'خطأ في إنشاء خطة العضوية');
  }
});

// @desc    Update membership plan
// @route   PUT /api/memberships/:id
// @access  Admin
const updateMembershipPlan = asyncHandler(async (req, res) => {
  try {
    const { name, description, price, duration, points, discount, features, isActive } = req.body;
    
    // Find plan by ID
    const plan = await MembershipPlan.findById(req.params.id);
    
    if (!plan) {
      res.status(404);
      throw new Error('خطة العضوية غير موجودة');
    }
    
    // Check if name is being changed and if new name already exists
    if (name && name !== plan.name) {
      const existingPlan = await MembershipPlan.findOne({ name });
      if (existingPlan) {
        res.status(400);
        throw new Error('يوجد بالفعل خطة عضوية بهذا الاسم');
      }
    }
    
    // Update plan fields
    plan.name = name || plan.name;
    plan.description = description || plan.description;
    plan.price = price !== undefined ? price : plan.price;
    plan.duration = duration !== undefined ? duration : plan.duration;
    plan.points = points !== undefined ? points : plan.points;
    plan.discount = discount !== undefined ? discount : plan.discount;
    plan.features = features || plan.features;
    plan.isActive = isActive !== undefined ? isActive : plan.isActive;
    
    // Save updated plan
    const updatedPlan = await plan.save();
    
    res.json(updatedPlan);
  } catch (error) {
    console.error('Error updating membership plan:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'خطأ في تحديث خطة العضوية');
  }
});

// @desc    Delete membership plan
// @route   DELETE /api/memberships/:id
// @access  Admin
const deleteMembershipPlan = asyncHandler(async (req, res) => {
  try {
    const plan = await MembershipPlan.findById(req.params.id);
    
    if (!plan) {
      res.status(404);
      throw new Error('خطة العضوية غير موجودة');
    }
    
    // Instead of hard delete, we can soft delete by making it inactive
    plan.isActive = false;
    await plan.save();
    
    // Alternatively, for hard delete:
    // await plan.remove();
    
    res.json({ message: 'تم إلغاء تنشيط خطة العضوية بنجاح' });
  } catch (error) {
    console.error('Error deleting membership plan:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'خطأ في حذف خطة العضوية');
  }
});

module.exports = {
  getMembershipPlans,
  getMembershipPlanById,
  createMembershipPlan,
  updateMembershipPlan,
  deleteMembershipPlan
};