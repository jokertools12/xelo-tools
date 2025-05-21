import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Divider, Typography, Badge, Progress, Empty, Spin } from 'antd';
import SEO from '../components/SEO';
import { useMessage } from '../context/MessageContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  UserOutlined, 
  TeamOutlined, 
  FileTextOutlined, 
  ApiOutlined,
  KeyOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  HistoryOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { userService } from '../services/api';
import { useUser } from '../context/UserContext';
import ContentContainer from '../components/ContentContainer';
import ShimmerEffect from '../components/ShimmerEffect';
import { 
  getLevelColor, 
  getLevelIcon, 
  getLevelTierName, 
  getLevelProgressBar,
  getLevelBadge,
  getLevelGradient,
  levelProgressPercentage, 
  pointsForNextLevel,
  POINTS_PER_LEVEL
} from '../utils/levelUtils';
import '../styles/Dashboard.css';
import ActivityItem from '../components/ActivityItem';

const { Text } = Typography;

const Dashboard = () => {
  const [statsLoading, setStatsLoading] = useState(false);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [stats, setStats] = useState({});
  const [activities, setActivities] = useState([]);
  const [activityUsers, setActivityUsers] = useState({});
  const [accessTokens, setAccessTokens] = useState([]);
  const { user } = useUser();
  const { showError } = useMessage();
  const { t, currentLanguage, direction } = useLanguage();

  useEffect(() => {
    const fetchDashboardData = async () => {
      setStatsLoading(true);
      setActivitiesLoading(true);
      try {
        // Get dashboard data with user stats
        const data = await userService.getDashboardData();
        setStats(data.stats);
        setStatsLoading(false);
        
        // Get recent activities from all users (global activities)
        const activitiesResponse = await userService.getGlobalActivities(5);
        setActivities(Array.isArray(activitiesResponse) ? activitiesResponse : []);
        
        // If activities include userIds, fetch those users' data
        if (activitiesResponse && activitiesResponse.length > 0) {
          const userIds = activitiesResponse
            .filter(act => act.userId && act.userId !== user?._id)
            .map(act => act.userId);
          
          // If there are other users' activities, fetch their data for avatars
          if (userIds.length > 0) {
            const uniqueUserIds = [...new Set(userIds)];
            try {
              const usersResponse = await userService.getUsersBasicInfo(uniqueUserIds);
              if (usersResponse && Array.isArray(usersResponse)) {
                const usersMap = {};
                usersResponse.forEach(u => {
                  if (u && u._id) {
                    usersMap[u._id] = u;
                  }
                });
                setActivityUsers(usersMap);
              }
            } catch (error) {
              console.error('Failed to fetch activity users:', error);
            }
          }
        }
        setActivitiesLoading(false);
        
        // Fetch user's access tokens
        const tokensResponse = await userService.getUserAccessTokens();
        // Make sure we're getting the correct data structure
        setAccessTokens(Array.isArray(tokensResponse) ? tokensResponse : tokensResponse.accessTokens || []);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        showError('Failed to fetch dashboard data');
      } finally {
        setStatsLoading(false);
        setActivitiesLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const globalLoading = statsLoading || activitiesLoading;

  return (
    <ContentContainer>
      {globalLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          <SEO 
            title={`${t('dashboard')} | Xelo Tools`}
            description={`${t('dashboard')} Xelo Tools - ${t('welcome')}`}
            canonicalUrl="https://xelo.tools/dashboard"
            additionalMetaTags={[
              { name: 'keywords', content: 'dashboard, لوحة التحكم, Xelo Tools, إحصائيات, نقاط, مستوى, أنشطة' }
            ]}
          />
          {/* User Stats Row - Moved to top */}
          <Row gutter={[24, 24]} className="stats-row">
            <Col xs={24}>
              <Card
                title={<><DollarOutlined />{t('statistics')}</>}
                className="main-card"
                loading={statsLoading}
              >
                <Row gutter={[24, 24]} className="stats-items-row">
                  {direction === 'rtl' ? (
                    // الترتيب باللغة العربية (RTL): رموز الوصول، ثم المستوى، ثم النقاط
                    <>
                      {/* 3. إجمالي رموز الوصول */}
                      <Col xs={24} sm={8} className="stats-item access-tokens-stat">
                        <Spin spinning={statsLoading}>
                          <Statistic 
                            title={t('totalAccessTokens')} 
                            value={accessTokens.length} 
                            prefix={<KeyOutlined />}
                            valueStyle={{ color: '#1890ff' }}
                            className="rtl-statistic"
                          />
                          <Progress percent={accessTokens.length > 0 ? 100 : 0} status="active" strokeColor="#1890ff" className="rtl-progress" />
                        </Spin>
                      </Col>

                      {/* 2. المستوى الحالي */}
                      <Col xs={24} sm={8} className="stats-item current-level-stat">
                        <Spin spinning={statsLoading}>
                          <Statistic 
                            title={<span>{t('currentLevel')}</span>} 
                            value={user?.level || stats.userLevel || 1} 
                            valueStyle={{ 
                              color: getLevelColor(user?.level || stats.userLevel || 1),
                              fontWeight: 'bold'
                            }}
                            prefix={getLevelIcon(user?.level || stats.userLevel || 1, { 
                              style: { marginRight: '8px', fontSize: '20px' } 
                            })}
                            suffix={
                              <span style={{ 
                                fontSize: '14px', 
                                marginLeft: '8px',
                                color: getLevelColor(user?.level || stats.userLevel || 1),
                                background: `${getLevelColor(user?.level || stats.userLevel || 1)}15`,
                                padding: '3px 10px',
                                borderRadius: '12px',
                                border: `1px solid ${getLevelColor(user?.level || stats.userLevel || 1)}30`,
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                fontWeight: '500',
                                display: 'inline-flex',
                                alignItems: 'center'
                              }}>
                                {getLevelTierName(user?.level || stats.userLevel || 1)}
                              </span>
                            }
                            className="rtl-statistic"
                          />
                          
                          <Progress 
                            percent={levelProgressPercentage(user?.allPoints || stats.userAllPoints || 0)}
                            strokeColor={getLevelColor(user?.level || stats.userLevel || 1)}
                            size="small"
                            status="active"
                            className="rtl-progress"
                          />
                          
                          <div style={{ 
                            fontSize: '12px', 
                            color: '#8c8c8c', 
                            marginTop: '5px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                          className="level-progress-text"
                          >
                            <span>{t('level')} {user?.level || stats.userLevel || 1}</span>
                            <span style={{ textAlign: 'center' }}>
                              {pointsForNextLevel(user?.allPoints || stats.userAllPoints || 0).toLocaleString()} {t('pointsToNextLevel')}
                            </span>
                            <span>{t('level')} {(user?.level || stats.userLevel || 1) + 1}</span>
                          </div>
                        </Spin>
                      </Col>
                      
                      {/* 1. إجمالي النقاط */}
                      <Col xs={24} sm={8} className="stats-item total-points-stat">
                        <Spin spinning={statsLoading}>
                          <Statistic 
                            title={t('totalPoints')} 
                            value={user?.points || stats.userPoints || 0} 
                            prefix={<DollarOutlined />}
                            valueStyle={{ color: '#3f8600' }}
                            suffix={t('points')}
                            className="rtl-statistic"
                          />
                          <Progress 
                            percent={(user?.points || stats.userPoints) ? Math.min(((user?.points || stats.userPoints) / 1000) * 100, 100) : 0} 
                            status="active"
                            className="rtl-progress"
                          />
                        </Spin>
                      </Col>
                    </>
                  ) : (
                    // الترتيب باللغة الإنجليزية (LTR): النقاط ثم المستوى ثم رموز الوصول
                    <>
                      {/* 1. Total Points */}
                      <Col xs={24} sm={8} className="stats-item total-points-stat">
                        <Spin spinning={statsLoading}>
                          <Statistic 
                            title={t('totalPoints')} 
                            value={user?.points || stats.userPoints || 0} 
                            prefix={<DollarOutlined />}
                            valueStyle={{ color: '#3f8600' }}
                            suffix={t('points')}
                            className="rtl-statistic"
                          />
                          <Progress 
                            percent={(user?.points || stats.userPoints) ? Math.min(((user?.points || stats.userPoints) / 1000) * 100, 100) : 0} 
                            status="active"
                            className="rtl-progress"
                          />
                        </Spin>
                      </Col>
                      
                      {/* 2. Current Level */}
                      <Col xs={24} sm={8} className="stats-item current-level-stat">
                        <Spin spinning={statsLoading}>
                          <Statistic 
                            title={<span>{t('currentLevel')}</span>} 
                            value={user?.level || stats.userLevel || 1} 
                            valueStyle={{ 
                              color: getLevelColor(user?.level || stats.userLevel || 1),
                              fontWeight: 'bold'
                            }}
                            prefix={getLevelIcon(user?.level || stats.userLevel || 1, { 
                              style: { marginRight: '8px', fontSize: '20px' } 
                            })}
                            suffix={
                              <span style={{ 
                                fontSize: '14px', 
                                marginLeft: '8px',
                                color: getLevelColor(user?.level || stats.userLevel || 1),
                                background: `${getLevelColor(user?.level || stats.userLevel || 1)}15`,
                                padding: '3px 10px',
                                borderRadius: '12px',
                                border: `1px solid ${getLevelColor(user?.level || stats.userLevel || 1)}30`,
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                fontWeight: '500',
                                display: 'inline-flex',
                                alignItems: 'center'
                              }}>
                                {getLevelTierName(user?.level || stats.userLevel || 1)}
                              </span>
                            }
                            className="rtl-statistic"
                          />
                          
                          <Progress 
                            percent={levelProgressPercentage(user?.allPoints || stats.userAllPoints || 0)}
                            strokeColor={getLevelColor(user?.level || stats.userLevel || 1)}
                            size="small"
                            status="active"
                            className="rtl-progress"
                          />
                          
                          <div style={{ 
                            fontSize: '12px', 
                            color: '#8c8c8c', 
                            marginTop: '5px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                          className="level-progress-text"
                          >
                            <span>{t('level')} {user?.level || stats.userLevel || 1}</span>
                            <span style={{ textAlign: 'center' }}>
                              {pointsForNextLevel(user?.allPoints || stats.userAllPoints || 0).toLocaleString()} {t('pointsToNextLevel')}
                            </span>
                            <span>{t('level')} {(user?.level || stats.userLevel || 1) + 1}</span>
                          </div>
                        </Spin>
                      </Col>
                      
                      {/* 3. Total Access Tokens */}
                      <Col xs={24} sm={8} className="stats-item access-tokens-stat">
                        <Spin spinning={statsLoading}>
                          <Statistic 
                            title={t('totalAccessTokens')} 
                            value={accessTokens.length} 
                            prefix={<KeyOutlined />}
                            valueStyle={{ color: '#1890ff' }}
                            className="rtl-statistic"
                          />
                          <Progress percent={accessTokens.length > 0 ? 100 : 0} status="active" strokeColor="#1890ff" className="rtl-progress" />
                        </Spin>
                      </Col>
                    </>
                  )}
                </Row>
              </Card>
            </Col>
          </Row>

          <Divider />
          
          {/* Activities Row */}
          <Row gutter={[24, 24]} className="data-row">
            <Col xs={24}>
              <Card
                title={<><HistoryOutlined />{t('recentActivities')}</>}
                className="main-card activities-card"
                loading={activitiesLoading}
              >
                <Spin spinning={activitiesLoading}>
                  {activities.length > 0 ? (
                    <div className="activities-list">
                      {activities.map((activity) => (
                        <ActivityItem
                          key={activity.id}
                          activity={activity}
                          user={user}
                          activityUser={activity.userId === user?._id ? user : activityUsers[activity.userId]}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="empty-activities">
                      <Empty
                        description={t('noRecentActivities')}
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    </div>
                  )}
                </Spin>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </ContentContainer>
  );
};

export default Dashboard;