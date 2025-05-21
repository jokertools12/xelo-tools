import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Typography, Avatar } from 'antd';
import { FaTrophy } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import PropTypes from 'prop-types';
import { playAchievementSound } from '../utils/achievementSounds';
import { useLanguage } from '../context/LanguageContext';
import './AchievementNotification.css';

const { Title, Text } = Typography;

/**
 * مكون إشعار الإنجازات
 * يعرض رسالة احتفالية مع تأثيرات مرئية عند فتح إنجاز جديد
 * @param {Object} props - خصائص المكون
 */
const AchievementNotification = ({ 
  open, 
  achievement, 
  onClose,
  playSound = true
}) => {
  const { t } = useLanguage();
  const confettiCanvasRef = useRef(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [soundPlayed, setSoundPlayed] = useState(false);
  
  // استخدام مفاتيح الترجمة إذا كانت متوفرة، وإلا استخدام القيم المباشرة
  const displayTitle = achievement?.titleKey && achievement.titleKey !== '' ? 
    t(achievement.titleKey) : achievement?.title;
    
  const displayDescription = achievement?.descriptionKey && achievement.descriptionKey !== '' ? 
    t(achievement.descriptionKey) : achievement?.description;
  
  // تأثيرات الإنجاز المفتوح
  useEffect(() => {
    let timer;
    
    // تشغيل تأثيرات الاحتفال عند فتح الإشعار
    if (open) {
      // تأخير بسيط للحصول على تجربة أفضل
      timer = setTimeout(() => {
        setShowConfetti(true);
        fireConfetti();
        // تشغيل الصوت باستخدام المكتبة المحسنة عند فتح الإنجاز
        if (playSound && !soundPlayed) {
          playAchievementSound(achievement?.type || 'default');
          setSoundPlayed(true);
        }
      }, 300);
    } else {
      setShowConfetti(false);
      setSoundPlayed(false);
    }
    
    return () => {
      clearTimeout(timer);
    };
  }, [open, achievement, playSound, soundPlayed]);
  
  // دالة تشغيل تأثير الاحتفال (كونفيتي)
  const fireConfetti = () => {
    if (confettiCanvasRef.current) {
      const myConfetti = confetti.create(confettiCanvasRef.current, {
        resize: true,
        useWorker: true
      });
      
      // التأثير الأول: انفجار بألوان متعددة
      myConfetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#faad14', '#52c41a', '#1890ff', '#722ed1', '#eb2f96']
      });
      
      // التأثير الثاني: شكل قوس مطر
      setTimeout(() => {
        myConfetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#faad14', '#fa8c16', '#fa541c']
        });
        
        myConfetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#52c41a', '#13c2c2', '#1890ff']
        });
      }, 500);
    }
  };
  
  
  // حالات حركة العناصر
  const modalVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8,
      y: 20
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: { 
        type: 'spring',
        damping: 15,
        stiffness: 300
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.8,
      y: -20,
      transition: { 
        duration: 0.2
      }
    }
  };
  
  // حالات حركة الأيقونة
  const iconVariants = {
    hidden: { 
      scale: 0.5, 
      rotate: -30 
    },
    visible: { 
      scale: 1, 
      rotate: 0,
      transition: {
        type: 'spring',
        delay: 0.3,
        damping: 10,
        stiffness: 200
      }
    }
  };
  
  // حالات حركة النص
  const textVariants = {
    hidden: { 
      opacity: 0, 
      y: 20 
    },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        delay: 0.5,
        duration: 0.5
      }
    }
  };
  
  // حالات حركة النقاط
  const pointsVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.5
    },
    visible: { 
      opacity: 1, 
      scale: [1, 1.2, 1],
      transition: {
        delay: 0.8,
        duration: 0.7
      }
    }
  };
  
  return (
    <AnimatePresence>
      {open && achievement && (
        <Modal
          open={open}
          footer={null}
          closable={false}
          centered
          width={400}
          styles={{
            mask: { backdropFilter: 'blur(3px)' },
            body: { padding: 0 }
          }}
          maskClosable={false}
          wrapClassName="achievement-notification-modal"
        >
          <motion.div
            className="achievement-notification"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <canvas 
              ref={confettiCanvasRef} 
              className="confetti-canvas"
            ></canvas>
            
            <div className="achievement-notification-content">
              <motion.div 
                className="achievement-notification-icon"
                variants={iconVariants}
              >
                <div className="trophy-container">
                  <FaTrophy className="trophy-icon" />
                </div>
                <Avatar 
                  src={achievement.icon} 
                  size={80} 
                  className="achievement-avatar"
                />
              </motion.div>
              
              <motion.div 
                className="achievement-notification-text"
                variants={textVariants}
              >
                <Title level={4} className="achievement-title">
                  {displayTitle}
                </Title>
                <Text className="achievement-desc">
                  {displayDescription}
                </Text>
                
                {achievement.pointsAwarded > 0 && (
                  <motion.div 
                    className="achievement-points-awarded"
                    variants={pointsVariants}
                  >
                    <FaTrophy className="points-icon" />
                    <span>+{achievement.pointsAwarded} {t('achievement_points')}</span>
                  </motion.div>
                )}
              </motion.div>
              
              <Button 
                type="primary" 
                onClick={onClose}
                className="achievement-close-button"
              >
                {t('achievement_awesome')}
              </Button>
            </div>
            
            {showConfetti && (
              <div className="confetti-container">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="confetti-piece"
                    style={{
                      left: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 1.5}s`,
                      backgroundColor: [
                        '#faad14', '#52c41a', '#1890ff', '#722ed1', '#eb2f96'
                      ][Math.floor(Math.random() * 5)]
                    }}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </Modal>
      )}
    </AnimatePresence>
  );
};

AchievementNotification.propTypes = {
  open: PropTypes.bool.isRequired,
  achievement: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    titleKey: PropTypes.string,
    descriptionKey: PropTypes.string,
    icon: PropTypes.string,
    type: PropTypes.string,
    pointsAwarded: PropTypes.number
  }),
  onClose: PropTypes.func.isRequired,
  playSound: PropTypes.bool
};

export default AchievementNotification;