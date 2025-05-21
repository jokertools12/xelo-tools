import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMembership } from '../utils/membershipUtils';
import { useUser } from '../context/UserContext';
import { useNotification } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../utils/api';
import PriceDisplay from '../components/PriceDisplay';
import { Modal, Spin, ConfigProvider } from 'antd';
import '../styles/Membership.css';
import ContentContainer from '../components/ContentContainer';

const Membership = () => {
  const { addNotification } = useNotification();
  const { user } = useUser();
  const { hasMembership, membershipType, membershipExpires } = useMembership();
  const { t, direction, currentLanguage } = useLanguage();
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState('plans'); // plans, payment, confirmation
  const [paymentData, setPaymentData] = useState({
    paymentMethod: 'electronic_wallets',
    phoneNumber: '',
    referenceNumber: '',
    screenshot: ''
  });
  const [insufficientFunds, setInsufficientFunds] = useState(false);
  const [pendingSubscriptionError, setPendingSubscriptionError] = useState(null);
  const [showPendingSubscriptionModal, setShowPendingSubscriptionModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Handle redirect state from sessionStorage
  useEffect(() => {
    try {
      // Check for stored redirect data in sessionStorage
      const redirectData = sessionStorage.getItem('membershipRedirect');
      
      if (redirectData) {
        // Parse the redirect data
        const parsedData = JSON.parse(redirectData);
        
        // Show notification about restricted feature
        if (parsedData.from && parsedData.requiredFeature) {
          addNotification({
            title: t('need_membership'),
            message: t('feature_for_paid'),
            type: 'warning'
          });
        }
        
        // Clear the sessionStorage after using it
        sessionStorage.removeItem('membershipRedirect');
      }
      // Also check for react-router state for backward compatibility
      else if (location.state?.from && location.state?.requiredFeature) {
        addNotification({
          title: t('need_membership'),
          message: t('feature_for_paid'),
          type: 'warning'
        });
      }
    } catch (error) {
      console.error('Error processing redirect state:', error);
    }
  }, [addNotification, location, t]);

  // Fetch available plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/membership-plans');
        setPlans(response.data);
      } catch (error) {
        console.error('Error fetching membership plans:', error);
        addNotification({
          title: t('error'),
          message: t('plans_fetch_error'),
          type: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlans();
  }, [addNotification, t]);

  // Fetch user's current subscription
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const response = await api.get('/subscriptions/my');
        // Handle subscription data if needed
      } catch (error) {
        console.error('Error fetching subscription:', error);
      }
    };

    if (user) {
      fetchSubscription();
    }
  }, [user]);

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setStep('payment');
  };

  const handlePaymentInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentData({
      ...paymentData,
      [name]: value
    });
  };

  const handleScreenshotUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentData({
          ...paymentData,
          screenshot: reader.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    
    if (!selectedPlan) {
      addNotification({
        title: t('error'),
        message: t('select_plan_error'),
        type: 'error'
      });
      return;
    }

    // Check wallet balance if payment method is wallet
    if (paymentData.paymentMethod === 'wallet' && user.walletBalance < selectedPlan.price) {
      setInsufficientFunds(true);
      addNotification({
        title: t('insufficient_balance'),
        message: t('wallet_insufficient_message'),
        type: 'error'
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.post('/subscriptions', {
        planId: selectedPlan._id,
        ...paymentData
      });

      const successMessage = paymentData.paymentMethod === 'wallet' 
        ? t('payment_successful') 
        : t('thank_you_message');
      
      // Add points message if applicable
      let pointsMessage = '';
      if (selectedPlan.points && selectedPlan.points > 0) {
        if (paymentData.paymentMethod === 'wallet') {
          pointsMessage = ` ${t('points_added', { points: selectedPlan.points })}`;
        } else {
          pointsMessage = ` ${t('points_on_confirmation', { points: selectedPlan.points })}`;
        }
      }
      
      addNotification({
        title: t('subscription_success'),
        message: successMessage + pointsMessage,
        type: 'success'
      });

      setStep('confirmation');
    } catch (error) {
      console.error('Error creating subscription:', error);
      
      // Check for pending subscription error code
      if (error.response?.data?.code === 'PENDING_SUBSCRIPTION_EXISTS') {
        // Store the error details for the modal
        setPendingSubscriptionError(error.response.data);
        setShowPendingSubscriptionModal(true);
      } else {
        // Show regular notification for other errors
        addNotification({
          title: t('error'),
          message: error.response?.data?.message || t('plans_fetch_error'),
          type: 'error'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    // Use the current language for date formatting
    return new Date(dateString).toLocaleDateString(
      currentLanguage === 'ar' ? 'ar-EG' : 'en-US', 
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }
    );
  };

  // Get plan discount value - it's now set by admin
  const getDiscount = (plan) => {
    return plan.discount || 0;
  };

  // Generate appropriate description for each plan
  const getPlanDescription = (plan) => {
    switch (plan.duration) {
      case 30:
        return t('plan_description_30');
      case 90:
        return t('plan_description_90');
      case 365:
        return t('plan_description_365');
      default:
        return t('plan_description_default');
    }
  };

  // Determine if a plan should be highlighted as recommended
  const isRecommendedPlan = (plan) => {
    // Highlight quarterly plan as recommended
    return plan.duration === 90;
  };

  const renderCurrentMembership = () => {
    if (!hasMembership) {
      return (
        <div className={`current-membership free ${direction === 'rtl' ? 'rtl-membership' : ''}`} dir={direction}>
          <h3>{t('current_membership_free')}</h3>
          <p>{t('upgrade_message')}</p>
        </div>
      );
    }

    return (
      <div className={`current-membership premium ${direction === 'rtl' ? 'rtl-membership' : ''}`} dir={direction}>
        <h3>{t('current_membership', { type: membershipType === 'premium' ? t('membership_premium') : membershipType })}</h3>
        <p>{t('membership_expires', { date: formatDate(membershipExpires) })}</p>
        <button className="btn btn-secondary" onClick={() => navigate('/membership-management')}>
          {t('manage_membership')}
        </button>
      </div>
    );
  };

  const renderPlans = () => {
    if (isLoading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <Spin size="large" />
        </div>
      );
    }

    if (plans.length === 0) {
      return <div className="no-plans">{t('no_plans_available')}</div>;
    }

    return (
      <div className={`plans-container ${direction === 'rtl' ? 'rtl-plans' : ''}`}>
        {plans.map(plan => {
          const discount = getDiscount(plan);
          const isRecommended = isRecommendedPlan(plan);
          
          return (
            <div key={plan._id} className={`plan-card ${isRecommended ? 'recommended' : ''} ${direction === 'rtl' ? 'rtl-card' : ''}`} dir={direction}>
              {isRecommended && <div className={`recommended-badge ${direction === 'rtl' ? 'rtl-badge' : ''}`} dir={direction}>{t('recommended')}</div>}
              {discount > 0 && (
                <div className="discount-badge">
                  <span className="discount-value">{t('discount', { value: discount })}</span>
                </div>
              )}
              
              <h3 className="plan-name">{plan.name}</h3>
              
              <div className="plan-description">
                {plan.description || getPlanDescription(plan)}
              </div>
              
              <div className="plan-price">
                <PriceDisplay amount={plan.price} showEgp={false} showDetail={false} size="large" bold={true} currency={t('currency_usd')} />
              </div>
              
              <div className="plan-duration">{t('duration_days', { days: plan.duration })}</div>
              
              {/* Points display with improved styling */}
              {plan.points > 0 && (
                <div className={`plan-points ${direction === 'rtl' ? 'rtl-points' : ''}`}>
                  <div className="points-icon-circle">🏆</div>
                  <div className="points-info">
                    <span className="points-value">{plan.points}</span>
                    <span className="points-text">{t('points_bonus')}</span>
                  </div>
                </div>
              )}
              
              <div className={`features-container ${direction === 'rtl' ? 'rtl-features' : ''}`}>
                <ul className={`plan-features ${direction === 'rtl' ? 'rtl-list' : ''}`}>
                  {plan.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>
              
              <div className="button-container">
                <button 
                  className="btn btn-primary subscribe-btn"
                  onClick={() => handleSelectPlan(plan)}
                  disabled={hasMembership}
                >
                  {t('subscribe_now')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderPaymentForm = () => {
    if (!selectedPlan) {
      return null;
    }

    return (
      <div className={`payment-container ${direction === 'rtl' ? 'rtl-payment' : ''}`} dir={direction}>
        <button className={`back-btn ${direction === 'rtl' ? 'rtl-back-btn' : ''}`} onClick={() => setStep('plans')}>
          <span className={`back-arrow ${direction === 'rtl' ? 'rtl-back-arrow' : ''}`}>
            {direction === 'rtl' ? '→' : '←'}
          </span> 
          {t('back_to_plans')}
        </button>
        
        <h2>{t('subscribe_to_plan', { name: selectedPlan.name })}</h2>
        <div className={`payment-summary ${direction === 'rtl' ? 'rtl-summary' : ''}`}>
          <p className="amount-line">{t('amount')} <PriceDisplay
            currency={t('currency_usd')}
            amount={selectedPlan.price} 
            paymentMethod={paymentData.paymentMethod}
            showDetail={true} 
          /></p>
          <p>{t('duration', { days: selectedPlan.duration })}</p>
          {selectedPlan.points > 0 && (
            <p className="points-summary">{t('bonus_points', { points: selectedPlan.points })}</p>
          )}
          
          {/* Enhanced wallet balance display - shown only for wallet payment method */}
          {user && user.walletBalance !== undefined && paymentData.paymentMethod === 'wallet' && (
            <div className={`wallet-balance-card ${direction === 'rtl' ? 'rtl-balance-card' : ''}`}>
              <div className="wallet-balance-header">
                <span className="wallet-icon">💼</span>
                <span className="wallet-title">{t('your_wallet_balance')}</span>
              </div>
              <div className="wallet-balance-amount">
                <PriceDisplay 
                  amount={user.walletBalance}
                  showEgp={false}
                  bold={true} 
                  size="large"
                  currency={t('currency_usd')}
                />
              </div>
              <div className="wallet-balance-status">
                {user.walletBalance >= selectedPlan.price ? (
                  <div className="wallet-sufficient">
                    <span className="status-icon">✓</span>
                    <span className="status-text">{t('balance_sufficient')}</span>
                  </div>
                ) : (
                  <div className="wallet-insufficient">
                    <span className="status-icon">⚠️</span>
                    <span className="status-text">{t('balance_insufficient')}</span>
                  </div>
                )}
              </div>
              <div className={`wallet-balance-after ${direction === 'rtl' ? 'rtl-balance-after' : ''}`}>
                <span className="after-label">{t('remaining_balance')}</span>
                <span className="after-amount">{((user.walletBalance || 0) - selectedPlan.price).toFixed(2)} {t('currency_usd')}</span>
              </div>
            </div>
          )}
        </div>

        <div className={`payment-instructions ${direction === 'rtl' ? 'rtl-instructions' : ''}`}>
          <h3>{t('payment_instructions')}</h3>
          {paymentData.paymentMethod === 'wallet' ? (
            <>
              <p className="payment-method-title">{t('wallet_payment_title')}</p>
              <ul className={`payment-benefits ${direction === 'rtl' ? 'rtl-benefits' : ''}`}>
                <li><span className="benefit-number">1</span> {t('wallet_payment_step1', { amount: selectedPlan.price })}</li>
                <li><span className="benefit-number">2</span> {t('wallet_payment_step2')}</li>
                <li><span className="benefit-number">3</span> {t('wallet_payment_step3')}</li>
                {selectedPlan.points > 0 && (
                  <li className="points-benefit-item"><span className="benefit-number">4</span> {t('wallet_payment_step4', { points: selectedPlan.points })}</li>
                )}
              </ul>
            </>
          ) : (
            <>
              <p className="payment-method-title">{t('electronic_wallet_title')}</p>
              <div className={`payment-steps ${direction === 'rtl' ? 'rtl-steps' : ''}`}>
                <p><span className="step-number">1</span> {t('electronic_wallet_step1', { amount: selectedPlan.price })}</p>
                <div className="account-number">01098959911</div>
                <p><span className="step-number">2</span> {t('electronic_wallet_step2')}</p>
                <p><span className="step-number">3</span> {t('electronic_wallet_step3')}</p>
                <p><span className="step-number">4</span> {t('electronic_wallet_step4')}</p>
              </div>
              
              {selectedPlan.points > 0 && (
                <div className={`points-instruction ${direction === 'rtl' ? 'rtl-points-instruction' : ''}`}>
                  <p>{t('points_after_confirmation', { points: selectedPlan.points })}</p>
                </div>
              )}
              
              <div className="note-box">
                <strong>{t('activation_note')}</strong>
              </div>
            </>
          )}
        </div>

        <form onSubmit={handleSubmitPayment} className={`payment-form ${direction === 'rtl' ? 'rtl-form' : ''}`}>
          <div className="form-group">
            <label>{t('payment_method')}</label>
            <select 
              name="paymentMethod" 
              value={paymentData.paymentMethod}
              onChange={handlePaymentInputChange}
              required
              className={direction === 'rtl' ? 'rtl-select' : ''}
            >
              <option value="electronic_wallets">{t('electronic_wallets')}</option>
              <option value="wallet">{t('my_wallet')}</option>
            </select>
          </div>

          {/* Show phone and reference fields only for non-wallet payments */}
          {paymentData.paymentMethod !== 'wallet' && (
            <>
              <div className="form-group">
                <label>{t('phone_number')}</label>
                <input 
                  type="text" 
                  name="phoneNumber" 
                  value={paymentData.phoneNumber}
                  onChange={handlePaymentInputChange}
                  placeholder={t('phone_placeholder')}
                  required={paymentData.paymentMethod !== 'wallet'}
                  className={direction === 'rtl' ? 'rtl-input' : ''}
                />
              </div>

              <div className="form-group">
                <label>{t('reference_number')}</label>
                <input 
                  type="text" 
                  name="referenceNumber" 
                  value={paymentData.referenceNumber}
                  onChange={handlePaymentInputChange}
                  placeholder={t('reference_placeholder')}
                  required={paymentData.paymentMethod !== 'wallet'}
                  className={direction === 'rtl' ? 'rtl-input' : ''}
                />
              </div>
              
              <div className="form-group">
                <label>{t('payment_screenshot')}</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleScreenshotUpload}
                  className={direction === 'rtl' ? 'rtl-file-input' : ''}
                />
                {paymentData.screenshot && (
                  <div className="screenshot-preview">
                    <img src={paymentData.screenshot} alt={t('payment_screenshot')} />
                  </div>
                )}
              </div>
            </>
          )}

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isLoading || (paymentData.paymentMethod === 'wallet' && user.walletBalance < selectedPlan.price)}
          >
            {isLoading ? t('processing') : paymentData.paymentMethod === 'wallet' ? t('subscribe_with_wallet') : t('send_subscription_request')}
          </button>
        </form>
      </div>
    );
  };

  const renderConfirmation = () => {
    // Different messages based on payment method
    const isWalletPayment = paymentData.paymentMethod === 'wallet';
    
    return (
      <div className={`confirmation-container ${direction === 'rtl' ? 'rtl-confirmation' : ''}`} dir={direction}>
        <div className={`confirmation-icon ${isWalletPayment ? 'instant' : ''}`}>
          {isWalletPayment ? '✓✓' : '✓'}
        </div>
        
        {isWalletPayment ? (
          <>
            <h2>{t('subscription_activated')}</h2>
            <p>{t('payment_successful')}</p>
            {selectedPlan && selectedPlan.points > 0 && (
              <p className="points-confirmation active">
                <span className="points-icon">🏆</span> {t('points_added', { points: selectedPlan.points })}
              </p>
            )}
            <p>{t('enjoy_features')}</p>
          </>
        ) : (
          <>
            <h2>{t('request_received')}</h2>
            <p>{t('thank_you_message')}</p>
            {selectedPlan && selectedPlan.points > 0 && (
              <p className="points-confirmation">
                {t('points_on_confirmation', { points: selectedPlan.points })}
              </p>
            )}
            <p>{t('track_status')}</p>
          </>
        )}
        
        <div className={`confirmation-actions ${direction === 'rtl' ? 'rtl-actions' : ''}`}>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/membership-management')}
          >
            {t('manage_membership')}
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => navigate('/dashboard')}
          >
            {t('back_to_home')}
          </button>
        </div>
      </div>
    );
  };

  // Handle navigation to pages specified in the error action
  const handleErrorAction = (action) => {
    if (action && action.url) {
      navigate(action.url);
    }
    setShowPendingSubscriptionModal(false);
  };

  if (isLoading && !step) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <ConfigProvider direction={direction}>
      <ContentContainer isLoading={isLoading && !step} direction={direction}>
        <div className={`membership-page ${direction === 'rtl' ? 'rtl-membership-page' : ''}`} dir={direction}>
          <div className={`page-header ${direction === 'rtl' ? 'rtl-header' : ''}`}>
            <h1>{t('membership_plans')}</h1>
            <p>{t('choose_plan_description')}</p>
          </div>

          {renderCurrentMembership()}

          {step === 'plans' && renderPlans()}
          {step === 'payment' && renderPaymentForm()}
          {step === 'confirmation' && renderConfirmation()}
          
          {/* Pending Subscription Error Modal */}
          <Modal
            title={<div className={`error-modal-title ${direction === 'rtl' ? 'rtl-modal-title' : ''}`} dir={direction}>
              <span className="warning-icon">⚠️</span> {t('pending_subscription_title')}
            </div>}
            open={showPendingSubscriptionModal}
            onCancel={() => setShowPendingSubscriptionModal(false)}
            footer={null}
            centered
            className={`error-modal pending-subscription-modal ${direction === 'rtl' ? 'rtl-modal' : ''}`}
          >
            {pendingSubscriptionError && (
              <div className={`error-content ${direction === 'rtl' ? 'rtl-error-content' : ''}`} dir={direction}>
                <p className="error-message">{pendingSubscriptionError.message}</p>
                
                <div className={`pending-subscription-details ${direction === 'rtl' ? 'rtl-details' : ''}`}>
                  <h4>{t('pending_request_details')}</h4>
                  <div className="detail-item">
                    <span className="detail-label">{t('request_date')}</span>
                    <span className="detail-value">{pendingSubscriptionError.pendingSubscription.formattedDate}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">{t('subscription_plan')}</span>
                    <span className="detail-value">{pendingSubscriptionError.pendingSubscription.planName}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">{t('payment_method_label')}</span>
                    <span className="detail-value">
                      {pendingSubscriptionError.pendingSubscription.paymentMethod === 'electronic_wallets' ? t('electronic_wallets') : 
                       pendingSubscriptionError.pendingSubscription.paymentMethod === 'vodafone_cash' ? t('vodafone_cash') :
                       pendingSubscriptionError.pendingSubscription.paymentMethod === 'etisalat_cash' ? t('etisalat_cash') :
                       pendingSubscriptionError.pendingSubscription.paymentMethod === 'wallet' ? t('my_wallet_label') :
                       pendingSubscriptionError.pendingSubscription.paymentMethod}
                    </span>
                  </div>
                </div>
                
                <div className="error-message-box">
                  <p>{t('wait_for_review')}</p>
                </div>
                
                <div className={`error-actions ${direction === 'rtl' ? 'rtl-actions' : ''}`}>
                  {pendingSubscriptionError.actions && pendingSubscriptionError.actions.map((action, index) => (
                    <button 
                      key={index} 
                      className="action-btn"
                      onClick={() => handleErrorAction(action)}
                    >
                      {action.text}
                    </button>
                  ))}
                  <button 
                    className="action-btn secondary"
                    onClick={() => setShowPendingSubscriptionModal(false)}
                  >
                    {t('close')}
                  </button>
                </div>
              </div>
            )}
          </Modal>
        </div>
      </ContentContainer>
    </ConfigProvider>
  );
};

export default Membership;