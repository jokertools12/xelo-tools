import React from 'react';
import { Button, Typography, Breadcrumb } from 'antd';
import { Link } from 'react-router-dom';
import { HomeOutlined, FileTextOutlined, ArrowRightOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import SEO from '../components/SEO';
import '../styles/legal.css';

const { Title, Paragraph, Text } = Typography;

const TermsOfService = () => {
  // Scroll to top on component mount
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="legal-page">
      <SEO title="شروط الخدمة" description="شروط الخدمة لمنصة Xelo Tools" />
      
      <div className="legal-background">
        <div className="legal-gradient-1"></div>
        <div className="legal-gradient-2"></div>
        <div className="legal-pattern"></div>
      </div>
      
      <div className="legal-container">
        <div className="legal-header">
          <Breadcrumb className="legal-breadcrumb" separator=">">
            <Breadcrumb.Item>
              <Link to="/">
                <HomeOutlined /> الرئيسية
              </Link>
            </Breadcrumb.Item>
            <Breadcrumb.Item>
              <FileTextOutlined /> شروط الخدمة
            </Breadcrumb.Item>
          </Breadcrumb>
          
          <Title level={1} className="legal-title">شروط الخدمة</Title>
          <Text className="legal-updated">آخر تحديث: 31 مارس 2025</Text>
        </div>
        
        <div className="legal-content">
          <section className="legal-section">
            <Title level={2} className="section-title">مقدمة وقبول</Title>
            <Paragraph className="rtl-text">
              مرحباً بك في منصة Xelo Tools. تنظم هذه الشروط والأحكام العلاقة بينك وبين منصتنا عند استخدامك لخدماتنا. باستخدامك للمنصة، فإنك توافق على الالتزام بهذه الشروط، لذا يرجى قراءتها بعناية. إذا كنت لا توافق على أي جزء من هذه الشروط، فيجب عليك عدم استخدام خدماتنا.
            </Paragraph>
          </section>
          
          <section className="legal-section">
            <Title level={2} className="section-title">وصف الخدمة</Title>
            <Paragraph className="rtl-text">
              توفر منصة Xelo Tools أدوات متطورة لإدارة وأتمتة وتحليل حضورك على منصات التواصل الاجتماعي. تتضمن خدماتنا، على سبيل المثال لا الحصر، جدولة المنشورات، وتحليل البيانات، واستخراج محتوى المجموعات، وإدارة الصفحات.
            </Paragraph>
            <Paragraph className="rtl-text">
              نحتفظ بالحق في تعديل أو إيقاف أو تغيير أي جانب من جوانب الخدمة في أي وقت، مع إشعار مسبق عندما يكون ذلك ممكنًا. كما نحتفظ بالحق في فرض قيود على استخدامك للخدمة إذا اعتقدنا أنك تسيء استخدامها.
            </Paragraph>
          </section>
          
          <section className="legal-section">
            <Title level={2} className="section-title">التسجيل والحسابات</Title>
            <Paragraph className="rtl-text">
              لاستخدام خدمات Xelo Tools، يجب عليك إنشاء حساب وتزويدنا بمعلومات دقيقة وكاملة ومحدثة. أنت مسؤول عن حماية بيانات تسجيل الدخول الخاصة بك والحفاظ على سرية كلمة المرور. أنت توافق على إخطارنا فورًا بأي استخدام غير مصرح به لحسابك.
            </Paragraph>
            <Paragraph className="rtl-text">
              نحتفظ بالحق في رفض تسجيل أي مستخدم أو إلغاء اشتراك أي حساب وفقًا لتقديرنا المطلق، خاصة في حالات انتهاك هذه الشروط أو سياسات المنصة.
            </Paragraph>
          </section>
          
          <section className="legal-section">
            <Title level={2} className="section-title">حقوق الملكية الفكرية</Title>
            <Paragraph className="rtl-text">
              جميع حقوق الملكية الفكرية المتعلقة بالمنصة وخدماتها، بما في ذلك النصوص والصور والرسومات والتصميمات والبرامج والشعارات، هي ملك للمنصة أو مرخصة لها. لا يُسمح باستنساخ أو توزيع أو تعديل أو نشر أي محتوى من المنصة دون إذن كتابي مسبق.
            </Paragraph>
            <Paragraph className="rtl-text">
              أنت تحتفظ بملكية المحتوى الذي تنشئه وتنشره عبر المنصة، ولكنك تمنحنا ترخيصًا عالميًا غير حصري قابل للتحويل لاستخدام هذا المحتوى لأغراض تقديم وتحسين خدماتنا.
            </Paragraph>
          </section>
          
          <section className="legal-section">
            <Title level={2} className="section-title">الاستخدام المقبول</Title>
            <Paragraph className="rtl-text">
              باستخدامك للمنصة، أنت توافق على عدم:
            </Paragraph>
            <ul className="legal-list rtl-text">
              <li>نشر أي محتوى غير قانوني أو ضار أو مسيء أو تمييزي</li>
              <li>انتهاك حقوق الآخرين، بما في ذلك حقوق الملكية الفكرية والخصوصية</li>
              <li>استخدام المنصة لإرسال رسائل غير مرغوب فيها أو محتوى احتيالي</li>
              <li>محاولة الوصول غير المصرح به إلى أنظمتنا أو حسابات المستخدمين الآخرين</li>
              <li>استخدام المنصة بطريقة تعطل أداءها أو تضر بتجربة المستخدمين الآخرين</li>
              <li>جمع معلومات المستخدمين بدون موافقتهم الصريحة</li>
            </ul>
          </section>
          
          <section className="legal-section">
            <Title level={2} className="section-title">حدود المسؤولية</Title>
            <Paragraph className="rtl-text">
              تُقدم المنصة "كما هي" و"كما هي متاحة" دون أي ضمانات من أي نوع، صريحة أو ضمنية. لا نضمن أن المنصة ستكون متاحة باستمرار أو خالية من الأخطاء أو آمنة.
            </Paragraph>
            <Paragraph className="rtl-text">
              إلى أقصى حد يسمح به القانون، لن نكون مسؤولين عن أي أضرار مباشرة أو غير مباشرة أو عرضية أو خاصة أو تبعية ناتجة عن استخدامك للمنصة أو عدم قدرتك على استخدامها.
            </Paragraph>
          </section>
          
          <section className="legal-section">
            <Title level={2} className="section-title">الدعم الفني والمساعدة</Title>
            <Paragraph className="rtl-text">
              توفر منصة Xelo Tools دعمًا فنيًا لجميع المستخدمين. إذا واجهت أي مشكلة أو كان لديك استفسار حول استخدام الخدمة، يمكنك فتح تذكرة دعم من خلال حسابك في المنصة.
            </Paragraph>
            <Paragraph className="rtl-text">
              يلتزم فريق الدعم الفني لدينا بالرد على استفساراتك في أقرب وقت ممكن، وسنبذل قصارى جهدنا لحل أي مشكلة تواجهها. تُعطى الأولوية للتذاكر حسب طبيعة المشكلة وتاريخ استلامها.
            </Paragraph>
          </section>
          
          <section className="legal-section">
            <Title level={2} className="section-title">إنهاء الخدمة</Title>
            <Paragraph className="rtl-text">
              يمكنك إنهاء استخدامك للمنصة في أي وقت عن طريق إلغاء حسابك. كما يحق لنا تعليق أو إنهاء وصولك إلى المنصة إذا انتهكت هذه الشروط أو إذا اعتقدنا أن استخدامك يشكل خطرًا على المنصة أو مستخدميها الآخرين.
            </Paragraph>
            <Paragraph className="rtl-text">
              عند إنهاء حسابك، قد نحتفظ ببعض معلوماتك وفقًا لسياسة الخصوصية الخاصة بنا والتزاماتنا القانونية.
            </Paragraph>
          </section>
          
          <section className="legal-section">
            <Title level={2} className="section-title">التعديلات على الشروط</Title>
            <Paragraph className="rtl-text">
              نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سنقوم بإخطارك بالتغييرات الجوهرية من خلال نشر إشعار على المنصة أو إرسال بريد إلكتروني. استمرارك في استخدام المنصة بعد نشر التغييرات يعني موافقتك على الشروط المعدلة.
            </Paragraph>
          </section>
          
          <section className="legal-section">
            <Title level={2} className="section-title">القانون الحاكم</Title>
            <Paragraph className="rtl-text">
              تخضع هذه الشروط لقوانين المملكة العربية السعودية وتفسر وفقًا لها، بغض النظر عن تعارض مبادئ القوانين. أي نزاع ينشأ عن هذه الشروط أو يتعلق بها سيخضع للاختصاص القضائي الحصري للمحاكم المختصة في الرياض.
            </Paragraph>
          </section>
          
          <section className="legal-section">
            <Title level={2} className="section-title">التواصل معنا</Title>
            <Paragraph className="rtl-text">
              إذا كانت لديك أي أسئلة أو استفسارات حول شروط الخدمة أو الخدمات التي نقدمها، يمكنك التواصل مع فريق الدعم الفني من خلال:
            </Paragraph>
            <Paragraph className="rtl-text contact-info">
              <div className="contact-method">
                <QuestionCircleOutlined className="contact-icon" /> فتح تذكرة دعم فني من خلال حسابك في المنصة
              </div>
              <div className="contact-method">
                <i className="contact-icon fas fa-envelope"></i> البريد الإلكتروني: support@xelo.tools
              </div>
              <div className="contact-method">
                <i className="contact-icon fas fa-map-marker-alt"></i> المقر الرئيسي: شارع العليا، الرياض، المملكة العربية السعودية
              </div>
            </Paragraph>
          </section>
        </div>
        
        <div className="legal-navigation">
          <Button type="primary" className="legal-back-btn">
            <Link to="/login">
              <ArrowRightOutlined /> العودة إلى تسجيل الدخول
            </Link>
          </Button>
          <Button type="link" className="legal-other-doc">
            <Link to="/privacy">
              الاطلاع على سياسة الخصوصية
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;