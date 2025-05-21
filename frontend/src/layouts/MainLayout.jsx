import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Layout, Button } from 'antd';
import { 
  MenuUnfoldOutlined, 
  MenuFoldOutlined,
  AppstoreOutlined,
  MenuOutlined,
  AlignLeftOutlined,
  BarsOutlined,
  AppstoreAddOutlined
} from '@ant-design/icons';
import SectionTracker from '../components/SectionTracker';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import '../styles/MainLayout.css';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';

const { Content } = Layout;

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileVisible, setMobileVisible] = useState(false);
  const navigate = useNavigate();
  const { logout } = useUser();
  const { direction } = useLanguage();
  
  // Check if screen is mobile size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  const handleCollapse = (value) => {
    if (isMobile) {
      // On mobile, we hide the sidebar instead of collapsing
      setMobileVisible(false);
    } else {
      // On desktop, we collapse normally
      setCollapsed(value);
    }
  };
  
  const toggleMobileSidebar = () => {
    setMobileVisible(!mobileVisible);
  };
  
  const handleLogout = () => {
    // تمرير callback لـ logout لتنفيذه بعد تسجيل الخروج
    logout(() => {
      navigate('/login');
    });
  };
  
  return (
    <Layout className={`app-layout ${direction === 'rtl' ? 'rtl-app' : 'ltr-app'}`}>
      <Sidebar 
        collapsed={collapsed} 
        onCollapse={handleCollapse} 
        isMobile={isMobile}
        mobileVisible={mobileVisible}
      />
      <Layout 
        className={`site-layout ${isMobile ? '' : (collapsed ? 'site-layout-collapsed' : '')} ${direction === 'rtl' ? 'rtl-layout' : 'ltr-layout'}`} 
        style={{ 
          marginRight: direction === 'rtl' ? (isMobile ? 0 : (collapsed ? '80px' : '250px')) : 0,
          marginLeft: direction === 'ltr' ? (isMobile ? 0 : (collapsed ? '80px' : '250px')) : 0,
          width: isMobile ? '100%' : 'auto',
          overflow: 'hidden',
          direction: direction
        }}
      >
        {/* SectionTracker invisible component for tracking section visits */}
        <SectionTracker />
        
        <Header onLogout={handleLogout} />
        <Content className={`site-content ${direction === 'rtl' ? 'rtl-content' : 'ltr-content'}`} style={{ direction: direction, textAlign: direction === 'rtl' ? 'right' : 'left' }}>
          <Outlet />
        </Content>
        <Footer />
        
        {/* Mobile-only sidebar toggle button with enhanced circular design */}
        {isMobile && (
          <Button
            className={`mobile-sidebar-toggle ${direction === 'rtl' ? 'rtl-toggle' : 'ltr-toggle'}`}
            type="primary"
            onClick={toggleMobileSidebar}
            style={{
              right: direction === 'rtl' ? '20px' : 'auto',
              left: direction === 'ltr' ? '20px' : 'auto'
            }}
            icon={mobileVisible ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
          />
        )}
      </Layout>
    </Layout>
  );
};

export default MainLayout;