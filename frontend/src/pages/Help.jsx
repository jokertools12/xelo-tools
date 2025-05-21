import React, { useState, useEffect } from 'react';
import { formatDate, formatDateTime, formatRelativeTime } from '../utils/dateUtils';
import { 
  Card, Typography, Collapse, Row, Col, Form, Input, Button, Select, 
  Divider, Steps, Tag, Space, Alert, message as antMessage,
  Badge, Avatar, Spin
} from 'antd';
import { useLanguage } from '../context/LanguageContext';
import { 
  QuestionCircleOutlined, InfoCircleOutlined, SendOutlined, 
  CheckCircleOutlined, ToolOutlined, RocketOutlined, 
  BookOutlined, SettingOutlined, CodeOutlined, UserOutlined,
  SolutionOutlined, TeamOutlined, GlobalOutlined, 
  ExclamationCircleOutlined, LikeOutlined, FileTextOutlined,
  MailOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import { useMessage } from '../context/MessageContext';
import ContentContainer from '../components/ContentContainer';
import '../styles/Help.css';

const { Title, Paragraph } = Typography;
const { Panel } = Collapse;
const { TextArea } = Input;
const { Option } = Select;
const { Step } = Steps;

const Help = () => {
  const { t } = useLanguage();
  // State for form and UI
  const [loading, setLoading] = useState(false);
  const [messageHistory, setMessageHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('guide');
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  // State for conversation view
  const [replyLoading, setReplyLoading] = useState(false);
  
  // Form
  const [form] = Form.useForm();
  
  // Reply form
  const [replyForm] = Form.useForm();
  
  // Context
  const { user } = useUser();
  const { showSuccess: displaySuccess, showError } = useMessage();
  
  // Fetch user's message history
  useEffect(() => {
    const fetchMessageHistory = async () => {
      try {
        const response = await axios.get('/api/support/messages');
        setMessageHistory(response.data);
      } catch (error) {
        console.error('Error fetching support messages:', error);
        // Use mock data for development if needed
        setMessageHistory([]);
      }
    };
    
    if (user) {
      fetchMessageHistory();
    }
  }, [user]);
  
  // Handle form submission
  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      
      const response = await axios.post('/api/support/message', values);
      
      if (response.data) {
        form.resetFields();
        setShowSuccess(true);
        displaySuccess(t('message_sent_success_notification'));
        
        // Add the new message to history
        setMessageHistory([response.data, ...messageHistory]);
        
        // Hide success message after 5 seconds
        setTimeout(() => {
          setShowSuccess(false);
        }, 5000);
      }
    } catch (error) {
      console.error('Error sending support message:', error);
      showError(t('error_sending_message'));
    } finally {
      setLoading(false);
    }
  };

  // Helper to render status tag for messages
  const renderStatusTag = (status) => {
    switch (status) {
      case 'new':
        return <Tag color="blue">{t('status_new')}</Tag>;
      case 'in-progress':
        return <Tag color="orange">{t('status_in_progress')}</Tag>;
      case 'resolved':
        return <Tag color="green">{t('status_resolved')}</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };
  
  // Render the getting started guide section
  const renderGuide = () => (
    <div className="help-section">
      <Title level={3} className="section-title">
        <RocketOutlined className="section-icon" /> {t('quick_start_guide')}
      </Title>
      
      <Paragraph className="guide-intro">
        {t('guide_intro')}
      </Paragraph>
      
      <Steps direction="vertical" current={-1} className="getting-started-steps">
        <Step 
          title={t('step_create_account')} 
          description={
            <div>
              <Paragraph>
                {t('step_create_account_description')}
              </Paragraph>
              <ul className="step-details">
                <li dangerouslySetInnerHTML={{ __html: t('step_create_account_detail1') }} />
                <li>{t('step_create_account_detail2')}</li>
                <li>{t('step_create_account_detail3')}</li>
              </ul>
            </div>
          }
          icon={<UserOutlined />}
        />
        <Step 
          title={t('step_get_token')} 
          description={
            <div>
              <Paragraph>
                {t('step_get_token_description')}
              </Paragraph>
              <ul className="step-details">
                <li dangerouslySetInnerHTML={{ __html: t('step_get_token_detail1') }} />
                <li>{t('step_get_token_detail2')}</li>
                <li>{t('step_get_token_detail3')}</li>
              </ul>
              <Alert 
                type="warning" 
                message={t('important_note')} 
                description={t('token_warning')}
                showIcon
              />
            </div>
          }
          icon={<CodeOutlined />}
        />
        <Step 
          title={t('step_use_tools')} 
          description={
            <div>
              <Paragraph>
                {t('step_use_tools_description')}
              </Paragraph>
              <ul className="step-details">
                <li dangerouslySetInnerHTML={{ __html: t('step_use_tools_detail1') }} />
                <li dangerouslySetInnerHTML={{ __html: t('step_use_tools_detail2') }} />
                <li dangerouslySetInnerHTML={{ __html: t('step_use_tools_detail3') }} />
              </ul>
            </div>
          }
          icon={<ToolOutlined />}
        />
        <Step 
          title={t('step_manage_pages')} 
          description={
            <div>
              <Paragraph>
                {t('step_manage_pages_description')}
              </Paragraph>
              <ul className="step-details">
                <li dangerouslySetInnerHTML={{ __html: t('step_manage_pages_detail1') }} />
                <li dangerouslySetInnerHTML={{ __html: t('step_manage_pages_detail2') }} />
                <li dangerouslySetInnerHTML={{ __html: t('step_manage_pages_detail3') }} />
              </ul>
            </div>
          }
          icon={<SolutionOutlined />}
        />
        <Step 
          title={t('step_track_achievements')} 
          description={
            <div>
              <Paragraph>
                {t('step_track_achievements_description')}
              </Paragraph>
              <ul className="step-details">
                <li>{t('step_track_achievements_detail1')}</li>
                <li>{t('step_track_achievements_detail2')}</li>
                <li>{t('step_track_achievements_detail3')}</li>
              </ul>
            </div>
          }
          icon={<LikeOutlined />}
        />
      </Steps>
    </div>
  );
  
  // Render the features section
  const renderFeatures = () => (
    <div className="help-section">
      <Title level={3} className="section-title">
        <SettingOutlined className="section-icon" /> {t('main_features')}
      </Title>
      
      <Row gutter={[24, 24]} className="features-grid">
        <Col xs={24} sm={12} md={8}>
          <Card className="feature-card">
            <div className="feature-icon-container">
              <TeamOutlined className="feature-icon" />
            </div>
            <Title level={4}>{t('feature_extract_groups')}</Title>
            <Paragraph>
              {t('feature_extract_groups_desc')}
            </Paragraph>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8}>
          <Card className="feature-card">
            <div className="feature-icon-container">
              <FileTextOutlined className="feature-icon" />
            </div>
            <Title level={4}>{t('feature_extract_comments')}</Title>
            <Paragraph>
              {t('feature_extract_comments_desc')}
            </Paragraph>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8}>
          <Card className="feature-card">
            <div className="feature-icon-container">
              <GlobalOutlined className="feature-icon" />
            </div>
            <Title level={4}>{t('feature_manage_pages')}</Title>
            <Paragraph>
              {t('feature_manage_pages_desc')}
            </Paragraph>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8}>
          <Card className="feature-card">
            <div className="feature-icon-container">
              <RocketOutlined className="feature-icon" />
            </div>
            <Title level={4}>{t('feature_auto_post')}</Title>
            <Paragraph>
              {t('feature_auto_post_desc')}
            </Paragraph>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8}>
          <Card className="feature-card">
            <div className="feature-icon-container">
              <BookOutlined className="feature-icon" />
            </div>
            <Title level={4}>{t('feature_templates')}</Title>
            <Paragraph>
              {t('feature_templates_desc')}
            </Paragraph>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8}>
          <Card className="feature-card">
            <div className="feature-icon-container">
              <LikeOutlined className="feature-icon" />
            </div>
            <Title level={4}>{t('feature_achievements')}</Title>
            <Paragraph>
              {t('feature_achievements_desc')}
            </Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  );
  
  // Render FAQ section
  const renderFAQ = () => (
    <div className="help-section">
      <Title level={3} className="section-title">
        <QuestionCircleOutlined className="section-icon" /> {t('faq')}
      </Title>
      
      <Collapse 
        accordion 
        className="faq-collapse" 
        expandIconPosition="end"
      >
        <Panel header={t('faq_token')} key="1">
          <Paragraph>
            {t('faq_token_answer1')}
          </Paragraph>
          <ol>
            <li>{t('faq_token_answer2')}</li>
            <li>{t('faq_token_answer3')}</li>
            <li>{t('faq_token_answer4')}</li>
            <li>{t('faq_token_answer5')}</li>
          </ol>
          <Alert
            type="info"
            message={t('faq_token_note')}
            showIcon
          />
        </Panel>

        <Panel header={t('faq_extract_data')} key="2">
          <Paragraph>
            {t('faq_extract_data_answer1')}
          </Paragraph>
          <ol>
            <li>{t('faq_extract_data_answer2')}</li>
            <li>{t('faq_extract_data_answer3')}</li>
            <li>{t('faq_extract_data_answer4')}</li>
            <li>{t('faq_extract_data_answer5')}</li>
            <li>{t('faq_extract_data_answer6')}</li>
          </ol>
        </Panel>

        <Panel header={t('faq_schedule_posts')} key="3">
          <Paragraph>
            {t('faq_schedule_posts_answer1')}
          </Paragraph>
          <ol>
            <li>{t('faq_schedule_posts_answer2')}</li>
            <li>{t('faq_schedule_posts_answer3')}</li>
            <li>{t('faq_schedule_posts_answer4')}</li>
            <li>{t('faq_schedule_posts_answer5')}</li>
            <li>{t('faq_schedule_posts_answer6')}</li>
          </ol>
          <Alert
            type="success"
            message={t('faq_schedule_posts_tip')}
            showIcon
          />
        </Panel>

        <Panel header={t('faq_points')} key="4">
          <Paragraph>
            {t('faq_points_answer1')}
          </Paragraph>
          <ul>
            <li>{t('faq_points_answer2')}</li>
            <li>{t('faq_points_answer3')}</li>
            <li>{t('faq_points_answer4')}</li>
            <li>{t('faq_points_answer5')}</li>
            <li>{t('faq_points_answer6')}</li>
          </ul>
        </Panel>

        <Panel header={t('faq_system_requirements')} key="5">
          <Paragraph>
            {t('faq_system_requirements_answer1')}
          </Paragraph>
          <ul>
            <li>{t('faq_system_requirements_answer2')}</li>
            <li>{t('faq_system_requirements_answer3')}</li>
            <li>{t('faq_system_requirements_answer4')}</li>
            <li>{t('faq_system_requirements_answer5')}</li>
          </ul>
        </Panel>

        <Panel header={t('faq_effectiveness')} key="6">
          <Paragraph>
            {t('faq_effectiveness_answer1')}
          </Paragraph>
          <ol>
            <li dangerouslySetInnerHTML={{ __html: t('faq_effectiveness_answer2') }} />
            <li dangerouslySetInnerHTML={{ __html: t('faq_effectiveness_answer3') }} />
            <li dangerouslySetInnerHTML={{ __html: t('faq_effectiveness_answer4') }} />
            <li dangerouslySetInnerHTML={{ __html: t('faq_effectiveness_answer5') }} />
            <li dangerouslySetInnerHTML={{ __html: t('faq_effectiveness_answer6') }} />
          </ol>
          <Alert
            type="info"
            message={t('faq_effectiveness_tip')}
            showIcon
          />
        </Panel>
      </Collapse>
    </div>
  );
  
  // Render support form section
  const renderSupportForm = () => (
    <div className="help-section">
      <Title level={3} className="section-title">
        <SendOutlined className="section-icon" /> {t('contact_support')}
      </Title>
      
      {showSuccess && (
        <Alert
          message={t('message_sent_success')}
          description={t('support_will_respond')}
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          closable
          className="success-alert"
          onClose={() => setShowSuccess(false)}
        />
      )}
      
      <Row gutter={[24, 24]}>
        <Col xs={24} md={14}>
          <Card className="support-form-card">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              requiredMark={false}
              className="support-form"
            >
              <Form.Item
                name="subject"
                label={t('subject')}
                rules={[{ required: true, message: t('please_enter_subject') }]}
              >
                <Input placeholder={t('enter_subject')} className="form-input" />
              </Form.Item>
              
              <Form.Item
                name="category"
                label={t('category')}
                rules={[{ required: true, message: t('please_select_category') }]}
              >
                <Select placeholder={t('select_message_category')} className="form-select">
                  <Option value="technical">{t('technical_issue')}</Option>
                  <Option value="billing">{t('billing_inquiry')}</Option>
                  <Option value="general">{t('general_inquiry')}</Option>
                  <Option value="bug">{t('report_bug')}</Option>
                  <Option value="feature">{t('feature_request')}</Option>
                </Select>
              </Form.Item>
              
              <Form.Item
                name="priority"
                label={t('priority')}
                rules={[{ required: true, message: t('please_select_priority') }]}
              >
                <Select placeholder={t('select_priority_level')} className="form-select">
                  <Option value="low">{t('low')}</Option>
                  <Option value="medium">{t('medium')}</Option>
                  <Option value="high">{t('high')}</Option>
                </Select>
              </Form.Item>
              
              <Form.Item
                name="message"
                label={t('your_message')}
                rules={[{ required: true, message: t('please_enter_message') }]}
              >
                <TextArea 
                  placeholder={t('write_message_here')} 
                  rows={6} 
                  className="form-textarea"
                />
              </Form.Item>
              
              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={loading}
                  icon={<SendOutlined />}
                  className="submit-button"
                >
                  {t('send_message')}
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
        
        <Col xs={24} md={10}>
          <Card className="contact-info-card">
            <Title level={4}>
              <InfoCircleOutlined /> {t('contact_info')}
            </Title>
            <Paragraph>
              {t('contact_info_description')}
            </Paragraph>
            <ul className="contact-list">
              <li>
                <i className="contact-icon fas fa-envelope"></i>
                {t('email')}: support@example.com
              </li>
              <li>
                <i className="contact-icon fas fa-phone-alt"></i>
                {t('phone')}: +1234567890
              </li>
              <li>
                <i className="contact-icon fas fa-clock"></i>
                {t('working_hours')}: {t('working_hours_value')}
              </li>
            </ul>
            
            {messageHistory.length > 0 && (
              <div className="message-history">
                <Divider />
                <Title level={5}>
                  <MailOutlined /> {t('your_previous_messages')}
                </Title>
                <div className="history-list">
                  {messageHistory.slice(0, 3).map((msg, index) => (
                    <div key={index} className="history-item">
                      <div className="history-header">
                        <span className="history-subject">{msg.subject}</span>
                        {renderStatusTag(msg.status)}
                      </div>
                      <div className="history-date">
                        {formatDate(msg.createdAt)}
                      </div>
                    </div>
                  ))}
                  {messageHistory.length > 3 && (
                    <div className="view-all">{t('view_all_messages')} ({messageHistory.length})</div>
                  )}
                </div>
              </div>
            )}
          </Card>
          
          <Card className="support-tips-card">
            <ExclamationCircleOutlined className="tips-icon" />
            <Title level={5}>{t('tips_for_faster_support')}</Title>
            <ul className="tips-list">
              <li>{t('tip_detailed_description')}</li>
              <li>{t('tip_screenshots')}</li>
              <li>{t('tip_steps')}</li>
              <li>{t('tip_browser_os')}</li>
            </ul>
          </Card>
        </Col>
      </Row>
    </div>
  );

  // Tab navigation
  // Handle viewing a message conversation
  const handleViewConversation = async (messageId) => {
    try {
      const response = await axios.get(`/api/support/messages/${messageId}`);
      setSelectedMessage(response.data);
      
      // Always mark the message as viewed when selected to ensure persistence
      if (messageHistory.length > 0) {
        // Update local state immediately for smoother UX
        setMessageHistory(prev => 
          prev.map(msg => 
            msg._id === messageId ? {...msg, viewed: true, lastViewedByUser: new Date()} : msg
          )
        );
        
        // Always update on the server to ensure persistence after page refresh
        axios.put(`/api/support/messages/${messageId}/viewed`)
          .catch(err => console.error('Error marking message as viewed:', err));
      }
    } catch (error) {
      console.error('Error fetching message details:', error);
      showError(t('error_fetching_message_details'));
    }
  };

  // Handle user reply to admin
  const handleReply = async () => {
    try {
      setReplyLoading(true);
      const values = await replyForm.validateFields();
      
      // Send the reply - backend automatically sets viewed=true and lastViewedByUser on user reply
      await axios.post(`/api/support/messages/${selectedMessage._id}/reply`, {
        message: values.replyText
      });
      
      // Refresh the message details
      const response = await axios.get(`/api/support/messages/${selectedMessage._id}`);
      setSelectedMessage(response.data);
      
      // Reset form
      replyForm.resetFields();
      
      // Show success message
      antMessage.success(t('reply_sent_successfully'));
      
      // Always mark as viewed when user replies (both locally and on server)
      // Update local state immediately for better UX
      setMessageHistory(prev => 
        prev.map(msg => 
          msg._id === selectedMessage._id ? {...msg, viewed: true, lastViewedByUser: new Date()} : msg
        )
      );
      
      // Explicitly ensure viewed status is updated on server for persistence
      await axios.put(`/api/support/messages/${selectedMessage._id}/viewed`)
        .catch(err => console.error('Error marking message as viewed:', err));
      
      // Refresh message history
      const historyResponse = await axios.get('/api/support/messages');
      setMessageHistory(historyResponse.data);
    } catch (error) {
      console.error('Error sending reply:', error);
      showError(t('error_sending_reply'));
    } finally {
      setReplyLoading(false);
    }
  };

  // Count unread messages (messages with admin responses that haven't been viewed)
  const countUnreadMessages = () => {
    return messageHistory.filter(msg => {
      // Check for admin responses
      if (!msg.responses || !msg.responses.some(resp => resp.isAdminResponse)) {
        return false;
      }
      
      // Check viewed status - if explicitly marked as unviewed, count it
      if (msg.viewed === false) {
        return true;
      }
      
      // If lastAdminResponseAt is after lastViewedByUser, it's unread
      if (msg.lastAdminResponseAt && msg.lastViewedByUser) {
        const lastAdminResponse = new Date(msg.lastAdminResponseAt);
        const lastViewed = new Date(msg.lastViewedByUser);
        return lastAdminResponse > lastViewed;
      }
      
      // If there's no lastViewedByUser but there are admin responses, count as unread
      if (msg.responses.some(resp => resp.isAdminResponse) && !msg.lastViewedByUser) {
        return true;
      }
      
      return !msg.viewed;
    }).length;
  };

  // Render the messages history tab
  const renderMessagesTab = () => {
    
    return (
      <div className="help-section messages-section">
        <Title level={3} className="section-title">
          <MailOutlined className="section-icon" /> {t('my_messages')}
        </Title>
        
        {messageHistory.length === 0 ? (
          <Alert
            message={t('no_messages')}
            description={t('no_messages_description')}
            type="info"
            showIcon
            className="no-messages-alert"
          />
        ) : (
          <Row gutter={[24, 0]} className="messages-container-row">
            {/* Messages List - Left Side */}
            <Col xs={24} md={8} className="messages-list-column">
              <div className="messages-list-container">
                <div className="messages-list-header">
                  <Title level={5}>{t('all_messages')}</Title>
                  <Badge count={countUnreadMessages()} className="unread-badge" />
                </div>
                
                <div className="messages-list">
                  {messageHistory.map((message) => {
                    // Check if this message has unread admin responses
                    const hasUnreadAdminResponses = message.responses && 
                      message.responses.some(resp => resp.isAdminResponse) && 
                      !message.viewed;
                    
                    return (
                      <div 
                        key={message._id} 
                        className={`message-list-item ${selectedMessage && selectedMessage._id === message._id ? 'active' : ''} ${hasUnreadAdminResponses ? 'unread' : ''}`}
                        onClick={() => {
                          handleViewConversation(message._id);
                          // Mark as viewed
                          if (hasUnreadAdminResponses) {
                            // Update local state immediately for smoother UX
                            setMessageHistory(prev => 
                              prev.map(msg => 
                                msg._id === message._id ? {...msg, viewed: true} : msg
                              )
                            );
                            
                            // Also update on the server
                            axios.put(`/api/support/messages/${message._id}/viewed`)
                              .catch(err => console.error('Error marking message as viewed:', err));
                          }
                        }}
                      >
                        <div className="message-list-item-content">
                          <div className="message-list-subject">
                            {message.subject}
                            {hasUnreadAdminResponses && <Badge status="processing" className="new-response-badge" />}
                          </div>
                          
                          <div className="message-list-meta">
                            <div className="message-list-status">{renderStatusTag(message.status)}</div>
                            <div className="message-list-date">
                              {formatDate(message.createdAt)}
                            </div>
                          </div>
                          
                          <div className="message-list-preview">
                            {message.message.substring(0, 60)}...
                          </div>
                          
                          {message.responses && message.responses.length > 0 && (
                            <div className="message-list-count">
                              <Badge 
                                count={message.responses.length} 
                                className={hasUnreadAdminResponses ? "new-badge" : ""} 
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Col>
            
            {/* Conversation View - Right Side */}
            <Col xs={24} md={16} className="conversation-column">
              {selectedMessage ? (
                <div className="conversation-container">
                  <div className="conversation-header">
                    <div className="conversation-header-content">
                      <div className="conversation-subject">
                        <Title level={4}>{selectedMessage.subject}</Title>
                      </div>
                      <div className="conversation-meta">
                        <Space>
                          {renderStatusTag(selectedMessage.status)}
                          <Tag color="blue">{selectedMessage.category}</Tag>
                          <Tag color={selectedMessage.priority === 'high' ? 'red' : selectedMessage.priority === 'medium' ? 'orange' : 'green'}>
                            {selectedMessage.priority === 'high' ? t('high') : selectedMessage.priority === 'medium' ? t('medium') : t('low')}
                          </Tag>
                        </Space>
                      </div>
                    </div>
                  </div>
                  
                  <div className="conversation-messages">
                    {/* Original message */}
                    <div className="conversation-message original-message">
                      <div className="message-avatar">
                        <Avatar icon={<UserOutlined />} />
                      </div>
                      <div className="message-bubble">
                        <div className="message-sender">
                          <div className="sender-name">{t('you')}</div>
                          <div className="message-time">
                            {formatDateTime(selectedMessage.createdAt)}
                          </div>
                        </div>
                        <div className="message-content">
                          {selectedMessage.message}
                        </div>
                      </div>
                    </div>
                    
                    {/* Response thread */}
                    {selectedMessage.responses && selectedMessage.responses.length > 0 ? (
                      <div className="conversation-responses">
                        {selectedMessage.responses.map((response, index) => (
                          <div 
                            key={index} 
                            className={`conversation-message ${response.isAdminResponse ? 'admin-response' : 'user-response'}`}
                          >
                            <div className="message-avatar">
                              <Avatar 
                                icon={response.isAdminResponse ? <SolutionOutlined /> : <UserOutlined />}
                                className={response.isAdminResponse ? 'admin-avatar' : 'user-avatar'}
                              />
                            </div>
                            <div className="message-bubble">
                              <div className="message-sender">
                                <div className="sender-name">
                                  {response.isAdminResponse ? (
                                    <><span>{response.adminName}</span> <Tag color="blue">{t('admin')}</Tag></>
                                  ) : (
                                    t('you')
                                  )}
                                </div>
                                <div className="message-time">
                                  {formatDateTime(response.createdAt)}
                                </div>
                              </div>
                              <div className="message-content">
                                {response.message}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="no-responses">
                        <Alert
                          message={t('no_responses_yet')}
                          description={t('no_responses_description')}
                          type="info"
                          showIcon
                          className="no-responses-alert"
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Reply form - only show if the message is not resolved */}
                  {selectedMessage.status !== 'resolved' && (
                    <div className="reply-form-container">
                      <Divider>{t('reply_to_message')}</Divider>
                      <Form form={replyForm} onFinish={handleReply} layout="vertical">
                        <div className="reply-input-container">
                          <Form.Item
                            name="replyText"
                            rules={[{ required: true, message: t('please_enter_reply_text') }]}
                            className="reply-form-item"
                          >
                            <TextArea 
                              rows={3} 
                              placeholder={t('write_reply_here')} 
                              className="reply-textarea" 
                            />
                          </Form.Item>
                          <Button 
                            type="primary" 
                            icon={<SendOutlined />} 
                            onClick={() => replyForm.submit()}
                            loading={replyLoading}
                            className="send-reply-button"
                          />
                        </div>
                      </Form>
                    </div>
                  )}
                </div>
              ) : (
                <div className="no-message-selected">
                  <div className="select-message-prompt">
                    <MailOutlined className="mail-icon" />
                    <Title level={4}>{t('select_message_to_view')}</Title>
                    <Paragraph>
                      {t('select_message_to_view_description')}
                    </Paragraph>
                  </div>
                </div>
              )}
            </Col>
          </Row>
        )}
      </div>
    );
  };

  // Tab navigation
  const renderTabs = () => (
    <div className="help-tabs">
      <div 
        className={`help-tab ${activeTab === 'guide' ? 'active' : ''}`} 
        onClick={() => setActiveTab('guide')}
      >
        <RocketOutlined /> {t('getting_started')}
      </div>
      <div 
        className={`help-tab ${activeTab === 'features' ? 'active' : ''}`} 
        onClick={() => setActiveTab('features')}
      >
        <SettingOutlined /> {t('features')}
      </div>
      <div 
        className={`help-tab ${activeTab === 'faq' ? 'active' : ''}`} 
        onClick={() => setActiveTab('faq')}
      >
        <QuestionCircleOutlined /> {t('faq')}
      </div>
      <div 
        className={`help-tab ${activeTab === 'support' ? 'active' : ''}`} 
        onClick={() => setActiveTab('support')}
      >
        <SendOutlined /> {t('support')}
      </div>
      <div 
        className={`help-tab ${activeTab === 'messages' ? 'active' : ''}`} 
        onClick={() => setActiveTab('messages')}
      >
        <div className="message-tab-wrapper">
          <MailOutlined className={countUnreadMessages() > 0 ? 'mail-icon-notification' : ''} /> 
          <span>{t('my_messages')}</span>
          {countUnreadMessages() > 0 && (
            <Badge 
              count={countUnreadMessages()} 
              className="unread-tab-badge"
              style={{
                backgroundColor: '#f5222d',
                boxShadow: '0 0 0 2px #fff',
                animation: 'pulse 2s infinite'
              }}
            />
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <ContentContainer>
      <div className="help-page">
        <div className="help-header">
          <div className="header-content">
            <Title level={1} className="page-title">{t('help_center')}</Title>
            <Paragraph className="page-description">
              {t('help_center_description')}
            </Paragraph>
          </div>
          <div className="header-illustration">
            <img src="/images/support.svg" alt={t('help_center')} className="illustration" />
          </div>
        </div>
        
        {renderTabs()}
        
        <div className="help-content">
          {activeTab === 'guide' && renderGuide()}
          {activeTab === 'features' && renderFeatures()}
          {activeTab === 'faq' && renderFAQ()}
          {activeTab === 'support' && renderSupportForm()}
          {activeTab === 'messages' && renderMessagesTab()}
        </div>
      </div>
    </ContentContainer>
  );
};

export default Help;