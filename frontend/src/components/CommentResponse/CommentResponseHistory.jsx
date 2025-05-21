import React, { useState, useEffect } from 'react';
import { 
  Table, Tag, Button, Spin, Alert, Form, Row, Col, Card, Modal,
  Select, Input, DatePicker, Typography, Space, Divider
} from 'antd';
import { 
  HistoryOutlined, FilterOutlined, LinkOutlined, 
  CheckOutlined, CloseOutlined, EyeOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useNotification } from '../../context/NotificationContext';
import { t } from '../../utils/translationHelper';
import moment from 'moment';

const { Option } = Select;
const { Text, Title } = Typography;

/**
 * CommentResponseHistory Component
 * 
 * Displays the history of automated responses to Facebook comments
 * Features include:
 * - Pagination
 * - Filtering by monitor, success status, and date
 * - Viewing full response details
 */
const CommentResponseHistory = () => {
  const { showNotification } = useNotification();
  const [responses, setResponses] = useState([]);
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    monitor: '',
    success: '',
    startDate: '',
    endDate: ''
  });
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [form] = Form.useForm();

  // Fetch response history and available monitors on component mount
  useEffect(() => {
    fetchMonitors();
    fetchResponses();
  }, [currentPage, pageSize, filters]);

  // Fetch response history
  const fetchResponses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters for pagination and filters
      const params = {
        page: currentPage,
        limit: pageSize
      };
      
      // Add active filters to query params
      if (filters.monitor) params.monitor = filters.monitor;
      if (filters.success !== '') params.success = filters.success;
      if (filters.startDate) params.startDate = new Date(filters.startDate).toISOString();
      if (filters.endDate) params.endDate = new Date(filters.endDate).toISOString();
      
      let url = '/api/comment-responses/history';
      
      // If a specific monitor is selected, use its dedicated endpoint
      if (filters.monitor) {
        url = `/api/comment-responses/monitors/${filters.monitor}/responses`;
      }

      const response = await axios.get(url, { params });
      
      setResponses(response.data.responses || []);
      setTotalPages(response.data.pagination?.pages || 1);
      setTotalItems(response.data.pagination?.total || 0);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching response history:', err);
      setError(t('comment_response.error_fetching_history', 'حدث خطأ أثناء جلب سجل الردود'));
      setLoading(false);
    }
  };

  // Fetch available monitors for filter
  const fetchMonitors = async () => {
    try {
      const response = await axios.get('/api/comment-responses/monitors');
      setMonitors(response.data || []);
    } catch (err) {
      console.error('Error fetching monitors:', err);
      // Don't show this error to the user, as it's not critical for this page
    }
  };

  // Handle filter change
  const handleFilterChange = (name, value) => {
    setFilters({
      ...filters,
      [name]: value
    });
    
    // Reset to first page when changing filters
    setCurrentPage(1);
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilters({
      monitor: '',
      success: '',
      startDate: '',
      endDate: ''
    });
    form.resetFields();
    setCurrentPage(1);
  };

  // Handle pagination change
  const handlePageChange = (page, pageSize) => {
    setCurrentPage(page);
    setPageSize(pageSize);
  };

  // View response details
  const handleViewDetails = (response) => {
    setSelectedResponse(response);
    setShowDetailsModal(true);
  };

  // Format relative time
  const formatRelativeTime = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHr = Math.round(diffMin / 60);
    const diffDays = Math.round(diffHr / 24);
    
    if (diffSec < 60) return `منذ ${diffSec} ثانية`;
    if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
    if (diffHr < 24) return `منذ ${diffHr} ساعة`;
    if (diffDays === 1) return 'منذ يوم';
    if (diffDays < 30) return `منذ ${diffDays} يوم`;
    
    return date.toLocaleDateString();
  };

  // Configure table columns
  const columns = [
    {
      title: t('comment_response.date', 'التاريخ'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text) => (
        <div>
          <div>{formatRelativeTime(text)}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {new Date(text).toLocaleString()}
          </Text>
        </div>
      ),
    },
    {
      title: t('comment_response.page', 'الصفحة'),
      dataIndex: 'pageName',
      key: 'pageName',
    },
    {
      title: t('comment_response.comment', 'التعليق'),
      dataIndex: 'commentText',
      key: 'commentText',
      render: (text, record) => (
        <div>
          <div>
            {text.length > 50 ? `${text.substring(0, 50)}...` : text}
          </div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.commenterName || t('comment_response.unknown_commenter', 'مستخدم')}
          </Text>
        </div>
      ),
    },
    {
      title: t('comment_response.response', 'الرد'),
      dataIndex: 'responseText',
      key: 'responseText',
      render: (text) => (
        <div>
          {text.length > 50 ? `${text.substring(0, 50)}...` : text}
        </div>
      ),
    },
    {
      title: t('comment_response.rule', 'القاعدة'),
      key: 'rule',
      render: (_, record) => (
        <>
          {record.rule ? (
            <Tag color="blue">
              {record.rule.name}
            </Tag>
          ) : record.monitor?.respondToAll ? (
            <Tag color="default">
              {t('comment_response.default_response', 'الرد الافتراضي')}
            </Tag>
          ) : (
            <Text type="secondary">-</Text>
          )}
        </>
      ),
    },
    {
      title: t('comment_response.status', 'الحالة'),
      key: 'status',
      render: (_, record) => (
        <div>
          {record.success ? (
            <Tag color="success" icon={<CheckOutlined />}>
              {t('comment_response.sent', 'تم الإرسال')}
            </Tag>
          ) : (
            <Tag color="error" icon={<CloseOutlined />}>
              {t('comment_response.failed', 'فشل')}
            </Tag>
          )}
          {record.retryCount > 0 && (
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {t('comment_response.retries', 'المحاولات')}: {record.retryCount}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: t('common.actions', 'الإجراءات'),
      key: 'actions',
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetails(record)}
        />
      ),
    },
  ];

  // Render loading spinner
  if (loading && responses.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: '15px' }}>{t('common.loading', 'جاري التحميل...')}</div>
      </div>
    );
  }

  return (
    <div className="comment-response-history">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Title level={3}>
          <HistoryOutlined style={{ marginRight: '8px' }} />
          {t('comment_response.response_history', 'سجل الردود التلقائية')}
        </Title>
        <Button
          type={showFilters ? "primary" : "default"}
          icon={<FilterOutlined />}
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters 
            ? t('comment_response.hide_filters', 'إخفاء الفلاتر') 
            : t('comment_response.show_filters', 'إظهار الفلاتر')}
        </Button>
      </div>

      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* Filters */}
      {showFilters && (
        <Card style={{ marginBottom: '20px' }}>
          <Form form={form} layout="vertical">
            <Row gutter={24}>
              <Col span={6}>
                <Form.Item 
                  label={t('comment_response.filter_by_monitor', 'تصفية حسب المراقبة')}
                  name="monitor"
                >
                  <Select
                    placeholder={t('comment_response.all_monitors', 'جميع المراقبات')}
                    value={filters.monitor}
                    onChange={(value) => handleFilterChange('monitor', value)}
                    style={{ width: '100%' }}
                    allowClear
                  >
                    <Option value="">{t('comment_response.all_monitors', 'جميع المراقبات')}</Option>
                    {monitors.map(monitor => (
                      <Option key={monitor._id} value={monitor._id}>{monitor.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item 
                  label={t('comment_response.filter_by_status', 'تصفية حسب الحالة')}
                  name="success"
                >
                  <Select
                    placeholder={t('comment_response.all_responses', 'جميع الردود')}
                    value={filters.success}
                    onChange={(value) => handleFilterChange('success', value)}
                    style={{ width: '100%' }}
                    allowClear
                  >
                    <Option value="">{t('comment_response.all_responses', 'جميع الردود')}</Option>
                    <Option value="true">{t('comment_response.successful', 'ناجحة')}</Option>
                    <Option value="false">{t('comment_response.failed', 'فاشلة')}</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item 
                  label={t('comment_response.start_date', 'من تاريخ')}
                  name="startDate"
                >
                  <DatePicker
                    style={{ width: '100%' }}
                    value={filters.startDate ? moment(filters.startDate) : null}
                    onChange={(date) => handleFilterChange('startDate', date ? date.format('YYYY-MM-DD') : '')}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item 
                  label={t('comment_response.end_date', 'إلى تاريخ')}
                  name="endDate"
                >
                  <DatePicker
                    style={{ width: '100%' }}
                    value={filters.endDate ? moment(filters.endDate) : null}
                    onChange={(date) => handleFilterChange('endDate', date ? date.format('YYYY-MM-DD') : '')}
                  />
                </Form.Item>
              </Col>
            </Row>
            <div style={{ textAlign: 'right' }}>
              <Button onClick={handleResetFilters}>
                {t('comment_response.reset_filters', 'إعادة تعيين الفلاتر')}
              </Button>
            </div>
          </Form>
        </Card>
      )}

      {responses.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '30px 0' }}>
          <Title level={4}>{t('comment_response.no_responses', 'لا توجد ردود')}</Title>
          <Text type="secondary" style={{ display: 'block' }}>
            {filters.monitor || filters.success || filters.startDate || filters.endDate
              ? t('comment_response.no_matching_responses', 'لا توجد ردود تطابق معايير التصفية المحددة')
              : t('comment_response.no_responses_yet', 'لم يتم إرسال أي ردود تلقائية بعد')}
          </Text>
        </Card>
      ) : (
        <>
          <Table 
            columns={columns} 
            dataSource={responses}
            rowKey="_id"
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: totalItems,
              showSizeChanger: true,
              showQuickJumper: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total) => `${t('comment_response.showing_results', 'عرض')} ${Math.min((currentPage - 1) * pageSize + 1, total)} - ${Math.min(currentPage * pageSize, total)} ${t('comment_response.of', 'من')} ${total} ${t('comment_response.responses', 'رد')}`,
              onChange: handlePageChange,
              onShowSizeChange: handlePageChange
            }}
            scroll={{ x: 'max-content' }}
            loading={loading}
          />
        </>
      )}

      {/* Response Details Modal */}
      <Modal
        title={t('comment_response.response_details', 'تفاصيل الرد')}
        open={showDetailsModal}
        onCancel={() => setShowDetailsModal(false)}
        footer={[
          <Button key="close" onClick={() => setShowDetailsModal(false)}>
            {t('common.close', 'إغلاق')}
          </Button>
        ]}
        width={800}
      >
        {selectedResponse && (
          <>
            <Row gutter={24}>
              <Col span={12}>
                <Title level={5}>{t('comment_response.comment_info', 'معلومات التعليق')}</Title>
                
                <Card style={{ marginBottom: '16px' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <Text strong>{t('comment_response.comment_text', 'نص التعليق')}:</Text>
                    <div style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px', marginTop: '4px' }}>
                      {selectedResponse.commentText}
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '8px' }}>
                    <Text strong>{t('comment_response.commenter', 'صاحب التعليق')}:</Text>{' '}
                    {selectedResponse.commenterName || t('comment_response.unknown', 'غير معروف')}
                  </div>
                  
                  <div style={{ marginBottom: '8px' }}>
                    <Text strong>{t('comment_response.comment_date', 'تاريخ التعليق')}:</Text>{' '}
                    {new Date(selectedResponse.commentCreatedTime).toLocaleString()}
                  </div>
                  
                  <div>
                    <Button
                      type="primary"
                      icon={<LinkOutlined />}
                      href={`https://facebook.com/${selectedResponse.commentId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('comment_response.view_on_facebook', 'عرض على فيسبوك')}
                    </Button>
                  </div>
                </Card>
              </Col>
              <Col span={12}>
                <Title level={5}>{t('comment_response.response_info', 'معلومات الرد')}</Title>
                
                <Card style={{ marginBottom: '16px' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <Text strong>{t('comment_response.response_text', 'نص الرد')}:</Text>
                    <div style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px', marginTop: '4px' }}>
                      {selectedResponse.responseText}
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '8px' }}>
                    <Text strong>{t('comment_response.response_date', 'تاريخ الرد')}:</Text>{' '}
                    {new Date(selectedResponse.createdAt).toLocaleString()}
                  </div>
                  
                  <div style={{ marginBottom: '8px' }}>
                    <Text strong>{t('comment_response.status', 'الحالة')}:</Text>{' '}
                    {selectedResponse.success ? (
                      <Tag color="success" icon={<CheckOutlined />}>
                        {t('comment_response.sent', 'تم الإرسال')}
                      </Tag>
                    ) : (
                      <Tag color="error" icon={<CloseOutlined />}>
                        {t('comment_response.failed', 'فشل')}
                      </Tag>
                    )}
                  </div>
                  
                  {selectedResponse.responseMessageId && (
                    <div style={{ marginBottom: '8px' }}>
                      <Text strong>{t('comment_response.response_id', 'معرف الرد')}:</Text>{' '}
                      <code>{selectedResponse.responseMessageId}</code>
                    </div>
                  )}
                  
                  {selectedResponse.processingTimeMs && (
                    <div style={{ marginBottom: '8px' }}>
                      <Text strong>{t('comment_response.processing_time', 'زمن المعالجة')}:</Text>{' '}
                      {selectedResponse.processingTimeMs}ms
                    </div>
                  )}
                  
                  {selectedResponse.retryCount > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <Text strong>{t('comment_response.retry_count', 'عدد المحاولات')}:</Text>{' '}
                      {selectedResponse.retryCount}
                    </div>
                  )}
                  
                  {!selectedResponse.success && selectedResponse.error && (
                    <div style={{ marginBottom: '8px' }}>
                      <Text strong>{t('comment_response.error', 'الخطأ')}:</Text>
                      <div style={{ background: '#fff2f0', padding: '8px', borderRadius: '4px', marginTop: '4px', color: '#f5222d' }}>
                        {selectedResponse.error.message}
                        {selectedResponse.error.code && (
                          <div style={{ fontSize: '12px' }}>{t('comment_response.error_code', 'كود الخطأ')}: {selectedResponse.error.code}</div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              </Col>
            </Row>
            
            <Divider />
            
            <Row>
              <Col span={24}>
                <Title level={5}>{t('comment_response.source', 'المصدر')}</Title>
                
                <Card>
                  <Row gutter={24}>
                    <Col span={12}>
                      <div style={{ marginBottom: '8px' }}>
                        <Text strong>{t('comment_response.page', 'الصفحة')}:</Text>{' '}
                        {selectedResponse.pageName}
                      </div>
                      
                      <div style={{ marginBottom: '8px' }}>
                        <Text strong>{t('comment_response.monitor', 'المراقبة')}:</Text>{' '}
                        {selectedResponse.monitor?.name || '-'}
                      </div>
                    </Col>
                    <Col span={12}>
                      <div style={{ marginBottom: '8px' }}>
                        <Text strong>{t('comment_response.rule_applied', 'القاعدة المطبقة')}:</Text>{' '}
                        {selectedResponse.rule?.name || (
                          selectedResponse.monitor?.respondToAll ? 
                            t('comment_response.default_response', 'الرد الافتراضي') : 
                            '-'
                        )}
                      </div>
                      
                      <div style={{ marginBottom: '8px' }}>
                        <Text strong>{t('comment_response.post_id', 'معرف المنشور')}:</Text>{' '}
                        <code>{selectedResponse.postId}</code>
                      </div>
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Modal>
    </div>
  );
};

export default CommentResponseHistory;