import React, { useState, useEffect, useRef } from 'react';
import {
  Typography, Table, Card, Form, Input, InputNumber, Button, Space,
  Select, Divider, Tabs, Tag, DatePicker, Tooltip, Alert,
  Statistic, Row, Col, Spin, Empty, Result, Badge, message, Modal
} from 'antd';
import {
  SearchOutlined, TrophyOutlined, CheckCircleOutlined,
  UserOutlined, TeamOutlined, HistoryOutlined,
  SendOutlined, InfoCircleOutlined, DeploymentUnitOutlined,
  CalendarOutlined, BarsOutlined, PlusOutlined, FireOutlined,
  GiftOutlined, RocketOutlined
} from '@ant-design/icons';
import { useNotification } from '../../context/NotificationContext';
import api from '../../utils/api';
import '../../styles/AdminPointsManagement.css';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Option } = Select;

const AdminPointsManagement = () => {
  const { addNotification } = useNotification();
  const [isLoading, setIsLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchedUser, setSearchedUser] = useState(null);
  const [previousPoints, setPreviousPoints] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [addedPoints, setAddedPoints] = useState(0);
  const [highlightStats, setHighlightStats] = useState(false);
  const [activeTab, setActiveTab] = useState('assign');
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();
  const [pointsTransactions, setPointsTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filterUserId, setFilterUserId] = useState('');
  const [filterDateRange, setFilterDateRange] = useState(null);
  const statsRef = useRef(null);
  const confettiCanvasRef = useRef(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [countUp, setCountUp] = useState(false);
  const [countingValue, setCountingValue] = useState(0);
  
  // Reset form when user changes
  useEffect(() => {
    if (searchedUser) {
      form.setFieldsValue({
        userId: searchedUser._id,
        username: searchedUser.username,
        points: 0,
        reason: ''
      });
      
      // Load points history for this user
      if (activeTab === 'history') {
        fetchPointsHistory(searchedUser._id);
      }
    } else {
      form.resetFields();
    }
  }, [searchedUser, form]);
  
  // Clear success message after a delay
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 8000); // Hide after 8 seconds
      
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);
  
  // Handle counting animation
  useEffect(() => {
    if (countUp && searchedUser) {
      let startVal = previousPoints;
      let endVal = searchedUser.points;
      let duration = 2000; // 2 seconds
      let stepTime = 30; // update every 30ms
      let steps = duration / stepTime;
      let increment = (endVal - startVal) / steps;
      let currentValue = startVal;
      let timer;
      
      const countStep = () => {
        currentValue += increment;
        
        if ((increment > 0 && currentValue >= endVal) || 
            (increment < 0 && currentValue <= endVal)) {
          setCountingValue(endVal);
          clearInterval(timer);
          setCountUp(false);
        } else {
          setCountingValue(Math.round(currentValue));
        }
      };
      
      timer = setInterval(countStep, stepTime);
      
      return () => clearInterval(timer);
    }
  }, [countUp, previousPoints, searchedUser]);
  
  // Handle confetti animation
  useEffect(() => {
    if (showCelebration) {
      try {
        // Play a success sound
        const audio = new Audio('/sounds/achievement-milestone.mp3');
        audio.volume = 0.5; // Lower volume for better experience
        audio.play().catch(e => console.log('Sound play failed silently'));
      } catch (e) {
        // Ignore audio errors silently
      }
      
      // Create confetti effect
      const canvas = confettiCanvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // Simple confetti effect using canvas
        const ctx = canvas.getContext('2d');
        const particles = [];
        const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', 
                        '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4CAF50', 
                        '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722'];
        
        // Create particles
        for (let i = 0; i < 200; i++) {
          particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            size: Math.random() * 15 + 5,
            color: colors[Math.floor(Math.random() * colors.length)],
            speed: Math.random() * 3 + 2,
            angle: Math.random() * Math.PI * 2,
            rotation: Math.random() * 360,
            rotationSpeed: Math.random() * 10 - 5
          });
        }
        
        // Animation function
        const animate = () => {
          if (!showCelebration) return;
          
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Update particles
          for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.y += p.speed;
            p.x += Math.sin(p.angle) * 2;
            p.rotation += p.rotationSpeed;
            
            // Reset if it goes out of screen
            if (p.y > canvas.height) {
              p.y = -10;
              p.x = Math.random() * canvas.width;
            }
            
            // Draw confetti
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size / 3);
            ctx.restore();
          }
          
          requestAnimationFrame(animate);
        };
        
        animate();
      }
      
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setShowCelebration(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [showCelebration]);
  
  // Handle stat highlight animation
  useEffect(() => {
    if (highlightStats) {
      const timer = setTimeout(() => {
        setHighlightStats(false);
      }, 2000); // End animation after 2 seconds
      
      return () => clearTimeout(timer);
    }
  }, [highlightStats]);
  
  // Load appropriate data when tab changes
  useEffect(() => {
    if (activeTab === 'history') {
      fetchPointsHistory(filterUserId);
    }
  }, [activeTab, filterUserId, filterDateRange]);
  
  const handleSearch = async () => {
    try {
      // Hide any previous success message when starting a new search
      setShowSuccess(false);
      
      const values = await searchForm.validateFields();
      if (!values.searchTerm) {
        addNotification({
          title: 'تنبيه',
          message: 'الرجاء إدخال معرف المستخدم أو اسم المستخدم أو البريد الإلكتروني',
          type: 'warning'
        });
        return;
      }
      setSearchLoading(true);
      
      const response = await api.get(`/admin/users?search=${values.searchTerm}`);
      
      if (response.data && response.data.length > 0) {
        setSearchedUser(response.data[0]);
        setFilterUserId(response.data[0]._id);
      } else {
        setSearchedUser(null);
        addNotification({
          title: 'تنبيه',
          message: 'لم يتم العثور على المستخدم',
          type: 'warning'
        });
      }
    } catch (error) {
      console.error('Error searching for user:', error);
      addNotification({
        title: 'خطأ',
        message: 'حدث خطأ أثناء البحث عن المستخدم',
        type: 'error'
      });
    } finally {
      setSearchLoading(false);
    }
  };
  
  const handleAssignPoints = async () => {
    try {
      const values = await form.validateFields();
      
      if (!values.userId) {
        addNotification({
          title: 'تنبيه',
          message: 'الرجاء تحديد المستخدم أولاً',
          type: 'warning'
        });
        return;
      }
      
      // Store current points before update for comparison
      if (searchedUser) {
        setPreviousPoints(searchedUser.points || 0);
        setAddedPoints(values.points);
      }
      
      if (values.points <= 0) {
        addNotification({
          title: 'تنبيه',
          message: 'يجب أن تكون النقاط أكبر من صفر',
          type: 'warning'
        });
        return;
      }

      setIsLoading(true);
      
      const response = await api.post('/points/admin/add', {
        userId: values.userId,
        points: values.points,
        reason: values.reason
      });
      
      if (response.data && response.data.success) {
        // Update displayed user points
        if (searchedUser) {
          // Update user data with new values
          setSearchedUser({
            ...searchedUser,
            points: response.data.newPoints,
            allPoints: response.data.allPoints,
            level: response.data.level
          });
          
          // Show success message with details
          setShowSuccess(true);
          
          // Activate highlight animation
          setHighlightStats(true);
          setCountingValue(previousPoints);
          setCountUp(true);
          
          // Show celebration modal
          setShowCelebration(true);
          
          // Also refresh transaction history if we're adding points to the currently filtered user
          if (activeTab === 'history' && filterUserId === values.userId) {
            fetchPointsHistory(filterUserId);
          }
        }
        
        addNotification({
          title: 'تم بنجاح',
          message: `تم إضافة ${values.points} نقطة بنجاح`,
          type: 'success'
        });
        
        // Reset points and reason inputs
        form.setFieldsValue({
          points: 0,
          reason: ''
        });
      }
    } catch (error) {
      console.error('Error assigning points:', error);
      addNotification({
        title: 'خطأ',
        message: error.response?.data?.message || 'حدث خطأ أثناء إضافة النقاط',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPointsHistory = async (userId = '', page = 1, limit = 10) => {
    try {
      setTransactionsLoading(true);
      
      let url = '/points/admin/transactions?';
      
      // Add pagination
      url += `page=${page}&limit=${limit}`;
      
      // Add filters
      if (userId) {
        url += `&userId=${userId}`;
      }
      
      if (filterDateRange && filterDateRange.length === 2) {
        const startDate = filterDateRange[0].format('YYYY-MM-DD');
        const endDate = filterDateRange[1].format('YYYY-MM-DD');
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      
      const response = await api.get(url);
      
      if (response.data) {
        setPointsTransactions(response.data.transactions || []);
        setPagination({
          current: response.data.pagination?.page || 1,
          pageSize: response.data.pagination?.limit || 10,
          total: response.data.pagination?.total || 0
        });
      } else {
        setPointsTransactions([]);
        setPagination({
          current: 1,
          pageSize: 10,
          total: 0
        });
      }
    } catch (error) {
      console.error('Error fetching points history:', error);
      addNotification({
        title: 'خطأ',
        message: 'حدث خطأ أثناء جلب سجل النقاط',
        type: 'error'
      });
      setPointsTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const handleTableChange = (pagination, filters, sorter) => {
    fetchPointsHistory(filterUserId, pagination.current, pagination.pageSize);
  };

  const handleDateRangeChange = (range) => {
    setFilterDateRange(range);
  };

  const handleFilterClear = () => {
    setFilterUserId('');
    setFilterDateRange(null);
    setSearchedUser(null);
    searchForm.resetFields();
    fetchPointsHistory('');
  };

  const columns = [
    {
      title: 'المستخدم',
      dataIndex: 'userId',
      key: 'userId',
      render: (userId, record) => (
        <div className="user-cell">
          <UserOutlined className="user-icon" />
          <div className="user-info">
            <div>{record.userId?.name || 'مستخدم غير معروف'}</div>
            <small>{record.userId?.username}</small>
          </div>
        </div>
      ),
    },
    {
      title: 'التاريخ',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => {
        if (!date) return '';
        const formatDate = new Date(date);
        return formatDate.toLocaleDateString('ar-EG', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      },
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
    {
      title: 'النقاط',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount, record) => {
        const isCredit = !record.isDebit;
        return (
          <span className={isCredit ? 'credit-amount' : 'debit-amount'}>
            {isCredit ? '+' : '-'}{amount}
          </span>
        );
      },
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: 'النوع',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        let color = 'blue';
        let text = type;
        
        switch (type) {
          case 'points_award':
            color = 'green';
            text = 'مكافأة';
            break;
          case 'points_purchase':
            color = 'purple';
            text = 'شراء';
            break;
          case 'refund':
            color = 'orange';
            text = 'استرداد';
            break;
          case 'other':
            color = 'cyan';
            text = 'أخرى';
            break;
          default:
            break;
        }
        
        return <Tag color={color}>{text}</Tag>;
      },
      filters: [
        { text: 'مكافأة', value: 'points_award' },
        { text: 'شراء', value: 'points_purchase' },
        { text: 'استرداد', value: 'refund' },
        { text: 'أخرى', value: 'other' },
      ],
      onFilter: (value, record) => record.type === value,
    },
    {
      title: 'الوصف',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'default';
        let text = status;
        
        switch (status) {
          case 'completed':
            color = 'success';
            text = 'مكتمل';
            break;
          case 'pending':
            color = 'processing';
            text = 'معلق';
            break;
          case 'failed':
            color = 'error';
            text = 'فشل';
            break;
          default:
            break;
        }
        
        return <Tag color={color}>{text}</Tag>;
      },
      filters: [
        { text: 'مكتمل', value: 'completed' },
        { text: 'معلق', value: 'pending' },
        { text: 'فشل', value: 'failed' },
      ],
      onFilter: (value, record) => record.status === value,
    },
  ];

  const renderUserDetails = () => {
    if (!searchedUser) {
      return (
        <Empty
          description="ابحث عن مستخدم لعرض التفاصيل والنقاط"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    return (
      <Card 
        className={`user-details-card ${highlightStats ? 'stats-highlight' : ''}`}
        ref={statsRef}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Statistic
              title="النقاط الحالية"
              value={countUp ? countingValue : (searchedUser.points || 0)}
              prefix={<TrophyOutlined className={highlightStats ? 'icon-highlight' : ''} />}
              className={highlightStats ? 'stat-highlight' : ''}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="إجمالي النقاط"
              value={searchedUser.allPoints || 0}
              prefix={<DeploymentUnitOutlined className={highlightStats ? 'icon-highlight' : ''} />}
              className={highlightStats ? 'stat-highlight' : ''}
            />
          </Col>
        </Row>
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={12}>
            <Statistic
              title="المستوى"
              value={searchedUser.level || 1}
              prefix={<TrophyOutlined className={highlightStats ? 'icon-highlight' : ''} />}
              className={highlightStats ? 'stat-highlight' : ''}
            />
          </Col>
          <Col span={12}>
            <div className="user-info-card">
              <div><strong>الاسم:</strong> {searchedUser.name}</div>
              <div><strong>اسم المستخدم:</strong> {searchedUser.username}</div>
              <div><strong>البريد الإلكتروني:</strong> {searchedUser.email}</div>
            </div>
          </Col>
        </Row>
      </Card>
    );
  };
  
  // Celebration modal component
  const renderCelebrationModal = () => (
    <Modal
      visible={showCelebration}
      footer={null}
      closable={false}
      centered
      className="celebration-modal"
      width={600}
      maskStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
    >
      <div className="celebration-content">
        <Result
          icon={<GiftOutlined className="celebration-icon" />}
          title={<div className="celebration-title">تم إضافة النقاط بنجاح! 🎉</div>}
          subTitle={
            <div className="celebration-subtitle">
              <div className="celebration-points">
                <span className="old-value">{previousPoints}</span>
                <PlusOutlined className="plus-icon-large" />
                <span className="points-added">{addedPoints}</span>
                <span className="equals-large">=</span>
                <span className="new-value">{searchedUser?.points}</span>
              </div>
              <Paragraph className="celebration-message">
                تمت إضافة <Text strong>{addedPoints}</Text> نقطة إلى حساب <Text strong>{searchedUser?.name}</Text> بنجاح!
              </Paragraph>
            </div>
          }
          extra={[
            <Button 
              key="view-history"
              type="primary"
              size="large"
              onClick={() => {
                setActiveTab('history');
                fetchPointsHistory(searchedUser?._id);
                setShowCelebration(false);
              }}
            >
              عرض سجل المعاملات
            </Button>
          ]}
        />
      </div>
    </Modal>
  );

  const renderAssignPointsTab = () => (
    <div className="assign-points-container">
      <div className="search-section">
        <Form
          form={searchForm}
          layout="inline"
          onFinish={handleSearch}
          className="search-form"
        >
          <Form.Item 
            name="searchTerm"
            rules={[{ required: true, message: 'الرجاء إدخال مصطلح البحث' }]}
            className="search-input-item"
          >
            <Input
              prefix={<SearchOutlined />}
              placeholder="البحث بالاسم أو البريد الإلكتروني أو اسم المستخدم"
              size="large"
            />
          </Form.Item>

          <Form.Item className="search-button-item">
            <Button
              type="primary"
              htmlType="submit"
              icon={<SearchOutlined />}
              loading={searchLoading}
              size="large"
            >
              بحث
            </Button>
          </Form.Item>
        </Form>
      </div>
      
      {/* Canvas for confetti animation */}
      <canvas 
        ref={confettiCanvasRef} 
        id="confetti-canvas" 
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          pointerEvents: 'none',
          zIndex: 9999,
          display: showCelebration ? 'block' : 'none' 
        }} 
      />
      
      {showSuccess && (
        <Alert
          message="تمت إضافة النقاط بنجاح"
          description={
            <div className="points-success-details">
              <div className="points-change">
                <span className="old-points">{previousPoints}</span>
                <PlusOutlined className="plus-icon" />
                <span className="added-points">{addedPoints}</span>
                <span className="equals">=</span>
                <span className="new-points">{searchedUser?.points}</span>
              </div>
              <Paragraph>
                تمت إضافة <Text strong>{addedPoints}</Text> نقطة إلى حساب <Text strong>{searchedUser?.name}</Text> بنجاح
              </Paragraph>
              <div className="success-actions">
                <Button 
                  type="link" 
                  onClick={() => {
                    setActiveTab('history');
                    fetchPointsHistory(searchedUser?._id);
                  }}
                >
                  عرض سجل معاملات هذا المستخدم
                </Button>
              </div>
            </div>
          }
          type="success"
          showIcon
          closable
          style={{ marginBottom: 20 }}
          className="points-success-alert"
        />
      )}

      <Divider orientation="right">معلومات المستخدم</Divider>
      
      {renderUserDetails()}
      
      <Divider orientation="right">إضافة نقاط</Divider>
      
      <Form
        form={form}
        layout="vertical"
        onFinish={handleAssignPoints}
        className="points-form"
      >
        <Form.Item name="userId" hidden>
          <Input />
        </Form.Item>
        
        <Form.Item name="username" hidden>
          <Input />
        </Form.Item>
        
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="points"
              label="النقاط"
              rules={[
                { required: true, message: 'الرجاء إدخال عدد النقاط' },
                { type: 'number', min: 1, message: 'يجب أن تكون النقاط أكبر من صفر' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="أدخل عدد النقاط"
                min={1}
                step={500}
                prefix={<TrophyOutlined />}
                disabled={!searchedUser}
              />
            </Form.Item>
          </Col>
          
          <Col span={12}>
            <Form.Item
              name="reason"
              label="سبب الإضافة"
              rules={[
                { required: true, message: 'الرجاء إدخال سبب إضافة النقاط' }
              ]}
            >
              <Input 
                placeholder="سبب إضافة النقاط"
                disabled={!searchedUser}
              />
            </Form.Item>
          </Col>
        </Row>
        
        <Form.Item className="form-actions">
          <Button
            type="primary"
            htmlType="submit"
            loading={isLoading}
            icon={<SendOutlined />}
            disabled={!searchedUser}
            size="large"
          >
            إضافة النقاط
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
  
  const renderPointsHistoryTab = () => (
    <div className="points-history-container">
      <div className="filters-section">
        <Space size="middle" className="filter-space">
          <Form layout="inline">
            <Form.Item label="تاريخ المعاملة">
              <RangePicker onChange={handleDateRangeChange} value={filterDateRange} />
            </Form.Item>
            
            {!searchedUser && (
              <Form.Item label="المستخدم">
                <Input 
                  placeholder="معرف المستخدم"
                  value={filterUserId}
                  onChange={(e) => setFilterUserId(e.target.value)}
                  style={{ width: 200 }}
                />
              </Form.Item>
            )}
            
            <Form.Item>
              <Button 
                type="primary" 
                onClick={() => fetchPointsHistory(filterUserId)}
                icon={<SearchOutlined />}
              >
                تطبيق الفلاتر
              </Button>
            </Form.Item>
            
            <Form.Item>
              <Button 
                onClick={handleFilterClear}
                icon={<BarsOutlined />}
              >
                إعادة ضبط
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </div>
      
      <Table
        columns={columns}
        dataSource={pointsTransactions}
        rowKey="_id"
        loading={transactionsLoading}
        pagination={pagination}
        onChange={handleTableChange}
        scroll={{ x: 800 }}
      />
    </div>
  );

  return (
    <div className="admin-points-management-page">
      <div className="page-header">
        <TrophyOutlined className="page-icon" />
        <div className="header-text">
          <h1>إدارة نقاط المستخدمين</h1>
          <p>إضافة وإدارة نقاط المستخدمين وعرض سجل المعاملات</p>
        </div>
      </div>
      
      <div className="page-content">
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          className="main-tabs"
        >
          <TabPane 
            tab={
              <span>
                <SendOutlined />
                إضافة نقاط
              </span>
            } 
            key="assign"
          >
            {renderAssignPointsTab()}
          </TabPane>
          
          <TabPane 
            tab={
              <span>
                <HistoryOutlined />
                سجل النقاط
              </span>
            } 
            key="history"
          >
            {renderPointsHistoryTab()}
          </TabPane>
        </Tabs>
        
        {/* Render celebration modal */}
        {renderCelebrationModal()}
      </div>
    </div>
  );
};

export default AdminPointsManagement;
