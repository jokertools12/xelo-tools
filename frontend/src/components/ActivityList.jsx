import React from 'react';
import { Empty, Card, Spin } from 'antd';
import { FaHistory } from 'react-icons/fa';
import ActivityItem from './ActivityItem';
import '../styles/ActivityDisplay.css';
import { useLanguage } from '../context/LanguageContext';

/**
 * Component to display a list of user activities using the ActivityItem component
 * Added filtering of admin activities and improved data handling
 */
const ActivityList = ({ activities, loading, hideAdminActions = true, limit }) => {
  const { t } = useLanguage();

  // Filter out any admin actions if hideAdminActions is true
  const filteredActivities = hideAdminActions 
    ? activities.filter(activity => {
        // Skip admin activities
        if (activity.actionType === 'admin' || 
            (activity.details && activity.details.actionType === 'admin')) {
          return false;
        }
        
        // Skip activities related to admin confirmations
        if (activity.details && (
            activity.details.action === 'confirm_subscription' ||
            activity.details.action === 'reject_subscription' ||
            activity.details.action === 'admin_addition' ||
            activity.details.confirmedBy)) {
          return false;
        }
        
        return true;
      }) 
    : activities;

  // Apply limit if specified
  const displayActivities = limit > 0 ? filteredActivities.slice(0, limit) : filteredActivities;

  return (
    <Card 
      title={
        <div className="card-title-with-icon">
          <FaHistory style={{ marginLeft: '8px' }} />
          {t('recent_activities')}
        </div>
      } 
      className="activities-card"
      loading={loading}
    >
      {loading ? (
        <div className="loading-container">
          <Spin size="large" />
        </div>
      ) : displayActivities && displayActivities.length > 0 ? (
        <div className="activities-list">
          {displayActivities.map((activity) => (
            <ActivityItem
              key={activity._id || activity.id || `activity-${Math.random()}`}
              activity={activity}
            />
          ))}
        </div>
      ) : (
        <Empty 
          description={t('no_recent_activities')}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}
    </Card>
  );
};

export default ActivityList;