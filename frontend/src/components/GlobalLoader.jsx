import React from 'react';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

/**
 * GlobalLoader Component - Provides consistent loading indicators across the application
 * 
 * This component offers a standardized way to display loading states throughout the application
 * with support for different sizes, customizable text, and proper RTL support.
 * 
 * @param {Object} props
 * @param {string} props.size - Size of the spinner: 'small', 'default', or 'large'
 * @param {string} props.tip - Text to display below the spinner
 * @param {string} props.type - Type of loader: 'fullscreen', 'container', 'inline', or 'overlay'
 * @param {Object} props.style - Additional inline styles
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.spinning - Whether the spinner is visible
 */
const GlobalLoader = ({
  size = 'default',
  tip,
  type = 'container',
  style = {},
  className = '',
  spinning = true
}) => {
  // Custom spinner icon with improved visibility
  const antIcon = <LoadingOutlined style={{ fontSize: size === 'small' ? 24 : size === 'large' ? 40 : 32 }} spin />;

  // Determine container class based on type
  const containerClass = {
    fullscreen: 'global-loader-fullscreen',
    container: 'global-loader-container',
    inline: 'global-loader-inline',
    overlay: 'global-loader-overlay'
  }[type] || 'global-loader-container';

  return (
    <div className={`global-loader ${containerClass} ${className}`} style={style}>
      <Spin
        indicator={antIcon}
        size={size}
        tip={tip}
        spinning={spinning}
      />
    </div>
  );
};

export default GlobalLoader;