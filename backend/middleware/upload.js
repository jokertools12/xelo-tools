// إنشاء وسيط رفع الملفات

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// إنشاء المجلدات اللازمة إذا لم تكن موجودة
const createDirIfNotExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`تم إنشاء المجلد: ${dir}`);
  }
};

// تصحيح مسار حفظ الصور

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // تعديل المسار ليكون داخل مجلد server مباشرة
    const uploadDir = path.join(__dirname, '../uploads/avatars');
    createDirIfNotExists(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const fileExt = path.extname(file.originalname);
    cb(null, `avatar-${uniqueSuffix}${fileExt}`);
  }
});

// فلتر للتحقق من أنواع الملفات
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('نوع الملف غير مدعوم. يرجى استخدام ملفات JPEG أو PNG أو GIF'), false);
  }
};

// تكوين Multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2 ميجابايت
  }
});

module.exports = { upload };