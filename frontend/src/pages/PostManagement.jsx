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

// Enhanced Preview component for post display
const ContentPreview = ({ 
  type, 
  content, 
  image, 
  video
}) => {
  const { t } = useLanguage();
  
  // Helper function to get translated text with namespace
  const getText = (key) => t(`postManagement:${key}`);
  
  return (
    <div className="content-preview modern-content-preview">
      <div className="preview-header">
        <Avatar size="large" icon={<UserOutlined />} className="preview-avatar" />
        <div className="preview-header-info">
          <div className="preview-name">{getText('facebook_page')}</div>
          <div className="preview-time">{moment().format("YYYY-MM-DD HH:mm:ss")}</div>
        </div>
      </div>
      
      <div className="preview-content">
        {content && <div className="preview-text">{content}</div>}
        
        {type === 'image' && image && (
          <div className="preview-media">
            <img 
              src={image} 
              alt={getText('preview')} 
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
              title={getText('video_preview')}
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
      
      <div className="preview-actions">
        <div className="preview-action">
          <LikeOutlined /> {getText('like')}
        </div>
        <div className="preview-action">
          <CommentOutlined /> {getText('comment')}
        </div>
        <div className="preview-action">
          <SendOutlined /> {getText('share')}
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
  
  // Helper function to get translated text with namespace
  const getText = (key) => t(`postManagement:${key}`);
  
  let color, text, icon;
  
  switch (status) {
    case 'pending':
      color = 'blue';
      text = getText('status_pending');
      icon = <ClockCircleOutlined />;
      break;
    case 'processing':
      color = 'orange';
      text = getText('status_processing');
      icon = <SyncOutlined spin />;
      break;
    case 'completed':
      color = 'green';
      text = getText('status_completed');
      icon = <CheckCircleOutlined />;
      break;
    case 'failed':
      color = 'red';
      text = getText('status_failed');
      icon = <CloseCircleOutlined />;
      break;
    case 'canceled':
      color = 'default';
      text = getText('status_canceled');
      icon = <StopOutlined />;
      break;
    default:
      color = 'default';
      text = status;
      icon = <InfoCircleOutlined />;
  }
  
  return <Tag color={color} icon={showIcon ? icon : null} className="status-tag">{text}</Tag>;
};

// Enhanced Card item component for pages
const PageCard = ({ page, onPageAction, onToggleFavorite, isFavorite }) => {
  const { t } = useLanguage();
  
  // Helper function to get translated text with namespace
  const getText = (key) => t(`postManagement:${key}`);
  
  return (
    <Card 
      className="entity-card page-card"
      hoverable
      actions={[
        <Tooltip title={getText('page_action_view_posts')}>
          <Button
            type="text"
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => onPageAction('posts', page)}
            aria-label={getText('page_action_view_posts')}
          />
        </Tooltip>,
        <Tooltip title={getText('page_action_details')}>
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => onPageAction('details', page)}
            aria-label={getText('page_action_details')}
          />
        </Tooltip>,
        <Tooltip title={isFavorite ? getText('remove_from_favorites') : getText('add_to_favorites')}>
          <Button
            type="text"
            size="small"
            icon={isFavorite ? <StarFilled style={{ color: '#FFD700' }} /> : <StarOutlined />}
            onClick={() => onToggleFavorite(page)}
            aria-label={isFavorite ? getText('remove_from_favorites') : getText('add_to_favorites')}
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
            <Tooltip title={getText('open_on_facebook')}>
              <a 
                href={`https://facebook.com/${page.pageId}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="card-title"
              >
                {page.name}
              </a>
            </Tooltip>
            <Tooltip title={getText('copy_page_id')}>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(page.pageId);
                  antMessage.success(getText('copy_page_id'));
                }}
                className="copy-button"
                aria-label={getText('copy_page_id')}
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

// Enhanced Card item component for posts
const PostCard = ({ post, onPostAction, onToggleFavorite, isFavorite }) => {
  const { t } = useLanguage();
  
  // Helper function to get translated text with namespace
  const getText = (key) => t(`postManagement:${key}`);
  
  return (
    <Card 
      className="entity-card post-card"
      hoverable
      cover={post.imageUrl && (
        <div className="card-image-container">
          <img
            alt="post"
            src={post.imageUrl}
            className="card-image"
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
            }}
          />
        </div>
      )}
      actions={[
        <Tooltip title={getText('post_action_comments')}>
          <Button
            type="text"
            size="small"
            icon={<CommentOutlined />}
            onClick={() => onPostAction('comments', post)}
            aria-label={getText('post_action_comments')}
          />
        </Tooltip>,
        <Tooltip title={getText('post_action_reactions')}>
          <Button
            type="text"
            size="small"
            icon={<LikeOutlined />}
            onClick={() => onPostAction('reactions', post)}
            aria-label={getText('post_action_reactions')}
          />
        </Tooltip>,
        <Tooltip title={getText('post_action_open')}>
          <Button
            type="text"
            size="small"
            icon={<LinkOutlined />}
            onClick={() => window.open(post.permalink_url, '_blank')}
            aria-label={getText('post_action_open')}
          />
        </Tooltip>,
        <Tooltip title={isFavorite ? getText('remove_from_favorites') : getText('add_to_favorites')}>
          <Button
            type="text"
            size="small"
            icon={isFavorite ? <StarFilled style={{ color: '#FFD700' }} /> : <StarOutlined />}
            onClick={() => onToggleFavorite(post)}
            aria-label={isFavorite ? getText('remove_from_favorites') : getText('add_to_favorites')}
          />
        </Tooltip>
      ]}
    >
      <div className="card-content">
        <div className="card-header-row">
          <div className="card-header-content">
            <div className="card-title-row">
              <Tag color={
                post.type === 'status' ? 'blue' : 
                post.type === 'photo' ? 'green' : 
                post.type === 'video' ? 'purple' : 
                post.type === 'link' ? 'orange' : 'default'
              } className="post-type-tag">
                {post.type === 'status' ? getText('post_type_text') : 
                post.type === 'photo' ? getText('post_type_photo') : 
                post.type === 'video' ? getText('post_type_video') : 
                post.type === 'link' ? getText('post_type_link') : post.type}
              </Tag>
              <Tooltip title={getText('copy_post_id')}>
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(post.postId);
                    antMessage.success(getText('copy_post_id'));
                  }}
                  className="copy-button"
                  aria-label={getText('copy_post_id')}
                />
              </Tooltip>
            </div>
            <div className="card-subtitle">
              <CalendarOutlined /> {moment(post.created_time).format('YYYY-MM-DD HH:mm')}
            </div>
          </div>
        </div>
        <div className="post-message">
          {post.message || getText('no_text')}
        </div>
        <div className="card-stats">
          <div className="stat-item">
            <LikeOutlined className="stat-icon" /> 
            <span>{post.reactions?.summary?.total_count || 0}</span>
          </div>
          <div className="stat-item">
            <CommentOutlined className="stat-icon" /> 
            <span>{post.comments?.summary?.total_count || 0}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Enhanced Card item component for comments
const CommentCard = ({ comment, onCommentAction, onToggleFavorite, isFavorite }) => {
  const { t } = useLanguage();
  
  // Helper function to get translated text with namespace
  const getText = (key) => t(`postManagement:${key}`);
  
  return (
    <Card 
      className="entity-card comment-card"
      hoverable
      actions={[
        <Tooltip title={getText('comment_action_profile')}>
          <Button
            type="text"
            size="small"
            icon={<UserOutlined />}
            onClick={() => window.open(`https://facebook.com/${comment.user?.id}`, '_blank')}
            disabled={!comment.user || !comment.user.id}
            aria-label={getText('comment_action_profile')}
          />
        </Tooltip>,
        <Tooltip title={getText('comment_action_copy_id')}>
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(comment.user?.id);
              antMessage.success(getText('copy_user_id'));
            }}
            disabled={!comment.user || !comment.user.id}
            aria-label={getText('comment_action_copy_id')}
          />
        </Tooltip>,
        <Tooltip title={isFavorite ? getText('remove_from_favorites') : getText('add_to_favorites')}>
          <Button
            type="text"
            size="small"
            icon={isFavorite ? <StarFilled style={{ color: '#FFD700' }} /> : <StarOutlined />}
            onClick={() => onToggleFavorite(comment)}
            aria-label={isFavorite ? getText('remove_from_favorites') : getText('add_to_favorites')}
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
            <span className="card-title">{comment.user?.name || getText('unknown_user')}</span>
          </div>
          <div className="card-subtitle">{comment.user?.id}</div>
          <div className="card-meta">
            <CalendarOutlined /> {moment(comment.created_time).format('YYYY-MM-DD HH:mm')}
            <span className="meta-stat">
              <LikeOutlined /> {comment.like_count || 0}
            </span>
          </div>
        </div>
      </div>
      <div className="comment-message">
        {comment.message || getText('no_text')}
      </div>
    </Card>
  );
};

// Enhanced Card item component for reactions
const ReactionCard = ({ reaction, onReactionAction, onToggleFavorite, isFavorite }) => {
  const { t } = useLanguage();
  
  // Helper function to get translated text with namespace
  const getText = (key) => t(`postManagement:${key}`);
  
  // Determine emoji and color based on reaction type
  let emoji, color;
  switch(reaction.type) {
    case 'LIKE':
      emoji = '👍';
      color = 'blue';
      break;
    case 'LOVE':
      emoji = '❤️';
      color = 'red';
      break;
    case 'WOW':
      emoji = '😮';
      color = 'orange';
      break;
    case 'HAHA':
      emoji = '😄';
      color = 'green';
      break;
    case 'SAD':
      emoji = '😢';
      color = 'grey';
      break;
    case 'ANGRY':
      emoji = '😡';
      color = 'volcano';
      break;
    case 'CARE':
      emoji = '🤗';
      color = 'gold';
      break;
    default:
      emoji = '👍';
      color = 'default';
  }
  
  return (
    <Card 
      className="entity-card reaction-card"
      hoverable
      actions={[
        <Tooltip title={getText('comment_action_profile')}>
          <Button
            type="text"
            size="small"
            icon={<UserOutlined />}
            onClick={() => window.open(`https://facebook.com/${reaction.user?.id}`, '_blank')}
            disabled={!reaction.user || !reaction.user.id}
            aria-label={getText('comment_action_profile')}
          />
        </Tooltip>,
        <Tooltip title={getText('comment_action_copy_id')}>
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(reaction.user?.id);
              antMessage.success(getText('copy_user_id'));
            }}
            disabled={!reaction.user || !reaction.user.id}
            aria-label={getText('comment_action_copy_id')}
          />
        </Tooltip>,
        <Tooltip title={isFavorite ? getText('remove_from_favorites') : getText('add_to_favorites')}>
          <Button
            type="text"
            size="small"
            icon={isFavorite ? <StarFilled style={{ color: '#FFD700' }} /> : <StarOutlined />}
            onClick={() => onToggleFavorite(reaction)}
            aria-label={isFavorite ? getText('remove_from_favorites') : getText('add_to_favorites')}
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
            <span className="card-title">{reaction.user?.name || getText('unknown_user')}</span>
          </div>
          <div className="card-subtitle">{reaction.user?.id}</div>
          <div className="card-meta">
            <div className="reaction-badge">
              <span className="reaction-emoji">{emoji}</span>
              <Tag color={color} className="reaction-type">
                {reaction.type === 'LIKE' ? getText('reaction_type_like') : 
                 reaction.type === 'LOVE' ? getText('reaction_type_love') : 
                 reaction.type === 'WOW' ? getText('reaction_type_wow') : 
                 reaction.type === 'HAHA' ? getText('reaction_type_haha') : 
                 reaction.type === 'SAD' ? getText('reaction_type_sad') : 
                 reaction.type === 'ANGRY' ? getText('reaction_type_angry') : 
                 reaction.type === 'CARE' ? getText('reaction_type_care') : reaction.type}
              </Tag>
            </div>
            <Tag color="cyan" className="profile-type-tag">{reaction.profile_type}</Tag>
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
  
  // Helper function to get translated text with namespace
  const getText = (key) => t(`postManagement:${key}`);
  
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
          case 'post':
            return (
              (entity.message && entity.message.toLowerCase().includes(searchLower)) ||
              (entity.postId && entity.postId.toLowerCase().includes(searchLower))
            );
          case 'comment':
            return (
              (entity.message && entity.message.toLowerCase().includes(searchLower)) ||
              (entity.user?.name && entity.user.name.toLowerCase().includes(searchLower))
            );
          case 'reaction':
            return (
              (entity.user?.name && entity.user.name.toLowerCase().includes(searchLower)) ||
              (entity.type && entity.type.toLowerCase().includes(searchLower))
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
                   entityType === 'post' ? entity.message || '' :
                   entityType === 'comment' ? entity.user?.name || '' :
                   entityType === 'reaction' ? entity.user?.name || '' : '';
          
          case 'date':
            return entityType === 'page' ? new Date(entity.extractedAt).getTime() :
                   entityType === 'post' ? new Date(entity.created_time).getTime() :
                   entityType === 'comment' ? new Date(entity.created_time).getTime() :
                   entityType === 'reaction' ? new Date(entity.extractedAt).getTime() : 0;
          
          case 'reactions':
            return entityType === 'post' ? entity.reactions?.summary?.total_count || 0 : 0;
          
          case 'comments':
            return entityType === 'post' ? entity.comments?.summary?.total_count || 0 : 0;
          
          case 'likes':
            return entityType === 'comment' ? entity.like_count || 0 : 0;
          
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
      case 'post': return entity.postId;
      case 'comment': return entity.commentId;
      case 'reaction': return entity.key;
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
      { value: 'default', label: getText('sort_default') },
      { value: 'date', label: getText('sort_date') }
    ];
    
    switch (entityType) {
      case 'page':
        return [
          ...commonOptions,
          { value: 'name', label: getText('sort_name') },
          { value: 'followers', label: getText('sort_followers') }
        ];
      case 'post':
        return [
          ...commonOptions,
          { value: 'reactions', label: getText('sort_reactions') },
          { value: 'comments', label: getText('sort_comments') }
        ];
      case 'comment':
        return [
          ...commonOptions,
          { value: 'name', label: getText('sort_user') },
          { value: 'likes', label: getText('sort_likes') }
        ];
      case 'reaction':
        return [
          ...commonOptions,
          { value: 'name', label: getText('sort_user') }
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
      
      case 'post':
        return (
          <PostCard 
            post={entity} 
            onPostAction={handleEntityAction} 
            onToggleFavorite={handleToggleFavorite}
            isFavorite={isEntityFavorite(entity)}
          />
        );
      
      case 'comment':
        return (
          <CommentCard 
            comment={entity} 
            onCommentAction={handleEntityAction} 
            onToggleFavorite={handleToggleFavorite}
            isFavorite={isEntityFavorite(entity)}
          />
        );
      
      case 'reaction':
        return (
          <ReactionCard 
            reaction={entity} 
            onReactionAction={handleEntityAction} 
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
            placeholder={getText('search_placeholder')}
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
              <StarFilled style={{ color: '#FFD700', marginRight: '4px' }} /> {getText('only_favorites')}
            </Checkbox>
          </div>
        </div>
        
        <div className="view-controls">
          <div className="sort-controls">
            <span className="sort-label">{getText('sort_by')}:</span>
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
          {getText('showing')} {paginatedEntities.length} {getText('of')} {totalItems} {getText(`${entityType}_plural`)}
        </span>
        {filters?.searchText && (
          <span className="search-terms">
            {getText('search_results_for')} "{filters.searchText}"
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
                <div className="empty-title">{emptyText || getText('no_items_found')}</div>
                <div className="empty-subtitle">{emptyDescription || getText('try_different_search')}</div>
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
            showTotal={(total, range) => `${range[0]}-${range[1]} ${getText('of')} ${total} ${getText(`${entityType}_plural`)}`}
          />
        </div>
      )}
    </div>
  );
};

// Main PostManagement component
const PostManagement = () => {
  const { user } = useUser();
  const { messageApi } = useMessage();
  const { direction, t } = useLanguage();
  
  // Helper function to get translated text with namespace
  const getText = (key) => t(`postManagement:${key}`);
  
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
  
  // State variables for posts
  const [pageId, setPageId] = useState('');
  const [pageName, setPageName] = useState('');
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postProgress, setPostProgress] = useState(0);
  const [totalPosts, setTotalPosts] = useState(0);
  const [extractedPostCount, setExtractedPostCount] = useState(0);
  const [showPostProgress, setShowPostProgress] = useState(false);
  const [extractingPosts, setExtractingPosts] = useState(false);
  const [postExtractionCompleted, setPostExtractionCompleted] = useState(false);
  const [forceStopPostExtraction, setForceStopPostExtraction] = useState(false);
  
  // State variables for comments
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  
  // State variables for reactions
  const [reactions, setReactions] = useState([]);
  const [loadingReactions, setLoadingReactions] = useState(false);
  
  // Drawer for page details
  const [pageDetailsVisible, setPageDetailsVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(null);
  
  // Favorites state
  const [favorites, setFavorites] = useState({
    pages: [],
    posts: [],
    comments: [],
    reactions: []
  });
  
  // Filters state
  const [filters, setFilters] = useState({
    pages: { searchText: '' },
    posts: { searchText: '' },
    comments: { searchText: '' },
    reactions: { searchText: '' }
  });
  
  // Post preview state
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewPost, setPreviewPost] = useState(null);
  
  // Reference for abort controller
  const abortControllerRef = useRef(null);
  
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
        const savedFavorites = localStorage.getItem('postManagementFavorites');
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
      localStorage.setItem('postManagementFavorites', JSON.stringify(favorites));
    } catch (error) {
      debugLog('Error saving favorites to localStorage:', error);
    }
  }, [favorites]);
  
  // Toggle favorite item
  const toggleFavorite = (entityType, entity) => {
    let entityId;
    
    // Get the appropriate ID based on entity type
    switch (entityType) {
      case 'page':
        entityId = entity.pageId;
        break;
      case 'post':
        entityId = entity.postId;
        break;
      case 'comment':
        entityId = entity.commentId;
        break;
      case 'reaction':
        entityId = entity.key;
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
            case 'post': return item.postId === entityId;
            case 'comment': return item.commentId === entityId;
            case 'reaction': return item.key === entityId;
            default: return item.id === entityId || item._id === entityId;
          }
        }
      );
      
      if (existingIndex >= 0) {
        // Remove from favorites
        currentFavorites.splice(existingIndex, 1);
        messageApi.success(getText('removed_from_favorites'));
      } else {
        // Add to favorites
        currentFavorites.push(entity);
        messageApi.success(getText('added_to_favorites'));
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
        messageApi.loading(getText('checking_access_token'), 1);
        const newToken = await fetchActiveAccessToken();
        if (!newToken) {
          messageApi.error(getText('no_active_token'));
          setLoadingPages(false);
          setShowProgress(false);
          return;
        }
      }
      
      messageApi.loading(getText('extracting_pages'), 1);
      
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
            throw new Error(getText('json_parse_error'));
          }
          
          if (data.error) {
            debugLog('API error:', data.error);
            throw new Error(data.error.message);
          }
          
          if (!data.data || !Array.isArray(data.data)) {
            debugLog('Invalid data structure:', data);
            throw new Error(getText('invalid_data_structure'));
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
        messageApi.success(getText('pages_extract_success', { count: extractedPages.length }));
      } else {
        messageApi.warning(getText('pages_extract_none'));
      }
    } catch (error) {
      console.error('Error fetching pages:', error);
      setError(getText('pages_extract_error', { message: error.message }));
      messageApi.error(getText('pages_extract_error', { message: error.message }));
    } finally {
      setLoadingPages(false);
      setShowProgress(false);
    }
  };
  
  // Fetch posts from a specific page
  const fetchPagePosts = async (pageId, pageToken) => {
    if (!pageId) {
      messageApi.error(getText('select_page_first'));
      return;
    }
    
    setLoadingPosts(true);
    setError('');
    setPosts([]);
    setPostProgress(0);
    setTotalPosts(0);
    setExtractedPostCount(0);
    setShowPostProgress(true);
    setExtractingPosts(true);
    setPostExtractionCompleted(false);
    setForceStopPostExtraction(false);
    
    // Create a new abort controller for this extraction
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    try {
      // Use the page-specific access token if available
      const accessToken = pageToken || activeAccessToken;
      
      if (!accessToken) {
        messageApi.error(getText('no_page_token'));
        setLoadingPosts(false);
        setShowPostProgress(false);
        return;
      }
      
      messageApi.loading(getText('extracting_posts'), 1);
      
      // Fetch posts from the page using the Graph API
      const url = `/v18.0/${pageId}/posts?fields=id,message,created_time,attachments,permalink_url,full_picture,reactions.summary(true),comments.summary(true)&access_token=${accessToken}&limit=25`;
      
      debugLog('Fetching posts with URL:', url);
      
      const fetchPostsData = async (url, allPosts = []) => {
        // Check for termination
        if (forceStopPostExtraction || abortControllerRef.current?.signal.aborted) {
          debugLog('Post extraction terminated');
          return allPosts;
        }
        
        try {
          debugLog('Fetching posts from URL:', url);
          const response = await fetch(url);
          
          if (!response.ok) {
            throw new Error(getText('http_error', { status: response.status }));
          }
          
          let data;
          try {
            data = await response.json();
            debugLog('Received posts data:', data.data?.length || 0, 'posts');
          } catch (jsonError) {
            debugLog('Error parsing JSON:', jsonError);
            throw new Error(getText('json_parse_error'));
          }
          
          if (data.error) {
            debugLog('API error:', data.error);
            throw new Error(data.error.message);
          }
          
          if (!data.data || !Array.isArray(data.data)) {
            debugLog('Invalid data structure:', data);
            throw new Error(getText('invalid_data_structure'));
          }
          
          // Set total count if this is the first request
          if (allPosts.length === 0 && data.summary?.total_count) {
            const totalCount = data.summary.total_count;
            debugLog('Setting total posts count from summary:', totalCount);
            setTotalPosts(totalCount);
          } else if (allPosts.length === 0 && data.data) {
            // If no total_count provided, make an educated guess based on current batch
            const estimatedTotal = data.data.length === 25 ? data.data.length * 5 : data.data.length;
            debugLog('Estimating total posts:', estimatedTotal);
            setTotalPosts(estimatedTotal);
          }
          
          // Process posts
          const processedPosts = data.data.map(post => {
            // Extract image URL from attachments if available
            let imageUrl = post.full_picture || '';
            let videoUrl = '';
            
            if (post.attachments && post.attachments.data && post.attachments.data.length > 0) {
              const attachment = post.attachments.data[0];
              
              if (attachment.type === 'photo' && attachment.media?.image?.src) {
                imageUrl = attachment.media.image.src;
              } else if (attachment.type === 'video' && attachment.media?.source) {
                videoUrl = attachment.media.source;
              }
            }
            
            return {
              key: post.id,
              postId: post.id,
              message: post.message || '',
              created_time: post.created_time,
              permalink_url: post.permalink_url,
              type: post.attachments?.data?.[0]?.type || 'status',
              imageUrl: imageUrl,
              videoUrl: videoUrl,
              pageId: pageId,
              pageName: pageName,
              reactions: post.reactions,
              comments: post.comments,
              extractedAt: new Date().toISOString()
            };
          });
          
          debugLog(`Processed ${processedPosts.length} posts from current batch`);
          
          // Update posts state
          const newTotalPosts = [...allPosts, ...processedPosts];
          setPosts(newTotalPosts);
          setExtractedPostCount(newTotalPosts.length);
          
          if (totalPosts > 0) {
            const progressPercentage = Math.min(Math.round((newTotalPosts.length / totalPosts) * 100), 100);
            setPostProgress(progressPercentage);
            debugLog('Updated progress to', progressPercentage, '%');
          }
          
          // Handle pagination
          if (data.paging?.next && !forceStopPostExtraction) {
            debugLog('Found next page URL:', data.paging.next);
            
            // Add a delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Call fetchPostsData with the new pagination URL
            return await fetchPostsData(data.paging.next, newTotalPosts);
          } else {
            debugLog('No more pages available, completed fetching all posts');
          }
          
          return newTotalPosts;
        } catch (error) {
          throw error;
        }
      };
      
      const extractedPosts = await fetchPostsData(url, []);
      
      if (extractedPosts.length > 0) {
        if (!forceStopPostExtraction) {
          messageApi.success(getText('extraction_completed', { count: extractedPosts.length }));
        }
      } else {
        messageApi.warning(getText('extraction_no_posts'));
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      setError(getText('posts_extract_error', { message: error.message }));
      messageApi.error(getText('posts_extract_error', { message: error.message }));
    } finally {
      setLoadingPosts(false);
      setShowPostProgress(false);
      setPostExtractionCompleted(true);
      setExtractingPosts(false);
    }
  };
  
  // Stop post extraction
  const stopPostExtraction = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setForceStopPostExtraction(true);
    setExtractingPosts(false);
    setLoadingPosts(false);
    messageApi.info(getText('extraction_stopped'));
  };
  
  // Fetch comments from a specific post
  const fetchPostComments = async (postId, pageToken) => {
    if (!postId) {
      messageApi.error(getText('select_post_first'));
      return;
    }
    
    setLoadingComments(true);
    setComments([]);
    setError('');
    
    try {
      // Use the page-specific access token if available
      const accessToken = pageToken || activeAccessToken;
      
      if (!accessToken) {
        messageApi.error(getText('no_page_token'));
        setLoadingComments(false);
        return;
      }
      
      messageApi.loading(getText('extracting_comments'), 1);
      
      // Improved approach: Use backend proxy to avoid CORS issues
      const token = localStorage.getItem('token');
      const fetchAllComments = async () => {
        // Start with first page request to our backend
        let url = `/api/facebook/proxy?endpoint=${encodeURIComponent(`/${postId}/comments`)}&fields=${encodeURIComponent('id,message,attachment,created_time,from,like_count,comment_count')}&accessToken=${encodeURIComponent(accessToken)}&limit=100`;
        let allComments = [];
        let hasNextPage = true;
        
        while (hasNextPage) {
          try {
            const response = await axios.get(url, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            if (!response.data || !response.data.data) {
              throw new Error('Invalid response format');
            }
            
            // Process the current batch of comments
            const currentBatch = response.data.data.map(comment => ({
              key: comment.id,
              commentId: comment.id,
              message: comment.message || '',
              created_time: comment.created_time,
              like_count: comment.like_count || 0,
              comment_count: comment.comment_count || 0,
              user: {
                id: comment.from?.id,
                name: comment.from?.name
              },
              postId: postId,
              imageUrl: '', // Will be added later if needed
              extractedAt: new Date().toISOString()
            }));
            
            allComments = [...allComments, ...currentBatch];
            
            // Update the comments state as we go
            setComments(allComments);
            
            // Check if we have a next page
            if (response.data.paging && response.data.paging.next) {
              // For next page, we'll proxy through our backend again
              url = `/api/facebook/proxy?url=${encodeURIComponent(response.data.paging.next)}`;
              
              // Add a small delay to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
              hasNextPage = false;
            }
          } catch (error) {
            console.error('Error fetching comments batch:', error);
            throw error;
          }
        }
        
        return allComments;
      };
      
      const extractedComments = await fetchAllComments();
      
      if (extractedComments.length > 0) {
        messageApi.success(getText('comments_extract_success', { count: extractedComments.length }));
      } else {
        messageApi.warning(getText('comments_extract_none'));
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      setError(getText('comments_extract_error', { message: error.message }));
      messageApi.error(getText('comments_extract_error', { message: error.message }));
    } finally {
      setLoadingComments(false);
    }
  };
  
  // Fetch reactions from a specific post
  const fetchPostReactions = async (postId, pageToken) => {
    if (!postId) {
      messageApi.error(getText('select_post_first'));
      return;
    }
    
    setLoadingReactions(true);
    setReactions([]);
    setError('');
    
    try {
      // Use the page-specific access token if available
      const accessToken = pageToken || activeAccessToken;
      
      if (!accessToken) {
        messageApi.error(getText('no_page_token'));
        setLoadingReactions(false);
        return;
      }
      
      messageApi.loading(getText('extracting_reactions'), 1);
      
      // Improved approach: Use backend proxy to avoid CORS issues
      const token = localStorage.getItem('token');
      const fetchAllReactions = async () => {
        // Start with first page request to our backend
        let url = `/api/facebook/proxy?endpoint=${encodeURIComponent(`/${postId}/reactions`)}&fields=${encodeURIComponent('id,name,type,profile_type')}&accessToken=${encodeURIComponent(accessToken)}&limit=100`;
        let allReactions = [];
        let hasNextPage = true;
        
        while (hasNextPage) {
          try {
            const response = await axios.get(url, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            if (!response.data || !response.data.data) {
              throw new Error('Invalid response format');
            }
            
            // Process the current batch of reactions
            const currentBatch = response.data.data.map((reaction, index) => ({
              key: `${reaction.id}-${Date.now()}-${index}`, // Ensure unique keys
              userId: reaction.id,
              user: {
                id: reaction.id,
                name: reaction.name
              },
              type: reaction.type,
              profile_type: reaction.profile_type,
              postId: postId,
              extractedAt: new Date().toISOString()
            }));
            
            allReactions = [...allReactions, ...currentBatch];
            
            // Update the reactions state as we go
            setReactions(allReactions);
            
            // Check if we have a next page
            if (response.data.paging && response.data.paging.next) {
              // For next page, we'll proxy through our backend again
              url = `/api/facebook/proxy?url=${encodeURIComponent(response.data.paging.next)}`;
              
              // Add a small delay to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
              hasNextPage = false;
            }
          } catch (error) {
            console.error('Error fetching reactions batch:', error);
            throw error;
          }
        }
        
        return allReactions;
      };
      
      const extractedReactions = await fetchAllReactions();
      
      if (extractedReactions.length > 0) {
        messageApi.success(getText('reactions_extract_success', { count: extractedReactions.length }));
      } else {
        messageApi.warning(getText('reactions_extract_none'));
      }
    } catch (error) {
      console.error('Error fetching reactions:', error);
      setError(getText('reactions_extract_error', { message: error.message }));
      messageApi.error(getText('reactions_extract_error', { message: error.message }));
    } finally {
      setLoadingReactions(false);
    }
  };
  
  // Handle page action
  const handlePageAction = (action, page) => {
    if (!page) return;
    
    switch (action) {
      case 'posts':
        setPageId(page.pageId);
        setPageName(page.name);
        setActiveTab('posts');
        fetchPagePosts(page.pageId, page.access_token);
        break;
        
      case 'details':
        showPageDetails(page);
        break;
        
      default:
        break;
    }
  };
  
  // Handle post action
  const handlePostAction = (action, post) => {
    if (!post) return;
    
    switch (action) {
      case 'comments':
        setActiveTab('comments');
        fetchPostComments(post.postId, pages.find(p => p.pageId === pageId)?.access_token);
        break;
        
      case 'reactions':
        setActiveTab('reactions');
        fetchPostReactions(post.postId, pages.find(p => p.pageId === pageId)?.access_token);
        break;
        
      default:
        break;
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
      messageApi.warning(getText('no_items_export'));
      return;
    }
    
    try {
      let dataToExport;
      
      if (type === 'pages') {
        dataToExport = items.map(page => ({
          [getText('page_column_id')]: page.pageId,
          [getText('page_column_name')]: page.name,
          [getText('page_column_category')]: page.category,
          [getText('page_column_followers')]: page.fan_count
        }));
      } else if (type === 'posts') {
        dataToExport = items.map(post => ({
          [getText('post_id')]: post.postId,
          [getText('post_content')]: post.message,
          [getText('post_type')]: post.type,
          [getText('post_date')]: moment(post.created_time).format('YYYY-MM-DD HH:mm:ss'),
          [getText('post_reactions')]: post.reactions?.summary?.total_count || 0,
          [getText('post_comments')]: post.comments?.summary?.total_count || 0,
          [getText('post_url')]: post.permalink_url
        }));
      } else if (type === 'comments') {
        dataToExport = items.map(comment => ({
          [getText('comment_id')]: comment.commentId,
          [getText('comment_content')]: comment.message,
          [getText('user_name')]: comment.user?.name,
          [getText('user_id')]: comment.user?.id,
          [getText('comment_date')]: moment(comment.created_time).format('YYYY-MM-DD HH:mm:ss'),
          [getText('comment_likes')]: comment.like_count
        }));
      } else if (type === 'reactions') {
        dataToExport = items.map(reaction => ({
          [getText('user_id')]: reaction.userId,
          [getText('user_name')]: reaction.user?.name,
          [getText('reaction_type')]: reaction.type,
          [getText('profile_type')]: reaction.profile_type
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
      
      messageApi.success(getText('export_success', { count: items.length }));
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      messageApi.error(getText('export_error'));
    }
  };
  
  // Copy value to clipboard
  const copyToClipboard = (text, successMessage) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        messageApi.success(successMessage || getText('copy_success'));
      })
      .catch(err => {
        console.error(getText('copy_error'), err);
        messageApi.error(getText('copy_error'));
      });
  };
  
  // Stats cards for pages
  const pageStatsCards = [
    {
      title: getText('total_pages'),
      value: pages.length,
      color: '#1890ff',
      icon: <FacebookOutlined style={{ fontSize: '24px' }} />
    },
    {
      title: getText('total_followers'),
      value: pages.reduce((sum, page) => sum + (page.fan_count || 0), 0),
      color: '#52c41a',
      icon: <UserOutlined style={{ fontSize: '24px' }} />
    },
    {
      title: getText('favorite_pages'),
      value: favorites.pages?.length || 0,
      color: '#faad14',
      icon: <StarFilled style={{ fontSize: '24px' }} />
    }
  ];
  
  // Stats cards for posts
  const postStatsCards = [
    {
      title: getText('total_posts'),
      value: posts.length,
      color: '#1890ff',
      icon: <FileTextOutlined style={{ fontSize: '24px' }} />
    },
    {
      title: getText('total_reactions'),
      value: posts.reduce((sum, post) => sum + (post.reactions?.summary?.total_count || 0), 0),
      color: '#f5222d',
      icon: <LikeOutlined style={{ fontSize: '24px' }} />
    },
    {
      title: getText('total_comments'),
      value: posts.reduce((sum, post) => sum + (post.comments?.summary?.total_count || 0), 0),
      color: '#13c2c2',
      icon: <CommentOutlined style={{ fontSize: '24px' }} />
    },
    {
      title: getText('favorite_posts'),
      value: favorites.posts?.length || 0,
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
            <div className="modern-post-management">
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
                      {getText('pages_tab')}
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
                        <h2>{getText('post_management_title')}</h2>
                        <p>{getText('post_management_subtitle')}</p>
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
                        {getText('extract_pages')}
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
                        {getText('export_excel')}
                      </Button>
                      
                      <InfoTooltip 
                        title={getText('extract_pages_title')}
                        description={getText('extract_pages_desc')}
                      />
                    </div>
                    
                    {showProgress && (
                      <div className="modern-progress-container">
                        <div className="progress-header">
                          <span>
                            <SyncOutlined spin className="progress-icon" />
                            {getText('extracting_pages')}
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
                      emptyText={getText('no_pages_found')}
                      emptyDescription={getText('extract_pages_first')}
                    />
                  </div>
                </TabPane>
                
                {/* Posts Tab */}
                <TabPane 
                  tab={
                    <span className="modern-tab">
                      <FileTextOutlined className="tab-icon" />
                      {getText('posts_tab')}
                    </span>
                  } 
                  key="posts"
                >
                  <div className="modern-section">
                    <div className="modern-section-header">
                      <div className="section-header-icon">
                        <FileTextOutlined />
                      </div>
                      <div className="section-header-text">
                        <h2>{pageName ? getText('post_title', { name: pageName }) : getText('posts_tab')}</h2>
                        <p>{getText('posts_subtitle')}</p>
                      </div>
                    </div>
                    
                    <div className="modern-action-bar">
                      <Button
                        className="modern-extract-button"
                        type="primary"
                        onClick={() => fetchPagePosts(pageId, pages.find(p => p.pageId === pageId)?.access_token)}
                        disabled={!pageId || loadingPosts}
                        icon={loadingPosts ? <LoadingOutlined /> : <ReloadOutlined />}
                      >
                        {getText('update_posts')}
                      </Button>
                      
                      {extractingPosts && (
                        <Button
                          onClick={stopPostExtraction}
                          danger
                          type="primary"
                          icon={<CloseOutlined />}
                          className="modern-stop-button"
                        >
                          {getText('stop_extraction')}
                        </Button>
                      )}
                      
                      <Button
                        className="modern-export-button"
                        icon={<FileExcelOutlined />}
                        onClick={() => exportToExcel(
                          filters.posts?.onlyFavorites 
                            ? favorites.posts
                            : posts,
                          'facebook_posts', 
                          'posts'
                        )}
                        disabled={posts.length === 0}
                      >
                        {getText('export_excel')}
                      </Button>
                      
                      <InfoTooltip 
                        title={getText('extract_posts_title')}
                        description={getText('extract_posts_desc')}
                      />
                    </div>
                    
                    {!pageId && (
                      <Alert
                        message={getText('select_page_first')}
                        type="info"
                        showIcon
                        className="modern-alert"
                      />
                    )}
                    
                    {showPostProgress && (
                      <div className="modern-progress-container">
                        <div className="progress-header">
                          <span>
                            <SyncOutlined spin className="progress-icon" />
                            {getText('extracting_posts')}
                          </span>
                          <span className="progress-count">{extractedPostCount} / {totalPosts}</span>
                        </div>
                        <Progress
                          percent={postProgress}
                          status={loadingPosts ? "active" : "normal"}
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
                    
                    {posts.length > 0 && (
                      <div className="modern-stats-container">
                        {postStatsCards.map((stat, index) => (
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
                      entities={posts}
                      entityType="post"
                      isLoading={loadingPosts}
                      onEntityAction={handlePostAction}
                      favorites={favorites.posts}
                      onToggleFavorite={(post) => toggleFavorite('post', post)}
                      filters={filters.posts}
                      setFilters={(newFilters) => setFilters({ ...filters, posts: newFilters })}
                      cardsPerPage={12}
                      emptyText={posts.length === 0 ? getText('no_posts_found') : getText('no_matching_posts')}
                      emptyDescription={posts.length === 0 ? getText('extract_posts_first') : getText('try_different_search')}
                    />
                  </div>
                </TabPane>
                
                {/* Comments Tab */}
                <TabPane 
                  tab={
                    <span className="modern-tab">
                      <CommentOutlined className="tab-icon" />
                      {getText('comments_tab')}
                    </span>
                  } 
                  key="comments"
                >
                  <div className="modern-section">
                    <div className="modern-section-header">
                      <div className="section-header-icon">
                        <CommentOutlined />
                      </div>
                      <div className="section-header-text">
                        <h2>{getText('comments_title')}</h2>
                        <p>{getText('comments_subtitle')}</p>
                      </div>
                    </div>
                    
                    {comments.length === 0 && (
                      <Alert
                        message={getText('select_post_first')}
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
                    
                    {comments.length > 0 && (
                      <div className="modern-stats-container">
                        <Card className="modern-stat-card">
                          <div className="stat-icon" style={{ color: '#1890ff' }}>
                            <CommentOutlined style={{ fontSize: '24px' }} />
                          </div>
                          <p className="stat-value" style={{ color: '#1890ff' }}>{comments.length}</p>
                          <p className="stat-title">{getText('total_comments')}</p>
                        </Card>
                        
                        <Card className="modern-stat-card">
                          <div className="stat-icon" style={{ color: '#f5222d' }}>
                            <LikeOutlined style={{ fontSize: '24px' }} />
                          </div>
                          <p className="stat-value" style={{ color: '#f5222d' }}>
                            {comments.reduce((sum, comment) => sum + (comment.like_count || 0), 0)}
                          </p>
                          <p className="stat-title">{getText('total_likes')}</p>
                        </Card>
                        
                        <Card className="modern-stat-card">
                          <div className="stat-icon" style={{ color: '#faad14' }}>
                            <StarFilled style={{ fontSize: '24px' }} />
                          </div>
                          <p className="stat-value" style={{ color: '#faad14' }}>
                            {favorites.comments?.length || 0}
                          </p>
                          <p className="stat-title">{getText('favorite_comments')}</p>
                        </Card>
                      </div>
                    )}
                    
                    <div className="modern-action-bar">
                      <Button
                        className="modern-export-button"
                        icon={<FileExcelOutlined />}
                        onClick={() => exportToExcel(
                          filters.comments?.onlyFavorites 
                            ? favorites.comments
                            : comments,
                          'facebook_comments', 
                          'comments'
                        )}
                        disabled={comments.length === 0}
                      >
                        {getText('export_excel')}
                      </Button>
                    </div>
                    
                    <CardGrid
                      entities={comments}
                      entityType="comment"
                      isLoading={loadingComments}
                      onEntityAction={() => {}}
                      favorites={favorites.comments}
                      onToggleFavorite={(comment) => toggleFavorite('comment', comment)}
                      filters={filters.comments}
                      setFilters={(newFilters) => setFilters({ ...filters, comments: newFilters })}
                      cardsPerPage={12}
                      emptyText={comments.length === 0 ? getText('no_comments_found') : getText('no_matching_comments')}
                      emptyDescription={comments.length === 0 ? getText('select_post_for_comments') : getText('try_different_search')}
                    />
                  </div>
                </TabPane>
                
                {/* Reactions Tab */}
                <TabPane 
                  tab={
                    <span className="modern-tab">
                      <LikeOutlined className="tab-icon" />
                      {getText('reactions_tab')}
                    </span>
                  } 
                  key="reactions"
                >
                  <div className="modern-section">
                    <div className="modern-section-header">
                      <div className="section-header-icon">
                        <LikeOutlined />
                      </div>
                      <div className="section-header-text">
                        <h2>{getText('reactions_title')}</h2>
                        <p>{getText('reactions_subtitle')}</p>
                      </div>
                    </div>
                    
                    {reactions.length === 0 && (
                      <Alert
                        message={getText('select_post_reactions')}
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
                    
                    {reactions.length > 0 && (
                      <div className="modern-stats-container">
                        <Card className="modern-stat-card">
                          <div className="stat-icon" style={{ color: '#1890ff' }}>
                            <LikeOutlined style={{ fontSize: '24px' }} />
                          </div>
                          <p className="stat-value" style={{ color: '#1890ff' }}>{reactions.length}</p>
                          <p className="stat-title">{getText('total_reactions')}</p>
                        </Card>
                        
                        <Card className="modern-stat-card">
                          <div className="stat-icon" style={{ color: '#f5222d' }}>
                            <HeartOutlined style={{ fontSize: '24px' }} />
                          </div>
                          <p className="stat-value" style={{ color: '#f5222d' }}>
                            {reactions.filter(r => r.type === 'LOVE').length}
                          </p>
                          <p className="stat-title">{getText('love_reactions')}</p>
                        </Card>
                        
                        <Card className="modern-stat-card">
                          <div className="stat-icon" style={{ color: '#faad14' }}>
                            <StarFilled style={{ fontSize: '24px' }} />
                          </div>
                          <p className="stat-value" style={{ color: '#faad14' }}>
                            {favorites.reactions?.length || 0}
                          </p>
                          <p className="stat-title">{getText('favorite_reactions')}</p>
                        </Card>
                      </div>
                    )}
                    
                    <div className="modern-action-bar">
                      <Button
                        className="modern-export-button"
                        icon={<FileExcelOutlined />}
                        onClick={() => exportToExcel(
                          filters.reactions?.onlyFavorites 
                            ? favorites.reactions
                            : reactions,
                          'facebook_reactions', 
                          'reactions'
                        )}
                        disabled={reactions.length === 0}
                      >
                        {getText('export_excel')}
                      </Button>
                    </div>
                    
                    <CardGrid
                      entities={reactions}
                      entityType="reaction"
                      isLoading={loadingReactions}
                      onEntityAction={() => {}}
                      favorites={favorites.reactions}
                      onToggleFavorite={(reaction) => toggleFavorite('reaction', reaction)}
                      filters={filters.reactions}
                      setFilters={(newFilters) => setFilters({ ...filters, reactions: newFilters })}
                      cardsPerPage={12}
                      emptyText={reactions.length === 0 ? getText('no_reactions_found') : getText('no_matching_reactions')}
                      emptyDescription={reactions.length === 0 ? getText('select_post_for_reactions') : getText('try_different_search')}
                    />
                  </div>
                </TabPane>
              </Tabs>
              
              {/* Preview Modal */}
              <Modal
                title={getText('preview_modal_title')}
                open={previewVisible}
                onCancel={() => setPreviewVisible(false)}
                footer={[
                  <Button key="close" onClick={() => setPreviewVisible(false)} className="modern-modal-button close">
                    {getText('close')}
                  </Button>
                ]}
                width={500}
                className="modern-preview-modal"
              >
                {previewPost && (
                  <ContentPreview
                    type={previewPost.type === 'photo' ? 'image' : previewPost.type === 'video' ? 'video' : 'text'}
                    content={previewPost.message}
                    image={previewPost.imageUrl}
                    video={previewPost.videoUrl}
                  />
                )}
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
                    <span className="title-text">{currentPage?.name || getText('page_details_title')}</span>
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
                      {getText('open_page')}
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
                            <UserOutlined /> {getText('page_followers_count', { count: currentPage.fan_count || 0 })}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <Divider className="details-divider" />
                    
                    <div className="details-section">
                      <Title level={5} className="section-title">{getText('page_info_section')}</Title>
                      <Card className="details-card details-grid">
                        <div className="detail-item">
                          <span className="detail-label">{getText('page_id_label')}</span>
                          <div className="detail-value-with-copy">
                            <span className="detail-value">{currentPage.pageId}</span>
                            <Button
                              type="text"
                              size="small"
                              icon={<CopyOutlined />}
                              className="copy-button"
                              onClick={() => copyToClipboard(currentPage.pageId, getText('copy_page_id'))}
                            />
                          </div>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">{getText('page_category_label')}</span>
                          <span className="detail-value">{currentPage.category}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">{getText('page_followers_label')}</span>
                          <span className="detail-value followers">{currentPage.fan_count || 0}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">{getText('page_extraction_date_label')}</span>
                          <span className="detail-value date">{moment(currentPage.extractedAt).format('YYYY-MM-DD HH:mm:ss')}</span>
                        </div>
                      </Card>
                    </div>
                    
                    <div className="details-section">
                      <Title level={5} className="section-title">{getText('access_token_section')}</Title>
                      <Alert
                        message={getText('token_alert_title')}
                        description={getText('token_alert_desc')}
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                      />
                      <Card className="details-card">
                        <div className="detail-item">
                          <span className="detail-label">{getText('page_token_label')}</span>
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
                              {currentPage.access_token ? currentPage.access_token.substring(0, 15) + '...' : getText('no_token_available')}
                            </span>
                            <Button
                              type="text"
                              icon={<CopyOutlined />}
                              className="copy-button"
                              onClick={() => copyToClipboard(currentPage.access_token, getText('copy_page_token'))}
                              disabled={!currentPage.access_token}
                            >
                              {getText('copy_page_token')}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </div>
                    
                    <div className="actions-section">
                      <Button
                        type="primary"
                        icon={<FileTextOutlined />}
                        className="action-button extract-posts"
                        onClick={() => {
                          setPageId(currentPage.pageId);
                          setPageName(currentPage.name);
                          setActiveTab('posts');
                          setPageDetailsVisible(false);
                          fetchPagePosts(currentPage.pageId, currentPage.access_token);
                        }}
                      >
                        {getText('extract_posts_action')}
                      </Button>
                    </div>
                  </div>
                )}
              </Drawer>
            </div>
          </Content>
        </Layout>
      )}
    </ContentContainer>
  );
};

export default PostManagement;