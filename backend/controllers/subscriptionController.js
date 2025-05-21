const asyncHandler = require('express-async-handler');
const Subscription = require('../models/Subscription');
const MembershipPlan = require('../models/MembershipPlan');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const UserAction = require('../models/UserAction');

// @desc    Get user's active subscription
// @route   GET /api/subscriptions/my
// @access  Private
const getMySubscription = asyncHandler(async (req, res) => {
  try {
    if (!req.user) {
      res.status(401);
      throw new Error('Not authorized, user not found');
    }
    
    // Find active subscription for the user
    const subscription = await Subscription.findOne({
      userId: req.user._id,
      status: 'active'
    }).populate('planId');
    
    if (!subscription) {
      return res.json({ 
        hasMembership: false,
        membershipType: 'free'
      });
    }
    
    // Check if subscription has expired
    if (subscription.endDate < new Date()) {
      // Update subscription status
      subscription.status = 'expired';
      await subscription.save();
      
      // Update user's membership status
      await User.findByIdAndUpdate(req.user._id, {
        hasMembership: false,
        membershipType: 'free',
        currentSubscriptionId: null,
        membershipExpires: null
      });
      
      return res.json({ 
        hasMembership: false,
        membershipType: 'free',
        message: 'انتهت صلاحية العضوية الخاصة بك'
      });
    }
    
    res.json({
      hasMembership: true,
      membershipType: req.user.membershipType,
      subscription: {
        _id: subscription._id,
        plan: subscription.planId,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        status: subscription.status,
        autoRenew: subscription.autoRenew
      }
    });
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    res.status(500);
    throw new Error('حدث خطأ أثناء جلب بيانات الاشتراك');
  }
});

// @desc    Subscribe to a membership plan
// @route   POST /api/subscriptions
// @access  Private
const createSubscription = asyncHandler(async (req, res) => {
  try {
    const { planId, paymentMethod, phoneNumber, referenceNumber, screenshot } = req.body;
    
    // Validate required fields
    if (!planId || !paymentMethod) {
      res.status(400);
      throw new Error('يرجى تقديم جميع البيانات المطلوبة');
    }
    
    // Additional validation for non-wallet payment methods
    if (paymentMethod !== 'wallet' && (!phoneNumber || !referenceNumber)) {
      res.status(400);
      throw new Error('يرجى تقديم رقم الهاتف ورقم المرجع لطريقة الدفع المختارة');
    }
    
    // Validate payment method
    if (!['vodafone_cash', 'etisalat_cash', 'electronic_wallets', 'wallet'].includes(paymentMethod)) {
      res.status(400);
      throw new Error('طريقة الدفع غير صالحة');
    }
    
    // Check if plan exists
    const plan = await MembershipPlan.findById(planId);
    if (!plan || !plan.isActive) {
      res.status(404);
      throw new Error('خطة العضوية غير موجودة أو غير نشطة');
    }
    
    // Check if user already has a pending subscription request
    const pendingSubscription = await Subscription.findOne({
      userId: req.user._id,
      status: 'pending'
    }).populate('planId');
    
    if (pendingSubscription) {
      const pendingPlan = pendingSubscription.planId;
      const pendingPlanName = pendingPlan ? pendingPlan.name : 'خطة عضوية';
      
      // Get payment details for more information
      const pendingPayment = await Payment.findOne({ 
        subscriptionId: pendingSubscription._id 
      });
      
      const paymentDate = pendingPayment ? 
        new Date(pendingPayment.createdAt).toLocaleDateString('ar-EG') : 
        'غير معروف';
      
      return res.status(400).json({
        success: false,
        code: 'PENDING_SUBSCRIPTION_EXISTS',
        message: 'لديك بالفعل طلب اشتراك قيد الانتظار',
        pendingSubscription: {
          id: pendingSubscription._id,
          createdAt: pendingSubscription.createdAt,
          formattedDate: new Date(pendingSubscription.createdAt).toLocaleDateString('ar-EG'),
          planName: pendingPlanName,
          paymentMethod: pendingPayment ? pendingPayment.paymentMethod : 'غير معروف',
          paymentDate: paymentDate
        },
        actions: [
          {
            text: 'الذهاب إلى إدارة الاشتراكات',
            url: '/membership-management'
          },
          {
            text: 'الاتصال بالدعم',
            url: '/help'
          }
        ]
      });
    }
    
    // Set initial subscription status - pending for regular payments, active for wallet
    const initialStatus = paymentMethod === 'wallet' ? 'active' : 'pending';
    
    // Check wallet balance if payment method is wallet
    if (paymentMethod === 'wallet') {
      const user = await User.findById(req.user._id);
      if (!user) {
        res.status(404);
        throw new Error('المستخدم غير موجود');
      }
      if (user.walletBalance < plan.price) {
        res.status(400);
        throw new Error('رصيد المحفظة غير كافٍ لإتمام عملية الدفع');
      }
    }
    
    // Create new subscription
    const subscription = new Subscription({
      userId: req.user._id,
      planId: plan._id,
      startDate: new Date(),
      // Calculate end date based on plan duration
      endDate: new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000),
      status: initialStatus
    });
    
    await subscription.save();
    
    // Create payment record with appropriate status
    const paymentStatus = paymentMethod === 'wallet' ? 'confirmed' : 'pending';
    const paymentData = {
      userId: req.user._id,
      subscriptionId: subscription._id,
      amount: plan.price,
      paymentMethod,
      status: paymentStatus,
      screenshot: screenshot || ''
    };
    
    // Add phone and reference only for non-wallet payments
    if (paymentMethod !== 'wallet') {
      paymentData.phoneNumber = phoneNumber;
      paymentData.referenceNumber = referenceNumber;
    }
    
    const payment = new Payment(paymentData);
    
    if (paymentMethod === 'wallet') {
      payment.verifiedAt = new Date();
    }
    
    await payment.save();
    
    // Process wallet payment immediately if selected
    if (paymentMethod === 'wallet') {
      // Deduct from user's wallet
      const user = await User.findById(req.user._id);
      user.walletBalance -= plan.price;
      
      // Update user membership status
      user.hasMembership = true;
      user.membershipType = plan.name.toLowerCase().includes('premium') ? 'premium' : 'pro';
      user.currentSubscriptionId = subscription._id;
      user.membershipExpires = subscription.endDate;
      
      // Add points from plan if applicable
      if (plan.points && plan.points > 0) {
        user.points += plan.points;
        user.allPoints += plan.points;
        
        // Update user level based on allPoints
        const pointsPerLevel = 25000;
        user.level = Math.floor(user.allPoints / pointsPerLevel) + 1;
        
        // Create points transaction record
        await Transaction.create({
          userId: user._id,
          type: 'points_award',
          amount: plan.points,
          status: 'completed',
          description: `نقاط مكافأة من الاشتراك في خطة ${plan.name}`,
          reference: subscription._id.toString(),
          isDebit: false  // Adding points (credit)
        });

        // Log user action for points reward only if points > 0
        // This check is technically redundant here because of the outer check, but kept for clarity
        if (plan.points > 0) { 
          await UserAction.create({
            userId: user._id,
            actionType: 'points_reward', 
            details: {
              action: 'points_awarded',
              description: `تمت إضافة ${plan.points} نقطة كمكافأة للاشتراك في خطة ${plan.name}`, // وصف واضح
              amount: plan.points,
              source: 'subscription_wallet', // توضيح المصدر
              planName: plan.name,
              planId: plan._id.toString()
            },
            module: 'membership'
          });
        }
      } // End of outer if (plan.points && plan.points > 0) block
      
      await user.save();
      
      // Create wallet transaction record
      await Transaction.create({
        userId: req.user._id,
        type: 'wallet_payment',
        amount: plan.price,
        status: 'completed',
        description: `دفع من المحفظة للاشتراك في خطة ${plan.name}`,
        reference: subscription._id.toString(),
        isDebit: true  // This is a payment (debit)
      });

      // Record subscription creation action ONLY for wallet payments (instant activation)
      await UserAction.create({
        userId: req.user._id,
        actionType: 'subscription_create', 
        details: {
          action: 'new_subscription_wallet', // توضيح المصدر
          description: `تم الاشتراك في خطة ${plan.name} بنجاح عبر المحفظة`, // وصف واضح
          planId: plan._id,
          planName: plan.name,
          amount: plan.price,
          paymentMethod: paymentMethod 
        },
        module: 'membership'
      });

    } else { // This is the block for manual payments (non-wallet)
      // For normal payment methods, create a pending transaction
      await Transaction.create({
        userId: req.user._id,
        type: 'subscription',
        amount: plan.price,
        status: 'pending',
        description: `طلب اشتراك في خطة ${plan.name}`, // توضيح أنه طلب
        reference: subscription._id.toString(),
        isDebit: true  // This is a payment (debit)
      });
      // DO NOT log user action 'subscription_create' here for manual payments.
      // It will be logged upon confirmation by the admin in confirmSubscription.
    } // End of else block for manual payments
    
    const successMessage = paymentMethod === 'wallet' 
      ? 'تم الاشتراك بنجاح باستخدام رصيد المحفظة.' 
      : 'تم إنشاء طلب الاشتراك بنجاح. يرجى انتظار تأكيد الدفع من قبل الإدارة.';
    
    const pointsMessage = (paymentMethod === 'wallet' && plan.points && plan.points > 0) 
      ? ` تمت إضافة ${plan.points} نقطة إلى حسابك.`
      : '';
    
    res.status(201).json({
      message: successMessage + pointsMessage,
      subscription: {
        _id: subscription._id,
        planName: plan.name,
        amount: plan.price,
        status: subscription.status,
        paymentMethod: paymentMethod,
        pointsAwarded: (paymentMethod === 'wallet' && plan.points && plan.points > 0) ? plan.points : null
      }
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'حدث خطأ أثناء إنشاء الاشتراك');
  }
});

// @desc    Confirm subscription payment (admin only)
// @route   PUT /api/subscriptions/:id/confirm
// @access  Admin
const confirmSubscription = asyncHandler(async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    
    if (!subscription) {
      res.status(404);
      throw new Error('الاشتراك غير موجود');
    }
    
    // Check if subscription is pending
    if (subscription.status !== 'pending') {
      res.status(400);
      throw new Error('يمكن تأكيد الاشتراكات المعلقة فقط');
    }
    
    // Get associated payment
    const payment = await Payment.findOne({ subscriptionId: subscription._id });
    if (!payment) {
      res.status(404);
      throw new Error('لم يتم العثور على معاملة الدفع المرتبطة');
    }
    
    // Get plan details
    const plan = await MembershipPlan.findById(subscription.planId);
    if (!plan) {
      res.status(404);
      throw new Error('خطة العضوية غير موجودة');
    }
    
    // Update subscription status
    subscription.status = 'active';
    await subscription.save();
    
    // Update payment status
    payment.status = 'confirmed';
    payment.adminNote = req.body.adminNote || 'تم تأكيد الدفع';
    payment.confirmedBy = req.user._id; // Admin user ID
    payment.confirmedAt = new Date();
    await payment.save();
    
    // Update transaction status
    await Transaction.findOneAndUpdate(
      { 
        userId: subscription.userId, 
        type: 'subscription', 
        reference: subscription._id.toString() 
      },
      { 
        status: 'completed', 
        description: `اشتراك في خطة ${plan.name} - تم التأكيد` 
      }
    );
    
    // Update user's membership status
    const user = await User.findById(subscription.userId);
    if (!user) {
       // This should ideally not happen if subscription exists, but handle defensively
       console.error(`User not found for confirmed subscription: ${subscription.userId}`);
    } else {
      user.hasMembership = true;
      user.membershipType = plan.name.toLowerCase().includes('premium') ? 'premium' : 'pro';
      user.currentSubscriptionId = subscription._id;
      user.membershipExpires = subscription.endDate;

      // Add points from plan to user if plan has points
      if (plan.points && plan.points > 0) {
        user.points += plan.points;
        user.allPoints += plan.points; 
        
        // Update user level based on allPoints
        const pointsPerLevel = 25000;
        user.level = Math.floor(user.allPoints / pointsPerLevel) + 1;

        // Create points transaction record
        await Transaction.create({
          userId: user._id,
          type: 'points_award',
          amount: plan.points,
          status: 'completed',
          description: `نقاط مكافأة من خطة العضوية ${plan.name}`,
          reference: subscription._id.toString(),
          isDebit: false  // This is a credit transaction (adding points)
        });
        
        // Log user action for points reward only if points > 0
        // Redundant check, but safe
        if (plan.points > 0) { 
          await UserAction.create({
            userId: user._id, // The user receiving points
            actionType: 'points_reward', 
            details: {
              action: 'points_awarded',
              description: `تمت إضافة ${plan.points} نقطة كمكافأة لتأكيد الاشتراك في خطة ${plan.name}`, // وصف واضح
              source: 'membership_plan_confirmation', 
              points: plan.points,
              planId: plan._id,
              planName: plan.name
            },
            module: 'points'
          });
        } // End of inner if for points logging
        
        console.log(`Added ${plan.points} points to user ${user._id} for subscription to plan ${plan.name}`);
      } // End of outer if for points check
      await user.save(); // Save user changes (membership status and points)
    } // End of if (user) block

    // Record user action for the confirmed subscription (for the user who subscribed)
    // Create the base details object without points info
    const subscriptionDetails = {
      action: 'confirmed_subscription', 
      description: `تم تأكيد اشتراكك في خطة ${plan.name} بواسطة المسؤول`, // وصف واضح
      planId: plan._id,
      planName: plan.name,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod, 
      confirmedByAdmin: req.user._id // Admin who confirmed
    };
    
    // Only add points info if points are actually awarded
    if (plan.points && plan.points > 0) {
      subscriptionDetails.pointsAwarded = plan.points;
    }
    
    await UserAction.create({
      userId: subscription.userId, 
      actionType: 'subscription_create', 
      details: subscriptionDetails,
      module: 'membership'
    });
   
    // Record admin action (for the admin performing the confirmation)
    await UserAction.create({
      userId: req.user._id, // The admin user
      actionType: 'admin', // Correct type for admin actions
      details: {
        action: 'confirm_subscription',
        description: `قام بتأكيد اشتراك المستخدم ${user ? user.username || user._id : subscription.userId} في خطة ${plan.name}`, // وصف واضح
        subscriptionId: subscription._id,
        targetUserId: subscription.userId, // User whose subscription was confirmed
        planId: plan._id,
        planName: plan.name,
        amount: payment.amount
      },
      module: 'membership'
    });
    
    res.json({
      message: 'تم تأكيد الاشتراك بنجاح',
      subscription: {
        _id: subscription._id,
        status: 'active',
        endDate: subscription.endDate
      },
      payment: {
        _id: payment._id,
        status: 'confirmed'
      },
      pointsAwarded: plan.points || 0
    });
  } catch (error) {
    console.error('Error confirming subscription:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'حدث خطأ أثناء تأكيد الاشتراك');
  }
});

// @desc    Reject subscription payment (admin only)
// @route   PUT /api/subscriptions/:id/reject
// @access  Admin
const rejectSubscription = asyncHandler(async (req, res) => {
  try {
    const { reason } = req.body;
    
    if (!reason) {
      res.status(400);
      throw new Error('يرجى تقديم سبب الرفض');
    }
    
    const subscription = await Subscription.findById(req.params.id);
    
    if (!subscription) {
      res.status(404);
      throw new Error('الاشتراك غير موجود');
    }
    
    // Check if subscription is pending
    if (subscription.status !== 'pending') {
      res.status(400);
      throw new Error('يمكن رفض الاشتراكات المعلقة فقط');
    }
    
    // Get associated payment
    const payment = await Payment.findOne({ subscriptionId: subscription._id });
    if (!payment) {
      res.status(404);
      throw new Error('لم يتم العثور على معاملة الدفع المرتبطة');
    }
    
    // Update subscription status
    subscription.status = 'rejected';
    await subscription.save();
    
    // Update payment status
    payment.status = 'rejected';
    payment.adminNote = reason;
    payment.rejectedBy = req.user._id;
    payment.rejectedAt = new Date();
    await payment.save();
    
    // Update transaction status
    await Transaction.findOneAndUpdate(
      { 
        userId: subscription.userId, 
        type: 'subscription', 
        reference: subscription._id.toString() 
      },
      { 
        status: 'failed', 
        description: `اشتراك مرفوض - ${reason}` 
      }
    );
    
    // Record admin action
    await UserAction.create({
      userId: req.user._id,
      actionType: 'admin',
      details: {
        action: 'reject_subscription',
        description: `قام برفض طلب اشتراك المستخدم ${subscription.userId} بسبب: ${reason}`, // وصف واضح
        subscriptionId: subscription._id,
        targetUserId: subscription.userId,
        reason: reason
      },
      module: 'membership'
    });
    
    res.json({
      message: 'تم رفض الاشتراك بنجاح',
      subscription: {
        _id: subscription._id,
        status: 'rejected'
      },
      payment: {
        _id: payment._id,
        status: 'rejected'
      }
    });
  } catch (error) {
    console.error('Error rejecting subscription:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'حدث خطأ أثناء رفض الاشتراك');
  }
});

// @desc    Get all subscriptions (for admin)
// @route   GET /api/subscriptions
// @access  Admin
const getAllSubscriptions = asyncHandler(async (req, res) => {
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
    
    // Get subscriptions with populated user and plan details
    const subscriptions = await Subscription.find(query)
      .populate('userId', 'name username email')
      .populate('planId')
      .sort({ createdAt: -1 });
    
    res.json(subscriptions);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500);
    throw new Error('حدث خطأ أثناء جلب الاشتراكات');
  }
});

// @desc    Get subscription by ID
// @route   GET /api/subscriptions/:id
// @access  Admin or subscription owner
const getSubscriptionById = asyncHandler(async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id)
      .populate('userId', 'name username email')
      .populate('planId');
    
    if (!subscription) {
      res.status(404);
      throw new Error('الاشتراك غير موجود');
    }
    
    // Check if user is authorized to view this subscription
    if (req.user.role !== 'admin' && subscription.userId._id.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('غير مصرح لك بعرض هذا الاشتراك');
    }
    
    // Get related payment information
    const payment = await Payment.findOne({ subscriptionId: subscription._id });
    
    res.json({
      subscription,
      payment
    });
  } catch (error) {
    console.error('Error fetching subscription details:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'حدث خطأ أثناء جلب تفاصيل الاشتراك');
  }
});

// @desc    Cancel subscription
// @route   PUT /api/subscriptions/:id/cancel
// @access  Private (subscription owner)
const cancelSubscription = asyncHandler(async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id).populate('planId'); // Populate plan for name
    
    if (!subscription) {
      res.status(404);
      throw new Error('الاشتراك غير موجود');
    }
    
    // Check if user is authorized to cancel this subscription
    if (subscription.userId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('غير مصرح لك بإلغاء هذا الاشتراك');
    }
    
    // Check if subscription is in a cancellable state
    if (subscription.status !== 'active' && subscription.status !== 'pending') {
      res.status(400);
      throw new Error('لا يمكن إلغاء هذا الاشتراك في حالته الحالية');
    }

    // Save previous state to determine actions
    const wasActive = subscription.status === 'active';
    const planName = subscription.planId ? subscription.planId.name : 'غير معروفة';
    
    // Update subscription status
    subscription.status = 'cancelled';
    await subscription.save();
    
    // If the subscription is still pending, we can also cancel related payment
    if (!wasActive) {
      await Payment.findOneAndUpdate(
        { subscriptionId: subscription._id },
        { status: 'rejected', adminNote: 'تم إلغاء الاشتراك من قبل المستخدم' }
      );
      
      // Update related transaction
      await Transaction.findOneAndUpdate(
        { 
          userId: req.user._id, 
          type: 'subscription', 
          reference: subscription._id.toString() 
        },
        { 
          status: 'failed', 
          description: 'تم إلغاء طلب الاشتراك من قبل المستخدم' 
        }
      );
    }
    
    // Record user action
    await UserAction.create({
      userId: req.user._id,
      actionType: 'subscription_cancel', 
      details: {
        action: 'cancel_subscription',
        description: `تم إلغاء الاشتراك في خطة ${planName}`, // وصف واضح
        subscriptionId: subscription._id,
        planId: subscription.planId ? subscription.planId._id : null,
        planName: planName
      },
      module: 'membership'
    });
    
    // Always update user's membership status when cancelling a subscription
    // regardless of whether it was active or pending
    await User.findByIdAndUpdate(req.user._id, {
      hasMembership: false,
      membershipType: 'free',
      currentSubscriptionId: null,
      membershipExpires: null
    });
    
    res.json({
      message: 'تم إلغاء الاشتراك بنجاح',
      subscription: {
        _id: subscription._id,
        status: 'cancelled'
      }
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'حدث خطأ أثناء إلغاء الاشتراك');
  }
});

// @desc    Update auto-renew setting
// @route   PUT /api/subscriptions/:id/auto-renew
// @access  Private (subscription owner)
const toggleAutoRenew = asyncHandler(async (req, res) => {
  try {
    const { autoRenew } = req.body;
    
    if (autoRenew === undefined) {
      res.status(400);
      throw new Error('يرجى تحديد قيمة التجديد التلقائي');
    }
    
    const subscription = await Subscription.findById(req.params.id).populate('planId'); // Populate plan for name
    
    if (!subscription) {
      res.status(404);
      throw new Error('الاشتراك غير موجود');
    }
    
    // Check if user is authorized to update this subscription
    if (subscription.userId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('غير مصرح لك بتحديث هذا الاشتراك');
    }
    
    // Check if subscription is active
    if (subscription.status !== 'active') {
      res.status(400);
      throw new Error('يمكن تحديث التجديد التلقائي للاشتراكات النشطة فقط');
    }
    
    // Update auto-renew setting
    subscription.autoRenew = autoRenew;
    await subscription.save();
    
    const planName = subscription.planId ? subscription.planId.name : 'غير معروفة';
    const actionText = autoRenew ? 'تفعيل' : 'إلغاء';
    
    // Record user action
    await UserAction.create({
      userId: req.user._id,
      actionType: 'subscription_update', 
      details: {
        action: autoRenew ? 'enable_auto_renew' : 'disable_auto_renew',
        description: `تم ${actionText} التجديد التلقائي لخطة ${planName}`, // وصف واضح
        subscriptionId: subscription._id,
        planId: subscription.planId ? subscription.planId._id : null,
        planName: planName,
        autoRenew: autoRenew
      },
      module: 'membership'
    });
    
    res.json({
      message: autoRenew ? 'تم تفعيل التجديد التلقائي بنجاح' : 'تم إلغاء التجديد التلقائي بنجاح',
      autoRenew: subscription.autoRenew
    });
  } catch (error) {
    console.error('Error updating auto-renew setting:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'حدث خطأ أثناء تحديث إعداد التجديد التلقائي');
  }
});

// @desc    Check if user can access specific feature
// @route   POST /api/subscriptions/check-access
// @access  Private
const checkFeatureAccess = asyncHandler(async (req, res) => {
  try {
    const { featureKey } = req.body;
    
    if (!featureKey) {
      res.status(400);
      throw new Error('يرجى تحديد مفتاح الميزة');
    }
    
    // Determine if user has access to the feature
    const user = await User.findById(req.user._id);
    
    // Free features available to all users
    const freeFeatures = ['dashboard', 'profile', 'settings', 'help'];
    
    // Check if this is a free feature
    if (freeFeatures.includes(featureKey)) {
      return res.json({
        hasAccess: true,
        membershipType: user.membershipType,
        hasMembership: user.hasMembership,
        featureKey,
        reason: 'free_feature'
      });
    }
    
    // Check if user has an active membership
    let hasAccess = false;
    let reason = 'no_membership';
    
    if (user.hasMembership) {
      // Double-check membership expiration
      if (user.membershipExpires && new Date(user.membershipExpires) > new Date()) {
        // Membership is valid and not expired
        hasAccess = true;
        reason = 'active_membership';
      } else {
        // Membership has expired, update user record
        user.hasMembership = false;
        user.membershipType = 'free';
        user.currentSubscriptionId = null;
        user.membershipExpires = null;
        await user.save();
        
        reason = 'expired_membership';
      }
    }
    
    // If user is an admin, always grant access
    if (user.role === 'admin') {
      hasAccess = true;
      reason = 'admin_access';
    }
    
    res.json({
      hasAccess,
      membershipType: user.membershipType,
      hasMembership: user.hasMembership,
      featureKey,
      reason
    });
  } catch (error) {
    console.error('Error checking feature access:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'حدث خطأ أثناء التحقق من صلاحية الوصول للميزة');
  }
});

// @desc    Get subscription statistics for admin dashboard
// @route   GET /api/subscriptions/stats
// @access  Admin
const getSubscriptionStats = asyncHandler(async (req, res) => {
  try {
    // Get total subscriptions count
    const totalSubscriptions = await Subscription.countDocuments();
    
    // Get active subscriptions count
    const activeSubscriptions = await Subscription.countDocuments({ status: 'active' });
    
    // Get expired subscriptions count
    const expiredSubscriptions = await Subscription.countDocuments({ status: 'expired' });
    
    // Get total revenue from confirmed payments
    const paymentsAggregate = await Payment.aggregate([
      { $match: { status: 'confirmed' } },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
    ]);
    
    const totalRevenue = paymentsAggregate.length > 0 ? paymentsAggregate[0].totalRevenue : 0;
    
    // Get subscription counts by plan
    const subscriptionsByPlan = await Subscription.aggregate([
      { $group: { _id: '$planId', count: { $sum: 1 } } }
    ]);
    
    // Get plans for the subscription counts
    const plansData = await Promise.all(
      subscriptionsByPlan.map(async (item) => {
        const plan = await MembershipPlan.findById(item._id);
        return {
          planId: item._id,
          planName: plan ? plan.name : 'Unknown Plan',
          count: item.count
        };
      })
    );
    
    // Get recent subscriptions
    const recentSubscriptions = await Subscription.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'name email')
      .populate('planId', 'name price');
    
    res.json({
      total: totalSubscriptions,
      active: activeSubscriptions,
      expired: expiredSubscriptions,
      revenue: totalRevenue,
      byPlan: plansData,
      recent: recentSubscriptions
    });
  } catch (error) {
    console.error('Error fetching subscription stats:', error);
    res.status(500);
    throw new Error('حدث خطأ أثناء جلب إحصائيات الاشتراكات');
  }
});

// @desc    Process automatic renewals for subscriptions
// @access  Internal (called by scheduler)
const processAutoRenewals = async () => {
  try {
    console.log('Starting automatic subscription renewal process...');
    
    // Get current date
    const now = new Date();
    
    // Set date range for expiring subscriptions (within next 24 hours)
    const expirationRangeEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    // Find subscriptions that:
    // 1. Are active
    // 2. Have auto-renew enabled
    // 3. Are expiring within the next 24 hours
    const expiringSubscriptions = await Subscription.find({
      status: 'active',
      autoRenew: true,
      endDate: { $lte: expirationRangeEnd, $gt: now }
    }).populate('planId').populate('userId');
    
    console.log(`Found ${expiringSubscriptions.length} subscriptions eligible for auto-renewal`);
    
    // Process each subscription
    for (const subscription of expiringSubscriptions) {
      try {
        // Get associated user and plan
        const user = subscription.userId;
        const plan = subscription.planId;
        
        // Skip if either user or plan doesn't exist
        if (!user || !plan) {
          console.error(`Missing user or plan data for subscription ${subscription._id}. User: ${!!user}, Plan: ${!!plan}`);
          continue;
        }

        // Get current wallet balance
        const userWalletBalance = user.walletBalance || 0;
        
        // Check if user has enough funds in wallet
        if (userWalletBalance < plan.price) {
          console.log(`User ${user._id} has insufficient funds for auto-renewal. Needed: ${plan.price}, Available: ${userWalletBalance}`);
          
          // Record failed renewal attempt
          const renewalAttempt = {
            date: new Date(),
            status: 'failed',
            reason: 'insufficient_funds',
            planId: plan._id,
            planPrice: plan.price,
            availableBalance: userWalletBalance
          };
          
          // Add attempt to subscription's renewalAttempts if it doesn't exist
          if (!subscription.renewalAttempts) {
            subscription.renewalAttempts = [];
          }
          
          subscription.renewalAttempts.push(renewalAttempt);
          await subscription.save();
          
          // Skip to next subscription
          continue;
        }
        
        // User has enough funds, proceed with renewal
        console.log(`Processing auto-renewal for subscription ${subscription._id} (User: ${user._id}, Plan: ${plan.name})`);
        
        // Deduct the payment from user's wallet
        user.walletBalance -= plan.price;
        
        // Calculate new end date based on current plan duration
        const newEndDate = new Date(subscription.endDate.getTime() + plan.duration * 24 * 60 * 60 * 1000);
        
        // Update subscription
        subscription.endDate = newEndDate;
        
        // Add to renewal history
        const transaction = await Transaction.create({
          userId: user._id,
          type: 'wallet_payment',
          amount: plan.price,
          status: 'completed',
          description: `تجديد تلقائي للاشتراك في خطة ${plan.name}`,
          reference: subscription._id.toString(),
          isDebit: true  // This is a payment (debit)
        });
        
        // Add renewal record to history
        if (!subscription.renewalHistory) {
          subscription.renewalHistory = [];
        }
        
        subscription.renewalHistory.push({
          date: new Date(),
          planId: plan._id,
          transactionId: transaction._id
        });
        
        // Update user's membership expiration
        user.membershipExpires = newEndDate;
        
        // Add bonus points if applicable
        if (plan.points && plan.points > 0) {
          user.points += plan.points;
          user.allPoints += plan.points;
          
          // Create points transaction
          await Transaction.create({
            userId: user._id,
            type: 'points_award',
            amount: plan.points,
            status: 'completed',
            description: `نقاط مكافأة من التجديد التلقائي لخطة ${plan.name}`,
            reference: subscription._id.toString(),
            isDebit: false  // Adding points (credit)
          });

          // Log user action for points reward only if points > 0
          // Redundant check, but safe
          if (plan.points > 0) { 
            await UserAction.create({
              userId: user._id,
              actionType: 'points_reward', 
              details: {
                action: 'points_awarded',
                description: `تمت إضافة ${plan.points} نقطة كمكافأة للتجديد التلقائي لخطة ${plan.name}`, // وصف واضح
                source: 'auto_renewal',
                points: plan.points,
                planId: plan._id,
                planName: plan.name
              },
              module: 'points'
            });
          } // End of inner if for points logging
          
          console.log(`Added ${plan.points} points to user ${user._id} for auto-renewal`);
        } // End of outer if for points check
        
        // Save changes
        await Promise.all([user.save(), subscription.save()]);
        
        // Create a payment record for this renewal
        await Payment.create({
          userId: user._id,
          subscriptionId: subscription._id,
          amount: plan.price,
          paymentMethod: 'wallet',
          status: 'confirmed',
          description: 'تجديد تلقائي',
          verifiedAt: new Date()
        });
        
    // Record user action for the auto-renewal subscription creation
    await UserAction.create({
      userId: user._id,
      actionType: 'subscription_create', 
      details: {
        action: 'auto_renewal',
        description: `تم تجديد الاشتراك تلقائيًا في خطة ${plan.name}`, // وصف واضح
        planId: plan._id,
        planName: plan.name,
        amount: plan.price,
        endDate: newEndDate
      },
      module: 'membership'
    });
        
    console.log(`Successfully renewed subscription ${subscription._id} until ${newEndDate}`);
      } catch (subError) {
        console.error(`Error processing renewal for subscription ${subscription._id}:`, subError);
      }
    }
    
    console.log('Finished automatic subscription renewal process');
    
    // Re-check for failed renewals from previous days and retry (only once per day)
    await retryFailedRenewals();
    
    return { success: true, processed: expiringSubscriptions.length };
  } catch (error) {
    console.error('Error in subscription auto-renewal process:', error);
    return { success: false, error: error.message };
  }
};

// Helper function to retry failed renewals from previous days
const retryFailedRenewals = async () => {
  try {
    console.log('Checking for previously failed renewals to retry...');
    
    // Find expired subscriptions with auto-renew still enabled
    const expiredSubscriptions = await Subscription.find({
      status: 'active', // Should be active to retry
      autoRenew: true,
      endDate: { $lte: new Date() },  // Already expired
      'renewalAttempts.0': { $exists: true }  // Has at least one failed attempt
    }).populate('planId').populate('userId');
    
    console.log(`Found ${expiredSubscriptions.length} expired subscriptions with failed renewal attempts`);
    
    for (const subscription of expiredSubscriptions) {
      try {
        // Get associated user and plan
        const user = subscription.userId;
        const plan = subscription.planId;
        
        // Skip if either user or plan doesn't exist
        if (!user || !plan) {
          console.error(`Missing user or plan data for retry subscription ${subscription._id}`);
          continue;
        }
        
        // Get current wallet balance
        const userWalletBalance = user.walletBalance || 0;
        
        // Check if user now has enough funds in wallet
        if (userWalletBalance < plan.price) {
          console.log(`User ${user._id} still has insufficient funds for renewal retry. Available: ${userWalletBalance}, Needed: ${plan.price}`);
          
          // Record additional failed attempt
          const renewalAttempt = {
            date: new Date(),
            status: 'failed',
            reason: 'insufficient_funds',
            planId: plan._id,
            planPrice: plan.price,
            availableBalance: userWalletBalance
          };
          
          // Add attempt to history
          if (!subscription.renewalAttempts) {
            subscription.renewalAttempts = [];
          }
          
          subscription.renewalAttempts.push(renewalAttempt);
          
          // Check if we should stop trying after excessive attempts
          if (subscription.renewalAttempts.length > 14) { // Two weeks of attempts
            console.log(`Disabling auto-renewal for subscription ${subscription._id} after ${subscription.renewalAttempts.length} failed attempts`);
            
            // Disable auto-renewal after too many failed attempts
            subscription.autoRenew = false;
            
            // Mark subscription as expired (it already is, but ensure status reflects this)
            subscription.status = 'expired';
            
            // Update user membership status if this was the current one
            if (user.currentSubscriptionId && user.currentSubscriptionId.toString() === subscription._id.toString()) {
              user.hasMembership = false;
              user.membershipType = 'free';
              user.currentSubscriptionId = null;
              user.membershipExpires = null;
              await user.save();
            }
          }
          await subscription.save(); // Save attempts and potentially status/autoRenew changes
          continue; // Skip to next subscription
        }
        
        // User now has enough funds, proceed with renewal
        console.log(`Retrying renewal for subscription ${subscription._id} (User: ${user._id}, Plan: ${plan.name})`);
        
        // Calculate new duration considering the lapsed time
        // Start from NOW to give full duration from successful retry
        const newEndDate = new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000);
        
        // Deduct payment from wallet
        user.walletBalance -= plan.price;
        
        // Update subscription
        subscription.status = 'active'; // Reactivate
        subscription.endDate = newEndDate;
        // Clear renewal attempts on successful retry
        subscription.renewalAttempts = []; 
        
        // Create transaction record
        const transaction = await Transaction.create({
          userId: user._id,
          type: 'wallet_payment',
          amount: plan.price,
          status: 'completed',
          description: `تجديد تلقائي متأخر للاشتراك في خطة ${plan.name}`,
          reference: subscription._id.toString(),
          isDebit: true
        });
        
        // Add renewal record
        if (!subscription.renewalHistory) {
          subscription.renewalHistory = [];
        }
        
        subscription.renewalHistory.push({
          date: new Date(),
          planId: plan._id,
          transactionId: transaction._id
        });
        
        // Update user's membership status
        user.hasMembership = true;
        user.membershipType = plan.name.toLowerCase().includes('premium') ? 'premium' : 'pro';
        user.currentSubscriptionId = subscription._id; // Ensure this is set
        user.membershipExpires = newEndDate;
        
        // Add bonus points if applicable
        if (plan.points && plan.points > 0) {
          user.points += plan.points;
          user.allPoints += plan.points;
          
          // Update level
          const pointsPerLevel = 25000;
          user.level = Math.floor(user.allPoints / pointsPerLevel) + 1;

          // Create points transaction
          await Transaction.create({
            userId: user._id,
            type: 'points_award',
            amount: plan.points,
            status: 'completed',
            description: `نقاط مكافأة من التجديد التلقائي المتأخر لخطة ${plan.name}`,
            reference: subscription._id.toString(),
            isDebit: false
          });

          // Log user action for points reward only if points > 0
          // Redundant check, but safe
          if (plan.points > 0) { 
            await UserAction.create({
              userId: user._id,
              actionType: 'points_reward', 
              details: {
                action: 'points_awarded',
                description: `تمت إضافة ${plan.points} نقطة كمكافأة للتجديد التلقائي المتأخر لخطة ${plan.name}`, // وصف واضح
                source: 'delayed_auto_renewal',
                points: plan.points,
                planId: plan._id,
                planName: plan.name
              },
              module: 'points'
            });
          } // End of inner if for points logging
        } // End of outer if for points check
        
        // Save changes
        await Promise.all([user.save(), subscription.save()]);
        
        // Create payment record
        await Payment.create({
          userId: user._id,
          subscriptionId: subscription._id,
          amount: plan.price,
          paymentMethod: 'wallet',
          status: 'confirmed',
          description: 'تجديد تلقائي متأخر',
          verifiedAt: new Date()
        });

        // Record user action for successful delayed auto-renewal subscription creation
        await UserAction.create({
          userId: user._id,
          actionType: 'subscription_create', 
          details: {
            action: 'delayed_auto_renewal',
            description: `تم تجديد الاشتراك المتأخر تلقائيًا في خطة ${plan.name}`, // وصف واضح
            planId: plan._id,
            planName: plan.name,
            amount: plan.price,
            endDate: newEndDate
          },
          module: 'membership'
        });
        
        console.log(`Successfully processed delayed renewal for subscription ${subscription._id} until ${newEndDate}`);
      } catch (retryError) {
        console.error(`Error retrying renewal for subscription ${subscription._id}:`, retryError);
      }
    }
    
    console.log('Finished retrying previously failed renewals');
  } catch (error) {
    console.error('Error in retrying failed renewals:', error);
  }
};

module.exports = {
  getMySubscription,
  createSubscription,
  confirmSubscription,
  rejectSubscription,
  getAllSubscriptions,
  getSubscriptionById,
  cancelSubscription,
  toggleAutoRenew,
  checkFeatureAccess,
  getSubscriptionStats,
  processAutoRenewals  // Export the new function
};
