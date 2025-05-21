import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Table, Button, Input, Tag, Space, Tooltip, Empty,
  Modal, Form, Select, DatePicker, TimePicker, Switch,
  Badge, Tabs, Drawer, Popconfirm, message, Typography,
  Radio, Spin, Divider, Row, Col, InputNumber, List, Avatar, Alert,
  Progress
} from 'antd';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, 
  InfoCircleOutlined, PlayCircleOutlined, PauseCircleOutlined,
  ReloadOutlined, FilterOutlined, ExclamationCircleOutlined,
  ScheduleOutlined, SendOutlined, ClockCircleOutlined,
  TeamOutlined, CheckCircleOutlined, UserOutlined,
  MessageOutlined, FileImageOutlined, SearchOutlined,
  EyeOutlined, SyncOutlined, CopyOutlined,
  LinkOutlined, SmileOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';
import { useLoading } from '../../context/LoadingContext';
import moment from 'moment';
import locale from 'antd/es/date-picker/locale/ar_EG';
import debounce from 'lodash/debounce';

const { TabPane } = Tabs;
const { Title, Text } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

/**
 * CampaignManager Component for managing scheduled message campaigns
 */
const CampaignManager = ({ selectedPage, pageSenders }) => {
  const { t, currentLanguage } = useLanguage();
  const { showLoading, hideLoading } = useLoading();
  const isRTL = currentLanguage === 'ar';
  
  // Campaign list state
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Campaign form state
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [campaignForm] = Form.useForm();
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [messageType, setMessageType] = useState('text');
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  
  // Status management
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmModalAction, setConfirmModalAction] = useState({});
  const [confirmCampaign, setConfirmCampaign] = useState(null);
  const [rescheduleForm] = Form.useForm();

  // Delay settings
  const [enableDelay, setEnableDelay] = useState(true);
  const [delayMode, setDelayMode] = useState('fixed');
  const [delaySeconds, setDelaySeconds] = useState(5);
  const [minDelaySeconds, setMinDelaySeconds] = useState(3);
  const [maxDelaySeconds, setMaxDelaySeconds] = useState(10);
  const [incrementalDelayStart, setIncrementalDelayStart] = useState(3);
  const [incrementalDelayStep, setIncrementalDelayStep] = useState(2);
  
  // Buttons state (for message with buttons)
  const [buttons, setButtons] = useState([]);
  const [buttonForm] = Form.useForm();
  
  // Personalization state
  const [personalizeMessage, setPersonalizeMessage] = useState(true);
  
  // Details drawer
  const [detailsDrawerVisible, setDetailsDrawerVisible] = useState(false);
  const [selectedCampaignDetails, setSelectedCampaignDetails] = useState(null);
  
  // Pagination
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  
  // Load campaigns when page changes
  useEffect(() => {
    if (selectedPage) {
      fetchCampaigns();
    }
  }, [selectedPage]);
  
  // Fetch campaign list
  const fetchCampaigns = async () => {
    if (!selectedPage) return;
    
    try {
      setLoading(true);
      showLoading();
      
      const response = await axios.get('/api/pagemessages/campaigns');
      
      // Handle different response structures
      let campaignsData = [];
      
      if (Array.isArray(response.data)) {
        // Response is directly an array
        campaignsData = response.data;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        // Response has a nested data property
        campaignsData = response.data.data;
      } else if (response.data && typeof response.data === 'object') {
        // Response is an object, extract values as array
        campaignsData = Object.values(response.data);
      }
      
      // Filter campaigns for the selected page
      const filteredCampaigns = campaignsData.filter(
        campaign => campaign && campaign.pageId === selectedPage.id
      );
      
      setCampaigns(filteredCampaigns);
      setPagination(prev => ({
        ...prev,
        total: filteredCampaigns.length
      }));
      
      hideLoading();
      setLoading(false);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      message.error(t('pageMessages:campaigns.errorLoading'));
      hideLoading();
      setLoading(false);
    }
  };
  
  // Handle form submission for creating/editing campaigns
  const handleFormSubmit = async (values) => {
    if (!selectedPage) {
      message.error(t('pageMessages:campaigns.selectPageFirst'));
      return;
    }
    
    if (selectedRecipients.length === 0) {
      message.error(t('pageMessages:composer.noRecipientsSelected'));
      return;
    }
    
    try {
      showLoading();
      
      // All campaigns must be scheduled
      const scheduledDateTime = values.scheduledDateTime;
      if (!scheduledDateTime) {
        message.error(t('pageMessages:campaigns.scheduledTimeRequired'));
        hideLoading();
        return;
      }
      
      // Common campaign data
      const campaignData = {
        pageId: selectedPage.id,
        pageName: selectedPage.name,
        accessToken: selectedPage.accessToken,
        name: values.name,
        description: values.description || '',
        messageType,
        messageText: values.messageText || '',
        imageUrl: (messageType === 'image' || messageType === 'enhancedButtons') ? values.imageUrl : '',
        videoUrl: messageType === 'video' ? values.videoUrl : '',
        scheduled: true, // Always scheduled
        scheduledTime: scheduledDateTime.toISOString(),
        recipients: selectedRecipients.map(sender => ({
          id: sender.id,
          name: sender.name,
          lastInteraction: sender.lastInteraction || new Date().toISOString()
        })),
        enableDelay,
        delayMode,
        delaySeconds,
        minDelaySeconds, 
        maxDelaySeconds,
        incrementalDelayStart,
        incrementalDelayStep,
        personalizeMessage,
        quickReplyButtons: buttons
      };
      
      let response;
      if (editingCampaign) {
        // Updating existing campaign
        response = await axios.put(`/api/pagemessages/campaigns/${editingCampaign._id}`, campaignData);
        message.success(t('pageMessages:campaigns.updated'));
      } else {
        // Creating new campaign
        response = await axios.post('/api/pagemessages/campaigns', campaignData);
        
        // Check if response contains the new campaign data and add to state
        let newCampaign;
        if (response.data && response.data.data) {
          // Handle nested data structure
          newCampaign = response.data.data;
        } else if (response.data) {
          // Handle direct data structure
          newCampaign = response.data;
        }
        
        // Add the new campaign to state if available
        if (newCampaign) {
          setCampaigns(prev => [...prev, newCampaign]);
        }
        
        message.success(t('pageMessages:campaigns.created'));
      }
      
      hideLoading();
      setIsDrawerVisible(false);
      resetForm();
      fetchCampaigns();
    } catch (error) {
      console.error('Error saving campaign:', error);
      message.error(
        error.response?.data?.message || 
        t('pageMessages:campaigns.errorSaving')
      );
      hideLoading();
    }
  };
  
  // Reset form and form-related state
  const resetForm = () => {
    campaignForm.resetFields();
    setEditingCampaign(null);
    setMessageType('text');
    setSelectedRecipients([]);
    setButtons([]);
    setEnableDelay(true);
    setDelayMode('fixed');
    setDelaySeconds(5);
    setMinDelaySeconds(3);
    setMaxDelaySeconds(10);
    setIncrementalDelayStart(3);
    setIncrementalDelayStep(2);
    setPersonalizeMessage(true);
  };
  
  // Handle edit campaign click
  const handleEditCampaign = (campaign) => {
    setEditingCampaign(campaign);
    
    // Set form values
    campaignForm.setFieldsValue({
      name: campaign.name,
      description: campaign.description,
      messageText: campaign.messageText,
      imageUrl: campaign.imageUrl,
      videoUrl: campaign.videoUrl,
      scheduledDateTime: campaign.scheduledTime ? moment(campaign.scheduledTime) : null
    });
    
    // Set other form-related state
    setMessageType(campaign.messageType || 'text');
    setSelectedRecipients(campaign.recipients || []);
    setButtons(campaign.quickReplyButtons || []);
    setEnableDelay(campaign.enableDelay !== undefined ? campaign.enableDelay : true);
    setDelayMode(campaign.delayMode || 'fixed');
    setDelaySeconds(campaign.delaySeconds || 5);
    setMinDelaySeconds(campaign.minDelaySeconds || 3);
    setMaxDelaySeconds(campaign.maxDelaySeconds || 10);
    setIncrementalDelayStart(campaign.incrementalDelayStart || 3);
    setIncrementalDelayStep(campaign.incrementalDelayStep || 2);
    setPersonalizeMessage(campaign.personalizeMessage !== undefined ? campaign.personalizeMessage : true);
    
    setIsDrawerVisible(true);
  };
  
  // Handle delete campaign
  const handleDeleteCampaign = async (campaign) => {
    try {
      showLoading();
      
      await axios.delete(`/api/pagemessages/campaigns/${campaign._id}`);
      
      message.success(t('pageMessages:campaigns.deleted'));
      fetchCampaigns();
      
      hideLoading();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      message.error(t('pageMessages:campaigns.errorDeleting'));
      hideLoading();
    }
  };
  
  // Handle campaign status change
  const handleChangeStatus = async (campaign, action) => {
    setConfirmCampaign(campaign);
    
    switch (action) {
      case 'reschedule':
        // Open a modal with a date picker for rescheduling
        setConfirmModalAction({
          action: 'reschedule',
          title: t('pageMessages:campaigns.rescheduleCampaign', 'Reschedule Campaign'),
          text: t('pageMessages:campaigns.confirmReschedule', 'Select a new date and time for this campaign:'),
          endpoint: `/api/pagemessages/campaigns/${campaign._id}/reschedule`,
          successMessage: t('pageMessages:campaigns.rescheduled', 'Campaign rescheduled')
        });
        rescheduleForm.resetFields();
        break;
      case 'pause':
        setConfirmModalAction({
          action: 'pause',
          title: t('pageMessages:campaigns.pauseCampaign', 'Pause Campaign'),
          text: t('pageMessages:campaigns.confirmPause', 'Are you sure you want to pause this campaign?'),
          endpoint: `/api/pagemessages/campaigns/${campaign._id}/pause`,
          successMessage: t('pageMessages:campaigns.paused', 'Campaign paused')
        });
        break;
      case 'resume':
        setConfirmModalAction({
          action: 'resume',
          title: t('pageMessages:campaigns.resumeCampaign', 'Resume Campaign'),
          text: t('pageMessages:campaigns.confirmResume', 'Are you sure you want to resume this campaign?'),
          endpoint: `/api/pagemessages/campaigns/${campaign._id}/resume`,
          successMessage: t('pageMessages:campaigns.resumed', 'Campaign resumed')
        });
        break;
      case 'cancel':
        setConfirmModalAction({
          action: 'cancel',
          title: t('pageMessages:campaigns.cancelCampaign', 'Cancel Campaign'),
          text: t('pageMessages:campaigns.confirmCancel', 'Are you sure you want to cancel this campaign?'),
          endpoint: `/api/pagemessages/campaigns/${campaign._id}/cancel`,
          successMessage: t('pageMessages:campaigns.canceled', 'Campaign canceled')
        });
        break;
      default:
        return;
    }
    
    setConfirmModalVisible(true);
  };
  
  // Execute status change
  const executeStatusChange = async () => {
    try {
      showLoading();
      
      await axios.post(confirmModalAction.endpoint);
      
      message.success(confirmModalAction.successMessage);
      fetchCampaigns();
      
      hideLoading();
      setConfirmModalVisible(false);
    } catch (error) {
      console.error('Error updating campaign status:', error);
      message.error(t('pageMessages:campaigns.errorUpdatingStatus'));
      hideLoading();
      setConfirmModalVisible(false);
    }
  };
  
  // Execute reschedule
  const executeReschedule = async (newScheduledTime) => {
    try {
      showLoading();
      
      await axios.post(confirmModalAction.endpoint, {
        scheduledTime: newScheduledTime.toISOString()
      });
      
      message.success(confirmModalAction.successMessage);
      fetchCampaigns();
      
      hideLoading();
      setConfirmModalVisible(false);
    } catch (error) {
      console.error('Error rescheduling campaign:', error);
      message.error(t('pageMessages:campaigns.errorRescheduling', 'Error rescheduling campaign'));
      hideLoading();
      setConfirmModalVisible(false);
    }
  };
  
  // Refund failed messages
  const handleRefundFailed = async (campaign) => {
    try {
      showLoading();
      
      const response = await axios.post(`/api/pagemessages/campaigns/${campaign._id}/refund-failed`);
      
      // Handle different response structures
      let refundedPoints = 0;
      let refundedCount = 0;
      
      if (response.data) {
        if (response.data.data) {
          // Nested data structure
          refundedPoints = response.data.data.refundedPoints || 0;
          refundedCount = response.data.data.refundedCount || 0;
        } else if (response.data.pointsInfo) {
          // Handle refundedPoints inside pointsInfo
          refundedPoints = response.data.pointsInfo.pointsRefunded || 0;
          refundedCount = response.data.pointsInfo.failedMessages || 0;
        } else {
          // Direct data structure
          refundedPoints = response.data.refundedPoints || 0;
          refundedCount = response.data.refundedCount || 0;
        }
      }
      
      if (refundedPoints > 0) {
        message.success(
          t('pageMessages:campaigns.pointsRefundedSuccess', {
            points: refundedPoints,
            messages: refundedCount
          })
        );
      } else {
        message.info(t('pageMessages:campaigns.noFailedMessages'));
      }
      
      fetchCampaigns();
      
      hideLoading();
    } catch (error) {
      console.error('Error refunding points:', error);
      message.error(t('pageMessages:campaigns.errorRefunding'));
      hideLoading();
    }
  };
  
  // View campaign details
  const handleViewDetails = async (campaign) => {
    try {
      showLoading();
      
      const response = await axios.get(`/api/pagemessages/campaigns/${campaign._id}/stats`);
      
      // Handle different response structures for stats
      let statsData = {};
      
      if (response.data) {
        if (response.data.data) {
          // Handle nested data structure
          statsData = response.data.data;
        } else {
          // Direct data structure
          statsData = response.data;
        }
      }
      
      setSelectedCampaignDetails({
        ...campaign,
        stats: statsData
      });
      
      setDetailsDrawerVisible(true);
      
      hideLoading();
    } catch (error) {
      console.error('Error fetching campaign details:', error);
      message.error(t('common:errorFetchingDetails', 'Error fetching details'));
      hideLoading();
    }
  };
  
  // Handle campaign duplication
  const handleDuplicateCampaign = (campaign) => {
    setEditingCampaign(null);
    
    // Set form values, changing the name to indicate it's a copy
    campaignForm.setFieldsValue({
      name: `${campaign.name} - ${t('common:copy', 'Copy')}`,
      description: campaign.description,
      messageText: campaign.messageText,
      imageUrl: campaign.imageUrl,
      videoUrl: campaign.videoUrl,
      scheduledDateTime: campaign.scheduledTime ? moment(campaign.scheduledTime) : null
    });
    
    // Set other form-related state
    setMessageType(campaign.messageType || 'text');
    setSelectedRecipients(campaign.recipients || []);
    setButtons(campaign.quickReplyButtons || []);
    setEnableDelay(campaign.enableDelay !== undefined ? campaign.enableDelay : true);
    setDelayMode(campaign.delayMode || 'fixed');
    setDelaySeconds(campaign.delaySeconds || 5);
    setMinDelaySeconds(campaign.minDelaySeconds || 3);
    setMaxDelaySeconds(campaign.maxDelaySeconds || 10);
    setIncrementalDelayStart(campaign.incrementalDelayStart || 3);
    setIncrementalDelayStep(campaign.incrementalDelayStep || 2);
    setPersonalizeMessage(campaign.personalizeMessage !== undefined ? campaign.personalizeMessage : true);
    
    setIsDrawerVisible(true);
  };
  
  // Handle button add/remove
  const handleAddButton = () => {
    buttonForm.validateFields().then(values => {
      if (buttons.length >= 3) {
        message.warning(t('pageMessages:composer.maxButtonsReached'));
        return;
      }
      
      const newButton = {
        type: values.buttonType,
        text: values.buttonText,
        url: values.buttonType === 'url' ? values.buttonUrl : '',
        payload: values.buttonType === 'text' ? values.buttonPayload : ''
      };
      
      setButtons([...buttons, newButton]);
      buttonForm.resetFields();
    });
  };
  
  const handleRemoveButton = (index) => {
    const updatedButtons = [...buttons];
    updatedButtons.splice(index, 1);
    setButtons(updatedButtons);
  };
  
  // Debounced search
  const handleSearch = debounce((e) => {
    setSearchText(e.target.value);
  }, 300);
  
  // Handle recipient selection
  const handleSelectAllRecipients = () => {
    setSelectedRecipients(pageSenders);
  };
  
  const handleClearRecipients = () => {
    setSelectedRecipients([]);
  };
  
  const handleSelectRecipient = (sender) => {
    const isSelected = selectedRecipients.some(r => r.id === sender.id);
    
    if (isSelected) {
      setSelectedRecipients(selectedRecipients.filter(r => r.id !== sender.id));
    } else {
      setSelectedRecipients([...selectedRecipients, sender]);
    }
  };
  
  // Campaign table columns
  const getColumns = () => [
    {
      title: t('pageMessages:campaigns.name'),
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: '14px' }}>{text}</Text>
          {record.description && (
            <Text type="secondary" style={{ fontSize: '12px' }}>{record.description}</Text>
          )}
        </Space>
      )
    },
    {
      title: t('pageMessages:campaigns.schedule'),
      dataIndex: 'scheduledTime',
      key: 'schedule',
      render: (text, record) => {
        // All campaigns are now scheduled
        const scheduledTime = moment(text);
        const now = moment();
        const isPast = scheduledTime.isBefore(now);
        
        return (
          <Space direction="vertical" size={0}>
            <Space>
              <ScheduleOutlined />
              <Text>{scheduledTime.format('YYYY-MM-DD')}</Text>
            </Space>
            <Text type={isPast ? 'danger' : 'secondary'}>
              {scheduledTime.format('HH:mm')}
            </Text>
          </Space>
        );
      }
    },
    {
      title: t('pageMessages:campaigns.recipients'),
      dataIndex: 'recipientCount',
      key: 'recipients',
      render: (count) => (
        <Space>
          <TeamOutlined />
          <Text>{count}</Text>
        </Space>
      )
    },
    {
      title: t('pageMessages:campaigns.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => {
        let color, icon, text;
        
        switch (status) {
          case 'draft':
            color = 'default';
            icon = <EditOutlined />;
            text = t('pageMessages:campaigns.statusDraft');
            break;
          case 'pending':
            color = 'processing';
            icon = <ClockCircleOutlined />;
            text = t('pageMessages:campaigns.statusPending');
            break;
          case 'processing':
            color = 'blue';
            icon = <SyncOutlined spin />;
            text = t('pageMessages:campaigns.statusProcessing');
            break;
          case 'paused':
            color = 'warning';
            icon = <PauseCircleOutlined />;
            text = t('pageMessages:campaigns.statusPaused');
            break;
          case 'completed':
            color = 'success';
            icon = <CheckCircleOutlined />;
            text = t('pageMessages:campaigns.statusCompleted');
            break;
          case 'failed':
            color = 'error';
            icon = <ExclamationCircleOutlined />;
            text = t('pageMessages:campaigns.statusFailed');
            break;
          case 'canceled':
            color = 'default';
            icon = <DeleteOutlined />;
            text = t('pageMessages:campaigns.statusCanceled');
            break;
          default:
            color = 'default';
            icon = <InfoCircleOutlined />;
            text = status;
        }
        
        return (
          <Space direction="vertical" size={0}>
            <Badge 
              status={color} 
              text={<Text style={{ fontSize: '14px' }}>{text}</Text>}
              style={{ whiteSpace: 'nowrap' }}
            />
            {(status === 'completed' || status === 'processing') && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {t('pageMessages:campaigns.sentStatus').replace("{{success}}", record.sent).replace("{{total}}", record.recipientCount)}
              </Text>
            )}
          </Space>
        );
      }
    },
    {
      title: t('pageMessages:campaigns.actions'),
      key: 'actions',
      render: (_, record) => {
        const getActionButtons = () => {
          const actions = [];
          
          // View details - always available
          actions.push(
            <Tooltip key="details" title={t('common:viewDetails', 'View Details')}>
              <Button 
                icon={<InfoCircleOutlined />} 
                size="small"
                onClick={() => handleViewDetails(record)}
              />
            </Tooltip>
          );
          
          // Edit - only for drafts and pending
          if (record.status === 'draft' || record.status === 'pending') {
            actions.push(
              <Tooltip key="edit" title={t('pageMessages:campaigns.edit')}>
                <Button 
                  icon={<EditOutlined />} 
                  size="small"
                  onClick={() => handleEditCampaign(record)}
                />
              </Tooltip>
            );
          }
          
          // Reschedule button for pending campaigns
          if (record.status === 'pending') {
            actions.push(
              <Tooltip key="reschedule" title={t('pageMessages:campaigns.reschedule', 'Reschedule')}>
                <Button 
                  icon={<ScheduleOutlined />} 
                  size="small"
                  onClick={() => handleChangeStatus(record, 'reschedule')}
                />
              </Tooltip>
            );
          } else if (record.status === 'processing') {
            actions.push(
              <Tooltip key="pause" title={t('pageMessages:campaigns.pause')}>
                <Button 
                  icon={<PauseCircleOutlined />} 
                  size="small"
                  onClick={() => handleChangeStatus(record, 'pause')}
                />
              </Tooltip>
            );
          } else if (record.status === 'paused') {
            actions.push(
              <Tooltip key="resume" title={t('pageMessages:campaigns.resume', 'Resume')}>
                <Button 
                  icon={<PlayCircleOutlined />} 
                  size="small"
                  onClick={() => handleChangeStatus(record, 'resume')}
                />
              </Tooltip>
            );
          }
          
          // Cancel - for pending/processing/paused
          if (['pending', 'processing', 'paused'].includes(record.status)) {
            actions.push(
              <Tooltip key="cancel" title={t('pageMessages:campaigns.cancel', 'Cancel')}>
                <Button 
                  icon={<DeleteOutlined />} 
                  size="small"
                  danger
                  onClick={() => handleChangeStatus(record, 'cancel')}
                />
              </Tooltip>
            );
          }
          
          // Duplicate - for any campaign
          actions.push(
            <Tooltip key="duplicate" title={t('pageMessages:campaigns.duplicate')}>
              <Button 
                icon={<CopyOutlined />} 
                size="small"
                onClick={() => handleDuplicateCampaign(record)}
              />
            </Tooltip>
          );
          
          // Delete - only for drafts, completed, failed, canceled
          if (['draft', 'completed', 'failed', 'canceled'].includes(record.status)) {
            actions.push(
              <Popconfirm
                key="delete"
                title={t('pageMessages:campaigns.confirmDelete')}
                onConfirm={() => handleDeleteCampaign(record)}
                okText={t('common:yes', 'Yes')}
                cancelText={t('common:no', 'No')}
              >
                <Tooltip title={t('pageMessages:campaigns.delete')}>
                  <Button 
                    icon={<DeleteOutlined />} 
                    size="small"
                    danger
                  />
                </Tooltip>
              </Popconfirm>
            );
          }
          
          // Refund failed - for completed or failed campaigns with failed messages
          if (['completed', 'failed'].includes(record.status) && 
              record.failed > 0 && 
              record.deductedPoints > 0 && 
              (record.pointsRefunded || 0) < record.deductedPoints) {
            actions.push(
              <Tooltip key="refund" title={t('pageMessages:campaigns.refundFailedMessages')}>
                <Button 
                  icon={<ReloadOutlined />} 
                  size="small"
                  onClick={() => handleRefundFailed(record)}
                />
              </Tooltip>
            );
          }
          
          return actions;
        };
        
        return (
          <Space>
            {getActionButtons()}
          </Space>
        );
      }
    }
  ];
  
  // Filter campaigns based on search text and status filter
  const getFilteredCampaigns = () => {
    let filtered = [...campaigns];
    
    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(
        campaign => campaign.name.toLowerCase().includes(search) ||
          (campaign.description && campaign.description.toLowerCase().includes(search))
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.status === statusFilter);
    }
    
    return filtered;
  };
  
  // Calculate estimated time for sending
  const calculateEstimatedTime = () => {
    if (!selectedRecipients.length || !enableDelay) return 0;
    
    let totalSeconds = 0;
    
    if (delayMode === 'fixed') {
      totalSeconds = (selectedRecipients.length - 1) * delaySeconds;
    } else if (delayMode === 'random') {
      const avgDelay = (minDelaySeconds + maxDelaySeconds) / 2;
      totalSeconds = (selectedRecipients.length - 1) * avgDelay;
    } else if (delayMode === 'incremental') {
      const n = selectedRecipients.length - 1;
      const lastDelay = incrementalDelayStart + (n - 1) * incrementalDelayStep;
      totalSeconds = n * (incrementalDelayStart + lastDelay) / 2;
    }
    
    return totalSeconds;
  };
  
  // Format time in seconds to readable format
  const formatTime = (totalSeconds) => {
    if (totalSeconds === 0) return '0s';
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.round(totalSeconds % 60);
    
    let formattedTime = '';
    
    if (hours > 0) {
      formattedTime += `${hours}h `;
    }
    
    if (minutes > 0 || hours > 0) {
      formattedTime += `${minutes}m `;
    }
    
    formattedTime += `${seconds}s`;
    
    return formattedTime;
  };
  
  // Get estimated time for display
  const getEstimatedTime = () => {
    const totalSeconds = calculateEstimatedTime();
    return formatTime(totalSeconds);
  };
  
  // Render the campaign list
  const renderCampaignList = () => {
    const filteredCampaigns = getFilteredCampaigns();
    
    return (
      <>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            <Input
              placeholder={t('pageMessages:campaigns.searchPlaceholder')}
              prefix={<SearchOutlined />}
              onChange={handleSearch}
              style={{ width: 250 }}
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              dropdownMatchSelectWidth={false}
              style={{ minWidth: 150 }}
            >
              <Select.Option value="all">{t('common:allStatuses', 'All Statuses')}</Select.Option>
              <Select.Option value="draft">{t('pageMessages:campaigns.statusDraft')}</Select.Option>
              <Select.Option value="pending">{t('pageMessages:campaigns.statusPending')}</Select.Option>
              <Select.Option value="processing">{t('pageMessages:campaigns.statusProcessing')}</Select.Option>
              <Select.Option value="paused">{t('pageMessages:campaigns.statusPaused')}</Select.Option>
              <Select.Option value="completed">{t('pageMessages:campaigns.statusCompleted')}</Select.Option>
              <Select.Option value="failed">{t('pageMessages:campaigns.statusFailed')}</Select.Option>
              <Select.Option value="canceled">{t('pageMessages:campaigns.statusCanceled', 'Canceled')}</Select.Option>
            </Select>
          </Space>
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => {
                resetForm();
                setIsDrawerVisible(true);
              }}
            >
              {t('pageMessages:campaigns.createNew')}
            </Button>
            <Button 
              icon={<ReloadOutlined />}
              onClick={fetchCampaigns}
            >
              {t('pageMessages:campaigns.refreshList')}
            </Button>
          </Space>
        </div>
        
        <Table
          columns={getColumns()}
          dataSource={filteredCampaigns}
          rowKey="_id"
          loading={loading}
          pagination={{
            ...pagination,
            total: filteredCampaigns.length,
            showSizeChanger: true,
            pageSizeOptions: ['10', '25', '50', '100'],
            showTotal: (total) => `${total} ${t('common:items', 'items')}`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({
                ...prev,
                current: page,
                pageSize
              }));
            }
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Space direction="vertical" align="center">
                    <Text>{t('pageMessages:campaigns.noCampaigns')}</Text>
                    <Button 
                      type="primary" 
                      icon={<PlusOutlined />}
                      onClick={() => {
                        resetForm();
                        setIsDrawerVisible(true);
                      }}
                    >
                      {t('pageMessages:campaigns.createFirst')}
                    </Button>
                  </Space>
                }
              />
            )
          }}
        />
      </>
    );
  };
  
  // Render status confirm modal
  const renderStatusConfirmModal = () => {
    return (
      <Modal
        title={confirmModalAction.title}
        open={confirmModalVisible}
        onOk={confirmModalAction.action === 'reschedule' 
          ? () => rescheduleForm.submit()
          : executeStatusChange
        }
        onCancel={() => setConfirmModalVisible(false)}
        okText={t('common:confirm', 'Confirm')}
        cancelText={t('common:cancel', 'Cancel')}
      >
        <p>{confirmModalAction.text}</p>
        
        {confirmModalAction.action === 'reschedule' && (
          <Form 
            form={rescheduleForm}
            layout="vertical"
            onFinish={(values) => {
              if (values.newScheduledTime) {
                executeReschedule(values.newScheduledTime);
              }
            }}
          >
            <Form.Item
              name="newScheduledTime"
              label={t('pageMessages:campaigns.newScheduledTime', 'New Scheduled Time')}
              rules={[
                { required: true, message: t('pageMessages:campaigns.scheduledTimeRequired') }
              ]}
            >
              <DatePicker 
                showTime 
                format="YYYY-MM-DD HH:mm"
                style={{ width: '100%' }}
                placeholder={t('pageMessages:campaigns.scheduledDatetime')}
                locale={isRTL ? locale : undefined}
                disabledDate={current => {
                  // Disable dates before today
                  return current && current < moment().startOf('day');
                }}
              />
            </Form.Item>
          </Form>
        )}
      </Modal>
    );
  };
  
  // Render message details based on type
  const renderMessageDetails = (campaign) => {
    switch (campaign.messageType) {
      case 'text':
        return (
          <Space direction="vertical">
            <Text>{campaign.messageText || t('common:none', 'None')}</Text>
          </Space>
        );
      case 'image':
        return (
          <Space direction="vertical">
            {campaign.messageText && <Text>{campaign.messageText}</Text>}
            <Image 
              src={campaign.imageUrl} 
              width={200} 
              alt={campaign.name}
              fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3PTWBSGcbGzM6GCKqlIBRV0dHRJFarQ0eUT8LH4BnRU0NHR0UEFVdIlFRV7TzRksomPY8uykTk/zewQfKw/9znv4yvJynLv4uLiV2dBoDiBf4qP3/ARuCRABEFAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghgg0Aj8i0JO4OzsrPv69Wv+hi2qPHr0qNvf39+iI97soRIh4f3z58/u7du3SXX7Xt7Z2enevHmzfQe+oSN2apSAPj09TSrb+XKI/f379+08+A0cNRE2ANkupk+ACNPvkSPcAAEibACyXUyfABGm3yNHuAECRNgAZLuYPgEirKlHu7u7XdyytGwHAd8jjNyng4OD7vnz51dbPT8/7z58+NB9+/bt6jU/TI+AGWHEnrx48eJ/EsSmHzx40L18+fLyzxF3ZVMjEyDCiEDjMYZZS5wiPXnyZFbJaxMhQIQRGzHvWR7XCyOCXsOmiDAi1HmPMMQjDpbpEiDCiL358eNHurW/5SnWdIBbXiDCiA38/Pnzrce2YyZ4//59F3ePLNMl4PbpiL2J0L979+7yDtHDhw8vtzzvdGnEXdvUigSIsCLAWavHp/+qM0BcXMd/q25n1vF57TYBp0a3mUzilePj4+7k5KSLb6gt6ydAhPUzXnoPR0dHl79WGTNCfBnn1uvSCJdegQhLI1vvCk+fPu2ePXt2tZOYEV6/fn31dz+shwAR1sP1cqvLntbEN9MxA9xcYjsxS1jWR4AIa2Ibzx0tc44fYX/16lV6NDFLXH+YL32jwiACRBiEbf5KcXoTIsQSpzXx4N28Ja4BQoK7rgXiydbHjx/P25TaQAJEGAguWy0+2Q8PD6/Ki4R8EVl+bzBOnZY95fq9rj9zAkTI2SxdidBHqG9+skdw43borCXO/ZcJdraPWdv22uIEiLA4q7nvvCug8WTqzQveOH26fodo7g6uFe/a17W3+nFBAkRYENRdb1vkkz1CH9cPsVy/jrhr27PqMYvENYNlHAIesRiBYwRy0V+8iXP8+/fvX11Mr7L7ECueb/r48eMqm7FuI2BGWDEG8cm+7G3NEOfmdcTQw4h9/55lhm7DekRYKQPZF2ArbXTAyu4kDYB2YxUzwg0gi/41ztHnfQG26HbGel/crVrm7tNY+/1btkOEAZ2M05r4FB7r9GbAIdxaZYrHdOsgJ/wCEQY0J74TmOKnbxxT9n3FgGGWWsVdowHtjt9Nnvf7yQM2aZU/TIAIAxrw6dOnAWtZZcoEnBpNuTuObWMEiLAx1HY0ZQJEmHJ3HNvGCBBhY6jtaMoEiJB0Z29vL6ls58vxPcO8/zfrdo5qvKO+d3Fx8Wu8zf1dW4p/cPzLly/dtv9Ts/EbcvGAHhHyfBIhZ6NSiIBTo0LNNtScABFyNiqFCBChULMNNSdAhJyNSiECRCjUbEPNCRAhZ6NSiAARCjXbUHMCRMjZqBQiQIRCzTbUnAARcjYqhQgQoVCzDTUnQIScjUohAkQo1GxDzQkQIWejUogAEQo121BzAkTI2agUIkCEQs021JwAEXI2KoUIEKFQsw01J0CEnI1KIQJEKNRsQ80JECFno1KIABEKNdtQcwJEyNmoFCJAhELNNtScABFyNiqFCBChULMNNSdAhJyNSiECRCjUbEPNCRAhZ6NSiAARCjXbUHMCRMjZqBQiQIRCzTbUnAARcjYqhQgQoVCzDTUnQIScjUohAkQo1GxDzQkQIWejUogAEQo121BzAkTI2agUIkCEQs021JwAEXI2KoUIEKFQsw01J0CEnI1KIQJEKNRsQ80JECFno1KIABEKNdtQcwJEyNmoFCJAhELNNtScABFyNiqFCBChULMNNSdAhJyNSiECRCjUbEPNCRAhZ6NSiAARCjXbUHMCRMjZqBQiQIRCzTbUnAARcjYqhQgQoVCzDTUnQIScjUohAkQo1GxDzQkQIWejUogAEQo121BzAkTI2agUIkCEQs021JwAEXI2KoUIEKFQsw01J0CEnI1KIQJEKNRsQ80JECFno1KIABEKNdtQcwJEyNmoFCJAhELNNtScABFyNiqFCBChULMNNSdAhJyNSiEC/wGgKKC4YMA4TAAAAABJRU5ErkJggg=="
            />
          </Space>
        );
      case 'video':
        return (
          <Space direction="vertical">
            {campaign.messageText && <Text>{campaign.messageText}</Text>}
            <Card size="small">
              <Space>
                <VideoCameraOutlined style={{ fontSize: 24 }} />
                <Text>{t('pageMessages:campaigns.videoMessage', 'Video Message')}</Text>
              </Space>
              <div>
                <a href={campaign.videoUrl} target="_blank" rel="noopener noreferrer">
                  {campaign.videoUrl}
                </a>
              </div>
            </Card>
          </Space>
        );
      case 'buttons':
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <div className="message-bubble" style={{ 
              background: '#f0f2f5', 
              padding: '12px 16px', 
              borderRadius: '18px',
              marginBottom: 8,
              maxWidth: '80%',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
            }}>
              {campaign.messageText || <Text type="secondary">{t('common:none', 'None')}</Text>}
            </div>
            
            {campaign.quickReplyButtons && campaign.quickReplyButtons.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '80%' }}>
                {campaign.quickReplyButtons.map((button, index) => (
                  <Button 
                    key={index}
                    type="primary" 
                    size="small" 
                    icon={button.type === 'url' ? <LinkOutlined /> : <MessageOutlined />}
                    style={{ 
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center', 
                      justifyContent: 'center',
                      padding: '0 16px',
                      height: '36px',
                      background: button.type === 'url' ? '#1890ff' : '#52c41a'
                    }}
                  >
                    {button.text}
                  </Button>
                ))}
              </div>
            )}
          </Space>
        );
      case 'enhancedButtons':
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <div className="message-bubble" style={{ 
              background: '#f0f2f5', 
              padding: '12px 16px', 
              borderRadius: '18px',
              marginBottom: 8,
              maxWidth: '80%',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
            }}>
              {campaign.messageText || <Text type="secondary">{t('common:none', 'None')}</Text>}
            </div>
            
            <div style={{ marginBottom: 16, borderRadius: '12px', overflow: 'hidden', maxWidth: '80%' }}>
              <Image 
                src={campaign.imageUrl} 
                width={240}
                style={{ objectFit: 'cover', borderRadius: '12px' }}
                fallback="data:image/png;base64,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"
              />
            </div>
            
            {/* Display buttons below the image */}
            {campaign.quickReplyButtons && campaign.quickReplyButtons.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '80%' }}>
                {campaign.quickReplyButtons.map((button, index) => (
                  <Button 
                    key={index}
                    type="primary" 
                    size="small" 
                    icon={button.type === 'url' ? <LinkOutlined /> : <MessageOutlined />}
                    style={{ 
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center', 
                      justifyContent: 'center',
                      padding: '0 16px',
                      height: '36px',
                      background: button.type === 'url' ? '#1890ff' : '#52c41a'
                    }}
                  >
                    {button.text}
                  </Button>
                ))}
              </div>
            )}
          </Space>
        );
      case 'quickReplies':
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <div className="message-bubble" style={{ 
              background: '#f0f2f5', 
              padding: '12px 16px', 
              borderRadius: '18px',
              marginBottom: 8,
              maxWidth: '80%',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
            }}>
              {campaign.messageText || <Text type="secondary">{t('common:none', 'None')}</Text>}
            </div>
            
            {campaign.quickReplyButtons && campaign.quickReplyButtons.length > 0 && (
              <div className="enhanced-quick-reply-preview" style={{
                marginTop: '16px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                {campaign.quickReplyButtons.map((button, idx) => (
                  <Button
                    key={idx}
                    size="small"
                    style={{
                      borderRadius: '16px',
                      background: '#f0f2f5',
                      border: '1px solid #d9d9d9',
                      color: '#1890ff',
                      fontWeight: 500
                    }}
                  >
                    {button.text}
                  </Button>
                ))}
              </div>
            )}
          </Space>
        );
      default:
        return <Text>{t('common:unknown', 'Unknown')}</Text>;
    }
  };
  
  // Render campaign details drawer
  const renderDetailsDrawer = () => {
    if (!selectedCampaignDetails) return null;
    
    const campaign = selectedCampaignDetails;
    const stats = campaign.stats || {};
    
    return (
      <Drawer
        title={
          <Space>
            <InfoCircleOutlined />
            {t('pageMessages:campaigns.details')}: {campaign.name}
          </Space>
        }
        width={600}
        placement={isRTL ? 'left' : 'right'}
        onClose={() => setDetailsDrawerVisible(false)}
        open={detailsDrawerVisible}
      >
        <Tabs defaultActiveKey="info">
          <TabPane 
            tab={
              <span>
                <InfoCircleOutlined /> {t('common:information', 'Information')}
              </span>
            } 
            key="info"
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Card title={t('common:basicInfo', 'Basic Info')} size="small">
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Text strong>{t('pageMessages:campaigns.campaignName')}:</Text>
                  </Col>
                  <Col span={12}>
                    <Text>{campaign.name}</Text>
                  </Col>
                  
                  {campaign.description && (
                    <>
                      <Col span={12}>
                        <Text strong>{t('pageMessages:campaigns.description')}:</Text>
                      </Col>
                      <Col span={12}>
                        <Text>{campaign.description}</Text>
                      </Col>
                    </>
                  )}
                  
                  <Col span={12}>
                    <Text strong>{t('pageMessages:campaigns.status')}:</Text>
                  </Col>
                  <Col span={12}>
                    <Badge 
                      status={
                        campaign.status === 'completed' ? 'success' :
                        campaign.status === 'processing' ? 'processing' :
                        campaign.status === 'paused' ? 'warning' :
                        campaign.status === 'failed' ? 'error' : 'default'
                      } 
                      text={t(`pageMessages:campaigns.status${campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}`)}
                    />
                  </Col>
                  
                  <Col span={12}>
                    <Text strong>{t('common:created', 'Created')}:</Text>
                  </Col>
                  <Col span={12}>
                    <Text>{campaign.createdAt ? moment(campaign.createdAt).format('YYYY-MM-DD HH:mm') : '-'}</Text>
                  </Col>
                  
                  <Col span={12}>
                    <Text strong>{t('pageMessages:campaigns.scheduled')}:</Text>
                  </Col>
                  <Col span={12}>
                    <Text>{moment(campaign.scheduledTime).format('YYYY-MM-DD HH:mm')}</Text>
                  </Col>
                  
                  <Col span={12}>
                    <Text strong>{t('pageMessages:campaigns.messageType')}:</Text>
                  </Col>
                  <Col span={12}>
                    {campaign.messageType === 'text' && <MessageOutlined />}
                    {campaign.messageType === 'image' && <FileImageOutlined />}
                    {campaign.messageType === 'video' && <VideoCameraOutlined />}
                    {campaign.messageType === 'buttons' && <LinkOutlined />}
                    {' '}
                    <Text>{t(`pageMessages:campaigns.type${campaign.messageType ? campaign.messageType.charAt(0).toUpperCase() + campaign.messageType.slice(1) : 'Text'}`)}</Text>
                  </Col>
                </Row>
              </Card>
              
              <Card title={t('pageMessages:campaigns.messageContent')} size="small">
                {renderMessageDetails(campaign)}
              </Card>
              
              <Card title={t('pageMessages:campaigns.recipients')} size="small">
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Text strong>{t('common:total', 'Total')}:</Text>
                  </Col>
                  <Col span={12}>
                    <Text>{campaign.recipientCount}</Text>
                  </Col>
                </Row>
              </Card>
              
              {campaign.enableDelay && (
                <Card title={t('common:messageDelay')} size="small">
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Text strong>{t('common:delayMode')}:</Text>
                    </Col>
                    <Col span={12}>
                      <Text>
                        {campaign.delayMode === 'fixed' && t('common:fixedDelay')}
                        {campaign.delayMode === 'random' && t('common:randomDelay')}
                        {campaign.delayMode === 'incremental' && t('common:incrementalDelay')}
                      </Text>
                    </Col>
                    
                    {campaign.delayMode === 'fixed' && (
                      <>
                        <Col span={12}>
                          <Text strong>{t('common:seconds')}:</Text>
                        </Col>
                        <Col span={12}>
                          <Text>{campaign.delaySeconds}</Text>
                        </Col>
                      </>
                    )}
                    
                    {campaign.delayMode === 'random' && (
                      <>
                        <Col span={12}>
                          <Text strong>{t('common:min')}:</Text>
                        </Col>
                        <Col span={12}>
                          <Text>{campaign.minDelaySeconds}</Text>
                        </Col>
                        
                        <Col span={12}>
                          <Text strong>{t('common:max')}:</Text>
                        </Col>
                        <Col span={12}>
                          <Text>{campaign.maxDelaySeconds}</Text>
                        </Col>
                      </>
                    )}
                    
                    {campaign.delayMode === 'incremental' && (
                      <>
                        <Col span={12}>
                          <Text strong>{t('common:startDelay')}:</Text>
                        </Col>
                        <Col span={12}>
                          <Text>{campaign.incrementalDelayStart}</Text>
                        </Col>
                        
                        <Col span={12}>
                          <Text strong>{t('common:incrementStep')}:</Text>
                        </Col>
                        <Col span={12}>
                          <Text>{campaign.incrementalDelayStep}</Text>
                        </Col>
                      </>
                    )}
                  </Row>
                </Card>
              )}
            </Space>
          </TabPane>
          
          <TabPane 
            tab={
              <span>
                <BarChartOutlined /> {t('common:statistics', 'Statistics')}
              </span>
            } 
            key="stats"
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Card title={t('common:messageStats', 'Message Statistics')} size="small">
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <Statistic
                      title={t('common:total', 'Total')}
                      value={campaign.recipientCount || 0}
                      suffix={t('common:recipients', 'recipients')}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title={t('common:sent', 'Sent')}
                      value={campaign.sent || 0}
                      suffix={t('common:messages', 'messages')}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title={t('common:failed', 'Failed')}
                      value={campaign.failed || 0}
                      suffix={t('common:messages', 'messages')}
                      valueStyle={{ color: '#f5222d' }}
                    />
                  </Col>
                </Row>
                
                <Divider />
                
                <Progress 
                  percent={Math.round(((campaign.sent || 0) / (campaign.recipientCount || 1)) * 100)}
                  status={
                    campaign.status === 'completed' ? 'success' :
                    campaign.status === 'processing' ? 'active' :
                    campaign.status === 'failed' ? 'exception' : 'normal'
                  }
                  style={{ marginBottom: 16 }}
                />
              </Card>
              
              <Card title={t('pageMessages:campaigns.pointsInfo')} size="small">
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Text strong>{t('pageMessages:campaigns.pointsDeducted')}:</Text>
                  </Col>
                  <Col span={12}>
                    <Text>{campaign.deductedPoints || 0}</Text>
                  </Col>
                  
                  <Col span={12}>
                    <Text strong>{t('pageMessages:campaigns.pointsRefunded')}:</Text>
                  </Col>
                  <Col span={12}>
                    <Text>{campaign.pointsRefunded || 0}</Text>
                  </Col>
                  
                  <Col span={12}>
                    <Text strong>{t('pageMessages:campaigns.pointsPerMessage')}:</Text>
                  </Col>
                  <Col span={12}>
                    <Text>{campaign.pointsPerMessage || 1}</Text>
                  </Col>
                </Row>
              </Card>
              
              {campaign.status === 'completed' && campaign.processingStartedAt && campaign.processingCompletedAt && (
                <Card title={t('common:processingTime', 'Processing Time')} size="small">
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Text strong>{t('common:startTime', 'Start Time')}:</Text>
                    </Col>
                    <Col span={12}>
                      <Text>{moment(campaign.processingStartedAt).format('YYYY-MM-DD HH:mm:ss')}</Text>
                    </Col>
                    
                    <Col span={12}>
                      <Text strong>{t('common:endTime', 'End Time')}:</Text>
                    </Col>
                    <Col span={12}>
                      <Text>{moment(campaign.processingCompletedAt).format('YYYY-MM-DD HH:mm:ss')}</Text>
                    </Col>
                    
                    <Col span={12}>
                      <Text strong>{t('common:duration', 'Duration')}:</Text>
                    </Col>
                    <Col span={12}>
                      <Text>
                        {moment.duration(
                          moment(campaign.processingCompletedAt).diff(moment(campaign.processingStartedAt))
                        ).humanize()}
                      </Text>
                    </Col>
                  </Row>
                </Card>
              )}
            </Space>
          </TabPane>
          
          <TabPane 
            tab={
              <span>
                <UserOutlined /> {t('pageMessages:campaigns.recipientsList', 'Recipients List')}
              </span>
            } 
            key="recipients"
          >
            <List
              itemLayout="horizontal"
              dataSource={campaign.recipients || []}
              renderItem={recipient => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar style={{ backgroundColor: '#1890ff' }}>
                        {recipient.name ? recipient.name.charAt(0).toUpperCase() : 'U'}
                      </Avatar>
                    }
                    title={recipient.name}
                    description={recipient.id}
                  />
                </List.Item>
              )}
              pagination={{
                pageSize: 10,
                showSizeChanger: false
              }}
            />
          </TabPane>
        </Tabs>
      </Drawer>
    );
  };
  
  // Render campaign form
  const renderCampaignForm = () => {
    const formItemLayout = {
      labelCol: { span: 24 },
      wrapperCol: { span: 24 }
    };
    
    return (
      <Drawer
        title={
          <Space>
            {editingCampaign ? (
              <>
                <EditOutlined />
                {t('pageMessages:campaigns.editCampaign')}
              </>
            ) : (
              <>
                <PlusOutlined />
                {t('pageMessages:campaigns.newCampaign')}
              </>
            )}
          </Space>
        }
        width={720}
        placement={isRTL ? 'left' : 'right'}
        onClose={() => setIsDrawerVisible(false)}
        open={isDrawerVisible}
        bodyStyle={{ paddingBottom: 80 }}
        extra={
          <Space>
            <Button onClick={() => setIsDrawerVisible(false)}>
              {t('common:cancel')}
            </Button>
            <Button type="primary" onClick={() => campaignForm.submit()}>
              {editingCampaign ? t('common:update') : t('common:create')}
            </Button>
          </Space>
        }
      >
        <Form
          form={campaignForm}
          layout="vertical"
          onFinish={handleFormSubmit}
          initialValues={{
            messageType: 'text'
          }}
        >
          <Tabs defaultActiveKey="info">
            <TabPane 
              tab={
                <span>
                  <InfoCircleOutlined /> {t('pageMessages:campaigns.details')}
                </span>
              } 
              key="info"
            >
              <Form.Item
                name="name"
                label={t('pageMessages:campaigns.campaignName')}
                rules={[
                  { required: true, message: t('pageMessages:campaigns.nameRequired', 'Campaign name is required') }
                ]}
                {...formItemLayout}
              >
                <Input 
                  placeholder={t('pageMessages:campaigns.namePlaceholder')}
                  prefix={<EditOutlined />}
                />
              </Form.Item>
              
              <Form.Item
                name="description"
                label={t('pageMessages:campaigns.description')}
                {...formItemLayout}
              >
                <TextArea 
                  placeholder={t('pageMessages:campaigns.descriptionPlaceholder')}
                  rows={3}
                />
              </Form.Item>
              
              <Form.Item
                name="scheduledDateTime"
                label={t('pageMessages:campaigns.scheduledDate')}
                {...formItemLayout}
                rules={[
                  { 
                    required: true, 
                    message: t('pageMessages:campaigns.scheduledTimeRequired', 'Scheduled time is required') 
                  }
                ]}
                tooltip={t('pageMessages:campaigns.schedulingRequired', 'All campaigns must be scheduled')}
              >
                <DatePicker 
                  showTime 
                  format="YYYY-MM-DD HH:mm"
                  style={{ width: '100%' }}
                  placeholder={t('pageMessages:campaigns.scheduledDatetime')}
                  locale={isRTL ? locale : undefined}
                  disabledDate={current => {
                    // Disable dates before today
                    return current && current < moment().startOf('day');
                  }}
                />
              </Form.Item>
            </TabPane>
            
            <TabPane 
              tab={
                <span>
                  <MessageOutlined /> {t('pageMessages:campaigns.messageContent')}
                </span>
              } 
              key="message"
            >
              <Radio.Group
                value={messageType}
                onChange={(e) => setMessageType(e.target.value)}
                style={{ marginBottom: 16, width: '100%' }}
                buttonStyle="solid"
              >
                <Radio.Button value="text">
                  <MessageOutlined /> {t('pageMessages:campaigns.typeText')}
                </Radio.Button>
                <Radio.Button value="image">
                  <FileImageOutlined /> {t('pageMessages:campaigns.typeImage')}
                </Radio.Button>
                <Radio.Button value="video">
                  <VideoCameraOutlined /> {t('pageMessages:campaigns.typeVideo', 'Video')}
                </Radio.Button>
                <Radio.Button value="buttons">
                  <LinkOutlined /> {t('pageMessages:campaigns.typeButtons', 'Buttons')}
                </Radio.Button>
                <Radio.Button value="enhancedButtons">
                  <FileImageOutlined /> {t('pageMessages:campaigns.typeEnhancedButtons', 'Image + Buttons')}
                </Radio.Button>
              </Radio.Group>
              
              <Form.Item
                name="messageText"
                label={t('pageMessages:campaigns.messageContent')}
                rules={[
                  { 
                    required: messageType === 'text' || messageType === 'buttons', 
                    message: t('pageMessages:campaigns.messageTextRequired', 'Message text is required') 
                  }
                ]}
                {...formItemLayout}
                tooltip={t('pageMessages:campaigns.personalizationTip')}
              >
                <TextArea 
                  placeholder={t('pageMessages:campaigns.contentPlaceholder')}
                  rows={4}
                />
              </Form.Item>
              
              {personalizeMessage && (
                <div style={{ marginBottom: 16 }}>
                  <Space wrap>
                    <Tag 
                      color="blue" 
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        const currentText = campaignForm.getFieldValue('messageText') || '';
                        campaignForm.setFieldsValue({
                          messageText: `${currentText} #recipient_name#`
                        });
                      }}
                    >
                      #recipient_name#
                    </Tag>
                    <Tag 
                      color="green" 
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        const currentText = campaignForm.getFieldValue('messageText') || '';
                        campaignForm.setFieldsValue({
                          messageText: `${currentText} #date#`
                        });
                      }}
                    >
                      #date#
                    </Tag>
                    <Tag 
                      color="orange" 
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        const currentText = campaignForm.getFieldValue('messageText') || '';
                        campaignForm.setFieldsValue({
                          messageText: `${currentText} #time#`
                        });
                      }}
                    >
                      #time#
                    </Tag>
                  </Space>
                </div>
              )}
              
              {(messageType === 'image' || messageType === 'enhancedButtons') && (
                <Form.Item
                  name="imageUrl"
                  label={t('pageMessages:campaigns.imageUrl')}
                  rules={[
                    { required: true, message: t('pageMessages:campaigns.imageUrlRequired', 'Image URL is required') }
                  ]}
                  {...formItemLayout}
                >
                  <Input 
                    placeholder={t('pageMessages:campaigns.imageUrlPlaceholder')}
                    prefix={<FileImageOutlined />}
                  />
                </Form.Item>
              )}
              
              {messageType === 'video' && (
                <Form.Item
                  name="videoUrl"
                  label={t('pageMessages:campaigns.videoUrl', 'Video URL')}
                  rules={[
                    { required: true, message: t('pageMessages:campaigns.videoUrlRequired', 'Video URL is required') }
                  ]}
                  {...formItemLayout}
                >
                  <Input 
                    placeholder={t('pageMessages:campaigns.videoUrlPlaceholder', 'https://example.com/video.mp4')}
                    prefix={<VideoCameraOutlined />}
                  />
                </Form.Item>
              )}
              
              
              {(messageType === 'buttons' || messageType === 'enhancedButtons') && (
                <Form
                  form={buttonForm}
                  layout="vertical"
                >
                  <Card
                    title={
                      <Space>
                        <LinkOutlined />
                        {t('pageMessages:campaigns.buttons')} 
                        <Badge count={buttons.length} />
                      </Space>
                    } 
                    size="small"
                    style={{ marginBottom: 16 }}
                  >
                    {buttons.length > 0 && (
                      <List
                        size="small"
                        bordered
                        dataSource={buttons}
                        renderItem={(button, index) => (
                          <List.Item
                            actions={[
                              <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => handleRemoveButton(index)}
                              />
                            ]}
                          >
                            <List.Item.Meta
                              avatar={
                                <Avatar 
                                  icon={
                                    button.type === 'url' ? <LinkOutlined /> : 
                                    button.type === 'quickReply' ? <SmileOutlined /> : 
                                    <MessageOutlined />
                                  } 
                                  style={{ 
                                    backgroundColor: 
                                      button.type === 'url' ? '#1890ff' : 
                                      button.type === 'quickReply' ? '#722ed1' : 
                                      '#52c41a' 
                                  }}
                                />
                              }
                              title={button.text}
                              description={button.type === 'url' 
                                ? button.url 
                                : button.payload || t('pageMessages:composer.noPayload', 'No payload')
                              }
                            />
                          </List.Item>
                        )}
                        style={{ marginBottom: 16 }}
                      />
                    )}
                    
                    {buttons.length < 3 && (
                      <>
                        <Row gutter={16}>
                          <Col span={8}>
                            <Form.Item
                              name="buttonType"
                              label={t('pageMessages:composer.buttonType')}
                              initialValue="url"
                            >
                              <Radio.Group buttonStyle="solid">
                                <Radio.Button value="url">
                                  <LinkOutlined /> {t('pageMessages:composer.linkButton')}
                                </Radio.Button>
                                <Radio.Button value="text">
                                  <MessageOutlined /> {t('pageMessages:composer.postbackButton', 'Postback')}
                                </Radio.Button>
                                <Radio.Button value="quickReply">
                                  <SmileOutlined /> {t('pageMessages:composer.quickReplyButton', 'Quick Reply')}
                                </Radio.Button>
                              </Radio.Group>
                            </Form.Item>
                          </Col>
                          <Col span={16}>
                            <Form.Item
                              name="buttonText"
                              label={t('pageMessages:composer.buttonText')}
                              rules={[
                                { required: true, message: t('pageMessages:composer.buttonTextRequired') }
                              ]}
                            >
                              <Input placeholder={t('pageMessages:composer.buttonTextPlaceholder')} />
                            </Form.Item>
                          </Col>
                        </Row>
                        
                        <Form.Item
                          noStyle
                          shouldUpdate={(prevValues, currentValues) => 
                            prevValues.buttonType !== currentValues.buttonType
                          }
                        >
                          {({ getFieldValue }) => 
                            getFieldValue('buttonType') === 'url' ? (
                              <Form.Item
                                name="buttonUrl"
                                label={t('pageMessages:composer.buttonUrl')}
                                rules={[
                                  { required: true, message: t('pageMessages:composer.buttonUrlRequired') }
                                ]}
                              >
                                <Input 
                                  placeholder="https://"
                                  prefix={<LinkOutlined />}
                                />
                              </Form.Item>
                            ) : (
                              <Form.Item
                                name="buttonPayload"
                                label={t('pageMessages:composer.buttonPayload')}
                              >
                                <Input placeholder={t('pageMessages:composer.buttonPayloadPlaceholder')} />
                              </Form.Item>
                            )
                          }
                        </Form.Item>
                        
                        <Button 
                          type="dashed" 
                          onClick={handleAddButton}
                          icon={<PlusOutlined />}
                          block
                        >
                          {t('pageMessages:composer.addButton')}
                        </Button>
                      </>
                    )}
                  </Card>
                </Form>
              )}
              
              <Form.Item
                label={
                  <Space>
                    <UserOutlined />
                    {t('pageMessages:campaigns.personalization', 'Personalization')}
                  </Space>
                }
                {...formItemLayout}
              >
                <Switch
                  checked={personalizeMessage}
                  onChange={setPersonalizeMessage}
                  checkedChildren={t('common:enabled')}
                  unCheckedChildren={t('common:disabled', 'Disabled')}
                />
              </Form.Item>
            </TabPane>
            
            <TabPane 
              tab={
                <span>
                  <TeamOutlined /> {t('pageMessages:campaigns.recipients')}
                </span>
              } 
              key="recipients"
            >
              <div style={{ marginBottom: 16 }}>
                <Space wrap>
                  <Button 
                    onClick={handleSelectAllRecipients}
                    icon={<CheckCircleOutlined />}
                  >
                    {t('common:selectAll', 'Select All')}
                  </Button>
                  <Button 
                    onClick={handleClearRecipients}
                    icon={<CloseOutlined />}
                  >
                    {t('common:clearAll', 'Clear All')}
                  </Button>
                  <Badge 
                    count={selectedRecipients.length} 
                    style={{ backgroundColor: '#1890ff' }}
                  >
                    <Tag color="blue">
                      {t('pageMessages:campaigns.recipientsSelected', {
                        count: selectedRecipients.length
                      })}
                    </Tag>
                  </Badge>
                </Space>
              </div>
              
              {pageSenders.length === 0 ? (
                <Alert
                  message={t('pageMessages:campaigns.noRecipientsAvailable')}
                  type="info"
                  showIcon
                />
              ) : (
                <div style={{ maxHeight: 300, overflow: 'auto', border: '1px solid #f0f0f0', borderRadius: 4, padding: 8 }}>
                  <List
                    dataSource={pageSenders}
                    renderItem={sender => {
                      const isSelected = selectedRecipients.some(r => r.id === sender.id);
                      
                      return (
                        <List.Item
                          onClick={() => handleSelectRecipient(sender)}
                          style={{ 
                            cursor: 'pointer', 
                            background: isSelected ? 'rgba(24, 144, 255, 0.1)' : 'transparent'
                          }}
                        >
                          <List.Item.Meta
                            avatar={
                              <Checkbox checked={isSelected} />
                            }
                            title={sender.name}
                            description={sender.id}
                          />
                        </List.Item>
                      );
                    }}
                  />
                </div>
              )}
            </TabPane>
            
            <TabPane 
              tab={
                <span>
                  <ClockCircleOutlined /> {t('common:delaySettings', 'Delay Settings')}
                </span>
              } 
              key="delay"
            >
              <Form.Item
                label={t('common:messageDelay')}
                {...formItemLayout}
              >
                <Switch
                  checked={enableDelay}
                  onChange={setEnableDelay}
                  checkedChildren={t('common:enabled')}
                  unCheckedChildren={t('common:disabled', 'Disabled')}
                />
              </Form.Item>
              
              {enableDelay && (
                <>
                  <Form.Item
                    label={t('common:delayMode')}
                    {...formItemLayout}
                  >
                    <Radio.Group
                      value={delayMode}
                      onChange={(e) => setDelayMode(e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Radio.Button 
                          value="fixed"
                          style={{
                            width: '100%',
                            height: 'auto',
                            padding: '12px 16px',
                            textAlign: 'left',
                            borderRadius: '8px',
                            marginBottom: '8px'
                          }}
                        >
                          <Space>
                            <ClockCircleOutlined style={{ fontSize: 18 }} />
                            <div>
                              <div>{t('common:fixedDelay')}</div>
                              <div style={{ fontSize: '12px', opacity: 0.8 }}>
                                {t('pageMessages:campaigns.fixedDelayDesc', { seconds: String(delaySeconds) })}
                              </div>
                            </div>
                          </Space>
                        </Radio.Button>
                        
                        <Radio.Button 
                          value="random"
                          style={{
                            width: '100%',
                            height: 'auto',
                            padding: '12px 16px',
                            textAlign: 'left',
                            borderRadius: '8px',
                            marginBottom: '8px'
                          }}
                        >
                          <Space>
                            <SyncOutlined style={{ fontSize: 18 }} />
                            <div>
                              <div>{t('common:randomDelay')}</div>
                              <div style={{ fontSize: '12px', opacity: 0.8 }}>
                                {t('pageMessages:campaigns.randomDelayDesc', { min: String(minDelaySeconds), max: String(maxDelaySeconds) })}
                              </div>
                            </div>
                          </Space>
                        </Radio.Button>
                        
                        <Radio.Button 
                          value="incremental"
                          style={{
                            width: '100%',
                            height: 'auto',
                            padding: '12px 16px',
                            textAlign: 'left',
                            borderRadius: '8px'
                          }}
                        >
                          <Space>
                            <FieldTimeOutlined style={{ fontSize: 18 }} />
                            <div>
                              <div>{t('common:incrementalDelay')}</div>
                              <div style={{ fontSize: '12px', opacity: 0.8 }}>
                                {t('pageMessages:campaigns.incrementalDelayDesc', { start: String(incrementalDelayStart), step: String(incrementalDelayStep) })}
                              </div>
                            </div>
                          </Space>
                        </Radio.Button>
                      </Space>
                    </Radio.Group>
                  </Form.Item>
                  
                  {delayMode === 'fixed' && (
                    <Form.Item
                      label={`${t('common:delaySeconds', 'Delay (seconds)')} (${t('common:seconds')})`}
                      {...formItemLayout}
                    >
                      <InputNumber
                        min={2}
                        max={60}
                        value={delaySeconds}
                        onChange={(value) => setDelaySeconds(value)}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  )}
                  
                  {delayMode === 'random' && (
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          label={t('common:minDelaySeconds', 'Minimum Delay')}
                          {...formItemLayout}
                        >
                          <InputNumber
                            min={2}
                            max={30}
                            value={minDelaySeconds}
                            onChange={(value) => {
                              setMinDelaySeconds(value);
                              if (value > maxDelaySeconds) {
                                setMaxDelaySeconds(value);
                              }
                            }}
                            style={{ width: '100%' }}
                            addonAfter={t('common:seconds')}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          label={t('common:maxDelaySeconds', 'Maximum Delay')}
                          {...formItemLayout}
                        >
                          <InputNumber
                            min={minDelaySeconds}
                            max={60}
                            value={maxDelaySeconds}
                            onChange={(value) => setMaxDelaySeconds(value)}
                            style={{ width: '100%' }}
                            addonAfter={t('common:seconds')}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  )}
                  
                  {delayMode === 'incremental' && (
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          label={t('common:startDelay')}
                          {...formItemLayout}
                        >
                          <InputNumber
                            min={1}
                            max={30}
                            value={incrementalDelayStart}
                            onChange={(value) => setIncrementalDelayStart(value)}
                            style={{ width: '100%' }}
                            addonAfter={t('common:seconds')}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          label={t('common:incrementStep')}
                          {...formItemLayout}
                        >
                          <InputNumber
                            min={1}
                            max={10}
                            value={incrementalDelayStep}
                            onChange={(value) => setIncrementalDelayStep(value)}
                            style={{ width: '100%' }}
                            addonAfter={t('common:seconds')}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  )}
                  
                  {selectedRecipients.length > 1 && (
                    <Alert
                      message={`${t('pageMessages:campaigns.estimatedTime')}: ${getEstimatedTime()}`}
                      type="info"
                      showIcon
                      style={{ marginTop: 16 }}
                    />
                  )}
                </>
              )}
            </TabPane>
          </Tabs>
        </Form>
      </Drawer>
    );
  };
  
  return (
    <div className="campaign-manager">
      {!selectedPage ? (
        <Alert
          message={t('pageMessages:campaigns.selectPageFirst')}
          type="info"
          icon={<InfoCircleOutlined />}
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : (
        <>
          <Card
            title={
              <Space>
                <ScheduleOutlined style={{ fontSize: 18 }} />
                <span>{t('pageMessages:campaigns.title')}</span>
              </Space>
            }
          >
            {renderCampaignList()}
          </Card>
          
          {renderCampaignForm()}
          {renderStatusConfirmModal()}
          {renderDetailsDrawer()}
        </>
      )}
    </div>
  );
};

// For compatibility with older code that might reference missing imports
const BarChartOutlined = () => <div style={{ display: 'inline-block', width: 16, height: 16 }}></div>;
const Checkbox = (props) => (
  <div style={{ 
    width: 16, 
    height: 16, 
    border: '1px solid #d9d9d9', 
    borderRadius: 2,
    backgroundColor: props.checked ? '#1890ff' : 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white'
  }}>
    {props.checked && <CheckCircleOutlined style={{ fontSize: 12 }} />}
  </div>
);
const CloseOutlined = DeleteOutlined;
const FieldTimeOutlined = ClockCircleOutlined;
const Image = (props) => (
  <img 
    src={props.src} 
    alt={props.alt || ''} 
    style={{ 
      maxWidth: props.width || '100%', 
      display: 'block',
      border: '1px solid #f0f0f0',
      borderRadius: 4
    }} 
    onError={(e) => {
      e.target.src = props.fallback;
    }}
  />
);
const Statistic = ({ title, value, suffix, valueStyle }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ marginBottom: 4 }}>{title}</div>
    <div style={{ ...valueStyle, fontSize: 24, fontWeight: 'bold' }}>
      {value} <span style={{ fontSize: 14 }}>{suffix}</span>
    </div>
  </div>
);
const VideoCameraOutlined = () => <div style={{ display: 'inline-block', width: 16, height: 16 }}></div>;

export default CampaignManager;