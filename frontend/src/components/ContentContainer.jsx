import React from 'react';
import { Spin } from 'antd';
import '../styles/ContentContainer.css';

/**
 * ContentContainer component wraps page content and handles loading states
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render
 * @param {boolean} props.isLoading - Whether content is loading
 * @param {string} props.direction - Text direction ('rtl' or 'ltr')
 * @param {boolean} props.noPadding - Whether to remove padding
 * @param {boolean} props.transparent - Whether container should be transparent
 * @param {boolean} props.narrow - Whether container should have narrow width
 * @param {boolean} props.footer - Whether to add extra bottom spacing for footer
 * @param {string} props.className - Additional CSS classes
 */
const ContentContainer = ({ 
  children, 
  isLoading = false,
  direction = 'ltr',
  noPadding = false,
  transparent = false,
  narrow = false,
  footer = false,
  className = ''
}) => {
  // Build class name string based on props
  const classNames = [
    'content-container',
    direction === 'rtl' ? 'rtl-container' : '',
    noPadding ? 'no-padding' : '',
    transparent ? 'transparent' : '',
    narrow ? 'narrow' : '',
    footer ? 'with-footer' : '',
    className
  ].filter(Boolean).join(' ');

  // If loading, show spinner with proper RTL direction
  if (isLoading) {
    return (
      <div className={`${classNames} loading-container`} dir={direction}>
        <Spin size="large" />
      </div>
    );
  }

  // Render content
  return (
    <div className={classNames} dir={direction}>
      {children}
    </div>
  );
};

export default ContentContainer;