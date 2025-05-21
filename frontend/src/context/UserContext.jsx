import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
// استيراد useMessage فقط من ملف MessageContext
import { useMessage } from './MessageContext';

// إنشاء سياق المستخدم
const UserContext = createContext();

// مكون UserProvider
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showSuccess, showError } = useMessage();

  // استرجاع بيانات المستخدم عند تحميل التطبيق
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userInfoString = localStorage.getItem('userInfo');
        if (userInfoString) {
          const userInfo = JSON.parse(userInfoString);
          setUser(userInfo);
          
          // اختياري: تحديث البيانات من الخادم
          if (userInfo.token) {
            await refreshUserFromServer();
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // تحديث بيانات المستخدم من الخادم
  const refreshUserFromServer = async () => {
    try {
      const response = await axios.get('/api/users/profile');
      const updatedUserData = response.data;
      
      // دمج البيانات الجديدة مع البيانات الموجودة
      const currentUser = JSON.parse(localStorage.getItem('userInfo'));
      
      // تأكد من الحفاظ على lastLogin من الاستجابة أو من البيانات الحالية
      const updatedUser = { 
        ...currentUser, 
        ...updatedUserData,
        role: updatedUserData.isAdmin ? 'admin' : 'user',
        isAdmin: updatedUserData.isAdmin,
        // إذا كان lastLogin موجود في بيانات الخادم، استخدمه، وإلا استخدم القيمة الحالية أو التاريخ الحالي
        lastLogin: updatedUserData.lastLogin || currentUser.lastLogin || new Date().toISOString()
      };
      
      // تحديث localStorage والحالة
      localStorage.setItem('userInfo', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      return updatedUser;
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      return null;
    }
  };

  // تحديث صورة المستخدم
  const updateUserAvatar = (avatarUrl) => {
    if (!user) return;
    
    const updatedUser = { ...user, avatar: avatarUrl };
    localStorage.setItem('userInfo', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  // تحديث بيانات الملف الشخصي
  const updateUserProfile = (profileData) => {
    if (!user) return;
    
    const updatedUser = { ...user, ...profileData };
    localStorage.setItem('userInfo', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  // تسجيل الخروج - استخدام showSuccess بدلاً من message.success
  const logout = (callback) => {
    localStorage.removeItem('userInfo');
    setUser(null);
    
    // استخدام showSuccess من سياق الرسائل
    showSuccess('تم تسجيل الخروج بنجاح', 2, () => {
      // تنفيذ الانتقال بعد اكتمال رسالة النجاح
      if (typeof callback === 'function') {
        callback();
      }
    });
  };
  
  // تسجيل الدخول
  const login = (userData) => {
    // حفظ تاريخ آخر تسجيل دخول كتاريخ سابق
    // والحفاظ على تاريخ الدخول الحالي كآخر تسجيل دخول
    const now = new Date().toISOString();
    
    // استرجاع البيانات الحالية للمستخدم إن وجدت
    let previousLogin = null;
    try {
      const currentUserInfo = localStorage.getItem('userInfo');
      if (currentUserInfo) {
        const currentUser = JSON.parse(currentUserInfo);
        // حفظ تاريخ آخر تسجيل دخول سابق
        previousLogin = currentUser.lastLogin;
      }
    } catch (error) {
      console.error('Error retrieving current user info:', error);
    }
    
    const updatedUserData = {
      ...userData,
      // حفظ تاريخ الدخول السابق
      previousLogin: previousLogin || userData.lastLogin || null,
      // تحديث تاريخ آخر دخول ليكون الوقت الحالي
      lastLogin: now
    };
    
    localStorage.setItem('userInfo', JSON.stringify(updatedUserData));
    setUser(updatedUserData);
  };
  
  // تحديث إحصائيات المستخدم
  const updateUserStats = (statsData) => {
    if (!user) return;
    
    const updatedUser = { ...user, ...statsData };
    localStorage.setItem('userInfo', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const value = {
    user,
    loading,
    refreshUserFromServer,
    updateUserAvatar,
    updateUserProfile,
    updateUserStats,
    login,
    logout
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};