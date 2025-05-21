import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Modal, Form, Input, InputNumber, Switch, 
  Tag, Popconfirm, Tabs, Space, Card, Typography, List, ConfigProvider, 
  Divider, Badge, Spin
} from 'antd';
import PriceDisplay from '../../components/PriceDisplay';
import MembershipPointsIntegration from '../../components/MembershipPointsIntegration';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, 
  CheckCircleOutlined, CloseCircleOutlined, 
  CrownOutlined, SaveOutlined, FileAddOutlined,
  ExclamationCircleOutlined, DollarOutlined, UserOutlined,
  TrophyOutlined, CalendarOutlined
} from '@ant-design/icons';
import { useNotification } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../utils/api';
import '../../styles/AdminMembershipPlans.css';
import '../../styles/MembershipPointsIntegration.css';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

const AdminMembershipPlans = () => {
  // Hooks and context
  const { addNotification } = useNotification();
  const { t, direction } = useLanguage();
  
  // State management
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPlanForPoints, setSelectedPlanForPoints] = useState(null);
  const [editingPoints, setEditingPoints] = useState(false);
  const [features, setFeatures] = useState([]);
  const [featureInput, setFeatureInput] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  
  // Loading states
  const [plansLoading, setPlansLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  
  // Subscription statistics
  const [subscriptionStats, setSubscriptionStats] = useState({
    total: 0,
    active: 0,
    expired: 0,
    revenue: 0
  });

  // RTL support - Determine if we're in RTL mode
  const isRTL = direction === 'rtl';
  
  // CSS class prefixes for RTL support
  const rtlClass = (className) => isRTL ? `${className} rtl-${className}` : className;
  
  // Fetch data on component mount
  useEffect(() => {
    fetchPlans();
    fetchSubscriptionStats();
  }, []);

  // Fetch plans from the API
  const fetchPlans = async () => {
    try {
      setPlansLoading(true);
      const response = await api.get('/membership-plans');
      setPlans(response.data);
      
      // Select first plan for points management if none selected
      if (response.data.length > 0 && !selectedPlanForPoints) {
        setSelectedPlanForPoints(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching membership plans:', error);
      addNotification({
        title: t('error'),
        message: t('plans_fetch_failed'),
        type: 'error'
      });
    } finally {
      setPlansLoading(false);
      setIsLoading(false);
    }
  };

  // Fetch subscription statistics from the API
  const fetchSubscriptionStats = async () => {
    try {
      setStatsLoading(true);
      const response = await api.get('/subscriptions/stats');
      setSubscriptionStats(response.data);
    } catch (error) {
      console.error('Error fetching subscription stats:', error);
      addNotification({
        title: t('error'),
        message: t('stats_fetch_failed'),
        type: 'error'
      });
      setSubscriptionStats({
        total: 0,
        active: 0,
        expired: 0,
        revenue: 0,
        byPlan: [],
        recent: []
      });
    } finally {
      setStatsLoading(false);
    }
  };

  // Show modal to create a new plan
  const showCreateModal = () => {
    setCurrentPlan(null);
    setEditMode(false);
    setFeatures([]);
    form.resetFields();
    
    // Set default values
    form.setFieldsValue({
      isActive: true,
      points: 0,
      discount: 0
    });
    
    setModalVisible(true);
  };

  // Show modal to edit an existing plan
  const showEditModal = (plan) => {
    setCurrentPlan(plan);
    setEditMode(true);
    setFeatures(plan.features || []);
    
    // Set form fields from plan data
    form.setFieldsValue({
      name: plan.name,
      description: plan.description,
      price: plan.price,
      duration: plan.duration,
      points: plan.points || 0,
      discount: plan.discount || 0,
      isActive: plan.isActive
    });
    
    setModalVisible(true);
  };

  // Close modal and reset form
  const handleCancel = () => {
    setModalVisible(false);
    form.resetFields();
  };

  // Add a feature to the features list
  const handleAddFeature = () => {
    if (featureInput.trim()) {
      setFeatures([...features, featureInput.trim()]);
      setFeatureInput('');
    }
  };

  // Remove a feature from the features list
  const handleRemoveFeature = (index) => {
    const newFeatures = [...features];
    newFeatures.splice(index, 1);
    setFeatures(newFeatures);
  };

  // Submit form to create or update a plan
  const handleSubmit = async () => {
    try {
      setFormSubmitting(true);
      
      // Validate form fields
      const values = await form.validateFields();
      
      // Add features to form values
      values.features = features;
      
      if (editMode && currentPlan) {
        // Update existing plan
        const response = await api.put(`/membership-plans/${currentPlan._id}`, values);
        
        if (response.status === 200) {
          addNotification({
            title: t('success'),
            message: t('plan_updated'),
            type: 'success'
          });
          setModalVisible(false);
          fetchPlans(); // Refresh plan list
        }
      } else {
        // Create new plan
        const response = await api.post('/membership-plans', values);
        
        if (response.status === 201) {
          addNotification({
            title: t('success'),
            message: t('plan_created'),
            type: 'success'
          });
          setModalVisible(false);
          fetchPlans(); // Refresh plan list
        }
      }
    } catch (error) {
      console.error('Error saving membership plan:', error);
      
      // Handle validation errors
      if (error.errorFields) {
        // Form validation error
        return;
      }
      
      // Handle API errors
      addNotification({
        title: t('error'),
        message: error.response?.data?.message || t('plan_save_failed'),
        type: 'error'
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete a plan
  const handleDelete = async (planId) => {
    try {
      setIsLoading(true);
      await api.delete(`/membership-plans/${planId}`);
      
      addNotification({
        title: t('success'),
        message: t('plan_deleted'),
        type: 'success'
      });
      
      fetchPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      addNotification({
        title: t('error'),
        message: error.response?.data?.message || t('plan_delete_failed'),
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle plan activation status
  const toggleActivation = async (plan) => {
    try {
      setIsLoading(true);
      
      const updatedPlan = { ...plan, isActive: !plan.isActive };
      await api.put(`/membership-plans/${plan._id}`, updatedPlan);
      
      addNotification({
        title: t('success'),
        message: updatedPlan.isActive 
          ? t('plan_activated') 
          : t('plan_deactivated'),
        type: 'success'
      });
      
      fetchPlans();
    } catch (error) {
      console.error('Error updating plan status:', error);
      addNotification({
        title: t('error'),
        message: t('plan_status_update_failed'),
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Save points settings for a plan
  const handleSavePoints = async (updatedPlan) => {
    try {
      setIsLoading(true);
      await api.put(`/membership-plans/${updatedPlan._id}`, updatedPlan);
      
      addNotification({
        title: t('success'),
        message: t('points_updated'),
        type: 'success'
      });
      
      // Update the selected plan with new points
      setSelectedPlanForPoints(updatedPlan);
      
      // Refresh all plans
      fetchPlans();
      setEditingPoints(false);
    } catch (error) {
      console.error('Error updating plan points:', error);
      addNotification({
        title: t('error'),
        message: t('points_update_failed'),
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Select a plan for points management
  const handleSelectPlanForPoints = (plan) => {
    setSelectedPlanForPoints(plan);
    setEditingPoints(false);
  };

  // Table columns with proper RTL/LTR handling
  const columns = [
    {
      title: t('plan_name'),
      dataIndex: 'name',
      key: 'name',
      className: isRTL ? 'rtl-column' : '',
    },
    {
      title: t('plan_description'),
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      className: isRTL ? 'rtl-column' : '',
    },
    {
      title: t('price_usd'),
      dataIndex: 'price',
      key: 'price',
      render: (price) => <PriceDisplay amount={price} showEgp={false} size="small" inline={true} />,
      sorter: (a, b) => a.price - b.price,
      className: isRTL ? 'rtl-column' : '',
    },
    {
      title: t('duration_days'),
      dataIndex: 'duration',
      key: 'duration',
      render: (duration) => `${duration} ${t('days')}`,
      sorter: (a, b) => a.duration - b.duration,
      className: isRTL ? 'rtl-column' : '',
    },
    {
      title: t('points'),
      dataIndex: 'points',
      key: 'points',
      render: (points) => (
        <span>
          <TrophyOutlined style={{ 
            color: '#faad14', 
            marginRight: isRTL ? '0' : '5px', 
            marginLeft: isRTL ? '5px' : '0' 
          }} />
          {points || 0}
        </span>
      ),
      sorter: (a, b) => (a.points || 0) - (b.points || 0),
      className: isRTL ? 'rtl-column' : '',
    },
    {
      title: t('discount'),
      dataIndex: 'discount',
      key: 'discount',
      render: (discount) => (
        discount > 0 ? (
          <Tag color="error" style={{ fontWeight: 'bold' }}>
            {discount}%
          </Tag>
        ) : (
          <span>-</span>
        )
      ),
      sorter: (a, b) => (a.discount || 0) - (b.discount || 0),
      className: isRTL ? 'rtl-column' : '',
    },
    {
      title: t('status'),
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        isActive ? (
          <span className="status-active"><CheckCircleOutlined />{t('active')}</span>
        ) : (
          <span className="status-inactive"><CloseCircleOutlined />{t('inactive')}</span>
        )
      ),
      filters: [
        { text: t('active'), value: true },
        { text: t('inactive'), value: false },
      ],
      onFilter: (value, record) => record.isActive === value,
      className: isRTL ? 'rtl-column' : '',
    },
    {
      title: t('actions'),
      key: 'actions',
      render: (_, record) => (
        <Space size="small" className={isRTL ? 'rtl-space' : ''}>
          <Button 
            type="primary" 
            icon={<EditOutlined />}
            onClick={() => showEditModal(record)}
            size="small"
          />
          
          <Button
            type={record.isActive ? "dashed" : "primary"}
            icon={record.isActive ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
            onClick={() => toggleActivation(record)}
            size="small"
          />
          
          <Popconfirm
            title={t('confirm_delete_plan')}
            onConfirm={() => handleDelete(record._id)}
            okText={t('yes')}
            cancelText={t('no')}
            icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
            placement={isRTL ? 'bottomLeft' : 'bottomRight'}
          >
            <Button 
              danger 
              icon={<DeleteOutlined />}
              size="small"
            />
          </Popconfirm>
        </Space>
      ),
      className: isRTL ? 'rtl-column rtl-actions' : '',
    },
  ];

  // Render the dashboard tab content
  const renderDashboard = () => (
    <div className={rtlClass('dashboard-container')}>
      <Title level={4} className={rtlClass('section-title')}>
        {t('membership_stats')}
      </Title>
      
      {statsLoading ? (
        <div className="admin-membership-loading">
          <Spin size="large" tip={t('loading_stats')} />
        </div>
      ) : (
        <div className={rtlClass('stats-cards')}>
          <div className={rtlClass('stats-card')}>
            <UserOutlined />
            <Text strong>{t('total_subscriptions')}</Text>
            <Title level={2}>{subscriptionStats.total}</Title>
          </div>
          
          <div className={rtlClass('stats-card')}>
            <CheckCircleOutlined />
            <Text strong>{t('active_subscriptions')}</Text>
            <Title level={2}>{subscriptionStats.active}</Title>
          </div>
          
          <div className={rtlClass('stats-card')}>
            <CloseCircleOutlined />
            <Text strong>{t('expired_subscriptions')}</Text>
            <Title level={2}>{subscriptionStats.expired}</Title>
          </div>
          
          <div className={rtlClass('stats-card')}>
            <DollarOutlined />
            <Text strong>{t('total_revenue')}</Text>
            <Title level={2}>
              <PriceDisplay amount={subscriptionStats.revenue} showEgp={false} showDetail={false} />
            </Title>
          </div>
        </div>
      )}
      
      <Divider />
      
      <div className={rtlClass('quick-actions')}>
        <Title level={4} className={rtlClass('section-title')}>
          {t('quick_actions')}
        </Title>
        
        <Button 
          type="primary" 
          icon={<FileAddOutlined />} 
          size="large" 
          onClick={showCreateModal}
        >
          {t('add_new_membership_plan')}
        </Button>
      </div>
    </div>
  );

  // Render the plans list tab content
  const renderPlansList = () => (
    <div className={rtlClass('plans-list-container')}>
      <div className={rtlClass('table-header')}>
        <div className={isRTL ? 'rtl-title-container' : ''}>
          <Title level={4} className={isRTL ? 'rtl-title' : ''}>
            {t('available_membership_plans')}
          </Title>
        </div>
        
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={showCreateModal}
        >
          {t('add_new_plan')}
        </Button>
      </div>
      
      <Table 
        columns={columns} 
        dataSource={plans} 
        rowKey="_id"
        loading={plansLoading}
        pagination={{ pageSize: 5 }}
        className={isRTL ? 'rtl-table' : ''}
        locale={{
          emptyText: t('no_plans_found'),
          triggerDesc: t('click_to_sort_desc'),
          triggerAsc: t('click_to_sort_asc'),
          cancelSort: t('click_to_cancel_sort')
        }}
        expandable={{
          expandedRowRender: record => (
            <div className={rtlClass('expanded-row')}>
              <Title level={5} className={isRTL ? 'rtl-title' : ''}>
                {t('features')}
              </Title>
              
              <List
                dataSource={record.features || []}
                renderItem={item => (
                  <List.Item>
                    <Badge 
                      status="processing" 
                      color="#1890ff" 
                      text={item} 
                      className={isRTL ? 'rtl-badge' : ''}
                    />
                  </List.Item>
                )}
                className={isRTL ? 'rtl-list' : ''}
              />
            </div>
          ),
        }}
      />
    </div>
  );

  // Render the points management tab content
  const renderPointsManagement = () => (
    <div className={rtlClass('points-management-container')}>
      <div className={rtlClass('points-header')}>
        <Title level={4} className={isRTL ? 'rtl-title' : ''}>
          {t('manage_membership_points')}
        </Title>
        
        <Space className={isRTL ? 'rtl-space' : ''}>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => setEditingPoints(!editingPoints)}
          >
            {editingPoints ? t('cancel_edit') : t('edit_points')}
          </Button>
        </Space>
      </div>
      
      <div className={rtlClass('plan-selection')}>
        <Title level={5} className={isRTL ? 'rtl-title' : ''}>
          {t('select_plan_to_manage')}
        </Title>
        
        <Space wrap className={isRTL ? 'rtl-space' : ''}>
          {plans.map(plan => (
            <Button
              key={plan._id}
              type={selectedPlanForPoints && selectedPlanForPoints._id === plan._id ? 'primary' : 'default'}
              onClick={() => handleSelectPlanForPoints(plan)}
              style={{ margin: '5px' }}
            >
              {plan.name} ({plan.points || 0} {t('points')})
            </Button>
          ))}
        </Space>
      </div>
      
      <Divider />
      
      {selectedPlanForPoints && (
        <MembershipPointsIntegration 
          plan={selectedPlanForPoints}
          onSave={handleSavePoints}
          isEditing={editingPoints}
          direction={direction}
        />
      )}
    </div>
  );

  // Main component render
  return (
    <ConfigProvider direction={direction}>
      <div className={rtlClass('admin-membership-plans-page')} dir={direction}>
        <div className={rtlClass('page-header')}>
          <CrownOutlined className={rtlClass('page-icon')} />
          <div className="header-text">
            <h1>{t('membership_plans_management')}</h1>
            <p>{t('membership_plans_description')}</p>
          </div>
        </div>
        
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab} 
          className={rtlClass('main-tabs')}
          tabPosition="top"
        >
          <TabPane tab={t('dashboard')} key="dashboard">
            {renderDashboard()}
          </TabPane>
          
          <TabPane tab={t('membership_plans')} key="plans">
            {renderPlansList()}
          </TabPane>
          
          <TabPane tab={t('points_management')} key="points">
            {renderPointsManagement()}
          </TabPane>
        </Tabs>
        
        {/* Plan Form Modal */}
        <Modal
          title={editMode ? t('edit_membership_plan') : t('add_membership_plan')}
          className={isRTL ? 'rtl-modal' : ''}
          open={modalVisible}
          onCancel={handleCancel}
          footer={[
            <Button key="back" onClick={handleCancel}>
              {t('cancel')}
            </Button>,
            <Button 
              key="submit" 
              type="primary" 
              loading={formSubmitting}
              onClick={handleSubmit}
              icon={editMode ? <SaveOutlined /> : <FileAddOutlined />}
            >
              {editMode ? t('save_changes') : t('add_plan')}
            </Button>,
          ]}
          width={800}
          centered
          maskClosable={false}
          destroyOnClose={true}
          forceRender
        >
          <Form
            form={form}
            layout="vertical"
            className={rtlClass('plan-form')}
            requiredMark="optional"
            validateMessages={{
              required: t('field_required'),
              types: {
                number: t('field_must_be_number'),
              },
              number: {
                min: t('min_value', { min: '${min}' }),
                max: t('max_value', { max: '${max}' }),
              }
            }}
          >
            {/* Basic Plan Information Section */}
            <div className={rtlClass('form-section-title')}>
              {t('basic_plan_information')}
            </div>
            
            <Form.Item
              name="name"
              label={t('plan_name')}
              rules={[
                { required: true, message: t('enter_plan_name') }
              ]}
              className={isRTL ? 'rtl-form-item' : ''}
            >
              <Input 
                placeholder={t('plan_name_placeholder')} 
                prefix={<CrownOutlined style={{ color: '#1890ff' }} />}
              />
            </Form.Item>
            
            <Form.Item
              name="description"
              label={t('plan_description')}
              rules={[
                { required: true, message: t('enter_plan_description') }
              ]}
              className={isRTL ? 'rtl-form-item' : ''}
            >
              <TextArea 
                rows={4} 
                placeholder={t('plan_description_placeholder')} 
              />
            </Form.Item>
            
            {/* Pricing & Duration Section */}
            <div className={rtlClass('form-section-title')}>
              {t('pricing_and_duration')}
            </div>
            
            <div className={rtlClass('form-row')}>
              <Form.Item
                name="price"
                label={t('price_usd')}
                rules={[
                  { required: true, message: t('enter_plan_price') },
                  { type: 'number', min: 0, message: t('price_must_be_positive') }
                ]}
                className={`half-width ${isRTL ? 'rtl-form-item' : ''}`}
              >
                <InputNumber
                  min={0}
                  step={1}
                  placeholder={t('price_placeholder')}
                  style={{ width: '100%' }}
                  prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
                />
              </Form.Item>
              
              <Form.Item
                name="duration"
                label={t('duration_days')}
                rules={[
                  { required: true, message: t('enter_plan_duration') },
                  { type: 'number', min: 1, message: t('duration_must_be_positive') }
                ]}
                className={`half-width ${isRTL ? 'rtl-form-item' : ''}`}
              >
                <InputNumber
                  min={1}
                  step={1}
                  placeholder={t('duration_placeholder')}
                  style={{ width: '100%' }}
                  prefix={<CalendarOutlined style={{ color: '#722ed1' }} />}
                />
              </Form.Item>
            </div>
            
            {/* Bonuses Section */}
            <div className={rtlClass('form-section-title')}>
              {t('bonuses_and_discounts')}
            </div>
            
            <div className={rtlClass('form-row')}>
              <Form.Item
                name="points"
                label={t('bonus_points')}
                rules={[
                  { type: 'number', min: 0, message: t('points_must_be_positive') }
                ]}
                tooltip={t('points_tooltip')}
                initialValue={0}
                className={`half-width ${isRTL ? 'rtl-form-item' : ''}`}
              >
                <InputNumber
                  min={0}
                  step={100}
                  placeholder={t('points_placeholder')}
                  style={{ width: '100%' }}
                  prefix={<TrophyOutlined style={{ color: '#faad14' }} />}
                />
              </Form.Item>
              
              <Form.Item
                name="discount"
                label={t('discount_percentage')}
                rules={[
                  { type: 'number', min: 0, max: 100, message: t('discount_must_be_valid') }
                ]}
                tooltip={t('discount_tooltip')}
                initialValue={0}
                className={`half-width ${isRTL ? 'rtl-form-item' : ''}`}
              >
                <InputNumber
                  min={0}
                  max={100}
                  step={5}
                  placeholder={t('discount_placeholder')}
                  style={{ width: '100%' }}
                  prefix="%" 
                  formatter={value => `${value}`}
                  parser={value => value.replace('%', '')}
                />
              </Form.Item>
            </div>
            
            {/* Features Section */}
            <div className={rtlClass('form-section-title')}>
              {t('plan_features_and_benefits')}
            </div>
            
            <Form.Item
              className={rtlClass('features-section')}
            >
              <div className={rtlClass('features-input')}>
                <Input
                  placeholder={t('add_new_feature')}
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  onPressEnter={handleAddFeature}
                  prefix={<PlusOutlined style={{ color: '#1890ff' }} />}
                />
                <Button 
                  type="primary" 
                  onClick={handleAddFeature}
                  disabled={!featureInput.trim()}
                >
                  {t('add_feature')}
                </Button>
              </div>
              
              <div className={rtlClass('features-list')}>
                {features.length === 0 ? (
                  <div className={rtlClass('empty-features')}>
                    <Text type="secondary">{t('no_features_added')}</Text>
                  </div>
                ) : (
                  features.map((feature, index) => (
                    <Tag
                      key={index}
                      closable
                      onClose={() => handleRemoveFeature(index)}
                      className={rtlClass('feature-tag')}
                    >
                      {feature}
                    </Tag>
                  ))
                )}
              </div>
            </Form.Item>
            
            {/* Status Section */}
            <div className={rtlClass('form-section-title')}>
              {t('plan_status_and_visibility')}
            </div>
            
            <Form.Item
              name="isActive"
              label={t('plan_status')}
              valuePropName="checked"
              initialValue={true}
              className={isRTL ? 'rtl-form-item' : ''}
            >
              <Switch
                checkedChildren={t('active')}
                unCheckedChildren={t('inactive')}
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default AdminMembershipPlans;