import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import axios from 'axios';
import { ConfigProvider } from 'antd';
// Ant Design styles are now imported in main.css

// تكوين الافتراضي لـ Axios
axios.defaults.baseURL = process.env.REACT_APP_API_URL || '';

// اضافة معالج الأخطاء الشامل
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('userInfo');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ConfigProvider
    theme={{
      token: {
        // تعديل زمن التحويلات
        motion: {
          duration: {
            base: 0.3, // تقليل فترة التحويلات للحصول على استجابة أفضل
          },
        },
      },
    }}
  >
    <App />
  </ConfigProvider>
);