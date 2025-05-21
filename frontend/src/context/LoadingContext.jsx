import React, { createContext, useContext, useState, useCallback } from 'react';
import GlobalLoader from '../components/GlobalLoader';
import '../styles/GlobalLoader.css';

// Create context for loading state management
const LoadingContext = createContext();

/**
 * LoadingProvider Component - Provides centralized loading state management
 * 
 * This component creates a context that allows any component in the application
 * to show/hide loading indicators without managing local loading state.
 * 
 * @param {Object} props
 * @param {ReactNode} props.children - Child components
 */
export const LoadingProvider = ({ children }) => {
  // Global loading state
  const [loadingState, setLoadingState] = useState({
    isLoading: false,
    message: '',
    type: 'container', // 'fullscreen', 'container', 'inline', 'overlay'
    id: null // For tracking multiple loading operations
  });

  // Show loading indicator
  const showLoading = useCallback((message = 'جاري التحميل...', type = 'container', id = null) => {
    setLoadingState({
      isLoading: true,
      message,
      type,
      id
    });
    return id || 'global';
  }, []);

  // Hide loading indicator
  const hideLoading = useCallback((id = null) => {
    setLoadingState(prev => {
      // Only hide if the ID matches or no ID was provided
      if (!id || id === prev.id) {
        return {
          ...prev,
          isLoading: false
        };
      }
      return prev;
    });
  }, []);

  // Update loading message
  const updateLoadingMessage = useCallback((message) => {
    setLoadingState(prev => ({
      ...prev,
      message
    }));
  }, []);

  // Context value
  const value = {
    ...loadingState,
    showLoading,
    hideLoading,
    updateLoadingMessage
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
      
      {/* Render the global loader when loading is active */}
      {loadingState.isLoading && loadingState.type === 'fullscreen' && (
        <GlobalLoader 
          type="fullscreen"
          tip={loadingState.message}
          size="large"
        />
      )}
    </LoadingContext.Provider>
  );
};

/**
 * useLoading Hook - Access loading context functionality
 * 
 * This hook provides access to the loading context functions and state.
 * Components can use this hook to show/hide loading indicators.
 * 
 * @returns {Object} Loading context with state and functions
 */
export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

export default LoadingContext;