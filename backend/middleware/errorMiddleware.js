// وسيط لمعالجة المسارات غير الموجودة
const notFound = (req, res, next) => {
  // تجاهل طلبات favicon.ico
  if (req.originalUrl === '/favicon.ico') {
    return res.status(204).end();
  }
  
  // تجاهل طلبات webpack hot-update
  if (req.url.includes('hot-update')) {
    return res.status(200).end();
  }
  
  // السماح لمسار الجذر بالوصول إلى محتوى React
  if (req.originalUrl === '/') {
    // في بيئة التطوير: فحص إذا كان المستخدم يحاول الوصول مباشرة إلى الخادم الخلفي
    if (process.env.NODE_ENV !== 'production') {
      return res.status(200).send('API قيد التشغيل. في بيئة التطوير، استخدم خادم React للواجهة الأمامية.');
    }
  }
  
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// تحسين معالج الأخطاء ليسجل المزيد من التفاصيل
const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  // تجاهل طلبات favicon.ico و webpack عند تسجيل الأخطاء
  if (!req.url.includes('hot-update') && req.originalUrl !== '/favicon.ico') {
    // تسجيل معلومات الخطأ الأساسية بدون بيانات حساسة
    if (req.originalUrl.includes('/api/users/login') && statusCode === 401) {
      // مجرد تسجيل أن هناك محاولة تسجيل دخول فاشلة دون تفاصيل
      console.log('محاولة تسجيل دخول فاشلة');
    } else {
      // تسجيل معلومات الخطأ الأساسية للأخطاء الأخرى (بدون stack trace)
      console.log('Error:', {
        message: err.message,
        path: req.originalUrl,
        method: req.method,
        statusCode,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
  });
};

module.exports = { notFound, errorHandler };