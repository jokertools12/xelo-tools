const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const UserAction = require('../models/UserAction');

// @desc    Get all users (admin only)
// @route   GET /api/admin/users
// @access  Admin
const getAllUsers = asyncHandler(async (req, res) => {
  try {
    // Ensure the requesting user is an admin
    if (req.user.role !== 'admin') {
      res.status(403);
      throw new Error('غير مصرح لك بالوصول إلى هذه البيانات');
    }

    // Check if search parameter is provided
    const { search } = req.query;
    
    // Create query condition based on search parameters
    const queryCondition = {};
    
    if (search) {
      // Create a regex search pattern that's case insensitive
      const searchPattern = new RegExp(search, 'i');
      
      // Search in multiple fields
      queryCondition.$or = [
        { name: searchPattern },
        { username: searchPattern },
        { email: searchPattern }
      ];
    }

    // Get users with search filter if provided
    const users = await User.find(queryCondition).select('-password');
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'حدث خطأ أثناء جلب بيانات المستخدمين');
  }
});

// @desc    Add points to a user (admin only)
// @route   POST /api/admin/add-points
// @access  Admin
const addPointsToUser = asyncHandler(async (req, res) => {
  const { userId, points, operation } = req.body;
  
  // Validate input
  if (!userId || points === undefined) {
    res.status(400);
    throw new Error('يرجى تقديم معرف المستخدم وعدد النقاط');
  }

  try {
    // Ensure the requesting user is an admin
    if (req.user.role !== 'admin') {
      res.status(403);
      throw new Error('غير مصرح لك بإضافة نقاط');
    }

    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      res.status(404);
      throw new Error('المستخدم غير موجود');
    }
    
    // Add points
    user.points += points;
    user.allPoints += points;
    
    // Update user level based on allPoints
    const pointsPerLevel = 25000;
    user.level = Math.floor(user.allPoints / pointsPerLevel) + 1;
    
    // Record the transaction
    const transaction = new Transaction({
      userId: user._id,
      type: 'admin',
      amount: points,
      status: 'completed',
      description: `إضافة نقاط بواسطة المشرف: ${operation || 'عملية غير محددة'}`
    });
    
    // Record user action
    const userAction = new UserAction({
      userId: user._id,
      actionType: 'other',
      details: {
        points,
        operation,
        adminId: req.user._id
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
      allPoints: user.allPoints,
      level: user.level,
      message: 'تم إضافة النقاط بنجاح'
    });
  } catch (error) {
    console.error('Error adding points:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'حدث خطأ أثناء إضافة النقاط');
  }
});

// @desc    Update user (admin only)
// @route   PUT /api/admin/users/:id
// @access  Admin
const updateUser = asyncHandler(async (req, res) => {
  try {
    // Ensure the requesting user is an admin
    if (req.user.role !== 'admin') {
      res.status(403);
      throw new Error('غير مصرح لك بتعديل بيانات المستخدمين');
    }

    const userId = req.params.id;
    const { name, email, username, role, isActive } = req.body;

    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      res.status(404);
      throw new Error('المستخدم غير موجود');
    }

    // Update user fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (username) user.username = username;
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    // Save changes
    await user.save();
    
    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        isActive: user.isActive
      },
      message: 'تم تحديث بيانات المستخدم بنجاح'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'حدث خطأ أثناء تحديث بيانات المستخدم');
  }
});

// @desc    Create new user (admin only)
// @route   POST /api/admin/users
// @access  Admin
const createUser = asyncHandler(async (req, res) => {
  try {
    // Ensure the requesting user is an admin
    if (req.user.role !== 'admin') {
      res.status(403);
      throw new Error('غير مصرح لك بإنشاء مستخدمين جدد');
    }

    const { name, email, username, password, role, isActive } = req.body;

    // Validate required fields
    if (!name || !email || !username || !password) {
      res.status(400);
      throw new Error('جميع الحقول مطلوبة');
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
      email,
      username,
      password,
      role: role || 'user',
      isActive: isActive !== undefined ? isActive : true,
      points: 0,
      allPoints: 0,
      level: 1,
      createdAt: new Date(),
      lastLogin: null
    });

    if (user) {
      // Record user action
      await UserAction.create({
        userId: user._id,
        actionType: 'account_add',
        details: {
          action: 'create',
          adminId: req.user._id
        },
        module: 'users'
      });

      res.status(201).json({
        success: true,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          username: user.username,
          role: user.role,
          isActive: user.isActive,
          points: user.points,
          allPoints: user.allPoints,
          level: user.level,
          createdAt: user.createdAt
        },
        message: 'تم إنشاء المستخدم بنجاح'
      });
    } else {
      res.status(400);
      throw new Error('بيانات المستخدم غير صالحة');
    }
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'حدث خطأ أثناء إنشاء المستخدم');
  }
});

// @desc    Reset user password (admin only)
// @route   POST /api/admin/reset-password/:id
// @access  Admin
const resetPassword = asyncHandler(async (req, res) => {
  try {
    // Ensure the requesting user is an admin
    if (req.user.role !== 'admin') {
      res.status(403);
      throw new Error('غير مصرح لك بإعادة تعيين كلمة المرور');
    }

    const userId = req.params.id;
    const { newPassword } = req.body;

    // Validate input
    if (!newPassword) {
      res.status(400);
      throw new Error('كلمة المرور الجديدة مطلوبة');
    }

    if (newPassword.length < 6) {
      res.status(400);
      throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      res.status(404);
      throw new Error('المستخدم غير موجود');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Record user action for audit
    await UserAction.create({
      userId: user._id,
      actionType: 'other',
      details: {
        action: 'password_reset',
        adminId: req.user._id
      },
      module: 'users'
    });

    res.json({
      success: true,
      message: 'تم إعادة تعيين كلمة المرور بنجاح'
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'حدث خطأ أثناء إعادة تعيين كلمة المرور');
  }
});

// @desc    Delete user (admin only)
// @route   DELETE /api/admin/users/:id
// @access  Admin
const deleteUser = asyncHandler(async (req, res) => {
  try {
    // Ensure the requesting user is an admin
    if (req.user.role !== 'admin') {
      res.status(403);
      throw new Error('غير مصرح لك بحذف المستخدمين');
    }

    const userId = req.params.id;

    // Find user first to verify existence
    const user = await User.findById(userId);
    if (!user) {
      res.status(404);
      throw new Error('المستخدم غير موجود');
    }

    // Delete the user
    await User.findByIdAndDelete(userId);

    // Record admin action for audit trail
    await UserAction.create({
      userId: req.user._id,
      actionType: 'other',
      details: {
        action: 'user_deleted',
        deletedUserId: userId,
        deletedUsername: user.username
      },
      module: 'users'
    });

    res.json({
      success: true,
      message: 'تم حذف المستخدم بنجاح'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'حدث خطأ أثناء حذف المستخدم');
  }
});

// @desc    Get user activities (admin only)
// @route   GET /api/admin/user-activities/:userId
// @access  Admin
const getUserActivities = asyncHandler(async (req, res) => {
  try {
    // Ensure the requesting user is an admin
    if (req.user.role !== 'admin') {
      res.status(403);
      throw new Error('غير مصرح لك بالوصول إلى هذه البيانات');
    }

    const userId = req.params.userId;
    
    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400);
      throw new Error('معرف المستخدم غير صالح');
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      res.status(404);
      throw new Error('المستخدم غير موجود');
    }
    
    // Get activities for this user
    const activities = await UserAction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);
    
    // If no activities found, return empty array instead of 404
    if (!activities || activities.length === 0) {
      return res.json([]);
    }
    
    // Format activities
    const formattedActivities = activities.map(activity => ({
      id: activity._id,
      title: activity.details?.title || mapActionTypeToTitle(activity.actionType),
      description: activity.details?.description || '',
      date: activity.createdAt,
      type: activity.actionType
    }));
    
    res.json(formattedActivities);
  } catch (error) {
    console.error('Error fetching user activities:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'حدث خطأ أثناء جلب أنشطة المستخدم');
  }
});

// @desc    Get user points history (admin only)
// @route   GET /api/admin/points-history/:userId
// @access  Admin
const getUserPointsHistory = asyncHandler(async (req, res) => {
  try {
    // Ensure the requesting user is an admin
    if (req.user.role !== 'admin') {
      res.status(403);
      throw new Error('غير مصرح لك بالوصول إلى هذه البيانات');
    }

    const userId = req.params.userId;
    
    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400);
      throw new Error('معرف المستخدم غير صالح');
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      res.status(404);
      throw new Error('المستخدم غير موجود');
    }
    
    // Get transactions for this user
    const transactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);
    
    // If no transactions found, return empty array instead of 404
    if (!transactions || transactions.length === 0) {
      return res.json([]);
    }
    
    // Format transactions
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction._id,
      date: transaction.createdAt,
      type: transaction.type,
      amount: transaction.amount,
      status: transaction.status,
      description: transaction.description || ''
    }));
    
    res.json(formattedTransactions);
  } catch (error) {
    console.error('Error fetching user points history:', error);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'حدث خطأ أثناء جلب سجل نقاط المستخدم');
  }
});

// Helper function to map action types to titles
const mapActionTypeToTitle = (actionType) => {
  const titles = {
    'login': 'تسجيل دخول',
    'profile': 'تحديث الملف الشخصي',
    'security': 'تحديث إعدادات الأمان',
    'points': 'تحديث النقاط',
    'extraction': 'استخراج بيانات',
    'comment': 'استخراج تعليقات',
    'reaction': 'استخراج تفاعلات',
    'post': 'استخراج منشورات',
    'settings': 'تحديث الإعدادات',
    'account_add': 'إضافة حساب',
    'other': 'نشاط آخر'
  };
  
  return titles[actionType] || 'نشاط غير معروف';
};

module.exports = {
  getAllUsers,
  addPointsToUser,
  updateUser,
  createUser,
  resetPassword,
  deleteUser,
  getUserActivities,
  getUserPointsHistory
};