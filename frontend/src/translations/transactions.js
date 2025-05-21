/**
 * Translations for transaction and activity related components
 */

const transactionTranslations = {
  en: {
    // Transaction types
    subscription: 'Subscription',
    recharge: 'Recharge',
    purchase: 'Purchase',
    refund: 'Refund',
    admin_addition: 'Admin Addition',
    achievement_unlock: 'Achievement Unlocked',
    points_award: 'Points Award',
    points_purchase: 'Points Purchase',
    wallet_payment: 'Wallet Payment',
    wallet_deposit: 'Wallet Deposit',
    undefined: 'Transaction',
    other: 'Other',
    
    // Transaction status
    completed: 'Completed',
    processing: 'Processing',
    failed: 'Failed',
    refunded: 'Refunded',
    unknown: 'Unknown',
    
    // Transaction units
    points: 'points',
    currency_symbol: '$',
    
    // Activity types and messages
    login_activity: 'Login Activity',
    profile_activity: 'Profile Update',
    security_activity: 'Security Update',
    points_activity: 'Points Activity',
    settings_activity: 'Settings Update',
    user_activity: 'User Activity',
    
    // Activity descriptions
    login_description: 'User logged in to the system',
    profile_description: 'Profile information was updated',
    security_description: 'Security settings were changed',
    points_generic_description: 'Points activity occurred',
    settings_description: 'Account settings were updated',
    generic_activity_description: 'User performed an activity',
    
    // Points specific activities
    points_awarded_title: 'Points Awarded',
    points_awarded_description: '{points} points awarded from {planName}',
    points_deducted_title: 'Points Deducted',
    points_deducted_description: '{points} points were deducted',
    points_added_title: 'Points Added',
    points_added_description: '{points} points were added to your account',
    
    // Membership and subscription activities
    activity_new_subscription: 'subscribed to plan',
    activity_cancel_subscription: 'cancelled subscription',
    activity_enable_autorenew: 'enabled auto-renewal for subscription',
    activity_disable_autorenew: 'disabled auto-renewal for subscription',
    activity_points_received: 'received points from',
    activity_points_deducted: 'had points deducted',
    activity_payment_confirmed: 'payment was confirmed',
    
    // ActivityItem translations
    activityLogin: 'logged in to the system',
    activityProfile: 'updated profile information',
    activityAddPoints: 'received points',
    activityRemovePoints: 'had points deducted',
    activitySignup: 'created an account',
    activityAchievement: 'unlocked achievement',
    awarded: 'awarded',
    
    // Time formatting
    timeNow: 'just now',
    timeOneMinute: '1 minute ago',
    timeTwoMinutes: '2 minutes ago',
    timeMinutes: 'minutes ago',
    timeOneHour: '1 hour ago',
    timeTwoHours: '2 hours ago',
    timeHours: 'hours ago',
    timeYesterday: 'yesterday',
    timeTwoDays: '2 days ago',
    timeDays: 'days ago',
    
    // Date formatting
    date: 'Date',
    amount: 'Amount',
    type: 'Type',
    status: 'Status',
    
    // Other
    transaction_history: 'Transaction History',
    recent_activities: 'Recent Activities',
    no_transactions: 'No transactions to display',
    no_recent_activities: 'No recent activities'
  },
  ar: {
    // Transaction types
    subscription: 'اشتراك',
    recharge: 'شحن رصيد',
    purchase: 'شراء',
    refund: 'استرداد',
    admin_addition: 'إضافة من الإدارة',
    achievement_unlock: 'إنجاز مفتوح',
    points_award: 'مكافأة نقاط',
    points_purchase: 'شراء نقاط',
    wallet_payment: 'دفع من المحفظة',
    wallet_deposit: 'إيداع في المحفظة',
    undefined: 'معاملة',
    other: 'أخرى',
    
    // Transaction status
    completed: 'مكتمل',
    processing: 'قيد المعالجة',
    failed: 'فشل',
    refunded: 'مسترد',
    unknown: 'غير معروف',
    
    // Transaction units
    points: 'نقطة',
    currency_symbol: '$',
    
    // Activity types and messages
    login_activity: 'تسجيل دخول',
    profile_activity: 'تحديث الملف الشخصي',
    security_activity: 'تحديث الأمان',
    points_activity: 'نشاط النقاط',
    settings_activity: 'تحديث الإعدادات',
    user_activity: 'نشاط المستخدم',
    
    // Activity descriptions
    login_description: 'قام المستخدم بتسجيل الدخول إلى النظام',
    profile_description: 'تم تحديث معلومات الملف الشخصي',
    security_description: 'تم تغيير إعدادات الأمان',
    points_generic_description: 'تم إجراء نشاط النقاط',
    settings_description: 'تم تحديث إعدادات الحساب',
    generic_activity_description: 'قام المستخدم بإجراء نشاط',
    
    // Points specific activities
    points_awarded_title: 'تمت إضافة نقاط',
    points_awarded_description: 'تمت إضافة {points} نقطة من {planName}',
    points_deducted_title: 'تم خصم نقاط',
    points_deducted_description: 'تم خصم {points} نقطة',
    points_added_title: 'تمت إضافة نقاط',
    points_added_description: 'تمت إضافة {points} نقطة إلى حسابك',
    
    // Membership and subscription activities
    activity_new_subscription: 'اشترك في خطة',
    activity_cancel_subscription: 'ألغى الاشتراك',
    activity_enable_autorenew: 'قام بتفعيل التجديد التلقائي للاشتراك',
    activity_disable_autorenew: 'قام بإلغاء التجديد التلقائي للاشتراك',
    activity_points_received: 'حصل على نقاط من',
    activity_points_deducted: 'تم خصم نقاط منه',
    activity_payment_confirmed: 'تم تأكيد الدفع',
    
    // ActivityItem translations
    activityLogin: 'قام بتسجيل الدخول إلى النظام',
    activityProfile: 'قام بتحديث معلومات الملف الشخصي',
    activityAddPoints: 'حصل على نقاط',
    activityRemovePoints: 'تم خصم نقاط منه',
    activitySignup: 'قام بإنشاء حساب',
    activityAchievement: 'أنجز',
    awarded: 'تم منح',
    
    // Time formatting
    timeNow: 'الآن',
    timeOneMinute: 'منذ دقيقة',
    timeTwoMinutes: 'منذ دقيقتين',
    timeMinutes: 'دقائق مضت',
    timeOneHour: 'منذ ساعة',
    timeTwoHours: 'منذ ساعتين',
    timeHours: 'ساعات مضت',
    timeYesterday: 'أمس',
    timeTwoDays: 'منذ يومين',
    timeDays: 'أيام مضت',
    
    // Date formatting
    date: 'التاريخ',
    amount: 'المبلغ',
    type: 'النوع',
    status: 'الحالة',
    
    // Other
    transaction_history: 'سجل المعاملات',
    recent_activities: 'الأنشطة الأخيرة',
    no_transactions: 'لا توجد معاملات للعرض',
    no_recent_activities: 'لا توجد أنشطة حديثة'
  }
};

export default transactionTranslations;