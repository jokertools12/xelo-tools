import React, { useState, useEffect } from 'react';
import { 
  Input, Button, Form, Card, Layout, 
  Spin, Progress, Select, Empty, Popconfirm, Typography, Avatar, Badge
} from 'antd';
import { 
  CheckCircleOutlined, DeleteOutlined
} from '@ant-design/icons';
import { 
  FaShield, FaKey, FaFacebook, FaUser, FaInfoCircle, FaTrashAlt,
  FaCheckCircle, FaChevronDown, FaShieldAlt, FaLock, FaExclamationTriangle
} from 'react-icons/fa';
import { IoShieldCheckmark } from 'react-icons/io5';
import { RiShieldKeyholeLine, RiRefreshLine } from 'react-icons/ri';
import axios from 'axios';
import '../styles/GetAccessToken.css';
import { useMessage } from '../context/MessageContext';

const { Content } = Layout;
const { Option } = Select;
const { Title, Text } = Typography;

const GetAccessToken = () => {
  const { showSuccess, showError, showLoading, updateMessage } = useMessage();
  
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [accessTokens, setAccessTokens] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [tokensLoading, setTokensLoading] = useState(false);

  useEffect(() => {
    fetchAccessTokens();
  }, []);

  const fetchAccessTokens = async () => {
    try {
      setTokensLoading(true);
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      
      if (!userInfo || !userInfo.token) {
        showError('لم يتم العثور على معلومات المستخدم');
        return;
      }

      const { data } = await axios.get('/api/users/access-tokens', {
        headers: {
          Authorization: `Bearer ${userInfo.token}`
        }
      });

      setAccessTokens(data);
      
      // تحديد التوكن النشط إن وجد
      const activeToken = data.find(token => token.isActive);
      if (activeToken) {
        setSelectedToken(activeToken._id);
      }
    } catch (error) {
      // عرض رسالة خطأ للمستخدم دون الكشف عن التفاصيل الفنية
      showError('فشل في تحميل قائمة التوكنات');
    } finally {
      setTokensLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    setProgress(0);
    // رسالة لإظهار حالة البدء بالعملية
    const key = 'submitting';
    showLoading('جاري معالجة طلبك...', key);
    
    const { fa2, password, username } = values;
    const url = `/JokerApp/access-token-2FA.php?FA2=${fa2}&country=EG&password=${password}&username=${username}&clientCountry=EG&ip=`;

    try {
      // محاكاة عملية التحميل مع تقدم نسبة الإنجاز
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + Math.floor(Math.random() * 10);
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 300);
      
      // تأخير صغير لضمان ظهور رسالة التحميل بشكل واضح للمستخدم
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const response = await axios.get(url);
      const token = response.data;
      
      // إيقاف تقدم نسبة الإنجاز
      clearInterval(progressInterval);
      setProgress(100);
      
      // تحقق من وجود توكن فعلي تم استلامه
      if (token && token.trim() !== '') {
        // تعريف متغير fbName بقيمة افتراضية
        let fbName = 'غير معروف';
        
        // استخراج اسم المستخدم من Facebook عبر الوسيط (Proxy) لتجنب مشاكل CORS
        try {
          // استخدام وسيط الخادم الخلفي بدلاً من الاتصال المباشر بـ Facebook
          const proxyUrl = `/api/facebook/proxy?endpoint=/me&fields=id,name&accessToken=${encodeURIComponent(token)}`;
          
          // إجراء الطلب بدون تسجيل المعلومات الحساسة
          const graphResponse = await axios.get(proxyUrl);
          
          // استخلاص اسم المستخدم من استجابة Facebook
          if (graphResponse.data && graphResponse.data.name) {
            fbName = graphResponse.data.name;
          } else if (graphResponse.data) {
            // محاولة استخلاص الاسم من بيانات الاستجابة
            const responseStr = JSON.stringify(graphResponse.data);
            const nameMatch = responseStr.match(/"name":"([^"]+)"/);
            
            if (nameMatch && nameMatch[1]) {
              fbName = nameMatch[1];
            }
          }
        } catch (graphError) {
          // في حالة حدوث خطأ، نحتفظ بالقيمة الافتراضية للاسم ونستمر
        }
        
        // حفظ Access Token في قاعدة البيانات
        try {
          const userInfo = JSON.parse(localStorage.getItem('userInfo'));
          if (!userInfo || !userInfo.token) {
            showError('لم يتم العثور على معلومات المستخدم. يرجى تسجيل الدخول أولاً.');
            // إنهاء رسالة الانتظار
            updateMessage('error', 'لم يتم العثور على معلومات المستخدم', key);
            return;
          }
          
          // إرسال الطلب إلى الخادم دون تسجيل البيانات الحساسة
          const saveResponse = await axios.post('/api/users/save-access-token', {
            fbName: fbName,
            accessToken: token
          }, {
            headers: {
              Authorization: `Bearer ${userInfo.token}`
            }
          });
          
          // تحديث قائمة التوكنات بعد الإضافة
          await fetchAccessTokens();
          
          // إنهاء رسالة الانتظار وعرض رسالة النجاح
          updateMessage('success', 'تم الحصول على Access Token بنجاح', key);
        } catch (saveError) {
          // إظهار رسالة خطأ مناسبة للمستخدم
          let errorMessage = 'فشل في حفظ Access Token';
          
          // محاولة الحصول على رسالة خطأ أكثر تحديدًا من الخادم
          if (saveError.response && saveError.response.data && saveError.response.data.message) {
            errorMessage = saveError.response.data.message;
          }
          
          updateMessage('error', errorMessage, key);
        }
      } else {
        // في حالة عدم وجود توكن صالح (توكن فارغ مثلا)
        updateMessage('error', 'فشل في الحصول على Access Token - الاستجابة فارغة', key);
      }
    } catch (error) {
      // تحضير رسالة خطأ مناسبة للمستخدم
      let errorMessage = 'فشل الاتصال بالخادم';
      
      // محاولة استخراج رسالة خطأ أكثر تحديدًا
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // عرض رسالة الخطأ
      updateMessage('error', `خطأ في معالجة الطلب: ${errorMessage}`, key);
    } finally {
      setLoading(false);
    }
  };

  const handleTokenChange = async (tokenId) => {
    try {
      setSelectedToken(tokenId);
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      
      if (!userInfo || !userInfo.token) {
        showError('لم يتم العثور على معلومات المستخدم. يرجى تسجيل الدخول أولاً.');
        return;
      }
      
      await axios.patch(`/api/users/access-tokens/${tokenId}/set-active`, {}, {
        headers: {
          Authorization: `Bearer ${userInfo.token}`
        }
      });
      
      showSuccess('تم تفعيل التوكن بنجاح');
      
      // تحديث قائمة التوكنات
      await fetchAccessTokens();
    } catch (error) {
      // تحضير رسالة خطأ مناسبة
      let errorMessage = 'فشل في تفعيل التوكن';
      
      if (error.response?.data?.message) {
        errorMessage += ': ' + error.response.data.message;
      } else if (error.message) {
        errorMessage += ': ' + error.message;
      }
      
      showError(errorMessage);
    }
  };

  const handleDeleteToken = async (tokenId, e) => {
    // منع انتشار الحدث لتجنب فتح القائمة المنسدلة
    if (e) {
      e.stopPropagation();
    }
    
    try {
      setTokensLoading(true);
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      
      if (!userInfo || !userInfo.token) {
        showError('لم يتم العثور على معلومات المستخدم. يرجى تسجيل الدخول أولاً.');
        return;
      }
      
      await axios.delete(`/api/users/access-tokens/${tokenId}`, {
        headers: {
          Authorization: `Bearer ${userInfo.token}`
        }
      });
      
      showSuccess('تم حذف التوكن بنجاح');
      
      // إذا كان التوكن المحذوف هو المحدد حاليًا
      if (selectedToken === tokenId) {
        setSelectedToken(null);
      }
      
      // تحديث قائمة التوكنات
      await fetchAccessTokens();
    } catch (error) {
      // تحضير رسالة خطأ مناسبة
      let errorMessage = 'فشل في حذف التوكن';
      
      if (error.response?.data?.message) {
        errorMessage += ': ' + error.response.data.message;
      } else if (error.message) {
        errorMessage += ': ' + error.message;
      }
      
      showError(errorMessage);
    } finally {
      setTokensLoading(false);
    }
  };

  return (
    <Layout className="token-page-layout">
      <Content className="token-page-content">
        <div className="token-container">
          <div className="token-header">
            <Title level={2} className="main-title">
              <IoShieldCheckmark className="title-icon" /> إدارة Access Tokens
            </Title>
            <Text type="secondary" className="title-description">
              استخرج وأدر الـ Access Tokens الخاصة بحسابات Facebook بطريقة آمنة وسهلة
            </Text>
          </div>

          {/* قسم اختيار التوكن */}
          <Card 
            className="token-selection-card"
            title={
              <div className="card-title-container">
                <FaFacebook className="card-title-icon" />
                <span>اختر حسابًا للاستخدام</span>
              </div>
            }
            extra={
              <Button 
                type="primary"
                icon={<RiRefreshLine className="refresh-icon" />}
                onClick={fetchAccessTokens}
                loading={tokensLoading}
                size="middle"
                className="refresh-button"
                style={{ borderRadius: '8px', background: '#52c41a', borderColor: '#52c41a' }}
              >
                تحديث
              </Button>
            }
            variant="borderless"
            style={{ overflow: 'hidden' }}
          >
            {accessTokens.length === 0 ? (
              <Empty 
                image={Empty.PRESENTED_IMAGE_SIMPLE} 
                description={
                  <Text className="empty-text">
                    لا توجد حسابات محفوظة. قم باستخراج توكن جديد أدناه.
                  </Text>
                }
                style={{ margin: '24px 0' }}
              />
            ) : (
              <div style={{ padding: '12px 0' }}>
                <Select
                  className="token-select"
                  placeholder={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FaFacebook style={{ color: '#1877F2' }} />
                      <span>اختر حسابًا للاستخدام</span>
                    </div>
                  }
                  value={selectedToken}
                  onChange={handleTokenChange}
                  loading={tokensLoading}
                  optionLabelProp="label"
                  size="large"
                  popupClassName="token-dropdown"
                  suffixIcon={<FaChevronDown style={{ color: '#52c41a', fontSize: '12px' }} />}
                  notFoundContent={<Empty description="لم يتم العثور على حسابات" />}
                  style={{ width: '100%', borderRadius: '12px' }}
                  dropdownStyle={{ borderRadius: '12px', padding: '8px', boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)' }}
                >
                  {accessTokens.map(token => (
                    <Option 
                      key={token._id} 
                      value={token._id}
                      label={token.fbName}
                      className="token-option"
                    >
                      <div 
                        className="token-option-content"
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px',
                          borderRadius: '8px',
                          transition: 'all 0.3s ease',
                          background: token.isActive ? 'rgba(82, 196, 26, 0.05)' : 'transparent',
                          border: token.isActive ? '1px solid rgba(82, 196, 26, 0.2)' : '1px solid transparent'
                        }}
                      >
                        <div 
                          className="token-option-info"
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '12px' 
                          }}
                        >
                          <Avatar 
                            size="large" 
                            icon={token.isActive ? <FaCheckCircle /> : <FaUser />} 
                            className={`token-avatar ${token.isActive ? 'active' : ''}`}
                            style={{
                              background: token.isActive ? '#52c41a' : '#f0f0f0',
                              color: token.isActive ? 'white' : '#999'
                            }}
                          />
                          <div className="token-name-container">
                            <span 
                              className={`token-name ${token.isActive ? 'active-token' : ''}`}
                              style={{ 
                                fontWeight: token.isActive ? '600' : '400',
                                color: token.isActive ? '#52c41a' : '#333',
                                fontSize: '16px',
                                display: 'block',
                                marginBottom: '2px'
                              }}
                            >
                              {token.fbName || 'غير معروف'}
                            </span>
                            {token.isActive && (
                              <Badge 
                                status="success" 
                                text="نشط"
                                style={{ 
                                  background: 'rgba(82, 196, 26, 0.1)', 
                                  borderRadius: '4px',
                                  padding: '1px 8px'
                                }}
                              />
                            )}
                          </div>
                        </div>
                        <Popconfirm
                          title={
                            <div style={{ padding: '4px 0' }}>
                              <div style={{ fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FaExclamationTriangle style={{ color: '#ff4d4f' }} />
                                <span>حذف التوكن</span>
                              </div>
                              <div>هل أنت متأكد من حذف هذا التوكن؟</div>
                            </div>
                          }
                          onConfirm={(e) => handleDeleteToken(token._id, e)}
                          okText="نعم، حذف"
                          cancelText="إلغاء"
                          okButtonProps={{ danger: true }}
                          placement="left"
                          overlayClassName="delete-popconfirm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button 
                            type="text" 
                            danger 
                            icon={<FaTrashAlt className="delete-icon" />}
                            className="delete-button"
                            onClick={(e) => e.stopPropagation()}
                            title="حذف التوكن"
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          />
                        </Popconfirm>
                      </div>
                    </Option>
                  ))}
                </Select>
              </div>
            )}
          </Card>

          {/* قسم استخراج التوكن */}
          <Card 
            className="token-extraction-card"
            title={
              <div className="card-title-container">
                <RiShieldKeyholeLine className="card-title-icon" />
                <span>استخراج Access Token جديد</span>
              </div>
            }
            variant="borderless"
            style={{ borderTopWidth: '4px', borderTopColor: '#1890ff', overflow: 'hidden' }}
          >
            <Form
              form={form}
              onFinish={handleSubmit}
              layout="vertical"
              requiredMark="optional"
              className="token-form"
              size="large"
              autoComplete="off"
              style={{ padding: '16px 8px' }}
            >
              <div className="form-row">
                <Form.Item 
                  name="username" 
                  label={<span className="form-label">اسم المستخدم</span>}
                  rules={[{ required: true, message: 'يرجى إدخال اسم المستخدم!' }]}
                  className="form-item"
                >
                  <div className="custom-search-wrapper" style={{ position: 'relative' }}>
                    <div className="search-icon-container" style={{ 
                      position: 'absolute', 
                      right: '12px', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      zIndex: 2
                    }}>
                      <FaUser className="search-icon" style={{ color: '#1890ff' }} />
                    </div>
                    <Input
                      className="custom-search-input"
                      placeholder="أدخل اسم المستخدم"
                      autoComplete="new-username"
                      autoSave="off"
                      autoCorrect="off"
                      spellCheck={false}
                      autoFocus={false}
                      style={{ 
                        paddingRight: '40px', 
                        borderRadius: '8px',
                        height: '48px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                        border: '1px solid #e8e8e8'
                      }}
                    />
                  </div>
                </Form.Item>

                <Form.Item 
                  name="password" 
                  label={<span className="form-label">كلمة المرور</span>}
                  rules={[{ required: true, message: 'يرجى إدخال كلمة المرور!' }]}
                  className="form-item"
                >
                  <div className="custom-search-wrapper" style={{ position: 'relative' }}>
                    <div className="search-icon-container" style={{ 
                      position: 'absolute', 
                      right: '12px', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      zIndex: 2
                    }}>
                      <FaLock className="search-icon" style={{ color: '#1890ff' }} />
                    </div>
                    <Input.Password
                      className="custom-search-input"
                      placeholder="أدخل كلمة المرور"
                      autoComplete="new-password"
                      autoSave="off"
                      autoCorrect="off"
                      spellCheck={false}
                      style={{ 
                        paddingRight: '40px', 
                        borderRadius: '8px',
                        height: '48px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                        border: '1px solid #e8e8e8'
                      }}
                    />
                  </div>
                </Form.Item>
              </div>

              <Form.Item 
                name="fa2" 
                label={<span className="form-label">رمز المصادقة الثنائية (2FA)</span>}
                rules={[{ required: true, message: 'يرجى إدخال رمز المصادقة الثنائية!' }]}
                className="form-item-full"
              >
                <div className="custom-search-wrapper" style={{ position: 'relative' }}>
                  <div className="search-icon-container" style={{ 
                    position: 'absolute', 
                    right: '12px', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    zIndex: 2
                  }}>
                    <FaKey className="search-icon" style={{ color: '#1890ff' }} />
                  </div>
                  <Input
                    className="custom-search-input"
                    placeholder="أدخل رمز المصادقة الثنائية"
                    style={{ 
                      paddingRight: '40px', 
                      borderRadius: '8px',
                      height: '48px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                      border: '1px solid #e8e8e8'
                    }}
                  />
                </div>
              </Form.Item>
              
              {loading && (
                <div className="progress-container" style={{ 
                  padding: '16px', 
                  margin: '24px 0', 
                  borderRadius: '8px',
                  background: 'rgba(24, 144, 255, 0.05)',
                  border: '1px solid rgba(24, 144, 255, 0.1)'
                }}>
                  <Progress 
                    percent={progress} 
                    status="active" 
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                    className="styled-progress"
                  />
                  <div className="progress-text" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: '8px',
                    marginTop: '8px',
                    color: '#1890ff' 
                  }}>
                    <Spin size="small" /> جاري معالجة طلبك، يرجى الانتظار...
                  </div>
                </div>
              )}

              <Form.Item className="submit-container" style={{ marginTop: '28px' }}>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={loading}
                  disabled={loading}
                  className="submit-button"
                  block
                  style={{ 
                    height: '48px', 
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxShadow: '0 4px 12px rgba(24, 144, 255, 0.25)',
                    background: 'linear-gradient(to right, #1890ff, #40a9ff)'
                  }}
                >
                  {loading ? 'جاري معالجة الطلب...' : 'استخراج Access Token'}
                </Button>
              </Form.Item>
            </Form>
          </Card>
          
          {/* معلومات إضافية */}
          <Card 
            className="info-card" 
            variant="borderless"
            style={{ 
              background: 'rgba(246, 255, 237, 0.7)',
              borderRadius: '12px',
              borderRight: '4px solid #52c41a'
            }}
          >
            <div className="info-content" style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <FaShieldAlt className="info-icon" style={{ fontSize: '24px', color: '#52c41a' }} />
              <div>
                <Text strong className="info-title" style={{ display: 'block', marginBottom: '8px', fontSize: '16px' }}>ملاحظة أمنية:</Text>
                <Text className="info-text" style={{ color: '#5a6a85' }}>لحماية بياناتك، لا يتم عرض أو تخزين التوكنات بشكل مكشوف في النظام.</Text>
              </div>
            </div>
          </Card>
        </div>
      </Content>
    </Layout>
  );
};

export default GetAccessToken;