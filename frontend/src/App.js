import React, { useState, useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import { ConfigProvider, App as AntApp, message } from 'antd';
import axios from 'axios';
import favicon from './favicon.png';
import { UserProvider } from './context/UserContext';
import { MessageProvider } from './context/MessageContext';
import { NotificationProvider } from './context/NotificationContext';
import { LoadingProvider } from './context/LoadingContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { MembershipProvider, RESTRICTED_FEATURES } from './utils/membershipUtils';
import ar_EG from 'antd/lib/locale/ar_EG';
import en_US from 'antd/lib/locale/en_US';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import UserProfile from './pages/UserProfile';
import AdminUserManagement from './pages/AdminUserManagement';
import AdminSupportMessages from './pages/AdminSupportMessages';
import Help from './pages/Help';
import AIPromptGenerator from './pages/AIPromptGenerator';
import './styles/main.css';
import './styles/tabs.css'; // Shared tab styling for consistent UI
import './styles/forms.css'; // Shared form styling for consistent inputs and buttons
import './styles/layout.css'; // Shared layout styling for consistent components
import './utils/axiosConfig';
import GetAccessToken from './pages/GetAccessToken';
import AutoPostGroup from './pages/AutoPostGroup';
import Achievements from './pages/Achievements';
import PageManagement from './pages/PageManagement';
import PostManagement from './pages/PostManagement';
import PageMessageManagement from './pages/PageMessageManagement';
import MyGroupExtractor from './pages/MyGroupExtractor';
import CommentExtractor from './pages/CommentExtractor';
import ReactionExtractor from './pages/ReactionExtractor';
import Membership from './pages/Membership';
import MembershipManagement from './pages/MembershipManagement';
import CommentResponseManagement from './pages/CommentResponseManagement';
import Wallet from './pages/Wallet';
import AdminPayments from './pages/admin/AdminPayments';
import RestrictedFeatureWrapper from './components/RestrictedFeatureWrapper';

// Protected route component
const ProtectedLayout = () => {
  const isAuthenticated = localStorage.getItem('userInfo') !== null;
  
  // Configure auth headers if user is authenticated
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('userInfo'));
    if (userData && userData.token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
    }
  }, []);
  
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Use Outlet to properly handle nested routes
  return <MainLayout />;
};

// Public layout component
const PublicLayout = () => {
  const isAuthenticated = localStorage.getItem('userInfo') !== null;
  
  // استخدام state للتأخير في إعادة التوجيه
  const [shouldRedirect, setShouldRedirect] = useState(false);
  
  useEffect(() => {
    // تأخير إعادة التوجيه للسماح بتنفيذ التحويلات والتنقلات بسلاسة
    if (isAuthenticated) {
      setTimeout(() => {
        setShouldRedirect(true);
      }, 300);
    }
  }, [isAuthenticated]);
  
  if (shouldRedirect && isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <Outlet />;
};

// Configure router with better separation between user and admin sections
const router = createBrowserRouter([
  // المسارات العامة (غير المحمية)
  {
    path: "/login",
    element: <PublicLayout />,
    children: [
      {
        index: true,
        element: <Login />
      }
    ]
  },
  {
    path: "/register",
    element: <PublicLayout />,
    children: [
      {
        index: true,
        element: <Register />
      }
    ]
  },
  {
    path: "/forgot-password",
    element: <PublicLayout />,
    children: [
      {
        index: true,
        element: <ForgotPassword />
      }
    ]
  },
  {
    path: "/reset-password/:token",
    element: <PublicLayout />,
    children: [
      {
        index: true,
        element: <ResetPassword />
      }
    ]
  },
  {
    path: "/terms",
    element: <TermsOfService />
  },
  {
    path: "/privacy",
    element: <PrivacyPolicy />
  },
  
  // المسارات المحمية
  {
    path: "/",
    element: <ProtectedLayout />,
    children: [
      {
        index: true,
        element: <Dashboard />
      },
      {
        path: "profile",
        element: <UserProfile />,
      },
      {
        path: "achievements",
        element: <Achievements />
      },
      {
        path: "membership",
        element: <Membership />
      },
      {
        path: "membership-management",
        element: <MembershipManagement />
      },
      {
        path: "wallet",
        element: <Wallet />
      },
      {
        path: "auto-post-group",
        element: (
          <RestrictedFeatureWrapper featureKey={RESTRICTED_FEATURES.AUTO_POST_GROUP}>
            <AutoPostGroup />
          </RestrictedFeatureWrapper>
        ),
      },
      {
        path: "mygroup-extractor",
        element: (
          <RestrictedFeatureWrapper featureKey={RESTRICTED_FEATURES.GROUP_EXTRACTOR}>
            <MyGroupExtractor />
          </RestrictedFeatureWrapper>
        ),
      },
      {
        path: "page-management",
        element: (
          <RestrictedFeatureWrapper featureKey={RESTRICTED_FEATURES.PAGE_MANAGEMENT}>
            <PageManagement />
          </RestrictedFeatureWrapper>
        ),
      },
      {
        path: "page-message-management",
        element: (
          <RestrictedFeatureWrapper featureKey={RESTRICTED_FEATURES.PAGE_MANAGEMENT}>
            <PageMessageManagement />
          </RestrictedFeatureWrapper>
        ),
      },
      {
        path: "comment-response",
        element: (
          <RestrictedFeatureWrapper featureKey={RESTRICTED_FEATURES.COMMENT_RESPONSE}>
            <CommentResponseManagement />
          </RestrictedFeatureWrapper>
        ),
      },
      {
        path: "post-management",
        element: (
          <RestrictedFeatureWrapper featureKey={RESTRICTED_FEATURES.PAGE_MANAGEMENT}>
            <PostManagement />
          </RestrictedFeatureWrapper>
        ),
      },
      {
        path: "comment-extractor",
        element: (
          <RestrictedFeatureWrapper featureKey={RESTRICTED_FEATURES.COMMENT_EXTRACTOR}>
            <CommentExtractor />
          </RestrictedFeatureWrapper>
        ),
      },
      {
        path: "reaction-extractor",
        element: (
          <RestrictedFeatureWrapper featureKey={RESTRICTED_FEATURES.REACTION_EXTRACTOR}>
            <ReactionExtractor />
          </RestrictedFeatureWrapper>
        ),
      },
      {
        path: "ai-prompt-generator",
        element: (
          <RestrictedFeatureWrapper featureKey={RESTRICTED_FEATURES.AI_PROMPT_GENERATOR}>
            <AIPromptGenerator />
          </RestrictedFeatureWrapper>
        ),
      },
      {
        path: "get-access-token",
        element: <GetAccessToken />
      },
      {
        path: "help",
        element: <Help />
      },
      // مسارات الإدارة بشكل منفصل لتجنب التداخل مع المسارات الأخرى
          {
            path: "admin",
            children: [
              {
                path: "users",
                element: <AdminUserManagement />
              },
              {
                path: "support",
                element: <AdminSupportMessages />
              },
              {
                path: "payments",
                element: <AdminPayments />
              },
              {
                path: "membership-plans",
                element: <React.Suspense fallback={<div>Loading...</div>}>
                  {React.createElement(React.lazy(() => import('./pages/admin/AdminMembershipPlans')))}
                </React.Suspense>
              },
              {
                path: "languages",
                element: <React.Suspense fallback={<div>Loading...</div>}>
                  {React.createElement(React.lazy(() => import('./pages/admin/LanguageManagement')))}
                </React.Suspense>
              },
              {
                path: "currency-rates",
                element: <React.Suspense fallback={<div>Loading...</div>}>
                  {React.createElement(React.lazy(() => import('./pages/admin/CurrencyRateManagement')))}
                </React.Suspense>
              },
              {
                path: "points-management",
                element: <React.Suspense fallback={<div>Loading...</div>}>
                  {React.createElement(React.lazy(() => import('./pages/admin/AdminPointsManagement')))}
                </React.Suspense>
              }
            ]
          }
    ]
  },
  
  // طريق الخطأ - توجيه إلى الصفحة الرئيسية
  {
    path: "*",
    element: <Navigate to="/" replace />
  }
]);

// AppContent component to use the language context
const AppContent = () => {
  const { direction, currentLanguage } = useLanguage();
  
  // Determine which locale to use based on the current language
  const locale = currentLanguage === 'ar' ? ar_EG : en_US;
  
  return (
    <ConfigProvider
      direction={direction}  
      locale={locale}
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
        },
        components: {
          Message: {
            colorSuccess: '#52c41a',
            colorWarning: '#faad14',
            colorError: '#ff4d4f',
            colorInfo: '#1677ff',
          }
        }
      }}
    >
      <AntApp
        message={{ 
          maxCount: 3,
          top: 100,
          duration: 2
        }}
      >
        <NotificationProvider>
          <LoadingProvider>
            <MembershipProvider>
              <RouterProvider router={router} />
            </MembershipProvider>
          </LoadingProvider>
        </NotificationProvider>
      </AntApp>
    </ConfigProvider>
  );
};

function App() {
  // Set favicon dynamically using the imported image
  useEffect(() => {
    // Get existing favicon element or create a new one
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    // Set the favicon to the imported image
    link.href = favicon;
  }, []);

  return (
    <MessageProvider>
      <UserProvider>
        <LanguageProvider>
          <AppContent />
        </LanguageProvider>
      </UserProvider>
    </MessageProvider>
  );
}

export default App;