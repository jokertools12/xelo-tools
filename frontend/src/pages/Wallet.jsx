import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../utils/api';
import '../styles/Wallet.css';
import { Modal, ConfigProvider } from 'antd';
import PriceDisplay from '../components/PriceDisplay';
import ContentContainer from '../components/ContentContainer';

const Wallet = () => {
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const { t, direction, currentLanguage } = useLanguage();
  const isRTL = direction === 'rtl';
  
  // State
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('balance');
  const [pendingDepositError, setPendingDepositError] = useState(null);
  const [showPendingDepositModal, setShowPendingDepositModal] = useState(false);
  
  // Deposit form state
  const [depositAmount, setDepositAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('electronic_wallets');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [screenshot, setScreenshot] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // User context for accessing user data including points
  const { user, refreshUserData } = useUser();
  
  // Ref for points purchase section
  const pointsPurchaseSectionRef = useRef(null);
  
  // Purchase points form state
  const [pointsPackage, setPointsPackage] = useState('small');
  
  // Get location to check for query parameters
  const location = useLocation();
  const [purchaseAmount, setPurchaseAmount] = useState(5);
  const [pointsAmount, setPointsAmount] = useState(6000);
  const [showPurchaseSuccessModal, setShowPurchaseSuccessModal] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState(null);
  
  // Check for section query parameter on load
  useEffect(() => {
    // Check if we should scroll to points purchase section
    const queryParams = new URLSearchParams(location.search);
    const section = queryParams.get('section');
    
    if (section === 'buyPoints') {
      // Ensure we're on the balance tab
      setActiveTab('balance');
      
      // Scroll to points purchase section after a short delay to ensure render
      setTimeout(() => {
        if (pointsPurchaseSectionRef.current) {
          pointsPurchaseSectionRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
          
          // Add a highlight effect
          pointsPurchaseSectionRef.current.classList.add('highlight-section');
          
          // Remove highlight after animation
          setTimeout(() => {
            if (pointsPurchaseSectionRef.current) {
              pointsPurchaseSectionRef.current.classList.remove('highlight-section');
            }
          }, 2000);
        }
      }, 300);
    }
  }, [location.search]);
  
  // Fetch wallet balance
  useEffect(() => {
    const fetchWalletBalance = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/wallet/balance');
        setWalletBalance(response.data.walletBalance);
      } catch (error) {
        console.error('Error fetching wallet balance:', error);
        addNotification({
          title: t('error'),
          message: t('failed_get_balance'),
          type: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchWalletBalance();
  }, [addNotification, t]);
  
  // Fetch transaction history
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await api.get('/wallet/transactions');
        setTransactions(response.data);
      } catch (error) {
        console.error('Error fetching transactions:', error);
        addNotification({
          title: t('error'),
          message: t('failed_get_transactions'),
          type: 'error'
        });
      }
    };
    
    if (activeTab === 'history') {
      fetchTransactions();
    }
  }, [activeTab, addNotification, t]);
  
  // Handle deposit form submission
  const handleDeposit = async (e) => {
    e.preventDefault();
    
    if (!depositAmount || !paymentMethod || !phoneNumber || !referenceNumber) {
      addNotification({
        title: t('warning'),
        message: t('fill_required_fields'),
        type: 'warning'
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const response = await api.post('/wallet/deposit', {
        amount: parseFloat(depositAmount),
        paymentMethod,
        phoneNumber,
        referenceNumber,
        screenshot
      });
      
      addNotification({
        title: t('success'),
        message: t('deposit_request_sent'),
        type: 'success'
      });
      
      // Reset form
      setDepositAmount('');
      setPhoneNumber('');
      setReferenceNumber('');
      setScreenshot('');
      
      // Switch to history tab
      setActiveTab('history');
      
      // Refresh transactions
      const transactionsResponse = await api.get('/wallet/transactions');
      setTransactions(transactionsResponse.data);
      
    } catch (error) {
      console.error('Error submitting deposit:', error);
      
      // Check for pending deposit error code
      if (error.response?.data?.code === 'PENDING_DEPOSIT_EXISTS') {
        // Store the error details for the modal
        setPendingDepositError(error.response.data);
        setShowPendingDepositModal(true);
      } else {
        // Show regular notification for other errors
        addNotification({
          title: t('error'),
          message: error.response?.data?.message || t('deposit_request_failed'),
          type: 'error'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle purchase points form submission
  const handlePurchasePoints = async (e) => {
    e.preventDefault();
    
    if (walletBalance < purchaseAmount) {
      addNotification({
        title: t('warning'),
        message: t('insufficient_balance'),
        type: 'warning'
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const response = await api.post('/wallet/purchase-points', {
        amount: purchaseAmount,
        pointsAmount: pointsAmount
      });
      
      // Update wallet balance
      setWalletBalance(response.data.walletBalance);
      
      // Store purchase result for the modal
      setPurchaseResult({
        pointsAmount: pointsAmount,
        cost: purchaseAmount,
        walletBalance: response.data.walletBalance
      });
      
      // Show success modal
      setShowPurchaseSuccessModal(true);
      
      // Also show notification
      addNotification({
        title: t('operation_success'),
        message: t('points_purchase_success', { points: pointsAmount }),
        type: 'success',
        duration: 5 // Show for 5 seconds
      });
      
      // Refresh user data to get updated points balance
      refreshUserData();
      
      // Reset form
      setPointsPackage('small');
      setPurchaseAmount(5);
      setPointsAmount(6000);
      
    } catch (error) {
      console.error('Error purchasing points:', error);
      addNotification({
        title: t('error'),
        message: error.response?.data?.message || t('points_purchase_failed'),
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle closing the purchase success modal
  const handleCloseSuccessModal = () => {
    setShowPurchaseSuccessModal(false);
    setPurchaseResult(null);
  };
  
  // Handle image upload for screenshot
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshot(reader.result);
    };
    reader.readAsDataURL(file);
  };
  
  // Handle points package selection
  const handlePackageChange = (packageName) => {
    setPointsPackage(packageName);
    
    switch (packageName) {
      case 'small':
        setPurchaseAmount(5);
        setPointsAmount(6000);
        break;
      case 'medium':
        setPurchaseAmount(10);
        setPointsAmount(13200); // 12000 points + 10% bonus
        break;
      case 'large':
        setPurchaseAmount(20);
        setPointsAmount(27600); // 24000 points + 15% bonus
        break;
      default:
        setPurchaseAmount(5);
        setPointsAmount(6000);
    }
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(currentLanguage === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Determine transaction label
  const getTransactionTypeLabel = (type, isDebit) => {
    switch (type) {
      case 'wallet_deposit':
        return t('wallet_deposit');
      case 'wallet_purchase':
        return isDebit ? t('wallet_purchase') : t('wallet_refund');
      case 'wallet_withdrawal':
        return t('wallet_withdrawal');
      case 'points_purchase':
        return t('points_purchase');
      case 'points_award':
        return t('points_award');
      default:
        return type;
    }
  };
  
  // Get direction-aware arrow
  const getDirectionalArrow = (isDebit) => {
    // Respect both transaction type and text direction
    if (direction === 'rtl') {
      return isDebit ? '↑' : '↓';
    } else {
      return isDebit ? '↑' : '↓';
    }
  };
  
  // Render wallet balance tab
  const renderBalanceTab = () => {
    return (
      <div className={`wallet-balance-container ${direction === 'rtl' ? 'rtl-container' : ''}`}>
        <div className="balance-card">
          <div className="balance-header">
            <h3>{t('wallet_balance')}</h3>
          </div>
          <div className={`balance-amount ${isRTL ? 'rtl-balance' : ''}`}>
            {isRTL ? (
              <>
                <span className="currency">{t('currency_usd')}</span>
                <span className="amount">{walletBalance.toFixed(2)}</span>
              </>
            ) : (
              <>
                <span className="amount">{walletBalance.toFixed(2)}</span>
                <span className="currency">{t('currency_usd')}</span>
              </>
            )}
          </div>
          <div className="balance-actions">
            <button 
              className="action-btn deposit-btn"
              onClick={() => setActiveTab('deposit')}
            >
              {t('deposit_funds')}
            </button>
            <button 
              className="action-btn history-btn"
              onClick={() => setActiveTab('history')}
            >
              {t('transaction_history')}
            </button>
          </div>
        </div>
        
        <div 
          className={`buy-points-section ${direction === 'rtl' ? 'rtl-section' : ''}`}
          ref={pointsPurchaseSectionRef}
        >
          <h3>{t('buy_points')}</h3>
          <p>{t('use_wallet_points')}</p>
          
          <form onSubmit={handlePurchasePoints} className={`points-form ${direction === 'rtl' ? 'rtl-form' : ''}`}>
            <div className="points-packages">
              <div 
                className={`package ${pointsPackage === 'small' ? 'selected' : ''}`}
                onClick={() => handlePackageChange('small')}
              >
                <div className="points-card">
                  <div className="card-inner">
                    <div className="points-value">6000</div>
                    <div className="points-label">{t('points_label')}</div>
                    <div className="price-tag">5 {t('currency_usd')}</div>
                  </div>
                </div>
              </div>
              <div 
                className={`package bonus-package ${pointsPackage === 'medium' ? 'selected' : ''}`}
                onClick={() => handlePackageChange('medium')}
              >
                <div className="points-card medium-card">
                  <div className="bonus-badge">
                    <span className="bonus-text">+10%</span>
                  </div>
                  <div className="card-inner">
                    <div className="points-value highlight">13200</div>
                    <div className="points-label">{t('points_label')}</div>
                    <div className="price-tag">10 {t('currency_usd')}</div>
                  </div>
                </div>
              </div>
              <div 
                className={`package bonus-package ${pointsPackage === 'large' ? 'selected' : ''}`}
                onClick={() => handlePackageChange('large')}
              >
                <div className="points-card large-card">
                  <div className="bonus-badge special">
                    <span className="bonus-text">+15%</span>
                  </div>
                  <div className="card-inner">
                    <div className="points-value highlight">27600</div>
                    <div className="points-label">{t('points_label')}</div>
                    <div className="price-tag">20 {t('currency_usd')}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <button 
              type="submit" 
              className="btn-purchase" 
              disabled={isSubmitting || walletBalance < purchaseAmount}
            >
              {isSubmitting ? t('processing_purchase') : t('buy_points_btn', { points: pointsAmount, amount: purchaseAmount })}
            </button>
          </form>
        </div>
      </div>
    );
  };
  
  // Render deposit tab
  const renderDepositTab = () => {
    return (
      <div className={`deposit-container ${direction === 'rtl' ? 'rtl-container' : ''}`} dir={direction}>
        <h3>{t('deposit_wallet')}</h3>
        <p>{t('deposit_instructions')}</p>
        
        <div className={`payment-instructions ${direction === 'rtl' ? 'rtl-instructions' : ''}`}>
          <h3>{t('payment_instructions')}</h3>
          <p className="payment-method-title">{t('electronic_wallets_steps')}</p>
          <div className={`payment-steps ${direction === 'rtl' ? 'rtl-steps' : ''}`}>
            <p><span className="step-number">1</span> {depositAmount ? 
              t('step1', { amount: 
                <PriceDisplay 
                  amount={parseFloat(depositAmount)} 
                  paymentMethod={paymentMethod}
                  showDetail={true}
                  bold={true}
                />
              }) : 
              t('step1', { amount: <strong>{t('required_amount')}</strong> })}
            </p>
            <div className="account-number">01098959911</div>
            <p><span className="step-number">2</span> {t('step2')}</p>
            <p><span className="step-number">3</span> {t('step3')}</p>
            <p><span className="step-number">4</span> {t('step4')}</p>
          </div>
          
            <div className={`deposit-benefits ${direction === 'rtl' ? 'rtl-benefits' : ''}`}>
              <div className="benefit-title">{t('deposit_benefits')}</div>
              <ul className={`payment-benefits ${direction === 'rtl' ? 'rtl-list' : ''}`}>
                <li><span className={`benefit-number ${direction === 'rtl' ? 'rtl-benefit-icon' : ''}`}>✓</span> {t('benefit1')}</li>
                <li><span className={`benefit-number ${direction === 'rtl' ? 'rtl-benefit-icon' : ''}`}>✓</span> {t('benefit2')}</li>
                <li><span className={`benefit-number ${direction === 'rtl' ? 'rtl-benefit-icon' : ''}`}>✓</span> {t('benefit3')}</li>
            </ul>
          </div>
          
          <div className={`note-box ${direction === 'rtl' ? 'rtl-note-box' : ''}`}>
            <strong>{t('deposit_note')}</strong>
          </div>
        </div>
        
        <form onSubmit={handleDeposit} className={`deposit-form ${direction === 'rtl' ? 'rtl-form' : ''}`}>
          <div className="form-group">
            <label>{t('amount_dollars')}</label>
            <input 
              type="number" 
              value={depositAmount} 
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder={t('amount_placeholder')}
              min="1"
              required
              className={direction === 'rtl' ? 'rtl-input' : ''}
            />
            {depositAmount && (
              <div className="deposit-amount-summary">
                <PriceDisplay 
                  amount={parseFloat(depositAmount)} 
                  paymentMethod={paymentMethod}
                  showDetail={true}
                  bold={true}
                />
              </div>
            )}
          </div>
          
          <div className="form-group">
            <label>{t('payment_method')}</label>
            <select 
              value={paymentMethod} 
              onChange={(e) => setPaymentMethod(e.target.value)}
              required
              className={direction === 'rtl' ? 'rtl-select' : ''}
            >
              <option value="electronic_wallets">{t('electronic_wallets')}</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>{t('phone_number')}</label>
            <input 
              type="text" 
              value={phoneNumber} 
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder={t('phone_placeholder')}
              required
              className={direction === 'rtl' ? 'rtl-input' : ''}
            />
          </div>
          
          <div className="form-group">
            <label>{t('reference_number')}</label>
            <input 
              type="text" 
              value={referenceNumber} 
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder={t('reference_placeholder')}
              required
              className={direction === 'rtl' ? 'rtl-input' : ''}
            />
          </div>
          
          <div className="form-group screenshot-group">
            <label>{t('receipt_image')}</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload}
              className="file-input"
              id="screenshot-upload"
            />
            <label htmlFor="screenshot-upload" className="upload-btn">
              {t('select_image')}
            </label>
            {screenshot && (
              <div className="preview-container">
                <img src={screenshot} alt={t('receipt_image')} className="screenshot-preview" />
              </div>
            )}
          </div>
          
          <div className={`form-actions ${direction === 'rtl' ? 'rtl-actions' : ''}`}>
            <button 
              type="button" 
              className="btn-cancel"
              onClick={() => setActiveTab('balance')}
            >
              {t('cancel')}
            </button>
            <button 
              type="submit" 
              className="btn-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? t('sending') : t('send_request')}
            </button>
          </div>
        </form>
      </div>
    );
  };
  
  // Render transaction history tab
  const renderHistoryTab = () => {
    if (transactions.length === 0) {
      return (
        <div className={`empty-transactions ${direction === 'rtl' ? 'rtl-empty' : ''}`} dir={direction}>
          <div className="empty-icon">📝</div>
          <h3>{t('no_transactions')}</h3>
          <p>{t('transactions_will_show')}</p>
          <button 
            className="btn-return"
            onClick={() => setActiveTab('balance')}
          >
            {t('return_to_balance')}
          </button>
        </div>
      );
    }
    
    return (
      <div className={`transactions-container ${direction === 'rtl' ? 'rtl-transactions' : ''}`} dir={direction}>
        <h3>{t('wallet_transactions')}</h3>
        
        <div className={`transactions-list ${direction === 'rtl' ? 'rtl-list' : ''}`}>
          {transactions.map(transaction => (
            <div 
              key={transaction._id} 
              className={`transaction-item ${transaction.isDebit ? 'debit' : 'credit'} ${direction === 'rtl' ? 'rtl-item' : ''}`}
            >
              <div className={`transaction-icon ${direction === 'rtl' ? 'rtl-icon-container' : ''}`}>
                <span className={`icon-wrapper ${direction === 'rtl' ? 'rtl-icon' : ''}`}>
                  {getDirectionalArrow(transaction.isDebit)}
                </span>
              </div>
              <div className={`transaction-details ${direction === 'rtl' ? 'rtl-details' : ''}`}>
                <div className="transaction-title">
                  {getTransactionTypeLabel(transaction.type, transaction.isDebit)}
                </div>
                <div className="transaction-description">
                  {transaction.description}
                </div>
                <div className="transaction-date">
                  {formatDate(transaction.createdAt)}
                </div>
              </div>
              <div className={`transaction-amount ${direction === 'rtl' ? 'rtl-amount' : ''}`}>
                <span className="amount">{transaction.isDebit ? '-' : '+'}{transaction.amount.toFixed(2)}</span>
                <span className="currency">{t('currency_usd')}</span>
              </div>
              <div className={`transaction-status status-${transaction.status} ${direction === 'rtl' ? 'rtl-status' : ''}`}>
                {transaction.status === 'completed' ? t('completed') : 
                 transaction.status === 'pending' ? t('pending') : 
                 transaction.status === 'failed' ? t('failed') : transaction.status}
              </div>
            </div>
          ))}
        </div>
        
        <button 
          className="btn-return"
          onClick={() => setActiveTab('balance')}
        >
          {t('return_to_balance')}
        </button>
      </div>
    );
  };
  
  // Render appropriate tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'balance':
        return renderBalanceTab();
      case 'deposit':
        return renderDepositTab();
      case 'history':
        return renderHistoryTab();
      default:
        return renderBalanceTab();
    }
  };
  
  // Handle navigation to pages specified in the error action
  const handleErrorAction = (action) => {
    if (action && action.url) {
      navigate(action.url);
    }
    setShowPendingDepositModal(false);
  };

  return (
    <ConfigProvider direction={direction}>
      <ContentContainer isLoading={isLoading} direction={direction}>
        <div className={`wallet-page ${direction === 'rtl' ? 'rtl-wallet-page' : ''}`} dir={direction}>
          <div className={`page-header ${direction === 'rtl' ? 'rtl-header' : ''}`}>
            <h1>{t('my_wallet')}</h1>
            <p>{t('wallet_description')}</p>
          </div>
          
          <div className={`tab-navigation ${direction === 'rtl' ? 'rtl-tabs' : ''}`}>
            <button 
              className={`tab-btn ${activeTab === 'balance' ? 'active' : ''}`}
              onClick={() => setActiveTab('balance')}
            >
              {t('balance_tab')}
            </button>
            <button 
              className={`tab-btn ${activeTab === 'deposit' ? 'active' : ''}`}
              onClick={() => setActiveTab('deposit')}
            >
              {t('deposit_tab')}
            </button>
            <button 
              className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              {t('transactions_tab')}
            </button>
          </div>
          
          <div className={`wallet-content ${direction === 'rtl' ? 'rtl-content' : ''}`}>
            {renderTabContent()}
          </div>
          
          {/* Success Purchase Modal */}
          <Modal
            title={<div className={`success-modal-title ${direction === 'rtl' ? 'rtl-modal-title' : ''}`} dir={direction}>
              <span className="success-icon">✓</span> {t('purchase_success')}
            </div>}
            open={showPurchaseSuccessModal}
            onCancel={handleCloseSuccessModal}
            footer={[
              <button key="close" className={`modal-btn ${direction === 'rtl' ? 'rtl-btn' : ''}`} onClick={handleCloseSuccessModal}>
                {t('done')}
              </button>
            ]}
            centered
            className={`purchase-success-modal ${direction === 'rtl' ? 'rtl-modal' : ''}`}
          >
            {purchaseResult && (
              <div className={`success-content ${direction === 'rtl' ? 'rtl-modal-content' : ''}`} dir={direction}>
                <div className="success-points">
                  <span className="points-icon">🏆</span>
                  <span className="points-value">+{purchaseResult.pointsAmount}</span>
                  <span className="points-label">{t('points_label')}</span>
                </div>
                
                <div className={`success-details ${direction === 'rtl' ? 'rtl-details' : ''}`}>
                  <div className="detail-item">
                    <span className="detail-label">{t('purchased')}</span>
                    <span className="detail-value">{t('points_count', { points: purchaseResult.pointsAmount })}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">{t('amount_paid')}</span>
                    <span className="detail-value">{purchaseResult.cost} {t('currency_usd')}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">{t('remaining_balance')}</span>
                    <span className="detail-value">{purchaseResult.walletBalance.toFixed(2)} {t('currency_usd')}</span>
                  </div>
                  {user && (
                    <div className="detail-item total-points">
                      <span className="detail-label">{t('current_points')}</span>
                      <span className="detail-value">{user.points} {t('points_label')}</span>
                    </div>
                  )}
                </div>
                
                <div className="success-message">
                  {t('points_added_success')}
                </div>
              </div>
            )}
          </Modal>
          
          {/* Pending Deposit Error Modal */}
          <Modal
            title={<div className={`error-modal-title ${direction === 'rtl' ? 'rtl-modal-title' : ''}`} dir={direction}>
              <span className="warning-icon">⚠️</span> {t('pending_deposit')}
            </div>}
            open={showPendingDepositModal}
            onCancel={() => setShowPendingDepositModal(false)}
            footer={null}
            centered
            className={`error-modal pending-deposit-modal ${direction === 'rtl' ? 'rtl-modal' : ''}`}
          >
            {pendingDepositError && (
              <div className={`error-content ${direction === 'rtl' ? 'rtl-error-content' : ''}`} dir={direction}>
                <p className="error-message">{pendingDepositError.message}</p>
                
                <div className={`pending-deposit-details ${direction === 'rtl' ? 'rtl-pending-details' : ''}`}>
                  <h4>{t('pending_request_details')}</h4>
                  <div className="detail-item">
                    <span className="detail-label">{t('request_date')}</span>
                    <span className="detail-value">{pendingDepositError.pendingDeposit.formattedDate}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">{t('amount')}</span>
                    <span className="detail-value">{pendingDepositError.pendingDeposit.amount} {t('currency_usd')}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">{t('payment_method_label')}</span>
                    <span className="detail-value">
                      {pendingDepositError.pendingDeposit.paymentMethod === 'electronic_wallets' ? t('electronic_wallets') : 
                      pendingDepositError.pendingDeposit.paymentMethod === 'vodafone_cash' ? t('vodafone_cash') :
                      pendingDepositError.pendingDeposit.paymentMethod === 'etisalat_cash' ? t('etisalat_cash') :
                      pendingDepositError.pendingDeposit.paymentMethod}
                    </span>
                  </div>
                </div>
                
                <div className={`error-message-box ${direction === 'rtl' ? 'rtl-message-box' : ''}`}>
                  <p>{t('wait_message')}</p>
                </div>
                
                <div className={`error-actions ${direction === 'rtl' ? 'rtl-actions' : ''}`}>
                  {pendingDepositError.actions && pendingDepositError.actions.map((action, index) => (
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
                    onClick={() => setShowPendingDepositModal(false)}
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

export default Wallet;