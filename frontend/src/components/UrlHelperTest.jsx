import React from 'react';
import { Card, Divider, Typography, Space } from 'antd';
import { formatUploadUrl, getAvatarUrl } from '../utils/urlHelper';
import Avatar from './Avatar';

const { Title, Text } = Typography;

/**
 * Test component to demonstrate the URL helper functionality.
 * This component is for development purposes only and should not be used in production.
 */
const UrlHelperTest = () => {
  // Test cases for different URL formats
  const testCases = [
    {
      title: 'Relative upload path',
      path: '/uploads/avatars/user123.jpg',
      expected: `${process.env.REACT_APP_API_URL}/uploads/avatars/user123.jpg`
    },
    {
      title: 'Absolute URL (unchanged)',
      path: 'https://example.com/image.jpg',
      expected: 'https://example.com/image.jpg'
    },
    {
      title: 'Data URL (unchanged)',
      path: 'data:image/png;base64,iVBORw0KGgo...',
      expected: 'data:image/png;base64,iVBORw0KGgo...'
    },
    {
      title: 'Avatar path with /uploads/',
      path: '/uploads/avatars/profile.png',
      expected: `${process.env.REACT_APP_API_URL}/uploads/avatars/profile.png`,
      isAvatar: true
    },
    {
      title: 'Avatar path without /uploads/',
      path: 'profile.png',
      expected: `${process.env.REACT_APP_API_URL}/uploads/avatars/profile.png`,
      isAvatar: true
    }
  ];

  return (
    <Card title="URL Helper Test" style={{ maxWidth: 800, margin: '20px auto' }}>
      <Title level={4}>Environment</Title>
      <Text>REACT_APP_API_URL: {process.env.REACT_APP_API_URL || 'Not set'}</Text>
      
      <Divider />
      
      <Title level={4}>formatUploadUrl Function Tests</Title>
      {testCases.filter(tc => !tc.isAvatar).map((testCase, index) => (
        <div key={index} style={{ marginBottom: 16 }}>
          <Text strong>{testCase.title}</Text>
          <div style={{ marginLeft: 20 }}>
            <Text>Input: {testCase.path}</Text>
            <br />
            <Text>Output: {formatUploadUrl(testCase.path)}</Text>
            <br />
            <Text>Expected: {testCase.expected}</Text>
            <br />
            <Text type={formatUploadUrl(testCase.path) === testCase.expected ? 'success' : 'danger'}>
              {formatUploadUrl(testCase.path) === testCase.expected ? '✓ PASS' : '✗ FAIL'}
            </Text>
          </div>
        </div>
      ))}
      
      <Divider />
      
      <Title level={4}>getAvatarUrl Function Tests</Title>
      {testCases.filter(tc => tc.isAvatar).map((testCase, index) => (
        <div key={index} style={{ marginBottom: 16 }}>
          <Text strong>{testCase.title}</Text>
          <div style={{ marginLeft: 20 }}>
            <Text>Input: {testCase.path}</Text>
            <br />
            <Text>Output: {getAvatarUrl(testCase.path)}</Text>
            <br />
            <Text>Expected: {testCase.expected}</Text>
            <br />
            <Text type={getAvatarUrl(testCase.path) === testCase.expected ? 'success' : 'danger'}>
              {getAvatarUrl(testCase.path) === testCase.expected ? '✓ PASS' : '✗ FAIL'}
            </Text>
          </div>
        </div>
      ))}
      
      <Divider />
      
      <Title level={4}>Avatar Component Tests</Title>
      <Space size="large">
        <div>
          <Text>Relative path:</Text>
          <br />
          <Avatar src="/uploads/avatars/user123.jpg" size={64} />
        </div>
        
        <div>
          <Text>Absolute URL:</Text>
          <br />
          <Avatar src="https://example.com/image.jpg" size={64} />
        </div>
        
        <div>
          <Text>Simple filename:</Text>
          <br />
          <Avatar src="profile.png" size={64} />
        </div>
      </Space>
    </Card>
  );
};

export default UrlHelperTest;