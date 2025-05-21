import React from 'react';
import { Tag } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, WarningOutlined, InfoCircleOutlined, CrownOutlined, PlusOutlined, ReloadOutlined, CheckOutlined, TrophyOutlined } from '@ant-design/icons';
import { FaCreditCard } from 'react-icons/fa';
import { formatLongDate } from '../utils/dateUtils';

/**
 * Component to properly display transaction information
 * Handles different types of transactions (money vs points)
 */
const TransactionDisplay = ({ transaction, t }) => {
  // Determine transaction type and format
  const getTypeInfo = (type) => {
    let color = 'blue';
    let text = t('undefined');
    let icon = null;
    let isPointsTransaction = false;
    
    switch(type) {
      case 'recharge':
        color = 'green';
        text = t('recharge');
        icon = <PlusOutlined />;
        break;
      case 'purchase':
        color = 'orange';
        text = t('purchase');
        icon = <FaCreditCard style={{ fontSize: '12px' }} />;
        break;
      case 'refund':
        color = 'cyan';
        text = t('refund');
        icon = <ReloadOutlined />;
        break;
      case 'admin':
        color = 'purple';
        text = t('admin_addition');
        icon = <CrownOutlined />;
        break;
      case 'subscription':
        color = 'geekblue';
        text = t('subscription');
        icon = <CheckOutlined />;
        break;
      case 'achievement':
        color = 'gold';
        text = t('achievement_unlock');
        icon = <TrophyOutlined style={{ fontSize: '14px' }} />;
        isPointsTransaction = true;
        break;
      case 'points_award':
        color = 'gold';
        text = t('points_award');
        icon = <TrophyOutlined style={{ fontSize: '14px' }} />;
        isPointsTransaction = true;
        break;
      case 'points_purchase':
        color = 'green';
        text = t('points_purchase');
        icon = <PlusOutlined />;
        isPointsTransaction = true;
        break;
      case 'wallet_payment':
        color = 'blue';
        text = t('wallet_payment');
        icon = <FaCreditCard style={{ fontSize: '12px' }} />;
        break;
      case 'wallet_deposit':
        color = 'green';
        text = t('wallet_deposit');
        icon = <PlusOutlined />;
        break;
      case 'other':
        color = 'gray';
        text = t('other');
        icon = <InfoCircleOutlined />;
        break;
      default:
        // For any new or undefined transaction types
        console.log(`Unknown transaction type: ${type}`);
        break;
    }
    
    return { color, text, icon, isPointsTransaction };
  };

  // Get transaction status display
  const getStatusInfo = (status) => {
    let color = '';
    let text = '';
    let icon = null;

    switch (status) {
      case 'completed':
        color = 'status-success';
        text = t('completed');
        icon = <CheckCircleOutlined />;
        break;
      case 'pending':
        color = 'status-processing';
        text = t('processing');
        icon = <ClockCircleOutlined />;
        break;
      case 'failed':
        color = 'status-error';
        text = t('failed');
        icon = <WarningOutlined />;
        break;
      case 'refunded':
        color = 'status-warning';
        text = t('refunded');
        icon = <InfoCircleOutlined />;
        break;
      default:
        color = 'status-warning';
        text = t('unknown');
        icon = <InfoCircleOutlined />;
    }

    return { color, text, icon };
  };

  // Render type tag
  const renderTypeTag = (type) => {
    const { color, text, icon } = getTypeInfo(type);
    
    return (
      <Tag color={color} className="status-tag">
        {icon} {text}
      </Tag>
    );
  };

  // Render status tag
  const renderStatusTag = (status) => {
    const { color, text, icon } = getStatusInfo(status);
    
    return (
      <span className={`status-tag ${color}`}>
        {icon} {text}
      </span>
    );
  };

  // Determine if a transaction is a points transaction
  const isPointsTransaction = () => {
    // First check explicit currency field if it exists
    if (transaction.currency === 'points') {
      return true;
    }
    
    // Then check the transaction type
    const { isPointsTransaction } = getTypeInfo(transaction.type);
    if (isPointsTransaction) {
      return true;
    }
    
    // Check special reference patterns for points
    if (transaction.reference && 
        (transaction.reference.includes('points') || 
         transaction.reference.includes('achievement'))) {
      return true;
    }
    
    // Check description for points indicators
    if (transaction.description && 
        (transaction.description.includes('نقاط') || 
         transaction.description.includes('مكافأة') ||
         transaction.description.includes('points'))) {
      return true;
    }
    
    // Not a points transaction
    return false;
  };

  // Determine if a transaction is positive (credit) or negative (debit)
  const isPositiveTransaction = () => {
    // Check explicit debit flag if available
    if (transaction.isDebit !== undefined) {
      return !transaction.isDebit;  // If isDebit is false, it's a positive transaction
    }
    
    // For points transactions
    if (isPointsTransaction()) {
      // These types are always positive for points
      return ['points_award', 'achievement', 'refund', 'admin'].includes(transaction.type) || 
             transaction.description?.includes('نقاط مكافأة') || 
             transaction.description?.includes('points reward');
    } else {
      // For money transactions
      return ['recharge', 'refund', 'admin', 'wallet_deposit'].includes(transaction.type);
    }
  };

  // Render the amount with appropriate styling and unit
  const renderAmount = (amount, type) => {
    const pointsTrans = isPointsTransaction();
    const isPositive = isPositiveTransaction();
    
    // Get absolute value for display
    const displayAmount = Math.abs(amount);
    
    // Determine the unit to display
    const unit = pointsTrans ? t('points') : t('currency_symbol');
    
    // CSS classes for styling
    const containerClass = pointsTrans ? 'points-amount' : 'money-amount';
    const valueClass = isPositive ? 'positive' : 'negative';
    
    return (
      <span className={`${containerClass} ${valueClass}`}>
        {isPositive ? '+' : '-'} {displayAmount} {unit}
      </span>
    );
  };

  // Format date with improved readability
  const formattedDate = (date) => {
    if (!date) return '-';
    
    try {
      // Create a proper Date object
      const dateObj = new Date(date);
      
      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        return '-';
      }
      
      // Format with the utility function
      return formatLongDate(dateObj);
    } catch (error) {
      console.error('Error formatting date:', error);
      return '-';
    }
  };

  return (
    <tr className={`transaction-row ${isPointsTransaction() ? 'points-transaction' : 'money-transaction'}`}>
      <td>{formattedDate(transaction.createdAt || transaction.date)}</td>
      <td>{renderTypeTag(transaction.type)}</td>
      <td className={isPointsTransaction() ? 'points-cell' : 'money-cell'}>
        {renderAmount(transaction.amount, transaction.type)}
      </td>
      <td>{renderStatusTag(transaction.status)}</td>
      <td className="transaction-description">{transaction.description}</td>
    </tr>
  );
};

export default TransactionDisplay;