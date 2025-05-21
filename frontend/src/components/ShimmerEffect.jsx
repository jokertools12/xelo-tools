import React from 'react';
import { Skeleton, Table } from 'antd';
import '../styles/ShimmerEffect.css';

/**
 * ShimmerEffect Component - Provides loading state visuals for tables and text areas
 * 
 * Enhanced to be adaptive to different table structures across the application
 * 
 * @param {Object} props
 * @param {string} props.type - Type of shimmer effect: 'table' or 'text'
 * @param {number} props.rows - Number of rows/items to display (default: 5)
 * @param {number} props.columnCount - Number of columns to display (default: 4)
 * @param {Array} props.columns - Array of column configs for table type (with width property)
 * @param {Object} props.style - Additional inline styles
 * @param {string} props.className - Additional CSS classes
 */
const ShimmerEffect = ({ 
  type = 'table', 
  rows = 5, 
  columnCount = 4,  // Default to 4 columns if not specified
  columns = [], 
  style = {}, 
  className = '' 
}) => {
  // Generate default columns based on columnCount or provided columns
  const getDefaultColumns = () => {
    // If actual columns provided, use those
    if (columns.length > 0) {
      return columns;
    }
    
    // Otherwise create default columns based on columnCount
    const defaultColumns = [];
    
    // First column (usually narrow - for index/checkbox)
    defaultColumns.push({ width: 60, title: '' });
    
    // Calculate remaining width distribution
    const remainingColumns = columnCount - 1;
    if (remainingColumns <= 0) return defaultColumns;
    
    // Add ID/primary column (usually important)
    defaultColumns.push({ width: 150, title: 'معرف' });
    if (remainingColumns <= 1) return defaultColumns;
    
    // Add title/name column (usually widest)
    defaultColumns.push({ width: 250, title: 'اسم' });
    if (remainingColumns <= 2) return defaultColumns;
    
    // Add date/type column
    defaultColumns.push({ width: 150, title: 'معلومات' });
    if (remainingColumns <= 3) return defaultColumns;
    
    // For additional columns, distribute evenly
    for (let i = 4; i <= columnCount; i++) {
      defaultColumns.push({ 
        width: 120, 
        title: i === columnCount ? 'إجراءات' : `عمود ${i}` 
      });
    }
    
    return defaultColumns;
  };

  // Table Shimmer using Ant Design components
  if (type === 'table') {
    const shimmerColumns = getDefaultColumns().map((col, index) => ({
      key: `col-${index}`,
      dataIndex: `col-${index}`,
      title: col.title || '',
      width: col.width || 150,
      // Adjust width for different column positions
      render: () => {
        let width = '90%';
        
        // Adjust skeleton size based on column position
        if (index === 0) width = '60%';
        else if (index === getDefaultColumns().length - 1) width = '95%';
        else if (index === 2 && getDefaultColumns().length > 3) width = '95%';
        
        return (
          <Skeleton.Input 
            active 
            size="small" 
            style={{ 
              width: width, 
              height: index === 0 ? 24 : 32 
            }} 
          />
        );
      }
    }));

    // Generate data for shimmer table
    const shimmerData = Array(rows).fill(0).map((_, rowIndex) => {
      const rowData = { key: `row-${rowIndex}` };
      shimmerColumns.forEach((col, colIndex) => {
        rowData[`col-${colIndex}`] = `shimmer-${rowIndex}-${colIndex}`;
      });
      return rowData;
    });

    return (
      <div className={`shimmer-table ${className}`} style={style}>
        <Table
          dataSource={shimmerData}
          columns={shimmerColumns}
          pagination={false}
          rowClassName="shimmer-row"
          className="shimmer-ant-table"
          size="middle"
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: ' ' }}
        />
      </div>
    );
  }

  // Text Shimmer
  if (type === 'text') {
    return (
      <div className={`shimmer-text ${className}`} style={style}>
        <Skeleton active paragraph={{ rows: rows }} title={{ width: '40%' }} />
      </div>
    );
  }

  // Default fallback
  return (
    <div className={`shimmer-effect ${className}`} style={style}>
      <Skeleton active paragraph={{ rows: 4 }} />
    </div>
  );
};

export default ShimmerEffect;