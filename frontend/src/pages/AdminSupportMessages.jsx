import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Button, Space, Form, Input, Card, Typography, 
  Row, Col, Statistic, Select, Divider, Badge, Tag, List, Table,
  Avatar, Tooltip, Spin, DatePicker, message, Empty, Timeline, Dropdown,
  Modal, Tabs, Progress, Checkbox, Radio, Menu, Drawer, Alert, Switch,
  Upload, notification
} from 'antd';
import { 
  UserOutlined, MessageOutlined, CheckCircleOutlined, SyncOutlined,
  ClockCircleOutlined, ExclamationCircleOutlined, SearchOutlined,
  FilterOutlined, ReloadOutlined, MailOutlined,
  EyeOutlined, CloseOutlined, LockOutlined, CommentOutlined,
  InfoCircleOutlined, CalendarOutlined, BellOutlined, MenuOutlined,
  TeamOutlined, SaveOutlined, FileTextOutlined, EditOutlined,
  PushpinOutlined, BarChartOutlined, LineChartOutlined, PieChartOutlined,
  FileAddOutlined, SendOutlined, DeleteOutlined, BookOutlined,
  StarOutlined, StopOutlined, TagOutlined, SolutionOutlined,
  ThunderboltOutlined, UploadOutlined, QuestionCircleOutlined, LikeOutlined
} from '@ant-design/icons';
import ContentContainer from '../components/ContentContainer';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import { useMessage } from '../context/MessageContext';
import { useLanguage } from '../context/LanguageContext';
import '../styles/AdminSupportMessages.css';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { formatDate, formatDateTime, formatRelativeTime } from '../utils/dateUtils';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const AdminSupportMessages = () => {
  // Refs
  const messageListRef = useRef(null);
  const replyInputRef = useRef(null);
  
  // State variables
  const [messages, setMessages] = useState([]);
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [messageDetailVisible, setMessageDetailVisible] = useState(false);
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dateRange, setDateRange] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [bulkActionVisible, setBulkActionVisible] = useState(false);
  const [bulkAction, setBulkAction] = useState('status');
  const [bulkStatusValue, setBulkStatusValue] = useState('in-progress');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [assignmentModalVisible, setAssignmentModalVisible] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState(null);
  const [adminTeam, setAdminTeam] = useState([]);
  const [templateDrawerVisible, setTemplateDrawerVisible] = useState(false);
  const [responseTemplates, setResponseTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateFormVisible, setTemplateFormVisible] = useState(false);
  const [internalNoteVisible, setInternalNoteVisible] = useState(false);
  const [internalNoteText, setInternalNoteText] = useState('');
  const [timeRangeStats, setTimeRangeStats] = useState('week');
  // Initialize analytics data with default empty structure
  const [analyticsData, setAnalyticsData] = useState({
    responseTimeAvg: 0,
    responseTimeByCategory: {
      technical: 0,
      billing: 0,
      general: 0,
      bug: 0,
      feature: 0
    },
    resolutionRate: 0,
    messageVolume: [],
    categoryDistribution: [],
    statusDistribution: []
  });
  const [messageStatistics, setMessageStatistics] = useState({
    total: 0,
    new: 0,
    inProgress: 0,
    resolved: 0
  });

  // Forms
  const [replyForm] = Form.useForm();
  const [templateForm] = Form.useForm();
  const [noteForm] = Form.useForm();
  const [assignForm] = Form.useForm();

  // Context
  const { user: currentUser } = useUser();
  const { showError, showLoading, updateMessage } = useMessage();
  const { t } = useLanguage();

  // Fetch admin team
  const fetchAdminTeam = useCallback(async () => {
    try {
      const loadingKey = 'loading-admin-team';
      showLoading(t('loading_admin_team'), loadingKey);
      
      const response = await axios.get('/api/admin/team');
      setAdminTeam(response.data);
      
      updateMessage('success', t('admin_team_loaded'), loadingKey);
    } catch (error) {
      console.error('Error fetching admin team:', error);
      showError('فشل في جلب بيانات فريق الإدارة');
      setAdminTeam([]);
    }
  }, [showLoading, updateMessage, showError]);

  // Fetch response templates
  const fetchTemplates = useCallback(async () => {
    try {
      const loadingKey = 'loading-templates';
      showLoading(t('loading_templates'), loadingKey);
      
      const response = await axios.get('/api/support/templates');
      setResponseTemplates(response.data);
      
      updateMessage('success', t('templates_loaded'), loadingKey);
    } catch (error) {
      console.error('Error fetching templates:', error);
      showError('فشل في جلب قوالب الردود');
      setResponseTemplates([]);
    }
  }, [showLoading, updateMessage, showError]);

  // Fetch analytics data
  const fetchAnalyticsData = useCallback(async () => {
    try {
      const loadingKey = 'loading-analytics';
      showLoading(t('loading_analytics'), loadingKey);
      
      const response = await axios.get(`/api/support/admin/analytics?timeRange=${timeRangeStats}`);
      setAnalyticsData(response.data);
      
      updateMessage('success', t('analytics_loaded'), loadingKey);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      showError('فشل في جلب بيانات التحليل');
      // Initialize with empty structure to avoid rendering errors
      setAnalyticsData({
        responseTimeAvg: 0,
        responseTimeByCategory: {
          technical: 0,
          billing: 0,
          general: 0,
          bug: 0,
          feature: 0
        },
        resolutionRate: 0,
        messageVolume: [],
        categoryDistribution: [],
        statusDistribution: []
      });
    }
  }, [timeRangeStats, showLoading, updateMessage, showError]);

  useEffect(() => {
    if (currentUser && currentUser.role === 'admin') {
      fetchAdminTeam();
      fetchTemplates();
    }
  }, [currentUser, fetchAdminTeam, fetchTemplates]);

  // Fetch analytics data when timeRangeStats changes
  useEffect(() => {
    if (currentUser && currentUser.role === 'admin' && activeTab === 'dashboard') {
      fetchAnalyticsData();
    }
  }, [currentUser, activeTab, timeRangeStats, fetchAnalyticsData]);


  // Find automatic response template based on message category
  const findAutoResponseTemplate = useCallback((message) => {
    if (!message || !message.category || !responseTemplates.length) return null;
    
    // Find a template matching the message category
    const matchingTemplates = responseTemplates.filter(
      template => template.category === message.category
    );
    
    if (matchingTemplates.length > 0) {
      // Return the first matching template
      return matchingTemplates[0];
    }
    
    // If no category-specific template, return a general one
    const generalTemplates = responseTemplates.filter(
      template => template.category === 'general'
    );
    
    return generalTemplates.length > 0 ? generalTemplates[0] : null;
  }, [responseTemplates]);
  
  // Auto respond to new messages
  const autoRespondToNewMessages = useCallback(async (messages) => {
    if (!messages || !messages.length) return;
    
    // Find new messages without responses
    const newUnrespondedMessages = messages.filter(
      msg => msg.status === 'new' && (!msg.responses || msg.responses.length === 0)
    );
    
    if (newUnrespondedMessages.length === 0) return;
    
    // Auto respond to each new message
    for (const message of newUnrespondedMessages) {
      const template = findAutoResponseTemplate(message);
      
      if (template) {
        try {
          // Send automatic response
          await axios.post(`/api/support/admin/messages/${message._id}/respond`, {
            message: template.content,
            isAutomatic: true
          });
          
          // Update UI optimistically
          setMessages(prevMessages => prevMessages.map(msg => {
            if (msg._id === message._id) {
              return {
                ...msg,
                status: 'in-progress',
                responses: [...(msg.responses || []), {
                  _id: Date.now().toString(),
                  adminId: 'auto_system',
                  adminName: 'النظام التلقائي',
                  message: template.content,
                  createdAt: new Date().toISOString(),
                  isAdminResponse: true,
                  isAutomatic: true
                }]
              };
            }
            return msg;
          }));
          
          notification.success({
            message: 'تم الرد تلقائيًا',
            description: `تم إرسال رد تلقائي على رسالة "${message.subject}"`,
            placement: 'bottomRight'
          });
        } catch (error) {
          console.error('Error sending automatic response:', error);
          // Silently fail for automatic responses
        }
      }
    }
  }, [findAutoResponseTemplate]);

  // Fetch all support messages
  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const loadingKey = 'loading-messages';
      showLoading(t('loading_messages'), loadingKey);

      const response = await axios.get('/api/support/admin/messages');
      const fetchedMessages = response.data;
      
      setMessages(fetchedMessages);
      setFilteredMessages(fetchedMessages);

      // Calculate statistics
      const stats = {
        total: fetchedMessages.length,
        new: fetchedMessages.filter(msg => msg.status === 'new').length,
        inProgress: fetchedMessages.filter(msg => msg.status === 'in-progress').length,
        resolved: fetchedMessages.filter(msg => msg.status === 'resolved').length
      };
      setMessageStatistics(stats);

      updateMessage('success', t('messages_loaded'), loadingKey);
      
      // Automatically respond to new messages after templates are loaded
      if (responseTemplates.length > 0) {
        autoRespondToNewMessages(fetchedMessages);
      }
    } catch (error) {
      console.error('Error fetching support messages:', error);
      showError(t('failed_load_messages'));
      setMessages([]);
      setFilteredMessages([]);
      setMessageStatistics({
        total: 0,
        new: 0,
        inProgress: 0,
        resolved: 0
      });
    } finally {
      setLoading(false);
    }
  }, [showLoading, updateMessage, showError, autoRespondToNewMessages, responseTemplates]);


  useEffect(() => {
    // Only fetch if the current user is an admin
    if (currentUser && currentUser.role === 'admin') {
      fetchMessages();
    }
  }, [currentUser, fetchMessages]);

  // Apply filters
  useEffect(() => {
    if (messages.length > 0) {
      let result = [...messages];

      // Apply search text filter
      if (searchText) {
        const searchTextLower = searchText.toLowerCase();
        result = result.filter(msg =>
          msg.subject.toLowerCase().includes(searchTextLower) ||
          msg.message.toLowerCase().includes(searchTextLower) ||
          msg.userName.toLowerCase().includes(searchTextLower) ||
          msg.userEmail.toLowerCase().includes(searchTextLower)
        );
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        result = result.filter(msg => msg.status === statusFilter);
      }

      // Apply category filter
      if (categoryFilter !== 'all') {
        result = result.filter(msg => msg.category === categoryFilter);
      }

      // Apply priority filter
      if (priorityFilter !== 'all') {
        result = result.filter(msg => msg.priority === priorityFilter);
      }

      // Apply assignee filter
      if (assigneeFilter !== 'all') {
        if (assigneeFilter === 'unassigned') {
          result = result.filter(msg => !msg.assignedTo);
        } else {
          result = result.filter(msg => msg.assignedTo === assigneeFilter);
        }
      }

      // Apply date range filter
      if (dateRange && dateRange[0] && dateRange[1]) {
        const startDate = dateRange[0].startOf('day');
        const endDate = dateRange[1].endOf('day');

        result = result.filter(msg => {
          const createdAt = new Date(msg.createdAt);
          return createdAt >= startDate && createdAt <= endDate;
        });
      }

      setFilteredMessages(result);
    }
  }, [messages, searchText, statusFilter, categoryFilter, priorityFilter, dateRange, assigneeFilter]);

  // Reset filters
  const resetFilters = () => {
    setSearchText('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setPriorityFilter('all');
    setAssigneeFilter('all');
    setDateRange(null);
  };

  // Handle viewing message details
  const handleViewMessageDetails = (message) => {
    setSelectedMessage(message);
    setMessageDetailVisible(true);
  };

  // Handle reply to a message
  const handleReplyToMessage = (message) => {
    setSelectedMessage(message);
    replyForm.resetFields();
    setReplyModalVisible(true);
  };

  // Handle applying template to reply
  const handleApplyTemplate = (template) => {
    if (!template) {
      showError('لم يتم اختيار قالب صالح');
      return;
    }
    
    try {
      // Make sure we're using the correct property (content) from the template
      const templateContent = template.content;
      
      // Update form and state
      setReplyText(templateContent);
      replyForm.setFieldsValue({ reply: templateContent });
      
      // Close the template drawer
      setTemplateDrawerVisible(false);
      message.success(`تم تطبيق قالب "${template.name || template.title}" بنجاح`);
      
      // Focus on the reply textarea and position cursor at the end
      setTimeout(() => {
        if (replyInputRef.current) {
          replyInputRef.current.focus();
          const textLength = templateContent.length;
          replyInputRef.current.setSelectionRange(textLength, textLength);
        }
      }, 100);
      
      
      // Increment the usage count for the template
      axios.put(`/api/support/templates/${template._id}/use`)
        .then(() => {
          // Update template usage count in local state
          setResponseTemplates(prevTemplates => 
            prevTemplates.map(t => t._id === template._id 
              ? {...t, usageCount: (t.usageCount || 0) + 1} 
              : t
            )
          );
        })
        .catch(error => {
          console.error('Error incrementing template usage:', error);
          // Continue silently - this is not critical
        });
    } catch (error) {
      console.error('Error applying template:', error);
      showError('حدث خطأ أثناء تطبيق القالب');
    }
  };

  // Handle creating a new template
  const handleCreateTemplate = async () => {
    try {
      const values = await templateForm.validateFields();
      const loadingKey = 'creating-template';
      showLoading('جاري إنشاء قالب جديد...', loadingKey);
      
      const response = await axios.post('/api/support/templates', {
        name: values.title,
        category: values.category,
        content: values.content
      });
      
      const newTemplate = response.data;
      setResponseTemplates([...responseTemplates, newTemplate]);
      
      updateMessage('success', 'تم إنشاء قالب الرد بنجاح', loadingKey);
      templateForm.resetFields();
      setTemplateFormVisible(false);
      
      // Immediately fetch templates again to ensure synchronization
      fetchTemplates();
      
    } catch (error) {
      console.error('Error creating template:', error);
      showError('فشل في إنشاء قالب الرد');
    }
  };

  // Handle adding internal note
  const handleAddInternalNote = async () => {
    try {
      const values = await noteForm.validateFields();
      
      if (selectedMessage) {
        const loadingKey = 'adding-note';
        showLoading('جاري إضافة ملاحظة داخلية...', loadingKey);
        
        const response = await axios.post(`/api/support/admin/messages/${selectedMessage._id}/note`, {
          note: values.note
        });
        
        const updatedMessage = response.data;
        
        // Update the message in the local state
        const updatedMessages = messages.map(msg => 
          msg._id === selectedMessage._id ? updatedMessage : msg
        );
        
        setMessages(updatedMessages);
        setSelectedMessage(updatedMessage);
        
        updateMessage('success', 'تمت إضافة الملاحظة الداخلية بنجاح', loadingKey);
        setInternalNoteVisible(false);
        noteForm.resetFields();
      }
    } catch (error) {
      console.error('Error adding internal note:', error);
      showError('فشل في إضافة الملاحظة الداخلية');
    }
  };

  // Handle assigning message to admin
  const handleAssignMessage = async () => {
    try {
      const values = await assignForm.validateFields();
      const assignToId = values.assignTo;
      const assignToAdmin = adminTeam.find(admin => admin.id === assignToId || admin._id === assignToId);
      
      if (selectedMessage && assignToAdmin) {
        const loadingKey = 'assigning-message';
        showLoading('جاري تعيين الرسالة...', loadingKey);
        
        const response = await axios.put(`/api/support/admin/messages/${selectedMessage._id}/assign`, {
          adminId: assignToAdmin.id || assignToAdmin._id,
          adminName: assignToAdmin.name
        });
        
        const updatedMessage = response.data;
        
        // Update the message in the local state
        const updatedMessages = messages.map(msg => 
          msg._id === selectedMessage._id ? updatedMessage : msg
        );
        
        setMessages(updatedMessages);
        setSelectedMessage(updatedMessage);
        
        updateMessage('success', `تم تعيين الرسالة إلى ${assignToAdmin.name} بنجاح`, loadingKey);
        setAssignmentModalVisible(false);
      }
    } catch (error) {
      console.error('Error assigning message:', error);
      showError('فشل في تعيين الرسالة');
    }
  };

  // Handle bulk actions
  const handleBulkAction = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('الرجاء تحديد رسالة واحدة على الأقل');
      return;
    }
    
    // Update messages based on bulk action type
    if (bulkAction === 'status') {
      const updatedMessages = messages.map(msg => {
        if (selectedRowKeys.includes(msg._id)) {
          return { ...msg, status: bulkStatusValue };
        }
        return msg;
      });
      
      setMessages(updatedMessages);
      
      // Update selected message if it was part of the bulk action
      if (selectedMessage && selectedRowKeys.includes(selectedMessage._id)) {
        const updatedSelectedMessage = updatedMessages.find(msg => msg._id === selectedMessage._id);
        setSelectedMessage(updatedSelectedMessage);
      }
      
      // Update statistics
      const newStats = {
        ...messageStatistics,
        new: updatedMessages.filter(msg => msg.status === 'new').length,
        inProgress: updatedMessages.filter(msg => msg.status === 'in-progress').length,
        resolved: updatedMessages.filter(msg => msg.status === 'resolved').length
      };
      setMessageStatistics(newStats);
      
      message.success(`تم تحديث حالة ${selectedRowKeys.length} رسالة بنجاح`);
    }
    
    // Reset selection and close bulk action panel
    setSelectedRowKeys([]);
    setBulkActionVisible(false);
  };

  // Submit reply form
  const handleReplySubmit = async () => {
    if (!selectedMessage || !selectedMessage._id) {
      showError('لم يتم تحديد رسالة للرد عليها');
      return;
    }
    
    try {
      // Get form values - both from the form and the state to ensure we have the data
      const formValues = await replyForm.validateFields();
      const replyContent = formValues.reply || replyText;
      
      if (!replyContent || replyContent.trim() === '') {
        showError('الرجاء إدخال نص الرد');
        return;
      }
      
      const loadingKey = 'sending-reply';
      showLoading('جاري إرسال الرد...', loadingKey);

      // Make the API call with the correct parameter name (message)
      const response = await axios.post(`/api/support/admin/messages/${selectedMessage._id}/respond`, {
        message: replyContent.trim()
      });

      // If the API call is successful, update our state
      if (response.data) {
        // Get the updated message from the response
        const updatedMessage = response.data;
        
        // Update the messages array with the updated message
        const updatedMessages = messages.map(msg => 
          msg._id === updatedMessage._id ? updatedMessage : msg
        );
        
        setMessages(updatedMessages);
        setFilteredMessages(updatedMessages); // Update filtered messages too
        setSelectedMessage(updatedMessage);
        setReplyText('');  // Clear the reply text
        replyForm.resetFields();  // Reset the form
        
        updateMessage('success', 'تم إرسال الرد بنجاح', loadingKey);
        
        // Update message status to in-progress if it was new
        if (selectedMessage.status === 'new') {
          updateMessageStatus(selectedMessage._id, 'in-progress');
        }
        
        // Update statistics
        const newStats = {
          ...messageStatistics,
          new: updatedMessages.filter(msg => msg.status === 'new').length,
          inProgress: updatedMessages.filter(msg => msg.status === 'in-progress').length,
          resolved: updatedMessages.filter(msg => msg.status === 'resolved').length
        };
        setMessageStatistics(newStats);
        
        // Scroll to the bottom of the conversation to show the new reply
        setTimeout(() => {
          const conversationThread = document.querySelector('.conversation-thread');
          if (conversationThread) {
            conversationThread.scrollTop = conversationThread.scrollHeight;
          }
        }, 200);
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      showError('فشل في إرسال الرد');
    }
  };

  // Mark message as read
  const markMessageAsRead = async (messageId) => {
    try {
      // Update local state immediately for better UX
      const updatedMessages = messages.map(msg => {
        if (msg._id === messageId) {
          return { ...msg, isRead: true };
        }
        return msg;
      });
      
      setMessages(updatedMessages);
      
      // Update selected message if needed
      if (selectedMessage && selectedMessage._id === messageId) {
        setSelectedMessage({ ...selectedMessage, isRead: true });
      }
      
      // Try to update on server
      await axios.put(`/api/support/admin/messages/${messageId}/read`);
    } catch (error) {
      console.error('Error marking message as read:', error);
      // No need to revert the UI state as it's not critical
    }
  };

  // Update message status
  const updateMessageStatus = async (messageId, newStatus) => {
    try {
      const loadingKey = 'updating-status';
      showLoading(t('updating_status'), loadingKey);

      const response = await axios.put(`/api/support/admin/messages/${messageId}/status`, {
        status: newStatus
      });

      if (response.data) {
        // Update the message in the local state
        const updatedMessages = messages.map(msg => {
          if (msg._id === messageId) {
            return { ...msg, status: newStatus };
          }
          return msg;
        });

        setMessages(updatedMessages);
        updateMessage('success', t('status_updated'), loadingKey);

        // Update the selected message for the detail view
        if (selectedMessage && selectedMessage._id === messageId) {
          setSelectedMessage({ ...selectedMessage, status: newStatus });
        }

        // Update statistics
        const newStats = {
          ...messageStatistics,
          new: updatedMessages.filter(msg => msg.status === 'new').length,
          inProgress: updatedMessages.filter(msg => msg.status === 'in-progress').length,
          resolved: updatedMessages.filter(msg => msg.status === 'resolved').length
        };
        setMessageStatistics(newStats);
      }
    } catch (error) {
      console.error('Error updating message status:', error);
      showError('فشل في تحديث حالة الرسالة');

      // Handle mock data for development
      if (error.request) {
        const updatedMessages = messages.map(msg => {
          if (msg._id === messageId) {
            return { ...msg, status: newStatus };
          }
          return msg;
        });

        setMessages(updatedMessages);
        message.success('تم تحديث حالة الرسالة بنجاح (وضع المحاكاة)');

        // Update the selected message for the detail view
        if (selectedMessage && selectedMessage._id === messageId) {
          setSelectedMessage({ ...selectedMessage, status: newStatus });
        }

        // Update statistics
        const newStats = {
          ...messageStatistics,
          new: updatedMessages.filter(msg => msg.status === 'new').length,
          inProgress: updatedMessages.filter(msg => msg.status === 'in-progress').length,
          resolved: updatedMessages.filter(msg => msg.status === 'resolved').length
        };
        setMessageStatistics(newStats);
      }
    }
  };

  // Get status tag
  const getStatusTag = (status) => {
    switch (status) {
      case 'new':
        return <Tag color="blue" icon={<ExclamationCircleOutlined />}>{t('status_new')}</Tag>;
      case 'in-progress':
        return <Tag color="orange" icon={<SyncOutlined spin />}>{t('status_in_progress')}</Tag>;
      case 'resolved':
        return <Tag color="green" icon={<CheckCircleOutlined />}>{t('status_resolved')}</Tag>;
      default:
        return <Tag color="default" icon={<ClockCircleOutlined />}>{status}</Tag>;
    }
  };

  // Get priority tag
  const getPriorityTag = (priority) => {
    switch (priority) {
      case 'low':
        return <Tag color="green">{t('priority_low')}</Tag>;
      case 'medium':
        return <Tag color="orange">{t('priority_medium')}</Tag>;
      case 'high':
        return <Tag color="red">{t('priority_high')}</Tag>;
      default:
        return <Tag color="default">{priority}</Tag>;
    }
  };

  // Get category tag
  const getCategoryTag = (category) => {
    switch (category) {
      case 'technical':
        return <Tag color="blue">{t('category_technical')}</Tag>;
      case 'billing':
        return <Tag color="purple">{t('category_billing')}</Tag>;
      case 'general':
        return <Tag color="cyan">{t('category_general')}</Tag>;
      case 'bug':
        return <Tag color="red">{t('category_bug')}</Tag>;
      case 'feature':
        return <Tag color="green">{t('category_feature')}</Tag>;
      default:
        return <Tag color="default">{category}</Tag>;
    }
  };

  // Get assigned admin
  const getAssignedAdmin = (assignedTo) => {
    if (!assignedTo) return null;
    return adminTeam.find(admin => admin.id === assignedTo);
  };

  // Format relative date using central date utility
  const formatDate = (dateString) => {
    try {
      return formatRelativeTime(dateString);
    } catch (error) {
      return dateString;
    }
  };
  
  // Render dashboard tab content
  const renderDashboard = () => (
    <div className="dashboard-section">
      <Row gutter={[24, 24]}>
        {/* Statistics Cards */}
        <Col xs={24} sm={12} md={6}>
          <Card className="statistics-card">
            <Statistic
              title={t('total_tickets')}
              value={messageStatistics.total}
              prefix={<MessageOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="statistics-card">
            <Statistic
              title={t('new_messages')}
              value={messageStatistics.new}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div className="stat-trend">
              <Badge status="processing" text={t('need_reply')} />
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="statistics-card">
            <Statistic
              title={t('in_progress_messages')}
              value={messageStatistics.inProgress}
              prefix={<SyncOutlined spin />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="statistics-card">
            <Statistic
              title={t('resolved_messages')}
              value={messageStatistics.resolved}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        
        {/* Analytics row */}
        <Col span={24}>
          <Card 
            title={
              <div className="analytics-header">
                <Title level={4}>
                  <BarChartOutlined /> {t('support_analytics')}
                </Title>
                <Select
                  value={timeRangeStats}
                  onChange={(value) => setTimeRangeStats(value)}
                  style={{ width: 120 }}
                >
                  <Option value="week">{t('last_week')}</Option>
                  <Option value="month">{t('last_month')}</Option>
                  <Option value="quarter">{t('last_quarter')}</Option>
                </Select>
              </div>
            }
            className="analytics-card"
          >
            <Row gutter={[24, 24]}>
              <Col xs={24} md={12}>
                <Card className="inner-analytics-card" title={t('message_volume')}>
                  {/* Simple visualization instead of Line chart */}
                  <div className="simple-chart">
                    <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                      <Text type="secondary">رسم بياني لحجم الرسائل (سيتم تحسينه)</Text>
                    </div>
                    <div style={{ display: 'flex', height: '200px', alignItems: 'flex-end' }}>
                      {analyticsData?.messageVolume && analyticsData.messageVolume.length > 0 ? (
                        analyticsData.messageVolume.map((item, index) => (
                          <Tooltip key={index} title={`${item.date}: ${item.count} رسائل`}>
                            <div 
                              style={{ 
                                flex: 1, 
                                background: '#1890ff', 
                                marginRight: '8px',
                                height: `${(item.count / 20) * 100}%`,
                                minHeight: '20px',
                                borderRadius: '4px 4px 0 0'
                              }} 
                            />
                          </Tooltip>
                        ))
                      ) : (
                        <div style={{ width: '100%', textAlign: 'center', padding: '20px' }}>
                          <Empty description="لا توجد بيانات متاحة حاليًا" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', marginTop: '8px' }}>
                      {Array.isArray(analyticsData?.messageVolume) && analyticsData.messageVolume.map((item, index) => (
                        <div key={index} style={{ flex: 1, textAlign: 'center' }}>
                          <Text type="secondary" style={{ fontSize: '10px' }}>
                            {item.date.substring(5)}
                          </Text>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Row gutter={[24, 24]}>
                  <Col span={24}>
                    <Card className="inner-analytics-card">
                      <Title level={5}>{t('average_response_time')}</Title>
                      <div className="response-time-stats">
                        <Statistic
                          value={analyticsData.responseTimeAvg}
                          suffix={t('hours')}
                          valueStyle={{ color: '#1890ff' }}
                        />
                        <div className="response-time-categories">
                          <div className="response-time-category">
      <span>{t('technical')}:</span>
      <span>{analyticsData?.responseTimeByCategory?.technical || 0} {t('hours')}</span>
                          </div>
                          <div className="response-time-category">
      <span>{t('billing')}:</span>
      <span>{analyticsData?.responseTimeByCategory?.billing || 0} {t('hours')}</span>
                          </div>
                          <div className="response-time-category">
      <span>{t('general')}:</span>
      <span>{analyticsData?.responseTimeByCategory?.general || 0} {t('hours')}</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Col>
                  <Col span={24}>
                    <Card className="inner-analytics-card">
                      <Row gutter={24}>
                        <Col xs={24} sm={12}>
                          <Statistic
                            title={t('resolution_rate')}
                            value={analyticsData.resolutionRate}
                            suffix="%"
                            valueStyle={{ color: '#52c41a' }}
                          />
                          <Progress 
                            percent={analyticsData.resolutionRate} 
                            strokeColor="#52c41a"
                            status="active"
                          />
                        </Col>
                        <Col xs={24} sm={12}>
                          <div className="distribution-pie">
                            <Title level={5}>{t('case_distribution')}</Title>
                            {/* Simple visualization instead of Pie chart */}
                            <div className="simple-pie">
                              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                                <div style={{ 
                                  width: '120px', 
                                  height: '120px', 
                                  borderRadius: '50%', 
                                  background: 'conic-gradient(#1890ff 0% 18%, #fa8c16 18% 65%, #52c41a 65% 100%)',
                                  position: 'relative'
                                }}>
                                  <div style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '50%',
                                    background: 'white'
                                  }} />
                                </div>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap' }}>
                                {Array.isArray(analyticsData?.statusDistribution) && analyticsData.statusDistribution.map((item, index) => (
                                  <div key={index} style={{ display: 'flex', alignItems: 'center', margin: '0 8px' }}>
                                    <div style={{ 
                                      width: '10px', 
                                      height: '10px', 
                                      background: index === 0 ? '#1890ff' : index === 1 ? '#fa8c16' : '#52c41a',
                                      marginRight: '5px'
                                    }} />
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                      {item.status}: {item.value}%
                                    </Text>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </Col>
                      </Row>
                    </Card>
                  </Col>
                </Row>
              </Col>
            </Row>
            <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
              <Col xs={24} md={12}>
                <Card className="inner-analytics-card" title={t('category_distribution')}>
                  {/* Simple visualization instead of Column chart */}
                  <div className="simple-column-chart">
                    <div style={{ display: 'flex', height: '200px', alignItems: 'flex-end' }}>
                      {Array.isArray(analyticsData?.categoryDistribution) && analyticsData.categoryDistribution.map((item, index) => (
                        <Tooltip key={index} title={`${item.category}: ${item.value}`}>
                          <div style={{ flex: 1, padding: '0 5px', textAlign: 'center' }}>
                            <div 
                              style={{ 
                                background: '#1890ff', 
                                height: `${(item.value / 40) * 100}%`,
                                minHeight: '20px',
                                borderRadius: '4px 4px 0 0',
                                margin: '0 auto',
                                width: '70%'
                              }} 
                            />
                            <div style={{ marginTop: '8px' }}>
                              <Text style={{ fontSize: '12px' }}>{item.category}</Text>
                            </div>
                          </div>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card className="inner-analytics-card" title={t('support_team_performance')}>
                  <div className="admin-performance">
                    {Array.isArray(adminTeam) && adminTeam.map((admin, index) => (
                      <div key={index} className="admin-performance-item">
                        <div className="admin-info">
                          <Avatar icon={<UserOutlined />} />
                          <span>{admin.name}</span>
                        </div>
                        <div className="admin-stats">
                          <div className="admin-stat">
                            <Tooltip title={t('processed_messages_count')}>
                              <span>12</span>
                              <MessageOutlined />
                            </Tooltip>
                          </div>
                          <div className="admin-stat">
                            <Tooltip title={t('avg_response_time')}>
                              <span>3.5 {t('hours')}</span>
                              <ClockCircleOutlined />
                            </Tooltip>
                          </div>
                          <div className="admin-stat">
                            <Tooltip title={t('satisfaction_rate')}>
                              <span>95%</span>
                              <LikeOutlined />
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );

  // Table columns
  const columns = [
    {
      title: 'الموضوع',
      dataIndex: 'subject',
      key: 'subject',
      render: (text, record) => (
        <Space>
          <Badge 
            status={
              record.status === 'new' ? 'processing' :
              record.status === 'in-progress' ? 'warning' :
              record.status === 'resolved' ? 'success' : 'default'
            } 
          />
          <span style={{ fontWeight: !record.isRead ? 'bold' : 'normal' }}>
            {text}
          </span>
        </Space>
      ),
      sorter: (a, b) => a.subject.localeCompare(b.subject),
    },
    {
      title: 'المستخدم',
      dataIndex: 'userName',
      key: 'userName',
      render: (text, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          <span>{text}</span>
          <Tooltip title={record.userEmail}>
            <MailOutlined style={{ color: '#1890ff' }} />
          </Tooltip>
        </Space>
      ),
      sorter: (a, b) => a.userName.localeCompare(b.userName),
    },
    {
      title: 'التصنيف',
      dataIndex: 'category',
      key: 'category',
      render: category => getCategoryTag(category),
      filters: [
        { text: 'تقني', value: 'technical' },
        { text: 'فواتير', value: 'billing' },
        { text: 'عام', value: 'general' },
        { text: 'خطأ', value: 'bug' },
        { text: 'ميزة جديدة', value: 'feature' }
      ],
      onFilter: (value, record) => record.category === value,
    },
    {
      title: 'الأولوية',
      dataIndex: 'priority',
      key: 'priority',
      render: priority => getPriorityTag(priority),
      filters: [
        { text: 'منخفضة', value: 'low' },
        { text: 'متوسطة', value: 'medium' },
        { text: 'عالية', value: 'high' }
      ],
      onFilter: (value, record) => record.priority === value,
    },
    {
      title: 'المسؤول',
      dataIndex: 'assignedTo',
      key: 'assignedTo',
      render: assignedTo => {
        const admin = getAssignedAdmin(assignedTo);
        return admin ? (
          <Space>
            <Avatar size="small" icon={<UserOutlined />} />
            <span>{admin.name}</span>
            <Tag color="blue">{admin.status === 'متاح' ? 'متاح' : 'مشغول'}</Tag>
          </Space>
        ) : (
          <Tag icon={<TeamOutlined />} color="default">غير معين</Tag>
        );
      },
      filters: [
        { text: 'غير معين', value: 'unassigned' },
        ...adminTeam.map(admin => ({ text: admin.name, value: admin.id }))
      ],
      onFilter: (value, record) => {
        if (value === 'unassigned') return !record.assignedTo;
        return record.assignedTo === value;
      },
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: status => getStatusTag(status),
      filters: [
        { text: 'جديدة', value: 'new' },
        { text: 'قيد المعالجة', value: 'in-progress' },
        { text: 'تم الحل', value: 'resolved' }
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'تاريخ الإنشاء',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: date => (
        <Tooltip title={formatDateTime(date)}>
          {formatDate(date)}
        </Tooltip>
      ),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
    {
      title: 'الردود',
      dataIndex: 'responses',
      key: 'responses',
      render: responses => <Tag>{responses.length}</Tag>,
      sorter: (a, b) => a.responses.length - b.responses.length,
    },
    {
      title: 'الإجراءات',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="عرض التفاصيل">
            <Button
              type="text"
              className={!record.isRead ? 'unread-action-button' : ''}
              icon={<EyeOutlined />}
              onClick={() => handleViewMessageDetails(record)}
            />
          </Tooltip>
          <Tooltip title="الرد">
            <Button
              type="text"
              icon={<CommentOutlined />}
              onClick={() => handleReplyToMessage(record)}
            />
          </Tooltip>
          <Dropdown
            menu={{
              items: [
                {
                  key: '1',
                  label: 'تحديث الحالة إلى جديدة',
                  icon: <ExclamationCircleOutlined style={{ color: '#1890ff' }} />,
                  disabled: record.status === 'new',
                  onClick: () => updateMessageStatus(record._id, 'new')
                },
                {
                  key: '2',
                  label: 'تحديث الحالة إلى قيد المعالجة',
                  icon: <SyncOutlined style={{ color: '#fa8c16' }} />,
                  disabled: record.status === 'in-progress',
                  onClick: () => updateMessageStatus(record._id, 'in-progress')
                },
                {
                  key: '3',
                  label: 'تحديث الحالة إلى تم الحل',
                  icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
                  disabled: record.status === 'resolved',
                  onClick: () => updateMessageStatus(record._id, 'resolved')
                },
                {
                  key: '4',
                  label: 'تعيين إلى مسؤول',
                  icon: <TeamOutlined style={{ color: '#722ed1' }} />,
                  onClick: () => {
                    setSelectedMessage(record);
                    setAssignmentModalVisible(true);
                  }
                },
                {
                  key: '5',
                  label: 'إضافة ملاحظة داخلية',
                  icon: <FileTextOutlined style={{ color: '#eb2f96' }} />,
                  onClick: () => {
                    setSelectedMessage(record);
                    setInternalNoteVisible(true);
                    noteForm.resetFields();
                  }
                }
              ]
            }}
            trigger={['click']}
          >
            <Button type="text" icon={<MenuOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ];

  // If user is not admin, show access denied
  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div className="access-denied">
        <LockOutlined style={{ fontSize: 64 }} />
        <Title level={2}>{t('access_denied')}</Title>
        <Text>{t('access_denied_message')}</Text>
      </div>
    );
  }
  
  const renderMessageDetail = () => {
    if (!selectedMessage) return null;
    
    return (
      <>
        <Card className="message-header-card">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <div className="message-from">
                <Avatar size="large" icon={<UserOutlined />} className="user-avatar" />
                <div className="message-from-info">
                  <Text strong>{selectedMessage.userName}</Text>
                  <Text type="secondary">{selectedMessage.userEmail}</Text>
                </div>
              </div>
            </Col>
            <Col xs={24} sm={12} className="message-meta">
              <div>
                {getStatusTag(selectedMessage.status)}
                {getPriorityTag(selectedMessage.priority)}
                {getCategoryTag(selectedMessage.category)}
              </div>
              <Text type="secondary">
                <CalendarOutlined style={{ marginRight: 8 }} />
                {formatDateTime(selectedMessage.createdAt)}
              </Text>
            </Col>
          </Row>
          <Divider style={{ margin: '12px 0' }} />
          <Row>
            <Col span={24}>
              <Title level={4}>{selectedMessage.subject}</Title>
              <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
                {selectedMessage.message}
              </Paragraph>
            </Col>
          </Row>
          <Divider style={{ margin: '12px 0' }} />
          <Space>
            <Button 
              type="primary" 
              icon={<CommentOutlined />} 
              onClick={() => handleReplyToMessage(selectedMessage)}
            >
              الرد على الرسالة
            </Button>
            {selectedMessage.status !== 'resolved' && (
              <Button 
                icon={<CheckCircleOutlined />} 
                onClick={() => updateMessageStatus(selectedMessage._id, 'resolved')}
              >
                تحديد كـ "تم الحل"
              </Button>
            )}
            {selectedMessage.status === 'resolved' && (
              <Button 
                icon={<SyncOutlined />} 
                onClick={() => updateMessageStatus(selectedMessage._id, 'in-progress')}
              >
                إعادة فتح
              </Button>
            )}
          </Space>
        </Card>
        
        <Divider orientation="right">
          <Space>
            <MessageOutlined />
            <span>الردود ({selectedMessage?.responses?.length || 0})</span>
          </Space>
        </Divider>
        
        {selectedMessage?.responses?.length > 0 ? (
          <Timeline mode="alternate" className="messages-timeline">
            {selectedMessage?.responses?.map((response, index) => {
              const isAdmin = response.isAdminResponse;
              return (
                <Timeline.Item 
                  key={index} 
                  color={isAdmin ? "blue" : "green"}
                  position={isAdmin ? "right" : "left"}
                  dot={
                    <Avatar 
                      size="small" 
                      icon={<UserOutlined />} 
                      style={{ backgroundColor: isAdmin ? '#1890ff' : '#52c41a' }} 
                    />
                  }
                >
                  <Card 
                    className={`response-card ${isAdmin ? 'admin-response' : 'user-response'}`}
                    style={{ 
                      borderLeft: isAdmin ? 'none' : '4px solid #52c41a',
                      borderRight: isAdmin ? '4px solid #1890ff' : 'none',
                      background: isAdmin ? '#f0f8ff' : '#f6ffed'
                    }}
                  >
                    <div className="response-header">
                      <div>
                        <Text strong>{isAdmin ? response.adminName : response.userName}</Text>
                        <Tag color={isAdmin ? "blue" : "green"}>
                          {isAdmin ? "مدير" : "مستخدم"}
                        </Tag>
                      </div>
                                      <Text type="secondary">
                                        {formatDateTime(response.createdAt)}
                                      </Text>
                    </div>
                    <Paragraph style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>
                      {response.message}
                    </Paragraph>
                  </Card>
                </Timeline.Item>
              );
            })}
          </Timeline>
        ) : (
          <Empty description="لا توجد ردود على هذه الرسالة بعد" />
        )}
      </>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <ContentContainer className="admin-support-messages" isLoading={loading}>
      <Alert
        message={t('enhanced_support_page')}
        description={t('enhanced_support_description')}
        type="success"
        showIcon
        style={{ marginBottom: '20px' }}
      />
      <Card className="page-header-card">
        <Title level={2}>{t('admin_support_messages')}</Title>
        <Text>{t('admin_support_messages_description')}</Text>
      </Card>
      
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        className="admin-support-tabs"
        size="large"
        type="card"
        tabBarStyle={{ marginBottom: 20, fontSize: '16px', fontWeight: 'bold' }}
        tabBarExtraContent={
          activeTab === 'messages' && filteredMessages.length > 0 ? (
            <Button 
              type="primary"
              icon={selectedRowKeys.length > 0 ? <ThunderboltOutlined /> : <FilterOutlined />}
              onClick={() => setBulkActionVisible(!bulkActionVisible)}
            >
              {selectedRowKeys.length > 0 
                ? `إجراء جماعي (${selectedRowKeys.length})`
                : 'إجراءات جماعية'}
            </Button>
          ) : null
        }
      >
        <TabPane 
          tab={
            <span>
              <BarChartOutlined />
              {t('messages_dashboard')}
            </span>
          } 
          key="dashboard"
        >
          {renderDashboard()}
        </TabPane>
        
        <TabPane 
          tab={
            <span>
              <MessageOutlined />
              {t('support_management')}
            </span>
          } 
          key="messages"
        >
          <Row gutter={[24, 24]}>
            {/* Bulk action panel */}
            {bulkActionVisible && (
              <Col span={24}>
                <Card className="bulk-action-card">
                  <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} md={4}>
                      <Title level={5} style={{ margin: 0 }}>إجراء جماعي:</Title>
                    </Col>
                    <Col xs={24} md={6}>
                      <Radio.Group 
                        value={bulkAction}
                        onChange={(e) => setBulkAction(e.target.value)}
                        buttonStyle="solid"
                      >
                        <Radio.Button value="status">تغيير الحالة</Radio.Button>
                        <Radio.Button value="assign">تعيين مسؤول</Radio.Button>
                      </Radio.Group>
                    </Col>
                    <Col xs={24} md={8}>
                      {bulkAction === 'status' ? (
                        <Select
                          value={bulkStatusValue}
                          onChange={(value) => setBulkStatusValue(value)}
                          style={{ width: '100%' }}
                        >
                          <Option value="new">جديدة</Option>
                          <Option value="in-progress">قيد المعالجة</Option>
                          <Option value="resolved">تم الحل</Option>
                        </Select>
                      ) : (
                        <Select
                          placeholder="اختر المسؤول"
                          style={{ width: '100%' }}
                        >
                          {adminTeam.map(admin => (
                            <Option key={admin.id} value={admin.id}>
                              <Space>
                                <Avatar size="small" icon={<UserOutlined />} />
                                <span>{admin.name}</span>
                                <Tag color={admin.status === 'متاح' ? 'green' : 'orange'}>
                                  {admin.status}
                                </Tag>
                              </Space>
                            </Option>
                          ))}
                        </Select>
                      )}
                    </Col>
                    <Col xs={24} md={6}>
                      <Space>
                        <Button 
                          type="primary" 
                          onClick={handleBulkAction}
                          disabled={selectedRowKeys.length === 0}
                        >
                          تطبيق
                        </Button>
                        <Button onClick={() => {
                          setBulkActionVisible(false);
                          setSelectedRowKeys([]);
                        }}>
                          إلغاء
                        </Button>
                      </Space>
                    </Col>
                  </Row>
                </Card>
              </Col>
            )}
          
            <Col span={24}>
              <Card className="filter-card">
                <Row gutter={[16, 16]} align="middle">
                  <Col xs={24} sm={24} md={6} lg={6}>
                    <div className="custom-search-wrapper">
                      <div className="search-icon-container">
                        <SearchOutlined className="search-icon" />
                      </div>
                      <Input
                        className="custom-search-input"
                      placeholder={t('search_message_placeholder')}
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        suffix={
                          searchText ? (
                            <Button 
                              type="text" 
                              className="clear-icon-button" 
                              icon={<CloseOutlined className="clear-icon" />} 
                              onClick={() => setSearchText('')}
                              size="small"
                            />
                          ) : null
                        }
                      />
                    </div>
                  </Col>
                  <Col xs={24} sm={8} md={3} lg={3}>
                    <Select
                      placeholder={t('filter_by_status')}
                      className="filter-select"
                      value={statusFilter}
                      onChange={value => setStatusFilter(value)}
                      suffixIcon={<FilterOutlined className="filter-icon" />}
                      popupClassName="custom-dropdown"
                      style={{ width: '100%' }}
                    >
                      <Option value="all">
                        <Space>
                          <MessageOutlined />
                          <span>{t('all_statuses')}</span>
                        </Space>
                      </Option>
                      <Option value="new">
                        <Space>
                          <ExclamationCircleOutlined style={{ color: '#1890ff' }} />
                          <span>{t('status_new_simple')}</span>
                        </Space>
                      </Option>
                      <Option value="in-progress">
                        <Space>
                          <SyncOutlined style={{ color: '#fa8c16' }} />
                          <span>{t('status_in_progress_simple')}</span>
                        </Space>
                      </Option>
                      <Option value="resolved">
                        <Space>
                          <CheckCircleOutlined style={{ color: '#52c41a' }} />
                          <span>{t('status_resolved_simple')}</span>
                        </Space>
                      </Option>
                    </Select>
                  </Col>
                  <Col xs={24} sm={8} md={3} lg={3}>
                    <Select
                      placeholder={t('filter_by_category')}
                      className="filter-select"
                      value={categoryFilter}
                      onChange={value => setCategoryFilter(value)}
                      suffixIcon={<FilterOutlined className="filter-icon" />}
                      popupClassName="custom-dropdown"
                      style={{ width: '100%' }}
                    >
                      <Option value="all">{t('all_categories')}</Option>
                      <Option value="technical">{t('category_technical_simple')}</Option>
                      <Option value="billing">{t('category_billing_simple')}</Option>
                      <Option value="general">{t('category_general_simple')}</Option>
                      <Option value="bug">{t('category_bug_simple')}</Option>
                      <Option value="feature">{t('category_feature_simple')}</Option>
                    </Select>
                  </Col>
                  <Col xs={24} sm={8} md={3} lg={3}>
                    <Select
                      placeholder={t('filter_by_priority')}
                      className="filter-select"
                      value={priorityFilter}
                      onChange={value => setPriorityFilter(value)}
                      suffixIcon={<FilterOutlined className="filter-icon" />}
                      popupClassName="custom-dropdown"
                      style={{ width: '100%' }}
                    >
                      <Option value="all">{t('all_priorities')}</Option>
                      <Option value="high">{t('priority_high_simple')}</Option>
                      <Option value="medium">{t('priority_medium_simple')}</Option>
                      <Option value="low">{t('priority_low_simple')}</Option>
                    </Select>
                  </Col>
                  <Col xs={24} sm={8} md={3} lg={3}>
                    <Select
                      placeholder={t('filter_by_assignee')}
                      className="filter-select"
                      value={assigneeFilter}
                      onChange={value => setAssigneeFilter(value)}
                      suffixIcon={<FilterOutlined className="filter-icon" />}
                      popupClassName="custom-dropdown"
                      style={{ width: '100%' }}
                    >
                      <Option value="all">{t('all_admins')}</Option>
                      <Option value="unassigned">{t('unassigned')}</Option>
                      {adminTeam.map(admin => (
                        <Option key={admin.id} value={admin.id}>
                          <Space>
                            <Avatar size="small" icon={<UserOutlined />} />
                            <span>{admin.name}</span>
                          </Space>
                        </Option>
                      ))}
                    </Select>
                  </Col>
                  <Col xs={24} sm={16} md={3} lg={3}>
                    <RangePicker
                      placeholder={['تاريخ البدء', 'تاريخ الانتهاء']}
                      className="date-picker"
                      onChange={dates => setDateRange(dates)}
                      value={dateRange}
                      suffixIcon={<CalendarOutlined className="calendar-icon" />}
                      popupClassName="date-dropdown"
                      style={{ width: '100%' }}
                    />
                  </Col>
                  <Col xs={24} sm={8} md={3} lg={3}>
                    <Button 
                      icon={<ReloadOutlined />} 
                      onClick={resetFilters}
                      title="إعادة تعيين التصفية"
                      className="reset-button"
                      block
                    >
                      إعادة
                    </Button>
                  </Col>
                </Row>
              </Card>
            </Col>
            
            <Row gutter={[24, 24]}>
              {/* Left column - Messages List */}
              <Col xs={24} md={10} ref={messageListRef}>
                <Card
                  title={
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '16px', fontWeight: 600 }}>
                        قائمة رسائل الدعم 
                        <Tag 
                          color="blue" 
                          style={{ marginRight: '8px', fontWeight: 'normal' }}
                        >
                          {filteredMessages?.length || 0}
                        </Tag>
                      </span>
                      {messageStatistics.new > 0 && (
                        <Tag color="blue" icon={<BellOutlined />}>
                          {messageStatistics.new} رسالة جديدة
                        </Tag>
                      )}
                    </Space>
                  }
                  className="messages-list-card"
                >
                  {loading ? (
                    <div className="loading-container">
                      <Spin size="large" tip="جاري تحميل البيانات..." />
                    </div>
                  ) : (
                    <List
                      itemLayout="vertical"
                      dataSource={filteredMessages}
                      rowKey="_id"
                      pagination={{ 
                        pageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total, range) => `${range[0]}-${range[1]} من ${total} رسالة`,
                        showQuickJumper: true,
                        responsive: true,
                        size: "small"
                      }}
                      renderItem={item => (
                        <List.Item 
                          key={item._id}
                          className={`message-list-item ${!item.isRead ? 'new-message-item' : ''} ${selectedMessage?._id === item._id ? 'selected-message-item' : ''}`}
                          onClick={() => {
                            setSelectedMessage(item);
                            // Mark as read if not already
                            if (!item.isRead) {
                              markMessageAsRead(item._id);
                            }
                          }}
                        >
                          <div className="message-list-item-content">
                            <div className="message-list-item-header">
                              <Space>
                                <Badge 
                                  status={
                                    item.status === 'new' ? 'processing' :
                                    item.status === 'in-progress' ? 'warning' :
                                    item.status === 'resolved' ? 'success' : 'default'
                                  } 
                                />
                                <span className="message-subject" style={{ fontWeight: !item.isRead ? 'bold' : 'normal' }}>
                                  {item.subject}
                                </span>
                              </Space>
                              <Space size="small">
                                {getPriorityTag(item.priority)}
                                {getCategoryTag(item.category)}
                              </Space>
                            </div>
                            
                            <div className="message-list-item-sender">
                              <Space>
                                <Avatar icon={<UserOutlined />} />
                                <span>{item.userName}</span>
                              </Space>
                              <Text type="secondary">
                                {formatDate(item.createdAt)}
                              </Text>
                            </div>
                            
                            <div className="message-list-item-preview">
                              <Paragraph ellipsis={{ rows: 2 }}>
                                {item.message}
                              </Paragraph>
                            </div>
                            
                            <div className="message-list-item-footer">
                              <div>
                                {getStatusTag(item.status)}
                                {item.assignedTo && (
                                  <Tooltip title={getAssignedAdmin(item.assignedTo)?.name}>
                                    <Tag icon={<TeamOutlined />} color="purple">معين</Tag>
                                  </Tooltip>
                                )}
                                <Tag>{item.responses.length} ردود</Tag>
                              </div>
                              <Space size="small">
                                <Tooltip title="الرد">
                                  <Button 
                                    type="text" 
                                    icon={<CommentOutlined />} 
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedMessage(item);
                                      if (replyInputRef.current) {
                                        replyInputRef.current.focus();
                                      }
                                    }}
                                  />
                                </Tooltip>
                                <Dropdown
                                  menu={{
                                    items: [
                                      {
                                        key: '1',
                                        label: 'تحديث الحالة إلى جديدة',
                                        icon: <ExclamationCircleOutlined style={{ color: '#1890ff' }} />,
                                        disabled: item.status === 'new',
                                        onClick: (e) => {
                                          e.domEvent.stopPropagation();
                                          updateMessageStatus(item._id, 'new');
                                        }
                                      },
                                      {
                                        key: '2',
                                        label: 'تحديث الحالة إلى قيد المعالجة',
                                        icon: <SyncOutlined style={{ color: '#fa8c16' }} />,
                                        disabled: item.status === 'in-progress',
                                        onClick: (e) => {
                                          e.domEvent.stopPropagation();
                                          updateMessageStatus(item._id, 'in-progress');
                                        }
                                      },
                                      {
                                        key: '3',
                                        label: 'تحديث الحالة إلى تم الحل',
                                        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
                                        disabled: item.status === 'resolved',
                                        onClick: (e) => {
                                          e.domEvent.stopPropagation();
                                          updateMessageStatus(item._id, 'resolved');
                                        }
                                      },
                                      {
                                        key: '4',
                                        label: 'تعيين إلى مسؤول',
                                        icon: <TeamOutlined style={{ color: '#722ed1' }} />,
                                        onClick: (e) => {
                                          e.domEvent.stopPropagation();
                                          setSelectedMessage(item);
                                          setAssignmentModalVisible(true);
                                        }
                                      }
                                    ]
                                  }}
                                  trigger={['click']}
                                >
                                  <Button 
                                    type="text" 
                                    icon={<MenuOutlined />} 
                                    size="small"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </Dropdown>
                              </Space>
                            </div>
                          </div>
                        </List.Item>
                      )}
                      locale={{
                        emptyText: <Empty description="لا توجد رسائل دعم" />
                      }}
                    />
                  )}
                </Card>
              </Col>
              
              {/* Right column - Conversation View */}
              <Col xs={24} md={14}>
                {selectedMessage ? (
                  <Card className="conversation-card">
                    <div className="conversation-header">
                      <Card className="message-header-card">
                        <Row gutter={[16, 16]}>
                          <Col xs={24} sm={12}>
                            <div className="message-from">
                              <Avatar size="large" icon={<UserOutlined />} className="user-avatar" />
                              <div className="message-from-info">
                                <Text strong>{selectedMessage.userName}</Text>
                                <Text type="secondary">{selectedMessage.userEmail}</Text>
                              </div>
                            </div>
                          </Col>
                          <Col xs={24} sm={12} className="message-meta">
                            <div>
                              {getStatusTag(selectedMessage.status)}
                              {getPriorityTag(selectedMessage.priority)}
                              {getCategoryTag(selectedMessage.category)}
                              {selectedMessage.assignedTo && (
                                <Tooltip title={getAssignedAdmin(selectedMessage.assignedTo)?.name}>
                                  <Tag icon={<TeamOutlined />} color="purple">معين</Tag>
                                </Tooltip>
                              )}
                            </div>
                            <Text type="secondary">
                              <CalendarOutlined style={{ marginRight: 8 }} />
                              {formatDateTime(selectedMessage.createdAt)}
                            </Text>
                          </Col>
                        </Row>
                        <Divider style={{ margin: '12px 0' }} />
                        <Row>
                          <Col span={24}>
                            <Title level={4}>{selectedMessage.subject}</Title>
                            <Paragraph style={{ whiteSpace: 'pre-wrap' }} className="message-content">
                              {selectedMessage.message}
                            </Paragraph>
                          </Col>
                        </Row>
                        <Divider style={{ margin: '12px 0' }} />
                        <Space>
                          {!selectedMessage.assignedTo ? (
                            <Button
                              type="primary"
                              icon={<TeamOutlined />}
                              onClick={() => setAssignmentModalVisible(true)}
                            >
                              تعيين المسؤول
                            </Button>
                          ) : (
                            <Button
                              type="default"
                              icon={<TeamOutlined />}
                              onClick={() => setAssignmentModalVisible(true)}
                            >
                              تغيير المسؤول
                            </Button>
                          )}
                          
                          <Button
                            icon={<FileTextOutlined />}
                            onClick={() => {
                              setInternalNoteVisible(true);
                              noteForm.resetFields();
                            }}
                          >
                            ملاحظة داخلية
                          </Button>
                          
                          {selectedMessage.status !== 'resolved' && (
                            <Button 
                              icon={<CheckCircleOutlined />} 
                              onClick={() => updateMessageStatus(selectedMessage._id, 'resolved')}
                            >
                              تحديد كـ "تم الحل"
                            </Button>
                          )}
                          {selectedMessage.status === 'resolved' && (
                            <Button 
                              icon={<SyncOutlined />} 
                              onClick={() => updateMessageStatus(selectedMessage._id, 'in-progress')}
                            >
                              إعادة فتح
                            </Button>
                          )}
                        </Space>
                      </Card>
                      
                      {/* Internal Notes Section */}
                      {selectedMessage.internalNotes && selectedMessage.internalNotes.length > 0 && (
                        <>
                          <Divider orientation="right">
                            <Space>
                              <FileTextOutlined />
                              <span>ملاحظات داخلية ({selectedMessage.internalNotes.length})</span>
                            </Space>
                          </Divider>
                          
                          <div className="internal-notes-section">
                            {selectedMessage.internalNotes.map((note, index) => (
                              <Alert
                                key={index}
                                message={
                                  <div className="note-header">
                                    <Space>
                                      <Avatar size="small" icon={<UserOutlined />} />
                                      <Text strong>{note.adminName}</Text>
                                    </Space>
                                    <Text type="secondary">
                                      {formatDateTime(note.createdAt)}
                                    </Text>
                                  </div>
                                }
                                description={
                                  <div className="note-content">
                                    {note.note}
                                  </div>
                                }
                                type="info"
                                showIcon={false}
                                className="internal-note-item"
                              />
                            ))}
                          </div>
                        </>
                      )}
                      
                      <Divider orientation="right">
                        <Space>
                          <MessageOutlined />
                          <span>سجل المحادثة ({selectedMessage?.responses?.length || 0})</span>
                        </Space>
                      </Divider>
                      
                      <div className="conversation-thread">
                        {selectedMessage?.responses?.length > 0 ? (
                          <Timeline mode="alternate" className="messages-timeline">
                            {selectedMessage?.responses?.map((response, index) => {
                              const isAdmin = response.isAdminResponse;
                              return (
                                <Timeline.Item 
                                  key={index} 
                                  color={isAdmin ? "blue" : "green"}
                                  position={isAdmin ? "right" : "left"}
                                  dot={
                                    <Avatar 
                                      size="small" 
                                      icon={<UserOutlined />} 
                                      style={{ backgroundColor: isAdmin ? '#1890ff' : '#52c41a' }} 
                                    />
                                  }
                                >
                                  <Card 
                                    className={`response-card ${isAdmin ? 'admin-response' : 'user-response'}`}
                                    style={{ 
                                      borderLeft: isAdmin ? 'none' : '4px solid #52c41a',
                                      borderRight: isAdmin ? '4px solid #1890ff' : 'none',
                                      background: isAdmin ? '#f0f8ff' : '#f6ffed'
                                    }}
                                  >
                                    <div className="response-header">
                                      <div>
                                        <Text strong>{isAdmin ? response.adminName : response.userName}</Text>
                                        <Tag color={isAdmin ? "blue" : "green"}>
                                          {isAdmin ? "مدير" : "مستخدم"}
                                        </Tag>
                                      </div>
                                      <Text type="secondary">
                                        {formatDateTime(response.createdAt)}
                                      </Text>
                                    </div>
                                    <Paragraph style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>
                                      {response.message}
                                    </Paragraph>
                                  </Card>
                                </Timeline.Item>
                              );
                            })}
                          </Timeline>
                        ) : (
                          <Empty description="لا توجد ردود على هذه الرسالة بعد" />
                        )}
                      </div>
                      
                      {/* Embedded Reply Form */}
                      <div className="reply-form-container" id="reply-form">
                        <Divider orientation="right">
                          <Space>
                            <CommentOutlined />
                            <span>إرسال رد</span>
                          </Space>
                        </Divider>
                        
                        <div className="reply-actions">
                          <Button 
                            type="default" 
                            icon={<FileTextOutlined />}
                            onClick={() => setTemplateDrawerVisible(true)}
                          >
                            استخدام قالب
                          </Button>
                          
                          <Upload 
                            action="/api/support/admin/upload"
                            showUploadList={false}
                            beforeUpload={() => {
                              message.info('سيتم تطبيق هذه الميزة في تحديث قادم');
                              return false;
                            }}
                          >
                            <Button icon={<UploadOutlined />}>
                              إرفاق ملف
                            </Button>
                          </Upload>
                        </div>
                        
                        <Form layout="vertical" onFinish={handleReplySubmit}>
                          <Form.Item
                            name="reply"
                            rules={[{ required: true, message: 'الرجاء إدخال نص الرد' }]}
                          >
                            <TextArea 
                              ref={replyInputRef}
                              rows={4} 
                              placeholder="اكتب ردك هنا..." 
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                            />
                          </Form.Item>
                          <div className="reply-form-footer">
                            <div className="reply-to-info">
                              <InfoCircleOutlined style={{ marginLeft: 8 }} />
                              <span>الرد إلى: {selectedMessage?.userName} ({selectedMessage?.userEmail})</span>
                            </div>
                            <Button 
                              type="primary" 
                              icon={<CommentOutlined />} 
                              htmlType="submit"
                            >
                              إرسال الرد
                            </Button>
                          </div>
                        </Form>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Card className="empty-conversation-card">
                    <Empty 
                      description="الرجاء اختيار رسالة من القائمة لعرض المحادثة"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  </Card>
                )}
              </Col>
            </Row>
          </Row>
        </TabPane>
        
        <TabPane 
          tab={
            <span>
              <FileTextOutlined />
              {t('response_templates')}
            </span>
          } 
          key="templates"
        >
          <Row gutter={[24, 24]}>
            <Col span={24}>
              <Card 
                title={<Title level={4}>قوالب الردود</Title>}
                extra={
                  <Button 
                    type="primary" 
                    icon={<FileAddOutlined />}
                    onClick={() => {
                      setTemplateFormVisible(true);
                      templateForm.resetFields();
                    }}
                  >
                    إنشاء قالب جديد
                  </Button>
                }
              >
                <Row gutter={[16, 16]}>
                  {responseTemplates.map((template, index) => (
                    <Col key={index} xs={24} sm={12} md={8} lg={6}>
                      <Card 
                        className="template-card"
                        hoverable
                        actions={[
                          <Tooltip key="preview" title="معاينة">
                            <EyeOutlined onClick={() => {
                              Modal.info({
                                title: template.name || template.title,
                                content: (
                                  <div>
                                    <div style={{ marginBottom: '10px' }}>
                                      {getCategoryTag(template.category)}
                                      <Tag color="blue">تمت المعاينة: {formatDateTime(new Date())}</Tag>
                                    </div>
                                    <div style={{ 
                                      border: '1px solid #f0f0f0',
                                      borderRadius: '4px',
                                      padding: '12px',
                                      background: '#f9f9f9' 
                                    }}>
                                      <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                                        {template.content}
                                      </pre>
                                    </div>
                                  </div>
                                ),
                                width: 600,
                                okText: 'استخدام هذا القالب',
                                onOk: () => handleApplyTemplate(template)
                              });
                            }} />
                          </Tooltip>,
                          <Tooltip key="edit" title="تعديل">
                            <EditOutlined onClick={() => {
                              // Set form values
                              templateForm.setFieldsValue({
                                title: template.name || template.title,
                                category: template.category,
                                content: template.content
                              });
                              
                              // Open edit modal
                              Modal.confirm({
                                title: 'تعديل القالب',
                                content: (
                                  <Form form={templateForm} layout="vertical">
                                    <Form.Item
                                      name="title"
                                      label="عنوان القالب"
                                      rules={[{ required: true, message: 'الرجاء إدخال عنوان القالب' }]}
                                    >
                                      <Input placeholder="أدخل عنوان القالب" />
                                    </Form.Item>
                                    
                                    <Form.Item
                                      name="category"
                                      label="تصنيف القالب"
                                      rules={[{ required: true, message: 'الرجاء اختيار تصنيف' }]}
                                    >
                                      <Select placeholder="اختر تصنيف القالب">
                                        <Option value="technical">تقني</Option>
                                        <Option value="billing">فواتير</Option>
                                        <Option value="general">عام</Option>
                                        <Option value="bug">خطأ</Option>
                                        <Option value="feature">ميزة جديدة</Option>
                                      </Select>
                                    </Form.Item>
                                    
                                    <Form.Item
                                      name="content"
                                      label="محتوى القالب"
                                      rules={[{ required: true, message: 'الرجاء إدخال محتوى القالب' }]}
                                    >
                                      <TextArea
                                        rows={6}
                                        placeholder="أدخل محتوى القالب هنا..."
                                      />
                                    </Form.Item>
                                  </Form>
                                ),
                                width: 700,
                                okText: 'حفظ التغييرات',
                                cancelText: 'إلغاء',
                                onOk: async () => {
                                  try {
                                    const values = await templateForm.validateFields();
                                    const loadingKey = 'updating-template';
                                    showLoading('جاري تحديث القالب...', loadingKey);
                                    
                                    await axios.put(`/api/support/templates/${template._id}`, {
                                      name: values.title,
                                      category: values.category,
                                      content: values.content
                                    });
                                    
                                    // Update templates in state
                                    fetchTemplates();
                                    
                                    updateMessage('success', 'تم تحديث القالب بنجاح', loadingKey);
                                  } catch (error) {
                                    console.error('Error updating template:', error);
                                    showError('فشل في تحديث القالب');
                                  }
                                }
                              });
                            }} />
                          </Tooltip>,
                          <Tooltip key="save" title="استخدام">
                            <SaveOutlined onClick={() => handleApplyTemplate(template)} />
                          </Tooltip>
                        ]}
                      >
                        <Card.Meta
                          title={template.name || template.title}
                          description={
                            <div>
                              {getCategoryTag(template.category)}
                              <div className="template-preview">
                                {template.content.substring(0, 50)}
                                {template.content.length > 50 ? '...' : ''}
                              </div>
                            </div>
                          }
                        />
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
      
      {/* Template Drawer */}
      <Drawer
        title="قوالب الردود"
        placement="left"
        onClose={() => setTemplateDrawerVisible(false)}
        visible={templateDrawerVisible}
        width={400}
      >
        <div className="templates-container">
          <Input.Search
            placeholder="ابحث عن قالب"
            style={{ marginBottom: 16 }}
          />
          
          <Tabs defaultActiveKey="all">
            <TabPane tab="الكل" key="all" />
            <TabPane tab="تقني" key="technical" />
            <TabPane tab="فواتير" key="billing" />
            <TabPane tab="عام" key="general" />
          </Tabs>
          
          <List
            dataSource={responseTemplates}
            renderItem={template => (
              <List.Item
                className="template-list-item"
                actions={[
                  <Button 
                    key="use" 
                    type="primary" 
                    size="small"
                    onClick={() => handleApplyTemplate(template)}
                  >
                    استخدام
                  </Button>
                ]}
              >
                <List.Item.Meta
                  title={template.name || template.title}
                  description={
                    <div>
                      {getCategoryTag(template.category)}
                      <div className="template-preview">
                        {template.content.substring(0, 50)}...
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </div>
      </Drawer>
      
      {/* Create Template Modal */}
      <Modal
        title="إنشاء قالب جديد"
        visible={templateFormVisible}
        onCancel={() => setTemplateFormVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setTemplateFormVisible(false)}>
            إلغاء
          </Button>,
          <Button key="submit" type="primary" onClick={handleCreateTemplate}>
            حفظ القالب
          </Button>
        ]}
      >
        <Form
          form={templateForm}
          layout="vertical"
        >
          <Form.Item
            name="title"
            label="عنوان القالب"
            rules={[{ required: true, message: 'الرجاء إدخال عنوان القالب' }]}
          >
            <Input placeholder="أدخل عنوان القالب" />
          </Form.Item>
          
          <Form.Item
            name="category"
            label="تصنيف القالب"
            rules={[{ required: true, message: 'الرجاء اختيار تصنيف' }]}
          >
            <Select placeholder="اختر تصنيف القالب">
              <Option value="technical">تقني</Option>
              <Option value="billing">فواتير</Option>
              <Option value="general">عام</Option>
              <Option value="bug">خطأ</Option>
              <Option value="feature">ميزة جديدة</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="content"
            label="محتوى القالب"
            rules={[{ required: true, message: 'الرجاء إدخال محتوى القالب' }]}
          >
            <TextArea
              rows={6}
              placeholder="أدخل محتوى القالب هنا..."
            />
          </Form.Item>
        </Form>
      </Modal>
      
      {/* Internal Note Modal */}
      <Modal
        title="إضافة ملاحظة داخلية"
        visible={internalNoteVisible}
        onCancel={() => setInternalNoteVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setInternalNoteVisible(false)}>
            إلغاء
          </Button>,
          <Button key="submit" type="primary" onClick={handleAddInternalNote}>
            إضافة ملاحظة
          </Button>
        ]}
      >
        <Alert
          message="هذه الملاحظات مرئية فقط للمسؤولين وليست للمستخدمين"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Form
          form={noteForm}
          layout="vertical"
        >
          <Form.Item
            name="note"
            rules={[{ required: true, message: 'الرجاء إدخال نص الملاحظة' }]}
          >
            <TextArea
              rows={4}
              placeholder="أدخل ملاحظة داخلية حول هذه المشكلة..."
            />
          </Form.Item>
        </Form>
      </Modal>
      
      {/* Assignment Modal */}
      <Modal
        title="تعيين المسؤول"
        visible={assignmentModalVisible}
        onCancel={() => setAssignmentModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setAssignmentModalVisible(false)}>
            إلغاء
          </Button>,
          <Button key="submit" type="primary" onClick={handleAssignMessage}>
            تعيين
          </Button>
        ]}
      >
        <Form
          form={assignForm}
          layout="vertical"
        >
          <Form.Item
            name="assignTo"
            label="تعيين إلى"
            rules={[{ required: true, message: 'الرجاء اختيار مسؤول' }]}
            initialValue={selectedMessage?.assignedTo || null}
          >
            <Select placeholder="اختر المسؤول">
              {adminTeam.map(admin => (
                <Option key={admin.id} value={admin.id}>
                  <Space>
                    <Avatar size="small" icon={<UserOutlined />} />
                    <span>{admin.name}</span>
                    <Tag color={admin.status === 'متاح' ? 'green' : 'orange'}>
                      {admin.status}
                    </Tag>
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </ContentContainer>
  );
};

export default AdminSupportMessages;