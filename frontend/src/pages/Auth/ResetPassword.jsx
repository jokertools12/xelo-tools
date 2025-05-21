import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Alert } from 'antd';
import { LockOutlined, CheckCircleOutlined, ArrowLeftOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import './Auth.css';

const ResetPassword = () => {
  const [form] = Form.useForm();
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tokenIsValid, setTokenIsValid] = useState(true); // افتراض أن الرمز صالح حتى يتبين العكس

  // التحقق من صلاحية الرمز (اختياري)
  useEffect(() => {
    // للتبسيط، نتحقق فقط من وجود الرمز
    if (!token) {
      setTokenIsValid(false);
      setError('رمز إعادة تعيين كلمة المرور غير صالح أو منتهي الصلاحية.');
    }
  }, [token]);

  const onFinish = async (values) => {
    if (!token) {
      setError('رمز إعادة تعيين كلمة المرور مطلوب.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // إرسال طلب إعادة تعيين كلمة المرور
      await api.post(`/users/reset-password/${token}`, {
        password: values.password
      });
      
      // تعيين حالة النجاح
      setResetSuccess(true);
      
      // مسح النموذج
      form.resetFields();
      
    } catch (err) {
      console.error('Password reset error:', err);
      
      // معالجة رسائل الخطأ المختلفة
      const errorMessage = err.response?.data?.message || 'حدث خطأ أثناء إعادة تعيين كلمة المرور.';
      setError(errorMessage);
      
      // إذا كان الرمز غير صالح أو منتهي الصلاحية
      if (err.response?.status === 400) {
        setTokenIsValid(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const validatePassword = (_, value) => {
    if (!value) {
      return Promise.reject('كلمة المرور مطلوبة');
    }
    if (value.length < 6) {
      return Promise.reject('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل');
    }
    return Promise.resolve();
  };

  const validateConfirmPassword = (_, value) => {
    if (!value) {
      return Promise.reject('تأكيد كلمة المرور مطلوب');
    }
    if (value !== form.getFieldValue('password')) {
      return Promise.reject('كلمات المرور غير متطابقة');
    }
    return Promise.resolve();
  };

  // رسالة النجاح
  const renderSuccessMessage = () => (
    <div className="auth-success-message">
      <CheckCircleOutlined className="auth-success-icon" />
      <h3>تم إعادة تعيين كلمة المرور بنجاح</h3>
      <p>يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة.</p>
      <Button 
        type="primary" 
        className="auth-back-button" 
        onClick={() => navigate('/login')}
      >
        <ArrowLeftOutlined /> العودة إلى صفحة تسجيل الدخول
      </Button>
    </div>
  );

  // رسالة انتهاء صلاحية الرمز أو عدم صلاحيته
  const renderInvalidTokenMessage = () => (
    <div className="auth-error-message">
      <Alert
        message="رمز غير صالح"
        description="رمز إعادة تعيين كلمة المرور غير صالح أو منتهي الصلاحية. يرجى طلب رابط إعادة تعيين جديد."
        type="error"
        showIcon
        className="auth-error-alert"
      />
      <Button 
        type="primary" 
        className="auth-back-button" 
        onClick={() => navigate('/forgot-password')}
      >
        <ArrowLeftOutlined /> طلب رابط إعادة تعيين جديد
      </Button>
    </div>
  );

  // نموذج إعادة تعيين كلمة المرور
  const renderResetForm = () => (
    <>
      <div className="auth-header">
        <h1 className="auth-title">إعادة تعيين كلمة المرور</h1>
        <p className="auth-subtitle">الرجاء إدخال كلمة المرور الجديدة</p>
      </div>
      
      {error && (
        <Alert
          message="خطأ"
          description={error}
          type="error"
          showIcon
          className="auth-error-alert"
          closable
          onClose={() => setError('')}
        />
      )}
      
      <Form
        form={form}
        name="reset-password"
        className="auth-form"
        onFinish={onFinish}
      >
        <div className="auth-form-item">
          <label className="auth-label">
            كلمة المرور الجديدة <span className="required-mark">*</span>
          </label>
          <div className="auth-input-container">
            <Form.Item
              name="password"
              rules={[{ validator: validatePassword }]}
              style={{ marginBottom: 0 }}
            >
              <Input
                className="auth-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="أدخل كلمة المرور الجديدة"
                prefix={<LockOutlined className="auth-input-icon" />}
                autoComplete="new-password"
              />
            </Form.Item>
            <div className="password-toggle" onClick={togglePasswordVisibility}>
              {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            </div>
          </div>
        </div>
        
        <div className="auth-form-item">
          <label className="auth-label">
            تأكيد كلمة المرور <span className="required-mark">*</span>
          </label>
          <div className="auth-input-container">
            <Form.Item
              name="confirmPassword"
              rules={[{ validator: validateConfirmPassword }]}
              style={{ marginBottom: 0 }}
              dependencies={['password']}
            >
              <Input
                className="auth-input"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="تأكيد كلمة المرور الجديدة"
                prefix={<LockOutlined className="auth-input-icon" />}
                autoComplete="new-password"
              />
            </Form.Item>
            <div className="password-toggle" onClick={toggleConfirmPasswordVisibility}>
              {showConfirmPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            </div>
          </div>
        </div>
        
        <Form.Item>
          <Button 
            type="primary" 
            htmlType="submit" 
            className="auth-button"
            disabled={loading}
            loading={loading}
          >
            {loading ? 'جاري تحديث كلمة المرور...' : 'تحديث كلمة المرور'}
          </Button>
        </Form.Item>
      </Form>
      
      <div className="auth-alt-action">
        <span className="auth-alt-text">تذكرت كلمة المرور الحالية؟ </span>
        <Link to="/login" className="auth-alt-link">العودة إلى تسجيل الدخول</Link>
      </div>
    </>
  );

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
            <h2 className="auth-brand-title">Xelo Tools</h2>
            <p className="auth-brand-subtitle">أتمتة وجودك على وسائل التواصل الاجتماعي وتبسيط سير العمل مع أدواتنا القوية</p>
            
            <div className="auth-brand-features">
              <div className="auth-brand-feature">
                <span>نشر وجدولة آلي للمحتوى</span>
              </div>
              <div className="auth-brand-feature">
                <span>أدوات استخراج محتوى المجموعات</span>
              </div>
              <div className="auth-brand-feature">
                <span>لوحة تحليلات متقدمة</span>
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
              منصة متكاملة لإدارة حضورك على وسائل التواصل الاجتماعي بكفاءة وفعالية، مع أدوات ذكية تساعدك على تحقيق أهدافك بسرعة وسهولة.
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="auth-form-section">
          <div className="auth-content">
            {resetSuccess ? renderSuccessMessage() : 
             !tokenIsValid ? renderInvalidTokenMessage() : 
             renderResetForm()}
            
            <div className="auth-terms">
              من خلال استخدام هذه المنصة، فإنك توافق على <Link to="/terms">شروط الخدمة</Link> و <Link to="/privacy">سياسة الخصوصية</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;