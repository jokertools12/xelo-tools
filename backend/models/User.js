const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true
    },
    email: {
      type: String,
      required: true,
      unique: true
    },
    password: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    avatar: {
      type: String,
      default: '/public/default-avatar.png'
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    // حقول إضافية للمعلومات الشخصية
    phone: {
      type: String,
      default: ''
    },
    address: {
      type: String,
      default: ''
    },
    bio: {
      type: String,
      default: ''
    },
    // إعدادات اللغة
    preferredLanguage: {
      type: String,
      default: 'ar'
    },
    // حقول المحفظة والنقاط
    walletBalance: {
      type: Number,
      default: 0
    },
    points: {
      type: Number,
      default: 0
    },
    allPoints: {
      type: Number,
      default: 0
    },
    level: {
      type: Number,
      default: 1
    },
    managedAccounts: {
      type: Number,
      default: 0
    },
    // حقول فيسبوك
    fbUsername: {
      type: String
    },
    accessToken: {
      type: String
    },
    fbName: {
      type: String
    },
    // حقول إعادة تعيين كلمة المرور
    resetPasswordToken: {
      type: String
    },
    resetPasswordExpires: {
      type: Date
    },
    // حقول العضوية
    hasMembership: {
      type: Boolean,
      default: false
    },
    membershipType: {
      type: String,
      enum: ['free', 'premium', 'pro'],
      default: 'free'
    },
    currentSubscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription'
    },
    membershipExpires: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// إضافة دالة مطابقة كلمة المرور
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// إضافة hook لتشفير كلمة المرور
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model('User', userSchema);

module.exports = User;