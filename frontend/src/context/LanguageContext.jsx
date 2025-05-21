import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useMessage } from './MessageContext';

// Import all static translation files
import transactionTranslations from '../translations/transactions';
import walletTranslations from '../translations/wallet';
import membershipTranslations from '../translations/membership';
import adminTranslations from '../translations/admin';
import postManagementTranslations from '../translations/postManagement';
import pageMessagesTranslations from '../translations/pageMessages';
import commonTranslations from '../translations/common';
import aiPromptsTranslations from '../translations/aiPrompts';
import commentResponsesTranslations from '../translations/commentResponses';
import { setTranslationFunction } from '../utils/translationHelper';

// Create language context
const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('ar');
  const [languages, setLanguages] = useState([]);
  const [translations, setTranslations] = useState({});
  const [loading, setLoading] = useState(true);
  const [direction, setDirection] = useState('rtl');
  const { showError, registerTranslation } = useMessage();

  // Fetch available languages on mount
  useEffect(() => {
    fetchLanguages();
  }, []);

  // Load translations when language changes
  useEffect(() => {
    if (currentLanguage) {
      fetchTranslations(currentLanguage);
    }
  }, [currentLanguage]);

  // Set document direction based on language
  useEffect(() => {
    if (currentLanguage) {
      const lang = languages.find(l => l.code === currentLanguage);
      if (lang) {
        const newDirection = lang.direction || 'ltr';
        setDirection(newDirection);
        
        // Apply direction to document
        document.documentElement.dir = newDirection;
        document.documentElement.lang = currentLanguage;
        
        // Add class to body based on direction to facilitate CSS targeting
        if (newDirection === 'rtl') {
          document.body.classList.add('rtl');
          document.body.classList.remove('ltr');
        } else {
          document.body.classList.add('ltr');
          document.body.classList.remove('rtl');
        }
        
        // Apply appropriate font based on language
        if (lang.code === 'ar') {
          document.body.style.fontFamily = "'Tajawal', 'Cairo', Arial, sans-serif";
        } else {
          document.body.style.fontFamily = "Arial, sans-serif";
        }
      }
    }
  }, [currentLanguage, languages]);

  // Fetch available languages
  const fetchLanguages = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/languages');
      setLanguages(data);
      
      // Set default language
      const defaultLang = data.find(lang => lang.isDefault) || data[0];
      if (defaultLang) {
        // Check if user has a preferred language in localStorage
        const savedLanguage = localStorage.getItem('preferredLanguage');
        if (savedLanguage && data.some(lang => lang.code === savedLanguage)) {
          setCurrentLanguage(savedLanguage);
        } else {
          setCurrentLanguage(defaultLang.code);
          localStorage.setItem('preferredLanguage', defaultLang.code);
        }
      }
    } catch (error) {
      console.error('Error fetching languages:', error);
      showError('خطأ في تحميل اللغات المتاحة');
    } finally {
      setLoading(false);
    }
  };

  // Fetch translations for a language
  const fetchTranslations = async (langCode) => {
    try {
      setLoading(true);
      const { data } = await axios.get(`/api/languages/${langCode}/translations`);
      
      // Integrate all static translations with dynamic ones from API
      const mergedTranslations = {
        ...data,
        // Add static translations from all imported files
        ...(transactionTranslations[langCode] || transactionTranslations.ar),
        ...(walletTranslations[langCode] || walletTranslations.ar),
        ...(membershipTranslations[langCode] || membershipTranslations.ar),
        ...(adminTranslations[langCode] || adminTranslations.ar),
        ...(postManagementTranslations[langCode] || postManagementTranslations.ar),
        ...(pageMessagesTranslations[langCode] || pageMessagesTranslations.ar),
        ...(commonTranslations[langCode] || commonTranslations.ar),
        ...(aiPromptsTranslations[langCode] || aiPromptsTranslations.ar),
        ...(commentResponsesTranslations[langCode] || commentResponsesTranslations.ar),
      };
      
      // Use merged translations
      setTranslations(mergedTranslations);
    } catch (error) {
      console.error(`Error fetching translations for ${langCode}:`, error);
      showError(`خطأ في تحميل ترجمات اللغة ${langCode}`);
      
      // In case of error, use static translations as fallback
      const fallbackTranslations = {
        ...(transactionTranslations[langCode] || transactionTranslations.ar || {}),
        ...(walletTranslations[langCode] || walletTranslations.ar || {}),
        ...(membershipTranslations[langCode] || membershipTranslations.ar || {}),
        ...(adminTranslations[langCode] || adminTranslations.ar || {}),
        ...(postManagementTranslations[langCode] || postManagementTranslations.ar || {}),
        ...(pageMessagesTranslations[langCode] || pageMessagesTranslations.ar || {}),
        ...(commonTranslations[langCode] || commonTranslations.ar || {}),
        ...(aiPromptsTranslations[langCode] || aiPromptsTranslations.ar || {}),
        ...(commentResponsesTranslations[langCode] || commentResponsesTranslations.ar || {}),
      };
      
      setTranslations(fallbackTranslations);
    } finally {
      setLoading(false);
    }
  };

  // Change the current language
  const changeLanguage = async (langCode) => {
    try {
      // Check if language exists
      const langExists = languages.some(lang => lang.code === langCode);
      if (!langExists) {
        throw new Error(`Language ${langCode} not available`);
      }
      
      // Update current language
      setCurrentLanguage(langCode);
      localStorage.setItem('preferredLanguage', langCode);
      
      // Apply direction immediately
      const lang = languages.find(l => l.code === langCode);
      if (lang) {
        const newDirection = lang.direction || 'ltr';
        setDirection(newDirection);
        document.documentElement.dir = newDirection;
        document.documentElement.lang = langCode;
        
        // Add class to body based on direction
        if (newDirection === 'rtl') {
          document.body.classList.add('rtl');
          document.body.classList.remove('ltr');
        } else {
          document.body.classList.add('ltr');
          document.body.classList.remove('rtl');
        }
        
        // Apply appropriate font based on language
        if (lang.code === 'ar') {
          document.body.style.fontFamily = "'Tajawal', 'Cairo', Arial, sans-serif";
        } else {
          document.body.style.fontFamily = "Arial, sans-serif";
        }
      }
      
      // If user is logged in, update their preference in the database
      const userInfo = localStorage.getItem('userInfo');
      if (userInfo) {
        await axios.put('/api/users/settings', { language: langCode });
      }
      
      return true;
    } catch (error) {
      console.error('Error changing language:', error);
      showError('خطأ في تغيير اللغة');
      return false;
    }
  };

  // Translate a key with variable interpolation
  const t = (key, variables = {}, defaultValue = '') => {
    if (!key) return defaultValue;
    
    // If translations are not loaded yet, return the default value or key
    if (!translations || Object.keys(translations).length === 0) {
      return interpolateVariables(defaultValue || key, variables);
    }
    
    // Check if the key contains a namespace (e.g., "postManagement:key")
    const hasNamespace = key.includes(':');
    let translationKey = key;
    
    if (hasNamespace) {
      // Split the key to get the namespace and the actual key
      const [namespace, actualKey] = key.split(':');
      
      // For namespaced keys, look up using the actual key
      translationKey = actualKey;
    }
    
    // Check for pluralization keys (e.g., key_one, key_many, etc.)
    const count = variables.count;
    if (count !== undefined) {
      // Try pluralization keys in Arabic
      if (currentLanguage === 'ar') {
        let pluralKey = '';
        
        if (count === 0) {
          pluralKey = `${translationKey}_zero`;
        } else if (count === 1) {
          pluralKey = `${translationKey}_one`;
        } else if (count === 2) {
          pluralKey = `${translationKey}_two`;
        } else if (count >= 3 && count <= 10) {
          pluralKey = `${translationKey}_few`;
        } else {
          pluralKey = `${translationKey}_many`;
        }
        
        // Check if the pluralization key exists in translations
        if (translations[pluralKey]) {
          return interpolateVariables(translations[pluralKey], variables);
        }
      }
    }
    
    // Get the translation or fallback to default value or key
    const translation = translations[translationKey] || defaultValue || key;
    
    // Replace variables in the translation string
    return interpolateVariables(translation, variables);
  };
  
  // Helper function to replace variables in translation strings
  const interpolateVariables = (text, variables) => {
    if (!text) return '';
    if (!variables || typeof variables !== 'object' || Object.keys(variables).length === 0) {
      return text;
    }
    
    // Create a copy of the text to work with
    let result = text;
    
    // First replace all variables in {{variableName}} format (double braces)
    Object.keys(variables).forEach(key => {
      if (variables[key] !== undefined) {
        // Convert value to string to ensure proper replacement
        const value = String(variables[key]);
        
        // Use a more robust regex that works better with RTL text
        const doubleBraceRegex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        result = result.replace(doubleBraceRegex, value);
        
        // Also handle variations that might appear with RTL text
        const doubleBraceRegexRTL = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
        result = result.replace(doubleBraceRegexRTL, value);
      }
    });
    
    // Then replace variables in {variableName} format (single braces)
    result = result.replace(/\{([^}]+)\}/g, (match, name) => {
      const trimmedName = name.trim();
      return variables[trimmedName] !== undefined ? String(variables[trimmedName]) : match;
    });
    
    return result;
  };
  
  // Register translation function with MessageContext and translation helper
  useEffect(() => {
    if (typeof registerTranslation === 'function') {
      registerTranslation(t);
    }
    
    // Set translation function in helper for use in non-component contexts
    setTranslationFunction(t);
  }, [registerTranslation, t]);

  const value = {
    currentLanguage,
    languages,
    translations,
    loading,
    direction,
    changeLanguage,
    t
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};