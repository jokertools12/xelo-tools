import React from 'react';
import { 
  Card, Button, List, Alert, 
  Tag, Spin, Tooltip, Typography, Space, Divider
} from 'antd';
import { 
  FacebookOutlined, SyncOutlined, CheckOutlined, 
  InfoCircleOutlined, WarningOutlined
} from '@ant-design/icons';
import { useLanguage } from '../../context/LanguageContext';

const { Text, Paragraph } = Typography;
const { Item } = List;

const PageExtractor = ({
  selectedToken,
  activeAccessToken,
  pages,
  selectedPage,
  onExtractPages,
  onSelectPage,
  isExtracting
}) => {
  const { t } = useLanguage();
  
  // Determine if we have a token available (either active or selected)
  const hasAvailableToken = !!selectedToken || !!activeAccessToken;
  
  // Function to handle page extraction
  const handleExtractPages = () => {
    if (!hasAvailableToken) return;
    onExtractPages();
  };
  
  // Function to select a page
  const handleSelectPage = (page) => {
    onSelectPage(page);
  };
  
  return (
    <div className="page-extractor">
      <Card
        title={
          <Space>
            <FacebookOutlined />
            <span>{t('pageMessages:pages.title')}</span>
          </Space>
        }
        extra={
          <Tooltip
            title={hasAvailableToken 
              ? t('pageMessages:pages.extractTooltip') 
              : t('pageMessages:pages.selectTokenFirst')}
          >
            <Button
              type="primary"
              size="small"
              icon={isExtracting ? <Spin size="small" /> : <SyncOutlined />}
              onClick={handleExtractPages}
              disabled={!hasAvailableToken || isExtracting}
            >
              {isExtracting 
                ? t('pageMessages:pages.extracting')
                : t('pageMessages:pages.extract')
              }
            </Button>
          </Tooltip>
        }
      >
        {!hasAvailableToken ? (
          <Alert
            type="warning"
            message={
              <Space>
                <WarningOutlined />
                {t('pageMessages:pages.selectTokenFirst')}
              </Space>
            }
          />
        ) : isExtracting ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Spin size="small" />
            <Paragraph style={{ marginTop: 8 }}>
              {t('pageMessages:pages.extractingMessage')}
            </Paragraph>
          </div>
        ) : pages.length > 0 ? (
          <List
            dataSource={pages}
            renderItem={(page) => {
              const isSelected = selectedPage && selectedPage.id === page.id;
              
              return (
                <Item
                  key={page.id}
                  onClick={() => handleSelectPage(page)}
                  className={`page-item ${isSelected ? 'selected' : ''}`}
                  style={{ 
                    cursor: 'pointer',
                    padding: '8px 12px',
                    background: isSelected ? '#f0f5ff' : 'transparent',
                    borderRadius: '4px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <div>
                      <Text strong>{page.name}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: '12px' }}>ID: {page.id}</Text>
                    </div>
                    {isSelected && (
                      <Tag color="blue">
                        <CheckOutlined style={{ marginRight: 4 }} />
                        {t('pageMessages:pages.selected')}
                      </Tag>
                    )}
                  </div>
                </Item>
              );
            }}
          />
        ) : (
          <Alert
            type="info"
            message={
              <Space>
                <InfoCircleOutlined />
                {t('pageMessages:pages.noPages')}
              </Space>
            }
          />
        )}
        <Divider style={{ margin: '12px 0' }} />
        <Text type="secondary">
          {t('pageMessages:pages.description')}
        </Text>
      </Card>
    </div>
  );
};

export default PageExtractor;