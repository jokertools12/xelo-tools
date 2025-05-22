import axios from 'axios';

// Use environment variable with fallback for API URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const loginUser = async (email, password) => {
  try {
    const response = await axios.post(`${API_URL}/users/login`, { email, password });
    localStorage.setItem('token', response.data.token);
    // تخزين البيانات الأخرى إذا لزم الأمر
    return response.data;
  } catch (error) {
    console.error('Failed to login:', error);
    throw error;
  }
};

const updateProfile = async (values) => {
  const token = localStorage.getItem('token');
  const response = await axios.put(`${API_URL}/users/profile`, values, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response;
};

const changePassword = async (values) => {
  const token = localStorage.getItem('token');
  const response = await axios.put(`${API_URL}/users/password`, values, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response;
};

const getDashboardData = async () => {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${API_URL}/dashboard`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

const getUserAccessTokens = async () => {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${API_URL}/users/access-tokens`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

const getUserActivities = async (limit = 10) => {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${API_URL}/users/activities?limit=${limit}&sort=date:desc`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

const getGlobalActivities = async (limit = 5) => {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${API_URL}/activities?limit=${limit}&sort=createdAt:desc`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

const getUsersBasicInfo = async (userIds) => {
  if (!userIds || userIds.length === 0) return [];
  
  const token = localStorage.getItem('token');
  const response = await axios.post(`${API_URL}/users/basic-info`, { userIds }, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const userService = {
  loginUser,
  updateProfile,
  changePassword,
  getDashboardData,
  getUserAccessTokens,
  getUserActivities,
  getGlobalActivities,
  getUsersBasicInfo,
};

export default API_URL;