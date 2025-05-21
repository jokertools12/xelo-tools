import React, { useState, useEffect } from 'react';
import { Layout, Typography, Button, Row, Col, Spin } from 'antd';
import { Link } from 'react-router-dom';
import { RocketOutlined, CheckCircleOutlined, LockOutlined } from '@ant-design/icons';
import Sidebar from '../components/Sidebar';
import SEO from '../components/SEO';
import '../styles/LandingPage.css';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;

const LandingPage = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileVisible, setMobileVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if the screen is mobile size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Trigger animation after component mounts
    setTimeout(() => {
      setLoaded(true);
      setLoading(false);
    }, 100);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  const handleCollapse = (value) => {
    setCollapsed(value);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <Spin size="large" />
      </div>
    );
  }
  
  return (
    <Layout className="landing-layout">
      <SEO 
        title="Xelo Tools - منصة إدارة فيسبوك المتكاملة"
        description="منصة متكاملة تمنحك القدرة على إدارة حسابات فيسبوك واستخراج البيانات وتحليلها بكفاءة عالية. استخراج التعليقات، التفاعلات، وإدارة المجموعات في مكان واحد"
        canonicalUrl="https://xelo.tools"
        additionalMetaTags={[
          { name: 'keywords', content: 'استخراج التعليقات، استخراج التفاعلات، إدارة فيسبوك، تحليل بيانات فيسبوك، أدوات فيسبوك، إدارة المجموعات، منصة فيسبوك متكاملة، استخراج البيانات' },
          { name: 'author', content: 'Xelo Tools' },
          { name: 'application-name', content: 'Xelo Tools' },
          { property: 'og:site_name', content: 'Xelo Tools' },
          { property: 'og:type', content: 'website' },
          { property: 'og:locale', content: 'ar_SA' },
          { name: 'twitter:card', content: 'summary_large_image' }
        ]}
      />
      <Sidebar 
        collapsed={collapsed} 
        onCollapse={handleCollapse} 
        isMobile={isMobile} 
        mobileVisible={mobileVisible} 
      />
      
      <Layout className={`landing-content-layout ${collapsed ? 'content-collapsed' : ''}`}>
        <Content className="landing-content">
          <div className={`landing-hero ${loaded ? 'animate-in' : ''}`}>
            <div className="hero-content">
              <div className="hero-text">
                <Title level={1} className="gradient-text">
                  منصة إدارة فيسبوك المتكاملة
                </Title>
                <Paragraph className="hero-description">
                  منصة متكاملة تمنحك القدرة على إدارة حسابات فيسبوك واستخراج البيانات وتحليلها بكفاءة عالية
                </Paragraph>
                
                <div className="features-section">
                  <Row gutter={[24, 24]}>
                    <Col xs={24} md={8}>
                      <div className="feature-card">
                        <CheckCircleOutlined className="feature-icon" />
                        <Title level={4}>استخراج التعليقات</Title>
                        <Text>استخراج وتحليل التعليقات من المنشورات والصفحات</Text>
                      </div>
                    </Col>
                    <Col xs={24} md={8}>
                      <div className="feature-card">
                        <CheckCircleOutlined className="feature-icon" />
                        <Title level={4}>استخراج التفاعلات</Title>
                        <Text>تتبع التفاعلات والإعجابات والمشاركات بدقة عالية</Text>
                      </div>
                    </Col>
                    <Col xs={24} md={8}>
                      <div className="feature-card">
                        <LockOutlined className="feature-icon" />
                        <Title level={4}>إدارة المجموعات</Title>
                        <Text>أدوات متقدمة لإدارة المجموعات والمحتوى بكفاءة</Text>
                      </div>
                    </Col>
                  </Row>
                </div>
                
                <div className="cta-container">
                  <Link to="/login">
                    <Button type="primary" size="large" className="cta-button" icon={<RocketOutlined />}>
                      ابدأ الآن
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button type="default" size="large" className="register-button">
                      إنشاء حساب جديد
                    </Button>
                  </Link>
                </div>
              </div>
              
              <div className="hero-illustration">
                <div className="illustration-container">
                  {/* SVG illustration or image could go here */}
                  <div className="glowing-orb"></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className={`landing-benefits ${loaded ? 'animate-in' : ''}`}>
            <Title level={2} className="section-title">
              ميزات المنصة
            </Title>
            <Row gutter={[32, 32]} className="benefits-row">
              <Col xs={24} md={12} lg={8}>
                <div className="benefit-card">
                  <div className="benefit-icon">🚀</div>
                  <Title level={3}>سرعة عالية</Title>
                  <Paragraph>
                    استخراج البيانات والتحليلات بسرعة فائقة لتوفير الوقت والجهد
                  </Paragraph>
                </div>
              </Col>
              <Col xs={24} md={12} lg={8}>
                <div className="benefit-card">
                  <div className="benefit-icon">🔒</div>
                  <Title level={3}>أمان متكامل</Title>
                  <Paragraph>
                    حماية كاملة للبيانات والخصوصية وفقاً لأعلى معايير الأمان
                  </Paragraph>
                </div>
              </Col>
              <Col xs={24} md={12} lg={8}>
                <div className="benefit-card">
                  <div className="benefit-icon">📊</div>
                  <Title level={3}>تحليلات دقيقة</Title>
                  <Paragraph>
                    رؤى تحليلية متقدمة لمساعدتك في اتخاذ القرارات المناسبة
                  </Paragraph>
                </div>
              </Col>
            </Row>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default LandingPage;