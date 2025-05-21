import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Modal, Form, Input, Checkbox, Row, Col, 
  Spin, Tag, Alert, Card, Space, Divider, Typography, message
} from 'antd';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, 
  CheckOutlined, CloseOutlined, SwapOutlined, 
  KeyOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useNotification } from '../../context/NotificationContext';
import { t } from '../../utils/translationHelper';

const { TextArea } = Input;
const { Title, Text } = Typography;

/**
 * CommentResponseRules Component
 * 
 * Allows users to create and manage rules for automatic comment responses
 * Each rule consists of:
 * - Keywords that trigger the rule
 * - Response messages to send when triggered
 * - Configuration options (case sensitivity, exact match, etc.)
 */
const CommentResponseRules = () => {
  const { addNotification } = useNotification();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedRule, setSelectedRule] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    keywords: [],
    responses: [],
    randomizeResponses: true,
    caseSensitive: false,
    exactMatch: false,
    isActive: true
  });
  const [keyword, setKeyword] = useState('');
  const [response, setResponse] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [form] = Form.useForm();

  // Fetch all rules on component mount
  useEffect(() => {
    fetchRules();
  }, []);

  // Function to fetch all rules
  const fetchRules = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/comment-responses/rules');
      setRules(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching rules:', err);
      setError(t('comment_response.error_fetching_rules', 'حدث خطأ أثناء جلب قواعد الرد'));
      setLoading(false);
    }
  };

  // Handle opening the create rule modal
  const handleCreateRule = () => {
    setModalMode('create');
    setFormData({
      name: '',
      description: '',
      keywords: [],
      responses: [],
      randomizeResponses: true,
      caseSensitive: false,
      exactMatch: false,
      isActive: true
    });
    setKeyword('');
    setResponse('');
    setShowModal(true);
    form.resetFields();
  };

  // Handle opening the edit rule modal
  const handleEditRule = (rule) => {
    setModalMode('edit');
    setSelectedRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      keywords: [...rule.keywords],
      responses: [...rule.responses],
      randomizeResponses: rule.randomizeResponses,
      caseSensitive: rule.caseSensitive,
      exactMatch: rule.exactMatch,
      isActive: rule.isActive
    });
    setKeyword('');
    setResponse('');
    setShowModal(true);
    form.setFieldsValue({
      name: rule.name,
      description: rule.description || '',
      randomizeResponses: rule.randomizeResponses,
      caseSensitive: rule.caseSensitive,
      exactMatch: rule.exactMatch,
      isActive: rule.isActive
    });
  };

  // Handle adding a keyword to the current form
  const handleAddKeyword = () => {
    if (keyword && !formData.keywords.includes(keyword)) {
      setFormData({
        ...formData,
        keywords: [...formData.keywords, keyword]
      });
      setKeyword('');
    }
  };

  // Handle removing a keyword from the current form
  const handleRemoveKeyword = (keyword) => {
    const updatedKeywords = formData.keywords.filter(k => k !== keyword);
    setFormData({
      ...formData,
      keywords: updatedKeywords
    });
  };

  // Handle adding a response to the current form
  const handleAddResponse = () => {
    if (response && !formData.responses.includes(response)) {
      setFormData({
        ...formData,
        responses: [...formData.responses, response]
      });
      setResponse('');
    }
  };

  // Handle removing a response from the current form
  const handleRemoveResponse = (index) => {
    const updatedResponses = [...formData.responses];
    updatedResponses.splice(index, 1);
    setFormData({
      ...formData,
      responses: updatedResponses
    });
  };

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Handle checkbox changes
  const handleCheckboxChange = (name, checked) => {
    setFormData({
      ...formData,
      [name]: checked
    });
  };

  // Handle rule submission (create or update)
  const handleSubmit = async () => {
    try {
      // Form validation
      if (!formData.name.trim()) {
        message.warning(t('comment_response.rule_name_required', 'يجب إدخال اسم للقاعدة'));
        return;
      }

      if (formData.keywords.length === 0) {
        message.warning(t('comment_response.keywords_required', 'يجب إضافة كلمة مفتاحية واحدة على الأقل'));
        return;
      }

      if (formData.responses.length === 0) {
        message.warning(t('comment_response.responses_required', 'يجب إضافة رد واحد على الأقل'));
        return;
      }

      setLoading(true);

      if (modalMode === 'create') {
        // Create new rule
        const response = await axios.post('/api/comment-responses/rules', formData);
        setRules([...rules, response.data]);
        message.success(t('comment_response.rule_created', 'تم إنشاء القاعدة بنجاح'));
      } else {
        // Update existing rule
        const response = await axios.put(`/api/comment-responses/rules/${selectedRule._id}`, formData);
        const updatedRules = rules.map(rule => 
          rule._id === selectedRule._id ? response.data : rule
        );
        setRules(updatedRules);
        message.success(t('comment_response.rule_updated', 'تم تحديث القاعدة بنجاح'));
      }

      setLoading(false);
      setShowModal(false);
    } catch (err) {
      console.error('Error saving rule:', err);
      message.error(err.response?.data?.message || t('comment_response.error_saving_rule', 'حدث خطأ أثناء حفظ القاعدة'));
      setLoading(false);
    }
  };

  // Handle rule deletion confirmation
  const handleConfirmDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/comment-responses/rules/${deleteId}`);
      const updatedRules = rules.filter(rule => rule._id !== deleteId);
      setRules(updatedRules);
      message.success(t('comment_response.rule_deleted', 'تم حذف القاعدة بنجاح'));
      setConfirmDelete(false);
      setDeleteId(null);
      setLoading(false);
    } catch (err) {
      console.error('Error deleting rule:', err);
      message.error(err.response?.data?.message || t('comment_response.error_deleting_rule', 'حدث خطأ أثناء حذف القاعدة'));
      setLoading(false);
      setConfirmDelete(false);
      setDeleteId(null);
    }
  };

  // Handle opening delete confirmation modal
  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setConfirmDelete(true);
  };

  // Handle toggling rule active status
  const handleToggleActive = async (rule) => {
    try {
      const updatedRule = { ...rule, isActive: !rule.isActive };
      const response = await axios.put(`/api/comment-responses/rules/${rule._id}`, updatedRule);
      const updatedRules = rules.map(r => 
        r._id === rule._id ? response.data : r
      );
      setRules(updatedRules);
      message.success(rule.isActive ? 
        t('comment_response.rule_deactivated', 'تم إيقاف القاعدة') : 
        t('comment_response.rule_activated', 'تم تفعيل القاعدة')
      );
    } catch (err) {
      console.error('Error toggling rule status:', err);
      message.error(t('comment_response.error_toggling_rule', 'حدث خطأ أثناء تغيير حالة القاعدة'));
    }
  };

  // Table columns
  const columns = [
    {
      title: t('comment_response.rule_name', 'اسم القاعدة'),
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <strong>{text}</strong>
          {record.description && (
            <div className="text-muted small">{record.description}</div>
          )}
        </div>
      ),
    },
    {
      title: t('comment_response.keywords', 'الكلمات المفتاحية'),
      dataIndex: 'keywords',
      key: 'keywords',
      render: keywords => (
        <div className="keywords-list">
          {keywords.map((keyword, index) => (
            <Tag color="blue" key={index} style={{ margin: '2px' }}>
              {keyword}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: t('comment_response.responses', 'الردود'),
      dataIndex: 'responses',
      key: 'responses',
      render: responses => (
        <div className="responses-list">
          {responses.map((response, index) => (
            <div key={index} className="response-item small">
              {response.length > 50 
                ? `${response.substring(0, 50)}...` 
                : response}
            </div>
          ))}
        </div>
      ),
    },
    {
      title: t('comment_response.options', 'الخيارات'),
      key: 'options',
      render: (_, record) => (
        <div className="options-list small">
          <div>
            {record.randomizeResponses 
              ? <Text type="success"><CheckOutlined /> {t('comment_response.randomize', 'عشوائي')}</Text>
              : <Text type="secondary"><CloseOutlined /> {t('comment_response.sequential', 'تسلسلي')}</Text>}
          </div>
          <div>
            {record.caseSensitive 
              ? <Text type="success"><CheckOutlined /> {t('comment_response.case_sensitive', 'حساس لحالة الأحرف')}</Text>
              : <Text type="secondary"><CloseOutlined /> {t('comment_response.not_case_sensitive', 'غير حساس لحالة الأحرف')}</Text>}
          </div>
          <div>
            {record.exactMatch 
              ? <Text type="success"><CheckOutlined /> {t('comment_response.exact_match', 'تطابق كامل')}</Text>
              : <Text type="secondary"><CloseOutlined /> {t('comment_response.partial_match', 'تطابق جزئي')}</Text>}
          </div>
        </div>
      ),
    },
    {
      title: t('comment_response.status', 'الحالة'),
      key: 'status',
      render: (_, record) => (
        <Tag color={record.isActive ? 'success' : 'default'}>
          {record.isActive 
            ? t('comment_response.active', 'نشط') 
            : t('comment_response.inactive', 'غير نشط')}
        </Tag>
      ),
    },
    {
      title: t('comment_response.stats', 'الإحصائيات'),
      key: 'stats',
      render: (_, record) => (
        <div className="stats-info small">
          <div>
            {t('comment_response.times_triggered', 'عدد مرات التشغيل')}: {record.stats?.timesTriggered || 0}
          </div>
          {record.stats?.lastTriggered && (
            <div className="text-muted">
              {t('comment_response.last_triggered', 'آخر تشغيل')}: {new Date(record.stats.lastTriggered).toLocaleString()}
            </div>
          )}
        </div>
      ),
    },
    {
      title: t('common.actions', 'الإجراءات'),
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditRule(record)}
          />
          <Button
            type={record.isActive ? "default" : "primary"}
            size="small"
            icon={record.isActive ? <CloseOutlined /> : <CheckOutlined />}
            onClick={() => handleToggleActive(record)}
          />
          <Button
            type="primary"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteClick(record._id)}
          />
        </Space>
      ),
    },
  ];

  // Render loading spinner
  if (loading && rules.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: '15px' }}>{t('common.loading', 'جاري التحميل...')}</div>
      </div>
    );
  }

  return (
    <div className="comment-response-rules">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Title level={3}>
          <SwapOutlined style={{ marginRight: '8px' }} />
          {t('comment_response.rules_title', 'قواعد الرد التلقائي')}
        </Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={handleCreateRule}
        >
          {t('comment_response.create_rule', 'إنشاء قاعدة جديدة')}
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

      {rules.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '30px 0' }}>
          <div style={{ marginBottom: '20px' }}>
            <Title level={4}>{t('comment_response.no_rules', 'لا توجد قواعد')}</Title>
            <Text type="secondary">
              {t('comment_response.create_first_rule', 'قم بإنشاء أول قاعدة للرد التلقائي على التعليقات')}
            </Text>
          </div>
          <Button 
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={handleCreateRule}
          >
            {t('comment_response.create_rule', 'إنشاء قاعدة جديدة')}
          </Button>
        </Card>
      ) : (
        <Table 
          columns={columns} 
          dataSource={rules}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          bordered
          scroll={{ x: 'max-content' }}
        />
      )}

      {/* Create/Edit Rule Modal */}
      <Modal
        title={
          modalMode === 'create'
            ? t('comment_response.create_rule', 'إنشاء قاعدة جديدة')
            : t('comment_response.edit_rule', 'تعديل القاعدة')
        }
        open={showModal}
        onCancel={() => setShowModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowModal(false)}>
            {t('common.cancel', 'إلغاء')}
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            onClick={handleSubmit}
            loading={loading}
            disabled={formData.keywords.length === 0 || formData.responses.length === 0}
          >
            {t('common.save', 'حفظ')}
          </Button>
        ]}
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item 
            label={<>{t('comment_response.rule_name', 'اسم القاعدة')} <span style={{ color: 'red' }}>*</span></>}
            name="name"
            rules={[{ required: true, message: t('comment_response.rule_name_required', 'يجب إدخال اسم للقاعدة') }]}
          >
            <Input 
              name="name"
              value={formData.name}
              onChange={handleInputChange}
            />
          </Form.Item>

          <Form.Item 
            label={t('comment_response.description', 'الوصف')}
            name="description"
          >
            <TextArea
              rows={2}
              name="description"
              value={formData.description}
              onChange={handleInputChange}
            />
          </Form.Item>

          <Divider orientation="left">{t('comment_response.keywords', 'الكلمات المفتاحية')} <span style={{ color: 'red' }}>*</span></Divider>
          
          <div style={{ marginBottom: '15px' }}>
            <Input.Group compact>
              <Input
                style={{ width: 'calc(100% - 40px)' }}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={t('comment_response.enter_keyword', 'أدخل كلمة مفتاحية')}
                onPressEnter={keyword ? handleAddKeyword : undefined}
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddKeyword}
                disabled={!keyword}
              />
            </Input.Group>
            
            <div style={{ marginTop: '10px' }}>
              {formData.keywords.map((kw, index) => (
                <Tag 
                  color="blue" 
                  key={index}
                  closable
                  onClose={() => handleRemoveKeyword(kw)}
                  style={{ margin: '3px' }}
                >
                  {kw}
                </Tag>
              ))}
            </div>
            
            <div style={{ marginTop: '5px' }}>
              <Text type="secondary">
                {t('comment_response.keywords_hint', 'أدخل الكلمات المفتاحية التي ستفعل الرد التلقائي عند وجودها في التعليق')}
              </Text>
            </div>
          </div>

          <Divider orientation="left">{t('comment_response.responses', 'الردود')} <span style={{ color: 'red' }}>*</span></Divider>
          
          <div style={{ marginBottom: '15px' }}>
            <div style={{ display: 'flex', marginBottom: '10px' }}>
              <TextArea
                rows={2}
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder={t('comment_response.enter_response', 'أدخل رد')}
                style={{ marginRight: '8px' }}
              />
              <Button 
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddResponse}
                disabled={!response}
                style={{ alignSelf: 'flex-start' }}
              />
            </div>
            
            <div>
              {formData.responses.map((resp, index) => (
                <Card key={index} size="small" style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>{resp}</div>
                    <Button 
                      type="text" 
                      danger
                      icon={<CloseOutlined />}
                      onClick={() => handleRemoveResponse(index)}
                    />
                  </div>
                </Card>
              ))}
            </div>
            
            <div style={{ marginTop: '5px' }}>
              <Text type="secondary">
                {t('comment_response.responses_hint', 'أدخل الردود التي سيتم استخدامها للرد على التعليقات التي تحتوي على الكلمات المفتاحية')}
              </Text>
            </div>
          </div>
          
          <Divider orientation="left">{t('comment_response.options', 'الخيارات')}</Divider>
          
          <Form.Item name="randomizeResponses" valuePropName="checked">
            <Checkbox 
              checked={formData.randomizeResponses}
              onChange={(e) => handleCheckboxChange('randomizeResponses', e.target.checked)}
            >
              {t('comment_response.randomize_responses', 'اختيار رد عشوائي من القائمة')}
            </Checkbox>
          </Form.Item>
          
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item name="caseSensitive" valuePropName="checked">
                <Checkbox 
                  checked={formData.caseSensitive}
                  onChange={(e) => handleCheckboxChange('caseSensitive', e.target.checked)}
                >
                  {t('comment_response.case_sensitive', 'حساس لحالة الأحرف')}
                </Checkbox>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="exactMatch" valuePropName="checked">
                <Checkbox 
                  checked={formData.exactMatch}
                  onChange={(e) => handleCheckboxChange('exactMatch', e.target.checked)}
                >
                  {t('comment_response.exact_match', 'تطابق كامل للكلمات')}
                </Checkbox>
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item name="isActive" valuePropName="checked">
            <Checkbox 
              checked={formData.isActive}
              onChange={(e) => handleCheckboxChange('isActive', e.target.checked)}
            >
              {t('comment_response.rule_active', 'قاعدة نشطة')}
            </Checkbox>
          </Form.Item>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        title={t('comment_response.confirm_delete', 'تأكيد الحذف')}
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        footer={[
          <Button key="cancel" onClick={() => setConfirmDelete(false)}>
            {t('common.cancel', 'إلغاء')}
          </Button>,
          <Button 
            key="confirm" 
            type="primary" 
            danger
            loading={loading}
            onClick={handleConfirmDelete}
          >
            {t('common.delete', 'حذف')}
          </Button>
        ]}
      >
        <p>{t('comment_response.delete_confirm_message', 'هل أنت متأكد من حذف هذه القاعدة؟ هذا الإجراء لا يمكن التراجع عنه.')}</p>
      </Modal>
    </div>
  );
};

export default CommentResponseRules;