import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Card, 
  Tabs, 
  Input, 
  Button, 
  Radio, 
  Space, 
  message, 
  Spin, 
  Select, 
  Divider, 
  Typography, 
  Alert, 
  Row, 
  Col, 
  Tag, 
  Tooltip, 
  Switch, 
  Progress,
  Empty,
  Modal,
  Table,
  Popconfirm,
  Form,
  Collapse,
  Badge,
  Menu,
  Dropdown,
  Skeleton,
  List,
  Avatar,
  Rate,
  Statistic,
  notification
} from 'antd';
import { 
  CopyOutlined, 
  CheckOutlined, 
  SearchOutlined, 
  HistoryOutlined, 
  StarOutlined, 
  StarFilled,
  InfoCircleOutlined,
  RobotOutlined,
  EditOutlined,
  FormOutlined,
  PictureOutlined,
  CommentOutlined,
  SafetyOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  LoadingOutlined,
  ArrowRightOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
  SettingOutlined,
  BulbOutlined,
  SaveOutlined,
  FileTextOutlined,
  SoundOutlined,
  QuestionCircleOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  UserOutlined,
  LikeOutlined,
  FireOutlined,
  LineChartOutlined,
  DownloadOutlined,
  SyncOutlined,
  ShareAltOutlined,
  FilterOutlined,
  FlagOutlined,
  BookOutlined,
  HeartOutlined,
  TagOutlined,
  WarningOutlined,
  ZoomInOutlined,
  SendOutlined,
  HighlightOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
  AlignLeftOutlined,
  CloudOutlined,
  ReadOutlined,
  CloseOutlined,
  EllipsisOutlined
} from '@ant-design/icons';
import axios from 'axios';
import ContentContainer from '../components/ContentContainer';
import { useLanguage } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { RESTRICTED_FEATURES, MembershipRequired } from '../utils/membershipUtils';
import '../styles/AIPromptGenerator.css';

const { TabPane } = Tabs;
const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

// Custom hook for delayed state update - improves UX
const useDelayedEffect = (fn, delay, deps = []) => {
  const timeoutRef = useRef(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(fn, delay);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, deps);
};

const AIPromptGenerator = () => {
  const { t, currentLanguage, direction } = useLanguage();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState('prompt');
  const [promptType, setPromptType] = useState('enhance');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [formatLength, setFormatLength] = useState('standard');
  const [formatStyle, setFormatStyle] = useState('professional');
  const [formatStructure, setFormatStructure] = useState('bullet_points');
  const [languageOption, setLanguageOption] = useState(currentLanguage);
  const [promptQuality, setPromptQuality] = useState('unknown'); // 'low', 'medium', 'high' or 'unknown'
  const [favorites, setFavorites] = useState([]);
  const [history, setHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);
  const [searchHistoryText, setSearchHistoryText] = useState('');
  const [searchFavoritesText, setSearchFavoritesText] = useState('');
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [savePromptName, setSavePromptName] = useState('');
  const [advancedMode, setAdvancedMode] = useState(false);
  const [showExamples, setShowExamples] = useState(true);
  const [currentExample, setCurrentExample] = useState(0);
  const [tone, setTone] = useState('professional');
  const [audience, setAudience] = useState('general');
  const [domain, setDomain] = useState('general');
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComments, setFeedbackComments] = useState('');
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [activeGuideSection, setActiveGuideSection] = useState('basics');
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [smartSuggestions, setSmartSuggestions] = useState([]);
  const [autoCategorize, setAutoCategorize] = useState(true);
  const [similarPrompts, setSimilarPrompts] = useState([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedRecently, setCopiedRecently] = useState(false);
  const [analyticsModalVisible, setAnalyticsModalVisible] = useState(false);
  const [contextualTips, setContextualTips] = useState([]);
  const [inputFocused, setInputFocused] = useState(false);
  const [animateOutput, setAnimateOutput] = useState(false);
  const [inputAnalysisComplete, setInputAnalysisComplete] = useState(false);
  const [keywordsDetected, setKeywordsDetected] = useState([]);
  const [keywordSuggestions, setKeywordSuggestions] = useState([]);
  const [promptComplexity, setPromptComplexity] = useState(0); // 0-100 scale
  const [progressPercent, setProgressPercent] = useState(0);
  const [typingText, setTypingText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [promptCategories, setPromptCategories] = useState([]);
  const [customizeVisible, setCustomizeVisible] = useState(false);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [inputExpanded, setInputExpanded] = useState(false);
  const [outputExpanded, setOutputExpanded] = useState(false);
  const [recentPrompts, setRecentPrompts] = useState([]);
  const [pinnedPrompts, setPinnedPrompts] = useState([]);
  const [userActivity, setUserActivity] = useState({
    totalPrompts: 0,
    lastGenerated: null,
    favoriteTypes: {},
  });
  
  // New states for template field inputs
  const [templateFieldsModalVisible, setTemplateFieldsModalVisible] = useState(false);
  const [currentTemplateFields, setCurrentTemplateFields] = useState([]);
  const [templateFieldValues, setTemplateFieldValues] = useState({});
  const [templatePreview, setTemplatePreview] = useState('');
  const [templateForm] = Form.useForm();
  const [currentTemplateMeta, setCurrentTemplateMeta] = useState(null);
  
  // Refs for typing animation
  const textChunksQueue = useRef([]);
  const isProcessingQueue = useRef(false);
  const typingSpeedRef = useRef(30); // ms per character - adjusted for more natural typing speed
  const completeOutputRef = useRef(''); // Store the complete output separately from what's being typed
  const lastCharTypeRef = useRef(''); // Track the last character typed for more natural timing
  
  const textareaRef = useRef(null);
  const outputRef = useRef(null);
  const promptStreamRef = useRef(null); // Reference to hold the event source for streaming
  const inputTextRef = useRef(inputText);

  // Update ref when input text changes
  useEffect(() => {
    inputTextRef.current = inputText;
  }, [inputText]);

  // Stats for analytics modal
  const [analyticsData, setAnalyticsData] = useState({
    promptsGenerated: 0,
    favoritesSaved: 0,
    highQualityRate: 0,
    mostUsedType: 'enhance',
    averageLength: 0,
    totalPrompts: 0
  });

  // Templates for prompt creation
  const promptTemplates = [
    {
      id: 'expert',
      title: t('template_expert_title') || 'Expert Advisor',
      description: t('template_expert_desc') || 'Get advice from a subject matter expert in a specific field',
      icon: <UserOutlined />,
      template: t('template_expert_content') || 'You are an expert in {field} with {years} years of experience. Please provide your professional advice on {topic}. Include specific examples and practical recommendations.'
    },
    {
      id: 'comparison',
      title: t('template_comparison_title') || 'Comparative Analysis',
      description: t('template_comparison_desc') || 'Compare multiple items, concepts, or approaches',
      icon: <UnorderedListOutlined />,
      template: t('template_comparison_content') || 'Create a detailed comparison between {item1} and {item2} in terms of {aspects}. For each aspect, analyze strengths and weaknesses, and provide a balanced conclusion.'
    },
    {
      id: 'tutorial',
      title: t('template_tutorial_title') || 'Step-by-Step Tutorial',
      description: t('template_tutorial_desc') || 'Create instructional content with clear steps',
      icon: <OrderedListOutlined />,
      template: t('template_tutorial_content') || 'Provide a step-by-step tutorial on how to {task}. Target audience is {audience} with {level} knowledge level. Include prerequisites, common pitfalls to avoid, and how to verify successful completion.'
    },
    {
      id: 'creative',
      title: t('template_creative_title') || 'Creative Content',
      description: t('template_creative_desc') || 'Generate creative and engaging content',
      icon: <HighlightOutlined />,
      template: t('template_creative_content') || 'Write a {contentType} about {topic} in a {style} style. The tone should be {tone} and it should appeal to {audience}. Include {elements} to make it more engaging.'
    },
    {
      id: 'research',
      title: t('template_research_title') || 'Research Summary',
      description: t('template_research_desc') || 'Summarize and analyze research findings',
      icon: <BookOutlined />,
      template: t('template_research_content') || 'Summarize the key findings and implications of research on {topic}. Cover the methodologies used, main conclusions, limitations, and future research directions. Target audience is {audience}.'
    }
  ];

  // Prompt categories
  const categories = [
    { key: 'academic', name: t('category_academic') || 'Academic', icon: <BookOutlined /> },
    { key: 'business', name: t('category_business') || 'Business', icon: <LineChartOutlined /> },
    { key: 'creative', name: t('category_creative') || 'Creative', icon: <HighlightOutlined /> },
    { key: 'technical', name: t('category_technical') || 'Technical', icon: <ToolOutlined /> },
    { key: 'personal', name: t('category_personal') || 'Personal', icon: <UserOutlined /> },
    { key: 'educational', name: t('category_educational') || 'Educational', icon: <ReadOutlined /> },
  ];

  // References for Page Visibility handling
  const pageVisibleRef = useRef(true);
  const lastVisibilityChangeTimeRef = useRef(Date.now());
  const pausedAtIndexRef = useRef(0);
  
  // Set initial typing speed - SPEED GREATLY INCREASED for better user experience
  useEffect(() => {
    // Reduce from 15ms to 5ms for extremely fast typing
    typingSpeedRef.current = 5;
  }, []);
  
  // Handle Page Visibility changes to ensure animation continues when tab is inactive
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      
      if (isVisible && !pageVisibleRef.current) {
        // Tab became visible again - calculate how many characters to catch up
        const timePassed = Date.now() - lastVisibilityChangeTimeRef.current;
        const charsToProcess = Math.min(
          Math.floor(timePassed / typingSpeedRef.current), 
          textChunksQueue.current.length
        );
        
        // Process a batch of characters immediately to catch up
        if (charsToProcess > 0 && isProcessingQueue.current) {
          let textToAdd = '';
          
          // Take characters that should have been processed while page was hidden
          for (let i = 0; i < charsToProcess; i++) {
            if (textChunksQueue.current.length > 0) {
              textToAdd += textChunksQueue.current.shift();
            }
          }
          
          // Add them all at once to catch up
          if (textToAdd) {
            setTypingText(prev => prev + textToAdd);
          }
          
          // Continue normal processing for remaining characters
          if (textChunksQueue.current.length > 0 && !isProcessingQueue.current) {
            processTextQueue();
          }
        }
      }
      
      // Update page visibility state
      pageVisibleRef.current = isVisible;
      lastVisibilityChangeTimeRef.current = Date.now();
    };
    
    // Add event listener for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // ULTRA-FAST TEXT PROCESSING - Significantly enhanced for immediate visual feedback
  const processTextQueue = useCallback(() => {
    if (textChunksQueue.current.length === 0) {
      isProcessingQueue.current = false;
      setIsTyping(false);
      return;
    }
    
    isProcessingQueue.current = true;
    setIsTyping(true);
    
    // Process characters in large batches for dramatic speed improvement
    // Use much larger batches for significant performance gains
    const remainingLength = textChunksQueue.current.length;
    let batchSize = 1;
    
    // Dynamic batch sizing based on queue length for optimal performance
    if (remainingLength > 1000) {
      batchSize = 15; // Process 15 characters at once for very large outputs
    } else if (remainingLength > 500) {
      batchSize = 10; // Process 10 characters at once for large outputs
    } else if (remainingLength > 100) {
      batchSize = 5;  // Process 5 characters at once for medium outputs
    } else {
      batchSize = 3;  // Process 3 characters at once for small outputs
    }
    
    // For extremely large texts, increase batch even further
    if (remainingLength > 2000) {
      batchSize = 20; // Super-fast mode for extremely large outputs
    }
    
    let textToAdd = '';
    
    // Process the batch of characters
    for (let i = 0; i < batchSize; i++) {
      if (textChunksQueue.current.length === 0) break;
      
      // Take the next character from the queue
      const nextChar = textChunksQueue.current.shift();
      lastCharTypeRef.current = nextChar;
      textToAdd += nextChar;
    }
    
    // Update text state with the batch of characters
    setTypingText(prev => prev + textToAdd);
    
    // STANDARDIZED TIMING: Much more consistent delays with minimal variation
    // Use a fixed base delay for more predictable typing speed
    let baseDelay = typingSpeedRef.current;
    
    // Simplified pauses - much shorter and more consistent
    const lastChar = lastCharTypeRef.current;
    
    // Much smaller variations for standardized speed across all types
    if (lastChar === '\n') {
      baseDelay = typingSpeedRef.current * 1.5; // Very minimal pause for newlines
    } else if (lastChar === '.' || lastChar === '!' || lastChar === '?') {
      baseDelay = typingSpeedRef.current * 1.3; // Very minimal pause for sentence endings
    } else {
      // Standard delay for all other characters - consistent speed
      baseDelay = typingSpeedRef.current;
    }
    
    // Minimal randomization - nearly consistent speed
    const randomFactor = 0.95 + Math.random() * 0.1; // 95% to 105% - almost no variation
    const delay = Math.floor(baseDelay * randomFactor);
    
    // Always use minimum delay with very minimal floor
    const finalDelay = Math.max(1, delay);
    
    // Schedule the next character(s) with aggressive scheduling
    setTimeout(processTextQueue, finalDelay);
  }, []);

  // Ultra-optimized queue addition - SPEED OPTIMIZED
  const addToTypingQueue = useCallback((text) => {
    if (!text) return;
    
    // Fast character addition with no conditional branches for performance
    for (let i = 0; i < text.length; i++) {
      textChunksQueue.current.push(text.charAt(i));
    }
    
    // Start processing if not already running
    if (!isProcessingQueue.current) {
      processTextQueue();
    }
  }, [processTextQueue]);

  // Function to categorize input text
  const categorizeInput = useCallback((text) => {
    if (!text || text.length < 15) return [];
    
    const detectedCategories = [];
    const lowercaseText = text.toLowerCase();
    
    // Simple keyword matching for demonstration
    if (
      lowercaseText.includes('research') || 
      lowercaseText.includes('study') || 
      lowercaseText.includes('academic') || 
      lowercaseText.includes('paper') ||
      lowercaseText.includes('بحث') ||
      lowercaseText.includes('دراسة') ||
      lowercaseText.includes('أكاديمي')
    ) {
      detectedCategories.push('academic');
    }
    
    if (
      lowercaseText.includes('business') || 
      lowercaseText.includes('market') || 
      lowercaseText.includes('company') || 
      lowercaseText.includes('startup') ||
      lowercaseText.includes('شركة') ||
      lowercaseText.includes('سوق') ||
      lowercaseText.includes('تجارة') ||
      lowercaseText.includes('أعمال')
    ) {
      detectedCategories.push('business');
    }
    
    if (
      lowercaseText.includes('story') || 
      lowercaseText.includes('poem') || 
      lowercaseText.includes('creative') || 
      lowercaseText.includes('fiction') ||
      lowercaseText.includes('قصة') ||
      lowercaseText.includes('شعر') ||
      lowercaseText.includes('إبداعي') ||
      lowercaseText.includes('خيال')
    ) {
      detectedCategories.push('creative');
    }
    
    if (
      lowercaseText.includes('code') || 
      lowercaseText.includes('programming') || 
      lowercaseText.includes('software') || 
      lowercaseText.includes('technical') ||
      lowercaseText.includes('كود') ||
      lowercaseText.includes('برمجة') ||
      lowercaseText.includes('تقني')
    ) {
      detectedCategories.push('technical');
    }
    
    if (
      lowercaseText.includes('teach') || 
      lowercaseText.includes('learn') || 
      lowercaseText.includes('explain') || 
      lowercaseText.includes('education') ||
      lowercaseText.includes('تعليم') ||
      lowercaseText.includes('شرح') ||
      lowercaseText.includes('تدريس')
    ) {
      detectedCategories.push('educational');
    }
    
    return detectedCategories.slice(0, 3); // Limit to top 3 categories
  }, []);

  // Extract keywords from text
  const extractKeywords = useCallback((text) => {
    if (!text || text.length < 20) return [];
    
    // Simple keyword extraction algorithm
    // In a real app, would use NLP techniques
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = ['the', 'and', 'is', 'in', 'to', 'a', 'for', 'of', 'that', 'with', 'be', 'this', 'have'];
    const arabicStopWords = ['و', 'في', 'من', 'إلى', 'على', 'أن', 'هذا', 'هذه', 'ذلك', 'تلك', 'هو', 'هي', 'كان'];
    
    const filteredWords = words.filter(
      word => word.length > 3 && 
      !stopWords.includes(word) && 
      !arabicStopWords.includes(word)
    );
    
    // Count word frequency
    const wordCounts = {};
    filteredWords.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });
    
    // Sort by frequency
    const sortedWords = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5) // Top 5 keywords
      .map(entry => entry[0]);
    
    return sortedWords;
  }, []);

  // Generate smart suggestions based on input text - enhanced
  const analyzeInputForSuggestions = useCallback((text, type) => {
    if (!text || text.length < 15) return [];
    
    const suggestions = [];
    const keywords = extractKeywords(text);
    setKeywordsDetected(keywords);
    
    // Calculate complexity score
    const complexity = Math.min(100, 
      Math.floor(text.length / 10) + // Length factor
      (text.split(/[.!?]/).length * 5) + // Sentences factor
      (keywords.length * 10) // Keywords diversity factor
    );
    setPromptComplexity(complexity);
    
    // Set detected categories
    const categories = categorizeInput(text);
    setPromptCategories(categories);
    
    // Generate suggestions based on analysis
    // Length-based suggestions
    if (text.length < 50) {
      suggestions.push({
        type: 'improvement',
        text: t('suggestion_add_detail'),
        important: true
      });
    }
    
    // Role-based suggestions
    if (!text.includes('أنت') && 
        !text.includes('You are') && 
        !text.includes('expert') &&
        !text.includes('خبير')) {
      suggestions.push({
        type: 'role',
        text: t('suggestion_add_role'),
        important: complexity > 30
      });
    }
    
    // Structure-based suggestions
    if (!text.includes(':') && 
        !text.includes('•') && 
        !text.match(/\d+\.\s/) && 
        !text.includes('- ') &&
        !text.includes('* ') &&
        formatStructure === 'bullet_points') {
      suggestions.push({
        type: 'format',
        text: t('suggestion_add_structure'),
        important: complexity > 40
      });
    }
    
    // Specificity-based suggestions
    if (complexity < 60 && text.length > 30) {
      suggestions.push({
        type: 'specificity',
        text: t('suggestion_be_specific'),
        important: true
      });
    }
    
    // Audience-based suggestions
    if (!text.toLowerCase().includes('audience') && 
        !text.includes('جمهور') && 
        !text.includes('للمبتدئين') && 
        !text.includes('للخبراء') &&
        !text.includes('for beginners') &&
        !text.includes('for experts')) {
      suggestions.push({
        type: 'audience',
        text: t('suggestion_define_audience'),
        important: complexity > 50
      });
    }
    
    // Type-specific suggestions
    if (type === 'image' && 
        !text.toLowerCase().includes('style') && 
        !text.includes('أسلوب') &&
        !text.includes('lighting') &&
        !text.includes('إضاءة')) {
      suggestions.push({
        type: 'image',
        text: t('suggestion_add_style'),
        important: true
      });
    }
    
    if (type === 'chat' && 
        !text.includes('?') && 
        !text.includes('؟')) {
      suggestions.push({
        type: 'question',
        text: t('suggestion_add_question'),
        important: false
      });
    }
    
    if (type === 'reasoner' && 
        !text.toLowerCase().includes('analyze') && 
        !text.toLowerCase().includes('compare') &&
        !text.includes('حلل') &&
        !text.includes('قارن')) {
      suggestions.push({
        type: 'analysis',
        text: t('suggestion_add_analytical_direction'),
        important: true
      });
    }
    
    return suggestions
      .sort((a, b) => {
        // Sort by importance first, then by suggestion type
        if (a.important && !b.important) return -1;
        if (!a.important && b.important) return 1;
        return 0;
      })
      .slice(0, 5); // Limit to 5 suggestions
  }, [t, formatStructure, extractKeywords, categorizeInput]);

  // Calculate stats for analytics whenever history/favorites change - enhanced
  useEffect(() => {
    if (history.length || favorites.length) {
      const totalPrompts = history.length;
      const highQuality = history.filter(item => 
        item.quality === 'high' || estimateQuality(item.outputText) === 'high'
      ).length;
      
      // Count by type
      const typeCount = {};
      history.forEach(item => {
        typeCount[item.type] = (typeCount[item.type] || 0) + 1;
      });
      
      // Find most used type
      let mostUsed = 'enhance';
      let maxCount = 0;
      Object.entries(typeCount).forEach(([type, count]) => {
        if (count > maxCount) {
          mostUsed = type;
          maxCount = count;
        }
      });
      
      // Calculate average length
      const totalLength = history.reduce((sum, item) => sum + (item.outputText?.length || 0), 0);
      const avgLength = totalPrompts > 0 ? Math.round(totalLength / totalPrompts) : 0;
      
      // User activity data
      setUserActivity({
        totalPrompts,
        lastGenerated: history.length > 0 ? new Date(history[0].date) : null,
        favoriteTypes: typeCount
      });
      
      // Update analytics data
      setAnalyticsData({
        promptsGenerated: totalPrompts,
        favoritesSaved: favorites.length,
        highQualityRate: totalPrompts > 0 ? Math.round((highQuality / totalPrompts) * 100) : 0,
        mostUsedType: mostUsed,
        averageLength: avgLength,
        totalPrompts,
        // New metrics
        typeDistribution: typeCount,
        qualityTrend: calculateQualityTrend(history),
        topKeywords: extractTopKeywords(history)
      });
    }
  }, [history, favorites]);

  // Calculate quality trend from history
  const calculateQualityTrend = (historyItems) => {
    if (historyItems.length < 5) return 'neutral';
    
    const recent = historyItems.slice(0, 5).filter(
      item => item.quality === 'high' || estimateQuality(item.outputText) === 'high'
    ).length;
    
    const older = historyItems.slice(5, 10).filter(
      item => item.quality === 'high' || estimateQuality(item.outputText) === 'high'
    ).length;
    
    if (recent > older) return 'improving';
    if (recent < older) return 'declining';
    return 'stable';
  };

  // Extract top keywords from history
  const extractTopKeywords = (historyItems) => {
    if (historyItems.length === 0) return [];
    
    // Combine all input text
    const allText = historyItems.map(item => item.inputText).join(' ');
    return extractKeywords(allText);
  };

  // Calculate word and character counts for input text - enhanced with performance optimization
  useDelayedEffect(() => {
    if (inputText) {
      setCharCount(inputText.length);
      setWordCount(inputText.trim().split(/\s+/).length);
      
      // Generate suggestions after a delay
      setSmartSuggestions(analyzeInputForSuggestions(inputText, promptType));
      
      // Auto-categorize based on content
      if (autoCategorize && inputText.length > 20) {
        autoDetectPromptType(inputText);
      }
      
      // Analyze input for keyword suggestions
      if (inputText.length > 30) {
        suggestionKeywords(inputText);
        setInputAnalysisComplete(true);
      } else {
        setInputAnalysisComplete(false);
      }
    } else {
      setCharCount(0);
      setWordCount(0);
      setSmartSuggestions([]);
      setKeywordsDetected([]);
      setKeywordSuggestions([]);
      setInputAnalysisComplete(false);
    }
  }, 500, [inputText, promptType, autoCategorize]);

  // Auto-detect most appropriate prompt type based on input content
  const autoDetectPromptType = (text) => {
    if (!text || !autoCategorize) return;
    
    const lowercaseText = text.toLowerCase();
    
    // Enhanced pattern matching with Arabic support
    const patterns = {
      image: [
        'صورة', 'رسم', 'تصوير', 'لوحة', 'منظر', 'مشهد',
        'image', 'picture', 'photo', 'illustration', 'drawing', 'scene', 'visual', 'artwork'
      ],
      chat: [
        '?', '؟', 'كيف', 'لماذا', 'متى', 'أين', 'ماذا', 'من', 'اسأل', 'أسأل', 'اشرح', 'أجب',
        'how', 'why', 'when', 'where', 'what', 'who', 'explain', 'tell me', 'answer', 'chat'
      ],
      reasoner: [
        'حلل', 'قارن', 'تحليل', 'منطق', 'استنتاج', 'فكر', 'استدلال', 'برهن', 'سبب',
        'analyze', 'logic', 'reason', 'think', 'evaluate', 'assess', 'compare', 'contrast', 'examine'
      ],
      checker: [
        'تحقق', 'صحة', 'تقييم', 'فحص', 'تدقيق', 'مراجعة', 'تصحيح',
        'check', 'verify', 'validate', 'assess', 'review', 'evaluate', 'critique', 'improve'
      ]
    };
    
    // Score each type based on keyword matches
    const scores = {
      enhance: 0, // Default type gets a base score
      image: 0,
      chat: 0,
      reasoner: 0,
      checker: 0
    };
    
    // Calculate scores
    Object.entries(patterns).forEach(([type, keywords]) => {
      keywords.forEach(keyword => {
        if (lowercaseText.includes(keyword)) {
          scores[type] += 1;
        }
      });
    });
    
    // Check for specific patterns that strongly indicate a type
    // Image patterns (detailed descriptions of visual elements)
    if (
      (lowercaseText.includes('background') && lowercaseText.includes('foreground')) ||
      (lowercaseText.includes('color') && lowercaseText.includes('style')) ||
      (lowercaseText.includes('خلفية') && lowercaseText.includes('أمامية')) ||
      (lowercaseText.includes('لون') && lowercaseText.includes('أسلوب'))
    ) {
      scores.image += 3;
    }
    
    // Chat patterns (conversational markers)
    if (
      (lowercaseText.includes('hello') || lowercaseText.includes('hi')) ||
      (lowercaseText.includes('مرحبا') || lowercaseText.includes('السلام عليكم'))
    ) {
      scores.chat += 2;
    }
    
    // Reasoning patterns (analytical language)
    if (
      (lowercaseText.includes('therefore') || lowercaseText.includes('because')) ||
      (lowercaseText.includes('لذلك') || lowercaseText.includes('بسبب')) ||
      (lowercaseText.includes('first') && lowercaseText.includes('second')) ||
      (lowercaseText.includes('أولا') && lowercaseText.includes('ثانيا'))
    ) {
      scores.reasoner += 2;
    }
    
    // Find highest scoring type
    let highestScore = 0;
    let detectedType = 'enhance'; // Default
    
    Object.entries(scores).forEach(([type, score]) => {
      if (score > highestScore) {
        highestScore = score;
        detectedType = type;
      }
    });
    
    // Only change if the score is significant
    if (highestScore >= 2 && detectedType !== promptType) {
      setPromptType(detectedType);
      
      // Show notification for type change
      notification.info({
        message: t('prompt_type_detected'),
        description: t('prompt_type_changed_to') + ' ' + t(`${detectedType}_prompt`),
        placement: 'bottomRight',
        duration: 3
      });
    }
  };

  // Generate keyword suggestions based on input
  const suggestionKeywords = (text) => {
    if (!text) return;
    
    const extractedKeywords = extractKeywords(text);
    const suggestions = [];
    
    // Domain-specific suggestions
    const domains = {
      business: ['strategy', 'market', 'growth', 'customer', 'revenue', 'استراتيجية', 'سوق', 'عملاء', 'إيرادات'],
      technical: ['code', 'algorithm', 'system', 'software', 'كود', 'برمجة', 'نظام', 'برنامج'],
      academic: ['research', 'study', 'analysis', 'methodology', 'بحث', 'دراسة', 'تحليل', 'منهجية'],
      creative: ['story', 'design', 'visual', 'creative', 'قصة', 'تصميم', 'مرئي', 'إبداعي'],
      educational: ['learn', 'teach', 'education', 'lesson', 'تعلم', 'تعليم', 'درس', 'مدرسة']
    };
    
    // Determine domain based on existing keywords
    let detectedDomain = null;
    let highestMatches = 0;
    
    Object.entries(domains).forEach(([domain, domainKeywords]) => {
      const matches = extractedKeywords.filter(
        keyword => domainKeywords.some(dk => dk.includes(keyword) || keyword.includes(dk))
      ).length;
      
      if (matches > highestMatches) {
        highestMatches = matches;
        detectedDomain = domain;
      }
    });
    
    // If domain detected, suggest additional relevant keywords
    if (detectedDomain && domains[detectedDomain]) {
      const relevantKeywords = domains[detectedDomain].filter(
        dk => !extractedKeywords.some(k => k.includes(dk) || dk.includes(k))
      ).slice(0, 3);
      
      relevantKeywords.forEach(keyword => {
        suggestions.push({
          text: keyword,
          domain: detectedDomain
        });
      });
    }
    
    // Add general quality improvement keywords based on prompt type
    const qualityKeywords = {
      enhance: ['detailed', 'comprehensive', 'professional', 'مفصّل', 'شامل', 'احترافي'],
      chat: ['conversational', 'interactive', 'responsive', 'تفاعلي', 'محادثة', 'استجابة'],
      reasoner: ['logical', 'analytical', 'systematic', 'منطقي', 'تحليلي', 'منهجي'],
      image: ['vivid', 'composition', 'lighting', 'حيوي', 'تكوين', 'إضاءة'],
      checker: ['evaluate', 'improve', 'optimize', 'تقييم', 'تحسين', 'تطوير']
    };
    
    // Add 2 quality keywords for the current prompt type
    if (qualityKeywords[promptType]) {
      const typeKeywords = qualityKeywords[promptType].filter(
        k => !extractedKeywords.some(ek => ek.includes(k) || k.includes(ek))
      ).slice(0, 2);
      
      typeKeywords.forEach(keyword => {
        suggestions.push({
          text: keyword,
          domain: 'quality'
        });
      });
    }
    
    setKeywordSuggestions(suggestions);
  };

  // Find similar prompts from history - enhanced with better matching
  useEffect(() => {
    if (inputText.length > 10 && history.length > 0) {
      // Enhanced similarity detection
      const similar = history
        .filter(item => {
          if (!item.inputText) return false;
          
          const inputLower = inputText.toLowerCase();
          const historyLower = item.inputText.toLowerCase();
          
          // Calculate similarity score
          let score = 0;
          
          // Check for text inclusion (strong signal)
          if (historyLower.includes(inputLower) || inputLower.includes(historyLower)) {
            score += 5;
          }
          
          // Check for shared words
          const inputWords = inputLower.split(/\s+/);
          const historyWords = historyLower.split(/\s+/);
          
          // Count significant shared words (longer than 3 chars)
          const sharedWords = inputWords.filter(word => 
            word.length > 3 && historyWords.includes(word)
          ).length;
          
          score += sharedWords;
          
          // Check for same prompt type (weak signal)
          if (item.type === promptType) {
            score += 1;
          }
          
          // Consider same formatting options (weak signal)
          if (item.formatStructure === formatStructure) {
            score += 0.5;
          }
          
          // Return items with significant similarity
          return score >= 3;
        })
        .sort((a, b) => {
          // Sort by recency if similarly relevant
          return new Date(b.date) - new Date(a.date);
        })
        .slice(0, 3); // Limit to 3 similar prompts
      
      setSimilarPrompts(similar);
    } else {
      setSimilarPrompts([]);
    }
  }, [inputText, history, promptType, formatStructure]);

  // Load history and favorites from localStorage on component mount
  useEffect(() => {
    // Load history from localStorage
    const savedHistory = localStorage.getItem('ai_prompt_history');
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        setHistory(parsedHistory);
        
        // Set recent prompts
        setRecentPrompts(parsedHistory.slice(0, 5));
      } catch (error) {
        console.error('Error parsing history:', error);
      }
    }

    // Load favorites from localStorage
    const savedFavorites = localStorage.getItem('ai_prompt_favorites');
    if (savedFavorites) {
      try {
        const parsedFavorites = JSON.parse(savedFavorites);
        setFavorites(parsedFavorites);
        
        // Set pinned prompts (up to 3 favorites)
        setPinnedPrompts(parsedFavorites.slice(0, 3));
      } catch (error) {
        console.error('Error parsing favorites:', error);
      }
    }

    // Load user preferences from localStorage
    const savedPreferences = localStorage.getItem('ai_prompt_preferences');
    if (savedPreferences) {
      try {
        const preferences = JSON.parse(savedPreferences);
        if (preferences.autoSave !== undefined) setAutoSaveEnabled(preferences.autoSave);
        if (preferences.advancedMode !== undefined) setAdvancedMode(preferences.advancedMode);
      } catch (error) {
        console.error('Error parsing preferences:', error);
      }
    }
  }, []);

  // Save user preferences when they change
  useEffect(() => {
    const preferences = {
      autoSave: autoSaveEnabled,
      advancedMode
    };
    
    localStorage.setItem('ai_prompt_preferences', JSON.stringify(preferences));
  }, [autoSaveEnabled, advancedMode]);

  // Update quality based on output length and content - enhanced with more factors
  useEffect(() => {
    if (!outputText) {
      setPromptQuality('unknown');
      return;
    }

    setPromptQuality(estimateQuality(outputText));
  }, [outputText]);

  // Function to estimate quality based on text - enhanced with more sophisticated criteria
  const estimateQuality = (text) => {
    if (!text) return 'unknown';
    
    // Base factors
    const lengthScore = Math.min(100, text.length / 10);
    
    // Structure detection with more patterns
    const hasStructure = (
      (text.includes(':') && text.includes('\n')) || 
      text.includes('•') || 
      /\d+\.\s/.test(text) ||  // Numbered lists
      text.includes('- ') ||
      text.includes('* ') ||
      text.includes('أولاً') ||
      text.includes('ثانياً') ||
      text.includes('First') ||
      text.includes('Second')
    );
    const structureScore = hasStructure ? 50 : 0;
    
    // Role/expertise detection
    const rolePatterns = [
      'أنت', 'You are', 'expert', 'خبير', 'متخصص',
      'professional', 'محترف', 'specialist', 'مختص',
      'As a', 'كـ', 'بصفتك'
    ];
    
    const hasRole = rolePatterns.some(pattern => text.includes(pattern));
    const roleScore = hasRole ? 30 : 0;
    
    // Check for instructional elements (steps, instructions)
    const hasInstructions = (
      /\d+\.\s/.test(text) || // Numbered steps
      text.includes('First') || text.includes('Then') || text.includes('Finally') ||
      text.includes('أولاً') || text.includes('ثم') || text.includes('أخيراً') ||
      text.includes('Step ') || text.includes('خطوة')
    );
    const instructionScore = hasInstructions ? 25 : 0;
    
    // Check for examples
    const hasExamples = (
      text.includes('For example') || text.includes('Example:') ||
      text.includes('على سبيل المثال') || text.includes('مثال:') ||
      text.includes('e.g.,') || text.includes('such as')
    );
    const exampleScore = hasExamples ? 20 : 0;
    
    // Check for contextual elements
    const hasContext = (
      text.includes('context') || text.includes('background') ||
      text.includes('سياق') || text.includes('خلفية')
    );
    const contextScore = hasContext ? 15 : 0;
    
    // Length-based scoring
    let detailScore = 0;
    if (text.length > 800) detailScore = 60;
    else if (text.length > 500) detailScore = 40;
    else if (text.length > 300) detailScore = 25;
    else detailScore = 10;

    // Language complexity indicators
    const complexLanguage = (
      text.split(' ').some(word => word.length > 8) ||
      text.split('.').some(sentence => sentence.split(' ').length > 20)
    );
    const languageScore = complexLanguage ? 15 : 0;
    
    // Total quality score
    const totalScore = lengthScore + structureScore + roleScore + 
                       instructionScore + exampleScore + contextScore + 
                       detailScore + languageScore;

    // Classify based on total score
    if (totalScore < 100) {
      return 'low';
    } else if (totalScore < 150) {
      return 'medium';
    } else {
      return 'high';
    }
  };

  // Extract template placeholders from a template string
  const extractTemplatePlaceholders = (templateText) => {
    const placeholders = templateText.match(/\{([^}]+)\}/g);
    if (!placeholders) return [];
    
    // Remove duplicates and format
    return [...new Set(placeholders)].map(placeholder => {
      const fieldName = placeholder.substring(1, placeholder.length - 1);
      return {
        key: fieldName,
        placeholder: fieldName,
        value: ''
      };
    });
  };

  // Updated - Apply a template with custom UI dialog - Always show fields modal
  const handleSelectTemplate = (template) => {
    setCurrentTemplateMeta(template);
    let placeholders = extractTemplatePlaceholders(template.template);
    
    // If no placeholders are found, add default fields to ensure the dialog shows
    if (!placeholders.length) {
      // Add default fields for customization
      placeholders = [
        { key: 'topic', placeholder: 'topic', value: '' },
        { key: 'tone', placeholder: 'tone', value: '' }
      ];
    }
    
    // Initialize field values
    const initialValues = {};
    placeholders.forEach(field => {
      initialValues[field.key] = '';
    });
    
    setTemplateFieldValues(initialValues);
    setCurrentTemplateFields(placeholders);
    setTemplatePreview(template.template);
    
    // Reset form and show fields modal
    templateForm.resetFields();
    setTemplateModalVisible(false);
    setTemplateFieldsModalVisible(true);
  };

  // Update preview as user types in field values
  const updateTemplatePreview = (allValues) => {
    if (!currentTemplateMeta) return;
    
    let previewText = currentTemplateMeta.template;
    
    // Replace each placeholder with its value or keep placeholder if empty
    Object.entries(allValues).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      if (value) {
        previewText = previewText.replace(new RegExp(placeholder, 'g'), value);
      }
    });
    
    setTemplatePreview(previewText);
  };

  // Apply template with field values from the form
  const applyTemplateWithFields = (values) => {
    if (!currentTemplateMeta) return;
    
    let finalText = currentTemplateMeta.template;
    let hasPlaceholders = false;
    
    // Replace each placeholder with its value
    Object.entries(values).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      
      // If placeholder exists in template, replace it
      if (finalText.includes(placeholder)) {
        finalText = finalText.replace(new RegExp(placeholder, 'g'), value || key);
        hasPlaceholders = true;
      }
    });
    
    // If no placeholders were found in the template but we have values
    // (meaning we had default fields), append them to the template
    if (!hasPlaceholders && Object.keys(values).length > 0) {
      // Build topic and context string from provided values
      const contextAdditions = [];
      
      if (values.topic) {
        contextAdditions.push(currentLanguage === 'ar' 
          ? `الموضوع: ${values.topic}` 
          : `Topic: ${values.topic}`);
      }
      
      if (values.tone) {
        contextAdditions.push(currentLanguage === 'ar' 
          ? `النبرة: ${values.tone}` 
          : `Tone: ${values.tone}`);
      }
      
      // Add other fields if they exist
      Object.entries(values).forEach(([key, value]) => {
        if (key !== 'topic' && key !== 'tone' && value) {
          contextAdditions.push(`${key}: ${value}`);
        }
      });
      
      // Append context to template if we have additions
      if (contextAdditions.length > 0) {
        finalText = finalText + '\n\n' + contextAdditions.join('\n');
      }
    }
    
    setInputText(finalText);
    setTemplateFieldsModalVisible(false);
    
    // Focus on textarea for easy editing
    if (textareaRef.current) {
      setTimeout(() => textareaRef.current.focus(), 100);
    }
  };

  // Generate prompt based on selected type with enhanced error handling and streaming
  const generatePrompt = async () => {
    if (!inputText.trim()) {
      message.error(t('empty_input_error'));
      return;
    }

    setIsLoading(true);
    setOutputText('');
    completeOutputRef.current = ''; // Reset the complete output reference
    setPromptQuality('unknown');
    setAnimateOutput(false);
    setTypingText(''); // Reset the typing animation text
    
    // Clear the text chunks queue
    textChunksQueue.current = [];
    isProcessingQueue.current = false;
    
    // Start progress animation
    setProgressPercent(0);
    const progressInterval = setInterval(() => {
      setProgressPercent(prev => {
        // Gradually increase but never reach 100% until completion
        if (prev < 90) {
          return prev + (90 - prev) / 10;
        }
        return prev;
      });
    }, 300);

    try {
      // Use streaming API for real-time updates
      setIsStreaming(true);
      
      // Close any existing stream before starting a new one
      if (promptStreamRef.current) {
        promptStreamRef.current.close();
      }

      // Get JWT token from localStorage for authentication
      const userInfoString = localStorage.getItem('userInfo');
      let token = '';
      if (userInfoString) {
        try {
          const userInfo = JSON.parse(userInfoString);
          if (userInfo && userInfo.token) {
            token = userInfo.token;
          }
        } catch (error) {
          console.error('Error parsing user info:', error);
        }
      }

      // Add advanced parameters to query string
      const params = new URLSearchParams();
      params.append('text', inputText);
      params.append('token', token);
      
      // Basic parameters
      params.append('format', formatStructure);
      params.append('length', formatLength);
      params.append('style', formatStyle);
      params.append('language', languageOption);
      
      // Advanced parameters if enabled
      if (advancedMode) {
        params.append('tone', tone);
        params.append('audience', audience);
        params.append('domain', domain);
      }
      
      // Add detected keywords and categories for improved generation
      if (keywordsDetected.length > 0) {
        params.append('keywords', keywordsDetected.join(','));
      }
      
      if (promptCategories.length > 0) {
        params.append('categories', promptCategories.join(','));
      }

      // Create event source for SSE (Server-Sent Events) with authentication token
      const eventSource = new EventSource(`/api/ai/prompts/stream/${promptType}?${params.toString()}`);
      promptStreamRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle content updates first (this should happen most of the time)
          if (data.content) {
            // Update the complete output reference
            completeOutputRef.current += data.content;
            
            // CRITICAL: NEVER update outputText during streaming
            // Only add to the typing queue to ensure character-by-character animation
            addToTypingQueue(data.content);
          }
          
          // Check if we've received the completion marker
          if (data.done === true) {
            eventSource.close();
            setIsLoading(false);
            setProgressPercent(100);
            clearInterval(progressInterval);
            
            // IMPORTANT: Don't end streaming immediately - we need to let 
            // the typing animation complete first
            
            // Start checking if typing animation is complete
            const checkTypingComplete = () => {
              // If typing queue is empty, typing is complete
              if (textChunksQueue.current.length === 0 && !isProcessingQueue.current) {
                // Now it's safe to finish the streaming state
                setIsStreaming(false);
                
                // Now it's safe to set the output text for display and history
                setOutputText(completeOutputRef.current);
                
                // Add to history
                addToHistory(promptType, inputText, completeOutputRef.current);
                
                // Auto-save if enabled and favorites limit not reached
                if (autoSaveEnabled && completeOutputRef.current.trim() && favorites.length < 10) {
                  // Generate automatic name from input
                  const autoName = inputText.length > 20 
                    ? `${inputText.substring(0, 20)}...` 
                    : inputText;
                  
                  saveToFavorites(autoName, completeOutputRef.current);
                } else if (autoSaveEnabled && favorites.length >= 10) {
                  // Show auto-save limit notification
                  notification.info({
                    message: t('favorites_auto_save_limit'),
                    duration: 3
                  });
                }
                
                // Show success notification
                message.success({
                  content: (
                    <span>
                      {t('prompt_generated_success')} <LikeOutlined onClick={() => setFeedbackVisible(true)} />
                    </span>
                  ),
                  duration: 3
                });
                
                // Trigger animation
                setAnimateOutput(true);
                
                // Scroll to the output section
                if (outputRef.current) {
                  outputRef.current.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                  });
                }
              } else {
                // Still typing, check again in a little bit
                setTimeout(checkTypingComplete, 100);
              }
            };
            
            // Start checking if typing is complete
            checkTypingComplete();
            
            return;
          }
          
          // Handle errors
          if (data.error) {
            message.error(data.error);
            eventSource.close();
            setIsStreaming(false);
            setIsLoading(false);
            clearInterval(progressInterval);
          }
        } catch (err) {
          console.error('Error parsing event data:', err);
          // Don't crash the entire stream for a single parsing error
        }
      };

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        eventSource.close();
        setIsStreaming(false);
        setIsLoading(false);
        clearInterval(progressInterval);
        message.error(t('error_generating'));
      };

      // Clean up function to close the stream if component unmounts
      return () => {
        if (eventSource) {
          eventSource.close();
        }
        clearInterval(progressInterval);
      };
    } catch (error) {
      console.error('Error generating prompt:', error);
      setIsLoading(false);
      setIsStreaming(false);
      clearInterval(progressInterval);
      message.error(t('error_generating'));
    }
  };

  // Add prompt to history (limited to 10 items)
  const addToHistory = (type, input, output) => {
    const quality = estimateQuality(output);
    const newHistoryItem = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      type,
      inputText: input,
      outputText: output,
      quality,
      formatLength,
      formatStyle,
      formatStructure,
      keywords: keywordsDetected,
      categories: promptCategories
    };
    
    const updatedHistory = [newHistoryItem, ...history].slice(0, 10); // Keep only 10 most recent items
    
    // Show the history limit notification if more than 10 items would exist
    if (history.length >= 10) {
      notification.info({
        message: t('history_limit'),
        description: t('history_limit_desc'),
        placement: 'bottomRight',
        duration: 3
      });
    }
    
    setHistory(updatedHistory);
    
    // Update recent prompts
    setRecentPrompts(updatedHistory.slice(0, 5));
    
    // Save to localStorage
    localStorage.setItem('ai_prompt_history', JSON.stringify(updatedHistory));
  };

  // Add prompt to favorites with enhanced features (limited to 10 items)
  const saveToFavorites = async (name, outputTextToSave = null) => {
    const textToSave = outputTextToSave || outputText;
    
    if (!textToSave) {
      message.error(t('no_output_to_save'));
      return;
    }

    if (!name || !name.trim()) {
      message.error(t('favorites_name_required'));
      return;
    }
    
    // Check if favorites limit is reached
    if (favorites.length >= 10) {
      // Different message for auto-save vs manual save
      if (outputTextToSave) {
        notification.warning({
          message: t('favorites_auto_save_limit'),
          description: t('favorites_limit_management'),
          duration: 5
        });
      } else {
        notification.error({
          message: t('favorites_limit_reached'),
          description: t('favorites_limit_management'),
          icon: <WarningOutlined style={{ color: '#ff4d4f' }} />,
          duration: 5
        });
      }
      return null;
    }
    
    // Show warning when approaching the limit (9 items)
    if (favorites.length === 9 && !outputTextToSave) {
      notification.warning({
        message: t('favorites_near_limit'),
        description: t('favorites_limit_desc'),
        duration: 4
      });
    }

    try {
      const favoriteItem = {
        id: Date.now().toString(),
        name: name,
        date: new Date().toISOString(),
        type: promptType,
        inputText: inputText,
        outputText: textToSave,
        quality: promptQuality,
        formatLength,
        formatStyle,
        formatStructure,
        keywords: keywordsDetected,
        categories: promptCategories
      };

      // In a real app, you'd save to the server here
      // const response = await axios.post('/api/ai/prompts/favorites', {
      //   promptType: promptType,
      //   promptText: textToSave,
      //   name: name
      // });

      // Update local state (keep only 10 items max)
      const updatedFavorites = [favoriteItem, ...favorites].slice(0, 10);
      setFavorites(updatedFavorites);
      
      // Update pinned prompts
      setPinnedPrompts(updatedFavorites.slice(0, 3));
      
      // Save to localStorage (temporary solution)
      localStorage.setItem('ai_prompt_favorites', JSON.stringify(updatedFavorites));
      
      // Close modal and reset name if modal was used
      if (!outputTextToSave) {
        setSaveModalVisible(false);
        setSavePromptName('');
      }
      
      // Show success animation
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
      if (!outputTextToSave) {
        message.success(t('favorites_add_success'));
      }
      
      return favoriteItem;
    } catch (error) {
      console.error('Error saving to favorites:', error);
      message.error(t('error_saving'));
      return null;
    }
  };

  // Remove from favorites
  const removeFromFavorites = (id) => {
    try {
      const updatedFavorites = favorites.filter(item => item.id !== id);
      setFavorites(updatedFavorites);
      
      // Update pinned prompts
      setPinnedPrompts(updatedFavorites.slice(0, 3));
      
      // Save to localStorage
      localStorage.setItem('ai_prompt_favorites', JSON.stringify(updatedFavorites));
      
      message.success(t('favorites_remove_success'));
    } catch (error) {
      console.error('Error removing from favorites:', error);
      message.error(t('error_saving'));
    }
  };

  // Copy output to clipboard with improved UX
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(outputText);
      
      // Show copy animation
      setCopiedRecently(true);
      setTimeout(() => setCopiedRecently(false), 2000);
      
      message.success({
        content: t('copied_to_clipboard'),
        icon: <CheckOutlined style={{ color: '#52c41a' }} />
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      message.error(t('error_copying'));
    }
  };

  // Load history item with enhanced experience
  const loadFromHistory = (item) => {
    // Set all related fields for a complete experience restoration
    setPromptType(item.type);
    setInputText(item.inputText);
    setOutputText(item.outputText);
    setActiveTab('prompt');
    
    // Restore format settings
    if (item.formatLength) setFormatLength(item.formatLength);
    if (item.formatStyle) setFormatStyle(item.formatStyle);
    if (item.formatStructure) setFormatStructure(item.formatStructure);
    
    // Restore metadata if available
    if (item.keywords) setKeywordsDetected(item.keywords);
    if (item.categories) setPromptCategories(item.categories);
    
    // Set quality
    setPromptQuality(item.quality || estimateQuality(item.outputText));
    
    // Show success message with animation
    message.success({
      content: t('history_loaded'),
      icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      className: 'success-message'
    });
    
    // Focus on input for easy editing
    if (textareaRef.current) {
      setTimeout(() => textareaRef.current.focus(), 100);
    }
    
    // Trigger a subtle animation to draw attention
    setAnimateOutput(true);
    setTimeout(() => setAnimateOutput(false), 1000);
  };

  // Load favorite item with enhanced experience
  const loadFromFavorites = (item) => {
    // Set all related fields for a complete experience restoration
    setPromptType(item.type);
    setInputText(item.inputText);
    setOutputText(item.outputText);
    setActiveTab('prompt');
    
    // Restore format settings
    if (item.formatLength) setFormatLength(item.formatLength);
    if (item.formatStyle) setFormatStyle(item.formatStyle);
    if (item.formatStructure) setFormatStructure(item.formatStructure);
    
    // Restore metadata if available
    if (item.keywords) setKeywordsDetected(item.keywords);
    if (item.categories) setPromptCategories(item.categories);
    
    // Set quality
    setPromptQuality(item.quality || estimateQuality(item.outputText));
    
    // Show success message with animation
    message.success({
      content: t('favorites_loaded'),
      icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      className: 'success-message'
    });
    
    // Focus on input for easy editing
    if (textareaRef.current) {
      setTimeout(() => textareaRef.current.focus(), 100);
    }
    
    // Trigger a subtle animation
    setAnimateOutput(true);
    setTimeout(() => setAnimateOutput(false), 1000);
  };

  // Delete history item
  const deleteFromHistory = (id) => {
    const updatedHistory = history.filter(item => item.id !== id);
    setHistory(updatedHistory);
    
    // Update recent prompts
    setRecentPrompts(updatedHistory.slice(0, 5));
    
    // Save to localStorage
    localStorage.setItem('ai_prompt_history', JSON.stringify(updatedHistory));
    
    message.success(t('history_delete_success'));
  };

  // Clear all history
  const clearHistory = () => {
    setHistory([]);
    setRecentPrompts([]);
    localStorage.removeItem('ai_prompt_history');
    message.success(t('history_cleared'));
  };

  // Submit user feedback with enhanced data collection
  const submitFeedback = () => {
    // In a real app, this would send feedback to the server
    // with enhanced metadata for better analytics
    // axios.post('/api/ai/feedback', { 
    //   rating: feedbackRating, 
    //   comments: feedbackComments,
    //   promptType,
    //   outputLength: outputText?.length || 0,
    //   quality: promptQuality,
    //   inputAnalytics: {
    //     wordCount,
    //     keywordsDetected,
    //     promptCategories
    //   }
    // });
    
    message.success(t('feedback_submitted'));
    setFeedbackVisible(false);
    setFeedbackRating(0);
    setFeedbackComments('');
  };

  // RENDER COMPONENTS
  // Prompt type selector component with enhanced UX
  const renderPromptTypeSelector = () => (
    <div 
      className="prompt-type-container"
      id="type-selection-container"
    >
      <div className="prompt-type-cards">
        <Row gutter={[16, 16]} className="prompt-type-row">
          <Col xs={24} sm={12} md={8} lg={6} xl={4.8} className="prompt-type-col">
            <Card
              className={`prompt-type-card ${promptType === 'enhance' ? 'selected' : ''}`}
              onClick={() => setPromptType('enhance')}
              hoverable
            >
              <div className="prompt-type-icon">
                <FormOutlined />
              </div>
              <div className="prompt-type-title">{t('enhance_prompt')}</div>
              <div className="prompt-type-desc">{t('enhance_prompt_short_desc')}</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={4.8} className="prompt-type-col">
            <Card
              className={`prompt-type-card ${promptType === 'chat' ? 'selected' : ''}`}
              onClick={() => setPromptType('chat')}
              hoverable
            >
              <div className="prompt-type-icon">
                <CommentOutlined />
              </div>
              <div className="prompt-type-title">{t('chat_prompt')}</div>
              <div className="prompt-type-desc">{t('chat_prompt_short_desc')}</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={4.8} className="prompt-type-col">
            <Card
              className={`prompt-type-card ${promptType === 'reasoner' ? 'selected' : ''}`}
              onClick={() => setPromptType('reasoner')}
              hoverable
            >
              <div className="prompt-type-icon">
                <EditOutlined />
              </div>
              <div className="prompt-type-title">{t('reasoning_prompt')}</div>
              <div className="prompt-type-desc">{t('reasoning_prompt_short_desc')}</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={4.8} className="prompt-type-col">
            <Card
              className={`prompt-type-card ${promptType === 'image' ? 'selected' : ''}`}
              onClick={() => setPromptType('image')}
              hoverable
            >
              <div className="prompt-type-icon">
                <PictureOutlined />
              </div>
              <div className="prompt-type-title">{t('image_prompt')}</div>
              <div className="prompt-type-desc">{t('image_prompt_short_desc')}</div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6} xl={4.8} className="prompt-type-col">
            <Card
              className={`prompt-type-card ${promptType === 'checker' ? 'selected' : ''}`}
              onClick={() => setPromptType('checker')}
              hoverable
            >
              <div className="prompt-type-icon">
                <SafetyOutlined />
              </div>
              <div className="prompt-type-title">{t('checker_prompt')}</div>
              <div className="prompt-type-desc">{t('checker_prompt_short_desc')}</div>
            </Card>
          </Col>
        </Row>
      </div>
      
      <Alert
        message={getPromptTypeLabel(promptType)}
        description={t(`${promptType}_prompt_desc`)}
        type="info"
        showIcon
        className="prompt-type-description"
        icon={getPromptTypeIcon(promptType)}
        action={
          <Space>
            <Tooltip title={t('quick_template')}>
              <Button 
                type="text" 
                icon={<ThunderboltOutlined />} 
                onClick={() => setTemplateModalVisible(true)}
              />
            </Tooltip>
            <Badge 
              count={<QuestionCircleOutlined style={{ color: '#1890ff' }} />} 
              offset={[-5, 5]}
            >
              <Button 
                type="text" 
                icon={<InfoCircleOutlined />}
                onClick={() => {
                  setHelpModalVisible(true);
                  setActiveGuideSection(promptType);
                }}
              />
            </Badge>
          </Space>
        }
      />
    </div>
  );

  // Dynamic examples based on promptType
  const getExamples = () => {
    const allExamples = {
      enhance: [
        {
          title: t('example_professional_prompt'),
          text: "أنت خبير في الذكاء الاصطناعي. اشرح مفهوم التعلم العميق لطالب في السنة الأولى من الجامعة. استخدم أمثلة من الحياة اليومية، وتجنب المصطلحات التقنية المعقدة عندما يكون ذلك ممكناً. قدم الشرح في 3-4 فقرات فقط.",
          description: t('example_professional_desc')
        },
        {
          title: t('example_detailed_prompt'),
          text: "أنت محلل مالي خبير مع خبرة 15 عاماً في أسواق الأسهم. قم بتحليل أداء قطاع التكنولوجيا خلال الستة أشهر الماضية، مع التركيز على الشركات الخمس الكبرى. قدم توقعاتك للربع القادم، وحدد فرص الاستثمار الواعدة والمخاطر المحتملة. استخدم لغة مهنية وقدم تحليلاً عميقاً مدعوماً بالبيانات والإحصاءات.",
          description: t('example_detailed_desc')
        }
      ],
      chat: [
        {
          title: t('example_conversation_prompt'),
          text: "أنت طبيب مختص في طب الأسرة. قم بإجراء محادثة مع مريض يبلغ من العمر 45 عاماً ويعاني من آلام مزمنة في الظهر. اسأله أسئلة تشخيصية مهمة، واستمع إلى مخاوفه، وقدم له نصائح أولية للتعامل مع الألم.",
          description: t('example_conversation_desc')
        },
        {
          title: t('example_support_prompt'),
          text: "أنت موظف دعم فني لشركة برمجيات. ساعد عميلاً يواجه مشكلة في تثبيت البرنامج على نظام التشغيل Windows 11. اجعل اللغة بسيطة وسهلة الفهم، واقترح حلولاً تدريجية بترتيب من الأبسط إلى الأكثر تعقيداً.",
          description: t('example_support_desc')
        }
      ],
      reasoner: [
        {
          title: t('example_analysis_prompt'),
          text: "أنت خبير اقتصادي. قم بتحليل تأثير التضخم على القدرة الشرائية للمستهلكين في الشرق الأوسط خلال العامين الماضيين. حدد العوامل الرئيسية المساهمة في هذا التضخم، وقدم توقعات للمستقبل القريب، واقترح استراتيجيات يمكن للأسر اتباعها للتعامل مع هذا الوضع.",
          description: t('example_analysis_desc')
        },
        {
          title: t('example_compare_prompt'),
          text: "أنت مستشار تعليمي. قارن بين نظم التعليم في ثلاث دول عربية مختلفة: المملكة العربية السعودية، ومصر، والإمارات العربية المتحدة. حدد نقاط القوة والضعف في كل نظام، مع التركيز على الجودة، والتكلفة، وفرص العمل المتاحة للخريجين. استخدم معايير محددة للمقارنة واعتمد على بيانات حديثة.",
          description: t('example_compare_desc')
        }
      ],
      image: [
        {
          title: t('example_landscape_prompt'),
          text: "منظر طبيعي لجبال شاهقة تغطيها الثلوج، مع بحيرة صافية في الأسفل تعكس صورة الجبال. أشعة الشمس الذهبية وقت الغروب تسقط على قمم الجبال. أشجار الصنوبر الخضراء تنتشر على سفوح الجبال. أسلوب تصوير واقعي عالي الدقة.",
          description: t('example_landscape_desc')
        },
        {
          title: t('example_portrait_prompt'),
          text: "صورة شخصية لرائد فضاء يرتدي بدلة فضاء حديثة ويقف على سطح المريخ. خوذة الفضاء تعكس المناظر الطبيعية للكوكب الأحمر. إضاءة دراماتيكية مع الشمس المنخفضة في الأفق تخلق ظلالاً طويلة. ألوان أحمر وبرتقالي وذهبي تسيطر على المشهد. أسلوب تصوير سينمائي بجودة عالية.",
          description: t('example_portrait_desc')
        }
      ],
      checker: [
        {
          title: t('example_check_simple'),
          text: "اكتب لي مقالة عن التغير المناخي",
          description: t('example_check_simple_desc')
        },
        {
          title: t('example_check_complex'),
          text: "أنت خبير في علم المناخ مع خبرة 15 عاماً في دراسة التغيرات المناخية العالمية. اكتب مقالة شاملة (1500-2000 كلمة) عن تأثير ارتفاع درجات الحرارة العالمية على النظم البيئية في منطقة الشرق الأوسط وشمال أفريقيا. تناول التأثيرات على الزراعة، والموارد المائية، والتنوع البيولوجي، والصحة العامة. اختتم المقالة باستراتيجيات التكيف والتخفيف المناسبة للمنطقة، مع مراعاة السياق الاقتصادي والاجتماعي. استخدم لغة علمية دقيقة ولكن مفهومة للقراء المتخصصين وصناع السياسات.",
          description: t('example_check_complex_desc')
        }
      ]
    };

    return allExamples[promptType] || [];
  };

  // Next example button handler
  const handleNextExample = () => {
    const examples = getExamples();
    setCurrentExample((currentExample + 1) % examples.length);
  };

  // Apply example to input text with enhanced UX
  const applyExample = (exampleText) => {
    setInputText(exampleText);
    
    // Automatically categorize after applying
    if (autoCategorize) {
      autoDetectPromptType(exampleText);
      
      // Analyze for suggestions
      setSmartSuggestions(analyzeInputForSuggestions(exampleText, promptType));
    }
    
    // Show animation
    setInputExpanded(true);
    setTimeout(() => setInputExpanded(false), 500);
    
    // Focus on textarea after applying example
    if (textareaRef.current) {
      setTimeout(() => {
        textareaRef.current.focus();
        
        // Scroll to end of text - using proper DOM element access
        if (textareaRef.current.resizableTextArea && 
            textareaRef.current.resizableTextArea.textArea) {
          textareaRef.current.resizableTextArea.textArea.setSelectionRange(
            exampleText.length,
            exampleText.length
          );
        }
      }, 100);
    }
  };

  // Smart suggestions component with enhanced UX
  const renderSmartSuggestions = () => {
    if (smartSuggestions.length === 0) return null;
    
    return (
      <div className="smart-suggestions">
        <div className="suggestions-header">
          <BulbOutlined /> {t('suggestions_header')}
        </div>
        <div className="suggestions-list">
          {smartSuggestions.map((suggestion, index) => (
            <div 
              key={index} 
              className={`suggestion-item ${suggestion.important ? 'important' : ''}`}
            >
              <Badge color={suggestion.important ? '#ff4d4f' : '#1890ff'} />
              <span>{suggestion.text}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Show detected keywords
  const renderKeywordTags = () => {
    if (keywordsDetected.length === 0) return null;
    
    return (
      <div className="detected-keywords">
        <div className="keywords-header">
          <TagOutlined /> {t('detected_keywords')}
        </div>
        <div className="keywords-content">
          {keywordsDetected.map((keyword, index) => (
            <Tag key={index} color="blue">{keyword}</Tag>
          ))}
        </div>
      </div>
    );
  };

  // Show keyword suggestions
  const renderKeywordSuggestions = () => {
    if (keywordSuggestions.length === 0) return null;
    
    return (
      <div className="keyword-suggestions">
        <div className="keywords-header">
          <PlusOutlined /> {t('suggested_keywords')}
        </div>
        <div className="keywords-content">
          {keywordSuggestions.map((keyword, index) => (
            <Tag 
              key={index} 
              color={keyword.domain === 'quality' ? 'green' : 'purple'}
              style={{ cursor: 'pointer' }}
              onClick={() => {
                // Add keyword to input text at cursor position or end
                if (textareaRef.current) {
                  const cursorPos = textareaRef.current.resizableTextArea.textArea.selectionStart;
                  const currentText = inputText;
                  const newText = currentText.substring(0, cursorPos) + 
                                 ' ' + keyword.text + ' ' + 
                                 currentText.substring(cursorPos);
                  setInputText(newText);
                  
                  // Focus and place cursor after inserted keyword
                  setTimeout(() => {
                    textareaRef.current.focus();
                    const newPos = cursorPos + keyword.text.length + 2;
                    textareaRef.current.resizableTextArea.textArea.setSelectionRange(newPos, newPos);
                  }, 50);
                } else {
                  setInputText(inputText + ' ' + keyword.text + ' ');
                }
              }}
            >
              {keyword.text}
            </Tag>
          ))}
        </div>
      </div>
    );
  };

  // Similar prompts component with enhanced UX
  const renderSimilarPrompts = () => {
    if (similarPrompts.length === 0) return null;
    
    return (
      <div className="similar-prompts">
        <div className="similar-header">
          <LineChartOutlined /> {t('similar_prompts_header')}
        </div>
        <div className="similar-list">
          {similarPrompts.map((item) => (
            <div key={item.id} className="similar-item">
              <div className="similar-content">
                <div className="similar-title">
                  <Tag icon={getPromptTypeIcon(item.type)} color="blue">
                    {getPromptTypeLabel(item.type)}
                  </Tag>
                  <span>{new Date(item.date).toLocaleDateString()}</span>
                </div>
                <div className="similar-text">
                  {item.inputText.length > 70 
                    ? `${item.inputText.substring(0, 70)}...` 
                    : item.inputText}
                </div>
              </div>
              <Button 
                type="link" 
                icon={<EyeOutlined />} 
                onClick={() => loadFromHistory(item)} 
                size="small"
              >
                {t('view')}
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Input section with improved UI and UX
  const renderInputSection = () => (
    <div 
      className={`input-section ${inputExpanded ? 'expanded' : ''}`}
      id="examples-container"
    >
      <div className="input-header">
        <div className="input-label">
          <span className="input-number">1</span> {t('input_label')}
          <Text type="secondary" className="input-count">
            {charCount > 0 && (
              <>{wordCount} {t('words')} | {charCount} {t('characters')}</>
            )}
          </Text>
        </div>
        <div className="input-actions">
          <Tooltip title={t('auto_categorize')}>
            <Switch 
              checked={autoCategorize} 
              onChange={setAutoCategorize}
              checkedChildren={<CheckOutlined />}
              unCheckedChildren={<CloseOutlined />}
              size="small"
            />
          </Tooltip>
          <Tooltip title={t('show_examples')}>
            <Button 
              type="text" 
              icon={<BulbOutlined />} 
              onClick={() => setShowExamples(!showExamples)}
              className={`examples-toggle ${showExamples ? 'active' : ''}`}
            />
          </Tooltip>
          <Tooltip title={t('templates')}>
            <Button
              type="text"
              icon={<UnorderedListOutlined />}
              onClick={() => setTemplateModalVisible(true)}
            />
          </Tooltip>
        </div>
      </div>
      
      <div className="input-textarea-container">
        <TextArea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={t('input_placeholder')}
          autoSize={{ minRows: 5, maxRows: 15 }}
          disabled={isLoading || isStreaming}
          className={`prompt-textarea modern ${inputFocused ? 'focused' : ''}`}
          bordered
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
        />
        
        {promptComplexity > 0 && (
          <Tooltip title={t('prompt_complexity')}>
            <Progress 
              className="complexity-meter"
              percent={promptComplexity} 
              size="small"
              strokeColor={{
                '0%': '#ff4d4f',
                '50%': '#faad14',
                '100%': '#52c41a',
              }}
              showInfo={false}
            />
          </Tooltip>
        )}
        
        {inputText.length > 0 && inputAnalysisComplete && (
          <div className="input-helpers">
            {renderSmartSuggestions()}
            {renderKeywordTags()}
            {renderKeywordSuggestions()}
            {renderSimilarPrompts()}
          </div>
        )}
      </div>
      
      <div className="example-container">
        {showExamples && getExamples().length > 0 && (
          <Card 
            className="example-card" 
            bordered={false}
          >
            <div className="example-header">
              <Title level={5}><BulbOutlined /> {getExamples()[currentExample].title}</Title>
              <Space>
                <Button 
                  type="text" 
                  icon={<ArrowRightOutlined />} 
                  onClick={handleNextExample}
                  size="small"
                />
                <Button 
                  type="primary" 
                  size="small"
                  onClick={() => applyExample(getExamples()[currentExample].text)}
                >
                  {t('try_example')}
                </Button>
              </Space>
            </div>
            <div className="example-content">
              <Paragraph className="example-text">
                {getExamples()[currentExample].text}
              </Paragraph>
              <Text type="secondary">{getExamples()[currentExample].description}</Text>
            </div>
          </Card>
        )}
      </div>
    </div>
  );

  // Format options section with improved UX
  const renderFormatOptions = () => (
    <div className="format-section">
      <div className="format-header">
        <div className="format-label">
          <span className="format-number">2</span> {t('format_options_heading')}
        </div>
        <div className="format-actions">
          <Tooltip title={t(advancedMode ? 'hide_advanced_options' : 'show_advanced_options')}>
            <Button
              type="text"
              icon={advancedMode ? <SettingOutlined /> : <SettingOutlined />}
              onClick={() => setAdvancedMode(!advancedMode)}
              id="advanced-toggle-button"
              className={advancedMode ? 'active' : ''}
            />
          </Tooltip>
        </div>
      </div>
      
      <Row gutter={[24, 24]} className="format-row">
        <Col xs={24} md={8}>
          <Card title={t('format_length')} bordered={false} className="option-card">
            <Radio.Group 
              value={formatLength} 
              onChange={(e) => setFormatLength(e.target.value)}
              className="vertical-radio-group"
            >
              <Radio.Button value="concise" className="custom-radio-button">
                <div className="option-button-content">
                  <div className="option-title">{t('concise_format')}</div>
                  <div className="option-description">{t('concise_format_desc')}</div>
                </div>
              </Radio.Button>
              <Radio.Button value="standard" className="custom-radio-button">
                <div className="option-button-content">
                  <div className="option-title">{t('standard_format')}</div>
                  <div className="option-description">{t('standard_format_desc')}</div>
                </div>
              </Radio.Button>
              <Radio.Button value="detailed" className="custom-radio-button">
                <div className="option-button-content">
                  <div className="option-title">{t('detailed_format')}</div>
                  <div className="option-description">{t('detailed_format_desc')}</div>
                </div>
              </Radio.Button>
            </Radio.Group>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title={t('format_style')} bordered={false} className="option-card">
            <Radio.Group 
              value={formatStyle} 
              onChange={(e) => setFormatStyle(e.target.value)}
              className="vertical-radio-group"
            >
              <Radio.Button value="professional" className="custom-radio-button">
                <div className="option-button-content">
                  <div className="option-title">{t('format_professional')}</div>
                  <div className="option-description">{t('format_professional_desc')}</div>
                </div>
              </Radio.Button>
              <Radio.Button value="casual" className="custom-radio-button">
                <div className="option-button-content">
                  <div className="option-title">{t('format_casual')}</div>
                  <div className="option-description">{t('format_casual_desc')}</div>
                </div>
              </Radio.Button>
              <Radio.Button value="creative" className="custom-radio-button">
                <div className="option-button-content">
                  <div className="option-title">{t('format_creative')}</div>
                  <div className="option-description">{t('format_creative_desc')}</div>
                </div>
              </Radio.Button>
            </Radio.Group>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title={t('format_structure')} bordered={false} className="option-card">
            <Radio.Group 
              value={formatStructure} 
              onChange={(e) => setFormatStructure(e.target.value)}
              className="vertical-radio-group"
            >
              <Radio.Button value="bullet_points" className="custom-radio-button">
                <div className="option-button-content">
                  <div className="option-title">{t('format_bullet_points')}</div>
                  <div className="option-description">{t('format_bullet_points_desc')}</div>
                </div>
              </Radio.Button>
              <Radio.Button value="paragraphs" className="custom-radio-button">
                <div className="option-button-content">
                  <div className="option-title">{t('format_paragraphs')}</div>
                  <div className="option-description">{t('format_paragraphs_desc')}</div>
                </div>
              </Radio.Button>
              <Radio.Button value="step_by_step" className="custom-radio-button">
                <div className="option-button-content">
                  <div className="option-title">{t('format_step_by_step')}</div>
                  <div className="option-description">{t('format_step_by_step_desc')}</div>
                </div>
              </Radio.Button>
            </Radio.Group>
          </Card>
        </Col>
      </Row>
      
      {advancedMode && (
        <div className="advanced-options">
          <Divider orientation="left">{t('advanced_options')}</Divider>
          <Row gutter={[24, 24]}>
            <Col xs={24} md={8}>
              <Form.Item label={t('tone_label')}>
                <Select value={tone} onChange={setTone} className="custom-select">
                  <Option value="professional">{t('tone_professional')}</Option>
                  <Option value="friendly">{t('tone_friendly')}</Option>
                  <Option value="persuasive">{t('tone_persuasive')}</Option>
                  <Option value="academic">{t('tone_academic')}</Option>
                  <Option value="enthusiastic">{t('tone_enthusiastic')}</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label={t('audience_label')}>
                <Select value={audience} onChange={setAudience} className="custom-select">
                  <Option value="general">{t('audience_general')}</Option>
                  <Option value="experts">{t('audience_experts')}</Option>
                  <Option value="students">{t('audience_students')}</Option>
                  <Option value="business">{t('audience_business')}</Option>
                  <Option value="technical">{t('audience_technical')}</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label={t('domain_label')}>
                <Select value={domain} onChange={setDomain} className="custom-select">
                  <Option value="general">{t('domain_general')}</Option>
                  <Option value="technical">{t('domain_technical')}</Option>
                  <Option value="business">{t('domain_business')}</Option>
                  <Option value="education">{t('domain_education')}</Option>
                  <Option value="health">{t('domain_health')}</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          {['enhance', 'chat', 'reasoner'].includes(promptType) && (
            <Form.Item label={t('language_options')}>
              <Radio.Group value={languageOption} onChange={(e) => setLanguageOption(e.target.value)}>
                <Radio.Button value="ar">{t('use_lang_arabic')}</Radio.Button>
                <Radio.Button value="en">{t('use_lang_english')}</Radio.Button>
              </Radio.Group>
            </Form.Item>
          )}
          
          <Form.Item label={t('auto_save_option')}>
            <Switch 
              checked={autoSaveEnabled} 
              onChange={setAutoSaveEnabled}
              checkedChildren={t('enabled')}
              unCheckedChildren={t('disabled')}
              disabled={favorites.length >= 10}
            />
            <Text type="secondary" style={{ marginLeft: 8 }}>
              {t('auto_save_description')}
              {favorites.length >= 10 && (
                <Tag color="error" style={{ marginLeft: 8 }}>
                  {t('favorites_limit_reached')}
                </Tag>
              )}
            </Text>
          </Form.Item>
        </div>
      )}
    </div>
  );

  // Generate button section with enhanced UX
  const renderGenerateSection = () => (
    <div className="generate-section">
      <Button
        type="primary"
        size="large"
        onClick={generatePrompt}
        loading={isLoading || isStreaming}
        disabled={!inputText.trim()}
        icon={<ThunderboltOutlined />}
        className="generate-button"
      >
        {isLoading || isStreaming ? t('loading') : t('generate_button')}
      </Button>
      
      {/* Progress indicator when generating */}
      {(isLoading || isStreaming) && (
        <div className="generating-progress">
          <Progress 
            percent={progressPercent} 
            status="active" 
            showInfo={false} 
            strokeColor={{
              '0%': '#4361ee',
              '50%': '#3a86ff',
              '100%': '#38bdf8',
            }}
            strokeWidth={4}
          />
          <Text type="secondary">{t('generating_message')}</Text>
        </div>
      )}
    </div>
  );

  // Quality indicator component with visual improvements
  const renderQualityIndicator = () => {
    let color = 'default';
    let percent = 0;
    let text = t('quality_unknown');
    let description = t('quality_unknown_description');
    let icon = <InfoCircleOutlined />;

    switch (promptQuality) {
      case 'low':
        color = '#ff4d4f';
        percent = 33;
        text = t('quality_low');
        description = t('quality_low_tips');
        icon = <WarningOutlined style={{ color: '#ff4d4f' }} />;
        break;
      case 'medium':
        color = '#faad14';
        percent = 66;
        text = t('quality_medium');
        description = t('quality_medium_tips');
        icon = <InfoCircleOutlined style={{ color: '#faad14' }} />;
        break;
      case 'high':
        color = '#52c41a';
        percent = 100;
        text = t('quality_high');
        description = t('quality_high_tips');
        icon = <CheckCircleOutlined style={{ color: '#52c41a' }} />;
        break;
      default:
        color = '#1890ff';
        percent = 0;
        icon = <QuestionCircleOutlined style={{ color: '#1890ff' }} />;
        break;
    }

    return (
      <div 
        className="quality-indicator-card"
        id="quality-indicator"
      >
        <div className="quality-header">
          <div className="quality-title">
            {icon} {t('quality_indicator_title')}
          </div>
          <Tag color={color} className="quality-tag">{text}</Tag>
        </div>
        
        <Progress 
          percent={percent} 
          status={promptQuality === 'unknown' ? 'normal' : 'active'} 
          strokeColor={color} 
          showInfo={false}
          className="quality-progress"
          strokeWidth={6}
        />
        
        <div className="quality-content">
          <Text type="secondary" className="quality-description">{description}</Text>
          
          {promptQuality !== 'high' && promptQuality !== 'unknown' && (
            <div className="quality-tips">
              <h4>{t('improvement_tips')}</h4>
              <ul>
                {promptQuality === 'low' && (
                  <>
                    <li>{t('tip_low_1')}</li>
                    <li>{t('tip_low_2')}</li>
                    <li>{t('tip_low_3')}</li>
                  </>
                )}
                {promptQuality === 'medium' && (
                  <>
                    <li>{t('tip_medium_1')}</li>
                    <li>{t('tip_medium_2')}</li>
                  </>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Output section with improved UI and UX
  const renderOutputSection = () => (
    <div 
      className={`output-section ${animateOutput ? 'animate' : ''} ${outputExpanded ? 'expanded' : ''}`}
      ref={outputRef}
    >
      <div className="output-header">
        <div className="output-label">
          <span className="output-number">3</span> {t('output_label')}
        </div>
        <div className="output-actions">
          {outputText && !isStreaming && (
            <Space size="small">
              <Button
                icon={<StarOutlined />}
                onClick={() => {
                  if (favorites.length >= 10) {
                    notification.error({
                      message: t('favorites_limit_reached'),
                      description: t('favorites_limit_management'),
                      icon: <WarningOutlined style={{ color: '#ff4d4f' }} />,
                    });
                  } else {
                    setSaveModalVisible(true);
                  }
                }}
                type="primary"
                ghost={!saveSuccess}
                className={saveSuccess ? 'action-success' : ''}
                disabled={favorites.length >= 10}
              >
                {t('save_to_favorites')}
              </Button>
              <Button
                icon={<CopyOutlined />}
                onClick={copyToClipboard}
                type="primary"
                ghost={!copiedRecently}
                className={copiedRecently ? 'action-success' : ''}
              >
                {t('copy_prompt')}
              </Button>
              <Dropdown
                menu={{
                  items: [
                    {
                      key: '1',
                      label: t('share'),
                      icon: <ShareAltOutlined />,
                      onClick: () => {
                        navigator.share({
                          title: t('share_prompt_title'),
                          text: outputText
                        }).catch(err => console.log('Share not supported', err));
                      }
                    },
                    {
                      key: '2',
                      label: t('expand'),
                      icon: <ZoomInOutlined />,
                      onClick: () => setOutputExpanded(!outputExpanded)
                    },
                    {
                      key: '3',
                      label: t('feedback'),
                      icon: <LikeOutlined />,
                      onClick: () => setFeedbackVisible(true)
                    }
                  ]
                }}
                placement="bottomRight"
              >
                <Button icon={<EllipsisOutlined />} />
              </Dropdown>
            </Space>
          )}
        </div>
      </div>
      
      <div className="output-container">
        <div className="output-content">
          {isStreaming ? (
            <div className="streaming-output">
              <div className="streaming-indicator">
                <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
                <Text type="secondary">{t('generating')}</Text>
              </div>
              {/* CRITICAL: During streaming, ONLY show the typing animation text */}
              <div className="typing-output">
                {typingText}
                <span className="typing-cursor"></span>
              </div>
            </div>
          ) : (
            outputText ? (
              <div className="output-text">
                {outputText}
              </div>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={t('no_results_yet')}
                className="empty-output"
              />
            )
          )}
        </div>
        
        {outputText && !isStreaming && (
          <div className="output-footer">
            <div className="output-quality">
              {renderQualityIndicator()}
            </div>
            <div className="output-feedback">
              <Button 
                type="default" 
                icon={<LikeOutlined />}
                onClick={() => setFeedbackVisible(true)}
              >
                {t('provide_feedback')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Get prompt type icon
  const getPromptTypeIcon = (type) => {
    switch (type) {
      case 'enhance':
        return <FormOutlined />;
      case 'chat':
        return <CommentOutlined />;
      case 'reasoner':
        return <EditOutlined />;
      case 'image':
        return <PictureOutlined />;
      case 'checker':
        return <SafetyOutlined />;
      default:
        return <RobotOutlined />;
    }
  };

  // Get prompt type label
  const getPromptTypeLabel = (type) => {
    switch (type) {
      case 'enhance':
        return t('enhance_prompt');
      case 'chat':
        return t('chat_prompt');
      case 'reasoner':
        return t('reasoning_prompt');
      case 'image':
        return t('image_prompt');
      case 'checker':
        return t('checker_prompt');
      default:
        return type;
    }
  };

  // Get filtered history based on search
  const getFilteredHistory = () => {
    if (!searchHistoryText) return history;
    
    const searchLower = searchHistoryText.toLowerCase();
    return history.filter(item => 
      item.inputText.toLowerCase().includes(searchLower) ||
      item.outputText.toLowerCase().includes(searchLower) ||
      getPromptTypeLabel(item.type).toLowerCase().includes(searchLower)
    );
  };

  // Get filtered favorites based on search
  const getFilteredFavorites = () => {
    if (!searchFavoritesText) return favorites;
    
    const searchLower = searchFavoritesText.toLowerCase();
    return favorites.filter(item => 
      item.name.toLowerCase().includes(searchLower) ||
      item.inputText.toLowerCase().includes(searchLower) ||
      item.outputText.toLowerCase().includes(searchLower) ||
      getPromptTypeLabel(item.type).toLowerCase().includes(searchLower)
    );
  };

  // History tab with improved UI and UX
  const renderHistoryTab = () => {
    const filteredHistory = getFilteredHistory();
    
    return (
      <div className="history-tab">
        <div className="history-header">
          <div className="history-search">
            <Input.Search
              placeholder={t('search_history')}
              value={searchHistoryText}
              onChange={(e) => setSearchHistoryText(e.target.value)}
              allowClear
              className="search-input modern"
              prefix={<SearchOutlined />}
            />
            {/* Show the history count with info about limit */}
            {history.length > 0 && (
              <div className="history-count">
                <Tooltip title={t('history_limit')}>
                  <Badge 
                    count={`${history.length}/10`} 
                    style={{ backgroundColor: '#1890ff' }} 
                  />
                </Tooltip>
              </div>
            )}
          </div>
          <div className="history-actions">
            <Space>
              <Button
                icon={<LineChartOutlined />}
                onClick={() => setAnalyticsModalVisible(true)}
                type="default"
              >
                {t('analytics')}
              </Button>
              <Popconfirm
                title={t('clear_history_confirm')}
                onConfirm={clearHistory}
                okText={t('confirm_action')}
                cancelText={t('cancel')}
                disabled={history.length === 0}
              >
                <Button 
                  type="primary"
                  danger
                  disabled={history.length === 0}
                  icon={<DeleteOutlined />}
                >
                  {t('clear_history')}
                </Button>
              </Popconfirm>
            </Space>
          </div>
        </div>
        
        {isLoadingHistory ? (
          <div className="loading-container">
            <Spin size="large" />
          </div>
        ) : history.length === 0 ? (
          <Empty description={t('history_empty')} />
        ) : filteredHistory.length === 0 ? (
          <Empty description={t('no_search_results')} />
        ) : (
          <div className="history-cards">
            {filteredHistory.map((item) => (
              <Card 
                key={item.id} 
                className={`history-item-card ${item.quality || ''}`}
                actions={[
                  <Tooltip title={t('history_load')}>
                    <Button 
                      type="text" 
                      icon={<EyeOutlined />} 
                      onClick={() => loadFromHistory(item)} 
                    />
                  </Tooltip>,
                  <Tooltip title={favorites.length >= 10 ? t('favorites_limit_reached') : t('save_to_favorites')}>
                    <Button 
                      type="text" 
                      icon={<StarOutlined />} 
                      onClick={() => {
                        if (favorites.length >= 10) {
                          notification.error({
                            message: t('favorites_limit_reached'),
                            description: t('favorites_limit_management')
                          });
                          return;
                        }
                        // Set up data for saving
                        setPromptType(item.type);
                        setInputText(item.inputText);
                        setOutputText(item.outputText);
                        setSavePromptName(
                          item.inputText.length > 20 
                            ? `${item.inputText.substring(0, 20)}...` 
                            : item.inputText
                        );
                        setSaveModalVisible(true);
                      }} 
                      disabled={favorites.length >= 10}
                    />
                  </Tooltip>,
                  <Tooltip title={t('delete')}>
                    <Button 
                      type="text" 
                      danger 
                      icon={<DeleteOutlined />} 
                      onClick={() => deleteFromHistory(item.id)} 
                    />
                  </Tooltip>
                ]}
              >
                <div className="history-item-header">
                  <div className="history-item-type">
                    <Tag icon={getPromptTypeIcon(item.type)} color="blue">
                      {getPromptTypeLabel(item.type)}
                    </Tag>
                    {item.quality && (
                      <Tag 
                        color={
                          item.quality === 'high' ? 'success' : 
                          item.quality === 'medium' ? 'warning' : 
                          item.quality === 'low' ? 'error' : 'default'
                        }
                      >
                        {t(`quality_${item.quality}`)}
                      </Tag>
                    )}
                  </div>
                  <div className="history-item-date">
                    <ClockCircleOutlined /> {new Date(item.date).toLocaleString()}
                  </div>
                </div>
                <div className="history-item-content">
                  <div className="history-item-input">
                    <Text strong>{t('input')}:</Text>
                    <Text ellipsis={{ tooltip: item.inputText }}>
                      {item.inputText.length > 100 ? `${item.inputText.substring(0, 100)}...` : item.inputText}
                    </Text>
                  </div>
                  <div className="history-item-output">
                    <Text strong>{t('output')}:</Text>
                    <Text ellipsis={{ tooltip: item.outputText }}>
                      {item.outputText.length > 150 ? `${item.outputText.substring(0, 150)}...` : item.outputText}
                    </Text>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Favorites tab with improved UI and UX
  const renderFavoritesTab = () => {
    const filteredFavorites = getFilteredFavorites();
    
    return (
      <div className="favorites-tab">
        <div className="favorites-header">
          <div className="favorites-search">
            <Input.Search
              placeholder={t('search_favorites')}
              value={searchFavoritesText}
              onChange={(e) => setSearchFavoritesText(e.target.value)}
              allowClear
              className="search-input modern"
              prefix={<SearchOutlined />}
            />
            {/* Show the favorites count with warning if approaching limit */}
            {favorites.length > 0 && (
              <div className="favorites-count">
                <Badge 
                  count={`${favorites.length}/10`} 
                  style={{ 
                    backgroundColor: favorites.length >= 10 ? '#ff4d4f' : 
                                   favorites.length >= 8 ? '#faad14' : '#1890ff' 
                  }} 
                />
              </div>
            )}
          </div>
          <div className="favorites-actions">
            <Space>
              <Dropdown
                menu={{
                  items: [
                    {
                      key: '1',
                      label: t('export_json'),
                      icon: <DownloadOutlined />,
                      onClick: () => {
                        // Create JSON file for download
                        const dataStr = JSON.stringify(favorites, null, 2);
                        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                        
                        const linkElement = document.createElement('a');
                        linkElement.setAttribute('href', dataUri);
                        linkElement.setAttribute('download', 'ai_prompts_favorites.json');
                        linkElement.click();
                      }
                    },
                    {
                      key: '2',
                      label: t('export_text'),
                      icon: <FileTextOutlined />,
                      onClick: () => {
                        // Create text file with prompts
                        const textContent = favorites.map(item => 
                          `[${getPromptTypeLabel(item.type)}] - ${item.name}\n\n${item.outputText}\n\n-------------------\n\n`
                        ).join('');
                        
                        const dataUri = 'data:text/plain;charset=utf-8,' + encodeURIComponent(textContent);
                        
                        const linkElement = document.createElement('a');
                        linkElement.setAttribute('href', dataUri);
                        linkElement.setAttribute('download', 'ai_prompts_favorites.txt');
                        linkElement.click();
                      }
                    }
                  ]
                }}
                placement="bottomRight"
              >
                <Button icon={<DownloadOutlined />}>{t('export')}</Button>
              </Dropdown>
            </Space>
          </div>
        </div>
        
        {isLoadingFavorites ? (
          <div className="loading-container">
            <Spin size="large" />
          </div>
        ) : favorites.length === 0 ? (
          <Empty description={t('favorites_empty')} />
        ) : filteredFavorites.length === 0 ? (
          <Empty description={t('no_search_results')} />
        ) : (
          <div className="favorites-cards">
            {filteredFavorites.map((item) => (
              <Card 
                key={item.id} 
                className={`favorite-item-card ${item.quality || ''}`}
                title={
                  <div className="favorite-item-title">
                    <StarFilled style={{ color: '#faad14' }} /> {item.name}
                  </div>
                }
                actions={[
                  <Tooltip title={t('favorites_load')}>
                    <Button 
                      type="text" 
                      icon={<EyeOutlined />} 
                      onClick={() => loadFromFavorites(item)} 
                    />
                  </Tooltip>,
                  <Tooltip title={t('copy_prompt')}>
                    <Button 
                      type="text" 
                      icon={<CopyOutlined />} 
                      onClick={() => {
                        navigator.clipboard.writeText(item.outputText);
                        message.success(t('copied_to_clipboard'));
                      }} 
                    />
                  </Tooltip>,
                  <Tooltip title={t('delete')}>
                    <Button 
                      type="text" 
                      danger 
                      icon={<DeleteOutlined />} 
                      onClick={() => removeFromFavorites(item.id)} 
                    />
                  </Tooltip>
                ]}
              >
                <div className="favorite-item-header">
                  <div className="favorite-item-type">
                    <Tag icon={getPromptTypeIcon(item.type)} color="gold">
                      {getPromptTypeLabel(item.type)}
                    </Tag>
                    {item.quality && (
                      <Tag 
                        color={
                          item.quality === 'high' ? 'success' : 
                          item.quality === 'medium' ? 'warning' : 
                          item.quality === 'low' ? 'error' : 'default'
                        }
                      >
                        {t(`quality_${item.quality}`)}
                      </Tag>
                    )}
                  </div>
                  <div className="favorite-item-date">
                    <ClockCircleOutlined /> {new Date(item.date).toLocaleString()}
                  </div>
                </div>
                <div className="favorite-item-content">
                  <div className="favorite-item-output">
                    <Text ellipsis={{ tooltip: item.outputText, rows: 4 }}>
                      {item.outputText}
                    </Text>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Tips tab with improved UI and UX
  const renderTipsTab = () => (
    <div className="tips-tab">
      <Row gutter={[24, 24]}>
        <Col xs={24}>
          <Card className="tips-card" bordered={false}>
            <Title level={4} className="tips-title">
              <BulbOutlined className="tips-icon" /> {t('tips_title')}
            </Title>
            <Text className="tips-intro">{t('tips_intro')}</Text>
          </Card>
        </Col>
        
        <Col xs={24} md={12} lg={8}>
          <Card className="tip-card" bordered={false}>
            <div className="tip-number">01</div>
            <Title level={5}>{t('tip_1_title')}</Title>
            <Paragraph>{t('tip_1_content')}</Paragraph>
            <div className="tip-example">
              <Text type="secondary">{t('example')}:</Text> {t('tip_1_example')}
            </div>
          </Card>
        </Col>
        
        <Col xs={24} md={12} lg={8}>
          <Card className="tip-card" bordered={false}>
            <div className="tip-number">02</div>
            <Title level={5}>{t('tip_2_title')}</Title>
            <Paragraph>{t('tip_2_content')}</Paragraph>
            <div className="tip-example">
              <Text type="secondary">{t('example')}:</Text> {t('tip_2_example')}
            </div>
          </Card>
        </Col>
        
        <Col xs={24} md={12} lg={8}>
          <Card className="tip-card" bordered={false}>
            <div className="tip-number">03</div>
            <Title level={5}>{t('tip_3_title')}</Title>
            <Paragraph>{t('tip_3_content')}</Paragraph>
            <div className="tip-example">
              <Text type="secondary">{t('example')}:</Text> {t('tip_3_example')}
            </div>
          </Card>
        </Col>
        
        <Col xs={24} md={12} lg={8}>
          <Card className="tip-card" bordered={false}>
            <div className="tip-number">04</div>
            <Title level={5}>{t('tip_4_title')}</Title>
            <Paragraph>{t('tip_4_content')}</Paragraph>
            <div className="tip-example">
              <Text type="secondary">{t('example')}:</Text> {t('tip_4_example')}
            </div>
          </Card>
        </Col>
        
        <Col xs={24} md={12} lg={8}>
          <Card className="tip-card" bordered={false}>
            <div className="tip-number">05</div>
            <Title level={5}>{t('tip_5_title')}</Title>
            <Paragraph>{t('tip_5_content')}</Paragraph>
            <div className="tip-example">
              <Text type="secondary">{t('example')}:</Text> {t('tip_5_example')}
            </div>
          </Card>
        </Col>
        
        <Col xs={24} md={12} lg={8}>
          <Card className="tip-card" bordered={false}>
            <div className="tip-number">06</div>
            <Title level={5}>{t('tip_6_title')}</Title>
            <Paragraph>{t('tip_6_content')}</Paragraph>
            <div className="tip-example">
              <Text type="secondary">{t('example')}:</Text> {t('tip_6_example')}
            </div>
          </Card>
        </Col>
      </Row>
      
      <Divider />
      
      <div className="master-prompt-section">
        <Title level={4} className="master-prompt-title">
          <ThunderboltOutlined /> {t('master_prompt_title')}
        </Title>
        <Card className="master-prompt-card">
          <Paragraph className="master-prompt-text">
            {t('master_prompt_content')}
          </Paragraph>
          <div className="master-prompt-actions">
            <Button 
              type="primary" 
              onClick={() => {
                setInputText(t('master_prompt_content'));
                setActiveTab('prompt');
                
                // Focus on textarea
                if (textareaRef.current) {
                  setTimeout(() => textareaRef.current.focus(), 100);
                }
              }}
              icon={<ThunderboltOutlined />}
            >
              {t('try_master_prompt')}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );

  // Standard mode
  const renderStandardMode = () => (
    <div className="standard-mode">
      <div className="prompt-form">
        {renderPromptTypeSelector()}
        {renderInputSection()}
        {renderFormatOptions()}
        {renderGenerateSection()}
        {renderOutputSection()}
      </div>
    </div>
  );

  // MAIN RENDER ==========================================
  return (
    <MembershipRequired 
      featureKey={RESTRICTED_FEATURES.AI_PROMPT_GENERATOR} 
      fallback={
        <ContentContainer>
          <Alert
            message={t('premium_feature')}
            description={t('premium_feature_desc')}
            type="info"
            showIcon
            action={
              <Button type="primary" href="/membership">
                {t('view_membership_plans')}
              </Button>
            }
          />
        </ContentContainer>
      }
    >
      <ContentContainer>
        <div className="ai-prompt-generator modern">
          
          <Card className="main-card" bordered={false}>
            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab}
              className="main-tabs"
              type="card"
            >
              <TabPane 
                tab={<span><RobotOutlined /> {t('prompt_tab')}</span>} 
                key="prompt"
              >
                <div className="tab-content">
                  {renderStandardMode()}
                </div>
              </TabPane>
              
              <TabPane 
                tab={
                  <span>
                    <HistoryOutlined /> 
                    {t('history_tab')} 
                    {history.length > 0 && (
                      <Badge count={`${history.length}/10`} style={{ backgroundColor: '#1890ff', marginLeft: 8 }} />
                    )}
                  </span>
                } 
                key="history"
              >
                <div className="tab-content">
                  {renderHistoryTab()}
                </div>
              </TabPane>
              
              <TabPane 
                tab={
                  <span>
                    <StarOutlined /> 
                    {t('favorites_tab')} 
                    {favorites.length >= 10 && (
                      <Badge count="10/10" style={{ backgroundColor: '#ff4d4f', marginLeft: 8 }} />
                    )}
                  </span>
                } 
                key="favorites"
              >
                <div className="tab-content">
                  {renderFavoritesTab()}
                </div>
              </TabPane>
              
              <TabPane 
                tab={<span><BulbOutlined /> {t('tips_tab')}</span>} 
                key="tips"
              >
                <div className="tab-content">
                  {renderTipsTab()}
                </div>
              </TabPane>
            </Tabs>
          </Card>
        </div>

        {/* Save to favorites modal */}
        <Modal
          title={<><StarOutlined /> {t('save_favorite_modal_title')}</>}
          open={saveModalVisible}
          onOk={() => saveToFavorites(savePromptName)}
          onCancel={() => setSaveModalVisible(false)}
          okText={t('save')}
          cancelText={t('cancel')}
          className="custom-modal"
        >
          <Alert 
            type="info" 
            message={t('favorites_limit_reached', { current: favorites.length, max: 10 })}
            description={t('favorites_limit_management')}
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Form layout="vertical">
            <Form.Item 
              label={t('favorites_name_label')} 
              required
              tooltip={t('favorites_name_tooltip')}
            >
              <Input
                placeholder={t('favorites_name_placeholder')}
                value={savePromptName}
                onChange={(e) => setSavePromptName(e.target.value)}
                prefix={<EditOutlined />}
                maxLength={50}
                showCount
              />
            </Form.Item>
            <div className="save-preview">
              <Text type="secondary">{t('output_preview')}:</Text>
              <div className="save-preview-content">
                {outputText.length > 200 ? `${outputText.substring(0, 200)}...` : outputText}
              </div>
            </div>
          </Form>
        </Modal>
        
        {/* Template selection modal */}
        <Modal
          title={<span><UnorderedListOutlined /> {t('template_selection')}</span>}
          open={templateModalVisible}
          footer={null}
          onCancel={() => setTemplateModalVisible(false)}
          className="custom-modal template-modal"
          width={700}
        >
          <div className="template-grid">
            <Row gutter={[16, 16]}>
              {promptTemplates.map(template => (
                <Col xs={24} sm={12} md={8} key={template.id}>
                  <Card
                    className="template-card"
                    hoverable
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <div className="template-icon">{template.icon}</div>
                    <div className="template-title">{template.title}</div>
                    <div className="template-description">{template.description}</div>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </Modal>
        
        {/* New template fields modal */}
        <Modal
          title={<span><FormOutlined /> {t('template_fields_title') || 'Complete Template Fields'}</span>}
          open={templateFieldsModalVisible}
          onCancel={() => setTemplateFieldsModalVisible(false)}
          footer={[
            <Button key="cancel" onClick={() => setTemplateFieldsModalVisible(false)}>
              {t('cancel')}
            </Button>,
            <Button 
              key="submit" 
              type="primary" 
              onClick={() => {
                templateForm.validateFields()
                  .then(values => {
                    applyTemplateWithFields(values);
                  })
                  .catch(info => {
                    console.log('Validate Failed:', info);
                  });
              }}
            >
              {t('apply_template') || 'Apply Template'}
            </Button>
          ]}
          className="custom-modal template-fields-modal"
          width={700}
          style={{ direction: direction }}
        >
          <div className="template-fields-container">
            <Form 
              form={templateForm}
              layout="vertical"
              style={{ direction: direction }}
              onValuesChange={(_, allValues) => updateTemplatePreview(allValues)}
            >
              {currentTemplateFields.map((field, index) => (
                <Form.Item
                  key={field.key}
                  name={field.key}
                  label={field.placeholder}
                  tooltip={t('template_field_tooltip', { name: field.placeholder }) || `Enter value for ${field.placeholder}`}
                  rules={[
                    { 
                      required: true, 
                      message: t('template_field_required', { name: field.placeholder }) || `Please enter ${field.placeholder}` 
                    }
                  ]}
                >
                  <Input 
                    placeholder={field.placeholder}
                    prefix={<EditOutlined />}
                  />
                </Form.Item>
              ))}
            </Form>
            
            <Divider>{t('template_preview') || 'Preview'}</Divider>
            
            <div className="template-preview-container">
              <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
                {templatePreview}
              </Paragraph>
            </div>
          </div>
        </Modal>
        
        {/* Feedback modal */}
        <Modal
          title={<>{t('feedback_title')}</>}
          open={feedbackVisible}
          onOk={submitFeedback}
          onCancel={() => setFeedbackVisible(false)}
          okText={t('submit')}
          cancelText={t('cancel')}
          className="custom-modal"
        >
          <div className="feedback-form">
            <div className="feedback-rating">
              <div className="rating-question">{t('rating_question')}</div>
              <Rate 
                value={feedbackRating} 
                onChange={setFeedbackRating} 
              />
            </div>
            <div className="feedback-comments">
              <Form.Item label={t('feedback_comments')}>
                <TextArea
                  placeholder={t('feedback_placeholder')}
                  value={feedbackComments}
                  onChange={(e) => setFeedbackComments(e.target.value)}
                  rows={4}
                />
              </Form.Item>
            </div>
          </div>
        </Modal>
        
        {/* Analytics modal with enhanced visualizations */}
        <Modal
          title={<><LineChartOutlined /> {t('analytics_title')}</>}
          open={analyticsModalVisible}
          footer={null}
          onCancel={() => setAnalyticsModalVisible(false)}
          className="custom-modal analytics-modal"
          width={720}
        >
          <div className="analytics-content">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8}>
                <Card className="stat-card">
                  <Statistic 
                    title={t('prompts_generated')}
                    value={analyticsData.promptsGenerated}
                    prefix={<ThunderboltOutlined />}
                  />
                </Card>
              </Col>
              
              <Col xs={24} sm={12} md={8}>
                <Card className="stat-card">
                  <Statistic 
                    title={t('favorites_saved')}
                    value={analyticsData.favoritesSaved}
                    prefix={<StarOutlined />}
                  />
                </Card>
              </Col>
              
              <Col xs={24} sm={12} md={8}>
                <Card className="stat-card">
                  <Statistic 
                    title={t('high_quality_rate')}
                    value={analyticsData.highQualityRate}
                    suffix="%"
                    prefix={<CheckCircleOutlined />}
                  />
                </Card>
              </Col>
              
              <Col xs={24} sm={12} md={12}>
                <Card title={t('prompt_type_distribution')} className="chart-card">
                  <div className="pie-chart-placeholder">
                    <div className="chart-data">
                      <div className="chart-item">
                        <Badge color="#4361ee" text={t('enhance_prompt')} />
                        <div className="chart-value">
                          {analyticsData.mostUsedType === 'enhance' ? t('most_used') : ''}
                        </div>
                      </div>
                      <div className="chart-item">
                        <Badge color="#38bdf8" text={t('chat_prompt')} />
                        <div className="chart-value">
                          {analyticsData.mostUsedType === 'chat' ? t('most_used') : ''}
                        </div>
                      </div>
                      <div className="chart-item">
                        <Badge color="#10b981" text={t('reasoning_prompt')} />
                        <div className="chart-value">
                          {analyticsData.mostUsedType === 'reasoner' ? t('most_used') : ''}
                        </div>
                      </div>
                      <div className="chart-item">
                        <Badge color="#8b5cf6" text={t('image_prompt')} />
                        <div className="chart-value">
                          {analyticsData.mostUsedType === 'image' ? t('most_used') : ''}
                        </div>
                      </div>
                      <div className="chart-item">
                        <Badge color="#ec4899" text={t('checker_prompt')} />
                        <div className="chart-value">
                          {analyticsData.mostUsedType === 'checker' ? t('most_used') : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </Col>
              
              <Col xs={24} sm={12} md={12}>
                <Card title={t('prompt_metrics')} className="chart-card">
                  <div className="metrics-content">
                    <div className="metric-item">
                      <div className="metric-label">{t('average_length')}</div>
                      <div className="metric-value">{analyticsData.averageLength} {t('characters')}</div>
                      <Progress 
                        percent={Math.min(100, analyticsData.averageLength / 10)}
                        showInfo={false}
                        strokeColor="#4361ee"
                      />
                    </div>
                    
                    <div className="metric-item">
                      <div className="metric-label">{t('quality_trend')}</div>
                      <div className="metric-value">
                        {analyticsData.qualityTrend === 'improving' ? (
                          <span className="trend-up">{t('improving')} <ArrowUpOutlined /></span>
                        ) : analyticsData.qualityTrend === 'declining' ? (
                          <span className="trend-down">{t('declining')} <ArrowDownOutlined /></span>
                        ) : (
                          <span className="trend-stable">{t('stable')} <MinusOutlined /></span>
                        )}
                      </div>
                      <Progress 
                        percent={
                          analyticsData.qualityTrend === 'improving' ? 90 :
                          analyticsData.qualityTrend === 'declining' ? 40 : 
                          70
                        }
                        showInfo={false}
                        strokeColor={
                          analyticsData.qualityTrend === 'improving' ? '#10b981' :
                          analyticsData.qualityTrend === 'declining' ? '#ef4444' : 
                          '#f59e0b'
                        }
                      />
                    </div>
                  </div>
                </Card>
              </Col>
              
              <Col xs={24}>
                <Card title={t('top_keywords')} className="chart-card">
                  <div className="keywords-chart">
                    <div className="keywords-content">
                      {analyticsData.topKeywords?.map((keyword, index) => (
                        <Tag key={index} color={
                          index === 0 ? '#4361ee' :
                          index === 1 ? '#38bdf8' :
                          index === 2 ? '#10b981' :
                          index === 3 ? '#f59e0b' :
                          '#8b5cf6'
                        }>
                          {keyword}
                        </Tag>
                      ))}
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>
          </div>
        </Modal>
        
        {/* Help & Guide modal */}
        <Modal
          title={<><QuestionCircleOutlined /> {t('help_guide_title')}</>}
          open={helpModalVisible}
          footer={null}
          onCancel={() => setHelpModalVisible(false)}
          className="custom-modal help-modal"
          width={800}
        >
          <div className="help-content">
            <div className="help-sidebar">
              <Menu
                mode="inline"
                selectedKeys={[activeGuideSection]}
                onClick={e => setActiveGuideSection(e.key)}
              >
                <Menu.Item key="basics" icon={<InfoCircleOutlined />}>
                  {t('help_basics')}
                </Menu.Item>
                <Menu.Item key="enhance" icon={<FormOutlined />}>
                  {t('enhance_prompt')}
                </Menu.Item>
                <Menu.Item key="chat" icon={<CommentOutlined />}>
                  {t('chat_prompt')}
                </Menu.Item>
                <Menu.Item key="reasoner" icon={<EditOutlined />}>
                  {t('reasoning_prompt')}
                </Menu.Item>
                <Menu.Item key="image" icon={<PictureOutlined />}>
                  {t('image_prompt')}
                </Menu.Item>
                <Menu.Item key="checker" icon={<SafetyOutlined />}>
                  {t('checker_prompt')}
                </Menu.Item>
                <Menu.Item key="advanced" icon={<SettingOutlined />}>
                  {t('advanced_features')}
                </Menu.Item>
              </Menu>
            </div>
            
            <div className="help-detail">
              {activeGuideSection === 'basics' && (
                <div className="help-section">
                  <h2>{t('help_basics')}</h2>
                  <p>{t('help_basics_desc')}</p>
                  
                  <h3>{t('help_getting_started')}</h3>
                  <ol>
                    <li>{t('help_getting_started_1')}</li>
                    <li>{t('help_getting_started_2')}</li>
                    <li>{t('help_getting_started_3')}</li>
                    <li>{t('help_getting_started_4')}</li>
                  </ol>
                  
                  <h3>{t('help_best_practices')}</h3>
                  <ul>
                    <li>{t('help_best_practice_1')}</li>
                    <li>{t('help_best_practice_2')}</li>
                    <li>{t('help_best_practice_3')}</li>
                  </ul>
                </div>
              )}
              
              {activeGuideSection === 'enhance' && (
                <div className="help-section">
                  <h2>{t('enhance_prompt')}</h2>
                  <p>{t('help_enhance_desc')}</p>
                  
                  <h3>{t('help_when_to_use')}</h3>
                  <ul>
                    <li>{t('help_enhance_use_1')}</li>
                    <li>{t('help_enhance_use_2')}</li>
                    <li>{t('help_enhance_use_3')}</li>
                  </ul>
                  
                  <h3>{t('help_examples')}</h3>
                  <div className="help-example">
                    <strong>{t('help_basic_example')}:</strong>
                    <blockquote>{t('help_enhance_example_1')}</blockquote>
                  </div>
                  <div className="help-example">
                    <strong>{t('help_advanced_example')}:</strong>
                    <blockquote>{t('help_enhance_example_2')}</blockquote>
                  </div>
                </div>
              )}
              
              {activeGuideSection === 'chat' && (
                <div className="help-section">
                  <h2>{t('chat_prompt')}</h2>
                  <p>{t('help_chat_desc')}</p>
                  
                  <h3>{t('help_when_to_use')}</h3>
                  <ul>
                    <li>{t('help_chat_use_1')}</li>
                    <li>{t('help_chat_use_2')}</li>
                    <li>{t('help_chat_use_3')}</li>
                  </ul>
                  
                  <h3>{t('help_examples')}</h3>
                  <div className="help-example">
                    <strong>{t('help_basic_example')}:</strong>
                    <blockquote>{t('help_chat_example_1')}</blockquote>
                  </div>
                  <div className="help-example">
                    <strong>{t('help_advanced_example')}:</strong>
                    <blockquote>{t('help_chat_example_2')}</blockquote>
                  </div>
                </div>
              )}
              
              {activeGuideSection === 'reasoner' && (
                <div className="help-section">
                  <h2>{t('reasoning_prompt')}</h2>
                  <p>{t('help_reasoner_desc')}</p>
                  
                  <h3>{t('help_when_to_use')}</h3>
                  <ul>
                    <li>{t('help_reasoner_use_1')}</li>
                    <li>{t('help_reasoner_use_2')}</li>
                    <li>{t('help_reasoner_use_3')}</li>
                  </ul>
                  
                  <h3>{t('help_examples')}</h3>
                  <div className="help-example">
                    <strong>{t('help_basic_example')}:</strong>
                    <blockquote>{t('help_reasoner_example_1')}</blockquote>
                  </div>
                  <div className="help-example">
                    <strong>{t('help_advanced_example')}:</strong>
                    <blockquote>{t('help_reasoner_example_2')}</blockquote>
                  </div>
                </div>
              )}
              
              {activeGuideSection === 'image' && (
                <div className="help-section">
                  <h2>{t('image_prompt')}</h2>
                  <p>{t('help_image_desc')}</p>
                  
                  <h3>{t('help_when_to_use')}</h3>
                  <ul>
                    <li>{t('help_image_use_1')}</li>
                    <li>{t('help_image_use_2')}</li>
                    <li>{t('help_image_use_3')}</li>
                  </ul>
                  
                  <h3>{t('help_examples')}</h3>
                  <div className="help-example">
                    <strong>{t('help_basic_example')}:</strong>
                    <blockquote>{t('help_image_example_1')}</blockquote>
                  </div>
                  <div className="help-example">
                    <strong>{t('help_advanced_example')}:</strong>
                    <blockquote>{t('help_image_example_2')}</blockquote>
                  </div>
                </div>
              )}
              
              {activeGuideSection === 'checker' && (
                <div className="help-section">
                  <h2>{t('checker_prompt')}</h2>
                  <p>{t('help_checker_desc')}</p>
                  
                  <h3>{t('help_when_to_use')}</h3>
                  <ul>
                    <li>{t('help_checker_use_1')}</li>
                    <li>{t('help_checker_use_2')}</li>
                    <li>{t('help_checker_use_3')}</li>
                  </ul>
                  
                  <h3>{t('help_examples')}</h3>
                  <div className="help-example">
                    <strong>{t('help_basic_example')}:</strong>
                    <blockquote>{t('help_checker_example_1')}</blockquote>
                  </div>
                  <div className="help-example">
                    <strong>{t('help_advanced_example')}:</strong>
                    <blockquote>{t('help_checker_example_2')}</blockquote>
                  </div>
                </div>
              )}
              
              {activeGuideSection === 'advanced' && (
                <div className="help-section">
                  <h2>{t('advanced_features')}</h2>
                  <p>{t('help_advanced_desc')}</p>
                  
                  <h3>{t('help_formatting_options')}</h3>
                  <ul>
                    <li><strong>{t('format_length')}:</strong> {t('help_format_length')}</li>
                    <li><strong>{t('format_style')}:</strong> {t('help_format_style')}</li>
                    <li><strong>{t('format_structure')}:</strong> {t('help_format_structure')}</li>
                  </ul>
                  
                  <h3>{t('help_advanced_options')}</h3>
                  <ul>
                    <li><strong>{t('tone_label')}:</strong> {t('help_tone')}</li>
                    <li><strong>{t('audience_label')}:</strong> {t('help_audience')}</li>
                    <li><strong>{t('domain_label')}:</strong> {t('help_domain')}</li>
                  </ul>
                  
                  <h3>{t('help_tips')}</h3>
                  <ul>
                    <li>{t('help_advanced_tip_1')}</li>
                    <li>{t('help_advanced_tip_2')}</li>
                    <li>{t('help_advanced_tip_3')}</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Modal>
      </ContentContainer>
    </MembershipRequired>
  );
};

export default AIPromptGenerator;