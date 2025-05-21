import React, { useState, useEffect } from 'react';
import { Tabs, Alert, Button, Spin } from 'antd';
import { CommentOutlined, RobotOutlined, HistoryOutlined, BarChartOutlined, InfoCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import '../styles/CommentResponseManagement.css';
import { useUser } from '../context/UserContext';
import { useNotification } from '../context/NotificationContext';
import CommentResponseRules from '../components/CommentResponse/CommentResponseRules';
import CommentMonitors from '../components/CommentResponse/CommentMonitors';
import CommentResponseHistory from '../components/CommentResponse/CommentResponseHistory';
import CommentResponseStats from '../components/CommentResponse/CommentResponseStats';
import SystemLimitsInfo from '../components/CommentResponse/SystemLimitsInfo';
import ContentContainer from '../components/ContentContainer';
import SectionTracker from '../components/SectionTracker';
import { t } from '../utils/translationHelper';

/**
 * CommentResponseManagement Component
 * 
 * Main component for managing automatic Facebook comment responses
 * Includes tabs for:
 * - Rules: Define response triggers and automatic replies
 * - Monitors: Set up monitoring for posts and apply rules
 * - History: View history of automated comment responses
 * - Analytics: View statistics about the comment response system
 */
const CommentResponseManagement = () => {
  const { user } = useUser();
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [activeKey, setActiveKey] = useState('rules');
  const [accessTokens, setAccessTokens] = useState([]);
  const [hasActiveToken, setHasActiveToken] = useState(false);

  useEffect(() => {
    // Check if user has active access token
    const fetchAccessTokens = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/api/users/access-tokens');
        setAccessTokens(res.data);
        setHasActiveToken(res.data.some(token => token.isActive));
        setLoading(false);
      } catch (err) {
        console.error('Error fetching access tokens:', err);
        setLoading(false);
      }
    };

    fetchAccessTokens();
    fetchStats();
  }, []);

  // Fetch comment response system statistics
  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/comment-responses/stats');
      setStats(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching comment response stats:', err);
      setError(t('comment_response.error_fetching_stats', 'حدث خطأ أثناء جلب إحصائيات الرد على التعليقات'));
      setLoading(false);
    }
  };

  // Handle tab change
  const handleTabChange = (key) => {
    setActiveKey(key);
    // Refresh stats when switching to stats tab
    if (key === 'stats') {
      fetchStats();
    }
  };

  // Define tab items
  const tabItems = [
    {
      key: 'rules',
      label: (
        <span>
          <RobotOutlined />
          {t('comment_response.rules_tab', 'قواعد الرد')}
        </span>
      ),
      children: <CommentResponseRules />
    },
    {
      key: 'monitors',
      label: (
        <span>
          <CommentOutlined />
          {t('comment_response.monitors_tab', 'مراقبة المنشورات')}
        </span>
      ),
      children: <CommentMonitors hasActiveToken={hasActiveToken} />
    },
    {
      key: 'history',
      label: (
        <span>
          <HistoryOutlined />
          {t('comment_response.history_tab', 'سجل الردود')}
        </span>
      ),
      children: <CommentResponseHistory />
    },
    {
      key: 'stats',
      label: (
        <span>
          <BarChartOutlined />
          {t('comment_response.stats_tab', 'الإحصائيات')}
        </span>
      ),
      children: <CommentResponseStats stats={stats} refreshStats={fetchStats} />
    }
  ];

  if (loading && !stats && !hasActiveToken) {
    return (
      <ContentContainer isLoading={true}>
        <div className="text-center py-5">
          <p>{t('common.loading', 'جاري التحميل...')}</p>
        </div>
      </ContentContainer>
    );
  }

  return (
    <>
      <SectionTracker />
      <ContentContainer>
        <div className="page-header">
          <h1 className="page-title">
            <CommentOutlined style={{ marginRight: '8px' }} />
            {t('comment_response.title', 'إدارة الرد الآلي على التعليقات')}
          </h1>
          
          <p className="text-muted">
            {t('comment_response.description', 'إنشاء وإدارة نظام الرد الآلي على تعليقات منشورات صفحات الفيسبوك')}
          </p>
        </div>
        
        {/* System limits information card - only displayed when user has an active token */}
        {hasActiveToken && (
          <div className="mb-4">
            <SystemLimitsInfo />
          </div>
        )}

        {!hasActiveToken && (
          <Alert
            message={t('comment_response.no_active_token', 'لا يوجد رمز وصول نشط')}
            description={t('comment_response.token_required', 'يجب تفعيل رمز وصول لاستخدام نظام الرد على التعليقات')}
            type="warning"
            showIcon
            action={
              <Button type="primary" href="/get-access-token">
                {t('comment_response.manage_tokens', 'إدارة رموز الوصول')}
              </Button>
            }
          />
        )}

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: '16px' }}
          />
        )}

        <Tabs
          activeKey={activeKey}
          onChange={handleTabChange}
          items={tabItems}
          size="large"
          className="comment-tabs"
          type="card"
          style={{ direction: 'rtl' }}
        />
      </ContentContainer>
    </>
  );
};

export default CommentResponseManagement;