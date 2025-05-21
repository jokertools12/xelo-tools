import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, List, Avatar, Typography, Tag, Space, Input,
  Badge, Button, Empty, Tooltip, Skeleton, Divider,
  Collapse, Checkbox, Radio, Spin, Alert
} from 'antd';
import { 
  SearchOutlined, TeamOutlined, UserOutlined, 
  DeleteOutlined, CheckOutlined, CloseOutlined,
  InfoCircleOutlined, FilterOutlined, AppstoreOutlined,
  BarsOutlined, SmileOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import { useLanguage } from '../../context/LanguageContext';
import VirtualList from 'rc-virtual-list';
import './SelectedRecipientsDisplay.css';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { Search } = Input;

// Container height for virtual list
const CONTAINER_HEIGHT = 300;
// Single item height for virtual list calculations
const ITEM_HEIGHT = 48;

/**
 * Enhanced component for displaying and managing selected recipients
 * with optimizations for large recipient lists
 */
const SelectedRecipientsDisplay = ({
  recipients = [],
  selectedRecipients = [],
  onSelectRecipient,
  onSelectAll,
  onClearAll,
  loading = false,
  viewMode = 'compact',
  onViewModeChange,
  showCheckboxes = true,
  maxHeight,
  title,
  enableDelay = false,
  delayMode = 'fixed',
  delaySeconds = 5,
  minDelaySeconds = 3,
  maxDelaySeconds = 10,
  incrementalDelayStart = 3,
  incrementalDelayStep = 2
}) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [displayedRecipients, setDisplayedRecipients] = useState([]);
  const [groupBy, setGroupBy] = useState('none');
  const [recipientGroups, setRecipientGroups] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState([]);
  
  // Generate consistent color from identifier (id or name)
  const generateConsistentColor = (identifier) => {
    if (!identifier) return '#1890ff';
    
    // Simple hash function for better color distribution
    const hash = identifier.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    // Generate HSL color with fixed saturation and lightness for pleasant pastel colors
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 65%)`;
  };
  
  // Get first letter for avatar fallback
  const getInitial = (name) => {
    return name && name.length > 0 ? name.charAt(0).toUpperCase() : '?';
  };
  
  // Filter recipients based on search term
  useEffect(() => {
    if (!recipients) return;
    
    if (!searchTerm) {
      setDisplayedRecipients(recipients);
    } else {
      const filtered = recipients.filter(
        recipient => recipient.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setDisplayedRecipients(filtered);
    }
  }, [recipients, searchTerm]);
  
  // Group recipients based on the groupBy setting
  useEffect(() => {
    if (!displayedRecipients.length) {
      setRecipientGroups([]);
      return;
    }
    
    if (groupBy === 'none') {
      setRecipientGroups([{ title: '', data: displayedRecipients }]);
      return;
    }
    
    if (groupBy === 'selection') {
      // Create two groups: selected and unselected
      const selectedIds = new Set(selectedRecipients.map(r => r.id));
      const selected = displayedRecipients.filter(r => selectedIds.has(r.id));
      const unselected = displayedRecipients.filter(r => !selectedIds.has(r.id));
      
      const groups = [];
      if (selected.length) {
        groups.push({ 
          title: t('pageMessages:recipients.selected', 'Selected'),
          key: 'selected',
          data: selected 
        });
      }
      
      if (unselected.length) {
        groups.push({ 
          title: t('pageMessages:recipients.notSelected', 'Not Selected'),
          key: 'unselected',
          data: unselected 
        });
      }
      
      setRecipientGroups(groups);
      setExpandedGroups(['selected']); // Auto-expand the selected group
      return;
    }
    
    if (groupBy === 'alphabetical') {
      // Group by first letter of name
      const groups = {};
      
      displayedRecipients.forEach(recipient => {
        const firstLetter = recipient.name.charAt(0).toUpperCase();
        if (!groups[firstLetter]) {
          groups[firstLetter] = [];
        }
        groups[firstLetter].push(recipient);
      });
      
      const result = Object.keys(groups).sort().map(key => ({
        title: key,
        key: key,
        data: groups[key]
      }));
      
      setRecipientGroups(result);
      setExpandedGroups(Object.keys(groups)); // Expand all alphabet groups
      return;
    }
  }, [displayedRecipients, groupBy, selectedRecipients, t]);
  
  // Check if a recipient is selected
  const isSelected = useCallback((recipient) => {
    return selectedRecipients.some(r => r.id === recipient.id);
  }, [selectedRecipients]);
  
  // Handle expanding/collapsing of groups
  const handleCollapseChange = (keys) => {
    setExpandedGroups(keys);
  };
  
  // Handle selection of all visible recipients
  const handleSelectAll = () => {
    if (onSelectAll) {
      onSelectAll(displayedRecipients);
    }
  };
  
  // Handle clearing all selections
  const handleClearAll = () => {
    if (onClearAll) {
      onClearAll();
    }
  };
  
  // Handle selection of a recipient
  const handleRecipientClick = (recipient) => {
    if (onSelectRecipient) {
      onSelectRecipient(recipient);
    }
  };
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((e, recipient) => {
    // Enter or Space to select
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleRecipientClick(recipient);
    }
  }, [handleRecipientClick]);

  // Calculate estimated time for sending with delay
  const calculateEstimatedTime = () => {
    if (!selectedRecipients.length || !enableDelay) return 0;
    
    let totalSeconds = 0;
    
    if (delayMode === 'fixed') {
      totalSeconds = (selectedRecipients.length - 1) * delaySeconds;
    } else if (delayMode === 'random') {
      const avgDelay = (minDelaySeconds + maxDelaySeconds) / 2;
      totalSeconds = (selectedRecipients.length - 1) * avgDelay;
    } else if (delayMode === 'incremental') {
      // Sum of arithmetic progression: n(a + l)/2 where l = a + (n-1)d
      const n = selectedRecipients.length - 1;
      const lastDelay = incrementalDelayStart + (n - 1) * incrementalDelayStep;
      totalSeconds = n * (incrementalDelayStart + lastDelay) / 2;
    }
    
    return totalSeconds;
  };
  
  // Format seconds into human-readable format
  const formatTime = (totalSeconds) => {
    if (totalSeconds === 0) return '0s';
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.round(totalSeconds % 60);
    
    let formattedTime = '';
    
    if (hours > 0) {
      formattedTime += `${hours}${t('common:hours', 'h')} `;
    }
    
    if (minutes > 0 || hours > 0) {
      formattedTime += `${minutes}${t('common:minutes', 'm')} `;
    }
    
    formattedTime += `${seconds}${t('common:seconds', 's')}`;
    
    return formattedTime;
  };
  
  // Estimated time to complete sending
  const estimatedTime = useMemo(() => {
    const totalSeconds = calculateEstimatedTime();
    return formatTime(totalSeconds);
  }, [
    selectedRecipients.length, 
    enableDelay, 
    delayMode, 
    delaySeconds, 
    minDelaySeconds, 
    maxDelaySeconds, 
    incrementalDelayStart, 
    incrementalDelayStep
  ]);
  
  // Render a single recipient item
  const renderRecipientItem = (recipient) => {
    const selected = isSelected(recipient);
    const shortId = recipient.id ? `${recipient.id.substring(0, 8)}...` : '';
    
    if (viewMode === 'compact') {
      return (
        <div 
          className={`recipient-item ${selected ? 'selected' : ''}`}
          onClick={() => handleRecipientClick(recipient)}
          onKeyDown={(e) => handleKeyDown(e, recipient)}
          tabIndex={0}
          role="checkbox"
          aria-checked={selected}
          aria-label={`${recipient.name} ${selected ? t('pageMessages:sendersList.selected', 'Selected') : ''}`}
        >
          <div className="recipient-content">
            <div className="recipient-info">
              {showCheckboxes && (
                <Checkbox 
                  checked={selected}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRecipientClick(recipient);
                  }}
                  aria-hidden="true"
                />
              )}
              <Avatar
                size="small"
                className="recipient-avatar"
                style={{ backgroundColor: generateConsistentColor(recipient.id || recipient.name) }}
              >
                {getInitial(recipient.name)}
              </Avatar>
              <Text className="recipient-name" ellipsis>
                {recipient.name}
              </Text>
            </div>
            
            {selected && (
              <Tag color="blue" className="selected-tag">
                <CheckOutlined /> {t('pageMessages:sendersList.selected', 'Selected')}
              </Tag>
            )}
          </div>
        </div>
      );
    } else {
      // Detailed view
      return (
        <div 
          className={`recipient-item detailed ${selected ? 'selected' : ''}`}
          onClick={() => handleRecipientClick(recipient)}
          onKeyDown={(e) => handleKeyDown(e, recipient)}
          tabIndex={0}
          role="checkbox"
          aria-checked={selected}
          aria-label={`${recipient.name} ${selected ? t('pageMessages:sendersList.selected', 'Selected') : ''}`}
        >
          <div className="recipient-content">
            <div className="recipient-info-container">
              {showCheckboxes && (
                <Checkbox 
                  checked={selected}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRecipientClick(recipient);
                  }}
                  aria-hidden="true"
                />
              )}
              <Avatar
                size={40}
                className="recipient-avatar"
                style={{ backgroundColor: generateConsistentColor(recipient.id || recipient.name) }}
              >
                {getInitial(recipient.name)}
              </Avatar>
              <div className="recipient-details">
                <Text className="recipient-name" strong ellipsis>
                  {recipient.name}
                </Text>
                <Text type="secondary" className="recipient-id">
                  ID: {shortId}
                </Text>
              </div>
            </div>
            
            {selected && (
              <Tag color="blue" className="selected-tag">
                <CheckOutlined /> {t('pageMessages:sendersList.selected', 'Selected')}
              </Tag>
            )}
          </div>
        </div>
      );
    }
  };
  
  // Render a group of recipients with virtualization
  const renderRecipientGroup = (group, index) => {
    if (!group?.data?.length) return null;
    
    const selectedCount = group.data.filter(recipient => isSelected(recipient)).length;
    const allSelected = selectedCount === group.data.length && group.data.length > 0;
    
    return (
      <div className="recipient-group" key={`group-${index}`}>
        {group.title && (
          <div className="group-header" 
            role="heading" 
            aria-level={3}
          >
            <div className="group-title">
              <Text strong>{group.title}</Text>
              <Badge
                count={`${selectedCount}/${group.data.length}`}
                style={{ 
                  backgroundColor: selectedCount > 0 ? '#1890ff' : '#d9d9d9'
                }}
              />
            </div>
            
            <div className="group-actions">
              <Button
                type="text"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  // Select or deselect all in this group
                  if (allSelected) {
                    // Deselect all in this group
                    const groupIds = new Set(group.data.map(r => r.id));
                    onClearAll(selectedRecipients.filter(r => !groupIds.has(r.id)));
                  } else {
                    // Add all from this group
                    const currentSelectedIds = new Set(selectedRecipients.map(r => r.id));
                    const newSelected = [...selectedRecipients];
                    
                    group.data.forEach(recipient => {
                      if (!currentSelectedIds.has(recipient.id)) {
                        newSelected.push(recipient);
                      }
                    });
                    
                    onSelectAll(newSelected);
                  }
                }}
                aria-label={allSelected
                  ? t('pageMessages:sendersList.deselectAll', 'Deselect All')
                  : t('pageMessages:sendersList.selectAll', 'Select All')}
              >
                {allSelected
                  ? t('pageMessages:sendersList.deselectAll', 'Deselect All')
                  : t('pageMessages:sendersList.selectAll', 'Select All')}
              </Button>
            </div>
          </div>
        )}
        
        <div className="recipients-list" role="list" aria-label={group.title || t('pageMessages:recipients.list', 'Recipients List')}>
          <VirtualList
            data={group.data}
            height={Math.min(CONTAINER_HEIGHT, group.data.length * ITEM_HEIGHT)}
            itemHeight={ITEM_HEIGHT}
            itemKey="id"
          >
            {(recipient) => renderRecipientItem(recipient)}
          </VirtualList>
        </div>
      </div>
    );
  };
  
  // Render recipients with collapsed groups
  const renderCollapsedGroups = () => {
    if (recipientGroups.length === 1 && !recipientGroups[0].title) {
      // If there's only one unnamed group, render directly
      return renderRecipientGroup(recipientGroups[0], 0);
    }
    
    return (
      <Collapse 
        activeKey={expandedGroups}
        onChange={handleCollapseChange}
        bordered={false}
        className="recipients-collapse"
      >
        {recipientGroups.map((group, index) => (
          <Panel 
            key={group.key || `group-${index}`}
            header={
              <Space>
                <span>{group.title}</span>
                <Badge 
                  count={group.data.length} 
                  style={{ backgroundColor: group.data.length ? '#1890ff' : '#d9d9d9' }}
                />
              </Space>
            }
          >
            {renderRecipientGroup(group, index)}
          </Panel>
        ))}
      </Collapse>
    );
  };
  
  // Render the selected recipients overview (avatars)
  const renderSelectedRecipientsPreviews = () => {
    if (!selectedRecipients.length) return null;
    
    return (
      <div 
        className="selected-recipients-preview"
        aria-live="polite"
        aria-atomic="true"
      >
        <Divider orientation="left" plain>
          <Space>
            <CheckOutlined />
            {t('pageMessages:sendersList.selectedCountMessage', { 
              count: selectedRecipients.length 
            }, `${selectedRecipients.length} Recipients Selected`)}
          </Space>
        </Divider>
        
        <div className="avatar-list" role="region" aria-label={t('pageMessages:sendersList.selectedRecipients', 'Selected Recipients')}>
          {selectedRecipients.slice(0, 8).map(recipient => (
            <Tooltip title={recipient.name} key={recipient.id}>
              <Avatar 
                size="small"
                className="selected-recipient-avatar"
                style={{ backgroundColor: generateConsistentColor(recipient.id || recipient.name) }}
                onClick={() => handleRecipientClick(recipient)}
                aria-label={recipient.name}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleRecipientClick(recipient);
                  }
                }}
              >
                {getInitial(recipient.name)}
              </Avatar>
            </Tooltip>
          ))}
          
          {selectedRecipients.length > 8 && (
            <Tooltip title={`${selectedRecipients.length - 8} more recipients`}>
              <Avatar 
                size="small" 
                className="more-recipients-avatar"
                aria-label={`${selectedRecipients.length - 8} more recipients`}
              >
                +{selectedRecipients.length - 8}
              </Avatar>
            </Tooltip>
          )}
        </div>

        {/* Display estimated time if delay is enabled and there are multiple recipients */}
        {enableDelay && selectedRecipients.length > 1 && (
          <Alert
            message={
              <Space>
                <ClockCircleOutlined /> 
                {t('pageMessages:campaigns.estimatedSendingTime', 'Estimated sending time')}: {estimatedTime}
              </Space>
            }
            type="info"
            showIcon={false}
            style={{ marginTop: 16, borderRadius: '8px' }}
          />
        )}
      </div>
    );
  };
  
  // Main component render
  return (
    <div className="selected-recipients-display" role="region" aria-label={title || t('pageMessages:composer.recipients', 'Recipients')}>
      <Card
        title={
          <Space>
            <TeamOutlined />
            {title || t('pageMessages:composer.recipients', 'Recipients')}
            <Badge 
              count={selectedRecipients.length} 
              style={{ backgroundColor: selectedRecipients.length ? '#1890ff' : '#d9d9d9' }}
              overflowCount={999}
            />
          </Space>
        }
        extra={
          <Space>
            <Radio.Group
              value={viewMode}
              onChange={e => onViewModeChange && onViewModeChange(e.target.value)}
              size="small"
              buttonStyle="solid"
              aria-label={t('pageMessages:recipients.viewMode', 'View Mode')}
            >
              <Radio.Button value="compact">
                <Tooltip title={t('pageMessages:recipients.compactView', 'Compact View')}>
                  <BarsOutlined />
                </Tooltip>
              </Radio.Button>
              <Radio.Button value="detailed">
                <Tooltip title={t('pageMessages:recipients.detailedView', 'Detailed View')}>
                  <AppstoreOutlined />
                </Tooltip>
              </Radio.Button>
            </Radio.Group>
          </Space>
        }
        className="recipients-card"
        bodyStyle={{ 
          padding: '16px', 
          maxHeight: maxHeight || 'none',
          overflow: 'auto'
        }}
      >
        {loading ? (
          <div className="loading-container">
            <Spin size="medium" />
            <Paragraph style={{ marginTop: 12 }}>
              {t('pageMessages:sendersList.loading', 'Loading recipients...')}
            </Paragraph>
          </div>
        ) : (
          <>
            {/* Search and action buttons */}
            <div className="recipients-header">
              <Search
                placeholder={t('pageMessages:sendersList.searchPlaceholder', 'Search recipients...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-box"
                allowClear
                prefix={<SearchOutlined />}
                aria-label={t('pageMessages:sendersList.searchPlaceholder', 'Search recipients...')}
              />
              
              <div className="action-buttons">
                <Button
                  type="primary"
                  size="small"
                  onClick={handleSelectAll}
                  disabled={!recipients.length}
                  aria-label={t('pageMessages:sendersList.selectAll', 'Select All')}
                >
                  {t('pageMessages:sendersList.selectAll', 'Select All')}
                </Button>
                <Button
                  danger
                  size="small"
                  onClick={handleClearAll}
                  disabled={!selectedRecipients.length}
                  aria-label={t('pageMessages:sendersList.clearAll', 'Clear All')}
                >
                  {t('pageMessages:sendersList.clearAll', 'Clear All')}
                </Button>
              </div>
            </div>
            
            {/* Grouping options */}
            <div className="grouping-options" role="radiogroup" aria-label={t('pageMessages:recipients.groupBy', 'Group by')}>
              <div className="group-by-label">
                <Text type="secondary">{t('pageMessages:recipients.groupBy', 'Group by')}:</Text>
              </div>
              <Radio.Group 
                value={groupBy} 
                onChange={e => setGroupBy(e.target.value)}
                size="small"
                buttonStyle="solid"
              >
                <Radio.Button value="none">
                  {t('pageMessages:recipients.noGrouping', 'No Grouping')}
                </Radio.Button>
                <Radio.Button value="selection">
                  {t('pageMessages:recipients.bySelection', 'By Selection')}
                </Radio.Button>
                <Radio.Button value="alphabetical">
                  {t('pageMessages:recipients.alphabetical', 'Alphabetical')}
                </Radio.Button>
              </Radio.Group>
            </div>
            
            {/* Selected recipients preview */}
            {renderSelectedRecipientsPreviews()}
            
            {/* Recipients list */}
            <div className="recipients-container">
              {!recipients.length ? (
                <div className="empty-container">
                  <Empty 
                    image={Empty.PRESENTED_IMAGE_SIMPLE} 
                    description={t('pageMessages:sendersList.noRecipients', 'No recipients available')}
                  />
                  <Paragraph type="secondary">
                    <InfoCircleOutlined /> {t('pageMessages:sendersList.extractRecipientsHint', 'Extract recipients from your page first')}
                  </Paragraph>
                </div>
              ) : !displayedRecipients.length ? (
                <div className="empty-container">
                  <Empty 
                    image={Empty.PRESENTED_IMAGE_SIMPLE} 
                    description={t('pageMessages:sendersList.noMatchingRecipients', 'No matching recipients')}
                  />
                  <Text type="secondary">
                    <SmileOutlined /> {t('pageMessages:sendersList.tryDifferentSearch', 'Try a different search term')}
                  </Text>
                </div>
              ) : (
                renderCollapsedGroups()
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default SelectedRecipientsDisplay;