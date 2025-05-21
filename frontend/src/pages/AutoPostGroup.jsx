import React, { useState, useRef, useEffect } from 'react';
import { 
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Collapse,
  Col,
  DatePicker,
  Divider,
  Empty,
  Input,
  InputNumber,
  Modal, 
  Pagination,
  Popconfirm,
  Progress,
  Radio, 
  Result,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Switch, 
  Table, 
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message
} from 'antd';
import { 
  formatDate, 
  formatTime, 
  formatDateTime, 
  getDayName, 
  getMonthName,
  formatLongDate
} from '../utils/dateUtils';
import { 
  LoadingOutlined, 
  PauseCircleOutlined, 
  PlayCircleOutlined, 
  UploadOutlined, 
  FileTextOutlined,
  ImportOutlined,
  StopOutlined,
  LinkOutlined,
  SaveOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  QuestionCircleOutlined,
  HistoryOutlined,
  VideoCameraOutlined,
  EyeOutlined,
  LikeOutlined,
  CommentOutlined,
  ShareAltOutlined,
  UserOutlined,
  EditOutlined,
  ReadOutlined,
  FontSizeOutlined,
  BranchesOutlined,
  NumberOutlined,
  InfoCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  PlusOutlined,
  UnorderedListOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import ContentContainer from '../components/ContentContainer';
import { useUser } from '../context/UserContext';
import { useMessage } from '../context/MessageContext';
import { useLanguage } from '../context/LanguageContext';
import autoPostGroupTranslations from '../translations/autoPostGroup';
import './AutoPostGroup.css';
const { ar, en } = autoPostGroupTranslations;

const translations = {
  ar,
  en,
};


// Generate random code function
const generateRandomCode = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// Process template variables and conditionals
const processTemplate = (templateText, previousPosts = []) => {
  if (!templateText) return '';
  
  let processedText = templateText;
  
  // Replace date/time variables
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  
  const dateFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
  const timeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
  const dateTimeFormatOptions = { ...dateFormatOptions, ...timeFormatOptions };
  
  // Basic date/time replacements using standardized dateUtils
  processedText = processedText.replace(/\{DATE\}/gi, formatDate(now));
  processedText = processedText.replace(/\{TIME\}/gi, formatTime(now));
  processedText = processedText.replace(/\{DATETIME\}/gi, formatDateTime(now));
  processedText = processedText.replace(/\{DAY\}/gi, getDayName(now));
  processedText = processedText.replace(/\{MONTH\}/gi, getMonthName(now));
  processedText = processedText.replace(/\{YEAR\}/gi, now.getFullYear().toString());
  processedText = processedText.replace(/\{YESTERDAY\}/gi, formatDate(yesterday));
  processedText = processedText.replace(/\{TOMORROW\}/gi, formatDate(tomorrow));
  
  // Advanced date/time variables
  const hour = now.getHours();
  const isWeekday = now.getDay() >= 1 && now.getDay() <= 5; // Monday to Friday
  
  // Replace random number variable
  processedText = processedText.replace(/\{RANDOM\}/gi, Math.floor(Math.random() * 1000).toString());
  
  // Replace unique ID
  processedText = processedText.replace(/\{UUID\}/gi, () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  });
  
  // Replace ranged random numbers {RANDOM:min:max}
  processedText = processedText.replace(/\{RANDOM:(\d+):(\d+)\}/gi, (match, min, max) => {
    const minNum = parseInt(min);
    const maxNum = parseInt(max);
    return Math.floor(Math.random() * (maxNum - minNum + 1) + minNum).toString();
  });
  
  // Extract text from previous posts
  if (previousPosts.length > 0) {
    // Get last post
    const lastPost = previousPosts[0]?.messageText || '';
    const lastSuccessPost = previousPosts.find(post => post.status === 'Success')?.messageText || '';
    
    // Full last post
    processedText = processedText.replace(/\{LASTPOST\}/gi, lastPost);
    processedText = processedText.replace(/\{LASTPOST_SUCCESS\}/gi, lastSuccessPost);
    
    // Extract portions of last post
    processedText = processedText.replace(/\{LASTPOST:(\-?\d+)\}/gi, (match, length) => {
      const len = parseInt(length);
      if (len > 0) {
        // Get first N characters
        return lastPost.substring(0, len);
      } else if (len < 0) {
        // Get last N characters
        return lastPost.substring(lastPost.length + len);
      }
      return '';
    });
  }
  
  // Text manipulation functions
  processedText = processedText.replace(/\{UPPERCASE:(.*?)\}/gi, (match, text) => {
    return text.toUpperCase();
  });
  
  processedText = processedText.replace(/\{LOWERCASE:(.*?)\}/gi, (match, text) => {
    return text.toLowerCase();
  });
  
  processedText = processedText.replace(/\{CAPITALIZE:(.*?)\}/gi, (match, text) => {
    return text.charAt(0).toUpperCase() + text.slice(1);
  });
  
  // Process conditional blocks with enhanced conditions
  const conditionalPattern = /\{IF:([\s\S]*?)\}([\s\S]*?)(?:\{ELSE\}([\s\S]*?))?\{ENDIF\}/gi;
  processedText = processedText.replace(conditionalPattern, (match, condition, trueContent, falseContent = '') => {
    // Day condition
    const dayConditionMatch = condition.match(/DAY\s*=\s*(.*)/i);
    if (dayConditionMatch) {
      const dayToMatch = dayConditionMatch[1].trim();
      const currentDay = getDayName(now);
      return currentDay.toLowerCase() === dayToMatch.toLowerCase() ? trueContent : falseContent;
    }
    
    // Month condition
    const monthConditionMatch = condition.match(/MONTH\s*=\s*(.*)/i);
    if (monthConditionMatch) {
      const monthToMatch = monthConditionMatch[1].trim();
      const currentMonth = getMonthName(now);
      return currentMonth.toLowerCase() === monthToMatch.toLowerCase() ? trueContent : falseContent;
    }
    
    // Hour condition (for time-based messaging)
    const hourConditionMatch = condition.match(/HOUR\s*([<>=])\s*(\d+)/i);
    if (hourConditionMatch) {
      const operator = hourConditionMatch[1];
      const hourToCompare = parseInt(hourConditionMatch[2]);
      
      switch (operator) {
        case '<': return hour < hourToCompare ? trueContent : falseContent;
        case '>': return hour > hourToCompare ? trueContent : falseContent;
        case '=': return hour === hourToCompare ? trueContent : falseContent;
        default: return falseContent;
      }
    }
    
    // Weekday condition (for workday vs weekend messaging)
    if (condition.trim().toUpperCase() === 'WEEKDAY') {
      return isWeekday ? trueContent : falseContent;
    }
    
    return falseContent; // Default to false content if condition not recognized
  });
  
  return processedText;
};

        
// Post Preview Component
const PostPreview = ({ t, postType, text, imageUrl, videoUrl, enableRandomCode, useProcessedText = false, postHistory = [] }) => { // Add t as a prop
  const randomCode = enableRandomCode ? generateRandomCode() : null;
  // Get correctly processed text
  const displayText = useProcessedText && text ? processTemplate(text, postHistory) : text;
  
  // Check if text contains variables
  const hasVariables = text && /\{[A-Z_:]+[^}]*\}/i.test(text);
  
  return (
    <div className="post-preview-container">
      <div className="post-preview-header">
        <div className="post-preview-avatar">
          <UserOutlined />
        </div>
        <div className="post-preview-info">
          <div className="post-preview-name">{t('preview_name')}</div>
          <div className="post-preview-time">{t('preview_time')}</div>
        </div>
      </div>
      
      <div className="post-preview-content">
        {text && (
          <div className="post-preview-text">
            {useProcessedText ? displayText : text}
            {hasVariables && !useProcessedText && (
              <div style={{ color: '#ff4d4f', fontSize: '12px', marginTop: '4px' }}>
                <InfoCircleOutlined /> {t('preview_variables_warning')}
              </div>
            )}
          </div>
        )}
        
        {postType === 'imageUrl' && imageUrl && (
          <img 
            src={imageUrl} 
            alt={t('preview_image_alt')} 
            className="post-preview-image"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = `data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22400%22%20height%3D%22300%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%20preserveAspectRatio%3D%22none%22%3E%3Cdefs%3E%3Cstyle%20type%3D%22text%2Fcss%22%3E%23holder_189a44545cf%20text%20%7B%20fill%3A%23999%3Bfont-weight%3Anormal%3Bfont-family%3A-apple-system%2CBlinkMacSystemFont%2C%26quot%3BSegoe%20UI%26quot%3B%2CRoboto%2C%26quot%3BHelvetica%20Neue%26quot%3B%2CArial%2C%26quot%3BNoto%20Sans%26quot%3B%2Csans-serif%2C%26quot%3BApple%20Color%20Emoji%26quot%3B%2C%26quot%3BSegoe%20UI%20Emoji%26quot%3B%2C%26quot%3BSegoe%20UI%20Symbol%26quot%3B%2C%26quot%3BNoto%20Color%20Emoji%26quot%3B%2C%20monospace%3Bfont-size%3A20pt%20%7D%20%3C%2Fstyle%3E%3C%2Fdefs%3E%3C%2Fg%3E%3Crect%20width%3D%22400%22%20height%3D%22300%22%20fill%3D%22%23EEE%22%3E%3C%2Frect%3E%3Cg%3E%3Ctext%20x%3D%22148.828125%22%20y%3D%22158.5%22%3E${t('preview_image_error')}%3C%2Ftext%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E`;
            }}
          />
        )}
        
        {postType === 'videoUrl' && videoUrl && (
          <div className="post-preview-video">
            <iframe
              src={videoUrl}
              title={t('preview_title')}
              width="100%"
              height="300"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onError={(e) => {
                console.error("Video loading error", e);
              }}
            ></iframe>
          </div>
        )}
      </div>
      
      {randomCode && (
        <div className="post-preview-random-code">Code: {randomCode}</div>
      )}
      
      <div className="post-preview-footer">
        <div className="post-preview-footer-button">
          <LikeOutlined style={{ marginRight: 4 }} /> {t('preview_like')}
        </div>
        <div className="post-preview-footer-button">
          <CommentOutlined style={{ marginRight: 4 }} /> {t('preview_comment')}
        </div>
        <div className="post-preview-footer-button">
          <ShareAltOutlined style={{ marginRight: 4 }} /> {t('preview_share')}
        </div>
      </div>
    </div>
  );
};

// RemainingTimeDisplay component for scheduled posts
const RemainingTimeDisplay = ({ t, record }) => { // Add t prop back
  const [processing, setProcessing] = useState(false);
  const [timeUnits, setTimeUnits] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [detailedTime, setDetailedTime] = useState('');

  // Update time every second
  useEffect(() => {
    if (!record.scheduledTime) {
      return;
    }

    const updateRemainingTime = () => {
      const scheduledTime = moment(record.scheduledTime);
      const now = moment();

      if (scheduledTime <= now) {
        setProcessing(true);
        setDetailedTime(t('processing')); // Use t function again
        return;
      }
      
      setProcessing(false);
      const duration = moment.duration(scheduledTime.diff(now));
      const days = Math.floor(duration.asDays());
      const hours = duration.hours();
      const minutes = duration.minutes();
      const seconds = duration.seconds();
      
      // Update time units for vertical display
      setTimeUnits({days, hours, minutes, seconds});
      
      // Detailed time string for tooltip
      let detailedString = '';
      if (days > 0) {
        detailedString += `${days} ${t('day_unit')} `; // Use t function again
      }
      if (hours > 0 || days > 0) {
        detailedString += `${hours} ${t('hour_unit')} `; // Use t function again
      }
      if (minutes > 0 || hours > 0 || days > 0) {
        detailedString += `${minutes} ${t('minute_unit')} `; // Use t function again
      }
      detailedString += `${seconds} ${t('second_unit')}`; // Use t function again
      setDetailedTime(detailedString);
    };
    
    // Initial update
    updateRemainingTime();
    
    // Set up interval for regular updates
    const intervalId = setInterval(updateRemainingTime, 1000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [record.scheduledTime, record.status]);
  
  // If processing or non-pending status, show simple text
  if (processing) {
    return (
      <Tag
        className="remaining-time-tag"
        color="processing"
        icon={<ClockCircleOutlined />}
      >
        <span className="remaining-time-content">{t('processing')}</span>
      </Tag>
    );
  }
  
  if (record.status !== 'pending') {
    return (
      <Tag 
        className="remaining-time-tag"
        color="default"
      >
        <span className="remaining-time-content">-</span>
      </Tag>
    );
  }
  
  // Vertical multi-line display
  return (
    <Tooltip title={detailedTime}>
      <Tag 
        className="remaining-time-tag"
        color="processing"
        icon={<ClockCircleOutlined />}
      >
        <span className="remaining-time-content">
          {timeUnits.days > 0 && (
            <span className="time-unit">{timeUnits.days} {t('day_unit')}</span>
          )}
          {(timeUnits.hours > 0 || timeUnits.days > 0) && (
            <span className="time-unit">{timeUnits.hours} {t('hour_unit')}</span>
          )}
          {(timeUnits.minutes > 0 || timeUnits.hours > 0 || timeUnits.days > 0) && (
            <span className="time-unit">{timeUnits.minutes} {t('minute_unit')}</span>
          )}
          <span className="time-unit">{timeUnits.seconds} {t('second_unit')}</span>
        </span>
      </Tag>
    </Tooltip>
  );
};

const { TextArea } = Input;
const { Text, Title, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const AutoPostGroup = () => {
  const { user } = useUser();
  const { messageApi } = useMessage();
  const { t } = useLanguage();

  // State variables
  const [postType, setPostType] = useState('text');
  const [messageText, setMessageText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [delay, setDelay] = useState(3);
  const [enableDelay, setEnableDelay] = useState(false);
  const [enableRandomCode, setEnableRandomCode] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [failureCount, setFailureCount] = useState(0);
  const [dataSource, setDataSource] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importText, setImportText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeAccessToken, setActiveAccessToken] = useState('');
  const [fetchingToken, setFetchingToken] = useState(false);
  const [importingGroups, setImportingGroups] = useState(false);
  
  // New state variables for enhanced features
  const [activeTab, setActiveTab] = useState('post');
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [savedGroups, setSavedGroups] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [groupListName, setGroupListName] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState(null);
  const [postHistory, setPostHistory] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [groupTypeFilter, setGroupTypeFilter] = useState('all');
  const [postProgress, setPostProgress] = useState(0);
  // Retry functionality has been removed
  const [saveTemplateModalVisible, setSaveTemplateModalVisible] = useState(false);
  const [saveGroupsModalVisible, setSaveGroupsModalVisible] = useState(false);
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  const [postStats, setPostStats] = useState({
    totalSuccess: 0,
    totalFailed: 0,
    successRate: "0.0",
    averageTime: "0.00",
    totalTime: "0.00",
    lastPostTime: null
  });
  
  // State for instant group posts
  const [instantGroupPosts, setInstantGroupPosts] = useState([]);
  const [instantGroupPostsLoading, setInstantGroupPostsLoading] = useState(false);
  
  // Scheduled posts state
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [scheduledPostsLoading, setScheduledPostsLoading] = useState(false);
  
  // State for active history sub-tab
  const [activeHistoryTab, setActiveHistoryTab] = useState('active-jobs');
  
  // Reschedule modal state
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [postToReschedule, setPostToReschedule] = useState(null);
  const [newScheduledTime, setNewScheduledTime] = useState(null);
  
  // Added loading states for API operations
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saveTemplateLoading, setSaveTemplateLoading] = useState(false);
  const [saveGroupsLoading, setSaveGroupsLoading] = useState(false);
  const [reschedulingLoading, setReschedulingLoading] = useState(false);
  
  // Batch operations state
  const [batchOperation, setBatchOperation] = useState(null);
  const [batchProgress, setBatchProgress] = useState(0);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchStats, setBatchStats] = useState({
    total: 0,
    processed: 0,
    success: 0,
    failed: 0
  });
  
  // Existing refs
  const fileInputRef = useRef(null);
  const currentIndexRef = useRef(0);
  const timeoutRef = useRef(null);
  const shouldContinueRef = useRef(true);
  const pausedRef = useRef(isPaused);
  
  // New refs
  const startTimeRef = useRef(null);
  const totalTimeRef = useRef(0);
  const schedulerRef = useRef(null);
  const pollingRef = useRef(null);
  
  // Add new refs to track history stats directly to avoid race conditions
  const historySuccessCountRef = useRef(0);
  const historyFailureCountRef = useRef(0);
  
  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  // Load saved data from API on component mount
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        await Promise.all([
          fetchTemplates(),
          fetchGroupLists(),
          fetchPostHistory(),
          fetchScheduledPosts()
        ]);
      } catch (err) { // Keep only one catch block
        console.error('Error loading saved data:', err);
        messageApi.error(t('error_loading_data')); // Use t() here
      }
    };

    loadSavedData();
    fetchActiveAccessToken();

    // Set up polling for scheduled posts status updates
    startScheduledPostsPolling();
    
    // Cleanup scheduler and polling on unmount
    return () => {
      if (schedulerRef.current) {
        clearTimeout(schedulerRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);
  
  // Start polling for scheduled posts and instant group posts updates
  const startScheduledPostsPolling = () => {
    // Clear any existing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    
    // Poll every 5 seconds for both scheduled posts and instant group posts
    pollingRef.current = setInterval(() => {
      fetchScheduledPosts(false); // Don't show loading indicator for polling updates
      fetchInstantGroupPosts(false); // Also poll for instant group posts
    }, 5000); // 5 seconds for more frequent updates
  };

  // Fetch active access token from API
  const fetchActiveAccessToken = async () => {
    if (fetchingToken) return null;

    setFetchingToken(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/users/access-tokens', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const tokens = response.data;
      
      const active = tokens.find(token => token.isActive);
      
      if (active) {
        setActiveAccessToken(active.accessToken);
        return active.accessToken;
      } else if (tokens.length > 0) {
        setActiveAccessToken(tokens[0].accessToken);
        return tokens[0].accessToken;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching access token:', error);
      setError(t('error_fetching_token')); // Use t() here
      return null;
    } finally {
      setFetchingToken(false);
    }
  };

  // Fetch templates from API
  const fetchTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/templates', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setSavedTemplates(response.data);
    } catch (error) {
      console.error('Error fetching templates:', error);
      messageApi.error(t('error_fetching_templates'));
    } finally {
      setTemplatesLoading(false);
    }
  };

  // Fetch group lists from API
  const fetchGroupLists = async () => {
    setGroupsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/group-lists', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setSavedGroups(response.data);
    } catch (error) {
      console.error('Error fetching group lists:', error);
      messageApi.error(t('error_fetching_groups'));
    } finally {
      setGroupsLoading(false);
    }
  };

  // Fetch post history from API
  const fetchPostHistory = async () => {
    setHistoryLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/post-history', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setPostHistory(response.data);
    } catch (error) {
      console.error('Error fetching post history:', error);
      messageApi.error(t('error_fetching_history'));
    } finally {
      setHistoryLoading(false);
    }
  };

  // Table selection configuration
  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys) => {
      setSelectedRowKeys(selectedKeys);
    },
    selections: [
      Table.SELECTION_ALL,
      Table.SELECTION_INVERT,
      Table.SELECTION_NONE,
    ],
    preserveSelectedRowKeys: true
  };

  // Function to fetch instant group posts
  const fetchInstantGroupPosts = async (showLoading = true) => {
    if (showLoading) {
      setInstantGroupPostsLoading(true);
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/instant-group-posts', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      setInstantGroupPosts(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching instant group posts:', error);
      if (showLoading) {
        messageApi.error(t('error_fetching_instant_jobs'));
      }
      return [];
    } finally {
      if (showLoading) {
        setInstantGroupPostsLoading(false);
      }
    }
  };

  // Function to cancel an instant group post
  const cancelInstantGroupPost = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/instant-group-posts/${id}/cancel`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      messageApi.success(t('instant_job_cancelled'));
      
      // Refresh instant group posts
      fetchInstantGroupPosts(false);
    } catch (error) {
      console.error('Error cancelling instant group post:', error);
      messageApi.error(t('instant_job_cancel_error'));
    }
  };

  // Function to import groups from Facebook with pagination support
  const importGroupsFromFacebook = async () => {
    try {
      setImportingGroups(true);
      
      // Check if we have an active access token
      if (!activeAccessToken) {
        // Try to get the active access token
        messageApi.loading(t('checking_token'), 1); // Use t() here
        const newToken = await fetchActiveAccessToken();
        if (!newToken) {
          messageApi.error(t('no_active_token')); // Use t() here
          setImportingGroups(false);
          return;
        }
      }
      
      messageApi.loading(t('importing_groups'), 0); // Use t() here
      
      // Initial URL for Facebook Graph API
      const initialUrl = '/v18.0/me/groups';
      const params = {
        fields: 'id,name,privacy,member_count',
        access_token: activeAccessToken,
        pretty: 1,
        limit: 100
      };
      
      // Create URL with parameters
      const url = `${initialUrl}?${new URLSearchParams(params).toString()}`;
      
      // Helper function to fetch all groups with pagination
      const fetchAllGroups = async (url, allGroups = []) => {
        try {
          // Fetch groups from the current URL
          const response = await fetch(url);
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          let data;
          try {
            data = await response.json();
          } catch (jsonError) {
            throw new Error('فشل في تحليل البيانات المستلمة');
          }
          
          if (data.error) {
            throw new Error(data.error.message);
          }
          
          if (!data.data || !Array.isArray(data.data)) {
            throw new Error('تنسيق البيانات غير صالح');
          }
          
          // Process current batch of groups
          const processedGroups = data.data.map(group => ({
            key: `${group.id}-${Date.now()}`,
            groupId: group.id,
            Name_Group: group.name,
            Privacy_Group: group.privacy,
            member_count: group.member_count,
            status: 'Pending',
            attemptCount: 0
          }));
          
          // Combine with previously fetched groups
          const combinedGroups = [...allGroups, ...processedGroups];
          
          // Check if there's a next page
          if (data.paging?.next) {
            // Extract the 'after' cursor if present
            let nextPageUrl;
            try {
              const nextUrl = new URL(data.paging.next);
              const afterCursor = nextUrl.searchParams.get('after');
              
              if (afterCursor) {
                // Build a proper pagination URL that works with proxies
                const originalUrlObj = new URL(url.startsWith('http') ? url : `${window.location.origin}${url}`);
                originalUrlObj.searchParams.set('after', afterCursor);
                
                nextPageUrl = url.startsWith('http') ? 
                  originalUrlObj.toString() : 
                  `${originalUrlObj.pathname}${originalUrlObj.search}`;
                
                // Add a delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Recursively fetch the next page
                return await fetchAllGroups(nextPageUrl, combinedGroups);
              }
            } catch (paginationError) {
              console.error('Error processing pagination:', paginationError);
              
              // Fallback to using the direct next URL if available
              await new Promise(resolve => setTimeout(resolve, 1000));
              return await fetchAllGroups(data.paging.next, combinedGroups);
            }
          }
          
          // No more pages, return all groups
          return combinedGroups;
        } catch (error) {
          throw error;
        }
      };
      
      // Start fetching all groups
      const allGroups = await fetchAllGroups(url);
      
      messageApi.destroy(); // Clear the loading message
      
      if (allGroups.length === 0) {
        messageApi.info(t('no_groups_found')); // Use t() here
        setImportingGroups(false);
        return;
      }
      
      // Check for duplicates
      const existingGroupIds = dataSource.map(item => item.groupId);
      const uniqueNewGroups = allGroups.filter(item => !existingGroupIds.includes(item.groupId));
      
      if (uniqueNewGroups.length === 0) {
        messageApi.info(t('all_groups_exist')); // Use t() here
        setImportingGroups(false);
        return;
      }
      
      // Add the new groups to the data source
      setDataSource(prev => [...prev, ...uniqueNewGroups]);
      
      messageApi.success(t('import_success', { count: uniqueNewGroups.length })); // Use t() here
    } catch (error) {
      console.error('Error importing groups from Facebook:', error);
      
      // Enhanced error message based on the error response
      let errorMessage = t('facebook_api_error'); // Use t() here
      
      if (error.response) {
        if (error.response.status === 400 || error.response.status === 401) {
          errorMessage = t('invalid_token'); // Use t() here
        } else if (error.response.status === 403) {
          errorMessage = t('no_permission'); // Use t() here
        } else if (error.response.data && error.response.data.error && error.response.data.error.message) {
          errorMessage = t('facebook_error', { message: error.response.data.error.message }); // Use t() here
        }
      }
      
      messageApi.error(errorMessage);
    } finally {
      setImportingGroups(false);
    }
  };

  // Enhanced Table columns with more information
  const columns = [
    {
      title: t('group_table_index'),
      key: 'index',
      width: 60,
      render: (_, __, index) => (page - 1) * pageSize + index + 1,
    },
    {
      title: t('group_table_id'), // Use t() here
      dataIndex: 'groupId',
      key: 'groupId',
      width: 150,
      ellipsis: true,
      sorter: (a, b) => a.groupId.localeCompare(b.groupId),
      render: (groupId) => (
        <a href={`https://facebook.com/groups/${groupId}`} target="_blank" rel="noopener noreferrer">
          {groupId}
        </a>
      ),
    },
    {
      title: t('group_table_name'), // Use t() here
      dataIndex: 'Name_Group',
      key: 'Name_Group',
      width: 200,
      ellipsis: true,
      render: (name) => name || '-',
    },
    {
      title: t('group_table_privacy'), // Use t() here
      dataIndex: 'Privacy_Group',
      key: 'Privacy_Group',
      width: 120,
      render: (privacy) => {
        if (!privacy) return '-';
        
        if (privacy === 'OPEN') {
          return <Tag color="green">{t('group_public')}</Tag>; // Use t() here
        } else if (privacy === 'CLOSED') {
          return <Tag color="blue">{t('group_closed')}</Tag>; // Use t() here
        } else if (privacy === 'SECRET') {
          return <Tag color="red">{t('group_secret')}</Tag>; // Use t() here
        } else {
          return <Tag>{privacy}</Tag>;
        }
      },
    },
    {
      title: t('group_table_members'), // Use t() here
      dataIndex: 'member_count',
      key: 'member_count',
      width: 120,
      render: (count) => count || '-',
      sorter: (a, b) => {
        const countA = a.member_count || 0;
        const countB = b.member_count || 0;
        return countA - countB;
      },
    },
    {
      title: t('group_table_status'), // Use t() here
      dataIndex: 'status',
      key: 'status',
      width: 120,
      filters: [
        { text: t('status_pending'), value: 'Pending' }, // Use t() here
        { text: t('status_processing'), value: 'Processing' }, // Use t() here
        { text: t('status_posted'), value: 'Success' }, // Use t() here
        { text: t('status_failed'), value: 'Failed' }, // Use t() here
        { text: t('status_cancelled'), value: 'Cancelled' }, // Use t() here
      ],
      onFilter: (value, record) => record.status === value,
      render: (status) => {
        if (status === 'Success') {
          return <Tag color="success" icon={<CheckCircleOutlined />}>{t('status_posted')}</Tag>; // Use t() here
        } else if (status === 'Failed') {
          return <Tag color="error" icon={<StopOutlined />}>{t('status_failed')}</Tag>; // Use t() here
        } else if (status === 'Processing'){
          return <Tag color="processing" icon={<LoadingOutlined />}>{t('status_processing')}</Tag>; // Use t() here
        } else if (status === 'Cancelled'){
          return <Tag color="default" icon={<DeleteOutlined />}>{t('status_cancelled')}</Tag>; // Use t() here
        } else {
          return <Tag color="default" icon={<ClockCircleOutlined />}>{t('status_pending')}</Tag>; // Use t() here
        }
      },
    },
    {
      title: t('group_table_post_time'), // Use t() here
      dataIndex: 'postTime',
      key: 'postTime',
      width: 150,
      render: (postTime) => postTime ? formatDateTime(postTime) : '-',
      sorter: (a, b) => {
        if (!a.postTime) return -1;
        if (!b.postTime) return 1;
        return moment(a.postTime).diff(moment(b.postTime));
      }
    },
    {
      title: t('group_table_attempts'), // Use t() here
      dataIndex: 'attemptCount',
      key: 'attemptCount',
      width: 100,
      render: (count) => count || '0',
    },
    {
      title: t('group_table_notes'), // Use t() here
      dataIndex: 'errorMessage',
      key: 'errorMessage',
      ellipsis: true,
      render: (msg) => msg ? (
        <Tooltip title={msg}>
          <Text type="danger" ellipsis>{msg}</Text>
        </Tooltip>
      ) : '-',
    },
    {
      title: t('group_table_actions'), // Use t() here
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          {record.status === 'Failed' && (
            <Tooltip title={t('retry')}> {/* Use t() here */}
              <Button 
                icon={<ReloadOutlined />} 
                disabled={isPosting && !isPaused} 
                onClick={() => retryPost(record.groupId)} 
              />
            </Tooltip>
          )}
          <Tooltip title={t('delete')}>
            <Button 
              type="text" 
              danger 
              size="small" 
              icon={<DeleteOutlined />} 
              onClick={() => removeGroup(record.groupId)} 
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Save current post as template
  const saveTemplate = async () => {
    if (!templateName.trim()) {
      messageApi.error(t('template_name_required'));
      return;
    }
    
    if (!messageText.trim()) {
      messageApi.error(t('template_content_required'));
      return;
    }
    
    setSaveTemplateLoading(true);
    try {
      const newTemplate = {
        name: templateName,
        type: postType,
        text: messageText,
        imageUrl: imageUrl,
        videoUrl: videoUrl,
        withRandomCode: enableRandomCode
      };
      
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/templates', newTemplate, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Add the newly created template to the state
      setSavedTemplates(prev => [...prev, response.data]);
      setSaveTemplateModalVisible(false);
      setTemplateName('');
      messageApi.success(t('template_save_success'));
    } catch (error) {
      console.error('Error saving template:', error);
      messageApi.error(t('template_save_error'));
    } finally {
      setSaveTemplateLoading(false);
    }
  };

  // State for template editor
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedVariableCategory, setSelectedVariableCategory] = useState(t('all_categories'));
  // Add state for variable search
  const [variableSearch, setVariableSearch] = useState('');

  // Function to call backend API for text rephrasing
  const rephraseAiText = async (text) => {
    setAiLoading(true);
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('token');
      
      // Call our backend endpoint instead of direct API call
      const response = await axios.post(
        '/api/ai/rephrase',
        { text },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Process response from our backend
      if (response.data && response.data.rephrasedText) {
        const rephrasedText = response.data.rephrasedText;
        setMessageText(rephrasedText);
        messageApi.success(t('rephrase_success'));
        return rephrasedText;
      } else {
        console.error('Unexpected response format:', response.data);
        messageApi.error(t('unexpected_response'));
        return text;
      }
    } catch (error) {
      console.error('Error rephrasing text:', error);
      messageApi.error(t('rephrase_error'));
      return text;
    } finally {
      setAiLoading(false);
    }
  };

  // Function to get AI content suggestions from backend
  const getAiSuggestions = async (text) => {
    setAiLoading(true);
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('token');
      
      // Call our backend endpoint instead of direct API call
      const response = await axios.post(
        '/api/ai/suggestions',
        { text },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Process response from our backend
      if (response.data && response.data.suggestions) {
        const suggestions = response.data.suggestions;
        console.log('AI Suggestions:', suggestions);
        setAiSuggestions(suggestions);
        return suggestions;
      } else {
        console.error('Unexpected response format:', response.data);
        messageApi.error(t('unexpected_response'));
        setAiSuggestions([]);
        return [];
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      messageApi.error(t('suggestions_error'));
      setAiSuggestions([]);
      return [];
    } finally {
      setAiLoading(false);
    }
  };
  
  // Filter variables based on search
  const getFilteredVariables = (categories, category) => {
    if (!variableSearch.trim()) {
      return categories[category];
    }
    
    const searchTerm = variableSearch.toLowerCase();
    return categories[category].filter(variable => 
      variable.label.toLowerCase().includes(searchTerm) || 
      variable.description.toLowerCase().includes(searchTerm)
    );
  };

  // Process template variables and conditionals
  // Variable suggestions for templates
  const variableSuggestions = [
    // Date and time variables
    { category: t('variables_datetime'), label: '{DATE}', description: t('var_date') },
    { category: t('variables_datetime'), label: '{TIME}', description: t('var_time') },
    { category: t('variables_datetime'), label: '{DAY}', description: t('var_day') },
    { category: t('variables_datetime'), label: '{MONTH}', description: t('var_month') },
    { category: t('variables_datetime'), label: '{YEAR}', description: t('var_year') },
    { category: t('variables_datetime'), label: '{DATETIME}', description: t('var_datetime') },
    { category: t('variables_datetime'), label: '{YESTERDAY}', description: t('var_yesterday') },
    { category: t('variables_datetime'), label: '{TOMORROW}', description: t('var_tomorrow') },
    
    // Random variables
    { category: t('variables_random'), label: '{RANDOM}', description: t('var_random') },
    { category: t('variables_random'), label: '{RANDOM:1:10}', description: t('var_random_range', {min: 1, max: 10}) },
    { category: t('variables_random'), label: '{RANDOM:1:100}', description: t('var_random_range', {min: 1, max: 100}) },
    { category: t('variables_random'), label: '{RANDOM:100:999}', description: t('var_random_range', {min: 100, max: 999}) },
    { category: t('variables_random'), label: '{UUID}', description: t('var_uuid') },
    
    // Conditional content
    { category: t('variables_conditional'), label: `{IF:DAY=Monday}${t('monday_content')}{ELSE}${t('other_days_content')}{ENDIF}`, description: t('var_day_condition') },
    { category: t('variables_conditional'), label: `{IF:MONTH=January}${t('january_content')}{ELSE}${t('other_month_content')}{ENDIF}`, description: t('var_month_condition') },
    { category: t('variables_conditional'), label: `{IF:HOUR<12}${t('morning_greeting')}{ELSE}${t('evening_greeting')}{ENDIF}`, description: t('var_hour_condition') },
    { category: t('variables_conditional'), label: `{IF:WEEKDAY}${t('workday_content')}{ELSE}${t('weekend_content')}{ENDIF}`, description: t('var_weekday_condition') },
    
    // Previous post extraction
    { category: t('variables_post_history'), label: '{LASTPOST}', description: t('var_lastpost') },
    { category: t('variables_post_history'), label: '{LASTPOST:100}', description: t('var_lastpost_part', {count: 100}) },
    { category: t('variables_post_history'), label: '{LASTPOST:-100}', description: t('var_lastpost_part', {count: -100}) },
    { category: t('variables_post_history'), label: '{LASTPOST_SUCCESS}', description: t('var_lastpost_success') },
    
    // Text manipulation
    { category: t('variables_text_format'), label: `{UPPERCASE:${t('sample_text')}}`, description: t('var_uppercase') },
    { category: t('variables_text_format'), label: `{LOWERCASE:${t('sample_text')}}`, description: t('var_lowercase') },
    { category: t('variables_text_format'), label: `{CAPITALIZE:${t('sample_text')}}`, description: t('var_capitalize') }
  ];
  
  // Group variables by category
  const getVariablesByCategory = () => {
    const categories = {};
    
    variableSuggestions.forEach(variable => {
      if (!categories[variable.category]) {
        categories[variable.category] = [];
      }
      categories[variable.category].push(variable);
    });
    
    return categories;
  };
  
  // Open template editor modal
  const openTemplateEditor = () => {
    setShowTemplateEditor(true);
    // Focus the textarea after a short delay to ensure the modal is rendered
    setTimeout(() => {
      const textarea = document.getElementById('template-textarea');
      if (textarea) {
        textarea.focus();
      }
    }, 100);
  };
  
  // Insert variable at cursor position
  const insertVariable = (variable) => {
    // Get the textarea element
    const textarea = document.getElementById('template-textarea');
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = messageText;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    
    // Update the message text with the inserted variable
    setMessageText(before + variable + after);
    
    // Set cursor position after the inserted variable
    setTimeout(() => {
      textarea.focus();
      const newCursorPosition = start + variable.length;
      textarea.selectionStart = newCursorPosition;
      textarea.selectionEnd = newCursorPosition;
    }, 50);
  };

  // Load template
  const loadTemplate = (template) => {
    setPostType(template.type);
    setMessageText(template.text);
    setImageUrl(template.imageUrl || '');
    setVideoUrl(template.videoUrl || '');
    setEnableRandomCode(template.withRandomCode);
    
    messageApi.success(t('template_load_success', { name: template.name }));
    // Show template editor by default when loading a template
    openTemplateEditor();
  };
  
  // Get processed message text with variables replaced
  const getProcessedMessageText = () => {
    return processTemplate(messageText, postHistory);
  };
  
  // Show preview of processed template
  const previewProcessedTemplate = () => {
    const processedText = getProcessedMessageText();
    Modal.info({
      title: t('preview_template_title'),
      content: (
        <div className="processed-template-preview">
          <Divider orientation="left">{t('original_text')}</Divider>
          <pre style={{ 
            backgroundColor: '#f5f5f5', 
            padding: 10, 
            borderRadius: 4, 
            marginBottom: 16, 
            direction: 'rtl', 
            textAlign: 'right', 
            whiteSpace: 'pre-wrap',
            maxHeight: '200px',
            overflow: 'auto'
          }}>
            {messageText}
          </pre>
          
          <Divider orientation="left">{t('processed_text')}</Divider>
          <pre style={{ 
            backgroundColor: '#e6f7ff', 
            padding: 10, 
            borderRadius: 4, 
            direction: 'rtl', 
            textAlign: 'right', 
            whiteSpace: 'pre-wrap',
            maxHeight: '200px',
            overflow: 'auto',
            border: '1px solid #91d5ff'
          }}>
            {processedText}
          </pre>
        </div>
      ),
      width: 600,
      okText: t('close'),
    });
  };
  
  // Render template editor UI
  const renderTemplateEditor = () => {
    const categories = getVariablesByCategory();
    const categoryNames = Object.keys(categories);
    
    return (
      <Modal
        title={
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <SettingOutlined style={{ marginLeft: 8 }} />
              <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{t('template_editor_title')}</span>
              <span style={{ 
                fontSize: '12px', 
                color: '#666', 
                fontWeight: 'normal',
                marginRight: 8,
                display: 'inline-block',
                background: '#f9f9f9',
                padding: '1px 8px',
                borderRadius: 4,
                border: '1px solid #f0f0f0'
              }}>
                {t('template_editor_instructions')}
              </span>
            </div>
          </div>
        }
        open={showTemplateEditor}
        onCancel={() => setShowTemplateEditor(false)}
        footer={[
            <Button 
              key="preview" 
              type="primary" 
              onClick={previewProcessedTemplate} 
              icon={<EyeOutlined />}
              size="middle"
              >
              {t('preview_result')}
            </Button>,
            <Button 
              key="aiSuggest" 
              onClick={async () => {
                const suggestions = await getAiSuggestions(messageText);
              }}
              icon={<QuestionCircleOutlined />}
              type="default"
              style={{ background: '#f0f5ff', borderColor: '#adc6ff' }}
            >
              {t('ai_suggestions')}
            </Button>,
            <Button
              key="aiRephrase"
              onClick={async () => {
                await rephraseAiText(messageText);
              }}
              icon={<ReloadOutlined />}
              type="default"
              style={{ background: '#f9f0ff', borderColor: '#d3adf7' }}
            >
              {t('ai_rephrase')}
            </Button>,
             aiLoading ? (
              <Spin size="small" style={{ marginLeft: 8 }} />
            ) : null,
            <Button key="close" onClick={() => setShowTemplateEditor(false)}>
              {t('close')}
            </Button>
        ]}
        width={900}
        bodyStyle={{ maxHeight: '75vh', overflow: 'auto' }}
        style={{ top: 20 }}
        className="template-editor-modal"
      >
        <div className="template-editor">
          {/* AI Suggestions Section with improved styling */}
          {aiSuggestions.length > 0 && (
            <div className="ai-suggestions-section" style={{ 
              marginBottom: 24, 
              background: '#f6ffed', 
              padding: 16, 
              borderRadius: 8,
              border: '1px solid #b7eb8f',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: 12,
                borderBottom: '1px solid #b7eb8f',
                paddingBottom: 8
              }}>
                <QuestionCircleOutlined style={{ fontSize: 20, color: '#52c41a', marginLeft: 8 }} />
                <Typography.Text strong style={{ fontSize: 16, color: '#389e0d' }}>
                  {t('ai_suggestions')}
                </Typography.Text>
              </div>
              
              <Row gutter={[12, 12]}>
                {aiSuggestions.map((suggestion, index) => (
              <Col span={24} key={index}>
                <div 
                  className="ai-suggestion-card" 
                  style={{
                    border: '1px solid #d9d9d9',
                    borderRadius: 6,
                    padding: '12px 16px',
                    background: 'white',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.3s',
                    textAlign: 'right',
                    marginBottom: 16,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                    ':hover': {
                      borderColor: '#1890ff',
                      boxShadow: '0 2px 8px rgba(24,144,255,0.2)'
                    }
                  }} 
                  onClick={() => setMessageText(suggestion)}
                >
                  <div 
                    style={{ 
                      margin: 0, 
                      color: '#262626',
                      whiteSpace: 'pre-wrap',
                      textAlign: 'right',
                      lineHeight: '1.6',
                      maxHeight: 'none',
                      overflow: 'visible',
                      display: 'block'
                    }}
                  >
                    {suggestion}
                  </div>
                  <Space style={{ marginTop: 12, justifyContent: 'flex-end', width: '100%', borderTop: '1px solid #f0f0f0', paddingTop: '8px' }}>
                    <Button 
                      size="small" 
                      type="primary" 
                      icon={<CheckCircleOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMessageText(suggestion);
                        message.success(t('ai_suggestion_used'));
                      }}
                    >
                      {t('use')}
                    </Button>
                  </Space>
                </div>
                  </Col>
                ))}
              </Row>
            </div>
          )}
          
          {aiLoading && (
            <div style={{ 
              textAlign: 'center', 
              padding: '20px 0', 
              background: '#f5f5f5', 
              borderRadius: 8,
              marginBottom: 16
            }}>
              <Spin size="default" />
              <div style={{ marginTop: 12, color: '#666' }}>{t('ai_loading')}</div>
            </div>
          )}
          
          {/* Alert removed as instructions were moved to modal header */}
          
          {/* Template text area with better styling */}
          <div style={{ marginBottom: 24 }}>
            <Typography.Title level={5} style={{ margin: '0 0 8px 0' }}>
              <EditOutlined style={{ marginLeft: 8 }} />
              {t('template_text')}
            </Typography.Title>
            <TextArea
              id="template-textarea"
              rows={8}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={t('template_placeholder')}
              style={{ 
                direction: 'rtl', 
                textAlign: 'right',
                padding: 12,
                fontSize: '15px',
                borderRadius: 6,
                resize: 'vertical',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
              }}
            />
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 8
            }}>
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                <InfoCircleOutlined style={{ marginLeft: 4 }} />
                {t('variables_info')}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                <span id="char-count">{messageText.length}</span> {t('char')}
              </Typography.Text>
            </div>
          </div>
          
          {/* Variables section with improved UI */}
          <div style={{ 
            background: '#f9f9f9', 
            padding: 16, 
            borderRadius: 8,
            border: '1px solid #f0f0f0',
            marginBottom: 20
          }}>
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              <LinkOutlined style={{ marginLeft: 8 }} />
              {t('available_variables')}
            </Typography.Title>
            
            <div style={{ marginBottom: 16 }}>
              <Radio.Group 
                value={selectedVariableCategory} 
                onChange={(e) => setSelectedVariableCategory(e.target.value)}
                buttonStyle="solid"
                style={{ marginBottom: 12 }}
                optionType="button"
                size="middle"
              >
                <Radio.Button value={t('all_categories')} style={{ borderRadius: '4px 0 0 4px' }}>{t('all_categories')}</Radio.Button>
                {categoryNames.map((category, index) => (
                  <Radio.Button 
                    key={category} 
                    value={category} 
                    style={{ 
                      borderRadius: index === categoryNames.length - 1 ? '0 4px 4px 0' : 'none'
                    }}
                  >
                    {category}
                  </Radio.Button>
                ))}
              </Radio.Group>
              
              <Input.Search
                placeholder={t('search_variable')}
                onChange={e => setVariableSearch(e.target.value)}
                value={variableSearch}
                style={{ 
                  marginBottom: 12,
                  borderRadius: 6
                }}
                allowClear
                size="middle"
              />
            </div>
            
            {/* Variables grid with enhanced styling */}
            <div className="variables-grid" style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
              gap: 12,
              marginBottom: 16, 
              maxHeight: '250px', 
              overflowY: 'auto', 
              padding: '12px',
              background: 'white',
              border: '1px solid #eee',
              borderRadius: '6px',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.03)'
            }}>
              {Object.entries(categories).map(([category, variables]) => {
                // Skip categories that don't match the selection (unless "all" is selected)
                if (selectedVariableCategory !== t('all_categories') && selectedVariableCategory !== category) {
                  return null;
                }
                
                const filteredVariables = getFilteredVariables(categories, category);
                
                if (filteredVariables.length === 0) {
                  return null;
                }
                
                return (
                  <React.Fragment key={category}>
                    {selectedVariableCategory === t('all_categories') && (
                      <div style={{ 
                        gridColumn: '1 / -1', 
                        fontWeight: 'bold', 
                        marginTop: 8,
                        marginBottom: 8,
                        borderBottom: '1px solid #f0f0f0',
                        paddingBottom: 4,
                        color: '#1890ff'
                      }}>
                        {category}
                      </div>
                    )}
                    
                    {filteredVariables.map(variable => (
                      <Tooltip 
                        key={variable.label} 
                        title={variable.description} 
                        placement="top"
                        color="#1890ff"
                      >
                        <Button 
                          onClick={() => insertVariable(variable.label)}
                          style={{ 
                            textAlign: 'right', 
                            height: 'auto', 
                            padding: '8px 12px', 
                            whiteSpace: 'nowrap', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis',
                            borderColor: '#d9d9d9',
                            borderRadius: 6,
                            transition: 'all 0.3s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            direction: 'rtl'
                          }}
                          className="variable-button"
                        >
                          <span style={{ 
                            display: 'inline-block', 
                            backgroundColor: '#e6f7ff', 
                            color: '#1890ff',
                            padding: '2px 6px',
                            borderRadius: 4,
                            marginLeft: 8,
                            fontFamily: 'monospace',
                            fontSize: '12px'
                          }}>
                            {variable.label}
                          </span>
                          <span style={{ fontSize: '13px', color: '#666' }}>
                            {variable.description}
                          </span>
                        </Button>
                      </Tooltip>
                    ))}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
          
          <Divider style={{ margin: '20px 0' }} />
          
          {/* Documentation section with improved styling */}
          <div style={{ marginBottom: 16 }}>
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              <ReadOutlined style={{ marginLeft: 8 }} />
              {t('variables_guide')}
            </Typography.Title>
            
            <Collapse 
              defaultActiveKey={['dateTime']} 
              bordered={false}
              style={{ 
                background: 'white',
                borderRadius: 8
              }}
              className="template-docs-collapse"
            >
              <Collapse.Panel 
                header={
                  <Space>
                    <ClockCircleOutlined />
                    <span style={{ fontWeight: 'bold' }}>{t('date_time_category')}</span>
                  </Space>
                } 
                key="dateTime"
                style={{ borderRadius: 6, marginBottom: 8 }}
              >
                <ul style={{ paddingRight: 20, paddingLeft: 0 }}>
                  <li><code>{'{DATE}'}</code> - {t('var_date_example')}</li>
                  <li><code>{'{TIME}'}</code> - {t('var_time_example')}</li>
                  <li><code>{'{DATETIME}'}</code> - {t('var_datetime_example')}</li>
                  <li><code>{'{DAY}'}</code> - {t('var_day_example')}</li>
                  <li><code>{'{MONTH}'}</code> - {t('var_month_example')}</li>
                  <li><code>{'{YEAR}'}</code> - {t('var_year_example')}</li>
                  <li><code>{'{YESTERDAY}'}</code> - {t('var_yesterday_example')}</li>
                  <li><code>{'{TOMORROW}'}</code> - {t('var_tomorrow_example')}</li>
                </ul>
              </Collapse.Panel>
              
              <Collapse.Panel 
                header={
                  <Space>
                    <NumberOutlined />
                    <span style={{ fontWeight: 'bold' }}>{t('random_numbers_category')}</span>
                  </Space>
                } 
                key="random"
                style={{ borderRadius: 6, marginBottom: 8 }}
              >
                <ul style={{ paddingRight: 20, paddingLeft: 0 }}>
                  <li><code>{'{RANDOM}'}</code> - {t('var_random_example')}</li>
                  <li><code>{'{RANDOM:1:10}'}</code> - {t('var_random_range_example', {min: 1, max: 10})}</li>
                  <li><code>{'{RANDOM:100:999}'}</code> - {t('var_random_range_example', {min: 100, max: 999})}</li>
                  <li><code>{'{UUID}'}</code> - {t('var_uuid_example')}</li>
                </ul>
              </Collapse.Panel>
              
              <Collapse.Panel 
                header={
                  <Space>
                    <BranchesOutlined />
                    <span style={{ fontWeight: 'bold' }}>{t('conditional_content_category')}</span>
                  </Space>
                } 
                key="conditional"
                style={{ borderRadius: 6, marginBottom: 8 }}
              >
                <ul style={{ paddingRight: 20, paddingLeft: 0 }}>
                  <li><code>{'{IF:DAY=Monday}' + t('morning_greeting') + '{ELSE}' + t('evening_greeting') + '{ENDIF}'}</code> - {t('var_day_condition_example')}</li>
                  <li><code>{'{IF:MONTH=January}' + t('january_content') + '{ELSE}' + t('other_month_content') + '{ENDIF}'}</code> - {t('var_month_condition_example')}</li>
                  <li><code>{'{IF:HOUR<12}' + t('morning_greeting') + '{ELSE}' + t('evening_greeting') + '{ENDIF}'}</code> - {t('var_hour_condition_example')}</li>
                  <li><code>{'{IF:WEEKDAY}' + t('workday_content') + '{ELSE}' + t('weekend_content') + '{ENDIF}'}</code> - {t('var_weekday_condition_example')}</li>
                </ul>
              </Collapse.Panel>
              
              <Collapse.Panel 
                header={
                  <Space>
                    <HistoryOutlined />
                    <span style={{ fontWeight: 'bold' }}>{t('post_history_category')}</span>
                  </Space>
                } 
                key="postHistory"
                style={{ borderRadius: 6, marginBottom: 8 }}
              >
                <ul style={{ paddingRight: 20, paddingLeft: 0 }}>
                  <li><code>{'{LASTPOST}'}</code> - {t('var_lastpost_example')}</li>
                  <li><code>{'{LASTPOST:100}'}</code> - {t('var_lastpost_first_example', {count: 100})}</li>
                  <li><code>{'{LASTPOST:-100}'}</code> - {t('var_lastpost_last_example', {count: 100})}</li>
                  <li><code>{'{LASTPOST_SUCCESS}'}</code> - {t('var_lastpost_success_example')}</li>
                </ul>
              </Collapse.Panel>
              
              <Collapse.Panel 
                header={
                  <Space>
                    <FontSizeOutlined />
                    <span style={{ fontWeight: 'bold' }}>{t('text_format_category')}</span>
                  </Space>
                } 
                key="textFormat"
                style={{ borderRadius: 6, marginBottom: 8 }}
              >
                <ul style={{ paddingRight: 20, paddingLeft: 0 }}>
                  <li><code>{'{UPPERCASE:' + t('sample_text') + '}'}</code> - {t('var_uppercase_example')}</li>
                  <li><code>{'{LOWERCASE:' + t('sample_text') + '}'}</code> - {t('var_lowercase_example')}</li>
                  <li><code>{'{CAPITALIZE:' + t('sample_text') + '}'}</code> - {t('var_capitalize_example')}</li>
                </ul>
              </Collapse.Panel>
              
              <Collapse.Panel 
                header={
                  <Space>
                    <FileTextOutlined />
                    <span style={{ fontWeight: 'bold' }}>{t('template_examples_category')}</span>
                  </Space>
                } 
                key="examples"
                style={{ borderRadius: 6, marginBottom: 8 }}
              >
                <div>
                  <h4>{t('example_1_title')}</h4>
                  <pre style={{ 
                    backgroundColor: '#f5f5f5', 
                    padding: 14, 
                    borderRadius: 6,
                    fontSize: '14px',
                    direction: 'rtl',
                    textAlign: 'right',
                    border: '1px solid #eee' 
                  }}>
{t('example_1_content', { interpolation: { escapeValue: false } })}
                  </pre>
                  
                  <h4>{t('example_2_title')}</h4>
                  <pre style={{ 
                    backgroundColor: '#f5f5f5', 
                    padding: 14, 
                    borderRadius: 6,
                    fontSize: '14px',
                    direction: 'rtl',
                    textAlign: 'right',
                    border: '1px solid #eee' 
                  }}>
{t('example_2_content', { interpolation: { escapeValue: false } })}
                  </pre>
                  
                  <h4>{t('example_3_title')}</h4>
                  <pre style={{ 
                    backgroundColor: '#f5f5f5', 
                    padding: 14, 
                    borderRadius: 6,
                    fontSize: '14px',
                    direction: 'rtl',
                    textAlign: 'right',
                    border: '1px solid #eee' 
                  }}>
{t('example_3_content', { interpolation: { escapeValue: false } })}
                  </pre>
                  
                  <div style={{
                    marginTop: 16,
                    padding: 12,
                    background: '#f0f5ff',
                    borderRadius: 6,
                    borderLeft: '4px solid #1890ff'
                  }}>
                    <Typography.Text strong>{t('tip_label')}</Typography.Text> {t('template_copy_tip')}
                  </div>
                </div>
              </Collapse.Panel>
            </Collapse>
          </div>
        </div>
      </Modal>
    );
  };

  // Updated delete template function to use API
  const deleteTemplate = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/templates/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Remove the deleted template from state
      setSavedTemplates(prev => prev.filter(t => t._id !== id));
      messageApi.success(t('template_delete_success'));
    } catch (error) {
      console.error('Error deleting template:', error);
      messageApi.error(t('template_delete_error'));
    }
  };

  // Load group list
  const loadGroupList = (groupList) => {
    const newDataSource = groupList.groups.map(group => ({
      key: `${group.groupId}-${Date.now()}`,
      groupId: group.groupId,
      status: 'Pending',
      attemptCount: 0
    }));
    
    setDataSource(newDataSource);
    messageApi.success(t('group_list_loaded', { name: groupList.name, count: groupList.groups.length }));
  };

  // Updated delete group list function to use API
  const deleteGroupList = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/group-lists/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Remove the deleted group list from state
      setSavedGroups(prev => prev.filter(g => g._id !== id));
      messageApi.success(t('group_list_delete_success'));
    } catch (error) {
      console.error('Error deleting group list:', error);
      messageApi.error(t('group_list_delete_error'));
    }
  };

  // Retry posting to a specific group
  const retryPost = async (groupId) => {
    // Find the group
    const index = dataSource.findIndex(item => item.groupId === groupId);
    if (index === -1) return;
    
    // Update status to Pending without incrementing attempt count
    // (attempt count will be incremented in updateGroupStatus when status changes to Processing)
    const newDataSource = [...dataSource];
    newDataSource[index] = {
      ...newDataSource[index],
      status: 'Pending',
      errorMessage: null
    };
    
    setDataSource(newDataSource);
    
    // Post to the group
    try {
      // This will trigger updateGroupStatus which will increment attemptCount
      await postToFacebook(groupId);
      messageApi.success(t('retry_success', { groupId }));
    } catch (err) {
      updateGroupStatus(groupId, 'Failed', err.message);
      messageApi.error(t('retry_failed', { groupId }));
    }
  };

  // Remove a group from the list
  const removeGroup = (groupId) => {
    const newDataSource = dataSource.filter(item => item.groupId !== groupId);
    setDataSource(newDataSource);
    
    // Update selected rows if necessary
    const newSelectedRowKeys = selectedRowKeys.filter(key => {
      const group = dataSource.find(item => item.key === key);
      return group && group.groupId !== groupId;
    });
    
    setSelectedRowKeys(newSelectedRowKeys);
    messageApi.success(t('group_removed', { groupId }));
  };

  // Get readable status text
  const getStatusText = (status) => {
    switch (status) {
      case 'Success': return t('status_posted');
      case 'Failed': return t('status_failed');
      case 'Processing': return t('status_processing');
      case 'Cancelled': return t('status_cancelled');
      default: return t('status_pending');
    }
  };

  // Fetch scheduled posts from the server
  const fetchScheduledPosts = async (showLoading = true) => {
    if (showLoading) {
      setScheduledPostsLoading(true);
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/scheduled-posts', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      setScheduledPosts(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching scheduled posts:', error);
      if (showLoading) {
        messageApi.error(t('error_fetching_scheduled'));
      }
      return [];
    } finally {
      if (showLoading) {
        setScheduledPostsLoading(false);
      }
    }
  };
  
  // Schedule post using server-side scheduling
  const schedulePost = async () => {
    // Use the current value directly from state - it's already synced with server
    // when the user toggles the switch
    if (!scheduledTime) {
      messageApi.error(t('provide_schedule_time'));
      return;
    }
    
    if (selectedRowKeys.length === 0) {
      messageApi.error(t('select_group_first'));
      return;
    }
    
    const scheduledDateTime = scheduledTime.toDate();
    const now = new Date();
    
    if (scheduledDateTime <= now) {
      messageApi.error(t('schedule_future_time'));
      return;
    }
    
    try {
      // Get selected groups
      const selectedGroups = dataSource
        .filter(item => selectedRowKeys.includes(item.key))
        .map(item => item.groupId);
      
      if (selectedGroups.length === 0) {
        messageApi.error(t('select_group_first')); // Re-check, maybe redundant
        return;
      }
      
      if (!messageText.trim()) {
        messageApi.error(t('enter_post_content'));
        return;
      }
      
      if (postType === 'imageUrl' && !imageUrl.trim()) {
        messageApi.error(t('enter_image_url'));
        return;
      }
      
      if (postType === 'videoUrl' && !videoUrl.trim()) {
        messageApi.error(t('enter_video_url'));
        return;
      }
      
      // تحقق من وجود رمز وصول نشط
      if (!activeAccessToken) {
        // محاولة تحديث رمز الوصول النشط
        messageApi.loading(t('checking_token'), 1);
        const newToken = await fetchActiveAccessToken();
        if (!newToken) {
          messageApi.error(t('no_active_token'));
          return;
        }
      }

      // Prepare data for server
      const scheduledPostData = {
        scheduledTime: scheduledDateTime,
        postType,
        messageText,
        imageUrl: postType === 'imageUrl' ? imageUrl : '',
        videoUrl: postType === 'videoUrl' ? videoUrl : '',
        enableRandomCode,
        groups: selectedGroups,
        enableDelay,
        delay,
        accessToken: activeAccessToken // Include the active access token
      };
      // Check if user has enough points
      const requiredPoints = selectedGroups.length;
      const pointsCheck = await checkPoints(requiredPoints);
      
      if (!pointsCheck.hasEnough) {
        Modal.warning({
          title: t('insufficient_points'),
          content: (
            <div>
              <p>{t('insufficient_points_message')}</p>
              <p>{t('available_points')} <Text strong>{pointsCheck.currentPoints}</Text></p>
              <p>{t('required_points')} <Text strong>{requiredPoints}</Text> {t('points_per_group')}</p>
            </div>
          ),
          okText: t('confirm')
        });
        return;
      }
      
      // Confirm points deduction
      const confirmDeduction = await new Promise(resolve => {
        Modal.confirm({
          title: t('confirm_posting'),
          content: (
            <div>
              <p>{t('confirm_posting_message')}</p>
              <p>{t('selected_groups')} <Text strong>{selectedGroups.length}</Text></p>
              <p>{t('available_points')} <Text strong>{pointsCheck.currentPoints}</Text></p>
            </div>
          ),
          okText: t('continue_confirm'),
          cancelText: t('cancel'),
          onOk: () => {
            // Points will be deducted by the backend when creating the scheduled post
            messageApi.info(t('points_deducted', { count: requiredPoints }));
            resolve(true);
          },
          onCancel: () => resolve(false)
        });
      });
      
      if (!confirmDeduction) {
        return;
      }
      
      // Include deducted points in scheduled post data
      scheduledPostData.deductedPoints = requiredPoints;
      
      // Submit to server API
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/scheduled-posts', scheduledPostData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      setIsScheduled(true);
      
      messageApi.success(t('scheduled_successful', { time: scheduledTime.format('YYYY-MM-DD HH:mm:ss') }), 5);
      
      // Refresh scheduled posts after successful scheduling
      await fetchScheduledPosts();
      
      // Remove the selected groups from the data source
      const selectedGroupKeys = [...selectedRowKeys];
      setDataSource(prev => prev.filter(item => !selectedGroupKeys.includes(item.key)));
      
      // Reset form fields to allow creating a new scheduled post
      setMessageText('');
      setImageUrl('');
      setVideoUrl('');
      setSelectedRowKeys([]);
      setScheduledTime(null); // Make sure to reset the scheduled time
      setIsScheduled(false); // This allows the button to return to "Schedule" instead of "Cancel Schedule"
      setEnableRandomCode(false);
      
      // Reset post type to default
      setPostType('text');
      
      // Set active tab to scheduled posts to show the newly scheduled post
      setActiveTab('scheduled');
    } catch (error) {
      console.error('Error creating scheduled post:', error);
      messageApi.error(t('error_posting_facebook')); // Assuming generic error for now
    }
  };

  // Delete scheduled post from server
  const deleteScheduledPost = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/scheduled-posts/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Remove from local state
      setScheduledPosts(prev => prev.filter(post => post._id !== id));
      messageApi.success(t('scheduled_deleted'));
      
      // Refresh scheduled posts
      fetchScheduledPosts(false);
    } catch (error) {
      console.error('Error deleting scheduled post:', error);
      messageApi.error(t('scheduled_delete_error'));
    }
  };

  // Open reschedule modal for a post
  const openRescheduleModal = (record) => {
    setPostToReschedule(record);
    setNewScheduledTime(moment(record.scheduledTime)); // Keep using moment for DatePicker
    setRescheduleModalVisible(true);
  };
  
  // Save rescheduled time
  const saveRescheduledTime = async () => {
    if (!postToReschedule || !newScheduledTime) {
      messageApi.error(t('provide_schedule_time'));
      return;
    }
    
    const newScheduledDateTime = newScheduledTime.toDate();
    const now = new Date();
    
    if (newScheduledDateTime <= now) {
      messageApi.error(t('future_time_required'));
      return;
    }
    
    setReschedulingLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/scheduled-posts/${postToReschedule._id}/reschedule`, 
        { scheduledTime: newScheduledDateTime },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Update local state
      setScheduledPosts(prev => 
        prev.map(post => 
          post._id === postToReschedule._id 
            ? { ...post, scheduledTime: newScheduledDateTime } 
            : post
        )
      );
      
      messageApi.success(t('reschedule_success', { time: newScheduledTime.format('YYYY-MM-DD HH:mm:ss') }));
      setRescheduleModalVisible(false);
      
      // Refresh scheduled posts
      fetchScheduledPosts(false);
    } catch (error) {
      console.error('Error rescheduling post:', error);
      messageApi.error(t('reschedule_error'));
    } finally {
      setReschedulingLoading(false);
    }
  };
  
  // Cancel scheduled post on server
  const cancelServerScheduledPost = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/scheduled-posts/${id}/cancel`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setIsScheduled(false);
      messageApi.info(t('scheduled_cancelled'));
      
      // Refresh scheduled posts
      fetchScheduledPosts(false);
    } catch (error) {
      console.error('Error canceling scheduled post:', error);
      messageApi.error(t('scheduled_cancel_error'));
    }
  };
  
  // Save current groups list
  const saveGroupList = async () => {
    if (!groupListName.trim()) {
      messageApi.error(t('group_list_name_required'));
      return;
    }
    
    if (dataSource.length === 0) {
      messageApi.error(t('group_list_empty'));
      return;
    }
    
    setSaveGroupsLoading(true);
    try {
      const newGroupList = {
        name: groupListName,
        groups: dataSource.map(item => ({
          groupId: item.groupId
        }))
      };
      
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/group-lists', newGroupList, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Add the newly created group list to the state
      setSavedGroups(prev => [...prev, response.data]);
      setSaveGroupsModalVisible(false);
      setGroupListName('');
      messageApi.success(t('group_list_save_success'));
    } catch (error) {
      console.error('Error saving group list:', error);
      messageApi.error(t('group_list_save_error'));
    } finally {
      setSaveGroupsLoading(false);
    }
  };
  // Cancel scheduled post
  const cancelScheduledPost = () => {
    if (schedulerRef.current) {
      clearTimeout(schedulerRef.current);
      schedulerRef.current = null;
      setIsScheduled(false);
      messageApi.info(t('scheduled_cancelled')); // Assuming this is the correct key
    }
  };

  // Fix the showStatistics function
  const showStatistics = (forceValues = null) => {
    if (forceValues) {
      setCurrentSessionStats(forceValues);
    }
    setStatsModalVisible(true);
  };

  // Sanitize group ID
  const sanitizeGroupId = (text) => {
    // Remove any non-numeric characters and trim whitespace
    return text.replace(/[^\d]/g, '').trim();
  };

  // Handle text import from modal
  const handleImportFromText = () => {
    try {
      if (!importText.trim()) {
        messageApi.error(t('import_instructions')); // Use a more specific key if available
        return;
      }
      
      const lines = importText.split('\n');
      const newDataSource = lines
        .filter(line => line.trim())
        .map((line, index) => {
          // تنقية معرف المجموعة من أي نص غير رقمي
          const groupId = sanitizeGroupId(line.trim());
          if (!groupId) return null;
          
          return {
            key: `${groupId}-${Date.now()}-${index}`,
            groupId: groupId,
            status: 'Pending'
          };
        })
        .filter(item => item !== null);

      if (newDataSource.length === 0) {
        messageApi.error(t('no_valid_ids'));
        return;
      }

      setDataSource(prev => [...prev, ...newDataSource]);
      setImportModalVisible(false);
      setImportText('');

      messageApi.success(t('import_success', { count: newDataSource.length }));
    } catch (err) {
      messageApi.error(t('import_error'));
      console.error(err);
    }
  };

  // Handle file upload for group IDs
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target.result;
        const lines = content.split('\n');
        
        const newDataSource = lines
          .filter(line => line.trim())
          .map((line, index) => {
            // تنقية معرف المجموعة
            const groupId = sanitizeGroupId(line.trim());
            if (!groupId) return null;
            
            return {
              key: `${groupId}-${Date.now()}-${index}`,
              groupId: groupId,
              status: 'Pending'
            };
          })
          .filter(item => item !== null);

        if (newDataSource.length === 0) {
          messageApi.error(t('no_valid_ids_file'));
          return;
        }

        setDataSource(prev => [...prev, ...newDataSource]);
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        messageApi.success(t('import_success', { count: newDataSource.length }));
      } catch (err) {
        messageApi.error(t('import_error')); // Assuming generic import error
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  // Update group status with enhanced tracking
  const updateGroupStatus = (groupId, status, errorMsg = null) => {
    setDataSource(prev => {
      const newData = [...prev];
      const index = newData.findIndex(item => item.groupId === groupId);
      
      if(index !== -1){
        // Properly increment attempt count when retrying
        const currentAttempts = newData[index].attemptCount || 0;
        const newAttempts = status === 'Processing' && newData[index].status !== 'Pending' ? 
          currentAttempts + 1 : currentAttempts;
        
        newData[index] = { 
          ...newData[index], 
          status, 
          postTime: ['Success', 'Failed'].includes(status) ? new Date().toISOString() : newData[index].postTime,
          attemptCount: newAttempts,
          errorMessage: errorMsg
        };
      }
      
      return newData;
    });
    
    // Update success/failure counts immediately after updating dataSource without logging
    if (status === 'Success') {
      setSuccessCount(prev => prev + 1);
    } else if (status === 'Failed') {
      setFailureCount(prev => prev + 1);
    }
  };

  // Enhanced post text to Facebook group
  const postTextToFacebook = async (groupId) => {
    const startTime = Date.now();
    try {
      if (!activeAccessToken) {
        throw new Error(t('token_required'));
      }
      
      // تحديث حالة المجموعة المعنية إلى "Processing"
      updateGroupStatus(groupId, 'Processing');
      
      // تجهيز النص للنشر
      let formattedText = `\n${messageText}`;
      
      // إضافة رمز عشوائي إن كانت الخاصية مفعلة
      if (enableRandomCode) {
        const randomCode = generateRandomCode();
        formattedText += `\n\nCode: ${randomCode}`;
      }
      
      const url = `/v18.0/${groupId}/feed`;
      
      const params = {
        message: formattedText,
        access_token: activeAccessToken,
      };
      
      const response = await axios.post(url, null, { params });
      
      const isSuccess = response.data && response.data.id;
      
      // تحديث حالة النشر في الجدول
      updateGroupStatus(groupId, isSuccess ? 'Success' : 'Failed');
      
      // Track posting time
      const endTime = Date.now();
      totalTimeRef.current += (endTime - startTime);
      
      // IMPORTANT: Track success directly in the ref counter for history without logging
      if (isSuccess) {
        historySuccessCountRef.current += 1;
      } else {
        historyFailureCountRef.current += 1;
      }
      
      return isSuccess;
    } catch (error) {
      // More detailed error handling
      const errorMessage = error.response?.data?.error?.message || error.message || t('unknown_error');
      console.error('Error posting text to Facebook:', error);
      updateGroupStatus(groupId, 'Failed', errorMessage);
      
      // Track posting time even for failures
      const endTime = Date.now();
      totalTimeRef.current += (endTime - startTime);
      
      // IMPORTANT: Track failure directly for history without logging
      historyFailureCountRef.current += 1;
      
      // Return false to indicate failure
       
      return false;
    }
  };

  // Enhanced post with image URL to Facebook group
  const postImageUrlToFacebook = async (groupId) => {
    const startTime = Date.now();
    try {
      if (!activeAccessToken) {
        throw new Error(t('token_required'));
      }
      
      // تحديث حالة المجموعة إلى "Processing"
      updateGroupStatus(groupId, 'Processing');
      
      // تجهيز النص للنشر
      let message = messageText;
      
      // إضافة رمز عشوائي إن كانت الخاصية مفعلة
      if (enableRandomCode) {
        const randomCode = generateRandomCode();
        message += `\n\nCode: ${randomCode}`;
      }

      // نستخدم مباشرة نقطة نهاية التغذية (feed) لأنها الأكثر موثوقية
      const feedUrl = `/v18.0/${groupId}/feed`;
      
      // تحسين طريقة إرسال رابط الصورة مع النص
      const feedParams = {
        message: message,
        link: imageUrl,
        access_token: activeAccessToken,
      };
      
      const feedResponse = await axios.post(feedUrl, null, { params: feedParams });
      
      const isFeedSuccess = feedResponse.data && feedResponse.data.id;
      
      // تحديث حالة النشر في الجدول
      updateGroupStatus(groupId, isFeedSuccess ? 'Success' : 'Failed');
      
      // Track posting time
      const endTime = Date.now();
      totalTimeRef.current += (endTime - startTime);
      
      // IMPORTANT: Track success directly for history without logging
      if (isFeedSuccess) {
        historySuccessCountRef.current += 1;
      } else {
        historyFailureCountRef.current += 1;
      }
      
      return isFeedSuccess;
    } catch (error) {
      // More detailed error handling
      const errorMessage = error.response?.data?.error?.message || error.message || t('unknown_error');
      console.error('Error posting with image URL to Facebook:', error);
      updateGroupStatus(groupId, 'Failed', errorMessage);
      
      // Track posting time even for failures
      const endTime = Date.now();
      totalTimeRef.current += (endTime - startTime);
      
      // IMPORTANT: Track failure directly for history without logging
      historyFailureCountRef.current += 1;
      
      // Return false to indicate failure
       
      return false;
    }
  };

  // New method: Post video URL to Facebook group
  const postVideoUrlToFacebook = async (groupId) => {
    const startTime = Date.now();
    try {
      if (!activeAccessToken) {
        throw new Error(t('token_required'));
      }
      
      // تحديث حالة المجموعة إلى "Processing"
      updateGroupStatus(groupId, 'Processing');
      
      // تجهيز النص للنشر
      let message = messageText;
      
      // إضافة رمز عشوائي إن كانت الخاصية مفعلة
      if (enableRandomCode) {
        const randomCode = generateRandomCode();
        message += `\n\nCode: ${randomCode}`;
      }

      // استخدام نقطة نهاية التغذية (feed) لنشر الفيديو
      const feedUrl = `/v18.0/${groupId}/feed`;
      
      const feedParams = {
        message: message,
        link: videoUrl,
        access_token: activeAccessToken,
      };
      
      const feedResponse = await axios.post(feedUrl, null, { params: feedParams });
      
      const isFeedSuccess = feedResponse.data && feedResponse.data.id;
      
      // تحديث حالة النشر في الجدول
      updateGroupStatus(groupId, isFeedSuccess ? 'Success' : 'Failed');
      
      // Track posting time
      const endTime = Date.now();
      totalTimeRef.current += (endTime - startTime);
      
      // IMPORTANT: Track success directly for history without logging
      if (isFeedSuccess) {
        historySuccessCountRef.current += 1;
      } else {
        historyFailureCountRef.current += 1;
      }
      
      return isFeedSuccess;
    } catch (error) {
      // More detailed error handling
      const errorMessage = error.response?.data?.error?.message || error.message || t('unknown_error');
      console.error('Error posting video to Facebook:', error);
      updateGroupStatus(groupId, 'Failed', errorMessage);
      
      // Track posting time even for failures
      const endTime = Date.now();
      totalTimeRef.current += (endTime - startTime);
      
      // IMPORTANT: Track failure directly for history without logging
      historyFailureCountRef.current += 1;
      
      // Return false to indicate failure
       
      return false;
    }
  };

  // Enhanced post to Facebook based on post type
  const postToFacebook = async (groupId) => {
    switch (postType) {
      case 'text':
        return postTextToFacebook(groupId);
      case 'imageUrl':
        return postImageUrlToFacebook(groupId);
      case 'videoUrl':
        return postVideoUrlToFacebook(groupId);
      default:
        return postTextToFacebook(groupId);
    }
  };


  // Check if user has enough points for posting
  const checkPoints = async (requiredPoints) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/check-points', { requiredPoints }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error checking points:', error);
      messageApi.error(t('error_checking_points'));
      return { hasEnough: false, currentPoints: 0 };
    }
  };
  
  // Deduct points after successful posting
  const deductPoints = async (points, operation, reason) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/deduct-points', { 
        points, 
        operation: operation || 'post', 
        reason: reason || 'النشر في مجموعات فيسبوك'
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error deducting points:', error);
      messageApi.error(t('points_error'));
      return { success: false };
    }
  };

  // Enhanced start posting process with background processing
  const startPosting = async () => {
    if (isPosting) {
      messageApi.info(t('already_posting'));
      return;
    }
    
    if (selectedRowKeys.length === 0) {
      messageApi.error(t('select_group_first'));
      return;
    }
    
    // تحقق من وجود رمز وصول نشط
    if (!activeAccessToken) {
      // محاولة تحديث رمز الوصول النشط
      messageApi.loading(t('checking_token'), 1);
      const newToken = await fetchActiveAccessToken();
      if (!newToken) {
        messageApi.error(t('no_active_token'));
        return;
      }
    }
    
    if (!messageText.trim()) {
      messageApi.error(t('enter_post_content'));
      return;
    }
    
    if (postType === 'imageUrl' && !imageUrl.trim()) {
      messageApi.error(t('enter_image_url'));
      return;
    }
    
    if (postType === 'videoUrl' && !videoUrl.trim()) {
      messageApi.error(t('enter_video_url'));
      return;
    }
    
    // Check if user has enough points
    const selectedGroups = dataSource.filter(item => selectedRowKeys.includes(item.key));
    const requiredPoints = selectedGroups.length;
    
    const pointsCheck = await checkPoints(requiredPoints);
    if (!pointsCheck.hasEnough) {
      Modal.warning({
        title: t('insufficient_points'),
        content: (
          <div>
            <p>{t('insufficient_points_message')}</p>
            <p>{t('available_points')} <Text strong>{pointsCheck.currentPoints}</Text></p>
            <p>{t('required_points')} <Text strong>{requiredPoints}</Text> {t('points_per_group')}</p>
          </div>
        ),
        okText: t('confirm')
      });
      return;
    }
    
    // Confirm points deduction
    const confirmDeduction = await new Promise(resolve => {
      Modal.confirm({
        title: t('confirm_posting'),
        content: (
          <div>
            <p>{t('confirm_posting_message')}</p>
            <p>{t('selected_groups')} <Text strong>{selectedGroups.length}</Text></p>
            <p>{t('available_points')} <Text strong>{pointsCheck.currentPoints}</Text></p>
          </div>
        ),
        okText: t('continue_confirm'),
        cancelText: t('cancel'),
        onOk: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });
    
    if (!confirmDeduction) {
      return;
    }
    
    // If scheduled, cancel the scheduling
    if (isScheduled) {
      cancelScheduledPost();
    }
    
    try {
      // Prepare the list of group IDs to send to the server
      const groupIds = selectedGroups.map(group => group.groupId);
      
      // Prepare the data to send to the server
      const postData = {
        groups: groupIds,
        postType,
        messageText,
        imageUrl: postType === 'imageUrl' ? imageUrl : '',
        videoUrl: postType === 'videoUrl' ? videoUrl : '',
        enableRandomCode,
        accessToken: activeAccessToken,
        enableDelay,
        delay
      };
      
      // Call the API to create the background post job
      messageApi.loading(t('creating_background_job'), 1);
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/instant-group-posts', postData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Show success message
      messageApi.success(t('background_job_created'));
      
      // Update the UI to show post in progress
      // Reset selected rows since the job is now handled by the server
      setSelectedRowKeys([]);
      
      // Update active tab to "history" tab
      setActiveTab('history');
      
      // Set the active history tab to "active-jobs" and wait for state to update
      setActiveHistoryTab('active-jobs');
      
      // Add a small delay to ensure the tab change is reflected in the UI
      setTimeout(() => {
        // Force-click the active-jobs tab to ensure it's selected
        const activeJobsTab = document.querySelector('[data-key="active-jobs"]');
        if (activeJobsTab) {
          activeJobsTab.click();
        }
      }, 100);
      
      // Refresh the instant jobs list
      fetchInstantGroupPosts();
      
    } catch (error) {
      console.error('Error creating background post job:', error);
      messageApi.error(t('error_creating_job'));
    }
  };

  // Pause posting process
  const pausePosting = () => {
    setIsPaused(true);
    pausedRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    messageApi.info(t('posting_paused'));
  };

  // Resume posting process (يكتفي بتغيير الحالة؛ حيث يُطلق الـ useEffect العملية عند تغيير isPaused)
  const resumePosting = () => {
    if (!isPosting) return;
    setIsPaused(false);
    messageApi.info(t('posting_resumed'));
  };

  // Cancel posting process completely
  const cancelPosting = async () => {
    // إيقاف المعالجة
    shouldContinueRef.current = false;
    setIsPaused(true);
    
    // إلغاء أي مؤقت معلق
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // الحصول على المجموعات المحددة
    const selectedGroups = dataSource.filter(item => selectedRowKeys.includes(item.key));
    
    // تقسيم المجموعات حسب حالتها
    const failedGroups = selectedGroups.filter(item => item.status === 'Failed');
    const pendingGroups = selectedGroups.filter(item => item.status === 'Pending');
    
    const failedCount = failedGroups.length;
    const pendingCount = pendingGroups.length;
    
    console.log(`إحصائيات قبل التحديث - فاشلة: ${failedCount}, معلقة: ${pendingCount}`);
    
    // تحديث حالة المجموعات المعلقة إلى 'ملغاة'
    const updatedDataSource = [...dataSource];
    for (let i = 0; i < updatedDataSource.length; i++) {
      const group = updatedDataSource[i];
      // إذا كانت المجموعة ضمن المحددة وحالتها معلقة، قم بتغيير حالتها إلى ملغاة
      if (selectedRowKeys.includes(group.key) && group.status === 'Pending') {
        updatedDataSource[i] = { ...group, status: 'Cancelled' };
      }
    }
    
    // تحديث الحالة بالبيانات المعدلة
    setDataSource(updatedDataSource);
    
    // حساب إجمالي النقاط المطلوب استرجاعها
    const totalRefundPoints = failedCount + pendingCount;
    
    console.log(`استرجاع النقاط - فاشلة: ${failedCount}, ملغاة: ${pendingCount}, المجموع: ${totalRefundPoints}`);
    
    // استرجاع النقاط إذا كان العدد أكبر من صفر
    if (totalRefundPoints > 0) {
      try {
        const token = localStorage.getItem('token');
        await axios.post('/api/add-points', 
          { 
            points: totalRefundPoints,
            operation: 'refund',
            reason: t('points_refund_message', { pending: pendingCount, failed: failedCount })
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        // رسالة للمستخدم
        messageApi.info(t('points_refunded', { total: totalRefundPoints, pending: pendingCount, failed: failedCount }));
      } catch (error) {
        console.error('Error refunding points for cancelled and failed posts:', error);
        messageApi.error(t('points_refund_error'));
      }
    }
    
    setIsPosting(false);
    messageApi.warning(t('posting_cancelled'));
  };

  // Import group IDs from file
  const importGroupIds = () => {
    fileInputRef.current.click();
  };

  // Handle table pagination
  const handleTableChange = (pagination) => {
    setPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

  // Pagination configuration
  const paginationConfig = {
    pageSizeOptions: ['10', '20', '50', '100'],
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total, range) => `${range[0]}-${range[1]} من ${total} عنصر`,
    className: 'pagination-right'
  };

  // Effect hook لاستئناف النشر عند تغيير isPaused (يعمل فقط عند استئناف العملية)
  useEffect(() => {
    if (isPosting && !isPaused) {
      processNext();
    }
  }, [isPaused]);

  // تنظيف المؤقتات عند إلغاء تحميل المكون
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Enhanced processNext function to only refund for failed posts
  const processNext = async () => {
    // الحصول على المجموعات المحددة بشكل محدث
    const selectedGroups = dataSource.filter(item => selectedRowKeys.includes(item.key));

    // التحقق من انتهاء جميع الصفوف أو إذا تم طلب الإيقاف
    if (currentIndexRef.current >= selectedGroups.length || !shouldContinueRef.current) {
      if (shouldContinueRef.current) {
        messageApi.success(t('posting_complete'));
        
        // Calculate points to refund
        const failedPosts = historyFailureCountRef.current;
        const pendingPosts = selectedGroups.slice(currentIndexRef.current).length;
        const totalRefund = failedPosts + pendingPosts;

        if (totalRefund > 0) {
          try {
            const token = localStorage.getItem('token');
            await axios.post('/api/add-points', 
              { 
                points: totalRefund,
                operation: 'refund',
                reason: t('points_refund_message', { pending: pendingPosts, failed: failedPosts })
              },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            
            messageApi.info(t('points_refunded', { total: totalRefund, failed: failedPosts, pending: pendingPosts }));
          } catch (error) {
            console.error('Error refunding points:', error);
            messageApi.error(t('points_refund_error'));
          }
        }
        
        // Save post history to database without all the console logs
        try {
          // Calculate accurate statistics for history
          const historySuccess = historySuccessCountRef.current;
          const historyFailure = historyFailureCountRef.current;
          const totalPosts = historySuccess + historyFailure;
          const successRate = totalPosts > 0 ? (historySuccess / totalPosts) * 100 : 0;
          const avgTime = totalPosts > 0 ? (totalTimeRef.current / 1000 / totalPosts) : 0;
          
          const historyEntry = {
            date: new Date().toISOString(),
            postType,
            groupCount: selectedGroups.length,
            successCount: historySuccess,
            failureCount: historyFailure,
            totalTime: totalTimeRef.current / 1000,
            successRate: successRate.toFixed(1),
            averageTime: avgTime.toFixed(2)
          };
          
          const token = localStorage.getItem('token');
          const response = await axios.post('/api/post-history', historyEntry, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.data && response.data._id) {
            // Update post history state with the new entry
            setPostHistory(prev => [response.data, ...prev]);
            
            // Create statistics object with accurate counts from refs
            const finalStats = {
              totalSuccess: historySuccess,
              totalFailed: historyFailure,
              successRate: successRate.toFixed(1),
              averageTime: avgTime.toFixed(2),
              totalTime: (totalTimeRef.current / 1000).toFixed(2),
              lastPostTime: new Date().toISOString()
            };
          
            // Show statistics with correct values
            setCurrentSessionStats(finalStats);
            setStatsModalVisible(true);
          } else {
            messageApi.warning(t('error_saving_history'));
          }
        } catch (error) {
          console.error('Error saving post history:', error);
          if (error.response) {
            console.error('Server response:', error.response.data);
          }
          messageApi.error(t('error_saving_history'));
          
          // Even if saving history fails, still show statistics
          const totalPosts = historySuccessCountRef.current + historyFailureCountRef.current;
          const successRate = totalPosts > 0 ? (historySuccessCountRef.current / totalPosts) * 100 : 0;
          const avgTime = totalPosts > 0 ? (totalTimeRef.current / 1000 / totalPosts) : 0;
          
          const fallbackStats = {
            totalSuccess: historySuccessCountRef.current,
            totalFailed: historyFailureCountRef.current,
            successRate: successRate.toFixed(1),
            averageTime: avgTime.toFixed(2),
            totalTime: (totalTimeRef.current / 1000).toFixed(2),
            lastPostTime: new Date().toISOString()
          };
          
          setCurrentSessionStats(fallbackStats);
          setStatsModalVisible(true);
        }
      }
      
      setIsPosting(false);
      setIsPaused(true);
      shouldContinueRef.current = true;
      setIsScheduled(false);
      setPostProgress(100);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      return;
    }

    // التأكد من أن العملية ليست متوقفة باستخدام المرجع لتفادي مشاكل الإغلاق
    if (pausedRef.current) return;

    // Update progress
    const progress = (currentIndexRef.current / selectedGroups.length) * 100;
    setPostProgress(progress);

    const currentGroup = selectedGroups[currentIndexRef.current];
    await postToFacebook(currentGroup.groupId);

    currentIndexRef.current++; // زيادة الفهرس الحالي مع التأخير إن كان مفعلًا
    if (!pausedRef.current && currentIndexRef.current < selectedGroups.length && shouldContinueRef.current) {
      if (enableDelay) {
        timeoutRef.current = setTimeout(processNext, delay * 1000);
      } else {
        processNext();
      }
    } else if (currentIndexRef.current >= selectedGroups.length || !shouldContinueRef.current) {
      // REMOVE DUPLICATE HISTORY SAVING CODE AND JUST CALL PROCESSNEXT AGAIN
      processNext();
    }
  };

  // Enhanced function with special focus on accurate statistics
  const showStatisticsWithDelay = (stats) => {
    // Get accurate counts directly from the data source without logging
    const realTimeSuccessCount = dataSource.filter(item => item.status === 'Success').length;
    const realTimeFailureCount = dataSource.filter(item => item.status === 'Failed').length;
    
    const totalPosts = realTimeSuccessCount + realTimeFailureCount;
    const successRate = totalPosts > 0 ? (realTimeSuccessCount / totalPosts) * 100 : 0;
    const avgTime = totalPosts > 0 ? (totalTimeRef.current / 1000 / totalPosts) : 0;
    
    const accurateStats = {
      totalSuccess: realTimeSuccessCount,
      totalFailed: realTimeFailureCount,
      successRate: successRate.toFixed(1),
      averageTime: avgTime.toFixed(2),
      totalTime: (totalTimeRef.current / 1000).toFixed(2),
      lastPostTime: new Date().toISOString()
    };
    
    // Update state
    setSuccessCount(realTimeSuccessCount);
    setFailureCount(realTimeFailureCount);
    setPostStats(accurateStats);
    setCurrentSessionStats(accurateStats);
    
    // Show modal
    setStatsModalVisible(true);
  };

  // Add the currentSessionStats state variable to the component state
  const [currentSessionStats, setCurrentSessionStats] = useState(null);

  // Add a new function to show statistics for a specific history record
  const showHistoryStatistics = (record) => {
    // Create statistics object from history record
    const historyStats = {
      totalSuccess: record.successCount,
      totalFailed: record.failureCount,
      successRate: record.successRate || 
        ((record.successCount + record.failureCount > 0) 
          ? ((record.successCount / (record.successCount + record.failureCount)) * 100).toFixed(1) 
          : "0.0"),
      averageTime: record.averageTime || 
        ((record.successCount + record.failureCount > 0) 
          ? (record.totalTime / (record.successCount + record.failureCount)).toFixed(2) 
          : "0.00"),
      totalTime: record.totalTime.toFixed(2),
      lastPostTime: record.date
    };
    
    setCurrentSessionStats(historyStats);
    setStatsModalVisible(true);
  };

  // Get confirmation message for batch operations
  const getBatchOperationConfirmationMessage = (operation) => {
    const selectedCount = selectedRowKeys.length;
    switch (operation) {
      case 'retryFailed':
        const failedPosts = dataSource.filter(item => 
          selectedRowKeys.includes(item.key) && item.status === 'Failed'
        ).length;
        return `هل أنت متأكد من إعادة محاولة ${failedPosts} منشور فاشل من المنشورات المحددة؟`;
      case 'retryAll':
        return `هل أنت متأكد من إعادة محاولة جميع المنشورات المحددة (${selectedCount} منشور)؟`;
      case 'cancelPending':
        const pendingPosts = dataSource.filter(item => 
          selectedRowKeys.includes(item.key) && item.status === 'Pending'
        ).length;
        return `هل أنت متأكد من إلغاء ${pendingPosts} منشور معلق من المنشورات المحددة؟`;
      case 'deleteSelected':
        return `هل أنت متأكد من حذف المنشورات المحددة (${selectedCount} منشور)؟`;
      case 'deleteAll':
        return `هل أنت متأكد من حذف جميع المنشورات (${dataSource.length} منشور)؟`;
      default:
        return 'هل أنت متأكد من تنفيذ هذا الإجراء؟';
    }
  };

  // Execute batch operation
  const executeBatchOperation = async (operation) => {
    setIsBatchProcessing(true);
    setBatchOperation(operation);
    setBatchProgress(0);
    setBatchStats({
      total: 0,
      processed: 0,
      success: 0,
      failed: 0
    });
    
    // Make a copy of the current dataSource state to work with
    const currentDataSource = [...dataSource];
    
    // Find items to process based on operation type
    let itemsToProcess = [];
    
    switch (operation) {
      case 'retryFailed':
        itemsToProcess = currentDataSource.filter(item => 
          selectedRowKeys.includes(item.key) && item.status === 'Failed'
        );
        break;
      case 'retryAll':
        itemsToProcess = currentDataSource.filter(item => 
          selectedRowKeys.includes(item.key)
        );
        break;
      case 'cancelPending':
        itemsToProcess = currentDataSource.filter(item => 
          selectedRowKeys.includes(item.key) && item.status === 'Pending'
        );
        break;
      case 'deleteSelected':
        itemsToProcess = currentDataSource.filter(item => 
          selectedRowKeys.includes(item.key)
        );
        break;
      case 'deleteAll':
        itemsToProcess = [...currentDataSource];
        break;
      default:
        itemsToProcess = [];
    }
    
    const totalItems = itemsToProcess.length;
    
    if (totalItems === 0) {
      messageApi.info(t('batch_no_items'));
      setIsBatchProcessing(false);
      return;
    }
    
    // Update batch stats with total count
    setBatchStats(prev => ({
      ...prev,
      total: totalItems
    }));
    
    // Handle cancelPending operation - update all at once
    if (operation === 'cancelPending') {
      // Create a new dataSource with updated status for pending items
      const newDataSource = dataSource.map(item => {
        if (selectedRowKeys.includes(item.key) && item.status === 'Pending') {
          return { ...item, status: 'Cancelled' };
        }
        return item;
      });
      
      // Update dataSource once with all changes
      setDataSource(newDataSource);
      
      // Update batch stats
      setBatchProgress(100);
      setBatchStats({
        total: totalItems,
        processed: totalItems,
        success: totalItems,
        failed: 0
      });
      
      messageApi.success(`تم إلغاء ${totalItems} منشور معلق بنجاح`);
      setIsBatchProcessing(false);
      return;
    }
    
    // Handle delete operations - update all at once
    if (operation === 'deleteSelected' || operation === 'deleteAll') {
      // Filter out items that should be deleted
      const newDataSource = operation === 'deleteSelected'
        ? dataSource.filter(item => !selectedRowKeys.includes(item.key))
        : []; // For deleteAll, just empty the array
      
      // Update dataSource with filtered results
      setDataSource(newDataSource);
      
      // Clear selected rows if deleting selected items
      if (operation === 'deleteSelected') {
        setSelectedRowKeys([]);
      }
      
      // Update batch stats
      setBatchProgress(100);
      setBatchStats({
        total: totalItems,
        processed: totalItems,
        success: totalItems,
        failed: 0
      });
      
      messageApi.success(`تم حذف ${totalItems} عنصر بنجاح`);
      setIsBatchProcessing(false);
      return;
    }
    
    // From here we handle retry operations (retryFailed or retryAll)
    const isRetryOperation = operation === 'retryFailed' || operation === 'retryAll';
    
    // For retry operations, calculate which items need points
    if (isRetryOperation) {
      // For retryFailed - count failed items, for retryAll - count non-success items
      const itemsNeedingRetry = operation === 'retryFailed'
        ? itemsToProcess.filter(item => item.status === 'Failed')
        : itemsToProcess.filter(item => item.status !== 'Success');
      
      const postsNeedingPoints = itemsNeedingRetry.length;
      
      if (postsNeedingPoints === 0) {
        messageApi.info('لا توجد منشورات تحتاج إعادة محاولة');
        setIsBatchProcessing(false);
        return;
      }
      
      // Check if user has enough points
      const pointsCheck = await checkPoints(postsNeedingPoints);
      if (!pointsCheck.hasEnough) {
        Modal.warning({
          title: t('insufficient_points'),
          content: (
            <div>
              <p>{t('insufficient_points_message')}</p>
              <p>{t('available_points')} <Text strong>{pointsCheck.currentPoints}</Text></p>
              <p>{t('required_points')} <Text strong>{postsNeedingPoints}</Text> {t('points_per_group')}</p>
            </div>
          ),
          okText: t('confirm')
        });
        setIsBatchProcessing(false);
        return;
      }
      
      // Confirm points deduction
      const confirmDeduction = await new Promise(resolve => {
        Modal.confirm({
          title: t('batch_confirm_title'),
          content: (
            <div>
              <p>{t('batch_confirm_message')}</p>
              <p>{t('selected_groups')} <Text strong>{postsNeedingPoints}</Text></p>
              <p>{t('available_points')} <Text strong>{pointsCheck.currentPoints}</Text></p>
            </div>
          ),
          okText: t('continue'),
          cancelText: t('cancel'),
          onOk: async () => {
            try {
              // Deduct points upfront
              await deductPoints(
                postsNeedingPoints,
                'batch_retry_upfront',
                t('points_retry_message', { count: postsNeedingPoints })
              );
              // Points deducted silently - removed notification message
              resolve(true);
            } catch (error) {
              console.error('Error deducting points:', error);
      messageApi.error(t('points_error'));
              resolve(false);
            }
          },
          onCancel: () => resolve(false)
        });
      });
      
      if (!confirmDeduction) {
        setIsBatchProcessing(false);
        return;
      }
      
      // Process retry operations
      let processed = 0;
      let success = 0;
      let failed = 0;
      let failedItems = []; // Track which items fail for refund
      
      // First, mark all items as Pending that will be retried
      const updatedDataSource = [...dataSource];
      for (const item of itemsNeedingRetry) {
        const index = updatedDataSource.findIndex(i => i.key === item.key);
        if (index !== -1) {
          updatedDataSource[index] = {
            ...updatedDataSource[index],
            status: 'Pending',
            errorMessage: null
          };
        }
      }
      setDataSource(updatedDataSource);
      
      // Process each item sequentially
      for (const item of itemsNeedingRetry) {
        try {
          // Only retry items that should be retried
          if ((operation === 'retryFailed' && item.status === 'Failed') ||
              (operation === 'retryAll' && item.status !== 'Success')) {
            
            // Get fresh copy of the current data source for each iteration
            const currentDs = [...dataSource];
            const itemIndex = currentDs.findIndex(i => i.key === item.key);
            
            if (itemIndex !== -1) {
              // Update UI to show Processing status
              setDataSource(prevDs => {
                const newDs = [...prevDs];
                const idx = newDs.findIndex(i => i.key === item.key);
                if (idx !== -1) {
                  newDs[idx] = {
                    ...newDs[idx],
                    status: 'Processing'
                  };
                }
                return newDs;
              });
              
              // Wait a moment for UI to update
              await new Promise(resolve => setTimeout(resolve, 50));
              
              // Perform the post operation
              const result = await postToFacebook(item.groupId);
              
              processed++;
              
              if (result) {
                success++;
              } else {
                failed++;
                failedItems.push(item.groupId);
              }
            } else {
              processed++;
              failed++;
              failedItems.push(item.groupId);
            }
          } else {
            // Skip items that don't need retry (already Success)
            processed++;
            success++;
          }
          
          // Update progress and stats
          const progress = Math.round((processed / itemsNeedingRetry.length) * 100);
          setBatchProgress(progress);
          setBatchStats({
            total: itemsNeedingRetry.length,
            processed,
            success,
            failed
          });
          
          // Add a small delay to avoid UI freezing
          await new Promise(resolve => setTimeout(resolve, 50));
          
        } catch (error) {
          console.error(`Error processing group ${item.groupId}:`, error);
          processed++;
          failed++;
          failedItems.push(item.groupId);
          
          // Update progress and stats
          const progress = Math.round((processed / itemsNeedingRetry.length) * 100);
          setBatchProgress(progress);
          setBatchStats({
            total: itemsNeedingRetry.length,
            processed,
            success,
            failed
          });
        }
      }
      
      // Deduplicate failed items
      const uniqueFailedItems = [...new Set(failedItems)];
      
      // Only refund points for items that actually failed
      if (uniqueFailedItems.length > 0) {
        try {
          const token = localStorage.getItem('token');
          await axios.post('/api/add-points', 
            { 
              points: uniqueFailedItems.length,
              operation: 'batch_refund',
              reason: t('points_refund_message', { pending: 0, failed: uniqueFailedItems.length })
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          // Points refunded silently - removed notification message
        } catch (error) {
          console.error('Error refunding points for failed batch posts:', error);
      messageApi.error(t('points_refund_error'));
        }
      }
      
      // Final success message
      messageApi.success(`تم الانتهاء من إجراء الدفعة. نجاح: ${success}, فشل: ${failed}`);
    }
  };

  // Close batch processing modal
  const closeBatchProcessingModal = () => {
    setIsBatchProcessing(false);
    setBatchOperation(null);
  };

  // Get batch operation title for the modal
  const getBatchOperationTitle = (operation) => {
    switch (operation) {
      case 'retryFailed':
        return t('batch_retry_failed');
      case 'retryAll':
        return t('batch_retry_all');
      case 'cancelPending':
        return t('batch_cancel_pending');
      case 'deleteSelected':
        return t('batch_delete_selected');
      case 'deleteAll':
        return t('batch_delete_all');
      default:
        return t('batch_operation');
    }
  };

  // Batch operation progress modal
  const renderBatchProgressModal = () => {
    return (
      <Modal
          title={`${t('batch_action')} - ${getBatchOperationTitle(batchOperation)}`}
          open={isBatchProcessing}
          onCancel={batchProgress === 100 ? closeBatchProcessingModal : null}
          footer={[
            <Button 
              key="close" 
              onClick={closeBatchProcessingModal}
              disabled={batchProgress < 100}
            >
              {batchProgress === 100 ? t('close') : t('batch_wait')}
            </Button>
        ]}
        closable={batchProgress === 100}
        maskClosable={batchProgress === 100}
        centered
      >
        <div style={{ marginBottom: 20 }}>
          <Progress 
            percent={batchProgress} 
            status={batchProgress < 100 ? "active" : "success"} 
            format={percent => `${percent}% (${batchStats.processed}/${batchStats.total})`}
          />
        </div>
        
        <Row gutter={16}>
          <Col span={12}>
            <Statistic 
              title={t('batch_total')}
              value={batchStats.total}
              suffix={t('batch_item')}
            />
          </Col>
          <Col span={12}>
            <Statistic 
              title={t('batch_processed')}
              value={batchStats.processed}
              suffix={t('batch_item')}
            />
          </Col>
        </Row>
        
        <Divider style={{ margin: '16px 0' }} />
        
        <Row gutter={16}>
          <Col span={12}>
            <Statistic 
              title={t('batch_success')}
              value={batchStats.success}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={12}>
            <Statistic 
              title={t('batch_failed')}
              value={batchStats.failed}
              valueStyle={{ color: '#f5222d' }}
            />
          </Col>
        </Row>
      </Modal>
    );
  };

  // Get status tag for scheduled post
  const getScheduledPostStatusTag = (status) => {
    switch (status) {
      case 'completed':
        return <Tag color="success" icon={<CheckCircleOutlined />}>{t('scheduled_complete')}</Tag>;
      case 'failed':
        return <Tag color="error" icon={<StopOutlined />}>{t('scheduled_failed')}</Tag>;
      case 'processing':
        return <Tag color="processing" icon={<LoadingOutlined />}>{t('scheduled_processing')}</Tag>;
      case 'canceled':
        return <Tag color="default" icon={<DeleteOutlined />}>{t('scheduled_canceled')}</Tag>;
      case 'pending':
      default:
        return <Tag color="warning" icon={<ClockCircleOutlined />}>{t('scheduled_pending')}</Tag>;
    }
  };

  // Prepare tab items for Tabs component
  const tabItems = [
    {
      key: "post",
      label: t('tab_post'),
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card 
              title={
                <div className="card-header-with-icon">
                  <EditOutlined style={{ marginLeft: 8 }} />
                  <span>{t('post_content')}</span>
                </div>
              }
              size="small" 
              variant="bordered"
              className="enhanced-card"
            >
              <div className="section-title">{t('post_type')}</div>
              <Radio.Group 
                onChange={(e) => setPostType(e.target.value)} 
                value={postType}
                className="radio-group"
                buttonStyle="solid"
              >
                <Radio.Button value="text">{t('post_type_text')}</Radio.Button>
                <Radio.Button value="imageUrl">{t('post_type_image')}</Radio.Button>
                <Radio.Button value="videoUrl">{t('post_type_video')}</Radio.Button>
              </Radio.Group>
              
              <div className="section-title" style={{ marginTop: 20 }}>{t('post_text')}</div>
              <div style={{ display: 'flex', marginBottom: 12, gap: 8 }}>
                <Button 
                  type="primary"
                  onClick={openTemplateEditor}
                  icon={<SettingOutlined />}
                >
                  {t('template_editor')}
                </Button>
                <Button 
                  onClick={previewProcessedTemplate}
                  disabled={!messageText.trim()}
                  icon={<EyeOutlined />}
                  type="default"
                >
                  {t('preview_template')}
                </Button>
                <Tooltip title={t('quick_variables')} placement="topRight">
                  <Button 
                    icon={<QuestionCircleOutlined />}
                    onClick={() => {
                      Modal.info({
                        title: t('quick_variables'),
                        content: (
                          <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
                            <p>{t('quick_variables_intro')}</p>
                            <ul>
                              <li><b>{'{DATE}'}</b> - {t('var_date')}</li>
                              <li><b>{'{TIME}'}</b> - {t('var_time')}</li>
                              <li><b>{'{DAY}'}</b> - {t('var_day')}</li>
                              <li><b>{'{RANDOM}'}</b> - {t('var_random')}</li>
                              <li><b>{'{RANDOM:1:100}'}</b> - {t('var_random_range', {min: 1, max: 100})}</li>
                              <li><b>{'{UUID}'}</b> - {t('var_uuid')}</li>
                            </ul>
                            <p>{t('quick_variables_more')}</p>
                          </div>
                        ),
                        okText: t('confirm'),
                      });
                    }}
                    type="default"
                  />
                </Tooltip>
              </div>
              <TextArea
                rows={5}
                placeholder={t('post_text_placeholder')}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="textarea-enhanced"
              />
              
              {postType === 'imageUrl' && (
                <>
                  <div className="section-title" style={{ marginTop: 16 }}>{t('image_url')}</div>
                  <Input
                    placeholder={t('image_url_placeholder')}
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="input-enhanced"
                    prefix={<LinkOutlined />}
                  />
                </>
              )}
              
              {postType === 'videoUrl' && (
                <>
                  <div className="section-title" style={{ marginTop: 16 }}>{t('video_url')}</div>
                  <Input
                    placeholder={t('video_url_placeholder')}
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="input-enhanced"
                    prefix={<VideoCameraOutlined />}
                  />
                </>
              )}
              
              <div className="section-title" style={{ marginTop: 16 }}>{t('post_options')}</div>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space align="center" className="delay-settings">
                  <Switch
                    checked={enableRandomCode}
                    onChange={(checked) => setEnableRandomCode(checked)}
                  />
                  <span>{t('random_code')}</span>
                </Space>
                
                <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                  <Button 
                    icon={<EyeOutlined />} 
                    onClick={() => setShowPreview(true)}
                    disabled={postType === 'text' ? !messageText.trim() : 
                             postType === 'imageUrl' ? (!messageText.trim() || !imageUrl.trim()) : 
                             (!messageText.trim() || !videoUrl.trim())}
                    type="default"
                  >
                    {t('preview')}
                  </Button>
                  <Button 
                    icon={<SaveOutlined />} 
                    onClick={() => setSaveTemplateModalVisible(true)}
                    disabled={!messageText.trim()}
                    type="default"
                  >
                    {t('save_as_template')}
                  </Button>
                </div>
              </Space>
            </Card>
          </Col>
          
          <Col xs={24} md={12}>
            <Card 
              title={
                <div className="card-header-with-icon">
                  <SettingOutlined style={{ marginLeft: 8 }} />
                  <span>{t('post_settings')}</span>
                </div>
              }
              size="small" 
              variant="bordered"
              className="enhanced-card"
            >
              <div className="section-title">{t('delay_settings')}</div>
              <Space align="center" wrap className="delay-settings">
                <Switch 
                  checked={enableDelay} 
                  onChange={(checked) => setEnableDelay(checked)}
                />
                <span>{t('enable_delay')}</span>
                {enableDelay && (
                  <InputNumber
                    min={1}
                    max={3600}
                    value={delay}
                    onChange={(value) => setDelay(value)}
                    addonAfter={t('delay_seconds')}
                    className="delay-input"
                  />
                )}
              </Space>
              
              {/* Retry settings removed */}
              
              <div className="section-title" style={{ marginTop: 20 }}>{t('scheduling')}</div>
              <Space direction="vertical" style={{ width: '100%' }}>
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm:ss"
                  placeholder={t('choose_post_time')}
                  onChange={value => setScheduledTime(value)}
                  disabledDate={current => current && current < moment().startOf('day')}
                  disabled={isPosting || isScheduled}
                  style={{ width: '100%' }}
                  className="date-picker-enhanced"
                />
                
                <Space style={{ marginTop: 12 }}>
                  {isScheduled ? (
                    <Button 
                      danger 
                      onClick={cancelScheduledPost}
                      icon={<DeleteOutlined />}
                    >
                      {t('cancel_schedule')}
                    </Button>
                  ) : (
                    <Button 
                      type="primary" 
                      onClick={schedulePost}
                      icon={<ClockCircleOutlined />}
                      disabled={!scheduledTime || isPosting || selectedRowKeys.length === 0}
                    >
                      {t('schedule_post')}
                    </Button>
                  )}
                </Space>
                
                <div className="info-box">
                  <InfoCircleOutlined style={{ marginLeft: 8 }} />
                  <span>{t('schedule_info')}</span>
                </div>
              </Space>
            </Card>
            
            {/* Post Progress Card - We've removed this as per requirements */}
          </Col>
          
          <Col xs={24}>
            <Divider>
              <Space>
                <ImportOutlined />
                {t('import_groups')}
              </Space>
            </Divider>
          </Col>
          
          <Col xs={24}>
            <div className="import-buttons-container">
              <Button 
                icon={<ImportOutlined />}
                onClick={importGroupIds}
                className="import-button"
                type="default"
                size="large"
              >
                {t('import_from_file')}
              </Button>
              <input 
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileUpload}
                accept=".txt,.csv"
              />
              <Button 
                icon={<FileTextOutlined />}
                onClick={() => setImportModalVisible(true)}
                className="import-button"
                type="default"
                size="large"
              >
                {t('import_from_text')}
              </Button>
              <Button 
                icon={<ImportOutlined />}
                onClick={importGroupsFromFacebook}
                loading={importingGroups}
                className="import-button"
                type="primary"
                size="large"
              >
                {t('import_from_facebook')}
              </Button>
              
              {dataSource.length > 0 && (
                <Button 
                  icon={<SaveOutlined />}
                  onClick={() => setSaveGroupsModalVisible(true)}
                  className="import-button"
                  type="default"
                  size="large"
                >
                  {t('save_group_list')}
                </Button>
              )}
            </div>
          </Col>
          
          <Col xs={24}>
            <Card 
              title={
                <div className="card-header-with-icon">
                  <UnorderedListOutlined style={{ marginLeft: 8 }} />
                  <span>{t('imported_groups')}</span>
                </div>
              }
              className="groups-card enhanced-card" 
              size="small" 
              bordered
              extra={
                <div className="card-extra-container">
                  {dataSource.length > 0 && (
                    <Button 
                      type="primary" 
                      icon={<PlayCircleOutlined />}
                      onClick={startPosting}
                      disabled={selectedRowKeys.length === 0 || isScheduled}
                      className="action-button"
                      size="middle"
                    >
                      {t('start_posting')}
                    </Button>
                  )}
                </div>
              }
            >
              <div className="filter-search-container">
                <Row gutter={[16, 16]} align="middle">
                  <Col xs={24} md={16}>
                    <Input.Search
                      placeholder={t('group_table_search')}
                      value={searchText}
                      onChange={e => setSearchText(e.target.value)}
                      style={{ width: '100%' }}
                      allowClear
                      prefix={<SearchOutlined />}
                      className="search-input-enhanced"
                    />
                  </Col>
                  <Col xs={24} md={8}>
                    <Select
                      style={{ width: '100%' }}
                      value={groupTypeFilter}
                      onChange={setGroupTypeFilter}
                      placeholder={t('group_table_privacy')}
                      className="select-enhanced"
                      suffixIcon={<FilterOutlined />}
                    >
                      <Option value="all">{t('group_table_privacy_all')}</Option>
                      <Option value="OPEN">{t('group_public')}</Option>
                      <Option value="CLOSED">{t('group_closed')}</Option>
                      <Option value="SECRET">{t('group_secret')}</Option>
                    </Select>
                  </Col>
                </Row>
              </div>
              
              {/* Group count summary */}
              <div className="stats-summary-container">
                <Alert
                  message={
                    <div className="stats-row">
                      <Statistic 
                        title={t('total_groups')} 
                        value={dataSource.length} 
                        valueStyle={{ fontSize: '18px', color: '#1890ff' }}
                        prefix={<UnorderedListOutlined />}
                      />
                      <Statistic 
                        title={t('selected_count')} 
                        value={selectedRowKeys.length} 
                        valueStyle={{ fontSize: '18px', color: '#52c41a' }}
                        prefix={<CheckCircleOutlined />}
                      />
                    </div>
                  }
                  type="info"
                  showIcon
                />
              </div>
              
              {/* Bulk actions */}
              {dataSource.length > 0 && (
                <div className="actions-container">
                  <Space wrap className="action-buttons-left">
                    <Button
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        if (selectedRowKeys.length === 0) {
                          messageApi.info(t('select_groups_first'));
                          return;
                        }
                        
                        Modal.confirm({
                          title: t('delete_selected_groups'),
                          content: t('delete_selected_confirm', { count: selectedRowKeys.length }),
                          okText: t('yes'),
                          okButtonProps: { danger: true },
                          cancelText: t('cancel'),
                          onOk: () => {
                            const newDataSource = dataSource.filter(item => !selectedRowKeys.includes(item.key));
                            setDataSource(newDataSource);
                            setSelectedRowKeys([]);
                            messageApi.success(t('groups_delete_success', { count: selectedRowKeys.length }));
                          }
                        });
                      }}
                      type="default"
                    >
                      {t('delete_selected')}
                    </Button>
                    
                    <Button
                      icon={<CheckCircleOutlined />}
                      onClick={() => {
                        // Select all groups
                        const allKeys = dataSource.map(item => item.key);
                        setSelectedRowKeys(allKeys);
                      }}
                      type="default"
                    >
                      {t('select_all')}
                    </Button>
                    
                    <Button
                      onClick={() => setSelectedRowKeys([])}
                      disabled={selectedRowKeys.length === 0}
                      type="default"
                    >
                      {t('clear_selection')}
                    </Button>
                  </Space>
                  
                  <Space wrap className="action-buttons-right">
                    <Button
                      type="primary"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        Modal.confirm({
                          title: t('delete_by_type'),
                          content: (
                            <div>
                              <p>{t('groups_delete_confirm')}</p>
                              <p>{t('groups_type')} <Text strong>{
                                groupTypeFilter === 'OPEN' ? t('group_public') :
                                groupTypeFilter === 'CLOSED' ? t('group_closed') :
                                groupTypeFilter === 'SECRET' ? t('group_secret') : t('group_table_privacy_all')
                              }</Text></p>
                              <p>{t('groups_count')} <Text strong>{
                                groupTypeFilter === 'all' ? 
                                  dataSource.length : 
                                  dataSource.filter(item => item.Privacy_Group === groupTypeFilter).length
                              }</Text></p>
                            </div>
                          ),
                          okText: t('yes'),
                          okButtonProps: { danger: true },
                          cancelText: t('cancel'),
                          onOk: () => {
                            const newDataSource = dataSource.filter(item => 
                              groupTypeFilter === 'all' ? false : item.Privacy_Group !== groupTypeFilter
                            );
                            
                            const deletedCount = dataSource.length - newDataSource.length;
                            
                            // Update selected keys
                            const newSelectedKeys = selectedRowKeys.filter(key => {
                              const item = dataSource.find(i => i.key === key);
                              return item && (groupTypeFilter === 'all' ? false : item.Privacy_Group !== groupTypeFilter);
                            });
                            
                            setDataSource(newDataSource);
                            setSelectedRowKeys(newSelectedKeys);
                            setGroupTypeFilter('all');
                            messageApi.success(t('groups_delete_success', { count: deletedCount }));
                          }
                        });
                      }}
                    >
                      {t('delete_by_type')}
                    </Button>
                  </Space>
                </div>
              )}
              
              {/* Groups display as cards with enhanced styling */}
              {dataSource.length > 0 ? (
                <div className="groups-grid-enhanced">
                  {dataSource
                    .filter(item => {
                      const matchesSearch = searchText ? 
                        (item.Name_Group?.toLowerCase().includes(searchText.toLowerCase()) ||
                         item.groupId?.toLowerCase().includes(searchText.toLowerCase())) : true;
                      
                      const matchesType = groupTypeFilter === 'all' ? true : 
                        item.Privacy_Group === groupTypeFilter;
                      
                      return matchesSearch && matchesType;
                    })
                    .map(item => (
                      <Card 
                        key={item.key} 
                        size="small" 
                        className={`group-card-enhanced ${selectedRowKeys.includes(item.key) ? 'selected-card' : ''}`}
                        style={{ 
                          borderColor: selectedRowKeys.includes(item.key) ? '#1890ff' : '#d9d9d9',
                          background: selectedRowKeys.includes(item.key) ? '#e6f7ff' : 'white',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          if (selectedRowKeys.includes(item.key)) {
                            setSelectedRowKeys(selectedRowKeys.filter(key => key !== item.key));
                          } else {
                            setSelectedRowKeys([...selectedRowKeys, item.key]);
                          }
                        }}
                      >
                        <Checkbox 
                          checked={selectedRowKeys.includes(item.key)}
                          className="group-card-checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRowKeys([...selectedRowKeys, item.key]);
                            } else {
                              setSelectedRowKeys(selectedRowKeys.filter(key => key !== item.key));
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        
                        <div className="group-card-content">
                          <div className="group-card-header">
                            <Button
                              type="text"
                              danger
                              size="small"
                              icon={<DeleteOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                removeGroup(item.groupId);
                              }}
                              className="delete-btn"
                            />
                            <a 
                              href={`https://facebook.com/groups/${item.groupId}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="group-link"
                            >
                              {item.Name_Group || item.groupId}
                            </a>
                          </div>
                                                    
                            <div className="group-meta-tags">
                              {item.Privacy_Group && (
                                <Tag color={
                                  item.Privacy_Group === 'OPEN' ? 'green' :
                                  item.Privacy_Group === 'CLOSED' ? 'blue' :
                                  item.Privacy_Group === 'SECRET' ? 'red' : 'default'
                                }>
                                  {item.Privacy_Group === 'OPEN' ? t('group_public') :
                                   item.Privacy_Group === 'CLOSED' ? t('group_closed') :
                                   item.Privacy_Group === 'SECRET' ? t('group_secret') : item.Privacy_Group}
                                </Tag>
                              )}
                              
                              {item.member_count && (
                                <Tooltip title={t('member_count')}>
                                  <Tag color="blue" icon={<UserOutlined />}>{item.member_count}</Tag>
                                </Tooltip>
                              )}
                            </div>
                          
                          {item.errorMessage && (
                            <div className="group-error-message">
                              <Tooltip title={item.errorMessage}>
                                <div>
                                  <InfoCircleOutlined />
                                  <span>{item.errorMessage}</span>
                                </div>
                              </Tooltip>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                </div>
              ) : (
                <Empty 
                  description={t('no_groups_imported')} 
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  className="empty-state"
                />
              )}
              
              {/* Pagination if needed for large datasets */}
              {dataSource.length > 20 && (
                <div className="pagination-container">
                  <Pagination
                    current={page}
                    pageSize={pageSize}
                    total={dataSource.length}
                    onChange={(p, ps) => {
                      setPage(p);
                      setPageSize(ps);
                    }}
                    showSizeChanger
                    showQuickJumper
                    showTotal={(total) => `${total} ${t('total_items')}`}
                    className="pagination-enhanced"
                  />
                </div>
              )}
            </Card>
          </Col>
          
          {error && (
            <Col xs={24}>
              <Alert 
                message={error} 
                type="error" 
                showIcon 
                className="error-alert-enhanced"
              />
            </Col>
          )}
        </Row>
      )
    },
    {
      key: "templates",
      label: t('Saved_templates'),
      children: (
        <Row gutter={[16, 16]}>
          {templatesLoading ? (
            <Col xs={24} className="loading-container-enhanced">
              <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
              <div>{t('loading')}</div>
            </Col>
          ) : savedTemplates.length > 0 ? (
            savedTemplates.map(template => (
              <Col xs={24} sm={12} md={8} lg={6} key={template._id}>
                <Card 
                  title={
                    <div className="template-card-title">
                      <EditOutlined className="title-icon" />
                      <span>{template.name}</span>
                    </div>
                  }
                  size="small"
                  className="template-card"
                  extra={
                    <Popconfirm 
                      title={t('template_delete_confirm')}
                      onConfirm={() => deleteTemplate(template._id)}
                      okText={t('yes')}
                      cancelText={t('no')}
                    >
                      <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  }
                  actions={[
                    <Button type="link" onClick={() => loadTemplate(template)} icon={<ImportOutlined />}>{t('template_load')}</Button>
                  ]}
                >
                  <div className="template-meta-tags">
                    <Tag color="blue">{template.type === 'text' ? t('post_type_text') : template.type === 'imageUrl' ? t('post_type_image') : t('post_type_video')}</Tag>
                    {template.withRandomCode && <Tag color="green">{t('random_code')}</Tag>}
                  </div>
                  <Paragraph ellipsis={{ rows: 3 }} className="template-content">
                    {template.text}
                  </Paragraph>
                  <div className="template-footer">
                    <ClockCircleOutlined className="time-icon" />
                    <span>{moment(template.createdAt).format('YYYY-MM-DD HH:mm')}</span>
                  </div>
                </Card>
              </Col>
            ))
          ) : (
            <Col xs={24}>
              <Empty description={t('no_templates')} className="empty-state-enhanced" />
            </Col>
          )}
        </Row>
      )
    },
    {
      key: "groups",
      label: t('Group_Lists'),
      children: (
        <Row gutter={[16, 16]}>
          {groupsLoading ? (
            <Col xs={24} className="loading-container-enhanced">
              <LoadingOutlined style={{ fontSize: 24 }} spin />
              <div>{t('loading')}</div>
            </Col>
          ) : savedGroups.length > 0 ? (
            savedGroups.map(groupList => (
              <Col xs={24} sm={12} md={8} lg={6} key={groupList._id}>
                <Card 
                  title={
                    <div className="group-list-title">
                      <UnorderedListOutlined className="title-icon" />
                      <span>{groupList.name}</span>
                    </div>
                  }
                  size="small"
                  className="group-list-card"
                  extra={
                    <Popconfirm 
                      title={t('group_list_delete_confirm')}
                      onConfirm={() => deleteGroupList(groupList._id)}
                      okText={t('yes')}
                      cancelText={t('no')}
                    >
                      <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  }
                  actions={[
                    <Button type="link" onClick={() => loadGroupList(groupList)} icon={<ImportOutlined />}>{t('group_list_load')}</Button>
                  ]}
                >
                  <Statistic 
                    title={t('group_list_groups_count')} 
                    value={groupList.groups.length} 
                    valueStyle={{ color: '#1890ff' }}
                    prefix={<UnorderedListOutlined />}
                  />
                  <div className="group-list-footer">
                    <ClockCircleOutlined className="time-icon" />
                    <span>{moment(groupList.createdAt).format('YYYY-MM-DD HH:mm')}</span>
                  </div>
                </Card>
              </Col>
            ))
          ) : (
            <Col xs={24}>
              <Empty description={t('no_groups')} className="empty-state-enhanced" />
            </Col>
          )}
        </Row>
      )
    },
    {
      key: "history",
      label: t('Posting_record'),
      children: (
        <Row gutter={[16, 16]}>
          {/* Add warning message about 24-hour retention */}
          <Col xs={24}>
            <Alert
              message={t('history_warning')}
              description={t('history_retention')}
              type="warning"
              showIcon
              className="alert-enhanced"
            />
          </Col>
          
          {/* Tabs for post history and active jobs */}
          <Col xs={24}>
            {/* Combined Post History and Active Jobs into a unified interface */}
            <Row gutter={[16, 16]}>
              <Col xs={24}>
                <Card 
                  title={
                    <div className="history-card-title">
                      <HistoryOutlined className="title-icon" />
                      <span>{t('Posting_record')}</span>
                    </div>
                  }
                  className="history-card"
                  extra={
                    <Button 
                      type="primary" 
                      icon={<ReloadOutlined />} 
                      onClick={() => {
                        fetchPostHistory();
                        fetchInstantGroupPosts();
                      }}
                    >
                      {t('refresh_data')}
                    </Button>
                  }
                >
                  <Tabs 
                    activeKey={activeHistoryTab} 
                    onChange={setActiveHistoryTab}
                    className="history-tabs"
                  >
                    <Tabs.TabPane 
                      tab={
                        <span className="tab-label">
                          <HistoryOutlined className="tab-icon" />
                          {t('Post_History')}
                        </span>
                      }
                      key="post-history"
                    >
                      {historyLoading ? (
                        <div className="loading-container-enhanced">
                          <LoadingOutlined style={{ fontSize: 24 }} spin />
                          <div>{t('loading')}</div>
                        </div>
                      ) : postHistory.length > 0 ? (
                        <Table
                          columns={[
                            {
                              title: t('history_date'),
                              dataIndex: 'date',
                              key: 'date',
                              render: (date) => moment(date).format('YYYY-MM-DD HH:mm:ss')
                            },
                            {
                              title: t('history_post_type'),
                              dataIndex: 'postType',
                              key: 'postType',
                              render: (type) => type === 'text' ? t('post_type_text') : type === 'imageUrl' ? t('post_type_image') : t('post_type_video')
                            },
                            {
                              title: t('history_group_count'),
                              dataIndex: 'groupCount',
                              key: 'groupCount',
                            },
                            {
                              title: t('history_success'),
                              dataIndex: 'successCount',
                              key: 'successCount',
                              render: (count) => {
                                const safeCount = typeof count === 'number' ? count : 0;
                                return <Text style={{ color: '#52c41a' }}>{safeCount}</Text>;
                              }
                            },
                            {
                              title: t('history_failure'),
                              dataIndex: 'failureCount',
                              key: 'failureCount',
                              render: (count) => {
                                const safeCount = typeof count === 'number' ? count : 0;
                                return <Text style={{ color: '#f5222d' }}>{safeCount}</Text>;
                              }
                            },
                            {
                              title: t('history_success_rate'),
                              dataIndex: 'successRate',
                              key: 'successRate',
                              render: (rate, record) => {
                                // If successRate is available, use it, otherwise calculate it
                                const successRate = rate || (
                                  (record.successCount + record.failureCount > 0) 
                                    ? ((record.successCount / (record.successCount + record.failureCount)) * 100).toFixed(1) 
                                    : "0.0"
                                );
                                return <Text>{successRate}%</Text>;
                              }
                            },
                            {
                              title: t('history_total_time'),
                              dataIndex: 'totalTime',
                              key: 'totalTime',
                              render: (time) => {
                                const safeTime = typeof time === 'number' ? time.toFixed(2) : '0.00';
                                return `${safeTime} ${t('seconds_unit')}`;
                              }
                            },
                            {
                              title: t('history_avg_time'),
                              dataIndex: 'averageTime',
                              key: 'averageTime',
                              render: (avgTime, record) => {
                                // If averageTime is available, use it, otherwise calculate it
                                const average = avgTime || (
                                  (record.successCount + record.failureCount > 0) 
                                    ? (record.totalTime / (record.successCount + record.failureCount)).toFixed(2) 
                                    : "0.00"
                                );
                                return `${average} ثانية`;
                              }
                            },
                            // Actions column with only statistics view
                            {
                              title: t('history_actions'),
                              key: 'actions',
                              width: 80,
                              render: (_, record) => (
                                <Space>
                                  <Tooltip title={t('history_show_stats')}>
                                    <Button 
                                      type="text" 
                                      size="small" 
                                      icon={<HistoryOutlined />} 
                                      onClick={() => showHistoryStatistics(record)} 
                                      className="action-button-enhanced"
                                    />
                                  </Tooltip>
                                </Space>
                              ),
                            },
                          ]}
                          dataSource={postHistory.map(item => ({
                            ...item,
                            key: item._id || `history-${Date.now()}-${Math.random()}`
                          }))}
                          pagination={{ pageSize: 10 }}
                          rowKey={record => record.key}
                          className="table-enhanced"
                        />
                      ) : (
                        <Empty description={t('no_history')} className="empty-state-enhanced" />
                      )}
                    </Tabs.TabPane>
                    
                    <Tabs.TabPane 
                      tab={
                        <span className="tab-label">
                          <PlayCircleOutlined className="tab-icon" />
                          {t('Active_Jobs')}
                          {instantGroupPosts.length > 0 && (
                            <Badge count={instantGroupPosts.length} className="tab-badge" />
                          )}
                        </span>
                      } 
                      key="active-jobs"
                    >
                      <div>
                        <Alert
                          message={t('instant_jobs_info') || "Active Background Operations"}
                          description={t('instant_jobs_description') || "Posts being processed in the background. You can browse the site while these operations complete."}
                          type="info"
                          showIcon
                          className="alert-enhanced"
                        />
                        
                        {instantGroupPostsLoading ? (
                          <div className="loading-container-enhanced">
                            <Spin size="large" />
                            <div>{t('loading')}</div>
                          </div>
                        ) : instantGroupPosts.length > 0 ? (
                          <Table
                            dataSource={instantGroupPosts.map(post => ({ ...post, key: post._id }))}
                            columns={[
                              {
                                title: t('job_creation_time') || "Created At",
                                dataIndex: 'createdAt',
                                key: 'createdAt',
                                render: time => moment(time).format('YYYY-MM-DD HH:mm:ss'),
                                sorter: (a, b) => moment(a.createdAt).diff(moment(b.createdAt))
                              },
                              {
                                title: t('job_status') || "Status",
                                dataIndex: 'status',
                                key: 'status',
                                render: status => {
                                  switch (status) {
                                    case 'completed':
                                      return <Tag color="success" icon={<CheckCircleOutlined />}>{t('status_completed') || "Completed"}</Tag>;
                                    case 'failed':
                                      return <Tag color="error" icon={<StopOutlined />}>{t('status_failed') || "Failed"}</Tag>;
                                    case 'processing':
                                      return <Tag color="processing" icon={<LoadingOutlined />}>{t('status_processing') || "Processing"}</Tag>;
                                    case 'canceled':
                                      return <Tag color="default" icon={<DeleteOutlined />}>{t('status_canceled') || "Canceled"}</Tag>;
                                    case 'pending':
                                    default:
                                      return <Tag color="warning" icon={<ClockCircleOutlined />}>{t('status_pending') || "Pending"}</Tag>;
                                  }
                                }
                              },
                              {
                                title: t('post_type') || "Post Type",
                                dataIndex: 'postType',
                                key: 'postType',
                                render: type => type === 'text' ? (t('post_type_text') || "Text") : type === 'imageUrl' ? (t('post_type_image') || "Image") : (t('post_type_video') || "Video")
                              },
                              {
                                title: t('group_count') || "Groups",
                                dataIndex: 'groups',
                                key: 'groupCount',
                                render: groups => Array.isArray(groups) ? groups.length : 0
                              },
                              {
                                title: t('progress') || "Progress",
                                key: 'progress',
                                render: (_, record) => {
                                  const total = Array.isArray(record.groups) ? record.groups.length : 0;
                                  
                                  // Get more accurate progress counts from results or fall back to success/failure counts
                                  let processed = 0;
                                  let success = 0;
                                  let failure = 0;
                                  
                                  // Check if results exist and is an array for most accurate count
                                  if (record.results && Array.isArray(record.results)) {
                                    processed = record.results.length;
                                    success = record.results.filter(r => r.success).length;
                                    failure = record.results.filter(r => !r.success).length;
                                  } else {
                                    // Fall back to stored counts
                                    success = record.successCount || 0;
                                    failure = record.failureCount || 0;
                                    processed = success + failure;
                                  }
                                  
                                  // For completed posts, set to 100%
                                  const percent = record.status === 'completed' ? 100 : 
                                                 record.status === 'failed' ? 100 :
                                                 record.status === 'canceled' ? 100 :
                                                 (total > 0 ? Math.round((processed / total) * 100) : 0);
                                  
                                  // Format display text based on status
                                  let statusText = '';
                                  if (record.status === 'pending') {
                                    statusText = t('status_pending') || 'Pending';
                                  } else if (record.status === 'processing') {
                                    statusText = `${processed}/${total} (${percent}%)`;
                                  } else if (record.status === 'completed') {
                                    statusText = `${t('status_completed') || 'Completed'} (${success}/${total})`;
                                  } else if (record.status === 'failed') {
                                    statusText = t('status_failed') || 'Failed';
                                  } else if (record.status === 'canceled') {
                                    statusText = t('status_canceled') || 'Canceled';
                                  }
                                  
                                  return (
                                    <div className="progress-container">
                                      <Progress 
                                        percent={percent} 
                                        size="small" 
                                        status={
                                          record.status === 'failed' ? "exception" :
                                          record.status === 'completed' ? "success" :
                                          record.status === 'canceled' ? "normal" : "active"
                                        }
                                        format={() => statusText}
                                        className="progress-enhanced"
                                      />
                                      {(record.status === 'processing' || record.status === 'completed') && (
                                        <div className="progress-stats">
                                          <div className="stat-tags">
                                            <Tag color="success" style={{ marginRight: 3 }}>{success}</Tag>
                                            <Tag color="error">{failure}</Tag>
                                          </div>
                                          {record.status === 'processing' && (
                                            <Tag color="processing">{t('in_progress') || 'In Progress'}</Tag>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                              },
                              {
                                title: t('results') || "Results",
                                key: 'results',
                                render: (_, record) => {
                                  // Get actual success/failure counts from the results
                                  let success = 0;
                                  let failure = 0;
                                  
                                  // Check if results exist and is an array
                                  if (record.results && Array.isArray(record.results)) {
                                    success = record.results.filter(r => r.success).length;
                                    failure = record.results.filter(r => !r.success).length;
                                  } else {
                                    // Fallback to sent/failed if results array isn't available
                                    success = record.sent || 0;
                                    failure = record.failed || 0;
                                  }
                                  
                                  return (
                                    <Space>
                                      <Tag color="success">{success} {t('status_success') || "Success"}</Tag>
                                      <Tag color="error">{failure} {t('status_failed') || "Failed"}</Tag>
                                    </Space>
                                  );
                                }
                              },
                              {
                                title: t('actions') || "Actions",
                                key: 'actions',
                                render: (_, record) => (
                                  <Space>
                                    {(record.status === 'pending' || record.status === 'processing') && (
                                      <Tooltip title={t('cancel_job') || "Cancel Job"}>
                                        <Popconfirm
                                          title={t('confirm_cancel_job') || "Are you sure you want to cancel this job?"}
                                          onConfirm={() => cancelInstantGroupPost(record._id)}
                                          okText={t('yes')}
                                          cancelText={t('no')}
                                        >
                                          <Button 
                                            type="text" 
                                            icon={<StopOutlined />} 
                                            className="action-button-enhanced"
                                          />
                                        </Popconfirm>
                                      </Tooltip>
                                    )}
                                    
                                      {/* show_stats button removed as it was redundant and not working correctly */}
                                      
                                      {(record.status === 'completed' || record.status === 'failed' || record.status === 'canceled') && (
                                        <Tooltip title={t('delete_record') || "Delete Record"}>
                                          <Popconfirm
                                            title={t('confirm_delete_record') || "Are you sure you want to delete this record?"}
                                            onConfirm={async () => {
                                              messageApi.loading(t('deleting_record') || "Deleting record...");
                                              try {
                                                const token = localStorage.getItem('token');
                                                messageApi.loading(t('deleting_record') || "Deleting record...", 1);
                                                
                                                // Make the API call to delete the record on the server
                                                await axios.delete(`/api/instant-group-posts/${record._id}`, {
                                                  headers: {
                                                    Authorization: `Bearer ${token}`
                                                  }
                                                });
                                                
                                                // First update local state to provide immediate feedback
                                                setInstantGroupPosts(prevPosts => 
                                                  prevPosts.filter(post => post._id !== record._id)
                                                );
                                                
                                                // Show success message
                                                messageApi.success(t('record_deleted') || "Record deleted successfully");
                                                
                                                // Then refresh both data lists to ensure consistency
                                                await Promise.all([
                                                  fetchInstantGroupPosts(false),
                                                  fetchPostHistory()
                                                ]);
                                              } catch (error) {
                                                console.error('Error deleting record:', error);
                                                messageApi.error(
                                                  error.response?.data?.message || 
                                                  t('delete_error') || 
                                                  "Error deleting record"
                                                );
                                                
                                                // Refresh data in case of error to ensure UI is in sync with server
                                                fetchInstantGroupPosts(true);
                                              }
                                            }}
                                            okText={t('yes')}
                                            cancelText={t('no')}
                                          >
                                            <Button 
                                              type="text" 
                                              danger 
                                              icon={<DeleteOutlined />} 
                                              className="action-button-enhanced"
                                            />
                                          </Popconfirm>
                                        </Tooltip>
                                      )}
                                  </Space>
                                )
                              }
                            ]}
                            pagination={{ pageSize: 10 }}
                            className="table-enhanced"
                            expandable={{
                              expandedRowRender: record => (
                                <div className="expanded-row-container">
                                  <Row gutter={[16, 16]}>
                                    <Col span={12}>
                                      <Card title={t('post_content_details') || "Post Content"} size="small" className="expanded-card">
                                        <p>{record.messageText}</p>
                                        {record.postType === 'imageUrl' && record.imageUrl && (
                                          <div className="media-link">
                                            <div>{t('image_url') || "Image URL"}:</div>
                                            <a href={record.imageUrl} target="_blank" rel="noopener noreferrer">{record.imageUrl}</a>
                                          </div>
                                        )}
                                        {record.postType === 'videoUrl' && record.videoUrl && (
                                          <div className="media-link">
                                            <div>{t('video_url') || "Video URL"}:</div>
                                            <a href={record.videoUrl} target="_blank" rel="noopener noreferrer">{record.videoUrl}</a>
                                          </div>
                                        )}
                                        <div className="status-tag-container">
                                          <Tag color={record.enableRandomCode ? 'green' : 'default'}>
                                            {record.enableRandomCode ? (t('template_yes') || "Yes") : (t('template_no') || "No")}
                                          </Tag>
                                        </div>
                                      </Card>
                                    </Col>
                                    <Col span={12}>
                                      <Card title={t('job_settings') || "Job Settings"} size="small" className="expanded-card">
                                        <div className="job-setting-item">
                                          <span className="setting-label">{t('delay_status') || "Delay"}:</span>
                                          <span className="setting-value">
                                            {record.enableDelay ? (t('delay_enabled') || `Enabled (${record.delay}s)`) : (t('disabled') || "Disabled")}
                                          </span>
                                        </div>
                                        <Divider className="setting-divider" />
                                        <div className="job-setting-item">
                                          <span className="setting-label">{t('start_time') || "Start Time"}:</span>
                                          <span className="setting-value">
                                            {record.processingStartedAt ? moment(record.processingStartedAt).format('YYYY-MM-DD HH:mm:ss') : "-"}
                                          </span>
                                        </div>
                                        {record.processingCompletedAt && (
                                          <div className="job-setting-item">
                                            <span className="setting-label">{t('completion_time') || "Completion Time"}:</span>
                                            <span className="setting-value">
                                              {moment(record.processingCompletedAt).format('YYYY-MM-DD HH:mm:ss')}
                                            </span>
                                          </div>
                                        )}
                                        {record.totalProcessingTime && (
                                          <div className="job-setting-item">
                                            <span className="setting-label">{t('processing_time') || "Processing Time"}:</span>
                                            <span className="setting-value">
                                              {record.totalProcessingTime} {t('seconds_unit') || "seconds"}
                                            </span>
                                          </div>
                                        )}
                                      </Card>
                                    </Col>
                                    
                                    {record.groups && record.groups.length > 0 && (
                                      <Col span={24}>
                                        <Card 
                                          title={`${t('target_groups') || "Target Groups"} (${record.groups.length})`} 
                                          size="small" 
                                          className="expanded-card"
                                        >
                                          <div className="groups-table-container">
                                            <Table 
                                              size="small"
                                              dataSource={record.groups.map((groupId, index) => ({ 
                                                key: `${record._id}-${groupId}-${index}`,
                                                groupId,
                                                status: record.results?.find(r => r.group?.id === groupId)?.success ? 'success' : 
                                                      record.results?.find(r => r.group?.id === groupId)?.error ? 'failed' : 'pending'
                                              }))}
                                              columns={[
                                                {
                                                  title: '#',
                                                  key: 'index',
                                                  render: (_, __, index) => index + 1
                                                },
                                                {
                                                  title: t('group_id') || "Group ID",
                                                  dataIndex: 'groupId',
                                                  render: groupId => (
                                                    <a 
                                                      href={`https://facebook.com/groups/${groupId}`} 
                                                      target="_blank" 
                                                      rel="noopener noreferrer"
                                                      className="group-link-enhanced"
                                                    >
                                                      {groupId}
                                                    </a>
                                                  )
                                                },
                                                {
                                                  title: t('status') || "Status",
                                                  dataIndex: 'status',
                                                  render: status => {
                                                    switch (status) {
                                                      case 'success':
                                                        return <Tag color="success">{t('status_posted') || "Posted"}</Tag>;
                                                      case 'failed':
                                                        return <Tag color="error">{t('status_failed') || "Failed"}</Tag>;
                                                      default:
                                                        return <Tag color="default">{t('status_pending') || "Pending"}</Tag>;
                                                    }
                                                  }
                                                },
                                                {
                                                  title: t('error') || "Error",
                                                  dataIndex: 'error',
                                                  render: (_, record) => {
                                                    const result = record.results?.find(r => r.group?.id === record.groupId);
                                                    return result?.error ? (
                                                      <Tooltip title={result.error}>
                                                        <Typography.Text type="danger" ellipsis>{result.error}</Typography.Text>
                                                      </Tooltip>
                                                    ) : '-';
                                                  }
                                                }
                                              ]}
                                              pagination={false}
                                              className="inner-table-enhanced"
                                            />
                                          </div>
                                        </Card>
                                      </Col>
                                    )}
                                  </Row>
                                </div>
                              )
                            }}
                          />
                        ) : (
                          <Empty 
                            description={t('no_active_jobs') || "No background jobs currently active"} 
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            className="empty-state-enhanced"
                          />
                        )}
                      </div>
                    </Tabs.TabPane>
                  </Tabs>
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>
      )
    },
    {
      key: "scheduled",
      label: (
        <span className="tab-with-count">
          {t('scheduled_posts')}
          {scheduledPosts.length > 0 && (
            <Badge count={scheduledPosts.length} className="tab-badge" />
          )}
        </span>
      ),
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <Alert
              message={t('scheduled_posts_info')}
              description={t('scheduled_posts_description')}
              type="info"
              showIcon
              className="alert-enhanced"
            />
          </Col>
          <Col xs={24}>
            <Alert
              message={t('important_notice')}
              description={t('scheduled_posts_retention_notice')}
              type="warning"
              showIcon
              className="alert-enhanced-warning"
            />
          </Col>
          
          <Col xs={24}>
            {scheduledPostsLoading ? (
              <div className="loading-container-enhanced">
                <Spin size="large" />
                <div>{t('loading')}</div>
              </div>
            ) : scheduledPosts.length > 0 ? (
              <Table
                dataSource={scheduledPosts.map(post => ({ ...post, key: post._id }))}
                columns={[
                  {
                    title: t('scheduled_time'),
                    dataIndex: 'scheduledTime',
                    key: 'scheduledTime',
                    render: time => moment(time).format('YYYY-MM-DD HH:mm:ss'),
                    sorter: (a, b) => moment(a.scheduledTime).diff(moment(b.scheduledTime))
                  },
                  {
                    title: t('Time_remaining'),
                    key: 'remainingTime',
                    minWidth: 150, // Minimum width but allows expansion for longer content
                    ellipsis: true, // Enables ellipsis for very long content
                    className: 'remaining-time-column', // Custom class for additional styling
                    render: (_, record) => <RemainingTimeDisplay t={t} record={record} /> // Pass t prop
                  },
                  {
                    title: t('post_type'),
                    dataIndex: 'postType',
                    key: 'postType',
                    render: type => type === 'text' ? t('post_type_text') : type === 'imageUrl' ? t('post_type_image') : t('post_type_video')
                  },
                  {
                    title: t('group_count'),
                    dataIndex: 'groups',
                    key: 'groupCount',
                    render: groups => Array.isArray(groups) ? groups.length : 0
                  },
                  {
                    title: t('scheduled_status'),
                    dataIndex: 'status',
                    key: 'status',
                    render: status => getScheduledPostStatusTag(status)
                  },
                  {
                    title: t('results'),
                    key: 'results',
                    render: (_, record) => {
                      const success = record.results?.successCount || 0;
                      const failure = record.results?.failureCount || 0;
                      
                      if (record.status === 'pending') {
                        return <Tag color="default">{t('status_pending')}</Tag>;
                      }
                      
                      if (record.status === 'processing') {
                        return <Tag color="processing">{t('status_processing')}</Tag>;
                      }
                      
                      return (
                        <Space>
                          <Tag color="success">{success} {t('status_success')}</Tag>
                          <Tag color="error">{failure} {t('status_failed')}</Tag>
                        </Space>
                      );
                    }
                  },
                  {
                    title: t('scheduled_content'),
                    dataIndex: 'messageText',
                    key: 'messageText',
                    ellipsis: true,
                    render: text => (
                      <Tooltip title={text}>
                        <div className="content-preview">{text}</div>
                      </Tooltip>
                    )
                  },
                  {
                    title: t('scheduled_actions'),
                    key: 'actions',
                    render: (_, record) => (
                      <Space>
                        {record.status === 'pending' && (
                          <>
                            <Tooltip title={t('scheduled_edit_time')}>
                              <Button 
                                type="text" 
                                icon={<ClockCircleOutlined />} 
                                onClick={() => openRescheduleModal(record)} 
                                className="action-button-enhanced"
                              />
                            </Tooltip>
                            <Tooltip title={t('scheduled_cancel')}>
                              <Popconfirm
                                title={t('scheduled_confirm_cancel')}
                                onConfirm={() => cancelServerScheduledPost(record._id)}
                                okText={t('yes')}
                                cancelText={t('no')}
                              >
                                <Button 
                                  type="text" 
                                  icon={<StopOutlined />} 
                                  className="action-button-enhanced"
                                />
                              </Popconfirm>
                            </Tooltip>
                          </>
                        )}
                        
                        {record.status === 'completed' && (
                          <>
                            <Tooltip title={t('scheduled_view_stats')}>
                              <Button 
                                type="text" 
                                icon={<EyeOutlined />} 
                                onClick={() => {
                                  // Use direct statistics function to display results
                                  const successCount = record.results?.successCount || 0;
                                  const failureCount = record.results?.failureCount || 0;
                                  const totalCount = successCount + failureCount;
                                  
                                  // Calculate success rate
                                  const successRate = totalCount > 0 
                                    ? ((successCount / totalCount) * 100).toFixed(1) 
                                    : "0.0";
                                  
                                  // Create statistics object with actual timing values from server
                                  const stats = {
                                    totalSuccess: successCount,
                                    totalFailed: failureCount,
                                    successRate: successRate,
                                    averageTime: record.results?.averageTime || "0.00", // Use real time from server
                                    totalTime: record.results?.totalTime || "0.00", // Use real time from server
                                    lastPostTime: record.results?.completedAt || record.updatedAt
                                  };
                                  
                                  // Show the statistics directly
                                  setCurrentSessionStats(stats);
                                  setStatsModalVisible(true);
                                }}
                                className="action-button-enhanced"
                              />
                            </Tooltip>
                            <Tooltip title={t('scheduled_delete')}>
                              <Popconfirm
                                title={t('scheduled_confirm_delete')}
                                onConfirm={() => deleteScheduledPost(record._id)}
                                okText={t('yes')}
                                cancelText={t('no')}
                              >
                                <Button 
                                  type="text" 
                                  danger 
                                  icon={<DeleteOutlined />} 
                                  className="action-button-enhanced"
                                />
                              </Popconfirm>
                            </Tooltip>
                          </>
                        )}
                        
                        {record.status === 'failed' && (
                          <>
                            <Tooltip title="حذف السجل">
                              <Popconfirm
                                title={t('scheduled_confirm_delete')}
                                onConfirm={() => deleteScheduledPost(record._id)}
                                okText={t('yes')}
                                cancelText={t('no')}
                              >
                                <Button 
                                  type="text" 
                                  danger 
                                  icon={<DeleteOutlined />} 
                                  className="action-button-enhanced"
                                />
                              </Popconfirm>
                            </Tooltip>
                          </>
                        )}
                        
                        {record.status === 'failed' && (
                          <Tooltip title={t('scheduled_view_error')}>
                            <Button 
                              type="text" 
                              icon={<InfoCircleOutlined />} 
                              onClick={() => {
                                Modal.info({
                                  title: t('scheduled_failure_reason'),
                                  content: (
                                    <div>
                                      <p>{record.error || t('unknown_error')}</p>
                                    </div>
                                  ),
                                });
                              }}
                              className="action-button-enhanced"
                            />
                          </Tooltip>
                        )}
                      </Space>
                    )
                  }
                ]}
                pagination={{ pageSize: 10 }}
                className="table-enhanced"
                expandable={{
                  expandedRowRender: record => (
                    <div className="expanded-row-container">
                      <Row gutter={[16, 16]}>
                        <Col span={12}>
                          <Card title={t('post_content_details')} size="small" className="expanded-card">
                            <p>{record.messageText}</p>
                            {record.postType === 'imageUrl' && record.imageUrl && (
                              <div className="media-link">
                                <div>{t('image_url')}:</div>
                                <a href={record.imageUrl} target="_blank" rel="noopener noreferrer">{record.imageUrl}</a>
                              </div>
                            )}
                            {record.postType === 'videoUrl' && record.videoUrl && (
                              <div className="media-link">
                                <div>{t('video_url')}:</div>
                                <a href={record.videoUrl} target="_blank" rel="noopener noreferrer">{record.videoUrl}</a>
                              </div>
                            )}
                            <div className="status-tag-container">
                              <Tag color={record.enableRandomCode ? 'green' : 'default'}>
                                {record.enableRandomCode ? t('template_yes') : t('template_no')}
                              </Tag>
                            </div>
                          </Card>
                        </Col>
                        <Col span={12}>
                          <Card title={t('post_settings')} size="small" className="expanded-card">
                            <div className="job-setting-item">
                              <span className="setting-label">{t('delay_status')}: </span>
                              <span className="setting-value">
                                {record.enableDelay ? t('scheduled_delay_enabled', { seconds: record.delay }) : t('disabled')}
                              </span>
                            </div>
                            <div className="job-setting-item">
                              <span className="setting-label">{t('retry_status')}: </span>
                              <span className="setting-value">
                                {record.retryEnabled === false ? t('disabled') : t('scheduled_retry_enabled', { count: record.retryCount })}
                              </span>
                            </div>
                            <Divider className="setting-divider" />
                            <div className="job-setting-item">
                              <span className="setting-label">{t('scheduled_time')}: </span>
                              <span className="setting-value">
                                {moment(record.scheduledTime).format('YYYY-MM-DD HH:mm:ss')}
                              </span>
                            </div>
                            {record.status === 'completed' && record.completedAt && (
                              <div className="job-setting-item">
                                <span className="setting-label">{t('completion_time')}: </span>
                                <span className="setting-value">
                                  {moment(record.completedAt).format('YYYY-MM-DD HH:mm:ss')}
                                </span>
                              </div>
                            )}
                          </Card>
                        </Col>
                        
                        {record.groups && record.groups.length > 0 && (
                          <Col span={24}>
                            <Card 
                              title={`${t('target_groups')} (${record.groups.length})`} 
                              size="small" 
                              className="expanded-card"
                            >
                              <div className="groups-table-container">
                                <Table 
                                  size="small"
                                  dataSource={record.groups.map((groupId, index) => ({ 
                                    key: `${record._id}-${groupId}-${index}`,
                                    groupId 
                                  }))}
                                  columns={[
                                    {
                                      title: '#',
                                      key: 'index',
                                      render: (_, __, index) => index + 1
                                    },
                                    {
                                      title: t('group_id'),
                                      dataIndex: 'groupId',
                                      render: groupId => (
                                        <a 
                                          href={`https://facebook.com/groups/${groupId}`} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="group-link-enhanced"
                                        >
                                          {groupId}
                                        </a>
                                      )
                                    }
                                  ]}
                                  pagination={false}
                                  className="inner-table-enhanced"
                                />
                              </div>
                            </Card>
                          </Col>
                        )}
                      </Row>
                    </div>
                  )
                }}
              />
            ) : (
              <Empty description={t('scheduled_empty')} className="empty-state-enhanced" />
            )}
          </Col>
        </Row>
      )
    }
  ];

  // Add a function to refresh all data
  const refreshAllData = async () => {
    messageApi.loading(t('refreshing_data'), 1);
    try {
      await Promise.all([
        fetchTemplates(),
        fetchGroupLists(),
        fetchPostHistory(),
        fetchScheduledPosts()
      ]);
      messageApi.success(t('data_refreshed'));
    } catch (err) {
      console.error('Error refreshing data:', err);
      messageApi.error(t('refresh_error'));
    }
  };

  return (
    <ContentContainer>
      <div className="auto-post-group">
        <Card
          variant="bordered"
          title={
            <div className="main-title">
              <Space>
                <span className="title-text">{t('auto_post_group_title')}</span>
                <Tooltip title={t('refresh_data')}>
                  <Button
                    type="text"
                    icon={<ReloadOutlined />}
                    onClick={refreshAllData}
                    size="small"
                    className="refresh-button"
                  />
                </Tooltip>
              </Space>
            </div>
          }
          className="main-card"
        >
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            items={tabItems}
            className="main-tabs"
          />
        </Card>
      </div>
      
      {/* Import Text Modal */}
      <Modal
        title={
          <div className="modal-title">
            <FileTextOutlined className="title-icon" />
            <span>{t('import_modal_title')}</span>
          </div>
        }
        open={importModalVisible}
        onOk={handleImportFromText}
        onCancel={() => setImportModalVisible(false)}
        okText={t('import')}
        cancelText={t('cancel')}
        className="import-modal enhanced-modal"
      >
        <div className="modal-instruction">
          <InfoCircleOutlined className="instruction-icon" />
          <p>{t('import_instructions')}</p>
        </div>
        <TextArea
          rows={10}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="123456789101112
987654321098
111222333444"
          className="import-textarea"
        />
      </Modal>
      
      {/* Save Template Modal */}
      <Modal
        title={
          <div className="modal-title">
            <SaveOutlined className="title-icon" />
            <span>{t('save_template_modal')}</span>
          </div>
        }
        open={saveTemplateModalVisible}
        onOk={saveTemplate}
        confirmLoading={saveTemplateLoading}
        onCancel={() => setSaveTemplateModalVisible(false)}
        okText={t('save')}
        cancelText={t('cancel')}
        className="enhanced-modal"
      >
        <Input
          placeholder={t('template_name')}
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          prefix={<EditOutlined className="input-icon" />}
          className="enhanced-input"
        />
        <div className="modal-section-title">{t('template_content')}</div>
        <div className="template-preview">
          <div className="template-preview-item">
            <span className="preview-label">{t('template_type')}</span>
            <span className="preview-value">{postType === 'text' ? t('post_type_text') : postType === 'imageUrl' ? t('post_type_image') : t('post_type_video')}</span>
          </div>
          <div className="template-preview-item">
            <span className="preview-label">{t('template_text')}</span>
            <span className="preview-value">{messageText || t('template_empty')}</span>
          </div>
          {postType === 'imageUrl' && <div className="template-preview-item">
            <span className="preview-label">{t('template_image')}</span>
            <span className="preview-value">{imageUrl || t('template_empty')}</span>
          </div>}
          {postType === 'videoUrl' && <div className="template-preview-item">
            <span className="preview-label">{t('template_video')}</span>
            <span className="preview-value">{videoUrl || t('template_empty')}</span>
          </div>}
          <div className="template-preview-item">
            <span className="preview-label">{t('template_random')}</span>
            <span className="preview-value">{enableRandomCode ? t('template_yes') : t('template_no')}</span>
          </div>
        </div>
      </Modal>
      
      {/* Save Groups Modal */}
      <Modal
        title={
          <div className="modal-title">
            <SaveOutlined className="title-icon" />
            <span>{t('save_group_list_modal')}</span>
          </div>
        }
        open={saveGroupsModalVisible}
        onOk={saveGroupList}
        confirmLoading={saveGroupsLoading}
        onCancel={() => setSaveGroupsModalVisible(false)}
        okText={t('save')}
        cancelText={t('cancel')}
        className="enhanced-modal"
      >
        <Input
          placeholder={t('group_list_name_placeholder')}
          value={groupListName}
          onChange={(e) => setGroupListName(e.target.value)}
          prefix={<EditOutlined className="input-icon" />}
          className="enhanced-input"
        />
        <div className="group-list-info">
          <InfoCircleOutlined className="info-icon" />
          <Paragraph>{t('group_list_save_count', { count: dataSource.length })}</Paragraph>
        </div>
      </Modal>
      
      {/* Preview Modal */}
      <Modal
        title={
          <div className="modal-title">
            <EyeOutlined className="title-icon" />
            <span>{t('preview_post_title')}</span>
          </div>
        }
        open={showPreview}
        onCancel={() => setShowPreview(false)}
        footer={[
          <Button key="close" onClick={() => setShowPreview(false)} className="enhanced-button">
            {t('close')}
          </Button>
        ]}
        width={550}
        centered
        className="preview-modal enhanced-modal"
      >
        <div className="preview-container">
          <PostPreview 
            t={t}
            postType={postType}
            text={messageText}
            imageUrl={imageUrl}
            videoUrl={videoUrl}
            enableRandomCode={enableRandomCode}
            useProcessedText={true}
            postHistory={postHistory}
          />
          <div className="preview-disclaimer">
            <InfoCircleOutlined className="disclaimer-icon" />
            <Text type="secondary">{t('preview_disclaimer')}</Text>
          </div>
        </div>
      </Modal>
      
      {/* Reschedule Modal */}
      <Modal
        title={
          <div className="modal-title">
            <ClockCircleOutlined className="title-icon" />
            <span>{t('reschedule_post_title')}</span>
          </div>
        }
        open={rescheduleModalVisible}
        onOk={saveRescheduledTime}
        confirmLoading={reschedulingLoading}
        onCancel={() => setRescheduleModalVisible(false)}
        okText={t('save')}
        cancelText={t('cancel')}
        className="enhanced-modal"
      >
        <div className="reschedule-container">
          <div className="current-time">
            <span className="time-label">{t('current_time')}:</span>
            <span className="time-value">{postToReschedule ? moment(postToReschedule.scheduledTime).format('YYYY-MM-DD HH:mm:ss') : ''}</span>
          </div>
          
          <div className="new-time-section">
            <div className="time-label">{t('new_time')}:</div>
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              value={newScheduledTime}
              onChange={value => setNewScheduledTime(value)}
              disabledDate={current => current && current < moment().startOf('day')}
              className="date-picker-enhanced"
            />
          </div>
          
          <div className="time-note">
            <InfoCircleOutlined className="note-icon" />
            <span>{t('future_time_note')}</span>
          </div>
        </div>
      </Modal>
      
      {/* Statistics Modal */}
      <Modal
        title={
          <div className="modal-title">
            <HistoryOutlined className="title-icon" />
            <span>{t('posting_statistics')}</span>
          </div>
        }
        open={statsModalVisible}
        onCancel={() => setStatsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setStatsModalVisible(false)} className="enhanced-button">
            {t('close')}
          </Button>
        ]}
        destroyOnClose={true} // Ensure fresh data on each open
        className="stats-modal enhanced-modal"
      >
        {currentSessionStats ? (
          <div className="stats-container">
            <Result
              status={currentSessionStats.totalSuccess > currentSessionStats.totalFailed ? "success" : "warning"}
              title={t('posting_completed')}
              className="stats-result"
              subTitle={
                <div className="stats-summary">
                  {t('statistics_success')} <span className="success-count">{currentSessionStats.totalSuccess}</span> | 
                  {t('statistics_failure')} <span className="failure-count">{currentSessionStats.totalFailed}</span>
                </div>
              }
            />
            <Row gutter={16} className="stats-row">
              <Col span={12}>
                <Statistic 
                  title={t('success_rate')}
                  value={currentSessionStats.successRate} 
                  suffix="%" 
                  valueStyle={{ color: currentSessionStats.totalSuccess > currentSessionStats.totalFailed ? '#3f8600' : '#cf1322' }}
                  className="enhanced-statistic"
                />
              </Col>
              <Col span={12}>
                <Statistic 
                  title={t('average_post_time')}
                  value={currentSessionStats.averageTime} 
                  suffix={t('seconds_unit')}
                  className="enhanced-statistic"
                />
              </Col>
            </Row>
            <Divider className="stats-divider" />
            <Row gutter={16} className="stats-row">
              <Col span={24}>
                <Statistic 
                  title={t('total_operation_time')}
                  value={currentSessionStats.totalTime} 
                  suffix={t('seconds_unit')}
                  className="enhanced-statistic large"
                />
              </Col>
            </Row>
          </div>
        ) : (
          // Fallback with better labels
          <div className="stats-container">
            <Result
              status={successCount > failureCount ? "success" : "warning"}
              title={t('posting_statistics')}
              className="stats-result"
              subTitle={
                <div className="stats-summary">
                  {t('statistics_success')} <span className="success-count">{successCount}</span> | 
                  {t('statistics_failure')} <span className="failure-count">{failureCount}</span>
                </div>
              }
            />
            <Row gutter={16} className="stats-row">
              <Col span={12}>
                <Statistic 
                  title={t('success_rate')}
                  value={(successCount + failureCount > 0 ? ((successCount / (successCount + failureCount)) * 100).toFixed(1) : 0)} 
                  suffix="%" 
                  valueStyle={{ color: successCount > failureCount ? '#3f8600' : '#cf1322' }}
                  className="enhanced-statistic"
                />
              </Col>
              <Col span={12}>
                <Statistic 
                  title={t('average_post_time')}
                  value={(successCount + failureCount > 0 ? (totalTimeRef.current / 1000 / (successCount + failureCount)).toFixed(2) : "0.00")} 
                  suffix={t('seconds_unit')}
                  className="enhanced-statistic"
                />
              </Col>
            </Row>
            <Divider className="stats-divider" />
            <Row gutter={16} className="stats-row">
              <Col span={24}>
                <Statistic 
                  title={t('total_operation_time')}
                  value={(totalTimeRef.current / 1000).toFixed(2)} 
                  suffix={t('seconds_unit')}
                  className="enhanced-statistic large"
                />
              </Col>
            </Row>
          </div>
        )}
      </Modal>
      
      {/* Batch Operations Progress Modal */}
      {renderBatchProgressModal()}
      
      {/* Template Editor Modal */}
      {renderTemplateEditor()}

      
    </ContentContainer>
  );
};

export default AutoPostGroup;