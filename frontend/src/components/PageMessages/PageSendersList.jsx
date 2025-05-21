import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Button, List, Alert, Tag, 
  Spin, Input, Tooltip, Typography, Space, 
  Divider, Checkbox, Badge, Avatar, Tabs,
  Select, Empty, Segmented, Collapse, Switch
} from 'antd';
import './PageSendersList.css';
import { 
  TeamOutlined, SyncOutlined, CheckOutlined, SearchOutlined, 
  InfoCircleOutlined, WarningOutlined, UserOutlined,
  ClockCircleOutlined, AppstoreOutlined, BarsOutlined,
  FilterOutlined, DownOutlined, UpOutlined, MailOutlined,
  EyeOutlined, EyeInvisibleOutlined, ApartmentOutlined
} from '@ant-design/icons';
import { useLanguage } from '../../context/LanguageContext';
import VirtualList from 'rc-virtual-list';

const { Text, Paragraph, Title } = Typography;
const { Item } = List;
const { Search } = Input;
const { Option } = Select;
const { Panel } = Collapse;
const { TabPane } = Tabs;

// Container height for virtual list
const CONTAINER_HEIGHT = 400;
// Single item height estimation for virtual list calculations
const ITEM_HEIGHT = 65;

const PageSendersList = ({
  selectedPage,
  pageSenders,
  selectedSenders,
  onExtractSenders,
  onSendersChange,
  isLoading
}) => {
  const { t, currentLanguage } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [displayMode, setDisplayMode] = useState('list'); // 'list' or 'grid'
  const [viewMode, setViewMode] = useState('compact'); // 'compact' or 'detailed'
  const [activeGroup, setActiveGroup] = useState(null);
  const [advancedFiltersVisible, setAdvancedFiltersVisible] = useState(false);
  const [groupBy, setGroupBy] = useState('none'); // 'none', 'alphabetical', 'recent'
  
  // Generate a color based on the recipient's name for consistent avatar colors
  const generateAvatarColor = (name) => {
    if (!name) return '#1890ff';
    
    // Simple hash function for the name
    const hash = name.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    // Convert to hex color
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      color += ('00' + value.toString(16)).substr(-2);
    }
    
    return color;
  };
  
  // Get first letter for avatar fallback
  const getInitial = (name) => {
    return name && name.length > 0 ? name.charAt(0).toUpperCase() : '?';
  };
  
  // Generate recipient groups based on the groupBy setting
  const getRecipientGroups = useCallback(() => {
    if (!pageSenders.length) return [];
    
    // Filter senders based on search term
    const filtered = pageSenders.filter(sender => 
      sender.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sender.id && sender.id.toString().includes(searchTerm))
    );
    
    if (groupBy === 'none') {
      return [{ title: '', data: filtered }];
    } else if (groupBy === 'alphabetical') {
      // Group by first letter
      const groups = {};
      
      filtered.forEach(sender => {
        const firstLetter = sender.name.charAt(0).toUpperCase();
        if (!groups[firstLetter]) {
          groups[firstLetter] = [];
        }
        groups[firstLetter].push(sender);
      });
      
      return Object.keys(groups).sort().map(key => ({
        title: key,
        data: groups[key]
      }));
    } else if (groupBy === 'recent') {
      // Simulate grouping by recency (last 7 days, last 30 days, older)
      // In a real implementation, this would use actual timestamp data
      
      // For demonstration, we'll divide the list into three parts
      const total = filtered.length;
      const recent = filtered.slice(0, Math.floor(total * 0.25));
      const midRecent = filtered.slice(Math.floor(total * 0.25), Math.floor(total * 0.6));
      const older = filtered.slice(Math.floor(total * 0.6));
      
      return [
        { title: t('recentDays', { days: 7 }, 'Last 7 days'), data: recent },
        { title: t('recentDays', { days: 30 }, 'Last 30 days'), data: midRecent },
        { title: t('olderMessages', 'Older'), data: older }
      ].filter(group => group.data.length > 0);
    }
    
    return [{ title: '', data: filtered }];
  }, [pageSenders, searchTerm, groupBy, t]);
  
  const recipientGroups = getRecipientGroups();
  
  // Flatten all recipients for selection operations
  const allFilteredRecipients = recipientGroups.reduce(
    (acc, group) => [...acc, ...group.data], 
    []
  );
  
  // Handle extraction of page senders
  const handleExtractSenders = () => {
    if (!selectedPage) return;
    onExtractSenders();
  };
  
  // Handle selection of a sender
  const handleSenderSelection = (sender) => {
    const isSelected = selectedSenders.some(s => s.id === sender.id);
    
    if (isSelected) {
      // Remove sender from selected list
      onSendersChange(selectedSenders.filter(s => s.id !== sender.id));
    } else {
      // Add sender to selected list
      onSendersChange([...selectedSenders, sender]);
    }
  };
  
  // Handle selection of all visible senders
  const handleSelectAll = () => {
    if (selectedSenders.length === allFilteredRecipients.length) {
      // If all are selected, deselect all
      onSendersChange([]);
    } else {
      // Combine current selections with all filtered recipients
      const currentSelectedIds = new Set(selectedSenders.map(s => s.id));
      const newSelectedSenders = [...selectedSenders];
      
      allFilteredRecipients.forEach(sender => {
        if (!currentSelectedIds.has(sender.id)) {
          newSelectedSenders.push(sender);
        }
      });
      
      onSendersChange(newSelectedSenders);
    }
  };
  
  // Handle selection of all senders in a specific group
  const handleSelectGroup = (groupData) => {
    const groupIds = new Set(groupData.map(s => s.id));
    const isAllSelected = groupData.every(s => selectedSenders.some(selected => selected.id === s.id));
    
    if (isAllSelected) {
      // Deselect all in this group
      onSendersChange(selectedSenders.filter(s => !groupIds.has(s.id)));
    } else {
      // Add all from this group that aren't already selected
      const currentSelectedIds = new Set(selectedSenders.map(s => s.id));
      const newSelectedSenders = [...selectedSenders];
      
      groupData.forEach(sender => {
        if (!currentSelectedIds.has(sender.id)) {
          newSelectedSenders.push(sender);
        }
      });
      
      onSendersChange(newSelectedSenders);
    }
  };

  // Render a single recipient item
  const renderRecipientItem = (sender, index, isSelected) => {
    // Create a short formatted ID for display
    const shortId = sender.id.substring(0, 8) + '...';
    
    if (viewMode === 'compact') {
      return (
        <Item
          key={sender.id}
          onClick={() => handleSenderSelection(sender)}
          className={`recipient-item compact ${isSelected ? 'selected' : ''}`}
        >
          <div className="recipient-content">
            <div className="recipient-info-container">
              <Checkbox 
                checked={isSelected}
                style={{ marginRight: 10 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSenderSelection(sender);
                }}
              />
              <Avatar 
                size="small" 
                className="recipient-avatar"
                style={{ backgroundColor: generateAvatarColor(sender.name) }}
              >
                {getInitial(sender.name)}
              </Avatar>
              <Text 
                className="recipient-name"
                style={{ fontWeight: isSelected ? 'bold' : 'normal' }}
              >
                {sender.name}
              </Text>
            </div>
            {isSelected && (
              <Tag color="blue" style={{ marginLeft: 8, fontSize: '11px' }}>
                <CheckOutlined style={{ fontSize: '10px' }} /> {t('pageMessages:sendersList.selected', 'Selected')}
              </Tag>
            )}
          </div>
        </Item>
      );
    } else {
      // Detailed view with more information
      return (
        <Item
          key={sender.id}
          onClick={() => handleSenderSelection(sender)}
          className={`recipient-item detailed ${isSelected ? 'selected' : ''}`}
        >
          <div className="recipient-content">
            <div className="recipient-checkbox">
              <Checkbox 
                checked={isSelected}
                style={{ marginRight: 8 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSenderSelection(sender);
                }}
              />
            </div>
            <Avatar 
              size={40}
              className="recipient-avatar"
              style={{ backgroundColor: generateAvatarColor(sender.name) }}
            >
              {getInitial(sender.name)}
            </Avatar>
            <div className="recipient-info">
              <div className="recipient-info-header">
                <Text 
                  strong
                  className="recipient-name"
                  style={{ fontWeight: isSelected ? 'bold' : 'normal' }}
                >
                  {sender.name}
                </Text>
                {isSelected && (
                  <Tag color="blue" style={{ marginLeft: 8, fontSize: '11px' }}>
                    <CheckOutlined style={{ fontSize: '10px' }} /> {t('pageMessages:sendersList.selected', 'Selected')}
                  </Tag>
                )}
              </div>
              <div className="recipient-meta">
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  ID: {shortId}
                </Text>
                {/* We can add more info here if available, like last message date */}
              </div>
            </div>
          </div>
        </Item>
      );
    }
  };
  
  // Render a group of recipients
  const renderRecipientGroup = (group, index) => {
    const groupTitle = group.title;
    const isAllSelected = group.data.every(sender => 
      selectedSenders.some(s => s.id === sender.id)
    );
    const hasAnySelected = group.data.some(sender => 
      selectedSenders.some(s => s.id === sender.id)
    );
    
    // For alphabetical groups, skip title for empty strings
    if (groupBy === 'alphabetical' && !groupTitle) {
      return renderRecipientList(group.data);
    }
    
    return (
      <div key={`group-${index}`} className="recipient-group" style={{ marginBottom: 16 }}>
        {groupTitle && (
          <div className="group-header">
            <Text strong className="group-title">{groupTitle}</Text>
            <Space className="group-actions">
              <Badge 
                count={`${group.data.filter(sender => 
                  selectedSenders.some(s => s.id === sender.id)
                ).length}/${group.data.length}`}
                style={{ backgroundColor: hasAnySelected ? '#1890ff' : '#d9d9d9' }}
              />
              <Button
                type="text"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectGroup(group.data);
                }}
              >
                {isAllSelected 
                  ? t('pageMessages:sendersList.deselectAll', 'Deselect All')
                  : t('pageMessages:sendersList.selectAll', 'Select All')
                }
              </Button>
            </Space>
          </div>
        )}
        {renderRecipientList(group.data)}
      </div>
    );
  };
  
  // Render the list of recipients with virtualization
  const renderRecipientList = (recipients) => {
    if (!recipients.length) {
      return null;
    }
    
    return (
      <List>
        <VirtualList
          data={recipients}
          height={Math.min(CONTAINER_HEIGHT, recipients.length * ITEM_HEIGHT)}
          itemHeight={ITEM_HEIGHT}
          itemKey="id"
          onScroll={() => {}}
        >
          {(sender) => {
            const isSelected = selectedSenders.some(s => s.id === sender.id);
            return renderRecipientItem(sender, sender.id, isSelected);
          }}
        </VirtualList>
      </List>
    );
  };
  
  // Render all recipients with grouping
  const renderRecipients = () => {
    if (!pageSenders.length) {
      return (
        <Alert
          type="info"
          message={
            <Space>
              <InfoCircleOutlined />
              {t('pageMessages:sendersList.noSenders')}
            </Space>
          }
        />
      );
    }
    
    if (allFilteredRecipients.length === 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('pageMessages:sendersList.noMatchingSenders')}
        />
      );
    }
    
    // Render either flat list or grouped list based on settings
    return (
      <div className="recipients-container">
        {recipientGroups.map(renderRecipientGroup)}
      </div>
    );
  };
  
  // Render the selected recipients section
  const renderSelectedRecipients = () => {
    if (!selectedSenders.length) return null;
    
    return (
      <div className="selected-recipients-container">
        <Divider orientation="left" plain style={{ fontSize: '14px', margin: '12px 0' }}>
          <Space>
            <CheckOutlined /> 
            {t('pageMessages:sendersList.selectedCountMessage', { count: selectedSenders.length })}
          </Space>
        </Divider>
        
        <div className="selected-recipients-preview">
          {selectedSenders.slice(0, 10).map(sender => (
            <Tooltip key={sender.id} title={sender.name}>
              <Avatar 
                size="small" 
                className="selected-recipient-avatar"
                style={{ backgroundColor: generateAvatarColor(sender.name) }}
                onClick={() => handleSenderSelection(sender)}
              >
                {getInitial(sender.name)}
              </Avatar>
            </Tooltip>
          ))}
          
          {selectedSenders.length > 10 && (
            <Tooltip title={`${selectedSenders.length - 10} more recipients`}>
            <Avatar size="small" className="more-recipients-avatar">
                +{selectedSenders.length - 10}
              </Avatar>
            </Tooltip>
          )}
        </div>
      </div>
    );
  };
  
  // Render the options bar (view toggles, grouping, etc.)
  const renderOptionsBar = () => {
    return (
      <div className="options-bar">
        <Space>
          <Segmented
            options={[
              {
                value: 'compact',
                icon: <BarsOutlined />,
                label: t('compact', 'Compact')
              },
              {
                value: 'detailed',
                icon: <AppstoreOutlined />,
                label: t('detailed', 'Detailed')
              }
            ]}
            value={viewMode}
            onChange={setViewMode}
            size="small"
          />
        </Space>
        
        <Space>
          <Select
            size="small"
            value={groupBy}
            onChange={setGroupBy}
            style={{ width: 140 }}
            dropdownMatchSelectWidth={false}
          >
            <Option value="none">{t('noGrouping', 'No Grouping')}</Option>
            <Option value="recent">{t('byRecent', 'By Recent')}</Option>
          </Select>
          
          <Button
            type="link"
            size="small"
            onClick={handleSelectAll}
          >
            {selectedSenders.length === allFilteredRecipients.length
              ? t('pageMessages:sendersList.deselectAll')
              : t('pageMessages:sendersList.selectAll')}
          </Button>
        </Space>
      </div>
    );
  };
  
  return (
    <div className="page-senders-list">
      <Card
        title={
          <Space>
            <TeamOutlined />
            <span>{t('pageMessages:sendersList.title')}</span>
            <Badge 
              count={selectedSenders.length}
              showZero
              style={{ 
                backgroundColor: selectedSenders.length ? '#1890ff' : '#d9d9d9',
                marginLeft: 8 
              }}
            />
          </Space>
        }
        extra={
          <Tooltip
            title={selectedPage 
              ? t('pageMessages:sendersList.extractTooltip') 
              : t('pageMessages:sendersList.selectPageFirst')}
          >
            <Button
              type="primary"
              size="small"
              icon={isLoading ? <Spin size="small" /> : <SyncOutlined />}
              onClick={handleExtractSenders}
              disabled={!selectedPage || isLoading}
            >
              {isLoading 
                ? t('pageMessages:sendersList.extracting')
                : t('pageMessages:sendersList.extract')
              }
            </Button>
          </Tooltip>
        }
      >
        {!selectedPage ? (
          <Alert
            type="warning"
            message={
              <Space>
                <WarningOutlined />
                {t('pageMessages:sendersList.selectPageFirst')}
              </Space>
            }
          />
        ) : isLoading ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Spin size="medium" />
            <Paragraph style={{ marginTop: 12 }}>
              {t('pageMessages:sendersList.extractingMessage')}
            </Paragraph>
          </div>
        ) : pageSenders.length > 0 ? (
          <>
            {/* Search input */}
            <div className="search-container">
              <Search
                placeholder={t('pageMessages:sendersList.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                allowClear
                prefix={<SearchOutlined />}
              />
            </div>
            
            {/* Selected recipients preview */}
            {renderSelectedRecipients()}
            
            {/* Options bar for view modes, grouping */}
            {renderOptionsBar()}
            
            {/* Recipients list */}
            {renderRecipients()}
          </>
        ) : (
          <Alert
            type="info"
            message={
              <Space>
                <InfoCircleOutlined />
                {t('pageMessages:sendersList.noSenders')}
              </Space>
            }
            style={{ marginBottom: 16 }}
          />
        )}
        
        <Divider style={{ margin: '12px 0' }} />
        
        <Text type="secondary">
          {selectedSenders.length > 0 
            ? t('pageMessages:sendersList.selectedCountMessage', { count: selectedSenders.length })
            : t('pageMessages:sendersList.description')}
        </Text>
      </Card>
    </div>
  );
};

export default PageSendersList;