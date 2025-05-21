import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { message } from 'antd';

const LogoutHandler = () => {
  const navigate = useNavigate();
  const { user, setUser } = useUser();

  const handleLogout = () => {
    localStorage.removeItem('userInfo');
    setUser(null);
    message.success('You have been logged out successfully');
    navigate('/login');
  };

  return null;
};

export default LogoutHandler;