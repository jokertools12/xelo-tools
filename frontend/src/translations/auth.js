const authTranslations = {
  ar: {
    // عام
    auth_welcome: 'مرحباً بك في خيلو',
    auth_description: 'منصة متكاملة لإدارة نشاطك على وسائل التواصل الاجتماعي',
    auth_terms: 'بالمتابعة، أنت توافق على',
    auth_terms_link: 'شروط الخدمة',
    auth_privacy_link: 'سياسة الخصوصية',
    auth_and: 'و',
    auth_copyright: 'جميع الحقوق محفوظة © {year} خيلو',
    auth_loading: 'جاري التحميل...',
    
    // تسجيل الدخول
    login_title: 'تسجيل الدخول',
    login_subtitle: 'أدخل بيانات حسابك للوصول إلى لوحة التحكم',
    login_email: 'البريد الإلكتروني',
    login_password: 'كلمة المرور',
    login_remember: 'تذكرني',
    login_button: 'تسجيل الدخول',
    login_forgot: 'نسيت كلمة المرور؟',
    login_no_account: 'ليس لديك حساب؟',
    login_register: 'إنشاء حساب جديد',
    login_social: 'أو تسجيل الدخول باستخدام',
    login_success: 'تم تسجيل الدخول بنجاح',
    login_error: 'فشل تسجيل الدخول. تحقق من بياناتك وحاول مرة أخرى',
    
    // إنشاء حساب
    register_title: 'إنشاء حساب جديد',
    register_subtitle: 'املأ البيانات التالية لإنشاء حسابك',
    register_name: 'الاسم الكامل',
    register_username: 'اسم المستخدم',
    register_email: 'البريد الإلكتروني',
    register_phone: 'رقم الهاتف',
    register_password: 'كلمة المرور',
    register_confirm: 'تأكيد كلمة المرور',
    register_agreement: 'أوافق على الشروط والأحكام',
    register_button: 'إنشاء الحساب',
    register_have_account: 'لديك حساب بالفعل؟',
    register_login: 'تسجيل الدخول',
    register_success: 'تم إنشاء الحساب بنجاح',
    register_error: 'فشل إنشاء الحساب. تحقق من البيانات وحاول مرة أخرى',
    
    // نسيت كلمة المرور
    forgot_title: 'نسيت كلمة المرور',
    forgot_subtitle: 'أدخل بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة المرور',
    forgot_email: 'البريد الإلكتروني',
    forgot_button: 'إرسال رابط إعادة التعيين',
    forgot_back: 'العودة إلى تسجيل الدخول',
    forgot_success: 'تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني',
    forgot_error: 'فشل إرسال رابط إعادة التعيين. تحقق من البريد الإلكتروني وحاول مرة أخرى',
    
    // إعادة تعيين كلمة المرور
    reset_title: 'إعادة تعيين كلمة المرور',
    reset_subtitle: 'أدخل كلمة المرور الجديدة',
    reset_new: 'كلمة المرور الجديدة',
    reset_confirm: 'تأكيد كلمة المرور',
    reset_button: 'إعادة تعيين كلمة المرور',
    reset_success: 'تم إعادة تعيين كلمة المرور بنجاح',
    reset_error: 'فشل إعادة تعيين كلمة المرور. حاول مرة أخرى لاحقًا',
    reset_expired: 'انتهت صلاحية رابط إعادة التعيين. يرجى طلب رابط جديد',
    
    // تسجيل الخروج
    logout_title: 'تسجيل الخروج',
    logout_confirm: 'هل أنت متأكد أنك تريد تسجيل الخروج؟',
    logout_yes: 'نعم، تسجيل الخروج',
    logout_no: 'لا، البقاء',
    logout_success: 'تم تسجيل الخروج بنجاح',
    
    // التحقق من البريد الإلكتروني
    verify_title: 'تحقق من بريدك الإلكتروني',
    verify_subtitle: 'لقد أرسلنا رابط تحقق إلى بريدك الإلكتروني',
    verify_message: 'يرجى التحقق من بريدك الإلكتروني واتباع الرابط للتحقق من حسابك',
    verify_resend: 'إعادة إرسال رابط التحقق',
    verify_success: 'تم التحقق من بريدك الإلكتروني بنجاح',
    verify_error: 'فشل التحقق من البريد الإلكتروني. حاول مرة أخرى لاحقًا',
    
    // رسائل التحقق
    validation_required: 'هذا الحقل مطلوب',
    validation_email: 'يرجى إدخال بريد إلكتروني صحيح',
    validation_min_length: 'يجب أن يكون طول هذا الحقل {length} أحرف على الأقل',
    validation_max_length: 'يجب أن لا يتجاوز طول هذا الحقل {length} حرفًا',
    validation_password_match: 'كلمات المرور غير متطابقة',
    validation_username: 'اسم المستخدم يجب أن يحتوي على أحرف وأرقام فقط',
    validation_terms: 'يجب الموافقة على الشروط والأحكام',
    
    // رسائل الخطأ
    error_network: 'خطأ في الاتصال بالشبكة. تحقق من اتصالك بالإنترنت',
    error_server: 'خطأ في الخادم. حاول مرة أخرى لاحقًا',
    error_invalid_credentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    error_account_disabled: 'تم تعطيل الحساب. يرجى الاتصال بالدعم',
    error_account_exists: 'البريد الإلكتروني مستخدم بالفعل',
    error_username_exists: 'اسم المستخدم مستخدم بالفعل',
    
    // المصادقة الثنائية
    twofa_title: 'المصادقة الثنائية',
    twofa_subtitle: 'أدخل رمز التحقق المرسل إلى هاتفك',
    twofa_code: 'رمز التحقق',
    twofa_button: 'تحقق',
    twofa_resend: 'إعادة إرسال الرمز',
    twofa_success: 'تم التحقق بنجاح',
    twofa_error: 'رمز غير صحيح. حاول مرة أخرى',
    
    // صفحة تأكيد الحساب
    confirm_title: 'تأكيد الحساب',
    confirm_subtitle: 'حسابك قيد المراجعة',
    confirm_message: 'سيتم مراجعة حسابك في أقرب وقت ممكن. سنرسل لك إشعارًا عند الموافقة على حسابك',
    confirm_contact: 'إذا كانت لديك أي أسئلة، يرجى الاتصال بفريق الدعم',
    
    // المساعدة
    help_title: 'هل تحتاج إلى مساعدة؟',
    help_subtitle: 'تواصل معنا إذا كنت تواجه أي مشكلة',
    help_contact: 'اتصل بالدعم',
    help_faq: 'الأسئلة المتكررة',
    help_documentation: 'الوثائق'
  },
  en: {
    // General
    auth_welcome: 'Welcome to Xelo',
    auth_description: 'Integrated platform for managing your social media activity',
    auth_terms: 'By continuing, you agree to our',
    auth_terms_link: 'Terms of Service',
    auth_privacy_link: 'Privacy Policy',
    auth_and: 'and',
    auth_copyright: 'All rights reserved © {year} Xelo',
    auth_loading: 'Loading...',
    
    // Login
    login_title: 'Login',
    login_subtitle: 'Enter your account details to access the dashboard',
    login_email: 'Email',
    login_password: 'Password',
    login_remember: 'Remember me',
    login_button: 'Login',
    login_forgot: 'Forgot password?',
    login_no_account: "Don't have an account?",
    login_register: 'Create new account',
    login_social: 'Or login with',
    login_success: 'Logged in successfully',
    login_error: 'Login failed. Check your credentials and try again',
    
    // Registration
    register_title: 'Create New Account',
    register_subtitle: 'Fill in the following details to create your account',
    register_name: 'Full Name',
    register_username: 'Username',
    register_email: 'Email',
    register_phone: 'Phone Number',
    register_password: 'Password',
    register_confirm: 'Confirm Password',
    register_agreement: 'I agree to the Terms and Conditions',
    register_button: 'Create Account',
    register_have_account: 'Already have an account?',
    register_login: 'Login',
    register_success: 'Account created successfully',
    register_error: 'Failed to create account. Check your details and try again',
    
    // Forgot Password
    forgot_title: 'Forgot Password',
    forgot_subtitle: 'Enter your email and we will send you a link to reset your password',
    forgot_email: 'Email',
    forgot_button: 'Send Reset Link',
    forgot_back: 'Back to Login',
    forgot_success: 'Reset link sent to your email',
    forgot_error: 'Failed to send reset link. Check your email and try again',
    
    // Reset Password
    reset_title: 'Reset Password',
    reset_subtitle: 'Enter your new password',
    reset_new: 'New Password',
    reset_confirm: 'Confirm Password',
    reset_button: 'Reset Password',
    reset_success: 'Password reset successfully',
    reset_error: 'Failed to reset password. Try again later',
    reset_expired: 'Reset link expired. Please request a new one',
    
    // Logout
    logout_title: 'Logout',
    logout_confirm: 'Are you sure you want to logout?',
    logout_yes: 'Yes, Logout',
    logout_no: 'No, Stay',
    logout_success: 'Logged out successfully',
    
    // Email Verification
    verify_title: 'Verify Your Email',
    verify_subtitle: 'We have sent a verification link to your email',
    verify_message: 'Please check your email and follow the link to verify your account',
    verify_resend: 'Resend Verification Link',
    verify_success: 'Email verified successfully',
    verify_error: 'Failed to verify email. Try again later',
    
    // Validation Messages
    validation_required: 'This field is required',
    validation_email: 'Please enter a valid email',
    validation_min_length: 'This field must be at least {length} characters',
    validation_max_length: 'This field must not exceed {length} characters',
    validation_password_match: 'Passwords do not match',
    validation_username: 'Username must contain only letters and numbers',
    validation_terms: 'You must agree to the terms and conditions',
    
    // Error Messages
    error_network: 'Network error. Check your internet connection',
    error_server: 'Server error. Try again later',
    error_invalid_credentials: 'Email or password is incorrect',
    error_account_disabled: 'Account is disabled. Please contact support',
    error_account_exists: 'Email is already in use',
    error_username_exists: 'Username is already in use',
    
    // Two-Factor Authentication
    twofa_title: 'Two-Factor Authentication',
    twofa_subtitle: 'Enter the verification code sent to your phone',
    twofa_code: 'Verification Code',
    twofa_button: 'Verify',
    twofa_resend: 'Resend Code',
    twofa_success: 'Verified successfully',
    twofa_error: 'Invalid code. Try again',
    
    // Account Confirmation
    confirm_title: 'Account Confirmation',
    confirm_subtitle: 'Your account is under review',
    confirm_message: 'Your account will be reviewed as soon as possible. You will receive a notification when your account is approved',
    confirm_contact: 'If you have any questions, please contact our support team',
    
    // Help
    help_title: 'Need Help?',
    help_subtitle: 'Contact us if you are experiencing any issues',
    help_contact: 'Contact Support',
    help_faq: 'FAQ',
    help_documentation: 'Documentation'
  }
};

export default authTranslations;