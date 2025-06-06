import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const getToken = () => {
  const userInfo = localStorage.getItem('userInfo');
  if (userInfo) {
    try {
      return JSON.parse(userInfo).token;
    } catch {
      return null;
    }
  }
  return null;
};

const loginUser = async (email, password) => {
  const response = await axios.post(`${API_URL}/api/users/login`, { email, password });
  localStorage.setItem('userInfo', JSON.stringify({ token: response.data.token }));
  return response.data;
};

const updateProfile = async (values) => {
  const token = getToken();
  const response = await axios.put(`${API_URL}/api/users/profile`, values, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response;
};

const changePassword = async (values) => {
  const token = getToken();
  const response = await axios.put(`${API_URL}/api/users/password`, values, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response;
};

const getDashboardData = async () => {
  const token = getToken();
  const response = await axios.get(`${API_URL}/api/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

const getUserAccessTokens = async () => {
  const token = getToken();
  const response = await axios.get(`${API_URL}/api/users/access-tokens`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

const getUserActivities = async (limit = 10) => {
  const token = getToken();
  const response = await axios.get(`${API_URL}/api/users/activities?limit=${limit}&sort=date:desc`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

const getGlobalActivities = async (limit = 5) => {
  const token = getToken();
  const response = await axios.get(`${API_URL}/api/activities?limit=${limit}&sort=createdAt:desc`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

const getUsersBasicInfo = async (userIds) => {
  if (!userIds || userIds.length === 0) return [];
  const token = getToken();
  const response = await axios.post(`${API_URL}/api/users/basic-info`, { userIds }, {
    headers: { Authorization: `Bearer ${token}` },
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
