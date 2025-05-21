import React, { useState, useEffect, useRef } from 'react';
import { 
  Table, Button, Space, Modal, Form, Input, InputNumber, Tag, Tooltip, Card, Typography, 
  Row, Col, Statistic, Select, Switch, Divider, Avatar, Tabs, DatePicker, Popconfirm,
  Badge, Progress, Dropdown, Checkbox, Radio, Upload, Alert, Empty, Spin, Timeline
} from 'antd';
import { 
  UserOutlined, EditOutlined, TrophyOutlined, LockOutlined, DeleteOutlined,
  FilterOutlined, SearchOutlined, BarsOutlined, BarChartOutlined,
  TeamOutlined, UserAddOutlined, UserDeleteOutlined, SettingOutlined, KeyOutlined,
  EyeOutlined, ImportOutlined, CheckCircleOutlined, CloseCircleOutlined,
  HistoryOutlined, MailOutlined, PlusOutlined, ReloadOutlined, UploadOutlined,
  LockFilled, UnlockOutlined, CrownOutlined, CalendarOutlined, IdcardOutlined,
  PieChartOutlined, CloseOutlined
} from '@ant-design/icons';
import ContentContainer from '../components/ContentContainer';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import { useMessage } from '../context/MessageContext';
import { useLanguage } from '../context/LanguageContext';
import '../styles/AdminUserManagement.css';
import locale from 'antd/lib/date-picker/locale/en_US';
import { formatDate, formatDateTime } from '../utils/dateUtils';
import { 
  getLevelColor, 
  getLevelIcon, 
  getLevelTierName,
  getLevelCategory,
  getLevelBadge,
  getLevelGradient,
  levelProgressPercentage, 
  pointsForNextLevel,
  POINTS_PER_LEVEL
} from '../utils/levelUtils';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const AdminUserManagement = () => {
  // State variables
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addPointsModalVisible, setAddPointsModalVisible] = useState(false);
  const [editUserModalVisible, setEditUserModalVisible] = useState(false);
  const [userDetailsModalVisible, setUserDetailsModalVisible] = useState(false);
  const [passwordResetModalVisible, setPasswordResetModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [dateRange, setDateRange] = useState(null);
  const [userStatistics, setUserStatistics] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    admins: 0
  });
  const [userActivities, setUserActivities] = useState([]);
  const [pointsHistory, setPointsHistory] = useState([]);
  const [reportType, setReportType] = useState('general');
  const [bulkActionVisible, setBulkActionVisible] = useState(false);
  
  // Forms
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  
  // Context
  const { user: currentUser } = useUser();
  const { showSuccess, showError, showLoading, updateMessage } = useMessage();
  const { t } = useLanguage();
  
  // Refs
  const searchInput = useRef(null);

  // Fetch all users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const loadingKey = 'loading-users';
      showLoading(t('loading_users'), loadingKey);
      
      const response = await axios.get('/api/admin/users');
      setUsers(response.data);
      setFilteredUsers(response.data);
      
      // Calculate statistics
      const stats = {
        total: response.data.length,
        active: response.data.filter(user => user.isActive).length,
        inactive: response.data.filter(user => !user.isActive).length,
        admins: response.data.filter(user => user.role === 'admin').length
      };
      setUserStatistics(stats);
      
      updateMessage('success', t('users_loaded'), loadingKey);
    } catch (error) {
      console.error('Error fetching users:', error);
      showError(t('failed_to_fetch_users', 'فشل في جلب بيانات المستخدمين'));
      
      // Mock data for demo/development
      generateMockUsers();
    } finally {
      setLoading(false);
    }
  };

  // Generate mock users for demo/development
  const generateMockUsers = () => {
    const mockUsers = [
      {
        _id: 'user_1',
        name: 'أحمد محمد',
        username: 'ahmed',
        email: 'ahmed@example.com',
        points: 120,
        allPoints: 450,
        level: 3,
        role: 'admin',
        isActive: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * 3).toISOString(),
        lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
      },
      {
        _id: 'user_2',
        name: 'محمد علي',
        username: 'mohamed',
        email: 'mohamed@example.com',
        points: 80,
        allPoints: 200,
        level: 2,
        role: 'user',
        isActive: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * 2).toISOString(),
        lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString()
      },
      {
        _id: 'user_3',
        name: 'فاطمة أحمد',
        username: 'fatima',
        email: 'fatima@example.com',
        points: 50,
        allPoints: 150,
        level: 1,
        role: 'user',
        isActive: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
        lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString()
      }
    ];

    setUsers(mockUsers);
    setFilteredUsers(mockUsers);

    // Calculate statistics
    const stats = {
      total: mockUsers.length,
      active: mockUsers.filter(user => user.isActive).length,
      inactive: mockUsers.filter(user => !user.isActive).length,
      admins: mockUsers.filter(user => user.role === 'admin').length
    };
    setUserStatistics(stats);
  };

  // Utility function to check if the API actually exists
  const apiEndpointExists = async (url) => {
    try {
      // First make a lightweight OPTIONS request
      await axios.options(url);
      return true;
    } catch (error) {
      // If we get a 404, we know the endpoint doesn't exist
      return false;
    }
  };

  // Fetch user activities for selected user - with enhanced mock data handling
  const fetchUserActivities = async (userId) => {
    // Check if we are in development mode or the endpoint exists
    const endpointUrl = `/api/admin/user-activities/${userId}`;
    const apiExists = await apiEndpointExists(endpointUrl);
    
    if (apiExists) {
      try {
        const response = await axios.get(endpointUrl);
        
        // If response exists and has data
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          setUserActivities(response.data);
        } else {
          generateMockActivities(userId);
        }
      } catch (error) {
        console.warn('Falling back to mock data for user activities');
        generateMockActivities(userId);
      }
    } else {
      // Skip the API call altogether if we know it doesn't exist
      generateMockActivities(userId);
    }
  };

  // Generate mock user activities
  const generateMockActivities = (userId) => {
    // Generate more comprehensive mock data based on the user
    const user = users.find(u => u._id === userId) || {};
    const mockActivities = [
      {
        id: `act-${userId}-1`,
        userId: userId,
        action: 'تسجيل الدخول',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
        details: 'تسجيل الدخول من متصفح Chrome'
      },
      {
        id: `act-${userId}-2`,
        userId: userId,
        action: 'تحديث بيانات الملف الشخصي',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(), // 4 days ago
        details: 'تغيير الاسم والبريد الإلكتروني'
      },
      {
        id: `act-${userId}-3`,
        userId: userId,
        action: 'تسجيل الدخول',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 days ago
        details: 'تسجيل الدخول من متصفح Firefox'
      }
    ];
    
    // Add activity based on user's level if available
    if (user.level) {
      mockActivities.push({
        id: `act-${userId}-4`,
        userId: userId,
        action: `ترقية إلى المستوى ${user.level}`,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(), // 15 days ago
        details: `تم ترقية المستخدم إلى المستوى ${user.level} بعد تجميع النقاط الكافية`
      });
    }
    
    setUserActivities(mockActivities);
  };

  // Fetch points history for selected user - with enhanced mock data handling
  const fetchPointsHistory = async (userId) => {
    // Check if we are in development mode or the endpoint exists
    const endpointUrl = `/api/admin/points-history/${userId}`;
    const apiExists = await apiEndpointExists(endpointUrl);
    
    if (apiExists) {
      try {
        const response = await axios.get(endpointUrl);
        
        // If response exists and has data
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          setPointsHistory(response.data);
        } else {
          generateMockPointsHistory(userId);
        }
      } catch (error) {
        console.warn('Falling back to mock data for points history');
        generateMockPointsHistory(userId);
      }
    } else {
      // Skip the API call altogether if we know it doesn't exist
      generateMockPointsHistory(userId);
    }
  };

  // Generate mock points history
  const generateMockPointsHistory = (userId) => {
    const user = users.find(u => u._id === userId);
    const adminUser = users.find(u => u.role === 'admin') || { name: 'المدير' };
    
    const mockPointsHistory = [
      {
        id: `pts-${userId}-1`,
        userId: userId,
        points: 50,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(), // 1 day ago
        operation: 'إتمام مهمة',
        by: 'النظام'
      },
      {
        id: `pts-${userId}-2`,
        userId: userId,
        points: 100,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
        operation: 'إضافة نقاط بواسطة المدير',
        by: adminUser.name
      },
      {
        id: `pts-${userId}-3`,
        userId: userId,
        points: -20,
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(), // 10 days ago
        operation: 'استبدال نقاط بمكافأة',
        by: user?.name || 'المستخدم'
      }
    ];
    
    setPointsHistory(mockPointsHistory);
  };

  useEffect(() => {
    // Only fetch if the current user is an admin
    if (currentUser && currentUser.role === 'admin') {
      fetchUsers();
    }
  }, [currentUser]);

  // Apply filters
  useEffect(() => {
    if (users.length > 0) {
      let result = [...users];
      
      // Apply search text filter
      if (searchText) {
        const searchTextLower = searchText.toLowerCase();
        result = result.filter(user => 
          user.name.toLowerCase().includes(searchTextLower) ||
          user.email.toLowerCase().includes(searchTextLower) ||
          user.username.toLowerCase().includes(searchTextLower)
        );
      }
      
      // Apply status filter
      if (statusFilter !== 'all') {
        const isActive = statusFilter === 'active';
        result = result.filter(user => user.isActive === isActive);
      }
      
      // Apply role filter
      if (roleFilter !== 'all') {
        result = result.filter(user => user.role === roleFilter);
      }
      
      // Apply date range filter
      if (dateRange && dateRange[0] && dateRange[1]) {
        const startDate = dateRange[0].startOf('day');
        const endDate = dateRange[1].endOf('day');
        
        result = result.filter(user => {
          const createdAt = new Date(user.createdAt);
          return createdAt >= startDate && createdAt <= endDate;
        });
      }
      
      setFilteredUsers(result);
    }
  }, [users, searchText, statusFilter, roleFilter, dateRange]);

  // Reset filters
  const resetFilters = () => {
    setSearchText('');
    setStatusFilter('all');
    setRoleFilter('all');
    setDateRange(null);
    if (searchInput.current) {
      searchInput.current.input.value = '';
    }
  };

  // Handle adding points to a user
  const handleAddPoints = (user) => {
    setSelectedUser(user);
    form.setFieldsValue({ points: 0, operation: 'إضافة نقاط بواسطة المدير' });
    setAddPointsModalVisible(true);
  };

  // Handle editing a user
  const handleEditUser = (user) => {
    setSelectedUser(user);
    editForm.setFieldsValue({
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      isActive: user.isActive
    });
    setEditUserModalVisible(true);
  };

  // Handle viewing user details
  const handleViewUserDetails = async (user) => {
    setSelectedUser(user);
    // Set timeout to ensure smooth transition
    setTimeout(() => {
      setUserDetailsModalVisible(true);
      fetchUserActivities(user._id);
      fetchPointsHistory(user._id);
    }, 50);
  };

  // Handle password reset
  const handlePasswordReset = (user) => {
    setSelectedUser(user);
    passwordForm.resetFields();
    // Set timeout to ensure smooth transition
    setTimeout(() => {
      setPasswordResetModalVisible(true);
    }, 50);
  };

  // Submit points form
  const handleAddPointsSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      const response = await axios.post('/api/admin/add-points', {
        userId: selectedUser._id,
        points: values.points,
        operation: values.operation
      });

      if (response.data.success) {
        showSuccess(t('points_added_successfully'));
        setAddPointsModalVisible(false);
        
        // Update the user in the local state
        setUsers(users.map(user => {
          if (user._id === selectedUser._id) {
            return {
              ...user,
              points: response.data.newPoints,
              allPoints: response.data.allPoints,
              level: response.data.level
            };
          }
          return user;
        }));
      }
    } catch (error) {
      console.error('Error adding points:', error);
      showError(t('failed_to_add_points'));
      
      // Handle mock data for demo
      if (error.request) {
        const mockPoints = parseInt(form.getFieldValue('points')) || 10;
        const updatedUsers = users.map(user => {
          if (user._id === selectedUser._id) {
            const newPoints = user.points + mockPoints;
            const newAllPoints = user.allPoints + mockPoints;
            const newLevel = Math.floor(newAllPoints / 200) + 1;
            return {
              ...user,
              points: newPoints,
              allPoints: newAllPoints,
              level: newLevel
            };
          }
          return user;
        });
        setUsers(updatedUsers);
        setAddPointsModalVisible(false);
        showSuccess(t('points_added_successfully_simulation'));
      }
    }
  };

  // Submit edit user form
  const handleEditUserSubmit = async () => {
    try {
      const values = await editForm.validateFields();
      const loadingKey = 'saving-user';
      showLoading(t('saving_user_data'), loadingKey);
      
      // If it's a new user (no selectedUser) use POST, otherwise use PUT
      let response;
      if (!selectedUser) {
          // Adding a new user with enhanced validation
        try {
          // Validate password strength
          if (values.password && values.password.length < 8) {
            throw new Error(t('password_min_length_8'));
          }
          
          if (values.password && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(values.password)) {
            throw new Error(t('password_complexity_requirements'));
          }

          // Validate username format
          if (!/^[a-zA-Z0-9_]{3,20}$/.test(values.username)) {
            throw new Error(t('username_format_error'));
          }

          // Check for existing user before making API call
          const existingUser = users.find(u => 
            u.email === values.email || u.username === values.username
          );

          if (existingUser) {
            throw new Error(
              existingUser.email === values.email 
                ? t('email_already_exists') 
                : t('username_already_exists')
            );
          }

          const userData = {
            ...values,
            points: 0,
            allPoints: 0,
            level: 1,
            createdAt: new Date().toISOString(),
            lastLogin: null
          };

          response = await axios.post('/api/admin/users', userData);
          
          // تحديث القائمة مباشرة بعد الإضافة الناجحة
          if (response.data && response.data.success) {
            const newUser = response.data.user;
            
            // تأكد من تنسيق البيانات بشكل صحيح
            const newUserFormatted = {
              ...newUser,
              _id: newUser._id,
              createdAt: newUser.createdAt || new Date().toISOString(),
              lastLogin: newUser.lastLogin || null
            };
            
            // إضافة المستخدم الجديد إلى قائمة المستخدمين
            setUsers(prevUsers => {
              const updatedUsers = [...prevUsers, newUserFormatted];
              setFilteredUsers(updatedUsers); // تحديث القائمة المصفاة أيضًا
              return updatedUsers;
            });
            
            // تحديث الإحصائيات
            setUserStatistics(prevStats => ({
              ...prevStats,
              total: prevStats.total + 1,
              active: newUserFormatted.isActive ? prevStats.active + 1 : prevStats.active,
              admins: newUserFormatted.role === 'admin' ? prevStats.admins + 1 : prevStats.admins
            }));
            
            showSuccess(t('user_added_successfully'));
            editForm.resetFields(); // مسح النموذج
            setEditUserModalVisible(false);
          } else {
            throw new Error('فشل في إنشاء المستخدم');
          }
        } catch (error) {
          console.error('Error creating user:', error);
          
          if (error.message) {
            showError(error.message);
          } else if (error.response) {
            const errorMsg = error.response.data?.message || 'حدث خطأ أثناء إنشاء المستخدم';
            showError(errorMsg);
          } else {
            // إذا لم يكن الخطأ من API، نفترض أنه تم إضافة المستخدم بقاعدة البيانات
            // لكن هناك مشكلة في استلام البيانات، سنضيف المستخدم يدويًا للقائمة المحلية
            const mockUser = {
              _id: `user_${Date.now()}`,
              ...values,
              points: 0,
              allPoints: 0,
              level: 1,
              createdAt: new Date().toISOString(),
              lastLogin: null
            };
            
            setUsers(prevUsers => {
              const updatedUsers = [...prevUsers, mockUser];
              setFilteredUsers(updatedUsers);
              return updatedUsers;
            });
            
            // تحديث الإحصائيات
            setUserStatistics(prevStats => ({
              ...prevStats,
              total: prevStats.total + 1,
              active: values.isActive ? prevStats.active + 1 : prevStats.active,
              admins: values.role === 'admin' ? prevStats.admins + 1 : prevStats.admins
            }));
            
            showSuccess(t('user_added_successfully_simulation'));
            editForm.resetFields();
            setEditUserModalVisible(false);
          }
        }
      } else {
        // Updating existing user
        try {
          response = await axios.put(`/api/admin/users/${selectedUser._id}`, values);
          
          // Update the user in the local state
          setUsers(users.map(user => {
            if (user._id === selectedUser._id) {
              return {
                ...user,
                ...values
              };
            }
            return user;
          }));
          showSuccess(t('user_updated_successfully'));
        } catch (error) {
          console.error('Error updating user:', error);
          
          // Mock update for demo/development
          setUsers(users.map(user => {
            if (user._id === selectedUser._id) {
              return {
                ...user,
                ...values
              };
            }
            return user;
          }));
          showSuccess(t('user_updated_successfully_simulation'));
        }
      }
      
      updateMessage('success', t('data_saved_successfully'), loadingKey);
      setEditUserModalVisible(false);
    } catch (error) {
      console.error('Error saving user:', error);
      showError(t('failed_to_save_user_data'));
      
      // If server is not available or API errors, show a more detailed message
      if (error.response) {
        if (error.response.status === 409) {
          showError(t('email_username_already_exists'));
        } else if (error.response.status >= 500) {
          showError(t('server_error_try_later'));
        }
      } else if (error.request) {
        showError(t('cannot_connect_to_server'));
      }
    }
  };

  // Submit password reset form - تحسين معالجة إعادة تعيين كلمة المرور
  const handlePasswordResetSubmit = async () => {
    try {
      const values = await passwordForm.validateFields();
      
      // التحقق من تطابق كلمتي المرور
      if (values.newPassword !== values.confirmPassword) {
        showError(t('passwords_not_match'));
        return;
      }
      
      // التحقق من طول كلمة المرور
      if (values.newPassword.length < 6) {
        showError(t('password_min_length_6'));
        return;
      }
      
      const loadingKey = 'resetting-password';
      showLoading(t('resetting_password'), loadingKey);
      
      try {
        // تأكد من وجود معرف المستخدم قبل الطلب
        if (!selectedUser || !selectedUser._id) {
          throw new Error(t('user_not_selected'));
        }
        
        const response = await axios.post(`/api/admin/reset-password/${selectedUser._id}`, {
          newPassword: values.newPassword
        });

        if (response.data && response.data.success) {
          updateMessage('success', t('password_reset_success'), loadingKey);
          setPasswordResetModalVisible(false);
        } else {
          throw new Error('فشل في إعادة تعيين كلمة المرور: استجابة غير صالحة');
        }
      } catch (error) {
        console.error('Error resetting password:', error);
        
        if (error.response) {
          const errorMsg = error.response.data?.message || 'خطأ غير معروف';
          updateMessage('error', `فشل في إعادة تعيين كلمة المرور: ${errorMsg}`, loadingKey);
        } else {
          // في حالة وجود مشكلة في الاتصال بالخادم
          updateMessage('success', t('password_reset_success_simulation'), loadingKey);
          setPasswordResetModalVisible(false);
        }
      }
    } catch (error) {
      console.error('Form validation error:', error);
      showError(t('please_check_input_data'));
    }
  };

  // Handle user deletion - تحسين معالجة حذف المستخدم
  const handleDeleteUser = async (userId) => {
    const loadingKey = 'deleting-user';
    showLoading(t('deleting_user'), loadingKey);
    
    try {
      // تأكد من وجود معرف المستخدم قبل الطلب
      if (!userId) {
        throw new Error(t('user_id_not_specified_for_deletion'));
      }
      
      const response = await axios.delete(`/api/admin/users/${userId}`);
      
      if (response.data && response.data.success) {
        updateMessage('success', t('user_deleted_successfully'), loadingKey);
        
        // تحديث القائمة والإحصائيات
        const deletedUser = users.find(user => user._id === userId);
        
        // تحديث القائمة
        setUsers(prevUsers => {
          const updatedUsers = prevUsers.filter(user => user._id !== userId);
          setFilteredUsers(updatedUsers.filter(user => 
            (statusFilter === 'all' || (statusFilter === 'active' ? user.isActive : !user.isActive)) &&
            (roleFilter === 'all' || user.role === roleFilter)
          ));
          return updatedUsers;
        });
        
        // تحديث الإحصائيات
        if (deletedUser) {
          setUserStatistics(prevStats => ({
            ...prevStats,
            total: prevStats.total - 1,
            active: deletedUser.isActive ? prevStats.active - 1 : prevStats.active,
            inactive: !deletedUser.isActive ? prevStats.inactive - 1 : prevStats.inactive,
            admins: deletedUser.role === 'admin' ? prevStats.admins - 1 : prevStats.admins
          }));
        }
      } else {
        throw new Error(t('user_delete_invalid_response'));
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      
      if (error.response) {
        const errorMsg = error.response.data?.message || 'خطأ غير معروف';
        updateMessage('error', `فشل في حذف المستخدم: ${errorMsg}`, loadingKey);
      } else {
        // في حالة وجود مشكلة في الاتصال بالخادم، نقوم بالحذف محلياً
        const deletedUser = users.find(user => user._id === userId);
        
        // تحديث القائمة
        setUsers(prevUsers => {
          const updatedUsers = prevUsers.filter(user => user._id !== userId);
          setFilteredUsers(updatedUsers.filter(user => 
            (statusFilter === 'all' || (statusFilter === 'active' ? user.isActive : !user.isActive)) &&
            (roleFilter === 'all' || user.role === roleFilter)
          ));
          return updatedUsers;
        });
        
        // تحديث الإحصائيات
        if (deletedUser) {
          setUserStatistics(prevStats => ({
            ...prevStats,
            total: prevStats.total - 1,
            active: deletedUser.isActive ? prevStats.active - 1 : prevStats.active,
            inactive: !deletedUser.isActive ? prevStats.inactive - 1 : prevStats.inactive,
            admins: deletedUser.role === 'admin' ? prevStats.admins - 1 : prevStats.admins
          }));
        }
        
        updateMessage('success', t('user_deleted_successfully_simulation'), loadingKey);
      }
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action) => {
    if (selectedRowKeys.length === 0) {
      showError(t('please_select_at_least_one_user'));
      return;
    }

    try {
      let response;
      let successMessage = '';
      
      switch(action) {
        case 'activate':
          try {
            response = await axios.post('/api/admin/bulk-action', {
              userIds: selectedRowKeys,
              action: 'activate'
            });
          } catch (error) {
            // Mock activation
            setUsers(users.map(user => 
              selectedRowKeys.includes(user._id) ? { ...user, isActive: true } : user
            ));
          }
          successMessage = t('users_activated_successfully');
          break;
        case 'deactivate':
          try {
            response = await axios.post('/api/admin/bulk-action', {
              userIds: selectedRowKeys,
              action: 'deactivate'
            });
          } catch (error) {
            // Mock deactivation
            setUsers(users.map(user => 
              selectedRowKeys.includes(user._id) ? { ...user, isActive: false } : user
            ));
          }
          successMessage = t('users_deactivated_successfully');
          break;
        case 'delete':
          try {
            response = await axios.post('/api/admin/bulk-action', {
              userIds: selectedRowKeys,
              action: 'delete'
            });
          } catch (error) {
            // Mock deletion
            setUsers(users.filter(user => !selectedRowKeys.includes(user._id)));
          }
          successMessage = t('users_deleted_successfully');
          break;
        case 'addPoints':
          const points = prompt(t('enter_points_amount'));
          if (!points) return;
          
          try {
            response = await axios.post('/api/admin/bulk-action', {
              userIds: selectedRowKeys,
              action: 'addPoints',
              points: parseInt(points),
              operation: 'إضافة نقاط جماعية بواسطة المدير'
            });
          } catch (error) {
            // Mock adding points
            const pointsValue = parseInt(points);
            setUsers(users.map(user => {
              if (selectedRowKeys.includes(user._id)) {
                const newPoints = user.points + pointsValue;
                const newAllPoints = user.allPoints + pointsValue;
                const newLevel = Math.floor(newAllPoints / 200) + 1;
                return {
                  ...user, 
                  points: newPoints, 
                  allPoints: newAllPoints,
                  level: newLevel
                };
              }
              return user;
            }));
          }
          successMessage = t('points_added_to_users_successfully');
          break;
        default:
          return;
      }

      showSuccess(successMessage);
      setSelectedRowKeys([]); // Clear selection
      setBulkActionVisible(false);
    } catch (error) {
      console.error('Error performing bulk action:', error);
      showError(t('bulk_action_failed'));
    }
  };


  // Row selection configuration
  const rowSelection = {
    selectedRowKeys,
    onChange: keys => setSelectedRowKeys(keys),
    selections: [
      Table.SELECTION_ALL,
      Table.SELECTION_INVERT,
      {
        key: 'active',
        text: t('select_active_users'),
        onSelect: () => {
          const keys = users
            .filter(user => user.isActive)
            .map(user => user._id);
          setSelectedRowKeys(keys);
        }
      },
      {
        key: 'inactive',
        text: t('select_inactive_users'),
        onSelect: () => {
          const keys = users
            .filter(user => !user.isActive)
            .map(user => user._id);
          setSelectedRowKeys(keys);
        }
      }
    ]
  };

  // Table columns
  const columns = [
    {
      title: t('name'),
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <Avatar 
            icon={<UserOutlined />} 
            src={record.avatar} 
            style={{ backgroundColor: record.avatar ? 'transparent' : '#1890ff' }}
          />
          <span>{text}</span>
          {record.role === 'admin' && <Tag color="red" icon={<CrownOutlined />}>{t('admin')}</Tag>}
        </Space>
      ),
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: t('username'),
      dataIndex: 'username',
      key: 'username',
      sorter: (a, b) => a.username.localeCompare(b.username),
    },
    {
      title: t('email'),
      dataIndex: 'email',
      key: 'email',
      render: email => (
        <Space>
          <MailOutlined />
          <span>{email}</span>
        </Space>
      ),
    },
    {
      title: t('points'),
      dataIndex: 'points',
      key: 'points',
      render: (points, record) => (
        <Tooltip title={`${t('total_points')}: ${record.allPoints}`}>
          <div>
            <Tag color="green">{points}</Tag>
            <Progress 
              percent={Math.min(100, Math.round((points / ((record.level + 1) * 100)) * 100))} 
              size="small" 
              showInfo={false}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
          </div>
        </Tooltip>
      ),
      sorter: (a, b) => a.points - b.points,
    },
    {
      title: t('level'),
      dataIndex: 'level',
      key: 'level',
      render: (level, record) => {
        const tierName = getLevelTierName(level);
        const levelColor = getLevelColor(level);
        const gradient = getLevelGradient(level);
        
        return (
          <Tooltip title={`${tierName} - ${t('level')} ${level}`}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              padding: '3px 8px',
              borderRadius: '10px',
              color: 'white',
              width: 'fit-content',
              ...gradient
            }}>
              {getLevelIcon(level, { style: { marginRight: '5px' } })}
              <span>{level}</span>
            </div>
          </Tooltip>
        );
      },
      sorter: (a, b) => a.level - b.level,
    },
    {
      title: t('registration_date'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: date => (
        <Space>
          <CalendarOutlined />
          <span>{formatDate(date)}</span>
        </Space>
      ),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
    {
      title: t('status'),
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        isActive ? 
          <Badge status="success" text={<Tag color="green" icon={<CheckCircleOutlined />}>{t('active')}</Tag>} /> : 
          <Badge status="error" text={<Tag color="red" icon={<CloseCircleOutlined />}>{t('inactive')}</Tag>} />
      ),
      filters: [
        { text: t('active'), value: true },
        { text: t('inactive'), value: false },
      ],
      onFilter: (value, record) => record.isActive === value,
    },
    {
      title: t('actions'),
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title={t('view_details')}>
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => handleViewUserDetails(record)}
            />
          </Tooltip>
          <Tooltip title={t('add_points')}>
            <Button 
              type="text" 
              icon={<TrophyOutlined />} 
              onClick={() => handleAddPoints(record)}
            />
          </Tooltip>
          <Tooltip title={t('edit_user')}>
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => handleEditUser(record)}
            />
          </Tooltip>
          <Tooltip title={t('reset_password')}>
            <Button 
              type="text" 
              icon={<KeyOutlined />} 
              onClick={() => handlePasswordReset(record)}
            />
          </Tooltip>
          <Tooltip title={t('delete_user')}>
            <Popconfirm
              title={t('confirm_delete_user')}
              onConfirm={() => handleDeleteUser(record._id)}
              okText={t('yes')}
              cancelText={t('no')}
            >
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />} 
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // If user is not admin, show access denied
  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div className="access-denied">
        <LockOutlined style={{ fontSize: 64 }} />
        <Title level={2}>{t('access_denied')}</Title>
        <Text>{t('access_denied_message')}</Text>
      </div>
    );
  }

  // Prepare user distribution data
  const userDistributionData = [
    { type: t('active_users'), value: userStatistics.active, color: '#52c41a' },
    { type: t('inactive_users'), value: userStatistics.inactive, color: '#ff4d4f' },
    { type: t('admins'), value: userStatistics.admins, color: '#722ed1' }
  ];
  
  // Calculate percentages for the distribution
  const totalUsers = userDistributionData.reduce((sum, item) => sum + item.value, 0);
  userDistributionData.forEach(item => {
    item.percentage = totalUsers > 0 ? Math.round((item.value / totalUsers) * 100) : 0;
  });

  // Filter dropdown for bulk actions
  const bulkActionMenu = (
    <div className="bulk-action-dropdown">
      <Button 
        type="text" 
        icon={<CheckCircleOutlined />} 
        block 
        onClick={() => handleBulkAction('activate')}
      >
        {t('activate_users')}
      </Button>
      <Button 
        type="text" 
        icon={<CloseCircleOutlined />} 
        block 
        onClick={() => handleBulkAction('deactivate')}
      >
        {t('deactivate_users')}
      </Button>
      <Button 
        type="text" 
        icon={<TrophyOutlined />} 
        block 
        onClick={() => handleBulkAction('addPoints')}
      >
        {t('add_points')}
      </Button>
      <Divider style={{ margin: '8px 0' }} />
      <Popconfirm
        title={t('confirm_delete_selected_users')}
        onConfirm={() => handleBulkAction('delete')}
        okText={t('yes')}
        cancelText={t('no')}
      >
        <Button 
          type="text" 
          danger 
          icon={<DeleteOutlined />} 
          block
        >
          {t('delete_users')}
        </Button>
      </Popconfirm>
    </div>
  );


  // Prepare tabs items
  const userDetailsTabs = [
    {
      key: '1',
      label: <span><UserOutlined />{t('personal_data')}</span>,
      children: selectedUser && (
        <>
          <div className="user-profile-header">
            <Avatar 
              size={80} 
              icon={<UserOutlined />} 
              src={selectedUser.avatar}
              style={{ backgroundColor: selectedUser.avatar ? 'transparent' : '#1890ff' }}
            />
            <div className="user-profile-info">
              <Title level={4}>{selectedUser.name}</Title>
              <div>
                <Tag color={selectedUser.role === 'admin' ? 'red' : 'blue'}>
                  {selectedUser.role === 'admin' ? t('admin') : t('user')}
                </Tag>
                <Tag color={selectedUser.isActive ? 'green' : 'red'}>
                  {selectedUser.isActive ? t('active') : t('inactive')}
                </Tag>
              </div>
            </div>
          </div>
          
          <Divider />
          
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Statistic 
                title={t('email')}
                value={selectedUser.email} 
                prefix={<MailOutlined />} 
              />
            </Col>
            <Col span={12}>
              <Statistic 
                title={t('username')}
                value={selectedUser.username} 
                prefix={<IdcardOutlined />} 
              />
            </Col>
            <Col span={8}>
              <Statistic 
                title={t('current_points')}
                value={selectedUser.points} 
                valueStyle={{ color: '#3f8600' }}
                prefix={<TrophyOutlined />} 
              />
            </Col>
            <Col span={8}>
              <Statistic 
                title={t('total_points')}
                value={selectedUser.allPoints} 
                valueStyle={{ color: '#1890ff' }}
                prefix={<TrophyOutlined />} 
              />
            </Col>
            <Col span={8}>
              <Statistic 
                title={t('level')}
                value={selectedUser.level} 
                valueStyle={{ color: getLevelColor(selectedUser.level) }}
                prefix={getLevelIcon(selectedUser.level)}
                suffix={
                  <Tooltip title={getLevelTierName(selectedUser.level)}>
                    <Tag color={getLevelColor(selectedUser.level)} style={{
                      marginLeft: '5px',
                      background: getLevelGradient(selectedUser.level).background,
                      color: 'white',
                      border: 'none'
                    }}>
                      {getLevelTierName(selectedUser.level)}
                    </Tag>
                  </Tooltip>
                }
              />
              <div style={{ marginTop: '10px' }}>
                <div style={{ 
                  height: '10px', 
                  background: '#f0f0f0', 
                  borderRadius: '5px', 
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${levelProgressPercentage(selectedUser.allPoints)}%`,
                    background: getLevelGradient(selectedUser.level).background,
                    borderRadius: '5px'
                  }}></div>
                </div>
                <div style={{ fontSize: '12px', marginTop: '5px', color: '#8c8c8c' }}>
                  {pointsForNextLevel(selectedUser.allPoints).toLocaleString()} {t('points_for_next_level')}
                </div>
              </div>
            </Col>
            <Col span={12}>
              <Statistic 
                title={t('registration_date')}
                value={formatDate(selectedUser.createdAt)} 
                prefix={<CalendarOutlined />} 
              />
            </Col>
            <Col span={12}>
              <Statistic 
                title={t('last_login')}
                value={selectedUser.lastLogin ? formatDate(selectedUser.lastLogin) : t('not_available')}
                prefix={<HistoryOutlined />} 
              />
            </Col>
          </Row>
          
          <Divider />
          
          <Space>
            <Button 
              type="primary" 
              icon={<EditOutlined />} 
              onClick={() => {
                setUserDetailsModalVisible(false);
                setTimeout(() => {
                  handleEditUser(selectedUser);
                }, 300);
              }}
            >
              {t('edit_data')}
            </Button>
            <Button 
              icon={<TrophyOutlined />} 
              onClick={() => {
                setUserDetailsModalVisible(false);
                setTimeout(() => {
                  handleAddPoints(selectedUser);
                }, 300);
              }}
            >
              {t('add_points')}
            </Button>
            <Button 
              icon={<KeyOutlined />} 
              onClick={() => {
                setUserDetailsModalVisible(false);
                setTimeout(() => {
                  handlePasswordReset(selectedUser);
                }, 300);
              }}
            >
              {t('reset_password')}
            </Button>
          </Space>
        </>
      )
    },
    {
      key: '2',
      label: <span><HistoryOutlined />{t('activity_log')}</span>,
      children: (
        userActivities.length > 0 ? (
          <Timeline mode="left">
            {userActivities.map((activity, index) => (
              <Timeline.Item key={index} label={formatDateTime(activity.timestamp)}>
                {activity.action}
              </Timeline.Item>
            ))}
          </Timeline>
        ) : (
          <Empty description={t('no_activity_log')} />
        )
      )
    },
    {
      key: '3',
      label: <span><TrophyOutlined />{t('points_log')}</span>,
      children: (
        pointsHistory.length > 0 ? (
          <Table
            dataSource={pointsHistory}
            columns={[
              {
                title: t('date'),
                dataIndex: 'timestamp',
                key: 'timestamp',
                render: date => formatDateTime(date)
              },
              {
                title: t('points'),
                dataIndex: 'points',
                key: 'points',
                render: points => (
                  <Tag color={points > 0 ? 'green' : 'red'}>
                    {points > 0 ? `+${points}` : points}
                  </Tag>
                )
              },
              {
                title: t('operation'),
                dataIndex: 'operation',
                key: 'operation'
              },
              {
                title: t('by'),
                dataIndex: 'by',
                key: 'by'
              }
            ]}
            pagination={{ pageSize: 5 }}
          />
        ) : (
          <Empty description={t('no_points_log')} />
        )
      )
    }
  ];

  // Prepare stats tabs items
  const statsTabItems = [
    {
      key: '1',
      label: t('user_distribution'),
      children: (
        <Row gutter={24}>
          <Col xs={24} lg={12}>
            <Card 
              className="chart-inner-card" 
              title={t('user_distribution_by_status_role')}
            >
              {userDistributionData.map((item, index) => (
                <div key={index} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text strong>{item.type}</Text>
                    <Text>{item.value} ({item.percentage}%)</Text>
                  </div>
                  <Progress 
                    percent={item.percentage} 
                    strokeColor={item.color}
                    showInfo={false}
                    size="large"
                    trailColor="#f0f0f0"
                  />
                </div>
              ))}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card 
              className="chart-inner-card" 
              title={t('level_statistics_by_category')}
            >
              <Row gutter={[16, 16]}>
                {[
                  { name: t('level_tier_beginner'), range: [1, 5] },
                  { name: t('level_tier_learner'), range: [6, 10] },
                  { name: t('level_tier_intermediate'), range: [11, 15] },
                  { name: t('level_tier_advanced'), range: [16, 20] },
                  { name: t('level_tier_expert'), range: [21, 25] },
                  { name: t('level_tier_professional'), range: [26, 30] },
                  { name: t('level_tier_proficient'), range: [31, 35] },
                  { name: t('level_tier_master'), range: [36, 40] },
                  { name: t('level_tier_legendary'), range: [41, 45] },
                  { name: t('level_tier_elite'), range: [46, 50] },
                  { name: t('level_tier_thunderer'), range: [51, 55] },
                  { name: t('level_tier_leader'), range: [56, 60] },
                  { name: t('level_tier_myth'), range: [61, 65] },
                  { name: t('level_tier_warrior'), range: [66, 70] },
                  { name: t('level_tier_knight'), range: [71, 75] },
                  { name: t('level_tier_sultan'), range: [76, 80] },
                  { name: t('level_tier_king'), range: [81, 85] },
                  { name: t('level_tier_emperor'), range: [86, 90] },
                  { name: t('level_tier_monster'), range: [91, 95] },
                  { name: t('level_tier_icon'), range: [96, 100] },
                  { name: t('level_tier_joker'), range: [101, Infinity] }
                ].map((tier, index) => {
                  const tierUsers = users.filter(u => u.level >= tier.range[0] && u.level <= tier.range[1]);
                  const percentage = users.length > 0 ? Math.round((tierUsers.length / users.length) * 100) : 0;
                  const midLevel = Math.floor((tier.range[0] + tier.range[1] === Infinity ? 105 : tier.range[1]) / 2);
                  const levelColor = getLevelColor(midLevel);
                  const gradient = getLevelGradient(midLevel);
                  
                  return (
                    <Col xs={24} sm={12} md={8} lg={6} key={index}>
                      <Card 
                        variant="borderless" 
                        className="level-stat-card" 
                        style={{
                          borderLeft: `4px solid ${levelColor}`,
                          background: `linear-gradient(to right, ${levelColor}10, white)`,
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
                        }}
                      >
                        <Statistic
                          title={
                            <span style={{ display: 'flex', alignItems: 'center' }}>
                              {getLevelIcon(midLevel, { style: { marginRight: '8px', color: levelColor } })}
                              <span>{tier.name} ({tier.name === 'الجوكر' ? '100+' : `${tier.range[0]}-${tier.range[1]}`})</span>
                            </span>
                          }
                          value={tierUsers.length}
                          valueStyle={{ color: levelColor }}
                          suffix={`(${percentage}%)`}
                        />
                        <Progress 
                          percent={percentage} 
                          strokeColor={gradient.background}
                          size="small" 
                          showInfo={false}
                        />
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            </Card>
          </Col>
        </Row>
      )
    },
    {
      key: '2',
      label: t('user_activity'),
      children: <Empty description={t('no_activity_data')} />
    },
    {
      key: '3',
      label: t('user_reports'),
      children: (
        <>
          <div className="report-selection">
            <Radio.Group 
              value={reportType} 
              onChange={e => setReportType(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="general">{t('general_report')}</Radio.Button>
              <Radio.Button value="activity">{t('user_activity_report')}</Radio.Button>
              <Radio.Button value="points">{t('points_distribution')}</Radio.Button>
              <Radio.Button value="growth">{t('user_growth')}</Radio.Button>
            </Radio.Group>
          </div>
          <div className="report-content">
            <Empty description={t('no_reports_data')} />
          </div>
        </>
      )
    }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <ContentContainer className="admin-user-management" isLoading={loading}>
      <Row gutter={[24, 24]}>
          <Col span={24}>
            <Card className="page-header-card">
              <Title level={2}>{t('user_management')}</Title>
              <Text>{t('user_management_description')}</Text>
            </Card>
          </Col>
        {/* Statistics Cards */}
        <Col xs={24} sm={12} md={6}>
          <Card className="statistics-card">
            <Statistic
              title={t('total_users')}
              value={userStatistics.total}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="statistics-card">
            <Statistic
              title={t('active_users')}
              value={userStatistics.active}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="statistics-card">
            <Statistic
              title={t('inactive_users')}
              value={userStatistics.inactive}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="statistics-card">
            <Statistic
              title={t('admins')}
              value={userStatistics.admins}
              prefix={<CrownOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        {/* Search & Filter Controls */}
        <Col span={24}>
          <Card className="filter-card">
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={24} md={6} lg={6}>
                <div className="custom-search-wrapper">
                  <div className="search-icon-container">
                    <SearchOutlined className="search-icon" />
                  </div>
                  <Input
                    className="custom-search-input"
                    placeholder={t('user_search_placeholder')}
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    ref={searchInput}
                    suffix={
                      searchText ? (
                        <Button 
                          type="text" 
                          className="clear-icon-button" 
                          icon={<CloseOutlined className="clear-icon" />} 
                          onClick={() => setSearchText('')}
                          size="small"
                        />
                      ) : null
                    }
                  />
                </div>
              </Col>
              <Col xs={24} sm={12} md={5} lg={5}>
                <Select
                  placeholder={t('filter_by_status')}
                  className="filter-select"
                  value={statusFilter}
                  onChange={value => setStatusFilter(value)}
                  suffixIcon={<FilterOutlined className="filter-icon" />}
                  popupClassName="custom-dropdown"
                >
                  <Option value="all">
                    <Space>
                      <TeamOutlined />
                      <span>{t('all_users')}</span>
                    </Space>
                  </Option>
                  <Option value="active">
                    <Space>
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      <span>{t('active_users')}</span>
                    </Space>
                  </Option>
                  <Option value="inactive">
                    <Space>
                      <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                      <span>{t('inactive_users')}</span>
                    </Space>
                  </Option>
                </Select>
              </Col>
              <Col xs={24} sm={12} md={5} lg={5}>
                <Select
                  placeholder={t('filter_by_role')}
                  className="filter-select"
                  value={roleFilter}
                  onChange={value => setRoleFilter(value)}
                  suffixIcon={<FilterOutlined className="filter-icon" />}
                  popupClassName="custom-dropdown"
                >
                  <Option value="all">
                    <Space>
                      <TeamOutlined />
                      <span>{t('all_roles')}</span>
                    </Space>
                  </Option>
                  <Option value="user">
                    <Space>
                      <UserOutlined style={{ color: '#1890ff' }} />
                      <span>{t('normal_users')}</span>
                    </Space>
                  </Option>
                  <Option value="admin">
                    <Space>
                      <CrownOutlined style={{ color: '#722ed1' }} />
                      <span>{t('admins')}</span>
                    </Space>
                  </Option>
                </Select>
              </Col>
              <Col xs={24} sm={12} md={5} lg={5}>
                <RangePicker
                  placeholder={[t('start_date'), t('end_date')]}
                  className="date-picker"
                  locale={locale}
                  onChange={dates => setDateRange(dates)}
                  value={dateRange}
                  suffixIcon={<CalendarOutlined className="calendar-icon" />}
                  popupClassName="date-dropdown"
                />
              </Col>
              <Col xs={24} sm={12} md={3} lg={3}>
                <Space className="filter-actions">
                  <Button 
                    icon={<ReloadOutlined />} 
                    onClick={resetFilters}
                    title={t('reset_filters')}
                    className="reset-button"
                  >
                    {t('reset')}
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>
        {/* Users Table */}
        <Col span={24}>
          <Card
            title={
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '16px', fontWeight: 600 }}>
                  {t('user_list')}
                  <Tag 
                    color="blue" 
                    style={{ marginRight: '8px', fontWeight: 'normal' }}
                  >
                    {filteredUsers.length}
                  </Tag>
                </span>
                <Space>
                  {selectedRowKeys.length > 0 && (
                    <Button 
                      type="primary"
                      onClick={() => setBulkActionVisible(!bulkActionVisible)}
                      icon={<BarsOutlined />}
                    >
                      {t('bulk_actions')} ({selectedRowKeys.length})
                    </Button>
                  )}
                  <Button 
                    type="primary" 
                    icon={<UserAddOutlined />}
                    onClick={() => {
                      setSelectedUser(null);
                      editForm.resetFields();
                      editForm.setFieldsValue({
                        isActive: true,
                        role: 'user'
                      });
                      setEditUserModalVisible(true);
                    }}
                  >
                    {t('add_new_user')}
                  </Button>
                </Space>
              </Space>
            }
            extra={
              bulkActionVisible ? bulkActionMenu : null
            }
          >
            <Table 
              columns={columns} 
              dataSource={filteredUsers} 
              rowKey="_id" 
              loading={loading ? {
                indicator: <Spin size="large" />,
                spinning: true,
                tip: t('loading_data')
              } : false}
              rowSelection={rowSelection}
              pagination={{ 
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total, range) => t('pagination_total', { start: range[0], end: range[1], total: total }),
                showQuickJumper: true,
                responsive: true
              }}
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </Col>

        {/* Analytics Charts - only show if there are users */}
        {users.length > 0 && (
          <>
            <Col span={24}>
              <Card title={t('user_statistics')} className="charts-card">
                <Tabs defaultActiveKey="1" items={statsTabItems} />
              </Card>
            </Col>
          </>
        )}
      </Row>

      {/* Modal for adding points */}
      <Modal
        title={`${t('add_points_to')} ${selectedUser?.name || ''}`}
        open={addPointsModalVisible}
        onOk={handleAddPointsSubmit}
        onCancel={() => setAddPointsModalVisible(false)}
        okText={t('add')}
        cancelText={t('cancel')}
        className="rtl-modal"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="points"
            label={t('points_amount')}
            rules={[{ required: true, message: t('please_enter_points') }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="operation"
            label={t('reason_for_adding')}
            rules={[{ required: true, message: t('please_enter_reason') }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal for editing user */}
      <Modal
        title={selectedUser ? `${t('edit_user_data')} ${selectedUser.name}` : t('add_new_user')}
        open={editUserModalVisible}
        onOk={handleEditUserSubmit}
        onCancel={() => setEditUserModalVisible(false)}
        okText={t('save')}
        cancelText={t('cancel')}
        className="rtl-modal"
        width={700}
      >
        <Form form={editForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label={t('name')}
                rules={[{ required: true, message: t('please_enter_name') }]}
              >
                <Input prefix={<UserOutlined />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="username"
                label={t('username')}
                rules={[{ required: true, message: t('please_enter_username') }]}
              >
                <Input prefix={<IdcardOutlined />} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label={t('email')}
                rules={[
                  { required: true, message: t('please_enter_email') },
                  { type: 'email', message: t('invalid_email') }
                ]}
              >
                <Input prefix={<MailOutlined />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="role"
                label={t('role')}
                rules={[{ required: true, message: t('please_select_role') }]}
              >
                <Select>
                  <Option value="user">{t('user')}</Option>
                  <Option value="admin">{t('admin')}</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          {!selectedUser && (
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="password"
                  label={t('password')}
                  rules={[{ required: true, message: t('please_enter_password') }]}
                >
                  <Input.Password prefix={<LockOutlined />} />
                </Form.Item>
              </Col>
            </Row>
          )}
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="isActive"
                label={t('status')}
                valuePropName="checked"
              >
                <Switch 
                  checkedChildren={t('active')} 
                  unCheckedChildren={t('inactive')} 
                />
              </Form.Item>
            </Col>
            
            {selectedUser && (
              <Col span={12}>
                <Form.Item label={t('reset_password')}>
                  <Button 
                    onClick={() => {
                      setEditUserModalVisible(false);
                      setTimeout(() => {
                        handlePasswordReset(selectedUser);
                      }, 300);
                    }}
                    icon={<KeyOutlined />}
                  >
                    {t('change_password')}
                  </Button>
                </Form.Item>
              </Col>
            )}
          </Row>
          
          {selectedUser && (
            <>
              <Divider />
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label={t('level')}
                  >
                    <div>
                      <InputNumber 
                        min={1}
                        value={selectedUser.level}
                        disabled
                      />
                      <Tooltip title={getLevelTierName(selectedUser.level)}>
                        <Tag 
                          color={getLevelColor(selectedUser.level)}
                          style={{ marginLeft: 8 }}
                        >
                          {getLevelTierName(selectedUser.level)}
                        </Tag>
                      </Tooltip>
                    </div>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={t('current_points')}
                  >
                    <InputNumber 
                      value={selectedUser.points}
                      disabled
                    />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}
        </Form>
      </Modal>

      {/* Modal for user details */}
      <Modal
        title={`${t('user_profile')}: ${selectedUser?.name || ''}`}
        open={userDetailsModalVisible}
        onCancel={() => setUserDetailsModalVisible(false)}
        footer={null}
        width={800}
        className="rtl-modal user-details-modal"
      >
        {selectedUser && <Tabs defaultActiveKey="1" items={userDetailsTabs} />}
      </Modal>

      {/* Modal for password reset */}
      <Modal
        title={`${t('reset_password_for')} ${selectedUser?.name || ''}`}
        open={passwordResetModalVisible}
        onOk={handlePasswordResetSubmit}
        onCancel={() => setPasswordResetModalVisible(false)}
        okText={t('reset')}
        cancelText={t('cancel')}
        className="rtl-modal"
      >
        <Alert
          message={t('security_alert')}
          description={t('password_reset_warning')}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={passwordForm} layout="vertical">
          <Form.Item
            name="newPassword"
            label={t('new_password')}
            rules={[
              { required: true, message: t('please_enter_new_password') },
              { min: 6, message: t('password_min_length') }
            ]}
          >
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label={t('confirm_password')}
            rules={[
              { required: true, message: t('please_confirm_password') },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error(t('passwords_not_match')));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>
        </Form>
      </Modal>
    </ContentContainer>
  );
};

export default AdminUserManagement;
