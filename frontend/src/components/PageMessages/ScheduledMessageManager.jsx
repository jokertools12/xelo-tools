import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Button, Table, Form, Modal, Row, Col, 
  Alert, Input, Spin, Tooltip, Space, Tag, 
  Typography, Select, DatePicker, Switch, 
  Checkbox, List, Badge, Progress, Tabs 
} from 'antd';
import { 
  ClockCircleOutlined, SearchOutlined, PlusOutlined, 
  EditOutlined, DeleteOutlined, PlayCircleOutlined, PauseOutlined, 
  CopyOutlined, InfoCircleOutlined, WarningOutlined, 
  CheckCircleOutlined, SyncOutlined, SendOutlined, 
  CalendarOutlined, PictureOutlined, LinkOutlined, 
  MessageOutlined, FileImageOutlined, VideoCameraOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';
import { message } from 'antd';
import moment from 'moment';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const ScheduledMessageManager = ({
  selectedPage,
  pageSenders,
  onMessageAction
}) => {
  const { t } = useLanguage();
  
  // Component state
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Form state
  const [formData, setFormData] = useState({
    messageType: 'text',
    messageText: '',
    imageUrl: '',
    videoUrl: '',
    quickReplyButtons: [],
    scheduledTime: moment().add(1, 'days').toDate(),
    enableDelay: true,
    delaySeconds: 5,
    personalizeMessage: true,
    recipients: []
  });
  
  // Button form state
  const [buttonType, setButtonType] = useState('url');
  const [buttonText, setButtonText] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [buttonPayload, setButtonPayload] = useState('');
  
  // Load scheduled messages from the server
  const loadScheduledMessages = useCallback(async () => {
    if (!selectedPage) return;
    
    setLoading(true);
    try {
      const response = await axios.get('/api/pagemessages/scheduled-messages');
      
      // Filter messages for the selected page
      const pageMessages = response.data.data.filter(
        msg => msg.pageId === selectedPage.id
      );
      
      setMessages(pageMessages);
    } catch (error) {
      message.error(t('pageMessages:scheduledMessages.errorLoading'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [selectedPage, t]);
  
  // Load messages when selected page changes
  useEffect(() => {
    if (selectedPage) {
      loadScheduledMessages();
    } else {
      setMessages([]);
    }
  }, [selectedPage, loadScheduledMessages]);
  
  // Filter messages
  const getFilteredMessages = () => {
    if (filterStatus === 'all') {
      return messages;
    }
    
    return messages.filter(msg => msg.status === filterStatus);
  };
  
  // Reset form
  const resetForm = () => {
    setFormData({
      messageType: 'text',
      messageText: '',
      imageUrl: '',
      videoUrl: '',
      quickReplyButtons: [],
      scheduledTime: moment().add(1, 'days').toDate(),
      enableDelay: true,
      delaySeconds: 5,
      personalizeMessage: true,
      recipients: []
    });
    setButtonText('');
    setButtonUrl('');
    setButtonPayload('');
  };
  
  // Handle form input changes
  const handleInputChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle date change
  const handleDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      scheduledTime: date ? date.toDate() : null
    }));
  };
  
  // Handle adding a button
  const handleAddButton = () => {
    if (formData.quickReplyButtons.length >= 3) {
      message.warning(t('pageMessages:composer.maxButtonsReached'));
      return;
    }
    
    if (!buttonText.trim()) {
      message.error(t('pageMessages:composer.buttonTextRequired'));
      return;
    }
    
    if (buttonType === 'url' && !buttonUrl.trim()) {
      message.error(t('pageMessages:composer.buttonUrlRequired'));
      return;
    }
    
    const newButton = {
      type: buttonType,
      text: buttonText,
      url: buttonType === 'url' ? buttonUrl : '',
      payload: buttonType === 'postback' ? buttonPayload : ''
    };
    
    setFormData(prev => ({
      ...prev,
      quickReplyButtons: [...prev.quickReplyButtons, newButton]
    }));
    
    setButtonText('');
    setButtonUrl('');
    setButtonPayload('');
  };
  
  // Handle removing a button
  const handleRemoveButton = (index) => {
    setFormData(prev => ({
      ...prev,
      quickReplyButtons: prev.quickReplyButtons.filter((_, i) => i !== index)
    }));
  };
  
  // Handle recipient selection
  const handleRecipientToggle = (sender) => {
    setFormData(prev => {
      const isSelected = prev.recipients.some(r => r.id === sender.id);
      
      if (isSelected) {
        return {
          ...prev,
          recipients: prev.recipients.filter(r => r.id !== sender.id)
        };
      } else {
        return {
          ...prev,
          recipients: [...prev.recipients, sender]
        };
      }
    });
  };
  
  // Select all recipients
  const handleSelectAllRecipients = () => {
    if (formData.recipients.length === pageSenders.length) {
      // Deselect all
      setFormData(prev => ({
        ...prev,
        recipients: []
      }));
    } else {
      // Select all
      setFormData(prev => ({
        ...prev,
        recipients: [...pageSenders]
      }));
    }
  };
  
  // Prepare form for editing
  const prepareEditForm = (scheduledMessage) => {
    setFormData({
      messageType: scheduledMessage.messageType || 'text',
      messageText: scheduledMessage.messageText || '',
      imageUrl: scheduledMessage.imageUrl || '',
      videoUrl: scheduledMessage.videoUrl || '',
      quickReplyButtons: scheduledMessage.quickReplyButtons || [],
      scheduledTime: scheduledMessage.scheduledTime ? new Date(scheduledMessage.scheduledTime) : moment().add(1, 'days').toDate(),
      enableDelay: scheduledMessage.enableDelay !== undefined ? scheduledMessage.enableDelay : true,
      delaySeconds: scheduledMessage.delaySeconds || 5,
      personalizeMessage: scheduledMessage.personalizeMessage !== undefined ? scheduledMessage.personalizeMessage : true,
      recipients: scheduledMessage.recipients || []
    });
  };
  
  // Validate form
  const validateForm = () => {
    if (!formData.messageText.trim() && formData.messageType === 'text') {
      message.error(t('pageMessages:composer.textRequired'));
      return false;
    }
    
    if (formData.messageType === 'image' && !formData.imageUrl.trim()) {
      message.error(t('pageMessages:composer.imageUrlRequired'));
      return false;
    }
    
    if (formData.messageType === 'video' && !formData.videoUrl.trim()) {
      message.error(t('pageMessages:composer.videoUrlRequired'));
      return false;
    }
    
    if (formData.recipients.length === 0) {
      message.error(t('pageMessages:scheduledMessages.noRecipientsSelected'));
      return false;
    }
    
    return true;
  };
  
  // Create scheduled message
  const handleCreateScheduledMessage = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const payload = {
        pageId: selectedPage.id,
        pageName: selectedPage.name,
        accessToken: selectedPage.accessToken,
        messageType: formData.messageType,
        messageText: formData.messageText,
        imageUrl: formData.messageType === 'image' ? formData.imageUrl : '',
        videoUrl: formData.messageType === 'video' ? formData.videoUrl : '',
        quickReplyButtons: formData.messageType === 'buttons' ? formData.quickReplyButtons : [],
        scheduledTime: formData.scheduledTime,
        enableDelay: formData.enableDelay,
        delaySeconds: formData.delaySeconds,
        personalizeMessage: formData.personalizeMessage,
        recipients: formData.recipients.map(r => ({
          id: r.id,
          name: r.name,
          lastInteraction: r.lastInteraction
        })),
        totalRecipients: formData.recipients.length
      };
      
      const response = await axios.post('/api/pagemessages/scheduled-messages', payload);
      
      if (response.data && response.data.success) {
        message.success(t('pageMessages:scheduledMessages.created'));
        loadScheduledMessages();
        setShowCreateModal(false);
        resetForm();
        
        if (onMessageAction) {
          onMessageAction('create', response.data.data);
        }
      }
    } catch (error) {
      message.error(error.response?.data?.message || t('pageMessages:scheduledMessages.errorCreating'));
    } finally {
      setLoading(false);
    }
  };
  
  // Update scheduled message
  const handleUpdateScheduledMessage = async () => {
    if (!validateForm() || !selectedMessage) return;
    
    setLoading(true);
    try {
      const payload = {
        pageId: selectedPage.id,
        pageName: selectedPage.name,
        accessToken: selectedPage.accessToken,
        messageType: formData.messageType,
        messageText: formData.messageText,
        imageUrl: formData.messageType === 'image' ? formData.imageUrl : '',
        videoUrl: formData.messageType === 'video' ? formData.videoUrl : '',
        quickReplyButtons: formData.messageType === 'buttons' ? formData.quickReplyButtons : [],
        scheduledTime: formData.scheduledTime,
        enableDelay: formData.enableDelay,
        delaySeconds: formData.delaySeconds,
        personalizeMessage: formData.personalizeMessage,
        recipients: formData.recipients.map(r => ({
          id: r.id,
          name: r.name,
          lastInteraction: r.lastInteraction
        })),
        totalRecipients: formData.recipients.length
      };
      
      const response = await axios.put(`/api/pagemessages/scheduled-messages/${selectedMessage._id}`, payload);
      
      if (response.data && response.data.success) {
        message.success(t('pageMessages:scheduledMessages.updated'));
        loadScheduledMessages();
        setShowEditModal(false);
        resetForm();
        
        if (onMessageAction) {
          onMessageAction('update', response.data.data);
        }
      }
    } catch (error) {
      message.error(error.response?.data?.message || t('pageMessages:scheduledMessages.errorUpdating'));
    } finally {
      setLoading(false);
    }
  };
  
  // Delete scheduled message
  const handleDeleteScheduledMessage = async () => {
    if (!selectedMessage) return;
    
    setLoading(true);
    try {
      const response = await axios.delete(`/api/pagemessages/scheduled-messages/${selectedMessage._id}`);
      
      if (response.data && response.data.success) {
        message.success(t('pageMessages:scheduledMessages.deleted'));
        loadScheduledMessages();
        setShowDeleteModal(false);
        
        if (onMessageAction) {
          onMessageAction('delete', selectedMessage);
        }
      }
    } catch (error) {
      message.error(error.response?.data?.message || t('pageMessages:scheduledMessages.errorDeleting'));
    } finally {
      setLoading(false);
    }
  };
  
  // Handle edit button click
  const handleEditClick = (scheduledMessage) => {
    setSelectedMessage(scheduledMessage);
    prepareEditForm(scheduledMessage);
    setShowEditModal(true);
  };
  
  // Handle delete button click
  const handleDeleteClick = (scheduledMessage) => {
    setSelectedMessage(scheduledMessage);
    setShowDeleteModal(true);
  };
  
  // Render message type icon
  const renderMessageTypeIcon = (type) => {
    switch (type) {
      case 'image':
        return <FileImageOutlined />;
      case 'video':
        return <VideoCameraOutlined />;
      case 'buttons':
        return <LinkOutlined />;
      default:
        return <MessageOutlined />;
    }
  };
  
  // Render status tag
  const renderStatusTag = (status) => {
    let color, text, icon;
    
    switch (status) {
      case 'pending':
        color = 'default';
        text = t('pageMessages:scheduledMessages.pending');
        icon = <ClockCircleOutlined />;
        break;
      case 'processing':
        color = 'processing';
        text = t('pageMessages:scheduledMessages.processing');
        icon = <SyncOutlined spin />;
        break;
      case 'completed':
        color = 'success';
        text = t('pageMessages:scheduledMessages.completed');
        icon = <CheckCircleOutlined />;
        break;
      case 'failed':
        color = 'error';
        text = t('pageMessages:scheduledMessages.failed');
        icon = <WarningOutlined />;
        break;
      default:
        color = 'default';
        text = status;
        icon = <InfoCircleOutlined />;
    }
    
    return <Tag color={color} icon={icon}>{text}</Tag>;
  };
  
  // Table columns
  const columns = [
    {
      title: t('pageMessages:scheduledMessages.messageDetails'),
      key: 'messageDetails',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Space>
            {renderMessageTypeIcon(record.messageType)}
            <Text strong>{record.messageText.length > 30 
              ? `${record.messageText.substring(0, 30)}...` 
              : record.messageText}
            </Text>
          </Space>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {t('pageMessages:scheduledMessages.recipients')}: {record.totalRecipients}
          </Text>
        </Space>
      )
    },
    {
      title: t('pageMessages:scheduledMessages.status'),
      key: 'status',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          {renderStatusTag(record.status)}
          {record.sent > 0 && record.totalRecipients > 0 && (
            <Progress 
              percent={Math.round((record.sent / record.totalRecipients) * 100)} 
              size="small" 
              status={record.status === 'failed' ? 'exception' : undefined}
              style={{ marginTop: 8 }}
            />
          )}
        </Space>
      )
    },
    {
      title: t('pageMessages:scheduledMessages.scheduledTime'),
      key: 'scheduledTime',
      render: (_, record) => (
        <Space>
          <CalendarOutlined />
          <Text>{moment(record.scheduledTime).format('YYYY-MM-DD HH:mm')}</Text>
        </Space>
      )
    },
    {
      title: t('pageMessages:scheduledMessages.actions'),
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title={t('pageMessages:scheduledMessages.edit')}>
            <Button
              type="primary"
              size="small"
              ghost
              icon={<EditOutlined />}
              onClick={() => handleEditClick(record)}
              disabled={loading || record.status !== 'pending'}
            />
          </Tooltip>
          <Tooltip title={t('pageMessages:scheduledMessages.delete')}>
            <Button
              type="danger"
              size="small"
              ghost
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteClick(record)}
              disabled={loading || record.status === 'processing'}
            />
          </Tooltip>
          <Tooltip title={t('pageMessages:scheduledMessages.copy')}>
            <Button
              type="default"
              size="small"
              ghost
              icon={<CopyOutlined />}
              onClick={() => {
                prepareEditForm(record);
                setShowCreateModal(true);
              }}
              disabled={loading}
            />
          </Tooltip>
        </Space>
      )
    }
  ];
  
  // Form content based on message type
  const renderMessageForm = () => {
    switch (formData.messageType) {
      case 'text':
        return (
          <Form.Item label={t('pageMessages:composer.messageText')} required>
            <TextArea
              rows={5}
              value={formData.messageText}
              onChange={(e) => handleInputChange('messageText', e.target.value)}
              placeholder={t('pageMessages:composer.textPlaceholder')}
            />
            {formData.personalizeMessage && (
              <div style={{ marginTop: 8 }}>
                <Alert
                  type="info"
                  message={
                    <>
                      <Text>{t('pageMessages:composer.personalizationHelp')}</Text>
                      <ul style={{ marginBottom: 0, paddingLeft: 20, marginTop: 8 }}>
                        <li>
                          <code>#recipient_name#</code> - {t('pageMessages:composer.recipientNameVar')}
                        </li>
                        <li>
                          <code>#date#</code> - {t('pageMessages:composer.dateVar')}
                        </li>
                        <li>
                          <code>#time#</code> - {t('pageMessages:composer.timeVar')}
                        </li>
                      </ul>
                    </>
                  }
                  style={{ padding: '8px' }}
                />
              </div>
            )}
          </Form.Item>
        );
      
      case 'image':
        return (
          <>
            <Form.Item label={t('pageMessages:composer.messageText')}>
              <TextArea
                rows={3}
                value={formData.messageText}
                onChange={(e) => handleInputChange('messageText', e.target.value)}
                placeholder={t('pageMessages:composer.textPlaceholder')}
              />
            </Form.Item>
            
            <Form.Item 
              label={t('pageMessages:composer.imageUrl')}
              required
              help={t('pageMessages:composer.imageUrlHelp')}
            >
              <Input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => handleInputChange('imageUrl', e.target.value)}
                placeholder={t('pageMessages:composer.imageUrlPlaceholder')}
              />
            </Form.Item>
          </>
        );
      
      case 'video':
        return (
          <>
            <Form.Item label={t('pageMessages:composer.messageText')}>
              <TextArea
                rows={3}
                value={formData.messageText}
                onChange={(e) => handleInputChange('messageText', e.target.value)}
                placeholder={t('pageMessages:composer.textPlaceholder')}
              />
            </Form.Item>
            
            <Form.Item 
              label={t('pageMessages:composer.videoUrl')}
              required
              help={t('pageMessages:composer.videoUrlHelp')}
            >
              <Input
                type="url"
                value={formData.videoUrl}
                onChange={(e) => handleInputChange('videoUrl', e.target.value)}
                placeholder={t('pageMessages:composer.videoUrlPlaceholder')}
              />
            </Form.Item>
          </>
        );
      
      case 'buttons':
        return (
          <>
            <Form.Item 
              label={t('pageMessages:composer.messageText')}
              required
            >
              <TextArea
                rows={3}
                value={formData.messageText}
                onChange={(e) => handleInputChange('messageText', e.target.value)}
                placeholder={t('pageMessages:composer.textPlaceholder')}
              />
            </Form.Item>
            
            <Title level={5}>{t('pageMessages:composer.buttons')}</Title>
            
            {/* Button list */}
            {formData.quickReplyButtons.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {formData.quickReplyButtons.map((button, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      marginBottom: 8, 
                      padding: '8px 12px', 
                      border: '1px solid #d9d9d9', 
                      borderRadius: '4px' 
                    }}
                  >
                    <div style={{ flexGrow: 1 }}>
                      <Text strong>{button.text}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {button.type === 'url' ? button.url : button.payload || 'No payload'}
                      </Text>
                    </div>
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemoveButton(idx)}
                    />
                  </div>
                ))}
              </div>
            )}
            
            {/* Button form */}
            {formData.quickReplyButtons.length < 3 && (
              <div style={{ 
                padding: '12px', 
                border: '1px solid #d9d9d9', 
                borderRadius: '4px', 
                marginBottom: 16 
              }}>
                <Form.Item label={t('pageMessages:composer.buttonType')}>
                  <Select 
                    value={buttonType}
                    onChange={(value) => setButtonType(value)}
                    style={{ width: '100%' }}
                  >
                    <Option value="url">{t('pageMessages:composer.linkButton')}</Option>
                    <Option value="postback">{t('pageMessages:composer.quickReplyButton')}</Option>
                  </Select>
                </Form.Item>
                
                <Form.Item label={t('pageMessages:composer.buttonText')}>
                  <Input
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    placeholder={t('pageMessages:composer.buttonTextPlaceholder')}
                  />
                </Form.Item>
                
                {buttonType === 'url' ? (
                  <Form.Item label={t('pageMessages:composer.buttonUrl')}>
                    <Input
                      type="url"
                      value={buttonUrl}
                      onChange={(e) => setButtonUrl(e.target.value)}
                      placeholder="https://"
                    />
                  </Form.Item>
                ) : (
                  <Form.Item label={t('pageMessages:composer.buttonPayload')}>
                    <Input
                      value={buttonPayload}
                      onChange={(e) => setButtonPayload(e.target.value)}
                      placeholder={t('pageMessages:composer.buttonPayloadPlaceholder')}
                    />
                  </Form.Item>
                )}
                
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={handleAddButton}
                >
                  {t('pageMessages:composer.addButton')}
                </Button>
              </div>
            )}
          </>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <div className="scheduled-message-manager">
      <Card
        title={
          <Space>
            <ClockCircleOutlined />
            {t('pageMessages:scheduledMessages.title')}
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            disabled={!selectedPage}
          >
            {t('pageMessages:scheduledMessages.create')}
          </Button>
        }
      >
        {!selectedPage ? (
          <Alert
            type="warning"
            message={t('pageMessages:selectPageFirst')}
            icon={<WarningOutlined />}
            showIcon
          />
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Select
                  value={filterStatus}
                  onChange={setFilterStatus}
                  style={{ width: 180 }}
                >
                  <Option value="all">{t('common:allStatuses')}</Option>
                  <Option value="pending">{t('pageMessages:scheduledMessages.pending')}</Option>
                  <Option value="processing">{t('pageMessages:scheduledMessages.processing')}</Option>
                  <Option value="completed">{t('pageMessages:scheduledMessages.completed')}</Option>
                  <Option value="failed">{t('pageMessages:scheduledMessages.failed')}</Option>
                </Select>
                <Button
                  icon={<SyncOutlined />}
                  onClick={loadScheduledMessages}
                  loading={loading}
                >
                  {t('common:refresh')}
                </Button>
              </Space>
            </div>
            
            {loading && messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin />
              </div>
            ) : getFilteredMessages().length > 0 ? (
              <Table
                columns={columns}
                dataSource={getFilteredMessages()}
                rowKey="_id"
                pagination={{ pageSize: 10 }}
                loading={loading}
              />
            ) : (
              <Alert
                type="info"
                message={t('pageMessages:scheduledMessages.noMessages')}
                description={t('pageMessages:scheduledMessages.createFirst')}
                icon={<InfoCircleOutlined />}
                showIcon
              />
            )}
          </>
        )}
      </Card>
      
      {/* Create Modal */}
      <Modal
        title={t('pageMessages:scheduledMessages.createNew')}
        open={showCreateModal}
        onCancel={() => setShowCreateModal(false)}
        onOk={handleCreateScheduledMessage}
        confirmLoading={loading}
        width={800}
        okText={t('common:create')}
        cancelText={t('common:cancel')}
      >
        <Form layout="vertical">
          <Tabs defaultActiveKey="content">
            <TabPane 
              tab={
                <span>
                  <MessageOutlined />
                  {t('pageMessages:scheduledMessages.messageContent')}
                </span>
              } 
              key="content"
            >
              <Form.Item label={t('pageMessages:scheduledMessages.messageType')}>
                <Select
                  value={formData.messageType}
                  onChange={(value) => handleInputChange('messageType', value)}
                >
                  <Option value="text">{t('pageMessages:scheduledMessages.typeText')}</Option>
                  <Option value="image">{t('pageMessages:scheduledMessages.typeImage')}</Option>
                  <Option value="video">{t('pageMessages:scheduledMessages.typeVideo')}</Option>
                  <Option value="buttons">{t('pageMessages:scheduledMessages.typeButtons')}</Option>
                </Select>
              </Form.Item>
              
              {renderMessageForm()}
            </TabPane>
            
            <TabPane 
              tab={
                <span>
                  <CalendarOutlined />
                  {t('pageMessages:scheduledMessages.schedulingOptions')}
                </span>
              } 
              key="scheduling"
            >
              <Form.Item 
                label={t('pageMessages:scheduledMessages.scheduledTime')}
                required
              >
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm:ss"
                  value={moment(formData.scheduledTime)}
                  onChange={handleDateChange}
                  style={{ width: '100%' }}
                  disabledDate={(current) => current && current < moment().startOf('day')}
                />
                <div style={{ marginTop: 8 }}>
                  <Alert
                    message={t('pageMessages:scheduledMessages.timeNote')}
                    type="info"
                    showIcon
                  />
                </div>
              </Form.Item>
              
              <Form.Item 
                label={t('pageMessages:scheduledMessages.delayOptions')}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Switch
                    checked={formData.enableDelay}
                    onChange={(checked) => handleInputChange('enableDelay', checked)}
                    style={{ marginRight: 8 }}
                  />
                  <Text>{t('pageMessages:scheduledMessages.enableMessageDelay')}</Text>
                </div>
                
                {formData.enableDelay && (
                  <div style={{ marginTop: 8 }}>
                    <Row gutter={16} align="middle">
                      <Col span={12}>
                        <Text>{t('pageMessages:scheduledMessages.delaySeconds')}</Text>
                      </Col>
                      <Col span={12}>
                        <Select
                          value={formData.delaySeconds}
                          onChange={(value) => handleInputChange('delaySeconds', value)}
                          style={{ width: '100%' }}
                        >
                          <Option value={2}>2 {t('common:seconds')}</Option>
                          <Option value={5}>5 {t('common:seconds')}</Option>
                          <Option value={10}>10 {t('common:seconds')}</Option>
                          <Option value={30}>30 {t('common:seconds')}</Option>
                          <Option value={60}>1 {t('common:minute')}</Option>
                          <Option value={300}>5 {t('common:minutes')}</Option>
                        </Select>
                      </Col>
                    </Row>
                  </div>
                )}
              </Form.Item>
            </TabPane>
            
            <TabPane 
              tab={
                <span>
                  <SendOutlined />
                  {t('pageMessages:scheduledMessages.recipients')}
                </span>
              } 
              key="recipients"
            >
              <Form.Item label={t('pageMessages:scheduledMessages.selectRecipients')}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                  <Button 
                    type="default"
                    onClick={handleSelectAllRecipients}
                  >
                    {formData.recipients.length === pageSenders.length
                      ? t('pageMessages:sendersList.deselectAll')
                      : t('pageMessages:sendersList.selectAll')}
                  </Button>
                  <span style={{ marginLeft: 12 }}>
                    <Badge 
                      count={formData.recipients.length} 
                      style={{ backgroundColor: '#1890ff' }}
                    />
                    <Text style={{ marginLeft: 8 }}>
                      {t('pageMessages:scheduledMessages.selectedCount', { count: formData.recipients.length })}
                    </Text>
                  </span>
                </div>
                
                <div style={{ 
                  border: '1px solid #d9d9d9', 
                  borderRadius: '4px', 
                  height: '300px', 
                  overflow: 'auto' 
                }}>
                  <List
                    size="small"
                    dataSource={pageSenders}
                    renderItem={(sender) => {
                      const isSelected = formData.recipients.some(r => r.id === sender.id);
                      return (
                        <List.Item
                          key={sender.id}
                          onClick={() => handleRecipientToggle(sender)}
                          style={{ 
                            cursor: 'pointer',
                            background: isSelected ? '#f0f5ff' : 'transparent'
                          }}
                        >
                          <Space>
                            <Checkbox 
                              checked={isSelected}
                              onChange={() => {}} // Controlled by List.Item onClick
                            />
                            <div>
                              <Text strong>{sender.name}</Text>
                              <br />
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                ID: {sender.id}
                              </Text>
                            </div>
                          </Space>
                        </List.Item>
                      );
                    }}
                  />
                </div>
                
                {pageSenders.length === 0 && (
                  <Alert
                    type="warning"
                    message={t('pageMessages:scheduledMessages.noSenders')}
                    description={t('pageMessages:scheduledMessages.extractSendersFirst')}
                    showIcon
                    style={{ marginTop: 16 }}
                  />
                )}
              </Form.Item>
              
              <Form.Item label={t('pageMessages:scheduledMessages.personalizationOptions')}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Switch
                    checked={formData.personalizeMessage}
                    onChange={(checked) => handleInputChange('personalizeMessage', checked)}
                    style={{ marginRight: 8 }}
                  />
                  <Text>{t('pageMessages:scheduledMessages.enablePersonalization')}</Text>
                </div>
              </Form.Item>
            </TabPane>
          </Tabs>
        </Form>
      </Modal>
      
      {/* Edit Modal */}
      <Modal
        title={t('pageMessages:scheduledMessages.edit')}
        open={showEditModal}
        onCancel={() => setShowEditModal(false)}
        onOk={handleUpdateScheduledMessage}
        confirmLoading={loading}
        width={800}
        okText={t('common:update')}
        cancelText={t('common:cancel')}
      >
        <Form layout="vertical">
          <Tabs defaultActiveKey="content">
            <TabPane 
              tab={
                <span>
                  <MessageOutlined />
                  {t('pageMessages:scheduledMessages.messageContent')}
                </span>
              } 
              key="content"
            >
              <Form.Item label={t('pageMessages:scheduledMessages.messageType')}>
                <Select
                  value={formData.messageType}
                  onChange={(value) => handleInputChange('messageType', value)}
                >
                  <Option value="text">{t('pageMessages:scheduledMessages.typeText')}</Option>
                  <Option value="image">{t('pageMessages:scheduledMessages.typeImage')}</Option>
                  <Option value="video">{t('pageMessages:scheduledMessages.typeVideo')}</Option>
                  <Option value="buttons">{t('pageMessages:scheduledMessages.typeButtons')}</Option>
                </Select>
              </Form.Item>
              
              {renderMessageForm()}
            </TabPane>
            
            <TabPane 
              tab={
                <span>
                  <CalendarOutlined />
                  {t('pageMessages:scheduledMessages.schedulingOptions')}
                </span>
              } 
              key="scheduling"
            >
              <Form.Item 
                label={t('pageMessages:scheduledMessages.scheduledTime')}
                required
              >
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm:ss"
                  value={moment(formData.scheduledTime)}
                  onChange={handleDateChange}
                  style={{ width: '100%' }}
                  disabledDate={(current) => current && current < moment().startOf('day')}
                />
                <div style={{ marginTop: 8 }}>
                  <Alert
                    message={t('pageMessages:scheduledMessages.timeNote')}
                    type="info"
                    showIcon
                  />
                </div>
              </Form.Item>
              
              <Form.Item 
                label={t('pageMessages:scheduledMessages.delayOptions')}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Switch
                    checked={formData.enableDelay}
                    onChange={(checked) => handleInputChange('enableDelay', checked)}
                    style={{ marginRight: 8 }}
                  />
                  <Text>{t('pageMessages:scheduledMessages.enableMessageDelay')}</Text>
                </div>
                
                {formData.enableDelay && (
                  <div style={{ marginTop: 8 }}>
                    <Row gutter={16} align="middle">
                      <Col span={12}>
                        <Text>{t('pageMessages:scheduledMessages.delaySeconds')}</Text>
                      </Col>
                      <Col span={12}>
                        <Select
                          value={formData.delaySeconds}
                          onChange={(value) => handleInputChange('delaySeconds', value)}
                          style={{ width: '100%' }}
                        >
                          <Option value={2}>2 {t('common:seconds')}</Option>
                          <Option value={5}>5 {t('common:seconds')}</Option>
                          <Option value={10}>10 {t('common:seconds')}</Option>
                          <Option value={30}>30 {t('common:seconds')}</Option>
                          <Option value={60}>1 {t('common:minute')}</Option>
                          <Option value={300}>5 {t('common:minutes')}</Option>
                        </Select>
                      </Col>
                    </Row>
                  </div>
                )}
              </Form.Item>
            </TabPane>
            
            <TabPane 
              tab={
                <span>
                  <SendOutlined />
                  {t('pageMessages:scheduledMessages.recipients')}
                </span>
              } 
              key="recipients"
            >
              <Form.Item label={t('pageMessages:scheduledMessages.selectRecipients')}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                  <Button 
                    type="default"
                    onClick={handleSelectAllRecipients}
                  >
                    {formData.recipients.length === pageSenders.length
                      ? t('pageMessages:sendersList.deselectAll')
                      : t('pageMessages:sendersList.selectAll')}
                  </Button>
                  <span style={{ marginLeft: 12 }}>
                    <Badge 
                      count={formData.recipients.length} 
                      style={{ backgroundColor: '#1890ff' }}
                    />
                    <Text style={{ marginLeft: 8 }}>
                      {t('pageMessages:scheduledMessages.selectedCount', { count: formData.recipients.length })}
                    </Text>
                  </span>
                </div>
                
                <div style={{ 
                  border: '1px solid #d9d9d9', 
                  borderRadius: '4px', 
                  height: '300px', 
                  overflow: 'auto' 
                }}>
                  <List
                    size="small"
                    dataSource={pageSenders}
                    renderItem={(sender) => {
                      const isSelected = formData.recipients.some(r => r.id === sender.id);
                      return (
                        <List.Item
                          key={sender.id}
                          onClick={() => handleRecipientToggle(sender)}
                          style={{ 
                            cursor: 'pointer',
                            background: isSelected ? '#f0f5ff' : 'transparent'
                          }}
                        >
                          <Space>
                            <Checkbox 
                              checked={isSelected}
                              onChange={() => {}} // Controlled by List.Item onClick
                            />
                            <div>
                              <Text strong>{sender.name}</Text>
                              <br />
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                ID: {sender.id}
                              </Text>
                            </div>
                          </Space>
                        </List.Item>
                      );
                    }}
                  />
                </div>
              </Form.Item>
              
              <Form.Item label={t('pageMessages:scheduledMessages.personalizationOptions')}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Switch
                    checked={formData.personalizeMessage}
                    onChange={(checked) => handleInputChange('personalizeMessage', checked)}
                    style={{ marginRight: 8 }}
                  />
                  <Text>{t('pageMessages:scheduledMessages.enablePersonalization')}</Text>
                </div>
              </Form.Item>
            </TabPane>
          </Tabs>
        </Form>
      </Modal>
      
      {/* Delete Modal */}
      <Modal
        title={t('pageMessages:scheduledMessages.confirmDelete')}
        open={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}
        onOk={handleDeleteScheduledMessage}
        confirmLoading={loading}
        okText={t('common:delete')}
        cancelText={t('common:cancel')}
        okButtonProps={{ danger: true }}
      >
        <p>{t('pageMessages:scheduledMessages.deleteWarning')}</p>
        {selectedMessage && (
          <Alert
            type="warning"
            message={
              <Space direction="vertical">
                <Text strong>{t('pageMessages:scheduledMessages.willDelete')}</Text>
                <Text>
                  {t('pageMessages:scheduledMessages.scheduledFor')} {moment(selectedMessage.scheduledTime).format('YYYY-MM-DD HH:mm')}
                </Text>
                <Text>
                  {t('pageMessages:scheduledMessages.recipients')}: {selectedMessage.totalRecipients}
                </Text>
              </Space>
            }
          />
        )}
      </Modal>
    </div>
  );
};

export default ScheduledMessageManager;