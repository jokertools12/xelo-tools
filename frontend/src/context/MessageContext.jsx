import React, { createContext, useContext, useState, useEffect } from 'react';
import { message } from 'antd';

// إنشاء سياق الرسائل
const MessageContext = createContext();

export const MessageProvider = ({ children }) => {
  // استخدام API الرسائل المباشر من antd
  // هذا يتجنب مشكلة "Static function can not consume context"
  const messageApi = message;
  
  // إضافة دعم الترجمة
  const [translateFunc, setTranslateFunc] = useState(null);
  
  // وظيفة لتسجيل وظيفة الترجمة من سياق اللغة
  const registerTranslation = (translationFunction) => {
    setTranslateFunc(translationFunction);
  };
  
  // وظيفة مساعدة لترجمة المحتوى إذا كانت وظيفة الترجمة متاحة
  const translateContent = (content) => {
    if (typeof translateFunc === 'function') {
      return translateFunc(content, content);
    }
    return content;
  };

  // تغليف وظائف الرسائل مع دعم الترجمة
  // إعداد مكان ظهور الإشعارات ليكون في المنتصف دائمًا بغض النظر عن اللغة
  // استخدام CSS للتوسيط المثالي
  useEffect(() => {
    // إنشاء عنصر نمط لإضافة تخصيص CSS للإشعارات
    const styleEl = document.createElement('style');
    styleEl.id = 'message-center-style';
    styleEl.innerHTML = `
      .ant-message {
        left: 50% !important;
        transform: translateX(-50%) !important;
        right: auto !important;
        top: 100px !important;
      }
      .ant-message-notice-content {
        text-align: center !important;
        display: inline-block !important;
        margin: 0 auto !important;
      }
    `;
    document.head.appendChild(styleEl);

    // تكوين الإشعارات
    if (messageApi && typeof messageApi.config === 'function') {
      try {
        messageApi.config({
          top: 100,
          duration: 3,
          maxCount: 3,
          rtl: false,
          getContainer: () => document.body
        });
      } catch (error) {
        console.error('Error configuring message API:', error);
      }
    }

    // التنظيف عند إزالة المكون
    return () => {
      const existingStyle = document.getElementById('message-center-style');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, [messageApi]);

  const showSuccess = (content, duration = 2, onClose) => {
    if (messageApi && typeof messageApi.success === 'function') {
      messageApi.success({
        content: translateContent(content),
        duration,
        onClose,
        style: { textAlign: 'center' }
      });
    } else {
      console.warn('Message API not available for success message:', content);
    }
  };

  const showError = (content, duration = 3, onClose) => {
    if (messageApi && typeof messageApi.error === 'function') {
      messageApi.error({
        content: translateContent(content),
        duration,
        onClose,
        style: { textAlign: 'center' }
      });
    } else {
      console.warn('Message API not available for error message:', content);
    }
  };

  const showWarning = (content, duration = 3, onClose) => {
    if (messageApi && typeof messageApi.warning === 'function') {
      messageApi.warning({
        content: translateContent(content),
        duration,
        onClose,
        style: { textAlign: 'center' }
      });
    } else {
      console.warn('Message API not available for warning message:', content);
    }
  };

  const showInfo = (content, duration = 3, onClose) => {
    if (messageApi && typeof messageApi.info === 'function') {
      messageApi.info({
        content: translateContent(content),
        duration,
        onClose,
        style: { textAlign: 'center' }
      });
    } else {
      console.warn('Message API not available for info message:', content);
    }
  };

  const showLoading = (content, key) => {
    if (messageApi && typeof messageApi.loading === 'function') {
      return messageApi.loading({
        content: translateContent(content),
        key,
        duration: 0,
        style: { textAlign: 'center' }
      });
    } else {
      console.warn('Message API not available for loading message:', content);
      return null;
    }
  };

  // وظيفة لاستخدام التحديث بالمفتاح
  const updateMessage = (type, content, key) => {
    if (messageApi && typeof messageApi[type] === 'function') {
      messageApi[type]({
        content: translateContent(content),
        key,
        style: { textAlign: 'center' }
      });
    } else {
      console.warn(`Message API not available for ${type} message:`, content);
    }
  };

  // وظيفة لإظهار رسالة ثم إزالتها
  const destroyMessage = () => {
    if (messageApi && typeof messageApi.destroy === 'function') {
      messageApi.destroy();
    }
  };

  // إضافة واجهة الرسائل المباشرة (لحل مشكلة الإشارة المباشرة التي كانت في messageAPI.js)
  const value = {
    messageApi,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    updateMessage,
    destroyMessage,
    registerTranslation // تصدير وظيفة تسجيل الترجمة
  };

  return (
    <MessageContext.Provider value={value}>
      {children}
    </MessageContext.Provider>
  );
};

export const useMessage = () => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error('useMessage must be used within a MessageProvider');
  }
  return context;
};