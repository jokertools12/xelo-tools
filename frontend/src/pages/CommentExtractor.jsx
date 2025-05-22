import React, { useState, useEffect } from 'react';
import { Layout, Input, Button, Table, Alert, Progress, Space, Card, Tooltip, Dropdown, Menu, Modal, Tabs } from 'antd';
import ContentContainer from '../components/ContentContainer';
import ShimmerEffect from '../components/ShimmerEffect';
import SEO from '../components/SEO';
import {
  LoadingOutlined, DownloadOutlined, FileExcelOutlined, FilePdfOutlined, SearchOutlined,
  SaveOutlined, ReloadOutlined, InfoCircleOutlined,
  CommentOutlined, UserOutlined, BarChartOutlined, LinkOutlined, CheckCircleOutlined,
  CloseOutlined, FolderOpenOutlined, MessageOutlined
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import moment from 'moment';
import axios from 'axios';
import DataSecret from '../components/DataSecret';
import { useUser } from '../context/UserContext';
import { useMessage } from '../context/MessageContext';
import { useLanguage } from '../context/LanguageContext';
import { withMembershipRestriction, RESTRICTED_FEATURES } from '../utils/membershipUtils';
import './CommentExtractor.css';

// متغير للتحكم في ظهور رسائل التصحيح
const debugMode = false;

// دالة مساعدة لطباعة رسائل التصحيح
const debugLog = (...args) => {
  if (debugMode) {
    console.log(...args);
  }
};

const { Content } = Layout;
const { Search } = Input;

// Replaced custom shimmer components with standardized ShimmerEffect

const CommentExtractor = () => {
  const { user } = useUser();
  const { messageApi } = useMessage();
  const { t } = useLanguage();
  const [postId, setPostId] = useState('');
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [contentLoading, setContentLoading] = useState(false); // Separate state for ContentContainer
  const [error, setError] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsPageSize, setCommentsPageSize] = useState(10);
  const [isDataSecretopen, setIsDataSecretopen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [progress, setProgress] = useState(0);
  const [totalComments, setTotalComments] = useState(0);
  const [extractedCount, setExtractedCount] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [savedExtractions, setSavedExtractions] = useState([]);
  const [saveModalopen, setSaveModalopen] = useState(false);
  const [extractionName, setExtractionName] = useState('');
  const [activeTab, setActiveTab] = useState('current');
  const [activeAccessToken, setActiveAccessToken] = useState('');
  const [fetchingToken, setFetchingToken] = useState(false);

  // Debug state updates
  useEffect(() => {
    debugLog('Comments state updated:', comments.length, comments);
  }, [comments]);

  // تصفية التعليقات بناءً على نص البحث
  const filteredComments = comments.filter(comment => {
    const matchesSearch = searchText
      ? (
          comment?.userName?.toLowerCase().includes(searchText.toLowerCase()) ||
          comment?.userId?.toLowerCase().includes(searchText.toLowerCase()) ||
          comment?.message?.toLowerCase().includes(searchText.toLowerCase())
        )
      : true;
    return matchesSearch;
  });

  const columns = [
    {
      title: '#',
      key: 'index',
      width: 60,
      fixed: 'left',
      align: 'center',
      render: (text, record, index) => (commentsPage - 1) * commentsPageSize + index + 1,
    },
    {
      title: t('user_id'),
      dataIndex: 'userId',
      key: 'userId',
      width: 120,
      ellipsis: true,
      sorter: (a, b) => a.userId.localeCompare(b.userId),
    },
    {
      title: t('user_name'),
      dataIndex: 'userName',
      key: 'userName',
      width: 180,
      ellipsis: true,
      sorter: (a, b) => a.userName.localeCompare(b.userName),
    },
    {
      title: t('comment'),
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      width: 400,
      sorter: (a, b) => a.message.localeCompare(b.message),
    },
    {
      title: t('comment_date'),
      dataIndex: 'commentDate',
      key: 'commentDate',
      width: 150,
      ellipsis: true,
      render: (date) => moment(date).format('YYYY-MM-DD HH:mm'),
      sorter: (a, b) => moment(a.commentDate).unix() - moment(b.commentDate).unix(),
    },
    {
      title: t('actions'),
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title={t('view_user_info')}>
            <Button
              type="link"
              size="small"
              icon={<InfoCircleOutlined />}
              onClick={() => {
                setSelectedRowKeys([record.userId]);
                setIsDataSecretopen(true);
              }}
            />
          </Tooltip>
        </Space>
      ),
    }
  ];

  // Improved comment fetching with detailed debugging and backend proxy
  const fetchComments = async (url, allComments = []) => {
    setLoadingComments(true);
    debugLog('====== COMMENT FETCHING DEBUG ======');
    debugLog('Starting fetch from URL:', url);
    debugLog('Current comments count before fetch:', allComments.length);
    
    try {
      if (!url.includes('access_token=')) {
        throw new Error(t('access_token_missing'));
      }
      
      // Always ensure we're using the backend proxy
      let proxyUrl;
      
      // If it's already a proxy URL, use it directly
      if (url.startsWith('/api/facebook/proxy')) {
        proxyUrl = url;
        debugLog('Using existing proxy URL:', proxyUrl);
      }
      // If it's a direct Facebook URL (from pagination), convert it to use our proxy
      else if (url.includes('graph.facebook.com')) {
        // Extract path and query from direct Facebook URL
        const urlObj = new URL(url);
        const endpoint = urlObj.pathname.replace('/v18.0', '');
        proxyUrl = `/api/facebook/proxy?endpoint=${encodeURIComponent(endpoint)}&accessToken=${encodeURIComponent(activeAccessToken)}`;
        
        // Add any other query parameters
        urlObj.searchParams.forEach((value, key) => {
          if (key !== 'access_token') {
            proxyUrl += `&${key}=${encodeURIComponent(value)}`;
          }
        });
        
        debugLog('Converted direct Facebook URL to proxy URL:', proxyUrl);
      } 
      // If it's a relative path
      else if (url.startsWith('/v18.0')) {
        const endpoint = url.replace('/v18.0', '').split('?')[0];
        const queryParams = url.includes('?') ? url.split('?')[1] : '';
        const queryObj = new URLSearchParams(queryParams);
        
        // Remove access token from query params as we'll add it separately
        queryObj.delete('access_token');
        
        // Build new proxy URL
        proxyUrl = `/api/facebook/proxy?endpoint=${encodeURIComponent(endpoint)}&accessToken=${encodeURIComponent(activeAccessToken)}`;
        
        // Add remaining query parameters
        queryObj.forEach((value, key) => {
          proxyUrl += `&${key}=${encodeURIComponent(value)}`;
        });
        
        debugLog('Converted relative path to proxy URL:', proxyUrl);
      }
      // Any other format of URL, assume it's a Facebook endpoint and convert it
      else {
        // Treat it as an endpoint
        proxyUrl = `/api/facebook/proxy?endpoint=${encodeURIComponent(url)}&accessToken=${encodeURIComponent(activeAccessToken)}`;
        debugLog('Treating as endpoint and converting to proxy URL:', proxyUrl);
      }
      
      debugLog('Using proxy URL for fetch:', proxyUrl);
      
      debugLog('Using proxy URL for fetch:', proxyUrl);
      
      // Get the auth token for backend API requests
      const token = localStorage.getItem('token');
      
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Mozilla/5.0'
        }
      });

      debugLog('Response received with status:', response.status);
      
        let responseText = '';
        try {
          responseText = await response.text();
          debugLog('Response text received, length:', responseText.length);
        } catch (textError) {
          debugLog('Error getting response text:', textError);
          throw new Error(t('failed_to_read_response'));
        }
      
      let data = null;
      try {
        data = JSON.parse(responseText);
        debugLog('JSON parsed successfully');
        debugLog('Response structure:', Object.keys(data));
        
      // Log sample data for debugging
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        debugLog(`Received ${data.data.length} comments`);
        debugLog('First comment sample:', data.data[0]);
        
        if (data.data[0].from) {
          debugLog('Comment has "from" field with structure:', data.data[0].from);
        } else {
          debugLog('WARNING: Comment missing "from" field:', data.data[0]);
          // Check if comment has embedded from data
          if (data.data[0].name || data.data[0].id) {
            debugLog('Comment has direct id/name data:', {
              id: data.data[0].id,
              name: data.data[0].name
            });
          }
        }
      } else {
        debugLog('No comments found in response or data.data is not an array');
        debugLog('Full response data:', data);
      }
      } catch (parseError) {
        debugLog('Parse error:', parseError);
        debugLog('Response text (first 200 chars):', responseText.substring(0, 200));
        throw new Error(`${t('failed_to_parse_response')}: ${parseError.message}`);
      }
      
      if (!response.ok) {
        debugLog('API Error:', data);
        throw new Error(`HTTP error! status: ${response.status} - ${data.error?.message || 'Unknown error'}`);
      }

      // Handle empty or invalid data
      if (!data.data || !Array.isArray(data.data)) {
        debugLog('Invalid data structure:', data);
        throw new Error(t('invalid_data_structure'));
      }

      // Set total count if this is the first request
      if (allComments.length === 0 && data.summary?.total_count) {
        const totalCount = data.summary.total_count;
        debugLog('Setting total comments count from summary:', totalCount);
        setTotalComments(totalCount);
        setShowProgress(true);
      } else if (allComments.length === 0 && data.data) {
        const estimatedTotal = data.data.length * 2;
        debugLog('Estimating total comments:', estimatedTotal);
        setTotalComments(estimatedTotal);
        setShowProgress(true);
      }

      // Process comments with comprehensive debugging
      debugLog('Processing comments...');
      const processedComments = [];
      
      for (let i = 0; i < data.data.length; i++) {
        const comment = data.data[i];
        if (!comment) {
          debugLog(`Skipping empty comment at index ${i}`);
          continue;
        }
        
        try {
          const userId = comment.from?.id || 
                        comment.from_id || 
                        comment.id || 
                        `unknown_${Math.random().toString(36).slice(2)}`;
                        
          const userName = comment.from?.name || 
                          comment.from_name || 
                          comment.name || 
                          t('unknown_user');
                          
          const message = comment.message || comment.text || '';
          const key = comment.id || `comment_${Math.random().toString(36).slice(2)}`;
          
          const processedComment = {
            userId,
            userName,
            message,
            key,
            commentDate: comment.created_time || new Date().toISOString(),
            extractedAt: new Date().toISOString() // Keep for backward compatibility
          };
          
          processedComments.push(processedComment);
          
          // Log every 10th comment to avoid flooding console
          if (i % 10 === 0 || i === data.data.length - 1) {
            debugLog(`Processed comment ${i+1}/${data.data.length}:`, processedComment);
          }
        } catch (commentError) {
          debugLog(`Error processing comment at index ${i}:`, commentError);
          debugLog('Comment data:', comment);
        }
      }
      
      debugLog(`Successfully processed ${processedComments.length} comments`);

      // Update comments state immediately to ensure UI reflects changes
      const newTotalComments = [...allComments, ...processedComments];
      debugLog(`Setting comments state with ${newTotalComments.length} total comments`);
      
      setComments(newTotalComments); // Update state immediately
      setExtractedCount(newTotalComments.length);
      
      if (totalComments > 0) {
        const progressPercentage = Math.min(Math.round((newTotalComments.length / totalComments) * 100), 100);
        debugLog('Setting progress to', progressPercentage, '%');
        setProgress(progressPercentage);
      }

      // Handle pagination if available
      if (data.paging?.next) {
        debugLog('Found next page, will fetch after delay:', data.paging.next);
        
        try {
          // Always use the backend proxy for pagination
          const nextUrl = data.paging.next;
          debugLog('Next page URL from API:', nextUrl);
          
          // Extract the 'after' parameter from the next URL
          const urlObj = new URL(nextUrl);
          const afterParam = urlObj.searchParams.get('after');
          debugLog('Extracted after parameter:', afterParam);
          
          if (afterParam) {
            // Create a new proxy URL with the after parameter
            let endpoint;
            
            // Try to extract the endpoint from the current URL if it's already a proxy
            if (url.startsWith('/api/facebook/proxy')) {
              const params = new URLSearchParams(url.split('?')[1]);
              endpoint = params.get('endpoint');
            } else {
              endpoint = `/${postId}/comments`;
            }
            
            const paginationUrl = `/api/facebook/proxy?endpoint=${encodeURIComponent(endpoint)}&accessToken=${encodeURIComponent(activeAccessToken)}&fields=id,message,from{id,name},created_time&limit=100&after=${encodeURIComponent(afterParam)}`;
            
            debugLog('Constructed pagination URL using backend proxy:', paginationUrl);
            
            // Add a delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Call fetchComments with the new pagination URL
            return await fetchComments(paginationUrl, newTotalComments);
          }
        } catch (paginationError) {
          debugLog('Error processing pagination:', paginationError);
          // Continue with what we have if pagination fails
          messageApi.warning('تعذر تحميل المزيد من التعليقات، تم استخراج التعليقات المتاحة فقط');
        }
      }
      
      debugLog('No more pages to fetch, extraction complete');

      // Final update after all pages are fetched
      debugLog(`EXTRACTION COMPLETE: ${newTotalComments.length} total comments`);
      setTotalComments(newTotalComments.length);
      setProgress(100);
      
      return newTotalComments;
    } catch (error) {
      debugLog('Error in fetchComments:', error);
      throw error;
    } finally {
      setLoadingComments(false);
      if (!url.includes('after=')) {
        setShowProgress(false);
      }
      debugLog('====== END COMMENT FETCHING DEBUG ======');
    }
  };

  // تابع جديد لجلب رمز الوصول النشط من API
  const fetchActiveAccessToken = async () => {
    if (fetchingToken) return null;
    
    setFetchingToken(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/users/access-tokens', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const tokens = response.data;
      debugLog('Available tokens:', tokens.length);
      
      const active = tokens.find(token => token.isActive);
      
      if (active) {
        debugLog('Found active token');
        setActiveAccessToken(active.accessToken);
        return active.accessToken;
      } else if (tokens.length > 0) {
        debugLog('No active token found, using most recent token');
        setActiveAccessToken(tokens[0].accessToken);
        return tokens[0].accessToken;
      }
      
      return null;
    } catch (error) {
      debugLog('Error fetching access token:', error);
      return null;
    } finally {
      setFetchingToken(false);
    }
  };

  const handleExtractComments = async () => {
      if (!postId) {
        messageApi.error(t('please_enter_post_id'));
        return;
      }
    
    debugLog('======= STARTING COMMENT EXTRACTION =======');
    debugLog('Post ID:', postId);
    
    setLoading(true);
    setError('');
    setComments([]); // Clear previous comments
    setCommentsPage(1);
    setSelectedRowKeys([]);
    setProgress(0);
    setTotalComments(0);
    setExtractedCount(0);
    setShowProgress(true);
    
    try {
      // Fetch active access token
      // messageApi.loading('جاري البحث عن رمز وصول نشط...', 1);
      const accessToken = await fetchActiveAccessToken();
      
      if (!accessToken) {
        const errorMsg = t('no_active_token');
        debugLog('Error:', errorMsg);
        messageApi.error(errorMsg);
        setLoading(false);
        return;
      }
      
      debugLog('Found active token, starting extraction...');
      messageApi.success(t('extracting_commenters'), 1);
      
      
      // Always use the backend proxy to extract comments
      try {
        debugLog('Extracting comments from Graph API via backend proxy');
        const url = `/api/facebook/proxy?endpoint=${encodeURIComponent(`/${postId}/comments`)}&accessToken=${encodeURIComponent(accessToken)}&fields=id,message,from{id,name},created_time&limit=100`;
        
        const extractedComments = await fetchComments(url, []);
        debugLog('Extraction result:', extractedComments?.length || 0, 'comments');
        
        if (extractedComments && extractedComments.length > 0) {
          debugLog('Extraction successful, updating state');
          // Force immediate state update
          setComments(extractedComments);
          messageApi.success(t('comments_extracted_successfully', { count: extractedComments.length }));
          return; // Exit if successful
        } else {
          debugLog('No comments found, using fallback data...');
          messageApi.loading('لم يتم العثور على تعليقات، جاري استخدام البيانات التجريبية...', 1);
        }
      } catch (extractionError) {
        debugLog('Extraction failed:', extractionError);
      }
      
      // Fallback to mock data if both methods fail
      debugLog('All API methods failed, using mock data');
      const mockComments = [
        {
          userId: 'mock_user_1',
          userName: t('mock_user_1'),
          message: t('mock_comment_1'),
          key: 'mock_comment_1',
          commentDate: new Date().toISOString(),
          extractedAt: new Date().toISOString(),
        },
        {
          userId: 'mock_user_2',
          userName: t('mock_user_2'),
          message: t('mock_comment_2'),
          key: 'mock_comment_2', 
          commentDate: new Date().toISOString(),
          extractedAt: new Date().toISOString(),
        }
      ];
      
      debugLog('Setting mock comments:', mockComments.length);
      setComments(mockComments);
      setTotalComments(mockComments.length);
      setExtractedCount(mockComments.length);
      setProgress(100);
      setShowProgress(false);
      messageApi.warning(t('mock_data_displayed'));
      setError(t('mock_data_note'));
    } catch (error) {
      debugLog('General extraction error:', error);
      setError(`خطأ عام: ${error.message}`);
      messageApi.error(`فشل في استخراج التعليقات: ${error.message}`);
    } finally {
      debugLog('======= COMMENT EXTRACTION COMPLETED =======');
      setLoading(false);
      setShowProgress(false);
    }
  };

  const handleExtractUserData = () => {
    if (selectedRowKeys.length === 0) {
      messageApi.warning(t('please_select_at_least_one_user'));
      return;
    }
    setIsDataSecretopen(true);
  };

  const handleCloseDataSecret = () => setIsDataSecretopen(false);

  const handleCommentsTableChange = (pagination) => {
    setCommentsPage(pagination.current);
    setCommentsPageSize(pagination.pageSize);
  };

  const exportToExcel = () => {
    const dataToExport = selectedRowKeys.length > 0
      ? comments.filter(c => selectedRowKeys.includes(c.userId))
      : comments;
      
    if (dataToExport.length === 0) {
      messageApi.warning(t('no_data_to_export'));
      return;
    }
    
    const ws = XLSX.utils.json_to_sheet(dataToExport.map(c => ({
      [t('user_id')]: c.userId,
      [t('user_name')]: c.userName,
      [t('comment')]: c.message,
      [t('comment_date')]: moment(c.commentDate).format('YYYY-MM-DD HH:mm:ss')
    })));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Comments');
    const fileName = `comments_${postId}_${moment().format('YYYYMMDD_HHmmss')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    messageApi.success(t('export_success', { count: dataToExport.length }));
  };

  const exportToCSV = () => {
    const dataToExport = selectedRowKeys.length > 0
      ? comments.filter(c => selectedRowKeys.includes(c.userId))
      : comments;
      
    if (dataToExport.length === 0) {
      messageApi.warning('لا توجد بيانات للتصدير');
      return;
    }
    
    const csvData = dataToExport.map(c =>
      `"${c.userId}","${c.userName}","${c.message}","${moment(c.commentDate).format('YYYY-MM-DD HH:mm:ss')}"`
    );
    
    csvData.unshift('"معرف المستخدم","اسم المستخدم","التعليق","تاريخ التعليق"');
    const csvContent = csvData.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `comments_${postId}_${moment().format('YYYYMMDD_HHmmss')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    messageApi.success(`تم تصدير ${dataToExport.length} تعليق بنجاح`);
  };

  const handleSaveExtraction = () => {
    if (comments.length === 0) {
      messageApi.warning(t('no_data_to_save'));
      return;
    }
    setSaveModalopen(true);
  };

  const saveExtraction = () => {
    if (!extractionName.trim()) {
      messageApi.error(t('please_enter_extraction_name'));
      return;
    }
    
    const newSavedExtraction = {
      id: Date.now().toString(),
      name: extractionName,
      postId,
      date: new Date().toISOString(),
      count: comments.length,
      comments: [...comments]
    };
    
    setSavedExtractions([...savedExtractions, newSavedExtraction]);
    setSaveModalopen(false);
    setExtractionName('');
    messageApi.success(t('extraction_saved_successfully'));
  };

  const loadSavedExtraction = (saved) => {
    debugLog('Loading saved extraction:', saved);
    setComments(saved.comments);
    setPostId(saved.postId);
    setActiveTab('current');
    messageApi.success(t('extraction_loaded_successfully'));
  };

  const deleteSavedExtraction = (id) => {
    Modal.confirm({
      title: t('confirm_delete'),
      content: t('confirm_extraction_delete'),
      okText: t('yes'),
      cancelText: t('no'),
      onOk: () => {
        setSavedExtractions(savedExtractions.filter(s => s.id !== id));
        messageApi.success(t('extraction_deleted_successfully'));
      }
    });
  };

  const paginationConfig = {
    showSizeChanger: true,
    showQuickJumper: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    showTotal: (total) => t('total_comments_count', { count: total })
  };

  // Statistics cards
  const statsCards = [
    { 
      title: t('total_comments'), 
      value: comments.length, 
      color: '#1890ff', 
      icon: <MessageOutlined style={{ fontSize: '24px' }} /> 
    },
    { 
      title: t('unique_users'), 
      value: [...new Set(comments.map(c => c.userId))].length, 
      color: '#13c2c2', 
      icon: <UserOutlined style={{ fontSize: '24px' }} /> 
    },
    { 
      title: t('average_comment_length'), 
      value: comments.length ? Math.round(comments.reduce((acc, curr) => acc + (curr.message?.length || 0), 0) / comments.length) : 0, 
      color: '#722ed1', 
      icon: <BarChartOutlined style={{ fontSize: '24px' }} /> 
    },
  ];

  // Tab items
  const tabItems = [
    {
      key: 'current',
      label: (<span><CommentOutlined className="tab-icon" />{t('extract_comments_tab')}</span>),
      children: (
        <>
          <div className="input-container">
            <Input
              className="post-id-input flex-grow"
              placeholder={t('post_id')}
              value={postId}
              onChange={(e) => setPostId(e.target.value)}
            />
            <Button
              className="extract-button"
              type="primary"
              onClick={handleExtractComments}
              disabled={loading || loadingComments}
            >
              {loading || loadingComments ? <LoadingOutlined /> : <ReloadOutlined />}
              <span>{t('extract_commenters')}</span>
            </Button>
            <Button
              onClick={handleSaveExtraction}
              disabled={comments.length === 0}
              icon={<SaveOutlined />}
              className="secondary-button"
            >
              {t('save_extraction')}
            </Button>
          </div>

          {showProgress && (
            <div className="progress-container">
              <div className="progress-header">
              <span>{t('extracting_comments')}</span>
              <span className="progress-count">{extractedCount} / {totalComments}</span>
              </div>
              <Progress
                percent={progress}
                status={loadingComments ? "active" : "normal"}
                strokeColor={{
                  from: '#108ee9',
                  to: '#87d068',
                }}
              />
            </div>
          )}

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              className="error-alert"
            />
          )}

          {comments.length > 0 && (
            <div className="stats-cards-container">
              {statsCards.map((stat, index) => (
                <Card key={index} className="stats-card">
                  <div className="stats-card-content">
                    <div className="stats-icon" style={{ color: stat.color }}>
                      {stat.icon}
                    </div>
                    <p className="stats-title">{stat.title}</p>
                    <p className="stats-value" style={{ color: stat.color }}>{stat.value}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <div className="filter-container">
            <div className="filter-actions">
              <div className="custom-search-wrapper">
                <div className="search-icon-container">
                  <SearchOutlined className="search-icon" />
                </div>
                <Input
                  className="custom-search-input"
                  placeholder={t('search_placeholder')}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  suffix={
                    searchText ? (
                      <CloseOutlined
                        className="clear-icon"
                        onClick={() => setSearchText('')}
                      />
                    ) : null
                  }
                />
              </div>
            </div>
            <div className="filter-export">
              <Space>
                <Dropdown 
                  menu={{
                    items: [
                      {
                        key: 'excel',
                        label: t('export_as_excel'),
                        icon: <FileExcelOutlined style={{ color: '#217346' }} />,
                        onClick: exportToExcel,
                      },
                      {
                        key: 'csv',
                        label: t('export_as_csv'),
                        icon: <FilePdfOutlined style={{ color: '#FF5722' }} />,
                        onClick: exportToCSV,
                      },
                    ]
                  }}
                  placement="bottomRight"
                >
                  <Button icon={<DownloadOutlined />} className="secondary-button">
                    {t('export')}
                  </Button>
                </Dropdown>
              </Space>
            </div>
          </div>

          <div className="table-container">
            <div className="table-header">
              <span className="selection-info">
                {selectedRowKeys.length > 0 ? (
                  <span className="selected-info">
                    <CheckCircleOutlined className="success-icon" />
                    {t('items_selected', { count: selectedRowKeys.length })}
                  </span>
                ) : (
                  <span className="selected-info">
                    <CommentOutlined className="primary-icon" />
                    {t('extracted_comments', { count: filteredComments.length })}
                  </span>
                )}
              </span>
              <div className="table-actions">
                <Space size="middle">
                  <Button
                    onClick={handleExtractUserData}
                    disabled={selectedRowKeys.length === 0}
                    className={selectedRowKeys.length === 0 ? "extract-button extract-button-disabled" : "extract-button"}
                    icon={<InfoCircleOutlined />}
                  >
                    {t('extract_selected_users_data')}
                  </Button>
                  <Button
                    onClick={() => setSelectedRowKeys([])}
                    disabled={selectedRowKeys.length === 0}
                    className={selectedRowKeys.length === 0 ? "deselect-button deselect-button-disabled" : "deselect-button"}
                    icon={<CloseOutlined />}
                  >
                    {t('deselect')}
                  </Button>
                </Space>
              </div>
            </div>

            {loadingComments ? (
              <ShimmerEffect type="table" rows={5} columnCount={6} />
            ) : (
              <Table
                className="comments-table"
                rowSelection={{
                  type: 'checkbox',
                  selectedRowKeys: selectedRowKeys,
                  onChange: (selectedKeys) => setSelectedRowKeys(selectedKeys),
                  selections: [
                    Table.SELECTION_ALL,
                    Table.SELECTION_INVERT,
                    Table.SELECTION_NONE,
                  ],
                  columnWidth: 48,
                  fixed: true,
                  preserveSelectedRowKeys: true,
                }}
                columns={columns}
                dataSource={filteredComments}
                rowKey="userId"
                loading={loading}
                onChange={handleCommentsTableChange}
                pagination={{
                  current: commentsPage,
                  pageSize: commentsPageSize,
                  ...paginationConfig,
                  showTotal: (total) =>
                    t('pagination_info', {
                      from: commentsPage > 0 ? ((commentsPage - 1) * commentsPageSize) + 1 : 0,
                      to: Math.min(commentsPage * commentsPageSize, total),
                      total
                    }),
                  className: 'pagination'
                }}
                scroll={{ x: 800 }}
                size="middle"
              />
            )}
          </div>
        </>
      ),
    },
    {
      key: 'saved',
      label: (<span><FolderOpenOutlined className="tab-icon" />{t('saved_extractions_tab')}</span>),
      children: (
        <>
          {savedExtractions.length === 0 ? (
            <Alert
              message={t('no_saved_extractions')}
              type="info"
              showIcon
            />
          ) : (
            <Table
              dataSource={savedExtractions}
              rowKey="id"
              columns={[
                {
                  title: t('extraction_name'),
                  dataIndex: 'name',
                  key: 'name',
                },
                {
                  title: t('post_id'),
                  dataIndex: 'postId',
                  key: 'postId',
                },
                {
                  title: t('date'),
                  dataIndex: 'date',
                  key: 'date',
                  render: (text) => moment(text).format('YYYY-MM-DD HH:mm'),
                },
                {
                  title: t('comments_count'),
                  dataIndex: 'count',
                  key: 'count',
                },
                {
                  title: t('actions'),
                  key: 'actions',
                  render: (_, record) => (
                    <Space>
                      <Button size="small" onClick={() => loadSavedExtraction(record)}>
                        {t('load')}
                      </Button>
                      <Button size="small" danger onClick={() => deleteSavedExtraction(record.id)}>
                        {t('delete')}
                      </Button>
                    </Space>
                  ),
                }
              ]}
              pagination={{ pageSize: 5 }}
            />
          )}
        </>
      ),
    },
  ];

  return (
    <ContentContainer isLoading={contentLoading}>
      <SEO 
        title={t('comment_extractor_title')}
        description={t('comment_extractor_description')}
        canonicalUrl="https://xelo.tools/comment-extractor"
        additionalMetaTags={[
          { name: 'keywords', content: t('comment_extractor_keywords') }
        ]}
      />
      <Layout>
        <Content>
          <div>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              className="tabs-container"
              type="card"
              items={tabItems}
            />

            <DataSecret
              selectedUserIds={selectedRowKeys}
              open={isDataSecretopen}
              onCancel={handleCloseDataSecret}
            />

            <Modal
              title={t('save_extraction_title')}
              open={saveModalopen}
              onCancel={() => setSaveModalopen(false)}
              onOk={saveExtraction}
              okText={t('save')}
              cancelText={t('cancel')}
              getContainer={document.body}
              className="data-secret-modal"
              centered={true}
              style={{ top: '50%', transform: 'translateY(-50%)' }}
            >
              <Input
                placeholder={t('extraction_name')}
                value={extractionName}
                onChange={(e) => setExtractionName(e.target.value)}
              />
            </Modal>
          </div>
        </Content>
      </Layout>
    </ContentContainer>
  );
};

// Export the component wrapped with membership restriction
export default withMembershipRestriction(CommentExtractor, RESTRICTED_FEATURES.COMMENT_EXTRACTOR);