import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';

/**
 * Membership utility functions to check access to features based on subscription status
 */

// List of features that require membership
export const RESTRICTED_FEATURES = {
  // Page Management features
  PAGE_MANAGEMENT: 'page_management',
  AUTO_POST_GROUP: 'auto_post_group',
  // Extractor features
  COMMENT_EXTRACTOR: 'comment_extractor',
  REACTION_EXTRACTOR: 'reaction_extractor',
  GROUP_EXTRACTOR: 'group_extractor',
  // AI features
  AI_PROMPT_GENERATOR: 'ai_prompt_generator',
  // Comment response features
  COMMENT_RESPONSE: 'comment_response',
  // Other restricted features can be added here
};

// List of features available to all users (free tier)
export const FREE_FEATURES = [
  'dashboard',
  'profile',
  'settings',
  'help'
];

/**
 * Check if a user has access to a specific feature
 * @param {string} featureKey - The key of the feature to check
 * @returns {Promise<boolean>} - Whether the user has access
 */
export const checkFeatureAccess = async (featureKey) => {
  try {
    // If feature is free, return true immediately
    if (FREE_FEATURES.includes(featureKey)) {
      return true;
    }
    
    // Otherwise check with the server
    const response = await api.post('/subscriptions/check-access', { featureKey });
    return response.data.hasAccess;
  } catch (error) {
    console.error('Error checking feature access:', error);
    // Default to no access if there's an error
    return false;
  }
};

/**
 * HOC to restrict access to a component based on membership
 * @param {React.Component} Component - The component to restrict
 * @param {string} featureKey - The feature key to check
 * @returns {React.Component} - The wrapped component that checks membership
 */
export const withMembershipRestriction = (Component, featureKey) => {
  return (props) => {
    const [hasAccess, setHasAccess] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    
    useEffect(() => {
      const checkAccess = async () => {
        try {
          const canAccess = await checkFeatureAccess(featureKey);
          setHasAccess(canAccess);
          
          if (!canAccess) {
            // Redirect to membership page if no access
            navigate('/membership', { 
              state: { 
                from: window.location.pathname,
                requiredFeature: featureKey 
              } 
            });
          }
        } catch (error) {
          console.error('Error in membership check:', error);
          setHasAccess(false);
        } finally {
          setIsLoading(false);
        }
      };
      
      checkAccess();
    }, [navigate]); // Remove featureKey as it's an outer scope value
    
    if (isLoading) {
      return <div className="loading-container">
        <div className="spinner"></div>
        <p>التحقق من صلاحية الوصول...</p>
      </div>;
    }
    
    return hasAccess ? <Component {...props} /> : null;
  };
};

/**
 * React Context Provider for membership status
 */
export const MembershipContext = React.createContext({
  hasMembership: false,
  membershipType: 'free',
  membershipExpires: null,
  isLoading: true,
  checkAccess: () => false
});

export const MembershipProvider = ({ children }) => {
  const [membershipState, setMembershipState] = useState({
    hasMembership: false,
    membershipType: 'free',
    membershipExpires: null,
    points: 0,
    isLoading: true
  });
  
  const checkAccess = useCallback((featureKey) => {
    // If still loading, assume no access
    if (membershipState.isLoading) return false;
    
    // Free features are always accessible
    if (FREE_FEATURES.includes(featureKey)) return true;
    
    // Check for membership expiration locally too
    if (membershipState.hasMembership && membershipState.membershipExpires) {
      const now = new Date();
      const expiry = new Date(membershipState.membershipExpires);
      if (expiry < now) {
        // Expired membership shouldn't grant access
        return false;
      }
    }
    
    // Otherwise require active membership
    return membershipState.hasMembership;
  }, [membershipState]);
  
  // Fetch membership status from the server
  const fetchMembershipStatus = useCallback(async () => {
    try {
      const response = await api.get('/subscriptions/my');
      
      // Update membership state with latest data
      setMembershipState({
        hasMembership: response.data.hasMembership || false,
        membershipType: response.data.membershipType || 'free',
        membershipExpires: response.data.subscription?.endDate || null,
        points: response.data.points || 0,
        isLoading: false
      });
    } catch (error) {
      console.error('Error fetching membership status:', error);
      setMembershipState(prevState => ({
        ...prevState,
        isLoading: false
      }));
    }
  }, []);
  
  // Initial fetch on mount
  useEffect(() => {
    fetchMembershipStatus();
  }, [fetchMembershipStatus]);
  
  // Set up a periodic refresh of membership status (every 5 minutes)
  useEffect(() => {
    // Set up interval to refresh membership status
    const refreshInterval = setInterval(() => {
      fetchMembershipStatus();
    }, 5 * 60 * 1000); // 5 minutes
    
    // Clean up interval on unmount
    return () => clearInterval(refreshInterval);
  }, [fetchMembershipStatus]);
  
  return (
    <MembershipContext.Provider value={{ 
      ...membershipState, 
      checkAccess 
    }}>
      {children}
    </MembershipContext.Provider>
  );
};

export const useMembership = () => useContext(MembershipContext);

// Export a function to use in conditionally rendering UI elements
export const MembershipRequired = ({ featureKey, fallback = null, children }) => {
  const { checkAccess } = useMembership();
  return checkAccess(featureKey) ? children : fallback;
};