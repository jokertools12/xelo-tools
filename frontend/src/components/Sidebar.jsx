import React, { useState, useEffect } from 'react';
import { Layout, Menu, Typography, Button, Tooltip } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  ApiOutlined,
  CommentOutlined,
  LikeOutlined,
  AppstoreOutlined,
  LogoutOutlined,
  RocketOutlined,
  KeyOutlined,
  UsergroupAddOutlined,
  ThunderboltOutlined,
  GiftOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TrophyOutlined,
  FacebookOutlined,
  MessageOutlined,
  GlobalOutlined,
  TranslationOutlined,
  CrownOutlined,
  WalletOutlined,
  CreditCardOutlined,
  DollarOutlined,
  FormOutlined,
  RobotOutlined
} from '@ant-design/icons';
import '../styles/Sidebar.css';
import '../styles/PointsContainer.css';
import logo from "../images/logo.png";
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';

const { Sider } = Layout;
const { Text, Title } = Typography;

/**
 * Points Container Component
 * Displays points information and recharge button
 * Navigates to wallet's points purchase section when clicked
 */
const PointsContainer = ({ collapsed, t, navigateToRoute }) => {
  return (
    <div className={`points-container ${collapsed ? 'points-container-collapsed' : ''}`}>
      <div className="points-content">
        {!collapsed && (
          <>
            <div className="points-icon">
              <GiftOutlined />
            </div>
              <Title level={5} className="points-title">
                {t('recharge_points')}
              </Title>
              <div className="points-description">
                {t('get_more_points')}
              </div>
          </>
        )}
        <Button 
          type="primary" 
          size={collapsed ? "middle" : "large"}
          icon={<ThunderboltOutlined />}
          className="recharge-button"
          onClick={() => navigateToRoute('/wallet?section=buyPoints')}
        >
          {!collapsed && (
            <span className="button-text">
              {t('click_here')}
            </span>
          )}
        </Button>
      </div>
    </div>
  );
};

/**
 * Sidebar Component
 * Main navigation sidebar with collapsible behavior and RTL support
 */
const Sidebar = ({ collapsed, onCollapse, isMobile, mobileVisible }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedKey, setSelectedKey] = useState('1');
  const [openKeys, setOpenKeys] = useState([]);
  const { user: currentUser, logout } = useUser();
  const { t, direction } = useLanguage();
  
  // Ref to track if a menu item was just clicked to prevent menu reopening
  const menuItemClickedRef = React.useRef(false);
  
  // Initialize collapsed state from localStorage on mount
  useEffect(() => {
    const savedCollapsedState = localStorage.getItem('sidebarCollapsed');
    if (savedCollapsedState !== null && JSON.parse(savedCollapsedState) !== collapsed) {
      onCollapse(JSON.parse(savedCollapsedState));
    }
  }, []);
  
  // Save collapsed state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(collapsed));
  }, [collapsed]);
  
  // Update active menu item based on current route
  useEffect(() => {
    const path = location.pathname;
    
    // Map paths to menu keys
    if (path === '/' || path === '' || path === '/dashboard') {
      setSelectedKey('1');
    } else if (path.includes('/get-access-token')) {
      setSelectedKey('2');
    } else if (path.includes('/page-message-management')) {
      setSelectedKey('2.5');
    } else if (path.includes('/auto-post-group')) {
      setSelectedKey('3');
    } else if (path.includes('/ai-prompt-generator')) {
      setSelectedKey('3.5');
    } else if (path.includes('/mygroup-extractor')) {
      setSelectedKey('4.1');
      // Only open submenu in expanded mode and if menu item wasn't just clicked
      if (!collapsed && !menuItemClickedRef.current && !openKeys.includes('extractors')) {
        setOpenKeys(['extractors']);
      }
    } else if (path.includes('/page-management')) {
      setSelectedKey('4.2');
      // Only open submenu in expanded mode and if menu item wasn't just clicked
      if (!collapsed && !menuItemClickedRef.current && !openKeys.includes('extractors')) {
        setOpenKeys(['extractors']);
      }
    } else if (path.includes('/comment-response')) {
      setSelectedKey('4.25');
      // Only open submenu in expanded mode and if menu item wasn't just clicked
      if (!collapsed && !menuItemClickedRef.current && !openKeys.includes('extractors')) {
        setOpenKeys(['extractors']);
      }
    } else if (path.includes('/post-management')) {
      setSelectedKey('4.5');
      // Only open submenu in expanded mode and if menu item wasn't just clicked
      if (!collapsed && !menuItemClickedRef.current && !openKeys.includes('extractors')) {
        setOpenKeys(['extractors']);
      }
    } else if (path.includes('/comment-extractor')) {
      setSelectedKey('4.3');
      // Only open submenu in expanded mode and if menu item wasn't just clicked
      if (!collapsed && !menuItemClickedRef.current && !openKeys.includes('extractors')) {
        setOpenKeys(['extractors']);
      }
    } else if (path.includes('/reaction-extractor')) {
      setSelectedKey('4.4');
      // Only open submenu in expanded mode and if menu item wasn't just clicked
      if (!collapsed && !menuItemClickedRef.current && !openKeys.includes('extractors')) {
        setOpenKeys(['extractors']);
      }
    } else if (path.includes('/achievements')) {
      setSelectedKey('5');
    } else if (path.includes('/membership')) {
      if (path.includes('/membership-management')) {
        setSelectedKey('6.2');
      } else {
        setSelectedKey('6.1');
      }
    } else if (path.includes('/wallet')) {
      setSelectedKey('6.3');
    } else if (path.includes('/profile')) {
      setSelectedKey('7');
    } else if (path.includes('/admin/users')) {
      setSelectedKey('8.1');
    } else if (path.includes('/admin/support')) {
      setSelectedKey('8.2');
    } else if (path.includes('/admin/payments')) {
      setSelectedKey('8.3');
    } else if (path.includes('/admin/membership-plans')) {
      setSelectedKey('8.4');
    } else if (path.includes('/admin/languages')) {
      setSelectedKey('8.5');
    } else if (path.includes('/admin/currency-rates')) {
      setSelectedKey('8.6');
    }
    
    // Reset the click flag after processing
    menuItemClickedRef.current = false;
  }, [location.pathname, collapsed, openKeys]);
  
  // Handle submenu open state changes
  const onOpenChange = (keys) => {
    // Simple toggle behavior for both collapsed and expanded states
    if (keys.length) {
      const latestOpenKey = keys[keys.length - 1];
      // If current key is already open, close it
      if (openKeys.includes(latestOpenKey)) {
        setOpenKeys([]);
      } else {
        // Otherwise open the new key
        setOpenKeys([latestOpenKey]);
      }
    } else {
      setOpenKeys([]);
    }
  };
  
  // Add a dedicated function to handle submenu title clicks
  const handleSubmenuTitleClick = (key) => {
    // Simple toggle logic - if open, close it; if closed, open it
    if (openKeys.includes(key)) {
      setOpenKeys([]);
    } else {
      setOpenKeys([key]);
    }
  };
  
  // Handle sidebar collapse with localStorage update
  const handleCollapse = (isCollapsed) => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
    onCollapse(isCollapsed);
  };
  
  // Logout handler
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  // Function to navigate to a route and close mobile sidebar if needed
  const navigateToRoute = (route) => {
    navigate(route);
    if (isMobile && mobileVisible) {
      onCollapse(true);
    }
  };
  
  // Check if user is admin
  const isAdmin = currentUser && currentUser.role === 'admin';
  
  // Define menu items with proper structure
  const menuItems = [
    // Dashboard - Main entry point
    {
      key: '1',
      icon: <DashboardOutlined className="menu-icon" />,
      label: t('dashboard'),
      onClick: () => navigateToRoute('/'),
    },
    
    // Divider
    {
      type: 'divider',
    },
    
    // Tools Group
    {
      key: '2',
      icon: <KeyOutlined className="menu-icon" />,
      label: t('accessToken'),
      onClick: () => navigateToRoute('/get-access-token'),
    },
    {
      key: '2.5',
      icon: <MessageOutlined className="menu-icon" />,
      label: t('page_message_management'),
      onClick: () => navigateToRoute('/page-message-management'),
    },
    {
      key: '3',
      icon: <RocketOutlined className="menu-icon" />,
      label: t('autoPostGroup'),
      onClick: () => navigateToRoute('/auto-post-group'),
    },
    {
      key: '3.5',
      icon: <RobotOutlined className="menu-icon" />,
      label: t('ai_prompt_generator_title'),
      onClick: () => navigateToRoute('/ai-prompt-generator'),
    },
    
    // Updated Extractor Tools Submenu with proper title click handling
    {
      key: 'extractors',
      icon: <AppstoreOutlined className="menu-icon" />,
      label: t('extractorTools'),
      popupClassName: 'rtl-submenu-popup',
      popupOffset: collapsed ? [10, 0] : [0, 0],
      onTitleClick: () => handleSubmenuTitleClick('extractors'),
      children: [
        {
          key: '4.1',
          icon: <TeamOutlined className="submenu-icon" />,
          label: t('groupExtractor'),
          onClick: () => {
            navigateToRoute('/mygroup-extractor');
            // Don't close the menu automatically when clicking items
            menuItemClickedRef.current = true;
          },
        },
        // Temporarily removed page management section - will be restored later
        // {
        //   key: '4.2',
        //   icon: <FacebookOutlined className="submenu-icon" />,
        //   label: t('pageManagement'),
        //   onClick: () => {
        //     navigateToRoute('/page-management');
        //     menuItemClickedRef.current = true;
        //   },
        // },
        {
          key: '4.25',
          icon: <CommentOutlined className="submenu-icon" />,
          label: t('comment_response.title') || 'الرد التلقائي على التعليقات',
          onClick: () => {
            navigateToRoute('/comment-response');
            menuItemClickedRef.current = true;
          },
        },
        {
          key: '4.5',
          icon: <FormOutlined className="submenu-icon" />,
          label: t('postManagement'),
          onClick: () => {
            navigateToRoute('/post-management');
            menuItemClickedRef.current = true;
          },
        },
        {
          key: '4.3',
          icon: <CommentOutlined className="submenu-icon" />,
          label: t('commentExtractor'),
          onClick: () => {
            navigateToRoute('/comment-extractor');
            menuItemClickedRef.current = true;
          },
        },
        {
          key: '4.4',
          icon: <LikeOutlined className="submenu-icon" />,
          label: t('reactionExtractor'),
          onClick: () => {
            navigateToRoute('/reaction-extractor');
            menuItemClickedRef.current = true;
          },
        },
      ],
    },
    
    // Divider
    {
      type: 'divider',
    },
    
    // User Related Group
    {
      key: '5',
      icon: <TrophyOutlined className="menu-icon" />,
      label: t('achievements'),
      onClick: () => navigateToRoute('/achievements'),
    },
    
    // Membership Group
    {
      key: '6.1',
      icon: <CrownOutlined className="menu-icon" />,
      label: t('membership'),
      onClick: () => navigateToRoute('/membership'),
    },
    {
      key: '6.2',
      icon: <CreditCardOutlined className="menu-icon" />,
      label: t('membership_management'),
      onClick: () => navigateToRoute('/membership-management'),
    },
    {
      key: '6.3',
      icon: <WalletOutlined className="menu-icon" />,
      label: t('wallet'),
      onClick: () => navigateToRoute('/wallet'),
    },
    
    // Profile
    {
      key: '7',
      icon: <UserOutlined className="menu-icon" />,
      label: t('profile'),
      onClick: () => navigateToRoute('/profile'),
    },
    
    // Admin only section - conditionally added below
  ];

  // Add admin menu items if user is admin
  if (isAdmin) {
    menuItems.push(
      { type: 'divider' },
      {
        key: '8.1',
        icon: <UsergroupAddOutlined className="menu-icon" />,
        label: t('userManagement'),
        onClick: () => navigateToRoute('/admin/users'),
      },
      {
        key: '8.2',
        icon: <MessageOutlined className="menu-icon" />,
        label: t('contentManagement'),
        onClick: () => navigateToRoute('/admin/support'),
      },
      {
        key: '8.3',
        icon: <CreditCardOutlined className="menu-icon" />,
        label: t('payments_management'),
        onClick: () => navigateToRoute('/admin/payments'),
      },
      {
        key: '8.4',
        icon: <CrownOutlined className="menu-icon" />,
        label: t('membership_plans_management'),
        onClick: () => navigateToRoute('/admin/membership-plans'),
      },
      {
        key: '8.5',
        icon: <GlobalOutlined className="menu-icon" />,
        label: t('languageManagement'),
        onClick: () => navigateToRoute('/admin/languages'),
      },
      {
        key: '8.6',
        icon: <DollarOutlined className="menu-icon" />,
        label: t('currency_rate_management'),
        onClick: () => navigateToRoute('/admin/currency-rates'),
      },
      {
        key: '8.7',
        icon: <TrophyOutlined className="menu-icon" />,
        label: t('points_management'),
        onClick: () => navigateToRoute('/admin/points-management'),
      }
    );
  }

  return (
    <Sider 
      collapsible 
      collapsed={collapsed} 
      onCollapse={handleCollapse}
      className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${isMobile && mobileVisible ? 'sidebar-mobile-visible' : ''} ${direction === 'rtl' ? 'sidebar-rtl' : 'sidebar-ltr'}`}
      theme="dark"
      width={250}
      collapsedWidth={80}
      trigger={null} // Remove default collapse trigger
      style={{
        // Determine sidebar position based on language direction
        right: direction === 'rtl' ? (isMobile && !mobileVisible ? '-250px' : 0) : 'auto',
        left: direction === 'ltr' ? (isMobile && !mobileVisible ? '-250px' : 0) : 'auto',
        height: '100vh',
        position: 'fixed',
        top: 0,
        bottom: 0,
        zIndex: 1001
      }}
    >
      {/* Logo Section */}
      <div className={`logo-container ${direction === 'rtl' ? 'logo-container-rtl' : 'logo-container-ltr'}`}>
        {logo ? (
          <img 
            src={logo} 
            alt="Logo" 
            className={collapsed ? "logo-collapsed" : "logo-expanded"} 
          />
        ) : (
          <div className="logo-text-fallback">
            {collapsed ? 'X' : 'Xelo Tools'}
          </div>
        )}
        {!collapsed && <Text className="logo-text">Xelo Tools</Text>}
      </div>
      
      {/* Menu Section */}
      <div className={`sidebar-content ${direction === 'rtl' ? 'sidebar-content-rtl' : 'sidebar-content-ltr'}`}>
        <Menu 
          theme="dark"
          selectedKeys={[selectedKey]} 
          mode="inline"
          openKeys={openKeys}
          onOpenChange={onOpenChange}
          items={menuItems}
          className={`sidebar-menu ${collapsed ? 'sidebar-collapsed' : ''} ${direction === 'rtl' ? 'menu-rtl' : 'menu-ltr'}`}
          inlineCollapsed={collapsed}
          triggerSubMenuAction="click" // Change from hover to click for better control
          forceSubMenuRender={true}  // Always render submenu to avoid flicker
        />
        
        {/* Points Container */}
        <PointsContainer 
          collapsed={collapsed} 
          t={t} 
          navigateToRoute={navigateToRoute}
        />
      </div>
      
      {/* Collapse Trigger Button - Hidden on mobile */}
      {!isMobile && (
        <div 
          className={`collapse-trigger ${direction === 'rtl' ? 'collapse-trigger-rtl' : 'collapse-trigger-ltr'}`}
          onClick={() => handleCollapse(!collapsed)}
          style={{
            right: direction === 'rtl' ? 'auto' : '0',
            left: direction === 'rtl' ? '0' : 'auto'
          }}
        >
          {collapsed ? 
            <MenuUnfoldOutlined style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.65)' }} /> : 
            <MenuFoldOutlined style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.65)' }} />
          }
        </div>
      )}
    </Sider>
  );
};

export default Sidebar;