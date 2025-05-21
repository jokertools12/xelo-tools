const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// نموذج مؤقت للمستخدمين (في التطبيق الحقيقي ستستخدم قاعدة بيانات)
let users = [];

// مسار تسجيل مستخدم جديد
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // التحقق من وجود المستخدم
    const userExists = users.find(user => user.email === email);
    if (userExists) {
      return res.status(400).json({ message: 'المستخدم موجود بالفعل' });
    }

    // تشفير كلمة المرور
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // إنشاء مستخدم جديد
    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      password: hashedPassword,
    };

    users.push(newUser);

    // إنشاء توكن
    const token = jwt.sign(
      { id: newUser.id, name: newUser.name, email: newUser.email },
      'jwt_secret_key',
      { expiresIn: '30d' }
    );

    res.status(201).json({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      token
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

// مسار تسجيل الدخول
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // البحث عن المستخدم
    const user = users.find(user => user.email === email);
    if (!user) {
      return res.status(401).json({ message: 'بيانات الاعتماد غير صحيحة' });
    }

    // التحقق من كلمة المرور
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'بيانات الاعتماد غير صحيحة' });
    }

    // إنشاء توكن
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      'jwt_secret_key',
      { expiresIn: '30d' }
    );

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      token
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'خطأ في الخادم' });
  }
});

module.exports = router;