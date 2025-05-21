import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Card, 
  Tabs, 
  Form, 
  Input, 
  Button, 
  Row, 
  Col, 
  Divider, 
  Layout,
  Typography,
  Badge,
  Spin,
  Progress,
  Statistic,
  Table,
  Tag,
  Empty,
  Modal,
  Tooltip,
  Space,
  message,
  Alert,
  List,
  Avatar as AntAvatar,
  Switch,
  Select
} from 'antd';
import ActivityItem from '../components/ActivityItem';
import ContentContainer from '../components/ContentContainer';
import { formatDate, formatLongDate, formatRelativeTime } from '../utils/dateUtils';
import { 
  UserOutlined, 
  MailOutlined, 
  PhoneOutlined, 
  LockOutlined, 
  UploadOutlined,
  EditOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  IdcardOutlined,
  SafetyOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  TeamOutlined,
  TrophyOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  CrownOutlined,
  PlusOutlined, 
  MinusOutlined,
  ReloadOutlined,
  BellOutlined,
  SettingOutlined,
  CameraOutlined,
  PictureOutlined,
  GlobalOutlined,
  DollarOutlined,
  CommentOutlined,
  FileSearchOutlined,
  CreditCardOutlined,
  RollbackOutlined,
  FileTextOutlined,
  MessageOutlined
} from '@ant-design/icons';
import { 
  FaUser, 
  FaLock, 
  FaShield, 
  FaAddressCard, 
  FaHistory, 
  FaChartLine,
  FaShieldAlt,
  FaInfoCircle,
  FaCreditCard,
  FaUserCog,
  FaKey,
  FaMedal,
  FaTrophy,
  FaCog,
  FaBell,
  FaCamera
} from 'react-icons/fa';
import '../styles/UserProfile.css';

import Avatar from '../components/Avatar';
import { useUser } from '../context/UserContext';
import { useMessage } from '../context/MessageContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  getLevelColor, 
  getLevelIcon, 
  getLevelTierName, 
  getLevelProgressBar,
  getLevelBadge,
  getLevelGradient,
  levelProgressPercentage, 
  pointsForNextLevel,
  POINTS_PER_LEVEL,
  getLevelCategory
} from '../utils/levelUtils';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;

// Default achievement icons
const defaultAchievementIcons = {
  login: 'https://cdn-icons-png.flaticon.com/512/2997/2997017.png',
  profile: 'https://cdn-icons-png.flaticon.com/512/3093/3093684.png',
  level: 'https://cdn-icons-png.flaticon.com/512/3600/3600912.png',
  points: 'https://cdn-icons-png.flaticon.com/512/2942/2942294.png',
  posts: 'https://cdn-icons-png.flaticon.com/512/6295/6295417.png',
  comments: 'https://cdn-icons-png.flaticon.com/512/5481/5481423.png',
  default: 'https://cdn-icons-png.flaticon.com/512/3176/3176341.png'
};

const UserProfile = () => {
  // Use context hooks
  const { messageApi, showSuccess, showError, showLoading, updateMessage } = useMessage();
  
  // Use language context
  const { languages, currentLanguage, changeLanguage, t } = useLanguage();
  
  // States
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [settingsForm] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [passwordStrength, setPasswordStrength] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [achievements, setAchievements] = useState([]);
  const [activities, setActivities] = useState([]);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState('https://images.unsplash.com/photo-1557682250-33bd709cbe85?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80');
  const [activeTab, setActiveTab] = useState('1');
  const [userSettings, setUserSettings] = useState(null);
  const [loadingAchievements, setLoadingAchievements] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  
  const { user, updateUserAvatar, updateUserProfile, updateUserStats, refreshUserFromServer } = useUser();

  // Refs for HTML elements
  const fileInputRef = useRef(null);
  const coverFileInputRef = useRef(null);
  const avatarContainerRef = useRef(null);
  const modalRef = useRef(null);
  
  // Fetch user data function - simplified and efficient
  const fetchUserData = async () => {
    try {
      const response = await axios.get('/api/users/profile');
      if (response.data) {
        // Save data
        const userData = response.data;
        
        // Check for last login time from server
        if (userData.lastLogin) {
          // If no previousLogin value from server, use lastLogin as previous login value
          // This ensures using the actual login time stored on the server
          if (!userData.previousLogin) {
            userData.previousLogin = userData.lastLogin;
          }
        } else {
          // Set current login time
          userData.lastLogin = new Date().toISOString();
          
          // Try to find last login time from user activities
          try {
            const activitiesResponse = await axios.get('/api/users/activities?type=login&limit=2');
            if (activitiesResponse.data && Array.isArray(activitiesResponse.data) && activitiesResponse.data.length > 1) {
              // Use second latest login activity (login before current)
              userData.previousLogin = activitiesResponse.data[1].date;
              console.log('Found previous login activity:', new Date(userData.previousLogin).toLocaleString());
            } else {
              // If no previous login activity found, use default value
              const prevLoginDate = new Date();
              prevLoginDate.setDate(prevLoginDate.getDate() - 1); // One day ago as reasonable default
              userData.previousLogin = prevLoginDate.toISOString();
            }
          } catch (error) {
            console.error('Failed to fetch login activities:', error);
            // In case of failure, use one day ago as default value
            const prevLoginDate = new Date();
            prevLoginDate.setDate(prevLoginDate.getDate() - 1);
            userData.previousLogin = prevLoginDate.toISOString();
          }
        }
        
        setUserData(userData);
        setAvatarUrl(userData.avatar || '');
        
        // Save values for direct use in fields without attempting to modify the form directly
        setFormValues({
          name: userData.name || '',
          username: userData.username || '',
          email: userData.email || '',
          phone: userData.phone || '',
          address: userData.address || '',
          bio: userData.bio || '',
        });
      }
    } catch (error) {
      showError(t('failed_load_user_data'));
    }
  };

  // Load user data when component mounts
  useEffect(() => {
    const controller = new AbortController();
    
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load user data first
        await fetchUserData();
        
        // Load other data
        Promise.all([
          fetchTransactions(),
          fetchUserSettings(),
          fetchAchievements(),
          fetchActivities()
        ]).catch(err => {
          // Ignore additional data errors
        });
        
      } catch (error) {
        showError(t('failed_load_profile_data'));
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
    
    // Clean up resources when component unmounts
    return () => {
      controller.abort();
    };
  }, [user?.id]);

  // Function to open file selection dialog
  const openFileSelector = (e) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  // Function to open cover photo selection dialog
  const openCoverFileSelector = (e) => {
    e.stopPropagation();
    coverFileInputRef.current?.click();
  };
  
  // Function to fetch user achievements
  const fetchAchievements = async () => {
    try {
      setLoadingAchievements(true);
      
      // Fetch achievements from API
      const response = await axios.get('/api/users/achievements');
      
      // Process data for display
      if (response.data && Array.isArray(response.data)) {
        // Add default icons for achievements that don't have icons
        const formattedAchievements = response.data.map(achievement => ({
          ...achievement,
          icon: achievement.icon || defaultAchievementIcons[achievement.type] || defaultAchievementIcons.default
        }));
        
        setAchievements(formattedAchievements);
        
        // Removed automatic achievement view activity logging
      } else if (response.data) {
        setAchievements([]);
      }
    } catch (error) {
      showError(t('failed_load_achievements'));
      setAchievements([]);
    } finally {
      setLoadingAchievements(false);
    }
  };
  
  // Function to fetch user activities
  const fetchActivities = async () => {
    try {
      setLoadingActivities(true);
      
      // Fetch activities from API sorted by date (newest first) - increase limit to get more activities
      const response = await axios.get('/api/users/activities?limit=50&sort=date:desc');
      
      if (response.data && Array.isArray(response.data)) {
        // Normalize and enhance activity data
        const normalizedActivities = response.data.map(activity => {
          // Create a copy of the activity to avoid modifying the original
          const enhancedActivity = { ...activity };
          
          // Determine activity type more accurately
          if (!enhancedActivity.type && enhancedActivity.actionType) {
            enhancedActivity.type = enhancedActivity.actionType;
          }
          
          // Handle subscription and membership activities
          if (enhancedActivity.details) {
            // If activity has details about subscriptions, mark it as subscription type
            if (enhancedActivity.details.action === 'new_subscription' || 
                enhancedActivity.details.action === 'cancel_subscription' ||
                enhancedActivity.details.planId || 
                enhancedActivity.details.planName ||
                enhancedActivity.details.subscriptionId) {
              enhancedActivity.type = 'subscription';
              
              // Add operation info if missing
              if (!enhancedActivity.details.operation && enhancedActivity.details.action) {
                enhancedActivity.details.operation = enhancedActivity.details.action;
              }
            }
            
            // If activity has points details, mark it as points type
            if (enhancedActivity.details.points !== undefined || 
                enhancedActivity.details.pointsAwarded !== undefined) {
              enhancedActivity.type = 'points';
            }
            
            // If this is a payment activity
            if (enhancedActivity.details.type === 'wallet_payment' || 
                enhancedActivity.details.type === 'payment' ||
                enhancedActivity.module === 'payment') {
              enhancedActivity.type = 'payment';
            }
            
            // If this is a refund activity
            if (enhancedActivity.details.operation === 'refund' || 
                enhancedActivity.details.type === 'refund') {
              enhancedActivity.type = 'refund';
            }
            
            // If this is a wallet deposit activity
            if (enhancedActivity.details.type === 'wallet_deposit') {
              enhancedActivity.type = 'wallet_deposit';
            }
            
            // For extraction activities
            if (enhancedActivity.actionType === 'extraction') {
              enhancedActivity.type = 'extraction';
            }
            
            // For message activities
            if (enhancedActivity.actionType === 'message') {
              enhancedActivity.type = 'message';
            }
            
            // For post activities
            if (enhancedActivity.actionType === 'post') {
              enhancedActivity.type = 'post';
            }
            
            // For comment activities
            if (enhancedActivity.actionType === 'comment') {
              enhancedActivity.type = 'comment';
            }
            
            // For reaction activities
            if (enhancedActivity.actionType === 'reaction') {
              enhancedActivity.type = 'reaction';
            }
          }
          
          // Ensure we have a type for all activities
          if (!enhancedActivity.type) {
            if (enhancedActivity.actionType) {
              enhancedActivity.type = enhancedActivity.actionType;
            } else if (enhancedActivity.module) {
              enhancedActivity.type = enhancedActivity.module;
            } else {
              enhancedActivity.type = 'other';
            }
          }
          
          // Make sure the activity has a date
          if (!enhancedActivity.date && enhancedActivity.createdAt) {
            enhancedActivity.date = enhancedActivity.createdAt;
          } else if (!enhancedActivity.date) {
            enhancedActivity.date = new Date().toISOString();
          }
          
          return enhancedActivity;
        });
        
        setActivities(normalizedActivities);
      } else if (response.data) {
        setActivities([]);
      }
    } catch (error) {
      showError(t('failed_load_activities'));
      setActivities([]);
    } finally {
      setLoadingActivities(false);
    }
  };
  
  // Function to fetch user settings
  const fetchUserSettings = async () => {
    try {
      setLoadingSettings(true);
      
      // Fetch settings from API
      const response = await axios.get('/api/users/settings');
      
      if (response.data) {
        // Store data in state only without directly modifying the form
        const settings = response.data;
        setUserSettings({
          ...settings,
          formValues: {
            emailNotifications: settings.notifications?.email || false,
            securityAlerts: settings.notifications?.security || true,
            activityUpdates: settings.notifications?.activity || false,
            marketingEmails: settings.notifications?.marketing || false,
            profileVisibility: settings.privacy?.profileVisibility || true,
            activityVisibility: settings.privacy?.activityVisibility || false,
            language: settings.language || currentLanguage
          }
        });
      } else {
        // If no settings found, use default values
        const defaultSettings = {
          notifications: {
            email: true,
            security: true,
            activity: false,
            marketing: false
          },
          privacy: {
            profileVisibility: true,
            activityVisibility: false
          },
          theme: 'light',
          language: currentLanguage
        };
        
        // Send default settings to server
        await axios.post('/api/users/settings', defaultSettings).catch(() => {});
        
        // Store default data in state
        setUserSettings({
          ...defaultSettings,
          formValues: {
            emailNotifications: true,
            securityAlerts: true,
            activityUpdates: false,
            marketingEmails: false,
            profileVisibility: true,
            activityVisibility: false,
            language: currentLanguage
          }
        });
      }
    } catch (error) {
      showError(t('failed_load_settings'));
      
      // Use default values in case of error
      const defaultSettings = {
        notifications: {
          email: true,
          security: true,
          activity: false,
          marketing: false
        },
        privacy: {
          profileVisibility: true,
          activityVisibility: false
        },
        language: currentLanguage
      };
      
      setUserSettings({
        ...defaultSettings,
        formValues: {
          emailNotifications: true,
          securityAlerts: true,
          activityUpdates: false,
          marketingEmails: false,
          profileVisibility: true,
          activityVisibility: false,
          language: currentLanguage
        }
      });
    } finally {
      setLoadingSettings(false);
    }
  };

  // Function to add a new activity
  const addNewActivity = async (title, description, type) => {
    try {
      // Add activity locally for immediate display
      const localActivity = {
        id: `local-${Date.now()}`,
        title,
        description,
        date: new Date().toISOString(),
        type
      };
      
      // Update local list immediately
      setActivities(prev => [localActivity, ...prev]);
      
      // Log activity in database
      const response = await axios.post('/api/users/activities', {
        title,
        description,
        type
      });
      
      if (response.data && response.data._id) {
        // Replace local activity with the one retrieved from database
        setActivities(prev => 
          prev.map(activity => 
            activity.id === localActivity.id ? { ...response.data, id: response.data._id } : activity
          )
        );
        
        // Check for new achievements after logging the activity
        if (type === 'profile' || type === 'points') {
          checkForNewAchievements();
        }
      }
    } catch (error) {
      // Ignore errors in activity logging to improve user experience
    }
  };

  // Function to fetch transactions
  const fetchTransactions = async () => {
    try {
      const key = 'transactions';
      showLoading(t('loading_transactions'), key);
      
      const response = await axios.get('/api/users/transactions');
      if (response.data && Array.isArray(response.data)) {
        setTransactions(response.data);
        updateMessage('success', t('transactions_loaded'), key);
      } else {
        setTransactions([]);
        updateMessage('info', t('no_transactions'), key);
      }
    } catch (error) {
      showError(t('failed_load_transactions'));
      setTransactions([]);
    }
  };

  // Enhanced handleFileChange function for avatar processing
  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file size (maximum 2 MB)
      if (file.size > 2 * 1024 * 1024) {
        showError(t('file_too_large'));
        e.target.value = '';
        return;
      }
      
      // Check file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        showError(t('file_type_unsupported'));
        e.target.value = '';
        return;
      }
      
      try {
        setUploading(true);
        
        // Create FormData and add the image
        const formData = new FormData();
        formData.append('avatar', file);
        
        // Show progress bar during upload
        const key = 'uploadProgress';
        showLoading(t('uploading_image'), key);
        
        // Upload image with progress display
        const response = await axios.post('/api/users/upload-avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            updateMessage('loading', t('uploading_progress', { percent: percentCompleted }), key);
          }
        });
        
        if (response.data && response.data.url) {
          updateMessage('success', t('image_uploaded'), key);
          
          // Update UI and context
          setAvatarUrl(response.data.url);
          updateUserAvatar(response.data.url);
          setIsModalVisible(false);
          
          // Add new activity for avatar change
          addNewActivity(t('avatar_change'), t('avatar_change_success'), 'profile');
        }
      } catch (error) {
        showError(t('failed_upload_image'));
      } finally {
        setUploading(false);
        e.target.value = '';
      }
    }
  };

  // Function to handle cover photo change
  const handleCoverFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file size (maximum 5 MB)
      if (file.size > 5 * 1024 * 1024) {
        showError(t('cover_file_too_large'));
        e.target.value = '';
        return;
      }
      
      // Check file type
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        showError(t('cover_file_type_unsupported'));
        e.target.value = '';
        return;
      }
      
      try {
        setUploading(true);
        
        // Simulate image upload process (in real environment would be replaced with API request)
        const key = 'uploadCoverProgress';
        showLoading(t('uploading_cover'), key);
        
        // Simulate delay for display
        setTimeout(() => {
          // Convert image to URL
          const reader = new FileReader();
          reader.onloadend = () => {
            setCoverPhotoUrl(reader.result);
            updateMessage('success', t('cover_uploaded'), key);
            
            // Add new activity for cover photo change
            addNewActivity(t('cover_change'), t('cover_change_success'), 'profile');
            
            setUploading(false);
          };
          reader.readAsDataURL(file);
        }, 1500);
        
      } catch (error) {
        showError(t('failed_upload_cover'));
        setUploading(false);
      } finally {
        e.target.value = '';
      }
    }
  };

  // Function to submit personal information form
  const handleProfileSubmit = async (values) => {
    try {
      setLoading(true);
      const response = await axios.put('/api/users/profile', values);
      showSuccess(t('profile_updated'));
      
      // Update profile data
      updateUserProfile(values);
      
      // Add new activity
      addNewActivity(t('profile_update'), t('profile_update_success'), 'profile');
      
      await fetchUserData(); // Reload updated data
    } catch (error) {
      showError(t('failed_update_profile'));
    } finally {
      setLoading(false);
    }
  };

  // Function to submit password change form
  const handlePasswordSubmit = async (values) => {
    try {
      setLoading(true);
      
      if (values.newPassword !== values.confirmPassword) {
        showError(t('passwords_not_match'));
        return;
      }
      
      const response = await axios.put('/api/users/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      });
      
      showSuccess(t('password_changed'));
      passwordForm.resetFields();
      setPasswordStrength('');
      
      // Add new activity
      addNewActivity(t('password_change'), t('password_change_success'), 'security');
      
    } catch (error) {
      showError(t('failed_change_password'));
    } finally {
      setLoading(false);
    }
  };

  // Function to submit settings form
  const handleSettingsSubmit = async (values) => {
    try {
      setLoading(true);
      
      // Convert values to format required for API
      const settingsData = {
        notifications: {
          email: values.emailNotifications || false,
          security: values.securityAlerts || false,
          activity: values.activityUpdates || false,
          marketing: values.marketingEmails || false
        },
        privacy: {
          profileVisibility: values.profileVisibility || false,
          activityVisibility: values.activityVisibility || false
        },
        language: values.language || currentLanguage
      };
      
      // Send updated settings to server
      const response = await axios.put('/api/users/settings', settingsData);
      
      if (response.data) {
        showSuccess(t('settings_updated'));
        setUserSettings(response.data);
        
        // Update language if changed
        if (values.language && values.language !== currentLanguage) {
          await changeLanguage(values.language);
        }
        
        // Add new activity
        addNewActivity(t('settings_update'), t('settings_update_success'), 'settings');
      } else {
        showError(t('error_updating_settings'));
      }
    } catch (error) {
      showError(t('failed_update_settings'));
    } finally {
      setLoading(false);
    }
  };

  // Function to update statistics
  const handleUpdateStats = async (type, value) => {
    try {
      // Update UI immediately for quick response
      setUserData(prev => {
        const currentValue = prev[type] || 0;
        const newValue = Math.max(0, currentValue + value); // Prevent negative values
        return { ...prev, [type]: newValue };
      });
      
      const key = 'updating';
      showLoading(t('updating_data'), key);
      
      const response = await axios.put('/api/users/stats', {
        type,
        value
      });
      
      if (response.data) {
        updateMessage('success', t('stats_updated'), key);
        
        // Update statistics in context
        updateUserStats({ [type]: response.data[type] });
        
        // Update displayed data
        setUserData(prev => ({
          ...prev,
          [type]: response.data[type]
        }));
        
        // Add new activity
        addNewActivity(t('stats_update'), t(type === 'points' ? 'points_update_success' : 'level_update_success'), 'points');
        
        // Check for new achievements
        checkForNewAchievements();
      }
    } catch (error) {
      showError(t('failed_update_stats'));
      await fetchUserData(); // Reload data in case of error
    }
  };

  // Function to check for new achievements
  const checkForNewAchievements = async () => {
    try {
      // API request to check for new achievements
      const response = await axios.post('/api/users/check-achievements');
      
      if (response.data && response.data.newAchievements && response.data.newAchievements.length > 0) {
        // Show notifications for new achievements
        response.data.newAchievements.forEach(achievement => {
          message.success({
            content: (
              <div>
                <FaTrophy style={{ color: '#faad14', marginLeft: '8px' }} />
                {t('new_achievement_unlocked', { title: achievement.title })}
              </div>
            ),
            duration: 5,
          });
        });
        
        // Reload achievements
        fetchAchievements();
      }
    } catch (error) {
      // Ignore error to improve user experience
    }
  };

  // Function to check password strength
  const checkPasswordStrength = (password) => {
    if (!password) {
      setPasswordStrength('');
      return;
    }
    
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const isLongEnough = password.length >= 8;
    
    const strength = (hasUpper + hasLower + hasNumber + hasSpecial + isLongEnough);
    
    if (strength <= 2) {
      setPasswordStrength('weak');
    } else if (strength <= 4) {
      setPasswordStrength('medium');
    } else {
      setPasswordStrength('strong');
    }
  };

  // Function to open avatar change dialog
  const showModal = () => {
    setIsModalVisible(true);
  };

  // Function to close dialog
  const handleCancel = () => {
    setIsModalVisible(false);
  };

  // Helper function to get icon for activity display
  const getActivityTypeIcon = (type) => {
    switch (type) {
      case 'subscription':
        return <CheckCircleOutlined style={{ color: '#1890ff' }} />;
      case 'cancel_subscription':
        return <CloseCircleOutlined style={{ color: '#f5222d' }} />;
      case 'payment':
        return <DollarOutlined style={{ color: '#722ed1' }} />;
      case 'refund':
        return <RollbackOutlined style={{ color: '#52c41a' }} />;
      case 'wallet_deposit':
        return <CreditCardOutlined style={{ color: '#52c41a' }} />;
      case 'wallet_payment':
        return <CreditCardOutlined style={{ color: '#f5222d' }} />;
      case 'extraction':
        return <FileSearchOutlined style={{ color: '#722ed1' }} />;
      case 'post':
        return <FileTextOutlined style={{ color: '#13c2c2' }} />;
      case 'comment':
      case 'reaction':
        return <CommentOutlined style={{ color: '#fa8c16' }} />;
      case 'message':
        return <MessageOutlined style={{ color: '#1890ff' }} />;
      case 'points':
        return <TrophyOutlined style={{ color: '#faad14' }} />;
      case 'login':
        return <UserOutlined style={{ color: '#1890ff' }} />;
      case 'profile':
        return <EditOutlined style={{ color: '#52c41a' }} />;
      case 'security':
        return <SafetyOutlined style={{ color: '#722ed1' }} />;
      case 'settings':
        return <SettingOutlined style={{ color: '#13c2c2' }} />;
      case 'achievement':
        return <TrophyOutlined style={{ color: '#eb2f96' }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#8c8c8c' }} />;
    }
  };

  // Enhanced transaction table columns
  const columns = [
    {
      title: t('date'),
      dataIndex: 'createdAt',
      key: 'date',
      render: (date, record) => {
        // Use createdAt as primary date, fall back to date field if createdAt is not available
        const transactionDate = date || record.date || '';
        return formatLongDate(transactionDate);
      }
    },
    {
      title: t('type'),
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        let color = 'blue';
        let text = t('undefined');
        let icon = null;
        
        switch(type) {
          case 'recharge':
            color = 'green';
            text = t('recharge');
            icon = <PlusOutlined />;
            break;
          case 'purchase':
            color = 'orange';
            text = t('purchase');
            icon = <FaCreditCard style={{ fontSize: '12px' }} />;
            break;
          case 'refund':
            color = 'cyan';
            text = t('refund');
            icon = <ReloadOutlined />;
            break;
          case 'admin':
            color = 'purple';
            text = t('admin_addition');
            icon = <CrownOutlined />;
            break;
          case 'subscription':
            color = 'geekblue';
            text = t('subscription');
            icon = <CheckCircleOutlined />;
            break;
          case 'points_award':
            color = 'gold';
            text = t('points_award');
            icon = <TrophyOutlined style={{ fontSize: '14px' }} />;
            break;
          case 'wallet_payment':
            color = 'blue';
            text = t('wallet_payment');
            icon = <FaCreditCard style={{ fontSize: '12px' }} />;
            break;
          case 'wallet_deposit':
            color = 'green';
            text = t('wallet_deposit');
            icon = <PlusOutlined />;
            break;
          case 'achievement':
            color = 'gold';
            text = t('achievement_unlock');
            icon = <TrophyOutlined style={{ fontSize: '14px' }} />;
            break;
          case 'points_purchase':
            color = 'green';
            text = t('points_purchase');
            icon = <PlusOutlined />;
            break;
          case 'other':
            color = 'gray';
            text = t('other');
            icon = <InfoCircleOutlined />;
            break;
        }
        
        return (
          <Tag color={color} className="status-tag">
            {icon} {text}
          </Tag>
        );
      }
    },
    {
      title: t('amount'),
      dataIndex: 'amount',
      key: 'amount',
      render: (amount, record) => {
        // Determine if this is a points transaction or a money transaction
        const isPointsTransaction = 
          record.type === 'points_award' || 
          record.type === 'achievement' || 
          record.type === 'points_purchase' ||
          record.description?.includes('نقاط') || 
          record.description?.includes('مكافأة') ||
          record.description?.includes('points');
        
        // Determine if amount should be displayed as positive or negative based on isDebit flag first
        let isPositive;
        
        if (record.isDebit !== undefined) {
          // If isDebit is explicitly defined, use it directly (false means it's a credit/positive)
          isPositive = !record.isDebit;
        } else {
          // Otherwise, fall back to type-based detection
          isPositive = ['recharge', 'refund', 'admin', 'achievement', 'points_award', 'wallet_deposit'].includes(record.type);
        }
        
        // Ensure amount is always displayed as a positive number
        const displayAmount = Math.abs(amount || 0);
        
        // Determine the CSS class and prefix
        const cssClass = isPositive ? 'amount-positive' : 'amount-negative';
        const prefix = isPositive ? '+' : '-';
        
        // Determine the unit based on transaction type
        const unit = isPointsTransaction ? t('points') : t('currency_symbol');
        
        return (
          <span className={cssClass}>
            {prefix} {displayAmount} {unit}
          </span>
        );
      }
    },
    {
      title: t('status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = '';
        let text = '';
        let icon = null;

        switch (status) {
          case 'completed':
            color = 'status-success';
            text = t('completed');
            icon = <CheckCircleOutlined />;
            break;
          case 'pending':
            color = 'status-processing';
            text = t('processing');
            icon = <ClockCircleOutlined />;
            break;
          case 'failed':
            color = 'status-error';
            text = t('failed');
            icon = <WarningOutlined />;
            break;
          case 'refunded':
            color = 'status-warning';
            text = t('refunded');
            icon = <InfoCircleOutlined />;
            break;
          default:
            color = 'status-warning';
            text = t('unknown');
            icon = <InfoCircleOutlined />;
        }

        return (
          <span className={`status-tag ${color}`}>
            {icon} {text}
          </span>
        );
      }
    },
    {
      title: t('description'),
      dataIndex: 'description',
      key: 'description',
      render: (description) => {
        return <span className="transaction-description">{description}</span>;
      }
    }
  ];

  // Unified loading state for the whole page
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <ContentContainer>
      {!userData ? (
        <div className="empty-data-container">
          <Empty 
            description={t('no_user_data')}
            image={Empty.PRESENTED_IMAGE_SIMPLE} 
          />
          <Button 
            type="primary" 
            onClick={fetchUserData}
            icon={<ReloadOutlined />}
            style={{ marginTop: 20 }}
          >
            {t('retry')}
          </Button>
        </div>
      ) : (
        <Layout className="profile-page-layout">
          <Content className="profile-page-content">
            <div className="profile-container">
          

          {/* Cover card and avatar */}
          <div className="cover-card">
            <div className="cover-photo-wrapper">
              <div 
                className="cover-photo" 
                style={{ backgroundImage: `url(${coverPhotoUrl})` }}
              />
              <div className="cover-overlay">
                <Button 
                  type="primary" 
                  icon={<FaCamera />} 
                  onClick={openCoverFileSelector}
                  className="cover-upload-btn"
                >
                  {t('change_cover')}
                </Button>
              </div>
            </div>
            
            <div className="profile-header-content">
              <div className="avatar-wrapper">
                <div className="avatar-container" onClick={showModal}>
                  <Avatar 
                    size={120} 
                    src={avatarUrl}
                    className="profile-avatar"
                  />
                  <div className="avatar-edit-overlay">
                    <EditOutlined className="avatar-edit-icon" />
                  </div>
                </div>
              </div>
              
              <div className="user-info-header">
                <h2>{userData?.name}</h2>
              </div>
            </div>
            
            <div className="user-detailed-info">
              <div className="user-subtitle">
                <span>
                  <MailOutlined style={{ marginLeft: '6px' }} /> {userData?.email}
                </span>
                <span>
                  <IdcardOutlined style={{ marginLeft: '6px' }} /> {userData?.username}
                </span>
                {userData?.isAdmin && (
                  <Badge 
                    status="success" 
                    text={t('admin')}
                    className="admin-badge"
                  />
                )}
              </div>
              





              <div className="user-activity">
                <Button 
                  type="primary" 
                  onClick={() => setActiveTab('1')}
                  icon={<EditOutlined />}
                  size="small"
                >
                  {t('edit_profile')}
                </Button>
                
                <Button 
                  onClick={() => setActiveTab('4')}
                  icon={<FaTrophy style={{ marginLeft: '5px' }} />}
                  size="small"
                  style={{ marginRight: '8px' }}
                >
                  {t('achievements')} ({achievements.filter(a => a.unlocked).length})
                </Button>
                
                {/* Add stylish level badge */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '4px 12px',
                  borderRadius: '15px',
                  background: getLevelGradient(userData?.level || 1).background,
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
                  marginRight: '8px'
                }}>
                  {getLevelIcon(userData?.level || 1, { style: { marginRight: '5px' } })}
                  <span>{t('level')} {userData?.level || 1} • {getLevelTierName(userData?.level || 1)}</span>
                </div>
              </div>
            </div>
            
            <div className="profile-quick-stats">
              <Row gutter={[16, 16]}>
                <Col xs={12} sm={6}>
                  <Statistic 
                    title={
                      <Text strong style={{ fontSize: '14px', color: '#1890ff' }}>
                        <CrownOutlined style={{ marginLeft: '5px' }} />
                        {t('points')}
                      </Text>
                    } 
                    value={userData?.points || 0} 
                    suffix={t('points_suffix')}
                    valueStyle={{ 
                      color: '#1890ff',
                      fontSize: '20px'
                    }}
                  />
                  <div style={{ 
                    height: '4px', 
                    background: 'rgba(24, 144, 255, 0.2)', 
                    borderRadius: '2px',
                    overflow: 'hidden',
                    marginTop: '8px'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, (userData?.points || 0) / 10)}%`,
                      background: 'linear-gradient(90deg, #1890ff, #096dd9)',
                      borderRadius: '2px'
                    }}></div>
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic 
                    title={
                      <Text strong style={{ fontSize: '14px', color: getLevelColor(userData?.level || 1) }}>
                        {getLevelIcon(userData?.level || 1, { style: { marginLeft: '5px' } })}
                        {t('level')}
                      </Text>
                    } 
                    value={userData?.level || 1} 
                    suffix={getLevelTierName(userData?.level || 1)} 
                    valueStyle={{ 
                      color: getLevelColor(userData?.level || 1),
                      fontSize: '20px'
                    }}
                  />
                  <div style={{ 
                    height: '4px', 
                    background: 'rgba(82, 196, 26, 0.2)', 
                    borderRadius: '2px',
                    overflow: 'hidden',
                    marginTop: '8px'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${levelProgressPercentage(userData?.allPoints || 0)}%`,
                      background: getLevelGradient(userData?.level || 1).background,
                      borderRadius: '2px'
                    }}></div>
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic 
                    title={
                      <Text strong style={{ fontSize: '14px', color: '#666' }}>
                        <CalendarOutlined style={{ marginLeft: '5px' }} />
                        {t('join_date')}
                      </Text>
                    } 
                    value={userData?.createdAt ? formatLongDate(userData.createdAt) : '-'}
                    valueStyle={{ fontSize: '16px' }}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic 
                    title={
                      <Text strong style={{ fontSize: '14px', color: '#666' }}>
                        <ClockCircleOutlined style={{ marginLeft: '5px' }} />
                        {t('last_login')}
                      </Text>
                    } 
                    value={userData?.previousLogin ? formatRelativeTime(userData.previousLogin) : '-'} 
                    valueStyle={{ 
                      fontSize: '16px', 
                      direction: 'rtl', 
                      textAlign: 'right',
                      unicodeBidi: 'bidi-override',
                      display: 'inline-block',
                      width: '100%'
                    }}
                  />
                </Col>
              </Row>
            </div>
          </div>

          {/* Tabs card */}
          <Card className="profile-tabs-card" style={{ marginTop: '24px' }}>
            <Tabs 
              activeKey={activeTab}
              onChange={setActiveTab}
              className="profile-tabs"
              items={[
                {
                  key: "1",
                  label: (
                    <span className="tab-title">
                      <FaUser className="tab-icon" />
                      <span className="tab-text">{t('personal_info')}</span>
                    </span>
                  ),
                  children: (
                    <div className="tab-content-container">
                      <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleProfileSubmit}
                        className="profile-form"
                        initialValues={formValues}
                      >
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item
                              name="name"
                              label={t('full_name')}
                              rules={[{ required: true, message: t('name_required') }]}
                              className="form-item"
                            >
                              <div className="custom-search-wrapper">
                                <div className="search-icon-container">
                                  <UserOutlined className="search-icon" />
                                </div>
                                  <Input
                                    className="custom-search-input"
                                    placeholder={t('enter_full_name')}
                                    value={formValues.name}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      form.setFieldValue('name', value);
                                      setFormValues(prev => ({ ...prev, name: value }));
                                    }}
                                  />
                              </div>
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item
                              name="username"
                              label={t('username')}
                              rules={[{ required: true, message: t('username_required') }]}
                              className="form-item"
                            >
                              <div className="custom-search-wrapper">
                                <div className="search-icon-container">
                                  <IdcardOutlined className="search-icon" />
                                </div>
                                  <Input
                                    className="custom-search-input"
                                    placeholder={t('username')}
                                    value={formValues.username}
                                    disabled
                                  />
                              </div>
                            </Form.Item>
                          </Col>
                        </Row>
                        
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item
                              name="email"
                              label={t('email')}
                              rules={[
                                { required: true, message: t('email_required') },
                                { type: 'email', message: t('valid_email_required') }
                              ]}
                              className="form-item"
                            >
                              <div className="custom-search-wrapper">
                                <div className="search-icon-container">
                                  <MailOutlined className="search-icon" />
                                </div>
                                  <Input
                                    className="custom-search-input"
                                    placeholder={t('enter_email')}
                                    value={formValues.email}
                                    disabled
                                  />
                              </div>
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item
                              name="phone"
                              label={t('phone')}
                              rules={[{ required: true, message: t('phone_required') }]}
                              className="form-item"
                            >
                              <div className="custom-search-wrapper">
                                <div className="search-icon-container">
                                  <PhoneOutlined className="search-icon" />
                                </div>
                                  <Input
                                    className="custom-search-input"
                                    placeholder={t('enter_phone')}
                                    value={formValues.phone}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      form.setFieldValue('phone', value);
                                      setFormValues(prev => ({ ...prev, phone: value }));
                                    }}
                                  />
                              </div>
                            </Form.Item>
                          </Col>
                        </Row>

                        <Form.Item
                          name="address"
                          label={t('address')}
                          className="form-item"
                        >
                          <div className="custom-search-wrapper">
                            <div className="search-icon-container">
                              <EnvironmentOutlined className="search-icon" />
                            </div>
                              <Input
                                className="custom-search-input"
                                placeholder={t('enter_address')}
                                value={formValues.address}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  form.setFieldValue('address', value);
                                  setFormValues(prev => ({ ...prev, address: value }));
                                }}
                              />
                          </div>
                        </Form.Item>
                        
                        <Form.Item
                          name="bio"
                          label={t('bio')}
                          className="form-item-full"
                        >
                            <Input.TextArea
                              placeholder={t('enter_bio')}
                              rows={4}
                              className="styled-textarea search-field"
                              value={formValues.bio}
                              onChange={(e) => {
                                const value = e.target.value;
                                form.setFieldValue('bio', value);
                                setFormValues(prev => ({ ...prev, bio: value }));
                              }}
                            />
                        </Form.Item>
                        
                        <Form.Item className="form-submit">
                          <Button
                            type="primary"
                            htmlType="submit"
                            className="submit-button"
                            icon={<FaUserCog style={{ marginLeft: '8px' }} />}
                            loading={loading}
                          >
                            {t('update_personal_info')}
                          </Button>
                        </Form.Item>
                      </Form>
                    </div>
                  )
                },
                {
                  key: "2",
                  label: (
                    <span className="tab-title">
                      <FaShieldAlt className="tab-icon" />
                      <span className="tab-text">{t('security')}</span>
                    </span>
                  ),
                  children: (
                    <div className="tab-content-container">
                      <div className="security-card">
                        <div className="security-card-content">
                          <FaLock className="security-icon" />
                          <div className="security-info">
                            <Title level={4} className="security-title">{t('change_password')}</Title>
                            <Text className="security-description">
                              {t('password_security_tip')}
                            </Text>
                          </div>
                        </div>
                      </div>
                      
                      <Form
                        form={passwordForm}
                        layout="vertical"
                        onFinish={handlePasswordSubmit}
                      >
                        <Form.Item
                          name="currentPassword"
                          label={t('current_password')}
                          rules={[{ required: true, message: t('current_password_required') }]}
                          className="form-item"
                        >
                          <div className="custom-search-wrapper">
                            <div className="search-icon-container">
                              <LockOutlined className="search-icon" />
                            </div>
                            <Input.Password
                              placeholder={t('enter_current_password')}
                              className="custom-search-input"
                            />
                          </div>
                        </Form.Item>
                        
                        <Form.Item
                          name="newPassword"
                          label={t('new_password')}
                          rules={[
                            { required: true, message: t('new_password_required') },
                            { min: 8, message: t('password_min_length') }
                          ]}
                          className="form-item"
                        >
                          <div className="password-input-container">
                            <div className="custom-search-wrapper">
                              <div className="search-icon-container">
                                <FaKey className="search-icon" />
                              </div>
                              <Input.Password
                                placeholder={t('enter_new_password')}
                                className="custom-search-input"
                                onChange={(e) => checkPasswordStrength(e.target.value)}
                              />
                            </div>
                            {passwordStrength && (
                              <>
                                <div className="password-strength-indicator">
                                  <div className={`password-strength-bar strength-${passwordStrength}`}></div>
                                </div>
                                <Text className={`strength-text ${passwordStrength}-text`}>
                                  {passwordStrength === 'weak' && t('weak_password')}
                                  {passwordStrength === 'medium' && t('medium_password')}
                                  {passwordStrength === 'strong' && t('strong_password')}
                                </Text>
                              </>
                            )}
                          </div>
                        </Form.Item>
                        
                        <Form.Item
                          name="confirmPassword"
                          label={t('confirm_password')}
                          rules={[
                            { required: true, message: t('confirm_password_required') },
                            ({ getFieldValue }) => ({
                              validator(_, value) {
                                if (!value || getFieldValue('newPassword') === value) {
                                  return Promise.resolve();
                                }
                                return Promise.reject(new Error(t('passwords_not_match')));
                              },
                            })
                          ]}
                          className="form-item"
                        >
                          <div className="custom-search-wrapper">
                            <div className="search-icon-container">
                              <LockOutlined className="search-icon" />
                            </div>
                            <Input.Password
                              placeholder={t('confirm_new_password')}
                              className="custom-search-input"
                            />
                          </div>
                        </Form.Item>
                        
                        <Form.Item className="form-submit">
                          <Button
                            type="primary"
                            htmlType="submit"
                            className="submit-button password-button"
                            icon={<FaShieldAlt style={{ marginLeft: '8px' }} />}
                            loading={loading}
                          >
                            {t('change_password_button')}
                          </Button>
                        </Form.Item>
                      </Form>
                    </div>
                  )
                },
                {
                  key: "3",
                  label: (
                    <span className="tab-title">
                      <FaChartLine className="tab-icon" />
                      <span className="tab-text">{t('stats_and_points')}</span>
                    </span>
                  ),
                  children: (
                    <div className="tab-content-container">
                      <Row gutter={[16, 16]}>
                        <Col xs={24} md={12}>
                          <Card className="stat-card primary" bordered={false}>
                            <Row justify="space-between" align="middle">
                              <Col>
                                <CrownOutlined className="stat-icon" />
                                <div className="stat-title">
                                  <span>{t('current_balance')}</span>
                                </div>
                                <div className="stat-value">{userData?.points || 0} {t('points_suffix')}</div>
                              </Col>
                              {userData?.isAdmin && (
                                <Col>
                                  <Space.Compact>
                                    <Button 
                                      icon={<PlusOutlined />} 
                                      onClick={() => handleUpdateStats('points', 50)}
                                      title={t('add_50_points')}
                                    />
                                    <Button 
                                      icon={<MinusOutlined />} 
                                      onClick={() => handleUpdateStats('points', -50)}
                                      disabled={userData?.points < 50}
                                      title={t('subtract_50_points')}
                                    />
                                  </Space.Compact>
                                </Col>
                              )}
                            </Row>
                            
                            <Progress 
                              percent={userData?.points ? Math.min(100, Math.round(userData.points / 10)) : 0} 
                              showInfo={false} 
                              strokeColor="#1890ff" 
                              trailColor="#f0f0f0"
                              style={{ marginTop: '16px' }}
                            />
                            
                            <div style={{ marginTop: '8px', fontSize: '12px', color: '#8c8c8c' }}>
                              {t('total_points_earned')}: {userData?.allPoints || 0} {t('points_suffix')}
                            </div>
                          </Card>
                        </Col>
                        
                        <Col xs={24} md={12}>
                          <Card className="stat-card success" bordered={false}>
                            <Row justify="space-between" align="middle">
                              <Col>
                                {getLevelIcon(userData?.level || 1, { 
                                  className: "stat-icon",
                                  style: { color: getLevelColor(userData?.level || 1) }
                                })}
                                <div className="stat-title">
                                  <span>{t('current_level')}</span>
                                </div>
                                <div className="stat-value" style={{ 
                                  background: 'transparent',
                                  WebkitTextFillColor: getLevelColor(userData?.level || 1),
                                  color: getLevelColor(userData?.level || 1) 
                                }}>
                                  {t('level')} {userData?.level || 1}
                                  <span style={{ 
                                    fontSize: '14px', 
                                    marginRight: '8px',
                                    background: getLevelGradient(userData?.level || 1).background,
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                    color: 'transparent'
                                  }}>
                                    ({getLevelTierName(userData?.level || 1)})
                                  </span>
                                </div>
                              </Col>
                              {userData?.isAdmin && (
                                <Col>
                                  <Space.Compact>
                                    <Button 
                                      icon={<PlusOutlined />} 
                                      onClick={() => handleUpdateStats('level', 1)}
                                      title={t('increase_level')}
                                    />
                                    <Button 
                                      icon={<MinusOutlined />} 
                                      onClick={() => handleUpdateStats('level', -1)}
                                      disabled={userData?.level <= 1}
                                      title={t('decrease_level')}
                                    />
                                  </Space.Compact>
                                </Col>
                              )}
                            </Row>
                            
                            {/* Enhanced level progress bar */}
                            <div style={{ marginTop: '16px' }}>
                              <Row justify="space-between" style={{ marginBottom: '5px' }}>
                                <Col>{t('level')} {userData?.level || 1}</Col>
                                <Col>{t('level')} {(userData?.level || 1) + 1}</Col>
                              </Row>
                              <div style={{ 
                                height: '10px', 
                                background: '#f0f0f0', 
                                borderRadius: '5px', 
                                overflow: 'hidden',
                                position: 'relative'
                              }}>
                                <div style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  height: '100%',
                                  width: `${levelProgressPercentage(userData?.allPoints || 0)}%`,
                                  background: getLevelGradient(userData?.level || 1).background,
                                  borderRadius: '5px',
                                  transition: 'width 0.5s ease-out'
                                }}></div>
                              </div>
                              <div style={{ marginTop: '8px', fontSize: '12px', color: '#8c8c8c' }}>
                                {userData ? pointsForNextLevel(userData.allPoints).toLocaleString() : 0} {t('points_for_next_level')}
                              </div>
                            </div>
                          </Card>
                        </Col>
                      </Row>

                      <Card 
                        title={
                          <div className="card-title-with-icon">
                            <FaHistory style={{ marginLeft: '8px' }} />
                            {t('transaction_history')}
                          </div>
                        } 
                        className="transactions-card"
                      >
                        {transactions.length > 0 ? (
                          <Table 
                            dataSource={transactions} 
                            columns={columns} 
                            rowKey="id"
                            pagination={{ pageSize: 5 }}
                            className="profile-table"
                            loading={loading}
                          />
                        ) : (
                          <Empty description={t('no_transactions')} />
                        )}
                      </Card>
                    </div>
                  )
                },
                {
                  key: "4",
                  label: (
                    <span className="tab-title">
                      <FaMedal className="tab-icon" />
                      <span className="tab-text">{t('achievements')}</span>
                    </span>
                  ),
                  children: (
                    <div className="tab-content-container">
                      <Alert
                        message={t('achievements_and_badges')}
                        description={t('achievements_description')}
                        type="info"
                        showIcon
                        icon={<FaTrophy style={{ color: '#faad14' }} />}
                        style={{ marginBottom: '24px' }}
                      />
                      
                      <List
                        grid={{ gutter: 16, xs: 1, sm: 2, lg: 3 }}
                        dataSource={achievements}
                        renderItem={item => (
                          <List.Item>
                            <Card 
                              className={`achievement-card ${item.unlocked ? 'unlocked' : 'locked'}`}
                              style={{ 
                                opacity: item.unlocked ? 1 : 0.6,
                                filter: item.unlocked ? 'none' : 'grayscale(0.8)',
                                transition: 'all 0.3s'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <AntAvatar 
                                  src={item.icon} 
                                  size={64}
                                  style={{ 
                                    marginLeft: '16px',
                                    border: item.unlocked ? '3px solid gold' : '3px solid #d9d9d9'
                                  }}
                                />
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <Title level={5} style={{ margin: 0 }}>
                                      {item.titleKey ? t(item.titleKey) : t(item.title)}
                                    </Title>
                                    {item.unlocked && (
                                      <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '5px' }} />
                                    )}
                                  </div>
                                  <Text type="secondary">
                                    {item.descriptionKey ? t(item.descriptionKey) : t(item.description)}
                                  </Text>
                                  {item.unlocked ? (
                                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#52c41a' }}>
                                      {t('obtained')}: {item.date ? formatLongDate(item.date) : '-'}
                                    </div>
                                  ) : (
                                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#8c8c8c' }}>
                                      {t('not_obtained_yet')}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Card>
                          </List.Item>
                        )}
                      />
                    </div>
                  )
                },
                {
                  key: "5",
                  label: (
                    <span className="tab-title">
                      <FaHistory className="tab-icon" />
                      <span className="tab-text">{t('activities')}</span>
                    </span>
                  ),
                  children: (
                    <div className="tab-content-container">
                      <Card 
                        title={
                          <div className="card-title-with-icon">
                            <FaHistory style={{ marginLeft: '8px' }} />
                            {t('recent_activities')}
                          </div>
                        } 
                        className="activities-card"
                        extra={
                          <Button 
                            type="primary"
                            icon={<ReloadOutlined />}
                            onClick={fetchActivities}
                            loading={loadingActivities}
                            size="small"
                          >
                            {t('reload')}
                          </Button>
                        }
                      >
                        {loadingActivities ? (
                          <div className="loading-container">
                            <Spin tip={t('loading_activities')} />
                          </div>
                        ) : activities.length > 0 ? (
                          <div className="activities-list">
                            {activities.map((activity) => (
                              <ActivityItem
                                key={activity._id || activity.id}
                                activity={activity}
                                user={user}
                                activityUser={activity.user || (activity.userId === user?._id ? user : null)}
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
                    </div>
                  )
                },
                {
                  key: "6",
                  label: (
                    <span className="tab-title">
                      <FaCog className="tab-icon" />
                      <span className="tab-text">{t('settings')}</span>
                    </span>
                  ),
                  children: (
                    <div className="tab-content-container">
                      <Card 
                        title={
                          <div className="card-title-with-icon">
                            <FaCog style={{ marginLeft: '8px' }} />
                            {t('account_settings')}
                          </div>
                        } 
                        className="settings-card"
                      >
                        <Form
                          form={settingsForm}
                          layout="vertical"
                          onFinish={handleSettingsSubmit}
                          initialValues={userSettings?.formValues}
                        >
                          <Title level={5}>{t('notification_settings')}</Title>
                          <Form.Item
                            name="emailNotifications"
                            label={t('email_notifications')}
                            valuePropName="checked"
                          >
                            <Switch />
                          </Form.Item>
                          
                          <Form.Item
                            name="securityAlerts"
                            label={t('security_alerts')}
                            valuePropName="checked"
                          >
                            <Switch />
                          </Form.Item>
                          
                          <Form.Item
                            name="activityUpdates"
                            label={t('activity_updates')}
                            valuePropName="checked"
                          >
                            <Switch />
                          </Form.Item>
                          
                          <Form.Item
                            name="marketingEmails"
                            label={t('marketing_emails')}
                            valuePropName="checked"
                          >
                            <Switch />
                          </Form.Item>
                          
                          <Divider />
                          
                          <Title level={5}>{t('privacy_options')}</Title>
                          <Form.Item
                            name="profileVisibility"
                            label={t('show_profile_to_others')}
                            valuePropName="checked"
                            initialValue={true}
                          >
                            <Switch />
                          </Form.Item>
                          
                          <Form.Item
                            name="activityVisibility"
                            label={t('show_activities_to_others')}
                            valuePropName="checked"
                            initialValue={false}
                          >
                            <Switch />
                          </Form.Item>
                          
                          <Divider />
                          
                          <Title level={5}>{t('language_settings')}</Title>
                          <Form.Item
                            name="language"
                            label={t('app_language')}
                            initialValue={currentLanguage}
                          >
                            <div className="custom-search-wrapper">
                              <div className="search-icon-container">
                                <GlobalOutlined className="search-icon" />
                              </div>
                              <Select className="custom-search-input">
                                {languages.map(lang => (
                                  <Select.Option key={lang.code} value={lang.code}>
                                    {lang.nativeName || lang.name}
                                  </Select.Option>
                                ))}
                              </Select>
                            </div>
                          </Form.Item>
                          
                          <Form.Item className="form-submit">
                            <Button
                              type="primary"
                              htmlType="submit"
                              className="submit-button"
                              style={{ 
                                background: 'linear-gradient(45deg, #13c2c2, #36cfc9)',
                                boxShadow: '0 4px 12px rgba(19, 194, 194, 0.25), 0 1px 3px rgba(19, 194, 194, 0.15)'
                              }}
                              icon={<FaCog style={{ marginLeft: '8px' }} />}
                              loading={loading}
                            >
                              {t('save_settings')}
                            </Button>
                          </Form.Item>
                        </Form>
                      </Card>
                    </div>
                  )
                }
              ]}
            />
          </Card>
        </div>

        {/* Modal for avatar upload */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <PictureOutlined style={{ marginLeft: '8px', color: '#1890ff' }} />
              {t('change_avatar')}
            </div>
          }
          open={isModalVisible}
          onCancel={handleCancel}
          footer={[
            <Button key="cancel" onClick={handleCancel}>
              {t('cancel')}
            </Button>,
            <Button 
              key="upload" 
              type="primary" 
              onClick={() => fileInputRef.current?.click()} 
              loading={uploading}
              icon={<UploadOutlined />}
            >
              {t('choose_image')}
            </Button>
          ]}
          destroyOnClose={true}
          centered
        >
          <div className="avatar-upload-container" ref={modalRef}>
            <div className="current-avatar-preview">
              <Avatar 
                size={150} 
                icon={<UserOutlined />} 
                src={avatarUrl}
                style={{ boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)' }}
              />
            </div>
            <div className="upload-instructions">
              <Alert
                message={t('upload_instructions')}
                description={
                  <>
                    <p>{t('upload_format_hint')}</p>
                    <p>{t('max_file_size')}: 2 {t('mb')}</p>
                    <p>{t('best_result_hint')}</p>
                  </>
                }
                type="info"
                showIcon
                style={{ marginTop: '16px' }}
              />
            </div>
          </div>
        </Modal>

        {/* Hidden input for avatar upload */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          style={{ display: 'none' }} 
          accept="image/*" 
        />
        
        {/* Hidden input for cover photo upload */}
        <input 
          type="file" 
          ref={coverFileInputRef} 
          onChange={handleCoverFileChange} 
          style={{ display: 'none' }} 
          accept="image/*" 
        />
      </Content>
    </Layout>
      )}
    </ContentContainer>
  );
};

export default UserProfile;