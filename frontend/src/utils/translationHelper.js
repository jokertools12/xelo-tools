/**
 * Translation helper utility for accessing translations without hooks
 * 
 * This module exports the t function from LanguageContext as a regular function
 * that can be imported and used anywhere in the application
 */

// Reference to the actual translation function from context
let translationFunction = null;

// This will be called by the LanguageContext to set the actual translation function
export const setTranslationFunction = (fn) => {
  translationFunction = fn;
};

/**
 * Translation function for use in components without hooks
 * 
 * @param {string} key - The translation key to look up
 * @param {object} variables - Optional variables to replace in the translation
 * @param {string} defaultValue - Optional default value if key is not found
 * @returns {string} The translated string
 */
export const t = (key, variables = {}, defaultValue = '') => {
  // Use the translation function from context if available
  if (translationFunction) {
    return translationFunction(key, variables, defaultValue);
  }
  
  // Fallback if used before context initialization
  console.warn('Translation used before context initialization:', key);
  
  // Return the key or default value with basic variable replacement
  const text = defaultValue || key;
  
  if (!variables || Object.keys(variables).length === 0) {
    return text;
  }
  
  // Simple variable replacement
  let result = text;
  Object.keys(variables).forEach(varName => {
    const value = String(variables[varName]);
    result = result.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), value);
  });
  
  return result;
};

export default { t, setTranslationFunction };