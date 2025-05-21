import React from 'react';
import { Tooltip, Avatar, Tag } from 'antd';
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
  CreditCardOutlined
} from '@ant-design/icons';
import { formatRelativeTime, formatLongDate } from '../utils/dateUtils';
import '../styles/ActivityDisplay.css';

/**
 * Component to properly display user activities
 * Handles different types of activities and shows appropriate icons and messages
 */
const ActivityDisplay = ({ activity, t }) => {
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
    return activity.type || 'unknown';
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

    if (activity.details.amount !== undefined) {
      return activity.details.amount;
    }

    return 0;
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
  
  // Determine if this is a subscription, membership, or wallet activity that should be excluded
  const isMembershipOrWalletActivity = () => {
    if (isSubscriptionActivity() ||
        isWalletActivity() ||
        activity.actionType === 'subscription_create' ||
        activity.actionType === 'subscription_cancel' ||
        activity.actionType === 'subscription_update' ||
        activity.actionType === 'wallet_deposit' ||
        activity.actionType === 'points_purchase' ||
        (activity.module === 'membership') ||
        (activity.module === 'wallet')) {
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
         activity.title.includes('subscription'))) ||
        (activity.description && (
         activity.description.includes('اشتراك') ||
         activity.description.includes('subscription')))) {
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
        actualType === 'award') {
      return true;
    }
    
    // If activity type is directly marked as points
    if (activity.type === 'points') {
      return true;
    }
    
    // Check for points amount in details
    if (activity.details && (
        activity.details.points !== undefined || 
        activity.details.pointsAwarded !== undefined)) {
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
    
    if (isPointsActivity()) {
      // Check if it's points deduction
      if (isPointsDeduction()) {
        return <MinusOutlined style={{ color: '#f5222d' }} />;
      }
      // Points addition
      return <TrophyOutlined style={{ color: '#faad14' }} />;
    }
    
    // Regular activity icons based on type
    switch (activity.type) {
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
      default:
        return <UserOutlined style={{ color: '#8c8c8c' }} />;
    }
  };

  // Get the proper title for the activity
  const getActivityTitle = () => {
    const actualType = getActivityActualType();
    
    // Check for specific activity types
    if (isSubscriptionActivity()) {
      if (actualType === 'new_subscription') {
        return t('activity_new_subscription');
      }
      
      if (actualType === 'cancel_subscription') {
        return t('activity_cancel_subscription');
      }
      
      if (actualType === 'enable_auto_renew') {
        return t('activity_enable_autorenew');
      }
      
      if (actualType === 'disable_auto_renew') {
        return t('activity_disable_autorenew');
      }
      
      // Generic subscription title
      return t('subscription');
    }
    
    if (isWalletActivity()) {
      if (actualType === 'wallet_deposit') {
        return t('wallet_deposit');
      }
      return t('wallet_payment');
    }
    
    if (isPointsActivity()) {
      // Determine if it's addition or deduction
      if (isPointsDeduction()) {
        return t('points_deducted_title');
      }
      
      return t('points_awarded_title');
    }

    // Default titles based on activity type
    switch (activity.type) {
      case 'login':
        return t('login_activity');
      case 'profile':
        return t('profile_activity');
      case 'security':
        return t('security_activity');
      case 'settings':
        return t('settings_activity');
      default:
        // If we have a specific title that's not generic, use it
        if (activity.title && 
            !activity.title.includes('تم خصم نقاط منه') && 
            !activity.title.includes('حصل على نقاط')) {
          return activity.title;
        }
        
        return t('user_activity');
    }
  };
  
  // Get the proper description for the activity
  const getActivityDescription = () => {
    const actualType = getActivityActualType();
    const amount = getActivityAmount();
    const planName = activity.details?.planName || '';
    
    // Check for specific activity types
    if (isSubscriptionActivity()) {
      if (actualType === 'new_subscription') {
        const subAmount = activity.details?.amount || 0;
        
        return (
          <span>
            {t('activity_new_subscription')} 
            {planName && <Tag color="blue">{planName}</Tag>}
            {subAmount > 0 && (
              <span className="money-amount negative">{subAmount} {t('currency_symbol')}</span>
            )}
          </span>
        );
      }
      
      if (actualType === 'cancel_subscription') {
        return (
          <span>
            {t('activity_cancel_subscription')}
            {planName && <Tag color="red">{planName}</Tag>}
          </span>
        );
      }
      
      if (actualType === 'enable_auto_renew') {
        return (
          <span>
            {t('activity_enable_autorenew')}
            {planName && <Tag color="green">{planName}</Tag>}
          </span>
        );
      }
      
      if (actualType === 'disable_auto_renew') {
        return (
          <span>
            {t('activity_disable_autorenew')}
            {planName && <Tag color="orange">{planName}</Tag>}
          </span>
        );
      }
      
      // Generic subscription description
      return (
        <span>
          {t('subscription')}
          {planName && <Tag color="blue">{planName}</Tag>}
        </span>
      );
    }
    
    if (isWalletActivity()) {
      const walletAmount = activity.details?.amount || 0;
      
      if (actualType === 'wallet_deposit') {
        return (
          <span>
            {t('wallet_deposit')}
            <span className="money-amount positive"> +{walletAmount} {t('currency_symbol')}</span>
          </span>
        );
      }
      
      return (
        <span>
          {t('wallet_payment')}
          <span className="money-amount negative"> -{walletAmount} {t('currency_symbol')}</span>
        </span>
      );
    }
    
    if (isPointsActivity()) {
      // Determine if it's addition or deduction
      if (isPointsDeduction()) {
        return (
          <span>
            {t('activity_points_deducted')} 
            <span className="points-amount negative">-{amount} {t('points')}</span>
          </span>
        );
      }
      
      return (
        <span>
          {t('activity_points_received')} 
          {planName && <Tag color="green">{planName}</Tag>}
          <span className="points-amount positive">+{amount} {t('points')}</span>
        </span>
      );
    }

    // If the activity has a specific description already, use it
    if (activity.description && 
        !activity.description.includes('تم خصم نقاط منه') && 
        !activity.description.includes('حصل على نقاط')) {
      return activity.description;
    }

    // Default descriptions based on activity type
    switch (activity.type) {
      case 'login':
        return t('login_description');
      case 'profile':
        return t('profile_description');
      case 'security':
        return t('security_description');
      case 'settings':
        return t('settings_description');
      default:
        return t('generic_activity_description');
    }
  };

  // Determine the CSS class for this activity type
  const getActivityClass = () => {
    let baseClass = 'activity-item';
    
    // Check for specific activity types first
    if (isSubscriptionActivity()) {
      const actualType = getActivityActualType();
      if (actualType === 'cancel_subscription') {
        return `${baseClass} activity-subscription-cancel`;
      }
      return `${baseClass} activity-subscription-new`;
    }
    
    if (isWalletActivity()) {
      const actualType = getActivityActualType();
      if (actualType === 'wallet_deposit') {
        return `${baseClass} activity-wallet-deposit`;
      }
      return `${baseClass} activity-wallet-payment`;
    }
    
    if (isPointsActivity()) {
      // Check if it's a deduction
      if (isPointsDeduction()) {
        return `${baseClass} activity-points-deduct`;
      }
      return `${baseClass} activity-points-add`;
    }
    
    // Fall back to standard type-based classes
    switch (activity.type) {
      case 'login':
        return `${baseClass} activity-login`;
      case 'profile':
        return `${baseClass} activity-profile`;
      case 'security':
        return `${baseClass} activity-security`;
      case 'settings':
        return `${baseClass} activity-settings`;
      default:
        return baseClass;
    }
  };

  // Skip displaying admin actions and membership/wallet activities
  if (isAdminAction() || isMembershipOrWalletActivity()) {
    return null;
  }

  return (
    <div className={getActivityClass()}>
      <div className="activity-icon">
        {getActivityIcon()}
      </div>
      <div className="activity-content">
        <div className="activity-header">
          <span className="activity-title">{getActivityTitle()}</span>
          <Tooltip title={formatLongDate(activity.date)}>
            <span className="activity-time">{formatRelativeTime(activity.date)}</span>
          </Tooltip>
        </div>
        <div className="activity-description">
          {getActivityDescription()}
        </div>
      </div>
    </div>
  );
};

export default ActivityDisplay;