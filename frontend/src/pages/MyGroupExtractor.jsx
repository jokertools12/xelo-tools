import React, { useState, useEffect } from 'react';
import { 
  Layout, Input, Button, Table, Alert, Progress, Space, Card, Tooltip, 
  Dropdown, Menu, Modal, Tabs, Tag, Select, message as antMessage, Spin
} from 'antd';
import ContentContainer from '../components/ContentContainer';
import ShimmerEffect from '../components/ShimmerEffect';
import { useLanguage } from '../context/LanguageContext';
import {
  LoadingOutlined, DownloadOutlined, FileExcelOutlined, FilePdfOutlined, SearchOutlined,
  SaveOutlined, ReloadOutlined, InfoCircleOutlined, SendOutlined, TeamOutlined,
  UserOutlined, BarChartOutlined, LinkOutlined, CheckCircleOutlined, RightCircleOutlined,
  CloseOutlined, FolderOpenOutlined, MessageOutlined, EyeOutlined, ThunderboltOutlined,
  GroupOutlined, UnorderedListOutlined, ShareAltOutlined, ApartmentOutlined, CopyOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import moment from 'moment';
import axios from 'axios';
import DataSecret from '../components/DataSecret';
import { useUser } from '../context/UserContext';
import { useMessage } from '../context/MessageContext';
import './MyGroupExtractor.css';

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

const MyGroupExtractor = () => {
  const { user } = useUser();
  const { messageApi } = useMessage();
  const { t } = useLanguage();
  
  // State variables for groups
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groupsPage, setGroupsPage] = useState(1);
  const [groupsPageSize, setGroupsPageSize] = useState(10);
  const [isDataSecretopen, setIsDataSecretopen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [progress, setProgress] = useState(0);
  const [totalGroups, setTotalGroups] = useState(0);
  const [extractedCount, setExtractedCount] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [savedExtractions, setSavedExtractions] = useState([]);
  const [saveModalopen, setSaveModalopen] = useState(false);
  const [extractionName, setExtractionName] = useState('');
  const [activeTab, setActiveTab] = useState('groups');
  const [activeAccessToken, setActiveAccessToken] = useState('');
  const [fetchingToken, setFetchingToken] = useState(false);
  
  // State variables for posts
  const [groupId, setGroupId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [selectedPostKeys, setSelectedPostKeys] = useState([]);
  const [postsPage, setPostsPage] = useState(1);
  const [postsPageSize, setPostsPageSize] = useState(10);
  const [postProgress, setPostProgress] = useState(0);
  const [totalPosts, setTotalPosts] = useState(0);
  const [extractedPostCount, setExtractedPostCount] = useState(0);
  const [showPostProgress, setShowPostProgress] = useState(false);
  const [extractingPosts, setExtractingPosts] = useState(false);
  const [isPostExtractionPaused, setIsPostExtractionPaused] = useState(false);
  const [postExtractionCompleted, setPostExtractionCompleted] = useState(false);
  const [forceStopPostExtraction, setForceStopPostExtraction] = useState(false);
  
  // State variables for members
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedMemberKeys, setSelectedMemberKeys] = useState([]);
  const [membersPage, setMembersPage] = useState(1);
  const [membersPageSize, setMembersPageSize] = useState(10);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [isMemberExtractionPaused, setIsMemberExtractionPaused] = useState(true);
  const [extractingMembers, setExtractingMembers] = useState(false);
  const [lastExtractionCursor, setLastExtractionCursor] = useState(""); // Store last cursor for fast resume
  
  // Extract members modal
  const [extractMembersModalVisible, setExtractMembersModalVisible] = useState(false);
  const [selectedGroupsForMembers, setSelectedGroupsForMembers] = useState([]);
  
  // Extract posts from multiple groups
  const [extractPostsModalVisible, setExtractPostsModalVisible] = useState(false);
  const [selectedGroupsForPosts, setSelectedGroupsForPosts] = useState([]);
  const [currentPostGroupIndex, setCurrentPostGroupIndex] = useState(0);
  const [multiGroupPostExtractionActive, setMultiGroupPostExtractionActive] = useState(false);
  
  // State for transferring group IDs to AutoPostGroup
  const [transferGroupModalVisible, setTransferGroupModalVisible] = useState(false);
  const [transferToCommentModalVisible, setTransferToCommentModalVisible] = useState(false);
  const [transferToReactionModalVisible, setTransferToReactionModalVisible] = useState(false);
  
  // Monitor multi-group post extraction progress
  useEffect(() => {
    if (multiGroupPostExtractionActive && !loadingPosts && postExtractionCompleted) {
      // Check if there are more groups to process
      if (currentPostGroupIndex < selectedGroupsForPosts.length - 1) {
        // Wait a bit before moving to the next group
        const timer = setTimeout(() => {
          // Increment the index after the current group is complete
          setCurrentPostGroupIndex(prevIndex => prevIndex + 1);
          // Process the next group
          processNextGroupForPosts();
        }, 2000);
        
        return () => clearTimeout(timer);
      } else {
        // All groups have been processed
        setMultiGroupPostExtractionActive(false);
        messageApi.success(`تم استخراج المنشورات من جميع المجموعات المحددة (${posts.length} منشور)`);
      }
    }
  }, [multiGroupPostExtractionActive, postExtractionCompleted, loadingPosts, currentPostGroupIndex, selectedGroupsForPosts.length, posts.length]);
  
  // Fetch active access token when component mounts
  useEffect(() => {
    const loadToken = async () => {
      try {
        debugLog('Fetching active access token on component mount');
        const token = await fetchActiveAccessToken();
        if (token) {
          debugLog('Access token loaded successfully:', token.substring(0, 10) + '...');
        } else {
          debugLog('No active access token found');
        }
      } catch (error) {
        debugLog('Error fetching token on mount:', error);
      }
    };
    
    loadToken();
  }, []);

  // Debug state updates
  useEffect(() => {
    debugLog('Groups state updated:', groups.length, groups);
  }, [groups]);
  
  useEffect(() => {
    debugLog('Posts state updated:', posts.length, posts);
  }, [posts]);
  
  useEffect(() => {
    debugLog('Members state updated:', members.length, members);
  }, [members]);
  
  // Filter groups based on search text
  const filteredGroups = groups.filter(group => {
    const matchesSearch = searchText
      ? (
          group?.name?.toLowerCase().includes(searchText.toLowerCase()) ||
          group?.groupId?.toLowerCase().includes(searchText.toLowerCase())
        )
      : true;
    return matchesSearch;
  });
  
  // Filter posts based on search text
  const filteredPosts = posts.filter(post => {
    const matchesSearch = searchText
      ? (
          post?.message?.toLowerCase().includes(searchText.toLowerCase()) ||
          post?.postId?.toLowerCase().includes(searchText.toLowerCase())
        )
      : true;
    return matchesSearch;
  });
  
  // Filter members based on search text
  const filteredMembers = members.filter(member => {
    const matchesSearch = searchText
      ? (
          member?.name?.toLowerCase().includes(searchText.toLowerCase()) ||
          member?.userId?.toLowerCase().includes(searchText.toLowerCase())
        )
      : true;
    return matchesSearch;
  });
  
  // Groups table columns
  const groupsColumns = [
    {
      title: '#',
      key: 'index',
      width: 60,
      align: 'center',
      render: (text, record, index) => (groupsPage - 1) * groupsPageSize + index + 1,
    },
    {
      title: t('group_id'),
      dataIndex: 'groupId',
      key: 'groupId',
      width: 150,
      ellipsis: true,
      sorter: (a, b) => a.groupId.localeCompare(b.groupId),
      render: (groupId) => (
        <a href={`https://facebook.com/groups/${groupId}`} target="_blank" rel="noopener noreferrer">
          {groupId}
        </a>
      ),
    },
    {
      title: t('group_name'),
      dataIndex: 'name',
      key: 'name',
      width: 250,
      ellipsis: true,
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: t('group_privacy'),
      dataIndex: 'privacy',
      key: 'privacy',
      width: 120,
      render: (privacy) => {
        if (!privacy) return '-';
        
        if (privacy === 'OPEN') {
          return <Tag color="green">{t('public')}</Tag>;
        } else if (privacy === 'CLOSED') {
          return <Tag color="blue">{t('closed')}</Tag>;
        } else if (privacy === 'SECRET') {
          return <Tag color="red">{t('secret')}</Tag>;
        } else {
          return <Tag>{privacy}</Tag>;
        }
      },
    },
    {
      title: t('member_count'),
      dataIndex: 'member_count',
      key: 'member_count',
      width: 120,
      render: (count) => count || '-',
      sorter: (a, b) => {
        const countA = a.member_count || 0;
        const countB = b.member_count || 0;
        return countA - countB;
      },
    },
    {
      title: t('actions'),
      key: 'actions',
      width: 240,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title={t('view_posts')}>
            <Button
              type="text"
              size="small"
              icon={<UnorderedListOutlined />}
              onClick={() => {
                setGroupId(record.groupId);
                setGroupName(record.name);
                setActiveTab('posts');
                fetchGroupPosts(record.groupId);
              }}
            />
          </Tooltip>
          <Tooltip title={t('extract_members')}>
            <Button
              type="text"
              size="small"
              icon={<TeamOutlined />}
              onClick={() => {
                // First clear any active focus which may be causing tab switching issues
                if (document.activeElement) {
                  document.activeElement.blur();
                }
                
                // First prepare all extraction variables
                const targetGroupId = record.groupId;
                const targetGroupName = record.name;
                
                // Clear any existing data and reset extraction state variables
                setMembers([]);
                setCurrentGroupIndex(0);
                
                // Important: Set these flags before tab change to ensure they persist
                setIsMemberExtractionPaused(false);
                setExtractingMembers(true);
                
                // Store group info
                setGroupId(targetGroupId);
                setGroupName(targetGroupName);
                
                // Navigate to members tab manually to force a proper tab change
                const membersTabElement = document.getElementById('rc-tabs-0-tab-members');
                if (membersTabElement) {
                  membersTabElement.click();
                } else {
                  // Fallback to regular tab change if element not found
                  setActiveTab('members');
                }
                
                // Add a longer delay and use requestAnimationFrame to ensure UI updates complete
                // before starting extraction - critical for proper rendering cycle
                setTimeout(() => {
                  requestAnimationFrame(() => {
                    // Force these state variables again to ensure they remain set correctly
                    setIsMemberExtractionPaused(false);
                    setExtractingMembers(true);
                    
                    if (debugMode) {
                      console.log("Starting member extraction with state:", {
                        isPaused: false,
                        extracting: true,
                        groupId: targetGroupId,
                        tabActive: 'members'
                      });
                    }
                    
                    // Now start the extraction process
                    fetchGroupMembers(targetGroupId, targetGroupName);
                  });
                }, 800);
              }}
            />
          </Tooltip>
          <Tooltip title={t('post_to_group')}>
            <Button
              type="text"
              size="small"
              icon={<SendOutlined />}
              onClick={() => {
                setSelectedRowKeys([record.groupId]);
                setTransferGroupModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title={t('copy_id')}>
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => {
                navigator.clipboard.writeText(record.groupId).then(() => {
                  messageApi.success(t('group_id_copied'));
                }).catch(err => {
                  console.error('Error copying group ID:', err);
                  messageApi.error(t('failed_to_copy_group_id'));
                });
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];
  
  // Posts table columns
  const postsColumns = [
    {
      title: '#',
      key: 'index',
      width: 60,
      align: 'center',
      render: (text, record, index) => (postsPage - 1) * postsPageSize + index + 1,
    },
    {
      title: t('post_id'),
      dataIndex: 'postId',
      key: 'postId',
      width: 150,
      ellipsis: true,
      sorter: (a, b) => a.postId.localeCompare(b.postId),
      render: (postId) => (
        <a href={`https://facebook.com/${postId}`} target="_blank" rel="noopener noreferrer">
          {postId}
        </a>
      ),
    },
    {
      title: t('post_content'),
      dataIndex: 'message',
      key: 'message',
      width: 300,
      ellipsis: true,
      render: (message) => message || t('no_text'),
    },
    {
      title: t('post_type'),
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type) => {
        switch(type) {
          case 'status':
            return <Tag color="blue">{t('text')}</Tag>;
          case 'photo':
            return <Tag color="green">{t('photo')}</Tag>;
          case 'video':
            return <Tag color="purple">{t('video')}</Tag>;
          case 'link':
            return <Tag color="orange">{t('link')}</Tag>;
          default:
            return <Tag>{type}</Tag>;
        }
      },
    },
    {
      title: t('reactions'),
      dataIndex: 'reactions',
      key: 'reactions',
      width: 100,
      render: (reactions) => reactions?.summary?.total_count || 0,
      sorter: (a, b) => (a.reactions?.summary?.total_count || 0) - (b.reactions?.summary?.total_count || 0),
    },
    {
      title: t('comments'),
      dataIndex: 'comments',
      key: 'comments',
      width: 100,
      render: (comments) => comments?.summary?.total_count || 0,
      sorter: (a, b) => (a.comments?.summary?.total_count || 0) - (b.comments?.summary?.total_count || 0),
    },
    {
      title: t('post_date'),
      dataIndex: 'created_time',
      key: 'created_time',
      width: 150,
      render: (created_time) => moment(created_time).format('YYYY-MM-DD HH:mm'),
      sorter: (a, b) => moment(a.created_time).diff(moment(b.created_time)),
    },
    {
      title: t('actions'),
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title={t('view_commenters')}>
            <Button
              type="text"
              size="small"
              icon={<MessageOutlined />}
              onClick={() => {
                setSelectedPostKeys([record.postId]);
                setTransferToCommentModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title={t('view_reactors')}>
            <Button
              type="text"
              size="small"
              icon={<ThunderboltOutlined />}
              onClick={() => {
                setSelectedPostKeys([record.postId]);
                setTransferToReactionModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title={t('open_post')}>
            <Button
              type="text"
              size="small"
              icon={<LinkOutlined />}
              onClick={() => {
                window.open(`https://facebook.com/${record.postId}`, '_blank');
              }}
            />
          </Tooltip>
          <Tooltip title={t('copy_id')}>
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => {
                navigator.clipboard.writeText(record.postId).then(() => {
                  messageApi.success(t('post_id_copied'));
                }).catch(err => {
                  console.error('Error copying post ID:', err);
                  messageApi.error(t('failed_to_copy_post_id'));
                });
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];
  
  // Members table columns
  const membersColumns = [
    {
      title: '#',
      key: 'index',
      width: 60,
      align: 'center',
      render: (text, record, index) => (membersPage - 1) * membersPageSize + index + 1,
    },
    {
      title: t('user_id'),
      dataIndex: 'userId',
      key: 'userId',
      width: 150,
      ellipsis: true,
      sorter: (a, b) => a.userId.localeCompare(b.userId),
      render: (userId) => (
        <a href={`https://facebook.com/${userId}`} target="_blank" rel="noopener noreferrer">
          {userId}
        </a>
      ),
    },
    {
      title: t('user_name'),
      dataIndex: 'name',
      key: 'name',
      width: 200,
      ellipsis: true,
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: t('group'),
      dataIndex: 'groupName',
      key: 'groupName',
      width: 150,
      ellipsis: true,
    },
    {
      title: t('group_id'),
      dataIndex: 'groupId',
      key: 'groupId',
      width: 150,
      ellipsis: true,
    },
    {
      title: t('extraction_time'),
      dataIndex: 'extractedAt',
      key: 'extractedAt',
      width: 150,
      render: (extractedAt) => moment(extractedAt).format('YYYY-MM-DD HH:mm'),
      sorter: (a, b) => moment(a.extractedAt).diff(moment(b.extractedAt)),
    },
    {
      title: t('actions'),
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title={t('view_user_profile')}>
            <Button
              type="text"
              size="small"
              icon={<InfoCircleOutlined />}
              onClick={() => {
                setSelectedMemberKeys([record.userId]);
                setIsDataSecretopen(true);
              }}
            />
          </Tooltip>
          <Tooltip title={t('copy_id')}>
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => {
                navigator.clipboard.writeText(record.userId).then(() => {
                  messageApi.success(t('user_id_copied'));
                }).catch(err => {
                  console.error('Error copying user ID:', err);
                  messageApi.error(t('failed_to_copy_user_id'));
                });
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];
  
  // Fetch active access token
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
  
  // Fetch user's groups from Facebook
  const fetchGroups = async () => {
    if (loadingGroups) return;
    
    setLoadingGroups(true);
    setError('');
    setGroups([]);
    setShowProgress(true);
    setProgress(0);
    setExtractedCount(0);
    setTotalGroups(0);
    
    try {
      // Check if we have an active access token
      if (!activeAccessToken) {
        // Try to get the active access token
        messageApi.loading(t('checking_access_token'), 1);
        const newToken = await fetchActiveAccessToken();
        if (!newToken) {
          messageApi.error(t('no_active_token_please_add'));
          setLoadingGroups(false);
          setShowProgress(false);
          return;
        }
      }
      
      messageApi.loading(t('extracting_groups'), 1);
      
      // Fetch groups from Facebook Graph API - explicitly set limit to 100
      // Using full URL for proper extraction
      const url = `/v18.0/me/groups?fields=id,name,privacy,member_count&access_token=${activeAccessToken}&limit=100`;
      
      debugLog('Fetching groups with full URL:', url);
      
      const fetchGroupsData = async (url, allGroups = []) => {
        try {
          debugLog('Fetching groups from URL:', url);
          const response = await fetch(url);
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          let data;
          try {
            data = await response.json();
            debugLog('Received groups data:', data.data?.length || 0, 'groups');
          } catch (jsonError) {
            debugLog('Error parsing JSON:', jsonError);
            throw new Error('فشل في تحليل البيانات المستلمة');
          }
          
          if (data.error) {
            debugLog('API error:', data.error);
            throw new Error(data.error.message);
          }
          
          if (!data.data || !Array.isArray(data.data)) {
            debugLog('Invalid data structure:', data);
            throw new Error('تنسيق البيانات غير صالح');
          }
          
          // Set total count if this is the first request
          if (allGroups.length === 0 && data.summary?.total_count) {
            const totalCount = data.summary.total_count;
            debugLog('Setting total groups count from summary:', totalCount);
            setTotalGroups(totalCount);
          } else if (allGroups.length === 0 && data.data) {
            // If no total_count provided, make an educated guess based on current batch
            // If we got 100 items, there's likely more
            const estimatedTotal = data.data.length === 100 ? data.data.length * 3 : data.data.length;
            debugLog('Estimating total groups:', estimatedTotal);
            setTotalGroups(estimatedTotal);
          }
          
          // Process groups
          const processedGroups = data.data.map(group => ({
            key: group.id,
            groupId: group.id,
            name: group.name,
            privacy: group.privacy,
            member_count: group.member_count,
            extractedAt: new Date().toISOString()
          }));
          
          debugLog(`Processed ${processedGroups.length} groups from current batch`);
          
          // Update groups state
          const newTotalGroups = [...allGroups, ...processedGroups];
          setGroups(newTotalGroups);
          setExtractedCount(newTotalGroups.length);
          
          if (totalGroups > 0) {
            const progressPercentage = Math.min(Math.round((newTotalGroups.length / totalGroups) * 100), 100);
            setProgress(progressPercentage);
            debugLog('Updated progress to', progressPercentage, '%');
          }
          
          // Handle pagination properly
          if (data.paging?.next) {
            debugLog('Found next page URL:', data.paging.next);
            
            // Extract the 'after' cursor if present
            try {
              const nextUrl = new URL(data.paging.next);
              const afterCursor = nextUrl.searchParams.get('after');
              
              if (afterCursor) {
                debugLog('Extracted after cursor:', afterCursor);
                
                // Build a proper pagination URL that works with proxies if needed
                const originalUrlObj = new URL(url.startsWith('http') ? url : `${window.location.origin}${url}`);
                originalUrlObj.searchParams.set('after', afterCursor);
                
                const nextPageUrl = url.startsWith('http') ? 
                  originalUrlObj.toString() : 
                  `${originalUrlObj.pathname}${originalUrlObj.search}`;
                
                debugLog('Constructed next page URL:', nextPageUrl);
                
                // Add a delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Call fetchGroupsData with the new pagination URL
                return await fetchGroupsData(nextPageUrl, newTotalGroups);
              }
            } catch (paginationError) {
              debugLog('Error processing pagination:', paginationError);
              
              // Fallback to using the direct next URL if available
              debugLog('Trying direct next URL as fallback');
              await new Promise(resolve => setTimeout(resolve, 1000));
              return await fetchGroupsData(data.paging.next, newTotalGroups);
            }
          } else {
            debugLog('No more pages available, completed fetching all groups');
          }
          
          return newTotalGroups;
        } catch (error) {
          throw error;
        }
      };
      
      const extractedGroups = await fetchGroupsData(url, []);
      
      if (extractedGroups.length > 0) {
        setProgress(100);
        messageApi.success(t('groups_extracted_successfully', { count: extractedGroups.length }));
      } else {
        messageApi.warning(t('no_groups_found'));
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      setError(`فشل في استخراج المجموعات: ${error.message}`);
      messageApi.error(`فشل في استخراج المجموعات: ${error.message}`);
    } finally {
      setLoadingGroups(false);
      setShowProgress(false);
    }
  };
  
  // Fetch posts from a specific group with enhanced error handling and rate limiting
  const fetchGroupPosts = async (groupId, retryCount = 0) => {
    if (!groupId) {
      messageApi.error(t('please_select_group'));
      return;
    }
    
    // Reset global termination flags
    window.stopExtraction = false;
    hardTerminationRef.current = false;
    
    // Reset post-related state while preserving posts in multi-group mode
    setLoadingPosts(true);
    setError('');
    setPostProgress(0);
    setTotalPosts(0);
    setExtractedPostCount(0);
    setShowPostProgress(true);
    setExtractingPosts(true);
    setIsPostExtractionPaused(false);
    setPostExtractionCompleted(false);
    setForceStopPostExtraction(false);
    
    // Only clear posts if not in multi-group mode
    if (!multiGroupPostExtractionActive) {
      setPosts([]);
    }

    // Create a new abort controller for this extraction
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    // Rate limiting configuration
    const rateLimitConfig = {
      minDelay: 1500,  // Minimum delay between requests
      maxDelay: 3000,  // Maximum delay between requests
      backoffFactor: 2, // Factor to increase delay on errors
      maxRetries: 3     // Maximum number of retries
    };

    // Helper function to implement rate limiting
    const getRateLimitDelay = (retryCount = 0) => {
      const baseDelay = rateLimitConfig.minDelay;
      const randomDelay = Math.random() * (rateLimitConfig.maxDelay - rateLimitConfig.minDelay);
      const retryDelay = retryCount > 0 ? Math.pow(rateLimitConfig.backoffFactor, retryCount - 1) * baseDelay : 0;
      return baseDelay + randomDelay + retryDelay;
    };

    try {
      // Check if we have an active access token
      if (!activeAccessToken) {
        messageApi.loading(t('checking_access_token'), 1);
        const newToken = await fetchActiveAccessToken();
        if (!newToken) {
          messageApi.error(t('no_active_token_please_add'));
          setLoadingPosts(false);
          return;
        }
      }
      
      messageApi.loading(t('extracting_posts'), 1);
      
      // Enhanced URL construction with error checking
      const baseUrl = `/v18.0/${groupId}/feed`;
      const fields = 'id,message,created_time,type,permalink_url,reactions.summary(true),comments.summary(true)';
      const url = `${baseUrl}?fields=${fields}&access_token=${activeAccessToken}&limit=100`;
      
      debugLog('Fetching posts with enhanced URL:', url);
      
      const fetchPostsData = async (url, allPosts = [], retryCount = 0) => {
        // Check termination flags immediately
        if (forceStopPostExtraction || hardTerminationRef.current) {
          debugLog('Post extraction terminated - fetchPostsData early exit');
          return allPosts;
        }
        
        // Display progress for ongoing extraction
        if (allPosts.length > 0) {
          const msg = `استخراج المزيد من المنشورات (${allPosts.length} حتى الآن)...`;
          messageApi.loading(msg, 1);
          debugLog(msg);
        }
        try {
          debugLog('Fetching posts from URL:', url);
          
          // Use try-catch for fetch to handle network errors
          let response;
          try {
            response = await fetch(url);
            
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
          } catch (fetchError) {
            debugLog('Fetch error:', fetchError);
            
            // Implement retry logic for network errors
            if (retryCount < 3) {
              debugLog(`Retrying (${retryCount + 1}/3) after network error...`);
              // Exponential backoff: wait longer between each retry
              await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, retryCount)));
              return await fetchPostsData(url, allPosts, retryCount + 1);
            }
            
            throw new Error(`فشل في الاتصال: ${fetchError.message}`);
          }
          
          // Parse JSON response with error handling
          let data;
          try {
            data = await response.json();
            debugLog('Received posts data:', data.data?.length || 0, 'posts');
          } catch (jsonError) {
            debugLog('Error parsing JSON:', jsonError);
            
            // Retry on JSON parse errors too
            if (retryCount < 3) {
              debugLog(`Retrying (${retryCount + 1}/3) after JSON parse error...`);
              await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, retryCount)));
              return await fetchPostsData(url, allPosts, retryCount + 1);
            }
            
            throw new Error('فشل في تحليل البيانات المستلمة');
          }
          
          if (data.error) {
            debugLog('API error:', data.error);
            throw new Error(data.error.message);
          }
          
          if (!data.data || !Array.isArray(data.data)) {
            debugLog('Invalid data structure:', data);
            throw new Error('تنسيق البيانات غير صالح');
          }
          
          // Set total count for progress tracking if this is the first request
          if (allPosts.length === 0) {
            // If we got 100 items (max limit), there are likely more
            const estimatedTotal = data.data.length === 100 ? 
              data.data.length * 3 : data.data.length;
            setTotalPosts(estimatedTotal);
            debugLog('Setting estimated total posts count:', estimatedTotal);
          }
          
          try {
            // Validate post data before processing
            if (!Array.isArray(data.data)) {
              throw new Error('Invalid post data format');
            }

                // Process posts with group context and update state atomically
                setPosts(prevPosts => {
                  try {
                    // Get current group's existing posts count
                    const currentGroupPostsCount = prevPosts.filter(p => p.groupIndex === currentPostGroupIndex).length;
                    const previousGroupsPosts = prevPosts.filter(p => p.groupIndex < currentPostGroupIndex);
                    
                    // Process new posts with group context and validation
                    const processedPosts = data.data.map(post => {
                      if (!post.id) {
                        debugLog('Skipping invalid post without ID');
                        return null;
                      }

                      // Create a unique key that includes group context and timestamp
                      const uniqueKey = `${post.id}-${groupId}-${Date.now()}-${currentPostGroupIndex}`;
                      
                      // Calculate progress for this group
                      const currentGroupProgress = Math.round(((currentGroupPostsCount + 1) / (totalPosts || 1)) * 100);
                      const overallProgress = Math.round((currentPostGroupIndex / selectedGroupsForPosts.length) * 100);
                      
                      return {
                        key: uniqueKey,
                        postId: post.id,
                        message: post.message || '',
                        created_time: post.created_time,
                        type: post.type || 'unknown',
                        permalink_url: post.permalink_url,
                        groupId: groupId,
                        groupName: groupName,
                        extractedAt: new Date().toISOString(),
                        fromGroup: currentPostGroupIndex,
                        groupIndex: currentPostGroupIndex,
                        groupOrder: currentPostGroupIndex + 1,
                        totalGroups: selectedGroupsForPosts.length,
                        isCurrentGroup: true,
                        groupInfo: {
                          index: currentPostGroupIndex,
                          total: selectedGroupsForPosts.length,
                          name: groupName,
                          id: groupId,
                          extractionProgress: {
                            current: currentGroupPostsCount + 1,
                            total: totalPosts || 1,
                            groupProgress: currentGroupProgress,
                            overallProgress: overallProgress,
                            postsInGroup: currentGroupPostsCount + 1,
                            totalPostsExtracted: previousGroupsPosts.length + prevPosts.length + 1,
                            previousGroupsPostCount: previousGroupsPosts.length
                          }
                        }
                      };
                    }).filter(Boolean);

                    // Keep existing posts and append new ones, maintaining order
                    const newPosts = [...prevPosts, ...processedPosts];
                
                debugLog(`Group ${currentPostGroupIndex + 1}/${selectedGroupsForPosts.length}: Added ${processedPosts.length} posts`);
                debugLog(`Total posts across all groups: ${newPosts.length}`);
                
                // Calculate progress based on current group's posts with error handling
                const currentGroupPosts = newPosts.filter(p => p.groupIndex === currentPostGroupIndex);
                const currentGroupProgress = Math.min(Math.round((currentGroupPosts.length / (totalPosts || 1)) * 100), 100);
                setPostProgress(currentGroupProgress);
                
                // Update total extraction count
                setExtractedPostCount(prev => prev + processedPosts.length);
                
                // Log group completion status with better formatting
                if (processedPosts.length > 0) {
                  const currentGroup = groups.find(g => g.groupId === groupId);
                  const groupDisplayName = currentGroup?.name || groupName;
                  
                  // Single consolidated notification
                  messageApi.success(
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                        {groupDisplayName}
                      </div>
                      <div>
                        تم استخراج {processedPosts.length} منشور
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        المجموعة {currentPostGroupIndex + 1} من {selectedGroupsForPosts.length}
                      </div>
                    </div>
                  );
                }
                
                // Check stop flags with improved notification
                if (forceStopPostExtraction || hardTerminationRef.current || window.stopExtraction) {
                  debugLog('Post extraction stopped - finalizing');
                  setLoadingPosts(false);
                  setExtractingPosts(false);
                  setPostExtractionCompleted(true);
                  
                  const completedGroups = [...new Set(newPosts.map(p => p.groupId))].length;
                  messageApi.info(
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                        تم إيقاف الاستخراج
                      </div>
                      <div>
                        تم استخراج {newPosts.length} منشور من {completedGroups} مجموعة
                      </div>
                    </div>
                  );
                }
                
                return newPosts;
              } catch (stateError) {
                debugLog('Error updating posts state:', stateError);
                // Preserve existing posts on error
                return prevPosts;
              }
            });
          } catch (processingError) {
            debugLog('Error processing posts:', processingError);
            // Continue with next batch on error
            return allPosts;
          }
          
              // Handle pagination properly with retries
              if (data.paging?.next && !forceStopPostExtraction && !hardTerminationRef.current) {
                debugLog('Found next page for posts:', data.paging.next);
                
                try {
                  // Always convert to relative URL to avoid CORS issues
                  let nextPageUrl = data.paging.next;
                  
                  if (nextPageUrl.startsWith('https://graph.facebook.com')) {
                    // Extract only the path and query parts
                    const urlObj = new URL(nextPageUrl);
                    nextPageUrl = urlObj.pathname + urlObj.search;
                    debugLog('Converted to relative URL for proxy:', nextPageUrl);
                  }
                  
                  // Ensure it starts with /v18.0 for the proxy
                  if (!nextPageUrl.startsWith('/v18.0')) {
                    // Try several ways to fix the URL
                    
                    // Method 1: Extract path from URL if it has /v18.0/ somewhere in it
                    if (nextPageUrl.includes('/v18.0/')) {
                      const parts = nextPageUrl.split('/v18.0/');
                      if (parts.length > 1) {
                        nextPageUrl = '/v18.0/' + parts[1];
                        debugLog('Fixed URL using path extraction:', nextPageUrl);
                      }
                    } 
                    // Method 2: Extract ID and rebuild URL
                    else if (nextPageUrl.includes('/feed') || nextPageUrl.includes('/posts')) {
                      // Try to extract the group/post ID from the URL path
                      const pathParts = nextPageUrl.split('/');
                      let idIndex = -1;
                      
                      // Find numeric ID in the path
                      for (let i = 0; i < pathParts.length; i++) {
                        if (/^\d+$/.test(pathParts[i])) {
                          idIndex = i;
                          break;
                        }
                      }
                      
                      if (idIndex >= 0) {
                        // Extract ID and rebuild URL
                        const id = pathParts[idIndex];
                        const urlObj = new URL('http://placeholder.com' + nextPageUrl);
                        nextPageUrl = `/v18.0/${id}/feed?${urlObj.searchParams.toString()}`;
                        debugLog('Rebuilt URL with extracted ID:', nextPageUrl);
                      }
                    }
                    // Method 3: Default fallback - add /v18.0 prefix
                    else {
                      nextPageUrl = nextPageUrl.startsWith('/') 
                        ? '/v18.0' + nextPageUrl 
                        : '/v18.0/' + nextPageUrl;
                      debugLog('Added v18.0 prefix as fallback:', nextPageUrl);
                    }
                  }
                  
                  // Log the final URL for debugging
                  debugLog('Final pagination URL to use:', nextPageUrl);
              
              // Add a delay to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
              
              // Call fetchPostsData with the proxy-friendly URL
              debugLog('Proceeding to next page with URL:', nextPageUrl);
              return await fetchPostsData(nextPageUrl, allPosts);
            } catch (paginationError) {
              debugLog('Error processing pagination for posts:', paginationError);
              
              // Try to extract just the cursor and rebuild the URL
              try {
                // Extract the 'after' cursor if possible
                const urlObj = new URL(data.paging.next);
                const afterCursor = urlObj.searchParams.get('after');
                
                if (afterCursor) {
                  debugLog('Extracted after cursor for posts:', afterCursor);
                  
                  // Rebuild URL with the original base path but new cursor
                  const urlParts = url.split('?');
                  const baseUrl = urlParts[0];
                  const params = new URLSearchParams(urlParts[1]);
                  params.set('after', afterCursor);
                  
                  const rebuiltUrl = `${baseUrl}?${params.toString()}`;
                  debugLog('Rebuilt pagination URL:', rebuiltUrl);
                  
                  // Add a delay to avoid rate limiting
                  await new Promise(resolve => setTimeout(resolve, 1500));
                  
                  // Call fetchPostsData with the rebuilt URL
                  return await fetchPostsData(rebuiltUrl, allPosts);
                }
              } catch (rebuildError) {
                debugLog('Error rebuilding pagination URL:', rebuildError);
              }
              
              // Last resort: just try using the URL directly with proxy prefix
              const fallbackUrl = data.paging.next.replace('https://graph.facebook.com', '');
              debugLog('Last resort: trying fallback URL:', fallbackUrl);
              await new Promise(resolve => setTimeout(resolve, 2000));
              return await fetchPostsData(fallbackUrl, allPosts);
            }
          } else {
          debugLog('No more pages available, completed fetching all posts');
          }
          
          return allPosts;
        } catch (error) {
          throw error;
        }
      };
      
      const extractedPosts = await fetchPostsData(url, []);
      
      if (extractedPosts.length > 0) {
        if (!forceStopPostExtraction && !hardTerminationRef.current) {
          messageApi.success(t('posts_extracted_successfully', { count: extractedPosts.length }));
        }
      } else {
        messageApi.warning(t('no_posts_found'));
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      setError(`فشل في استخراج المنشورات: ${error.message}`);
      messageApi.error(`فشل في استخراج المنشورات: ${error.message}`);
    } finally {
      setLoadingPosts(false);
      setShowPostProgress(false); // Make sure to reset the progress flag
      if (!forceStopPostExtraction && !hardTerminationRef.current) {
        setPostExtractionCompleted(true);
      }
      setExtractingPosts(false);
    }
  };
  
  // Track the extraction completion state and previous member count
  const [extractionCompleted, setExtractionCompleted] = useState(false);
  const [previousMemberCount, setPreviousMemberCount] = useState(0);
  const [noNewMembersCount, setNoNewMembersCount] = useState(0);
  
  // Special effect to handle continuous extraction - only active during the process
  useEffect(() => {
    // When we're in members tab and extraction is active but not completed, watch for stalls
    if (activeTab === 'members' && extractingMembers && !isMemberExtractionPaused && 
        members.length > 0 && !extractionCompleted && !loadingMembers) {
      
      debugLog('Monitoring extraction process - checking for stalls');
      
      // Set a timer to check if extraction is stuck
      const checkTimer = setTimeout(() => {
        // Only attempt to resume if we're still in an active extraction state
        if (!loadingMembers && groupId && extractingMembers && !isMemberExtractionPaused && !extractionCompleted) {
          debugLog('Detected stalled extraction - attempting to resume');
          // Force call the next page function with the last known state
          fetchGroupMembers(groupId, groupName);
        }
      }, 3000); // Check after 3 seconds of inactivity
      
      return () => clearTimeout(checkTimer);
    }
  }, [activeTab, extractingMembers, isMemberExtractionPaused, members.length, 
      loadingMembers, groupId, groupName, extractionCompleted]);
  
  // Fetch members from a specific group
  const fetchGroupMembers = async (groupId, groupName = '', retryCount = 0) => {
    if (!groupId) {
      messageApi.error('يرجى تحديد مجموعة');
      return;
    }
    
    debugLog(`Starting member extraction for group: ${groupId}, retry: ${retryCount}`);
    
    // Force pause flag to false explicitly and set extraction flag to true
    // This is critical - double-ensure these flags are properly set
    setIsMemberExtractionPaused(false);
    setExtractingMembers(true);
    setLoadingMembers(true);
    setExtractionCompleted(false); // Reset extraction completed flag
    setPreviousMemberCount(members.length); // Set initial previous count
    setNoNewMembersCount(0); // Reset the counter for consecutive no-new-members results
    
    if (!groupName) {
      // Try to find group name from the groups list
      const group = groups.find(g => g.groupId === groupId);
      if (group) {
        setGroupName(group.name);
        groupName = group.name;
      }
    }
    
    try {
      // Check if we have an active access token
      if (!activeAccessToken) {
        // Try to get the active access token
        messageApi.loading('جاري التحقق من رمز الوصول...', 1);
        const newToken = await fetchActiveAccessToken();
        if (!newToken) {
          messageApi.error('لا يوجد رمز وصول نشط. يرجى إضافة رمز وصول من صفحة الحصول على توكن');
          setLoadingMembers(false);
          return;
        }
      }
      
      messageApi.loading('جاري استخراج أعضاء المجموعة...', 1);
      
      // Using the Graph API to get members - use full URL for proper extraction
      const url = `/v18.0/graphql?doc_id=4460078717354812&server_timestamps=true&variables={"cursor":"","groupID":"${groupId}","recruitingGroupFilterNonCompliant":false,"scale":1,"id":"${groupId}"}&fb_api_req_friendly_name=GroupsCometMembersPageNewMembersSectionRefetchQuery&method=post&locale=en_US&pretty=false&format=json&fb_api_caller_class=RelayModern&access_token=${activeAccessToken}`;
      
      debugLog('Fetching members with full URL');
      
      let response;
      try {
        response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } catch (fetchError) {
        debugLog('Fetch error in members extraction:', fetchError);
        
        // Implement retry logic
        if (retryCount < 3) {
          debugLog(`Retrying member extraction (${retryCount + 1}/3)...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, retryCount)));
          return await fetchGroupMembers(groupId, groupName, retryCount + 1);
        }
        
        throw new Error(`فشل في الاتصال: ${fetchError.message}`);
      }
      
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        debugLog('Error parsing member JSON:', jsonError);
        
        if (retryCount < 3) {
          debugLog(`Retrying after JSON parse error (${retryCount + 1}/3)...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, retryCount)));
          return await fetchGroupMembers(groupId, groupName, retryCount + 1);
        }
        
        throw new Error('فشل في تحليل البيانات المستلمة');
      }
      
      const jsonResponse = JSON.stringify(data);
      
      debugLog(`Raw API response received - extracting members with regex`);
      
      // Using regex to extract member data similar to the VB code
      const memberPattern = /"node":\s*{[^}]*"id":\s*"([^"]+)"[^}]*"name":\s*"([^"]+)"[^}]*"__typename":\s*"([^"]+)"/g;
      const matches = [...jsonResponse.matchAll(memberPattern)];
      
      debugLog(`Extracted ${matches.length} potential member matches from API response`);
      
      const processedMembers = [];
      const processedIds = new Set();
      
      // Get existing member IDs to avoid duplicates
      members.forEach(member => processedIds.add(member.userId));
      
      debugLog(`Current unique members in state: ${processedIds.size}`);
      
      for (const match of matches) {
        if (match && match.length >= 4) {
          const memberId = match[1];
          const memberName = match[2];
          const typeName = match[3];
          
          // Avoid adding groups themselves (usually of type "Group")
          if (typeName !== "Group") {
            // Check if the ID is already in the list
            if (!processedIds.has(memberId)) {
              processedIds.add(memberId);
              
              processedMembers.push({
                key: `${memberId}-${Date.now()}`,
                userId: memberId,
                name: memberName,
                groupId: groupId,
                groupName: groupName,
                extractedAt: new Date().toISOString()
              });
            }
          }
        }
      }
      
      // Random batch size between 20 and 100 (similar to VB code)
      // Just for processing display - all members are added to state
      const randomBatchSize = Math.floor(Math.random() * (100 - 20 + 1)) + 20;
      debugLog(`Processing members with random batch size: ${randomBatchSize}`);
      
      // Update members state
      setMembers(prevMembers => [...prevMembers, ...processedMembers]);
      
      if (processedMembers.length > 0) {
        messageApi.success(`تم استخراج ${processedMembers.length} عضو من المجموعة`);
      }
      
      // Check if there's a "has_next_page" in the response - search more aggressively
      const hasNextMatch = jsonResponse.match(/"has_next_page":\s*(true|false)/i);
      let canNext = hasNextMatch && hasNextMatch[1].toLowerCase() === 'true';
      
      // Secondary check for has_next_page to make sure we don't miss it
      if (!hasNextMatch) {
        const secondaryNextCheck = jsonResponse.includes('"has_next_page":true');
        canNext = secondaryNextCheck;
        debugLog(`Primary has_next_page not found, secondary check: ${secondaryNextCheck}`);
      }
      
      debugLog(`Pagination status: has_next_page = ${canNext}`);
      
      if (canNext) {
        // Extract cursor for next page - search more aggressively 
        const cursorMatch = jsonResponse.match(/"end_cursor":\s*"([^"]+)"/i);
        const nextCursor = cursorMatch ? cursorMatch[1] : "";
        
        debugLog(`Next cursor extracted: ${nextCursor ? (nextCursor.substring(0, 15) + '...') : 'NONE'}`);
        
        if (nextCursor && !isMemberExtractionPaused) {
          messageApi.info(`استخراج المزيد من الأعضاء... (${members.length + processedMembers.length} حتى الآن)`);
          
          // Schedule the next fetch after a short delay
          debugLog(`Scheduling next page fetch in 2 seconds`);
          setTimeout(() => {
            fetchNextGroupMembersPage(groupId, groupName, nextCursor);
          }, 2000);
        } else {
          debugLog(`Not fetching next page: cursor missing or extraction paused`);
          setLoadingMembers(false);
        }
      } else {
        setLoadingMembers(false);
      }
    } catch (error) {
      console.error('Error fetching group members:', error);
      setError(`فشل في استخراج أعضاء المجموعة: ${error.message}`);
      messageApi.error(`فشل في استخراج أعضاء المجموعة: ${error.message}`);
      setLoadingMembers(false);
    }
  };
  
  // Fetch next page of group members
  const fetchNextGroupMembersPage = async (groupId, groupName, cursor, retryCount = 0) => {
    // ENHANCED IMMEDIATE EXIT: Multiple checks to ensure we stop when requested
    // Check for any termination condition and exit immediately if found
    if (!groupId || isMemberExtractionPaused || extractionCompleted || !extractingMembers || 
        forceStopExtraction || hardTerminationRef.current) {
      console.log('Extraction halted:', {
        paused: isMemberExtractionPaused,
        completed: extractionCompleted,
        extracting: extractingMembers,
        forceStopped: forceStopExtraction,
        hardTermination: hardTerminationRef.current
      });
      setLoadingMembers(false);
      return;
    }
    
    // Super immediate exit check - stop all work if terminated
    if (window.stopExtraction || window.pauseExtraction) {
      console.log('Global extraction flags triggered halt:', {
        stopExtraction: window.stopExtraction,
        pauseExtraction: window.pauseExtraction
      });
      setLoadingMembers(false);
      return;
    }
    
    // Store current member count before fetching more
    const currentMemberCount = members.length;
    
    try {
      // Using the Graph API to get members with cursor - ensure we use relative path for proxy compatibility
      const url = `/v18.0/graphql?doc_id=4460078717354812&server_timestamps=true&variables={"cursor":"${cursor}","groupID":"${groupId}","recruitingGroupFilterNonCompliant":false,"scale":1,"id":"${groupId}"}&fb_api_req_friendly_name=GroupsCometMembersPageNewMembersSectionRefetchQuery&method=post&locale=en_US&pretty=false&format=json&fb_api_caller_class=RelayModern&access_token=${activeAccessToken}`;
      
      debugLog(`Fetching next page of members with cursor: ${cursor.substring(0, 15)}...`);
      
      let response;
      try {
        debugLog('Member pagination API call to: ' + url);
        response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } catch (fetchError) {
        debugLog('Fetch error in next page members extraction:', fetchError);
        
        // Implement retry logic
        if (retryCount < 3) {
          debugLog(`Retrying next page member extraction (${retryCount + 1}/3)...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, retryCount)));
          return await fetchNextGroupMembersPage(groupId, groupName, cursor, retryCount + 1);
        }
        
        throw new Error(`فشل في الاتصال: ${fetchError.message}`);
      }
      
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        debugLog('Error parsing next page member JSON:', jsonError);
        
        if (retryCount < 3) {
          debugLog(`Retrying after JSON parse error (${retryCount + 1}/3)...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, retryCount)));
          return await fetchNextGroupMembersPage(groupId, groupName, cursor, retryCount + 1);
        }
        
        throw new Error('فشل في تحليل البيانات المستلمة');
      }
      
      const jsonResponse = JSON.stringify(data);
      
      // Using regex to extract member data similar to the VB code
      const memberPattern = /"node":\s*{[^}]*"id":\s*"([^"]+)"[^}]*"name":\s*"([^"]+)"[^}]*"__typename":\s*"([^"]+)"/g;
      const matches = [...jsonResponse.matchAll(memberPattern)];
      
      debugLog(`Found ${matches.length} potential members in this batch`);
      
      const processedMembers = [];
      const processedIds = new Set();
      
      // Get existing member IDs to avoid duplicates
      members.forEach(member => processedIds.add(member.userId));
      
      for (const match of matches) {
        if (match && match.length >= 4) {
          const memberId = match[1];
          const memberName = match[2];
          const typeName = match[3];
          
          // Avoid adding groups themselves (usually of type "Group")
          if (typeName !== "Group") {
            // Check if the ID is already in the list
            if (!processedIds.has(memberId)) {
              processedIds.add(memberId);
              
              processedMembers.push({
                key: `${memberId}-${Date.now()}`,
                userId: memberId,
                name: memberName,
                groupId: groupId,
                groupName: groupName,
                extractedAt: new Date().toISOString()
              });
            }
          }
        }
      }
      
      // Random batch size between 20 and 100 (similar to VB code)
      const randomBatchSize = Math.floor(Math.random() * (100 - 20 + 1)) + 20;
      debugLog(`Processing ${processedMembers.length} new members with batch size: ${randomBatchSize}`);
      
      // Update members state
      setMembers(prevMembers => {
        const newTotal = [...prevMembers, ...processedMembers];
        debugLog(`Total members now: ${newTotal.length}`);
        return newTotal;
      });
      
      // Check if the member count increased
      if (processedMembers.length === 0 || members.length === previousMemberCount) {
        // No new members were added in this batch
        const newNoNewMembersCount = noNewMembersCount + 1;
        setNoNewMembersCount(newNoNewMembersCount);
        debugLog(`No new members added in this batch. Consecutive count: ${newNoNewMembersCount}`);
        
        // If we've had multiple consecutive attempts with no new members, stop extraction
        if (newNoNewMembersCount >= 2) {
          debugLog('No new members found after multiple attempts. Marking extraction as completed.');
          setExtractionCompleted(true);
          setLoadingMembers(false);
          setExtractingMembers(false);
          messageApi.success(`تم اكتمال استخراج الأعضاء (${members.length} عضو)`);
          return;
        }
      } else {
        // Reset the counter if we found new members
        setNoNewMembersCount(0);
        setPreviousMemberCount(members.length);
      }
      
      // Multiple checks for pagination information
      // Primary check - standard has_next_page
      const hasNextMatch = jsonResponse.match(/"has_next_page":\s*(true|false)/i);
      let canNext = hasNextMatch && hasNextMatch[1].toLowerCase() === 'true';
      
      // Secondary check - direct inclusion
      if (!hasNextMatch) {
        const secondaryCheck = jsonResponse.includes('"has_next_page":true');
        canNext = secondaryCheck;
        debugLog(`Primary pagination check failed, secondary check: ${secondaryCheck}`);
      }
      
      // Additional check for any end_cursor
      if (!canNext) {
        const anyCursorMatch = jsonResponse.includes('end_cursor');
        if (anyCursorMatch) {
          debugLog('Found end_cursor despite no has_next_page, will attempt to continue');
          canNext = true;
        }
      }
      
      debugLog(`Final pagination decision: canNext = ${canNext}`);
      
          if (canNext && !isMemberExtractionPaused) {
            // Multiple methods to extract cursor
            let nextCursor = "";
            
            // Primary cursor extraction
            const cursorMatch = jsonResponse.match(/"end_cursor":\s*"([^"]+)"/);
            if (cursorMatch && cursorMatch[1]) {
              nextCursor = cursorMatch[1];
              debugLog(`Found next cursor from primary match: ${nextCursor.substring(0, 15)}...`);
              // Save cursor for fast resume
              setLastExtractionCursor(nextCursor);
            }
            
            // Backup cursor extraction (less strict pattern)
            if (!nextCursor) {
              const looseCursorMatch = jsonResponse.match(/end_cursor["']?\s*:\s*["']([^"']+)["']/);
              if (looseCursorMatch && looseCursorMatch[1]) {
                nextCursor = looseCursorMatch[1];
                debugLog(`Found next cursor from backup match: ${nextCursor.substring(0, 15)}...`);
              }
            }
            
            // Try to find cursor in any pagination-related object
            if (!nextCursor) {
              const paginationMatch = jsonResponse.match(/pag[^{]*{[^}]*cursor["']?\s*:\s*["']([^"']+)["']/);
              if (paginationMatch && paginationMatch[1]) {
                nextCursor = paginationMatch[1];
                debugLog(`Found cursor from pagination object: ${nextCursor.substring(0, 15)}...`);
              }
            }
            
            // Additional extraction attempts - more aggressive
            if (!nextCursor) {
              // Look for any potential cursor format in the response
              const anyPotentialCursor = jsonResponse.match(/cursor["']?\s*[:=]\s*["']([A-Za-z0-9+\/=_-]+)["']/);
              if (anyPotentialCursor && anyPotentialCursor[1]) {
                nextCursor = anyPotentialCursor[1];
                debugLog(`Found potential cursor format: ${nextCursor.substring(0, 15)}...`);
              }
            }
            
            // Check for direct pagination URL in response
            let directNextUrl = null;
            try {
              // Look for full pagination URL pattern that might be present in API response
              const paginationUrlMatch = jsonResponse.match(/"paging":\s*{\s*"next":\s*"([^"]+)"/);
              if (paginationUrlMatch && paginationUrlMatch[1]) {
                let foundUrl = paginationUrlMatch[1].replace(/\\/g, ''); // Remove any escape characters
                debugLog(`Found direct pagination URL: ${foundUrl}`);
                
                // Convert absolute URL to relative URL to avoid CORS issues
                if (foundUrl.startsWith('https://graph.facebook.com')) {
                  const urlObj = new URL(foundUrl);
                  foundUrl = urlObj.pathname + urlObj.search;
                  debugLog(`Converted to relative URL for proxy: ${foundUrl}`);
                  
                  // Ensure it starts with /v18.0 for the proxy
                  if (!foundUrl.startsWith('/v18.0')) {
                    const pathParts = foundUrl.split('/');
                    const versionIdx = pathParts.findIndex(p => p.startsWith('v'));
                    if (versionIdx >= 0) {
                      foundUrl = '/' + pathParts.slice(versionIdx).join('/');
                      debugLog(`Adjusted URL with version prefix: ${foundUrl}`);
                    }
                  }
                  
                  directNextUrl = foundUrl;
                }
              }
            } catch (urlError) {
              debugLog('Error processing pagination URL:', urlError);
            }
            
            // If we found a direct next URL, use it instead of constructing one
            if (directNextUrl) {
              // Display status message for user
              if (processedMembers.length > 0) {
                messageApi.success(`تم استخراج ${processedMembers.length} عضو - جاري استخراج المزيد...`);
              }
              
              // Variable delay between requests (1.5-3 seconds) to avoid rate limiting
              const delayTime = 1500 + Math.floor(Math.random() * 1500);
              debugLog(`Using direct pagination URL with ${delayTime}ms delay`);
              
              // Schedule the next fetch with the delay using the direct URL
              setTimeout(async () => {
                try {
                  debugLog(`Fetching next page with direct URL: ${directNextUrl}`);
                  const response = await fetch(directNextUrl);
                  
                  if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                  }
                  
                  const nextData = await response.json();
                  
                  // Process this data similarly to the regular member processing
                  const nextJsonResponse = JSON.stringify(nextData);
                  const nextMatches = [...nextJsonResponse.matchAll(memberPattern)];
                  debugLog(`Found ${nextMatches.length} potential members in direct URL fetch`);
                  
                  // Process members like the regular function
                  const nextProcessedMembers = [];
                  const nextProcessedIds = new Set();
                  
                  // Get existing member IDs to avoid duplicates
                  members.forEach(member => nextProcessedIds.add(member.userId));
                  
                  for (const match of nextMatches) {
                    if (match && match.length >= 4) {
                      const memberId = match[1];
                      const memberName = match[2];
                      const typeName = match[3];
                      
                      if (typeName !== "Group" && !nextProcessedIds.has(memberId)) {
                        nextProcessedIds.add(memberId);
                        nextProcessedMembers.push({
                          key: `${memberId}-${Date.now()}`,
                          userId: memberId,
                          name: memberName,
                          groupId: groupId,
                          groupName: groupName,
                          extractedAt: new Date().toISOString()
                        });
                      }
                    }
                  }
                  
                  // Update members state
                  setMembers(prevMembers => [...prevMembers, ...nextProcessedMembers]);
                  
                  // Check for further pagination in this response
                  const hasMorePages = nextJsonResponse.includes('"has_next_page":true') || 
                                      nextJsonResponse.match(/"has_next_page":\s*true/i);
                  
                  if (hasMorePages && !isMemberExtractionPaused) {
                    // Extract new cursor or pagination URL
                    let newNextUrl = null;
                    const nextUrlMatch = nextJsonResponse.match(/"paging":\s*{\s*"next":\s*"([^"]+)"/);
                    
                    if (nextUrlMatch && nextUrlMatch[1]) {
                      let foundNextUrl = nextUrlMatch[1].replace(/\\/g, '');
                      
                      // Convert to relative URL if needed
                      if (foundNextUrl.startsWith('https://graph.facebook.com')) {
                        const urlObj = new URL(foundNextUrl);
                        foundNextUrl = urlObj.pathname + urlObj.search;
                        
                        if (!foundNextUrl.startsWith('/v18.0')) {
                          const pathParts = foundNextUrl.split('/');
                          const versionIdx = pathParts.findIndex(p => p.startsWith('v'));
                          if (versionIdx >= 0) {
                            foundNextUrl = '/' + pathParts.slice(versionIdx).join('/');
                          }
                        }
                        
                        newNextUrl = foundNextUrl;
                      }
                    }
                    
                    if (newNextUrl) {
                      // Schedule next fetch with new URL
                      setTimeout(async () => {
                        try {
                          // Reuse the same fetch logic
                          const nextResponse = await fetch(newNextUrl);
                          if (!nextResponse.ok) throw new Error(`HTTP error! status: ${nextResponse.status}`);
                          // Process response...
                          // (This would be recursive and complex, so ending here)
                          
                          // Continue pagination as needed
                          fetchNextGroupMembersPage(groupId, groupName, nextCursor);
                        } catch (error) {
                          debugLog('Error fetching with newNextUrl:', error);
                          // Fall back to normal pagination
                          fetchNextGroupMembersPage(groupId, groupName, nextCursor);
                        }
                      }, 2000);
                    } else {
                      // Fall back to normal cursor-based pagination
                      fetchNextGroupMembersPage(groupId, groupName, nextCursor);
                    }
                  } else {
                    // No more pages
                    setLoadingMembers(false);
                    messageApi.success(`تم استخراج ${nextProcessedMembers.length} عضو إضافي من المجموعة`);
                  }
                } catch (directFetchError) {
                  debugLog('Error with direct pagination URL:', directFetchError);
                  // Fall back to normal cursor-based pagination
                  if (nextCursor) {
                    fetchNextGroupMembersPage(groupId, groupName, nextCursor);
                  } else {
                    setLoadingMembers(false);
                  }
                }
              }, delayTime);
            }
            else if (nextCursor) {
              // Display status message for user
              if (processedMembers.length > 0) {
                messageApi.success(`تم استخراج ${processedMembers.length} عضو - جاري استخراج المزيد...`);
              }
              
              // Variable delay between requests (1.5-3 seconds) to avoid rate limiting
              const delayTime = 1500 + Math.floor(Math.random() * 1500);
              debugLog(`Scheduling next batch fetch in ${delayTime}ms with cursor`);
              
              // Schedule the next fetch with the delay
              setTimeout(() => {
                fetchNextGroupMembersPage(groupId, groupName, nextCursor);
              }, delayTime);
        } else {
          debugLog('No valid cursor found despite having has_next_page=true');
          setLoadingMembers(false);
          
          if (processedMembers.length > 0) {
            messageApi.success(`تم استخراج ${processedMembers.length} عضو إضافي من المجموعة`);
          }
        }
      } else {
        setLoadingMembers(false);
        
      if (processedMembers.length > 0) {
        messageApi.success(`تم استخراج ${processedMembers.length} عضو إضافي من المجموعة`);
      } else if (members.length > 0) {
        if (extractionCompleted) {
          messageApi.info(`تم اكتمال استخراج أعضاء المجموعة (${members.length} عضو)`);
        } else {
          messageApi.info(`تم الانتهاء من استخراج أعضاء المجموعة (${members.length} عضو)`);
        }
      }
      }
    } catch (error) {
      console.error('Error fetching next page of group members:', error);
      messageApi.error(`فشل في استخراج المزيد من أعضاء المجموعة: ${error.message}`);
      setLoadingMembers(false);
    }
  };
  
  // Extract members from selected groups
  const extractMembersFromSelectedGroups = async () => {
    if (selectedGroupsForMembers.length === 0) {
      messageApi.error('يرجى تحديد مجموعة واحدة على الأقل');
      return;
    }
    
    setExtractingMembers(true);
    setIsMemberExtractionPaused(false);
    setMembers([]);
    setCurrentGroupIndex(0);
    
    processNextGroupForMembers();
  };
  
  // Extract posts from selected groups
  const extractPostsFromSelectedGroups = async () => {
    if (selectedGroupsForPosts.length === 0) {
      messageApi.error('يرجى تحديد مجموعة واحدة على الأقل');
      return;
    }
    
    setMultiGroupPostExtractionActive(true);
    setCurrentPostGroupIndex(0);
    setActiveTab('posts');
    setPosts([]);
    
    // Start processing the first group
    processNextGroupForPosts();
    setExtractPostsModalVisible(false);
  };
  
  // Process next group for post extraction
  const processNextGroupForPosts = () => {
    // Get the current group's ID
    const groupId = selectedGroupsForPosts[currentPostGroupIndex];
    // Find group name in the groups list
    const group = groups.find(g => g.groupId === groupId);
    const groupName = group?.name || '';
    
    // Set current group info
    setGroupId(groupId);
    setGroupName(groupName);
    
    // Reset post extraction states for new group while preserving posts
    setPostProgress(0);
    setExtractedPostCount(0);
    setPostExtractionCompleted(false);
    
    // Calculate overall progress
    const overallProgress = Math.round((currentPostGroupIndex / selectedGroupsForPosts.length) * 100);
    const previousGroupsPosts = posts.filter(p => p.groupIndex < currentPostGroupIndex);
    const currentGroupPosts = posts.filter(p => p.groupIndex === currentPostGroupIndex - 1);
    
    // Update UI with better formatted notifications
    const currentGroup = groups.find(g => g.groupId === groupId);
    const groupDisplayName = currentGroup?.name || groupName;
    
    // Single consolidated progress notification
    messageApi.loading(
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
          {groupDisplayName}
        </div>
        <div>
          جاري استخراج المنشورات ({currentPostGroupIndex + 1} من {selectedGroupsForPosts.length})
        </div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          التقدم: {overallProgress}% | تم استخراج {previousGroupsPosts.length} منشور سابقاً
        </div>
      </div>
    );
    
    // Show previous group completion if applicable
    if (currentPostGroupIndex > 0 && currentGroupPosts.length > 0) {
      const prevGroup = groups.find(g => g.groupId === selectedGroupsForPosts[currentPostGroupIndex - 1]);
      messageApi.success(
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            {prevGroup?.name || 'المجموعة السابقة'}
          </div>
          <div>
            تم استخراج {currentGroupPosts.length} منشور
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            الإجمالي: {posts.length} منشور من {currentPostGroupIndex} مجموعة
          </div>
        </div>
      );
    }
    
    // Fetch posts from this group
    fetchGroupPosts(groupId);
  };
  
  // Process next group for member extraction
  const processNextGroupForMembers = () => {
    if (currentGroupIndex >= selectedGroupsForMembers.length || isMemberExtractionPaused) {
      setExtractingMembers(false);
      setIsMemberExtractionPaused(true);
      if (currentGroupIndex >= selectedGroupsForMembers.length) {
        messageApi.success('تم استخراج الأعضاء من جميع المجموعات المحددة');
      } else {
        messageApi.info('تم إيقاف استخراج الأعضاء');
      }
      setExtractMembersModalVisible(false);
      return;
    }
    
    const groupId = selectedGroupsForMembers[currentGroupIndex];
    // Find group name in the groups list
    const group = groups.find(g => g.groupId === groupId);
    const groupName = group?.name || '';
    
    // Fetch members from this group
    fetchGroupMembers(groupId, groupName).then(() => {
      setCurrentGroupIndex(prevIndex => prevIndex + 1);
      
      // Schedule the next group after a delay
      setTimeout(() => {
        processNextGroupForMembers();
      }, 5000);
    }).catch(error => {
      console.error('Error in processNextGroupForMembers:', error);
      setCurrentGroupIndex(prevIndex => prevIndex + 1);
      
      // Continue with the next group even if there's an error
      setTimeout(() => {
        processNextGroupForMembers();
      }, 5000);
    });
  };
  
  // ENHANCED CONTROL SYSTEM - References to ensure state consistency
  // Hard termination flag stored in a ref to ensure immediate effect across async operations
  const hardTerminationRef = React.useRef(false);
  
  // Store active abort controller for fetch operations
  const abortControllerRef = React.useRef(null);
  
  // Store request queue for paused operations
  const requestQueueRef = React.useRef([]);
  
  // Track the last activity timestamp
  const lastActivityTimestampRef = React.useRef(Date.now());
  
  // State to track whether extraction is forcibly stopped
  const [forceStopExtraction, setForceStopExtraction] = useState(false);
  
  // Create a new abort controller
  const createAbortController = () => {
    // Clean up any existing controller
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (e) {
        console.error("Error aborting previous controller:", e);
      }
    }
    // Create new controller
    abortControllerRef.current = new AbortController();
    return abortControllerRef.current.signal;
  };
  
  // Store references to any active timers for cleanup
  const timersRef = React.useRef([]);
  
  // Helper to clear all pending timers
  const clearAllTimers = () => {
    if (timersRef.current.length > 0) {
      console.log(`Clearing ${timersRef.current.length} active timers`);
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current = [];
    }
  };
  
  // Process any queued requests when resuming extraction
  const processQueuedRequests = () => {
    if (requestQueueRef.current.length === 0) {
      console.log("No queued requests to process");
      return;
    }
    
    console.log(`Processing ${requestQueueRef.current.length} queued requests`);
    
    // Get all queued requests and clear the queue
    const requests = [...requestQueueRef.current];
    requestQueueRef.current = [];
    
    // Process each request one at a time with a slight delay
    requests.forEach((request, index) => {
      setTimeout(() => {
        // Only process if we're still in active extraction mode
        if (hardTerminationRef.current || forceStopExtraction) {
          console.log("Hard termination or force stop active - skipping queued request");
          return;
        }
        
        if (isMemberExtractionPaused) {
          console.log("Extraction paused again - re-queueing request");
          requestQueueRef.current.push(request);
          return;
        }
        
        // Process based on request type
        if (request.type === 'fetchNextPage') {
          console.log("Processing queued fetchNextPage request");
          const { groupId, groupName, cursor, retryCount } = request.args;
          
          // Add a reconnection flag for resuming after a long pause
          fetchNextGroupMembersPage(groupId, groupName, cursor, retryCount, true);
        }
      }, index * 500); // Stagger requests 500ms apart
    });
  };
  
  // Network monitoring and recovery
  React.useEffect(() => {
    // Handle pause/resume specifically for network events
    if (!isMemberExtractionPaused && extractingMembers) {
      // Check if we've been inactive for too long (over 30 seconds)
      const checkActivityInterval = setInterval(() => {
        const now = Date.now();
        const timeSinceLastActivity = now - lastActivityTimestampRef.current;
        
        // If we've been inactive for over 30 seconds while supposedly active,
        // there might be a network issue
        if (timeSinceLastActivity > 30000 && !isMemberExtractionPaused && extractingMembers) {
          console.log("Detected long inactivity, checking network and resetting if needed");
          
          // Reset abort controller
          createAbortController();
          
          // Force resume extraction
          if (groupId && groupName) {
            // Use a delay to ensure state updates have been processed
            setTimeout(() => {
              fetchNextGroupMembersPage(groupId, groupName, '', 0, true);
            }, 1000);
          }
          
          // Update the timestamp
          lastActivityTimestampRef.current = now;
        }
      }, 10000); // Check every 10 seconds
      
      return () => clearInterval(checkActivityInterval);
    }
  }, [isMemberExtractionPaused, extractingMembers, groupId, groupName]);
  // Stop post extraction completely
  const stopPostExtraction = () => {
    console.log("POST EXTRACTION STOP REQUESTED - IMMEDIATE TERMINATION INITIATED");
    
    // Set the hard termination flag first - this blocks new operations immediately
    hardTerminationRef.current = true;
    window.stopExtraction = true;
    window.pauseExtraction = true;
    
    // Get current count before stopping
    const extractedCount = posts.length;
    
    // Immediately clear all pending timers
    clearAllTimers();
    
    // Clear request queue
    requestQueueRef.current = [];
    
    // Forcibly abort all in-flight fetch requests
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (e) {
        console.error("Error aborting fetch requests:", e);
      }
    }
    
    // Create a new abort controller to ensure clean state
    createAbortController();
    
    // Force stop flag needs to be set early
    setForceStopPostExtraction(true);
    
    // Reset all extraction flags - setting these in multiple places for redundancy
    setIsPostExtractionPaused(true);
    setExtractingPosts(false);
    setLoadingPosts(false);
    setPostExtractionCompleted(true);
    
    // Try to abort any active XHR requests directly
    try {
      const xhrList = window.XMLHttpRequest ? window.XMLHttpRequest.activeXhrs : [];
      if (xhrList && xhrList.length) {
        console.log(`Attempting to abort ${xhrList.length} active XHR requests`);
        xhrList.forEach(xhr => {
          try { xhr.abort(); } catch (e) {}
        });
      }
    } catch (e) {
      console.error("Error while trying to abort XHR requests:", e);
    }
    
    // Forced synchronous cleanup to break any running processes
    for (let i = 0; i < 3; i++) {
      try {
        if (abortControllerRef.current) abortControllerRef.current.abort();
      } catch (e) {}
    }
    
    // Force clear any queued setState calls using multiple timeouts
    setTimeout(() => {
      // Redundantly set all states again to ensure UI updates
      setLoadingPosts(false);
      setExtractingPosts(false);
      setIsPostExtractionPaused(true);
      setPostExtractionCompleted(true);
      
      // Display success message with extracted count
      messageApi.success(`تم إيقاف الاستخراج. تم استخراج ${extractedCount} منشور من المجموعة`);
    }, 0);
    
    // Secondary timeout to catch any delayed state updates
    setTimeout(() => {
      setForceStopPostExtraction(true);
      setLoadingPosts(false);
      setExtractingPosts(false);
      setIsPostExtractionPaused(true);
      window.stopExtraction = true;
    }, 100);
    
    // Final cleanup after all processes should have stopped
    setTimeout(() => {
      // Reset flags to clean state for future operations
      setForceStopPostExtraction(false);
      hardTerminationRef.current = false;
      window.stopExtraction = false;
    }, 2000);
  };
  
  // Modified setTimeout that keeps track of timers and respects stop/pause state
  const safeSetTimeout = (callback, delay) => {
    // Block all timers if hard termination is active
    if (hardTerminationRef.current) {
      console.log("HARD TERMINATION: Timer creation blocked");
      return null;
    }
    
    // Only set the timer if extraction is active
    if (forceStopExtraction || !extractingMembers || extractionCompleted) {
      console.log("Timer creation blocked - extraction stopped or completed");
      return null;
    }
    
    // For paused state, we'll add to request queue instead
    if (isMemberExtractionPaused) {
      console.log("Extraction paused - queueing timer callback");
      
      // Add a generic timer to the queue
      requestQueueRef.current.push({
        type: 'timer',
        callback: callback,
        timestamp: Date.now()
      });
      
      return null;
    }
    
    const timerId = setTimeout(() => {
      // Remove this timer from our tracking list
      timersRef.current = timersRef.current.filter(id => id !== timerId);
      
      // Only execute the callback if extraction is still active
      if (!hardTerminationRef.current && !forceStopExtraction && 
          extractingMembers && !extractionCompleted) {
        if (isMemberExtractionPaused) {
          // If we got paused during the timeout, queue the callback
          requestQueueRef.current.push({
            type: 'timer',
            callback: callback,
            timestamp: Date.now()
          });
        } else {
          // Otherwise execute it
          callback();
        }
      } else {
        console.log("Timer callback blocked - extraction conditions changed");
      }
    }, delay);
    
    // Track this timer
    timersRef.current.push(timerId);
    return timerId;
  };
  
  // Stop member extraction completely - ENHANCED IMPLEMENTATION
  const stopMemberExtraction = () => {
    console.log("EXTRACTION STOP REQUESTED - IMMEDIATE TERMINATION INITIATED");
    
    // FIRST WAVE OF TERMINATION - flags that have immediate effect
    // Set the hard termination flag first - this blocks new operations immediately
    hardTerminationRef.current = true;
    window.stopExtraction = true;
    window.pauseExtraction = true;
    
    // Get current count before stopping
    const extractedCount = members.length;
    
    // SECOND WAVE - destroy all infrastructure and resources
    // Immediately clear all pending timers
    clearAllTimers();
    
    // Clear request queue
    requestQueueRef.current = [];
    
    // Forcibly abort all in-flight fetch requests
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (e) {
        console.error("Error aborting fetch requests:", e);
      }
    }
    
    // Create a new abort controller to ensure clean state
    createAbortController();
    
    // THIRD WAVE - update all React state variables 
    // Force stop flag needs to be set early
    setForceStopExtraction(true);
    
    // Reset all extraction flags - order matters for dependencies!
    setIsMemberExtractionPaused(true);
    setExtractingMembers(false);
    setLoadingMembers(false);
    setExtractionCompleted(true);
    
    // FOURTH WAVE - redundant termination to ensure completion
    // Forced synchronous cleanup to break any running processes
    for (let i = 0; i < 3; i++) {
      try {
        if (abortControllerRef.current) abortControllerRef.current.abort();
      } catch (e) {}
    }
    
    // Force clear any queued setState calls using multiple timeouts
    // Immediate timeout
    setTimeout(() => {
      // Redundantly set all states again to ensure UI updates
      setLoadingMembers(false);
      setExtractingMembers(false);
      setIsMemberExtractionPaused(true);
      setExtractionCompleted(true);
      
      // Display success message with extracted count
      messageApi.success(`تم إيقاف الاستخراج. تم استخراج ${extractedCount} عضو من المجموعة`);
    }, 0);
    
    // Secondary timeout to catch any delayed state updates
    setTimeout(() => {
      setForceStopExtraction(true);
      setLoadingMembers(false);
      setExtractingMembers(false);
      setIsMemberExtractionPaused(true);
      window.stopExtraction = true;
      window.pauseExtraction = true;
    }, 100);
    
    // Final cleanup after all processes should have stopped
    setTimeout(() => {
      // Reset flags to clean state for future operations
      setForceStopExtraction(false);
      hardTerminationRef.current = false;
      window.stopExtraction = false;
    }, 2000);
  };
  
  
  // Override the global fetch function to respect our control system - using a queue approach
  React.useEffect(() => {
    const originalFetch = window.fetch;
    
    window.fetch = function(...args) {
      // Hard termination check - most restrictive
      if (hardTerminationRef.current) {
        console.log("HARD TERMINATION: Blocking fetch operation");
        return Promise.reject(new Error("Extraction terminated"));
      }
      
      // Force stop check - next most restrictive 
      if (forceStopExtraction) {
        console.log("Force stop active: Blocking fetch operation");
        return Promise.reject(new Error("Extraction stopped"));
      }
      
      // If extraction is paused, queue the request instead of blocking it
      if (extractingMembers && isMemberExtractionPaused) {
        console.log("Extraction paused: Queueing fetch request for later");
        return Promise.reject(new Error("Extraction paused or stopped"));
      }
      
      // For active extraction, attach the abort controller signal
      if (extractingMembers && abortControllerRef.current) {
        // Create a copy of args for modification
        const modifiedArgs = [...args];
        
        // Ensure args[1] exists (options object)
        if (!modifiedArgs[1]) modifiedArgs[1] = {};
        
        // Ensure signal is set, but don't override existing signal
        if (!modifiedArgs[1].signal) {
          modifiedArgs[1].signal = abortControllerRef.current.signal;
        }
        
        // Update last activity timestamp for active extractions
        lastActivityTimestampRef.current = Date.now();
        
        return originalFetch.apply(this, modifiedArgs);
      }
      
      // Default behavior for non-extraction requests
      return originalFetch.apply(this, args);
    };
    
    // Cleanup function
    return () => {
      window.fetch = originalFetch;
    };
  }, [forceStopExtraction, extractingMembers, isMemberExtractionPaused]);
  
  // Transfer selected group IDs to AutoPostGroup
  const transferToAutoPostGroup = () => {
    // Get the selected group IDs
    const selectedGroups = selectedRowKeys;
    
    if (selectedGroups.length === 0) {
      messageApi.error('يرجى تحديد مجموعة واحدة على الأقل');
      return;
    }
    
    // Store in localStorage for AutoPostGroup to retrieve
    localStorage.setItem('transferredGroups', JSON.stringify(selectedGroups));
    
    // Navigate to AutoPostGroup page
    window.location.href = '/auto-post-group';
  };
  
  // Transfer selected post IDs to CommentExtractor
  const transferToCommentExtractor = () => {
    // Get the selected post IDs
    const selectedPosts = selectedPostKeys;
    
    if (selectedPosts.length === 0) {
      messageApi.error('يرجى تحديد منشور واحد على الأقل');
      return;
    }
    
    // Store in localStorage for CommentExtractor to retrieve
    localStorage.setItem('transferredPosts', JSON.stringify(selectedPosts));
    
    // Navigate to CommentExtractor page
    window.location.href = '/comment-extractor';
  };
  
  // Transfer selected post IDs to ReactionExtractor
  const transferToReactionExtractor = () => {
    // Get the selected post IDs
    const selectedPosts = selectedPostKeys;
    
    if (selectedPosts.length === 0) {
      messageApi.error('يرجى تحديد منشور واحد على الأقل');
      return;
    }
    
    // Store in localStorage for ReactionExtractor to retrieve
    localStorage.setItem('transferredPosts', JSON.stringify(selectedPosts));
    
    // Navigate to ReactionExtractor page
    window.location.href = '/reaction-extractor';
  };
  
  // Handle extract user data
  const handleExtractUserData = () => {
    if (selectedMemberKeys.length === 0) {
      messageApi.warning(t('please_select_at_least_one_user'));
      return;
    }
    setIsDataSecretopen(true);
  };
  
  // Close DataSecret modal
  const handleCloseDataSecret = () => setIsDataSecretopen(false);
  
  // Handle groups table change
  const handleGroupsTableChange = (pagination) => {
    setGroupsPage(pagination.current);
    setGroupsPageSize(pagination.pageSize);
  };
  
  // Handle posts table change
  const handlePostsTableChange = (pagination) => {
    setPostsPage(pagination.current);
    setPostsPageSize(pagination.pageSize);
  };
  
  // Handle members table change
  const handleMembersTableChange = (pagination) => {
    setMembersPage(pagination.current);
    setMembersPageSize(pagination.pageSize);
  };
  
  // Export groups to Excel
  const exportGroupsToExcel = () => {
    const dataToExport = selectedRowKeys.length > 0
      ? groups.filter(g => selectedRowKeys.includes(g.groupId))
      : groups;
      
    if (dataToExport.length === 0) {
      messageApi.warning(t('no_data_to_export'));
      return;
    }
    
    const ws = XLSX.utils.json_to_sheet(dataToExport.map(g => ({
      [t('group_id')]: g.groupId,
      [t('group_name')]: g.name,
      [t('group_privacy')]: g.privacy,
      [t('member_count')]: g.member_count
    })));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Groups');
    const fileName = `groups_${moment().format('YYYYMMDD_HHmmss')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    messageApi.success(t('groups_exported_successfully', { count: dataToExport.length }));
  };
  
  // Export posts to Excel with reactions and comments
  const exportPostsToExcel = () => {
    const dataToExport = selectedPostKeys.length > 0
      ? posts.filter(p => selectedPostKeys.includes(p.postId))
      : posts;
      
    if (dataToExport.length === 0) {
      messageApi.warning(t('no_data_to_export'));
      return;
    }
    
    const ws = XLSX.utils.json_to_sheet(dataToExport.map(p => ({
      [t('post_id')]: p.postId,
      [t('post_content')]: p.message || '',
      [t('post_type')]: p.type || 'unknown',
      [t('reactions_count')]: p.reactions?.summary?.total_count || 0,
      [t('comments_count')]: p.comments?.summary?.total_count || 0,
      [t('post_date')]: moment(p.created_time).format('YYYY-MM-DD HH:mm:ss'),
      [t('group')]: p.groupName || '',
      [t('group_id')]: p.groupId || '',
      [t('post_url')]: `https://facebook.com/${p.postId}`
    })));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Posts');
    const fileName = `posts_${groupId}_${moment().format('YYYYMMDD_HHmmss')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    messageApi.success(t('posts_exported_successfully', { count: dataToExport.length }));
  };
  
  // Export members to Excel
  const exportMembersToExcel = () => {
    const dataToExport = selectedMemberKeys.length > 0
      ? members.filter(m => selectedMemberKeys.includes(m.userId))
      : members;
      
    if (dataToExport.length === 0) {
      messageApi.warning(t('no_data_to_export'));
      return;
    }
    
    const ws = XLSX.utils.json_to_sheet(dataToExport.map(m => ({
      [t('user_id')]: m.userId,
      [t('user_name')]: m.name,
      [t('group')]: m.groupName,
      [t('group_id')]: m.groupId,
      [t('extraction_time')]: moment(m.extractedAt).format('YYYY-MM-DD HH:mm:ss')
    })));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Members');
    const fileName = `members_${groupId}_${moment().format('YYYYMMDD_HHmmss')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    messageApi.success(t('members_exported_successfully', { count: dataToExport.length }));
  };
  
  // Save extraction
  const handleSaveExtraction = () => {
    if (activeTab === 'groups' && groups.length === 0) {
      messageApi.warning(t('no_groups_to_save'));
      return;
    } else if (activeTab === 'posts' && posts.length === 0) {
      messageApi.warning(t('no_posts_to_save'));
      return;
    } else if (activeTab === 'members' && members.length === 0) {
      messageApi.warning(t('no_members_to_save'));
      return;
    }
    
    setSaveModalopen(true);
  };
  
  // Save extraction with name
  const saveExtraction = () => {
    if (!extractionName.trim()) {
      messageApi.error(t('please_enter_extraction_name'));
      return;
    }
    
    let newSavedExtraction = {
      id: Date.now().toString(),
      name: extractionName,
      date: new Date().toISOString(),
      type: activeTab
    };
    
    if (activeTab === 'groups') {
      newSavedExtraction.groups = [...groups];
      newSavedExtraction.count = groups.length;
    } else if (activeTab === 'posts') {
      newSavedExtraction.groupId = groupId;
      newSavedExtraction.groupName = groupName;
      newSavedExtraction.posts = [...posts];
      newSavedExtraction.count = posts.length;
    } else if (activeTab === 'members') {
      newSavedExtraction.groupId = groupId;
      newSavedExtraction.groupName = groupName;
      newSavedExtraction.members = [...members];
      newSavedExtraction.count = members.length;
    }
    
    setSavedExtractions([...savedExtractions, newSavedExtraction]);
    setSaveModalopen(false);
    setExtractionName('');
    messageApi.success(t('extraction_saved_successfully'));
  };
  
  // Load saved extraction
  const loadSavedExtraction = (saved) => {
    debugLog('Loading saved extraction:', saved);
    
    if (saved.type === 'groups') {
      setGroups(saved.groups);
      setActiveTab('groups');
    } else if (saved.type === 'posts') {
      setPosts(saved.posts);
      setGroupId(saved.groupId);
      setGroupName(saved.groupName);
      setActiveTab('posts');
    } else if (saved.type === 'members') {
      setMembers(saved.members);
      setGroupId(saved.groupId);
      setGroupName(saved.groupName);
      setActiveTab('members');
    }
    
    messageApi.success(t('extraction_loaded_successfully'));
  };
  
  // Delete saved extraction
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
  
  // Pagination configuration
  const paginationConfig = {
    showSizeChanger: true,
    showQuickJumper: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    showTotal: (total, range) => `${range[0]}-${range[1]} من ${total}`
  };
  
  // Stats cards for groups
  const groupStatsCards = [
    { 
      title: t('total_groups'), 
      value: groups.length, 
      color: '#1890ff', 
      icon: <GroupOutlined style={{ fontSize: '24px' }} /> 
    },
    { 
      title: t('public_groups'), 
      value: groups.filter(g => g.privacy === 'OPEN').length, 
      color: '#52c41a', 
      icon: <EyeOutlined style={{ fontSize: '24px' }} /> 
    },
    { 
      title: t('closed_groups'), 
      value: groups.filter(g => g.privacy === 'CLOSED').length, 
      color: '#1890ff', 
      icon: <ApartmentOutlined style={{ fontSize: '24px' }} /> 
    },
    { 
      title: t('secret_groups'), 
      value: groups.filter(g => g.privacy === 'SECRET').length, 
      color: '#f5222d', 
      icon: <TeamOutlined style={{ fontSize: '24px' }} /> 
    },
  ];
  
  // Stats cards for posts with reactions and comments
  const postStatsCards = [
    { 
      title: t('total_posts'), 
      value: posts.length, 
      color: '#1890ff', 
      icon: <UnorderedListOutlined style={{ fontSize: '24px' }} /> 
    },
    { 
      title: t('text_posts'), 
      value: posts.filter(p => p.type === 'status').length, 
      color: '#1890ff', 
      icon: <MessageOutlined style={{ fontSize: '24px' }} /> 
    },
    { 
      title: t('photo_posts'), 
      value: posts.filter(p => p.type === 'photo').length, 
      color: '#52c41a', 
      icon: <EyeOutlined style={{ fontSize: '24px' }} /> 
    },
    { 
      title: t('video_posts'), 
      value: posts.filter(p => p.type === 'video').length, 
      color: '#722ed1', 
      icon: <PlayCircleOutlined style={{ fontSize: '24px' }} /> 
    },
    { 
      title: t('link_posts'), 
      value: posts.filter(p => p.type === 'link').length, 
      color: '#fa8c16', 
      icon: <LinkOutlined style={{ fontSize: '24px' }} /> 
    },
    {
      title: t('total_reactions'),
      value: posts.reduce((sum, post) => sum + (post.reactions?.summary?.total_count || 0), 0),
      color: '#eb2f96',
      icon: <ThunderboltOutlined style={{ fontSize: '24px' }} />
    },
    {
      title: t('total_comments'),
      value: posts.reduce((sum, post) => sum + (post.comments?.summary?.total_count || 0), 0),
      color: '#13c2c2',
      icon: <MessageOutlined style={{ fontSize: '24px' }} />
    }
  ];
  
  // Stats cards for members
  const memberStatsCards = [
    { 
      title: t('total_members'), 
      value: members.length, 
      color: '#1890ff', 
      icon: <TeamOutlined style={{ fontSize: '24px' }} /> 
    },
    { 
      title: t('groups'), 
      value: [...new Set(members.map(m => m.groupId))].length, 
      color: '#52c41a', 
      icon: <ApartmentOutlined style={{ fontSize: '24px' }} /> 
    }
  ];
  
  // Define tab items
  const tabItems = [
    {
      key: 'groups',
      label: (<span><GroupOutlined className="tab-icon" />{t('my_groups')}</span>),
      children: (
        <>
          <div className="input-container">
            <Button
              className="extract-button"
              type="primary"
              onClick={fetchGroups}
              disabled={loading || loadingGroups}
            >
              {loading || loadingGroups ? <LoadingOutlined /> : <ReloadOutlined />}
              <span>{t('extract_groups')}</span>
            </Button>
            <Button
              onClick={handleSaveExtraction}
              disabled={groups.length === 0}
              icon={<SaveOutlined />}
              className="secondary-button"
            >
              {t('save_extraction')}
            </Button>
            <Button
              onClick={() => {
                if (selectedRowKeys.length > 0) {
                  setSelectedGroupsForMembers(selectedRowKeys);
                  setExtractMembersModalVisible(true);
                } else {
                  messageApi.error(t('please_select_at_least_one_group'));
                }
              }}
              disabled={selectedRowKeys.length === 0}
              icon={<TeamOutlined />}
              className="secondary-button"
            >
              {t('extract_members')}
            </Button>
            <Button
              onClick={() => {
                if (selectedRowKeys.length > 0) {
                  setSelectedGroupsForPosts(selectedRowKeys);
                  setExtractPostsModalVisible(true);
                } else {
                  messageApi.error(t('please_select_at_least_one_group'));
                }
              }}
              disabled={selectedRowKeys.length === 0}
              icon={<UnorderedListOutlined />}
              className="secondary-button"
            >
              {t('extract_posts')}
            </Button>
            <Button
              onClick={() => {
                if (selectedRowKeys.length > 0) {
                  setTransferGroupModalVisible(true);
                } else {
                  messageApi.error(t('please_select_at_least_one_group'));
                }
              }}
              disabled={selectedRowKeys.length === 0}
              icon={<SendOutlined />}
              className="secondary-button"
            >
              {t('transfer_to_posting')}
            </Button>
      </div>
          {showProgress && (
            <div className="progress-container">
              <div className="progress-header">
                <span>{t('extracting_groups_progress')}</span>
                <span className="progress-count">{extractedCount} / {totalGroups}</span>
              </div>
              <Progress
                percent={progress}
                status={loadingGroups ? "active" : "normal"}
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

          {groups.length > 0 && (
            <div className="stats-cards-container">
              {groupStatsCards.map((stat, index) => (
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
                  placeholder={t('search_group_placeholder')}
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
                  overlay={
                    <Menu>
                      <Menu.Item key="excel" icon={<FileExcelOutlined style={{ color: '#217346' }} />} onClick={exportGroupsToExcel}>
                        {t('export_as_excel')}
                      </Menu.Item>
                    </Menu>
                  }
                  placement="bottomRight"
                  trigger={['click']}
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
                    {t('groups_selected', { count: selectedRowKeys.length })}
                  </span>
                ) : (
                  <span className="selected-info">
                    <GroupOutlined className="primary-icon" />
                    {t('extracted_groups', { count: filteredGroups.length })}
                  </span>
                )}
              </span>
              <div className="table-actions">
                <Space size="middle">
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

            {loadingGroups ? (
              <ShimmerEffect type="table" rows={5} columnCount={6} />
            ) : (
              <Table
                className="groups-table"
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
                columns={groupsColumns}
                dataSource={filteredGroups}
                rowKey="groupId"
                loading={loading}
                onChange={handleGroupsTableChange}
                pagination={{
                  current: groupsPage,
                  pageSize: groupsPageSize,
                  ...paginationConfig,
                  showTotal: (total) =>
                    `${groupsPage > 0 ? ((groupsPage - 1) * groupsPageSize) + 1 : 0}-${Math.min(groupsPage * groupsPageSize, total)} من ${total} مجموعة`,
                  className: 'pagination'
                }}
                scroll={{ x: 1000 }}
                size="middle"
              />
            )}
          </div>
        </>
      ),
    },
    {
      key: 'posts',
      label: (<span><UnorderedListOutlined className="tab-icon" />{t('group_posts')}</span>),
      children: (
        <>
          <div style={{ marginBottom: 16 }}>
            {multiGroupPostExtractionActive ? (
              <>
                <Alert
                  message={`منشورات المجموعة: ${groupName}`}
                  description={
                    <>
                      <div>المجموعة {currentPostGroupIndex + 1} من {selectedGroupsForPosts.length}</div>
                      <div>إجمالي المنشورات المستخرجة: {posts.length}</div>
                      {currentPostGroupIndex > 0 && (
                        <div>
                          منشورات المجموعات السابقة: {posts.filter(p => p.groupIndex < currentPostGroupIndex).length}
                        </div>
                      )}
                      <div>منشورات المجموعة الحالية: {posts.filter(p => p.groupIndex === currentPostGroupIndex).length}</div>
                    </>
                  }
                  type="info"
                  showIcon
                />
                <div style={{ marginTop: 8 }}>
                  <Progress 
                    percent={Math.round((currentPostGroupIndex / selectedGroupsForPosts.length) * 100)}
                    status="active"
                    format={() => `التقدم الكلي: ${currentPostGroupIndex + 1}/${selectedGroupsForPosts.length}`}
                  />
                </div>
              </>
            ) : (
              <Alert
                message={groupName ? `منشورات المجموعة: ${groupName}` : 'يرجى تحديد مجموعة أولاً'}
                type={groupName ? "info" : "warning"}
                showIcon
              />
            )}
          </div>
          
          {groupId && (
            <div className="input-container">
              <Button
                className="extract-button"
                type="primary"
                onClick={() => fetchGroupPosts(groupId)}
                disabled={loading || loadingPosts}
              >
                {loading || loadingPosts ? <LoadingOutlined /> : <ReloadOutlined />}
                <span>{t('refresh_posts')}</span>
              </Button>
              <Button
                onClick={stopPostExtraction}
                disabled={!extractingPosts}
                danger
                type="primary"
                icon={<CloseOutlined />}
                className="secondary-button"
              >
                {t('stop_extraction')}
              </Button>
              <Button
                onClick={handleSaveExtraction}
                disabled={posts.length === 0}
                icon={<SaveOutlined />}
                className="secondary-button"
              >
                {t('save_extraction')}
              </Button>
              <Button
                onClick={() => {
                  if (selectedPostKeys.length > 0) {
                    setTransferToCommentModalVisible(true);
                  } else {
                    messageApi.error(t('please_select_at_least_one_post'));
                  }
                }}
                disabled={selectedPostKeys.length === 0}
                icon={<MessageOutlined />}
                className="secondary-button"
              >
                {t('extract_commenters')}
              </Button>
              <Button
                onClick={() => {
                  if (selectedPostKeys.length > 0) {
                    setTransferToReactionModalVisible(true);
                  } else {
                    messageApi.error(t('please_select_at_least_one_post'));
                  }
                }}
                disabled={selectedPostKeys.length === 0}
                icon={<ThunderboltOutlined />}
                className="secondary-button"
              >
                {t('extract_reactors')}
              </Button>
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

          {posts.length > 0 && (
            <div className="stats-cards-container">
              {postStatsCards.map((stat, index) => (
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
                  placeholder={t('search_post_placeholder')}
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
                  overlay={
                    <Menu>
                      <Menu.Item key="excel" icon={<FileExcelOutlined style={{ color: '#217346' }} />} onClick={exportPostsToExcel}>
                        {t('export_as_excel')}
                      </Menu.Item>
                    </Menu>
                  }
                  placement="bottomRight"
                  trigger={['click']}
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
                {selectedPostKeys.length > 0 ? (
                  <span className="selected-info">
                    <CheckCircleOutlined className="success-icon" />
                    {t('posts_selected', { count: selectedPostKeys.length })}
                  </span>
                ) : (
                  <span className="selected-info">
                    <UnorderedListOutlined className="primary-icon" />
                    {t('extracted_posts', { count: filteredPosts.length })}
                  </span>
                )}
              </span>
              <div className="table-actions">
                <Space size="middle">
                  <Button
                    onClick={() => setSelectedPostKeys([])}
                    disabled={selectedPostKeys.length === 0}
                    className={selectedPostKeys.length === 0 ? "deselect-button deselect-button-disabled" : "deselect-button"}
                    icon={<CloseOutlined />}
                  >
                    {t('deselect')}
                  </Button>
                </Space>
              </div>
            </div>

            {loadingPosts ? (
              <ShimmerEffect type="table" rows={5} columnCount={6} />
            ) : (
              <Table
                className="posts-table"
                rowSelection={{
                  type: 'checkbox',
                  selectedRowKeys: selectedPostKeys,
                  onChange: (selectedKeys) => setSelectedPostKeys(selectedKeys),
                  selections: [
                    Table.SELECTION_ALL,
                    Table.SELECTION_INVERT,
                    Table.SELECTION_NONE,
                  ],
                  columnWidth: 48,
                  fixed: true,
                  preserveSelectedRowKeys: true,
                }}
                columns={postsColumns}
                dataSource={filteredPosts}
                rowKey="postId"
                loading={loading}
                onChange={handlePostsTableChange}
                pagination={{
                  current: postsPage,
                  pageSize: postsPageSize,
                  ...paginationConfig,
                  showTotal: (total) =>
                    `${postsPage > 0 ? ((postsPage - 1) * postsPageSize) + 1 : 0}-${Math.min(postsPage * postsPageSize, total)} من ${total} منشور`,
                  className: 'pagination'
                }}
                scroll={{ x: 1000 }}
                size="middle"
              />
            )}
          </div>
        </>
      ),
    },
    {
      key: 'members',
      label: (<span><TeamOutlined className="tab-icon" />{t('group_members')}</span>),
      children: (
        <>
          <div style={{ marginBottom: 16 }}>
            <Alert
              message={groupName ? `أعضاء المجموعة: ${groupName}` : 'يرجى تحديد مجموعة أولاً'}
              type={groupName ? "info" : "warning"}
              showIcon
            />
          </div>
          
          {groupId && (
            <div className="input-container">
              <Button
                onClick={stopMemberExtraction}
                disabled={!extractingMembers}
                danger
                type="primary"
                icon={<CloseOutlined />}
                className="secondary-button"
              >
                {t('stop_extraction')}
              </Button>
              <Button
                onClick={handleSaveExtraction}
                disabled={members.length === 0}
                icon={<SaveOutlined />}
                className="secondary-button"
              >
                {t('save_extraction')}
              </Button>
              <Button
                onClick={handleExtractUserData}
                disabled={selectedMemberKeys.length === 0}
                icon={<InfoCircleOutlined />}
                className="secondary-button"
              >
                {t('extract_users_data')}
              </Button>
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

          {members.length > 0 && (
            <div className="stats-cards-container">
              {memberStatsCards.map((stat, index) => (
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
                  placeholder={t('search_member_placeholder')}
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
                  overlay={
                    <Menu>
                      <Menu.Item key="excel" icon={<FileExcelOutlined style={{ color: '#217346' }} />} onClick={exportMembersToExcel}>
                        {t('export_as_excel')}
                      </Menu.Item>
                    </Menu>
                  }
                  placement="bottomRight"
                  trigger={['click']}
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
                {selectedMemberKeys.length > 0 ? (
                  <span className="selected-info">
                    <CheckCircleOutlined className="success-icon" />
                    {t('members_selected', { count: selectedMemberKeys.length })}
                  </span>
                ) : (
                  <span className="selected-info">
                    <TeamOutlined className="primary-icon" />
                    {t('extracted_members', { count: filteredMembers.length })}
                  </span>
                )}
              </span>
              <div className="table-actions">
                <Space size="middle">
                  <Button
                    onClick={() => setSelectedMemberKeys([])}
                    disabled={selectedMemberKeys.length === 0}
                    className={selectedMemberKeys.length === 0 ? "deselect-button deselect-button-disabled" : "deselect-button"}
                    icon={<CloseOutlined />}
                  >
                    {t('deselect')}
                  </Button>
                </Space>
              </div>
            </div>

            {loadingMembers ? (
              <ShimmerEffect type="table" rows={5} columnCount={7} />
            ) : (
              <Table
                className="members-table"
                rowSelection={{
                  type: 'checkbox',
                  selectedRowKeys: selectedMemberKeys,
                  onChange: (selectedKeys) => setSelectedMemberKeys(selectedKeys),
                  selections: [
                    Table.SELECTION_ALL,
                    Table.SELECTION_INVERT,
                    Table.SELECTION_NONE,
                  ],
                  columnWidth: 48,
                  fixed: true,
                  preserveSelectedRowKeys: true,
                }}
                columns={membersColumns}
                dataSource={filteredMembers}
                rowKey="key"
                loading={loading}
                onChange={handleMembersTableChange}
                pagination={{
                  current: membersPage,
                  pageSize: membersPageSize,
                  ...paginationConfig,
                  showTotal: (total) =>
                    `${membersPage > 0 ? ((membersPage - 1) * membersPageSize) + 1 : 0}-${Math.min(membersPage * membersPageSize, total)} من ${total} عضو`,
                  className: 'pagination'
                }}
                scroll={{ x: 1000 }}
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
                  title: t('extraction_type'),
                  dataIndex: 'type',
                  key: 'type',
                  render: (type) => {
                    switch (type) {
                      case 'groups':
                        return <Tag color="blue" icon={<GroupOutlined />}>{t('groups')}</Tag>;
                      case 'posts':
                        return <Tag color="green" icon={<UnorderedListOutlined />}>{t('posts')}</Tag>;
                      case 'members':
                        return <Tag color="orange" icon={<TeamOutlined />}>{t('members')}</Tag>;
                      default:
                        return type;
                    }
                  }
                },
                {
                  title: t('group'),
                  key: 'group',
                  render: (_, record) => record.groupName || '-',
                },
                {
                  title: t('date'),
                  dataIndex: 'date',
                  key: 'date',
                  render: (text) => moment(text).format('YYYY-MM-DD HH:mm'),
                },
                {
                  title: t('count'),
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <ContentContainer isLoading={loading}>
      {loading ? (
          <ShimmerEffect type="table" rows={5} columnCount={6} />
        ) : (
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
                selectedUserIds={selectedMemberKeys}
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
              
              
              <Modal
              title={t('extract_posts_from_groups')}
              open={extractPostsModalVisible}
              onCancel={() => setExtractPostsModalVisible(false)}
              footer={[
                <Button key="back" onClick={() => setExtractPostsModalVisible(false)}>
                  {t('cancel')}
                </Button>,
                <Button
                  key="submit"
                  type="primary"
                  onClick={extractPostsFromSelectedGroups}
                  loading={multiGroupPostExtractionActive}
                >
                  {t('start_extraction')}
                  </Button>,
                ]}
              >
                <div style={{ marginBottom: 16 }}>
                  <Alert
                    message={t('alert')}
                    description={t('posts_extraction_alert')}
                    type="warning"
                    showIcon
                  />
                </div>
                <div>
                  <p>{t('selected_groups')}:</p>
                  <ul>
                    {selectedGroupsForPosts.map(groupId => {
                      const group = groups.find(g => g.groupId === groupId);
                      return (
                        <li key={groupId}>
                          {group?.name || groupId}
                        </li>
                      );
                    })}
                  </ul>
                </div>
                {multiGroupPostExtractionActive && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span>المجموعة: {currentPostGroupIndex} من {selectedGroupsForPosts.length}</span>
                    </div>
                    <Progress 
                      percent={Math.round((currentPostGroupIndex / selectedGroupsForPosts.length) * 100)} 
                      status="active"
                    />
                  </div>
                )}
              </Modal>
              
              <Modal
              title={t('extract_members_from_groups')}
              open={extractMembersModalVisible}
              onCancel={() => setExtractMembersModalVisible(false)}
              footer={[
                <Button key="back" onClick={() => setExtractMembersModalVisible(false)}>
                  {t('cancel')}
                </Button>,
                <Button
                  key="submit"
                  type="primary"
                  onClick={extractMembersFromSelectedGroups}
                  loading={extractingMembers}
                >
                  {t('start_extraction')}
                  </Button>,
                ]}
              >
                <div style={{ marginBottom: 16 }}>
                  <Alert
                    message={t('alert')}
                    description={t('members_extraction_alert')}
                    type="warning"
                    showIcon
                  />
                </div>
                <div>
                  <p>{t('selected_groups')}:</p>
                  <ul>
                    {selectedGroupsForMembers.map(groupId => {
                      const group = groups.find(g => g.groupId === groupId);
                      return (
                        <li key={groupId}>
                          {group?.name || groupId}
                        </li>
                      );
                    })}
                  </ul>
                </div>
                {extractingMembers && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ marginBottom: 8 }}>
                      <span>المجموعة: {currentGroupIndex + 1} من {selectedGroupsForMembers.length}</span>
                    </div>
                    <Progress 
                      percent={Math.round((currentGroupIndex / selectedGroupsForMembers.length) * 100)} 
                      status={isMemberExtractionPaused ? "exception" : "active"} 
                    />
                  </div>
                )}
              </Modal>
              
              <Modal
              title={t('transfer_groups_to_auto_post')}
              open={transferGroupModalVisible}
              onCancel={() => setTransferGroupModalVisible(false)}
              footer={[
                <Button key="back" onClick={() => setTransferGroupModalVisible(false)}>
                  {t('cancel')}
                </Button>,
                <Button
                  key="submit"
                  type="primary"
                  onClick={transferToAutoPostGroup}
                >
                  {t('transfer_to_posting')}
                  </Button>,
                ]}
              >
                <div style={{ marginBottom: 16 }}>
                  <Alert
                    message={t('alert')}
                    description={t('transfer_groups_alert')}
                    type="info"
                    showIcon
                  />
                </div>
                <div>
                  <p>{t('selected_groups')}:</p>
                  <ul>
                    {selectedRowKeys.map(groupId => {
                      const group = groups.find(g => g.groupId === groupId);
                      return (
                        <li key={groupId}>
                          {group?.name || groupId}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </Modal>
              
              <Modal
              title={t('transfer_posts_to_comment_extractor')}
              open={transferToCommentModalVisible}
              onCancel={() => setTransferToCommentModalVisible(false)}
              footer={[
                <Button key="back" onClick={() => setTransferToCommentModalVisible(false)}>
                  {t('cancel')}
                </Button>,
                <Button
                  key="submit"
                  type="primary"
                  onClick={transferToCommentExtractor}
                >
                  {t('transfer_to_comment_extractor')}
                  </Button>,
                ]}
              >
                <div style={{ marginBottom: 16 }}>
                  <Alert
                    message={t('alert')}
                    description={t('transfer_posts_to_comments_alert')}
                    type="info"
                    showIcon
                  />
                </div>
                <div>
                  <p>{t('selected_posts')}:</p>
                  <ul>
                    {selectedPostKeys.map((postId, index) => (
                      <li key={postId}>
                        {t('post')} {index + 1}: {postId}
                      </li>
                    ))}
                  </ul>
                </div>
              </Modal>
              
              <Modal
              title={t('transfer_posts_to_reaction_extractor')}
              open={transferToReactionModalVisible}
              onCancel={() => setTransferToReactionModalVisible(false)}
              footer={[
                <Button key="back" onClick={() => setTransferToReactionModalVisible(false)}>
                  {t('cancel')}
                </Button>,
                <Button
                  key="submit"
                  type="primary"
                  onClick={transferToReactionExtractor}
                >
                  {t('transfer_to_reaction_extractor')}
                  </Button>,
                ]}
              >
                <div style={{ marginBottom: 16 }}>
                  <Alert
                    message={t('alert')}
                    description={t('transfer_posts_to_reactions_alert')}
                    type="info"
                    showIcon
                  />
                </div>
                <div>
                  <p>{t('selected_posts')}:</p>
                  <ul>
                    {selectedPostKeys.map((postId, index) => (
                      <li key={postId}>
                        {t('post')} {index + 1}: {postId}
                      </li>
                    ))}
                  </ul>
                </div>
              </Modal>
            </div>
          </Content>
        </Layout>
      )}
    </ContentContainer>
  );
};

export default MyGroupExtractor;