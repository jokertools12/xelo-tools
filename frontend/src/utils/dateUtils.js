/**
 * Date Utilities for standardized date formatting across the application
 * Uses Gregorian calendar with Arabic localization for all date displays
 */

// We can't use useLanguage hook directly because it's not a React component
// For translations, we'll create a separate function to get translations outside React components

/**
 * Format a date as a short date string (DD/MM/YYYY) in Arabic format
 * @param {Date|string|number} date - The date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return '-';
  
  const dateObj = new Date(date);
  // Add RTL marker to ensure proper right-to-left display
  return '\u200F' + dateObj.toLocaleDateString('ar', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    calendar: 'gregory' // Use Gregorian calendar explicitly
  });
};

/**
 * Format a date and time (DD/MM/YYYY, HH:MM) in Arabic format
 * @param {Date|string|number} date - The date to format
 * @returns {string} Formatted date and time string
 */
export const formatDateTime = (date) => {
  if (!date) return '-';
  
  const dateObj = new Date(date);
  // Add RTL marker to ensure proper right-to-left display
  return '\u200F' + dateObj.toLocaleString('ar', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false, // Use 24-hour format which is more common in Arabic
    calendar: 'gregory' // Use Gregorian calendar explicitly
  });
};

/**
 * Format a date as a long date string (DD Month YYYY) with Arabic month names
 * @param {Date|string|number} date - The date to format
 * @returns {string} Formatted long date string
 */
export const formatLongDate = (date) => {
  if (!date) return '-';
  
  const dateObj = new Date(date);
  // Explicitly construct the format to ensure RTL display with day before month
  const day = dateObj.getDate();
  const month = dateObj.toLocaleDateString('ar', { month: 'long', calendar: 'gregory' });
  const year = dateObj.getFullYear();
  
  // Add RTL marker to ensure proper right-to-left display
  return `\u200F${day} ${month} ${year}`;
};

/**
 * Format a time (HH:MM) in Arabic format
 * @param {Date|string|number} date - The date to format
 * @returns {string} Formatted time string
 */
export const formatTime = (date) => {
  if (!date) return '-';
  
  const dateObj = new Date(date);
  // Add RTL marker to ensure proper right-to-left display
  return '\u200F' + dateObj.toLocaleTimeString('ar', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false, // Use 24-hour format which is more common in Arabic contexts
    calendar: 'gregory'
  });
};

/**
 * Format a date relative to current time in Arabic (e.g., "منذ يومين", "الآن")
 * @param {Date|string|number} date - The date to format
 * @returns {string} Relative time string in Arabic
 */
export const formatRelativeTime = (date) => {
  if (!date) return '-';
  
  const dateObj = new Date(date);
  const now = new Date();
  // Calculate if the date is in the past or future
  const isPastDate = dateObj < now;
  
  // For future dates, just return the formatted date
  if (!isPastDate) {
    return formatDate(dateObj);
  }
  
  const diffTime = now - dateObj; // Don't use Math.abs to keep past/future distinction
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Using Arabic relative time phrases
  if (diffDays === 0) {
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      if (diffMinutes < 1) {
        return 'الآن';  // Just now
      }
      
      // Arabic for "X minutes ago" with proper plural forms
      if (diffMinutes === 1) {
        return 'دقيقة واحدة مضت';
      } else if (diffMinutes === 2) {
        return 'دقيقتين مضت';
      } else if (diffMinutes >= 3 && diffMinutes <= 10) {
        return `${diffMinutes} دقائق مضت`;
      } else {
        return `${diffMinutes} دقيقة مضت`;
      }
    }
    
    // Arabic for "X hours ago" with proper plural forms
    if (diffHours === 1) {
      return 'ساعة واحدة مضت';
    } else if (diffHours === 2) {
      return 'ساعتين مضت';
    } else if (diffHours >= 3 && diffHours <= 10) {
      return `${diffHours} ساعات مضت`;
    } else {
      return `${diffHours} ساعة مضت`;
    }
  } else if (diffDays === 1) {
    return 'الأمس';  // Yesterday
  } else if (diffDays < 7) {
    // Arabic for "X days ago" with proper plural forms
    if (diffDays === 2) {
      return 'يومين مضت';
    } else if (diffDays >= 3 && diffDays <= 10) {
      return `${diffDays} أيام مضت`;
    } else {
      return `${diffDays} يوم مضت`;
    }
  } else {
    return formatDate(dateObj);
  }
};

/**
 * Get day name from date in Arabic
 * @param {Date|string|number} date - The date
 * @returns {string} Day name in Arabic
 */
export const getDayName = (date) => {
  if (!date) return '-';
  
  const dateObj = new Date(date);
  return dateObj.toLocaleDateString('ar', { 
    weekday: 'long',
    calendar: 'gregory'
  });
};

/**
 * Get month name from date in Arabic
 * @param {Date|string|number} date - The date
 * @returns {string} Month name in Arabic
 */
export const getMonthName = (date) => {
  if (!date) return '-';
  
  const dateObj = new Date(date);
  return dateObj.toLocaleDateString('ar', { 
    month: 'long',
    calendar: 'gregory'
  });
};

/**
 * Format a date for input fields (YYYY-MM-DD)
 * @param {Date|string|number} date - The date to format
 * @returns {string} Formatted date string for inputs
 */
export const formatDateForInput = (date) => {
  if (!date) return '';
  
  const dateObj = new Date(date);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Check if a date is today
 * @param {Date|string|number} date - The date to check
 * @returns {boolean} True if the date is today
 */
export const isToday = (date) => {
  if (!date) return false;
  
  const dateObj = new Date(date);
  const today = new Date();
  
  return dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear();
};

/**
 * Check if a date is in the past
 * @param {Date|string|number} date - The date to check
 * @returns {boolean} True if the date is in the past
 */
export const isPast = (date) => {
  if (!date) return false;
  
  const dateObj = new Date(date);
  const now = new Date();
  
  return dateObj < now;
};

/**
 * Check if a date is in the future
 * @param {Date|string|number} date - The date to check
 * @returns {boolean} True if the date is in the future
 */
export const isFuture = (date) => {
  if (!date) return false;
  
  const dateObj = new Date(date);
  const now = new Date();
  
  return dateObj > now;
};