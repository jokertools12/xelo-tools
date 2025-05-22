import React, { useState, useEffect } from 'react';
import { Layout, Input, Button, Table, Alert, Progress, Space, Card, Tooltip, Dropdown, Select, Modal, Tabs, Badge, Skeleton } from 'antd';
import ContentContainer from '../components/ContentContainer';
import ShimmerEffect from '../components/ShimmerEffect';
import SEO from '../components/SEO';
import { useLanguage } from '../context/LanguageContext';
import {
  LoadingOutlined, DownloadOutlined, FileExcelOutlined, FilePdfOutlined, SearchOutlined,
  SaveOutlined, ReloadOutlined, InfoCircleOutlined,
  ThunderboltOutlined, UserOutlined, BarChartOutlined, LinkOutlined, CheckCircleOutlined,
  CloseOutlined, FolderOpenOutlined, LikeOutlined, HeartOutlined, SmileOutlined,
  ExclamationCircleOutlined, FrownOutlined
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import moment from 'moment';
import axios from 'axios';
import DataSecret from '../components/DataSecret';
import { useUser } from '../context/UserContext';
import { useMessage } from '../context/MessageContext';
import './ReactionExtractor.css';

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
const { Option } = Select;

// Using the standardized ShimmerEffect component for loading states

// Helper function to get color for each reaction type
const getReactionColor = (type) => {
  switch (type) {
    case 'LIKE': return '#1890ff';
    case 'LOVE': return '#eb2f96';
    case 'CARE': return '#ff9c08';
    case 'HAHA': return '#faad14';
    case 'WOW': return '#722ed1';
    case 'SAD': return '#13c2c2';
    case 'ANGRY': return '#fa541c';
    default: return '#8c8c8c';
  }
};

// Helper function to get icon for each reaction type
const getReactionIcon = (type) => {
  switch (type) {
    case 'LIKE': return <LikeOutlined style={{ color: getReactionColor(type) }} />;
    case 'LOVE': return <HeartOutlined style={{ color: getReactionColor(type) }} />;
    case 'CARE': return <HeartOutlined style={{ color: getReactionColor(type) }} />;
    case 'HAHA': return <SmileOutlined style={{ color: getReactionColor(type) }} />;
    case 'WOW': return <ExclamationCircleOutlined style={{ color: getReactionColor(type) }} />;
    case 'SAD': return <FrownOutlined style={{ color: getReactionColor(type) }} />;
    case 'ANGRY': return <ThunderboltOutlined style={{ color: getReactionColor(type) }} />;
    default: return <LikeOutlined style={{ color: '#8c8c8c' }} />;
  }
};

const ReactionExtractor = () => {
  const { user } = useUser();
  const { messageApi } = useMessage();
  const { t } = useLanguage();
  
  // State variables
  const [postId, setPostId] = useState('');
  const [reactions, setReactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [contentLoading, setContentLoading] = useState(false); // Separate state for ContentContainer
  const [error, setError] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [loadingReactions, setLoadingReactions] = useState(false);
  const [reactionsPage, setReactionsPage] = useState(1);
  const [reactionsPageSize, setReactionsPageSize] = useState(10);
  const [isDataSecretopen, setIsDataSecretopen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('');
  const [progress, setProgress] = useState(0);
  const [totalReactions, setTotalReactions] = useState(0);
  const [extractedCount, setExtractedCount] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [savedExtractions, setSavedExtractions] = useState([]);
  const [saveModalopen, setSaveModalopen] = useState(false);
  const [extractionName, setExtractionName] = useState('');
  const [activeTab, setActiveTab] = useState('current');
  const [activeAccessToken, setActiveAccessToken] = useState('');
  const [fetchingToken, setFetchingToken] = useState(false);

  // Get unique reaction types for filter dropdown
  const reactionTypes = [...new Set(reactions.map(r => r.reactionType))];

  // Filter reactions based on search text and filter type
  const filteredReactions = reactions.filter(reaction => {
    const matchesSearch = searchText
      ? (
          reaction.userName?.toLowerCase().includes(searchText.toLowerCase()) ||
          reaction.userId?.toLowerCase().includes(searchText.toLowerCase())
        )
      : true;
    
    const matchesType = filterType ? reaction.reactionType === filterType : true;
    
    return matchesSearch && matchesType;
  });

  // Table column definitions
  const columns = [
    {
      title: '#',
      key: 'index',
      width: 60,
      fixed: 'left',
      align: 'center',
      render: (text, record, index) => (reactionsPage - 1) * reactionsPageSize + index + 1,
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
      sorter: (a, b) => a.userName?.localeCompare(b.userName),
    },
    {
      title: t('reaction_type'),
      dataIndex: 'reactionType',
      key: 'reactionType',
      width: 120,
      filters: reactionTypes.map(type => ({ text: type, value: type })),
      onFilter: (value, record) => record.reactionType === value,
      render: (text) => (
        <Badge 
          count={
            <span style={{ color: getReactionColor(text) }}>
              {getReactionIcon(text)} {text}
            </span>
          } 
          style={{ backgroundColor: getReactionColor(text) + '20' }}
        />
      )
    },
    {
      title: t('reaction_date'),
      dataIndex: 'reactionDate',
      key: 'reactionDate',
      width: 150,
      ellipsis: true,
      render: (date) => moment(date).format('YYYY-MM-DD HH:mm'),
      sorter: (a, b) => moment(a.reactionDate).unix() - moment(b.reactionDate).unix(),
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

  // Fetch reactions from API via backend proxy
  const fetchReactions = async (url, allReactions = []) => {
    setLoadingReactions(true);
    debugLog('====== REACTION FETCHING DEBUG ======');
    debugLog('Starting fetch from URL:', url);
    debugLog('Current reactions count before fetch:', allReactions.length);
    
      try {
      if (!url.includes('access_token=') && !url.includes('accessToken=')) {
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
      
      // First check if the response is OK before trying to parse it
      if (!response.ok) {
        debugLog('HTTP Error:', response.status, response.statusText);
        throw new Error(`${t('http_error')}: ${response.status} - ${response.statusText}`);
      }
      
      let responseText = '';
      try {
        responseText = await response.text();
        debugLog('Response text received, length:', responseText.length);
      
      // Check if the response looks like HTML instead of JSON
      if (responseText.trim().toLowerCase().startsWith('<!doctype') || 
          responseText.trim().toLowerCase().startsWith('<html')) {
        debugLog('Received HTML response instead of JSON');
        
        // Check if it's likely an authentication or login issue
        if (responseText.includes('login') || 
            responseText.includes('checkpoint') || 
            responseText.includes('authenticate') ||
            responseText.includes('access_token')) {
          throw new Error(t('auth_error_html_response'));
        } else {
          throw new Error(t('html_response_try_token_refresh'));
        }
      }
      
      // Additional check for non-JSON responses that might not start with HTML tags
      if (!responseText.trim().startsWith('{') && !responseText.trim().startsWith('[')) {
        debugLog('Response does not appear to be JSON');
        throw new Error(t('unexpected_response_update_token'));
      }
      } catch (textError) {
        if (debugMode) console.error('Error getting response text:', textError);
        throw new Error(textError.message || t('response_text_read_failed'));
      }
      
      let data = null;
      try {
        data = JSON.parse(responseText);
        debugLog('JSON parsed successfully');
        debugLog('Response structure:', Object.keys(data));
        
        // Log sample data for debugging if in debug mode
        if (debugMode && data.data && Array.isArray(data.data) && data.data.length > 0) {
          debugLog(`Received ${data.data.length} reactions`);
          debugLog('First reaction sample:', data.data[0]);
        }
      } catch (parseError) {
        if (debugMode) {
          console.error('Parse error:', parseError);
          console.error('Response text (first 200 chars):', responseText.substring(0, 200));
        }
        
        // Provide a more helpful error message when we receive HTML
        if (responseText.includes('<!DOCTYPE html>') || 
            responseText.includes('<html') || 
            responseText.includes('HTML')) {
          if (responseText.includes('login') || 
              responseText.includes('checkpoint') || 
              responseText.includes('authenticate')) {
            throw new Error(t('facebook_login_required'));
          } else {
            throw new Error(t('html_received_instead_of_json_try_refresh'));
          }
        } else if (!responseText.trim().startsWith('{') && !responseText.trim().startsWith('[')) {
          // Additional check for non-JSON responses
          throw new Error(t('unexpected_response_update_token'));
        } else {
          throw new Error(`${t('server_response_parse_failed')}: ${parseError.message}`);
        }
      }

      // Set total count if this is the first request
      if (allReactions.length === 0 && data.summary?.total_count) {
        const totalCount = data.summary.total_count;
        debugLog('Setting total reactions count from summary:', totalCount);
        setTotalReactions(totalCount);
        setShowProgress(true);
      } else if (allReactions.length === 0 && data.data) {
        const estimatedTotal = data.data.length * 2; // Estimate
        debugLog('Estimating total reactions:', estimatedTotal);
        setTotalReactions(estimatedTotal);
        setShowProgress(true);
      }

      // Process reactions with proper error handling
      debugLog('Processing reactions...');
      const processedReactions = [];
      
      if (!data.data || !Array.isArray(data.data)) {
        if (debugMode) console.error('Invalid data structure:', data);
        throw new Error(t('invalid_data_structure'));
      }
      
      for (let i = 0; i < data.data.length; i++) {
        const reaction = data.data[i];
        if (!reaction) {
          debugLog(`Skipping empty reaction at index ${i}`);
          continue;
        }
        
        try {
          const userId = reaction.from?.id || 
                        reaction.id || 
                        `unknown_${Math.random().toString(36).slice(2)}`;
                        
          const userName = reaction.from?.name || 
                          reaction.name || 
                          t('unknown_user');
                          
          const reactionType = reaction.type || 'UNKNOWN';
          const key = reaction.id || `reaction_${Math.random().toString(36).slice(2)}`;
          
          const processedReaction = {
            userId,
            userName,
            reactionType,
            key,
            reactionDate: reaction.created_time || new Date().toISOString(),
            extractedAt: new Date().toISOString() // Keep for backward compatibility
          };
          
          processedReactions.push(processedReaction);
          
          // Log every 10th reaction to avoid flooding console
          if (i % 10 === 0 || i === data.data.length - 1) {
            debugLog(`Processed reaction ${i+1}/${data.data.length}:`, processedReaction);
          }
        } catch (reactionError) {
          if (debugMode) console.error(`Error processing reaction at index ${i}:`, reactionError);
          if (debugMode) console.error('Reaction data:', reaction);
        }
      }
      
      debugLog(`Successfully processed ${processedReactions.length} reactions`);

      // Deduplicate reactions by userId
      const uniqueReactions = [...allReactions];
      
      processedReactions.forEach(newReaction => {
        if (!uniqueReactions.some(existingReaction => existingReaction.userId === newReaction.userId)) {
          uniqueReactions.push(newReaction);
        }
      });
      
      // Update reactions state with unique values
      debugLog(`Setting reactions state with ${uniqueReactions.length} total unique reactions`);
      setReactions(uniqueReactions);
      setExtractedCount(uniqueReactions.length);
      
      if (totalReactions > 0) {
        const progressPercentage = Math.min(Math.round((uniqueReactions.length / totalReactions) * 100), 100);
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
                endpoint = `/${postId}/reactions`;
              }
              
              const paginationUrl = `/api/facebook/proxy?endpoint=${encodeURIComponent(endpoint)}&accessToken=${encodeURIComponent(activeAccessToken)}&limit=100&after=${encodeURIComponent(afterParam)}&summary=total_count&pretty=1`;
              
              debugLog('Constructed pagination URL using backend proxy:', paginationUrl);
            
            // Add a delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Call fetchReactions with the new pagination URL
            return await fetchReactions(paginationUrl, uniqueReactions);
          }
        } catch (paginationError) {
          debugLog('Error processing pagination:', paginationError);
          // Continue with what we have if pagination fails
          messageApi.warning(t('pagination_failed'));
        }
      }
      
      debugLog('No more pages to fetch, extraction complete');

      // Final update after all pages are fetched
      debugLog(`EXTRACTION COMPLETE: ${uniqueReactions.length} total reactions`);
      setTotalReactions(uniqueReactions.length);
      setProgress(100);
      
      return uniqueReactions;
    } catch (error) {
      debugLog('Error in fetchReactions:', error);
      throw error;
    } finally {
      setLoadingReactions(false);
      if (!url.includes('after=')) {
        setShowProgress(false);
      }
      debugLog('====== END REACTION FETCHING DEBUG ======');
    }
  };

  // Function to fetch active access token from API - improved version with better error handling
  const fetchActiveAccessToken = async () => {
    if (fetchingToken) return null;
    
    setFetchingToken(true);
    try {
      // Try to use existing token if available
      if (activeAccessToken) {
        debugLog('Using existing active token');
        return activeAccessToken;
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        debugLog('No auth token found in localStorage');
        throw new Error(t('auth_token_missing'));
      }
      
      // Use axios for API call (matching CommentExtractor approach)
      debugLog('Fetching access tokens...');
      const response = await axios.get('/api/users/access-tokens', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const tokens = response.data;
      debugLog('Available tokens:', tokens?.length || 0);
      
      // Find active token or use any available token
      if (Array.isArray(tokens) && tokens.length > 0) {
        const active = tokens.find(token => token.isActive);
        
        if (active) {
          debugLog('Found active token');
          setActiveAccessToken(active.accessToken);
          // Store as fallback
          localStorage.setItem('facebook_access_token', active.accessToken);
          return active.accessToken;
        } else {
          debugLog('No active token found, using first available token');
          setActiveAccessToken(tokens[0].accessToken);
          // Store as fallback
          localStorage.setItem('facebook_access_token', tokens[0].accessToken);
          return tokens[0].accessToken;
        }
      }
      
      // Try to get fallback token from localStorage
      const fallbackToken = localStorage.getItem('facebook_access_token');
      if (fallbackToken) {
        debugLog('Using fallback token from localStorage');
        setActiveAccessToken(fallbackToken);
        return fallbackToken;
      }
      
      debugLog('No tokens found anywhere');
      return null;
    } catch (error) {
      debugLog('Error fetching access token:', error);
      
      // Try to use existing token as fallback
      if (activeAccessToken) {
        debugLog('Error occurred, using existing active token');
        return activeAccessToken;
      }
      
      // Try localStorage fallback
      const fallbackToken = localStorage.getItem('facebook_access_token');
      if (fallbackToken) {
        debugLog('Error occurred, using fallback token from localStorage');
        setActiveAccessToken(fallbackToken);
        return fallbackToken;
      }
      
      return null;
    } finally {
      setFetchingToken(false);
    }
  };

  // Try to refresh the token
  const handleTokenRefresh = async () => {
    debugLog('Attempting to refresh access token');
    setActiveAccessToken(''); // Clear current token to force new fetch
    
    try {
      setLoading(true);
      messageApi.loading(t('refreshing_token'), 1);
      
      // Force fetch a new token
      const newToken = await fetchActiveAccessToken(true);
      
      if (newToken) {
        messageApi.success(t('token_refreshed_success'));
        return newToken;
      } else {
        messageApi.error(t('token_refresh_failed'));
        return null;
      }
    } catch (error) {
      debugLog('Token refresh error:', error);
      messageApi.error(t('token_refresh_error'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Main handler for extracting reactions
  const handleExtractReactions = async () => {
    if (!postId) {
      messageApi.error(t('please_enter_post_id'));
      return;
    }
    
    debugLog('======= STARTING REACTION EXTRACTION =======');
    debugLog('Post ID:', postId);
    
    setLoading(true);
    setError('');
    setReactions([]);
    setReactionsPage(1);
    setSelectedRowKeys([]);
    setProgress(0);
    setTotalReactions(0);
    setExtractedCount(0);
    setShowProgress(true);
    
    try {
      // Fetch active access token
      const accessToken = await fetchActiveAccessToken();
      
      if (!accessToken) {
        const errorMsg = t('no_active_token');
        debugLog('Error:', errorMsg);
        messageApi.error(errorMsg);
        setLoading(false);
        return;
      }
      
      debugLog('Found active token, starting extraction...');
      messageApi.success(t('extracting_please_wait'), 1);
      
      // Use simpler URL construction like CommentExtractor
      const url = `/api/facebook/proxy?endpoint=${encodeURIComponent(`/${postId}/reactions`)}&accessToken=${encodeURIComponent(accessToken)}&limit=100&summary=total_count&fields=id,type,name,from{id,name},created_time&pretty=1`;
      
      debugLog('Initial request URL:', url);
      let extractedReactions;
      
      try {
        extractedReactions = await fetchReactions(url);
      } catch (initialError) {
        debugLog('Initial extraction error:', initialError);
        
        // If the error suggests HTML response or authentication issues, try refreshing the token
        if (initialError.message.includes('html_response') || 
            initialError.message.includes('auth_error') ||
            initialError.message.includes('token')) {
            
          debugLog('Authentication error detected, attempting token refresh');
          messageApi.info(t('token_issue_attempting_refresh'));
          
          const refreshedToken = await handleTokenRefresh();
          
          if (refreshedToken) {
            // Retry with the new token
            const refreshedUrl = `/api/facebook/proxy?endpoint=${encodeURIComponent(`/${postId}/reactions`)}&accessToken=${encodeURIComponent(refreshedToken)}&limit=100&summary=total_count&fields=id,type,name,from{id,name},created_time&pretty=1`;
            
            debugLog('Retrying with refreshed token');
            extractedReactions = await fetchReactions(refreshedUrl);
          } else {
            // Token refresh failed, propagate original error
            throw initialError;
          }
        } else {
          // Not a token issue, propagate the error
          throw initialError;
        }
      }
      
      if (extractedReactions && extractedReactions.length > 0) {
        messageApi.success(t('extraction_success', { count: extractedReactions.length }));
      } else {
        setError(t('no_reactions_found'));
        messageApi.warning(t('no_reactions_found_short'));
      }
    } catch (error) {
      debugLog('General extraction error:', error);
      setError(`${t('general_error')}: ${error.message}`);
      
      if (error.message?.includes("blocking, logged-in checkpoint") || 
          error.message?.includes("auth_error") ||
          error.message?.includes("login_required")) {
        messageApi.error(t('token_not_working'));
        
        // Suggest token refresh
        Modal.confirm({
          title: t('access_token_issue'),
          content: t('refresh_access_token_prompt'),
          okText: t('refresh_token'),
          cancelText: t('cancel'),
          onOk: () => {
            handleTokenRefresh().then(newToken => {
              if (newToken) {
                // Auto retry extraction with new token
                handleExtractReactions();
              }
            });
          }
        });
      } else if (error.message?.includes("html_response") || error.message?.includes("unexpected_response")) {
        messageApi.error(t('server_returned_html'));
        
        // Show more detailed help with a more prominent warning modal
        Modal.confirm({
          title: t('html_response_detected'),
          icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
          content: (
            <div>
              <p>{t('html_response_explanation')}</p>
              <p><strong>{t('access_token_likely_expired')}</strong></p>
              <ul>
                <li>{t('check_internet_connection')}</li>
                <li>{t('check_access_token_valid')}</li>
                <li>{t('try_refreshing_token')}</li>
              </ul>
            </div>
          ),
          okText: t('refresh_token_now'),
          cancelText: t('cancel'),
          onOk: () => handleTokenRefresh(),
        });
      } else {
        messageApi.error(t('extraction_failed', { message: error.message }));
      }
    } finally {
      debugLog('======= REACTION EXTRACTION COMPLETED =======');
      setLoading(false);
      setShowProgress(false);
    }
  };

  // Extract user data for selected users
  const handleExtractUserData = () => {
    if (selectedRowKeys.length === 0) {
      messageApi.warning(t('please_select_user'));
      return;
    }
    setIsDataSecretopen(true);
  };

  const handleCloseDataSecret = () => setIsDataSecretopen(false);

  const handleReactionsTableChange = (pagination) => {
    setReactionsPage(pagination.current);
    setReactionsPageSize(pagination.pageSize);
  };

  // Export data to Excel
  const exportToExcel = () => {
    const dataToExport = selectedRowKeys.length > 0
      ? reactions.filter(r => selectedRowKeys.includes(r.userId))
      : reactions;
      
    if (dataToExport.length === 0) {
      messageApi.warning(t('no_data_to_export'));
      return;
    }
    
    const ws = XLSX.utils.json_to_sheet(dataToExport.map(r => ({
      [t('user_id')]: r.userId,
      [t('user_name')]: r.userName,
      [t('reaction_type')]: r.reactionType,
      [t('reaction_date')]: moment(r.reactionDate).format('YYYY-MM-DD HH:mm:ss')
    })));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reactions');
    const fileName = `reactions_${postId}_${moment().format('YYYYMMDD_HHmmss')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    messageApi.success(t('export_success', { count: dataToExport.length }));
  };

  // Export data to CSV
  const exportToCSV = () => {
    const dataToExport = selectedRowKeys.length > 0
      ? reactions.filter(r => selectedRowKeys.includes(r.userId))
      : reactions;
      
    if (dataToExport.length === 0) {
      messageApi.warning(t('no_data_to_export'));
      return;
    }
    
    const csvData = dataToExport.map(r =>
      `"${r.userId}","${r.userName}","${r.reactionType}","${moment(r.reactionDate).format('YYYY-MM-DD HH:mm:ss')}"`
    );
    
    csvData.unshift(`"${t('user_id')}","${t('user_name')}","${t('reaction_type')}","${t('reaction_date')}"`);
    const csvContent = csvData.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reactions_${postId}_${moment().format('YYYYMMDD_HHmmss')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    messageApi.success(t('export_success', { count: dataToExport.length }));
  };

  // Save current extraction
  const handleSaveExtraction = () => {
    if (reactions.length === 0) {
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
      count: reactions.length,
      reactions: [...reactions]
    };
    
    setSavedExtractions([...savedExtractions, newSavedExtraction]);
    setSaveModalopen(false);
    setExtractionName('');
    messageApi.success(t('extraction_saved_success'));
  };

  // Load saved extraction
  const loadSavedExtraction = (saved) => {
    debugLog('Loading saved extraction:', saved);
    setReactions(saved.reactions);
    setPostId(saved.postId);
    setActiveTab('current');
    messageApi.success(t('extraction_loaded_success'));
  };

  // Delete saved extraction
  const deleteSavedExtraction = (id) => {
    Modal.confirm({
      title: t('confirm_delete'),
      content: t('confirm_delete_extraction'),
      okText: t('yes'),
      cancelText: t('no'),
      onOk: () => {
        setSavedExtractions(savedExtractions.filter(s => s.id !== id));
        messageApi.success(t('extraction_deleted_success'));
      }
    });
  };

  // Table pagination configuration
  const paginationConfig = {
    showSizeChanger: true,
    showQuickJumper: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    showTotal: (total) => t('total_reactions_count', { count: total })
  };

  // Enhanced stats cards with reaction counts by type
  const statsCards = [
    { 
      title: t('total_reactions'), 
      value: reactions.length, 
      color: '#1890ff', 
      icon: <ThunderboltOutlined style={{ fontSize: '24px' }} />
    },
    { 
      title: 'LIKE', 
      value: reactions.filter(r => r.reactionType === 'LIKE').length, 
      color: getReactionColor('LIKE'), 
      icon: <LikeOutlined style={{ fontSize: '24px' }} />
    },
    { 
      title: 'LOVE', 
      value: reactions.filter(r => r.reactionType === 'LOVE').length, 
      color: getReactionColor('LOVE'), 
      icon: <HeartOutlined style={{ fontSize: '24px' }} />
    },
    { 
      title: 'CARE', 
      value: reactions.filter(r => r.reactionType === 'CARE').length, 
      color: getReactionColor('CARE'), 
      icon: <HeartOutlined style={{ fontSize: '24px' }} />
    },
    { 
      title: 'HAHA', 
      value: reactions.filter(r => r.reactionType === 'HAHA').length, 
      color: getReactionColor('HAHA'), 
      icon: <SmileOutlined style={{ fontSize: '24px' }} />
    },
    { 
      title: 'WOW', 
      value: reactions.filter(r => r.reactionType === 'WOW').length, 
      color: getReactionColor('WOW'), 
      icon: <ExclamationCircleOutlined style={{ fontSize: '24px' }} />
    },
    { 
      title: 'SAD', 
      value: reactions.filter(r => r.reactionType === 'SAD').length, 
      color: getReactionColor('SAD'), 
      icon: <FrownOutlined style={{ fontSize: '24px' }} />
    },
    { 
      title: 'ANGRY', 
      value: reactions.filter(r => r.reactionType === 'ANGRY').length, 
      color: getReactionColor('ANGRY'), 
      icon: <ThunderboltOutlined style={{ fontSize: '24px' }} />
    },
    { 
      title: t('unique_users'), 
      value: [...new Set(reactions.map(r => r.userId))].length, 
      color: '#13c2c2', 
      icon: <UserOutlined style={{ fontSize: '24px' }} />
    }
  ];

  // Define tab items
  const tabItems = [
    {
      key: 'current',
      label: (<span><ThunderboltOutlined className="tab-icon" />{t('extract_reactions')}</span>),
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
              onClick={handleExtractReactions}
              disabled={loading || loadingReactions}
            >
              {loading || loadingReactions ? <LoadingOutlined /> : <ReloadOutlined />}
              <span>{t('extract_reactions_button')}</span>
            </Button>
            <Button
              onClick={handleSaveExtraction}
              disabled={reactions.length === 0}
              icon={<SaveOutlined />}
              className="secondary-button"
            >
              {t('save_extraction')}
            </Button>
          </div>

          {showProgress && (
            <div className="progress-container">
              <div className="progress-header">
                <span>{t('extracting_reactions')}</span>
                <span className="progress-count">{extractedCount} / {totalReactions}</span>
              </div>
              <Progress
                percent={progress}
                status={loadingReactions ? "active" : "normal"}
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

          {reactions.length > 0 && (
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
                  placeholder={t('search_user_placeholder')}
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
              <Select
                className="filter-select"
                placeholder={t('filter_by_type')}
                allowClear
                value={filterType || undefined}
                onChange={(value) => setFilterType(value || '')}
                style={{ width: 150, marginLeft: 12 }}
              >
                {reactionTypes.map(type => (
                  <Option key={type} value={type}>
                    <span>
                      {getReactionIcon(type)} {type}
                    </span>
                  </Option>
                ))}
              </Select>
            </div>
            <div className="filter-export">
              <Space>
                <Dropdown 
                  menu={{
                    items: [
                      {
                        key: 'excel',
                        label: t('export_excel'),
                        icon: <FileExcelOutlined style={{ color: '#217346' }} />,
                        onClick: exportToExcel,
                      },
                      {
                        key: 'csv',
                        label: t('export_csv'),
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
                    <ThunderboltOutlined className="primary-icon" />
                    {t('extracted_reactions', { count: filteredReactions.length })}
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
                    {t('deselect_all')}
                  </Button>
                </Space>
              </div>
            </div>

            {loadingReactions ? (
              <ShimmerEffect type="table" rows={5} columnCount={6} />
            ) : (
              <Table
                className="reactions-table"
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
                dataSource={filteredReactions}
                rowKey="userId"
                loading={loading}
                onChange={handleReactionsTableChange}
                pagination={{
                  current: reactionsPage,
                  pageSize: reactionsPageSize,
                  ...paginationConfig,
                  showTotal: (total) => {
                    const start = reactionsPage > 0 ? ((reactionsPage - 1) * reactionsPageSize) + 1 : 0;
                    const end = Math.min(reactionsPage * reactionsPageSize, total);
                    return t('pagination_display', { start, end, total });
                  },
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
      label: (<span><FolderOpenOutlined className="tab-icon" />{t('saved_extractions')}</span>),
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
                  title: t('reactions_count'),
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
        title={t('reaction_extractor_title')}
        description={t('reaction_extractor_description')}
        canonicalUrl="https://xelo.tools/reaction-extractor"
        additionalMetaTags={[
          { name: 'keywords', content: t('reaction_extractor_keywords') }
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
              title={t('save_extraction')}
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

export default ReactionExtractor;