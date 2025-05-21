import React, { useState, useEffect, useCallback } from 'react';
import { 
  Layout, 
  Typography, 
  Card, 
  Row, 
  Col, 
  Select, 
  Radio, 
  Input, 
  Empty, 
  Spin, 
  Alert,
  Button,
  Badge,
  Divider,
  Tooltip
} from 'antd';
import { 
  TrophyOutlined, 
  FilterOutlined, 
  SearchOutlined, 
  ReloadOutlined, 
  CheckCircleOutlined,
  LockOutlined,
  StarOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';

import ContentContainer from '../components/ContentContainer';
import AchievementCard from '../components/AchievementCard';
import AchievementStats from '../components/AchievementStats';
import AchievementNotification from '../components/AchievementNotification';
import '../styles/Achievements.css';

const { Title } = Typography;
const { Content } = Layout;
const { Option } = Select;

/**
 * Achievement Page
 * Main page for displaying, filtering and managing user achievements
 */
const Achievements = () => {
  const { t } = useLanguage();
  // حالات الصفحة
  const [achievements, setAchievements] = useState([]);
  const [filteredAchievements, setFilteredAchievements] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // حالات التصفية
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // حالة الإشعارات
  const [showNotification, setShowNotification] = useState(false);
  const [newAchievement, setNewAchievement] = useState(null);
  
  // جلب الإنجازات من الخادم
  const fetchAchievements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // استدعاء الواجهة البرمجية للحصول على إنجازات المستخدم
      const response = await axios.get('/api/achievements/user');
      
      if (response.data && Array.isArray(response.data)) {
        // ترتيب الإنجازات حسب الحالة ثم حسب التاريخ
        const sortedAchievements = response.data.sort((a, b) => {
          // المفتوحة أولاً
          if (a.unlocked !== b.unlocked) {
            return b.unlocked ? 1 : -1;
          }
          
          // الأحدث أولاً للمفتوحة
          if (a.unlocked && b.unlocked) {
            return new Date(b.date) - new Date(a.date);
          }
          
          // الترتيب حسب نسبة التقدم للمغلقة
          return (b.progress / b.target) - (a.progress / a.target);
        });
        
        setAchievements(sortedAchievements);
        applyFilters(sortedAchievements, filterType, filterStatus, searchQuery);
        
        // التحقق من وجود إنجازات جديدة غير مشاهدة
        const newUnlockedAchievement = sortedAchievements.find(
          a => a.unlocked && !a.viewed
        );
        
        if (newUnlockedAchievement) {
          // إظهار إشعار بالإنجاز الجديد
          setNewAchievement(newUnlockedAchievement);
          setShowNotification(true);
          
          // تحديث حالة المشاهدة
          markAchievementAsViewed(newUnlockedAchievement.id);
        }
      }
    } catch (err) {
      console.error('Error fetching achievements:', err);
      setError(t('error_loading'));
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus, searchQuery]);
  
  // جلب إحصائيات الإنجازات
  const fetchAchievementStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      
      // استدعاء الواجهة البرمجية للحصول على إحصائيات الإنجازات
      const response = await axios.get('/api/achievements/user/stats');
      
      if (response.data) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Error fetching achievement stats:', err);
      // لا نعرض خطأ للإحصائيات للحفاظ على تجربة المستخدم
    } finally {
      setStatsLoading(false);
    }
  }, []);
  
  // تطبيق المرشحات على الإنجازات
  const applyFilters = (achievements, type, status, query) => {
    let filtered = [...achievements];
    
    // تصفية حسب النوع
    if (type !== 'all') {
      filtered = filtered.filter(a => a.type === type);
    }
    
    // تصفية حسب الحالة
    if (status === 'locked') {
      filtered = filtered.filter(a => !a.unlocked);
    } else if (status === 'unlocked') {
      filtered = filtered.filter(a => a.unlocked);
    }
    
    // تصفية حسب البحث
    if (query.trim()) {
      const normalizedQuery = query.trim().toLowerCase();
      filtered = filtered.filter(
        a => a.title.toLowerCase().includes(normalizedQuery) || 
             a.description.toLowerCase().includes(normalizedQuery)
      );
    }
    
    setFilteredAchievements(filtered);
  };
  
  // تحديث المرشحات
  const handleFilterChange = (type, status, query) => {
    setFilterType(type);
    setFilterStatus(status);
    setSearchQuery(query);
    applyFilters(achievements, type, status, query);
  };
  
  // تحديد الإنجاز كمشاهد
  const markAchievementAsViewed = async (achievementId) => {
    try {
      await axios.put(`/api/achievements/${achievementId}/viewed`);
      
      // تحديث حالة العرض محلياً
      setAchievements(prevAchievements => 
        prevAchievements.map(a => 
          a.id === achievementId ? { ...a, viewed: true } : a
        )
      );
    } catch (err) {
      console.error('Error marking achievement as viewed:', err);
    }
  };
  
  // إغلاق إشعار الإنجاز
  const handleCloseNotification = () => {
    setShowNotification(false);
    setNewAchievement(null);
  };
  
  // تحميل البيانات عند التحميل
  useEffect(() => {
    fetchAchievements();
    fetchAchievementStats();
  }, [fetchAchievements, fetchAchievementStats]);
  
  // Achievement types for filtering
  const achievementTypes = [
    { value: 'all', label: t('all_types') },
    { value: 'login', label: t('login_type') },
    { value: 'profile', label: t('profile_type') },
    { value: 'level', label: t('level_type') },
    { value: 'points', label: t('points_type') },
    { value: 'extraction', label: t('extraction_type') },
    { value: 'posts', label: t('posts_type') },
    { value: 'comments', label: t('comments_type') },
    { value: 'reactions', label: t('reactions_type') },
    { value: 'explorer', label: t('explorer_type') },
    { value: 'other', label: t('other_type') }
  ];
  
  // حالات حركة الإنجازات
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };
  
  const achievementVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { 
        type: 'spring',
        damping: 15,
        stiffness: 300
      }
    }
  };
  
  // عرض إشعار الإنجازات الجديدة
  const renderAchievementNotification = () => {
    return (
      <AchievementNotification
        open={showNotification && newAchievement !== null}
        achievement={newAchievement}
        onClose={handleCloseNotification}
        playSound={true}
      />
    );
  };
  
  return (
    <ContentContainer>
      <div className="achievements-page">
        {/* عنوان الصفحة */}
        <div className="page-header">
          <Title level={2} className="page-title">
            <TrophyOutlined className="page-title-icon" />
            {t('achievements_title')}
          </Title>
        </div>
        
        {/* إحصائيات الإنجازات */}
        <div className="achievements-stats-section">
          <AchievementStats stats={stats} loading={statsLoading} />
        </div>
        
        {/* قسم التصفية والبحث */}
        <Card className="achievements-filter-card">
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} md={5}>
              <div className="filter-label">
                <FilterOutlined /> {t('filter_by')}
              </div>
            </Col>
            <Col xs={24} sm={12} md={7}>
              <Select
                className="filter-select"
                value={filterType}
                onChange={value => handleFilterChange(value, filterStatus, searchQuery)}
                suffixIcon={<StarOutlined />}
              >
                {achievementTypes.map(type => (
                  <Option key={type.value} value={type.value}>
                    {type.label}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Radio.Group
                value={filterStatus}
                onChange={e => handleFilterChange(filterType, e.target.value, searchQuery)}
                className="status-radio"
              >
                <Tooltip title={t('all_achievements_tooltip')}>
                  <Radio.Button value="all">{t('all')}</Radio.Button>
                </Tooltip>
                <Tooltip title={t('unlocked_achievements_tooltip')}>
                  <Radio.Button value="unlocked">
                    <CheckCircleOutlined />
                  </Radio.Button>
                </Tooltip>
                <Tooltip title={t('locked_achievements_tooltip')}>
                  <Radio.Button value="locked">
                    <LockOutlined />
                  </Radio.Button>
                </Tooltip>
              </Radio.Group>
            </Col>
            <Col xs={24} md={6}>
              <Input
                placeholder={t('search_achievements')}
                value={searchQuery}
                onChange={e => handleFilterChange(filterType, filterStatus, e.target.value)}
                prefix={<SearchOutlined />}
                allowClear
              />
            </Col>
          </Row>
        </Card>
        
        {/* عرض الإنجازات */}
        <div className="achievements-list-container">
          {error && (
            <Alert
              message={t('error_title')}
              description={error}
              type="error"
              showIcon
              className="error-alert"
            />
          )}
          
          {loading ? (
            <div className="loading-container">
              <Spin size="large" />
              <p>{t('loading_achievements')}</p>
            </div>
          ) : filteredAchievements.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span>
                  {t('no_achievements_found')}
                  <Button 
                    type="link" 
                    onClick={() => handleFilterChange('all', 'all', '')}
                    icon={<ReloadOutlined />}
                  >
                    {t('show_all')}
                  </Button>
                </span>
              }
            />
          ) : (
            <motion.div
              className="achievements-grid"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <Row gutter={[16, 16]}>
                {filteredAchievements.map(achievement => (
                  <Col xs={24} sm={12} md={8} lg={6} key={achievement.id}>
                    <motion.div variants={achievementVariants}>
                      <AchievementCard 
                        achievement={achievement} 
                        onClick={() => {}}
                      />
                    </motion.div>
                  </Col>
                ))}
              </Row>
            </motion.div>
          )}
        </div>
        
        {/* النقاط المكتسبة من الإنجازات */}
        {achievements.length > 0 && (
          <Card className="achievements-summary-card">
            <Row gutter={16} align="middle">
              <Col xs={24} md={12}>
                <div className="summary-item">
                  <div className="summary-icon">
                    <TrophyOutlined />
                  </div>
                  <div className="summary-text">
                    {t('unlocked_achievements')} 
                    <Badge 
                      count={achievements.filter(a => a.unlocked).length} 
                      style={{ 
                        backgroundColor: '#52c41a',
                        marginRight: '8px'
                      }} 
                    />
                    {t('total_achievements')}
                    <Badge 
                      count={achievements.length} 
                      style={{ 
                        backgroundColor: '#1890ff',
                        marginRight: '8px'
                      }} 
                    />
                  </div>
                </div>
              </Col>
              <Col xs={24} md={12}>
                <div className="summary-item">
                  <div className="summary-icon special">
                    <TrophyOutlined />
                  </div>
                  <div className="summary-text">
                    {t('points_from_achievements')}
                    <Badge 
                      count={
                        achievements
                          .filter(a => a.unlocked)
                          .reduce((sum, a) => sum + (a.pointsAwarded || 0), 0)
                      } 
                      style={{ 
                        backgroundColor: '#faad14',
                        marginRight: '8px'
                      }} 
                      overflowCount={100000}
                    />
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        )}
      </div>
      
      {/* إشعار الإنجازات الجديدة */}
      {renderAchievementNotification()}
    </ContentContainer>
  );
};

export default Achievements;