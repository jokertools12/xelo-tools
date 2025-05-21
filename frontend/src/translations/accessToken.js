const accessTokenTranslations = {
  ar: {
    // العنوان والوصف
    "token_management_title": "إدارة Access Tokens",
    "token_management_description": "استخرج وأدر الـ Access Tokens الخاصة بحسابات Facebook بطريقة آمنة وسهلة",
    
    // اختيار التوكن
    "select_account_title": "اختر حسابًا للاستخدام",
    "refresh_accounts": "تحديث",
    "no_saved_accounts": "لا توجد حسابات محفوظة. قم باستخراج توكن جديد أدناه.",
    "no_accounts_found": "لم يتم العثور على حسابات",
    "select_account_placeholder": "اختر حسابًا",
    "account_active": "نشط",
    
    // استخراج التوكن
    "extract_new_token": "استخراج Access Token جديد",
    "username": "اسم المستخدم",
    "password": "كلمة المرور",
    "2fa_code": "رمز المصادقة الثنائية (2FA)",
    "enter_username": "أدخل اسم المستخدم",
    "enter_password": "أدخل كلمة المرور",
    "enter_2fa": "أدخل رمز المصادقة الثنائية",
    "extract_token": "استخراج Access Token",
    
    // رسائل
    "processing_request": "جاري معالجة طلبك...",
    "please_wait": "جاري معالجة طلبك، يرجى الانتظار...",
    "delete_token_title": "حذف التوكن",
    "delete_token_confirm": "هل أنت متأكد من حذف هذا التوكن؟",
    "yes_delete": "نعم، حذف",
    "cancel": "إلغاء",
    "unknown_account": "غير معروف",
    
    // نجاح
    "token_extracted": "تم الحصول على Access Token بنجاح",
    "token_activated": "تم تفعيل التوكن بنجاح",
    "token_deleted": "تم حذف التوكن بنجاح",
    
    // أخطاء
    "failed_extract_token": "فشل في الحصول على Access Token",
    "empty_response": "فشل في الحصول على Access Token - الاستجابة فارغة",
    "request_error": "خطأ في معالجة الطلب: {errorMessage}",
    "server_connection_failed": "فشل الاتصال بالخادم",
    "user_not_found": "لم يتم العثور على معلومات المستخدم. يرجى تسجيل الدخول أولاً.",
    "failed_save_token": "فشل في حفظ Access Token",
    "failed_activate_token": "فشل في تفعيل التوكن: {errorMessage}",
    "failed_delete_token": "فشل في حذف التوكن: {errorMessage}",
    "failed_load_tokens": "فشل في تحميل قائمة التوكنات",
    
    // فيلداشن
    "username_required": "يرجى إدخال اسم المستخدم!",
    "password_required": "يرجى إدخال كلمة المرور!",
    "2fa_required": "يرجى إدخال رمز المصادقة الثنائية!",
    
    // معلومات أمنية
    "security_note": "ملاحظة أمنية:",
    "security_message": "لحماية بياناتك، لا يتم عرض أو تخزين التوكنات بشكل مكشوف في النظام."
  },
  en: {
    // Title and Description
    "token_management_title": "Access Tokens Management",
    "token_management_description": "Extract and manage Facebook Access Tokens securely and easily",
    
    // Token Selection
    "select_account_title": "Select an account to use",
    "refresh_accounts": "Refresh",
    "no_saved_accounts": "No saved accounts. Extract a new token below.",
    "no_accounts_found": "No accounts found",
    "select_account_placeholder": "Select an account",
    "account_active": "Active",
    
    // Token Extraction
    "extract_new_token": "Extract New Access Token",
    "username": "Username",
    "password": "Password",
    "2fa_code": "Two-Factor Authentication Code (2FA)",
    "enter_username": "Enter your username",
    "enter_password": "Enter your password",
    "enter_2fa": "Enter 2FA code",
    "extract_token": "Extract Access Token",
    
    // Messages
    "processing_request": "Processing your request...",
    "please_wait": "Processing your request, please wait...",
    "delete_token_title": "Delete Token",
    "delete_token_confirm": "Are you sure you want to delete this token?",
    "yes_delete": "Yes, delete",
    "cancel": "Cancel",
    "unknown_account": "Unknown",
    
    // Success
    "token_extracted": "Access Token successfully obtained",
    "token_activated": "Token successfully activated",
    "token_deleted": "Token successfully deleted",
    
    // Errors
    "failed_extract_token": "Failed to obtain Access Token",
    "empty_response": "Failed to obtain Access Token - Empty response",
    "request_error": "Error processing request: {errorMessage}",
    "server_connection_failed": "Server connection failed",
    "user_not_found": "User information not found. Please log in first.",
    "failed_save_token": "Failed to save Access Token",
    "failed_activate_token": "Failed to activate token: {errorMessage}",
    "failed_delete_token": "Failed to delete token: {errorMessage}",
    "failed_load_tokens": "Failed to load token list",
    
    // Validation
    "username_required": "Please enter your username!",
    "password_required": "Please enter your password!",
    "2fa_required": "Please enter the 2FA code!",
    
    // Security Info
    "security_note": "Security Note:",
    "security_message": "To protect your data, tokens are not displayed or stored in plain text in the system."
  }
};

export default accessTokenTranslations;