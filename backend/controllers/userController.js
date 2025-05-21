const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const AccessToken = require('../models/AccessToken');
const Transaction = require('../models/Transaction');
const UserAction = require('../models/UserAction');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, username, email, password } = req.body;

  if (!name || !username || !email || !password) {
    res.status(400);
    throw new Error('الرجاء إدخال جميع الحقول');
  }
  
  // Check if email exists
  const emailExists = await User.findOne({ email });
  if (emailExists) {
    res.status(400);
    throw new Error('البريد الإلكتروني مستخدم بالفعل');
  }
  
  // Check if username exists
  const usernameExists = await User.findOne({ username });
  if (usernameExists) {
    res.status(400);
    throw new Error('اسم المستخدم مستخدم بالفعل');
  }

  // Create user
  const user = await User.create({
    name,
    username,
    email,
    password,
    walletBalance: 0, // Initialize wallet balance
    points: 0,
    allPoints: 0
  });
  
  // Create user action record
  await UserAction.create({
    userId: user._id,
    actionType: 'account_add',
    details: {
      email,
      username,
      name
    },
    module: 'auth'
  });

  if (user) {
    // Initialize achievements for new user
    try {
      const achievementService = req.app.get('achievementService');
      if (achievementService) {
        await achievementService.initializeUserAchievements(user._id);
      }
    } catch (achievementError) {
      console.error('Error initializing achievements for new user:', achievementError);
      // Continue despite achievement initialization error
    }
    
    // Return user data
    res.status(201).json({
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role === 'admin' ? 'admin' : 'user',
      isAdmin: user.role === 'admin',
      preferredLanguage: user.preferredLanguage,
      points: user.points,
      allPoints: user.allPoints,
      level: user.level,
      hasMembership: user.hasMembership,
      membershipType: user.membershipType,
      avatar: user.avatar,
      walletBalance: user.walletBalance || 0,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error('بيانات المستخدم غير صالحة');
  }
});

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  // Accept both email and loginIdentifier from request
  const { email, loginIdentifier, password } = req.body;
  
  // Use loginIdentifier if provided, fall back to email
  const userIdentifier = loginIdentifier || email;
  
  // Find the user by any possible method
  let user = null;
  
  try {
    // Try different ways to find the user
    if (userIdentifier) {
      // First try direct email match
      user = await User.findOne({ email: userIdentifier });
      
      // Try username match if email failed
      if (!user) {
        user = await User.findOne({ username: userIdentifier });
      }
      
      // Try case insensitive email match
      if (!user) {
        user = await User.findOne({ 
          email: new RegExp(`^${userIdentifier}$`, 'i') 
        });
      }
      
      // Try with regex for partial match
      if (!user) {
        user = await User.findOne({ 
          $or: [
            { email: { $regex: userIdentifier, $options: 'i' } },
            { username: { $regex: userIdentifier, $options: 'i' } }
          ]
        });
      }
    }
  } catch (error) {
    // Log errors silently without exposing information
    console.error('Error during authentication');
  }
  
  if (!user) {
    res.status(404);
    throw new Error('المستخدم غير موجود');
  }
  
  // Check if user is active
  if (!user.isActive) {
    res.status(403);
    throw new Error('تم تعطيل هذا الحساب، يرجى التواصل مع الإدارة');
  }

  if (user && (await user.matchPassword(password))) {
    // Create user action record
    await UserAction.create({
      userId: user._id,
      actionType: 'login',
      details: {
        email,
        success: true
      },
      module: 'auth'
    });
    
    res.json({
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role === 'admin' ? 'admin' : 'user',
      isAdmin: user.role === 'admin',
      preferredLanguage: user.preferredLanguage,
      points: user.points,
      allPoints: user.allPoints,
      level: user.level,
      hasMembership: user.hasMembership,
      membershipType: user.membershipType,
      avatar: user.avatar,
      walletBalance: user.walletBalance || 0,
      token: generateToken(user._id),
      lastLogin: new Date(),
    });
  } else {
    res.status(401);
    throw new Error('كلمة المرور غير صحيحة');
  }
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');

  if (user) {
    // Ensure walletBalance is set
    if (user.walletBalance === undefined) {
      user.walletBalance = 0;
      await user.save();
    }
    
    res.json({
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role === 'admin' ? 'admin' : 'user',
      isAdmin: user.role === 'admin',
      phone: user.phone,
      address: user.address,
      bio: user.bio,
      preferredLanguage: user.preferredLanguage,
      points: user.points,
      allPoints: user.allPoints,
      level: user.level,
      hasMembership: user.hasMembership,
      membershipType: user.membershipType,
      avatar: user.avatar,
      walletBalance: user.walletBalance || 0,
      membershipExpires: user.membershipExpires,
      fbUsername: user.fbUsername,
      accessToken: user.accessToken
    });
  } else {
    res.status(404);
    throw new Error('المستخدم غير موجود');
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('المستخدم غير موجود');
  }

  // Extract fields to update
  const { name, username, email, password, currentPassword, phone, address, bio, preferredLanguage } = req.body;

  // Check if email exists and is different from current user's email
  if (email && email !== user.email) {
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      res.status(400);
      throw new Error('البريد الإلكتروني مستخدم بالفعل');
    }
  }
  
  // Check if username exists and is different from current user's username
  if (username && username !== user.username) {
    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      res.status(400);
      throw new Error('اسم المستخدم مستخدم بالفعل');
    }
  }

  // If password is being updated, check if current password is correct
  if (password) {
    if (!currentPassword) {
      res.status(400);
      throw new Error('يرجى إدخال كلمة المرور الحالية');
    }
    
    if (!(await user.matchPassword(currentPassword))) {
      res.status(401);
      throw new Error('كلمة المرور الحالية غير صحيحة');
    }
  }

  // Update fields if provided
  user.name = name || user.name;
  user.username = username || user.username;
  user.email = email || user.email;
  user.phone = phone !== undefined ? phone : user.phone;
  user.address = address !== undefined ? address : user.address;
  user.bio = bio !== undefined ? bio : user.bio;
  user.preferredLanguage = preferredLanguage || user.preferredLanguage;
  
  // Ensure walletBalance exists
  if (user.walletBalance === undefined) {
    user.walletBalance = 0;
  }
  
  // If password is being updated, set it
  if (password) {
    user.password = password;
  }

  // Create user action record for profile update
  await UserAction.create({
    userId: user._id,
    actionType: 'profile',
    details: {
      action: 'update_profile',
      username: username || user.username,
      changedPassword: !!password
    },
    module: 'profile'
  });

  // Save the user
  const updatedUser = await user.save();

  res.json({
    _id: updatedUser._id,
    name: updatedUser.name,
    username: updatedUser.username,
    email: updatedUser.email,
    role: updatedUser.role === 'admin' ? 'admin' : 'user',
    isAdmin: updatedUser.role === 'admin',
    phone: updatedUser.phone,
    address: updatedUser.address,
    bio: updatedUser.bio,
    preferredLanguage: updatedUser.preferredLanguage,
    points: updatedUser.points,
    allPoints: updatedUser.allPoints,
    level: updatedUser.level,
    hasMembership: updatedUser.hasMembership,
    membershipType: updatedUser.membershipType,
    avatar: updatedUser.avatar,
    walletBalance: updatedUser.walletBalance || 0
  });
});

// @desc    Update user password
// @route   PUT /api/users/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error('يرجى إدخال كلمة المرور الحالية والجديدة');
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('المستخدم غير موجود');
  }

  // Check if current password matches
  if (!(await user.matchPassword(currentPassword))) {
    res.status(401);
    throw new Error('كلمة المرور الحالية غير صحيحة');
  }

  // Update password
  user.password = newPassword;
  await user.save();

  // Create user action record
  await UserAction.create({
    userId: user._id,
    actionType: 'security',
    details: {
      action: 'change_password',
      timestamp: new Date()
    },
    module: 'auth'
  });

  res.json({
    message: 'تم تغيير كلمة المرور بنجاح'
  });
});

// @desc    Forgot password
// @route   POST /api/users/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error('يرجى إدخال البريد الإلكتروني');
  }

  // Find user by email
  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error('لم يتم العثور على مستخدم بهذا البريد الإلكتروني');
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(20).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes

  await user.save();

  // In a production environment, send email with reset link
  // For demo, just return the token
  const resetURL = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;

  // Create user action record
  await UserAction.create({
    userId: user._id,
    actionType: 'security',
    details: {
      action: 'forgot_password',
      resetUrl: resetURL
    },
    module: 'auth'
  });

  res.json({
    message: 'تم إرسال رابط إعادة تعيين كلمة المرور',
    // Don't include this in production, just for demo
    resetURL
  });
});

// @desc    Reset password
// @route   POST /api/users/reset-password/:token
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const resetToken = req.params.token;

  if (!password) {
    res.status(400);
    throw new Error('يرجى إدخال كلمة المرور الجديدة');
  }

  // Hash the token from params
  const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  // Find user with this token and check if token is still valid
  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    res.status(400);
    throw new Error('رمز إعادة تعيين كلمة المرور غير صالح أو منتهي الصلاحية');
  }

  // Set new password
  user.password = password;
  // Clear reset token fields
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  await user.save();

  // Create user action record
  await UserAction.create({
    userId: user._id,
    actionType: 'security',
    details: {
      action: 'reset_password',
      timestamp: new Date()
    },
    module: 'auth'
  });

  res.json({
    message: 'تم إعادة تعيين كلمة المرور بنجاح',
    email: user.email
  });
});

// @desc    Upload user avatar
// @route   POST /api/users/upload-avatar
// @access  Private
const uploadAvatar = asyncHandler(async (req, res) => {
  // Check if file was uploaded
  if (!req.file) {
    res.status(400);
    throw new Error('الرجاء تحميل صورة');
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('المستخدم غير موجود');
  }

  // Delete previous avatar if it exists and is not the default
  if (user.avatar && !user.avatar.includes('default-avatar') && !user.avatar.includes('fallback-avatar')) {
    try {
      // Extract the filename from the avatar URL
      const avatarPath = path.join('uploads', 'avatars', path.basename(user.avatar));
      
      // Check if file exists before trying to delete
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    } catch (error) {
      console.error('Error deleting old avatar:', error);
      // Continue with the upload even if old file deletion fails
    }
  }

  // Set avatar URL for user
  user.avatar = `/uploads/avatars/${req.file.filename}`;
  await user.save();

  // Create user action record
  await UserAction.create({
    userId: user._id,
    actionType: 'avatar',
    details: {
      action: 'upload',
      avatarUrl: user.avatar
    },
    module: 'profile'
  });

  res.json({
    message: 'تم تحميل الصورة بنجاح',
    avatar: user.avatar
  });
});

// @desc    Save access token
// @route   POST /api/users/save-access-token
// @access  Private
const saveAccessToken = asyncHandler(async (req, res) => {
  const { accessToken, fbName } = req.body;

  if (!accessToken) {
    res.status(400);
    throw new Error('الرجاء إدخال رمز الوصول');
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('المستخدم غير موجود');
  }

  // Check if token already exists for this user
  const existingToken = await AccessToken.findOne({
    userId: user._id,
    accessToken: accessToken
  });

  if (existingToken) {
    // If token exists but has a different name, update it
    if (fbName && existingToken.fbName !== fbName) {
      existingToken.fbName = fbName;
      await existingToken.save();
      
      return res.json({
        message: 'تم تحديث اسم رمز الوصول بنجاح',
        token: existingToken
      });
    }
    
    res.status(400);
    throw new Error('رمز الوصول هذا مسجل بالفعل');
  }

  // Create new token
  const newToken = new AccessToken({
    userId: user._id,
    accessToken: accessToken,
    fbName: fbName || `رمز وصول ${new Date().toLocaleDateString('ar-EG')}`
  });

  await newToken.save();

  // Create user action record
  await UserAction.create({
    userId: user._id,
    actionType: 'security',
    details: {
      action: 'save_access_token',
      tokenId: newToken._id
    },
    module: 'tokens'
  });

  res.status(201).json({
    message: 'تم حفظ رمز الوصول بنجاح',
    token: newToken
  });
});

// @desc    Get user access tokens
// @route   GET /api/users/access-tokens
// @access  Private
const getUserAccessTokens = asyncHandler(async (req, res) => {
  const tokens = await AccessToken.find({ userId: req.user._id }).sort('-createdAt');

  res.json(tokens);
});

// @desc    Delete access token
// @route   DELETE /api/users/access-tokens/:id
// @access  Private
const deleteAccessToken = asyncHandler(async (req, res) => {
  const token = await AccessToken.findById(req.params.id);

  if (!token) {
    res.status(404);
    throw new Error('رمز الوصول غير موجود');
  }

  // Ensure token belongs to the logged-in user
  if (token.userId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('غير مصرح لك بحذف هذا الرمز');
  }

  // Use deleteOne() instead of remove() which is deprecated
  await AccessToken.deleteOne({ _id: token._id });

  // Create user action record
  await UserAction.create({
    userId: req.user._id,
    actionType: 'security',
    details: {
      action: 'delete_access_token',
      tokenId: req.params.id
    },
    module: 'tokens'
  });

  res.json({
    message: 'تم حذف رمز الوصول بنجاح'
  });
});

// @desc    Set access token as active
// @route   PATCH /api/users/access-tokens/:id/set-active
// @access  Private
const setAccessTokenActive = asyncHandler(async (req, res) => {
  const token = await AccessToken.findById(req.params.id);

  if (!token) {
    res.status(404);
    throw new Error('رمز الوصول غير موجود');
  }

  // Ensure token belongs to the logged-in user
  if (token.userId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('غير مصرح لك بتعديل هذا الرمز');
  }

  // Reset active status for all user tokens
  await AccessToken.updateMany(
    { userId: req.user._id },
    { $set: { isActive: false } }
  );

  // Set this token as active
  token.isActive = true;
  await token.save();

  // Update user's access token
  const user = await User.findById(req.user._id);
  user.accessToken = token.accessToken;
  
  // Set Facebook details from token if available
  if (token.fbUsername) {
    user.fbUsername = token.fbUsername;
    user.fbName = token.fbName;
  }
  
  await user.save();

  // Create user action record
  await UserAction.create({
    userId: req.user._id,
    actionType: 'security',
    details: {
      action: 'set_active_token',
      tokenId: req.params.id,
      tokenName: token.name
    },
    module: 'tokens'
  });

  res.json({
    message: 'تم تعيين رمز الوصول كنشط بنجاح',
    accessToken: token
  });
});

// @desc    Update user stats (FB handles, managed accounts)
// @route   PUT /api/users/stats
// @access  Private
const updateUserStats = asyncHandler(async (req, res) => {
  const { 
    fbUsername, 
    fbName, 
    managedAccounts 
  } = req.body;

  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('المستخدم غير موجود');
  }

  // Update fields if provided
  if (fbUsername !== undefined) user.fbUsername = fbUsername;
  if (fbName !== undefined) user.fbName = fbName;
  if (managedAccounts !== undefined) user.managedAccounts = managedAccounts;

  await user.save();

  // Create user action record
  await UserAction.create({
    userId: user._id,
    actionType: 'profile',
    details: {
      action: 'update_stats',
      fbUsername,
      fbName,
      managedAccounts
    },
    module: 'profile'
  });

  res.json({
    message: 'تم تحديث إحصائيات المستخدم بنجاح',
    stats: {
      fbUsername: user.fbUsername,
      fbName: user.fbName,
      managedAccounts: user.managedAccounts
    }
  });
});

// @desc    Get user transactions
// @route   GET /api/users/transactions
// @access  Private
const getUserTransactions = asyncHandler(async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100); // Limit to last 100 transactions
    
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching user transactions:', error);
    res.status(500);
    throw new Error('حدث خطأ أثناء جلب سجل المعاملات');
  }
});

// @desc    Get basic info for multiple users by IDs
// @route   POST /api/users/basic-info
// @access  Private
const getUsersBasicInfo = asyncHandler(async (req, res) => {
  const { userIds } = req.body;
  
  if (!userIds || !Array.isArray(userIds)) {
    res.status(400);
    throw new Error('يرجى تقديم قائمة معرفات المستخدمين');
  }
  
  try {
    const users = await User.find({
      _id: { $in: userIds }
    }).select('_id name username avatar');
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users basic info:', error);
    res.status(500);
    throw new Error('حدث خطأ أثناء جلب معلومات المستخدمين');
  }
});

// @desc    Get dashboard data
// @route   GET /api/dashboard
// @access  Private
const getDashboardData = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get user data
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      res.status(404);
      throw new Error('المستخدم غير موجود');
    }
    
    // Ensure walletBalance exists
    if (user.walletBalance === undefined) {
      user.walletBalance = 0;
      await user.save();
    }
    
    // Get recent transactions
    const recentTransactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5);
    
    // Get active subscription
    const activeSubscription = await Subscription.findOne({
      userId,
      status: 'active'
    }).populate('planId');
    
    // Check membership status
    const hasMembership = !!activeSubscription;
    
    // Get pending payments
    const pendingPayments = await Payment.find({
      userId,
      status: 'pending'
    }).sort({ createdAt: -1 });
    
    // Get user's access tokens
    const accessTokens = await AccessToken.find({ userId })
      .sort('-createdAt')
      .select('name isActive createdAt');
    
    res.json({
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role === 'admin' ? 'admin' : 'user',
        isAdmin: user.role === 'admin',
        points: user.points,
        allPoints: user.allPoints,
        level: user.level,
        walletBalance: user.walletBalance || 0,
        hasMembership: user.hasMembership,
        membershipType: user.membershipType,
        membershipExpires: user.membershipExpires
      },
      stats: {
        userPoints: user.points || 0,
        userAllPoints: user.allPoints || 0,
        userLevel: user.level || 1
      },
      recentTransactions,
      subscription: activeSubscription,
      pendingPayments,
      accessTokens
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500);
    throw new Error('حدث خطأ أثناء جلب بيانات لوحة التحكم');
  }
});

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  uploadAvatar,
  saveAccessToken,
  getUserAccessTokens,
  deleteAccessToken,
  setAccessTokenActive,
  updateUserStats,
  getUserTransactions,
  getUsersBasicInfo,
  getDashboardData
};