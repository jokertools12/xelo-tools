import React from 'react';
import { Empty, Card } from 'antd';
import { FaHistory } from 'react-icons/fa';
import TransactionDisplay from './TransactionDisplay';
import '../styles/TransactionDisplay.css';
import { useLanguage } from '../context/LanguageContext';

/**
 * Component to display a list of transactions using the TransactionDisplay component
 */
const TransactionList = ({ transactions, loading }) => {
  const { t } = useLanguage();

  return (
    <Card 
      title={
        <div className="card-title-with-icon">
          <FaHistory style={{ marginLeft: '8px' }} />
          {t('transaction_history')}
        </div>
      } 
      className="transactions-card"
    >
      {transactions && transactions.length > 0 ? (
        <table className="transaction-table">
          <thead>
            <tr>
              <th>{t('date')}</th>
              <th>{t('type')}</th>
              <th>{t('amount')}</th>
              <th>{t('status')}</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <TransactionDisplay 
                key={transaction._id || transaction.id} 
                transaction={transaction} 
                t={t} 
              />
            ))}
          </tbody>
        </table>
      ) : (
        <Empty description={t('no_transactions')} />
      )}
    </Card>
  );
};

export default TransactionList;