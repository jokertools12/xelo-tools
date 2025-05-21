import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { pointsSystem } from '../utils/pointsSystem';
import { 
  Layout, 
  Card, 
  Button,
  Input, 
  Tag, 
  Space, 
  Tabs, 
  Alert, 
  Modal,
  Progress,
  Tooltip,
  Select,
  Dropdown,
  Menu,
  Typography,
  Divider,
  Popconfirm,
  message as antMessage,
  Badge,
  Avatar,
  Form,
  Drawer,
  Statistic,
  Empty,
  Collapse,
  Switch,
  Radio,
  InputNumber,
  DatePicker,
  Spin,
  Slider,
  Row,
  Col,
  List,
  Result,
  Checkbox,
  Pagination,
  Segmented,
  ConfigProvider
} from 'antd';
import {
  LoadingOutlined,
  UserOutlined,
  DownloadOutlined,
  SearchOutlined,
  ReloadOutlined,
  SendOutlined,
  SaveOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  MessageOutlined,
  FacebookOutlined,
  PlusOutlined,
  LikeOutlined,
  CommentOutlined,
  EyeOutlined,
  CopyOutlined,
  LinkOutlined,
  SettingOutlined,
  EditOutlined,
  FileTextOutlined,
  PictureOutlined,
  FileImageOutlined,
  VideoCameraOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  FileExcelOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  ShrinkOutlined,
  ArrowsAltOutlined,
  ArrowLeftOutlined,
  HistoryOutlined,
  ThunderboltOutlined,
  QuestionCircleOutlined,
  BulbOutlined,
  RightOutlined,
  FormatPainterOutlined,
  FilterOutlined,
  BarChartOutlined,
  CalendarOutlined,
  TeamOutlined,
  StopOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  DashboardOutlined,
  LineChartOutlined,
  PieChartOutlined,
  UsergroupAddOutlined,
  SortAscendingOutlined,
  StarOutlined,
  StarFilled,
  FunnelPlotOutlined,
  EllipsisOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  HeartOutlined,
  HeartFilled,
  TagOutlined,
  BellOutlined,
  SwapOutlined,
  BarsOutlined
} from '@ant-design/icons';
import moment from 'moment';
import axios from 'axios';
import ContentContainer from '../components/ContentContainer';
import ShimmerEffect from '../components/ShimmerEffect';
import { useUser } from '../context/UserContext';
import { useMessage } from '../context/MessageContext';
import * as XLSX from 'xlsx';
import './PageManagement.css';

const { Content } = Layout;
const { TextArea } = Input;
const { Text, Title, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { Panel } = Collapse;

// Debug mode variable
const debugMode = false;

// Helper function for debug logs
const debugLog = (...args) => {
  if (debugMode) {
    console.log(...args);
  }
};

// Utility function to replace personalization variables in messages
const replacePersonalizationVariables = (text, recipient, customVariables = [], translateFunc) => {
  if (!text) return '';
  
  let result = text;
  
  // Replace standard variables
  if (recipient) {
    // Replace [[lastInteraction]] variable
    if (recipient.lastInteraction) {
      result = result.replace(/\[\[lastInteraction\]\]/g, 
        moment(recipient.lastInteraction).format('YYYY-MM-DD'));
      
      // Also add relative time format
      result = result.replace(/\[\[lastInteractionRelative\]\]/g, 
        moment(recipient.lastInteraction).fromNow());
    }
  }
  
  // Replace date and time variables
  result = result.replace(/\[\[date\]\]/g, moment().format('YYYY-MM-DD'));
  result = result.replace(/\[\[time\]\]/g, moment().format('HH:mm'));
  result = result.replace(/\[\[datetime\]\]/g, moment().format('YYYY-MM-DD HH:mm'));
  result = result.replace(/\[\[day\]\]/g, moment().format('dddd'));
  result = result.replace(/\[\[month\]\]/g, moment().format('MMMM'));
  result = result.replace(/\[\[year\]\]/g, moment().format('YYYY'));
  
  // Replace greeting variable based on time of day
  const hour = new Date().getHours();
  let greeting = "Good evening"; // Default if no translation function provided
  
  // Use translation function if available
  if (typeof translateFunc === 'function') {
    greeting = translateFunc('greeting_evening'); // Good evening default
    if (hour < 12) greeting = translateFunc('greeting_morning'); // Good morning
    else if (hour < 17) greeting = translateFunc('greeting_afternoon'); // Good afternoon
  } else {
    // Fallback without translation
    if (hour < 12) greeting = "Good morning";
    else if (hour < 17) greeting = "Good afternoon";
  }
  
  result = result.replace(/\[\[greeting\]\]/g, greeting);
  
  // Replace custom variables
  customVariables.forEach(variable => {
    if (variable.name && variable.value) {
      const pattern = new RegExp(`\\[\\[${variable.name}\\]\\]`, 'g');
      result = result.replace(pattern, variable.value);
    }
  });
  
  return result;
};

// Enhanced Preview component for post/message display with personalization support
const ContentPreview = ({ 
  type, 
  content, 
  image, 
  video,
  personalizeMessage = false,
  customVariables = [],
  quickReplyButtons = []
}) => {
  const { t } = useLanguage();
  
  // Sample recipient for preview
  const previewRecipient = {
    lastInteraction: moment().subtract(3, 'days').toISOString()
  };
  
  // Apply personalization if enabled
  const processedContent = personalizeMessage 
    ? replacePersonalizationVariables(content, previewRecipient, customVariables, t) 
    : content;
  
  return (
    <div className="content-preview modern-content-preview">
      <div className="preview-header">
        <Avatar size="large" icon={<UserOutlined />} className="preview-avatar" />
        <div className="preview-header-info">
          <div className="preview-name">{t('facebook_page')}</div>
          <div className="preview-time">{moment().format("YYYY-MM-DD HH:mm:ss")}</div>
        </div>
      </div>
      
      <div className="preview-content">
        {processedContent && <div className="preview-text">{processedContent}</div>}
        
        {type === 'image' && image && (
          <div className="preview-media">
            <img 
              src={image} 
              alt={t('preview')} 
              className="preview-image"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22400%22%20height%3D%22300%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20300%22%20preserveAspectRatio%3D%22none%22%3E%3Cg%3E%3Crect%20width%3D%22400%22%20height%3D%22300%22%20fill%3D%22%23f0f0f0%22%3E%3C%2Frect%3E%3Ctext%20x%3D%22150%22%20y%3D%22150%22%20style%3D%22font-family%3A%20Arial%3B%20font-size%3A%2020px%3B%20fill%3A%20%23999%3B%22%3EImage%20not%20found%3C%2Ftext%3E%3C%2Fg%3E%3C%2Fsvg%3E';
              }}
            />
          </div>
        )}
        
        {type === 'video' && video && (
          <div className="preview-media">
            <iframe
              src={video}
              title={t('video_preview')}
              width="100%"
              height="300"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="preview-video"
            ></iframe>
          </div>
        )}
      </div>
      
      {/* Quick Reply Buttons */}
      {quickReplyButtons && quickReplyButtons.length > 0 && (
        <div className="preview-quick-reply">
          {quickReplyButtons.map((button, index) => (
            <button key={index} className="quick-reply-button">
              {button.text}
            </button>
          ))}
        </div>
      )}
      
      <div className="preview-actions">
        <div className="preview-action">
          <LikeOutlined /> {t('like')}
        </div>
        <div className="preview-action">
          <CommentOutlined /> {t('comment')}
        </div>
        <div className="preview-action">
          <SendOutlined /> {t('share')}
        </div>
      </div>
    </div>
  );
};

// Enhanced InfoTooltip Component for providing information throughout the UI
const InfoTooltip = ({ title, description }) => (
  <Tooltip 
    title={
      <div>
        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{title}</div>
        <div>{description}</div>
      </div>
    } 
    placement="top" 
    overlayClassName="enhanced-tooltip"
  >
    <QuestionCircleOutlined className="help-icon" />
  </Tooltip>
);

// Enhanced Badge component with improved visual styling
const EnhancedStatusBadge = ({ status, showIcon = true }) => {
  const { t } = useLanguage();
  let color, text, icon;
  
  switch (status) {
    case 'pending':
      color = 'blue';
      text = t('status_pending');
      icon = <ClockCircleOutlined />;
      break;
    case 'processing':
      color = 'orange';
      text = t('status_processing');
      icon = <SyncOutlined spin />;
      break;
    case 'completed':
      color = 'green';
      text = t('status_completed');
      icon = <CheckCircleOutlined />;
      break;
    case 'failed':
      color = 'red';
      text = t('status_failed');
      icon = <CloseCircleOutlined />;
      break;
    case 'canceled':
      color = 'default';
      text = t('status_canceled');
      icon = <StopOutlined />;
      break;
    default:
      color = 'default';
      text = status;
      icon = <InfoCircleOutlined />;
  }
  
  return <Tag color={color} icon={showIcon ? icon : null} className="status-tag">{text}</Tag>;
};

// Enhanced Analytics Dashboard Component
const MessageAnalyticsDashboard = ({ data, period = '7d', loading = false, type = 'instant' }) => {
  const { t } = useLanguage();
  
  // Use real data from API or fallback to empty values if data not loaded yet
  const analyticsData = data?.analytics || {
    totalMessages: 0,
    successfulMessages: 0,
    failedMessages: 0,
    totalRecipients: 0,
    successfulRecipients: 0,
    failedRecipients: 0,
    messageSuccessRate: 0,
    recipientSuccessRate: 0,
    averageDelay: 0,
    pointsSpent: 0,
    pointsRefunded: 0,
    delayModes: {},
    messageTypes: {},
    errorTypes: {}
  };

  if (loading) {
    return (
      <div className="analytics-dashboard-loading">
        <Spin size="large" />
        <div className="loading-text">{t('loading_reports_stats')}</div>
      </div>
    );
  }
  
  return (
    <div className="analytics-dashboard">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <DashboardOutlined /> {type === 'scheduled' ? t('scheduled_messages_analytics') : t('message_sending_analytics')}
        </div>
        <Select 
          defaultValue={period} 
          style={{ width: 120 }}
          options={[
            { value: '1d', label: t('period_day') },
            { value: '7d', label: t('period_week') },
            { value: '30d', label: t('period_month') },
            { value: '90d', label: t('period_90days') }
          ]}
        />
      </div>
      
      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic 
              title={<span><SendOutlined /> {t('successful_messages')}</span>}
              value={analyticsData.successfulRecipients}
              valueStyle={{ color: '#1877F2' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic 
              title={<span><ExclamationCircleOutlined /> {t('failed_messages')}</span>}
              value={analyticsData.failedRecipients}
              valueStyle={{ color: '#FA383E' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic 
              title={<span><LineChartOutlined /> {t('success_rate')}</span>}
              value={analyticsData.recipientSuccessRate}
              valueStyle={{ color: '#42B72A' }}
              prefix={<PieChartOutlined />}
              suffix="%"
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic 
              title={<span><ClockCircleOutlined /> {t('avg_delay_stat')}</span>}
              value={(analyticsData.averageDelay / 1000).toFixed(2)}
              valueStyle={{ color: '#9360F7' }}
              suffix={t('seconds')}
            />
          </Card>
        </Col>
      </Row>
      
      <Row gutter={[16, 16]} className="insights-row">
        <Col xs={24} md={12}>
          <Card title={t('points_stats')} className="insight-card">
            <div className="points-stats">
              <div className="point-stat">
                <span className="stat-label">{t('points_used')}</span>
                <span className="stat-value">{analyticsData.pointsSpent}</span>
              </div>
              <div className="point-stat">
                <span className="stat-label">{t('points_refunded')}</span>
                <span className="stat-value">{analyticsData.pointsRefunded}</span>
              </div>
              <div className="point-stat">
                <span className="stat-label">{t('net_usage')}</span>
                <span className="stat-value">{analyticsData.pointsSpent - analyticsData.pointsRefunded}</span>
              </div>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} md={12}>
          <Card title={t('message_types_analysis')} className="insight-card">
            <div className="message-type-stats">
              {Object.entries(analyticsData.messageTypes || {}).map(([type, count]) => (
                <div key={type} className="message-type-item">
                  <Tag color={type === 'text' ? 'blue' : type === 'image' ? 'green' : 'purple'}>
                    {type === 'text' ? t('text_type') : type === 'image' ? t('image_type') : t('video_type')}
                  </Tag>
                  <span className="type-count">{count}</span>
                </div>
              ))}
              {Object.keys(analyticsData.messageTypes || {}).length === 0 && (
                <Empty description={t('no_data')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>
          </Card>
        </Col>
      </Row>
      
      <Row gutter={[16, 16]} className="insights-row">
        <Col xs={24} md={12}>
          <Card title={t('delay_modes_used')} className="insight-card">
            <div className="delay-mode-stats">
              {Object.entries(analyticsData.delayModes || {}).map(([mode, count]) => (
                <div key={mode} className="delay-mode-item">
                  <Tag color={
                    mode === 'fixed' ? 'orange' : 
                    mode === 'random' ? 'purple' : 
                    mode === 'incremental' ? 'cyan' : 
                    'blue'
                  }>
                    {mode === 'fixed' ? t('fixed_mode') : 
                     mode === 'random' ? t('random_mode') : 
                     mode === 'incremental' ? t('incremental_mode') : 
                     mode === 'adaptive' ? t('adaptive_mode') : mode}
                  </Tag>
                  <span className="mode-count">{count}</span>
                </div>
              ))}
              {Object.keys(analyticsData.delayModes || {}).length === 0 && (
                <Empty description={t('no_data')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>
          </Card>
        </Col>
        
        <Col xs={24} md={12}>
          <Card title={t('error_analysis')} className="insight-card">
            <div className="error-type-stats">
              {Object.entries(analyticsData.errorTypes || {}).length > 0 ? (
                Object.entries(analyticsData.errorTypes || {}).slice(0, 3).map(([error, count]) => (
                  <div key={error} className="error-type-item">
                    <Tag color="red">{error.substring(0, 30)}{error.length > 30 ? '...' : ''}</Tag>
                    <span className="error-count">{count}</span>
                  </div>
                ))
              ) : (
                <Empty description={t('no_errors_recorded')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>
          </Card>
        </Col>
      </Row>
      
      <div className="dashboard-actions">
        <Button type="primary" icon={<FileExcelOutlined />}>{t('export_report')}</Button>
        <Button icon={<ReloadOutlined />}>{t('refresh_data')}</Button>
      </div>
    </div>
  );
};

// Enhanced Message Campaign Component
const MessageCampaignStatus = ({ campaign, onCancel }) => {
  const [isCancelling, setIsCancelling] = useState(false);
  const { t } = useLanguage();
  
  // This is now a real cancellation function integrated with the backend
  const handleCancel = async () => {
    if (!campaign._id) return;
    
    setIsCancelling(true);
    try {
      const token = localStorage.getItem('token');
      // Determine the API endpoint based on the campaign type
      const endpoint = campaign.type === 'scheduled' 
        ? `/api/scheduled-messages/${campaign._id}/cancel` 
        : `/api/instant-messages/${campaign._id}/cancel`;
      
      await axios.put(endpoint, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      antMessage.success(t('message_cancel_success'));
      if (onCancel && typeof onCancel === 'function') {
        onCancel(campaign._id);
      }
    } catch (error) {
      console.error('Error cancelling campaign:', error);
      antMessage.error(t('message_cancel_error'));
    } finally {
      setIsCancelling(false);
    }
  };
  
  return (
    <Card className="campaign-status-card">
      <div className="campaign-header">
        <div className="campaign-title">
          <MessageOutlined /> {campaign.name || t('message_campaign')}
        </div>
        <EnhancedStatusBadge status={campaign.status} />
      </div>
      
      <div className="campaign-progress">
        <div className="progress-label">
          <span>{t('campaign_header', {sent: campaign.sent, total: campaign.total, percent: Math.round((campaign.sent/campaign.total) * 100)})}</span>
        </div>
        <Progress 
          percent={Math.round((campaign.sent/campaign.total) * 100)} 
          status={campaign.status === 'processing' ? 'active' : 
                 campaign.status === 'completed' ? 'success' : 
                 campaign.status === 'failed' ? 'exception' : 'normal'}
          className="campaign-progress-bar"
        />
      </div>
      
      <Row gutter={[16, 16]} className="campaign-stats">
        <Col span={8}>
          <Statistic 
            title={t('success')}
            value={campaign.sent}
            valueStyle={{ color: '#42B72A', fontSize: '18px' }}
          />
        </Col>
        <Col span={8}>
          <Statistic 
            title={t('failed')}
            value={campaign.failed}
            valueStyle={{ color: '#FA383E', fontSize: '18px' }}
          />
        </Col>
        <Col span={8}>
          <Statistic 
            title={t('remaining')}
            value={campaign.total - campaign.sent - campaign.failed}
            valueStyle={{ color: '#1877F2', fontSize: '18px' }}
          />
        </Col>
      </Row>
      
      {campaign.status === 'processing' && (
        <div className="campaign-actions">
          <Popconfirm
            title={t('campaign_cancel_confirm')}
            onConfirm={handleCancel}
            okText={t('yes')}
            cancelText={t('no')}
          >
            <Button 
              danger 
              icon={<StopOutlined />} 
              loading={isCancelling}
            >
              {t('cancel_campaign')}
            </Button>
          </Popconfirm>
          <Button icon={<BarChartOutlined />}>{t('analytics')}</Button>
        </div>
      )}
      
      {campaign.status === 'completed' && (
        <div className="campaign-summary">
          <Alert
            message={t('campaign_completed')}
            description={t('campaign_completed_desc', {sent: campaign.sent, rate: Math.round((campaign.sent/campaign.total) * 100)})}
            type="success"
            showIcon
          />
        </div>
      )}
      
      {campaign.status === 'failed' && (
        <div className="campaign-summary">
          <Alert
            message={t('campaign_failed')}
            description={t('campaign_failed_desc', {sent: campaign.sent, failed: campaign.failed})}
            type="error"
            showIcon
          />
        </div>
      )}
    </Card>
  );
};

// Enhanced Card item component for pages
const PageCard = ({ page, onPageAction, onToggleFavorite, isFavorite }) => {
  const { t } = useLanguage();
  
  return (
    <Card 
      className="entity-card page-card"
      hoverable
      actions={[
        <Tooltip title={t('page_action_view_messages')}>
          <Button
            type="text"
            size="small"
            icon={<MessageOutlined />}
            onClick={() => onPageAction('messages', page)}
            aria-label={t('page_action_view_messages')}
          />
        </Tooltip>,
        <Tooltip title={t('page_action_details')}>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => onPageAction('details', page)}
            aria-label={t('page_action_details')}
          />
        </Tooltip>,
        <Tooltip title={isFavorite ? t('remove_from_favorites') : t('add_to_favorites')}>
          <Button
            type="text"
            size="small"
            icon={isFavorite ? <StarFilled style={{ color: '#FFD700' }} /> : <StarOutlined />}
            onClick={() => onToggleFavorite(page)}
            aria-label={isFavorite ? t('remove_from_favorites') : t('add_to_favorites')}
          />
        </Tooltip>
      ]}
    >
      <div className="card-header-row">
        <Avatar 
          src={page.picture} 
          icon={<UserOutlined />} 
          size={64}
          className="entity-avatar"
        />
        <div className="card-header-content">
          <div className="card-title-row">
            <Tooltip title={t('open_on_facebook')}>
              <a 
                href={`https://facebook.com/${page.pageId}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="card-title"
              >
                {page.name}
              </a>
            </Tooltip>
            <Tooltip title={t('copy_page_id')}>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(page.pageId);
                  antMessage.success(t('copy_page_id'));
                }}
                className="copy-button"
                aria-label={t('copy_page_id')}
              />
            </Tooltip>
          </div>
          <div className="card-subtitle">{page.pageId}</div>
          <div className="card-meta">
            <Tag color="blue" className="meta-tag">{page.category}</Tag>
            <span className="meta-stat">
              <TeamOutlined /> {page.fan_count || 0}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Enhanced Card item component for senders
const SenderCard = ({ sender, onSenderAction, onToggleFavorite, isFavorite }) => {
  const { t } = useLanguage();
  
  return (
    <Card 
      className="entity-card sender-card"
      hoverable
      actions={[
        <Tooltip title={t('comment_action_message')}>
          <Button
            type="text"
            size="small"
            icon={<MessageOutlined />}
            onClick={() => onSenderAction('message', sender)}
            aria-label={t('comment_action_message')}
          />
        </Tooltip>,
        <Tooltip title={t('comment_action_profile')}>
          <Button
            type="text"
            size="small"
            icon={<UserOutlined />}
            onClick={() => window.open(`https://facebook.com/${sender.id}`, '_blank')}
            aria-label={t('comment_action_profile')}
          />
        </Tooltip>,
        <Tooltip title={t('comment_action_copy_id')}>
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(sender.id);
              antMessage.success(t('copy_user_id'));
            }}
            aria-label={t('comment_action_copy_id')}
          />
        </Tooltip>,
        <Tooltip title={isFavorite ? t('remove_from_favorites') : t('add_to_favorites')}>
          <Button
            type="text"
            size="small"
            icon={isFavorite ? <StarFilled style={{ color: '#FFD700' }} /> : <StarOutlined />}
            onClick={() => onToggleFavorite(sender)}
            aria-label={isFavorite ? t('remove_from_favorites') : t('add_to_favorites')}
          />
        </Tooltip>
      ]}
    >
      <div className="card-header-row">
        <Avatar 
          icon={<UserOutlined />} 
          size={48}
          className="entity-avatar"
        />
        <div className="card-header-content">
          <div className="card-title-row">
            <span className="card-title">{sender.name || t('unknown_user')}</span>
          </div>
          <div className="card-subtitle">{sender.id}</div>
          <div className="card-meta">
            <Tag color="green" className="meta-tag">
              <HistoryOutlined /> {moment(sender.lastInteraction).fromNow()}
            </Tag>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Enhanced Card Grid component for displaying entities with filtering and pagination
const CardGrid = ({ 
  entities, 
  entityType, 
  isLoading, 
  onEntityAction, 
  cardsPerPage = 12,
  favorites = [],
  onToggleFavorite,
  filters,
  setFilters,
  emptyText,
  emptyDescription
}) => {
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState('default');
  const [sortOrder, setSortOrder] = useState('asc');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  
  // Apply all filters to entities
  const filteredEntities = useCallback(() => {
    if (!entities || !entities.length) return [];
    
    let result = [...entities];
    
    // Apply text search if provided
    if (filters?.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      result = result.filter(entity => {
        // Different search logic based on entity type
        switch (entityType) {
          case 'page':
            return (
              (entity.name && entity.name.toLowerCase().includes(searchLower)) ||
              (entity.pageId && entity.pageId.toLowerCase().includes(searchLower)) ||
              (entity.category && entity.category.toLowerCase().includes(searchLower))
            );
          case 'sender':
            return (
              (entity.name && entity.name.toLowerCase().includes(searchLower)) ||
              (entity.id && entity.id.toLowerCase().includes(searchLower))
            );
          default:
            return true;
        }
      });
    }
    
    // Apply favorites filter
    if (filters?.onlyFavorites) {
      const favoriteIds = favorites.map(f => getEntityId(f));
      result = result.filter(entity => favoriteIds.includes(getEntityId(entity)));
    }
    
    // Apply sorting
    if (sortField !== 'default') {
      const getSortValue = entity => {
        switch (sortField) {
          case 'name':
            return entityType === 'page' ? entity.name || '' : 
                   entityType === 'sender' ? entity.name || '' : '';
          
          case 'date':
            return entityType === 'page' ? new Date(entity.extractedAt).getTime() :
                   entityType === 'sender' ? new Date(entity.lastInteraction).getTime() : 0;
          
          case 'followers':
            return entityType === 'page' ? entity.fan_count || 0 : 0;
          
          default:
            return 0;
        }
      };
      
      result.sort((a, b) => {
        const valueA = getSortValue(a);
        const valueB = getSortValue(b);
        
        // String comparison
        if (typeof valueA === 'string' && typeof valueB === 'string') {
          return sortOrder === 'asc' 
            ? valueA.localeCompare(valueB) 
            : valueB.localeCompare(valueA);
        }
        
        // Number comparison
        return sortOrder === 'asc' ? valueA - valueB : valueB - valueA;
      });
    }
    
    return result;
  }, [entities, entityType, filters, sortField, sortOrder, favorites]);
  
  // Get proper ID field based on entity type
  const getEntityId = (entity) => {
    switch (entityType) {
      case 'page': return entity.pageId;
      case 'sender': return entity.id;
      default: return entity.id || entity._id;
    }
  };
  
  // Check if an entity is in favorites
  const isEntityFavorite = (entity) => {
    const entityId = getEntityId(entity);
    return favorites.some(fav => getEntityId(fav) === entityId);
  };
  
  // Handle favorite toggle
  const handleToggleFavorite = (entity) => {
    if (onToggleFavorite) {
      onToggleFavorite(entity);
    }
  };
  
  // Handle entity action
  const handleEntityAction = (action, entity) => {
    if (onEntityAction) {
      onEntityAction(action, entity);
    }
  };
  
  // Get pagination data
  const filteredResults = filteredEntities();
  const totalItems = filteredResults.length;
  const totalPages = Math.ceil(totalItems / cardsPerPage);
  const startIndex = (currentPage - 1) * cardsPerPage;
  const paginatedEntities = filteredResults.slice(startIndex, startIndex + cardsPerPage);
  
  // Generate sort options based on entity type
  const getSortOptions = () => {
    const commonOptions = [
      { value: 'default', label: t('sort_default') },
      { value: 'date', label: t('sort_date') }
    ];
    
    switch (entityType) {
      case 'page':
        return [
          ...commonOptions,
          { value: 'name', label: t('sort_name') },
          { value: 'followers', label: t('sort_followers') }
        ];
      case 'sender':
        return [
          ...commonOptions,
          { value: 'name', label: t('sort_name') }
        ];
      default:
        return commonOptions;
    }
  };
  
  // Render appropriate card based on entity type
  const renderEntityCard = (entity) => {
    switch (entityType) {
      case 'page':
        return (
          <PageCard 
            page={entity} 
            onPageAction={handleEntityAction} 
            onToggleFavorite={handleToggleFavorite}
            isFavorite={isEntityFavorite(entity)}
          />
        );
      
      case 'sender':
        return (
          <SenderCard 
            sender={entity} 
            onSenderAction={handleEntityAction} 
            onToggleFavorite={handleToggleFavorite}
            isFavorite={isEntityFavorite(entity)}
          />
        );
      
      default:
        return null;
    }
  };
  
  // Handle view mode change
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };
  
  // Handle only favorites toggle
  const handleFavoritesToggle = (checked) => {
    setFilters({
      ...filters,
      onlyFavorites: checked
    });
    // Reset to first page when filtering changes
    setCurrentPage(1);
  };
  
  // Handle sorting change
  const handleSortChange = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    // Reset to first page when sorting changes
    setCurrentPage(1);
  };
  
  return (
    <div className="card-grid-container">
      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-section">
          <Input
            placeholder={t('search_placeholder')}
            prefix={<SearchOutlined />}
            value={filters?.searchText || ''}
            onChange={(e) => {
              setFilters({ ...filters, searchText: e.target.value });
              setCurrentPage(1); // Reset to first page on search change
            }}
            allowClear
            className="search-input"
          />
          
          <div className="favorites-toggle">
            <Checkbox
              checked={filters?.onlyFavorites}
              onChange={(e) => handleFavoritesToggle(e.target.checked)}
            >
              <StarFilled style={{ color: '#FFD700', marginRight: '4px' }} /> {t('only_favorites')}
            </Checkbox>
          </div>
        </div>
        
        <div className="view-controls">
          <div className="sort-controls">
            <span className="sort-label">{t('sort_by')}:</span>
            <Select
              value={sortField}
              onChange={handleSortChange}
              className="sort-select"
              size="small"
              dropdownMatchSelectWidth={false}
            >
              {getSortOptions().map(option => (
                <Option key={option.value} value={option.value}>{option.label}</Option>
              ))}
            </Select>
            
            <Button
              icon={sortOrder === 'asc' ? <SortAscendingOutlined /> : <SortAscendingOutlined rotate={180} />}
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              size="small"
              className="sort-direction-button"
            />
          </div>
          
          <Segmented
            options={[
              {
                value: 'grid',
                icon: <AppstoreOutlined />
              },
              {
                value: 'list',
                icon: <BarsOutlined />
              }
            ]}
            value={viewMode}
            onChange={handleViewModeChange}
            className="view-mode-toggle"
          />
        </div>
      </div>
      
      {/* Results Stats */}
      <div className="results-stats">
        <span>
          {t('showing')} {paginatedEntities.length} {t('of')} {totalItems} {t(`${entityType}_plural`)}
        </span>
        {filters?.searchText && (
          <span className="search-terms">
            {t('search_results_for')} "{filters.searchText}"
          </span>
        )}
      </div>
      
      {/* Cards Grid */}
      {isLoading ? (
        <div className="loading-container">
          <ShimmerEffect type="card-grid" cards={8} />
        </div>
      ) : paginatedEntities.length > 0 ? (
        <div className={`cards-container ${viewMode === 'list' ? 'list-view' : 'grid-view'}`}>
          {paginatedEntities.map((entity, index) => (
            <div className="card-wrapper" key={`${getEntityId(entity)}-${index}`}>
              {renderEntityCard(entity)}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-container">
          <Empty 
            description={
              <div>
                <div className="empty-title">{emptyText || t('no_items_found')}</div>
                <div className="empty-subtitle">{emptyDescription || t('try_different_search')}</div>
              </div>
            }
          />
        </div>
      )}
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination-container">
          <Pagination
            current={currentPage}
            total={totalItems}
            pageSize={cardsPerPage}
            onChange={setCurrentPage}
            showSizeChanger={false}
            showTotal={(total, range) => `${range[0]}-${range[1]} ${t('of')} ${total} ${t(`${entityType}_plural`)}`}
          />
        </div>
      )}
    </div>
  );
};

// Enhanced QuickReplyButtonsSection for adding quick reply buttons
const QuickReplyButtonsSection = ({
  enableQuickReply,
  setEnableQuickReply,
  quickReplyButtons,
  setQuickReplyButtons,
  newButtonText,
  setNewButtonText,
  addQuickReplyButton,
  removeQuickReplyButton
}) => {
  const { t } = useLanguage();
  
  return (
    <div className="quick-reply-option">
      <div className="option-row">
        <Switch 
          checked={enableQuickReply}
          onChange={setEnableQuickReply}
        />
        <span className="option-label">{t('add_quick_reply_buttons')}</span>
        <Tooltip title={t('quickreply_help')}>
          <QuestionCircleOutlined className="help-icon" />
        </Tooltip>
      </div>
      
      {enableQuickReply && (
        <div className="modern-quickreply-options">
          <div className="quickreply-form">
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <Input 
                placeholder={t('quick_reply_button_text')} 
                value={newButtonText}
                onChange={(e) => setNewButtonText(e.target.value)}
                style={{ flex: 1 }}
                maxLength={20}
              />
              <Button 
                type="primary" 
                onClick={addQuickReplyButton}
                disabled={!newButtonText}
                icon={<PlusOutlined />}
              />
            </div>
          </div>
          
          {quickReplyButtons.length > 0 && (
            <div className="quickreply-buttons-list">
              {quickReplyButtons.map((button, index) => (
                <Tag
                  key={index}
                  closable
                  onClose={() => removeQuickReplyButton(index)}
                  style={{ marginBottom: 8, fontSize: 13 }}
                  className="quickreply-button-tag"
                >
                  {button.text}
                </Tag>
              ))}
            </div>
          )}
          
          <div className="quickreply-info">
            <Alert
              message={t('quickreply_info_title')}
              description={
                <div>
                  <p>{t('quickreply_info_desc_1')}</p>
                  <p>{t('quickreply_info_desc_2')}</p>
                  <p>{t('quickreply_info_desc_3')}</p>
                </div>
              }
              type="info"
              showIcon
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced MessagePersonalizationSection with improved variables and preview
const MessagePersonalizationSection = ({
  personalizeMessage,
  setPersonalizeMessage,
  includeLastInteraction,
  setIncludeLastInteraction,
  customVariables,
  setCustomVariables,
  newVariableName,
  setNewVariableName,
  newVariableValue,
  setNewVariableValue,
  addCustomVariable,
  removeCustomVariable,
  messageText // Add this to show real-time preview
}) => {
  const { t } = useLanguage();
  const [variableError, setVariableError] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  
  // Function to generate time-based greeting
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('greeting_morning');
    if (hour < 17) return t('greeting_afternoon');
    return t('greeting_evening');
  };
  
  // Sample recipient for preview
  const previewRecipient = {
    lastInteraction: moment().subtract(3, 'days').toISOString()
  };
  
  // Validate variable name
  const validateVariableName = (name) => {
    if (!name) return t('variable_name_required');
    if (!/^[a-zA-Z0-9_]+$/.test(name)) return t('variable_name_invalid_chars');
    if (name === 'lastInteraction' || name === 'lastInteractionRelative' || 
        name === 'date' || name === 'time' || name === 'greeting' ||
        name === 'datetime' || name === 'day' || name === 'month' || name === 'year') {
      return t('variable_name_reserved');
    }
    if (customVariables.some(v => v.name === name)) return t('variable_name_duplicate');
    return '';
  };
  
  // Enhanced add custom variable with validation
  const handleAddCustomVariable = () => {
    const error = validateVariableName(newVariableName);
    if (error) {
      setVariableError(error);
      return;
    }
    
    setVariableError('');
    addCustomVariable();
  };
  
  // Generate preview text with variables replaced
  const getPreviewText = () => {
    if (!messageText) return t('no_message_to_preview');
    
    // Use the utility function for preview
    return replacePersonalizationVariables(
      messageText, 
      previewRecipient, 
      customVariables,
      t
    );
  };
  
  return (
    <div className="modern-personalization-section">
      <div className="option-row">
        <Switch 
          checked={personalizeMessage}
          onChange={setPersonalizeMessage}
        />
        <span className="option-label">{t('personalize_message')}</span>
        <Tooltip title={t('personalization_help')}>
          <QuestionCircleOutlined className="help-icon" />
        </Tooltip>
      </div>
      
      {personalizeMessage && (
        <div className="personalization-options">
          {/* System Variables Section */}
          <div className="variables-section">
            <div className="section-subtitle">{t('system_variables')}</div>
            
            <div className="personalization-option">
              <Switch 
                checked={includeLastInteraction}
                onChange={setIncludeLastInteraction} 
                size="small"
              />
              <span className="option-label">{t('include_last_interaction')}</span>
              <span className="personalization-variable">[[lastInteraction]]</span>
              <InfoTooltip 
                title={t('last_interaction')} 
                description={t('last_interaction_desc')}
              />
            </div>
            
            {/* Date Variable */}
            <div className="personalization-option">
              <span className="option-label">{t('current_date') || t('current_date')}</span>
              <span className="personalization-variable">[[date]]</span>
              <Tooltip title={moment().format('YYYY-MM-DD')}>
                <EyeOutlined className="preview-icon" />
              </Tooltip>
            </div>
            
            {/* Time Variable */}
            <div className="personalization-option">
              <span className="option-label">{t('current_time') || t('current_time')}</span>
              <span className="personalization-variable">[[time]]</span>
              <Tooltip title={moment().format('HH:mm')}>
                <EyeOutlined className="preview-icon" />
              </Tooltip>
            </div>
            
            {/* Datetime Variable */}
            <div className="personalization-option">
              <span className="option-label">{t('current_datetime')}</span>
              <span className="personalization-variable">[[datetime]]</span>
              <Tooltip title={moment().format('YYYY-MM-DD HH:mm')}>
                <EyeOutlined className="preview-icon" />
              </Tooltip>
            </div>
            
            {/* Day of week Variable */}
            <div className="personalization-option">
              <span className="option-label">{t('current_day')}</span>
              <span className="personalization-variable">[[day]]</span>
              <Tooltip title={moment().format('dddd')}>
                <EyeOutlined className="preview-icon" />
              </Tooltip>
            </div>
            
            {/* Month Variable */}
            <div className="personalization-option">
              <span className="option-label">{t('current_month')}</span>
              <span className="personalization-variable">[[month]]</span>
              <Tooltip title={moment().format('MMMM')}>
                <EyeOutlined className="preview-icon" />
              </Tooltip>
            </div>
            
            {/* Year Variable */}
            <div className="personalization-option">
              <span className="option-label">{t('current_year')}</span>
              <span className="personalization-variable">[[year]]</span>
              <Tooltip title={moment().format('YYYY')}>
                <EyeOutlined className="preview-icon" />
              </Tooltip>
            </div>
            
            {/* Greeting Variable */}
            <div className="personalization-option">
              <span className="option-label">{t('time_based_greeting') || t('time_based_greeting')}</span>
              <span className="personalization-variable">[[greeting]]</span>
              <Tooltip title={getTimeBasedGreeting()}>
                <EyeOutlined className="preview-icon" />
              </Tooltip>
            </div>
          </div>
          
          <Divider style={{ margin: '12px 0' }} />
          
          {/* Custom Variables Section */}
          <div className="custom-variables-section">
            <p className="section-subtitle">{t('custom_variables')}</p>
            
            <div className="custom-variable-form">
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <Input 
                  placeholder={t('variable_name')} 
                  value={newVariableName}
                  onChange={(e) => {
                    setNewVariableName(e.target.value);
                    setVariableError('');
                  }}
                  style={{ flex: 1 }}
                  prefix="[["
                  suffix="]]"
                  status={variableError ? "error" : ""}
                />
                <Input 
                  placeholder={t('variable_value')} 
                  value={newVariableValue}
                  onChange={(e) => setNewVariableValue(e.target.value)}
                  style={{ flex: 1 }}
                />
                <Button 
                  type="primary" 
                  onClick={handleAddCustomVariable}
                  disabled={!newVariableName || !newVariableValue}
                  icon={<PlusOutlined />}
                />
              </div>
              
              {/* Error message */}
              {variableError && (
                <div className="variable-error" style={{ color: '#ff4d4f', marginBottom: 8, fontSize: 13 }}>
                  <ExclamationCircleOutlined /> {variableError}
                </div>
              )}
              
              {/* Variable tips */}
              <div className="variable-tips" style={{ color: '#8c8c8c', fontSize: 13, marginTop: 4 }}>
                <InfoCircleOutlined /> {t('variable_name_rules') || t('variable_name_rules_default')}
              </div>
            </div>
            
            {customVariables.length > 0 && (
              <div className="custom-variables-list">
                {customVariables.map((variable, index) => (
                  <Tag
                    key={index}
                    closable
                    onClose={() => removeCustomVariable(index)}
                    style={{ marginBottom: 8, fontSize: 13 }}
                  >
                    <b>[[{variable.name}]]</b>: {variable.value}
                  </Tag>
                ))}
              </div>
            )}
          </div>
          
          {/* Toggle button for message preview */}
          {messageText && (
            <div className="preview-toggle" style={{ textAlign: 'center', marginTop: 16 }}>
              <Button 
                type={previewMode ? "primary" : "default"}
                onClick={() => setPreviewMode(!previewMode)}
                icon={<EyeOutlined />}
              >
                {previewMode ? t('hide_preview') || t('hide_preview_default') : t('show_preview') || t('show_preview_default')}
              </Button>
            </div>
          )}
          
          {/* Preview section */}
          {previewMode && messageText && (
            <div className="message-preview-section" style={{ 
              marginTop: 16, 
              background: '#f5f5f5', 
              padding: 16, 
              borderRadius: 8,
              border: '1px solid #e8e8e8'
            }}>
              <div className="preview-header" style={{ 
                borderBottom: '1px solid #e8e8e8', 
                paddingBottom: 8, 
                marginBottom: 12,
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <FormatPainterOutlined /> {t('message_preview') || t('message_preview_default')}
              </div>
              <div className="preview-content">
                <p className="preview-text" style={{ 
                  whiteSpace: 'pre-wrap',
                  background: 'white',
                  padding: 12,
                  borderRadius: 6,
                  border: '1px solid #d9d9d9'
                }}>{getPreviewText()}</p>
              </div>
            </div>
          )}
          
          <div className="personalization-info">
            <Alert
              message={t('personalization_info')}
              description={
                <div>
                  <p>{t('personalization_info_desc')}</p>
                  <p className="example-text">
                    {t('example')}: <br />
                    <span className="example-original" style={{ color: '#595959' }}>
                      "{t('personalization_example')}"
                    </span>
                    <br />
                    <span className="example-arrow" style={{ display: 'block', margin: '8px 0', textAlign: 'center' }}>↓</span>
                    <br />
                    <span className="example-result" style={{ color: '#1890ff', fontWeight: 'bold' }}>
                      "{t('personalization_example')?.replace('[[lastInteraction]]', moment().subtract(3, 'days').format('YYYY-MM-DD'))}"
                    </span>
                  </p>
                </div>
              }
              type="info"
              showIcon
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Delay options component
const MessageDelayOptions = ({
  enableDelay,
  setEnableDelay,
  delayMode,
  setDelayMode,
  delaySeconds,
  setDelaySeconds,
  minDelaySeconds,
  setMinDelaySeconds,
  maxDelaySeconds,
  setMaxDelaySeconds,
  incrementalDelayStart,
  setIncrementalDelayStart,
  incrementalDelayStep,
  setIncrementalDelayStep
}) => {
  const { t } = useLanguage();
  
  return (
    <div className="delay-option">
      <div className="option-row">
        <Switch 
          checked={enableDelay}
          onChange={setEnableDelay}
        />
        <span className="option-label">{t('delay_between_messages')}</span>
        <Tooltip title={t('delay_help')}>
          <QuestionCircleOutlined className="help-icon" />
        </Tooltip>
      </div>
      
      {enableDelay && (
        <div className="modern-delay-options">
          <div className="delay-mode-selector">
            <div className="section-subtitle">{t('delay_mode')}</div>
            <Radio.Group 
              value={delayMode} 
              onChange={(e) => setDelayMode(e.target.value)}
              buttonStyle="solid"
              className="message-type-buttons"
            >
              <Radio.Button value="fixed">
                <span className="type-button">
                  <ClockCircleOutlined /> {t('fixed_delay')}
                </span>
              </Radio.Button>
              <Radio.Button value="random">
                <span className="type-button">
                  <ThunderboltOutlined /> {t('random_delay')}
                </span>
              </Radio.Button>
              <Radio.Button value="incremental">
                <span className="type-button">
                  <HistoryOutlined /> {t('incremental_delay')}
                </span>
              </Radio.Button>
            </Radio.Group>
          </div>
          
          <div className="delay-option-controls">
            {delayMode === 'fixed' && (
              <div className="fixed-delay-input">
                <span className="control-label">{t('delay_seconds')}</span>
                <InputNumber
                  min={2}
                  max={60}
                  value={delaySeconds}
                  onChange={setDelaySeconds}
                  style={{ width: 100 }}
                />
                <span style={{ marginLeft: 8 }}>{t('seconds')}</span>
                <InfoTooltip 
                  title={t('fixed_delay_title')}
                  description={t('fixed_delay_description')}
                />
              </div>
            )}
            
            {delayMode === 'random' && (
              <div className="random-delay-inputs">
                <div style={{ marginRight: 16 }}>
                  <span className="control-label">{t('min_delay')}</span>
                  <InputNumber
                    min={2}
                    max={59}
                    value={minDelaySeconds}
                    onChange={setMinDelaySeconds}
                    style={{ width: 80 }}
                  />
                  <span style={{ marginLeft: 8 }}>{t('seconds')}</span>
                </div>
                <div>
                  <span className="control-label">{t('max_delay')}</span>
                  <InputNumber
                    min={minDelaySeconds + 1}
                    max={60}
                    value={maxDelaySeconds}
                    onChange={setMaxDelaySeconds}
                    style={{ width: 80 }}
                  />
                  <span style={{ marginLeft: 8 }}>{t('seconds')}</span>
                </div>
                <InfoTooltip 
                  title={t('random_delay_title')}
                  description={t('random_delay_description')}
                />
              </div>
            )}
            
            {delayMode === 'incremental' && (
              <div className="incremental-delay-inputs">
                <div style={{ marginRight: 16 }}>
                  <span className="control-label">{t('start_delay')}</span>
                  <InputNumber
                    min={2}
                    max={30}
                    value={incrementalDelayStart}
                    onChange={setIncrementalDelayStart}
                    style={{ width: 80 }}
                  />
                  <span style={{ marginLeft: 8 }}>{t('seconds')}</span>
                </div>
                <div>
                  <span className="control-label">{t('step_delay')}</span>
                  <InputNumber
                    min={1}
                    max={10}
                    value={incrementalDelayStep}
                    onChange={setIncrementalDelayStep}
                    style={{ width: 80 }}
                  />
                  <span style={{ marginLeft: 8 }}>{t('seconds')}</span>
                </div>
                <InfoTooltip 
                  title={t('incremental_delay_title')}
                  description={t('incremental_delay_description')}
                />
              </div>
            )}
          </div>
          
          <div className="delay-explanation">
            <Alert
              message={t('delay_explanation')}
              description={
                <div>
                  {delayMode === 'fixed' && (
                    <p>{t('fixed_delay_desc', { delay: delaySeconds })}</p>
                  )}
                  {delayMode === 'random' && (
                    <p>{t('random_delay_desc', { min: minDelaySeconds, max: maxDelaySeconds })}</p>
                  )}
                  {delayMode === 'incremental' && (
                    <div>
                      <p>{t('incremental_delay_desc', { start: incrementalDelayStart, step: incrementalDelayStep })}</p>
                      <ul>
                        <li>{t('message')} 1: {incrementalDelayStart} {t('seconds')}</li>
                        <li>{t('message')} 2: {incrementalDelayStart + incrementalDelayStep} {t('seconds')}</li>
                        <li>{t('message')} 3: {incrementalDelayStart + (incrementalDelayStep * 2)} {t('seconds')}</li>
                        <li>...</li>
                      </ul>
                    </div>
                  )}
                </div>
              }
              type="info"
              showIcon
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Page Management component focusing on messages only
const PageManagement = () => {
  const { user } = useUser();
  const { messageApi } = useMessage();
  const { t, direction } = useLanguage();
  
  // State variables for active tab
  const [activeTab, setActiveTab] = useState('pages');
  
  // State variables for pages
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingPages, setLoadingPages] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [activeAccessToken, setActiveAccessToken] = useState('');
  const [fetchingToken, setFetchingToken] = useState(false);
  
  // State variables for page ID and name
  const [pageId, setPageId] = useState('');
  const [pageName, setPageName] = useState('');
  
  // State variables for senders (users who messaged the page)
  const [senders, setSenders] = useState([]);
  const [loadingSenders, setLoadingSenders] = useState(false);
  const [sendersPage, setSendersPage] = useState(1);
  const [sendersPageSize, setSendersPageSize] = useState(10);
  const [extractingSenders, setExtractingSenders] = useState(false);

  // State variables for messages
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesPage, setMessagesPage] = useState(1);
  const [messagesPageSize, setMessagesPageSize] = useState(10);
  
  // Message sending state
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [messageRecipients, setMessageRecipients] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [messageType, setMessageType] = useState('text');
  const [messageImage, setMessageImage] = useState('');
  const [messageVideo, setMessageVideo] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  
  // Enhanced delay and messaging options
  const [enableDelay, setEnableDelay] = useState(true); // Default to true for better user experience
  const [delayMode, setDelayMode] = useState('fixed');
  const [delaySeconds, setDelaySeconds] = useState(5); 
  const [minDelaySeconds, setMinDelaySeconds] = useState(3);
  const [maxDelaySeconds, setMaxDelaySeconds] = useState(10);
  const [incrementalDelayStart, setIncrementalDelayStart] = useState(3);
  const [incrementalDelayStep, setIncrementalDelayStep] = useState(2);
  
  // Message personalization options
  const [personalizeMessage, setPersonalizeMessage] = useState(true); // Default to true for better UX
  const [includeLastInteraction, setIncludeLastInteraction] = useState(true); // Enabled as per task
  const [customVariables, setCustomVariables] = useState([]);
  const [newVariableName, setNewVariableName] = useState('');
  const [newVariableValue, setNewVariableValue] = useState('');
  
  // Quick Reply buttons options
  const [quickReplyButtons, setQuickReplyButtons] = useState([]);
  const [newButtonText, setNewButtonText] = useState('');
  const [enableQuickReply, setEnableQuickReply] = useState(false);
  
  // Scheduling state
  const [enableScheduling, setEnableScheduling] = useState(false);
  const [scheduledTime, setScheduledTime] = useState(null);
  const [scheduledMessages, setScheduledMessages] = useState([]);
  const [loadingScheduledMessages, setLoadingScheduledMessages] = useState(false);
  
  // State variables for instant messages
  const [instantMessages, setInstantMessages] = useState([]);
  const [loadingInstantMessages, setLoadingInstantMessages] = useState(false);
  
  // State variables for analytics
  const [instantMessagesAnalytics, setInstantMessagesAnalytics] = useState(null);
  const [scheduledMessagesAnalytics, setScheduledMessagesAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('7d');
  const [analyticsType, setAnalyticsType] = useState('instant');
  
  // Background message progress tracking - state still used for internal tracking but not display
  const [currentInstantMessage, setCurrentInstantMessage] = useState(null);
  const [instantMessageStatus, setInstantMessageStatus] = useState({
    total: 0,
    sent: 0,
    failed: 0,
    status: '',
    progress: 0
  });
  
  // Favorites state
  const [favorites, setFavorites] = useState({
    pages: [],
    senders: []
  });
  
  // Filters state
  const [filters, setFilters] = useState({
    pages: { searchText: '' },
    senders: { searchText: '' }
  });
  
  // Saved templates and pages state
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [saveTemplateModalVisible, setSaveTemplateModalVisible] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [saveTemplateLoading, setSaveTemplateLoading] = useState(false);
  
  // Drawer for page details
  const [pageDetailsVisible, setPageDetailsVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(null);
  
  // Analytics dashboard state
  const [showAnalyticsDashboard, setShowAnalyticsDashboard] = useState(false);
  
  // Reset states when tab changes and load data for relevant tabs
  useEffect(() => {
    if (activeTab === 'scheduled') {
      // Load scheduled messages when tab is selected
      fetchScheduledMessages();
      // Load scheduled messages analytics
      fetchScheduledMessagesAnalytics();
    } else if (activeTab === 'instant-messages') {
      // Load instant messages when tab is selected
      fetchInstantMessages();
      // Load instant messages analytics
      fetchInstantMessagesAnalytics();
    }
  }, [activeTab]);
  
  // Fetch active access token when component mounts
  useEffect(() => {
    const loadToken = async () => {
      try {
        debugLog('Fetching active access token on component mount');
        const token = await fetchActiveAccessToken();
        if (token) {
          debugLog('Access token loaded successfully:', token.substring(0, 10) + '...');
        } else {
          debugLog('No active access token found');
        }
      } catch (error) {
        debugLog('Error fetching token on mount:', error);
      }
    };
    
    loadToken();
    
    // Load favorite items from localStorage
    const loadFavorites = () => {
      try {
        const savedFavorites = localStorage.getItem('pageManagementFavorites');
        if (savedFavorites) {
          setFavorites(JSON.parse(savedFavorites));
        }
      } catch (error) {
        debugLog('Error loading favorites from localStorage:', error);
      }
    };
    
    loadFavorites();
  }, []);
  
  // Save favorites to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('pageManagementFavorites', JSON.stringify(favorites));
    } catch (error) {
      debugLog('Error saving favorites to localStorage:', error);
    }
  }, [favorites]);
  
  // Effect to refresh analytics data when period changes
  useEffect(() => {
    if (analyticsType === 'instant') {
      fetchInstantMessagesAnalytics(analyticsPeriod);
    } else {
      fetchScheduledMessagesAnalytics(analyticsPeriod);
    }
  }, [analyticsPeriod, analyticsType]);
  
  // Toggle favorite item
  const toggleFavorite = (entityType, entity) => {
    let entityId;
    
    // Get the appropriate ID based on entity type
    switch (entityType) {
      case 'page':
        entityId = entity.pageId;
        break;
      case 'sender':
        entityId = entity.id;
        break;
      default:
        entityId = entity.id || entity._id;
    }
    
    setFavorites(prev => {
      const currentFavorites = [...prev[entityType + 's']];
      const existingIndex = currentFavorites.findIndex(
        item => {
          switch (entityType) {
            case 'page': return item.pageId === entityId;
            case 'sender': return item.id === entityId;
            default: return item.id === entityId || item._id === entityId;
          }
        }
      );
      
      if (existingIndex >= 0) {
        // Remove from favorites
        currentFavorites.splice(existingIndex, 1);
        messageApi.success(t('removed_from_favorites'));
      } else {
        // Add to favorites
        currentFavorites.push(entity);
        messageApi.success(t('added_to_favorites'));
      }
      
      return {
        ...prev,
        [entityType + 's']: currentFavorites
      };
    });
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
      return null;
    } finally {
      setFetchingToken(false);
    }
  };
  
  // Fetch user's pages from Facebook
  const fetchPages = async () => {
    if (loadingPages) return;
    
    setLoadingPages(true);
    setError('');
    setPages([]);
    setShowProgress(true);
    setProgress(0);
    
    try {
      // Check if we have an active access token
      if (!activeAccessToken) {
        // Try to get the active access token
        messageApi.loading(t('checking_access_token'), 1);
        const newToken = await fetchActiveAccessToken();
        if (!newToken) {
          messageApi.error(t('no_active_token'));
          setLoadingPages(false);
          setShowProgress(false);
          return;
        }
      }
      
      messageApi.loading(t('extracting_pages'), 1);
      
      // Fetch pages from Facebook Graph API
      const url = `/v18.0/me/accounts?fields=id,name,access_token,category,tasks,picture,fan_count&access_token=${activeAccessToken}`;
      
      debugLog('Fetching pages with URL:', url);
      
      // دالة مساعدة لإجراء طلبات fetch مع إعادة المحاولة عند الخطأ 429
      const retryFetch = async (url, retries = 3, delay = 1000) => {
        for (let i = 0; i < retries; i++) {
          try {
            const response = await fetch(url);
            if (!response.ok) {
              if (response.status === 429) {
                const waitTime = delay * (i + 1);
                debugLog(`Rate limit exceeded, retrying in ${waitTime}ms...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
              }
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response;
          } catch (error) {
            if (i === retries - 1) {
              debugLog('Max retries reached, failing...');
              throw error;
            }
          }
        }
      };

      // دالة fetchPagesData المحدثة
      const fetchPagesData = async (url, allPages = []) => {
        try {
          debugLog('Fetching pages from URL:', url);
          const response = await retryFetch(url);
          
          let data;
          try {
            data = await response.json();
            debugLog('Received pages data:', data.data?.length || 0, 'pages');
          } catch (jsonError) {
            debugLog('Error parsing JSON:', jsonError);
            throw new Error(t('json_parse_error'));
          }
          
          if (data.error) {
            debugLog('API error:', data.error);
            throw new Error(data.error.message);
          }
          
          if (!data.data || !Array.isArray(data.data)) {
            debugLog('Invalid data structure:', data);
            throw new Error(t('invalid_data_structure'));
          }
          
          // معالجة الصفحات
          const processedPages = data.data.map(page => ({
            key: page.id,
            pageId: page.id,
            name: page.name,
            category: page.category,
            access_token: page.access_token,
            tasks: page.tasks,
            picture: page.picture?.data?.url,
            fan_count: page.fan_count,
            extractedAt: new Date().toISOString()
          }));
          
          debugLog(`Processed ${processedPages.length} pages from current batch`);
          
          // تحديث حالة الصفحات
          const newTotalPages = [...allPages, ...processedPages];
          setPages(newTotalPages);
          
          // تحديث التقدم
          const progressPercentage = Math.min(Math.round((newTotalPages.length / (data.summary?.total_count || newTotalPages.length)) * 100), 100);
          setProgress(progressPercentage);
          
          // معالجة الترقيم
          if (data.paging?.next) {
            debugLog('Found next page URL:', data.paging.next);
            
            // إضافة تأخير لتجنب حدود API
            await new Promise(resolve => setTimeout(resolve, 2000)); // تأخير 2 ثانية
            
            // استدعاء fetchPagesData مع رابط الصفحة التالية
            return await fetchPagesData(data.paging.next, newTotalPages);
          } else {
            debugLog('No more pages available, completed fetching all pages');
          }
          
          return newTotalPages;
        } catch (error) {
          debugLog('Error in fetchPagesData:', error);
          throw error;
        }
      };
      
      const extractedPages = await fetchPagesData(url, []);
      
      if (extractedPages.length > 0) {
        setProgress(100);
        messageApi.success(t('pages_extract_success', { count: extractedPages.length }));
      } else {
        messageApi.warning(t('pages_extract_none'));
      }
    } catch (error) {
      console.error('Error fetching pages:', error);
      setError(t('pages_extract_error', { message: error.message }));
      messageApi.error(t('pages_extract_error', { message: error.message }));
    } finally {
      setLoadingPages(false);
      setShowProgress(false);
    }
  };
  
  // Fetch page senders (users who sent messages to the page)
  const fetchPageSenders = async (pageId, pageToken) => {
    if (!pageId) {
      messageApi.error(t('select_page_first'));
      return;
    }
    
    setLoadingSenders(true);
    setSenders([]);
    setError('');
    setExtractingSenders(true);
    
    try {
      // Must use the page-specific access token for conversations
      const accessToken = pageToken;
      
      if (!accessToken) {
        messageApi.error(t('no_page_token'));
        setLoadingSenders(false);
        setExtractingSenders(false);
        return;
      }
      
      messageApi.loading(t('extracting_conversations'), 1);
      
      // Improved approach: Use backend proxy to avoid CORS issues
      const token = localStorage.getItem('token');
      const fetchAllSenders = async () => {
        // Start with first page request to our backend
        let url = `/api/facebook/proxy?endpoint=${encodeURIComponent(`/${pageId}/conversations`)}&fields=${encodeURIComponent('name,senders,updated_time')}&accessToken=${encodeURIComponent(accessToken)}&limit=100`;
        let allSenders = [];
        let hasNextPage = true;
        
        while (hasNextPage) {
          try {
            const response = await axios.get(url, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            if (!response.data || !response.data.data) {
              throw new Error('Invalid response format');
            }
            
            // Process the current batch of conversations
            let foundNewSenders = false;
            
            for (const conversation of response.data.data) {
              // Extract sender information from conversation
              if (conversation.senders && conversation.senders.data && conversation.senders.data.length > 0) {
                for (const sender of conversation.senders.data) {
                  if (sender.id && !allSenders.some(s => s.id === sender.id)) {
                    allSenders.push({
                      id: sender.id,
                      name: sender.name || 'Unknown',
                      lastInteraction: conversation.updated_time || new Date().toISOString()
                    });
                    foundNewSenders = true;
                  }
                }
              } else if (conversation.id) {
                // Fallback to conversation ID if senders not available
                if (!allSenders.some(sender => sender.id === conversation.id)) {
                  allSenders.push({
                    id: conversation.id,
                    name: conversation.name || 'Unknown',
                    lastInteraction: conversation.updated_time || new Date().toISOString()
                  });
                  foundNewSenders = true;
                }
              }
            }
            
            // Update the senders state if we found new ones
            if (foundNewSenders) {
              setSenders([...allSenders]);
            }
            
            // Check if we have a next page
            if (response.data.paging && response.data.paging.cursors && response.data.paging.cursors.after) {
              // For next page with cursor, we'll create a new URL with the after parameter
              const afterCursor = response.data.paging.cursors.after;
              url = `/api/facebook/proxy?endpoint=${encodeURIComponent(`/${pageId}/conversations`)}&fields=${encodeURIComponent('name,senders,updated_time')}&accessToken=${encodeURIComponent(accessToken)}&limit=100&after=${encodeURIComponent(afterCursor)}`;
              
              // Add a small delay to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 1500));
            } else {
              hasNextPage = false;
            }
          } catch (error) {
            console.error('Error fetching conversations batch:', error);
            throw error;
          }
        }
        
        return allSenders;
      };
      
      const extractedSenders = await fetchAllSenders();
      
      if (extractedSenders.length > 0) {
        messageApi.success(t('messages_extract_success_with_senders', { 
          count: extractedSenders.length,
          senders: extractedSenders.length
        }));
      } else {
        messageApi.warning(t('no_messaging_users_found'));
      }
    } catch (error) {
      console.error('Error fetching page senders:', error);
      setError(t('messages_extract_error', { message: error.message }));
      messageApi.error(t('messages_extract_error', { message: error.message }));
    } finally {
      setLoadingSenders(false);
      setExtractingSenders(false);
    }
  };
  
  // Add a custom variable to the message personalization
  const addCustomVariable = () => {
    if (newVariableName && newVariableValue) {
      setCustomVariables([
        ...customVariables,
        { name: newVariableName, value: newVariableValue }
      ]);
      setNewVariableName('');
      setNewVariableValue('');
    }
  };
  
  // Remove a custom variable by index
  const removeCustomVariable = (index) => {
    const updatedVariables = [...customVariables];
    updatedVariables.splice(index, 1);
    setCustomVariables(updatedVariables);
  };
  
  // Add a quick reply button
  const addQuickReplyButton = () => {
    if (newButtonText && quickReplyButtons.length < 3) {
      setQuickReplyButtons([
        ...quickReplyButtons,
        { type: 'text', text: newButtonText }
      ]);
      setNewButtonText('');
    } else if (quickReplyButtons.length >= 3) {
      messageApi.warning(t('quickreply_max_reached'));
    }
  };
  
  // Remove a quick reply button by index
  const removeQuickReplyButton = (index) => {
    const updatedButtons = [...quickReplyButtons];
    updatedButtons.splice(index, 1);
    setQuickReplyButtons(updatedButtons);
  };
  
  // Open message sending modal
  const openMessageModal = (recipients) => {
    setMessageRecipients(recipients);
    setMessageText('');
    setMessageType('text');
    setMessageImage('');
    setMessageVideo('');
    setEnableDelay(false); // Default closed per user preference
    setPersonalizeMessage(false); // Default closed per user preference
    setIncludeLastInteraction(true);
    setEnableScheduling(false);
    setCustomVariables([]);
    setQuickReplyButtons([]);
    setEnableQuickReply(false);
    setMessageModalVisible(true);
  };
  
  // Enhanced preparePersonalizationData with new variables
  const preparePersonalizationData = () => {
    if (!personalizeMessage) return { personalizeMessage: false };
    
    return {
      personalizeMessage: true,
      messagePersonalization: {
        includeLastInteraction: includeLastInteraction,
        customVariables: customVariables,
        // Add support for new variables
        includeDateAndTime: true,
        includeGreeting: true
      }
    };
  };
  
  // Prepare quick reply buttons data
  const prepareQuickReplyData = () => {
    if (!enableQuickReply || quickReplyButtons.length === 0) return { enableQuickReply: false };
    
    return {
      enableQuickReply: true,
      quickReplyButtons: quickReplyButtons
    };
  };
  
  // Prepare delay options data
  const prepareDelayOptions = () => {
    if (!enableDelay) return { enableDelay: false };
    
    let delayOptions = {
      enableDelay: true,
      delayMode: delayMode,
      delaySeconds: delaySeconds
    };
    
    if (delayMode === 'random') {
      delayOptions = {
        ...delayOptions,
        minDelaySeconds,
        maxDelaySeconds
      };
    } else if (delayMode === 'incremental') {
      delayOptions = {
        ...delayOptions,
        incrementalDelayStart,
        incrementalDelayStep
      };
    }
    
    return delayOptions;
  };
  
  // Validate recipient IDs to ensure they are proper Facebook conversation IDs
  const validateRecipientIds = (recipients) => {
    if (!recipients || recipients.length === 0) {
      return { valid: false, invalidIds: [], message: t('recipient_required') };
    }
    
    // Filter out duplicate recipient IDs
    const uniqueRecipients = [];
    const seen = new Set();
    
    recipients.forEach(recipient => {
      const id = typeof recipient === 'object' ? recipient.id : recipient;
      if (!seen.has(id)) {
        seen.add(id);
        uniqueRecipients.push(recipient);
      }
    });
    
    // Check for any invalid IDs (must be numeric strings or t_prefixed conversation IDs)
    const invalidRecipients = uniqueRecipients.filter(recipient => {
      const id = typeof recipient === 'object' ? recipient.id : recipient;
      // Updated regex to also accept t_prefixed conversation IDs
      return !id || typeof id !== 'string' || !(/^\d+$/.test(id.toString().trim()) || /^t_\d+$/.test(id.toString().trim()));
    });
    
    if (invalidRecipients.length > 0) {
      return {
        valid: false,
        invalidIds: invalidRecipients,
        message: t('invalid_recipient_id', { id: invalidRecipients[0]?.id || 'unknown' })
      };
    }
    
    return { valid: true, uniqueRecipients };
  };

  // Enhanced sendMessage function with proper personalization and quick reply buttons
  const sendMessage = async () => {
    if (messageRecipients.length === 0) {
      messageApi.error(t('recipient_required'));
      return;
    }
    
    if (!messageText.trim() && messageType === 'text') {
      messageApi.error(t('message_text_required'));
      return;
    }
    
    if (!messageImage.trim() && messageType === 'image') {
      messageApi.error(t('image_url_required'));
      return;
    }
    
    if (!messageVideo.trim() && messageType === 'video') {
      messageApi.error(t('video_url_required'));
      return;
    }
    
    // Validate recipient IDs
    const validationResult = validateRecipientIds(messageRecipients);
    if (!validationResult.valid) {
      messageApi.error(validationResult.message);
      return;
    }
    
    // Use validated unique recipients list
    const validatedRecipients = validationResult.uniqueRecipients;
    
    // Check if scheduling is enabled
    if (enableScheduling) {
      if (!scheduledTime) {
        messageApi.error(t('scheduled_time_required'));
        return;
      }
      
      if (scheduledTime < moment()) {
        messageApi.error(t('scheduled_time_future'));
        return;
      }
      
      return scheduleMessages(validatedRecipients);
    }
    
    // Check if user has enough points (1 point per message)
    const requiredPoints = validatedRecipients.length;
    const pointsCheckResult = await pointsSystem.checkPoints(requiredPoints);
    
    if (!pointsCheckResult.hasEnough) {
      messageApi.error(t('insufficient_points', { 
        current: pointsCheckResult.currentPoints, 
        required: requiredPoints 
      }));
      return;
    }
    
    // Show confirmation modal for point deduction
    Modal.confirm({
      title: t('confirm_point_deduction'),
      content: (
        <div>
          <p>{t('point_deduction_info', { 
            points: requiredPoints, 
            recipients: validatedRecipients.length 
          })}</p>
          <p>{t('point_refund_info')}</p>
          <p>{t('confirm_continue')}</p>
        </div>
      ),
      okText: t('continue'),
      cancelText: t('cancel'),
      className: "modern-modal",
      onOk: async () => {
        setSendingMessage(true);
        
        try {
          // Get the page ID and token
          const page = pages.find(p => p.pageId === pageId);
          
          if (!page || !page.access_token) {
            messageApi.error(t('page_token_not_found'));
            setSendingMessage(false);
            return;
          }
          
          const pageToken = page.access_token;
          
          // Prepare personalization data
          const personalizationData = preparePersonalizationData();
          
          // Prepare delay options
          const delayOptions = prepareDelayOptions();
          
          // Prepare quick reply buttons data
          const quickReplyData = prepareQuickReplyData();
          
          // Create data for instant message API
          const instantMessageData = {
            recipients: validatedRecipients.map(r => r.id ? r.id : r),
            messageType: messageType,
            messageText: messageText,
            imageUrl: messageType === 'image' ? messageImage : '',
            videoUrl: messageType === 'video' ? messageVideo : '',
            pageId: pageId,
            pageName: pageName || page.name,
            accessToken: pageToken,
            ...delayOptions,
            ...personalizationData,
            ...quickReplyData
          };
          
          messageApi.loading(t('creating_background_messages'), 2);
          
          // Send to backend instant messages API
          const token = localStorage.getItem('token');
          const response = await axios.post('/api/instant-messages', instantMessageData, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          // Show success message
          messageApi.success(t('message_request_success'));
          
          // Set current instant message for tracking but don't show floating window
          setCurrentInstantMessage(response.data.message);
          
          // Close modal
          setMessageModalVisible(false);
          
          // Reload instant messages if tab is active
          if (activeTab === 'instant-messages') {
            fetchInstantMessages();
          }
          
          // Check message status immediately without displaying the status window
          setTimeout(() => {
            checkInstantMessageStatus(response.data.message._id);
          }, 1000);
          
        } catch (error) {
          console.error('Error creating instant message:', error);
          
          // More detailed error message
          if (error.response) {
            console.error('Error response:', error.response.status, error.response.data);
            messageApi.error(t('message_creation_failed', { 
              error: error.response.data?.message || error.message 
            }));
          } else {
            messageApi.error(t('message_creation_failed', { error: error.message }));
          }
          
        } finally {
          setSendingMessage(false);
        }
      }
    });
  };
  
  // Check the status of an instant message but don't show the floating window
  const checkInstantMessageStatus = async (messageId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/instant-messages/status/${messageId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      const message = response.data;
      setCurrentInstantMessage(message);
      
      // Update status for internal tracking but don't show floating window
      if (message.status === 'pending' || message.status === 'processing') {
        setTimeout(() => {
          checkInstantMessageStatus(messageId);
        }, 2000);
      } else {
        // If complete, refresh the messages list
        if (activeTab === 'instant-messages') {
          fetchInstantMessages();
        }
      }
    } catch (error) {
      console.error('Error checking instant message status:', error);
    }
  };
  
  // Format delay information for display
  const formatDelayInfo = (message) => {
    if (!message || !message.delayStats) return null;
    
    const stats = message.delayStats;
    
    return {
      avgDelay: stats.averageDelay || 0,
      minDelay: stats.minDelay || 0,
      maxDelay: stats.maxDelay || 0,
      isEffective: stats.isEffective || false,
      recommendation: stats.recommendation || ''
    };
  };
  
  // Fetch instant messages
  const fetchInstantMessages = async () => {
    setLoadingInstantMessages(true);
    
    try {
      debugLog('Fetching instant messages');
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/instant-messages', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      debugLog('Fetched instant messages:', response.data?.messages?.length || 0, 'messages');
      setInstantMessages(response.data?.messages || []);
    } catch (error) {
      console.error('Error fetching instant messages:', error);
      
      // More detailed error message
      if (error.response) {
        console.error('Error response:', error.response.status, error.response.data);
        messageApi.error(t('fetch_instant_messages_failed', { 
          error: error.response.data?.message || error.message 
        }));
      } else {
        messageApi.error(t('fetch_instant_messages_failed'));
      }
    } finally {
      setLoadingInstantMessages(false);
    }
  };
  
  // Fetch instant messages analytics
  const fetchInstantMessagesAnalytics = async (period = '7d') => {
    setLoadingAnalytics(true);
    
    try {
      debugLog('Fetching instant messages analytics');
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/instant-messages/analytics?period=${period}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      debugLog('Fetched instant messages analytics:', response.data);
      setInstantMessagesAnalytics(response.data);
      setAnalyticsPeriod(period);
    } catch (error) {
      console.error('Error fetching instant messages analytics:', error);
      
      // More detailed error message
      if (error.response) {
        console.error('Error response:', error.response.status, error.response.data);
        messageApi.error(t('fetch_analytics_failed', { 
          error: error.response.data?.message || error.message 
        }));
      } else {
        messageApi.error(t('fetch_analytics_failed'));
      }
    } finally {
      setLoadingAnalytics(false);
    }
  };
  
  // Cancel an instant message
  const cancelInstantMessage = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/instant-messages/${id}/cancel`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Update state
      setInstantMessages(prev => prev.map(msg => 
        msg._id === id ? { ...msg, status: 'canceled' } : msg
      ));
      
      // If this is the current message being tracked, update it
      if (currentInstantMessage && currentInstantMessage.id === id) {
        setCurrentInstantMessage(prev => ({ ...prev, status: 'canceled' }));
      }
      
      messageApi.success(t('instant_message_canceled'));
      
      // Refresh the list
      fetchInstantMessages();
    } catch (error) {
      console.error('Error canceling instant message:', error);
      messageApi.error(t('cancel_instant_message_failed'));
    }
  };
  
  // Schedule messages for later sending with improved error handling
  const scheduleMessages = async (validatedRecipients) => {
    if (!validatedRecipients || validatedRecipients.length === 0 || !scheduledTime) {
      messageApi.error(t('missing_schedule_details'));
      return;
    }
    
    // Check if user has enough points (1 point per message)
    const requiredPoints = validatedRecipients.length;
    const pointsCheckResult = await pointsSystem.checkPoints(requiredPoints);
    
    if (!pointsCheckResult.hasEnough) {
      messageApi.error(t('insufficient_points', { 
        current: pointsCheckResult.currentPoints, 
        required: requiredPoints 
      }));
      return;
    }
    
    // Show confirmation modal for point deduction
    Modal.confirm({
      title: t('confirm_scheduled_points'),
      content: (
        <div>
          <p>{t('scheduled_point_deduction_now', { 
            points: requiredPoints, 
            recipients: validatedRecipients.length 
          })}</p>
          <p>{t('scheduled_point_refund_info')}</p>
          <p>{t('confirm_continue')}</p>
        </div>
      ),
      okText: t('continue'),
      cancelText: t('cancel'),
      className: "modern-modal",
      onOk: async () => {
        setSendingMessage(true);
        
        try {
          // Get the page ID and token
          const page = pages.find(p => p.pageId === pageId);
          
          if (!page || !page.access_token) {
            messageApi.error(t('page_token_not_found'));
            setSendingMessage(false);
            return;
          }
          
          // Prepare personalization data
          const personalizationData = preparePersonalizationData();
          
          // Prepare delay options
          const delayOptions = prepareDelayOptions();
          
          // Prepare quick reply buttons data
          const quickReplyData = prepareQuickReplyData();
          
          // Log the data being sent for debugging
          debugLog('Scheduling message with data:', {
            scheduledTime: scheduledTime.toISOString(),
            recipients: validatedRecipients.length,
            messageType,
            ...delayOptions,
            ...personalizationData,
            ...quickReplyData
          });
          
          // Create the scheduled message data
          const scheduledMessageData = {
            scheduledTime: scheduledTime.toISOString(),
            recipients: validatedRecipients.map(r => typeof r === 'object' ? r.id : r),
            messageType: messageType,
            messageText: messageText,
            imageUrl: messageType === 'image' ? messageImage : '',
            videoUrl: messageType === 'video' ? messageVideo : '',
            pageId: pageId,
            pageName: pageName || page.name,
            accessToken: page.access_token,
            ...delayOptions,
            ...personalizationData,
            ...quickReplyData
          };
          
          // Send to the backend
          const token = localStorage.getItem('token');
          const response = await axios.post('/api/scheduled-messages', scheduledMessageData, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          // Log the response for debugging
          debugLog('Scheduled message response:', response.data);
          
          // Show success message
          messageApi.success(t('scheduled_success', { 
            time: scheduledTime.format('YYYY-MM-DD HH:mm'), 
            points: requiredPoints 
          }));
          
          // Close modal
          setMessageModalVisible(false);
          
          // Reload scheduled messages if tab is active
          if (activeTab === 'scheduled') {
            fetchScheduledMessages();
          }
        } catch (error) {
          console.error('Error scheduling messages:', error);
          
          // More detailed error message
          if (error.response) {
            console.error('Error response:', error.response.status, error.response.data);
            messageApi.error(t('scheduled_messages_failed', { 
              error: error.response.data?.message || error.message 
            }));
          } else {
            messageApi.error(t('scheduled_messages_failed', { error: error.message }));
          }
        } finally {
          setSendingMessage(false);
        }
      }
    });
  };
  
  // Fetch scheduled messages with improved error handling
  const fetchScheduledMessages = async () => {
    setLoadingScheduledMessages(true);
    
    try {
      debugLog('Fetching scheduled messages');
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/scheduled-messages', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      debugLog('Fetched scheduled messages:', response.data?.messages?.length || 0, 'messages');
      setScheduledMessages(response.data?.messages || []);
    } catch (error) {
      console.error('Error fetching scheduled messages:', error);
      
      // More detailed error message
      if (error.response) {
        console.error('Error response:', error.response.status, error.response.data);
        messageApi.error(t('fetch_scheduled_messages_failed', { 
          error: error.response.data?.message || error.message 
        }));
      } else {
        messageApi.error(t('fetch_scheduled_messages_failed'));
      }
    } finally {
      setLoadingScheduledMessages(false);
    }
  };
  // Fetch scheduled messages analytics
  const fetchScheduledMessagesAnalytics = async (period = '7d') => {
    setLoadingAnalytics(true);
    
    try {
      debugLog('Fetching scheduled messages analytics');
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/scheduled-messages/analytics?period=${period}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      debugLog('Fetched scheduled messages analytics:', response.data);
      setScheduledMessagesAnalytics(response.data);
      setAnalyticsPeriod(period);
    } catch (error) {
      console.error('Error fetching scheduled messages analytics:', error);
      
      // More detailed error message
      if (error.response) {
        console.error('Error response:', error.response.status, error.response.data);
        messageApi.error(t('fetch_analytics_failed', { 
          error: error.response.data?.message || error.message 
        }));
      } else {
        messageApi.error(t('fetch_analytics_failed'));
      }
    } finally {
      setLoadingAnalytics(false);
    }
  };
  
  // Cancel a scheduled message
  const cancelScheduledMessage = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/scheduled-messages/${id}/cancel`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Remove from state or update status
      setScheduledMessages(prev => prev.map(msg => 
        msg._id === id ? { ...msg, status: 'canceled' } : msg
      ));
      
      messageApi.success(t('scheduled_message_canceled'));
      
      // Refresh the list
      fetchScheduledMessages();
    } catch (error) {
      console.error('Error canceling scheduled message:', error);
      messageApi.error(t('cancel_scheduled_message_failed'));
    }
  };
  
  // Save the current message as a template
  const saveTemplate = async () => {
    if (!templateName.trim()) {
      messageApi.error(t('template_name_required'));
      return;
    }
    
    if (messageType === 'text' && !messageText.trim()) {
      messageApi.error(t('message_text_required'));
      return;
    }
    
    if (messageType === 'image' && !messageImage.trim()) {
      messageApi.error(t('image_url_required'));
      return;
    }
    
    if (messageType === 'video' && !messageVideo.trim()) {
      messageApi.error(t('video_url_required'));
      return;
    }
    
    setSaveTemplateLoading(true);
    
    try {
      const newTemplate = {
        name: templateName,
        type: messageType,
        text: messageText,
        imageUrl: messageType === 'image' ? messageImage : '',
        videoUrl: messageType === 'video' ? messageVideo : '',
        quickReplyButtons: enableQuickReply ? quickReplyButtons : []
      };
      
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/templates', newTemplate, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Add the new template to state
      setSavedTemplates(prev => [...prev, response.data]);
      
      // Close the modal and reset form
      setSaveTemplateModalVisible(false);
      setTemplateName('');
      
      messageApi.success(t('template_save_success'));
    } catch (error) {
      console.error('Error saving template:', error);
      messageApi.error(t('template_save_error', { message: error.message }));
    } finally {
      setSaveTemplateLoading(false);
    }
  };
  
  // Load a template
  const loadTemplate = (template) => {
    setMessageType(template.type);
    setMessageText(template.text);
    setMessageImage(template.imageUrl || '');
    setMessageVideo(template.videoUrl || '');
    
    // Load quick reply buttons if available
    if (template.quickReplyButtons && template.quickReplyButtons.length > 0) {
      setQuickReplyButtons(template.quickReplyButtons);
      setEnableQuickReply(true);
    }
    
    messageApi.success(t('template_load_success', { name: template.name }));
  };
  
  // Fetch saved templates
  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/templates', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setSavedTemplates(response.data);
    } catch (error) {
      console.error('Error fetching templates:', error);
      messageApi.error(t('template_fetch_error'));
    }
  };
  
  // Delete a template
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
      messageApi.error(t('template_delete_error', { message: error.message }));
    }
  };
  
  // Show page details
  const showPageDetails = (page) => {
    setCurrentPage(page);
    setPageDetailsVisible(true);
  };
  
  // Export items to Excel file
  const exportToExcel = (items, fileName, type) => {
    if (items.length === 0) {
      messageApi.warning(t('no_items_export'));
      return;
    }
    
    try {
      let dataToExport;
      
      if (type === 'pages') {
        dataToExport = items.map(page => ({
          [t('page_column_id')]: page.pageId,
          [t('page_column_name')]: page.name,
          [t('page_column_category')]: page.category,
          [t('page_column_followers')]: page.fan_count
        }));
      } else if (type === 'senders') {
        dataToExport = items.map(sender => ({
          [t('user_id')]: sender.id,
          [t('user_name')]: sender.name,
          [t('message_date')]: moment(sender.lastInteraction).format('YYYY-MM-DD HH:mm:ss')
        }));
      }
      
      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, type);
      
      // Generate filename with date
      const formattedFileName = `${fileName}_${moment().format('YYYYMMDD_HHmmss')}.xlsx`;
      
      // Write file and download
      XLSX.writeFile(wb, formattedFileName);
      
      messageApi.success(t('export_success', { count: items.length }));
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      messageApi.error(t('export_error'));
    }
  };
  
  // Handle page action
  const handlePageAction = (action, page) => {
    if (!page) return;
    
    switch (action) {
      case 'messages':
        setPageId(page.pageId);
        setPageName(page.name);
        setActiveTab('messages');
        fetchPageSenders(page.pageId, page.access_token);
        break;
        
      case 'details':
        showPageDetails(page);
        break;
        
      default:
        break;
    }
  };
  
  // Handle sender action
  const handleSenderAction = (action, sender) => {
    if (!sender) return;
    
    switch (action) {
      case 'message':
        openMessageModal([sender]);
        break;
        
      default:
        break;
    }
  };
  
  // Copy value to clipboard
  const copyToClipboard = (text, successMessage) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        messageApi.success(successMessage || t('copy_success'));
      })
      .catch(err => {
        console.error(t('copy_error'), err);
        messageApi.error(t('copy_error'));
      });
  };
  
  // Render active campaign overview
  const renderActiveMessageCampaign = () => {
    // Check if instantMessages is an array before using find method
    if (!Array.isArray(instantMessages)) {
      return null;
    }
    
    // Find active campaign
    const activeCampaign = instantMessages.find(msg => msg.status === 'processing');
    
    if (!activeCampaign) return null;
    
    return (
      <MessageCampaignStatus 
        campaign={{
          name: `${t('message_campaign')} - ${activeCampaign.pageName}`,
          status: activeCampaign.status,
          sent: activeCampaign.sent || 0,
          failed: activeCampaign.failed || 0,
          total: activeCampaign.recipientCount || activeCampaign.recipients?.length || 0,
          _id: activeCampaign._id,
          type: 'instant'
        }}
        onCancel={cancelInstantMessage}
      />
    );
  };
  // Check if scheduledMessages is an array before calling .some() method
  const hasProcessingScheduledMessage = Array.isArray(scheduledMessages) && 
    scheduledMessages.some(msg => msg.status === 'processing');
    
  // Stats cards for pages
  const pageStatsCards = [
    {
      title: t('total_pages'),
      value: pages.length,
      color: '#1890ff',
      icon: <FacebookOutlined style={{ fontSize: '24px' }} />
    },
    {
      title: t('total_followers'),
      value: pages.reduce((sum, page) => sum + (page.fan_count || 0), 0),
      color: '#52c41a',
      icon: <UserOutlined style={{ fontSize: '24px' }} />
    },
    {
      title: t('favorite_pages'),
      value: favorites.pages?.length || 0,
      color: '#faad14',
      icon: <StarFilled style={{ fontSize: '24px' }} />
    }
  ];
  
  // Stats cards for senders (users who messaged the page)
  const senderStatsCards = [
    {
      title: t('total_senders'),
      value: senders.length,
      color: '#1890ff',
      icon: <UsergroupAddOutlined style={{ fontSize: '24px' }} />
    },
    {
      title: t('last_interaction'),
      value: senders.length > 0 ? moment(
        Math.max(...senders.map(s => new Date(s.lastInteraction || 0).getTime()))
      ).fromNow() : t('not_available'),
      color: '#52c41a',
      icon: <HistoryOutlined style={{ fontSize: '24px' }} />
    },
    {
      title: t('favorite_senders'),
      value: favorites.senders?.length || 0,
      color: '#faad14',
      icon: <StarFilled style={{ fontSize: '24px' }} />
    }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <ContentContainer isLoading={loading}>
      {loading ? (
        <ShimmerEffect type="table" rows={5} columnCount={6} />
      ) : (
        <Layout className="modern-layout">
          <Content className="modern-content">
            <div className="modern-page-management">
              <Tabs 
                activeKey={activeTab} 
                onChange={setActiveTab}
                className="modern-tabs"
                type="card"
              >
                {/* Pages Tab */}
                <TabPane 
                  tab={
                    <span className="modern-tab">
                      <FacebookOutlined className="tab-icon" />
                      {t('pages_tab')}
                    </span>
                  } 
                  key="pages"
                >
                  <div className="modern-section">
                    <div className="modern-section-header">
                      <div className="section-header-icon">
                        <FacebookOutlined />
                      </div>
                      <div className="section-header-text">
                        <h2>{t('page_management_title')}</h2>
                        <p>{t('page_management_subtitle')}</p>
                      </div>
                    </div>
                    
                    <div className="modern-action-bar">
                      <Button
                        className="modern-extract-button"
                        type="primary"
                        onClick={fetchPages}
                        disabled={loading || loadingPages}
                        icon={loadingPages ? <LoadingOutlined /> : <ReloadOutlined />}
                      >
                        {t('extract_pages')}
                      </Button>
                      
                      <Button
                        className="modern-export-button"
                        icon={<FileExcelOutlined />}
                        onClick={() => exportToExcel(
                          // Use filtered & selected pages if available, otherwise all pages
                          filters.pages?.onlyFavorites 
                            ? favorites.pages
                            : pages,
                          'facebook_pages', 
                          'pages'
                        )}
                        disabled={pages.length === 0}
                      >
                        {t('export_excel')}
                      </Button>
                      
                      <InfoTooltip 
                        title={t('extract_pages_title')}
                        description={t('extract_pages_desc')}
                      />
                    </div>
                    
                    {showProgress && (
                      <div className="modern-progress-container">
                        <div className="progress-header">
                          <span>
                            <SyncOutlined spin className="progress-icon" />
                            {t('extracting_pages')}
                          </span>
                        </div>
                        <Progress
                          percent={progress}
                          status={loadingPages ? "active" : "normal"}
                          strokeColor={{
                            from: '#108ee9',
                            to: '#87d068',
                          }}
                          className="modern-progress"
                        />
                      </div>
                    )}
                    
                    {error && (
                      <Alert
                        message={error}
                        type="error"
                        showIcon
                        className="modern-alert"
                      />
                    )}
                    
                    {pages.length > 0 && (
                      <div className="modern-stats-container">
                        {pageStatsCards.map((stat, index) => (
                          <Card key={index} className="modern-stat-card">
                            <div className="stat-icon" style={{ color: stat.color }}>
                              {stat.icon}
                            </div>
                            <p className="stat-value" style={{ color: stat.color }}>{stat.value}</p>
                            <p className="stat-title">{stat.title}</p>
                          </Card>
                        ))}
                      </div>
                    )}
                    
                    <CardGrid
                      entities={pages}
                      entityType="page"
                      isLoading={loadingPages}
                      onEntityAction={handlePageAction}
                      favorites={favorites.pages}
                      onToggleFavorite={(page) => toggleFavorite('page', page)}
                      filters={filters.pages}
                      setFilters={(newFilters) => setFilters({ ...filters, pages: newFilters })}
                      cardsPerPage={12}
                      emptyText={t('no_pages_found')}
                      emptyDescription={t('extract_pages_first')}
                    />
                  </div>
                </TabPane>
                
                {/* Messages (Senders) Tab */}
                <TabPane 
                  tab={
                    <span className="modern-tab">
                      <MessageOutlined className="tab-icon" />
                      {t('messages_tab')}
                    </span>
                  } 
                  key="messages"
                >
                  <div className="modern-section">
                    <div className="modern-section-header">
                      <div className="section-header-icon">
                        <MessageOutlined />
                      </div>
                      <div className="section-header-text">
                        <h2>{pageName ? t('messages_title', { name: pageName }) : t('messages_tab')}</h2>
                        <p>{t('messages_subtitle')}</p>
                      </div>
                    </div>
                    
                    <div className="modern-action-bar">
                      <Button
                        className="modern-extract-button"
                        type="primary"
                        onClick={() => fetchPageSenders(pageId, pages.find(p => p.pageId === pageId)?.access_token)}
                        disabled={!pageId || loadingSenders}
                        icon={loadingSenders ? <LoadingOutlined /> : <UsergroupAddOutlined />}
                      >
                        {t('extract_senders')}
                      </Button>
                      
                      <Button
                        className="modern-export-button"
                        icon={<FileExcelOutlined />}
                        onClick={() => exportToExcel(
                          filters.senders?.onlyFavorites 
                            ? favorites.senders
                            : senders,
                          'facebook_senders', 
                          'senders'
                        )}
                        disabled={senders.length === 0}
                      >
                        {t('export_excel')}
                      </Button>
                      
                      {senders.length > 0 && (
                        <Button
                          className="modern-message-all-button"
                          type="primary"
                          onClick={() => openMessageModal(senders)}
                          icon={<SendOutlined />}
                        >
                          {t('send_message_all')}
                        </Button>
                      )}
                      
                      <InfoTooltip 
                        title={t('extract_senders_title')}
                        description={t('extract_senders_desc')}
                      />
                    </div>
                    
                    {!pageId && (
                      <Alert
                        message={t('select_page_first')}
                        type="info"
                        showIcon
                        className="modern-alert"
                      />
                    )}
                    
                    {error && (
                      <Alert
                        message={error}
                        type="error"
                        showIcon
                        className="modern-alert"
                      />
                    )}
                    
                    {extractingSenders && (
                      <div className="modern-progress-container">
                        <div className="progress-header">
                          <span>
                            <SyncOutlined spin className="progress-icon" />
                            {t('extracting_senders')}
                          </span>
                        </div>
                        <Progress
                          percent={75}
                          status="active"
                          strokeColor={{
                            from: '#108ee9',
                            to: '#87d068',
                          }}
                          className="modern-progress"
                        />
                      </div>
                    )}
                    
                    {senders.length > 0 && (
                      <div className="modern-stats-container">
                        {senderStatsCards.map((stat, index) => (
                          <Card key={index} className="modern-stat-card">
                            <div className="stat-icon" style={{ color: stat.color }}>
                              {stat.icon}
                            </div>
                            <p className="stat-value" style={{ color: stat.color }}>{stat.value}</p>
                            <p className="stat-title">{stat.title}</p>
                          </Card>
                        ))}
                      </div>
                    )}
                    
                    {pageId && senders.length > 0 && (
                      <Alert
                        message={t('messaging_users_summary')}
                        description={
                          <div>
                            <p>{t('messaging_users_description_extended')}</p>
                            <p>{t('messaging_users_note')}</p>
                          </div>
                        }
                        type="info"
                        showIcon
                        className="info-box"
                      />
                    )}
                    
                    <CardGrid
                      entities={senders}
                      entityType="sender"
                      isLoading={loadingSenders}
                      onEntityAction={handleSenderAction}
                      favorites={favorites.senders}
                      onToggleFavorite={(sender) => toggleFavorite('sender', sender)}
                      filters={filters.senders}
                      setFilters={(newFilters) => setFilters({ ...filters, senders: newFilters })}
                      cardsPerPage={12}
                      emptyText={senders.length === 0 ? t('no_senders_found') : t('no_matching_senders')}
                      emptyDescription={senders.length === 0 ? t('extract_senders_first') : t('try_different_search')}
                    />
                  </div>
                </TabPane>
                
                {/* Scheduled Messages Tab */}
                <TabPane 
                  tab={
                    <span className="modern-tab">
                      <ClockCircleOutlined className="tab-icon" />
                      {t('scheduled_messages_tab')}
                    </span>
                  } 
                  key="scheduled"
                >
                  <div className="modern-section">
                    <div className="modern-section-header">
                      <div className="section-header-icon">
                        <ClockCircleOutlined />
                      </div>
                      <div className="section-header-text">
                        <h2>{t('scheduled_messages_title')}</h2>
                        <p>{t('scheduled_messages_subtitle')}</p>
                      </div>
                    </div>
                    
                    <div className="modern-action-bar">
                      <Button
                        className="modern-extract-button"
                        type="primary"
                        onClick={fetchScheduledMessages}
                        disabled={loadingScheduledMessages}
                        icon={loadingScheduledMessages ? <LoadingOutlined /> : <ReloadOutlined />}
                      >
                        {t('refresh_scheduled_messages')}
                      </Button>
                      
                      <Button
                        className="modern-filter-button"
                        icon={<BarChartOutlined />}
                        onClick={() => {
                          setAnalyticsType('scheduled');
                          fetchScheduledMessagesAnalytics(analyticsPeriod);
                          setShowAnalyticsDashboard(true);
                        }}
                      >
                        {t('analytics_reports')}
                      </Button>
                      
                      <InfoTooltip 
                        title={t('scheduled_messages_title')}
                        description={t('scheduled_messages_tooltip')}
                      />
                    </div>
                    
                    <Alert
                      message={t('deletion_policy_alert_title')}
                      description={t('scheduled_deletion_policy')}
                      type="info"
                      showIcon
                      style={{ marginBottom: 16 }}
                      className="info-box"
                    />
                    
                    {/* Active Campaign Overview */}
                    {hasProcessingScheduledMessage && (
                      <MessageCampaignStatus 
                        campaign={{
                          name: t('active_scheduled_campaign'),
                          status: "processing",
                          sent: scheduledMessages.reduce((sum, msg) => msg.status === 'processing' ? sum + (msg.sent || 0) : sum, 0),
                          failed: scheduledMessages.reduce((sum, msg) => msg.status === 'processing' ? sum + (msg.failed || 0) : sum, 0),
                          total: scheduledMessages.reduce((sum, msg) => msg.status === 'processing' ? sum + (msg.recipientCount || msg.recipients?.length || 0) : sum, 0),
                          _id: scheduledMessages.find(msg => msg.status === 'processing')?._id,
                          type: 'scheduled'
                        }}
                        onCancel={cancelScheduledMessage}
                      />
                    )}
                    
                    {loadingScheduledMessages ? (
                      <ShimmerEffect type="table" rows={5} columnCount={8} />
                    ) : Array.isArray(scheduledMessages) && scheduledMessages.length > 0 ? (
                      <div className="scheduled-messages-cards">
                        <div className="scheduled-stats">
                          <div className="stat-item">
                            <div className="stat-icon"><ClockCircleOutlined /></div>
                            <div className="stat-value">{scheduledMessages.filter(msg => msg.status === 'pending').length}</div>
                            <div className="stat-label">{t('status_pending')}</div>
                          </div>
                          <div className="stat-item">
                            <div className="stat-icon"><SyncOutlined spin /></div>
                            <div className="stat-value">{scheduledMessages.filter(msg => msg.status === 'processing').length}</div>
                            <div className="stat-label">{t('status_processing')}</div>
                          </div>
                          <div className="stat-item">
                            <div className="stat-icon"><CheckCircleOutlined /></div>
                            <div className="stat-value">{scheduledMessages.filter(msg => msg.status === 'completed').length}</div>
                            <div className="stat-label">{t('status_completed')}</div>
                          </div>
                          <div className="stat-item">
                            <div className="stat-icon"><CloseCircleOutlined /></div>
                            <div className="stat-value">{scheduledMessages.filter(msg => msg.status === 'failed' || msg.status === 'canceled').length}</div>
                            <div className="stat-label">{t('status_failed_canceled')}</div>
                          </div>
                        </div>
                        
                        <Row gutter={[16, 16]}>
                          {scheduledMessages.map(message => (
                            <Col xs={24} sm={12} md={8} key={message._id}>
                              <Card 
                                className={`scheduled-message-card status-${message.status}`}
                                title={
                                  <div className="card-title-row">
                                    <EnhancedStatusBadge status={message.status} />
                                    <Tag color="blue" className="message-type-tag">
                                      {message.messageType === 'text' ? 
                                        <FileTextOutlined /> : 
                                        message.messageType === 'image' ? 
                                          <FileImageOutlined /> : 
                                          <VideoCameraOutlined />
                                      } {message.messageType}
                                    </Tag>
                                  </div>
                                }
                                extra={
                                  <Dropdown
                                    overlay={
                                      <Menu>
                                        <Menu.Item 
                                          key="view" 
                                          icon={<EyeOutlined />}
                                          onClick={() => {
                                            setMessageType(message.messageType);
                                            setMessageText(message.messageText);
                                            setMessageImage(message.imageUrl || '');
                                            setMessageVideo(message.videoUrl || '');
                                            setQuickReplyButtons(message.quickReplyButtons || []);
                                            setEnableQuickReply(message.quickReplyButtons?.length > 0);
                                            setPreviewVisible(true);
                                          }}
                                        >
                                          {t('view_details')}
                                        </Menu.Item>
                                        {['pending', 'processing'].includes(message.status) && (
                                          <Menu.Item 
                                            key="cancel" 
                                            icon={<StopOutlined />}
                                            onClick={() => cancelScheduledMessage(message._id)}
                                          >
                                            {t('cancel_schedule')}
                                          </Menu.Item>
                                        )}
                                        {message.status === 'completed' && (
                                          <Menu.Item 
                                            key="analytics" 
                                            icon={<BarChartOutlined />}
                                            onClick={() => {
                                              setAnalyticsType('scheduled');
                                              setShowAnalyticsDashboard(true);
                                            }}
                                          >
                                            {t('view_analytics')}
                                          </Menu.Item>
                                        )}
                                      </Menu>
                                    }
                                    placement="bottomRight"
                                    trigger={['click']}
                                  >
                                    <Button 
                                      type="text" 
                                      icon={<EllipsisOutlined />} 
                                      className="card-options-button"
                                    />
                                  </Dropdown>
                                }
                              >
                                <div className="scheduled-message-info">
                                  <div className="schedule-time">
                                    <ClockCircleOutlined className="info-icon" />
                                    {moment(message.scheduledTime).format('YYYY-MM-DD HH:mm:ss')}
                                  </div>
                                  
                                  <div className="recipients-info">
                                    <TeamOutlined className="info-icon" />
                                    {message.recipientCount || message.recipients?.length || 0} {t('recipients')}
                                  </div>
                                  
                                  <div className="page-info">
                                    <FacebookOutlined className="info-icon" />
                                    {message.pageName || t('facebook_page')}
                                  </div>
                                  
                                  {message.messageText && (
                                    <div className="message-preview">
                                      {message.messageText.length > 80 
                                        ? message.messageText.substring(0, 80) + '...' 
                                        : message.messageText}
                                    </div>
                                  )}
                                  
                                  {/* Display quick reply buttons if available */}
                                  {message.quickReplyButtons && message.quickReplyButtons.length > 0 && (
                                    <div className="quick-reply-preview">
                                      <div className="quick-reply-buttons">
                                        {message.quickReplyButtons.map((button, idx) => (
                                          <Tag key={idx} color="blue">{button.text}</Tag>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {['completed', 'processing', 'failed', 'canceled'].includes(message.status) && (
                                    <div className="progress-display">
                                      <Progress 
                                        percent={Math.round(((message.sent || 0) / (message.recipientCount || message.recipients?.length || 1)) * 100)}
                                        size="small"
                                        status={
                                          message.status === 'completed' ? 'success' :
                                          message.status === 'processing' ? 'active' :
                                          message.status === 'failed' ? 'exception' :
                                          'normal'
                                        }
                                      />
                                      
                                      <div className="count-badges">
                                        <Tag color="success" className="count-badge">
                                          <CheckCircleOutlined /> {message.sent || 0}
                                        </Tag>
                                        
                                        {(message.failed > 0 || message.status === 'failed') && (
                                          <Tag color="error" className="count-badge">
                                            <CloseCircleOutlined /> {message.failed || 0}
                                          </Tag>
                                        )}
                                        
                                        {(message.status === 'processing' || message.status === 'pending') && (
                                          <Tag color="processing" className="count-badge">
                                            <SyncOutlined spin /> {
                                              (message.recipientCount || message.recipients?.length || 0) - 
                                              (message.sent || 0) - 
                                              (message.failed || 0)
                                            }
                                          </Tag>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </Card>
                            </Col>
                          ))}
                        </Row>
                      </div>
                    ) : (
                      <Empty 
                        description={t('no_scheduled_messages')}
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    )}
                  </div>
                </TabPane>
                
                {/* Instant Messages Tab */}
                <TabPane 
                  tab={
                    <span className="modern-tab">
                      <SendOutlined className="tab-icon" />
                      {t('instant_messages_tab')}
                    </span>
                  } 
                  key="instant-messages"
                >
                  <div className="modern-section">
                    <div className="modern-section-header">
                      <div className="section-header-icon">
                        <SendOutlined />
                      </div>
                      <div className="section-header-text">
                        <h2>{t('instant_messages_log')}</h2>
                        <p>{t('instant_messages_subtitle')}</p>
                      </div>
                    </div>
                    
                    <div className="modern-action-bar">
                      <Button
                        className="modern-extract-button"
                        type="primary"
                        onClick={fetchInstantMessages}
                        disabled={loadingInstantMessages}
                        icon={loadingInstantMessages ? <LoadingOutlined /> : <ReloadOutlined />}
                      >
                        {t('refresh_messages_log')}
                      </Button>
                      
                      <Button
                        className="modern-filter-button"
                        icon={<BarChartOutlined />}
                        onClick={() => {
                          setAnalyticsType('instant');
                          fetchInstantMessagesAnalytics(analyticsPeriod);
                          setShowAnalyticsDashboard(true);
                        }}
                      >
                        {t('analytics_reports')}
                      </Button>
                      
                      <InfoTooltip 
                        title={t('instant_messages_title')}
                        description={t('instant_messages_tooltip')}
                      />
                    </div>
                    
                    <Alert
                      message={t('tracking_progress')}
                      description={t('background_processing_info')}
                      type="info"
                      showIcon
                      style={{ marginBottom: 16 }}
                      className="info-box"
                    />
                    
                    <Alert
                      message={t('deletion_policy_alert_title')}
                      description={t('instant_deletion_policy')}
                      type="warning"
                      showIcon
                      style={{ marginBottom: 16 }}
                      className="info-box"
                    />
                    
                    {/* Active Campaign Overview */}
                    {renderActiveMessageCampaign()}
                    
                    {loadingInstantMessages ? (
                      <ShimmerEffect type="table" rows={5} columnCount={8} />
                    ) : Array.isArray(instantMessages) && instantMessages.length > 0 ? (
                      <div className="instant-messages-cards">
                        <div className="scheduled-stats">
                          <div className="stat-item">
                            <div className="stat-icon"><ClockCircleOutlined /></div>
                            <div className="stat-value">{instantMessages.filter(msg => msg.status === 'pending').length}</div>
                            <div className="stat-label">{t('status_pending')}</div>
                          </div>
                          <div className="stat-item">
                            <div className="stat-icon"><SyncOutlined spin /></div>
                            <div className="stat-value">{instantMessages.filter(msg => msg.status === 'processing').length}</div>
                            <div className="stat-label">{t('status_processing')}</div>
                          </div>
                          <div className="stat-item">
                            <div className="stat-icon"><CheckCircleOutlined /></div>
                            <div className="stat-value">{instantMessages.filter(msg => msg.status === 'completed').length}</div>
                            <div className="stat-label">{t('status_completed')}</div>
                          </div>
                          <div className="stat-item">
                            <div className="stat-icon"><CloseCircleOutlined /></div>
                            <div className="stat-value">{instantMessages.filter(msg => msg.status === 'failed' || msg.status === 'canceled').length}</div>
                            <div className="stat-label">{t('status_failed_canceled')}</div>
                          </div>
                        </div>
                        
                        <Row gutter={[16, 16]}>
                          {instantMessages.map(message => (
                            <Col xs={24} sm={12} md={8} key={message._id}>
                              <Card 
                                className={`scheduled-message-card status-${message.status}`}
                                title={
                                  <div className="card-title-row">
                                    <EnhancedStatusBadge status={message.status} />
                                    <Tag color="blue" className="message-type-tag">
                                      {message.messageType === 'text' ? 
                                        <FileTextOutlined /> : 
                                        message.messageType === 'image' ? 
                                          <FileImageOutlined /> : 
                                          <VideoCameraOutlined />
                                      } {message.messageType}
                                    </Tag>
                                  </div>
                                }
                                extra={
                                  <Dropdown
                                    overlay={
                                      <Menu>
                                        <Menu.Item 
                                          key="view" 
                                          icon={<EyeOutlined />}
                                          onClick={() => {
                                            setMessageType(message.messageType);
                                            setMessageText(message.messageText);
                                            setMessageImage(message.imageUrl || '');
                                            setMessageVideo(message.videoUrl || '');
                                            setQuickReplyButtons(message.quickReplyButtons || []);
                                            setEnableQuickReply(message.quickReplyButtons?.length > 0);
                                            setPreviewVisible(true);
                                          }}
                                        >
                                          {t('view_details')}
                                        </Menu.Item>
                                        {['pending', 'processing'].includes(message.status) && (
                                          <Menu.Item 
                                            key="cancel" 
                                            icon={<StopOutlined />}
                                            onClick={() => cancelInstantMessage(message._id)}
                                          >
                                            {t('cancel_message')}
                                          </Menu.Item>
                                        )}
                                        {message.status === 'processing' && (
                                          <Menu.Item 
                                            key="track" 
                                            icon={<SyncOutlined spin />}
                                            onClick={() => {
                                              checkInstantMessageStatus(message._id);
                                            }}
                                          >
                                            {t('track_progress')}
                                          </Menu.Item>
                                        )}
                                        {message.status === 'completed' && (
                                          <Menu.Item 
                                            key="analytics" 
                                            icon={<BarChartOutlined />}
                                            onClick={() => {
                                              setAnalyticsType('instant');
                                              setShowAnalyticsDashboard(true);
                                            }}
                                          >
                                            {t('view_analytics')}
                                          </Menu.Item>
                                        )}
                                      </Menu>
                                    }
                                    placement="bottomRight"
                                    trigger={['click']}
                                  >
                                    <Button 
                                      type="text" 
                                      icon={<EllipsisOutlined />} 
                                      className="card-options-button"
                                    />
                                  </Dropdown>
                                }
                              >
                                <div className="scheduled-message-info">
                                  <div className="recipients-info">
                                    <TeamOutlined className="info-icon" />
                                    {message.recipientCount || message.recipients?.length || 0} {t('recipients')}
                                  </div>
                                  
                                  <div className="page-info">
                                    <FacebookOutlined className="info-icon" />
                                    {message.pageName || t('facebook_page')}
                                  </div>
                                  
                                  <div className="delay-info">
                                    <ClockCircleOutlined className="info-icon" />
                                    {message.delayMode === 'fixed' 
                                      ? t('fixed_delay_short', { delay: message.delaySeconds })
                                      : message.delayMode === 'random'
                                        ? t('random_delay_short', { min: message.minDelaySeconds, max: message.maxDelaySeconds })
                                        : message.delayMode === 'incremental'
                                          ? t('incremental_delay_short', { start: message.incrementalDelayStart, step: message.incrementalDelayStep })
                                          : t('no_delay')}
                                  </div>
                                  
                                  {message.messageText && (
                                    <div className="message-preview">
                                      {message.messageText.length > 80 
                                        ? message.messageText.substring(0, 80) + '...' 
                                        : message.messageText}
                                    </div>
                                  )}
                                  
                                  {/* Display quick reply buttons if available */}
                                  {message.quickReplyButtons && message.quickReplyButtons.length > 0 && (
                                    <div className="quick-reply-preview">
                                      <div className="quick-reply-buttons">
                                        {message.quickReplyButtons.map((button, idx) => (
                                          <Tag key={idx} color="blue">{button.text}</Tag>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {['completed', 'processing', 'failed', 'canceled'].includes(message.status) && (
                                    <div className="progress-display">
                                      <Progress 
                                        percent={Math.round(((message.sent || 0) / (message.recipientCount || message.recipients?.length || 1)) * 100)}
                                        size="small"
                                        status={
                                          message.status === 'completed' ? 'success' :
                                          message.status === 'processing' ? 'active' :
                                          message.status === 'failed' ? 'exception' :
                                          'normal'
                                        }
                                      />
                                      
                                      <div className="count-badges">
                                        <Tag color="success" className="count-badge">
                                          <CheckCircleOutlined /> {message.sent || 0}
                                        </Tag>
                                        
                                        {(message.failed > 0 || message.status === 'failed') && (
                                          <Tag color="error" className="count-badge">
                                            <CloseCircleOutlined /> {message.failed || 0}
                                          </Tag>
                                        )}
                                        
                                        {(message.status === 'processing' || message.status === 'pending') && (
                                          <Tag color="processing" className="count-badge">
                                            <SyncOutlined spin /> {
                                              (message.recipientCount || message.recipients?.length || 0) - 
                                              (message.sent || 0) - 
                                              (message.failed || 0)
                                            }
                                          </Tag>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </Card>
                            </Col>
                          ))}
                        </Row>
                      </div>
                    ) : (
                      <Empty 
                        description={t('no_instant_messages')}
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    )}
                  </div>
                </TabPane>
              </Tabs>

              {/* Message Modal */}
              <Modal
                title={
                  <div className="modern-modal-title">
                    <MessageOutlined className="title-icon" />
                    <span>{t('send_message_modal_title')}</span>
                  </div>
                }
                open={messageModalVisible}
                onCancel={() => setMessageModalVisible(false)}
                footer={[
                  <Button key="cancel" onClick={() => setMessageModalVisible(false)} className="modern-modal-button cancel">
                    {t('cancel')}
                  </Button>,
                  <Button 
                    key="save" 
                    onClick={() => setSaveTemplateModalVisible(true)}
                    icon={<SaveOutlined />}
                    className="modern-modal-button save"
                  >
                    {t('save_as_template')}
                  </Button>,
                  <Button 
                    key="preview" 
                    onClick={() => setPreviewVisible(true)}
                    icon={<EyeOutlined />}
                    className="modern-modal-button preview"
                  >
                    {t('preview')}
                  </Button>,
                  <Button 
                    key="send" 
                    type="primary" 
                    onClick={sendMessage}
                    loading={sendingMessage}
                    icon={<SendOutlined />}
                    className="modern-modal-button send"
                  >
                    {t('send')}
                  </Button>,
                ]}
                width={800}
                className="modern-message-modal"
              >
                {/* Recipients summary section */}
                <div className="modern-recipients-section">
                  <div className="section-title">{t('recipients_section')}</div>
                  
                  <div className="recipients-summary">
                    <div className="recipients-count">
                      <Badge 
                        count={messageRecipients.length} 
                        overflowCount={99999} 
                        className="count-badge"
                      />
                      <span className="count-text">
                        {messageRecipients.length === 1 
                          ? t('single_recipient')
                          : t('multiple_recipients', { count: messageRecipients.length })
                        }
                      </span>
                    </div>
                    {messageRecipients.length > 0 && (
                      <div className="recipients-actions">
                        <Button 
                          type="link" 
                          size="small" 
                          onClick={() => setMessageRecipients([])}
                          icon={<DeleteOutlined />}
                          className="clear-button"
                        >
                          {t('clear_all')}
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* Recipients preview - shows first few recipients with count */}
                  {messageRecipients.length > 0 && (
                    <div className="recipients-preview">
                      <div className="recipients-avatars">
                        {messageRecipients.slice(0, 5).map((recipient, index) => {
                          const id = typeof recipient === 'object' ? recipient.id : recipient;
                          const name = typeof recipient === 'object' ? recipient.name : '';
                          
                          return (
                            <Tooltip key={id + "-" + index} title={name || t('user')} placement="top">
                              <Avatar 
                                className="recipient-avatar" 
                                style={{ zIndex: 10 - index }} 
                                icon={<UserOutlined />} 
                              />
                            </Tooltip>
                          );
                        })}
                        {messageRecipients.length > 5 && (
                          <Avatar 
                            className="recipient-avatar recipient-avatar-more" 
                            style={{ zIndex: 5 }}
                          >
                            +{messageRecipients.length - 5}
                          </Avatar>
                        )}
                      </div>
                      
                      <Collapse ghost className="recipients-collapse">
                        <Panel 
                          header={
                            <span className="collapse-header">
                              {messageRecipients.length <= 5 
                                ? t('recipients_details')
                                : t('show_all_recipients', { count: messageRecipients.length })
                              }
                            </span>
                          } 
                          key="recipients"
                        >
                          <div className="recipients-search">
                            <Input
                              placeholder={t('search_recipient')}
                              prefix={<SearchOutlined />}
                              size="middle"
                              className="search-input"
                            />
                          </div>
                          <div className="recipients-list">
                            {messageRecipients.map((recipient, index) => {
                              const id = typeof recipient === 'object' ? recipient.id : recipient;
                              const name = typeof recipient === 'object' ? recipient.name : '';
                              
                              return (
                                <Tag 
                                  key={id + "-" + index}
                                  className="recipient-tag"
                                  closable
                                  onClose={() => setMessageRecipients(prev => 
                                    prev.filter(r => 
                                      typeof r === 'object' ? r.id !== id : r !== id
                                    )
                                  )}
                                >
                                  <Avatar size="small" icon={<UserOutlined />} className="tag-avatar" />
                                  <span className="tag-name">{name || t('user')}</span>
                                </Tag>
                              );
                            })}
                          </div>
                        </Panel>
                      </Collapse>
                    </div>
                  )}
                </div>
                
                {/* Message composition tabs */}
                <Tabs 
                  defaultActiveKey="compose" 
                  className="modern-message-tabs" 
                  tabBarStyle={{ marginBottom: 24 }}
                  tabBarGutter={24}
                >
                  <TabPane 
                    tab={
                      <span className="tab-item">
                        <EditOutlined /> {t('compose_message')}
                      </span>
                    } 
                    key="compose"
                  >
                    {/* Message type selector */}
                    <div className="modern-message-type">
                      <div className="section-title">{t('message_type_section')}</div>
                      <Radio.Group 
                        value={messageType} 
                        onChange={(e) => setMessageType(e.target.value)}
                        buttonStyle="solid"
                        className="message-type-buttons"
                      >
                        <Radio.Button value="text">
                          <span className="type-button">
                            <FileTextOutlined /> {t('message_type_text')}
                          </span>
                        </Radio.Button>
                        <Radio.Button value="image">
                          <span className="type-button">
                            <FileImageOutlined /> {t('message_type_image')}
                          </span>
                        </Radio.Button>
                        <Radio.Button value="video">
                          <span className="type-button">
                            <VideoCameraOutlined /> {t('message_type_video')}
                          </span>
                        </Radio.Button>
                      </Radio.Group>
                    </div>
                    
                    {/* Message content section */}
                    <div className="modern-message-content">
                      <div className="section-title">{t('message_content_section')}</div>
                      <div className="content-container">
                        <TextArea
                          rows={5}
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          placeholder={t('message_text_placeholder')}
                          className="content-textarea"
                          maxLength={5000}
                        />
                        <div className="character-count">
                          {messageText.length}/5000 {t('characters')}
                        </div>
                      </div>
                      
                      {/* Message image section */}
                      {messageType === 'image' && (
                        <div className="content-container" style={{ marginTop: 16 }}>
                          <div className="section-title">{t('image_url_section')}</div>
                          <Input
                            value={messageImage}
                            onChange={(e) => setMessageImage(e.target.value)}
                            placeholder={t('image_url_placeholder')}
                            prefix={<FileImageOutlined />}
                            addonAfter={
                              messageImage && (
                                <Tooltip title={t('preview_image')}>
                                  <EyeOutlined onClick={() => window.open(messageImage, '_blank')} />
                                </Tooltip>
                              )
                            }
                          />
                        </div>
                      )}
                      
                      {/* Message video section */}
                      {messageType === 'video' && (
                        <div className="content-container" style={{ marginTop: 16 }}>
                          <div className="section-title">{t('video_url_section')}</div>
                          <Input
                            value={messageVideo}
                            onChange={(e) => setMessageVideo(e.target.value)}
                            placeholder={t('video_url_placeholder')}
                            prefix={<VideoCameraOutlined />}
                            addonAfter={
                              messageVideo && (
                                <Tooltip title={t('preview_video')}>
                                  <EyeOutlined onClick={() => window.open(messageVideo, '_blank')} />
                                </Tooltip>
                              )
                            }
                          />
                        </div>
                      )}
                    </div>
                    <div className="modern-message-options">
                      <Divider className="options-divider">{t('sending_options')}</Divider>

                    {/* Schedule for Later */}
                    <div className="schedule-option">
                      <div className="option-row">
                        <Switch 
                          checked={enableScheduling}
                          onChange={(value) => {
                            setEnableScheduling(value);
                            // If enabling scheduling, disable quick reply buttons
                            if (value && enableQuickReply) {
                              setEnableQuickReply(false);
                            }
                          }}
                        />
                          <span className="option-label">{t('schedule_for_later')}</span>
                          <Tooltip title={t('scheduling_help')}>
                            <QuestionCircleOutlined className="help-icon" />
                          </Tooltip>
                        </div>
                        
                        {enableScheduling && (
                          <div className="schedule-control">
                            <span className="control-label">{t('select_date_time')}:</span>
                            <DatePicker
                              showTime
                              format="YYYY-MM-DD HH:mm:ss"
                              placeholder={t('select_date_time')}
                              value={scheduledTime}
                              onChange={setScheduledTime}
                              className="date-picker"
                              disabledDate={(current) => current && current < moment().startOf('day')}
                            />
                          </div>
                        )}
                      </div>

                      {/* Quick Reply Buttons - disabled when scheduling is enabled */}
                      <div className="schedule-option">
                        {enableScheduling && (
                          <Alert
                            message={t('quickreply_scheduling_unavailable')}
                            description={t('quickreply_scheduling_unavailable_desc')}
                            type="warning"
                            showIcon
                            style={{ marginBottom: 16 }}
                          />
                        )}
                        <QuickReplyButtonsSection
                        enableQuickReply={enableScheduling ? false : enableQuickReply}
                        setEnableQuickReply={(value) => {
                          setEnableQuickReply(value);
                          // If enabling quick reply, disable scheduling
                          if (value && enableScheduling) {
                            setEnableScheduling(false);
                          }
                        }}
                        quickReplyButtons={quickReplyButtons}
                        setQuickReplyButtons={setQuickReplyButtons}
                        newButtonText={newButtonText}
                        setNewButtonText={setNewButtonText}
                        addQuickReplyButton={addQuickReplyButton}
                        removeQuickReplyButton={removeQuickReplyButton}
                      />
                    </div>
                    
                    {/* Delay options */}
                    <MessageDelayOptions
                      enableDelay={enableDelay}
                      setEnableDelay={setEnableDelay}
                      delayMode={delayMode}
                      setDelayMode={setDelayMode}
                      delaySeconds={delaySeconds}
                      setDelaySeconds={setDelaySeconds}
                      minDelaySeconds={minDelaySeconds}
                      setMinDelaySeconds={setMinDelaySeconds}
                      maxDelaySeconds={maxDelaySeconds}
                      setMaxDelaySeconds={setMaxDelaySeconds}
                      incrementalDelayStart={incrementalDelayStart}
                      setIncrementalDelayStart={setIncrementalDelayStart}
                      incrementalDelayStep={incrementalDelayStep}
                      setIncrementalDelayStep={setIncrementalDelayStep}
                    />
                    
                    {/* Personalization options */}
                    <MessagePersonalizationSection
                      personalizeMessage={personalizeMessage}
                      setPersonalizeMessage={setPersonalizeMessage}
                      includeLastInteraction={includeLastInteraction}
                      setIncludeLastInteraction={setIncludeLastInteraction}
                      customVariables={customVariables}
                      setCustomVariables={setCustomVariables}
                      newVariableName={newVariableName}
                      setNewVariableName={setNewVariableName}
                      newVariableValue={newVariableValue}
                      setNewVariableValue={setNewVariableValue}
                      addCustomVariable={addCustomVariable}
                      removeCustomVariable={removeCustomVariable}
                      messageText={messageText}
                    />
                    </div>
                  </TabPane>
                  
                  <TabPane 
                    tab={
                      <span className="tab-item">
                        <SaveOutlined /> {t('templates_section')}
                      </span>
                    } 
                    key="templates"
                  >
                    <div className="modern-templates">
                      <div className="templates-header">
                        <div className="section-title">{t('templates_section')}</div>
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => setSaveTemplateModalVisible(true)}
                          className="add-template-button"
                        >
                          {t('save_current_template')}
                        </Button>
                      </div>
                      
                      <div className="templates-list">
                        {savedTemplates.length > 0 ? (
                          savedTemplates.map(template => (
                            <Card 
                              key={template._id}
                              size="small"
                              className="template-card"
                              title={
                                <span className="template-title">{template.name}</span>
                              }
                              extra={
                                <div className="template-actions">
                                  <Button 
                                    type="primary"
                                    size="small" 
                                    icon={<EditOutlined />} 
                                    onClick={() => loadTemplate(template)}
                                    className="use-button"
                                  >
                                    {t('use')}
                                  </Button>
                                  <Popconfirm
                                    title={t('template_delete_confirm')}
                                    onConfirm={() => deleteTemplate(template._id)}
                                    okText={t('template_delete_yes')}
                                    cancelText={t('template_delete_no')}
                                  >
                                    <Button 
                                      type="text" 
                                      size="small" 
                                      danger 
                                      icon={<DeleteOutlined />} 
                                      className="delete-button"
                                    />
                                  </Popconfirm>
                                </div>
                              }
                            >
                              <div className="template-content">
                                <div className="template-text">{template.text}</div>
                                {template.type !== 'text' && (
                                  <Tag 
                                    color={template.type === 'image' ? 'green' : 'purple'} 
                                    className="template-type"
                                    icon={template.type === 'image' ? <FileImageOutlined /> : <VideoCameraOutlined />}
                                  >
                                    {template.type === 'image' ? t('message_type_image') : t('message_type_video')}
                                  </Tag>
                                )}
                                {/* Display quick reply buttons if available */}
                                {template.quickReplyButtons && template.quickReplyButtons.length > 0 && (
                                  <div className="template-quick-replies">
                                    {template.quickReplyButtons.map((button, idx) => (
                                      <Tag key={idx} color="blue">{button.text}</Tag>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </Card>
                          ))
                        ) : (
                          <div className="templates-empty">
                            <Empty 
                              description={t('no_templates')}
                              image={Empty.PRESENTED_IMAGE_SIMPLE} 
                            />
                            <div className="empty-text">
                              {t('templates_empty_message')}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabPane>
                </Tabs>
              </Modal>
              
              {/* Preview Modal */}
              <Modal
                title={t('preview_modal_title')}
                open={previewVisible}
                onCancel={() => setPreviewVisible(false)}
                footer={[
                  <Button key="close" onClick={() => setPreviewVisible(false)} className="modern-modal-button close">
                    {t('close')}
                  </Button>
                ]}
                width={500}
                className="modern-preview-modal"
              >
                <ContentPreview
                  type={messageType}
                  content={messageText}
                  image={messageType === 'image' ? messageImage : null}
                  video={messageType === 'video' ? messageVideo : null}
                  personalizeMessage={personalizeMessage}
                  customVariables={customVariables}
                  quickReplyButtons={enableQuickReply ? quickReplyButtons : []}
                />
              </Modal>
              
              {/* Save Template Modal */}
              <Modal
                title={t('save_template_modal_title')}
                open={saveTemplateModalVisible}
                onCancel={() => setSaveTemplateModalVisible(false)}
                onOk={saveTemplate}
                okText={t('save')}
                cancelText={t('cancel')}
                confirmLoading={saveTemplateLoading}
                className="modern-template-modal"
              >
                <Form layout="vertical" className="modern-form">
                  <Form.Item
                    label={<span className="form-label">{t('template_name_label')}</span>}
                    required
                    rules={[{ required: true, message: t('template_name_required') }]}
                  >
                    <Input
                      placeholder={t('template_name_placeholder')}
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="form-input"
                    />
                  </Form.Item>
                  <div className="template-preview">
                    <div className="preview-header">{t('template_preview_header')}</div>
                    <div className="preview-content">
                      {messageType === 'text' && (
                        <p className="preview-text">{messageText || t('no_text')}</p>
                      )}
                      {messageType === 'image' && (
                        <>
                          <p className="preview-text">{messageText}</p>
                          <div className="preview-image">
                            <FileImageOutlined className="media-icon" />
                            {t('template_image')} {messageImage || t('no_url')}
                          </div>
                        </>
                      )}
                      {messageType === 'video' && (
                        <>
                          <p className="preview-text">{messageText}</p>
                          <div className="preview-video">
                            <VideoCameraOutlined className="media-icon" />
                            {t('template_video')} {messageVideo || t('no_url')}
                          </div>
                        </>
                      )}
                      {/* Display quick reply buttons if enabled */}
                      {enableQuickReply && quickReplyButtons.length > 0 && (
                        <div className="preview-quick-reply-buttons">
                          <p><strong>{t('quick_reply_buttons')}:</strong></p>
                          <div className="quick-reply-buttons-preview">
                            {quickReplyButtons.map((button, idx) => (
                              <Tag key={idx} color="blue">{button.text}</Tag>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Form>
              </Modal>
              
              {/* Page Details Drawer */}
              <Drawer
                title={
                  <div className="modern-drawer-title">
                    <Avatar 
                      src={currentPage?.picture} 
                      icon={<UserOutlined />} 
                      size={40}
                      className="page-avatar"
                    />
                    <span className="title-text">{currentPage?.name || t('page_details_title')}</span>
                  </div>
                }
                open={pageDetailsVisible}
                onClose={() => setPageDetailsVisible(false)}
                width={600}
                placement={direction === 'rtl' ? 'left' : 'right'}
                className="modern-page-drawer"
                extra={
                  <Space>
                    <Button 
                      onClick={() => window.open(`https://facebook.com/${currentPage?.pageId}`, '_blank')}
                      icon={<FacebookOutlined />}
                      className="page-link-button"
                    >
                      {t('open_page')}
                    </Button>
                  </Space>
                }
              >
                {currentPage && (
                  <div className="page-details">
                    <div className="header-section">
                      <Avatar
                        size={80}
                        src={currentPage.picture}
                        icon={<UserOutlined />}
                        className="large-avatar"
                      />
                      <div className="page-info">
                        <Title level={4} className="page-name">{currentPage.name}</Title>
                        <div className="page-meta">
                          <Tag color="blue" className="category-tag">{currentPage.category}</Tag>
                          <span className="followers-count">
                            <UserOutlined /> {t('page_followers_count', { count: currentPage.fan_count || 0 })}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <Divider className="details-divider" />
                    
                    <div className="details-section">
                      <Title level={5} className="section-title">{t('page_info_section')}</Title>
                      <Card className="details-card details-grid">
                        <div className="detail-item">
                          <span className="detail-label">{t('page_id_label')}</span>
                          <div className="detail-value-with-copy">
                            <span className="detail-value">{currentPage.pageId}</span>
                            <Button
                              type="text"
                              size="small"
                              icon={<CopyOutlined />}
                              className="copy-button"
                              onClick={() => copyToClipboard(currentPage.pageId, t('copy_page_id'))}
                            />
                          </div>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">{t('page_category_label')}</span>
                          <span className="detail-value">{currentPage.category}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">{t('page_followers_label')}</span>
                          <span className="detail-value followers">{currentPage.fan_count || 0}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">{t('page_extraction_date_label')}</span>
                          <span className="detail-value date">{moment(currentPage.extractedAt).format('YYYY-MM-DD HH:mm:ss')}</span>
                        </div>
                      </Card>
                    </div>
                    
                    <div className="details-section">
                      <Title level={5} className="section-title">{t('access_token_section')}</Title>
                      <Alert
                        message={t('token_alert_title')}
                        description={t('token_alert_desc')}
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                      />
                      <Card className="details-card">
                        <div className="detail-item">
                          <span className="detail-label">{t('page_token_label')}</span>
                          <div className="detail-value-with-copy">
                            <span className="detail-value" style={{ 
                              fontFamily: 'monospace', 
                              fontSize: '12px',
                              display: 'block',
                              marginBottom: '8px',
                              backgroundColor: '#f0f0f0',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              maxWidth: '100%',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {currentPage.access_token ? currentPage.access_token.substring(0, 15) + '...' : t('no_token_available')}
                            </span>
                            <Button
                              type="text"
                              icon={<CopyOutlined />}
                              className="copy-button"
                              onClick={() => copyToClipboard(currentPage.access_token, t('copy_page_token'))}
                              disabled={!currentPage.access_token}
                            >
                              {t('copy_page_token')}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </div>
                    
                    <div className="actions-section">
                      <Button
                        icon={<MessageOutlined />}
                        className="action-button extract-messages"
                        onClick={() => {
                          setPageId(currentPage.pageId);
                          setPageName(currentPage.name);
                          setActiveTab('messages');
                          setPageDetailsVisible(false);
                          fetchPageSenders(currentPage.pageId, currentPage.access_token);
                        }}
                      >
                        {t('extract_messages_action')}
                      </Button>
                    </div>
                  </div>
                )}
              </Drawer>
              
              {/* Analytics Dashboard Modal */}
              <Modal
                title={t('analytics_dashboard_title')}
                open={showAnalyticsDashboard}
                onCancel={() => setShowAnalyticsDashboard(false)}
                footer={null}
                width={900}
                className="analytics-dashboard-modal"
              >
                <MessageAnalyticsDashboard 
                  data={analyticsType === 'instant' ? instantMessagesAnalytics : scheduledMessagesAnalytics}
                  period={analyticsPeriod}
                  loading={loadingAnalytics}
                  type={analyticsType}
                />
              </Modal>
            </div>
          </Content>
        </Layout>
      )}
    </ContentContainer>
  );
};

export default PageManagement;