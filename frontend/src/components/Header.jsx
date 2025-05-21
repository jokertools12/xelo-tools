import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  Dropdown, 
  Space, 
  Typography, 
  message,
  Tooltip,
  Button,
  Breadcrumb
} from 'antd';
import { 
  UserOutlined, 
  LogoutOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
  RightOutlined,
  HomeOutlined,
  GlobalOutlined
} from '@ant-design/icons';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import '../styles/Header.css';

import Avatar from '../components/Avatar';

const { Header: AntHeader } = Layout;
const { Text, Title } = Typography;

const Header = () => {
  const { user, logout, refreshUserFromServer } = useUser();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [pageTitle, setPageTitle] = useState('Dashboard');
  const [userDropdownVisible, setUserDropdownVisible] = useState(false);
  
  // Close dropdowns when user clicks outside with improved targeting
  useEffect(() => {
    const handleOutsideClick = (e) => {
      // Only close user dropdown if clicking outside user profile area
      if (userDropdownVisible && 
          !e.target.closest('.user-profile-dropdown') && 
          !e.target.closest('.user-dropdown-menu')) {
        setUserDropdownVisible(false);
      }
    };
    
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [userDropdownVisible]);

  useEffect(() => {
    // Close any open dropdowns when route changes
    setUserDropdownVisible(false);
    // تعيين عنوان الصفحة بناءً على المسار الحالي
    const path = location.pathname;
    if (path === '/') setPageTitle(t('dashboard'));
    else if (path.includes('/profile')) setPageTitle(t('profile'));
    else if (path.includes('/auto-post-group')) setPageTitle(t('auto_post_group'));
    else if (path.includes('/mygroup-extractor')) setPageTitle(t('group_management'));
    else if (path.includes('/get-access-token')) setPageTitle(t('get_access_token'));
    else if (path.includes('/page-management')) setPageTitle(t('page_management'));
    else if (path.includes('/comment-extractor')) setPageTitle(t('comment_extractor'));
    else if (path.includes('/reaction-extractor')) setPageTitle(t('reaction_extractor'));
    else if (path.includes('/achievements')) setPageTitle(t('achievements'));
    else if (path.includes('/help')) setPageTitle(t('help_support'));
    else if (path.includes('/admin/languages')) setPageTitle(t('language_management'));
    else if (path.includes('/page-message-management')) setPageTitle(t('page_message_management'));
    else if (path.includes('/ai-prompt-generator')) setPageTitle(t('ai_prompt_generator'));
    else if (path.includes('/post-management')) setPageTitle(t('post_management'));
    else if (path.includes('/membership')) setPageTitle(t('membership'));
    else if (path.includes('/wallet')) setPageTitle(t('wallet'));
    else if (path.includes('/ai-prompt-generator')) setPageTitle(t('ai_prompt_generator'));

  }, [location, t]);

  const handleUserDropdownVisibleChange = (visible) => {
    if (visible) {
      refreshUserFromServer(); // تحديث بيانات المستخدم عند فتح القائمة المنسدلة
    }
    setUserDropdownVisible(visible);
  };

  const handleLogout = () => {
    // استدعاء دالة logout مع تمرير callback للتنقل
    logout(() => {
      // لم نعد بحاجة إلى استدعاء message هنا لأن logout ستقوم بذلك
      navigate('/login');
    });
  };

  // إنشاء عناصر خبز الفتات (Breadcrumb) ديناميًا
  const generateBreadcrumb = () => {
    const pathSnippets = location.pathname.split('/').filter(i => i);
    
    return (
      <Breadcrumb className="site-breadcrumb">
        <Breadcrumb.Item>
          <Link to="/dashboard">
            <HomeOutlined /> Home
          </Link>
        </Breadcrumb.Item>
        {pathSnippets.map((snippet, index) => {
          const url = `/${pathSnippets.slice(0, index + 1).join('/')}`;
          
          // تجاهل "dashboard" في خبز الفتات لأنه بالفعل موجود كـ "Home"
          if (snippet === 'dashboard' && index === 0) return null;
          
          return (
            <Breadcrumb.Item key={url}>
              <Link to={url}>
                {snippet.charAt(0).toUpperCase() + snippet.slice(1).replace(/-/g, ' ')}
              </Link>
            </Breadcrumb.Item>
          );
        })}
      </Breadcrumb>
    );
  };

  const userMenuItems = [
    {
      key: '1',
      label: (
        <div className="user-menu-item">
          <UserOutlined />
          <span>{t('profile')}</span>
          <RightOutlined className="menu-arrow" />
        </div>
      ),
      onClick: () => navigate('/profile'),
    },
    {
      key: '2',
      label: (
        <div className="user-menu-item">
          <SettingOutlined />
          <span>{t('settings')}</span>
          <RightOutlined className="menu-arrow" />
        </div>
      ),
      onClick: () => navigate('/profile?tab=settings'),
    },
    {
      type: 'divider',
    },
    {
      key: '3',
      label: (
        <div className="user-menu-item logout-item">
          <LogoutOutlined />
          <span>{t('logout')}</span>
        </div>
      ),
      danger: true,
      onClick: handleLogout,
    },
  ];

  // Add admin menu items if user is admin
  if (user?.isAdmin) {
    userMenuItems.splice(2, 0, {
      key: '4',
      label: (
        <div className="user-menu-item">
          <GlobalOutlined />
          <span>{t('language_management')}</span>
          <RightOutlined className="menu-arrow" />
        </div>
      ),
      onClick: () => navigate('/admin/languages'),
    });
  }

  return (
    <AntHeader className="app-header">
      <div className="header-left">
        <Title level={4} className="page-title">{pageTitle}</Title>
      </div>
      <div className="header-right">
        <Space size="middle" align="center">
          
          <LanguageSwitcher mode="icon" />
          
          <Tooltip title={t('help_center')} placement="bottom">
            <div className="header-icon-container">
              <Button 
                type="text" 
                icon={<QuestionCircleOutlined />}
                className="header-icon" 
                onClick={() => navigate('/help')}
              />
            </div>
          </Tooltip>
          
          <Dropdown
            menu={{ 
              items: userMenuItems,
              className: 'user-menu-dropdown'
            }}
            placement="bottomRight"
            arrow
            trigger={['click']}
            overlayClassName="header-dropdown user-dropdown-menu"
            onOpenChange={handleUserDropdownVisibleChange}
            open={userDropdownVisible}
          >
            <div 
              className="user-profile-dropdown"
              onClick={(e) => {
                e.stopPropagation();
                setUserDropdownVisible(!userDropdownVisible);
              }}
            >
              <div className="user-avatar-container">
                <Avatar 
                  size="default" 
                  src={user?.avatar} 
                  className="user-avatar" 
                />
                <span className="user-status online"></span>
              </div>
              <div className="user-info">
                <span className="username">{user?.name || t('user_name')}</span>
                <span className="user-role">
                  {user?.isAdmin ? t('administrator') : t('user')}
                </span>
              </div>
            </div>
          </Dropdown>
        </Space>
      </div>
    </AntHeader>
  );
};

export default Header;