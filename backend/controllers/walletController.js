const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const UserAction = require('../models/UserAction');
const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const MembershipPlan = require('../models/MembershipPlan');

// @desc    Get user's wallet balance
// @route   GET /api/wallet/balance
// @access  Private
const getWalletBalance = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      res.status(404);
      throw new Error('المستخدم غير موجود');
    }
    
    res.json({
      walletBalance: user.walletBalance,
      currency: 'USD' // Consider making currency dynamic if needed
    });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    res.status(500);
    throw new Error('حدث خطأ أثناء جلب رصيد المحفظة');
  }
});

// @desc    Deposit funds to wallet (admin needs to confirm)
// @route   POST /api/wallet/deposit
// @access  Private
const depositToWallet = asyncHandler(async (req, res) => {
  try {
    const { amount, paymentMethod, referenceNumber, phoneNumber, screenshot } = req.body;
    
    // Validate required fields
    if (!amount || !paymentMethod || !phoneNumber || !referenceNumber) {
      res.status(400);
      throw new Error('يرجى تقديم جميع البيانات المطلوبة (المبلغ، طريقة الدفع، رقم الهاتف، الرقم المرجعي)');
    }
    
    // Validate amount
    if (isNaN(amount) || amount <= 0) {
        res.status(400);
        throw new Error('المبلغ يجب أن يكون رقمًا موجبًا');
    }

    // Validate payment method
    if (!['vodafone_cash', 'etisalat_cash', 'electronic_wallets'].includes(paymentMethod)) {
      res.status(400);
      throw new Error('طريقة الدفع غير صالحة');
    }
    
    // Check if user already has a pending deposit request
    const pendingDeposit = await Payment.findOne({
      userId: req.user._id,
      status: 'pending',
      subscriptionId: null // This indicates it's a wallet deposit, not a subscription payment
    });
    
    if (pendingDeposit) {
      return res.status(400).json({
        success: false,
        code: 'PENDING_DEPOSIT_EXISTS',
        message: 'لديك بالفعل طلب إيداع قيد الانتظار',
        pendingDeposit: {
          id: pendingDeposit._id,
          createdAt: pendingDeposit.createdAt,
          formattedDate: new Date(pendingDeposit.createdAt).toLocaleDateString('ar-EG'),
          amount: pendingDeposit.amount,
          paymentMethod: pendingDeposit.paymentMethod
        },
        actions: [
          {
            text: 'الذهاب إلى المحفظة',
            url: '/wallet'
          },
          {
            text: 'الاتصال بالدعم',
            url: '/help'
          }
        ]
      });
    }

    // Create a payment record (pending)
    const payment = new Payment({
      userId: req.user._id,
      amount: Number(amount), // Ensure amount is a number
      paymentMethod,
      phoneNumber,
      referenceNumber,
      status: 'pending',
      subscriptionId: null, // Set to null for wallet deposits
      screenshot: screenshot || ''
    });
    
    await payment.save();
    
    // Record the transaction (pending)
    const transaction = new Transaction({
      userId: req.user._id,
      type: 'wallet_deposit',
      amount: Number(amount),
      status: 'pending',
      description: `طلب إيداع رصيد في المحفظة (${paymentMethod})`,
      reference: payment._id.toString(),
      isDebit: false // Deposit is credit to wallet
    });
    
    await transaction.save();
    
    // Record user action for the deposit request
    await UserAction.create({
      userId: req.user._id,
      actionType: 'wallet_deposit', 
      details: {
        action: 'request_wallet_deposit', 
        description: `تم تقديم طلب إيداع بقيمة ${amount} عبر ${paymentMethod}`, // وصف واضح
        amount: Number(amount),
        paymentMethod,
        paymentId: payment._id.toString(), // Link to payment record
        status: 'pending'
      },
      module: 'wallet'
    });
    
    res.status(201).json({
      message: 'تم إرسال طلب الإيداع بنجاح. يرجى انتظار تأكيد الدفع من قبل الإدارة.',
      payment: {
        _id: payment._id,
        amount: Number(amount),
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Error depositing funds:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'حدث خطأ أثناء إيداع الرصيد');
  }
});

// @desc    Admin confirm wallet deposit
// @route   PUT /api/wallet/deposit/:id/confirm
// @access  Admin
const confirmDeposit = asyncHandler(async (req, res) => {
  try {
    const { adminNote } = req.body;
    const paymentId = req.params.id;
    
    const payment = await Payment.findById(paymentId);
    
    if (!payment) {
      res.status(404);
      throw new Error('عملية الدفع غير موجودة');
    }
    
    // Check if payment is already processed
    if (payment.status !== 'pending') {
      res.status(400);
      throw new Error('تم معالجة عملية الدفع هذه بالفعل');
    }
    
    // Check if it's a wallet deposit payment (not linked to a subscription)
    if (payment.subscriptionId) {
        res.status(400);
        throw new Error('هذه العملية مرتبطة باشتراك وليست إيداع محفظة');
    }

    // Update payment status
    payment.status = 'confirmed';
    payment.adminId = req.user._id; // Admin who confirmed
    payment.adminNote = adminNote || 'تم تأكيد الإيداع';
    payment.verifiedAt = new Date();
    
    await payment.save();
    
    // Find and update related transaction
    const transaction = await Transaction.findOneAndUpdate(
      { reference: payment._id.toString(), type: 'wallet_deposit', status: 'pending' },
      { status: 'completed', description: `إيداع مؤكد: ${payment.amount} عبر ${payment.paymentMethod}` },
      { new: true } // Return the updated document
    );
    
    if (!transaction) {
        console.error(`Transaction not found or already completed for payment ${paymentId}`);
        // Decide if this should be a hard error or just a warning
        // For now, log it and continue updating the user balance
    }
    
    // Update user's wallet balance
    const user = await User.findById(payment.userId);
    if (!user) {
      // This is problematic, maybe reverse the payment confirmation?
      // For now, log an error and inform the admin.
      console.error(`User ${payment.userId} not found for confirmed payment ${paymentId}`);
      res.status(404);
      throw new Error(`المستخدم المرتبط بالدفع ${payment.userId} غير موجود`);
    }
    
    user.walletBalance += payment.amount;
    await user.save();

    // Record user action for the confirmed deposit (for the user receiving funds)
    // Don't include points field at all if no points are being awarded
    await UserAction.create({
      userId: payment.userId, 
      actionType: 'wallet_deposit', 
      details: {
        action: 'confirmed_wallet_deposit',
        description: `تم تأكيد إيداع ${payment.amount} في محفظتك بواسطة المسؤول`, // وصف واضح
        amount: payment.amount,
        paymentId: payment._id,
        confirmedByAdmin: req.user._id 
      },
      module: 'wallet'
    });
    
    // Record admin action (for the admin performing the confirmation)
    await UserAction.create({
      userId: req.user._id, 
      actionType: 'admin', 
      details: {
        action: 'confirm_wallet_deposit',
        description: `قام بتأكيد إيداع ${payment.amount} للمستخدم ${user.username || user._id}`, // وصف واضح
        paymentId: payment._id,
        targetUserId: payment.userId,
        amount: payment.amount
      },
      module: 'wallet'
    });
    
    res.json({
      message: 'تم تأكيد عملية الإيداع بنجاح',
      payment: {
        _id: payment._id,
        status: 'confirmed',
        verifiedAt: payment.verifiedAt,
        amount: payment.amount
      },
      newBalance: user.walletBalance
    });
  } catch (error) {
    console.error('Error confirming deposit:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'حدث خطأ أثناء تأكيد عملية الإيداع');
  }
});

// @desc    Use wallet to subscribe to a plan
// @route   POST /api/wallet/subscribe
// @access  Private
const subscribeUsingWallet = asyncHandler(async (req, res) => {
  try {
    const { planId } = req.body;
    
    // Validate required fields
    if (!planId) {
      res.status(400);
      throw new Error('يرجى تحديد خطة الاشتراك');
    }
    
    // Check if plan exists
    const plan = await MembershipPlan.findById(planId);
    if (!plan || !plan.isActive) {
      res.status(404);
      throw new Error('خطة العضوية غير موجودة أو غير نشطة');
    }
    
    // Get user
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('المستخدم غير موجود');
    }
    
    // Check if user has enough balance
    if (user.walletBalance < plan.price) {
      res.status(400);
      throw new Error('رصيد المحفظة غير كافي للاشتراك في هذه الخطة');
    }
    
    // Check if user already has a pending deposit request
    const pendingDeposit = await Payment.findOne({
      userId: req.user._id,
      status: 'pending',
      subscriptionId: null // This indicates it's a wallet deposit, not a subscription payment
    });
    
    if (pendingDeposit) {
      return res.status(400).json({
        success: false,
        code: 'PENDING_DEPOSIT_EXISTS',
        message: 'لديك بالفعل طلب إيداع قيد الانتظار',
        pendingDeposit: {
          id: pendingDeposit._id,
          createdAt: pendingDeposit.createdAt,
          formattedDate: new Date(pendingDeposit.createdAt).toLocaleDateString('ar-EG'),
          amount: pendingDeposit.amount,
          paymentMethod: pendingDeposit.paymentMethod
        },
        actions: [
          {
            text: 'الذهاب إلى المحفظة',
            url: '/wallet'
          },
          {
            text: 'الاتصال بالدعم',
            url: '/help'
          }
        ]
      });
    }

    // Check if user already has an active subscription (optional, depends on business logic)
    const activeSubscription = await Subscription.findOne({ userId: req.user._id, status: 'active' });
    if (activeSubscription) {
        // Decide how to handle this - maybe prevent subscribing again, or replace existing?
        // For now, let's prevent it.
        res.status(400);
        throw new Error('لديك بالفعل اشتراك نشط');
    }
    
    // Create new subscription
    const subscription = new Subscription({
      userId: req.user._id,
      planId: plan._id,
      startDate: new Date(),
      // Calculate end date based on plan duration
      endDate: new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000),
      status: 'active' // Directly active when using wallet
    });
    
    await subscription.save();
    
    // Create payment record - already confirmed from wallet
    const payment = new Payment({
      userId: req.user._id,
      subscriptionId: subscription._id,
      amount: plan.price,
      paymentMethod: 'wallet',
      status: 'confirmed',
      verifiedAt: new Date()
    });
    
    await payment.save();
    
    // Deduct from wallet balance
    user.walletBalance -= plan.price;
    
    // Update user membership status
    user.hasMembership = true;
    user.membershipType = plan.name.toLowerCase().includes('premium') ? 'premium' : 'pro'; // Adjust logic if needed
    user.currentSubscriptionId = subscription._id;
    user.membershipExpires = subscription.endDate;
    
    // Award points if the plan offers them
    const pointsToAward = plan.points || 0;
    if (pointsToAward > 0) {
      user.points += pointsToAward;
      user.allPoints += pointsToAward;
      
      // Update user level based on allPoints
      const pointsPerLevel = 25000;
      user.level = Math.floor(user.allPoints / pointsPerLevel) + 1;
      
      // Record the points transaction
      const pointsTransaction = new Transaction({
        userId: user._id,
        type: 'points_award',
        amount: pointsToAward,
        status: 'completed',
        description: `نقاط مكافأة من الاشتراك في خطة ${plan.name}`,
        reference: subscription._id.toString(),
        isDebit: false
      });
      
      await pointsTransaction.save();

      // Record user action for points reward only if points > 0
      // This check is redundant here but safe
      if (pointsToAward > 0) { 
        await UserAction.create({
          userId: user._id,
          actionType: 'points_reward',
          details: {
            action: 'points_awarded',
            description: `تمت إضافة ${pointsToAward} نقطة كمكافأة للاشتراك في خطة ${plan.name} عبر المحفظة`, // وصف واضح
            source: 'wallet_subscription',
            points: pointsToAward,
            planId: plan._id,
            planName: plan.name
          },
          module: 'points' // Or 'membership' depending on where you want to categorize it
        });
      } // End if pointsToAward > 0
    } // End if pointsToAward > 0 (outer)
    
    await user.save();
    
    // Record the wallet transaction for the purchase
    const walletTransaction = new Transaction({
      userId: user._id,
      type: 'wallet_purchase', // Use a specific type for wallet purchases
      amount: plan.price,
      status: 'completed',
      description: `دفع اشتراك في خطة ${plan.name} من المحفظة`,
      reference: subscription._id.toString(),
      isDebit: true // Debit from wallet
    });
    
    await walletTransaction.save();
    
    // Record user action for subscription creation via wallet
    await UserAction.create({
      userId: user._id,
      actionType: 'subscription_create', 
      details: {
        action: 'wallet_subscription', 
        description: `تم الاشتراك في خطة ${plan.name} بنجاح باستخدام المحفظة`, // وصف واضح
        planId: plan._id,
        planName: plan.name,
        amount: plan.price,
        pointsAwarded: pointsToAward // Include points awarded info
      },
      module: 'membership'
    });
    
    res.status(201).json({
      message: 'تم الاشتراك بنجاح باستخدام رصيد المحفظة',
      subscription: {
        _id: subscription._id,
        planName: plan.name,
        amount: plan.price,
        status: 'active',
        endDate: subscription.endDate,
        pointsAwarded: pointsToAward
      },
      walletBalance: user.walletBalance
    });
  } catch (error) {
    console.error('Error subscribing using wallet:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'حدث خطأ أثناء الاشتراك باستخدام المحفظة');
  }
});

// @desc    Get user's wallet transaction history
// @route   GET /api/wallet/transactions
// @access  Private
const getWalletTransactions = asyncHandler(async (req, res) => {
  try {
    const transactions = await Transaction.find({ 
      userId: req.user._id,
      // Include relevant wallet transaction types
      type: { $in: ['wallet_deposit', 'wallet_purchase', 'wallet_withdrawal', 'refund'] } 
    }).sort({ createdAt: -1 });
    
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching wallet transactions:', error);
    res.status(500);
    throw new Error('حدث خطأ أثناء جلب سجل معاملات المحفظة');
  }
});

// @desc    Purchase points using wallet
// @route   POST /api/wallet/purchase-points
// @access  Private
const purchasePoints = asyncHandler(async (req, res) => {
  try {
    const { amount, pointsAmount } = req.body;
    
    // Validate required fields
    if (amount === undefined || pointsAmount === undefined) {
      res.status(400);
      throw new Error('يرجى تقديم المبلغ المدفوع وعدد النقاط');
    }
     // Validate numbers
    if (isNaN(amount) || amount <= 0 || isNaN(pointsAmount) || pointsAmount <= 0) {
        res.status(400);
        throw new Error('المبلغ وعدد النقاط يجب أن يكونا أرقامًا موجبة');
    }

    // Get user
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('المستخدم غير موجود');
    }
    
    // Check if user has enough balance
    if (user.walletBalance < Number(amount)) {
      res.status(400);
      throw new Error('رصيد المحفظة غير كافي لشراء النقاط');
    }
    
    // Deduct from wallet balance
    user.walletBalance -= Number(amount);
    
    // Add points
    user.points += Number(pointsAmount);
    user.allPoints += Number(pointsAmount);
    
    // Update user level
    const pointsPerLevel = 25000;
    user.level = Math.floor(user.allPoints / pointsPerLevel) + 1;
    
    await user.save();
    
    // Record wallet transaction
    const walletTransaction = new Transaction({
      userId: user._id,
      type: 'wallet_purchase',
      amount: Number(amount),
      status: 'completed',
      description: `شراء ${pointsAmount} نقطة من المحفظة`,
      isDebit: true
    });
    
    await walletTransaction.save();
    
    // Record points transaction (credit)
    const pointsTransaction = new Transaction({
      userId: user._id,
      type: 'points_purchase', // Specific type for points purchase
      amount: Number(pointsAmount),
      status: 'completed',
      description: `شراء ${pointsAmount} نقطة بقيمة ${amount} دولار`,
      reference: walletTransaction._id.toString(), // Link to wallet transaction
      isDebit: false // Credit points
    });
    
    await pointsTransaction.save();
    
    // Record user action for purchasing points
    await UserAction.create({
      userId: user._id,
      actionType: 'points_purchase', 
      details: {
        action: 'purchase_points_wallet', // Clarify source
        description: `تم شراء ${pointsAmount} نقطة بقيمة ${amount} دولار من المحفظة`, // وصف واضح
        amountPaid: Number(amount),
        pointsReceived: Number(pointsAmount)
      },
      module: 'wallet' // Or 'points' module
    });
    
    res.json({
      message: 'تم شراء النقاط بنجاح',
      pointsAmount: Number(pointsAmount),
      newPoints: user.points,
      walletBalance: user.walletBalance
    });
  } catch (error) {
    console.error('Error purchasing points:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'حدث خطأ أثناء شراء النقاط');
  }
});

module.exports = {
  getWalletBalance,
  depositToWallet,
  confirmDeposit,
  subscribeUsingWallet,
  getWalletTransactions,
  purchasePoints
};
