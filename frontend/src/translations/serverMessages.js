const serverMessagesTranslations = {
  ar: {
    // General messages
    "mongodb_connected": "تم الاتصال بقاعدة بيانات MongoDB بنجاح",
    "mongodb_error": "خطأ في اتصال MongoDB:",
    "server_running": "الخادم يعمل على المنفذ",
    
    // Directory and file operations
    "creating_directory": "تم إنشاء المجلد:",
    "directory_created": "تم إنشاء المجلد:",
    
    // Achievements
    "initializing_default_achievements": "تهيئة الإنجازات الافتراضية...",
    "achievement_default_welcome": "مرحباً بك!",
    "achievement_default_welcome_desc": "قم بتسجيل الدخول للمرة الأولى",
    "achievement_default_explorer": "المستكشف",
    "achievement_default_explorer_desc": "قم بزيارة جميع أقسام التطبيق",
    "achievement_default_profile": "الملف الشخصي المكتمل",
    "achievement_default_profile_desc": "أكمل معلومات ملفك الشخصي",
    "achievement_default_persistent": "المثابر",
    "achievement_default_persistent_desc": "قم بتسجيل الدخول لمدة 7 أيام متتالية",
    "achievement_default_participant": "المشارك",
    "achievement_default_participant_desc": "قم بإجراء 10 عمليات نشر (يدوية أو مجدولة)",
    "default_achievements_created": "تم إنشاء {count} إنجازات افتراضية",
    
    // Languages
    "initializing_default_languages": "تهيئة اللغات الافتراضية...",
    "default_languages_created": "تم إنشاء {count} لغة افتراضية",
    
    // Services initialization
    "achievement_service_initialized": "تم تهيئة خدمة الإنجازات",
    
    // Scheduled posts
    "scheduled_posts_found": "تم العثور على {count} منشورات مجدولة معلقة للمعالجة",
    "processing_scheduled_post": "معالجة المنشور المجدول: {id}",
    "access_token_not_available": "رمز الوصول غير متوفر في المنشور المجدول أو للمستخدم",
    "using_fallback_token": "استخدام رمز الوصول الحالي للمستخدم كحل بديل للمنشور {id}",
    "adding_delay": "إضافة تأخير بمقدار {delay} ثواني قبل المنشور التالي",
    "delay_completed": "اكتمل التأخير، المتابعة إلى المنشور التالي",
    "invalid_group_id": "تنسيق معرف المجموعة غير صالح: {id}. تخطي هذه المجموعة.",
    "post_success": "تم النشر بنجاح في المجموعة {id}",
    "post_failure": "فشل النشر في المجموعة {id} - لم يتم إرجاع معرف المنشور",
    "completed_scheduled_post": "اكتمل المنشور المجدول {id} مع {success} نجاح و {failure} فشل",
    "points_refunded": "تم استرداد {points} نقطة للمستخدم {userId} عن {failCount} منشورات مجدولة فاشلة من أصل {totalPoints} نقطة تم خصمها في الأصل",
    
    // Scheduled messages
    "scheduled_messages_found": "تم العثور على {count} رسائل مجدولة معلقة للمعالجة",
    "processing_scheduled_message": "معالجة الرسالة المجدولة: {id}",
    "message_access_token_not_available": "رمز الوصول غير متوفر في الرسالة المجدولة",
    "invalid_recipient_id": "رقم المستلم غير صالح: {id}. تخطي هذا المستلم.",
    "message_delay": "إضافة تأخير بمقدار {delay} ثواني قبل الرسالة التالية",
    "message_delay_completed": "اكتمل التأخير. الوقت الفعلي: {time} ثواني",
    "delay_completed_continue": "اكتمل التأخير، المتابعة إلى المستلم التالي",
    "message_success": "تم إرسال الرسالة بنجاح إلى المستلم {id}",
    "message_failure": "فشل إرسال الرسالة إلى المستلم {id} - لم يتم إرجاع معرف الرسالة",
    "message_points_refunded": "تم استرداد {points} نقطة للمستخدم {userId} عن {failCount} رسائل فاشلة من أصل {totalCount} رسالة مجدولة",
    "completed_scheduled_message": "اكتملت الرسالة المجدولة {id} مع {success} نجاح و {failure} فشل",
    "full_points_refunded": "استرداد كامل النقاط ({points}) بسبب فشل الرسائل المجدولة",
    
    // Cleanup 
    "cleanup_deleted": "تنظيف: تم حذف {count} {type} أقدم من 3 أيام",
    
    // Development mode message
    "api_running_dev": "API قيد التشغيل. في بيئة التطوير، استخدم خادم React للواجهة الأمامية."
  },
  
  en: {
    // General messages
    "mongodb_connected": "MongoDB Connected successfully",
    "mongodb_error": "MongoDB connection error:",
    "server_running": "Server running on port",
    
    // Directory and file operations
    "creating_directory": "Creating directory:",
    "directory_created": "Directory created:",
    
    // Achievements
    "initializing_default_achievements": "Initializing default achievements...",
    "achievement_default_welcome": "Welcome!",
    "achievement_default_welcome_desc": "Log in for the first time",
    "achievement_default_explorer": "Explorer",
    "achievement_default_explorer_desc": "Visit all sections of the application",
    "achievement_default_profile": "Complete Profile",
    "achievement_default_profile_desc": "Complete your profile information",
    "achievement_default_persistent": "Persistent",
    "achievement_default_persistent_desc": "Log in for 7 consecutive days",
    "achievement_default_participant": "Participant",
    "achievement_default_participant_desc": "Make 10 posts (manual or scheduled)",
    "default_achievements_created": "Created {count} default achievements",
    
    // Languages
    "initializing_default_languages": "Initializing default languages...",
    "default_languages_created": "Created {count} default languages",
    
    // Services initialization
    "achievement_service_initialized": "Achievement Service initialized",
    
    // Scheduled posts
    "scheduled_posts_found": "Found {count} pending scheduled posts to process",
    "processing_scheduled_post": "Processing scheduled post: {id}",
    "access_token_not_available": "Access token not available in scheduled post or for user",
    "using_fallback_token": "Using user's current access token as fallback for post {id}",
    "adding_delay": "Adding delay of {delay} seconds before next post",
    "delay_completed": "Delay completed, continuing to next group post",
    "invalid_group_id": "Invalid group ID format: {id}. Skipping this group.",
    "post_success": "Successfully posted to group {id}",
    "post_failure": "Failed to post to group {id} - no post ID returned",
    "completed_scheduled_post": "Completed scheduled post {id} with {success} successes and {failure} failures",
    "points_refunded": "Refunded {points} points to user {userId} for {failCount} failed scheduled posts out of {totalPoints} points originally deducted",
    
    // Scheduled messages
    "scheduled_messages_found": "Found {count} pending scheduled messages to process",
    "processing_scheduled_message": "Processing scheduled message: {id}",
    "message_access_token_not_available": "Access token not available in scheduled message",
    "invalid_recipient_id": "Invalid recipient ID format: {id}. Skipping this recipient.",
    "message_delay": "Adding delay of {delay} seconds before next message",
    "message_delay_completed": "Delay completed. Actual delay time: {time} seconds",
    "delay_completed_continue": "Delay completed, continuing to next recipient",
    "message_success": "Successfully sent message to recipient {id}",
    "message_failure": "Failed to send message to recipient {id} - no message ID returned",
    "message_points_refunded": "Refunded {points} points to user {userId} for {failCount} failed messages out of {totalCount} scheduled messages",
    "completed_scheduled_message": "Completed scheduled message {id} with {success} successes and {failure} failures",
    "full_points_refunded": "Refunded all {points} points due to complete failure of scheduled message",
    
    // Cleanup
    "cleanup_deleted": "Cleanup: Deleted {count} {type} older than 3 days",
    
    // Development mode message
    "api_running_dev": "API is running. In development mode, use the React server for the frontend."
  }
};

module.exports = serverMessagesTranslations;