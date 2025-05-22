import axios from 'axios';

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${apiUrl}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    const userInfoString = localStorage.getItem('userInfo');
    if (userInfoString) {
      try {
        const userInfo = JSON.parse(userInfoString);
        if (userInfo?.token) {
          config.headers['Authorization'] = `Bearer ${userInfo.token}`;
        }
      } catch (error) {
        console.error('Error parsing user info:', error);
        localStorage.removeItem('userInfo');
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      localStorage.removeItem('userInfo');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
