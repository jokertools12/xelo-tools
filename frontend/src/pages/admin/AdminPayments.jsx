import React, { useState, useEffect } from 'react';
import { useNotification } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../utils/api';
import PriceDisplay from '../../components/PriceDisplay';
import '../../styles/AdminPayments.css';

const AdminPayments = () => {
  const { addNotification } = useNotification();
  const { t } = useLanguage(); // Translation function
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [adminNote, setAdminNote] = useState('');

  // Fetch payments based on filter
  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setIsLoading(true);
        const response = await api.get(`/payments?status=${filter}`);
        setPayments(response.data);
      } catch (error) {
        console.error('Error fetching payments:', error);
        addNotification({
          title: t('error'),
          message: t('payments_fetch_failed'),
          type: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayments();
  }, [filter, addNotification, t]);

  const handleConfirmPayment = async (paymentId) => {
    try {
      setIsLoading(true);
      await api.put(`/payments/${paymentId}/confirm`, { adminNote });
      
      // Remove the payment from the list if filter is pending
      if (filter === 'pending') {
        setPayments(payments.filter(payment => payment._id !== paymentId));
      } else {
        // Refresh the payments list
        const response = await api.get(`/payments?status=${filter}`);
        setPayments(response.data);
      }
      
      addNotification({
        title: t('success'),
        message: t('payment_confirmed'),
        type: 'success'
      });
      
      // Reset selected payment
      setSelectedPayment(null);
      setAdminNote('');
    } catch (error) {
      console.error('Error confirming payment:', error);
      addNotification({
        title: t('error'),
        message: error.response?.data?.message || t('confirm_error'),
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectPayment = async (paymentId) => {
    // Check if admin note is provided
    if (!adminNote.trim()) {
      addNotification({
        title: t('warning'),
        message: t('note_required'),
        type: 'warning'
      });
      return;
    }
    
    try {
      setIsLoading(true);
      // Log before API call for debugging
      console.log(`Attempting to reject payment: ${paymentId} with note: ${adminNote}`);
      
      const response = await api.put(`/payments/${paymentId}/reject`, { adminNote });
      console.log('Rejection API response:', response.data);
      
      // Remove the payment from the list if filter is pending
      if (filter === 'pending') {
        setPayments(payments.filter(payment => payment._id !== paymentId));
      } else {
        // Refresh the payments list
        const response = await api.get(`/payments?status=${filter}`);
        setPayments(response.data);
      }
      
      addNotification({
        title: t('success'),
        message: t('payment_rejected'),
        type: 'success'
      });
      
      // Reset selected payment
      setSelectedPayment(null);
      setAdminNote('');
    } catch (error) {
      console.error('Error rejecting payment:', error);
      console.error('Error details:', error.response);
      addNotification({
        title: t('error'),
        message: error.response?.data?.message || t('reject_error'),
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPaymentMethodLabel = (method) => {
    switch (method) {
      case 'vodafone_cash':
        return t('vodafone_cash');
      case 'etisalat_cash':
        return t('etisalat_cash');
      case 'electronic_wallets':
        return t('electronic_wallets');
      default:
        return method;
    }
  };

  const handleSelectPayment = (payment) => {
    setSelectedPayment(payment);
    setAdminNote('');
  };

  const renderPaymentsList = () => {
    if (isLoading && payments.length === 0) {
      return <div className="loading">{t('loading_payments')}</div>;
    }

    if (payments.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>{filter === 'pending' ? t('no_pending_payments') : t('no_payments')}</h3>
          <p>{t('payments_will_appear')}</p>
        </div>
      );
    }

    return (
      <div className="payments-list">
        {payments.map(payment => (
          <div 
            key={payment._id} 
            className={`payment-item ${selectedPayment?._id === payment._id ? 'selected' : ''}`}
            onClick={() => handleSelectPayment(payment)}
          >
            <div className="payment-user">
              <div className="payment-user-name">{payment.userId?.name || t('user')}</div>
              <div className="payment-user-email">{payment.userId?.email || ''}</div>
            </div>
            
            <div className="payment-amount">
              <PriceDisplay amount={payment.amount} showEgp={true} />
            </div>
            
            <div className="payment-date">
              {formatDate(payment.createdAt)}
            </div>
            
            <div className="payment-method">
              {getPaymentMethodLabel(payment.paymentMethod)}
            </div>
            
            <div className={`payment-status status-${payment.status}`}>
              {payment.status === 'pending' ? t('pending') : 
               payment.status === 'confirmed' ? t('confirmed') : t('rejected')}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPaymentDetails = () => {
    if (!selectedPayment) {
      return (
        <div className="payment-details-placeholder">
          <p>{t('select_payment_to_view')}</p>
        </div>
      );
    }

    // Check if this is a wallet top-up (no subscription ID) or a subscription payment
    const isWalletTopUp = !selectedPayment.subscriptionId;
    const paymentType = isWalletTopUp ? t('wallet_topup') : t('membership_subscription');

    return (
      <div className="payment-details">
        <h3>{t('payment_details')}</h3>
        
        <div className="details-section">
          <div className="detail-group">
            <span className="detail-label">{t('payment_type')}:</span>
            <span className={`detail-value ${isWalletTopUp ? 'wallet-topup' : 'subscription'}`}>
              {paymentType}
            </span>
          </div>
          
          <div className="detail-group">
            <span className="detail-label">{t('user_name')}:</span>
            <span className="detail-value">{selectedPayment.userId?.name || t('user')}</span>
          </div>
          
          <div className="detail-group">
            <span className="detail-label">{t('user_email')}:</span>
            <span className="detail-value">{selectedPayment.userId?.email || ''}</span>
          </div>
          
          {!isWalletTopUp && (
            <div className="detail-group">
              <span className="detail-label">{t('plan_name')}:</span>
              <span className="detail-value">
                {selectedPayment.subscriptionId?.planId?.name || t('unknown')}
              </span>
            </div>
          )}
          
          <div className="detail-group">
            <span className="detail-label">{t('payment_amount')}:</span>
            <span className="detail-value">
              <PriceDisplay amount={selectedPayment.amount} showEgp={true} />
            </span>
          </div>
          
          <div className="detail-group">
            <span className="detail-label">{t('payment_method')}:</span>
            <span className={`detail-value payment-method-${selectedPayment.paymentMethod}`}>
              {getPaymentMethodLabel(selectedPayment.paymentMethod)}
            </span>
          </div>
          
          <div className="detail-group">
            <span className="detail-label">{t('phone_number')}:</span>
            <span className="detail-value">{selectedPayment.phoneNumber}</span>
          </div>
          
          <div className="detail-group">
            <span className="detail-label">{t('reference_number')}:</span>
            <span className="detail-value reference-number">{selectedPayment.referenceNumber}</span>
          </div>
          
          <div className="detail-group">
            <span className="detail-label">{t('request_date')}:</span>
            <span className="detail-value">{formatDate(selectedPayment.createdAt)}</span>
          </div>
          
          {selectedPayment.status !== 'pending' && (
            <div className="detail-group">
              <span className="detail-label">{t('review_date')}:</span>
              <span className="detail-value">{formatDate(selectedPayment.verifiedAt)}</span>
            </div>
          )}
          
          {selectedPayment.status !== 'pending' && selectedPayment.adminNote && (
            <div className="detail-group admin-note-group">
              <span className="detail-label">{t('admin_note')}:</span>
              <span className={`detail-value admin-note ${selectedPayment.status === 'rejected' ? 'rejected-note' : ''}`}>
                {selectedPayment.adminNote}
              </span>
            </div>
          )}
        </div>
        
        {selectedPayment.screenshot && (
          <div className="screenshot-section">
            <h4>{t('payment_receipt')}</h4>
            <div className="screenshot-container">
              <img src={selectedPayment.screenshot} alt={t('payment_receipt')} />
            </div>
          </div>
        )}
        
        {selectedPayment.status === 'pending' && (
          <div className="admin-actions">
            <div className="admin-note">
              <label>{t('admin_note_label')}</label>
              <textarea 
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={t('admin_note_placeholder')}
              />
            </div>
            
            <div className="action-buttons">
              <button 
                className="btn btn-success"
                onClick={() => handleConfirmPayment(selectedPayment._id)}
                disabled={isLoading}
              >
                {t('confirm_payment')}
              </button>
              <button 
                className="btn btn-danger"
                onClick={() => handleRejectPayment(selectedPayment._id)}
                disabled={isLoading}
              >
                {t('reject_payment')}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="admin-payments-page">
      <div className="page-header">
        <h1>{t('payment_management')}</h1>
        <p>{t('payment_management_description')}</p>
      </div>

      <div className="filter-controls">
        <div className="filter-buttons">
          <button 
            className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            {t('pending_payments')}
          </button>
          <button 
            className={`filter-btn ${filter === 'confirmed' ? 'active' : ''}`}
            onClick={() => setFilter('confirmed')}
          >
            {t('confirmed_payments')}
          </button>
          <button 
            className={`filter-btn ${filter === 'rejected' ? 'active' : ''}`}
            onClick={() => setFilter('rejected')}
          >
            {t('rejected_payments')}
          </button>
          <button 
            className={`filter-btn ${filter === '' ? 'active' : ''}`}
            onClick={() => setFilter('')}
          >
            {t('all_payments')}
          </button>
        </div>
      </div>

      <div className="payments-container">
        <div className="payments-list-section">
          {renderPaymentsList()}
        </div>
        <div className="payment-details-section">
          {renderPaymentDetails()}
        </div>
      </div>
    </div>
  );
};

export default AdminPayments;