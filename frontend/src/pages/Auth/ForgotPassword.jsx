import React, { useState } from 'react';
import { Form, Input, Button, Alert, Card, Divider, Space, Typography, message } from 'antd';
import { MailOutlined, ArrowLeftOutlined, CopyOutlined, SettingOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import './Auth.css';

const { Title, Text, Paragraph } = Typography;

const ForgotPassword = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');
  const [resetUrl, setResetUrl] = useState('');

  const onFinish = async (values) => {
    setLoading(true);
    setError('');
    
    try {
      // طلب إعادة تعيين كلمة المرور
      const response = await api.post('/users/forgot-password', {
        email: values.email
      });
      
      // تعيين حالة نجاح الإرسال
      setEmailSent(true);
      
      // تخزين رابط إعادة التعيين (للتطوير فقط)
      if (response.data.resetUrl) {
        setResetUrl(response.data.resetUrl);
      }
      
      // مسح النموذج
      form.resetFields();
      
    } catch (err) {
      // في الإنتاج، نعرض رسالة نجاح حتى في حالة الخطأ لمنع كشف وجود حسابات
      if (err.response?.status === 404) {
        // نجعل المستخدم يعتقد أن الطلب نجح لأسباب أمنية
        setEmailSent(true);
      } else {
        // عرض خطأ عام فقط إذا كان هناك مشكلة فنية حقيقية
        setError('حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى لاحقًا.');
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(resetUrl);
    message.success('تم نسخ الرابط بنجاح');
  };

  const renderForm = () => (
    <>
      <div className="auth-header">
        <h1 className="auth-title">نسيت كلمة المرور؟</h1>
        <p className="auth-subtitle">أدخل عنوان بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة المرور</p>
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
        name="forgot-password"
        className="auth-form"
        onFinish={onFinish}
      >
        <div className="auth-form-item">
          <label className="auth-label">
            البريد الإلكتروني <span className="required-mark">*</span>
          </label>
          <div className="auth-input-container">
            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'الرجاء إدخال البريد الإلكتروني' },
                { type: 'email', message: 'الرجاء إدخال بريد إلكتروني صالح' }
              ]}
              style={{ marginBottom: 0 }}
            >
              <Input
                className="auth-input"
                placeholder="أدخل بريدك الإلكتروني"
                prefix={<MailOutlined className="auth-input-icon" />}
                autoComplete="email"
              />
            </Form.Item>
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
            {loading ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}
          </Button>
        </Form.Item>
      </Form>
      
      <div className="auth-alt-action">
        <span className="auth-alt-text">تذكرت كلمة المرور؟ </span>
        <Link to="/login" className="auth-alt-link">العودة إلى تسجيل الدخول</Link>
      </div>
    </>
  );

  const renderSuccessMessage = () => (
    <div className="auth-success-container">
      <Alert
        message="تم إرسال تعليمات إعادة تعيين كلمة المرور"
        description={
          <div>
            <p>إذا كان البريد الإلكتروني مسجلاً لدينا، فستصلك تعليمات إعادة تعيين كلمة المرور.</p>
            <p>يرجى فحص بريدك الإلكتروني واتباع التعليمات لإعادة تعيين كلمة المرور الخاصة بك.</p>
          </div>
        }
        type="success"
        showIcon
        icon={<CheckCircleOutlined />}
        style={{ marginBottom: 20 }}
      />

      {/* قسم رابط إعادة التعيين - يظهر فقط في بيئة التطوير */}
      {process.env.NODE_ENV === 'development' && resetUrl && (
        <Card
          className="reset-link-card"
          title={
            <Space>
              <SettingOutlined />
              <span>رابط مباشر</span>
            </Space>
          }
          style={{ marginBottom: 20 }}
        >
          <Paragraph style={{ marginBottom: 16 }}>
            <Text type="secondary">
              هذا الرابط متاح فقط في بيئة التطوير. في بيئة الإنتاج، سيتم إرسال رابط إعادة تعيين كلمة المرور عبر البريد الإلكتروني.
            </Text>
          </Paragraph>
          
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
            <Input 
              value={resetUrl}
              readOnly
              dir="ltr"
              style={{ 
                flex: 1, 
                marginRight: 8,
                fontFamily: 'monospace',
                fontSize: '13px'
              }}
            />
            <Button 
              type="primary"
              icon={<CopyOutlined />}
              onClick={copyToClipboard}
            >
              نسخ
            </Button>
          </div>
        </Card>
      )}

      {/* قسم معلومات تكوين البريد الإلكتروني - يظهر فقط في بيئة التطوير */}
      {process.env.NODE_ENV === 'development' && (
        <Card
          className="email-config-card"
          title={
            <Space>
              <SettingOutlined />
              <span>إعدادات البريد الإلكتروني المطلوبة للإنتاج</span>
            </Space>
          }
          style={{ marginBottom: 20 }}
        >
          <Paragraph>
            <Text>
              لتمكين إرسال رسائل البريد الإلكتروني الحقيقية في بيئة الإنتاج، يجب تكوين المتغيرات البيئية التالية:
            </Text>
          </Paragraph>

          <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <ul style={{ paddingRight: 20, marginBottom: 0 }}>
              <li><Text code>SMTP_HOST</Text> - خادم SMTP (مثال: smtp.gmail.com)</li>
              <li><Text code>SMTP_PORT</Text> - منفذ SMTP (عادة 587 أو 465)</li>
              <li><Text code>SMTP_USER</Text> - اسم المستخدم/البريد الإلكتروني</li>
              <li><Text code>SMTP_PASSWORD</Text> - كلمة المرور أو رمز التطبيق</li>
              <li><Text code>EMAIL_FROM</Text> - عنوان "من" (مثال: no-reply@xelo.com)</li>
            </ul>
          </div>

          <Paragraph>
            <Text strong>مثال لملف .env:</Text>
          </Paragraph>
          
          <pre style={{ 
            background: '#f0f0f0', 
            padding: 12, 
            borderRadius: 4, 
            direction: 'ltr', 
            textAlign: 'left',
            fontFamily: 'monospace',
            fontSize: '12px'
          }}>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=no-reply@xelo.tools
          </pre>
        </Card>
      )}

      <Button 
        type="primary" 
        icon={<ArrowLeftOutlined />} 
        onClick={() => window.location.href = '/login'}
        style={{ marginTop: 8 }}
      >
        العودة إلى صفحة تسجيل الدخول
      </Button>
    </div>
  );

  return (
    <div className="auth-page">
      <div className="auth-background">
        <div className="bg-gradient-1"></div>
        <div className="bg-gradient-2"></div>
        <div className="bg-gradient-3"></div>
        <div className="bg-pattern"></div>
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
            {emailSent ? renderSuccessMessage() : renderForm()}
            
            <div className="auth-terms">
              من خلال استخدام هذه المنصة، فإنك توافق على <Link to="/terms">شروط الخدمة</Link> و <Link to="/privacy">سياسة الخصوصية</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;