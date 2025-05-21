import React from 'react';
import { Card, Progress, Avatar, Tooltip, Badge } from 'antd';
import { motion } from 'framer-motion';
import { CheckCircleFilled, LockOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { FaTrophy } from 'react-icons/fa';
import PropTypes from 'prop-types';
import { formatLongDate } from '../utils/dateUtils';
import { useLanguage } from '../context/LanguageContext';
import './AchievementCard.css';

/**
 * مكون بطاقة الإنجاز
 * يعرض معلومات الإنجاز بشكل جذاب ومتحرك
 * @param {Object} props - خصائص المكون
 */
const AchievementCard = ({ 
  achievement, 
  onClick,
  showDetails = true,
  size = 'default'
}) => {
  const { t } = useLanguage();
  
  // استخراج البيانات من الإنجاز
  const { 
    id,
    title, 
    description, 
    titleKey,
    descriptionKey,
    icon, 
    type, 
    unlocked, 
    progress = 0, 
    target = 100,
    date,
    pointsAwarded = 0
  } = achievement;
  
  // استخدام مفاتيح الترجمة إذا كانت متوفرة، وإلا استخدام القيم المباشرة
  const displayTitle = titleKey && titleKey !== '' ? t(titleKey) : title;
  const displayDescription = descriptionKey && descriptionKey !== '' ? t(descriptionKey) : description;
  
  // حساب نسبة التقدم (بحد أقصى 100%)
  // تعديل خاص لإنجاز المستكشف لحساب النسبة المئوية الصحيحة
  const progressPercentage = type === 'explorer' 
    ? Math.min(100, Math.round((Math.round((progress / 100) * 8) / 8) * 100))
    : Math.min(100, Math.round((progress / target) * 100));
  
  // تحديد ألوان النوع
  const getTypeColor = (type) => {
    const colors = {
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
    
    return colors[type] || colors.other;
  };
  
  
  // حالة تحريك البطاقة
  const cardVariants = {
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
        stiffness: 300,
        damping: 20,
        delay: 0.1
      }
    },
    hover: {
      scale: 1.02,
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
      transition: { 
        type: 'spring',
        stiffness: 400,
        damping: 10
      }
    }
  };
  
  // حالة تحريك الأيقونة
  const iconVariants = {
    hidden: { scale: 0.8, rotate: -10 },
    visible: { 
      scale: 1, 
      rotate: 0,
      transition: { 
        type: 'spring',
        stiffness: 260,
        damping: 20,
        delay: 0.3
      }
    },
    hover: { 
      scale: 1.1,
      rotate: unlocked ? [0, -5, 5, -3, 3, 0] : 0,
      transition: { 
        type: 'spring',
        stiffness: 300,
        damping: 10,
        rotate: {
          type: 'tween',
          duration: 0.5,
          ease: 'easeInOut',
          repeat: 0
        }
      }
    }
  };
  
  // نوع العرض المصغر
  if (size === 'small') {
    return (
      <motion.div
        className="achievement-small-card"
        initial="hidden"
        animate="visible"
        whileHover="hover"
        variants={cardVariants}
        onClick={() => onClick && onClick(achievement)}
      >
        <Badge 
          count={unlocked ? <CheckCircleFilled style={{ color: '#52c41a' }} /> : 0} 
          offset={[-5, 5]}
        >
          <motion.div 
            className={`achievement-small-icon ${unlocked ? 'unlocked' : 'locked'}`}
            style={{ borderColor: getTypeColor(type) }}
            variants={iconVariants}
          >
            <Avatar 
              src={icon} 
              size={40}
              style={{ 
                opacity: unlocked ? 1 : 0.6,
                filter: unlocked ? 'none' : 'grayscale(0.8)'
              }}
            />
          </motion.div>
        </Badge>
        <Tooltip title={`${displayTitle}: ${displayDescription}`}>
          <div className="achievement-small-info">
            <div className="achievement-small-title">
              {displayTitle}
            </div>
            <Progress 
              percent={progressPercentage}
              size="small"
              showInfo={false}
              strokeColor={getTypeColor(type)}
            />
          </div>
        </Tooltip>
      </motion.div>
    );
  }
  
  // نوع العرض العادي
  return (
    <motion.div
      className="achievement-card-container"
      initial="hidden"
      animate="visible"
      whileHover="hover"
      variants={cardVariants}
      onClick={() => onClick && onClick(achievement)}
    >
      <Card 
        className={`achievement-card ${unlocked ? 'unlocked' : 'locked'}`}
        style={{ 
          borderColor: unlocked ? getTypeColor(type) : '#d9d9d9',
        }}
        styles={{ body: { padding: '16px' } }}
      >
        <div className="achievement-card-header">
          <motion.div 
            className="achievement-icon-container"
            variants={iconVariants}
          >
            <Avatar 
              src={icon} 
              size={64}
              className={`achievement-icon ${unlocked ? 'unlocked' : 'locked'}`}
              style={{ 
                borderColor: getTypeColor(type),
                backgroundColor: `${getTypeColor(type)}20` // إضافة شفافية
              }}
            />
            {!unlocked && (
              <div className="achievement-lock">
                <LockOutlined />
              </div>
            )}
          </motion.div>
          
          <div className="achievement-info">
            <div className="achievement-title">
              <h3>{displayTitle}</h3>
              {unlocked && pointsAwarded > 0 && (
                <Tooltip title={`${pointsAwarded} ${t('points')}`}>
                  <span className="achievement-points">
                    <FaTrophy /> {pointsAwarded}
                  </span>
                </Tooltip>
              )}
            </div>
            <div className="achievement-desc">
              {displayDescription}
            </div>
            
            {showDetails && (
              <div className="achievement-details">
                {unlocked ? (
                  <span className="achievement-date">
                    {t('achievement_obtained_on')}: {formatLongDate(date)}
                  </span>
                ) : (
                  <span className="achievement-progress-text">
                    {type === 'explorer' ? 
                      <strong>{Math.round((progress / 100) * 8)}/8 {t('achievement_sections')}</strong> : 
                      <strong>{progress} / {target}</strong>
                    }
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="achievement-footer">
          <div className="achievement-progress-container">
            <Progress 
              percent={progressPercentage} 
              status={unlocked ? "success" : "active"} 
              showInfo={false}
              strokeColor={unlocked ? getTypeColor(type) : {
                '0%': '#f5f5f5',
                '100%': getTypeColor(type)
              }}
            />
            <div className="achievement-progress-label">
              {unlocked ? (
                <Tooltip title={t('achievement_obtained')}>
                  <CheckCircleFilled style={{ color: '#52c41a' }} />
                </Tooltip>
              ) : (
                <Tooltip title={`${progressPercentage}% ${t('completed')}`}>
                  <InfoCircleOutlined />
                </Tooltip>
              )}
              {/* عرض النسبة المئوية لجميع أنواع الإنجازات للتناسق */}
              <span>
                {`${progressPercentage}%`}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

AchievementCard.propTypes = {
  achievement: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    titleKey: PropTypes.string,
    descriptionKey: PropTypes.string,
    icon: PropTypes.string,
    type: PropTypes.string.isRequired,
    unlocked: PropTypes.bool.isRequired,
    progress: PropTypes.number,
    target: PropTypes.number,
    date: PropTypes.string,
    pointsAwarded: PropTypes.number
  }).isRequired,
  onClick: PropTypes.func,
  showDetails: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'default', 'large'])
};

export default AchievementCard;