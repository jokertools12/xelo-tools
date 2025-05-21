import React, { useState } from 'react';
import { Form, Input, Button, Checkbox, Alert } from 'antd';
import { 
  UserOutlined, 
  MailOutlined, 
  LockOutlined, 
  EyeOutlined, 
  EyeInvisibleOutlined, 
  CheckCircleOutlined, 
  CheckOutlined, 
  CloseOutlined,
  UserAddOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { useMessage } from '../../context/MessageContext';
import api from '../../utils/api';
import './Auth.css';

const Register = () => {
  const [form] = Form.useForm();
  const { login } = useUser();
  const { showSuccess, showError } = useMessage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [registerAttempts, setRegisterAttempts] = useState(0);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const onFormValuesChange = () => {
    // Clear error when user makes changes after an error
    if (error) {
      setError('');
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    setError('');
    setRegisterAttempts(prev => prev + 1);
    
    try {
      // Make API call to register endpoint
      const response = await api.post('/users/register', {
        name: values.fullName,
        username: values.username,
        email: values.email,
        password: values.password
      });
      
      // Extract user data and token
      const userData = response.data;
      
      // Reset register attempts counter on success
      setRegisterAttempts(0);
      
      // Store token for API interceptor
      localStorage.setItem('token', userData.token);
      
      // Call context login function with user data
      login(userData);
      
      // Show success notification
      showSuccess('تم تسجيل حساب جديد بنجاح!', 3);
      
      // Navigate to dashboard after short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    } catch (err) {
      console.error('Registration error:', err);
      
      // Handle specific error message from backend
      const errorMessage = err.response?.data?.message || 'فشل التسجيل. الرجاء المحاولة مرة أخرى.';
      
      // Set error for display in form
      setError(errorMessage);
      
      // Also show error notification
      showError(errorMessage, 6);
      
      // Force focus on first field after error
      setTimeout(() => {
        form.getFieldInstance('fullName')?.focus();
      }, 100);
      
      // Handle specific validation errors if available
      if (err.response?.data?.errors) {
        const errorFields = err.response.data.errors;
        const fieldErrors = {};
        
        // Map backend errors to form fields
        Object.keys(errorFields).forEach(field => {
          fieldErrors[field] = {
            name: field,
            errors: [errorFields[field].message]
          };
        });
        
        // Set errors on form fields
        form.setFields(Object.values(fieldErrors));
      }
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = e => {
    const value = e.target.value;
    setPassword(value);
    
    // Calculate password strength (0-4)
    let strength = 0;
    if (value.length >= 8) strength++;
    if (/[A-Z]/.test(value)) strength++;
    if (/[a-z]/.test(value)) strength++;
    if (/[0-9]/.test(value)) strength++;
    if (/[^A-Za-z0-9]/.test(value)) strength++;
    
    setPasswordStrength(strength);
  };

  const getStrengthInfo = () => {
    const levels = [
      { text: 'ضعيفة جداً', class: 'strength-level-0' },
      { text: 'ضعيفة', class: 'strength-level-1' },
      { text: 'متوسطة', class: 'strength-level-2' },
      { text: 'قوية', class: 'strength-level-3' },
      { text: 'قوية جداً', class: 'strength-level-4' }
    ];
    
    // Ensure index is within bounds
    const index = Math.min(Math.max(passwordStrength, 0), 4);
    return levels[index];
  };

  // Function to render a more prominent error message
  const renderErrorMessage = () => {
    if (!error) return null;
    
    return (
      <Alert
        message="خطأ في التسجيل"
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
        <div className="bg-pattern"></div>
        <div className="floating-particles">
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
        </div>
      </div>

      <div className="auth-container" tabIndex={0}>
        {/* Brand Section */}
        <div className="auth-brand-section">
          <div className="auth-brand-content">
            <div className="auth-brand-logo">
              <div className="auth-brand-logo-inner"></div>
            </div>
            <h2 className="auth-brand-title">انضم إلى منصتنا</h2>
            <p className="auth-brand-subtitle">قم بإنشاء حسابك والوصول إلى أدوات قوية لتعزيز وجودك على وسائل التواصل الاجتماعي وأتمتة سير العمل اليومي</p>
            
            <div className="auth-brand-features">
              <div className="auth-brand-feature">
                <CheckCircleOutlined />
                <span>واجهة سهلة الاستخدام</span>
              </div>
              <div className="auth-brand-feature">
                <CheckCircleOutlined />
                <span>أدوات أتمتة متطورة</span>
              </div>
              <div className="auth-brand-feature">
                <CheckCircleOutlined />
                <span>تحليلات ورؤى مفصلة</span>
              </div>
              <div className="auth-brand-feature">
                <CheckCircleOutlined />
                <span>دعم عملاء مخصص على مدار الساعة</span>
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
              منصة متكاملة لإدارة وسائل التواصل الاجتماعي بكفاءة عالية. أدوات متطورة للأتمتة والجدولة والتحليل تساعدك على تحقيق أقصى استفادة من تواجدك الرقمي وتعزيز تأثيرك على مختلف المنصات.
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="auth-form-section">
          <div className="auth-content">
            <div className="auth-header">
              <h1 className="auth-title">إنشاء حساب جديد</h1>
              <p className="auth-subtitle">انضم إلى آلاف المستخدمين الذين يحولون وجودهم على وسائل التواصل الاجتماعي</p>
            </div>

            {/* Enhanced error display */}
            {renderErrorMessage()}
            
            {/* Helpful guidance after multiple failed attempts */}
            {registerAttempts > 1 && !error && (
              <div className="login-attempts-warning">
                <div>للتسجيل بنجاح، تأكد من:</div>
                <ul>
                  <li>إدخال بريد إلكتروني صحيح غير مستخدم مسبقاً</li>
                  <li>اختيار اسم مستخدم فريد (غير مستخدم من قبل مستخدم آخر)</li>
                  <li>استخدام كلمة مرور قوية تطابق جميع المعايير</li>
                </ul>
              </div>
            )}

            <Form
              form={form}
              name="register"
              className="auth-form"
              onFinish={onFinish}
              onValuesChange={onFormValuesChange}
              scrollToFirstError
            >
              <div className="auth-form-item">
                <label className="auth-label">
                  الاسم الكامل <span className="required-mark">*</span>
                </label>
                <div className="auth-input-container">
                  <Form.Item
                    name="fullName"
                    rules={[
                      { required: true, message: 'الرجاء إدخال الاسم الكامل' },
                      { min: 3, message: 'يجب أن يكون الاسم 3 أحرف على الأقل' }
                    ]}
                    style={{ marginBottom: 0 }}
                    validateStatus={error ? 'error' : ''}
                    hasFeedback
                  >
                    <Input
                      className={`auth-input ${error ? 'auth-input-error' : ''}`}
                      placeholder="أدخل اسمك الكامل"
                      prefix={<UserOutlined className={`auth-input-icon ${error ? 'auth-input-icon-error' : ''}`} />}
                      autoComplete="name"
                    />
                  </Form.Item>
                </div>
              </div>

              <div className="auth-form-item">
                <label className="auth-label">
                  اسم المستخدم <span className="required-mark">*</span>
                </label>
                <div className="auth-input-container">
                  <Form.Item
                    name="username"
                    rules={[
                      { required: true, message: 'الرجاء اختيار اسم المستخدم' },
                      { min: 4, message: 'يجب أن يكون اسم المستخدم 4 أحرف على الأقل' },
                      { pattern: /^[a-zA-Z0-9_]+$/, message: 'اسم المستخدم يمكن أن يحتوي فقط على أحرف وأرقام وشرطات سفلية' }
                    ]}
                    style={{ marginBottom: 0 }}
                    validateStatus={error ? 'error' : ''}
                    hasFeedback
                  >
                    <Input
                      className={`auth-input ${error ? 'auth-input-error' : ''}`}
                      placeholder="اختر اسم مستخدم فريد"
                      prefix={<UserOutlined className={`auth-input-icon ${error ? 'auth-input-icon-error' : ''}`} />}
                      autoComplete="username"
                    />
                  </Form.Item>
                </div>
              </div>

              <div className="auth-form-item">
                <label className="auth-label">
                  البريد الإلكتروني <span className="required-mark">*</span>
                </label>
                <div className="auth-input-container">
                  <Form.Item
                    name="email"
                    rules={[
                      { required: true, message: 'الرجاء إدخال البريد الإلكتروني' },
                      { type: 'email', message: 'الرجاء إدخال بريد إلكتروني صحيح' }
                    ]}
                    style={{ marginBottom: 0 }}
                    validateStatus={error ? 'error' : ''}
                    hasFeedback
                  >
                    <Input
                      className={`auth-input ${error ? 'auth-input-error' : ''}`}
                      placeholder="أدخل بريدك الإلكتروني"
                      prefix={<MailOutlined className={`auth-input-icon ${error ? 'auth-input-icon-error' : ''}`} />}
                      autoComplete="email"
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
                    rules={[
                      { required: true, message: 'الرجاء إنشاء كلمة مرور قوية' },
                      { min: 8, message: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل' }
                    ]}
                    style={{ marginBottom: 0 }}
                    validateStatus={error ? 'error' : ''}
                    hasFeedback
                  >
                    <Input
                      className={`auth-input ${error ? 'auth-input-error' : ''}`}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="أنشئ كلمة مرور قوية"
                      prefix={<LockOutlined className={`auth-input-icon ${error ? 'auth-input-icon-error' : ''}`} />}
                      onChange={validatePassword}
                      autoComplete="new-password"
                    />
                  </Form.Item>
                  <div className="password-toggle" onClick={togglePasswordVisibility}>
                    {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  </div>
                </div>

                {password && (
                  <div className="password-strength-container">
                    <div className="strength-meter">
                      {[0, 1, 2, 3, 4].map(index => (
                        <div 
                          key={index} 
                          className={`strength-segment ${index <= passwordStrength - 1 ? getStrengthInfo().class : ''} ${index <= passwordStrength - 1 ? 'active' : ''}`} 
                        />
                      ))}
                    </div>
                    <div className={`strength-text ${getStrengthInfo().class}`}>
                      قوة كلمة المرور: {getStrengthInfo().text}
                    </div>

                    <div className="password-criteria">
                      <div className={`criteria-item ${password.length >= 8 ? 'met' : ''}`}>
                        {password.length >= 8 ? 
                          <CheckOutlined className="criteria-met" /> : 
                          <CloseOutlined />
                        }
                        <span>8 أحرف على الأقل</span>
                      </div>
                      <div className={`criteria-item ${/[A-Z]/.test(password) ? 'met' : ''}`}>
                        {/[A-Z]/.test(password) ? 
                          <CheckOutlined className="criteria-met" /> : 
                          <CloseOutlined />
                        }
                        <span>حرف كبير واحد على الأقل</span>
                      </div>
                      <div className={`criteria-item ${/[a-z]/.test(password) ? 'met' : ''}`}>
                        {/[a-z]/.test(password) ? 
                          <CheckOutlined className="criteria-met" /> : 
                          <CloseOutlined />
                        }
                        <span>حرف صغير واحد على الأقل</span>
                      </div>
                      <div className={`criteria-item ${/[0-9]/.test(password) ? 'met' : ''}`}>
                        {/[0-9]/.test(password) ? 
                          <CheckOutlined className="criteria-met" /> : 
                          <CloseOutlined />
                        }
                        <span>رقم واحد على الأقل</span>
                      </div>
                      <div className={`criteria-item ${/[^A-Za-z0-9]/.test(password) ? 'met' : ''}`}>
                        {/[^A-Za-z0-9]/.test(password) ? 
                          <CheckOutlined className="criteria-met" /> : 
                          <CloseOutlined />
                        }
                        <span>رمز خاص واحد على الأقل</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="auth-form-item">
                <label className="auth-label">
                  تأكيد كلمة المرور <span className="required-mark">*</span>
                </label>
                <div className="auth-input-container">
                  <Form.Item
                    name="confirmPassword"
                    dependencies={['password']}
                    rules={[
                      { required: true, message: 'الرجاء تأكيد كلمة المرور' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('password') === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('كلمات المرور غير متطابقة'));
                        },
                      }),
                    ]}
                    style={{ marginBottom: 0 }}
                    validateStatus={error ? 'error' : ''}
                    hasFeedback
                  >
                    <Input
                      className={`auth-input ${error ? 'auth-input-error' : ''}`}
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="أكد كلمة المرور"
                      prefix={<LockOutlined className={`auth-input-icon ${error ? 'auth-input-icon-error' : ''}`} />}
                      autoComplete="new-password"
                    />
                  </Form.Item>
                  <div className="password-toggle" onClick={toggleConfirmPasswordVisibility}>
                    {showConfirmPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  </div>
                </div>
              </div>

              <div className="auth-options">
                <Form.Item 
                  name="agreement" 
                  valuePropName="checked"
                  rules={[
                    { 
                      validator: (_, value) => 
                        value ? Promise.resolve() : Promise.reject(new Error('يجب الموافقة على الشروط وسياسة الخصوصية')) 
                    },
                  ]}
                  style={{ marginBottom: 0 }}
                >
                  <div className="auth-checkbox-container">
                    <Checkbox className="auth-checkbox" id="agreement" />
                    <label htmlFor="agreement" className="auth-checkbox-label">
                      أوافق على <Link to="/terms" className="auth-link">شروط الخدمة</Link> و <Link to="/privacy" className="auth-link">سياسة الخصوصية</Link>
                    </label>
                  </div>
                </Form.Item>
              </div>

              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  className={`auth-button ${loading ? 'auth-button-loading' : ''} ${error ? 'auth-button-error' : ''}`}
                  disabled={loading}
                  icon={<UserAddOutlined />}
                >
                  {loading ? 'جاري إنشاء الحساب...' : 'إنشاء حساب'}
                </Button>
              </Form.Item>
            </Form>

            <div className="auth-alt-action">
              <span className="auth-alt-text">لديك حساب بالفعل؟ </span>
              <Link to="/login" className="auth-alt-link">تسجيل الدخول</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;