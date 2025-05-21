const walletTranslations = {
  ar: {
    // العنوان والتنقل - Header and Navigation
    "my_wallet": "محفظتي",
    "wallet_description": "إدارة رصيدك وسجل معاملاتك",
    "balance_tab": "الرصيد",
    "deposit_tab": "إيداع",
    "transactions_tab": "سجل المعاملات",
    "loading": "جاري التحميل...",
    "currency_usd": "دولار",
    "currency_symbol": "$",
    "egp_symbol": "ج.م",
    "exchange_rate_info": "سعر الصرف: 1 دولار = {rate} جنيه مصري",
    "default_exchange_rate": "سعر صرف افتراضي",
    "last_updated": "آخر تحديث: {date}",
    
    // رصيد المحفظة - Wallet Balance
    "wallet_balance": "رصيد المحفظة",
    "deposit_funds": "إيداع رصيد",
    "transaction_history": "سجل المعاملات",
    
    // شراء النقاط - Buy Points
    "buy_points": "شراء نقاط",
    "use_wallet_points": "استخدم رصيد محفظتك لشراء نقاط إضافية",
    "buy_points_btn": "شراء {points} نقطة بـ {amount} دولار",
    "processing_purchase": "جاري الشراء...",
    
    // إيداع الرصيد - Deposit Funds
    "deposit_wallet": "إيداع رصيد في المحفظة",
    "deposit_instructions": "قم بإرسال المبلغ المطلوب ثم أدخل بيانات عملية الدفع",
    "payment_instructions": "تعليمات الدفع:",
    "electronic_wallets_steps": "خطوات الدفع عبر المحافظ الإلكترونية:",
    "step1": "قم بتحويل المبلغ {amount} إلى الرقم التالي:",
    "required_amount": "المطلوب",
    "step2": "احتفظ برقم المرجع أو رقم العملية بعد إتمام التحويل.",
    "step3": "أكمل النموذج أدناه وقم بإرفاق صورة من إيصال الدفع (اختياري).",
    "step4": "سيتم مراجعة طلبك وإضافة الرصيد إلى محفظتك بعد التحقق من الدفع.",
    
    // فوائد إيداع الرصيد - Deposit Benefits
    "deposit_benefits": "فوائد إيداع الرصيد:",
    "benefit1": "استخدام الرصيد لشراء النقاط بأسعار مخفضة",
    "benefit2": "الدفع الفوري للاشتراكات دون الحاجة لتأكيد الدفع",
    "benefit3": "سهولة وسرعة في تنفيذ عمليات الشراء المختلفة",
    "deposit_note": "ملاحظة: يتم تحديث الرصيد خلال ساعات العمل الرسمية. يمكنك متابعة حالة الطلب من سجل المعاملات.",
    
    // نموذج الإيداع - Deposit Form
    "amount_dollars": "المبلغ (بالدولار)",
    "amount_placeholder": "أدخل المبلغ",
    "payment_method": "طريقة الدفع",
    "electronic_wallets": "المحافظ الإلكترونية",
    "phone_number": "رقم الهاتف",
    "phone_placeholder": "أدخل رقم الهاتف الذي تم الدفع منه",
    "reference_number": "رقم المرجع",
    "reference_placeholder": "أدخل رقم مرجع عملية الدفع",
    "receipt_image": "صورة إيصال الدفع (اختياري)",
    "select_image": "اختر صورة",
    "cancel": "إلغاء",
    "send_request": "إرسال الطلب",
    "sending": "جاري الإرسال...",
    
    // سجل المعاملات - Transaction History
    "no_transactions": "لا توجد معاملات",
    "transactions_will_show": "سيتم عرض سجل معاملات المحفظة هنا",
    "return_to_balance": "الرجوع للرصيد",
    "wallet_transactions": "سجل معاملات المحفظة",
    
    // أنواع المعاملات - Transaction Types
    "wallet_deposit": "إيداع رصيد",
    "wallet_purchase": "شراء",
    "wallet_refund": "استرداد",
    "wallet_withdrawal": "سحب رصيد",
    "points_purchase": "شراء نقاط",
    "points_award": "مكافأة نقاط",
    
    // حالة المعاملات - Transaction Status
    "completed": "مكتمل",
    "pending": "قيد الانتظار",
    "failed": "فشل",
    
    // الإشعارات - Notifications
    "warning": "تنبيه",
    "fill_required_fields": "يرجى تعبئة جميع الحقول المطلوبة",
    "success": "تم بنجاح",
    "deposit_request_sent": "تم إرسال طلب الإيداع بنجاح، يرجى انتظار موافقة الإدارة",
    "error": "خطأ",
    "deposit_request_failed": "فشل في إرسال طلب الإيداع",
    "insufficient_balance": "رصيد المحفظة غير كافي لشراء هذه النقاط",
    "operation_success": "تمت العملية بنجاح",
    "points_purchase_success": "تم شراء {points} نقطة بنجاح!",
    "points_purchase_failed": "فشل في شراء النقاط",
    "failed_get_balance": "فشل في جلب رصيد المحفظة",
    "failed_get_transactions": "فشل في جلب سجل المعاملات",
    
    // نافذة نجاح شراء النقاط - Points Purchase Success Modal
    "purchase_success": "تمت عملية الشراء بنجاح",
    "points_label": "نقطة",
    "purchased": "تم شراء:",
    "points_count": "{points} نقطة",
    "amount_paid": "المبلغ المدفوع:",
    "remaining_balance": "رصيد المحفظة المتبقي:",
    "current_points": "إجمالي النقاط الحالي:",
    "points_added_success": "تم إضافة النقاط إلى حسابك بنجاح ويمكنك الآن استخدامها",
    "done": "تم",
    
    // نافذة طلب الإيداع المعلق - Pending Deposit Error Modal
    "pending_deposit": "طلب إيداع قيد الانتظار",
    "pending_request_details": "تفاصيل الطلب السابق:",
    "request_date": "تاريخ الطلب:",
    "amount": "المبلغ:",
    "payment_method_label": "طريقة الدفع:",
    "vodafone_cash": "فودافون كاش",
    "etisalat_cash": "اتصالات كاش",
    "wait_message": "يجب انتظار مراجعة طلب الإيداع السابق أو إلغائه قبل إنشاء طلب جديد.",
    "close": "إغلاق"
  },
  en: {
    // Header and Navigation
    "my_wallet": "My Wallet",
    "wallet_description": "Manage your balance and transaction history",
    "balance_tab": "Balance",
    "deposit_tab": "Deposit",
    "transactions_tab": "Transactions",
    
    // Wallet Balance
    "wallet_balance": "Wallet Balance",
    "deposit_funds": "Deposit Funds",
    "transaction_history": "Transaction History",
    
    // Buy Points
    "buy_points": "Buy Points",
    "use_wallet_points": "Use your wallet balance to purchase additional points",
    "buy_points_btn": "Buy {points} points for ${amount}",
    "processing_purchase": "Processing...",
    
    // Deposit Funds
    "deposit_wallet": "Deposit Funds to Wallet",
    "deposit_instructions": "Send the required amount and then enter the payment details",
    "payment_instructions": "Payment Instructions:",
    "electronic_wallets_steps": "Electronic Wallets Payment Steps:",
    "step1": "Transfer {amount} to the following number:",
    "required_amount": "required amount",
    "step2": "Keep the reference or transaction number after completing the transfer.",
    "step3": "Complete the form below and attach a screenshot of the payment receipt (optional).",
    "step4": "Your request will be reviewed and funds added to your wallet after payment verification.",
    
    // Deposit Benefits
    "deposit_benefits": "Benefits of Depositing Funds:",
    "benefit1": "Use balance to purchase points at discounted prices",
    "benefit2": "Instant payment for subscriptions without needing payment approval",
    "benefit3": "Easy and fast execution of various purchase operations",
    "deposit_note": "Note: Balance is updated during official working hours. You can track the status of your request from the transaction history.",
    
    // Deposit Form
    "amount_dollars": "Amount (USD)",
    "amount_placeholder": "Enter amount",
    "payment_method": "Payment Method",
    "electronic_wallets": "Electronic Wallets",
    "phone_number": "Phone Number",
    "phone_placeholder": "Enter the phone number used for payment",
    "reference_number": "Reference Number",
    "reference_placeholder": "Enter payment transaction reference number",
    "receipt_image": "Payment Receipt Image (optional)",
    "select_image": "Select Image",
    "cancel": "Cancel",
    "send_request": "Send Request",
    "sending": "Sending...",
    
    // Transaction History
    "no_transactions": "No Transactions",
    "transactions_will_show": "Wallet transaction history will be displayed here",
    "return_to_balance": "Return to Balance",
    "wallet_transactions": "Wallet Transaction History",
    
    // Transaction Types
    "wallet_deposit": "Deposit",
    "wallet_purchase": "Purchase",
    "wallet_refund": "Refund",
    "wallet_withdrawal": "Withdrawal",
    "points_purchase": "Points Purchase",
    "points_award": "Points Award",
    
    // Transaction Status
    "completed": "Completed",
    "pending": "Pending",
    "failed": "Failed",
    
    // Notifications
    "warning": "Warning",
    "fill_required_fields": "Please fill in all required fields",
    "success": "Success",
    "deposit_request_sent": "Deposit request sent successfully, please wait for admin approval",
    "error": "Error",
    "deposit_request_failed": "Failed to send deposit request",
    "insufficient_balance": "Your wallet balance is insufficient for this points purchase",
    "operation_success": "Operation Successful",
    "points_purchase_success": "{points} points purchased successfully!",
    "points_purchase_failed": "Failed to purchase points",
    "failed_get_balance": "Failed to fetch wallet balance",
    "failed_get_transactions": "Failed to fetch transaction history",
    
    // Points Purchase Success Modal
    "purchase_success": "Purchase Successful",
    "points_label": "points",
    "purchased": "Purchased:",
    "points_count": "{points} points",
    "amount_paid": "Amount Paid:",
    "remaining_balance": "Remaining Wallet Balance:",
    "current_points": "Current Total Points:",
    "points_added_success": "Points have been successfully added to your account and you can now use them",
    "done": "Done",
    
    // Pending Deposit Error Modal
    "pending_deposit": "Pending Deposit Request",
    "pending_request_details": "Previous Request Details:",
    "request_date": "Request Date:",
    "amount": "Amount:",
    "payment_method_label": "Payment Method:",
    "vodafone_cash": "Vodafone Cash",
    "etisalat_cash": "Etisalat Cash",
    "wait_message": "You must wait for your previous deposit request to be reviewed or cancelled before creating a new request.",
    "close": "Close",
    
    // Additional translation keys for RTL/LTR support
    "loading": "Loading...",
    "currency_usd": "USD",
    "currency_symbol": "$",
    "egp_symbol": "EGP",
    "exchange_rate_info": "Exchange rate: 1 USD = {rate} EGP",
    "default_exchange_rate": "Default exchange rate",
    "last_updated": "Last updated: {date}"
  }
};

export default walletTranslations;