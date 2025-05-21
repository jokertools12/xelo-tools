import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMembership } from '../utils/membershipUtils';
import api from '../utils/api';
import { useNotification } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';
import PriceDisplay from '../components/PriceDisplay';
import '../styles/MembershipManagement.css';
import { Spin, ConfigProvider } from 'antd';
import ContentContainer from '../components/ContentContainer';

const MembershipManagement = () => {
  const { addNotification } = useNotification();
  const { hasMembership, membershipType, membershipExpires } = useMembership();
  const { t, direction, currentLanguage } = useLanguage(); // Import translation function and direction
  const [subscription, setSubscription] = useState(null);
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const navigate = useNavigate();

  // Fetch user's active subscription
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/subscriptions/my');
        
        if (response.data.subscription) {
          setSubscription(response.data.subscription);
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
        addNotification({
          title: t('error'),
          message: t('subscription_fetch_error'),
          type: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscription();
  }, [addNotification, t]);

  // Fetch user's payment history
  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const response = await api.get('/payments/my');
        setPayments(response.data);
      } catch (error) {
        console.error('Error fetching payments:', error);
        addNotification({
          title: t('error'),
          message: t('payments_fetch_error'),
          type: 'error'
        });
      }
    };

    fetchPayments();
  }, [addNotification, t]);

  const handleToggleAutoRenew = async () => {
    if (!subscription || !subscription._id) return;

    try {
      setIsLoading(true);
      const newAutoRenewValue = !subscription.autoRenew;
      
      await api.put(`/subscriptions/${subscription._id}/auto-renew`, {
        autoRenew: newAutoRenewValue
      });

      // Update local state
      setSubscription({
        ...subscription,
        autoRenew: newAutoRenewValue
      });

      addNotification({
        title: t('success'),
        message: newAutoRenewValue 
          ? t('auto_renew_enabled_message') 
          : t('auto_renew_disabled_message'),
        type: 'success'
      });
    } catch (error) {
      console.error('Error updating auto-renew:', error);
      addNotification({
        title: t('error'),
        message: t('auto_renew_update_error'),
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription || !subscription._id) return;

    try {
      setIsLoading(true);
      
      await api.put(`/subscriptions/${subscription._id}/cancel`);

      addNotification({
        title: t('success'),
        message: t('subscription_cancelled'),
        type: 'success'
      });

      // Refresh the subscription data
      const updatedSubResponse = await api.get('/subscriptions/my');
      if (updatedSubResponse.data.subscription) {
        setSubscription(updatedSubResponse.data.subscription);
      } else {
        setSubscription(null);
      }
      
      // Reset the confirmation state
      setConfirmCancel(false);
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      addNotification({
        title: t('error'),
        message: t('cancel_subscription_error'),
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active':
        return <span className="status-badge active">{t('status_active')}</span>;
      case 'pending':
        return <span className="status-badge pending">{t('status_pending')}</span>;
      case 'expired':
        return <span className="status-badge expired">{t('status_expired')}</span>;
      case 'cancelled':
        return <span className="status-badge cancelled">{t('status_cancelled')}</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  const getPaymentStatusLabel = (status) => {
    switch (status) {
      case 'confirmed':
        return <span className="status-badge active">{t('status_confirmed')}</span>;
      case 'pending':
        return <span className="status-badge pending">{t('status_pending_review')}</span>;
      case 'rejected':
        return <span className="status-badge cancelled">{t('status_rejected')}</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  const getPaymentMethodLabel = (method) => {
    switch (method) {
      case 'vodafone_cash':
        return t('vodafone_cash');
      case 'etisalat_cash':
        return t('etisalat_cash');
      case 'wallet':
        return t('my_wallet_label');
      default:
        return method;
    }
  };

  const renderSubscriptionDetails = () => {
    if (isLoading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <Spin size="large" />
        </div>
      );
    }

    if (!subscription) {
      return (
        <div className="no-subscription" dir={direction}>
          <h3>{t('no_active_subscription')}</h3>
          <p>{t('subscribe_message')}</p>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/membership')}
          >
            {t('subscribe_now')}
          </button>
        </div>
      );
    }

    // Check if the plan has points
    const pointsAwarded = subscription.plan?.points || 0;
    
    return (
      <div className="subscription-details" dir={direction}>
        <div className={`subscription-header ${direction === 'rtl' ? 'rtl-header' : ''}`}>
          <h3>{t('subscription_details')}</h3>
          {getStatusLabel(subscription.status)}
        </div>

        <div className={`subscription-info ${direction === 'rtl' ? 'rtl-subscription-info rtl-text' : ''}`}>
          <div className="info-group">
            <span className="info-label">{t('plan_label')}</span>
            <span className="info-value">{subscription.plan?.name || t('plan_undefined')}</span>
          </div>
          
          <div className="info-group">
            <span className="info-label">{t('start_date')}</span>
            <span className="info-value">{formatDate(subscription.startDate)}</span>
          </div>
          
          <div className="info-group">
            <span className="info-label">{t('end_date')}</span>
            <span className="info-value">{formatDate(subscription.endDate)}</span>
          </div>

          <div className="info-group">
            <span className="info-label">{t('price_label')}</span>
            <span className="info-value">
              <PriceDisplay 
                amount={subscription.plan?.price || 0} 
                showEgp={false} 
                showDetail={false} 
                currency={t('currency_usd')}
              />
            </span>
          </div>
          
          {/* Display points awarded */}
          {pointsAwarded > 0 && (subscription.status === 'active' || subscription.status === 'pending') && (
            <div className="info-group points-group">
              <span className="info-label">
                <span className="points-icon">🏆</span> {t('bonus_points_label')}
              </span>
              <span className="info-value points-value">{pointsAwarded} {t('points_unit')}</span>
              {subscription.status === 'active' && (
                <small className="points-note">{t('points_added_to_account')}</small>
              )}
              {subscription.status === 'pending' && (
                <small className="points-note">{t('points_will_be_added')}</small>
              )}
            </div>
          )}

          <div className="info-group">
            <span className="info-label">{t('auto_renew')}</span>
            <div className="info-value toggle-container">
              <span>{subscription.autoRenew ? t('auto_renew_enabled') : t('auto_renew_disabled')}</span>
              {subscription.status === 'active' && (
                <button 
                  className={`toggle-btn ${direction === 'rtl' ? 'rtl-toggle-btn' : ''}`}
                  onClick={handleToggleAutoRenew}
                  disabled={isLoading}
                >
                  {subscription.autoRenew ? t('disable') : t('enable')}
                </button>
              )}
            </div>
          </div>
        </div>

        {subscription.status === 'active' && !confirmCancel ? (
          <button 
            className="btn btn-danger"
            onClick={() => setConfirmCancel(true)}
            disabled={isLoading}
          >
            {t('cancel_subscription')}
          </button>
        ) : subscription.status === 'active' && confirmCancel ? (
          <div className={`cancel-confirmation ${direction === 'rtl' ? 'rtl-cancel-confirmation' : ''}`} dir={direction}>
            <div className="warning-message">
              <h4>{t('warning')}</h4>
              <p>{t('cancel_warning_message')}</p>
              <ul className={`feature-list ${direction === 'rtl' ? 'rtl-feature-list' : ''}`}>
                <li>{t('feature_comments')}</li>
                <li>{t('feature_reactions')}</li>
                <li>{t('feature_groups')}</li>
                <li>{t('feature_pages')}</li>
                <li>{t('feature_auto_post')}</li>
                <li>{t('feature_other')}</li>
              </ul>
              <p className="extra-warning">{t('irreversible_action')}</p>
            </div>
            <p>{t('confirm_cancel')}</p>
            <div className="action-buttons">
              <button 
                className="btn btn-danger"
                onClick={handleCancelSubscription}
                disabled={isLoading}
              >
                {t('yes_cancel')}
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setConfirmCancel(false)}
                disabled={isLoading}
              >
                {t('no_keep')}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  // Get appropriate payment icon based on transaction type and method
  const getPaymentMethodIcon = (payment) => {
    // Check if this is a wallet top-up (no subscription ID) or a subscription payment
    const isWalletTopUp = !payment.subscriptionId;
    
    if (isWalletTopUp) {
      // Icons for wallet top-up operations
      switch (payment.paymentMethod) {
        case 'vodafone_cash':
          return '💰📱';
        case 'etisalat_cash':
          return '💰📲';
        default:
          return '💰';
      }
    } else {
      // Icons for subscription payments
      switch (payment.paymentMethod) {
        case 'vodafone_cash':
          return '📱';
        case 'etisalat_cash':
          return '📲';
        case 'wallet':
          return '💳';
        default:
          return '💰';
      }
    }
  };

  // Get transaction type style class
  const getTransactionTypeClass = (payment) => {
    if (!payment.subscriptionId) {
      return 'wallet-topup-row';
    } else if (payment.paymentMethod === 'wallet') {
      return 'wallet-payment-row';
    } else {
      return '';
    }
  };

  // Generate descriptive text for the payment
  const getPaymentDescription = (payment) => {
    // Check if this is a wallet top-up (no subscription ID) or a subscription payment
    const isWalletTopUp = !payment.subscriptionId;
    
    if (isWalletTopUp) {
      // Wallet top-up description
      const methodName = getPaymentMethodLabel(payment.paymentMethod);
      return t('wallet_topup', { method: methodName });
    } else {
      // Subscription payment description
      const planName = payment.subscriptionId?.plan?.name || t('default_plan');
      
      if (payment.paymentMethod === 'wallet') {
        return t('auto_wallet_payment', { plan: planName });
      } else {
        const methodName = getPaymentMethodLabel(payment.paymentMethod);
        return t('subscription_payment', { plan: planName, method: methodName });
      }
    }
  };

  const renderPaymentHistory = () => {
    if (payments.length === 0) {
      return <p className="no-payments">{t('no_payment_records')}</p>;
    }

    return (
      <div className="payment-history" dir={direction}>
      <table className={`payment-table ${direction === 'rtl' ? 'rtl-table payment-table-rtl' : ''}`}>
          <thead>
            <tr>
              <th>{t('payment_date')}</th>
              <th>{t('payment_amount')}</th>
              <th>{t('payment_method')}</th>
              <th>{t('payment_description')}</th>
              <th>{t('payment_reference')}</th>
              <th>{t('payment_status')}</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(payment => {
              const isWalletTopUp = !payment.subscriptionId;
              return (
                <tr 
                  key={payment._id} 
                  className={`payment-row ${getTransactionTypeClass(payment)} ${payment.status === 'confirmed' ? 'confirmed-payment-row' : ''} ${payment.status === 'rejected' ? 'rejected-payment-row' : ''}`}
                >
                  <td>{formatDate(payment.createdAt)}</td>
                  <td>
                    <PriceDisplay 
                      amount={payment.amount} 
                      paymentMethod={payment.paymentMethod} 
                      size="small" 
                      inline={true}
                      currency={t('currency_usd')}
                    />
                  </td>
                  <td>
                    <span className={`payment-method ${payment.paymentMethod}-method ${isWalletTopUp ? 'topup-method' : ''}`}>
                      <span className="payment-icon">{getPaymentMethodIcon(payment)}</span>
                      {getPaymentMethodLabel(payment.paymentMethod)}
                    </span>
                  </td>
                  <td className={`payment-description ${isWalletTopUp ? 'topup-description' : ''}`}>
                    {getPaymentDescription(payment)}
                    {payment.status === 'rejected' && payment.adminNote && (
                      <div className="rejection-reason">
                        <span className="rejection-label">{t('rejection_reason')}</span>
                        <span className="rejection-text">{payment.adminNote}</span>
                      </div>
                    )}
                  </td>
                  <td>
                    {payment.paymentMethod === 'wallet' && !isWalletTopUp ? (
                      <span className="auto-payment">{t('auto_payment')}</span>
                    ) : (
                      <span className="reference-number">{payment.referenceNumber || '-'}</span>
                    )}
                  </td>
                  <td>{getPaymentStatusLabel(payment.status)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <ConfigProvider direction={direction}>
      <ContentContainer isLoading={isLoading} direction={direction}>
        <div className="membership-management-page" dir={direction}>
          <div className="page-header">
            <h1>{t('membership_management')}</h1>
            <p>{t('management_description')}</p>
          </div>

          <div className={`content-container ${direction === 'rtl' ? 'rtl-container' : ''}`}>
            <div className="section subscription-section">
          <h2 className="section-title">{t('current_subscription')}</h2>
          {renderSubscriptionDetails()}
        </div>

        <div className="section payment-section">
          <h2 className="section-title">{t('payment_history')}</h2>
          {renderPaymentHistory()}
        </div>
      </div>

      <div className={`actions ${direction === 'rtl' ? 'rtl-actions' : ''}`}>
        <button 
          className="btn btn-secondary"
          onClick={() => navigate('/membership')}
        >
          {t('view_membership_plans')}
        </button>
      </div>
        </div>
      </ContentContainer>
    </ConfigProvider>
  );
};

export default MembershipManagement;