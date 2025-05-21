import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Result, Button, Spin } from 'antd';
import { LockOutlined, CrownOutlined } from '@ant-design/icons';
import { RESTRICTED_FEATURES, checkFeatureAccess } from '../utils/membershipUtils';

/**
 * Wrapper component that restricts access to features based on membership status
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - The component to render if access is granted
 * @param {string} props.featureKey - The feature key to check against (from RESTRICTED_FEATURES)
 * @returns {React.ReactNode} - The component or restriction message
 */
const RestrictedFeatureWrapper = ({ children, featureKey }) => {
  const [hasAccess, setHasAccess] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if user has access to this feature
  useEffect(() => {
    const checkAccess = async () => {
      try {
        setIsLoading(true);
        const accessGranted = await checkFeatureAccess(featureKey);
        setHasAccess(accessGranted);
      } catch (error) {
        console.error('Error checking feature access:', error);
        setHasAccess(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [featureKey]);

  // Show loading state while checking access
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" tip="جاري التحقق من صلاحية الوصول..." />
      </div>
    );
  }

  // If no access, show restricted access message
  if (!hasAccess) {
    return (
      <Result
        status="403"
        title="هذه الميزة متاحة فقط للمشتركين"
        icon={<LockOutlined />}
        subTitle="يرجى الاشتراك في إحدى خطط العضوية للوصول إلى هذه الميزة"
        extra={[
          <Button 
            type="primary" 
            key="membership"
            icon={<CrownOutlined />}
            onClick={() => {
              // Use sessionStorage for passing simple state instead of react-router state
              try {
                // Store navigation state in sessionStorage
                sessionStorage.setItem('membershipRedirect', JSON.stringify({
                  from: location.pathname,
                  requiredFeature: featureKey
                }));
                
                // Navigate without complex state
                navigate('/membership');
              } catch (error) {
                console.error('Error setting redirect data:', error);
                // Fall back to direct navigation
                navigate('/membership');
              }
            }}
          >
            عرض خطط العضوية
          </Button>,
          <Button 
            key="dashboard"
            onClick={() => navigate('/dashboard')}
          >
            العودة للرئيسية
          </Button>
        ]}
      />
    );
  }

  // If has access, render the children
  return children;
};

export default RestrictedFeatureWrapper;