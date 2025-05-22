const axios = require('axios');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });

// Import models
const Translation = require('../models/Translation');
const Language = require('../models/Language');

// Import translation files paths
const translationPaths = {
  dashboard: path.join(__dirname, '../../frontend/src/translations/dashboard.js'),
  extractors: path.join(__dirname, '../../frontend/src/translations/extractors.js'),
  profiles: path.join(__dirname, '../../frontend/src/translations/profiles.js'),
  auth: path.join(__dirname, '../../frontend/src/translations/auth.js'),
  pageManagement: path.join(__dirname, '../../frontend/src/translations/pageManagement.js'),
  postManagement: path.join(__dirname, '../../frontend/src/translations/postManagement.js'),
  autoPostGroup: path.join(__dirname, '../../frontend/src/translations/autoPostGroup.js'),
  achievements: path.join(__dirname, '../../frontend/src/translations/achievements.js'),
  accessToken: path.join(__dirname, '../../frontend/src/translations/accessToken.js'),
  admin: path.join(__dirname, '../../frontend/src/translations/admin.js'),
  help: path.join(__dirname, '../../frontend/src/translations/help.js'),
  serverMessages: path.join(__dirname, '../../frontend/src/translations/serverMessages.js'),
  pageMessages: path.join(__dirname, '../../frontend/src/translations/pageMessages.js'),
  common: path.join(__dirname, '../../frontend/src/translations/common.js'),
  aiPrompts: path.join(__dirname, '../../frontend/src/translations/aiPrompts.js'),
  commentResponses: path.join(__dirname, '../../frontend/src/translations/commentResponses.js'),
};

// Function to extract translations from a file
const extractTranslations = async (filePath, variableName) => {
  try {
    // Read the file content
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Special handling for commentResponsesTranslations
    if (filePath.includes('commentResponses.js')) {
      // Extract the entire commentResponsesTranslations object
      const commentRegex = /const\s+commentResponsesTranslations\s*=\s*({[\s\S]*?});/;
      const commentMatch = fileContent.match(commentRegex);
      
      if (!commentMatch || !commentMatch[1]) {
        throw new Error(`Could not extract translations from file: ${filePath}`);
      }
      
      // Clean up the string
      let jsObjectString = commentMatch[1];
      jsObjectString = jsObjectString.replace(/export\s+default\s+commentResponsesTranslations;?/g, '');
      
      // Function to safely evaluate the JS object string
      const evalInContext = function(str) {
        return eval(`(${str})`);
      };
      
      // Convert string to object
      const translations = evalInContext(jsObjectString);
      return translations;
    }
    
    // Regular pattern for other files
    const regex = new RegExp(`const\\s+${variableName}\\s*=\\s*({[\\s\\S]*?});`);
    const translationsMatch = fileContent.match(regex);
    
    if (!translationsMatch || !translationsMatch[1]) {
      throw new Error(`Could not extract translations from file: ${filePath}`);
    }
    
    // Replace module.exports and export default to make the string evaluable
    let jsObjectString = translationsMatch[1];
    jsObjectString = jsObjectString.replace(new RegExp(`export\\s+default\\s+${variableName};?`, 'g'), '');
    
    // Function to safely evaluate the JS object string
    const evalInContext = function(str) {
      return eval(`(${str})`);
    };
    
    // Convert string to object
    const translations = evalInContext(jsObjectString);
    
    return translations;
  } catch (error) {
    console.error(`Error extracting translations from ${filePath}:`, error);
    throw error;
  }
};

// Function to extract all translation files
const extractAllTranslations = async () => {
  try {
    const translationSets = {};
    
    // Extract translations from each file
    translationSets.dashboard = await extractTranslations(translationPaths.dashboard, 'dashboardTranslations');
    translationSets.extractors = await extractTranslations(translationPaths.extractors, 'extractorTranslations');
    translationSets.profiles = await extractTranslations(translationPaths.profiles, 'profileTranslations');
    translationSets.auth = await extractTranslations(translationPaths.auth, 'authTranslations');
    translationSets.pageManagement = await extractTranslations(translationPaths.pageManagement, 'pageManagementTranslations');
    translationSets.postManagement = await extractTranslations(translationPaths.postManagement, 'postManagementTranslations');
    translationSets.autoPostGroup = await extractTranslations(translationPaths.autoPostGroup, 'autoPostGroupTranslations');
    translationSets.achievements = await extractTranslations(translationPaths.achievements, 'achievementsTranslations');
    translationSets.accessToken = await extractTranslations(translationPaths.accessToken, 'accessTokenTranslations');
    translationSets.admin = await extractTranslations(translationPaths.admin, 'adminTranslations');
    translationSets.help = await extractTranslations(translationPaths.help, 'helpTranslations');
    translationSets.serverMessages = await extractTranslations(translationPaths.serverMessages, 'serverMessagesTranslations');
    translationSets.pageMessages = await extractTranslations(translationPaths.pageMessages, 'pageMessages');
    translationSets.common = await extractTranslations(translationPaths.common, 'commonTranslations');
    translationSets.aiPrompts = await extractTranslations(translationPaths.aiPrompts, 'aiPromptsTranslations');
    translationSets.commentResponses = await extractTranslations(translationPaths.commentResponses, 'default');
    
    return translationSets;
  } catch (error) {
    console.error('Error extracting all translations:', error);
    throw error;
  }
};

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Function to determine category based on key and source file
const determineCategory = (key, sourceFile) => {
  // Base category from the source file
  let baseCategory;
  switch (sourceFile) {
    case 'dashboard':
      baseCategory = 'dashboard';
      break;
    case 'extractors':
      baseCategory = 'extractors';
      break;
    case 'profiles':
      baseCategory = 'profiles';
      break;
    case 'auth':
      baseCategory = 'auth';
      break;
    case 'pageManagement':
      baseCategory = 'pages';
      break;
    case 'postManagement':
      baseCategory = 'posts';
      break;
    case 'pageMessages':
      baseCategory = 'page_messages';
      break;
    case 'autoPostGroup':
      baseCategory = 'auto_post';
      break;
    case 'achievements':
      baseCategory = 'achievements';
      break;
    case 'accessToken':
      baseCategory = 'access_token';
      break;
    case 'admin':
      baseCategory = 'admin';
      break;
    case 'help':
      baseCategory = 'help';
      break;
    case 'serverMessages':
      baseCategory = 'server';
      break;
    case 'commentResponses':
      baseCategory = 'comment_responses';
      break;
    default:
      baseCategory = 'general';
  }
  
  // Further refine category based on key prefixes/content
  if (key.startsWith('achievement') || key.includes('Achievement') || key.includes('achievement')) {
    return 'achievements';
  } else if (key.startsWith('activity') || key.includes('Activity') || key.includes('activity')) {
    return 'activities';
  } else if (key.startsWith('level') || key.includes('Level') || key.includes('level')) {
    return 'levels';
  } else if (key.startsWith('time') || key.includes('Time') || key.includes('time') || key.includes('date') || key.includes('Date')) {
    return 'time';
  } else if (key.startsWith('translation') || key.includes('Translation')) {
    return 'translations';
  } else if (key.includes('Language') || key.includes('language')) {
    return 'languages';
  } else if (key.includes('notification') || key.includes('Notification')) {
    return 'notifications';
  } else if (key.includes('menu') || key.includes('Menu') || key.includes('sidebar') || key.includes('Sidebar') || key.includes('tab_') || key.includes('navigation')) {
    return 'navigation';
  } else if (key.includes('chart') || key.includes('Chart') || key.includes('statistic') || key.includes('Statistic') || key.includes('stats')) {
    return 'charts';
  } else if (key.includes('error') || key.includes('Error') || key.includes('failed')) {
    return 'errors';
  } else if (key.includes('button') || key.includes('Button') || key.includes('action') || key.includes('Action') || key.includes('confirm')) {
    return 'actions';
  } else if (key.includes('login') || key.includes('register') || key.includes('password') || key.includes('auth')) {
    return 'authentication';
  } else if (key.includes('profile') || key.includes('user') || key.includes('account')) {
    return 'profile';
  } else if (key.includes('extract') || key.includes('comment') || key.includes('group') || key.includes('reaction')) {
    return 'extractors';
  } else if (key.includes('page_') || key.includes('management')) {
    return 'pages';
  } else if (key.includes('template') || key.includes('variable') || key.includes('preview')) {
    return 'templates';
  } else if (key.includes('schedule') || key.includes('batch') || key.includes('post_')) {
    return 'posting';
  } else if (key.includes('points') || key.includes('refund') || key.includes('deduct')) {
    return 'points';
  } else if (key.includes('import') || key.includes('export')) {
    return 'data_transfer';
  } else if (key.includes('faq') || key.includes('question') || key.includes('answer')) {
    return 'faq';
  } else if (key.includes('token') || key.includes('access_token')) {
    return 'access_token';
  } else if (key.includes('admin') || key.includes('manage') || key.includes('bulk_action')) {
    return 'admin';
  } else if (key.includes('support') || key.includes('message') || key.includes('reply') || key.includes('ticket')) {
    return 'support';
  } else if (key.includes('help') || key.includes('guide') || key.includes('tutorial')) {
    return 'help';
  } else if (key.includes('feature')) {
    return 'features';
  }
  
  // Default to the base category
  return baseCategory;
};

// Function to migrate translations to database
const migrateTranslations = async () => {
  try {
    // Connect to database
    const connection = await connectDB();
    
    // Extract all translations
    console.log('Extracting all translation files...');
    const translationSets = await extractAllTranslations();
    
    // Get all languages
    const languages = await Language.find({});
    
    if (languages.length === 0) {
      console.log('No languages found in database. Create languages first.');
      mongoose.disconnect();
      return;
    }
    
    let totalTranslations = 0;
    let totalUpserted = 0;
    let totalModified = 0;
    
    // Process each language and translation set
    for (const sourceFile of Object.keys(translationSets)) {
      const translations = translationSets[sourceFile];
      
      for (const langCode of Object.keys(translations)) {
        // Check if language exists in DB
        const language = languages.find(lang => lang.code === langCode);
        
        if (!language) {
          console.log(`Language ${langCode} not found in database. Skipping.`);
          continue;
        }
        
        console.log(`Processing ${sourceFile} translations for ${langCode}...`);
        const translationSet = translations[langCode];
        
        // Prepare bulk operations
        const operations = [];
        
        // Function to flatten nested objects with dot notation
        const flattenObject = (obj, prefix = '') => {
          return Object.keys(obj).reduce((acc, key) => {
            const prefixedKey = prefix ? `${prefix}.${key}` : key;
            
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
              // Recursively flatten nested objects
              Object.assign(acc, flattenObject(obj[key], prefixedKey));
            } else {
              // Add the flattened key-value pair
              acc[prefixedKey] = obj[key];
            }
            
            return acc;
          }, {});
        };
        
        // Flatten the translation set to handle nested objects
        const flattenedTranslations = flattenObject(translationSet);
        
        for (const [key, value] of Object.entries(flattenedTranslations)) {
          // Skip if value is an object (should be flattened already)
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            console.log(`Skipping object value for key: ${key}`);
            continue;
          }
          
          // Determine category based on the key and source file
          const category = determineCategory(key, sourceFile);
          
          // Log sample for debugging
          if (totalTranslations % 50 === 0) {
            console.log(`Sample - Key: ${key}, Category: ${category}, Source: ${sourceFile}`);
          }
          
          totalTranslations++;
          
          operations.push({
            updateOne: {
              filter: { key, languageCode: langCode },
              update: { 
                key,
                languageCode: langCode,
                value: String(value), // Ensure value is a string
                category,
                isActive: true
              },
              upsert: true
            }
          });
        }
        
        // Perform bulk write
        if (operations.length > 0) {
          const result = await Translation.bulkWrite(operations);
          totalUpserted += result.upsertedCount;
          totalModified += result.modifiedCount;
          console.log(`${langCode} (${sourceFile}): Upserted ${result.upsertedCount}, Modified ${result.modifiedCount} translations`);
        }
      }
    }
    
    console.log('Translation migration completed.');
    console.log(`Total translations processed: ${totalTranslations}`);
    console.log(`Total upserted: ${totalUpserted}`);
    console.log(`Total modified: ${totalModified}`);
    mongoose.disconnect();
  } catch (error) {
    console.error('Error during migration:', error);
    mongoose.disconnect();
    process.exit(1);
  }
};

// Run migration
migrateTranslations();