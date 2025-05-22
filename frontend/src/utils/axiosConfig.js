// التأكد من أن الإعدادات الافتراضية صحيحة

import axios from 'axios';

// تحديد baseURL للتأكد من أنه يشير إلى الخادم الصحيح
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// إعداد الطلبات
axios.interceptors.request.use(
  (config) => {
    // إضافة التوكن للطلبات إذا كان المستخدم مسجل دخول
    const userInfoString = localStorage.getItem('userInfo');
    if (userInfoString) {
      try {
        const userInfo = JSON.parse(userInfoString);
        if (userInfo && userInfo.token) {
          config.headers.Authorization = `Bearer ${userInfo.token}`;
        }
      } catch (error) {
        console.error('Error parsing user info:', error);
        // إزالة userInfo غير الصالح
        localStorage.removeItem('userInfo');
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// إعداد الاستجابات
axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // تصفية الأخطاء المتوقعة ومعالجتها بشكل مناسب
    
    // خطأ 401 (غير مصرح) - تسجيل خروج
    if (error.response && error.response.status === 401) {
      const authError = new CustomEvent('auth-error', { detail: error.response.data });
      window.dispatchEvent(authError);
      
      localStorage.removeItem('userInfo');
      
      setTimeout(() => {
        window.location.href = '/login';
      }, 800);
      
      return Promise.reject(error);
    }
    
    // سجل الأخطاء فقط إذا لم تكن أخطاء متوقعة
    if (
      // لا تسجل أخطاء التحقق من الصحة المتوقعة (400) أثناء التسجيل
      !(error.response?.status === 400 && error.config.url?.includes('/api/users/register'))
    ) {
      // يمكنك إضافة المزيد من شروط التصفية هنا لأي مسارات أخرى تتوقع أن تعيد رمز خطأ 400
      console.error('API Error Response:', error);
    }
    
    // استمر في رفض الوعد لمعالجة الخطأ في المكون نفسه
    return Promise.reject(error);
  }
);

export default axios;