import React from 'react';
import { Card, Alert, List, Collapse, Typography, Space, Divider } from 'antd';
import { 
  InfoCircleOutlined, 
  RobotOutlined, 
  DashboardOutlined, 
  HistoryOutlined, 
  ClockCircleOutlined, 
  CommentOutlined, 
  FileTextOutlined, 
  SyncOutlined, 
  InboxOutlined, 
  WarningOutlined,
  DatabaseOutlined,
  CloudServerOutlined,
  BarChartOutlined,
  FieldTimeOutlined
} from '@ant-design/icons';
import { useUser } from '../../context/UserContext';
import { t } from '../../utils/translationHelper';

const { Text } = Typography;
const { Panel } = Collapse;

/**
 * Component that displays information about system limits
 * for the comment response functionality to users
 */
const SystemLimitsInfo = () => {
  const { user } = useUser();
  
  // Determine max monitors based on membership level
  let maxMonitors = 2; // Default for free users
  let maxPostsPerMonitor = 50; // Default for free users
  let dataRetentionDays = 3; // Default for free users
  let responseLogsRetention = 100; // Default for free users
  
  if (user?.membership?.level) {
    switch (user.membership.level) {
      case 'basic':
        maxMonitors = 3;
        maxPostsPerMonitor = 100;
        dataRetentionDays = 7;
        responseLogsRetention = 500;
        break;
      case 'premium':
        maxMonitors = 5;
        maxPostsPerMonitor = 200;
        dataRetentionDays = 14;
        responseLogsRetention = 1000;
        break;
      case 'enterprise':
        maxMonitors = 10;
        maxPostsPerMonitor = 500;
        dataRetentionDays = 30;
        responseLogsRetention = 5000;
        break;
      default:
        maxMonitors = 2;
        maxPostsPerMonitor = 50;
        dataRetentionDays = 3;
        responseLogsRetention = 100;
    }
  }

  return (
    <Card 
      title={
        <Space>
          <InfoCircleOutlined />
          {t('commentResponses.systemLimits.title', 'حدود النظام')}
        </Space>
      }
      className="mb-4 limit-info-card"
    >
      <Alert
        message={t('commentResponses.systemLimits.description', 'لضمان استقرار النظام وأداء أفضل، تم تطبيق الحدود التالية على نظام الرد التلقائي على التعليقات:')}
        type="info"
        showIcon
        style={{ marginBottom: '16px' }}
      />
      
      <Collapse defaultActiveKey={['0']} bordered={false}>
        <Panel 
          header={t('commentResponses.systemLimits.accountLimitsTitle', 'حدود الحساب')} 
          key="0"
        >
          <List
            size="small"
            bordered={false}
            dataSource={[
              {
                icon: <RobotOutlined />,
                title: t('commentResponses.systemLimits.maxMonitors', 'الحد الأقصى للمراقبات النشطة'),
                value: maxMonitors
              },
              {
                icon: <FileTextOutlined />,
                title: t('commentResponses.systemLimits.maxPosts', 'الحد الأقصى للمنشورات'),
                value: maxPostsPerMonitor
              },
              {
                icon: <DashboardOutlined />,
                title: t('commentResponses.systemLimits.maxResponsesPerHour', 'الحد الأقصى للردود في الساعة'),
                value: '50'
              },
              {
                icon: <DatabaseOutlined />,
                title: t('comment_response.response_retention', 'الاحتفاظ بسجلات الرد'),
                value: responseLogsRetention
              }
            ]}
            renderItem={item => (
              <List.Item>
                <Space>
                  {item.icon}
                  <Text strong>{item.title}:</Text>
                  <Text>{item.value}</Text>
                </Space>
              </List.Item>
            )}
          />
        </Panel>
        
        <Panel 
          header={t('commentResponses.systemLimits.monitorLimitsTitle', 'حدود المراقبة')} 
          key="1"
        >
          <List
            size="small"
            bordered={false}
            dataSource={[
              {
                icon: <HistoryOutlined />,
                title: t('commentResponses.systemLimits.dataRetentionPeriod', 'فترة الاحتفاظ بالبيانات'),
                value: `${dataRetentionDays} ${t('common.days', 'أيام')}`
              },
              {
                icon: <ClockCircleOutlined />,
                title: t('commentResponses.systemLimits.monitorExpiration', 'انتهاء صلاحية المراقبة'),
                value: `30 ${t('common.days', 'يوم')}`
              },
              {
                icon: <CommentOutlined />,
                title: t('commentResponses.systemLimits.maxResponsesPerMonitor', 'الحد الأقصى للردود لكل مراقبة'),
                value: `30 / ${t('common.hour', 'ساعة')}`
              },
              {
                icon: <InboxOutlined />,
                title: t('commentResponses.systemLimits.autoArchiveAfter', 'أرشفة تلقائية بعد'),
                value: `7 ${t('common.days', 'أيام')} ${t('common.ofInactivity', 'من عدم النشاط')}`
              }
            ]}
            renderItem={item => (
              <List.Item>
                <Space>
                  {item.icon}
                  <Text strong>{item.title}:</Text>
                  <Text>{item.value}</Text>
                </Space>
              </List.Item>
            )}
          />
        </Panel>
        
        <Panel 
          header={t('commentResponses.systemLimits.timeoutLimitsTitle', 'حدود المهلة')} 
          key="2"
        >
          <List
            size="small"
            bordered={false}
            dataSource={[
              {
                icon: <ClockCircleOutlined />,
                title: t('commentResponses.systemLimits.minResponseInterval', 'الحد الأدنى للفاصل الزمني بين الردود'),
                value: `10 ${t('common.seconds', 'ثواني')}`
              },
              {
                icon: <SyncOutlined />,
                title: t('commentResponses.systemLimits.minCheckFrequency', 'الحد الأدنى لتكرار الفحص'),
                value: `5 ${t('common.minutes', 'دقائق')}`
              },
              {
                icon: <FieldTimeOutlined />,
                title: t('comment_response.auto_archive', 'أرشفة تلقائية'),
                value: `7 ${t('common.days', 'أيام')} ${t('common.ofInactivity', 'من عدم النشاط')}`
              }
            ]}
            renderItem={item => (
              <List.Item>
                <Space>
                  {item.icon}
                  <Text strong>{item.title}:</Text>
                  <Text>{item.value}</Text>
                </Space>
              </List.Item>
            )}
          />
        </Panel>
        
        <Panel 
          header={t('comment_response.data_management', 'إدارة البيانات')} 
          key="3"
        >
          <List
            size="small"
            bordered={false}
            dataSource={[
              {
                icon: <CloudServerOutlined />,
                title: t('comment_response.detailed_logging', 'تسجيل مفصل'),
                value: t('common.enabled', 'مفعّل')
              },
              {
                icon: <BarChartOutlined />,
                title: t('comment_response.statistics', 'الإحصائيات'),
                value: `${dataRetentionDays * 2} ${t('common.days', 'أيام')}`
              },
              {
                icon: <DatabaseOutlined />,
                title: t('comment_response.auto_archive', 'أرشفة تلقائية للمراقبات'),
                value: t('common.enabled', 'مفعّل')
              }
            ]}
            renderItem={item => (
              <List.Item>
                <Space>
                  {item.icon}
                  <Text strong>{item.title}:</Text>
                  <Text>{item.value}</Text>
                </Space>
              </List.Item>
            )}
          />
        </Panel>
      </Collapse>
      
      <Divider style={{ marginTop: '12px', marginBottom: '12px' }} />
      
      <div className="text-muted small mt-3">
        <Space>
          <WarningOutlined />
          <Text type="secondary">
            {t('commentResponses.systemLimits.notice', 'قد تتغير هذه الحدود بناءً على أداء النظام ومستوى العضوية الخاص بك. يتم فرض هذه القيود لضمان توفر الخدمة لجميع المستخدمين.')}
          </Text>
        </Space>
      </div>
    </Card>
  );
};

export default SystemLimitsInfo;