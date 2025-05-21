import React, { useState } from 'react';
import { 
  Row, Col, Card, Button, Spin, Progress, List, Tag, Typography, Space,
  Statistic
} from 'antd';
import { 
  BarChartOutlined, SyncOutlined, CommentOutlined, RobotOutlined,
  CheckOutlined, CloseOutlined, ClockCircleOutlined, LikeOutlined
} from '@ant-design/icons';
import { t } from '../../utils/translationHelper';

const { Title, Text } = Typography;

/**
 * CommentResponseStats Component
 * 
 * Displays statistics and analytics for the comment response system
 * Shows monitor activity, rule effectiveness, and recent responses
 */
const CommentResponseStats = ({ stats, refreshStats }) => {
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    await refreshStats();
    setLoading(false);
  };

  // Format relative time
  const formatRelativeTime = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHr = Math.round(diffMin / 60);
    const diffDays = Math.round(diffHr / 24);
    
    if (diffSec < 60) return `منذ ${diffSec} ثانية`;
    if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
    if (diffHr < 24) return `منذ ${diffHr} ساعة`;
    if (diffDays === 1) return 'منذ يوم';
    if (diffDays < 30) return `منذ ${diffDays} يوم`;
    
    return date.toLocaleDateString();
  };

  // Get progress bar status color
  const getProgressStatus = (rate) => {
    if (rate > 80) return 'success';
    if (rate > 50) return 'normal';
    return 'exception';
  };

  if (!stats) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: '15px' }}>{t('common.loading', 'جاري التحميل...')}</div>
      </div>
    );
  }

  return (
    <div className="comment-response-stats">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Title level={3}>
          <BarChartOutlined style={{ marginRight: '8px' }} />
          {t('comment_response.statistics_title', 'إحصائيات الرد على التعليقات')}
        </Title>
        <Button 
          type="primary"
          icon={<SyncOutlined spin={loading} />}
          onClick={handleRefresh}
          loading={loading}
        >
          {loading 
            ? t('common.refreshing', 'جاري التحديث...') 
            : t('common.refresh', 'تحديث')}
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        {/* Summary Cards */}
        <Col xs={24} sm={12} md={6}>
          <Card className="stats-card">
            <Statistic
              title={t('comment_response.active_monitors', 'مراقبات نشطة')}
              value={stats.totalMonitors || 0}
              prefix={<CommentOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stats-card">
            <Statistic
              title={t('comment_response.response_rules', 'قواعد الرد')}
              value={stats.totalRules || 0}
              prefix={<RobotOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stats-card">
            <Statistic
              title={t('comment_response.total_responses', 'إجمالي الردود')}
              value={stats.totalResponses || 0}
              prefix={<LikeOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stats-card">
            <Statistic
              title={t('comment_response.success_rate', 'نسبة النجاح')}
              value={stats.successRate || 0}
              suffix="%"
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckOutlined style={{ color: '#52c41a' }} />}
            />
            <Progress 
              percent={stats.successRate || 0} 
              status={getProgressStatus(stats.successRate || 0)}
              showInfo={false}
              style={{ marginTop: '10px' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        {/* Top Rules */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <RobotOutlined />
                {t('comment_response.top_rules', 'أكثر القواعد استخدامًا')}
              </Space>
            }
            className="h-100"
          >
            {stats.topRules && stats.topRules.length > 0 ? (
              <List
                dataSource={stats.topRules}
                renderItem={(rule, index) => (
                  <List.Item key={rule._id || index}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <Space>
                        <Text type="secondary">#{index + 1}</Text>
                        <Text>{rule.name}</Text>
                      </Space>
                      <Tag color="blue">
                        {rule.stats?.timesTriggered || 0} {t('comment_response.uses', 'استخدام')}
                      </Tag>
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <RobotOutlined style={{ fontSize: '30px', color: '#d9d9d9', marginBottom: '8px' }} />
                <div>
                  <Text type="secondary">{t('comment_response.no_rule_usage', 'لم يتم استخدام أي قواعد بعد')}</Text>
                </div>
              </div>
            )}
          </Card>
        </Col>

        {/* Top Monitors */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <CommentOutlined />
                {t('comment_response.top_monitors', 'أكثر المراقبات نشاطًا')}
              </Space>
            }
            className="h-100"
          >
            {stats.topMonitors && stats.topMonitors.length > 0 ? (
              <List
                dataSource={stats.topMonitors}
                renderItem={(monitor, index) => (
                  <List.Item key={monitor._id || index}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <Space>
                        <Text type="secondary">#{index + 1}</Text>
                        <Text>{monitor.name}</Text>
                      </Space>
                      <Space>
                        <Tag color="blue">
                          {monitor.stats?.commentsFound || 0} {t('comment_response.comments', 'تعليق')}
                        </Tag>
                        <Tag color="success">
                          {monitor.stats?.commentsResponded || 0} {t('comment_response.responses', 'رد')}
                        </Tag>
                      </Space>
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <CommentOutlined style={{ fontSize: '30px', color: '#d9d9d9', marginBottom: '8px' }} />
                <div>
                  <Text type="secondary">{t('comment_response.no_monitor_activity', 'لا يوجد نشاط للمراقبات بعد')}</Text>
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        {/* Recent Responses */}
        <Col xs={24}>
          <Card
            title={
              <Space>
                <ClockCircleOutlined />
                {t('comment_response.recent_responses', 'أحدث الردود')}
              </Space>
            }
          >
            {stats.recentResponses && stats.recentResponses.length > 0 ? (
              <List
                dataSource={stats.recentResponses}
                renderItem={(response, index) => (
                  <List.Item key={response._id || index}>
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 auto', minWidth: '60%' }}>
                          <div style={{ marginBottom: '4px' }}>
                            <Text strong>{t('comment_response.comment', 'التعليق')}:</Text>{' '}
                            {response.commentText.length > 70 
                              ? `${response.commentText.substring(0, 70)}...` 
                              : response.commentText}
                          </div>
                          <div style={{ marginBottom: '4px' }}>
                            <Text strong>{t('comment_response.response', 'الرد')}:</Text>{' '}
                            {response.responseText.length > 70 
                              ? `${response.responseText.substring(0, 70)}...` 
                              : response.responseText}
                          </div>
                          <div>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              <Space>
                                <span>
                                  <Text strong>{t('comment_response.page', 'الصفحة')}:</Text>{' '}
                                  {response.pageName}
                                </span>
                                <span>
                                  <Text strong>{t('comment_response.monitor', 'المراقبة')}:</Text>{' '}
                                  {response.monitor?.name || '-'}
                                </span>
                                <span>
                                  <Text strong>{t('comment_response.rule', 'القاعدة')}:</Text>{' '}
                                  {response.rule?.name || '-'}
                                </span>
                              </Space>
                            </Text>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: '8px' }}>
                          <Tag 
                            color={response.success ? 'success' : 'error'}
                            icon={response.success ? <CheckOutlined /> : <CloseOutlined />}
                            style={{ marginBottom: '4px' }}
                          >
                            {response.success 
                              ? t('comment_response.sent', 'تم الإرسال')
                              : t('comment_response.failed', 'فشل')}
                          </Tag>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {formatRelativeTime(response.createdAt)}
                          </Text>
                        </div>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <ClockCircleOutlined style={{ fontSize: '30px', color: '#d9d9d9', marginBottom: '8px' }} />
                <div>
                  <Text type="secondary">{t('comment_response.no_recent_responses', 'لا توجد ردود حديثة')}</Text>
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CommentResponseStats;