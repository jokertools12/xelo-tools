import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Card, Form, Button, Input, InputNumber, Badge, notification,
  Row, Col, Tag, Alert, Spin, Typography, Divider, 
  Space, Select, Switch, Image, Tooltip, Radio, 
  List, ConfigProvider, Empty, Tabs, Collapse, Avatar,
  Progress, Timeline, message, Drawer, Skeleton,
  Upload, Modal
} from 'antd';
import { 
  SendOutlined, PictureOutlined, VideoCameraOutlined, 
  PlusOutlined, DeleteOutlined, CloseOutlined, 
  WarningOutlined, InfoCircleOutlined, CheckCircleOutlined,
  UserOutlined, CalendarOutlined, ClockCircleOutlined, 
  LinkOutlined, MessageOutlined, EyeOutlined, FileImageOutlined,
  SettingOutlined, ProfileOutlined, EditOutlined, QuestionCircleOutlined,
  HourglassOutlined, RightOutlined, LeftOutlined, SlackOutlined,
  FieldTimeOutlined, FireOutlined, BulbOutlined, UsergroupAddOutlined,
  UploadOutlined, SmileOutlined, InboxOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';
import VirtualList from 'rc-virtual-list';
import debounce from 'lodash/debounce';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { Panel } = Collapse;

const MessageComposer = ({
  selectedPage,
  selectedSenders,
  onMessageSent
}) => {
  const { t, currentLanguage } = useLanguage();
  const isRTL = currentLanguage === 'ar';
  const directionIcon = isRTL ? <LeftOutlined /> : <RightOutlined />;
  
  // Message state
  const [messageType, setMessageType] = useState('text');
  const [messageText, setMessageText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [buttons, setButtons] = useState([]);
  const [showPreview, setShowPreview] = useState(true);
  const [personalization, setPersonalization] = useState(true);
  
  // Button form state
  const [buttonType, setButtonType] = useState('url');
  const [buttonText, setButtonText] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [buttonPayload, setButtonPayload] = useState('');
  
  // Quick Reply state (now integrated with button types)
  const [quickReplyButtons, setQuickReplyButtons] = useState([]);
  
  // Sending state
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState(false);
  
  // Enhanced delay settings state
  const [showDelayDrawer, setShowDelayDrawer] = useState(false);
  const [enableDelay, setEnableDelay] = useState(true);
  const [delayMode, setDelayMode] = useState('fixed');
  const [delaySeconds, setDelaySeconds] = useState(5);
  const [minDelaySeconds, setMinDelaySeconds] = useState(2);
  const [maxDelaySeconds, setMaxDelaySeconds] = useState(10);
  const [incrementalDelayStart, setIncrementalDelayStart] = useState(1);
  const [incrementalDelayStep, setIncrementalDelayStep] = useState(0.5);
  
  // Image upload state
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [previewVisible, setPreviewVisible] = useState(false);
  
  // Enhanced image with buttons state
  const [imageWithButtons, setImageWithButtons] = useState(false);
  
  // Performance optimization state
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [recipientsDisplayLimit, setRecipientsDisplayLimit] = useState(50);
  
  // Reset form when page or senders change
  useEffect(() => {
    setMessageText('');
    setImageUrl('');
    setVideoUrl('');
    setButtons([]);
    setButtonText('');
    setButtonUrl('');
    setButtonPayload('');
    setSendError('');
    setSendSuccess(false);
    setLoadingRecipients(true);
    setQuickReplyButtons([]);
    setImageWithButtons(false);
    
    // Simulate loading delay for large sender lists
    if (selectedSenders.length > 100) {
      setTimeout(() => {
        setLoadingRecipients(false);
      }, 500);
    } else {
      setLoadingRecipients(false);
    }
  }, [selectedPage, selectedSenders]);
  
  // Validation
  const validateForm = () => {
    // Check if quick reply buttons are present
    if (quickReplyButtons.length > 0 && messageText.trim() !== '') {
      return true;
    }
    
    switch (messageType) {
      case 'text':
        return messageText.trim() !== '';
      case 'image':
        return imageUrl.trim() !== '';
      case 'video':
        return videoUrl.trim() !== '';
      case 'buttons':
        return messageText.trim() !== '' && buttons.length > 0;
      case 'enhancedButtons':
        return messageText.trim() !== '' && imageUrl.trim() !== '' && buttons.length > 0;
      case 'quickReplies':
        return messageText.trim() !== '' && quickReplyButtons.length > 0;
      default:
        return false;
    }
  };
  
  // Handle adding a button
  const handleAddButton = () => {
    if (buttonType === 'quickReply') {
      if (quickReplyButtons.length >= 3) {
        message.warning(t('pageMessages:composer.maxButtonsReached', 'You can add a maximum of 3 buttons'));
        return;
      }
    } else if (buttons.length >= 3) {
      message.warning(t('pageMessages:composer.maxButtonsReached', 'You can add a maximum of 3 buttons'));
      return;
    }
    
    if (!buttonText.trim()) {
      message.warning(t('pageMessages:composer.buttonTextRequired', 'Button text is required'));
      return;
    }
    
    // Check button text length
    if (buttonText.trim().length > 20) {
      message.warning(t('pageMessages:composer.buttonTextTooLong', 'Button text cannot exceed 20 characters'));
      return;
    }
    
    if (buttonType === 'url' && !buttonUrl.trim()) {
      message.warning(t('pageMessages:composer.buttonUrlRequired', 'URL is required for link buttons'));
      return;
    }
    
    const newButton = {
      type: buttonType,
      text: buttonText,
      url: buttonType === 'url' ? buttonUrl : '',
      payload: (buttonType === 'postback' || buttonType === 'quickReply') ? buttonPayload : ''
    };
    
    if (buttonType === 'quickReply') {
      // Add to quick reply buttons
      setQuickReplyButtons([...quickReplyButtons, newButton]);
    } else {
      // Add to regular buttons
      setButtons([...buttons, newButton]);
    }
    
    setButtonText('');
    setButtonUrl('');
    setButtonPayload('');
  };
  
  // Handle removing a button (works for both regular and quick reply buttons)
  const handleRemoveButton = (index, buttonArray = 'regular') => {
    if (buttonArray === 'quickReply') {
      const updatedButtons = [...quickReplyButtons];
      updatedButtons.splice(index, 1);
      setQuickReplyButtons(updatedButtons);
    } else {
      const updatedButtons = [...buttons];
      updatedButtons.splice(index, 1);
      setButtons(updatedButtons);
    }
  };
  
  // Apply personalization to message
  const applyPersonalization = (text, sender) => {
    if (!personalization || !text) return text;
    
    let personalizedText = text;
    
    // Replace recipient name variable
    if (sender && sender.name) {
      personalizedText = personalizedText.replace(/#recipient_name#/g, sender.name);
    }
    
    // Replace date variable
    const currentDate = new Date().toLocaleDateString();
    personalizedText = personalizedText.replace(/#date#/g, currentDate);
    
    // Replace time variable
    const currentTime = new Date().toLocaleTimeString();
    personalizedText = personalizedText.replace(/#time#/g, currentTime);
    
    return personalizedText;
  };
  
      // Send message to a single recipient
      const sendSingleMessage = async (sender) => {
        try {
          const personalizedText = applyPersonalization(messageText, sender);
          
      // Determine the correct message type
      let effectiveMessageType = messageType;
      if (imageWithButtons) {
        effectiveMessageType = 'enhancedButtons';
      } else if (quickReplyButtons.length > 0) {
        effectiveMessageType = 'quickReplies';
      }
      
      const payload = {
        pageId: selectedPage.id,
        accessToken: selectedPage.accessToken,
        senderId: sender.id,
        messageType: effectiveMessageType,
        messageText: personalizedText,
        mediaUrl: messageType === 'image' || imageWithButtons ? imageUrl : messageType === 'video' ? videoUrl : '',
        quickReplyButtons: quickReplyButtons.length > 0 ? quickReplyButtons : (messageType === 'buttons' || imageWithButtons) ? buttons : []
          };
      
      const response = await axios.post('/api/pagemessages/send', payload);
      return { success: true, data: response.data };
      
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || t('pageMessages:composer.messageSendFailed', 'Error sending message') 
      };
    }
  };
  
  // Send message to all selected recipients
  const handleSendMessage = async () => {
    if (!validateForm()) {
      setSendError(t('pageMessages:composer.validationError', 'Please fill all required fields'));
      return;
    }
    
    if (selectedSenders.length === 0) {
      setSendError(t('pageMessages:composer.noRecipientsSelected', 'No recipients selected'));
      return;
    }
    
    setIsSending(true);
    setSendError('');
    setSendSuccess(false);
    
    try {
      if (selectedSenders.length === 1) {
        // Send to a single recipient
        const result = await sendSingleMessage(selectedSenders[0]);
        
        if (result.success) {
          setSendSuccess(true);
          message.success(t('pageMessages:composer.messageSentSuccess', 'Message sent successfully'));
          if (onMessageSent) onMessageSent(result.data);
        } else {
          setSendError(result.error);
        }
      } else {
        // Send to multiple recipients using bulk API
        const personalizedText = personalization 
          ? messageText  // Text with variables will be processed by the server
          : messageText;
        
        // Determine the correct message type
        let effectiveMessageType = messageType;
        if (imageWithButtons) {
          effectiveMessageType = 'enhancedButtons';
        } else if (quickReplyButtons.length > 0) {
          effectiveMessageType = 'quickReplies';
        }
        
        const payload = {
          pageId: selectedPage.id,
          accessToken: selectedPage.accessToken,
          senderIds: selectedSenders.map(sender => sender.id),
          messageType: effectiveMessageType,
          messageText: personalizedText,
          mediaUrl: messageType === 'image' || imageWithButtons ? imageUrl : messageType === 'video' ? videoUrl : '',
          quickReplyButtons: quickReplyButtons.length > 0 ? quickReplyButtons : (messageType === 'buttons' || imageWithButtons) ? buttons : [],
          enableDelay,
          delayMode,
          delaySeconds,
          minDelaySeconds,
          maxDelaySeconds,
          incrementalDelayStart,
          incrementalDelayStep
        };
        
        const response = await axios.post('/api/pagemessages/bulk-send', payload);
        
        setSendSuccess(true);
        message.success(
          t('pageMessages:composer.bulkMessageSentSuccess').replace("{{success}}", response.data.totalSent).replace("{{total}}", selectedSenders.length)
        );
        
        if (onMessageSent) onMessageSent(response.data);
      }
    } catch (error) {
      setSendError(error.response?.data?.message || t('pageMessages:composer.messageSendFailed', 'Failed to send message'));
    } finally {
      setIsSending(false);
    }
  };

  // Handle image upload
  const handleImageUpload = (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error(t('pageMessages:composer.onlyImageAllowed', 'You can only upload image files!'));
      return Upload.LIST_IGNORE;
    }
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setPreviewImage(reader.result);
      setPreviewVisible(true);
    };
    
    return false;
  };
  
  // Handle custom image URL input
  const handleImageUrlChange = (e) => {
    setImageUrl(e.target.value);
  };
  
  // Calculate an estimated time to complete sending
  const calculateEstimatedTime = () => {
    if (!selectedSenders.length || !enableDelay) return 0;
    
    let totalSeconds = 0;
    
    if (delayMode === 'fixed') {
      totalSeconds = (selectedSenders.length - 1) * delaySeconds;
    } else if (delayMode === 'random') {
      const avgDelay = (minDelaySeconds + maxDelaySeconds) / 2;
      totalSeconds = (selectedSenders.length - 1) * avgDelay;
    } else if (delayMode === 'incremental') {
      // Sum of arithmetic progression: n(a + l)/2 where l = a + (n-1)d
      const n = selectedSenders.length - 1;
      const lastDelay = incrementalDelayStart + (n - 1) * incrementalDelayStep;
      totalSeconds = n * (incrementalDelayStart + lastDelay) / 2;
    }
    
    return totalSeconds;
  };
  
  // Format seconds into minutes and seconds
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
    selectedSenders.length, 
    enableDelay, 
    delayMode, 
    delaySeconds, 
    minDelaySeconds, 
    maxDelaySeconds, 
    incrementalDelayStart, 
    incrementalDelayStep
  ]);
  
  // Debounced version of set functions to prevent performance issues with sliders
  const debouncedSetDelaySeconds = useCallback(
    debounce((value) => setDelaySeconds(value), 300),
    []
  );
  
  const debouncedSetMinDelaySeconds = useCallback(
    debounce((value) => setMinDelaySeconds(value), 300),
    []
  );
  
  const debouncedSetMaxDelaySeconds = useCallback(
    debounce((value) => setMaxDelaySeconds(value), 300),
    []
  );
  
  const debouncedSetIncrementalDelayStart = useCallback(
    debounce((value) => setIncrementalDelayStart(value), 300),
    []
  );
  
  const debouncedSetIncrementalDelayStep = useCallback(
    debounce((value) => setIncrementalDelayStep(value), 300),
    []
  );
  
  // Color indicators for various delay modes
  const delayModeColors = {
    fixed: {
      primary: '#1890ff',
      secondary: 'rgba(24, 144, 255, 0.1)',
      border: 'rgba(24, 144, 255, 0.25)'
    },
    random: {
      primary: '#722ed1',
      secondary: 'rgba(114, 46, 209, 0.1)',
      border: 'rgba(114, 46, 209, 0.25)'
    },
    incremental: {
      primary: '#fa8c16',
      secondary: 'rgba(250, 140, 22, 0.1)',
      border: 'rgba(250, 140, 22, 0.25)'
    }
  };
  
  // Current color scheme based on delay mode
  const currentDelayColors = delayModeColors[delayMode];
  
  // Load more recipients on scroll for virtualized list
  const onRecipientListScroll = (e) => {
    if (e.target.scrollHeight - e.target.scrollTop === e.target.clientHeight) {
      // Reached the bottom, load more if possible
      setRecipientsDisplayLimit(prev => Math.min(prev + 50, selectedSenders.length));
    }
  };
  
  // Render message preview
  const renderMessagePreview = () => {
    const previewRecipient = selectedSenders.length > 0 ? selectedSenders[0] : null;
    const personalizedText = applyPersonalization(messageText, previewRecipient);
    
    return (
      <Card 
        className="message-preview"
        title={
          <Space>
            <EyeOutlined />
            {t('pageMessages:composer.messagePreview', 'Message Preview')}
            {previewRecipient && (
              <Text type="secondary" style={{ fontSize: 14 }}>
                {t('pageMessages:composer.previewFor', 'Preview for')}: {previewRecipient.name}
              </Text>
            )}
          </Space>
        }
        extra={
          <Button 
            type="text" 
            icon={<CloseOutlined />}
            onClick={() => setShowPreview(false)}
          />
        }
        style={{ 
          height: '100%', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: '12px'
        }}
        bodyStyle={{ padding: '16px', height: 'calc(100% - 58px)', overflowY: 'auto' }}
      >
        <div className="preview-container" style={{ marginBottom: 16 }}>
          {messageType === 'text' && (
            <div className="message-bubble" style={{ 
              background: '#f0f2f5', 
              padding: '12px 16px', 
              borderRadius: '18px',
              marginBottom: 16,
              maxWidth: '80%',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
            }}>
              {personalizedText || <Text type="secondary">{t('pageMessages:composer.noMessageTextYet', 'No message text yet')}</Text>}
            </div>
          )}
          
          {(messageType === 'image' || imageWithButtons) && (
            <>
              {personalizedText && messageType === 'image' && !imageWithButtons && (
                <div className="message-bubble" style={{ 
                  background: '#f0f2f5', 
                  padding: '12px 16px', 
                  borderRadius: '18px',
                  marginBottom: 8,
                  maxWidth: '80%',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                }}>
                  {personalizedText}
                </div>
              )}
              <div style={{ marginBottom: 16, borderRadius: '12px', overflow: 'hidden', maxWidth: '80%' }}>
                {imageUrl ? (
                  <Image 
                    src={imageUrl} 
                    width={240}
                    style={{ objectFit: 'cover', borderRadius: '12px' }}
                    fallback="data:image/png;base64,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"
                  />
                ) : (
                  <div style={{ 
                    width: 240, 
                    height: 160, 
                    background: '#f9f9f9', 
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <FileImageOutlined style={{ fontSize: 32, color: '#bfbfbf' }} />
                    <Text type="secondary">{t('pageMessages:composer.noImageUrlYet', 'No image URL yet')}</Text>
                  </div>
                )}
              </div>
              {/* If enhanced image with buttons, show buttons after image */}
              {imageWithButtons && buttons.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '80%' }}>
                  {buttons.map((button, idx) => (
                    <Button 
                      key={idx}
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
            </>
          )}
          
          {messageType === 'video' && (
            <>
              {personalizedText && (
                <div className="message-bubble" style={{ 
                  background: '#f0f2f5', 
                  padding: '12px 16px', 
                  borderRadius: '18px',
                  marginBottom: 8,
                  maxWidth: '80%',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                }}>
                  {personalizedText}
                </div>
              )}
              <div style={{ 
                marginBottom: 16, 
                padding: '16px', 
                background: '#f9f9f9', 
                borderRadius: '12px',
                textAlign: 'center',
                maxWidth: '80%',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
              }}>
                {videoUrl ? (
                  <Space direction="vertical" align="center">
                    <VideoCameraOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                    <Text>{t('pageMessages:composer.videoAttached', 'Video attached')}</Text>
                    <Tag color="blue" style={{ borderRadius: '12px' }}>
                      {videoUrl.length > 30 ? videoUrl.substring(0, 30) + '...' : videoUrl}
                    </Tag>
                  </Space>
                ) : (
                  <Space direction="vertical" align="center">
                    <VideoCameraOutlined style={{ fontSize: 32, color: '#bfbfbf' }} />
                    <Text type="secondary">{t('pageMessages:composer.noVideoUrlYet', 'No video URL yet')}</Text>
                  </Space>
                )}
              </div>
            </>
          )}
          
          {messageType === 'buttons' && !imageWithButtons && (
            <>
              <div className="message-bubble" style={{ 
                background: '#f0f2f5', 
                padding: '12px 16px', 
                borderRadius: '18px',
                marginBottom: 8,
                maxWidth: '80%',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
              }}>
                {personalizedText || <Text type="secondary">{t('pageMessages:composer.noMessageTextYet', 'No message text yet')}</Text>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '80%' }}>
                {buttons.length > 0 ? (
                  buttons.map((button, idx) => (
                    <Button 
                      key={idx}
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
                  ))
                ) : (
                  <Text type="secondary">{t('pageMessages:composer.noButtonsAddedYet', 'No buttons added yet')}</Text>
                )}
              </div>
            </>
          )}
          
          {/* Quick Reply Buttons Preview */}
          {quickReplyButtons.length > 0 && (
            <div className="enhanced-quick-reply-preview" style={{
              marginTop: '16px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              {quickReplyButtons.map((button, idx) => (
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
        </div>
        
        {selectedSenders.length > 1 && enableDelay && (
          <Card
            size="small"
            title={
              <Space>
                <ClockCircleOutlined style={{ color: currentDelayColors.primary }} />
                {t('common:messageDelay', 'Message Delay')}
              </Space>
            }
            style={{ 
              marginTop: 16, 
              borderRadius: '8px',
              border: `1px solid ${currentDelayColors.border}`,
              background: currentDelayColors.secondary
            }}
          >
            <div>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text>
                  <Badge status="processing" color={currentDelayColors.primary} /> 
                  <Text strong>{t('common:enabled', 'Enabled')}</Text>
                </Text>
                
                <Space align="start">
                  <ClockCircleOutlined />
                  <div>
                    <Text strong>{t('common:delayMode', 'Delay Mode')}: </Text>
                    <Text>{
                      delayMode === 'fixed' 
                        ? t('common:fixedDelay', 'Fixed Delay') 
                        : delayMode === 'random' 
                          ? t('common:randomDelay', 'Random Delay')
                          : t('common:incrementalDelay', 'Incremental Delay')
                    }</Text>
                  </div>
                </Space>
                
                <div>
                  {delayMode === 'fixed' && (
                    <Tag color="blue">{delaySeconds} {t('common:seconds', 'seconds')}</Tag>
                  )}
                  {delayMode === 'random' && (
                    <Tag color="purple">{minDelaySeconds} - {maxDelaySeconds} {t('common:seconds', 'seconds')}</Tag>
                  )}
                  {delayMode === 'incremental' && (
                    <Tag color="orange">
                      {t('common:startDelay', 'Start')}: {incrementalDelayStart}s, 
                      {t('common:incrementStep', 'Step')}: +{incrementalDelayStep}s
                    </Tag>
                  )}
                </div>
                
                <Divider style={{ margin: '8px 0' }} />
                
                <Space>
                  <ClockCircleOutlined style={{ color: currentDelayColors.primary }} />
                  <Text strong>{t('common:estimatedTime', 'Estimated Time')}:</Text>
                  <Text>{estimatedTime}</Text>
                </Space>
                
                <Button 
                  type="link" 
                  size="small" 
                  onClick={() => setShowDelayDrawer(true)}
                  icon={<SettingOutlined />}
                >
                  {t('pageMessages:composer.adjustDelaySettings', 'Adjust delay settings')}
                </Button>
              </Space>
            </div>
          </Card>
        )}
      </Card>
    );
  };
  
  // Render message content form with enhanced styling
  const renderMessageContentForm = () => {
    return (
      <div className="message-form-container">
        <Tabs
          activeKey={imageWithButtons ? 'enhancedButtons' : messageType}
          onChange={(key) => {
            if (key === 'enhancedButtons') {
              setImageWithButtons(true);
              setMessageType('image');
            } else {
              setImageWithButtons(false);
              setMessageType(key);
            }
          }}
          type="card"
          size="large"
          style={{ 
            marginBottom: 24,
            boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
          }}
          tabBarStyle={{
            background: '#f8f9fa', 
            borderTopLeftRadius: '8px', 
            borderTopRightRadius: '8px',
            padding: '8px 8px 0'
          }}
        >
          <TabPane 
            tab={
              <Space>
                <SendOutlined style={{ fontSize: 16 }} />
                {t('pageMessages:composer.types.text', 'Text')}
              </Space>
            }
            key="text"
          >
            <Form.Item label={t('pageMessages:composer.messageText', 'Message Text')}>
              <TextArea
                rows={5}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={t('pageMessages:composer.textPlaceholder', 'Enter your message text here...')}
                style={{ borderRadius: '8px' }}
              />
              {personalization && (
                <div style={{ marginTop: 8 }}>
                  <Space wrap>
                    <Tag 
                      color="blue" 
                      style={{ cursor: 'pointer', borderRadius: '12px' }}
                      onClick={() => setMessageText(prev => prev + ' #recipient_name#')}
                    >
                      #recipient_name#
                    </Tag>
                    <Tag 
                      color="green" 
                      style={{ cursor: 'pointer', borderRadius: '12px' }}
                      onClick={() => setMessageText(prev => prev + ' #date#')}
                    >
                      #date#
                    </Tag>
                    <Tag 
                      color="orange" 
                      style={{ cursor: 'pointer', borderRadius: '12px' }}
                      onClick={() => setMessageText(prev => prev + ' #time#')}
                    >
                      #time#
                    </Tag>
                  </Space>
                </div>
              )}
            </Form.Item>
          </TabPane>
          
          <TabPane 
            tab={
              <Space>
                <PictureOutlined style={{ fontSize: 16 }} />
                {t('pageMessages:composer.types.image', 'Image')}
              </Space>
            }
            key="image"
          >
            <Form.Item label={t('pageMessages:composer.messageText', 'Message Text')}>
              <TextArea
                rows={3}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={t('pageMessages:composer.textPlaceholder', 'Enter your message text here...')}
                style={{ borderRadius: '8px' }}
              />
              {personalization && (
                <div style={{ marginTop: 8 }}>
                  <Space wrap>
                    <Tag 
                      color="blue" 
                      style={{ cursor: 'pointer', borderRadius: '12px' }}
                      onClick={() => setMessageText(prev => prev + ' #recipient_name#')}
                    >
                      #recipient_name#
                    </Tag>
                    <Tag 
                      color="green" 
                      style={{ cursor: 'pointer', borderRadius: '12px' }}
                      onClick={() => setMessageText(prev => prev + ' #date#')}
                    >
                      #date#
                    </Tag>
                    <Tag 
                      color="orange" 
                      style={{ cursor: 'pointer', borderRadius: '12px' }}
                      onClick={() => setMessageText(prev => prev + ' #time#')}
                    >
                      #time#
                    </Tag>
                  </Space>
                </div>
              )}
            </Form.Item>
            
            <Form.Item 
              label={t('pageMessages:composer.imageUrl', 'Image URL')}
              extra={t('pageMessages:composer.imageUrlHelp', 'Enter URL to an image (JPEG, PNG, GIF)')}
            >
              <Input
                prefix={<FileImageOutlined />}
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder={t('pageMessages:composer.imageUrlPlaceholder', 'https://example.com/image.jpg')}
                style={{ borderRadius: '8px' }}
                addonAfter={
                  <Tooltip title={t('pageMessages:composer.uploadImage', 'Upload Image')}>
                    <UploadOutlined onClick={() => setShowImageUpload(true)} style={{ cursor: 'pointer' }} />
                  </Tooltip>
                }
              />
            </Form.Item>
          </TabPane>
          
          <TabPane 
            tab={
              <Space>
                <VideoCameraOutlined style={{ fontSize: 16 }} />
                {t('pageMessages:composer.types.video', 'Video')}
              </Space>
            }
            key="video"
          >
            <Form.Item label={t('pageMessages:composer.messageText', 'Message Text')}>
              <TextArea
                rows={3}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={t('pageMessages:composer.textPlaceholder', 'Enter your message text here...')}
                style={{ borderRadius: '8px' }}
              />
              {personalization && (
                <div style={{ marginTop: 8 }}>
                  <Space wrap>
                    <Tag 
                      color="blue" 
                      style={{ cursor: 'pointer', borderRadius: '12px' }}
                      onClick={() => setMessageText(prev => prev + ' #recipient_name#')}
                    >
                      #recipient_name#
                    </Tag>
                    <Tag 
                      color="green" 
                      style={{ cursor: 'pointer', borderRadius: '12px' }}
                      onClick={() => setMessageText(prev => prev + ' #date#')}
                    >
                      #date#
                    </Tag>
                    <Tag 
                      color="orange" 
                      style={{ cursor: 'pointer', borderRadius: '12px' }}
                      onClick={() => setMessageText(prev => prev + ' #time#')}
                    >
                      #time#
                    </Tag>
                  </Space>
                </div>
              )}
            </Form.Item>
            
            <Form.Item 
              label={t('pageMessages:composer.videoUrl', 'Video URL')}
              extra={t('pageMessages:composer.videoUrlHelp', 'Enter URL to a video (Facebook supports many formats)')}
            >
              <Input
                prefix={<VideoCameraOutlined />}
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder={t('pageMessages:composer.videoUrlPlaceholder', 'https://example.com/video.mp4')}
                style={{ borderRadius: '8px' }}
              />
            </Form.Item>
          </TabPane>
          
          <TabPane 
            tab={
              <Space>
                <LinkOutlined style={{ fontSize: 16 }} />
                {t('pageMessages:composer.types.buttons', 'Buttons')}
              </Space>
            }
            key="buttons"
          >
            <Form.Item label={t('pageMessages:composer.messageText', 'Message Text')}>
              <TextArea
                rows={3}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={t('pageMessages:composer.textPlaceholder', 'Enter your message text here...')}
                style={{ borderRadius: '8px' }}
              />
              {personalization && (
                <div style={{ marginTop: 8 }}>
                  <Space wrap>
                    <Tag 
                      color="blue" 
                      style={{ cursor: 'pointer', borderRadius: '12px' }}
                      onClick={() => setMessageText(prev => prev + ' #recipient_name#')}
                    >
                      #recipient_name#
                    </Tag>
                    <Tag 
                      color="green" 
                      style={{ cursor: 'pointer', borderRadius: '12px' }}
                      onClick={() => setMessageText(prev => prev + ' #date#')}
                    >
                      #date#
                    </Tag>
                    <Tag 
                      color="orange" 
                      style={{ cursor: 'pointer', borderRadius: '12px' }}
                      onClick={() => setMessageText(prev => prev + ' #time#')}
                    >
                      #time#
                    </Tag>
                  </Space>
                </div>
              )}
            </Form.Item>
            
            <Card
              title={
                <Space>
                  <LinkOutlined />
                  {t('pageMessages:composer.buttons', 'Message Buttons')}
                  <Badge 
                    count={buttons.length} 
                    style={{ 
                      backgroundColor: buttons.length ? '#1890ff' : '#ccc',
                      boxShadow: buttons.length ? '0 2px 4px rgba(24, 144, 255, 0.2)' : 'none'
                    }} 
                  />
                </Space>
              }
              size="small"
              style={{ 
                marginBottom: 24, 
                borderRadius: '8px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
              }}
            >
              {/* Button list */}
              {buttons.length > 0 && (
                <List
                  itemLayout="horizontal"
                  dataSource={buttons}
                  style={{ marginBottom: 16 }}
                  renderItem={(button, idx) => (
                    <List.Item
                      actions={[
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemoveButton(idx, 'regular')}
                        />
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          <Avatar 
                            icon={button.type === 'url' ? <LinkOutlined /> : <MessageOutlined />} 
                            style={{ backgroundColor: button.type === 'url' ? '#1890ff' : '#52c41a' }}
                          />
                        }
                        title={button.text}
                        description={button.type === 'url' 
                          ? <Tag color="blue">{button.url}</Tag> 
                          : <Tag color="green">{button.payload || t('pageMessages:composer.noPayload', 'No payload')}</Tag>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
              
              {/* Button form */}
              {buttons.length < 3 && (
                <div>
                  <Form layout="vertical">
                    <Row gutter={16}>
                        <Col span={8}>
                          <Form.Item label={t('pageMessages:composer.buttonType', 'Button Type')}>
                            <Radio.Group 
                              value={buttonType}
                              onChange={(e) => setButtonType(e.target.value)}
                              style={{ width: '100%' }}
                              buttonStyle="solid"
                            >
                              <Radio.Button 
                                value="url" 
                                style={{ 
                                  width: '33%', 
                                  textAlign: 'center',
                                  borderTopLeftRadius: '8px',
                                  borderBottomLeftRadius: '8px'
                                }}
                              >
                                <LinkOutlined /> {t('pageMessages:composer.linkButton', 'Link')}
                              </Radio.Button>
                              <Radio.Button 
                                value="postback" 
                                style={{ 
                                  width: '33%', 
                                  textAlign: 'center'
                                }}
                              >
                                <MessageOutlined /> {t('pageMessages:composer.postbackButton', 'Postback')}
                              </Radio.Button>
                              <Radio.Button 
                                value="quickReply" 
                                style={{ 
                                  width: '34%', 
                                  textAlign: 'center',
                                  borderTopRightRadius: '8px',
                                  borderBottomRightRadius: '8px'
                                }}
                              >
                                <SmileOutlined /> {t('pageMessages:composer.quickReplyButton', 'Quick Reply')}
                              </Radio.Button>
                            </Radio.Group>
                          </Form.Item>
                        </Col>
                      <Col span={16}>
                        <Form.Item label={t('pageMessages:composer.buttonText', 'Button Text')}>
                          <Input
                            value={buttonText}
                            onChange={(e) => setButtonText(e.target.value)}
                            placeholder={t('pageMessages:composer.buttonTextPlaceholder', 'Enter button text...')}
                            style={{ borderRadius: '8px' }}
                            prefix={buttonType === 'url' ? <LinkOutlined /> : <MessageOutlined />}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                    
                    {buttonType === 'url' ? (
                      <Form.Item label={t('pageMessages:composer.buttonUrl', 'Button URL')}>
                        <Input
                          prefix={<LinkOutlined />}
                          type="url"
                          value={buttonUrl}
                          onChange={(e) => setButtonUrl(e.target.value)}
                          placeholder="https://"
                          style={{ borderRadius: '8px' }}
                        />
                      </Form.Item>
                    ) : (
                      <Form.Item label={t('pageMessages:composer.buttonPayload', 'Button Payload')}>
                        <Input
                          prefix={<MessageOutlined />}
                          value={buttonPayload}
                          onChange={(e) => setButtonPayload(e.target.value)}
                          placeholder={t('pageMessages:composer.buttonPayloadPlaceholder', 'Enter payload data (optional)')}
                          style={{ borderRadius: '8px' }}
                        />
                      </Form.Item>
                    )}
                    
                    <Form.Item>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAddButton}
                        style={{ 
                          borderRadius: '8px',
                          background: buttonType === 'url' ? '#1890ff' : '#52c41a',
                          borderColor: buttonType === 'url' ? '#1890ff' : '#52c41a'
                        }}
                      >
                        {t('pageMessages:composer.addButton', 'Add Button')}
                      </Button>
                    </Form.Item>
                  </Form>
                </div>
              )}
            </Card>
          </TabPane>
          
          {/* New Enhanced Image + Buttons Tab */}
          <TabPane
            tab={
              <Space>
                <FileImageOutlined style={{ fontSize: 16 }} />
                {t('pageMessages:composer.types.enhancedButtons', 'Image + Buttons')}
              </Space>
            }
            key="enhancedButtons"
          >
            <Alert
              message={t('pageMessages:composer.enhancedButtonsInfo', 'Enhanced Feature: Image with Buttons')}
              description={t('pageMessages:composer.enhancedButtonsDescription', 'This feature allows you to send an image with attached buttons for a richer messaging experience.')}
              type="info"
              showIcon
              style={{ marginBottom: 16, borderRadius: '8px' }}
            />
            
            <Form.Item label={t('pageMessages:composer.messageText', 'Message Text')}>
              <TextArea
                rows={3}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={t('pageMessages:composer.textPlaceholder', 'Enter your message text here...')}
                style={{ borderRadius: '8px' }}
              />
              {personalization && (
                <div style={{ marginTop: 8 }}>
                  <Space wrap>
                    <Tag 
                      color="blue" 
                      style={{ cursor: 'pointer', borderRadius: '12px' }}
                      onClick={() => setMessageText(prev => prev + ' #recipient_name#')}
                    >
                      #recipient_name#
                    </Tag>
                    <Tag 
                      color="green" 
                      style={{ cursor: 'pointer', borderRadius: '12px' }}
                      onClick={() => setMessageText(prev => prev + ' #date#')}
                    >
                      #date#
                    </Tag>
                    <Tag 
                      color="orange" 
                      style={{ cursor: 'pointer', borderRadius: '12px' }}
                      onClick={() => setMessageText(prev => prev + ' #time#')}
                    >
                      #time#
                    </Tag>
                  </Space>
                </div>
              )}
            </Form.Item>
            
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item 
                  label={t('pageMessages:composer.imageUrl', 'Image URL')}
                  extra={t('pageMessages:composer.imageUrlHelp', 'Enter URL to an image (JPEG, PNG, GIF)')}
                >
                  <Input
                    prefix={<FileImageOutlined />}
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder={t('pageMessages:composer.imageUrlPlaceholder', 'https://example.com/image.jpg')}
                    style={{ borderRadius: '8px' }}
                    addonAfter={
                      <Tooltip title={t('pageMessages:composer.uploadImage', 'Upload Image')}>
                        <UploadOutlined onClick={() => setShowImageUpload(true)} style={{ cursor: 'pointer' }} />
                      </Tooltip>
                    }
                  />
                </Form.Item>
                
                {imageUrl && (
                  <div style={{ marginBottom: 16, textAlign: 'center' }}>
                    <Image
                      src={imageUrl}
                      width={200}
                      style={{ borderRadius: '8px', objectFit: 'cover' }}
                      fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3PTWBSGcbGzM6GCKqlIBRV0dHRJFarQ0eUT8LH4BnRU0NHR0UEFVdIlFRV7TzRksomPY8uykTk/zewQfKw/9znv4yvJynLv4uLiV2dBoDiBf4qP3/ARuCRABEFAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghgg0Aj8i0JO4OzsrPv69Wv+hi2qPHr0qNvf39+iI97soRIh4f3z58/u7du3SXX7Xt7Z2enevHmzfQe+oSN2apSAPj09TSrb+XKI/f379+08+A0cNRE2ANkupk+ACNPvkSPcAAEibACyXUyfABGm3yNHuAECRNgAZLuYPgEirKlHu7u7XdyytGwHAd8jjNyng4OD7vnz51dbPT8/7z58+NB9+/bt6jU/TI+AGWHEnrx48eJ/EsSmHzx40L18+fLyzxF3ZVMjEyDCiEDjMYZZS5wiPXnyZFbJaxMhQIQRGzHvWR7XCyOCXsOmiDAi1HmPMMQjDpbpEiDCiL358eNHurW/5SnWdIBbXiDCiA38/Pnzrce2YyZ4//59F3ePLNMl4PbpiL2J0L979+7yDtHDhw8vtzzvdGnEXdvUigSIsCLAWavHp/+qM0BcXMd/q25n1vF57TYBp0a3mUzilePj4+7k5KSLb6gt6ydAhPUzXnoPR0dHl79WGTNCfBnn1uvSCJdegQhLI1vvCk+fPu2ePXt2tZOYEV6/fn31dz+shwAR1sP1cqvLntbEN9MxA9xcYjsxS1jWR4AIa2Ibzx0tc44fYX/16lV6NDFLXH+YL32jwiACRBiEbf5KcXoTIsQSpzXx4N28Ja4BQoK7rgXiydbHjx/P25TaQAJEGAguWy0+2Q8PD6/Ki4R8EVl+bzBOnZY95fq9rj9zAkTI2SxdidBHqG9+skdw43borCXO/ZcJdraPWdv22uIEiLA4q7nvvCug8WTqzQveOH26fodo7g6uFe/a17W3+nFBAkRYENRdb1vkkz1CH9cPsVy/jrhr27PqMYvENYNlHAIesRiBYwRy0V+8iXP8+/fvX11Mr7L7ECueb/r48eMqm7FuI2BGWDEG8cm+7G3NEOfmdcTQw4h9/55lhm7DekRYKQPZF2ArbXTAyu4kDYB2YxUzwg0gi/41ztHnfQG26HbGel/crVrm7tNY+/1btkOEAZ2M05r4FB7r9GbAIdxaZYrHdOsgJ/wCEQY0J74TmOKnbxxT9n3FgGGWWsVdowHtjt9Nnvf7yQM2aZU/TIAIAxrw6dOnAWtZZcoEnBpNuTuObWMEiLAx1HY0ZQJEmHJ3HNvGCBBhY6jtaMoEiJB0Z29vL6ls58vxPcO8/zfrdo5qvKO+d3Fx8Wu8zf1dW4p/cPzLly/dtv9Ts/EbcvGAHhHyfBIhZ6NSiIBTo0LNNtScABFyNiqFCBChULMNNSdAhJyNSiECRCjUbEPNCRAhZ6NSiAARCjXbUHMCRMjZqBQiQIRCzTbUnAARcjYqhQgQoVCzDTUnQIScjUohAkQo1GxDzQkQIWejUogAEQo121BzAkTI2agUIkCEQs021JwAEXI2KoUIEKFQsw01J0CEnI1KIQJEKNRsQ80JECFno1KIABEKNdtQcwJEyNmoFCJAhELNNtScABFyNiqFCBChULMNNSdAhJyNSiECRCjUbEPNCRAhZ6NSiAARCjXbUHMCRMjZqBQiQIRCzTbUnAARcjYqhQgQoVCzDTUnQIScjUohAkQo1GxDzQkQIWejUogAEQo121BzAkTI2agUIkCEQs021JwAEXI2KoUIEKFQsw01J0CEnI1KIQJEKNRsQ80JECFno1KIABEKNdtQcwJEyNmoFCJAhELNNtScABFyNiqFCBChULMNNSdAhJyNSiECRCjUbEPNCRAhZ6NSiAARCjXbUHMCRMjZqBQiQIRCzTbUnAARcjYqhQgQoVCzDTUnQIScjUohAkQo1GxDzQkQIWejUogAEQo121BzAkTI2agUIkCEQs021JwAEXI2KoUIEKFQsw01J0CEnI1KIQJEKNRsQ80JECFno1KIABEKNdtQcwJEyNmoFCJAhELNNtScABFyNiqFCBChULMNNSdAhJyNSiEC/wGgKKC4YMA4TAAAAABJRU5ErkJggg=="
                    />
                  </div>
                )}
              </Col>
              <Col span={12}>
                <Card
                  title={
                    <Space>
                      <LinkOutlined />
                      {t('pageMessages:composer.buttons', 'Message Buttons')}
                      <Badge 
                        count={buttons.length} 
                        style={{ 
                          backgroundColor: buttons.length ? '#1890ff' : '#ccc',
                          boxShadow: buttons.length ? '0 2px 4px rgba(24, 144, 255, 0.2)' : 'none'
                        }} 
                      />
                    </Space>
                  }
                  size="small"
                  style={{ 
                    height: '100%',
                    borderRadius: '8px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
                  }}
                >
                  {/* Button list */}
                  {buttons.length > 0 && (
                    <List
                      itemLayout="horizontal"
                      dataSource={buttons}
                      style={{ marginBottom: 16 }}
                      renderItem={(button, idx) => (
                        <List.Item
                          actions={[
                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => handleRemoveButton(idx)}
                            />
                          ]}
                        >
                          <List.Item.Meta
                            avatar={
                              <Avatar 
                                icon={button.type === 'url' ? <LinkOutlined /> : <MessageOutlined />} 
                                style={{ backgroundColor: button.type === 'url' ? '#1890ff' : '#52c41a' }}
                              />
                            }
                            title={button.text}
                            description={button.type === 'url' 
                              ? <Tag color="blue">{button.url}</Tag> 
                              : <Tag color="green">{button.payload || t('pageMessages:composer.noPayload', 'No payload')}</Tag>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  )}
                  
                  {/* Button form */}
                  {buttons.length < 3 && (
                    <div>
                      <Form layout="vertical">
                        <Row gutter={16}>
                          <Col span={24}>
                            <Form.Item label={t('pageMessages:composer.buttonType', 'Button Type')}>
                              <Radio.Group 
                                value={buttonType}
                                onChange={(e) => setButtonType(e.target.value)}
                                style={{ width: '100%' }}
                                buttonStyle="solid"
                              >
                                <Radio.Button 
                                  value="url" 
                                  style={{ 
                                    width: '50%', 
                                    textAlign: 'center',
                                    borderTopLeftRadius: '8px',
                                    borderBottomLeftRadius: '8px'
                                  }}
                                >
                                  <LinkOutlined /> {t('pageMessages:composer.linkButton', 'Link')}
                                </Radio.Button>
                                <Radio.Button 
                                  value="postback" 
                                  style={{ 
                                    width: '50%', 
                                    textAlign: 'center',
                                    borderTopRightRadius: '8px',
                                    borderBottomRightRadius: '8px'
                                  }}
                                >
                                  <MessageOutlined /> {t('pageMessages:composer.quickReplyButton', 'Reply')}
                                </Radio.Button>
                              </Radio.Group>
                            </Form.Item>
                          </Col>
                        </Row>
                        
                        <Form.Item label={t('pageMessages:composer.buttonText', 'Button Text')}>
                          <Input
                            value={buttonText}
                            onChange={(e) => setButtonText(e.target.value)}
                            placeholder={t('pageMessages:composer.buttonTextPlaceholder', 'Enter button text...')}
                            style={{ borderRadius: '8px' }}
                            prefix={buttonType === 'url' ? <LinkOutlined /> : <MessageOutlined />}
                          />
                        </Form.Item>
                        
                        {buttonType === 'url' ? (
                          <Form.Item label={t('pageMessages:composer.buttonUrl', 'Button URL')}>
                            <Input
                              prefix={<LinkOutlined />}
                              type="url"
                              value={buttonUrl}
                              onChange={(e) => setButtonUrl(e.target.value)}
                              placeholder="https://"
                              style={{ borderRadius: '8px' }}
                            />
                          </Form.Item>
                        ) : (
                          <Form.Item label={t('pageMessages:composer.buttonPayload', 'Button Payload')}>
                            <Input
                              prefix={<MessageOutlined />}
                              value={buttonPayload}
                              onChange={(e) => setButtonPayload(e.target.value)}
                              placeholder={t('pageMessages:composer.buttonPayloadPlaceholder', 'Enter payload data (optional)')}
                              style={{ borderRadius: '8px' }}
                            />
                          </Form.Item>
                        )}
                        
                        <Form.Item>
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleAddButton}
                            style={{ 
                              borderRadius: '8px',
                              background: buttonType === 'url' ? '#1890ff' : '#52c41a',
                              borderColor: buttonType === 'url' ? '#1890ff' : '#52c41a'
                            }}
                          >
                            {t('pageMessages:composer.addButton', 'Add Button')}
                          </Button>
                        </Form.Item>
                      </Form>
                    </div>
                  )}
                </Card>
              </Col>
            </Row>
          </TabPane>
        </Tabs>
      </div>
    );
  };
  
  // Display Quick Reply Buttons in a dedicated section
  const renderQuickReplySection = () => {
    if (quickReplyButtons.length === 0) return null;
    
    return (
      <Card
        title={
          <Space>
            <SmileOutlined />
            {t('pageMessages:composer.enhancedQuickReply', 'Enhanced Quick Reply Buttons')}
          </Space>
        }
        style={{ 
          marginBottom: 24, 
          borderRadius: '12px',
          boxShadow: '0 3px 10px rgba(24, 144, 255, 0.1)',
          borderColor: '#1890ff'
        }}
      >
        <div className="enhanced-quickreply-container">
          <div className="quickreply-buttons-list" style={{ marginBottom: 16 }}>
            <Space wrap>
              {quickReplyButtons.map((button, index) => (
                <Tag
                  key={index}
                  color="blue"
                  closable
                  onClose={() => handleRemoveButton(index, 'quickReply')}
                  style={{ 
                    fontSize: 14,
                    padding: '6px 12px',
                    borderRadius: '16px'
                  }}
                >
                  <SmileOutlined style={{ marginRight: 4 }} />
                  {button.text}
                </Tag>
              ))}
            </Space>
          </div>
          
          <Alert
            message={t('pageMessages:composer.quickReplyInfo', 'Quick Reply Buttons Information')}
            description={
              <>
                <p>{t('pageMessages:composer.quickReplyDescription', 'Quick reply buttons provide an easy way for users to respond to your message by tapping a button instead of typing text.')}</p>
                <ul>
                  <li>{t('pageMessages:composer.quickReplyLimit', 'You can add up to 3 quick reply buttons.')}</li>
                  <li>{t('pageMessages:composer.quickReplyCharLimit', 'Each button text is limited to 20 characters.')}</li>
                  <li>{t('pageMessages:composer.quickReplyTip', 'Quick replies disappear after the user selects one or sends another message.')}</li>
                </ul>
              </>
            }
            type="info"
            showIcon
            style={{ 
              borderRadius: '8px',
              marginBottom: 0 
            }}
          />
        </div>
      </Card>
    );
  };
  
  // Render advanced delay settings drawer
  const renderDelaySettingsDrawer = () => {
    return (
      <Drawer
        title={
          <Space>
            <ClockCircleOutlined style={{ color: currentDelayColors.primary }} />
            <span style={{ fontWeight: 600 }}>{t('common:messageDelay', 'Message Delay')}</span>
            <Switch
              checked={enableDelay}
              onChange={(checked) => setEnableDelay(checked)}
              checkedChildren={t('common:enabled', 'Enabled')}
              unCheckedChildren={t('common:disabled', 'Disabled')}
            />
          </Space>
        }
        placement={isRTL ? 'left' : 'right'}
        onClose={() => setShowDelayDrawer(false)}
        open={showDelayDrawer}
        width={400}
        extra={
          <Space>
            <Button 
              type="primary"
              onClick={() => setShowDelayDrawer(false)}
            >
              {t('common:update', 'Update')}
            </Button>
          </Space>
        }
      >
        {enableDelay && (
          <div className="delay-settings">
            <Form layout="vertical">
              <Form.Item 
                label={
                  <Space>
                    <SettingOutlined />
                    <Text strong>{t('common:delayMode', 'Delay Mode')}</Text>
                  </Space>
                }
                help={t('pageMessages:campaigns.delayModeHelp', 'Choose how messages are delayed between recipients')}
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
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Space>
                        <ClockCircleOutlined style={{ fontSize: 18 }} />
                        <div>
                          <div>{t('common:fixedDelay', 'Fixed Delay')}</div>
                          <div style={{ fontSize: '12px', opacity: 0.8 }}>
                            {t('pageMessages:campaigns.fixedDelayDesc', 'Each message will be delayed by {{seconds}} seconds after the previous one', { seconds: String(delaySeconds) })}
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
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Space>
                        <SlackOutlined style={{ fontSize: 18 }} />
                        <div>
                          <div>{t('common:randomDelay', 'Random Delay')}</div>
                          <div style={{ fontSize: '12px', opacity: 0.8 }}>
                            {t('pageMessages:campaigns.randomDelayDesc', 'Each message will have a random delay between {{min}} and {{max}} seconds', { min: String(minDelaySeconds), max: String(maxDelaySeconds) })}
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
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Space>
                        <FieldTimeOutlined style={{ fontSize: 18 }} />
                        <div>
                          <div>{t('common:incrementalDelay', 'Incremental Delay')}</div>
                          <div style={{ fontSize: '12px', opacity: 0.8 }}>
                            {t('pageMessages:campaigns.incrementalDelayDesc', 'Starting with {{start}} seconds, each delay will increase by {{step}} seconds', { start: String(incrementalDelayStart), step: String(incrementalDelayStep) })}
                          </div>
                        </div>
                      </Space>
                    </Radio.Button>
                  </Space>
                </Radio.Group>
              </Form.Item>
              
              {delayMode === 'fixed' && (
                <Card
                  style={{
                    background: 'rgba(24, 144, 255, 0.05)',
                    borderRadius: '8px',
                    border: '1px solid rgba(24, 144, 255, 0.2)',
                    marginBottom: '24px'
                  }}
                >
                  <Form.Item 
                    label={
                      <Space>
                        <ClockCircleOutlined />
                        <span>{t('common:seconds', 'Seconds')}</span>
                      </Space>
                    }
                  >
                    <InputNumber
                      min={1}
                      max={60}
                      value={delaySeconds}
                      onChange={(value) => debouncedSetDelaySeconds(value)}
                      style={{ width: '100%' }}
                      addonAfter={t('common:seconds', 'seconds')}
                    />
                  </Form.Item>
                  
                  <Form.Item label={t('pageMessages:composer.delayPreview', 'Delay Preview')}>
                    <Timeline mode={isRTL ? 'right' : 'left'}>
                      <Timeline.Item 
                        dot={<FireOutlined style={{ fontSize: '16px' }} />}
                        color="blue"
                      >
                        {t('pageMessages:composer.firstMessage', 'First message')} (0s)
                      </Timeline.Item>
                      <Timeline.Item 
                        dot={<ClockCircleOutlined style={{ fontSize: '16px' }} />}
                        color="blue"
                      >
                        {t('pageMessages:composer.secondMessage', { seconds: delaySeconds })}
                      </Timeline.Item>
                      <Timeline.Item 
                        dot={<ClockCircleOutlined style={{ fontSize: '16px' }} />}
                        color="blue"
                      >
                        {t('pageMessages:composer.thirdMessage', { seconds: delaySeconds * 2 })}
                      </Timeline.Item>
                    </Timeline>
                  </Form.Item>
                </Card>
              )}
              
              {delayMode === 'random' && (
                <Card
                  style={{
                    background: 'rgba(114, 46, 209, 0.05)',
                    borderRadius: '8px',
                    border: '1px solid rgba(114, 46, 209, 0.2)',
                    marginBottom: '24px'
                  }}
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item 
                        label={
                          <Space>
                            <ClockCircleOutlined />
                            <span>{t('common:min', 'Minimum')}</span>
                          </Space>
                        }
                      >
                        <InputNumber
                          min={1}
                          max={maxDelaySeconds}
                          value={minDelaySeconds}
                          onChange={(value) => {
                            debouncedSetMinDelaySeconds(value);
                            if (value > maxDelaySeconds) {
                              debouncedSetMaxDelaySeconds(value);
                            }
                          }}
                          style={{ width: '100%' }}
                          addonAfter={t('common:seconds', 'seconds')}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item 
                        label={
                          <Space>
                            <ClockCircleOutlined />
                            <span>{t('common:max', 'Maximum')}</span>
                          </Space>
                        }
                      >
                        <InputNumber
                          min={minDelaySeconds}
                          max={60}
                          value={maxDelaySeconds}
                          onChange={(value) => debouncedSetMaxDelaySeconds(value)}
                          style={{ width: '100%' }}
                          addonAfter={t('common:seconds', 'seconds')}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Alert
                    type="info"
                    message={
                      <Text>
                        {t('pageMessages:composer.randomRangeInfo', 'Random delay between {{min}} and {{max}} seconds', { 
                          min: String(minDelaySeconds), 
                          max: String(maxDelaySeconds) 
                        })}
                      </Text>
                    }
                    style={{ marginBottom: '16px' }}
                  />
                  
                  <Form.Item label={t('pageMessages:composer.delayPreview', 'Delay Preview')}>
                    <Timeline mode={isRTL ? 'right' : 'left'}>
                      <Timeline.Item 
                        dot={<FireOutlined style={{ fontSize: '16px' }} />}
                        color="purple"
                      >
                        {t('pageMessages:composer.firstMessage', 'First message')} (0s)
                      </Timeline.Item>
                      <Timeline.Item 
                        dot={<SlackOutlined style={{ fontSize: '16px' }} />}
                        color="purple"
                      >
                        {t('pageMessages:composer.secondMessage', { seconds: t('pageMessages:composer.random', { min: minDelaySeconds, max: maxDelaySeconds }) })}
                      </Timeline.Item>
                      <Timeline.Item 
                        dot={<SlackOutlined style={{ fontSize: '16px' }} />}
                        color="purple"
                      >
                        {t('pageMessages:composer.thirdMessage', { seconds: t('pageMessages:composer.random', { min: minDelaySeconds, max: maxDelaySeconds }) })}
                      </Timeline.Item>
                    </Timeline>
                  </Form.Item>
                </Card>
              )}
              
              {delayMode === 'incremental' && (
                <Card
                  style={{
                    background: 'rgba(250, 140, 22, 0.05)',
                    borderRadius: '8px',
                    border: '1px solid rgba(250, 140, 22, 0.2)',
                    marginBottom: '24px'
                  }}
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item 
                        label={
                          <Space>
                            <ClockCircleOutlined />
                            <span>{t('common:startDelay', 'Start Delay')}</span>
                          </Space>
                        }
                      >
                        <InputNumber
                          min={0.5}
                          max={30}
                          step={0.5}
                          value={incrementalDelayStart}
                          onChange={(value) => debouncedSetIncrementalDelayStart(value)}
                          style={{ width: '100%' }}
                          addonAfter={t('common:seconds', 'seconds')}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item 
                        label={
                          <Space>
                            <FieldTimeOutlined />
                            <span>{t('common:incrementStep', 'Increment Step')}</span>
                          </Space>
                        }
                      >
                        <InputNumber
                          min={0.1}
                          max={10}
                          step={0.1}
                          value={incrementalDelayStep}
                          onChange={(value) => debouncedSetIncrementalDelayStep(value)}
                          style={{ width: '100%' }}
                          addonAfter={t('common:seconds', 'seconds')}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Alert
                    type="info"
                    message={
                      <Text>
                        {t('pageMessages:composer.incrementalInfo', 'Starting with {{start}}s and increasing by {{step}}s each time', { 
                          start: String(incrementalDelayStart), 
                          step: String(incrementalDelayStep) 
                        })}
                      </Text>
                    }
                    style={{ marginBottom: '16px' }}
                  />
                  
                  <Form.Item label={t('pageMessages:composer.delayPreview', 'Delay Preview')}>
                    <Timeline mode={isRTL ? 'right' : 'left'}>
                      <Timeline.Item 
                        dot={<FireOutlined style={{ fontSize: '16px' }} />}
                        color="orange"
                      >
                        {isRTL ? t('pageMessages:composer.firstMessage', 'First message') : t('pageMessages:composer.firstMessage', 'First message') + ' (0s)'}
                      </Timeline.Item>
                      <Timeline.Item 
                        dot={<ClockCircleOutlined style={{ fontSize: '16px' }} />}
                        color="orange"
                      >
                        {t('pageMessages:composer.secondMessage', { seconds: incrementalDelayStart })}
                      </Timeline.Item>
                      <Timeline.Item 
                        dot={<FieldTimeOutlined style={{ fontSize: '16px' }} />}
                        color="orange"
                      >
                        {t('pageMessages:composer.thirdMessage', { seconds: (incrementalDelayStart + incrementalDelayStep).toFixed(1) })}
                      </Timeline.Item>
                      <Timeline.Item 
                        dot={<FieldTimeOutlined style={{ fontSize: '16px' }} />}
                        color="orange"
                      >
                        {t('pageMessages:composer.fourthMessage', { seconds: (incrementalDelayStart + incrementalDelayStep * 2).toFixed(1) })}
                      </Timeline.Item>
                    </Timeline>
                  </Form.Item>
                </Card>
              )}
              
              {selectedSenders.length > 1 && (
                <Card 
                  title={
                    <Space>
                      <FieldTimeOutlined />
                      <Text>{t('pageMessages:campaigns.estimatedTiming', 'Estimated Timing')}</Text>
                    </Space>
                  }
                  style={{ 
                    marginTop: 16,
                    borderRadius: '8px'
                  }}
                >
                  <Row gutter={16} align="middle">
                    <Col span={24}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Text>
                          <HourglassOutlined style={{ marginRight: 8 }} />
                          <Text strong>{t('pageMessages:campaigns.totalEstimatedTime', 'Total Estimated Time')}:</Text> {estimatedTime}
                        </Text>

                        <div style={{ marginTop: 8 }}>
                          <Progress 
                            percent={100} 
                            status="active" 
                            strokeColor={currentDelayColors.primary}
                            style={{ marginBottom: 8 }}
                          />
                        </div>
                      </Space>
                    </Col>
                  </Row>
                </Card>
              )}
            </Form>
          </div>
        )}
      </Drawer>
    );
  };
  
  // Render image upload modal
  const renderImageUploadModal = () => {
    return (
      <Modal
        title={t('pageMessages:composer.uploadImage', 'Upload Image')}
        open={showImageUpload}
        onCancel={() => setShowImageUpload(false)}
        footer={null}
        width={520}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Upload.Dragger
            name="file"
            beforeUpload={handleImageUpload}
            showUploadList={false}
            accept="image/*"
            style={{ padding: '40px 0' }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            </p>
            <p className="ant-upload-text" style={{ fontSize: 16, fontWeight: 500 }}>
              {t('pageMessages:composer.dropImageHere', 'Click or drag image to this area to upload')}
            </p>
            <p className="ant-upload-hint" style={{ fontSize: 13, color: '#8c8c8c' }}>
              {t('pageMessages:composer.imageHint', 'Upload an image to Facebook CDN. Supported formats: JPG, PNG, GIF')}
            </p>
          </Upload.Dragger>
          
          <div style={{ marginTop: 20 }}>
            <Text type="secondary">
              {t('pageMessages:composer.imageUrlAlternative', 'Alternatively, you can directly paste an image URL in the form.')}
            </Text>
          </div>
          
          <div style={{ marginTop: 20 }}>
            <Button 
              type="primary" 
              onClick={() => setShowImageUpload(false)}
              style={{ marginRight: 8, borderRadius: '8px' }}
            >
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button
              onClick={() => window.open('https://postimages.org/', '_blank')}
              icon={<UploadOutlined />}
              style={{ borderRadius: '8px' }}
            >
              {t('pageMessages:composer.useExternalUploader', 'Use External Image Host')}
            </Button>
          </div>
        </div>
      </Modal>
    );
  };
  
  // Render image preview modal
  const renderImagePreviewModal = () => {
    return (
      <Modal
        visible={previewVisible}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
      >
        <img alt="preview" style={{ width: '100%' }} src={previewImage} />
      </Modal>
    );
  };
  
  // Render delay settings floating button when multiple recipients selected
  const renderDelaySettingsButton = () => {
    if (selectedSenders.length <= 1) return null;
    
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          [isRTL ? 'left' : 'right']: 24,
          zIndex: 1000
        }}
      >
        <Button
          type="primary"
          size="large"
          shape="circle"
          icon={<ClockCircleOutlined />}
          onClick={() => setShowDelayDrawer(true)}
          style={{
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            background: enableDelay ? currentDelayColors.primary : '#8c8c8c'
          }}
        />
      </div>
    );
  };
  
  // Render enhanced personalization settings
  const renderPersonalizationSettings = () => {
    return (
      <Card
        title={
          <Space>
            <ProfileOutlined />
            {t('pageMessages:composer.personalization', 'Personalization')}
          </Space>
        }
        extra={
          <Switch
            checked={personalization}
            onChange={(checked) => setPersonalization(checked)}
            checkedChildren={t('common:enabled', 'Enabled')}
            unCheckedChildren={t('common:disabled', 'Disabled')}
          />
        }
        style={{ 
          marginBottom: 24, 
          borderRadius: '12px',
          boxShadow: personalization ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
          borderColor: personalization ? '#52c41a' : '#d9d9d9'
        }}
      >
        {personalization && (
          <div>
            <Alert
              type="info"
              message={
                <>
                  <Text strong>{t('pageMessages:composer.personalizationHelp', 'You can use the following variables in your message:')}</Text>
                  <ul style={{ marginBottom: 0, paddingLeft: 20, marginTop: 8 }}>
                    <li>
                      <Text code>#recipient_name#</Text> - {t('pageMessages:composer.recipientNameVar', "Recipient's name")}
                    </li>
                    <li>
                      <Text code>#date#</Text> - {t('pageMessages:composer.dateVar', "Today's date")}
                    </li>
                    <li>
                      <Text code>#time#</Text> - {t('pageMessages:composer.timeVar', "Current time")}
                    </li>
                  </ul>
                </>
              }
              style={{ padding: '12px' }}
            />
            
            <div style={{ marginTop: 16 }}>
              <Text strong>{t('pageMessages:composer.clickToInsert', 'Click to insert:')}</Text>
              <div style={{ marginTop: 8 }}>
                <Space wrap>
                  <Tag 
                    color="blue" 
                    style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '12px' }}
                    onClick={() => setMessageText(prev => prev + ' #recipient_name#')}
                  >
                    <UserOutlined /> #recipient_name#
                  </Tag>
                  <Tag 
                    color="green" 
                    style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '12px' }}
                    onClick={() => setMessageText(prev => prev + ' #date#')}
                  >
                    <CalendarOutlined /> #date#
                  </Tag>
                  <Tag 
                    color="orange" 
                    style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '12px' }}
                    onClick={() => setMessageText(prev => prev + ' #time#')}
                  >
                    <ClockCircleOutlined /> #time#
                  </Tag>
                </Space>
              </div>
            </div>
          </div>
        )}
      </Card>
    );
  };
  
  // Optimized recipients display with virtualization for better performance
  const renderRecipientsDisplay = () => {
    // Determine how many recipients to show directly (1-5 based on total)
    const getVisibleCount = () => {
      const totalRecipients = selectedSenders.length;
      if (totalRecipients <= 5) return totalRecipients; // Show all if 5 or fewer
      
      // Otherwise show a decreasing number based on total count to keep it compact
      if (totalRecipients > 100) return 1;
      if (totalRecipients > 50) return 2;
      if (totalRecipients > 20) return 3;
      return 5; // For counts between 6-20, show 5
    };
    
    const visibleCount = getVisibleCount();
    const hasMore = selectedSenders.length > visibleCount;
    const remainingCount = selectedSenders.length - visibleCount;
    
    // Simple direct strings - avoid any translation interpolation issues
    const recipientsLabel = t('pageMessages:composer.recipients', 'Recipients');
    const loadingLabel = t('common:loading', 'Loading...');
    const noRecipientsLabel = t('pageMessages:composer.noRecipientsSelected', 'No recipients selected');
    const ofLabel = t('pageMessages:composer.ofTotal', 'of');
    const recipientsShownLabel = t('pageMessages:composer.recipientsShown', 'recipients');
    
    // Format with direct concatenation instead of template strings or objects
    const showRecipientCountMsg = () => {
      const countLabel = t('pageMessages:composer.totalRecipientsCount', 'recipients selected');
      message.info(selectedSenders.length + ' ' + countLabel);
    };
    
    // Tooltip text is also directly computed
    const recipientsCountTooltip = selectedSenders.length + ' ' + 
      t('pageMessages:composer.recipientsSelectedLabel', 'recipients selected');
    
    return (
      <Card 
        title={
          <Space>
            <UserOutlined />
            {recipientsLabel}
            <Badge 
              count={selectedSenders.length} 
              style={{ 
                backgroundColor: selectedSenders.length ? '#1890ff' : '#ccc',
                boxShadow: selectedSenders.length ? '0 2px 4px rgba(24, 144, 255, 0.2)' : 'none'
              }}
              overflowCount={999} 
            />
          </Space>
        }
        style={{ 
          marginBottom: 24, 
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          transition: 'all 0.3s ease'
        }}
        bodyStyle={{ 
          padding: selectedSenders.length ? '12px' : '24px',
          maxHeight: '100px', // Even more compact than before
          overflowY: 'auto'
        }}
        onScroll={onRecipientListScroll}
      >
        {loadingRecipients ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <Spin size="small" />
            <div style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>{loadingLabel}</Text>
            </div>
          </div>
        ) : selectedSenders.length === 0 ? (
          <Empty 
            image={Empty.PRESENTED_IMAGE_SIMPLE} 
            description={noRecipientsLabel}
            style={{ margin: '0', padding: '8px 0' }}
          />
        ) : (
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '4px', // Even smaller gap
            alignItems: 'center',
            padding: '4px 0'
          }}>
            {/* Visible recipients (1-5) */}
            {selectedSenders.slice(0, visibleCount).map((sender, index) => (
              <Tag
                key={sender.id || index}
                color="blue"
                style={{
                  padding: '2px 8px',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '11px', // Smaller font
                  margin: 0,
                  height: '24px' // Shorter height
                }}
              >
                <Avatar
                  size="small"
                  style={{
                    backgroundColor: '#1890ff',
                    marginRight: '4px',
                    fontSize: '9px',
                    width: '16px', // Smaller avatar
                    height: '16px',
                    lineHeight: '16px'
                  }}
                >
                  {sender.name ? sender.name.charAt(0).toUpperCase() : '?'}
                </Avatar>
                <Text ellipsis style={{ maxWidth: '65px' }}>
                  {sender.name || 'Unknown'}
                </Text>
              </Tag>
            ))}
            
            {/* "+X more" avatar for additional recipients */}
            {hasMore && (
              <Avatar
                size="small"
                style={{
                  backgroundColor: '#ff4d4f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  width: '22px', // Smaller avatar 
                  height: '22px',
                  lineHeight: '22px'
                }}
                onClick={showRecipientCountMsg}
              >
                +{remainingCount}
              </Avatar>
            )}
            
            {selectedSenders.length > 10 && (
              <Tooltip title={recipientsCountTooltip}>
                <Text type="secondary" style={{ fontSize: '10px', marginLeft: 'auto' }}>
                  {visibleCount} {ofLabel} {selectedSenders.length} {recipientsShownLabel}
                </Text>
              </Tooltip>
            )}
          </div>
        )}
      </Card>
    );
  };
  
  // Enhanced delay settings card
  const renderCompactDelaySettings = () => {
    if (selectedSenders.length <= 1) return null;
    
    return (
      <Card
        title={
          <Space>
            <ClockCircleOutlined style={{ color: enableDelay ? currentDelayColors.primary : '#bfbfbf' }} />
            {t('common:messageDelay', 'Message Delay')}
            <Tooltip title={t('pageMessages:composer.delayTooltip', 'Configure how messages are sent with time delays between recipients')}>
              <QuestionCircleOutlined />
            </Tooltip>
          </Space>
        }
        extra={
          <Space>
            <Switch
              checked={enableDelay}
              onChange={(checked) => setEnableDelay(checked)}
              checkedChildren={t('common:enabled', 'Enabled')}
              unCheckedChildren={t('common:disabled', 'Disabled')}
            />
            <Button 
              type="text" 
              icon={<SettingOutlined />} 
              onClick={() => setShowDelayDrawer(true)}
              size="small"
            />
          </Space>
        }
        style={{ 
          borderRadius: '12px',
          border: `1px solid ${enableDelay ? currentDelayColors.border : '#f0f0f0'}`,
          boxShadow: enableDelay ? `0 3px 10px ${currentDelayColors.secondary}` : 'none',
          marginBottom: '24px'
        }}
      >
        {enableDelay ? (
          <div>
            <Space style={{ marginBottom: 16 }}>
              <Badge status="processing" color={currentDelayColors.primary} />
              <Text>
                <Text strong>{t('common:delayMode', 'Delay Mode')}:</Text>{' '}
                {delayMode === 'fixed' 
                  ? t('common:fixedDelay', 'Fixed Delay') 
                  : delayMode === 'random' 
                    ? t('common:randomDelay', 'Random Delay')
                    : t('common:incrementalDelay', 'Incremental Delay')
                }
              </Text>
            </Space>
            
            <div style={{ marginBottom: 16 }}>
              {delayMode === 'fixed' && (
                <Tag color="blue" style={{ padding: '4px 8px', borderRadius: '12px' }}>
                  <ClockCircleOutlined /> {delaySeconds} {t('common:seconds', 'seconds')}
                </Tag>
              )}
              {delayMode === 'random' && (
                <Tag color="purple" style={{ padding: '4px 8px', borderRadius: '12px' }}>
                  <SlackOutlined /> {minDelaySeconds} - {maxDelaySeconds} {t('common:seconds', 'seconds')}
                </Tag>
              )}
              {delayMode === 'incremental' && (
                <Tag color="orange" style={{ padding: '4px 8px', borderRadius: '12px' }}>
                  <FieldTimeOutlined /> {t('common:startDelay', 'Start')}: {incrementalDelayStart}s, +{incrementalDelayStep}s
                </Tag>
              )}
            </div>
            
            <Divider style={{ margin: '16px 0' }} />
            
            <Row gutter={16} align="middle">
              <Col span={16}>
                <Space>
                  <HourglassOutlined style={{ color: currentDelayColors.primary }} />
                  <Text strong>{t('common:estimatedTime', 'Estimated Time')}:</Text>
                  <Text>{estimatedTime}</Text>
                </Space>
              </Col>
              <Col span={8} style={{ textAlign: isRTL ? 'left' : 'right' }}>
                <Button
                  type="primary"
                  onClick={() => setShowDelayDrawer(true)}
                  style={{ 
                    borderRadius: '8px',
                    background: currentDelayColors.primary,
                    borderColor: currentDelayColors.primary
                  }}
                >
                  {t('pageMessages:composer.adjust', 'Adjust')}
                </Button>
              </Col>
            </Row>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <BulbOutlined style={{ fontSize: 24, color: '#bfbfbf', marginBottom: 16 }} />
            <Paragraph>
              {t('pageMessages:composer.delayDisabled', 'Message delay is disabled. All messages will be sent as quickly as possible.')}
            </Paragraph>
            <Button
              type="primary"
              onClick={() => {
                setEnableDelay(true);
                setShowDelayDrawer(true);
              }}
            >
              {t('pageMessages:composer.enableDelay', 'Enable Delay')}
            </Button>
          </div>
        )}
      </Card>
    );
  };
  
  return (
    <ConfigProvider direction={isRTL ? 'rtl' : 'ltr'}>
      <div className="message-composer">
        <Card
          title={
            <Space size="middle">
              <SendOutlined style={{ fontSize: '18px', color: '#1890ff' }} />
              <Title level={4} style={{ margin: 0 }}>
                {t('pageMessages:composer.title', 'Message Composer')}
              </Title>
            </Space>
          }
          extra={
            <Space>
              {selectedSenders.length > 0 && (
                <Badge 
                  count={selectedSenders.length} 
                  overflowCount={999}
                  style={{
                    backgroundColor: '#1890ff',
                    boxShadow: '0 2px 4px rgba(24, 144, 255, 0.2)'
                  }}
                >
                  <Tag color="blue" style={{ borderRadius: '16px', padding: '4px 8px' }}>
                    {t('pageMessages:composer.useSelectedRecipients').replace("{{count}}", selectedSenders.length)}
                  </Tag>
                </Badge>
              )}
              <Button
                type={showPreview ? "primary" : "default"}
                icon={<EyeOutlined />}
                onClick={() => setShowPreview(!showPreview)}
                style={{ borderRadius: '8px' }}
              >
                {showPreview ? t('common:hidePreview', 'Hide Preview') : t('pageMessages:composer.preview', 'Preview')}
              </Button>
            </Space>
          }
          style={{ 
            borderRadius: '12px', 
            overflow: 'hidden', 
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
          }}
          bodyStyle={{ padding: '24px' }}
        >
          {!selectedPage ? (
            <Alert
              type="warning"
              message={t('pageMessages:selectPageFirst', 'Please select a page first')}
              icon={<WarningOutlined />}
              showIcon
              style={{ marginBottom: 16, borderRadius: '8px' }}
            />
          ) : selectedSenders.length === 0 ? (
            <Alert
              type="info"
              message={t('pageMessages:composer.noRecipientsSelected', 'No recipients selected')}
              icon={<InfoCircleOutlined />}
              showIcon
              style={{ marginBottom: 16, borderRadius: '8px' }}
            />
          ) : (
            <Row gutter={24}>
              <Col xs={24} lg={showPreview ? 14 : 24}>
                {/* Main content area */}
                <div>
                  {/* Recipients display */}
                  {renderRecipientsDisplay()}
                  
                  {/* Message Content Form */}
                  {renderMessageContentForm()}
                  
                  {/* Quick Reply Section - Only show if quickReplyButtons exist */}
                  {quickReplyButtons.length > 0 && renderQuickReplySection()}
                  
                  {/* Delay Settings - Prominent for multiple recipients */}
                  {renderCompactDelaySettings()}
                  
                  {/* Personalization Settings */}
                  {renderPersonalizationSettings()}
                  
                  {/* Status alerts */}
                  {sendError && (
                    <Alert
                      type="error"
                      message={sendError}
                      icon={<WarningOutlined />}
                      showIcon
                      style={{ marginBottom: 16, borderRadius: '8px' }}
                    />
                  )}
                  
                  {sendSuccess && (
                    <Alert
                      type="success"
                      message={t('pageMessages:composer.messageSentSuccess', 'Message sent successfully')}
                      icon={<CheckCircleOutlined />}
                      showIcon
                      style={{ marginBottom: 16, borderRadius: '8px' }}
                    />
                  )}
                  
                  {/* Send button */}
                  <Button
                    type="primary"
                    size="large"
                    icon={isSending ? <Spin size="small" /> : <SendOutlined />}
                    onClick={handleSendMessage}
                    disabled={isSending || !validateForm() || selectedSenders.length === 0}
                    block
                    style={{ 
                      height: '48px', 
                      borderRadius: '8px',
                      background: 'linear-gradient(90deg, #1890ff 0%, #096dd9 100%)',
                      border: 'none',
                      fontWeight: 500,
                      fontSize: '16px',
                      boxShadow: '0 2px 8px rgba(24, 144, 255, 0.35)'
                    }}
                  >
                    {isSending ? t('common:sending', 'Sending...') : t('pageMessages:composer.sendMessage', 'Send Message')}
                  </Button>
                </div>
              </Col>
              
              {showPreview && (
                <Col xs={24} lg={10}>
                  {renderMessagePreview()}
                </Col>
              )}
            </Row>
          )}
        </Card>
        
        {/* Delay Settings Drawer */}
        {renderDelaySettingsDrawer()}
        
        {/* Image Upload Modal */}
        {renderImageUploadModal()}
        
        {/* Image Preview Modal */}
        {renderImagePreviewModal()}
        
        {/* Floating Delay Button */}
        {renderDelaySettingsButton()}
      </div>
    </ConfigProvider>
  );
};

export default MessageComposer;