import React, { useState, useEffect } from 'react';
import { Tooltip, Spin } from 'antd';
import { DollarOutlined, InfoCircleOutlined } from '@ant-design/icons';
import api from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import '../styles/PriceDisplay.css';

// قائمة طرق الدفع المحلية المصرية التي تتطلب تحويل إلى الجنيه المصري
const LOCAL_PAYMENT_METHODS = ['vodafone_cash', 'etisalat_cash', 'electronic_wallets', 'orange_cash', 'we_pay', 'fawry', 'aman'];

/**
 * PriceDisplay Component
 * Displays prices in USD with optional EGP conversion based on payment method
 * Enhanced with full RTL/LTR language support
 * 
 * @param {Object} props Component properties
 * @param {number} props.amount Price amount in USD
 * @param {string} props.paymentMethod The selected payment method (if any)
 * @param {boolean} props.showEgp Whether to force show/hide the EGP conversion regardless of payment method
 * @param {boolean} props.showDetail Whether to show the exchange rate detail
 * @param {string} props.className Additional CSS classes
 * @param {string} props.size Size variant ('small', 'default', 'large')
 * @param {boolean} props.bold Whether to show the price in bold text
 * @param {boolean} props.inline Whether to display inline or as a block
 */
const PriceDisplay = ({ 
  amount, 
  paymentMethod = null,
  showEgp = null, 
  showDetail = false, 
  className = '',
  size = 'default',
  bold = false,
  inline = false
}) => {
  const [exchangeRate, setExchangeRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t, direction, currentLanguage } = useLanguage();
  const isRTL = direction === 'rtl';

  // تحديد ما إذا كان يجب عرض الجنيه المصري بناءً على طريقة الدفع
  const shouldShowEgp = () => {
    // إذا تم تحديد showEgp بشكل صريح، استخدم هذه القيمة
    if (showEgp !== null) {
      return showEgp;
    }
    
    // وإلا قرر بناءً على طريقة الدفع
    return paymentMethod && LOCAL_PAYMENT_METHODS.includes(paymentMethod);
  };

  useEffect(() => {
    // جلب سعر الصرف الحالي إذا لزم الأمر
    const fetchExchangeRate = async () => {
      try {
        setLoading(true);
        const response = await api.get('/currency-rates/current');
        setExchangeRate(response.data);
      } catch (error) {
        console.error('Error fetching exchange rate:', error);
        // استخدام معدل احتياطي 52.0 جنيه مصري لكل دولار أمريكي
        setExchangeRate({ rate: 52.0, isDefaultRate: true });
      } finally {
        setLoading(false);
      }
    };

    // جلب سعر الصرف فقط إذا كنا بحاجة إلى عرض الجنيه المصري
    if (shouldShowEgp() || showDetail) {
      fetchExchangeRate();
    } else {
      setLoading(false);
    }
  }, [paymentMethod, showEgp, showDetail]);

  // حساب المبلغ بالجنيه المصري
  const getEgpAmount = () => {
    if (!exchangeRate) return null;
    return amount * exchangeRate.rate;
  };

  // تنسيق المبلغ بالدولار الأمريكي مع مراعاة اللغة
  const formatUsd = (value) => {
    const formattedValue = value.toFixed(2);
    // في العربية: ٣٫٥٠ $
    if (isRTL) {
      return `${formattedValue} ${t('currency_symbol')}`;
    }
    // في الإنجليزية: $3.50
    return `${t('currency_symbol')}${formattedValue}`;
  };

  // تنسيق المبلغ بالجنيه المصري مع مراعاة اللغة
  const formatEgp = (value) => {
    const formattedValue = value.toFixed(2);
    // في العربية: ١٨٠٫٥٠ ج.م
    if (isRTL) {
      return `${formattedValue} ${t('egp_symbol', 'ج.م')}`;
    }
    // في الإنجليزية: EGP 180.50
    return `${t('egp_symbol', 'EGP')} ${formattedValue}`;
  };

  // الحصول على فئات CSS بناءً على الحجم
  const getSizeClass = () => {
    switch(size) {
      case 'small':
        return 'price-display-small';
      case 'large':
        return 'price-display-large';
      default:
        return '';
    }
  };

  // محتوى تلميح سعر الصرف
  const exchangeRateInfo = () => {
    if (!exchangeRate) return '';
    
    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString(currentLanguage === 'ar' ? 'ar-EG' : 'en-US');
    };
    
    const rateSource = exchangeRate.isDefaultRate 
      ? t('default_exchange_rate', 'Default exchange rate') 
      : t('last_updated', 'Last updated: {date}', { date: formatDate(exchangeRate.updatedAt) });
    
    return (
      <div dir={direction}>
        <div>{t('exchange_rate_info', 'Exchange rate: 1 USD = {rate} EGP', { rate: exchangeRate.rate })}</div>
        <div style={{ fontSize: '12px', marginTop: '5px' }}>{rateSource}</div>
      </div>
    );
  };

  if (loading) {
    return <Spin size="small" />;
  }

  const displayEgp = shouldShowEgp();

  return (
    <div 
      className={`price-display ${getSizeClass()} ${bold ? 'price-display-bold' : ''} ${inline ? 'price-display-inline' : ''} ${isRTL ? 'price-display-rtl' : ''} ${className}`}
      dir={direction}
    >
      <span className="usd-price">
        {isRTL ? (
          // عرض بأسلوب RTL
          <>
            {formatUsd(amount)} <span className="currency-label">{t('currency_usd')}</span>
          </>
        ) : (
          // عرض بأسلوب LTR
          <>
            <DollarOutlined className="currency-icon" /> {formatUsd(amount)} <span className="currency-label">{t('currency_usd')}</span>
          </>
        )}
      </span>
      
      {displayEgp && exchangeRate && (
        <span className="egp-price">
          {showDetail ? ' = ' : isRTL ? ' (' : ' ('}
          <span className="egp-amount">{formatEgp(getEgpAmount())}</span>
          {!showDetail && ')'}
        </span>
      )}
      
      {showDetail && exchangeRate && (
        <Tooltip 
          title={exchangeRateInfo()} 
          placement={isRTL ? 'left' : 'right'}
        >
          <InfoCircleOutlined className="info-icon" />
        </Tooltip>
      )}
    </div>
  );
};

export default PriceDisplay;