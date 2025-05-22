import axios from 'axios';

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
axios.defaults.baseURL = `${apiUrl}/api`;

axios.interceptors.request.use(
  (config) => {
    const userInfoString = localStorage.getItem('userInfo');
    if (userInfoString) {
      try {
        const userInfo = JSON.parse(userInfoString);
        if (userInfo?.token) {
          config.headers.Authorization = `Bearer ${userInfo.token}`;
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

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const authError = new CustomEvent('auth-error', { detail: error.response.data });
      window.dispatchEvent(authError);
      localStorage.removeItem('userInfo');
      setTimeout(() => {
        window.location.href = '/login';
      }, 800);
    }

    if (!(error.response?.status === 400 && error.config.url?.includes('/users/register'))) {
      console.error('API Error Response:', error);
    }

    return Promise.reject(error);
  }
);

export default axios;
