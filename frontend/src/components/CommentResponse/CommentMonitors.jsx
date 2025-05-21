import React, { useState, useEffect } from 'react';
import { 
  Card, Button, Modal, Form, Input, Select, Checkbox, Row, Col, 
  Spin, Tag, Alert, Table, List, Tooltip, Typography, Space, Divider,
  Collapse, Switch, InputNumber, Badge, Tabs, Statistic
} from 'antd';
import {
  RATE_LIMITS,
  MONITOR_LIMITS,
  DATA_LIMITS,
  FILTER_LIMITS,
  DEFAULT_MONITOR_SETTINGS,
  getMaxPostsLimit
} from '../../utils/commentResponseLimits';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, 
  CheckOutlined, CloseOutlined, PauseOutlined, 
  PlayCircleOutlined, EyeOutlined, RobotOutlined, 
  FacebookOutlined, HistoryOutlined, InfoCircleOutlined,
  SettingOutlined, FilterOutlined, ThunderboltOutlined,
  HeartOutlined, LineChartOutlined, ReloadOutlined,
  DatabaseOutlined, SmileOutlined, FrownOutlined, MehOutlined,
  LinkOutlined, SyncOutlined, BellOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useNotification } from '../../context/NotificationContext';
import { t } from '../../utils/translationHelper';
import { useUser } from '../../context/UserContext';
import { useMembership } from '../../utils/membershipUtils';

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Panel } = Collapse;
const { TabPane } = Tabs;

/**
 * Enhanced CommentMonitors Component
 * 
 * Professional tool to set up and manage automatic monitoring of Facebook posts for comments
 * with advanced features like sentiment analysis, intelligent response selection,
 * filtering, rate limiting, and comprehensive statistics.
 */
const CommentMonitors = ({ hasActiveToken }) => {
  const { showNotification } = useNotification();
  const { user } = useUser();
  const membership = useMembership();
  const [monitors, setMonitors] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedMonitor, setSelectedMonitor] = useState(null);
  const [pages, setPages] = useState([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsMonitor, setDetailsMonitor] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [activeTabKey, setActiveTabKey] = useState('basic');
  const [triggering, setTriggering] = useState(false);
  const [form] = Form.useForm();

  // Check if user has access to pro features
  const hasProFeatures = membership.checkAccess('commentResponsePro');

  // Form data initialization with enhanced professional features and system limits
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    pageId: '',
    pageName: '',
    accessToken: '',
    posts: [],
    monitorAllPosts: false,
    maxPostsToMonitor: DEFAULT_MONITOR_SETTINGS.maxPostsToMonitor,
    responseRules: [],
    respondToAll: false,
    defaultResponse: '',
    // Advanced filtering options
    filters: {
      excludeCommenters: '',
      mustContain: '',
      mustNotContain: '',
      minCommentLength: FILTER_LIMITS.MIN_COMMENT_LENGTH,
      skipSpam: true
    },
    // Intelligent response behavior
    responseBehavior: {
      useSentimentAnalysis: true,
      rotateResponses: false,
      enableCustomPrompts: false,
      promptTemplate: 'Reply to the following comment in a friendly and helpful tone: {comment}'
    },
    // Rate limiting to prevent too many responses
    rateLimiting: {
      maxResponsesPerHour: RATE_LIMITS.MAX_RESPONSES_PER_HOUR,
      minSecondsBetweenResponses: RATE_LIMITS.MIN_SECONDS_BETWEEN_RESPONSES,
      prioritizeNewerComments: true
    },
    // Monitoring configuration
    checkFrequencyMinutes: DEFAULT_MONITOR_SETTINGS.checkFrequencyMinutes,
    replyToExistingComments: false,
    // Data management
    dataManagement: {
      responseRetentionLimit: DEFAULT_MONITOR_SETTINGS.dataManagement.responseRetentionLimit,
      autoArchiveAfterDays: DEFAULT_MONITOR_SETTINGS.dataManagement.autoArchiveAfterDays
    },
    // Notification settings
    notifications: {
      notifyOnErrors: true,
      notifyOnRateLimits: true,
      notificationEmail: ''
    },
    enableDetailedLogging: false
  });

  // Fetch all monitors and rules on component mount
  useEffect(() => {
    if (hasActiveToken) {
      fetchMonitors();
      fetchRules();
    }
  }, [hasActiveToken]);

  // Function to fetch all monitors
  const fetchMonitors = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/comment-responses/monitors');
      setMonitors(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching monitors:', err);
      setError(t('comment_response.error_fetching_monitors', 'حدث خطأ أثناء جلب قائمة المراقبات'));
      setLoading(false);
    }
  };

  // Function to fetch all rules
  const fetchRules = async () => {
    try {
      const response = await axios.get('/api/comment-responses/rules');
      setRules(response.data.filter(rule => rule.isActive)); // Only active rules
    } catch (err) {
      console.error('Error fetching rules:', err);
      setError(t('comment_response.error_fetching_rules', 'حدث خطأ أثناء جلب قواعد الرد'));
    }
  };

  // Function to fetch Facebook pages
  const fetchPages = async () => {
    try {
      setLoadingPages(true);
      const response = await axios.get('/api/comment-responses/facebook/pages');
      setPages(response.data);
      setLoadingPages(false);
    } catch (err) {
      console.error('Error fetching pages:', err);
      showNotification('error', t('comment_response.error_fetching_pages', 'حدث خطأ أثناء جلب صفحات الفيسبوك'));
      setLoadingPages(false);
    }
  };

  // Function to fetch posts for a selected page
  const fetchPosts = async (pageId, accessToken) => {
    try {
      setLoadingPosts(true);
      setPosts([]);
      const response = await axios.get('/api/comment-responses/facebook/posts', {
        params: { pageId, accessToken }
      });
      setPosts(response.data);
      setLoadingPosts(false);
    } catch (err) {
      console.error('Error fetching posts:', err);
      showNotification('error', t('comment_response.error_fetching_posts', 'حدث خطأ أثناء جلب منشورات الصفحة'));
      setLoadingPosts(false);
    }
  };

  // Function to manually trigger a monitor check
  const triggerMonitorCheck = async (monitorId) => {
    try {
      setTriggering(true);
      await axios.post(`/api/comment-responses/monitors/${monitorId}/check`);
      showNotification('success', t('comment_response.check_triggered', 'تم بدء فحص التعليقات الجديدة بنجاح'));
      setTriggering(false);
      // Refresh monitor after a short delay to show new stats
      setTimeout(() => {
        fetchMonitors();
      }, 3000);
    } catch (err) {
      console.error('Error triggering check:', err);
      showNotification('error', t('comment_response.error_triggering_check', 'حدث خطأ أثناء محاولة بدء الفحص'));
      setTriggering(false);
    }
  };

  // Handle opening the create monitor modal
  const handleCreateMonitor = async () => {
    setModalMode('create');
    setFormData({
      name: '',
      description: '',
      pageId: '',
      pageName: '',
      accessToken: '',
      posts: [],
      monitorAllPosts: false,
      maxPostsToMonitor: DEFAULT_MONITOR_SETTINGS.maxPostsToMonitor,
      responseRules: [],
      respondToAll: false,
      defaultResponse: '',
      // Advanced filtering options
      filters: {
        excludeCommenters: '',
        mustContain: '',
        mustNotContain: '',
        minCommentLength: FILTER_LIMITS.MIN_COMMENT_LENGTH,
        skipSpam: true
      },
      // Intelligent response behavior
      responseBehavior: {
        useSentimentAnalysis: true,
        rotateResponses: false,
        enableCustomPrompts: false,
        promptTemplate: 'Reply to the following comment in a friendly and helpful tone: {comment}'
      },
      // Rate limiting to prevent too many responses
      rateLimiting: {
        maxResponsesPerHour: RATE_LIMITS.MAX_RESPONSES_PER_HOUR,
        minSecondsBetweenResponses: RATE_LIMITS.MIN_SECONDS_BETWEEN_RESPONSES,
        prioritizeNewerComments: true
      },
      // Monitoring configuration
      checkFrequencyMinutes: DEFAULT_MONITOR_SETTINGS.checkFrequencyMinutes,
      replyToExistingComments: false,
      // Data management
      dataManagement: {
        responseRetentionLimit: DEFAULT_MONITOR_SETTINGS.dataManagement.responseRetentionLimit,
        autoArchiveAfterDays: DEFAULT_MONITOR_SETTINGS.dataManagement.autoArchiveAfterDays
      },
      // Notification settings
      notifications: {
        notifyOnErrors: true,
        notifyOnRateLimits: true,
        notificationEmail: ''
      },
      enableDetailedLogging: false
    });
    form.resetFields();
    setActiveTabKey('basic');
    setShowModal(true);
    
    // Fetch pages for selection
    await fetchPages();
  };

  // Handle opening the edit monitor modal
  const handleEditMonitor = async (monitor) => {
    setModalMode('edit');
    setSelectedMonitor(monitor);
    
    // Set default values for nested objects if they don't exist
    const filters = monitor.filters || {
      excludeCommenters: '',
      mustContain: '',
      mustNotContain: '',
      minCommentLength: FILTER_LIMITS.MIN_COMMENT_LENGTH,
      skipSpam: true
    };
    
    const responseBehavior = monitor.responseBehavior || {
      useSentimentAnalysis: true,
      rotateResponses: false,
      enableCustomPrompts: false,
      promptTemplate: 'Reply to the following comment in a friendly and helpful tone: {comment}'
    };
    
    const rateLimiting = monitor.rateLimiting || {
      maxResponsesPerHour: RATE_LIMITS.MAX_RESPONSES_PER_HOUR,
      minSecondsBetweenResponses: RATE_LIMITS.MIN_SECONDS_BETWEEN_RESPONSES,
      prioritizeNewerComments: true
    };
    
    const dataManagement = monitor.dataManagement || {
      responseRetentionLimit: DEFAULT_MONITOR_SETTINGS.dataManagement.responseRetentionLimit,
      autoArchiveAfterDays: DEFAULT_MONITOR_SETTINGS.dataManagement.autoArchiveAfterDays
    };
    
    const notifications = monitor.notifications || {
      notifyOnErrors: true,
      notifyOnRateLimits: true,
      notificationEmail: ''
    };
    
    // Initialize form with monitor data
    setFormData({
      name: monitor.name,
      description: monitor.description || '',
      pageId: monitor.pageId,
      pageName: monitor.pageName,
      accessToken: monitor.accessToken,
      posts: monitor.posts || [],
      monitorAllPosts: monitor.monitorAllPosts || false,
      maxPostsToMonitor: monitor.maxPostsToMonitor || DEFAULT_MONITOR_SETTINGS.maxPostsToMonitor,
      responseRules: monitor.responseRules.map(rule => rule._id || rule),
      respondToAll: monitor.respondToAll || false,
      defaultResponse: monitor.defaultResponse || '',
      filters,
      responseBehavior,
      rateLimiting,
      checkFrequencyMinutes: monitor.checkFrequencyMinutes || DEFAULT_MONITOR_SETTINGS.checkFrequencyMinutes,
      replyToExistingComments: monitor.replyToExistingComments || false,
      dataManagement,
      notifications,
      enableDetailedLogging: monitor.enableDetailedLogging || false
    });
    
    // Set form values for ant design form
    form.setFieldsValue({
      name: monitor.name,
      description: monitor.description || '',
      pageId: monitor.pageId,
      monitorAllPosts: monitor.monitorAllPosts || false,
      maxPostsToMonitor: monitor.maxPostsToMonitor || DEFAULT_MONITOR_SETTINGS.maxPostsToMonitor,
      respondToAll: monitor.respondToAll || false,
      defaultResponse: monitor.defaultResponse || '',
      checkFrequencyMinutes: monitor.checkFrequencyMinutes || DEFAULT_MONITOR_SETTINGS.checkFrequencyMinutes,
      replyToExistingComments: monitor.replyToExistingComments || false,
      // Set form values for nested objects
      filters_excludeCommenters: filters.excludeCommenters,
      filters_mustContain: filters.mustContain,
      filters_mustNotContain: filters.mustNotContain,
      filters_minCommentLength: filters.minCommentLength,
      filters_skipSpam: filters.skipSpam,
      responseBehavior_useSentimentAnalysis: responseBehavior.useSentimentAnalysis,
      responseBehavior_rotateResponses: responseBehavior.rotateResponses,
      responseBehavior_enableCustomPrompts: responseBehavior.enableCustomPrompts,
      responseBehavior_promptTemplate: responseBehavior.promptTemplate,
      rateLimiting_maxResponsesPerHour: rateLimiting.maxResponsesPerHour,
      rateLimiting_minSecondsBetweenResponses: rateLimiting.minSecondsBetweenResponses,
      rateLimiting_prioritizeNewerComments: rateLimiting.prioritizeNewerComments,
      dataManagement_responseRetentionLimit: dataManagement.responseRetentionLimit,
      dataManagement_autoArchiveAfterDays: dataManagement.autoArchiveAfterDays,
      notifications_notifyOnErrors: notifications.notifyOnErrors,
      notifications_notifyOnRateLimits: notifications.notifyOnRateLimits,
      notifications_notificationEmail: notifications.notificationEmail,
      enableDetailedLogging: monitor.enableDetailedLogging || false
    });
    
    setActiveTabKey('basic');
    setShowModal(true);
    
    // Fetch pages and posts
    await fetchPages();
    if (monitor.pageId && monitor.accessToken) {
      await fetchPosts(monitor.pageId, monitor.accessToken);
    }
  };

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Special handling for respondToAll to ensure defaultResponse is required
    if (name === 'respondToAll' && checked && !formData.defaultResponse) {
      setFormData({
        ...formData,
        [name]: checked,
        defaultResponse: 'شكراً على تعليقك!'
      });
      return;
    }
    
    // Handle nested objects
    if (name.includes('_')) {
      const [object, field] = name.split('_');
      setFormData({
        ...formData,
        [object]: {
          ...formData[object],
          [field]: type === 'checkbox' ? checked : value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      });
    }
  };

  // Handle page selection
  const handlePageSelect = async (value) => {
    if (!value) {
      setFormData({
        ...formData,
        pageId: '',
        pageName: '',
        accessToken: '',
        posts: []
      });
      setPosts([]);
      return;
    }
    
    const selectedPage = pages.find(page => page.id === value);
    if (selectedPage) {
      setFormData({
        ...formData,
        pageId: selectedPage.id,
        pageName: selectedPage.name,
        accessToken: selectedPage.accessToken,
        posts: []
      });
      
      // Fetch posts for this page
      await fetchPosts(selectedPage.id, selectedPage.accessToken);
    }
  };

  // Handle post selection
  const handlePostSelect = (checked, post) => {
    let updatedPosts = [...formData.posts];
    
    if (checked) {
      // Check if this post is already in the array
      const existingPost = updatedPosts.find(p => p.id === post.id);
      if (!existingPost) {
        updatedPosts.push({
          id: post.id,
          message: post.message,
          createdTime: post.createdTime
        });
      }
    } else {
      // Remove this post
      updatedPosts = updatedPosts.filter(p => p.id !== post.id);
    }
    
    setFormData({
      ...formData,
      posts: updatedPosts
    });
  };

  // Handle rule selection
  const handleRuleSelect = (ruleId, checked) => {
    let updatedRules = [...formData.responseRules];
    
    if (checked) {
      // Add rule if not already in array
      if (!updatedRules.includes(ruleId)) {
        updatedRules.push(ruleId);
      }
    } else {
      // Remove rule
      updatedRules = updatedRules.filter(id => id !== ruleId);
    }
    
    setFormData({
      ...formData,
      responseRules: updatedRules
    });
  };

  // Handle monitor submission (create or update)
  const handleSubmit = async () => {
    try {
      // Form validation
      if (!formData.name.trim()) {
        showNotification('warning', t('comment_response.monitor_name_required', 'يجب إدخال اسم للمراقبة'));
        return;
      }

      if (!formData.pageId) {
        showNotification('warning', t('comment_response.page_required', 'يجب اختيار صفحة للمراقبة'));
        return;
      }

      if (!formData.monitorAllPosts && formData.posts.length === 0) {
        showNotification('warning', t('comment_response.posts_required', 'يجب اختيار منشورات للمراقبة أو تفعيل مراقبة جميع المنشورات'));
        return;
      }

      if (formData.responseRules.length === 0 && !formData.respondToAll) {
        showNotification('warning', t('comment_response.rules_or_default_required', 'يجب اختيار قواعد للرد أو تفعيل الرد على الكل مع تحديد رد افتراضي'));
        return;
      }

      if (formData.respondToAll && !formData.defaultResponse.trim()) {
        showNotification('warning', t('comment_response.default_response_required', 'يجب إدخال رد افتراضي عند تفعيل الرد على الكل'));
        return;
      }

      setLoading(true);

      if (modalMode === 'create') {
        // Create new monitor
        const response = await axios.post('/api/comment-responses/monitors', formData);
        setMonitors([...monitors, response.data]);
        showNotification('success', t('comment_response.monitor_created', 'تم إنشاء المراقبة بنجاح'));
      } else {
        // Update existing monitor
        const response = await axios.put(`/api/comment-responses/monitors/${selectedMonitor._id}`, formData);
        const updatedMonitors = monitors.map(monitor => 
          monitor._id === selectedMonitor._id ? response.data : monitor
        );
        setMonitors(updatedMonitors);
        showNotification('success', t('comment_response.monitor_updated', 'تم تحديث المراقبة بنجاح'));
      }

      setLoading(false);
      setShowModal(false);
    } catch (err) {
      console.error('Error saving monitor:', err);
      showNotification('error', err.response?.data?.message || t('comment_response.error_saving_monitor', 'حدث خطأ أثناء حفظ المراقبة'));
      setLoading(false);
    }
  };

  // Handle toggling monitor status (active/paused)
  const handleToggleStatus = async (monitor) => {
    try {
      const newStatus = monitor.status === 'active' ? 'paused' : 'active';
      await axios.patch(`/api/comment-responses/monitors/${monitor._id}/status`, {
        status: newStatus
      });
      
      // Update monitors list
      const updatedMonitors = monitors.map(m => 
        m._id === monitor._id ? { ...m, status: newStatus } : m
      );
      setMonitors(updatedMonitors);
      
      showNotification('success', newStatus === 'active' 
        ? t('comment_response.monitor_activated', 'تم تفعيل المراقبة') 
        : t('comment_response.monitor_paused', 'تم إيقاف المراقبة مؤقتاً')
      );
    } catch (err) {
      console.error('Error toggling monitor status:', err);
      showNotification('error', t('comment_response.error_updating_status', 'حدث خطأ أثناء تحديث حالة المراقبة'));
    }
  };

  // Handle opening details modal
  const handleViewDetails = (monitor) => {
    setDetailsMonitor(monitor);
    setShowDetailsModal(true);
  };

  // Handle opening delete confirmation modal
  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setConfirmDelete(true);
  };

  // Handle monitor deletion
  const handleConfirmDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/comment-responses/monitors/${deleteId}`);
      const updatedMonitors = monitors.filter(monitor => monitor._id !== deleteId);
      setMonitors(updatedMonitors);
      showNotification('success', t('comment_response.monitor_deleted', 'تم حذف المراقبة بنجاح'));
      setConfirmDelete(false);
      setDeleteId(null);
      setLoading(false);
    } catch (err) {
      console.error('Error deleting monitor:', err);
      showNotification('error', err.response?.data?.message || t('comment_response.error_deleting_monitor', 'حدث خطأ أثناء حذف المراقبة'));
      setLoading(false);
      setConfirmDelete(false);
      setDeleteId(null);
    }
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

  // Handle monitor all posts toggle
  const handleMonitorAllToggle = (e) => {
    const checked = e.target.checked;
    setFormData({
      ...formData,
      monitorAllPosts: checked,
      posts: checked ? [] : formData.posts // Clear selected posts if monitoring all
    });
  };

  // Get health status badge
  const getHealthBadge = (monitor) => {
    if (!monitor.healthStatus) return null;
    
    switch (monitor.healthStatus) {
      case 'healthy':
        return <Badge status="success" text={t('comment_response.health_good', 'صحي')} />;
      case 'warning':
        return <Badge status="warning" text={t('comment_response.health_warning', 'تحذير')} />;
      case 'error':
        return <Badge status="error" text={t('comment_response.health_error', 'خطأ')} />;
      default:
        return <Badge status="default" text={t('comment_response.health_unknown', 'غير معروف')} />;
    }
  };

  // Get sentiment stats for details view
  const getSentimentStats = (monitor) => {
    if (!monitor.stats?.sentimentStats) return null;
    
    const { positive, negative, neutral } = monitor.stats.sentimentStats;
    const total = positive + negative + neutral;
    
    if (total === 0) return null;
    
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
        <Statistic 
          title={<span><SmileOutlined style={{ color: '#52c41a' }} /> {t('comment_response.positive', 'إيجابي')}</span>}
          value={positive} 
          suffix={`${Math.round((positive / total) * 100)}%`}
          style={{ textAlign: 'center' }}
        />
        <Statistic 
          title={<span><MehOutlined style={{ color: '#1890ff' }} /> {t('comment_response.neutral', 'محايد')}</span>}
          value={neutral} 
          suffix={`${Math.round((neutral / total) * 100)}%`}
          style={{ textAlign: 'center' }}
        />
        <Statistic 
          title={<span><FrownOutlined style={{ color: '#ff4d4f' }} /> {t('comment_response.negative', 'سلبي')}</span>}
          value={negative} 
          suffix={`${Math.round((negative / total) * 100)}%`}
          style={{ textAlign: 'center' }}
        />
      </div>
    );
  };

  // Table columns configuration
  const columns = [
    {
      title: t('comment_response.monitor_name', 'اسم المراقبة'),
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          {record.description && (
            <div>
              <Text type="secondary">{record.description}</Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: t('comment_response.page', 'الصفحة'),
      dataIndex: 'pageName',
      key: 'pageName',
    },
    {
      title: t('comment_response.posts_count', 'المنشورات'),
      key: 'posts',
      render: (_, record) => (
        record.monitorAllPosts ? (
          <Tag color="blue">
            {t('comment_response.all_posts', 'جميع المنشورات')}
          </Tag>
        ) : (
          <Tag color="blue">
            {record.posts?.length || 0} {t('comment_response.selected_posts', 'منشورات')}
          </Tag>
        )
      ),
    },
    {
      title: t('comment_response.rules_applied', 'القواعد المطبقة'),
      key: 'rules',
      render: (_, record) => (
        <Space>
          {record.respondToAll && (
            <Tag color="blue">
              {t('comment_response.respond_to_all', 'الرد على الكل')}
            </Tag>
          )}
          
          {record.responseRules?.length > 0 && (
            <Tag color="blue">
              {record.responseRules.length} {t('comment_response.rules', 'قاعدة')}
            </Tag>
          )}
          
          {record.responseBehavior?.useSentimentAnalysis && (
            <Tooltip title={t('comment_response.sentiment_analysis_enabled', 'تحليل المشاعر مفعّل')}>
              <Tag color="green">
                <SmileOutlined /> {t('comment_response.sentiment', 'تحليل المشاعر')}
              </Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: t('comment_response.stats', 'الإحصائيات'),
      key: 'stats',
      render: (_, record) => (
        <div>
          <div>
            {t('comment_response.comments_found', 'تعليقات')}: {record.stats?.commentsFound || 0}
          </div>
          <div>
            {t('comment_response.responses_sent', 'ردود')}: {record.stats?.commentsResponded || 0}
          </div>
          {record.stats?.lastCommentCheckedTime && (
            <div>
              <Text type="secondary">
                {t('comment_response.last_check', 'آخر فحص')}: {formatRelativeTime(record.stats.lastCommentCheckedTime)}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: t('comment_response.health', 'الحالة'),
      key: 'status',
      render: (_, record) => (
        <div>
          <Tag color={record.status === 'active' ? 'success' : 'default'}>
            {record.status === 'active' 
              ? t('comment_response.active', 'نشط') 
              : t('comment_response.paused', 'متوقف')}
          </Tag>
          <div style={{ marginTop: '5px' }}>
            {getHealthBadge(record)}
          </div>
        </div>
      ),
    },
    {
      title: t('common.actions', 'الإجراءات'),
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title={t('comment_response.view_details', 'تفاصيل')}>
            <Button 
              type="primary"
              ghost
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          
          <Tooltip title={t('comment_response.check_now', 'فحص الآن')}>
            <Button 
              type="default"
              ghost
              size="small"
              icon={<SyncOutlined />}
              onClick={() => triggerMonitorCheck(record._id)}
              loading={triggering}
              disabled={record.status !== 'active'}
            />
          </Tooltip>
          
          <Tooltip title={t('comment_response.edit', 'تعديل')}>
            <Button 
              type="primary"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditMonitor(record)}
            />
          </Tooltip>
          
          <Tooltip title={
            record.status === 'active' 
              ? t('comment_response.pause', 'إيقاف مؤقت') 
              : t('comment_response.activate', 'تفعيل')
          }>
            <Button
              type={record.status === 'active' ? "default" : "primary"}
              size="small"
              icon={record.status === 'active' ? <PauseOutlined /> : <PlayCircleOutlined />}
              onClick={() => handleToggleStatus(record)}
            />
          </Tooltip>
          
          <Tooltip title={t('comment_response.delete', 'حذف')}>
            <Button
              type="primary"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteClick(record._id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Render loading spinner
  if (loading && monitors.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: '15px' }}>{t('common.loading', 'جاري التحميل...')}</div>
      </div>
    );
  }

  // If no active token, show prompt
  if (!hasActiveToken) {
    return (
      <Card style={{ textAlign: 'center', padding: '30px 0' }}>
        <Title level={4}>{t('comment_response.no_token', 'لا يوجد رمز وصول نشط')}</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: '20px' }}>
          {t('comment_response.activate_token_first', 'قم بتفعيل رمز وصول أولاً للتمكن من استخدام نظام الرد على التعليقات')}
        </Text>
        <Button 
          type="primary" 
          size="large"
          icon={<FacebookOutlined />}
          href="/get-access-token"
        >
          {t('comment_response.manage_tokens', 'إدارة رموز الوصول')}
        </Button>
      </Card>
    );
  }

  return (
    <div className="comment-monitors">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Title level={3}>
          <EyeOutlined style={{ marginRight: '8px' }} />
          {t('comment_response.monitors_title', 'مراقبة منشورات الفيسبوك')}
        </Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={handleCreateMonitor}
        >
          {t('comment_response.create_monitor', 'إنشاء مراقبة جديدة')}
        </Button>
      </div>

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

      {monitors.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '30px 0' }}>
          <Title level={4}>{t('comment_response.no_monitors', 'لا توجد مراقبات')}</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: '20px' }}>
            {t('comment_response.create_first_monitor', 'قم بإنشاء أول مراقبة للرد التلقائي على تعليقات منشوراتك')}
          </Text>
          <Button 
            type="primary" 
            size="large"
            icon={<PlusOutlined />}
            onClick={handleCreateMonitor}
          >
            {t('comment_response.create_monitor', 'إنشاء مراقبة جديدة')}
          </Button>
        </Card>
      ) : (
        <Table 
          columns={columns} 
          dataSource={monitors}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
        />
      )}

      {/* Enhanced Create/Edit Monitor Modal with Tabs */}
      <Modal
        title={
          modalMode === 'create'
            ? t('comment_response.create_monitor', 'إنشاء مراقبة جديدة')
            : t('comment_response.edit_monitor', 'تعديل المراقبة')
        }
        open={showModal}
        onCancel={() => setShowModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowModal(false)}>
            {t('common.cancel', 'إلغاء')}
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            onClick={handleSubmit}
            loading={loading}
            disabled={loading || !formData.pageId || (!formData.respondToAll && formData.responseRules.length === 0) || 
              (!formData.monitorAllPosts && formData.posts.length === 0) || 
              (formData.respondToAll && !formData.defaultResponse)}
          >
            {t('common.save', 'حفظ')}
          </Button>
        ]}
        width={800}
      >
        <Tabs activeKey={activeTabKey} onChange={setActiveTabKey}>
          <TabPane 
            tab={<span><InfoCircleOutlined /> {t('comment_response.basic_settings', 'الإعدادات الأساسية')}</span>} 
            key="basic"
          >
            <Form form={form} layout="vertical">
              <Form.Item 
                label={<>{t('comment_response.monitor_name', 'اسم المراقبة')} <span style={{ color: 'red' }}>*</span></>}
                name="name"
                rules={[{ required: true, message: t('comment_response.monitor_name_required', 'يجب إدخال اسم للمراقبة') }]}
              >
                <Input 
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder={t('comment_response.enter_monitor_name', 'أدخل اسم للمراقبة')}
                />
              </Form.Item>

              <Form.Item 
                label={t('comment_response.description', 'الوصف')}
                name="description"
              >
                <TextArea
                  rows={2}
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder={t('comment_response.enter_description', 'أدخل وصف مختصر للمراقبة (اختياري)')}
                />
              </Form.Item>

              {/* Page Selection */}
              <Form.Item 
                label={<>{t('comment_response.select_page', 'اختر الصفحة')} <span style={{ color: 'red' }}>*</span></>}
                name="pageId"
                rules={[{ required: true, message: t('comment_response.page_required', 'يجب اختيار صفحة للمراقبة') }]}
              >
                <Select
                  placeholder={t('comment_response.select_page_prompt', 'اختر صفحة للمراقبة...')}
                  value={formData.pageId}
                  onChange={handlePageSelect}
                  disabled={modalMode === 'edit'} // Page cannot be changed on edit
                  loading={loadingPages}
                >
                  <Option value="">{t('comment_response.select_page_prompt', 'اختر صفحة للمراقبة...')}</Option>
                  {pages.map(page => (
                    <Option key={page.id} value={page.id}>{page.name}</Option>
                  ))}
                </Select>
                
                {loadingPages && (
                  <div style={{ textAlign: 'center', margin: '8px 0' }}>
                    <Spin size="small" /> <Text>{t('comment_response.loading_pages', 'جاري تحميل الصفحات...')}</Text>
                  </div>
                )}
              </Form.Item>

              {/* Monitor All Posts Toggle */}
              {formData.pageId && (
                <Form.Item
                  name="monitorAllPosts"
                  valuePropName="checked"
                >
                  <Checkbox
                    checked={formData.monitorAllPosts}
                    onChange={handleMonitorAllToggle}
                  >
                    {t('comment_response.monitor_all_posts', 'مراقبة جميع منشورات الصفحة')}
                  </Checkbox>
                  <div>
                    <Text type="secondary">
                      {t('comment_response.monitor_all_hint', 'عند التفعيل، سيتم مراقبة جميع منشورات الصفحة بما في ذلك المنشورات الجديدة التي يتم إنشاؤها بعد تكوين المراقبة.')}
                    </Text>
                  </div>
                </Form.Item>
              )}

              {/* Maximum Posts Limit */}
              {formData.monitorAllPosts && (
                <Form.Item
                  label={t('comment_response.max_posts', 'الحد الأقصى للمنشورات')}
                  name="maxPostsToMonitor"
                >
                  <InputNumber 
                    min={MONITOR_LIMITS.MIN_POSTS} 
                    max={getMaxPostsLimit(membership.currentPlan)}
                    value={formData.maxPostsToMonitor}
                    onChange={(value) => {
                      setFormData({
                        ...formData,
                        maxPostsToMonitor: value
                      });
                    }}
                  />
                  <div>
                    <Text type="secondary">
                      {t('comment_response.max_posts_hint', 'الحد الأقصى لعدد المنشورات التي سيتم مراقبتها (للحفاظ على أداء النظام)')}
                    </Text>
                  </div>
                </Form.Item>
              )}

              {/* Post Selection */}
              {formData.pageId && !formData.monitorAllPosts && (
                <Form.Item
                  label={t('comment_response.select_posts', 'اختر المنشورات للمراقبة')}
                >
                  {loadingPosts ? (
                    <div style={{ textAlign: 'center', margin: '8px 0' }}>
                      <Spin size="small" /> <Text>{t('comment_response.loading_posts', 'جاري تحميل المنشورات...')}</Text>
                    </div>
                  ) : posts.length === 0 ? (
                    <Alert
                      message={t('comment_response.no_posts_found', 'لم يتم العثور على منشورات للصفحة المحددة')}
                      type="info"
                      showIcon
                    />
                  ) : (
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      <List
                        itemLayout="horizontal"
                        dataSource={posts}
                        renderItem={post => (
                          <List.Item>
                            <Checkbox
                              checked={!!formData.posts.find(p => p.id === post.id)}
                              onChange={(e) => handlePostSelect(e.target.checked, post)}
                              style={{ marginRight: '8px' }}
                            />
                            <div>
                              <div>
                                {post.message?.length > 100 
                                  ? `${post.message.substring(0, 100)}...` 
                                  : post.message || t('comment_response.no_text', '(بدون نص)')}
                              </div>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                {new Date(post.createdTime).toLocaleString()}
                              </Text>
                            </div>
                          </List.Item>
                        )}
                      />
                    </div>
                  )}
                </Form.Item>
              )}

              {/* Respond to All Toggle */}
              <Form.Item
                name="respondToAll"
                valuePropName="checked"
              >
                <Checkbox
                  checked={formData.respondToAll}
                  onChange={(e) => {
                    const { checked } = e.target;
                    handleInputChange({
                      target: {
                        name: 'respondToAll',
                        checked,
                        type: 'checkbox'
                      }
                    });
                  }}
                >
                  {t('comment_response.respond_to_all_comments', 'الرد على جميع التعليقات بشكل تلقائي')}
                </Checkbox>
                <div>
                  <Text type="secondary">
                    {t('comment_response.respond_all_hint', 'عند التفعيل، سيتم الرد تلقائياً على جميع التعليقات الجديدة (سواء كانت تطابق قواعد الرد أم لا)')}
                  </Text>
                </div>
              </Form.Item>

              {/* Default Response Text */}
              {formData.respondToAll && (
                <Form.Item
                  label={<>{t('comment_response.default_response', 'الرد الافتراضي')} <span style={{ color: 'red' }}>*</span></>}
                  name="defaultResponse"
                  rules={[{ required: formData.respondToAll, message: t('comment_response.default_response_required', 'يجب إدخال رد افتراضي عند تفعيل الرد على الكل') }]}
                >
                  <TextArea
                    rows={2}
                    name="defaultResponse"
                    value={formData.defaultResponse}
                    onChange={handleInputChange}
                    placeholder={t('comment_response.default_response_placeholder', 'أدخل الرد الافتراضي الذي سيتم استخدامه للتعليقات التي لا تطابق أي من القواعد')}
                  />
                </Form.Item>
              )}

              {/* Response Rules Selection */}
              <Form.Item
                label={t('comment_response.select_rules', 'اختر قواعد الرد')}
              >
                {rules.length === 0 ? (
                  <Alert
                    message={t('comment_response.no_rules_available', 'لا توجد قواعد رد نشطة متاحة. قم بإنشاء قواعد رد أولاً.')}
                    type="info"
                    showIcon
                  />
                ) : (
                  <List
                    itemLayout="horizontal"
                    dataSource={rules}
                    renderItem={rule => (
                      <List.Item>
                        <Checkbox
                          checked={formData.responseRules.includes(rule._id)}
                          onChange={(e) => handleRuleSelect(rule._id, e.target.checked)}
                          style={{ marginRight: '8px' }}
                        />
                        <div>
                          <Text strong>{rule.name}</Text>
                          <div>
                            <Text type="secondary">
                              {t('comment_response.keywords', 'الكلمات المفتاحية')}: {rule.keywords.join(', ')}
                            </Text>
                          </div>
                        </div>
                      </List.Item>
                    )}
                  />
                )}
              </Form.Item>

              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item
                    label={t('comment_response.check_frequency', 'تكرار الفحص')}
                    name="checkFrequencyMinutes"
                    help={t('comment_response.min_check_frequency_hint', 'الحد الأدنى المسموح به هو 5 دقائق')}
                  >
                    <Select
                      value={formData.checkFrequencyMinutes}
                      onChange={(value) => {
                        setFormData({
                          ...formData,
                          checkFrequencyMinutes: value
                        });
                      }}
                    >
                      {/* Removed options below 5 minutes to enforce minimum allowed value */}
                      <Option value={5}>5 {t('comment_response.minutes', 'دقائق')}</Option>
                      <Option value={10}>10 {t('comment_response.minutes', 'دقائق')}</Option>
                      <Option value={15}>15 {t('comment_response.minutes', 'دقيقة')}</Option>
                      <Option value={30}>30 {t('comment_response.minutes', 'دقيقة')}</Option>
                      <Option value={60}>60 {t('comment_response.minutes', 'دقيقة')}</Option>
                    </Select>
                    <Text type="secondary">
                      {t('comment_response.check_frequency_hint', 'تكرار فحص التعليقات الجديدة')}
                    </Text>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="replyToExistingComments"
                    valuePropName="checked"
                    label={" "}
                    style={{ marginTop: '29px' }}
                  >
                    <Checkbox
                      checked={formData.replyToExistingComments}
                      onChange={(e) => {
                        handleInputChange({
                          target: {
                            name: 'replyToExistingComments',
                            checked: e.target.checked,
                            type: 'checkbox'
                          }
                        });
                      }}
                    >
                      {t('comment_response.reply_to_existing', 'الرد على التعليقات السابقة')}
                    </Checkbox>
                    <div>
                      <Text type="secondary">
                        {t('comment_response.reply_to_existing_hint', 'عند التفعيل، سيتم الرد على التعليقات التي تمت إضافتها قبل إنشاء المراقبة')}
                      </Text>
                    </div>
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </TabPane>
          
          {/* Advanced Response Settings Tab */}
          <TabPane 
            tab={<span><RobotOutlined /> {t('comment_response.response_settings', 'إعدادات الرد')}</span>} 
            key="response"
            disabled={!hasProFeatures}
          >
            <Alert
              message={t('comment_response.advanced_features', 'ميزات متقدمة')}
              description={t('comment_response.advanced_features_desc', 'تتيح هذه الميزات تحكماً أكبر في كيفية وتوقيت الرد على التعليقات.')}
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />
          
            <Collapse defaultActiveKey={['sentiment']}>
              <Panel 
                header={
                  <span>
                    <SmileOutlined /> {t('comment_response.sentiment_analysis', 'تحليل المشاعر')}
                  </span>
                } 
                key="sentiment"
              >
                <Form layout="vertical">
                  <Form.Item
                    name="responseBehavior_useSentimentAnalysis"
                    valuePropName="checked"
                  >
                    <Switch
                      checkedChildren={<CheckOutlined />}
                      unCheckedChildren={<CloseOutlined />}
                      checked={formData.responseBehavior.useSentimentAnalysis}
                      onChange={(checked) => {
                        handleInputChange({
                          target: {
                            name: 'responseBehavior_useSentimentAnalysis',
                            checked,
                            type: 'checkbox'
                          }
                        });
                      }}
                    />
                    <Text style={{ marginLeft: '8px' }}>
                      {t('comment_response.enable_sentiment_analysis', 'تمكين تحليل المشاعر')}
                    </Text>
                    <div>
                      <Text type="secondary">
                        {t('comment_response.sentiment_hint', 'تحليل تلقائي لتصنيف التعليقات كإيجابية أو سلبية أو محايدة لاختيار أفضل رد')}
                      </Text>
                    </div>
                  </Form.Item>

                  <Form.Item
                    name="responseBehavior_rotateResponses"
                    valuePropName="checked"
                  >
                    <Switch
                      checkedChildren={<CheckOutlined />}
                      unCheckedChildren={<CloseOutlined />}
                      checked={formData.responseBehavior.rotateResponses}
                      onChange={(checked) => {
                        handleInputChange({
                          target: {
                            name: 'responseBehavior_rotateResponses',
                            checked,
                            type: 'checkbox'
                          }
                        });
                      }}
                    />
                    <Text style={{ marginLeft: '8px' }}>
                      {t('comment_response.rotate_responses', 'تدوير الردود')}
                    </Text>
                    <div>
                      <Text type="secondary">
                        {t('comment_response.rotate_hint', 'استخدام جميع الردود المتاحة بالتناوب بدلاً من الاختيار العشوائي')}
                      </Text>
                    </div>
                  </Form.Item>
                </Form>
              </Panel>

              <Panel 
                header={
                  <span>
                    <ThunderboltOutlined /> {t('comment_response.custom_prompts', 'الردود المخصصة')}
                  </span>
                } 
                key="prompts"
              >
                <Form layout="vertical">
                  <Form.Item
                    name="responseBehavior_enableCustomPrompts"
                    valuePropName="checked"
                  >
                    <Switch
                      checkedChildren={<CheckOutlined />}
                      unCheckedChildren={<CloseOutlined />}
                      checked={formData.responseBehavior.enableCustomPrompts}
                      onChange={(checked) => {
                        handleInputChange({
                          target: {
                            name: 'responseBehavior_enableCustomPrompts',
                            checked,
                            type: 'checkbox'
                          }
                        });
                      }}
                    />
                    <Text style={{ marginLeft: '8px' }}>
                      {t('comment_response.enable_custom_prompts', 'تمكين الردود المخصصة')}
                    </Text>
                    <div>
                      <Text type="secondary">
                        {t('comment_response.custom_prompts_hint', 'استخدام قوالب مخصصة في الردود مع متغيرات ديناميكية')}
                      </Text>
                    </div>
                  </Form.Item>

                  {formData.responseBehavior.enableCustomPrompts && (
                    <Form.Item
                      label={t('comment_response.prompt_template', 'قالب الرد')}
                      name="responseBehavior_promptTemplate"
                    >
                      <TextArea
                        rows={3}
                        name="responseBehavior_promptTemplate"
                        value={formData.responseBehavior.promptTemplate}
                        onChange={handleInputChange}
                        placeholder={t('comment_response.prompt_template_placeholder', 'أدخل قالب الرد مع المتغيرات بين أقواس مثل: {comment}')}
                      />
                      <Text type="secondary">
                        {t('comment_response.template_variables', 'المتغيرات المتاحة')}: {'{comment}, {name}, {page}, {time}'}
                      </Text>
                    </Form.Item>
                  )}
                </Form>
              </Panel>
            </Collapse>
          </TabPane>
          
          {/* Advanced Filtering Tab */}
          <TabPane 
            tab={<span><FilterOutlined /> {t('comment_response.filtering', 'التصفية')}</span>} 
            key="filtering"
            disabled={!hasProFeatures}
          >
            <Alert
              message={t('comment_response.filtering_settings', 'إعدادات التصفية')}
              description={t('comment_response.filtering_desc', 'تحكم في أي التعليقات يجب الرد عليها أو تجاهلها')}
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />
            
            <Form layout="vertical">
              <Form.Item
                label={t('comment_response.exclude_commenters', 'استبعاد معلقين')}
                name="filters_excludeCommenters"
              >
                <TextArea
                  rows={2}
                  name="filters_excludeCommenters"
                  value={formData.filters.excludeCommenters}
                  onChange={handleInputChange}
                  placeholder={t('comment_response.exclude_commenters_placeholder', 'أدخل معرفات المستخدمين المراد استبعادهم (مفصولة بفواصل)')}
                />
                <Text type="secondary">
                  {t('comment_response.exclude_commenters_hint', 'تجاهل التعليقات من مستخدمين معينين')}
                </Text>
              </Form.Item>
              
              <Form.Item
                label={t('comment_response.must_contain', 'يجب أن يحتوي على')}
                name="filters_mustContain"
              >
                <TextArea
                  rows={2}
                  name="filters_mustContain"
                  value={formData.filters.mustContain}
                  onChange={handleInputChange}
                  placeholder={t('comment_response.must_contain_placeholder', 'أدخل النصوص التي يجب أن يحتوي عليها التعليق (مفصولة بفواصل)')}
                />
                <Text type="secondary">
                  {t('comment_response.must_contain_hint', 'الرد فقط على التعليقات التي تحتوي على هذه الكلمات')}
                </Text>
              </Form.Item>
              
              <Form.Item
                label={t('comment_response.must_not_contain', 'يجب ألا يحتوي على')}
                name="filters_mustNotContain"
              >
                <TextArea
                  rows={2}
                  name="filters_mustNotContain"
                  value={formData.filters.mustNotContain}
                  onChange={handleInputChange}
                  placeholder={t('comment_response.must_not_contain_placeholder', 'أدخل النصوص التي يجب ألا يحتوي عليها التعليق (مفصولة بفواصل)')}
                />
                <Text type="secondary">
                  {t('comment_response.must_not_contain_hint', 'تجاهل التعليقات التي تحتوي على هذه الكلمات')}
                </Text>
              </Form.Item>
              
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item
                    label={t('comment_response.min_comment_length', 'الحد الأدنى لطول التعليق')}
                    name="filters_minCommentLength"
                  >
                    <InputNumber 
                      min={0} 
                      max={1000}
                      value={formData.filters.minCommentLength}
                      onChange={(value) => {
                        setFormData({
                          ...formData,
                          filters: {
                            ...formData.filters,
                            minCommentLength: value
                          }
                        });
                      }}
                    />
                    <Text type="secondary" style={{ display: 'block' }}>
                      {t('comment_response.min_length_hint', 'الحد الأدنى لعدد الأحرف (0 = بلا حد)')}
                    </Text>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={t('comment_response.skip_spam', 'تخطي البريد المزعج')}
                    name="filters_skipSpam"
                    valuePropName="checked"
                  >
                    <Switch
                      checkedChildren={<CheckOutlined />}
                      unCheckedChildren={<CloseOutlined />}
                      checked={formData.filters.skipSpam}
                      onChange={(checked) => {
                        handleInputChange({
                          target: {
                            name: 'filters_skipSpam',
                            checked,
                            type: 'checkbox'
                          }
                        });
                      }}
                    />
                    <Text type="secondary" style={{ display: 'block' }}>
                      {t('comment_response.skip_spam_hint', 'تجاهل تعليقات البريد المزعج المحتملة')}
                    </Text>
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </TabPane>
          
          {/* Rate Limiting Tab */}
          <TabPane 
            tab={<span><LineChartOutlined /> {t('comment_response.rate_limiting', 'تحديد المعدل')}</span>} 
            key="ratelimit"
            disabled={!hasProFeatures}
          >
            <Alert
              message={t('comment_response.rate_limiting_settings', 'إعدادات تحديد المعدل')}
              description={t('comment_response.rate_limiting_desc', 'تحكم في معدل الردود لتجنب ظهور الروبوت كمزعج أو لمنع تجاوز حدود API')}
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />
            
            <Form layout="vertical">
              <Form.Item
                label={t('comment_response.max_responses_hour', 'الحد الأقصى للردود في الساعة')}
                name="rateLimiting_maxResponsesPerHour"
              >
                <InputNumber 
                  min={1} 
                  max={RATE_LIMITS.MAX_RESPONSES_PER_HOUR * 5}
                  value={formData.rateLimiting.maxResponsesPerHour}
                  onChange={(value) => {
                    setFormData({
                      ...formData,
                      rateLimiting: {
                        ...formData.rateLimiting,
                        maxResponsesPerHour: value
                      }
                    });
                  }}
                />
                <Text type="secondary" style={{ display: 'block' }}>
                  {t('comment_response.max_responses_hint', 'الحد الأقصى لعدد الردود في الساعة (0 = بلا حد)')}
                </Text>
              </Form.Item>
              
              <Form.Item
                label={t('comment_response.min_seconds_between', 'الحد الأدنى من الثواني بين الردود')}
                name="rateLimiting_minSecondsBetweenResponses"
              >
                <InputNumber 
                  min={RATE_LIMITS.MIN_SECONDS_BETWEEN_RESPONSES} 
                  max={RATE_LIMITS.MIN_SECONDS_BETWEEN_RESPONSES * 120}
                  value={formData.rateLimiting.minSecondsBetweenResponses}
                  onChange={(value) => {
                    setFormData({
                      ...formData,
                      rateLimiting: {
                        ...formData.rateLimiting,
                        minSecondsBetweenResponses: value
                      }
                    });
                  }}
                />
                <Text type="secondary" style={{ display: 'block' }}>
                  {t('comment_response.min_seconds_hint', 'الوقت الأدنى بين الردود المتتالية (ثوانٍ)')}
                </Text>
              </Form.Item>
              
              <Form.Item
                name="rateLimiting_prioritizeNewerComments"
                valuePropName="checked"
              >
                <Switch
                  checkedChildren={<CheckOutlined />}
                  unCheckedChildren={<CloseOutlined />}
                  checked={formData.rateLimiting.prioritizeNewerComments}
                  onChange={(checked) => {
                    handleInputChange({
                      target: {
                        name: 'rateLimiting_prioritizeNewerComments',
                        checked,
                        type: 'checkbox'
                      }
                    });
                  }}
                />
                <Text style={{ marginLeft: '8px' }}>
                  {t('comment_response.prioritize_newer', 'إعطاء الأولوية للتعليقات الأحدث')}
                </Text>
                <div>
                  <Text type="secondary">
                    {t('comment_response.prioritize_newer_hint', 'عند تفعيل تحديد المعدل، الرد على التعليقات الأحدث أولاً')}
                  </Text>
                </div>
              </Form.Item>
            </Form>
          </TabPane>
          
          {/* Data Management Tab */}
          <TabPane 
            tab={<span><DatabaseOutlined /> {t('comment_response.data_management', 'إدارة البيانات')}</span>} 
            key="data"
            disabled={!hasProFeatures}
          >
            <Alert
              message={t('comment_response.data_management_settings', 'إعدادات إدارة البيانات')}
              description={t('comment_response.data_management_desc', 'تحكم في كيفية تخزين وإدارة بيانات الرد على التعليقات')}
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />
            
            <Form layout="vertical">
              <Form.Item
                label={t('comment_response.response_retention', 'الاحتفاظ بسجلات الرد')}
                name="dataManagement_responseRetentionLimit"
              >
                <InputNumber 
                  min={DATA_LIMITS.MIN_RESPONSE_RETENTION} 
                  max={DATA_LIMITS.MAX_RESPONSE_RETENTION}
                  value={formData.dataManagement.responseRetentionLimit}
                  onChange={(value) => {
                    setFormData({
                      ...formData,
                      dataManagement: {
                        ...formData.dataManagement,
                        responseRetentionLimit: value
                      }
                    });
                  }}
                />
                <Text type="secondary" style={{ display: 'block' }}>
                  {t('comment_response.retention_hint', 'الحد الأقصى لعدد سجلات الرد للاحتفاظ بها')}
                </Text>
              </Form.Item>
              
              <Form.Item
                label={t('comment_response.auto_archive', 'أرشفة تلقائية')}
                name="dataManagement_autoArchiveAfterDays"
              >
                <InputNumber 
                  min={0} 
                  max={DATA_LIMITS.MAX_AUTO_ARCHIVE_DAYS}
                  value={formData.dataManagement.autoArchiveAfterDays}
                  onChange={(value) => {
                    setFormData({
                      ...formData,
                      dataManagement: {
                        ...formData.dataManagement,
                        autoArchiveAfterDays: value
                      }
                    });
                  }}
                />
                <Text type="secondary" style={{ display: 'block' }}>
                  {t('comment_response.auto_archive_hint', 'أرشفة المراقبة تلقائياً بعد عدد من الأيام من عدم النشاط (0 = معطل)')}
                </Text>
              </Form.Item>
              
              <Form.Item
                name="enableDetailedLogging"
                valuePropName="checked"
              >
                <Switch
                  checkedChildren={<CheckOutlined />}
                  unCheckedChildren={<CloseOutlined />}
                  checked={formData.enableDetailedLogging}
                  onChange={(checked) => {
                    handleInputChange({
                      target: {
                        name: 'enableDetailedLogging',
                        checked,
                        type: 'checkbox'
                      }
                    });
                  }}
                />
                <Text style={{ marginLeft: '8px' }}>
                  {t('comment_response.detailed_logging', 'تسجيل مفصل')}
                </Text>
                <div>
                  <Text type="secondary">
                    {t('comment_response.detailed_logging_hint', 'الاحتفاظ بسجلات مفصلة لجميع عمليات المراقبة')}
                  </Text>
                </div>
              </Form.Item>
            </Form>
          </TabPane>
          
          {/* Notification Settings Tab */}
          <TabPane 
            tab={<span><BellOutlined /> {t('comment_response.notifications', 'الإشعارات')}</span>} 
            key="notifications"
            disabled={!hasProFeatures}
          >
            <Alert
              message={t('comment_response.notification_settings', 'إعدادات الإشعارات')}
              description={t('comment_response.notification_desc', 'تحكم في متى وكيف تتلقى إشعارات حول المراقبة')}
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />
            
            <Form layout="vertical">
              <Form.Item
                name="notifications_notifyOnErrors"
                valuePropName="checked"
              >
                <Switch
                  checkedChildren={<CheckOutlined />}
                  unCheckedChildren={<CloseOutlined />}
                  checked={formData.notifications.notifyOnErrors}
                  onChange={(checked) => {
                    handleInputChange({
                      target: {
                        name: 'notifications_notifyOnErrors',
                        checked,
                        type: 'checkbox'
                      }
                    });
                  }}
                />
                <Text style={{ marginLeft: '8px' }}>
                  {t('comment_response.notify_errors', 'إشعار عند حدوث أخطاء')}
                </Text>
              </Form.Item>
              
              <Form.Item
                name="notifications_notifyOnRateLimits"
                valuePropName="checked"
              >
                <Switch
                  checkedChildren={<CheckOutlined />}
                  unCheckedChildren={<CloseOutlined />}
                  checked={formData.notifications.notifyOnRateLimits}
                  onChange={(checked) => {
                    handleInputChange({
                      target: {
                        name: 'notifications_notifyOnRateLimits',
                        checked,
                        type: 'checkbox'
                      }
                    });
                  }}
                />
                <Text style={{ marginLeft: '8px' }}>
                  {t('comment_response.notify_rate_limits', 'إشعار عند بلوغ حدود المعدل')}
                </Text>
              </Form.Item>
              
              <Form.Item
                label={t('comment_response.notification_email', 'البريد الإلكتروني للإشعارات')}
                name="notifications_notificationEmail"
              >
                <Input
                  name="notifications_notificationEmail"
                  value={formData.notifications.notificationEmail}
                  onChange={handleInputChange}
                  placeholder={t('comment_response.email_placeholder', 'أدخل البريد الإلكتروني (اختياري، يتم استخدام بريد المستخدم إذا تُرك فارغًا)')}
                />
              </Form.Item>
            </Form>
          </TabPane>
        </Tabs>
      </Modal>

      {/* Enhanced Monitor Details Modal */}
      <Modal
        title={t('comment_response.monitor_details', 'تفاصيل المراقبة')}
        open={showDetailsModal}
        onCancel={() => setShowDetailsModal(false)}
        footer={[
          <Button key="close" onClick={() => setShowDetailsModal(false)}>
            {t('common.close', 'إغلاق')}
          </Button>,
          detailsMonitor && (
            <Button 
              key="check" 
              type="default"
              icon={<SyncOutlined />}
              onClick={() => {
                triggerMonitorCheck(detailsMonitor._id);
                setShowDetailsModal(false);
              }}
              loading={triggering}
              disabled={detailsMonitor.status !== 'active'}
            >
              {t('comment_response.check_now', 'فحص الآن')}
            </Button>
          ),
          detailsMonitor && (
            <Button 
              key="visit" 
              type="primary"
              icon={<FacebookOutlined />}
              href={`https://facebook.com/${detailsMonitor.pageId}`}
              target="_blank"
            >
              {t('comment_response.visit_page', 'زيارة الصفحة')}
            </Button>
          )
        ]}
        width={800}
      >
        {detailsMonitor && (
          <Tabs defaultActiveKey="1">
            <TabPane tab={t('comment_response.overview', 'نظرة عامة')} key="1">
              <Title level={4}>{detailsMonitor.name}</Title>
              {detailsMonitor.description && (
                <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
                  {detailsMonitor.description}
                </Text>
              )}
              
              <Tag color={detailsMonitor.status === 'active' ? 'success' : 'default'} style={{ marginBottom: '16px' }}>
                {detailsMonitor.status === 'active' 
                  ? t('comment_response.active', 'نشط') 
                  : t('comment_response.paused', 'متوقف')}
              </Tag>
              
              <Divider />
              
              <Row gutter={24}>
                <Col span={12}>
                  <Title level={5}>{t('comment_response.page_details', 'تفاصيل الصفحة')}</Title>
                  <p><Text strong>{t('comment_response.page_name', 'اسم الصفحة')}:</Text> {detailsMonitor.pageName}</p>
                  <p><Text strong>{t('comment_response.page_id', 'معرف الصفحة')}:</Text> {detailsMonitor.pageId}</p>
                  <p>
                    <Text strong>{t('comment_response.fb_link', 'رابط الصفحة')}:</Text>{' '}
                    <a href={`https://facebook.com/${detailsMonitor.pageId}`} target="_blank" rel="noopener noreferrer">
                      {t('comment_response.open_facebook', 'فتح في فيسبوك')} <LinkOutlined />
                    </a>
                  </p>
                </Col>
                <Col span={12}>
                  <Title level={5}>{t('comment_response.monitoring_settings', 'إعدادات المراقبة')}</Title>
                  <p>
                    <Text strong>{t('comment_response.monitoring_type', 'نوع المراقبة')}:</Text>{' '}
                    {detailsMonitor.monitorAllPosts 
                      ? t('comment_response.all_posts', 'جميع المنشورات') 
                      : `${detailsMonitor.posts?.length || 0} ${t('comment_response.selected_posts', 'منشورات')}`}
                  </p>
                  <p>
                    <Text strong>{t('comment_response.check_frequency', 'تكرار الفحص')}:</Text>{' '}
                    {t('comment_response.every_minutes', 'كل')} {detailsMonitor.checkFrequencyMinutes || 5} {t('comment_response.minutes', 'دقائق')}
                  </p>
                  <p>
                    <Text strong>{t('comment_response.existing_comments', 'التعليقات السابقة')}:</Text>{' '}
                    {detailsMonitor.replyToExistingComments 
                      ? t('comment_response.included', 'مشمولة') 
                      : t('comment_response.excluded', 'غير مشمولة')}
                  </p>
                  {detailsMonitor.healthStatus && (
                    <p>
                      <Text strong>{t('comment_response.health_status', 'حالة الصحة')}:</Text>{' '}
                      {getHealthBadge(detailsMonitor)}
                    </p>
                  )}
                </Col>
              </Row>
              
              <Divider />
              
              <Row gutter={24}>
                <Col span={24}>
                  <Title level={5}>{t('comment_response.response_settings', 'إعدادات الرد')}</Title>
                  <Row gutter={24}>
                    <Col span={12}>
                      <p>
                        <Text strong>{t('comment_response.respond_to_all', 'الرد على الكل')}:</Text>{' '}
                        {detailsMonitor.respondToAll 
                          ? t('common.yes', 'نعم') 
                          : t('common.no', 'لا')}
                      </p>
                      {detailsMonitor.respondToAll && detailsMonitor.defaultResponse && (
                        <p>
                          <Text strong>{t('comment_response.default_response', 'الرد الافتراضي')}:</Text>{' '}
                          {detailsMonitor.defaultResponse}
                        </p>
                      )}
                      <p>
                        <Text strong>{t('comment_response.rules_count', 'عدد القواعد المطبقة')}:</Text>{' '}
                        {detailsMonitor.responseRules?.length || 0}
                      </p>
                      
                      {detailsMonitor.responseBehavior && (
                        <>
                          <p>
                            <Text strong>{t('comment_response.sentiment_analysis', 'تحليل المشاعر')}:</Text>{' '}
                            {detailsMonitor.responseBehavior.useSentimentAnalysis 
                              ? t('common.enabled', 'مفعل') 
                              : t('common.disabled', 'معطل')}
                          </p>
                          <p>
                            <Text strong>{t('comment_response.response_selection', 'اختيار الرد')}:</Text>{' '}
                            {detailsMonitor.responseBehavior.rotateResponses 
                              ? t('comment_response.rotate', 'تدوير') 
                              : t('comment_response.random', 'عشوائي')}
                          </p>
                        </>
                      )}
                    </Col>
                    
                    <Col span={12}>
                      {detailsMonitor.filters && (
                        <>
                          <p>
                            <Text strong>{t('comment_response.filtering', 'التصفية')}:</Text>
                          </p>
                          {detailsMonitor.filters.skipSpam && (
                            <p>
                              <CheckOutlined style={{ color: 'green' }} />{' '}
                              {t('comment_response.skip_spam_comments', 'تخطي تعليقات البريد المزعج')}
                            </p>
                          )}
                          {detailsMonitor.filters.minCommentLength > 0 && (
                            <p>
                              <CheckOutlined style={{ color: 'green' }} />{' '}
                              {t('comment_response.min_length_filter', 'الحد الأدنى للطول')}: {detailsMonitor.filters.minCommentLength}
                            </p>
                          )}
                        </>
                      )}
                      
                      {detailsMonitor.rateLimiting && (
                        <p>
                          <Text strong>{t('comment_response.rate_limit', 'حد المعدل')}:</Text>{' '}
                          {detailsMonitor.rateLimiting.maxResponsesPerHour} {t('comment_response.per_hour', 'في الساعة')}
                        </p>
                      )}
                    </Col>
                  </Row>
                </Col>
              </Row>
            </TabPane>
            
            <TabPane tab={t('comment_response.statistics', 'الإحصائيات')} key="2">
              <Row gutter={24}>
                <Col span={8}>
                  <Statistic 
                    title={t('comment_response.comments_found', 'التعليقات المكتشفة')}
                    value={detailsMonitor.stats?.commentsFound || 0}
                    style={{ marginBottom: '20px' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic 
                    title={t('comment_response.responses_sent', 'الردود المرسلة')}
                    value={detailsMonitor.stats?.commentsResponded || 0}
                    style={{ marginBottom: '20px' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic 
                    title={t('comment_response.success_rate', 'معدل النجاح')}
                    value={
                      detailsMonitor.stats?.commentsFound > 0 
                        ? Math.round((detailsMonitor.stats.commentsResponded / detailsMonitor.stats.commentsFound) * 100) 
                        : 0
                    }
                    suffix="%"
                    style={{ marginBottom: '20px' }}
                  />
                </Col>
              </Row>
              
              <Divider />
              
              {detailsMonitor.stats?.lastCommentCheckedTime && (
                <p>
                  <Text strong>{t('comment_response.last_check', 'آخر فحص')}:</Text>{' '}
                  {new Date(detailsMonitor.stats.lastCommentCheckedTime).toLocaleString()}
                </p>
              )}
              
              {detailsMonitor.stats?.lastResponseTime && (
                <p>
                  <Text strong>{t('comment_response.last_response', 'آخر رد')}:</Text>{' '}
                  {new Date(detailsMonitor.stats.lastResponseTime).toLocaleString()}
                </p>
              )}
              
              {getSentimentStats(detailsMonitor)}
            </TabPane>
            
            <TabPane tab={t('comment_response.posts', 'المنشورات')} key="3">
              {/* Selected Posts List (if not monitoring all) */}
              {!detailsMonitor.monitorAllPosts && detailsMonitor.posts && detailsMonitor.posts.length > 0 ? (
                <>
                  <Title level={5}>{t('comment_response.monitored_posts', 'المنشورات التي تتم مراقبتها')}</Title>
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <List
                      itemLayout="horizontal"
                      dataSource={detailsMonitor.posts}
                      renderItem={post => (
                        <List.Item>
                          <div style={{ width: '100%' }}>
                            <div>
                              {post.message || t('comment_response.no_text', '(بدون نص)')}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                {new Date(post.createdTime).toLocaleString()}
                              </Text>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                ID: {post.id}
                              </Text>
                            </div>
                            {post.stats && (
                              <div style={{ marginTop: '8px' }}>
                                <Tag color="blue">
                                  {t('comment_response.comments', 'التعليقات')}: {post.stats.commentsFound || 0}
                                </Tag>
                                <Tag color="green">
                                  {t('comment_response.responses', 'الردود')}: {post.stats.commentsResponded || 0}
                                </Tag>
                              </div>
                            )}
                          </div>
                        </List.Item>
                      )}
                    />
                  </div>
                </>
              ) : (
                <>
                  <Title level={5}>{t('comment_response.all_posts_monitoring', 'مراقبة جميع المنشورات')}</Title>
                  <Paragraph>
                    {t('comment_response.all_posts_description', 'تتم مراقبة جميع منشورات الصفحة، بما في ذلك المنشورات الجديدة.')}
                  </Paragraph>
                  
                  {detailsMonitor.maxPostsToMonitor && (
                    <Alert
                      message={t('comment_response.max_posts_limit', 'حد المنشورات')}
                      description={t('comment_response.max_posts_limit_description', 'سيتم مراقبة ما يصل إلى {limit} منشور في كل مرة.').replace('{limit}', detailsMonitor.maxPostsToMonitor)}
                      type="info"
                      showIcon
                    />
                  )}
                </>
              )}
            </TabPane>
            
            <TabPane tab={t('comment_response.rules', 'القواعد')} key="4">
              {/* Applied Rules List */}
              {detailsMonitor.responseRules && detailsMonitor.responseRules.length > 0 ? (
                <>
                  <Title level={5}>{t('comment_response.applied_rules', 'القواعد المطبقة')}</Title>
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <List
                      itemLayout="horizontal"
                      dataSource={detailsMonitor.responseRules}
                      renderItem={rule => (
                        <List.Item>
                          <div>
                            <Text strong>{typeof rule === 'object' ? rule.name : rule}</Text>
                            {typeof rule === 'object' && rule.keywords && (
                              <div>
                                <Text type="secondary">
                                  {t('comment_response.keywords', 'الكلمات المفتاحية')}: {rule.keywords.join(', ')}
                                </Text>
                              </div>
                            )}
                          </div>
                        </List.Item>
                      )}
                    />
                  </div>
                </>
              ) : (
                <>
                  {detailsMonitor.respondToAll ? (
                    <Alert
                      message={t('comment_response.responding_to_all', 'الرد على جميع التعليقات')}
                      description={
                        <>
                          <p>{t('comment_response.using_default_response', 'استخدام الرد الافتراضي لجميع التعليقات:')}</p>
                          <blockquote>
                            <Text strong>{detailsMonitor.defaultResponse}</Text>
                          </blockquote>
                        </>
                      }
                      type="info"
                      showIcon
                    />
                  ) : (
                    <Alert
                      message={t('comment_response.no_rules', 'لا توجد قواعد')}
                      description={t('comment_response.no_rules_description', 'لم يتم تطبيق أي قواعد رد على هذه المراقبة.')}
                      type="warning"
                      showIcon
                    />
                  )}
                </>
              )}
            </TabPane>
            
            {hasProFeatures && (
              <TabPane tab={t('comment_response.advanced', 'إعدادات متقدمة')} key="5">
                <Collapse defaultActiveKey={['filters']}>
                  <Panel header={t('comment_response.filtering_settings', 'إعدادات التصفية')} key="filters">
                    {detailsMonitor.filters ? (
                      <>
                        <p><Text strong>{t('comment_response.skip_spam', 'تخطي البريد المزعج')}:</Text> {detailsMonitor.filters.skipSpam ? t('common.yes', 'نعم') : t('common.no', 'لا')}</p>
                        
                        {detailsMonitor.filters.minCommentLength > 0 && (
                          <p><Text strong>{t('comment_response.min_comment_length', 'الحد الأدنى لطول التعليق')}:</Text> {detailsMonitor.filters.minCommentLength}</p>
                        )}
                        
                        {detailsMonitor.filters.excludeCommenters && (
                          <p><Text strong>{t('comment_response.excluded_commenters', 'المعلقين المستبعدين')}:</Text> {detailsMonitor.filters.excludeCommenters}</p>
                        )}
                        
                        {detailsMonitor.filters.mustContain && (
                          <p><Text strong>{t('comment_response.must_contain', 'يجب أن يحتوي على')}:</Text> {detailsMonitor.filters.mustContain}</p>
                        )}
                        
                        {detailsMonitor.filters.mustNotContain && (
                          <p><Text strong>{t('comment_response.must_not_contain', 'يجب ألا يحتوي على')}:</Text> {detailsMonitor.filters.mustNotContain}</p>
                        )}
                      </>
                    ) : (
                      <Alert
                        message={t('comment_response.no_filters', 'لا توجد مرشحات')}
                        description={t('comment_response.no_filters_description', 'لم يتم تكوين أي مرشحات خاصة لهذه المراقبة.')}
                        type="info"
                        showIcon
                      />
                    )}
                  </Panel>
                  
                  <Panel header={t('comment_response.response_behavior', 'سلوك الرد')} key="behavior">
                    {detailsMonitor.responseBehavior ? (
                      <>
                        <p><Text strong>{t('comment_response.sentiment_analysis', 'تحليل المشاعر')}:</Text> {detailsMonitor.responseBehavior.useSentimentAnalysis ? t('common.enabled', 'مفعل') : t('common.disabled', 'معطل')}</p>
                        
                        <p><Text strong>{t('comment_response.response_rotation', 'تدوير الردود')}:</Text> {detailsMonitor.responseBehavior.rotateResponses ? t('common.enabled', 'مفعل') : t('common.disabled', 'معطل')}</p>
                        
                        {detailsMonitor.responseBehavior.enableCustomPrompts && (
                          <>
                            <p><Text strong>{t('comment_response.custom_prompts', 'الردود المخصصة')}:</Text> {t('common.enabled', 'مفعل')}</p>
                            
                            {detailsMonitor.responseBehavior.promptTemplate && (
                              <p><Text strong>{t('comment_response.prompt_template', 'قالب الرد')}:</Text> {detailsMonitor.responseBehavior.promptTemplate}</p>
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      <Alert
                        message={t('comment_response.default_behavior', 'السلوك الافتراضي')}
                        description={t('comment_response.default_behavior_description', 'يتم استخدام سلوك الرد الافتراضي.')}
                        type="info"
                        showIcon
                      />
                    )}
                  </Panel>
                  
                  <Panel header={t('comment_response.rate_limiting', 'تحديد المعدل')} key="ratelimit">
                    {detailsMonitor.rateLimiting ? (
                      <>
                        <p><Text strong>{t('comment_response.max_responses_hour', 'الحد الأقصى للردود في الساعة')}:</Text> {detailsMonitor.rateLimiting.maxResponsesPerHour || 'غير محدود'}</p>
                        
                        <p><Text strong>{t('comment_response.min_seconds_between', 'الحد الأدنى من الثواني بين الردود')}:</Text> {detailsMonitor.rateLimiting.minSecondsBetweenResponses}</p>
                        
                        <p><Text strong>{t('comment_response.prioritize_newer', 'إعطاء الأولوية للتعليقات الأحدث')}:</Text> {detailsMonitor.rateLimiting.prioritizeNewerComments ? t('common.yes', 'نعم') : t('common.no', 'لا')}</p>
                      </>
                    ) : (
                      <Alert
                        message={t('comment_response.no_rate_limiting', 'لا يوجد تحديد معدل')}
                        description={t('comment_response.no_rate_limiting_description', 'لم يتم تكوين تحديد المعدل لهذه المراقبة.')}
                        type="info"
                        showIcon
                      />
                    )}
                  </Panel>
                  
                  <Panel header={t('comment_response.data_management', 'إدارة البيانات')} key="data">
                    {detailsMonitor.dataManagement ? (
                      <>
                        <p><Text strong>{t('comment_response.response_retention', 'الاحتفاظ بسجلات الرد')}:</Text> {detailsMonitor.dataManagement.responseRetentionLimit}</p>
                        
                        <p><Text strong>{t('comment_response.auto_archive', 'أرشفة تلقائية بعد')}:</Text> {detailsMonitor.dataManagement.autoArchiveAfterDays || 'معطل'} {detailsMonitor.dataManagement.autoArchiveAfterDays ? t('common.days', 'يوم') : ''}</p>
                      </>
                    ) : (
                      <Alert
                        message={t('comment_response.default_data_management', 'إدارة البيانات الافتراضية')}
                        description={t('comment_response.default_data_description', 'يتم استخدام إعدادات إدارة البيانات الافتراضية.')}
                        type="info"
                        showIcon
                      />
                    )}
                    
                    <p><Text strong>{t('comment_response.detailed_logging', 'تسجيل مفصل')}:</Text> {detailsMonitor.enableDetailedLogging ? t('common.enabled', 'مفعل') : t('common.disabled', 'معطل')}</p>
                  </Panel>
                </Collapse>
              </TabPane>
            )}
          </Tabs>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        title={t('comment_response.confirm_delete', 'تأكيد الحذف')}
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        footer={[
          <Button key="cancel" onClick={() => setConfirmDelete(false)}>
            {t('common.cancel', 'إلغاء')}
          </Button>,
          <Button 
            key="delete" 
            type="primary" 
            danger
            loading={loading}
            onClick={handleConfirmDelete}
          >
            {t('common.delete', 'حذف')}
          </Button>
        ]}
      >
        <p>{t('comment_response.delete_monitor_confirm', 'هل أنت متأكد من حذف هذه المراقبة؟ سيتم إيقاف الرد التلقائي على التعليقات المتعلقة بها. هذا الإجراء لا يمكن التراجع عنه.')}</p>
      </Modal>
    </div>
  );
};

export default CommentMonitors;