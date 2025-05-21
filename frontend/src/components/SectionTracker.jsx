import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { useUser } from '../context/UserContext';

// أكسيوس مخصص للتتبع مع مُعترض للمصادقة
const trackingAxios = axios.create();

/**
 * مكون SectionTracker
 * يستخدم لتتبع زيارات الأقسام المختلفة تلقائيًا وتسجيلها في النظام
 * من أجل إنجاز المستكشف
 */
const SectionTracker = () => {
  const location = useLocation();
  const [lastTrackedPath, setLastTrackedPath] = useState('');
  const [errorCount, setErrorCount] = useState(0);
  const { user } = useUser();
  const interceptorRef = useRef(null);
  
  // درازة المستخدم للتحقق من المصادقة
  const isAuthenticated = !!user;
  
  // إعداد مُعترض أكسيوس للمصادقة
  useEffect(() => {
    // إزالة المُعترض السابق إذا وجد
    if (interceptorRef.current !== null) {
      trackingAxios.interceptors.request.eject(interceptorRef.current);
    }
    
    // إضافة مُعترض جديد مع التوكن الحالي
    interceptorRef.current = trackingAxios.interceptors.request.use(
      config => {
        if (user?.token) {
          config.headers['Authorization'] = `Bearer ${user.token}`;
        }
        return config;
      },
      error => Promise.reject(error)
    );
    
    // تنظيف عند إلغاء تحميل المكون
    return () => {
      if (interceptorRef.current !== null) {
        trackingAxios.interceptors.request.eject(interceptorRef.current);
      }
    };
  }, [user]);
  
  // إعادة تعيين عداد الأخطاء عند تغيير المسار
  useEffect(() => {
    if (lastTrackedPath !== location.pathname) {
      setErrorCount(0);
    }
  }, [location.pathname]);

  // تحويل المسار إلى اسم القسم
  const pathToSection = (path) => {
    const normalizedPath = path.toLowerCase();
    
    // قواعد التحويل من المسار إلى اسم القسم (مطابقة مسارات URL الفعلية)
    if (normalizedPath === '/' || normalizedPath === '') return 'dashboard';
    if (normalizedPath.includes('/profile')) return 'profile';
    if (normalizedPath.includes('/get-access-token')) return 'get-access-token';
    if (normalizedPath.includes('/auto-post-group')) return 'auto-post-group';
    if (normalizedPath.includes('/mygroup-extractor')) return 'mygroup-extractor';
    if (normalizedPath.includes('/comment-extractor')) return 'comment-extractor';
    if (normalizedPath.includes('/reaction-extractor')) return 'reaction-extractor';
    if (normalizedPath.includes('/achievements')) return 'achievements';
    
    // إذا لم يتم العثور على تطابق، إرجاع فارغ
    return '';
  };

  // تسجيل زيارة القسم في واجهة API
  const trackSectionVisit = async (section) => {
    // تجنب المحاولات المتكررة في حالة الفشل
    if (errorCount > 3) {
      // تم إيقاف رسائل وحدة التحكم
      return;
    }
  
    try {
      if (!section) {
        // قسم غير صالح - تم إيقاف رسائل وحدة التحكم
        return;
      }
      
      // التأكد من وجود المستخدم المصادق
      if (!user || !isAuthenticated) {
        // المستخدم غير مصادق - تم إيقاف رسائل وحدة التحكم
        return;
      }
      
      // استخدام نسخة أكسيوس مع المُعترض للمصادقة التلقائية
      const response = await trackingAxios.post('/api/achievements/track-section', { 
        section,
        path: location.pathname
      });
      
      // إعادة تعيين عداد الأخطاء عند النجاح
      setErrorCount(0);
    } catch (error) {
      // زيادة عداد الأخطاء
      setErrorCount(prev => prev + 1);
      
      // محاولة مرة أخرى بعد فترة قصيرة (فقط للمحاولة الأولى) - بدون سجل الأخطاء
      if (errorCount === 0) {
        setTimeout(() => trackSectionVisit(section), 2000);
      }
    }
  };

  // تنفيذ تتبع مباشر عند التحميل الأول
  useEffect(() => {
    if (isAuthenticated && user && user?.token) {
      const currentPath = location.pathname;
      const section = pathToSection(currentPath);
      
      if (section) {
        // تأخير أطول للتأكد من اكتمال تحميل المكون وإعداد المصادقة
        const timer = setTimeout(() => {
          trackSectionVisit(section);
          setLastTrackedPath(currentPath);
        }, 1500);
        
        return () => clearTimeout(timer);
      }
    }
  }, [isAuthenticated, user]);

  // تتبع تغيير المسار
  useEffect(() => {
    // فقط تتبع المسارات عندما يكون المستخدم مصادقًا تمامًا
    if (!isAuthenticated || !user || !user?.token) {
      return;
    }
    
    const currentPath = location.pathname;
    
    // تجاهل إذا كان نفس المسار السابق
    if (currentPath === lastTrackedPath) {
      return;
    }
    
    // تحويل المسار إلى اسم القسم
    const section = pathToSection(currentPath);
    
    // تسجيل زيارة القسم
    if (section) {
      // تأخير قصير لمنع طلبات متزامنة متعددة
      setTimeout(() => {
        trackSectionVisit(section);
        setLastTrackedPath(currentPath);
      }, 300);
    }
  }, [location.pathname, isAuthenticated, user]);

  // مكون غير مرئي - لا يعرض أي شيء
  return null;
};

export default SectionTracker;