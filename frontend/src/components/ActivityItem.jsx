import React from 'react';
import { Avatar, Typography, Tooltip, Tag } from 'antd';
import { 
  UserOutlined, 
  LoginOutlined, 
  EditOutlined, 
  TrophyOutlined, 
  DollarOutlined,
  SafetyOutlined,
  SettingOutlined,
  UserAddOutlined,
  PlusOutlined,
  MinusOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CreditCardOutlined,
  RollbackOutlined,
  MessageOutlined,
  CommentOutlined,
  EyeOutlined,
  FileSearchOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { formatRelativeTime } from '../utils/dateUtils';
import PropTypes from 'prop-types';
import './ActivityItem.css';
import { useLanguage } from '../context/LanguageContext';

const { Text } = Typography;

/**
 * Format a date relative to current time using translation keys instead of hardcoded strings
 * @param {Date|string|number} date - The date to format
 * @param {Function} t - Translation function
 * @returns {string} Relative time string in the current language
 */
const formatCustomRelativeTime = (date, t) => {
  if (!date) return '-';
  
  const dateObj = new Date(date);
  const now = new Date();
  // Calculate if the date is in the past or future
  const isPastDate = dateObj < now;
  
  // For future dates, just return the formatted date
  if (!isPastDate) {
    return dateObj.toLocaleDateString();
  }
  
  const diffTime = now - dateObj;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Using translated time phrases
  if (diffDays === 0) {
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      if (diffMinutes < 1) {
        return t('timeNow');  // Just now
      }
      
      // X minutes ago with proper plural forms
      if (diffMinutes === 1) {
        return t('timeOneMinute');
      } else if (diffMinutes === 2) {
        return t('timeTwoMinutes');
      } else {
        return `${diffMinutes} ${t('timeMinutes')}`;
      }
    }
    
    // X hours ago with proper plural forms
    if (diffHours === 1) {
      return t('timeOneHour');
    } else if (diffHours === 2) {
      return t('timeTwoHours');
    } else {
      return `${diffHours} ${t('timeHours')}`;
    }
  } else if (diffDays === 1) {
    return t('timeYesterday');  // Yesterday
  } else if (diffDays < 7) {
    // X days ago with proper plural forms
    if (diffDays === 2) {
      return t('timeTwoDays');
    } else {
      return `${diffDays} ${t('timeDays')}`;
    }
  } else {
    return dateObj.toLocaleDateString();
  }
};

/**
 * ActivityItem component displays a single user activity with the user's avatar
 * @param {Object} props - Component props
 * @param {Object} props.activity - The activity data
 * @param {Object} props.user - The current user data
 * @param {Object} props.activityUser - The user who performed the activity (might be different from current user)
 */
const ActivityItem = ({ activity, user, activityUser }) => {
  const { t } = useLanguage();

  // Get avatar URL for the activity user
  const getAvatarUrl = () => {
    if (activityUser?.avatar) {
      return activityUser.avatar;
    } else if (user?.avatar && activity?.userId === user?._id) {
      return user.avatar;
    }
    return null;
  };

  // Get user name for the activity
  const getUserName = () => {
    if (activityUser?.name) {
      return activityUser.name;
    } else if (user?.name && activity?.userId === user?._id) {
      return user.name;
    }
    return 'مستخدم';
  };

  // Extract the actual activity type from details
  const getActivityActualType = () => {
    if (!activity.details) {
      return activity.type || 'unknown';
    }

    // First check for specific action types in details
    if (activity.details.action) {
      return activity.details.action;
    }

    // Check for operation types
    if (activity.details.operation) {
      return activity.details.operation;
    }

    // Check for transaction types
    if (activity.details.type) {
      return activity.details.type;
    }

    // Fallback to main activity type
    return activity.type || activity.actionType || 'unknown';
  };

  // Get the actual amount from the activity details
  const getActivityAmount = () => {
    if (!activity.details) {
      return 0;
    }

    // Check different possible field names for the amount
    if (activity.details.points !== undefined) {
      return activity.details.points;
    }

    if (activity.details.pointsAwarded !== undefined) {
      return activity.details.pointsAwarded;
    }
    
    if (activity.details.pointsReceived !== undefined) {
      return activity.details.pointsReceived;
    }
    
    if (activity.details.amountPaid !== undefined) {
      return activity.details.amountPaid;
    }

    if (activity.details.amount !== undefined) {
      return activity.details.amount;
    }

    return 0;
  };

  // Get reason text if available
  const getReasonText = () => {
    if (!activity.details) return null;
    
    if (activity.details.reason) {
      return activity.details.reason;
    }
    
    return null;
  };

  // Get detailed source info for points activities
  const getPointsSource = () => {
    if (!activity.details) {
      return null;
    }

    // Check if points are from membership subscription
    if (activity.details.source === 'subscription' || 
        activity.details.source === 'membership' ||
        activity.details.source === 'membership_plan' ||
        activity.details.subscriptionId ||
        activity.details.planId ||
        (activity.details.planName && !activity.details.achievementName)) {
      return 'membership';
    }

    // Check if points are from an achievement
    if (activity.details.source === 'achievement' || 
        activity.details.achievementId ||
        activity.details.achievementName) {
      return 'achievement';
    }

    // Check if points are from admin action
    if (activity.details.source === 'admin' || 
        activity.details.adminId || 
        activity.details.operation === 'admin_add') {
      return 'admin';
    }

    // Check if points are from auto-renewal
    if (activity.details.action === 'auto_renewal') {
      return 'auto_renewal';
    }

    // Check if points are from refund
    if (activity.details.operation === 'refund' ||
        (activity.details.reason && 
         (activity.details.reason.includes('استرجاع') || 
          activity.details.reason.includes('refund')))) {
      return 'refund';
    }

    // Default source for points
    return activity.details.source || null;
  };

  // Determine if this is an admin action that should be excluded
  const isAdminAction = () => {
    // Check if this is an admin action
    if (activity.actionType === 'admin' || 
        (activity.details && activity.details.actionType === 'admin')) {
      return true;
    }
    
    // Check if activity is related to admin actions
    if (activity.details && (
        activity.details.action === 'confirm_subscription' ||
        activity.details.action === 'reject_subscription' ||
        activity.details.action === 'admin_addition' ||
        activity.details.confirmedBy)) {
      return true;
    }
    
    return false;
  };

  // Determine if an activity is related to a subscription
  const isSubscriptionActivity = () => {
    const actualType = getActivityActualType();
    
    // Check direct indicators in details
    if (actualType === 'new_subscription' || 
        actualType === 'cancel_subscription' ||
        actualType === 'subscription_cancel' ||
        activity.actionType === 'subscription_cancel' ||
        actualType === 'enable_auto_renew' ||
        actualType === 'disable_auto_renew' ||
        actualType === 'subscription') {
      return true;
    }
    
    // Check if it has plan details
    if (activity.details && (
        activity.details.planId || 
        activity.details.planName)) {
      return true;
    }
    
    // Check title/description for subscription keywords
    if ((activity.title && (
         activity.title.includes('اشتراك') || 
         activity.title.includes('subscription') ||
         activity.title.includes('إلغاء'))) ||
        (activity.description && (
         activity.description.includes('اشتراك') ||
         activity.description.includes('subscription') ||
         activity.description.includes('إلغاء')))) {
      return true;
    }
    
    return false;
  };

  // Determine if an activity is related to a wallet transaction
  const isWalletActivity = () => {
    const actualType = getActivityActualType();
    
    // Check direct indicators in details
    if (actualType === 'wallet_payment' || 
        actualType === 'wallet_deposit') {
      return true;
    }
    
    // Check title/description for wallet keywords
    if ((activity.title && (
         activity.title.includes('محفظة') || 
         activity.title.includes('wallet'))) || 
        (activity.description && (
         activity.description.includes('محفظة') ||
         activity.description.includes('wallet')))) {
      return true;
    }
    
    return false;
  };

  // Determine if an activity is related to points
  const isPointsActivity = () => {
    const actualType = getActivityActualType();
    
    // Check direct indicators
    if (actualType === 'points_awarded' || 
        actualType === 'add' ||
        actualType === 'deduct' ||
        actualType === 'award' ||
        actualType === 'points_award') {
      return true;
    }
    
    // If activity type is directly marked as points
    if (activity.type === 'points' || 
        activity.actionType === 'points' || 
        activity.actionType === 'points_reward' || 
        activity.actionType === 'points_purchase') {
      return true;
    }
    
    // Check for points amount in details
    if (activity.details && (
        activity.details.points !== undefined || 
        activity.details.pointsAwarded !== undefined ||
        activity.details.pointsReceived !== undefined)) {
      return true;
    }
    
    // Check title/description for points keywords
    if ((activity.title && (
         activity.title.includes('نقاط') || 
         activity.title.includes('points'))) || 
        (activity.description && (
         activity.description.includes('نقاط') ||
         activity.description.includes('points')))) {
      return true;
    }
    
    return false;
  };

  // Determine if an activity is related to extraction/message/comment
  const isContentActivity = () => {
    if (activity.actionType === 'extraction' || 
        activity.actionType === 'post' || 
        activity.actionType === 'comment' || 
        activity.actionType === 'reaction' || 
        activity.actionType === 'message') {
      return true;
    }
    
    if (activity.module === 'extraction' || 
        activity.module === 'post' || 
        activity.module === 'comment' || 
        activity.module === 'reaction' || 
        activity.module === 'message') {
      return true;
    }
    
    return false;
  };

  // Determine if an activity is related to payment or refund
  const isPaymentActivity = () => {
    if (activity.actionType === 'refund' || 
        (activity.details && activity.details.operation === 'refund')) {
      return true;
    }
    
    if (activity.actionType === 'payment' || 
        activity.module === 'payment' || 
        (activity.details && activity.details.module === 'payment')) {
      return true;
    }
    
    const actualType = getActivityActualType();
    if (actualType === 'refund' || actualType === 'payment') {
      return true;
    }
    
    return false;
  };

  // Determine if points are being deducted
  const isPointsDeduction = () => {
    const actualType = getActivityActualType();
    
    if (actualType === 'deduct') {
      return true;
    }
    
    if (activity.details && activity.details.operation === 'deduct') {
      return true;
    }
    
    // Look for keywords in title/description
    if ((activity.title && activity.title.includes('خصم')) || 
        (activity.description && activity.description.includes('خصم'))) {
      return true;
    }
    
    // Check for a negative points value
    if (activity.details && 
        activity.details.points && 
        activity.details.points < 0) {
      return true;
    }
    
    return false;
  };

  // Get the appropriate icon based on activity type and details
  const getActivityIcon = () => {
    // First check for special activity types
    if (isSubscriptionActivity()) {
      const actualType = getActivityActualType();
      // Check if it's a cancellation
      if (actualType === 'cancel_subscription') {
        return <CloseCircleOutlined style={{ color: '#f5222d' }} />;
      }
      // New subscription or auto-renew enablement
      return <CheckCircleOutlined style={{ color: '#1890ff' }} />;
    }
    
    if (isWalletActivity()) {
      return <CreditCardOutlined style={{ color: '#722ed1' }} />;
    }
    
    if (isPaymentActivity()) {
      // Check if it's a refund
      if (activity.details && activity.details.operation === 'refund') {
        return <RollbackOutlined style={{ color: '#52c41a' }} />;
      }
      // Default payment icon
      return <DollarOutlined style={{ color: '#1890ff' }} />;
    }
    
    if (isContentActivity()) {
      if (activity.actionType === 'message') {
        return <MessageOutlined style={{ color: '#1890ff' }} />;
      }
      if (activity.actionType === 'extraction') {
        return <FileSearchOutlined style={{ color: '#722ed1' }} />;
      }
      if (activity.actionType === 'post') {
        return <FileTextOutlined style={{ color: '#13c2c2' }} />;
      }
      if (activity.actionType === 'comment' || activity.actionType === 'reaction') {
        return <CommentOutlined style={{ color: '#fa8c16' }} />;
      }
    }
    
    if (isPointsActivity()) {
      // Check if it's points deduction
      if (isPointsDeduction()) {
        return <MinusOutlined style={{ color: '#f5222d' }} />;
      }
      
      // Check for refund points
      const pointsSource = getPointsSource();
      if (pointsSource === 'refund') {
        return <RollbackOutlined style={{ color: '#52c41a' }} />;
      }
      
      // Points addition
      return <TrophyOutlined style={{ color: '#faad14' }} />;
    }
    
    // Fall back to standard type-based icons
    switch (activity.type || activity.actionType) {
      case 'login':
        return <LoginOutlined style={{ color: '#1890ff' }} />;
      case 'profile':
        return <EditOutlined style={{ color: '#52c41a' }} />;
      case 'security':
        return <SafetyOutlined style={{ color: '#722ed1' }} />;
      case 'settings':
        return <SettingOutlined style={{ color: '#13c2c2' }} />;
      case 'achievement':
        return <TrophyOutlined style={{ color: '#eb2f96' }} />;
      case 'account_add':
        return <UserAddOutlined style={{ color: '#fa8c16' }} />;
      case 'visit':
        return <EyeOutlined style={{ color: '#1890ff' }} />;
      case 'avatar':
        return <UserOutlined style={{ color: '#722ed1' }} />;
      case 'refund':
        return <RollbackOutlined style={{ color: '#52c41a' }} />;
      case 'message':
        return <MessageOutlined style={{ color: '#1890ff' }} />;
      default:
        return <UserOutlined style={{ color: '#8c8c8c' }} />;
    }
  };

  // Generate action text based on activity type and title
  const getActionText = () => {
    const userName = getUserName();
    const actualType = getActivityActualType();
    const amount = getActivityAmount();
    const planName = activity.details?.planName || '';
    const reason = getReasonText();
    
    // Check for subscription-related activities
    if (isSubscriptionActivity()) {
      if (actualType === 'new_subscription') {
        const subAmount = activity.details?.amount || 0;
        
        return (
          <Text>
            <Text strong>{userName}</Text>
            <Text className="activity-money-payment"> {t('activity_new_subscription')} </Text>
            {planName && <Tag color="blue">{planName}</Tag>}
            {subAmount > 0 && (
              <Text className="money-amount negative">{subAmount} {t('currency_symbol')}</Text>
            )}
          </Text>
        );
      }
      
      if (actualType === 'cancel_subscription' || activity.actionType === 'subscription_cancel') {
        return (
          <Text>
            <Text strong>{userName}</Text>
            <Text className="activity-subscription-cancel"> {t('activity_cancel_subscription')}</Text>
            {planName && <Tag color="red">{planName}</Tag>}
          </Text>
        );
      }
      
      if (actualType === 'enable_auto_renew') {
        return (
          <Text>
            <Text strong>{userName}</Text>
            <Text className="activity-subscription-autorenew"> {t('activity_enable_autorenew')}</Text>
            {planName && <Tag color="green">{planName}</Tag>}
          </Text>
        );
      }
      
      if (actualType === 'disable_auto_renew') {
        return (
          <Text>
            <Text strong>{userName}</Text>
            <Text> {t('activity_disable_autorenew')}</Text>
            {planName && <Tag color="orange">{planName}</Tag>}
          </Text>
        );
      }
      
      // Default subscription text
      return (
        <Text>
          <Text strong>{userName}</Text>
          <Text> {t('subscription')} </Text>
          {planName && <Tag color="blue">{planName}</Tag>}
        </Text>
      );
    }
    
    // Check for wallet-related activities
    if (isWalletActivity()) {
      // For wallet deposits, make sure to display the amount even when the deposit is pending
      // Use the requestedAmount first, then fall back to amount
      const walletAmount = activity.details?.requestedAmount || activity.details?.amount || 0;
      
      if (actualType === 'wallet_deposit' || actualType === 'request_wallet_deposit' || actualType === 'confirmed_wallet_deposit') {
        return (
          <Text>
            <Text strong>{userName}</Text>
            <Text> {t('wallet_deposit')} </Text>
            <Text className="money-amount positive">+{walletAmount} {t('currency_symbol')}</Text>
            {reason && <Text className="activity-reason"> ({reason})</Text>}
          </Text>
        );
      }
      
      // Default wallet payment
      return (
        <Text>
          <Text strong>{userName}</Text>
          <Text> {t('wallet_payment')} </Text>
          <Text className="money-amount negative">-{walletAmount} {t('currency_symbol')}</Text>
          {reason && <Text className="activity-reason"> ({reason})</Text>}
        </Text>
      );
    }
    
    // Check for payment or refund activities
    if (isPaymentActivity()) {
      const paymentAmount = activity.details?.amount || 0;
      
      if (activity.details && activity.details.operation === 'refund') {
        return (
          <Text>
            <Text strong>{userName}</Text>
            <Text className="activity-refund"> {t('refund')} </Text>
            <Text className="money-amount positive">+{paymentAmount} {t('currency_symbol')}</Text>
            {reason && <Text className="activity-reason"> ({reason})</Text>}
          </Text>
        );
      }
      
      // Default payment text
      return (
        <Text>
          <Text strong>{userName}</Text>
          <Text className="activity-payment"> {t('purchase')} </Text>
          <Text className="money-amount negative">-{paymentAmount} {t('currency_symbol')}</Text>
          {reason && <Text className="activity-reason"> ({reason})</Text>}
        </Text>
      );
    }
    
    // Check for content-related activities
    if (isContentActivity()) {
      if (activity.actionType === 'extraction') {
        return (
          <Text>
            <Text strong>{userName}</Text>
            <Text> قام باستخراج بيانات </Text>
            {activity.details && activity.details.count && (
              <Tag color="purple">{activity.details.count} عنصر</Tag>
            )}
          </Text>
        );
      }
      
      if (activity.actionType === 'post') {
        return (
          <Text>
            <Text strong>{userName}</Text>
            <Text> قام بنشر محتوى </Text>
            {activity.details && activity.details.platform && (
              <Tag color="blue">{activity.details.platform}</Tag>
            )}
          </Text>
        );
      }
      
      if (activity.actionType === 'comment' || activity.actionType === 'reaction') {
        return (
          <Text>
            <Text strong>{userName}</Text>
            <Text> قام بالتفاعل </Text>
            {activity.details && activity.details.platform && (
              <Tag color="orange">{activity.details.platform}</Tag>
            )}
          </Text>
        );
      }
      
      if (activity.actionType === 'message') {
        return (
          <Text>
            <Text strong>{userName}</Text>
            <Text> أرسل رسالة </Text>
          </Text>
        );
      }
    }
    
    // Special handling for points purchase activities
    if (activity.actionType === 'points_purchase' || actualType === 'purchase_points_wallet') {
      const pointsAmount = activity.details?.pointsReceived || 0;
      const amountPaid = activity.details?.amountPaid || 0;
      
      return (
        <Text>
          <Text strong>{userName}</Text>
          <Text className="activity-points-purchase"> قام بشراء </Text>
          <Text className="points-amount positive">{pointsAmount} {t('points')}</Text>
          {amountPaid > 0 && (
            <Text className="activity-payment-amount"> بقيمة {amountPaid} {t('currency_symbol')}</Text>
          )}
        </Text>
      );
    }
    
    // Check for points-related activities
    if (isPointsActivity()) {
      // Determine if this is points addition or deduction
      if (isPointsDeduction()) {
        return (
          <Text>
            <Text strong>{userName}</Text>
            <Text className="negative-points"> {t('activity_points_deducted')} </Text>
            <Text className="points-amount negative">-{amount} {t('points')}</Text>
            {reason && <Text className="activity-reason"> ({reason})</Text>}
          </Text>
        );
      } else {
        // Get the source of points to provide better context
        const pointsSource = getPointsSource();
        
        // Customized message based on points source
        if (pointsSource === 'membership' && planName) {
          return (
            <Text>
              <Text strong>{userName}</Text>
              <Text className="positive-points"> حصل على </Text>
              <Text className="points-amount positive">{amount} {t('points')}</Text>
              <Text className="positive-points"> من الاشتراك في خطة </Text>
              <Tag color="blue">{planName}</Tag>
            </Text>
          );
        } else if (pointsSource === 'auto_renewal' && planName) {
          return (
            <Text>
              <Text strong>{userName}</Text>
              <Text className="positive-points"> حصل على </Text>
              <Text className="points-amount positive">{amount} {t('points')}</Text>
              <Text className="positive-points"> من تجديد الاشتراك في خطة </Text>
              <Tag color="green">{planName}</Tag>
            </Text>
          );
        } else if (pointsSource === 'refund') {
          return (
            <Text>
              <Text strong>{userName}</Text>
              <Text className="positive-points"> تم استرجاع </Text>
              <Text className="points-amount positive">{amount} {t('points')}</Text>
              {reason && <Text className="activity-reason"> ({reason})</Text>}
            </Text>
          );
        } else if (pointsSource === 'achievement') {
          return (
            <Text>
              <Text strong>{userName}</Text>
              <Text className="positive-points"> حصل على </Text>
              <Text className="points-amount positive">{amount} {t('points')}</Text>
              <Text className="positive-points"> من إنجاز </Text>
              {activity.details.achievementName && 
                <Tag color="purple">{activity.details.achievementName}</Tag>}
            </Text>
          );
        } else if (pointsSource === 'admin') {
          return (
            <Text>
              <Text strong>{userName}</Text>
              <Text className="positive-points"> حصل على </Text>
              <Text className="points-amount positive">{amount} {t('points')}</Text>
              <Text className="positive-points"> بواسطة المشرف </Text>
              {reason && <Text className="activity-reason"> ({reason})</Text>}
            </Text>
          );
        } else {
          // Default points addition
          return (
            <Text>
              <Text strong>{userName}</Text>
              <Text className="positive-points"> حصل على </Text>
              <Text className="points-amount positive">{amount} {t('points')}</Text>
              {reason && <Text className="activity-reason"> ({reason})</Text>}
              {planName && (
                <>
                  <Text className="positive-points"> من </Text>
                  <Tag color="gold">{planName}</Tag>
                </>
              )}
            </Text>
          );
        }
      }
    }
    
    // If the activity has a specific description, use it
    if (activity.description && 
        !activity.description.includes('تم خصم نقاط منه') && 
        !activity.description.includes('حصل على نقاط')) {
      // Check if the description is an achievement translation key
      const description = activity.description && 
        activity.description.includes('achievement_') ? t(activity.description) : activity.description;
      
      return (
        <Text>
          <Text strong>{userName}</Text>
          <Text> {description}</Text>
        </Text>
      );
    }

    // Default activity types
    switch (activity.type || activity.actionType) {
      case 'login':
        return (
          <Text>
            <Text strong>{userName}</Text>
            <Text> {t('activityLogin')}</Text>
          </Text>
        );
      case 'profile':
        return (
          <Text>
            <Text strong>{userName}</Text>
            <Text> {t('activityProfile')}</Text>
          </Text>
        );
      case 'achievement':
        return (
          <Text>
            <Text strong>{userName}</Text>
            <Text>
              {t('activityAchievement')}: {
                activity.title && (() => {
                  // Handle the case where the title format is "فتح إنجاز جديد: achievement_title_xxx"
                  if (activity.title.includes(': achievement_')) {
                    const parts = activity.title.split(': ');
                    const prefix = parts[0];
                    const translationKey = parts[1];
                    return `${prefix}: ${t(translationKey)}`;
                  }
                  // Check if the title is a direct translation key
                  else if (activity.title.includes('achievement_')) {
                    return t(activity.title);
                  }
                  // Otherwise use the title as is
                  else {
                    return activity.title;
                  }
                })()
              }
            </Text>
          </Text>
        );
      case 'account_add':
        return (
          <Text>
            <Text strong>{userName}</Text>
            <Text> {t('activitySignup')}</Text>
          </Text>
        );
      case 'visit':
        return (
          <Text>
            <Text strong>{userName}</Text>
            <Text> زار الموقع </Text>
            {activity.details && activity.details.page && (
              <Tag color="blue">{activity.details.page}</Tag>
            )}
          </Text>
        );
      case 'avatar':
        return (
          <Text>
            <Text strong>{userName}</Text>
            <Text> قام بتغيير الصورة الشخصية </Text>
          </Text>
        );
      default:
        // If we have the original title, use it
        if (activity.title && 
            !activity.title.includes('تم خصم نقاط منه') && 
            !activity.title.includes('حصل على نقاط')) {
          return (
            <Text>
              <Text strong>{userName}</Text>
              <Text> {activity.title}</Text>
            </Text>
          );
        }
        
        // Last resort fallback
        return (
          <Text>
            <Text strong>{userName}</Text>
            <Text> {actualType}</Text>
          </Text>
        );
    }
  };

  // Determine the CSS class for the activity based on its type and details
  const getActivityClass = () => {
    let baseClass = "activity-item";
    
    // Check for specific activity types first
    if (isSubscriptionActivity()) {
      const actualType = getActivityActualType();
      if (actualType === 'cancel_subscription' || activity.actionType === 'subscription_cancel') {
        return `${baseClass} activity-subscription-cancel`;
      }
      return `${baseClass} activity-subscription-new`;
    }
    
    if (isWalletActivity()) {
      const actualType = getActivityActualType();
      if (actualType === 'wallet_deposit' || actualType === 'request_wallet_deposit' || actualType === 'confirmed_wallet_deposit') {
        return `${baseClass} activity-wallet-deposit`;
      }
      return `${baseClass} activity-wallet-payment`;
    }
    
    // Special case for points purchase
    if (activity.actionType === 'points_purchase' || getActivityActualType() === 'purchase_points_wallet') {
      return `${baseClass} activity-points-purchase`;
    }
    
    if (isPaymentActivity()) {
      const pointsSource = getPointsSource();
      if (pointsSource === 'refund' || 
          (activity.details && activity.details.operation === 'refund')) {
        return `${baseClass} activity-refund`;
      }
      return `${baseClass} activity-payment`;
    }
    
    if (isContentActivity()) {
      if (activity.actionType === 'extraction') {
        return `${baseClass} activity-extraction`;
      }
      if (activity.actionType === 'post') {
        return `${baseClass} activity-post`;
      }
      if (activity.actionType === 'comment' || activity.actionType === 'reaction') {
        return `${baseClass} activity-interaction`;
      }
      if (activity.actionType === 'message') {
        return `${baseClass} activity-message`;
      }
    }
    
    if (isPointsActivity()) {
      const pointsSource = getPointsSource();
      
      // Check if it's a deduction
      if (isPointsDeduction()) {
        return `${baseClass} activity-points-deduct`;
      }
      
      // Special class for membership-related points
      if (pointsSource === 'membership' || pointsSource === 'auto_renewal') {
        return `${baseClass} activity-points-add membership-points`;
      }
      
      // Special class for refund-related points
      if (pointsSource === 'refund') {
        return `${baseClass} activity-points-refund`;
      }
      
      return `${baseClass} activity-points-add`;
    }
    
    // Fall back to standard type-based classes
    switch (activity.type || activity.actionType) {
      case 'login':
        return `${baseClass} activity-login`;
      case 'profile':
        return `${baseClass} activity-profile`;
      case 'security':
        return `${baseClass} activity-security`;
      case 'settings':
        return `${baseClass} activity-settings`;
      case 'achievement':
        return `${baseClass} activity-achievement`;
      case 'visit':
        return `${baseClass} activity-visit`;
      case 'avatar':
        return `${baseClass} activity-avatar`;
      case 'refund':
        return `${baseClass} activity-refund`;
      case 'message':
        return `${baseClass} activity-message`;
      default:
        return baseClass;
    }
  };

  // Skip displaying admin actions if configured to hide them
  if (isAdminAction()) {
    return null;
  }
  
  // Check special cases that should always be shown
  const shouldAlwaysShow = () => {
    // Always show subscription cancellations
    if (activity.actionType === 'subscription_cancel' || 
        (activity.details && activity.details.action === 'cancel_subscription')) {
      return true;
    }
    
    // Always show points purchases
    if (activity.actionType === 'points_purchase' || 
        (activity.details && activity.details.action === 'purchase_points_wallet')) {
      return true;
    }
    
    // Always show wallet deposits regardless of status
    if (activity.actionType === 'wallet_deposit' || 
        (activity.details && 
         (activity.details.action === 'request_wallet_deposit' || 
          activity.details.action === 'confirmed_wallet_deposit'))) {
      return true;
    }
    
    return false;
  };
  
  // Skip subscription, membership, and wallet related activities
  // BUT allow special cases like cancellations and points purchases
  if (!shouldAlwaysShow() && 
      (isSubscriptionActivity() || 
      isWalletActivity() || 
      activity.actionType === 'subscription_create' || 
      activity.actionType === 'subscription_update' || 
      activity.actionType === 'wallet_deposit' ||
      (activity.module === 'membership') ||
      (activity.module === 'wallet'))) {
    return null;
  }

  return (
    <div className={getActivityClass()} data-source={isPointsActivity() ? getPointsSource() : activity.actionType || activity.type}>
      <div className="activity-avatar">
        <Tooltip title={getUserName()}>
          <Avatar 
            src={getAvatarUrl()} 
            icon={!getAvatarUrl() && getActivityIcon()}
            size={40}
            className={`activity-avatar-${activity.type || activity.actionType || 'default'}`}
          />
        </Tooltip>
      </div>
      
      <div className="activity-content">
        <div className="activity-message">
          {getActionText()}
        </div>
        
        <div className="activity-time">
          <Text type="secondary">{formatCustomRelativeTime(activity.date, t)}</Text>
        </div>
      </div>
    </div>
  );
};

ActivityItem.propTypes = {
  activity: PropTypes.shape({
    _id: PropTypes.string,
    userId: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    type: PropTypes.string,
    actionType: PropTypes.string,
    date: PropTypes.string,
    details: PropTypes.object
  }).isRequired,
  user: PropTypes.object,
  activityUser: PropTypes.object
};

export default ActivityItem;