import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Input, Button, Divider, Form, InputNumber, Alert, notification, ConfigProvider } from 'antd';
import { CrownOutlined, PlusOutlined, SaveOutlined, TrophyOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import '../styles/MembershipPointsIntegration.css';

/**
 * Component that demonstrates the integration between membership plans and points
 * Used by admins to configure points rewards for membership plans
 */
const MembershipPointsIntegration = ({ plan, onSave, isEditing }) => {
  const { t, language, direction } = useLanguage();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Initialize form with plan data or defaults
  useEffect(() => {
    if (plan) {
      form.setFieldsValue({
        points: plan.points || 0
      });
    }
  }, [plan, form]);

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      
      // If we're editing an existing plan
      if (plan && plan._id) {
        // Update the points for this plan
        const updatedPlan = {
          ...plan,
          points: values.points
        };
        
        if (onSave) {
          await onSave(updatedPlan);
        } else {
          // If no onSave provided, make API call directly
          await axios.put(`/api/membership-plans/${plan._id}`, updatedPlan);
          notification.success({
            message: t('success'),
            description: t('points_updated', { plan: plan.name })
          });
        }
      }
    } catch (error) {
      notification.error({
        message: t('error'),
        description: error.response?.data?.message || t('points_update_failed')
      });
    } finally {
      setLoading(false);
    }
  };

  // Icon position based on direction
  const iconMargin = direction === 'rtl' ? { marginLeft: '8px', marginRight: 0 } : { marginRight: '8px', marginLeft: 0 };

  return (
    <ConfigProvider direction={direction}>
      <Card 
        title={
          <div className={`card-title-container ${direction === 'rtl' ? 'rtl-card-title' : ''}`}>
            <TrophyOutlined style={{ ...iconMargin, color: '#faad14', fontSize: '18px' }} />
            <span>{t('plan_points_configuration')}</span>
          </div>
        }
        bordered={true}
        className={`points-integration-card ${direction === 'rtl' ? 'rtl-card' : ''}`}
        dir={direction}
      >
        <Alert
          message={t('membership_points_info')}
          description={
            <div className={direction === 'rtl' ? 'rtl-alert-content' : ''}>
              <p>{t('points_reward_explanation')}</p>
              <ul className={direction === 'rtl' ? 'rtl-list' : ''}>
                <li>{t('automatic_points_award')}</li>
                <li>{t('points_visible_transaction')}</li>
                <li>{t('points_user_profile')}</li>
              </ul>
            </div>
          }
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          style={{ marginBottom: '20px' }}
          className={direction === 'rtl' ? 'rtl-alert' : ''}
        />
        
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ points: plan?.points || 0 }}
          requiredMark="optional"
          className={direction === 'rtl' ? 'rtl-form' : ''}
        >
          <Row gutter={16} align="middle" className={direction === 'rtl' ? 'rtl-row' : ''}>
            <Col span={16}>
              <Form.Item
                name="points"
                label={t('plan_reward_points')}
                rules={[
                  { required: true, message: t('points_required') },
                  { type: 'number', min: 0, message: t('points_min_zero') }
                ]}
                help={t('points_help')}
                className={direction === 'rtl' ? 'rtl-form-item' : ''}
              >
                <InputNumber 
                  min={0} 
                  step={100}
                  style={{ width: '100%' }}
                  addonBefore={<TrophyOutlined />}
                  disabled={!isEditing}
                  placeholder={t('enter_points_amount')}
                  className={direction === 'rtl' ? 'rtl-input-number' : ''}
                />
              </Form.Item>
            </Col>
            
            <Col span={8} style={{ textAlign: direction === 'rtl' ? 'left' : 'right' }}>
              {isEditing && (
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={loading}
                  className={direction === 'rtl' ? 'rtl-button' : ''}
                >
                  {t('save_points')}
                </Button>
              )}
            </Col>
          </Row>
        </Form>
        
        <Divider className={direction === 'rtl' ? 'rtl-divider' : ''} />
        
        <div className={`points-preview ${direction === 'rtl' ? 'rtl-points-preview' : ''}`}>
          <h4 className={direction === 'rtl' ? 'rtl-heading' : ''}>{t('points_preview')}</h4>
          <div className={`preview-container ${direction === 'rtl' ? 'rtl-preview-container' : ''}`}>
            <div className={`plan-card-preview ${direction === 'rtl' ? 'rtl-plan-card' : ''}`}>
              <div className="plan-name">
                <CrownOutlined style={iconMargin} /> {plan?.name || t('sample_plan')}
              </div>
              <div className="plan-price">
                ${plan?.price || 99} / {plan?.duration ? `${plan?.duration} ${t('days')}` : t('month')}
              </div>
              <div className="plan-points">
                <TrophyOutlined style={{ ...iconMargin, color: '#faad14' }} /> 
                {form.getFieldValue('points') || 0} {t('points')}
              </div>
              <Button 
                type="primary" 
                size="small" 
                className={`subscribe-preview ${direction === 'rtl' ? 'rtl-button' : ''}`}
              >
                {t('subscribe')}
              </Button>
            </div>
            
            <div className={`transaction-preview ${direction === 'rtl' ? 'rtl-transaction-preview' : ''}`}>
              <div className="transaction-title">{t('transaction_preview')}</div>
              <div className={`transaction-item ${direction === 'rtl' ? 'rtl-transaction-item' : ''}`}>
                <div className="transaction-date">2023-01-01</div>
                <div className="transaction-type">{t('wallet_payment')}</div>
                <div className={`transaction-amount transaction-negative ${direction === 'rtl' ? 'rtl-transaction-amount' : ''}`}>
                  {direction === 'rtl' ? `${plan?.price || 99}$ -` : `- $${plan?.price || 99}`}
                </div>
              </div>
              <div className={`transaction-item ${direction === 'rtl' ? 'rtl-transaction-item' : ''}`}>
                <div className="transaction-date">2023-01-01</div>
                <div className="transaction-type">{t('points_award')}</div>
                <div className={`transaction-amount transaction-positive ${direction === 'rtl' ? 'rtl-transaction-amount' : ''}`}>
                  {direction === 'rtl' 
                    ? `${t('points')} ${form.getFieldValue('points') || 0} +` 
                    : `+ ${form.getFieldValue('points') || 0} ${t('points')}`}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className={`integration-notes ${direction === 'rtl' ? 'rtl-integration-notes' : ''}`}>
          <h4 className={direction === 'rtl' ? 'rtl-heading' : ''}>{t('implementation_notes')}</h4>
          <ol className={direction === 'rtl' ? 'rtl-ordered-list' : ''}>
            <li>{t('points_integration_note_1')}</li>
            <li>{t('points_integration_note_2')}</li>
            <li>{t('points_integration_note_3')}</li>
            <li>{t('points_integration_note_4')}</li>
          </ol>
        </div>
      </Card>
    </ConfigProvider>
  );
};

export default MembershipPointsIntegration;