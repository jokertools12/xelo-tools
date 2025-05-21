const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const UserAction = require('../models/UserAction');
const Transaction = require('../models/Transaction');

// @desc    Check if user has enough points
// @route   POST /api/check-points
// @access  Private
const checkPoints = asyncHandler(async (req, res) => {
  const { requiredPoints } = req.body;
  const userId = req.user._id;
  
  // Validate input
  if (requiredPoints === undefined || isNaN(requiredPoints) || requiredPoints < 0) {
    res.status(400);
    throw new Error('يرجى تقديم عدد نقاط مطلوب صحيح وموجب');
  }

  try {
    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      res.status(404);
      throw new Error('المستخدم غير موجود');
    }
    
    // Check if user has enough points
    const hasEnough = user.points >= Number(requiredPoints);
    
    res.json({
      hasEnough,
      currentPoints: user.points
    });
  } catch (error) {
    console.error('Error checking points:', error);
    res.status(500);
    throw new Error('حدث خطأ أثناء التحقق من النقاط');
  }
});

// @desc    Deduct points from user
// @route   POST /api/deduct-points
// @access  Private
const deductPoints = asyncHandler(async (req, res) => {
  const { points, operation, reason } = req.body;
  const userId = req.user._id;
  
  // Validate input
  if (points === undefined || isNaN(points) || points <= 0) {
    res.status(400);
    throw new Error('يرجى تقديم عدد نقاط صحيح وموجب للخصم');
  }
  const pointsToDeduct = Number(points);

  try {
    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      res.status(404);
      throw new Error('المستخدم غير موجود');
    }
    
    // Check if user has enough points
    if (user.points < pointsToDeduct) {
      return res.status(400).json({
        success: false,
        message: 'لا يوجد رصيد كافي من النقاط'
      });
    }
    
    // Deduct points
    user.points -= pointsToDeduct;
    
    // Record the transaction
    const transaction = new Transaction({
      userId: user._id,
      type: 'other', // Using 'other' instead of 'points_deduction' to match valid enum values
      amount: pointsToDeduct,
      status: 'completed',
      description: `خصم ${pointsToDeduct} نقطة: ${reason || operation || 'عملية غير محددة'}`,
      isDebit: true // This is a deduction
    });
    
    // Record user action for deduction
    const userAction = new UserAction({
      userId: user._id,
      actionType: 'points', // Keep generic 'points' or create 'points_deduct'? Let's keep 'points' for now.
      details: {
        action: 'points_deducted',
        description: `تم خصم ${pointsToDeduct} نقطة (${reason || operation || 'عملية غير محددة'})`, // وصف واضح
        points: pointsToDeduct,
        operation: 'deduct',
        reason: reason || operation
      },
      module: 'points'
    });
    
    // Save all changes
    await Promise.all([
      user.save(),
      transaction.save(),
      userAction.save()
    ]);
    
    res.json({
      success: true,
      newPoints: user.points,
      message: 'تم خصم النقاط بنجاح'
    });
  } catch (error) {
    console.error('Error deducting points:', error);
    res.status(500);
    throw new Error('حدث خطأ أثناء خصم النقاط');
  }
});

// @desc    Add points to user
// @route   POST /api/add-points
// @access  Private
const addPoints = asyncHandler(async (req, res) => {
  const { points, operation, reason } = req.body;
  const userId = req.user._id;
  
  // Validate input
  if (points === undefined || isNaN(points) || points <= 0) {
    // Allow 0 points for potential future use cases, but don't log action if 0?
    // Let's enforce points > 0 for adding/refunding for now.
    res.status(400);
    throw new Error('يرجى تقديم عدد نقاط صحيح وموجب للإضافة أو الاسترداد');
  }
  const pointsToAdd = Number(points);

  try {
    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      res.status(404);
      throw new Error('المستخدم غير موجود');
    }
    
    // Add points to current balance
    user.points += pointsToAdd;
    
    const isRefund = operation && operation.includes('refund');
    
    // Only update allPoints (lifetime total) for regular additions, not for refunds
    if (!isRefund) {
      user.allPoints += pointsToAdd;
    
      // Update user level based on allPoints
      const pointsPerLevel = 25000;
      user.level = Math.floor(user.allPoints / pointsPerLevel) + 1;
    }
    
    // Determine transaction type based on operation
    const transactionType = isRefund ? 'refund' : 'points_award';
    
    // Record the transaction
    const transaction = new Transaction({
      userId: user._id,
      type: transactionType,
      amount: pointsToAdd,
      status: 'completed',
      description: `${isRefund ? 'استرجاع' : 'إضافة'} ${pointsToAdd} نقطة: ${reason || operation || 'عملية غير محددة'}`,
      isDebit: false // This is an addition/credit
    });
    
    // Array to hold promises for saving
    const savePromises = [user.save(), transaction.save()];

    // Record user action with correct action type, only if points > 0 for rewards
    if (!isRefund && pointsToAdd > 0) {
      const userActionPromise = UserAction.create({
        userId: user._id,
        actionType: 'points_reward', 
        details: {
          action: 'points_awarded',
          description: `تمت إضافة ${pointsToAdd} نقطة (${reason || operation || 'عملية غير محددة'})`, // وصف واضح
          points: pointsToAdd,
          operation: 'add',
          reason: reason || operation
        },
        module: 'points'
      });
      savePromises.push(userActionPromise);
    } else if (isRefund && pointsToAdd > 0) { // Log refund action if points > 0
       const userActionPromise = UserAction.create({
        userId: user._id,
        actionType: 'refund', 
        details: {
          action: 'points_refunded',
          description: `تم استرداد ${pointsToAdd} نقطة (${reason || operation || 'عملية غير محددة'})`, // وصف واضح
          points: pointsToAdd,
          operation: 'refund',
          reason: reason || operation
        },
        module: 'points' // Or potentially 'transactions' module
      });
       savePromises.push(userActionPromise);
    }
    
    // Save all changes concurrently
    await Promise.all(savePromises);
    
    res.json({
      success: true,
      newPoints: user.points,
      allPoints: user.allPoints,
      level: user.level,
      message: 'تم إضافة النقاط بنجاح'
    });
  } catch (error) {
    console.error('Error adding points:', error);
    res.status(500);
    throw new Error('حدث خطأ أثناء إضافة النقاط');
  }
});

// @desc    Get point transactions
// @route   GET /api/points/transactions
// @access  Private
const getPointTransactions = asyncHandler(async (req, res) => {
  try {
    const transactions = await Transaction.find({
      userId: req.user._id,
      // Include relevant point transaction types (including 'other' for point deductions)
      type: { $in: ['points_award', 'points_purchase', 'refund', 'other'] }
    }).sort({ createdAt: -1 });
    
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching point transactions:', error);
    res.status(500);
    throw new Error('حدث خطأ أثناء جلب سجل معاملات النقاط');
  }
});

// @desc    Admin adds points to user
// @route   POST /api/points/admin/add
// @access  Admin
const adminAddPoints = asyncHandler(async (req, res) => {
  const { userId, points, reason } = req.body;
  
  // Validate input
  if (!userId || points === undefined || isNaN(points) || points <= 0) {
    res.status(400);
    throw new Error('يرجى تقديم معرف مستخدم صحيح وعدد نقاط صحيح وموجب');
  }
  const pointsToAdd = Number(points);

  try {
    // Find target user
    const user = await User.findById(userId);
    
    if (!user) {
      res.status(404);
      throw new Error('المستخدم غير موجود');
    }
    
    // Add points to current balance
    user.points += pointsToAdd;
    user.allPoints += pointsToAdd; // Add to lifetime total
    
    // Update user level based on allPoints
    const pointsPerLevel = 25000;
    user.level = Math.floor(user.allPoints / pointsPerLevel) + 1;
    
    // Record the transaction
    const transaction = new Transaction({
      userId: user._id,
      type: 'points_award', // Admin addition is still an award
      amount: pointsToAdd,
      status: 'completed',
      description: `إضافة ${pointsToAdd} نقطة بواسطة الإدارة: ${reason || 'غير محدد'}`,
      isDebit: false, // This is an addition
      adminId: req.user._id // Record which admin added the points
    });
    
    // Array to hold promises for saving
    const savePromises = [user.save(), transaction.save()];

    // Record user action for the recipient only if points > 0
    // Redundant check here because validation ensures points > 0, but safe
    if (pointsToAdd > 0) { 
      const userActionPromise = UserAction.create({
        userId: user._id, // The user receiving points
        actionType: 'points_reward', 
        details: {
          action: 'admin_add_points',
          description: `تمت إضافة ${pointsToAdd} نقطة بواسطة الإدارة (${reason || 'غير محدد'})`, // وصف واضح
          points: pointsToAdd,
          reason: reason || 'إضافة من الإدارة',
          adminId: req.user._id
        },
        module: 'points'
      });
      savePromises.push(userActionPromise);
    }
    
    // Record admin action
    const adminActionPromise = UserAction.create({
      userId: req.user._id, // Admin performing the action
      actionType: 'admin', 
      details: {
        action: 'admin_add_points',
        description: `قام بإضافة ${pointsToAdd} نقطة للمستخدم ${user.username || user._id} (${reason || 'غير محدد'})`, // وصف واضح
        targetUserId: user._id,
        points: pointsToAdd,
        reason: reason || 'غير محدد',
        isAdminAction: true // Flag if needed elsewhere
      },
      module: 'points' // Or 'admin' module
    });
    savePromises.push(adminActionPromise);
    
    // Save all changes concurrently
    await Promise.all(savePromises);
    
    res.json({
      success: true,
      userId: user._id,
      username: user.username,
      newPoints: user.points,
      allPoints: user.allPoints,
      level: user.level,
      message: 'تم إضافة النقاط بنجاح'
    });
  } catch (error) {
    console.error('Error adding points by admin:', error);
    res.status(500);
    throw new Error('حدث خطأ أثناء إضافة النقاط');
  }
});

// @desc    Get all point transactions (admin)
// @route   GET /api/points/admin/transactions
// @access  Admin
const adminGetAllPointTransactions = asyncHandler(async (req, res) => {
  try {
    const { userId, startDate, endDate, limit = 100, page = 1 } = req.query;
    
    // Build query object
    const query = {
      // Include relevant point transaction types (including 'other' for point deductions)
      type: { $in: ['points_award', 'points_purchase', 'refund', 'other'] }
    };
    
    // Filter by user if provided
    if (userId) {
      query.userId = userId;
    }
    
    // Filter by date range if provided
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        // Add 1 day to include the whole end date
        const endOfDay = new Date(endDate);
        endOfDay.setDate(endOfDay.getDate() + 1); 
        query.createdAt.$lt = endOfDay; 
      }
    }
    
    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Get transactions with pagination
    const transactions = await Transaction.find(query)
      .populate('userId', 'name username email')
      // Removed adminId populate that was causing StrictPopulateError
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const totalCount = await Transaction.countDocuments(query);
    
    res.json({
      transactions,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching all point transactions:', error);
    res.status(500);
    throw new Error('حدث خطأ أثناء جلب سجل معاملات النقاط');
  }
});

module.exports = {
  checkPoints,
  deductPoints,
  addPoints,
  getPointTransactions,
  adminAddPoints,
  adminGetAllPointTransactions
};
