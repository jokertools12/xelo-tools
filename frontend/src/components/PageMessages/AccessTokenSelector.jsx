import React, { useState } from 'react';
import { 
  Card, Form, Button, Input, List, Tag, 
  Modal, Alert, Spin, Typography, Space, Divider
} from 'antd';
import { 
  KeyOutlined, PlusOutlined, CheckOutlined,
  CopyOutlined, EyeOutlined, EyeInvisibleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useLanguage } from '../../context/LanguageContext';
import { message } from 'antd';

const { Text, Title, Paragraph } = Typography;
const { Item } = List;
const { Password } = Input;

const AccessTokenSelector = ({ 
  accessTokens, 
  selectedToken, 
  onSelectToken, 
  onAddToken,
  isLoading
}) => {
  const { t } = useLanguage();
  
  // State for modal and form
  const [showAddModal, setShowAddModal] = useState(false);
  const [tokenName, setTokenName] = useState('');
  const [tokenValue, setTokenValue] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    // Validate form
    if (!tokenName || !tokenValue) {
      setTokenError(t('pageMessages:accessToken.errorEmptyFields'));
      return;
    }
    
    if (tokenValue.length < 50) {
      setTokenError(t('pageMessages:accessToken.errorInvalidToken'));
      return;
    }
    
    setTokenError('');
    setIsSubmitting(true);
    
    try {
      // Call the onAddToken function provided as a prop
      await onAddToken({
        name: tokenName,
        token: tokenValue
      });
      
      // Reset form and close modal
      setTokenName('');
      setTokenValue('');
      setShowAddModal(false);
    } catch (error) {
      setTokenError(error.message || t('pageMessages:accessToken.errorAdding'));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => message.info(t('pageMessages:accessToken.copiedToClipboard')))
      .catch(err => console.error('Could not copy text: ', err));
  };
  
  const getMaskedToken = (token) => {
    if (!token) return '';
    if (token.length <= 8) return '••••••••';
    
    const firstFour = token.substring(0, 4);
    const lastFour = token.substring(token.length - 4);
    return `${firstFour}...${lastFour}`;
  };
  
  return (
    <div className="access-token-selector">
      <Card
        title={
          <Space>
            <KeyOutlined />
            <span>{t('pageMessages:accessToken.title')}</span>
          </Space>
        }
        extra={
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setShowAddModal(true)}
          >
            {t('pageMessages:accessToken.addNew')}
          </Button>
        }
      >
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Spin size="small" />
            <Paragraph style={{ marginTop: 8 }}>{t('common:loading')}</Paragraph>
          </div>
        ) : accessTokens.length > 0 ? (
          <List
            dataSource={accessTokens}
            renderItem={(token) => (
              <Item
                key={token.id}
                onClick={() => onSelectToken(token)}
                className={`token-item ${selectedToken && selectedToken.id === token.id ? 'selected' : ''}`}
                style={{ 
                  cursor: 'pointer',
                  padding: '8px 12px',
                  background: selectedToken && selectedToken.id === token.id ? '#f0f5ff' : 'transparent',
                  borderRadius: '4px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <div>
                    <Text strong>{token.name}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>{getMaskedToken(token.token)}</Text>
                  </div>
                  {selectedToken && selectedToken.id === token.id && (
                    <Tag color="blue">
                      <CheckOutlined style={{ marginRight: 4 }} />
                      {t('pageMessages:accessToken.selected')}
                    </Tag>
                  )}
                </div>
              </Item>
            )}
          />
        ) : (
          <Alert
            type="info"
            message={
              <Space>
                <InfoCircleOutlined />
                {t('pageMessages:accessToken.noTokens')}
              </Space>
            }
          />
        )}
        <Divider style={{ margin: '12px 0' }} />
        <Text type="secondary">
          {t('pageMessages:accessToken.description')}
        </Text>
      </Card>
      
      {/* Add Token Modal */}
      <Modal
        title={t('pageMessages:accessToken.addNewTitle')}
        open={showAddModal}
        onCancel={() => setShowAddModal(false)}
        onOk={handleSubmit}
        confirmLoading={isSubmitting}
        okText={
          isSubmitting ? (
            <Space>
              <Spin size="small" />
              {t('common:saving')}
            </Space>
          ) : (
            <Space>
              <PlusOutlined />
              {t('pageMessages:accessToken.addButton')}
            </Space>
          )
        }
        cancelText={t('common:cancel')}
      >
        {tokenError && (
          <Alert
            type="error"
            message={tokenError}
            style={{ marginBottom: 16 }}
          />
        )}
        
        <Form layout="vertical">
          <Form.Item 
            label={t('pageMessages:accessToken.nameLabel')}
            help={t('pageMessages:accessToken.nameHelp')}
          >
            <Input
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              placeholder={t('pageMessages:accessToken.namePlaceholder')}
            />
          </Form.Item>
          
          <Form.Item 
            label={t('pageMessages:accessToken.tokenLabel')}
            help={t('pageMessages:accessToken.tokenHelp')}
          >
            <Input.Group compact>
              <Input
                style={{ width: 'calc(100% - 64px)' }}
                type={showToken ? 'text' : 'password'}
                value={tokenValue}
                onChange={(e) => setTokenValue(e.target.value)}
                placeholder={t('pageMessages:accessToken.tokenPlaceholder')}
              />
              <Button
                icon={showToken ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                onClick={() => setShowToken(!showToken)}
              />
              <Button
                icon={<CopyOutlined />}
                onClick={() => copyToClipboard(tokenValue)}
                disabled={!tokenValue}
              />
            </Input.Group>
          </Form.Item>
          
          <Alert
            type="info"
            message={
              <>
                <Title level={5}>{t('pageMessages:accessToken.howToGetToken')}</Title>
                <ol style={{ paddingLeft: 16, margin: 0 }}>
                  <li>{t('pageMessages:accessToken.step1')}</li>
                  <li>{t('pageMessages:accessToken.step2')}</li>
                  <li>{t('pageMessages:accessToken.step3')}</li>
                  <li>{t('pageMessages:accessToken.step4')}</li>
                </ol>
              </>
            }
          />
        </Form>
      </Modal>
    </div>
  );
};

export default AccessTokenSelector;