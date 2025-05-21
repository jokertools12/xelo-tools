import React from 'react';
import { Button, Typography, Breadcrumb, Spin } from 'antd';
import { Link } from 'react-router-dom';
import { HomeOutlined, LockOutlined, ArrowRightOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import SEO from '../components/SEO';
import '../styles/legal.css';

const { Title, Paragraph, Text } = Typography;

const PrivacyPolicy = () => {
  const [loading, setLoading] = React.useState(true);

  // Scroll to top on component mount
  React.useEffect(() => {
    window.scrollTo(0, 0);
    // Simulate loading
    setTimeout(() => setLoading(false), 1000);
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="legal-page">
      <SEO title="سياسة الخصوصية" description="سياسة الخصوصية لمنصة Xelo Tools" />
      
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
              <LockOutlined /> سياسة الخصوصية
            </Breadcrumb.Item>
          </Breadcrumb>
          
          <Title level={1} className="legal-title">سياسة الخصوصية</Title>
          <Text className="legal-updated">آخر تحديث: 31 مارس 2025</Text>
        </div>
        
        <div className="legal-content">
          <section className="legal-section">
            <Title level={2} className="section-title">مقدمة</Title>
            <Paragraph className="rtl-text">
              تلتزم منصة Xelo Tools بحماية خصوصية مستخدميها. تصف سياسة الخصوصية هذه كيفية جمعنا واستخدامنا وحمايتنا للمعلومات الشخصية التي تقدمها عند استخدام خدماتنا. نحن نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية.
            </Paragraph>
            <Paragraph className="rtl-text">
              باستخدامك للمنصة، فإنك توافق على جمع واستخدام معلوماتك وفقًا لسياسة الخصوصية هذه. نرجو قراءة هذه السياسة بعناية لفهم كيفية تعاملنا مع معلوماتك الشخصية.
            </Paragraph>
          </section>
          
          <section className="legal-section">
            <Title level={2} className="section-title">المعلومات التي نجمعها</Title>
            <Paragraph className="rtl-text">
              تقوم منصة Xelo Tools بجمع أنواع مختلفة من المعلومات لتقديم خدماتنا وتحسينها:
            </Paragraph>
            <ul className="legal-list rtl-text">
              <li>
                <strong>معلومات التسجيل:</strong> عند إنشاء حساب، نجمع معلومات مثل اسمك واسم المستخدم وعنوان البريد الإلكتروني وكلمة المرور.
              </li>
              <li>
                <strong>معلومات الملف الشخصي:</strong> قد تختار تقديم معلومات إضافية مثل صورة الملف الشخصي والموقع والمسمى الوظيفي.
              </li>
              <li>
                <strong>معلومات وسائل التواصل الاجتماعي:</strong> لتقديم خدماتنا، قد نطلب الوصول إلى حسابات وسائل التواصل الاجتماعي الخاصة بك مع تطبيق الأذونات المناسبة.
              </li>
              <li>
                <strong>بيانات الاستخدام:</strong> نجمع معلومات حول كيفية استخدامك لخدماتنا، مثل الميزات التي تستخدمها والإجراءات التي تتخذها وأنماط الاستخدام.
              </li>
              <li>
                <strong>معلومات الجهاز:</strong> نجمع معلومات عن جهازك مثل نوع الجهاز ونظام التشغيل والمتصفح وعنوان IP.
              </li>
              <li>
                <strong>ملفات تعريف الارتباط والتقنيات المماثلة:</strong> نستخدم ملفات تعريف الارتباط وتقنيات مماثلة لتتبع النشاط وتخزين بعض المعلومات.
              </li>
            </ul>
          </section>
          
          <section className="legal-section">
            <Title level={2} className="section-title">كيفية استخدام المعلومات</Title>
            <Paragraph className="rtl-text">
              نستخدم المعلومات التي نجمعها للأغراض التالية:
            </Paragraph>
            <ul className="legal-list rtl-text">
              <li>توفير وتشغيل وصيانة خدماتنا</li>
              <li>تحسين وتخصيص وتوسيع خدماتنا</li>
              <li>فهم وتحليل كيفية استخدامك لخدماتنا</li>
              <li>تطوير منتجات وخدمات وميزات جديدة</li>
              <li>التواصل معك، إما مباشرة أو من خلال شركائنا، بما في ذلك خدمة العملاء</li>
              <li>إرسال رسائل تسويقية وترويجية (مع خيار إلغاء الاشتراك)</li>
              <li>الكشف عن الاحتيال ومنعه وقضايا الأمان الأخرى</li>
              <li>الامتثال للالتزامات القانونية</li>
            </ul>
          </section>
          
          <section className="legal-section">
            <Title level={2} className="section-title">مشاركة المعلومات</Title>
            <Paragraph className="rtl-text">
              نحن لا نبيع معلوماتك الشخصية لأطراف ثالثة. ومع ذلك، قد نشارك معلوماتك في الحالات التالية:
            </Paragraph>
            <ul className="legal-list rtl-text">
              <li>
                <strong>مزودي الخدمة:</strong> نعمل مع شركات وأفراد آخرين لتقديم خدمات نيابة عنا (مثل خدمات الاستضافة وتحليلات البيانات).
              </li>
              <li>
                <strong>الشركات التابعة:</strong> قد نشارك المعلومات مع الشركات التابعة لنا التي تساعدنا في تقديم خدماتنا.
              </li>
              <li>
                <strong>الامتثال القانوني:</strong> قد نفصح عن معلوماتك إذا كان ذلك مطلوبًا بموجب القانون أو استجابةً لإجراءات قانونية صحيحة.
              </li>
              <li>
                <strong>حماية الحقوق:</strong> قد نفصح عن معلوماتك لحماية حقوقنا أو ممتلكاتنا أو سلامة مستخدمينا أو الجمهور.
              </li>
              <li>
                <strong>عمليات نقل الأعمال:</strong> في حالة الاندماج أو الاستحواذ أو بيع الأصول، قد يتم نقل معلوماتك كجزء من هذه المعاملة.
              </li>
              <li>
                <strong>بموافقتك:</strong> قد نشارك معلوماتك في أي حالة أخرى بعد الحصول على موافقتك.
              </li>
            </ul>
          </section>
          
          <section className="legal-section">
            <Title level={2} className="section-title">حماية البيانات</Title>
            <Paragraph className="rtl-text">
              نحن نتخذ تدابير أمنية معقولة لحماية معلوماتك الشخصية من الفقدان أو سوء الاستخدام أو الوصول غير المصرح به أو الإفصاح أو التعديل أو التدمير. هذه التدابير تشمل:
            </Paragraph>
            <ul className="legal-list rtl-text">
              <li>تشفير البيانات الحساسة</li>
              <li>التحكم في الوصول المادي والإلكتروني</li>
              <li>أنظمة اكتشاف ومنع التسلل</li>
              <li>تدريب الموظفين على أفضل ممارسات الأمان</li>
              <li>مراجعات أمنية منتظمة</li>
            </ul>
            <Paragraph className="rtl-text">
              ومع ذلك، لا يمكن ضمان أمان المعلومات المرسلة عبر الإنترنت بنسبة 100%. لذلك، على الرغم من جهودنا لحماية معلوماتك الشخصية، لا يمكننا ضمان أمان أي معلومات ترسلها إلينا.
            </Paragraph>
          </section>
          
          <section className="legal-section">
            <Title level={2} className="section-title">حقوقك الخاصة بالبيانات</Title>
            <Paragraph className="rtl-text">
              وفقًا للقوانين المعمول بها، قد يكون لديك الحقوق التالية فيما يتعلق بمعلوماتك الشخصية:
            </Paragraph>
            <ul className="legal-list rtl-text">
              <li>الوصول إلى معلوماتك الشخصية وطلب نسخة منها</li>
              <li>تصحيح معلوماتك الشخصية غير الدقيقة</li>
              <li>حذف معلوماتك الشخصية (الحق في النسيان)</li>
              <li>تقييد معالجة معلوماتك الشخصية</li>
              <li>نقل بياناتك (قابلية نقل البيانات)</li>
              <li>الاعتراض على معالجة معلوماتك الشخصية</li>
              <li>سحب موافقتك في أي وقت</li>
            </ul>
            <Paragraph className="rtl-text">
              لممارسة أي من هذه الحقوق، يرجى التواصل معنا باستخدام معلومات الاتصال المقدمة أدناه.
            </Paragraph>
          </section>
          
          <section className="legal-section">
            <Title level={2} className="section-title">الاحتفاظ بالبيانات</Title>
            <Paragraph className="rtl-text">
              نحتفظ بمعلوماتك الشخصية طالما كان ذلك ضروريًا لتحقيق الأغراض المنصوص عليها في سياسة الخصوصية هذه، ما لم تكن هناك حاجة لفترة احتفاظ أطول أو يسمح بها بموجب القانون. عندما لم تعد هناك حاجة مشروعة إلى الاحتفاظ بمعلوماتك الشخصية، سنقوم إما بحذفها أو جعلها مجهولة المصدر.
            </Paragraph>
          </section>
          
          <section className="legal-section">
            <Title level={2} className="section-title">نقل البيانات الدولي</Title>
            <Paragraph className="rtl-text">
              قد تتم معالجة معلوماتك ونقلها وتخزينها في دول مختلفة عن بلدك، حيث قد تكون قوانين حماية البيانات مختلفة. عند نقل معلوماتك خارج بلدك، نتخذ خطوات لضمان توفير ضمانات مناسبة لحماية معلوماتك وضمان معالجتها وفقًا لسياسة الخصوصية هذه والقوانين المعمول بها.
            </Paragraph>
          </section>
          
          <section className="legal-section">
            <Title level={2} className="section-title">خصوصية الأطفال</Title>
            <Paragraph className="rtl-text">
              لا نقدم خدماتنا عن قصد لأشخاص تقل أعمارهم عن 18 عامًا. إذا كنت أحد الوالدين أو الوصي وتعتقد أن طفلك قد قدم لنا معلومات شخصية، يرجى الاتصال بنا، وسنتخذ إجراءات لإزالة هذه المعلومات من سجلاتنا.
            </Paragraph>
          </section>
          
          <section className="legal-section">
            <Title level={2} className="section-title">التغييرات على سياسة الخصوصية</Title>
            <Paragraph className="rtl-text">
              قد نقوم بتحديث سياسة الخصوصية هذه من وقت لآخر. سيتم نشر أي تغييرات على هذه الصفحة، وإذا كانت التغييرات جوهرية، فسنقدم إشعارًا أكثر وضوحًا، مثل إرسال بريد إلكتروني. نشجعك على مراجعة سياسة الخصوصية هذه بشكل دوري للبقاء على اطلاع بكيفية حمايتنا لمعلوماتك.
            </Paragraph>
          </section>
          
          <section className="legal-section">
            <Title level={2} className="section-title">الدعم والمساعدة بخصوص البيانات الشخصية</Title>
            <Paragraph className="rtl-text">
              نحن نأخذ خصوصية بياناتك على محمل الجد ونلتزم بمساعدتك في أي استفسارات تتعلق ببياناتك الشخصية. إذا كنت ترغب في ممارسة أي من حقوقك المتعلقة بالبيانات أو كان لديك أي استفسارات بشأن كيفية تعاملنا مع معلوماتك، يمكنك التواصل معنا مباشرة من خلال نظام تذاكر الدعم الخاص بنا.
            </Paragraph>
          </section>
          
          <section className="legal-section">
            <Title level={2} className="section-title">التواصل معنا</Title>
            <Paragraph className="rtl-text">
              إذا كانت لديك أي أسئلة أو مخاوف بشأن سياسة الخصوصية هذه أو ممارسات البيانات الخاصة بنا، يرجى التواصل معنا عبر:
            </Paragraph>
            <Paragraph className="rtl-text contact-info">
              <div className="contact-method">
                <QuestionCircleOutlined className="contact-icon" /> فتح تذكرة دعم فني من خلال حسابك في المنصة
              </div>
              <div className="contact-method">
                <i className="contact-icon fas fa-envelope"></i> البريد الإلكتروني: privacy@xelo.tools
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
            <Link to="/terms">
              الاطلاع على شروط الخدمة
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;