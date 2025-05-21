import axios from 'axios';
import { message } from 'antd';
import api from './api';

// API Base URL with production support
const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const API_BASE_URL = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`;

// Points costs for different operations
export const POINTS_COSTS = {
  DATA_EXTRACTION: 1, // 1 point per user extraction
  
  // Add more operations as needed
};

class PointsSystem {
  constructor() {
    // We'll get the current user from UserContext when needed
    this.currentUser = null;
  }

  getCurrentUser() {
    try {
      const userInfoString = localStorage.getItem('userInfo');
      if (userInfoString) {
        this.currentUser = JSON.parse(userInfoString);
        return this.currentUser;
      }
    } catch (error) {
      console.error('Error getting current user:', error);
      this.currentUser = null;
    }
    return null;
  }

  // Check if user has enough points for an operation
  async checkPoints(requiredPoints) {
    this.getCurrentUser();
    
    if (!this.currentUser || !this.currentUser._id) {
      message.error('يرجى تسجيل الدخول أولاً');
      return { hasEnough: false, currentPoints: 0 };
    }
    
    try {
      const response = await axios.post(`${API_BASE_URL}/check-points`, {
        requiredPoints
      }, {
        headers: {
          'Authorization': `Bearer ${this.currentUser.token}`
        }
      });
      
      return {
        hasEnough: response.data.hasEnough,
        currentPoints: response.data.currentPoints
      };
    } catch (error) {
      console.error('Error checking points:', error);
      message.error('حدث خطأ أثناء التحقق من النقاط');
      return { hasEnough: false, currentPoints: 0 };
    }
  }
  
  // Deduct points for an operation
  async deductPoints(points, operation) {
    this.getCurrentUser();
    
    if (!this.currentUser || !this.currentUser._id) {
      message.error('يرجى تسجيل الدخول أولاً');
      return false;
    }
    
    try {
      const response = await axios.post(`${API_BASE_URL}/deduct-points`, {
        points,
        operation,
        reason: operation
      }, {
        headers: {
          'Authorization': `Bearer ${this.currentUser.token}`
        }
      });
      
      // Update local user data with new points balance
      if (response.data.success) {
        this.currentUser.points = response.data.newPoints;
        localStorage.setItem('userInfo', JSON.stringify(this.currentUser));
      }
      
      return response.data.success;
    } catch (error) {
      console.error('Error deducting points:', error);
      message.error('حدث خطأ أثناء خصم النقاط');
      return false;
    }
  }
  
  // Add points (refund) for failed operations
  async addPoints(points, operation) {
    this.getCurrentUser();
    
    if (!this.currentUser || !this.currentUser._id) {
      message.error('يرجى تسجيل الدخول أولاً');
      return false;
    }
    
    try {
      // Ensure operation string includes "refund" to be properly categorized
      const refundOperation = operation.includes('refund') 
        ? operation 
        : `refund: ${operation}`;
        
      const response = await axios.post(`${API_BASE_URL}/add-points`, {
        points,
        operation: refundOperation,
        reason: operation
      }, {
        headers: {
          'Authorization': `Bearer ${this.currentUser.token}`
        }
      });
      
      // Update local user data with new points balance
      if (response.data.success) {
        this.currentUser.points = response.data.newPoints;
        localStorage.setItem('userInfo', JSON.stringify(this.currentUser));
      }
      
      return response.data.success;
    } catch (error) {
      console.error('Error adding points:', error);
      message.error('حدث خطأ أثناء استرداد النقاط');
      return false;
    }
  }

  // Get transaction history
  async getTransactionHistory() {
    try {
      const response = await api.get('/user/transactions');
      return response.data.transactions;
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      message.error('حدث خطأ أثناء جلب سجل المعاملات');
      return [];
    }
  }

  // Calculate level based on points
  calculateLevel(points) {
    const pointsPerLevel = 25000;
    return Math.floor(points / pointsPerLevel) + 1;
  }
  
  // Get points needed for next level
  getPointsForNextLevel(currentPoints) {
    const pointsPerLevel = 25000;
    const currentLevel = this.calculateLevel(currentPoints);
    const pointsNeededForNextLevel = currentLevel * pointsPerLevel;
    return {
      currentLevel,
      nextLevel: currentLevel + 1,
      pointsNeeded: Math.max(0, pointsNeededForNextLevel - currentPoints),
      progress: Math.min(100, Math.round(((currentPoints % pointsPerLevel) / pointsPerLevel) * 100))
    };
  }
}

// Export a singleton instance
export const pointsSystem = new PointsSystem();