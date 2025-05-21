/**
 * Script to seed default membership plans into the database
 * Run with: node backend/scripts/seedMembershipPlans.js
 */

// Load environment variables
require('dotenv').config();

const mongoose = require('mongoose');
const MembershipPlan = require('../models/MembershipPlan');

// MongoDB connection string
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('MongoDB URI is not defined in environment variables');
  console.error('Please make sure your .env file contains a MONGO_URI variable');
  process.exit(1);
}

// Connect to database
mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('MongoDB Connected...'))
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });

// Default membership plans (prices in USD)
const defaultPlans = [
  {
    name: 'خطة شهرية',
    description: 'اشتراك شهري مع إمكانية الوصول إلى جميع الميزات - السعر بالدولار الأمريكي',
    price: 5, // USD (previously 99 EGP)
    duration: 30, // days
    points: 500, // Points awarded for monthly subscription
    features: [
      'الوصول إلى أداة استخراج التعليقات',
      'الوصول إلى أداة استخراج التفاعلات',
      'الوصول إلى أداة استخراج المجموعات',
      'الوصول إلى أدوات إدارة الصفحات',
      'الوصول إلى أدوات النشر التلقائي'
    ],
    isActive: true
  },
  {
    name: 'خطة ربع سنوية',
    description: 'اشتراك لمدة 3 أشهر بخصم 20% - السعر بالدولار الأمريكي',
    price: 12, // USD (previously 249 EGP)
    duration: 90, // days
    points: 1500, // Points awarded for quarterly subscription
    features: [
      'الوصول إلى أداة استخراج التعليقات',
      'الوصول إلى أداة استخراج التفاعلات',
      'الوصول إلى أداة استخراج المجموعات',
      'الوصول إلى أدوات إدارة الصفحات',
      'الوصول إلى أدوات النشر التلقائي',
      'أولوية في الدعم الفني'
    ],
    isActive: true
  },
  {
    name: 'خطة سنوية',
    description: 'اشتراك لمدة سنة بخصم 33% - السعر بالدولار الأمريكي',
    price: 40, // USD (previously 899 EGP)
    duration: 365, // days
    points: 5000, // Points awarded for yearly subscription
    features: [
      'الوصول إلى أداة استخراج التعليقات',
      'الوصول إلى أداة استخراج التفاعلات',
      'الوصول إلى أداة استخراج المجموعات',
      'الوصول إلى أدوات إدارة الصفحات',
      'الوصول إلى أدوات النشر التلقائي',
      'أولوية قصوى في الدعم الفني',
      'تدريب مجاني على استخدام الأدوات',
      'تحديثات حصرية'
    ],
    isActive: true
  }
];

// Function to seed plans
const seedPlans = async () => {
  try {
    // Check if plans already exist
    const count = await MembershipPlan.countDocuments();
    
    if (count > 0) {
      console.log(`${count} membership plans already exist. Do you want to add more plans? (y/n)`);
      // In an interactive environment, you would wait for user input here
      // For simplicity in this script, we'll just log and proceed
      console.log('Proceeding with adding new plans...');
    }
    
    // Insert plans
    const result = await MembershipPlan.insertMany(defaultPlans);
    console.log(`Successfully seeded ${result.length} membership plans`);
    
    mongoose.disconnect();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error seeding membership plans:', error);
    mongoose.disconnect();
    process.exit(1);
  }
};

// Run the seeding function
seedPlans();