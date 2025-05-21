import React, { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import AchievementNotification from '../components/AchievementNotification';
import { useLanguage } from './LanguageContext';
import { message } from 'antd';

// إنشاء سياق الإشعارات
const NotificationContext = createContext();

/**
 * مزود سياق الإشعارات
 * يدير حالة وعرض الإشعارات عبر التطبيق، مع التركيز على إشعارات الإنجازات
 */
export const NotificationProvider = ({ children }) => {
  // استيراد سياق اللغة للترجمة
  const { t } = useLanguage();
  
  // حالة الإشعارات
  const [notifications, setNotifications] = useState([]);
  const [currentNotification, setCurrentNotification] = useState(null);
  const [isNotificationVisible, setIsNotificationVisible] = useState(false);
  const [playSound, setPlaySound] = useState(true);
  
  // إدارة صف انتظار الإشعارات
  useEffect(() => {
    // إذا كان هناك إشعار حالي أو لا يوجد إشعارات في الصف، لا تفعل شيئًا
    if (isNotificationVisible || notifications.length === 0) {
      return;
    }
    
    // إظهار الإشعار التالي
    showNextNotification();
  }, [isNotificationVisible, notifications]);
  
  // إضافة إشعار جديد
  const addNotification = (notification) => {
    // التحقق من أن الإشعار يحتوي على المعلومات المطلوبة
    if (!notification || !notification.type) {
      console.warn('محاولة إضافة إشعار غير صالح:', notification);
      return;
    }
    
    // إضافة الإشعار إلى الصف
    setNotifications(prev => [...prev, notification]);
  };

  // واجهة لعرض الإشعارات في واجهة المستخدم (تستخدم مكتبة antd)
  const showNotification = (type, content, duration = 5) => {
    switch (type) {
      case 'success':
        message.success(content, duration);
        break;
      case 'error':
        message.error(content, duration);
        break;
      case 'warning':
        message.warning(content, duration);
        break;
      case 'info':
        message.info(content, duration);
        break;
      default:
        message.info(content, duration);
    }

    // أيضاً إضافة الإشعار إلى نظام الإشعارات الداخلي إذا كان مناسباً
    if (['achievement', 'system'].includes(type)) {
      addNotification({
        id: `notification-${Date.now()}`,
        type: type,
        message: content,
        timestamp: new Date().toISOString()
      });
    }
  };
  
  // إضافة إشعار إنجاز جديد
  const addAchievementNotification = (achievement) => {
    // التحقق من أن الإنجاز يحتوي على المعلومات المطلوبة
    if (!achievement || !achievement.id) {
      console.warn('محاولة إضافة إشعار إنجاز غير صالح:', achievement);
      return;
    }
    
    // إنشاء إشعار من الإنجاز
    const notification = {
      id: `achievement-${achievement.id}`,
      type: 'achievement',
      data: achievement,
      timestamp: new Date().toISOString()
    };
    
    // إضافة الإشعار
    addNotification(notification);
  };
  
  // عرض الإشعار التالي
  const showNextNotification = () => {
    // إذا كان هناك إشعار حالي، لا تفعل شيئًا
    if (isNotificationVisible) {
      return;
    }
    
    // إذا لم يكن هناك إشعارات في الصف، لا تفعل شيئًا
    if (notifications.length === 0) {
      return;
    }
    
    // إزالة الإشعار الأول من الصف وعرضه
    const [next, ...rest] = notifications;
    setNotifications(rest);
    setCurrentNotification(next);
    setIsNotificationVisible(true);
  };
  
  // إغلاق الإشعار الحالي
  const dismissCurrentNotification = () => {
    setIsNotificationVisible(false);
    setCurrentNotification(null);
  };
  
  // تبديل حالة الصوت
  const toggleSound = () => {
    setPlaySound(prev => !prev);
    // حفظ تفضيلات الصوت في التخزين المحلي للحفاظ عليها
    localStorage.setItem('notification_sound_enabled', (!playSound).toString());
  };
  
  // تحميل تفضيلات الصوت عند بدء التشغيل
  useEffect(() => {
    const soundPreference = localStorage.getItem('notification_sound_enabled');
    if (soundPreference !== null) {
      setPlaySound(soundPreference === 'true');
    }
  }, []);
  
  // إنشاء مكون عارض الإشعارات
  const renderNotifications = () => {
    // إذا كان هناك إشعار حالي وهو من نوع إنجاز
    if (currentNotification && currentNotification.type === 'achievement') {
      // إذا لم يكن هناك عنوان مترجم أو وصف في الإنجاز، نستخدم الترجمات الافتراضية
      const achievementData = {
        ...currentNotification.data,
        // استخدام الترجمات القياسية إذا لم تكن موجودة
        title: currentNotification.data.title || t('achievementNotificationTitle'),
        description: currentNotification.data.description || t('achievementUnlocked')
      };
      
      return (
        <AchievementNotification
          open={isNotificationVisible}
          achievement={achievementData}
          onClose={dismissCurrentNotification}
          playSound={playSound}
        />
      );
    }
    
    // يمكن إضافة أنواع أخرى من الإشعارات هنا في المستقبل
    
    return null;
  };
  
  // القيمة المقدمة للسياق
  const contextValue = {
    // الحالة الحالية
    currentNotification,
    notifications,
    isNotificationVisible,
    playSound,
    
    // الوظائف
    addNotification,
    addAchievementNotification,
    dismissCurrentNotification,
    toggleSound,
    showNotification
  };
  
  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      {renderNotifications()}
    </NotificationContext.Provider>
  );
};

NotificationProvider.propTypes = {
  children: PropTypes.node.isRequired
};

// دالة مساعدة لاستخدام سياق الإشعارات
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification يجب استخدامه داخل NotificationProvider');
  }
  return context;
};

export default NotificationContext;