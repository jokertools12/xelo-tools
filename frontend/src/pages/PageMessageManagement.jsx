import React, { useState, useEffect, useCallback } from 'react';
import { 
  Layout, Card, Tabs, Alert, Row, Col, message, Steps, 
  Button, Typography, Divider, Badge, Space, Spin, Tag,
  Result, Drawer, Modal, Avatar, Tooltip
} from 'antd';
import { 
  MessageOutlined, 
  ClockCircleOutlined, 
  InfoCircleOutlined,
  FacebookOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  SendOutlined,
  SettingOutlined,
  RightOutlined,
  LeftOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  QuestionCircleOutlined,
  BulbOutlined,
  DashboardOutlined,
  ScheduleOutlined
} from '@ant-design/icons';
import { useLanguage } from '../context/LanguageContext';
import { useLoading } from '../context/LoadingContext';
import AccessTokenSelector from '../components/PageMessages/AccessTokenSelector';
import PageExtractor from '../components/PageMessages/PageExtractor';
import PageSendersList from '../components/PageMessages/PageSendersList';
import MessageComposer from '../components/PageMessages/MessageComposer';
import CampaignManager from '../components/PageMessages/CampaignManager';
import '../styles/PageMessageManagement.css';
import axios from 'axios';

const { Content } = Layout;
const { TabPane } = Tabs;
const { Title, Text, Paragraph } = Typography;

/**
 * PageMessageManagement - A component for managing Facebook Page messages
 * Layout reorganized as per user request
 */
const PageMessageManagement = () => {
  const { t, currentLanguage } = useLanguage();
  const { showLoading, hideLoading } = useLoading();
  const isRTL = currentLanguage === 'ar';
  
  // State for access tokens (handled in background)
  const [accessTokens, setAccessTokens] = useState([]);
  const [activeAccessToken, setActiveAccessToken] = useState('');
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [fetchingToken, setFetchingToken] = useState(false);
  
  // State for page data
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [isExtractingPages, setIsExtractingPages] = useState(false);
  
  // State for page senders
  const [pageSenders, setPageSenders] = useState([]);
  const [selectedSenders, setSelectedSenders] = useState([]);
  const [isLoadingSenders, setIsLoadingSenders] = useState(false);
  
  // UI state
  const [activeTab, setActiveTab] = useState('messaging');
  const [showHelp, setShowHelp] = useState(false);
  
  // Debug mode (for development only)
  const debugMode = false;
  const debugLog = (...args) => {
    if (debugMode) {
      console.log(...args);
    }
  };
  
  // Fetch active access token from API
  const fetchActiveAccessToken = async () => {
    if (fetchingToken) return null;
    
    setFetchingToken(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/users/access-tokens', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const tokens = response.data;
      
      const active = tokens.find(token => token.isActive);
      
      if (active) {
        setActiveAccessToken(active.accessToken);
        return active.accessToken;
      } else if (tokens.length > 0) {
        setActiveAccessToken(tokens[0].accessToken);
        return tokens[0].accessToken;
      }
      
      return null;
    } catch (error) {
      debugLog('Error fetching access token:', error);
      return null;
    } finally {
      setFetchingToken(false);
    }
  };
  
  // Load access tokens from API
  const loadAccessTokens = useCallback(async () => {
    try {
      setIsLoadingTokens(true);
      showLoading();
      
      // First try to get the active token
      const activeToken = await fetchActiveAccessToken();
      if (activeToken) {
        debugLog('Active token loaded successfully:', activeToken.substring(0, 10) + '...');
      } else {
        debugLog('No active token found, trying to load all tokens');
        
        // If no active token, try to load tokens from page messages API
        const response = await axios.get('/api/pagemessages/tokens');
        setAccessTokens(response.data.data);
      }
      
      hideLoading();
      setIsLoadingTokens(false);
    } catch (error) {
      debugLog('Error loading tokens:', error);
      hideLoading();
      setIsLoadingTokens(false);
      message.error(t('pageMessages:errors.loadingTokens', 'خطأ في تحميل رموز الوصول'));
    }
  }, [showLoading, hideLoading, t]);
  
  // Load access tokens on component mount
  useEffect(() => {
    loadAccessTokens();
  }, [loadAccessTokens]);
  
  // Handle extracting pages
  const handleExtractPages = async () => {
    const tokenToUse = activeAccessToken;
    
    if (!tokenToUse) {
      message.warning(t('pageMessages:errors.noAccessToken', 'لا يوجد رمز وصول متاح. الرجاء التأكد من تسجيل الدخول وتحديث الصفحة.'));
      return;
    }
    
    try {
      setIsExtractingPages(true);
      showLoading();
      message.loading(t('pageMessages:pages.extractingMessage', 'جاري استخراج الصفحات...'), 1);
      
      // Using direct fetch to the Facebook Graph API with pagination support
      const url = `/v18.0/me/accounts?fields=id,name,access_token,category,tasks,picture,fan_count&access_token=${tokenToUse}`;
      
      debugLog('Fetching pages with URL:', url);
      
      // Helper function to handle rate limiting retries
      const retryFetch = async (url, retries = 3, delay = 1000) => {
        for (let i = 0; i < retries; i++) {
          try {
            const response = await fetch(url);
            if (!response.ok) {
              if (response.status === 429) {
                const waitTime = delay * (i + 1);
                debugLog(`Rate limit exceeded, retrying in ${waitTime}ms...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
              }
              throw new Error(t('pageMessages:errors.generalError', 'حدث خطأ عام'));
            }
            return response;
          } catch (error) {
            if (i === retries - 1) {
              debugLog('Max retries reached, failing...');
              throw error;
            }
          }
        }
      };

      // Function to fetch all pages with pagination
      const fetchPagesData = async (url, allPages = []) => {
        try {
          debugLog('Fetching pages from URL:', url);
          const response = await retryFetch(url);
          
          let data;
          try {
            data = await response.json();
            debugLog('Received pages data:', data.data?.length || 0, 'pages');
          } catch (jsonError) {
            debugLog('Error parsing JSON:', jsonError);
            throw new Error(t('pageMessages:errors.generalError', 'حدث خطأ عام'));
          }
          
          if (data.error) {
            debugLog('API error:', data.error);
            throw new Error(data.error.message);
          }
          
          if (!data.data || !Array.isArray(data.data)) {
            debugLog('Invalid data structure:', data);
            throw new Error(t('pageMessages:errors.generalError', 'حدث خطأ عام'));
          }
          
          // Process page data
          const processedPages = data.data.map(page => ({
            id: page.id,
            pageId: page.id,
            name: page.name,
            category: page.category,
            accessToken: page.access_token,
            tasks: page.tasks,
            picture: page.picture?.data?.url,
            fan_count: page.fan_count,
            extractedAt: new Date().toISOString()
          }));
          
          // Update pages state
          const newTotalPages = [...allPages, ...processedPages];
          setPages(newTotalPages);
          
          // Handle pagination
          if (data.paging?.next) {
            debugLog('Found next page URL:', data.paging.next);
            
            // Add a delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Call fetchPagesData with the next page URL
            return await fetchPagesData(data.paging.next, newTotalPages);
          } else {
            debugLog('No more pages available, completed fetching all pages');
          }
          
          return newTotalPages;
        } catch (error) {
          debugLog('Error in fetchPagesData:', error);
          throw error;
        }
      };
      
      const extractedPages = await fetchPagesData(url, []);
      
      if (extractedPages.length > 0) {
        message.success(t('pageMessages:pages.extractSuccess', { count: extractedPages.length }, `تم استخراج ${extractedPages.length} صفحة بنجاح`));
      } else {
        message.warning(t('pageMessages:pages.noPages', 'لم يتم العثور على صفحات'));
      }
    } catch (error) {
      debugLog('Error extracting pages:', error);
      message.error(t('pageMessages:errors.extractingPages', 'خطأ في استخراج الصفحات'));
    } finally {
      setIsExtractingPages(false);
      hideLoading();
    }
  };
  
  // Handle page selection
  const handleSelectPage = (page) => {
    setSelectedPage(page);
    setPageSenders([]);
    setSelectedSenders([]);
  };
  
  // Handle extracting senders
  const handleExtractSenders = async () => {
    if (!selectedPage) {
      message.warning(t('pageMessages:sendersList.selectPageFirst', 'الرجاء تحديد صفحة أولاً'));
      return;
    }
    
    try {
      setIsLoadingSenders(true);
      showLoading();
      message.loading(t('pageMessages:sendersList.extractingMessage', 'جاري استخراج المراسلين...'), 1);
      
      // Create a properly encoded URL for the GET request
      const pageId = encodeURIComponent(selectedPage.id);
      const pageName = encodeURIComponent(selectedPage.name);
      const accessToken = encodeURIComponent(selectedPage.accessToken);
      
      debugLog('Extracting senders with pageId:', pageId);
      
      // Try POST first, and if it fails (with network error), fall back to GET
      let response;
      try {
        // Make API call using POST (preferred for long tokens)
        response = await axios.post('/api/pagemessages/extract-senders', {
          pageId: selectedPage.id,
          pageName: selectedPage.name,
          accessToken: selectedPage.accessToken
        });
      } catch (postError) {
        debugLog('POST request failed, trying GET:', postError);
        
        // Fall back to GET with properly encoded parameters
        response = await axios.get(
          `/api/pagemessages/extract-senders?pageId=${pageId}&pageName=${pageName}&accessToken=${accessToken}`
        );
      }
      
      // Process response
      if (response.data && response.data.data && response.data.data.senders) {
        setPageSenders(response.data.data.senders);
        
        if (response.data.data.senders.length > 0) {
          message.success(t('pageMessages:sendersList.extractSuccess', { count: response.data.data.senders.length }, `تم استخراج ${response.data.data.senders.length} مراسل بنجاح`));
        } else {
          message.info(t('pageMessages:sendersList.noSenders', 'لم يتم العثور على مراسلين'));
        }
      } else {
        // If senders are directly in the data array (old API format)
        setPageSenders(response.data.data);
        
        if (response.data.data.length > 0) {
          message.success(t('common:success', 'تمت العملية بنجاح'));
        } else {
          message.info(t('pageMessages:sendersList.noSenders', 'لم يتم العثور على مراسلين'));
        }
      }
      
      hideLoading();
      setIsLoadingSenders(false);
    } catch (error) {
      debugLog('Error extracting senders:', error);
      
      // Provide more detailed error message when available
      const errorMessage = error.response?.data?.message || t('pageMessages:errors.extractingSenders', 'خطأ في استخراج المراسلين');
      message.error(errorMessage);
      
      hideLoading();
      setIsLoadingSenders(false);
    }
  };
  
  // Handle sender selection change
  const handleSendersChange = (senders) => {
    setSelectedSenders(senders);
  };
  
  // Render help drawer content
  const renderHelpContent = () => {
    return (
      <div className="help-content" style={{ padding: '0 10px' }}>
        <Title level={3} style={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: '10px',
          color: '#1890ff',
          fontSize: '22px'
        }}>
          <BulbOutlined /> {t('common:helpGuide', 'دليل المساعدة')}
        </Title>
        
        <Divider style={{ margin: '16px 0 24px' }} />
        
        <div className="help-section" style={{ marginBottom: '28px' }}>
          <Title level={4} style={{ 
            color: '#1890ff', 
            fontSize: '18px',
            marginBottom: '12px' 
          }}>{t('pageMessages:pages.title', 'الصفحات')}</Title>
          <Paragraph style={{ 
            fontSize: '15px',
            lineHeight: '1.6',
            color: '#333'
          }}>
            {t('pageMessages:pages.helpText', 'تحتاج إلى استخراج وتحديد صفحة فيسبوك تديرها. سيقوم التطبيق بجلب جميع الصفحات التي لديك حق الوصول إليها.')}
          </Paragraph>
          <ul style={{ paddingLeft: '20px' }}>
            <li style={{ margin: '8px 0', fontSize: '14px' }}>{t('pageMessages:pages.helpStep1', 'انقر على "استخراج الصفحات" لجلب الصفحات المتاحة')}</li>
            <li style={{ margin: '8px 0', fontSize: '14px' }}>{t('pageMessages:pages.helpStep2', 'حدد صفحة ترغب في إرسال رسائل منها')}</li>
          </ul>
        </div>
        
        <Divider style={{ margin: '24px 0' }} />
        
        <div className="help-section" style={{ marginBottom: '28px' }}>
          <Title level={4} style={{ 
            color: '#1890ff', 
            fontSize: '18px',
            marginBottom: '12px' 
          }}>{t('pageMessages:sendersList.title', 'قائمة المراسلين')}</Title>
          <Paragraph style={{ 
            fontSize: '15px',
            lineHeight: '1.6',
            color: '#333'
          }}>
            {t('pageMessages:sendersList.helpText', 'الخطوة الأخيرة هي استخراج وتحديد المستلمين الذين راسلوا صفحتك سابقًا. هؤلاء هم الأشخاص الذين يمكنك إرسال رسائل إليهم.')}
          </Paragraph>
          <ul style={{ paddingLeft: '20px' }}>
            <li style={{ margin: '8px 0', fontSize: '14px' }}>{t('pageMessages:sendersList.helpStep1', 'انقر على "استخراج المراسلين" لجلب الأشخاص الذين راسلوا صفحتك')}</li>
            <li style={{ margin: '8px 0', fontSize: '14px' }}>{t('pageMessages:sendersList.helpStep2', 'حدد مستلمًا واحدًا أو أكثر لرسائلك')}</li>
            <li style={{ margin: '8px 0', fontSize: '14px' }}>{t('pageMessages:sendersList.helpStep3', 'يمكنك البحث وتصفية القائمة للعثور على أشخاص محددين')}</li>
          </ul>
        </div>
        
        <Divider style={{ margin: '24px 0' }} />
        
        <div className="help-section" style={{ marginBottom: '28px' }}>
          <Title level={4} style={{ 
            color: '#1890ff', 
            fontSize: '18px',
            marginBottom: '12px' 
          }}>{t('pageMessages:tabs.composer', 'محرر الرسائل')}</Title>
          <Paragraph style={{ 
            fontSize: '15px',
            lineHeight: '1.6',
            color: '#333'
          }}>
            {t('pageMessages:composer.helpText', 'يتيح لك محرر الرسائل إنشاء وإرسال رسائل فورية إلى المستلمين المحددين.')}
          </Paragraph>
          <ul style={{ paddingLeft: '20px' }}>
            <li style={{ margin: '8px 0', fontSize: '14px' }}>{t('pageMessages:composer.helpStep1', 'اختر نوع الرسالة (نص، صورة، فيديو، أو أزرار)')}</li>
            <li style={{ margin: '8px 0', fontSize: '14px' }}>{t('pageMessages:composer.helpStep2', 'قم بكتابة محتوى رسالتك')}</li>
            <li style={{ margin: '8px 0', fontSize: '14px' }}>{t('pageMessages:composer.helpStep3', 'استخدم علامات التخصيص إذا لزم الأمر')}</li>
            <li style={{ margin: '8px 0', fontSize: '14px' }}>{t('pageMessages:composer.helpStep4', 'قم بتكوين إعدادات التأخير لمستلمين متعددين')}</li>
            <li style={{ margin: '8px 0', fontSize: '14px' }}>{t('pageMessages:composer.helpStep5', 'أرسل رسالتك')}</li>
          </ul>
        </div>
        
        <Divider style={{ margin: '24px 0' }} />
        
        <div className="help-section" style={{ marginBottom: '28px' }}>
          <Title level={4} style={{ 
            color: '#1890ff', 
            fontSize: '18px',
            marginBottom: '12px' 
          }}>{t('pageMessages:tabs.campaigns', 'الحملات')}</Title>
          <Paragraph style={{ 
            fontSize: '15px',
            lineHeight: '1.6',
            color: '#333'
          }}>
            {t('pageMessages:campaigns.helpText', 'يتيح لك مدير الحملات جدولة الرسائل ليتم إرسالها لاحقًا في تاريخ ووقت محددين.')}
          </Paragraph>
          <ul style={{ paddingLeft: '20px' }}>
            <li style={{ margin: '8px 0', fontSize: '14px' }}>{t('pageMessages:campaigns.helpStep1', 'قم بإنشاء حملة جديدة')}</li>
            <li style={{ margin: '8px 0', fontSize: '14px' }}>{t('pageMessages:campaigns.helpStep2', 'قم بتكوين تفاصيل الحملة ومحتوى الرسالة')}</li>
            <li style={{ margin: '8px 0', fontSize: '14px' }}>{t('pageMessages:campaigns.helpStep3', 'حدد المستلمين')}</li>
            <li style={{ margin: '8px 0', fontSize: '14px' }}>{t('pageMessages:campaigns.helpStep4', 'قم بتعيين خيارات التأخير إذا كنت ترسل إلى مستلمين متعددين')}</li>
            <li style={{ margin: '8px 0', fontSize: '14px' }}>{t('pageMessages:campaigns.helpStep5', 'قم بجدولة الحملة')}</li>
          </ul>
        </div>
      </div>
    );
  };
  
  // Main render function
  return (
    <Content className="page-message-management-container" style={{ 
      padding: '24px',
      background: '#f5f7fa',
      minHeight: 'calc(100vh - 64px)'
    }}>
      
      <Row gutter={[24, 24]}>
        {/* Top Row - Pages and Senders side by side */}
        <Col xs={24}>
          <Row gutter={[24, 24]}>
            {/* Facebook Pages Section - Left Side */}
            <Col md={12} xs={24}>
              <Card
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <DashboardOutlined style={{ color: '#1890ff', fontSize: '18px' }} />
                    <span style={{ fontSize: '16px', fontWeight: 600 }}>
                      {t('pageMessages:pages.title', 'الصفحات')}
                    </span>
                  </div>
                }
                style={{ 
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.09)',
                  height: '100%'
                }}
              >
                <PageExtractor
                  activeAccessToken={activeAccessToken}
                  pages={pages}
                  selectedPage={selectedPage}
                  onExtractPages={handleExtractPages}
                  onSelectPage={handleSelectPage}
                  isExtracting={isExtractingPages}
                />
              </Card>
            </Col>
            
            {/* Senders Selection Section - Right Side */}
            <Col md={12} xs={24}>
              <Card
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <TeamOutlined style={{ color: '#1890ff', fontSize: '18px' }} />
                    <span style={{ fontSize: '16px', fontWeight: 600 }}>
                      {t('pageMessages:sendersList.title', 'قائمة المراسلين')}
                    </span>
                  </div>
                }
                style={{ 
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.09)',
                  height: '100%'
                }}
              >
                {!selectedPage ? (
                  <Alert
                    message={t('pageMessages:sendersList.selectPageFirst', 'يرجى تحديد صفحة أولاً')}
                    type="info"
                    showIcon
                    style={{ marginBottom: '16px' }}
                  />
                ) : (
                  <PageSendersList
                    selectedPage={selectedPage}
                    pageSenders={pageSenders}
                    selectedSenders={selectedSenders}
                    onExtractSenders={handleExtractSenders}
                    onSendersChange={handleSendersChange}
                    isLoading={isLoadingSenders}
                  />
                )}
              </Card>
            </Col>
          </Row>
        </Col>
        
        {/* Message Management Tabs - Only Messaging and Campaigns */}
        <Col xs={24}>
          <Card
            style={{ 
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.09)'
            }}
          >
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                {
                  key: 'messaging',
                  label: (
                    <span style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      fontSize: '14px'
                    }}>
                      <SendOutlined />
                      {t('pageMessages:tabs.composer', 'إرسال رسائل فوري')}
                    </span>
                  ),
                  children: (
                    <div style={{ padding: '16px 0' }}>
                      {!selectedPage || selectedSenders.length === 0 ? (
                        <Alert
                          message={t('composer.needPageAndSenders', 'تحتاج إلى تحديد صفحة ومستلم واحد على الأقل')}
                          description={
                            !selectedPage 
                              ? t('composer.selectPageFirst', 'يرجى تحديد صفحة أولاً') 
                              : t('composer.selectSendersFirst', 'يرجى تحديد مستلم واحد على الأقل')
                          }
                          type="info"
                          showIcon
                          style={{ marginBottom: '16px' }}
                        />
                      ) : (
                        <MessageComposer
                          selectedPage={selectedPage}
                          selectedSenders={selectedSenders}
                          onSendersChange={handleSendersChange}
                          allSenders={pageSenders}
                        />
                      )}
                    </div>
                  ),
                },
                {
                  key: 'campaigns',
                  label: (
                    <span style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      fontSize: '14px'
                    }}>
                      <ScheduleOutlined />
                      {t('pageMessages:tabs.campaigns', 'الحملات المجدولة')}
                    </span>
                  ),
                  children: (
                    <div style={{ padding: '16px 0' }}>
                      {!selectedPage ? (
                        <Alert
                          message="تحتاج إلى تحديد صفحة"
                          description="يرجى تحديد صفحة أولاً قبل إنشاء حملة"
                          type="info"
                          showIcon
                          style={{ marginBottom: '16px' }}
                        />
                      ) : (
                        <CampaignManager
                          selectedPage={selectedPage}
                          pageSenders={pageSenders}
                        />
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
      
      {/* Help Drawer */}
      <Drawer
        title={
          <span style={{ 
            fontSize: '18px', 
            fontWeight: 600,
            color: '#1890ff',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <BulbOutlined /> {t('common:helpAndGuide', 'دليل المساعدة')}
          </span>
        }
        placement={isRTL ? 'left' : 'right'}
        onClose={() => setShowHelp(false)}
        open={showHelp}
        width={600}
        styles={{ 
          wrapper: { maxWidth: '100%' },
          body: { padding: '20px 24px' },
          header: { 
            padding: '16px 24px',
            borderBottom: '1px solid #f0f0f0'
          },
          content: {
            boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.1)'
          }
        }}
      >
        {renderHelpContent()}
      </Drawer>
    </Content>
  );
};

export default PageMessageManagement;