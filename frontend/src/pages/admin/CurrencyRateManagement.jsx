import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Form, Input, InputNumber, Modal, Typography, Space, Tag, notification } from 'antd';
import { DollarOutlined, EditOutlined, HistoryOutlined, SyncOutlined } from '@ant-design/icons';
import api from '../../utils/api';
import '../../styles/CurrencyRateManagement.css';

const { Title, Text } = Typography;

const CurrencyRateManagement = () => {
  const [currentRate, setCurrentRate] = useState(null);
  const [rateHistory, setRateHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Fetch current exchange rate
  const fetchCurrentRate = async () => {
    try {
      setLoading(true);
      const response = await api.get('/currency-rates/current');
      setCurrentRate(response.data);
    } catch (error) {
      console.error('Error fetching current exchange rate:', error);
      notification.error({
        message: 'خطأ',
        description: 'حدث خطأ أثناء جلب سعر الصرف الحالي'
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch exchange rate history
  const fetchRateHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await api.get('/currency-rates/history');
      setRateHistory(response.data);
    } catch (error) {
      console.error('Error fetching exchange rate history:', error);
      notification.error({
        message: 'خطأ',
        description: 'حدث خطأ أثناء جلب سجل أسعار الصرف'
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  // Load current exchange rate on component mount
  useEffect(() => {
    fetchCurrentRate();
  }, []);

  // Handle opening history modal and fetching history
  const showHistoryModal = () => {
    fetchRateHistory();
    setHistoryModalVisible(true);
  };

  // Handle showing the edit modal
  const showEditModal = () => {
    form.setFieldsValue({
      rate: currentRate?.rate || 52.0,
      note: ''
    });
    setEditModalVisible(true);
  };

  // Handle form submission for updating exchange rate
  const handleUpdateRate = async (values) => {
    try {
      setLoading(true);
      const payload = {
        ...values,
        oldRate: currentRate?.rate
      };
      
      const response = await api.post('/currency-rates', payload);
      
      notification.success({
        message: 'تم بنجاح',
        description: `تم تحديث سعر الصرف من ${currentRate?.rate} إلى ${values.rate} جنيه مصري لكل دولار أمريكي`
      });
      
      setEditModalVisible(false);
      fetchCurrentRate();
    } catch (error) {
      console.error('Error updating exchange rate:', error);
      notification.error({
        message: 'خطأ',
        description: 'حدث خطأ أثناء تحديث سعر الصرف'
      });
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Columns for history table
  const historyColumns = [
    {
      title: 'سعر الصرف',
      dataIndex: 'rate',
      key: 'rate',
      render: (rate) => <Tag color="blue">{rate} EGP</Tag>
    },
    {
      title: 'تاريخ التحديث',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => formatDate(date)
    },
    {
      title: 'ملاحظة',
      dataIndex: 'note',
      key: 'note'
    },
    {
      title: 'الحالة',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => isActive ? 
        <Tag color="green">نشط</Tag> : 
        <Tag color="gray">سابق</Tag>
    }
  ];

  return (
    <div className="currency-rate-management">
      <Card
        title={
          <div className="card-title">
            <DollarOutlined className="title-icon" />
            <span>إدارة سعر صرف الدولار الأمريكي</span>
          </div>
        }
        loading={loading}
        className="currency-rate-card"
      >
        {currentRate && (
          <div className="current-rate-display">
            <div className="rate-value">
              <Title level={2}>
                1 <span className="currency">USD</span> = {currentRate.rate} <span className="currency">EGP</span>
              </Title>
              <Text type="secondary">
                آخر تحديث: {formatDate(currentRate.updatedAt)}
              </Text>
            </div>
            
            <div className="rate-actions">
              <Space>
                <Button 
                  type="primary" 
                  icon={<EditOutlined />} 
                  onClick={showEditModal}
                >
                  تحديث سعر الصرف
                </Button>
                <Button 
                  icon={<HistoryOutlined />} 
                  onClick={showHistoryModal}
                >
                  عرض السجل
                </Button>
              </Space>
            </div>
          </div>
        )}
        
        {!currentRate && !loading && (
          <div className="no-rate">
            <Title level={4}>لا يوجد سعر صرف محدد حالياً</Title>
            <Button 
              type="primary" 
              icon={<EditOutlined />} 
              onClick={showEditModal}
            >
              تحديد سعر الصرف
            </Button>
          </div>
        )}
      </Card>

      {/* Exchange rate edit modal */}
      <Modal
        title="تحديث سعر صرف الدولار الأمريكي"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdateRate}
        >
          <Form.Item
            name="rate"
            label="سعر الصرف (1 دولار أمريكي يساوي كم جنيه مصري)"
            rules={[
              { required: true, message: 'يرجى إدخال سعر الصرف' },
              { type: 'number', min: 1, message: 'يجب أن يكون سعر الصرف أكبر من صفر' }
            ]}
          >
            <InputNumber
              min={1}
              precision={2}
              step={0.1}
              style={{ width: '100%' }}
              addonAfter="EGP"
              placeholder="مثال: 52.0"
            />
          </Form.Item>
          
          <Form.Item
            name="note"
            label="ملاحظة (اختياري)"
          >
            <Input.TextArea
              rows={3}
              placeholder="مثال: تحديث بناءً على سعر البنك المركزي"
            />
          </Form.Item>
          
          <Form.Item className="form-actions">
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                تحديث سعر الصرف
              </Button>
              <Button onClick={() => setEditModalVisible(false)}>
                إلغاء
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Exchange rate history modal */}
      <Modal
        title="سجل أسعار الصرف"
        open={historyModalVisible}
        onCancel={() => setHistoryModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setHistoryModalVisible(false)}>
            إغلاق
          </Button>
        ]}
        width={700}
      >
        <Table
          dataSource={rateHistory}
          columns={historyColumns}
          rowKey="_id"
          loading={historyLoading}
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50']
          }}
        />
      </Modal>
    </div>
  );
};

export default CurrencyRateManagement;