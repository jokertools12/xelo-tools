const asyncHandler = require('express-async-handler');
const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const UserAction = require('../models/UserAction');
const MembershipPlan = require('../models/MembershipPlan');

// @desc    Get all payments (admin)
// @route   GET /api/payments
// @access  Admin
const getAllPayments = asyncHandler(async (req, res) => {
  try {
    const { status, userId } = req.query;
    
    // Build query object
    const query = {};
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    }
    
    // Filter by userId if provided
    if (userId) {
      query.userId = userId;
    }
    
    // Get payments with populated user and subscription details
    const payments = await Payment.find(query)
      .populate('userId', 'name username email')
      .populate({
        path: 'subscriptionId',
        populate: {
          path: 'planId',
          model: 'MembershipPlan'
        }
      })
      .sort({ createdAt: -1 });
    
    res.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500);
    throw new Error('حدث خطأ أثناء جلب المدفوعات');
  }
});

// @desc    Get payment by ID
// @route   GET /api/payments/:id
// @access  Admin or payment owner
const getPaymentById = asyncHandler(async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('userId', 'name username email')
      .populate({
        path: 'subscriptionId',
        populate: {
          path: 'planId',
          model: 'MembershipPlan'
        }
      });
    
    if (!payment) {
      res.status(404);
      throw new Error('عملية الدفع غير موجودة');
    }
    
    // Check if user is authorized to view this payment
    if (req.user.role !== 'admin' && payment.userId._id.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('غير مصرح لك بعرض تفاصيل هذه العملية');
    }
    
    res.json(payment);
  } catch (error) {
    console.error('Error fetching payment details:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'حدث خطأ أثناء جلب تفاصيل المدفوعات');
  }
});

// @desc    Get user payments
// @route   GET /api/payments/my
// @access  Private
const getMyPayments = asyncHandler(async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user._id })
      .populate({
        path: 'subscriptionId',
        populate: {
          path: 'planId',
          model: 'MembershipPlan'
        }
      })
      .sort({ createdAt: -1 });
    
    res.json(payments);
  } catch (error) {
    console.error('Error fetching user payments:', error);
    res.status(500);
    throw new Error('حدث خطأ أثناء جلب مدفوعاتك');
  }
});

// @desc    Confirm payment (admin)
// @route   PUT /api/payments/:id/confirm
// @access  Admin
const confirmPayment = asyncHandler(async (req, res) => {
  try {
    const { adminNote } = req.body;
    
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      res.status(404);
      throw new Error('عملية الدفع غير موجودة');
    }
    
    // Check if payment is already processed
    if (payment.status !== 'pending') {
      res.status(400);
      throw new Error('تم معالجة عملية الدفع هذه بالفعل');
    }
    
    // Update payment status
    payment.status = 'confirmed';
    payment.adminId = req.user._id;
    payment.adminNote = adminNote || 'تم تأكيد الدفع';
    payment.verifiedAt = new Date();
    
    await payment.save();
    
    // Check if this is a wallet deposit or subscription payment
    if (!payment.subscriptionId) {
      // This might be a wallet deposit
      const transaction = await Transaction.findOne({
        reference: payment._id.toString(),
        type: 'wallet_deposit'
      });
      
      if (transaction) {
        // It's a wallet deposit, update transaction status
        transaction.status = 'completed';
        await transaction.save();
        
        // Update user's wallet balance
        const user = await User.findById(payment.userId);
        if (!user) {
          res.status(404);
          throw new Error('المستخدم غير موجود');
        }
        
        user.walletBalance += payment.amount;
        await user.save();
        
        // Record admin action
        await UserAction.create({
          userId: req.user._id,
          actionType: 'admin', // Changed from 'points' to 'admin' to prevent displaying as points activity
          details: {
            action: 'confirm_wallet_deposit',
            paymentId: payment._id,
            targetUserId: payment.userId,
            amount: payment.amount
          },
          module: 'wallet'
        });
        
        return res.json({
          message: 'تم تأكيد عملية الإيداع في المحفظة بنجاح',
          payment: {
            _id: payment._id,
            status: 'confirmed',
            verifiedAt: payment.verifiedAt
          }
        });
      }
    }
    
    // Handle subscription payment
    const subscription = await Subscription.findById(payment.subscriptionId).populate('planId');
    
    if (!subscription) {
      res.status(404);
      throw new Error('الاشتراك المرتبط بعملية الدفع غير موجود');
    }
    
    // Activate subscription
    subscription.status = 'active';
    await subscription.save();
    
    // Get the membership plan to access its points
    const membershipPlan = subscription.planId;
    const pointsToAward = membershipPlan.points || 0;
    
    // Get the user to update their membership status and points
    const user = await User.findById(payment.userId);
    if (!user) {
      res.status(404);
      throw new Error('المستخدم غير موجود');
    }
    
    // Update user membership status
    user.hasMembership = true;
    user.membershipType = 'premium';
    user.currentSubscriptionId = subscription._id;
    user.membershipExpires = subscription.endDate;
    
      // Add points to the user's account if the plan has points
      if (pointsToAward > 0) {
        // Add points to current balance
        user.points += pointsToAward;
        user.allPoints += pointsToAward;
        
        // Update user level based on allPoints
        const pointsPerLevel = 25000;
        user.level = Math.floor(user.allPoints / pointsPerLevel) + 1;
        
        // Record the points transaction - Using 'points_award' type and isDebit: false
        const pointsTransaction = new Transaction({
          userId: user._id,
          type: 'points_award', // Changed from 'subscription' to 'points_award'
          amount: pointsToAward,
          status: 'completed',
          description: `نقاط مكافأة من الاشتراك في خطة ${membershipPlan.name}`,
          isDebit: false // Explicitly mark this as an addition (not a deduction)
        });
        
        await pointsTransaction.save();
        
        // Record points action - ONLY if points > 0
        await UserAction.create({
          userId: user._id,
          actionType: 'points',
          details: {
            points: pointsToAward,
            operation: 'award',
            reason: `مكافأة من الاشتراك في خطة ${membershipPlan.name}`,
            planId: membershipPlan._id,
            planName: membershipPlan.name
          },
          module: 'membership'
        });
      }
      // لا نريد إنشاء أي إشعار عندما تكون النقاط صفر - Don't create any activity when points are zero
    
    // Save user changes
    await user.save();
    
    // Update subscription transaction status
    await Transaction.findOneAndUpdate(
      { 
        userId: payment.userId,
        type: 'subscription',
        reference: subscription._id.toString()
      },
      {
        status: 'completed',
        description: `تم تفعيل الاشتراك بنجاح`
      }
    );
    
    // تسجيل إجراء المشرف - فقط إذا كانت النقاط أكبر من صفر
    // Record admin action only if there are points awarded or it's a different type of activity
    // منع إنشاء إشعارات "حصل على 0 نقطة" في تدفق أنشطة المستخدم
    if (pointsToAward > 0) {
      // للاشتراكات التي تمنح نقاطًا - إنشاء إشعار عادي
      await UserAction.create({
        userId: req.user._id,
        actionType: 'admin', 
        details: {
          action: 'confirm_payment',
          paymentId: payment._id,
          subscriptionId: subscription._id,
          targetUserId: payment.userId,
          pointsAwarded: pointsToAward
        },
        module: 'payments'
      });
    } else {
      // للاشتراكات التي لا تمنح نقاطًا - إنشاء إشعار بنوع مختلف لن يظهر في تدفق الأنشطة
      await UserAction.create({
        userId: req.user._id,
        actionType: 'admin_log', // نوع خاص لن يتم عرضه في واجهة الأنشطة
        details: {
          action: 'confirm_payment_no_points',
          paymentId: payment._id,
          subscriptionId: subscription._id,
          targetUserId: payment.userId
        },
        module: 'admin' // تغيير الوحدة أيضًا لاستبعادها من عرض الأنشطة
      });
    }
    
    res.json({
      message: 'تم تأكيد عملية الدفع وتفعيل الاشتراك بنجاح',
      payment: {
        _id: payment._id,
        status: 'confirmed',
        verifiedAt: payment.verifiedAt
      },
      pointsAwarded: pointsToAward
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'حدث خطأ أثناء تأكيد عملية الدفع');
  }
});

// @desc    Reject payment (admin)
// @route   PUT /api/payments/:id/reject
// @access  Admin
const rejectPayment = asyncHandler(async (req, res) => {
  try {
    const { adminNote } = req.body;
    
    if (!adminNote) {
      res.status(400);
      throw new Error('يرجى تقديم سبب الرفض');
    }
    
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      res.status(404);
      throw new Error('عملية الدفع غير موجودة');
    }
    
    // Check if payment is already processed
    if (payment.status !== 'pending') {
      res.status(400);
      throw new Error('تم معالجة عملية الدفع هذه بالفعل');
    }
    
    // Update payment status
    payment.status = 'rejected';
    payment.adminId = req.user._id;
    payment.adminNote = adminNote;
    payment.verifiedAt = new Date();
    
    await payment.save();
    
    // Check if this is a wallet deposit
    const walletTransaction = await Transaction.findOne({
      reference: payment._id.toString(),
      type: 'wallet_deposit'
    });
    
    if (walletTransaction) {
      walletTransaction.status = 'failed';
      walletTransaction.description = `تم رفض طلب الإيداع: ${adminNote}`;
      await walletTransaction.save();
      
      // Record admin action
      await UserAction.create({
        userId: req.user._id,
        actionType: 'admin', // Changed from 'points' to 'admin' to prevent displaying as points activity
        details: {
          action: 'reject_wallet_deposit',
          paymentId: payment._id,
          targetUserId: payment.userId,
          reason: adminNote
        },
        module: 'wallet'
      });
      
      return res.json({
        message: 'تم رفض طلب الإيداع بنجاح',
        payment: {
          _id: payment._id,
          status: 'rejected',
          verifiedAt: payment.verifiedAt,
          adminNote: payment.adminNote
        }
      });
    }
    
    // Handle subscription payment rejection
    const subscription = await Subscription.findById(payment.subscriptionId);
    
    if (subscription) {
      // Cancel subscription
      subscription.status = 'cancelled';
      await subscription.save();
      
      // Update transaction status
      await Transaction.findOneAndUpdate(
        { 
          userId: payment.userId,
          type: 'subscription',
          reference: subscription._id.toString()
        },
        {
          status: 'failed',
          description: `تم رفض عملية الدفع: ${adminNote}`
        }
      );
    }
    
    // Record admin action
    await UserAction.create({
      userId: req.user._id,
      actionType: 'admin', // Changed back to 'admin' to prevent displaying as points activity
      details: {
        action: 'reject_payment',
        paymentId: payment._id,
        subscriptionId: subscription ? subscription._id : null,
        targetUserId: payment.userId,
        reason: adminNote
      },
      module: 'payments'
    });
    
    res.json({
      message: 'تم رفض عملية الدفع بنجاح',
      payment: {
        _id: payment._id,
        status: 'rejected',
        verifiedAt: payment.verifiedAt,
        adminNote: payment.adminNote
      }
    });
  } catch (error) {
    console.error('Error rejecting payment:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'حدث خطأ أثناء رفض عملية الدفع');
  }
});

// @desc    Create payment screenshot upload (for user)
// @route   PUT /api/payments/:id/upload-screenshot
// @access  Private (payment owner)
const uploadPaymentScreenshot = asyncHandler(async (req, res) => {
  try {
    const { screenshot } = req.body;
    
    if (!screenshot) {
      res.status(400);
      throw new Error('يرجى تقديم لقطة شاشة للدفع');
    }
    
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      res.status(404);
      throw new Error('عملية الدفع غير موجودة');
    }
    
    // Check if user is authorized to update this payment
    if (payment.userId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('غير مصرح لك بتحديث هذه العملية');
    }
    
    // Don't allow updates if payment is already confirmed or rejected
    if (payment.status !== 'pending') {
      res.status(400);
      throw new Error('لا يمكن تحديث عملية دفع تمت معالجتها بالفعل');
    }
    
    // Update payment screenshot
    payment.screenshot = screenshot;
    await payment.save();
    
    res.json({
      message: 'تم تحديث لقطة شاشة الدفع بنجاح',
      screenshot: payment.screenshot
    });
  } catch (error) {
    console.error('Error uploading payment screenshot:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'حدث خطأ أثناء تحديث لقطة شاشة الدفع');
  }
});

// @desc    Update payment information (for user)
// @route   PUT /api/payments/:id
// @access  Private (payment owner)
const updatePayment = asyncHandler(async (req, res) => {
  try {
    const { referenceNumber, phoneNumber } = req.body;
    
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      res.status(404);
      throw new Error('عملية الدفع غير موجودة');
    }
    
    // Check if user is authorized to update this payment
    if (payment.userId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('غير مصرح لك بتحديث هذه العملية');
    }
    
    // Don't allow updates if payment is already confirmed or rejected
    if (payment.status !== 'pending') {
      res.status(400);
      throw new Error('لا يمكن تحديث عملية دفع تمت معالجتها بالفعل');
    }
    
    // Update payment details
    if (referenceNumber) payment.referenceNumber = referenceNumber;
    if (phoneNumber) payment.phoneNumber = phoneNumber;
    
    await payment.save();
    
    res.json({
      message: 'تم تحديث بيانات الدفع بنجاح',
      payment: {
        _id: payment._id,
        referenceNumber: payment.referenceNumber,
        phoneNumber: payment.phoneNumber
      }
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'حدث خطأ أثناء تحديث بيانات الدفع');
  }
});

module.exports = {
  getAllPayments,
  getPaymentById,
  getMyPayments,
  confirmPayment,
  rejectPayment,
  uploadPaymentScreenshot,
  updatePayment
};