import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Checkbox, Alert } from 'antd';
import { 
  UserOutlined, 
  LockOutlined, 
  EyeOutlined, 
  EyeInvisibleOutlined, 
  CheckCircleOutlined,
  LoginOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { useMessage } from '../../context/MessageContext';
import api from '../../utils/api';
import './Auth.css';

const Login = () => {
  const [form] = Form.useForm();
  const { login } = useUser();
  const { showSuccess, showError } = useMessage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formTouched, setFormTouched] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);

  useEffect(() => {
    // Add form change listener to track if form has been touched
    const subscription = form.getFieldsValue;
    return () => {
      // Cleanup function
    };
  }, [form]);

  const onFormValuesChange = () => {
    if (!formTouched) {
      setFormTouched(true);
    }
    // Clear error when user makes changes after an error
    if (error) {
      setError('');
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    setError('');
    try {
      // Make API call to authenticate
      const response = await api.post('/users/login', {
        loginIdentifier: values.username,  // Using loginIdentifier as backend supports flexible login
        password: values.password
      });
      
      // Extract user data and token
      const userData = response.data;
      
      // Reset login attempts counter on success
      setLoginAttempts(0);
      
      // Store token separately for API interceptor
      localStorage.setItem('token', userData.token);
      
      // Call context login function with user data
      login(userData);
      
      // Show success notification
      showSuccess('تم تسجيل الدخول بنجاح!', 2);
      
      // Navigate to dashboard on success
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    } catch (err) {
      console.error('Login error:', err);
      
      // Increment login attempts counter
      setLoginAttempts(prev => prev + 1);
      
      // Handle specific error types
      const errorMessage = err.response?.data?.message || 'فشل تسجيل الدخول. الرجاء التحقق من بيانات الاعتماد الخاصة بك.';
      
      // Set error in form for display
      setError(errorMessage);
      
      // Show error notification with longer duration for incorrect credentials
      showError(errorMessage, 6);
      
      // Force focus on username field after error
      setTimeout(() => {
        form.getFieldInstance('username')?.focus();
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  const handleFieldValidation = (_, value) => {
    if (!value) {
      return Promise.reject('هذا الحقل مطلوب');
    }
    return Promise.resolve();
  };

  // Function to render a more prominent error message
  const renderErrorMessage = () => {
    if (!error) return null;
    
    return (
      <Alert
        message="خطأ في تسجيل الدخول"
        description={error}
        type="error"
        showIcon
        icon={<WarningOutlined />}
        className="auth-error-alert"
        closable
        onClose={() => setError('')}
      />
    );
  };

  return (
    <div className="auth-page">
        <div className="auth-background">
          <div className="bg-gradient-1"></div>
          <div className="bg-gradient-2"></div>
          <div className="bg-gradient-3"></div>
          <div className="bg-pattern"></div>
          <div className="geometric-shapes">
            <div className="shape shape-1"></div>
            <div className="shape shape-2"></div>
            <div className="shape shape-3"></div>
            <div className="shape shape-4"></div>
          </div>
          <div className="floating-particles">
            <div className="particle"></div>
            <div className="particle"></div>
            <div className="particle"></div>
            <div className="particle"></div>
            <div className="particle"></div>
          </div>
          <div className="wave-container">
            <div className="wave wave-1"></div>
            <div className="wave wave-2"></div>
            <div className="wave wave-3"></div>
          </div>
        </div>

      <div className="auth-container" tabIndex={0}>
        {/* Brand Section */}
        <div className="auth-brand-section">
          <div className="auth-brand-content">
            <div className="auth-brand-logo">
              <div className="auth-brand-logo-inner"></div>
            </div>
            <h2 className="auth-brand-title">منصة أدوات التواصل الاجتماعي</h2>
            <p className="auth-brand-subtitle">أتمتة وجودك على وسائل التواصل الاجتماعي وتبسيط سير العمل مع أدواتنا القوية</p>
            
            <div className="auth-brand-features">
              <div className="auth-brand-feature">
                <CheckCircleOutlined />
                <span>نشر وجدولة آلي للمحتوى</span>
              </div>
              <div className="auth-brand-feature">
                <CheckCircleOutlined />
                <span>أدوات استخراج محتوى المجموعات</span>
              </div>
              <div className="auth-brand-feature">
                <CheckCircleOutlined />
                <span>لوحة تحليلات متقدمة</span>
              </div>
              <div className="auth-brand-feature">
                <CheckCircleOutlined />
                <span>توصيات ذكية للمحتوى</span>
              </div>
            </div>
          </div>

          <div className="auth-brand-circles">
            <div className="auth-brand-circle auth-brand-circle-1"></div>
            <div className="auth-brand-circle auth-brand-circle-2"></div>
            <div className="auth-brand-circle auth-brand-circle-3"></div>
            <div className="auth-brand-wave"></div>
          </div>

          <div className="auth-testimonial">
            <div className="auth-testimonial-content">
              المنصة الأكثر شمولاً لإدارة وسائل التواصل الاجتماعي. تبسيط سير العمل من خلال أدوات الأتمتة القوية والتحليلات المتقدمة لتحقيق أقصى استفادة من وجودك على الإنترنت.
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="auth-form-section">
          <div className="auth-content">
            <div className="auth-header">
              <h1 className="auth-title">مرحباً بعودتك!</h1>
              <p className="auth-subtitle">أدخل بيانات الاعتماد الخاصة بك للوصول إلى حسابك ومواصلة رحلتك</p>
            </div>

            {/* Enhanced error display */}
            {renderErrorMessage()}

            <Form
              form={form}
              name="login"
              className="auth-form"
              initialValues={{ remember: true }}
              onFinish={onFinish}
              onValuesChange={onFormValuesChange}
            >
              <div className="auth-form-item">
                <label className="auth-label">
                  اسم المستخدم أو البريد الإلكتروني <span className="required-mark">*</span>
                </label>
                <div className="auth-input-container">
                  <Form.Item
                    name="username"
                    rules={[
                      { validator: handleFieldValidation }, 
                      { min: 3, message: 'اسم المستخدم/البريد الإلكتروني يجب أن يكون 3 أحرف على الأقل' }
                    ]}
                    style={{ marginBottom: 0 }}
                    validateStatus={error ? 'error' : ''}
                  >
                    <Input
                      className={`auth-input ${error ? 'auth-input-error' : ''}`}
                      placeholder="أدخل اسم المستخدم أو البريد الإلكتروني"
                      prefix={<UserOutlined className={`auth-input-icon ${error ? 'auth-input-icon-error' : ''}`} />}
                      autoComplete="username"
                    />
                  </Form.Item>
                </div>
              </div>

              <div className="auth-form-item">
                <label className="auth-label">
                  كلمة المرور <span className="required-mark">*</span>
                </label>
                <div className="auth-input-container">
                  <Form.Item
                    name="password"
                    rules={[{ validator: handleFieldValidation }]}
                    style={{ marginBottom: 0 }}
                    validateStatus={error ? 'error' : ''}
                  >
                    <Input
                      className={`auth-input ${error ? 'auth-input-error' : ''}`}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="أدخل كلمة المرور"
                      prefix={<LockOutlined className={`auth-input-icon ${error ? 'auth-input-icon-error' : ''}`} />}
                      autoComplete="current-password"
                    />
                  </Form.Item>
                  <div className="password-toggle" onClick={togglePasswordVisibility}>
                    {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  </div>
                </div>
              </div>

              {/* Show more guidance if multiple failed attempts */}
              {loginAttempts > 1 && (
                <div className="login-attempts-warning">
                  <WarningOutlined /> بعد عدة محاولات فاشلة، تأكد من:
                  <ul>
                    <li>كتابة اسم المستخدم أو البريد الإلكتروني بشكل صحيح</li>
                    <li>التأكد من كلمة المرور وحالة الأحرف (كبيرة/صغيرة)</li>
                    <li>التأكد من أن لديك حساب مسجل بالفعل</li>
                  </ul>
                </div>
              )}

              <div className="auth-options">
                <Form.Item name="remember" valuePropName="checked" noStyle>
                  <div className="auth-checkbox-container">
                    <Checkbox className="auth-checkbox" id="remember-me" defaultChecked={true} />
                    <label htmlFor="remember-me" className="auth-checkbox-label">تذكرني</label>
                  </div>
                </Form.Item>
                <Link to="/forgot-password" className="auth-forgot-link">نسيت كلمة المرور؟</Link>
              </div>

              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  className={`auth-button ${loading ? 'auth-button-loading' : ''} ${error ? 'auth-button-error' : ''}`}
                  disabled={loading}
                  icon={<LoginOutlined />}
                >
                  {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
                </Button>
              </Form.Item>
            </Form>

            <div className="auth-alt-action">
              <span className="auth-alt-text">ليس لديك حساب؟ </span>
              <Link to="/register" className="auth-alt-link">إنشاء حساب جديد</Link>
            </div>

            <div className="auth-terms">
              من خلال تسجيل الدخول، فإنك توافق على <Link to="/terms">شروط الخدمة</Link> و <Link to="/privacy">سياسة الخصوصية</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;