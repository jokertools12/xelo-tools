import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Modal, Form, Input, Switch, Select, 
  Tabs, Card, message, Popconfirm, Space, Typography, Tag, Dropdown, Menu,
  Tooltip, Divider, Alert, Badge
} from 'antd';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, 
  GlobalOutlined, TranslationOutlined, CheckCircleOutlined,
  FilterOutlined, InfoCircleOutlined, SaveOutlined, AppstoreAddOutlined,
  CheckOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { useLanguage } from '../../context/LanguageContext';
import '../../styles/LanguageManagement.css';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

// Predefined categories with their corresponding colors
const PREDEFINED_CATEGORIES = [
  { value: 'general', color: 'default' },
  { value: 'dashboard', color: 'blue' },
  { value: 'achievements', color: 'gold' },
  { value: 'activities', color: 'green' },
  { value: 'levels', color: 'purple' },
  { value: 'time', color: 'cyan' },
  { value: 'translations', color: 'magenta' },
  { value: 'languages', color: 'orange' },
  { value: 'navigation', color: 'geekblue' },
  { value: 'charts', color: 'volcano' },
  { value: 'errors', color: 'red' },
  { value: 'actions', color: 'lime' },
  { value: 'authentication', color: 'processing' },
  { value: 'profile', color: 'success' },
  { value: 'extractors', color: 'warning' }
];

// Colors to use for custom categories in a rotating fashion
const CUSTOM_CATEGORY_COLORS = [
  'blue', 'green', 'gold', 'purple', 'cyan', 
  'magenta', 'orange', 'geekblue', 'volcano', 'lime'
];

// Create a mapping of category to color for easy access
const CATEGORY_COLORS = PREDEFINED_CATEGORIES.reduce((acc, { value, color }) => {
  acc[value] = color;
  return acc;
}, {});

// Get a color for a custom category
const getColorForCategory = (category) => {
  if (CATEGORY_COLORS[category]) {
    return CATEGORY_COLORS[category];
  }
  
  // For custom categories, generate a color based on the category name
  const index = Math.abs(category.split('').reduce(
    (sum, char) => sum + char.charCodeAt(0), 0
  ) % CUSTOM_CATEGORY_COLORS.length);
  
  return CUSTOM_CATEGORY_COLORS[index];
};

const LanguageManagement = () => {
  // State for multi-language translation feature
  const [selectedLanguageCodes, setSelectedLanguageCodes] = useState([]);
  const [customCategories, setCustomCategories] = useState([]);
  const [isBulkTranslationLoading, setIsBulkTranslationLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);
  const { t } = useLanguage();
  const [languages, setLanguages] = useState([]);
  const [translations, setTranslations] = useState([]);
  const [allTranslations, setAllTranslations] = useState([]); // Store all translations for filtering
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [translationModalVisible, setTranslationModalVisible] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(null);
  const [currentTranslation, setCurrentTranslation] = useState(null);
  const [form] = Form.useForm();
  const [translationForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('1');
  const [selectedLanguageCode, setSelectedLanguageCode] = useState(null);
  const [categories, setCategories] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Fetch languages on mount
  useEffect(() => {
    fetchLanguages();
  }, []);

  // Fetch translations when a language is selected
  useEffect(() => {
    if (selectedLanguageCode && activeTab === '2') {
      fetchTranslations(selectedLanguageCode);
    }
  }, [selectedLanguageCode, activeTab]);
  
  // Add custom categories to the category list
  useEffect(() => {
    if (categories.length > 0) {
      const existingCategories = new Set(categories);
      const custom = customCategories.filter(cat => !existingCategories.has(cat));
      
      if (custom.length > 0) {
        setCategories([...categories, ...custom]);
      }
    }
  }, [customCategories, categories]);

  // Fetch languages
  const fetchLanguages = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/languages');
      setLanguages(data);
      
      // Set the first language as selected if none is selected
      if (data.length > 0 && !selectedLanguageCode) {
        setSelectedLanguageCode(data[0].code);
      }
    } catch (error) {
      console.error('Error fetching languages:', error);
      message.error(t('error_fetching_languages'));
    } finally {
      setLoading(false);
    }
  };

  // Fetch translations for a language
  const fetchTranslations = async (langCode) => {
    try {
      setLoading(true);
      
      // Get all translation objects with categories and metadata
      const { data: translationsData } = await axios.get(
        `/api/languages/${langCode}/translations?includeMetadata=true`
      );
      
      console.log('Fetched translations data:', translationsData);
      
      if (Array.isArray(translationsData)) {
        // Process translations to ensure they have valid categories
        const processedTranslations = translationsData.map(t => ({
          ...t,
          category: t.category || determineCategory(t.key) || 'general'
        }));
        
        setAllTranslations(processedTranslations);
        setTranslations(processedTranslations);
        
        // Extract unique categories from data and merge with predefined categories
        const dataCategories = [...new Set(
          processedTranslations
            .map(t => t.category)
            .filter(Boolean)
        )];
        
        // Merge unique categories from data with predefined ones
        const allCategories = [...new Set([
          ...PREDEFINED_CATEGORIES.map(c => c.value),
          ...dataCategories
        ])];
        
        console.log('All categories:', allCategories);
        setCategories(allCategories);
      } else {
        // Convert object to array for table display if API returns key-value pairs
        const translationsArray = Object.entries(translationsData).map(([key, value]) => {
          const category = determineCategory(key) || 'general';
          return {
            key,
            value,
            category
          };
        });
        
        setAllTranslations(translationsArray);
        setTranslations(translationsArray);
        setCategories(PREDEFINED_CATEGORIES.map(c => c.value));
      }
    } catch (error) {
      console.error(`Error fetching translations for ${langCode}:`, error);
      message.error(t('error_fetching_translations'));
    } finally {
      setLoading(false);
    }
  };

  // Handle language form submission
  const handleLanguageSubmit = async (values) => {
    try {
      setLoading(true);
      
      if (currentLanguage) {
        // Update existing language
        await axios.put(`/api/languages/${currentLanguage.code}`, values);
        message.success(t('language_updated'));
      } else {
        // Create new language
        await axios.post('/api/languages', values);
        message.success(t('language_created'));
      }
      
      // Refresh languages
      fetchLanguages();
      setModalVisible(false);
      form.resetFields();
      setCurrentLanguage(null);
    } catch (error) {
      console.error('Error saving language:', error);
      message.error(t('error_saving_language'));
    } finally {
      setLoading(false);
    }
  };

  // Handle translation form submission - updated for multi-language support with different values
  const handleTranslationSubmit = async (values) => {
    try {
      setLoading(true);
      
      // If it's an existing translation (edit mode), update only the current language
      if (currentTranslation) {
        await axios.post(`/api/languages/${selectedLanguageCode}/translations`, {
          key: values.key,
          value: values.value,
          category: values.category || 'general'
        });
        
        message.success(t('translation_saved'));
        
        // Refresh translations
        fetchTranslations(selectedLanguageCode);
        setTranslationModalVisible(false);
        translationForm.resetFields();
        setCurrentTranslation(null);
        return;
      }
      
      // For new translations with multiple languages selected
      const targetLanguages = values.languages || [selectedLanguageCode];
      
      // If we have multiple language values
      if (values.languageValues) {
        // Multiple languages - use bulk endpoint for each language
        setIsBulkTranslationLoading(true);
        
        const results = await Promise.all(
          targetLanguages.map(async (langCode) => {
            try {
              const value = values.languageValues[langCode] || '';
              
              if (!value.trim()) {
                return { 
                  langCode, 
                  success: false, 
                  error: t('empty_translation_value') 
                };
              }
              
              await axios.post(`/api/languages/${langCode}/translations`, {
                key: values.key,
                value: value,
                category: values.category || 'general'
              });
              
              return { langCode, success: true };
            } catch (error) {
              console.error(`Error saving translation for ${langCode}:`, error);
              return { langCode, success: false, error: error.message };
            }
          })
        );
        
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        setBulkResults({
          total: results.length,
          successful,
          failed,
          results
        });
        
        setIsBulkTranslationLoading(false);
        
        if (failed === 0) {
          message.success(t('bulk_translation_saved', { count: successful }));
        } else {
          message.warn(t('bulk_translation_partial', { success: successful, failed }));
        }
      } else if (targetLanguages.length === 1) {
        // Single language with only the 'value' field - use regular endpoint
        await axios.post(`/api/languages/${targetLanguages[0]}/translations`, {
          key: values.key,
          value: values.value,
          category: values.category || 'general'
        });
        
        message.success(t('translation_saved'));
      }
      
      // Add new category to the list if it doesn't exist
      if (values.category && !categories.includes(values.category) && 
          !PREDEFINED_CATEGORIES.some(c => c.value === values.category)) {
        setCustomCategories([...customCategories, values.category]);
      }
      
      // Refresh translations for the currently selected language
      fetchTranslations(selectedLanguageCode);
      setTranslationModalVisible(false);
      translationForm.resetFields();
      setCurrentTranslation(null);
    } catch (error) {
      console.error('Error saving translation:', error);
      message.error(t('error_saving_translation'));
    } finally {
      setLoading(false);
    }
  };

  // Delete a language
  const handleDeleteLanguage = async (code) => {
    try {
      setLoading(true);
      await axios.delete(`/api/languages/${code}`);
      message.success(t('language_deleted'));
      
      // Refresh languages
      fetchLanguages();
    } catch (error) {
      console.error('Error deleting language:', error);
      message.error(t('error_deleting_language'));
    } finally {
      setLoading(false);
    }
  };

  // Delete a translation
  const handleDeleteTranslation = async (key) => {
    try {
      setLoading(true);
      await axios.delete(`/api/languages/${selectedLanguageCode}/translations/${key}`);
      message.success(t('translation_deleted'));
      
      // Refresh translations
      fetchTranslations(selectedLanguageCode);
    } catch (error) {
      console.error('Error deleting translation:', error);
      message.error(t('error_deleting_translation'));
    } finally {
      setLoading(false);
    }
  };

  // Edit a language
  const handleEditLanguage = (language) => {
    setCurrentLanguage(language);
    form.setFieldsValue({
      code: language.code,
      name: language.name,
      nativeName: language.nativeName,
      direction: language.direction || 'ltr',
      isActive: language.isActive,
      isDefault: language.isDefault,
      icon: language.icon
    });
    setModalVisible(true);
  };

  // Edit a translation
  const handleEditTranslation = (translation) => {
    setCurrentTranslation(translation);
    translationForm.setFieldsValue({
      key: translation.key,
      value: translation.value,
      category: translation.category || 'general'
    });
    setTranslationModalVisible(true);
  };

  // Helper function to determine category from key
  const determineCategory = (key) => {
    // Logic to determine category based on key patterns
    if (key.startsWith('achievement') || key.includes('Achievement')) {
      return 'achievements';
    } else if (key.startsWith('activity') || key.includes('Activity')) {
      return 'activities';
    } else if (key.startsWith('level') || key.includes('Level')) {
      return 'levels';
    } else if (key.includes('dashboard') || key.includes('Dashboard')) {
      return 'dashboard';
    } else if (key.includes('error') || key.includes('Error')) {
      return 'errors';
    } else if (key.includes('button') || key.includes('action')) {
      return 'actions';
    } else if (key.includes('login') || key.includes('register') || key.includes('password')) {
      return 'authentication';
    } else if (key.includes('profile') || key.includes('user') || key.includes('account')) {
      return 'profile';
    } else if (key.includes('extract') || key.includes('comment') || key.includes('reaction')) {
      return 'extractors';
    }
    
    return null;
  };

  // Handle select change for multiple languages
  const handleLanguageSelectChange = (values) => {
    setSelectedLanguageCodes(values);
    
    // Update form values - initialize language values object if needed
    const currentValues = translationForm.getFieldsValue();
    const languageValues = { ...currentValues.languageValues } || {};
    
    // Initialize empty values for new languages
    values.forEach(langCode => {
      if (!languageValues[langCode]) {
        languageValues[langCode] = '';
      }
    });
    
    translationForm.setFieldsValue({ 
      languageValues,
      languages: values 
    });
  };

  // Filter translations by search text and category
  const filteredTranslations = allTranslations.filter(t => {
    const matchesSearch = t.key.toLowerCase().includes(searchText.toLowerCase()) || 
                          t.value.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Handle category filter change
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
  };

  // Language table columns
  const languageColumns = [
    {
      title: t('languageCode'),
      dataIndex: 'code',
      key: 'code',
      width: 100,
    },
    {
      title: t('languageName'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('nativeName'),
      dataIndex: 'nativeName',
      key: 'nativeName',
    },
    {
      title: t('direction'),
      dataIndex: 'direction',
      key: 'direction',
      render: (direction) => direction === 'rtl' ? t('rtl') : t('ltr'),
      width: 100,
    },
    {
      title: t('status'),
      key: 'status',
      width: 120,
      render: (_, record) => (
        <Space>
          {record.isActive && <Tag color="green">{t('active')}</Tag>}
          {!record.isActive && <Tag color="red">{t('inactive')}</Tag>}
          {record.isDefault && <Tag color="blue">{t('isDefault')}</Tag>}
        </Space>
      ),
    },
    {
      title: t('actions'),
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button 
            icon={<EditOutlined />} 
            onClick={() => handleEditLanguage(record)} 
            type="primary" 
            size="small"
          />
          {!record.isDefault && (
            <Popconfirm
              title={t('confirm_delete_language')}
              onConfirm={() => handleDeleteLanguage(record.code)}
              okText={t('yes')}
              cancelText={t('cancel')}
            >
              <Button 
                icon={<DeleteOutlined />} 
                danger 
                size="small"
              />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // Translation table columns
  const translationColumns = [
    {
      title: t('translationKey'),
      dataIndex: 'key',
      key: 'key',
      width: '30%',
    },
    {
      title: t('translationValue'),
      dataIndex: 'value',
      key: 'value',
      width: '40%',
    },
    {
      title: t('category'),
      dataIndex: 'category',
      key: 'category',
      width: '15%',
      render: (category) => (
        <Tag color={CATEGORY_COLORS[category] || 'default'}>
          {category || 'general'}
        </Tag>
      ),
    },
    {
      title: t('actions'),
      key: 'actions',
      width: '15%',
      render: (_, record) => (
        <Space>
          <Button 
            icon={<EditOutlined />} 
            onClick={() => handleEditTranslation(record)} 
            type="primary" 
            size="small"
          />
          <Popconfirm
            title={t('confirm_delete_translation')}
            onConfirm={() => handleDeleteTranslation(record.key)}
            okText={t('yes')}
            cancelText={t('cancel')}
          >
            <Button 
              icon={<DeleteOutlined />} 
              danger 
              size="small"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="language-management">
      <Title level={2}>
        <GlobalOutlined /> {t('languageManagement')}
      </Title>
      
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        className="language-tabs"
      >
        <TabPane 
          tab={<span><GlobalOutlined /> {t('languages')}</span>} 
          key="1"
        >
          <Card 
            title={t('languages')}
            extra={
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={() => {
                  setCurrentLanguage(null);
                  form.resetFields();
                  setModalVisible(true);
                }}
              >
                {t('addLanguage')}
              </Button>
            }
          >
            <Table 
              columns={languageColumns}
              dataSource={languages}
              rowKey="code"
              loading={loading}
              pagination={false}
            />
          </Card>
        </TabPane>
        
        <TabPane 
          tab={<span><TranslationOutlined /> {t('translations')}</span>} 
          key="2"
          disabled={languages.length === 0}
        >
          <Card title={t('translations')}>
            <div className="translations-header">
              <div className="translations-actions">
                <Select
                  value={selectedLanguageCode}
                  onChange={setSelectedLanguageCode}
                  style={{ width: 200 }}
                  placeholder={t('select_language')}
                >
                  {languages.map(lang => (
                    <Option key={lang.code} value={lang.code}>
                      {lang.name} ({lang.nativeName})
                    </Option>
                  ))}
                </Select>
                
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={() => {
                    setCurrentTranslation(null);
                    translationForm.resetFields();
                    setTranslationModalVisible(true);
                  }}
                  disabled={!selectedLanguageCode}
                  style={{ marginLeft: 16 }}
                >
                  {t('addTranslation')}
                </Button>
              </div>
              
              <div className="filters-container">
                <Input.Search
                  placeholder={t('search_translations')}
                  onChange={e => setSearchText(e.target.value)}
                  style={{ width: 250, marginRight: 16 }}
                  allowClear
                />
                
                <Dropdown
                  overlay={
                    <Menu selectedKeys={[selectedCategory]}>
                      <Menu.Item key="all" onClick={() => handleCategoryChange('all')}>
                        {t('all_categories')}
                      </Menu.Item>
                      <Menu.Divider />
                      {categories.map(category => (
                        <Menu.Item 
                          key={category} 
                          onClick={() => handleCategoryChange(category)}
                        >
                          <Tag color={CATEGORY_COLORS[category] || 'default'}>
                            {category}
                          </Tag>
                        </Menu.Item>
                      ))}
                    </Menu>
                  }
                  trigger={['click']}
                >
                  <Button icon={<FilterOutlined />}>
                    {selectedCategory === 'all' ? t('all_categories') : selectedCategory}
                  </Button>
                </Dropdown>
              </div>
            </div>
            
            <Table 
              columns={translationColumns}
              dataSource={filteredTranslations}
              rowKey="key"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>
      </Tabs>
      
      {/* Language Form Modal */}
      <Modal
        title={currentLanguage ? t('editLanguage') : t('addLanguage')}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleLanguageSubmit}
        >
          <Form.Item
            name="code"
            label={t('languageCode')}
            rules={[{ required: true, message: t('please_enter_language_code') }]}
            tooltip={t('language_code_tooltip')}
            disabled={!!currentLanguage}
          >
            <Input disabled={!!currentLanguage} placeholder="ar" />
          </Form.Item>
          
          <Form.Item
            name="name"
            label={t('languageName')}
            rules={[{ required: true, message: t('please_enter_language_name') }]}
          >
            <Input placeholder="Arabic" />
          </Form.Item>
          
          <Form.Item
            name="nativeName"
            label={t('nativeName')}
            rules={[{ required: true, message: t('please_enter_native_name') }]}
          >
            <Input placeholder="العربية" />
          </Form.Item>
          
          <Form.Item
            name="direction"
            label={t('direction')}
            rules={[{ required: true, message: t('please_select_direction') }]}
          >
            <Select>
              <Option value="ltr">{t('ltr')}</Option>
              <Option value="rtl">{t('rtl')}</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="icon"
            label={t('language_icon')}
          >
            <Input placeholder="/public/flags/ar.png" />
          </Form.Item>
          
          <Form.Item
            name="isActive"
            label={t('active')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          
          <Form.Item
            name="isDefault"
            label={t('isDefault')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              {t('save')}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
      
      {/* Translation Form Modal - Updated with multi-language support */}
      <Modal
        title={currentTranslation ? t('editTranslation') : t('addTranslation')}
        visible={translationModalVisible}
        onCancel={() => {
          setTranslationModalVisible(false);
          setBulkResults(null);
        }}
        footer={null}
        width={700}
      >
        <Form
          form={translationForm}
          layout="vertical"
          onFinish={handleTranslationSubmit}
        >
          {!currentTranslation && (
            <Alert
              message={t('multi_language_translation_info')}
              description={t('multi_language_translation_description')}
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          
          <Form.Item
            name="key"
            label={
              <span>
                {t('translationKey')}
                <Tooltip title={t('translation_key_tooltip')}>
                  <InfoCircleOutlined style={{ marginLeft: 8 }} />
                </Tooltip>
              </span>
            }
            rules={[{ required: true, message: t('please_enter_translation_key') }]}
          >
            <Input disabled={!!currentTranslation} placeholder="welcome_message" />
          </Form.Item>
          
          {/* When editing an existing translation, show a single input field */}
          {currentTranslation && (
            <Form.Item
              name="value"
              label={t('translationValue')}
              rules={[{ required: true, message: t('please_enter_translation_value') }]}
            >
              <Input.TextArea 
                rows={4} 
                placeholder={t('translation_value_placeholder')} 
              />
            </Form.Item>
          )}
          
          <Form.Item
            name="category"
            label={t('category')}
            rules={[{ required: true, message: t('please_select_category') }]}
            initialValue="general"
          >
            <Select
              placeholder={t('select_category')}
              showSearch
              optionFilterProp="children"
              allowClear
              dropdownRender={menu => (
                <>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ display: 'flex', flexWrap: 'nowrap', padding: 8 }}>
                    <Input
                      style={{ flex: 'auto' }}
                      placeholder={t('custom_category')}
                      id="custom-category-input"
                    />
                    <Button
                      type="text"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        const input = document.getElementById('custom-category-input');
                        const value = input.value.trim();
                        if (value && !categories.includes(value)) {
                          setCustomCategories([...customCategories, value]);
                          translationForm.setFieldsValue({ category: value });
                          input.value = '';
                        }
                      }}
                    >
                      {t('add')}
                    </Button>
                  </div>
                </>
              )}
            >
              {categories.map(category => {
                const color = getColorForCategory(category);
                return (
                  <Option key={category} value={category}>
                    <Tag color={color}>{category}</Tag>
                  </Option>
                );
              })}
            </Select>
          </Form.Item>
          
          {/* Multi-language selection - only show for new translations */}
          {!currentTranslation && (
            <Form.Item
              name="languages"
              label={
                <span>
                  {t('target_languages')}
                  <Tooltip title={t('target_languages_tooltip')}>
                    <InfoCircleOutlined style={{ marginLeft: 8 }} />
                  </Tooltip>
                </span>
              }
              rules={[{ required: true, message: t('please_select_languages') }]}
              initialValue={[selectedLanguageCode]}
            >
              <Select
                mode="multiple"
                placeholder={t('select_languages')}
                onChange={handleLanguageSelectChange}
                optionFilterProp="children"
                style={{ width: '100%' }}
              >
                {languages.map(lang => (
                  <Option key={lang.code} value={lang.code}>
                    <Space>
                      {lang.direction === 'rtl' ? 
                        <span style={{ direction: 'rtl', textAlign: 'right', display: 'inline-block' }}>{lang.nativeName}</span> :
                        <span>{lang.nativeName}</span>
                      }
                      <span>({lang.name})</span>
                      {lang.isDefault && <Tag color="blue">{t('default')}</Tag>}
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}
          
          {/* For new translations, show a separate field for each selected language */}
          {!currentTranslation && selectedLanguageCodes.length > 0 && (
            <div>
              <Divider>{t('translation_values_for_languages')}</Divider>
              
              {selectedLanguageCodes.map(langCode => {
                const lang = languages.find(l => l.code === langCode);
                
                if (!lang) return null;
                
                return (
                  <Form.Item
                    key={langCode}
                    name={['languageValues', langCode]}
                    label={
                      <Space>
                        {lang.direction === 'rtl' ? 
                          <span style={{ direction: 'rtl', textAlign: 'right', display: 'inline-block' }}>
                            {lang.nativeName} 
                          </span> :
                          <span>{lang.nativeName}</span>
                        }
                        <span>({lang.name})</span>
                        {lang.isDefault && <Tag color="blue">{t('default')}</Tag>}
                      </Space>
                    }
                    rules={[{ required: true, message: t('please_enter_translation_value_for_lang', { lang: lang.name }) }]}
                  >
                    <Input.TextArea 
                      rows={3} 
                      placeholder={t('translation_value_placeholder_for_lang', { lang: lang.name })}
                      dir={lang.direction}
                    />
                  </Form.Item>
                );
              })}
            </div>
          )}
          
          {bulkResults && (
            <div style={{ marginBottom: 16 }}>
              <Alert
                message={t('bulk_results')}
                description={
                  <>
                    <p>
                      {t('bulk_results_summary', { 
                        total: bulkResults.total,
                        success: bulkResults.successful,
                        failed: bulkResults.failed
                      })}
                    </p>
                    {bulkResults.failed > 0 && (
                      <ul>
                        {bulkResults.results.filter(r => !r.success).map((result, i) => (
                          <li key={i}>
                            {t('bulk_result_failed', { code: result.langCode, error: result.error })}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                }
                type={bulkResults.failed === 0 ? "success" : "warning"}
                showIcon
              />
            </div>
          )}
          
          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading || isBulkTranslationLoading}
                icon={<SaveOutlined />}
              >
                {currentTranslation ? t('save') : t('add_translation')}
              </Button>
              <Button 
                onClick={() => {
                  setTranslationModalVisible(false);
                  setBulkResults(null);
                }}
              >
                {t('cancel')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LanguageManagement;