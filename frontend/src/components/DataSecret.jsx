import React, { useState, useEffect } from 'react';
import { Button, Table, Modal, message, Spin, Progress, Skeleton, Checkbox } from 'antd';
import { 
  DownloadOutlined, 
  LoadingOutlined, 
  PhoneOutlined,
  SettingOutlined,
  FileExcelOutlined,
  FilterOutlined
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { pointsSystem, POINTS_COSTS } from '../utils/pointsSystem'; // Import points system
import '../styles/DataSecret.css'; // Import dedicated CSS file

const BATCH_SIZE = 250;
// Use environment variable with production support
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ShimmerRow = ({ columns }) => {
  return (
    <tr className="shimmer-row">
      <td style={{ padding: '8px 16px' }}>
        <Skeleton.Button active={true} size="small" style={{ width: 20 }} />
      </td>
      {columns.map((col, index) => (
        <td key={index} style={{ padding: '8px 16px' }}>
          <Skeleton.Input active={true} size="small" style={{ width: col.width || 100 }} />
        </td>
      ))}
    </tr>
  );
};

const ShimmerTable = ({ columns, rowCount = 5 }) => {
  return (
    <div className="shimmer-table">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ padding: '8px 16px', width: 20 }}></th>
            {columns.map((col, index) => (
              <th key={index} style={{ padding: '8px 16px', width: col.width }}>
                <Skeleton.Input active={true} size="small" style={{ width: col.width || 100 }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array(rowCount).fill(0).map((_, index) => (
            <ShimmerRow key={index} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Enhanced progress bar with more modern styling
const EnhancedProgressBar = ({ percent, status, showInfo = true }) => {
  const progressColorMap = {
    0: '#108ee9',
    30: '#2db7f5',
    60: '#87d068',
    100: '#52c41a'
  };

  const getColor = (value) => {
    const thresholds = Object.keys(progressColorMap).map(Number).sort((a, b) => a - b);
    let color = progressColorMap[0];
    
    for (const threshold of thresholds) {
      if (value >= threshold) {
        color = progressColorMap[threshold];
      }
    }
    
    return color;
  };

  return (
    <div className="enhanced-progress-container" style={{ marginBottom: 20 }}>
      <Progress 
        percent={percent} 
        status={status}
        strokeColor={getColor(percent)}
        format={percent => {
          if (showInfo) {
            return (
              <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
                {percent}%
              </span>
            );
          }
          return null;
        }}
        style={{ 
          height: '20px', 
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          borderRadius: '10px'
        }}
      />
      <div className="progress-step-indicators" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginTop: '8px',
        fontSize: '12px',
        color: '#8c8c8c'
      }}>
        <div className="step-indicator" style={{ 
          color: percent > 0 ? '#108ee9' : '#8c8c8c',
          fontWeight: percent > 0 ? 'bold' : 'normal'
        }}>جاري البدء</div>
        <div className="step-indicator" style={{ 
          color: percent > 30 ? '#2db7f5' : '#8c8c8c',
          fontWeight: percent > 30 ? 'bold' : 'normal'
        }}>جاري الإستخراج</div>
        <div className="step-indicator" style={{ 
          color: percent > 60 ? '#87d068' : '#8c8c8c',
          fontWeight: percent > 60 ? 'bold' : 'normal'
        }}>اكتمال الإستخراج</div>
      </div>
    </div>
  );
};

const DataSecret = ({ selectedUserIds, open, onCancel }) => {
  const [extractedData, setExtractedData] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isCancelled, setIsCancelled] = useState(false);
  const [progressStatus, setProgressStatus] = useState('active');
  const [progressText, setProgressText] = useState('');
  const [extractedDataPage, setExtractedDataPage] = useState(1);
  const [extractedDataPageSize, setExtractedDataPageSize] = useState(10);
  const [tempExtractedData, setTempExtractedData] = useState([]); // Temporary storage before points deduction
  const [pointsRequired, setPointsRequired] = useState(0);
  const [currentUserPoints, setCurrentUserPoints] = useState(0);
  // Add missing state variables
  const [exportModalopen, setExportModalopen] = useState(false);
  const [selectedExportColumns, setSelectedExportColumns] = useState([
    'id_User', 'FullName_User', 'Phone_User', 'Email_User', 'Country_User'
  ]);

  useEffect(() => {
    if (open && selectedUserIds.length > 0) {
      startExtraction();
    } else {
      resetState();
    }
  }, [open, selectedUserIds]);

  useEffect(() => {
    if (isCancelled && isExtracting) {
      setProgressStatus('exception');
      setProgressText('تم إلغاء العملية');
    }
  }, [isCancelled, isExtracting]);

  const resetState = () => {
    setExtractedData([]);
    setTempExtractedData([]);
    setIsExtracting(false);
    setProgress(0);
    setIsCancelled(false);
    setProgressStatus('active');
    setProgressText('');
    setExtractedDataPage(1);
    setPointsRequired(0);
    setCurrentUserPoints(0);
  };

  const startExtraction = async () => {
    if (selectedUserIds.length === 0) {
      message.warning('الرجاء تحديد مستخدم واحد على الأقل');
      return;
    }

    setIsExtracting(true);
    setProgress(0);
    setIsCancelled(false);
    setProgressStatus('active');
    setProgressText('');
    setExtractedData([]);
    setTempExtractedData([]);
    setExtractedDataPage(1);

    const totalUsers = selectedUserIds.length;
    const requiredPoints = totalUsers * POINTS_COSTS.DATA_EXTRACTION;
    setPointsRequired(requiredPoints);
    
    let processedCount = 0;

    try {
      // Check if user has enough points
      const { hasEnough, currentPoints } = await pointsSystem.checkPoints(requiredPoints);
      setCurrentUserPoints(currentPoints);
      
      if (!hasEnough) {
        message.error(`رصيد النقاط غير كافٍ. لديك ${currentPoints} نقطة فقط ويلزمك ${requiredPoints} نقطة.`);
        setIsExtracting(false);
        setProgressStatus('exception');
        setProgressText(`رصيد النقاط غير كافٍ. لديك ${currentPoints} نقطة فقط ويلزمك ${requiredPoints} نقطة.`);
        return;
      }

      const batches = [];
      for (let i = 0; i < selectedUserIds.length; i += BATCH_SIZE) {
        batches.push(selectedUserIds.slice(i, i + BATCH_SIZE));
      }

      const processedUsers = new Map();
      const phoneNumberSet = new Set();
      const tempData = [];

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        if (isCancelled) {
          break;
        }

        const batch = batches[batchIndex];

        // Get current user from localStorage
        const userInfoStr = localStorage.getItem('userInfo');
        const currentUser = userInfoStr ? JSON.parse(userInfoStr) : null;
        
        if (!currentUser || !currentUser.token) {
          throw new Error('يرجى تسجيل الدخول أولاً');
        }

        const response = await axios.post(`${API_BASE_URL}/extract-user-data`, {
          userIds: batch
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`
          },
          timeout: 30000000
        });

        if (response.data.success) {
          const uniqueUsers = [];
          
          for (const user of response.data.users) {
            if (user.Phone_User && user.Phone_User.trim() !== '') {
              const phoneNumber = user.Phone_User.trim();
              
              if (!phoneNumberSet.has(phoneNumber)) {
                phoneNumberSet.add(phoneNumber);
                uniqueUsers.push(user);
                processedUsers.set(user.id_User, true);
              }
            } else if (!processedUsers.has(user.id_User)) {
              uniqueUsers.push(user);
              processedUsers.set(user.id_User, true);
            }
          }
          
          tempData.push(...uniqueUsers);
          setTempExtractedData(tempData);
          
          processedCount += batch.length;
          const newProgress = Math.floor((processedCount / totalUsers) * 100);
          setProgress(newProgress);
        } else {
          throw new Error(response.data.message);
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (!isCancelled) {
        // Only display data after successful points deduction
        const actualExtractedCount = tempData.length;
        const pointsToDeduct = actualExtractedCount * POINTS_COSTS.DATA_EXTRACTION;
        
        // Final check to ensure we only deduct for what we actually extracted
        const finalCheckResult = await pointsSystem.checkPoints(pointsToDeduct);
        
        if (!finalCheckResult.hasEnough) {
          throw new Error(`رصيد النقاط غير كافٍ. لديك ${finalCheckResult.currentPoints} نقطة فقط ويلزمك ${pointsToDeduct} نقطة.`);
        }
        
        // Deduct points after successful extraction
        const deductionSuccess = await pointsSystem.deductPoints(
          pointsToDeduct, 
          `استخراج بيانات ${actualExtractedCount} مستخدم`
        );
        
        if (deductionSuccess) {
          setExtractedData(tempData);
          message.success(`تم استخراج ${actualExtractedCount} سجل وخصم ${pointsToDeduct} نقطة بنجاح`);
          setProgress(100);
          setProgressStatus('success');
          setProgressText(`تم استخراج ${actualExtractedCount} سجل وخصم ${pointsToDeduct} نقطة بنجاح`);
        } else {
          throw new Error('فشل في خصم النقاط');
        }
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      message.error(`حدث خطأ أثناء استخراج البيانات: ${errorMessage}`);
      setProgressStatus('exception');
      setProgressText(`حدث خطأ: ${errorMessage}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleExportToExcel = () => {
    if (extractedData.length === 0) {
      message.warning('لا توجد بيانات للتصدير');
      return;
    }

    try {
      // Filter data based on selected columns
      const filteredData = extractedData.map(item => {
        const filteredItem = {};
        selectedExportColumns.forEach(col => {
          filteredItem[col] = item[col];
        });
        return filteredItem;
      });
      
      const ws = XLSX.utils.json_to_sheet(filteredData);
      
      // Create column headers in Arabic
      const headers = {};
      selectedExportColumns.forEach((col, index) => {
        const colLetter = XLSX.utils.encode_col(index);
        const headerText = extractedColumns.find(c => c.dataIndex === col)?.title || col;
        headers[`${colLetter}1`] = { v: headerText, t: 's' };
      });
      
      // Apply headers
      Object.keys(headers).forEach(key => {
        ws[key] = headers[key];
      });
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "UserData");
      XLSX.writeFile(wb, `extracted_users_data_${new Date().toISOString().split('T')[0]}.xlsx`);
      message.success('تم تصدير البيانات بنجاح');
      setExportModalopen(false);
    } catch (error) {
      message.error(`حدث خطأ أثناء تصدير البيانات: ${error.message}`);
    }
  };

  const handleExportModalOpen = () => {
    if (extractedData.length === 0) {
      message.warning('لا توجد بيانات للتصدير');
      return;
    }
    setExportModalopen(true);
  };

  const handleExportColumnChange = (checkedValues) => {
    setSelectedExportColumns(checkedValues);
  };

  const handleExtractedTableChange = (pagination, filters, sorter) => {
    setExtractedDataPage(pagination.current);
    setExtractedDataPageSize(pagination.pageSize);
  };

  const customStyles = {
    modalActions: {
      display: 'flex',
      justifyContent: 'space-between',
    },
    pagination: {
      marginTop: '16px',
      textAlign: 'right',
      direction: 'ltr'
    },
    tableContainer: {
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
    },
    exportButton: {
      borderRadius: '6px',
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
      boxShadow: '0 2px 8px rgba(24, 144, 255, 0.2)',
      transition: 'all 0.3s'
    }
  };

  const paginationConfig = {
    showSizeChanger: true,
    showQuickJumper: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    showTotal: (total, range) => `${range[0]}-${range[1]} من ${total} عنصر`,
    className: 'table-pagination',
    style: customStyles.pagination
  };

  const extractedColumns = [
    {
      title: '#',
      key: 'index',
      width: 60,
      fixed: 'left',
      align: 'center',
      render: (text, record, index) => (extractedDataPage - 1) * extractedDataPageSize + index + 1,
    },
    {
      title: 'معرف المستخدم',
      dataIndex: 'id_User',
      key: 'id_User',
      width: 120,
    },
    {
      title: 'الاسم الكامل',
      dataIndex: 'FullName_User',
      key: 'FullName_User',
      width: 200,
    },
    {
      title: 'رقم الهاتف',
      dataIndex: 'Phone_User',
      key: 'Phone_User',
      width: 150,
      render: (text) => {
        return text ? (
          <span style={{ display: 'flex', alignItems: 'center', color: '#1890ff', fontWeight: 'bold' }}>
            <PhoneOutlined style={{ marginLeft: 5 }} />
            {text}
          </span>
        ) : 'غير متوفر';
      }
    },
    {
      title: 'الديانة',
      dataIndex: 'Religion',
      key: 'Religion',
      width: 100,
    },
    {
      title: 'تاريخ الميلاد',
      dataIndex: 'birthday',
      key: 'birthday',
      width: 120,
    },
    {
      title: 'نوع الحساب',
      dataIndex: 'Type_User',
      key: 'Type_User',
      width: 120,
    },
    {
      title: 'الرابط',
      dataIndex: 'Link_User',
      key: 'Link_User',
      width: 200,
      render: (text) => text ? <a href={text} target="_blank" rel="noopener noreferrer">{text}</a> : 'غير متوفر'
    },
    {
      title: 'اسم المستخدم',
      dataIndex: 'Username_User',
      key: 'Username_User',
      width: 150,
    },
    {
      title: 'البريد الإلكتروني',
      dataIndex: 'Email_User',
      key: 'Email_User',
      width: 200,
    },
    {
      title: 'البلد',
      dataIndex: 'Country_User',
      key: 'Country_User',
      width: 150,
    },
    {
      title: 'المدينة',
      dataIndex: 'City_User',
      key: 'City_User',
      width: 150,
    },
    {
      title: 'الحالة الاجتماعية',
      dataIndex: 'Relationship',
      key: 'Relationship',
      width: 150,
    }
  ];

  const handleCancelModal = () => {
    if (isExtracting) {
      setIsCancelled(true);
    } else {
      onCancel();
    }
  };

  return (
    <>
      <Modal
        className="data-secret-modal"
        title={
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            padding: '8px 0'
          }}>
            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>البيانات المستخرجة</span>
            {isExtracting && <Spin size="small" />}
            {pointsRequired > 0 && (
              <span style={{ 
                marginRight: '10px', 
                fontSize: '13px', 
                color: currentUserPoints >= pointsRequired ? '#52c41a' : '#ff4d4f',
                padding: '2px 8px',
                background: currentUserPoints >= pointsRequired ? 'rgba(82, 196, 26, 0.1)' : 'rgba(255, 77, 79, 0.1)',
                borderRadius: '4px'
              }}>
                (النقاط المطلوبة: {pointsRequired} | رصيدك الحالي: {currentUserPoints})
              </span>
            )}
          </div>
        }
        open={open}
        width={1200}
        onCancel={handleCancelModal}
        getContainer={() => document.body} // Ensure it's rendered directly in body
        centered // Use Ant Design's built-in centering
        destroyOnClose={true} // Improve performance by destroying DOM when closed
        maskClosable={false} // Prevent accidental closes
        style={{ top: 0 }} // Remove custom positioning that might interfere
        styles={{
          mask: { 
            zIndex: 1050,
            backgroundColor: 'rgba(0, 0, 0, 0.45)'
          },
          wrapper: { 
            zIndex: 1050 
          },
          header: { 
            borderBottom: '1px solid #f0f0f0',
            padding: '16px 24px'
          },
          body: { 
            padding: '24px',
            maxHeight: '70vh',
            overflow: 'auto',
            position: 'relative' // Add position relative to help with sizing
          },
          footer: { 
            borderTop: '1px solid #f0f0f0',
            padding: '12px 24px'
          },
          content: {
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
          }
        }}
        footer={[
          <Button 
            key="cancel" 
            onClick={handleCancelModal}
            danger={isExtracting}
            className="data-secret-button"
            style={{ borderRadius: '6px' }}
          >
            {isExtracting ? 'إلغاء العملية' : 'إغلاق'}
          </Button>,
          <Button
            key="export-settings"
            icon={<SettingOutlined />}
            onClick={handleExportModalOpen}
            disabled={extractedData.length === 0 || isExtracting}
            className="data-secret-button"
            style={{ borderRadius: '6px' }}
          >
            إعدادات التصدير
          </Button>,

        ]}
      >
        {isExtracting && (
          <>
            <EnhancedProgressBar percent={progress} status={progressStatus} />
            {progressText && (
              <div style={{ 
                marginBottom: '16px', 
                textAlign: 'center', 
                color: progressStatus === 'exception' ? '#ff4d4f' : '#52c41a',
                padding: '8px',
                background: progressStatus === 'exception' ? 'rgba(255, 77, 79, 0.1)' : 'rgba(82, 196, 26, 0.1)',
                borderRadius: '6px',
                fontWeight: 'bold'
              }}>
                {progressText}
              </div>
            )}
          </>
        )}
        
        {isExtracting && extractedData.length === 0 ? (
          <ShimmerTable columns={extractedColumns} rowCount={5} />
        ) : (
          <div className="data-secret-table-container" style={{
            ...customStyles.tableContainer,
            height: 'auto',
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            minWidth: 'auto' // Remove fixed min-width to allow for better adaptation
          }}>
            {extractedData.length > 0 && (
              <div style={{ 
                padding: '12px 16px', 
                borderBottom: '1px solid #f0f0f0', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                background: '#fafafa',
                borderRadius: '8px 8px 0 0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FilterOutlined style={{ color: '#1890ff' }} />
                  <span style={{ fontWeight: 'bold' }}>
                    {extractedData.length} سجل تم استخراجه
                  </span>
                </div>
              </div>
            )}
            <Table
              columns={extractedColumns}
              dataSource={extractedData.map((item, index) => ({...item, tableIndex: index}))}
              rowKey="tableIndex"
              loading={isExtracting && extractedData.length === 0}
              onChange={handleExtractedTableChange}
              pagination={{ 
                current: extractedDataPage,
                pageSize: extractedDataPageSize,
                ...paginationConfig,
                showTotal: (total) => `${extractedDataPage > 0 ? ((extractedDataPage - 1) * extractedDataPageSize) + 1 : 0}-${Math.min(extractedDataPage * extractedDataPageSize, total)} من ${total} عنصر`
              }}
              scroll={{ x: 1500 }} // Set horizontal scroll within table context but let modal handle scrollbar
              rowClassName={() => 'data-row'}
              size="middle"
              style={{ 
                width: '100%',
                borderRadius: '0 0 8px 8px',
                overflow: 'hidden'
              }}
              // Add these additional props for better styling
              bordered={false}
              tableLayout="fixed"
            />
          </div>
        )}
      </Modal>

      {/* Export Settings Modal */}
      <Modal
        className="data-secret-modal"
        title={
          <div style={{ 'display': 'flex', 'alignItems': 'center', 'gap': '8px' }}>
            <FileExcelOutlined style={{ color: '#52c41a' }} />
            <span>إعدادات تصدير البيانات</span>
          </div>
        }
        open={exportModalopen}
        onCancel={() => setExportModalopen(false)}
        getContainer={() => document.body} // Ensure it's rendered directly in body
        centered // Use Ant Design's built-in centering
        maskClosable={false} // Prevent accidental closes
        destroyOnClose={true} // Improve performance
        style={{ top: 0 }} // Remove custom positioning that might interfere
        footer={[
          <Button key="cancel" onClick={() => setExportModalopen(false)} style={{ borderRadius: '6px' }}>
            إلغاء
          </Button>,
          <Button 
            key="export" 
            type="primary" 
            icon={<DownloadOutlined />} 
            onClick={handleExportToExcel}
            disabled={selectedExportColumns.length === 0}
            className="export-button"
            style={customStyles.exportButton}
          >
           تحميل Excel
          </Button>
        ]}
        width={500}
        styles={{
          mask: { 
            zIndex: 1050,
            backgroundColor: 'rgba(0, 0, 0, 0.45)'
          },
          wrapper: { 
            zIndex: 1050 
          },
          header: { borderBottom: '1px solid #f0f0f0', padding: '16px 24px' },
          body: { 
            padding: '24px',
            overflow: 'auto' // Ensure consistent scrolling behavior
          },
          footer: { borderTop: '1px solid #f0f0f0' },
          content: { borderRadius: '12px', overflow: 'hidden' }
        }}
      >
        <div className="export-options" style={{ direction: 'rtl' }}>
          <div style={{ marginBottom: '16px', fontWeight: 'bold' }}>حدد الأعمدة التي تريد تصديرها:</div>
          <div style={{ 
            maxHeight: '300px', 
            overflowY: 'auto', 
            padding: '12px',
            border: '1px solid #f0f0f0',
            borderRadius: '8px',
            background: '#fafafa'
          }}>
            <Checkbox.Group 
              options={extractedColumns
                .filter(col => col.dataIndex && col.key !== 'index')
                .map(col => ({ label: col.title, value: col.dataIndex }))} 
              value={selectedExportColumns}
              onChange={handleExportColumnChange}
              style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
            />
          </div>
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <Button 
                size="small" 
                onClick={() => setSelectedExportColumns(
                  extractedColumns
                    .filter(col => col.dataIndex && col.key !== 'index')
                    .map(col => col.dataIndex)
                )}
                style={{ borderRadius: '4px' }}
              >
                تحديد الكل
              </Button>
              <Button 
                size="small" 
                onClick={() => setSelectedExportColumns([])}
                style={{ borderRadius: '4px' }}
              >
                إلغاء التحديد
              </Button>
            </div>
            <div style={{ 
              padding: '12px', 
              background: 'rgba(24, 144, 255, 0.1)', 
              borderRadius: '6px',
              fontSize: '13px'
            }}>
              <div>سيتم تصدير {selectedExportColumns.length} عمود من أصل {
                extractedColumns.filter(col => col.dataIndex && col.key !== 'index').length
              }</div>
              <div>عدد السجلات: {extractedData.length}</div>
            </div>
          </div>
        </div>
      </Modal>


    </>
  );
};

export default DataSecret;