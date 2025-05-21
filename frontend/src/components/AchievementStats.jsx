import React from 'react';
import { Card, Row, Col, Progress, Statistic, Tooltip, Typography } from 'antd';
import { 
  TrophyOutlined,
  CheckCircleOutlined,
  BarChartOutlined,
  LockOutlined,
  StarOutlined
} from '@ant-design/icons';
import { 
  FaTrophy, 
  FaUser, 
  FaChartLine, 
  FaComments, 
  FaThumbsUp,
  FaSignInAlt,
  FaDownload,
  FaCompass
} from 'react-icons/fa';
import PropTypes from 'prop-types';
import { useLanguage } from '../context/LanguageContext';
import './AchievementStats.css';

const { Title, Text } = Typography;

/**
 * مكون إحصائيات الإنجازات
 * يعرض ملخص إحصائي لإنجازات المستخدم ونسب الإكمال
 * @param {Object} props - خصائص المكون
 */
const AchievementStats = ({ stats, loading = false, compact = false }) => {
  const { t } = useLanguage();
  
  if (!stats) {
    return null;
  }
  
  const { total, unlocked, completion, types } = stats;
  
  // الألوان حسب نوع الإنجاز
  const typeColors = {
    login: '#1890ff',      // أزرق
    profile: '#52c41a',    // أخضر
    level: '#722ed1',      // بنفسجي
    points: '#faad14',     // برتقالي ذهبي
    extraction: '#13c2c2', // فيروزي
    posts: '#eb2f96',      // زهري
    comments: '#fa8c16',   // برتقالي
    reactions: '#fa541c',  // أحمر برتقالي
    explorer: '#2f54eb',   // أزرق داكن
    other: '#8c8c8c'       // رمادي
  };
  
  // الأيقونات حسب نوع الإنجاز
  const typeIcons = {
    login: <FaSignInAlt style={{ color: typeColors.login }} />,
    profile: <FaUser style={{ color: typeColors.profile }} />,
    level: <FaChartLine style={{ color: typeColors.level }} />,
    points: <FaTrophy style={{ color: typeColors.points }} />,
    extraction: <FaDownload style={{ color: typeColors.extraction }} />,
    posts: <FaDownload style={{ color: typeColors.posts }} />,
    comments: <FaComments style={{ color: typeColors.comments }} />,
    reactions: <FaThumbsUp style={{ color: typeColors.reactions }} />,
    explorer: <FaCompass style={{ color: typeColors.explorer }} />,
    other: <StarOutlined style={{ color: typeColors.other }} />
  };
  
  // الشكل المصغر للإحصائيات
  if (compact) {
    return (
      <Card className="achievement-stats-compact">
        <div className="achievement-stats-header">
          <div className="achievement-stats-icon">
            <TrophyOutlined />
          </div>
          <div className="achievement-stats-title">
            <Text strong>{t('achievement_stats')}</Text>
          </div>
        </div>
        
        <div className="achievement-stats-content">
          <Progress 
            percent={completion} 
            size="small" 
            status={completion >= 100 ? "success" : "active"}
            strokeColor={{
              '0%': '#faad14',
              '100%': '#52c41a',
            }}
          />
          
          <div className="achievement-stats-summary">
            <Tooltip title={t('achievements_unlocked')}>
              <div className="achievement-stat-item">
                <CheckCircleOutlined className="stat-icon success" />
                <span>{unlocked}</span>
              </div>
            </Tooltip>
            
            <Tooltip title={t('total')}>
              <div className="achievement-stat-item">
                <TrophyOutlined className="stat-icon primary" />
                <span>{total}</span>
              </div>
            </Tooltip>
            
            <Tooltip title={t('achievements_locked')}>
              <div className="achievement-stat-item">
                <LockOutlined className="stat-icon secondary" />
                <span>{total - unlocked}</span>
              </div>
            </Tooltip>
          </div>
        </div>
      </Card>
    );
  }
  
  // الشكل المفصل للإحصائيات
  return (
    <div className="achievement-stats-container">
      <Card 
        className="achievement-stats-card main-stats" 
        loading={loading}
        title={
          <div className="card-title-with-icon">
            <TrophyOutlined className="title-icon" />
            <span>{t('achievement_progress')}</span>
          </div>
        }
      >
        <Row gutter={[16, 16]} className="stats-row">
          <Col xs={24} sm={8}>
            <Statistic
              title={t('completion_percentage')}
              value={completion}
              suffix="%"
              className="achievement-statistic"
              valueStyle={{ color: completion >= 75 ? '#52c41a' : (completion >= 50 ? '#faad14' : '#1890ff') }}
              prefix={<BarChartOutlined />}
            />
          </Col>
          <Col xs={12} sm={8}>
            <Statistic
              title={t('unlocked')}
              value={unlocked}
              className="achievement-statistic"
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Col>
          <Col xs={12} sm={8}>
            <Statistic
              title={t('total')}
              value={total}
              className="achievement-statistic"
              valueStyle={{ color: '#1890ff' }}
              prefix={<TrophyOutlined />}
            />
          </Col>
        </Row>
        
        <div className="achievement-progress-container">
          <Progress 
            percent={completion} 
            status={completion >= 100 ? "success" : "active"}
            strokeColor={{
              '0%': '#1890ff',
              '50%': '#faad14',
              '100%': '#52c41a',
            }}
            size={10}
          />
        </div>
      </Card>
      
      {Object.keys(types).length > 0 && (
        <Card 
          className="achievement-stats-card categories-stats" 
          loading={loading}
          title={
            <div className="card-title-with-icon">
              <StarOutlined className="title-icon" />
              <span>{t('achievements_by_type')}</span>
            </div>
          }
        >
          <Row gutter={[16, 16]} className="stats-categories">
            {Object.keys(types).map(type => (
              <Col xs={12} sm={8} md={6} key={type}>
                <div className="category-stats-item">
                  <div className="category-icon">
                    {typeIcons[type] || typeIcons.other}
                  </div>
                  <div className="category-info">
                    <div className="category-name">
                      {t(`achievement_type_${type}`)}
                    </div>
                    <div className="category-progress">
                      <Progress 
                        percent={types[type].completion} 
                        size="small"
                        showInfo={false}
                        strokeColor={typeColors[type] || typeColors.other}
                      />
                    </div>
                    <div className="category-ratio">
                      {types[type].unlocked} / {types[type].total}
                    </div>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Card>
      )}
    </div>
  );
};

AchievementStats.propTypes = {
  stats: PropTypes.shape({
    total: PropTypes.number.isRequired,
    unlocked: PropTypes.number.isRequired,
    completion: PropTypes.number.isRequired,
    types: PropTypes.object
  }),
  loading: PropTypes.bool,
  compact: PropTypes.bool
};

export default AchievementStats;