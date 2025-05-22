/**
 * URL Helper utility for handling file paths between development and production environments.
 * 
 * In development, the proxy handles /uploads/ URLs internally.
 * In production, these URLs need to point directly to the backend server.
 */

/**
 * Formats a URL to ensure uploads are properly referenced in both development and production.
 * 
 * @param {string} url - The URL or path to format
 * @return {string} The properly formatted URL
 */
export const formatUploadUrl = (url) => {
  // If URL is null, undefined, or empty, return as is
  if (!url) return url;
  
  // If URL already starts with http or https, it's already absolute
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If URL starts with /uploads/, prepend the API URL
  if (url.startsWith('/uploads/')) {
    const apiUrl = process.env.REACT_APP_API_URL || '';
    return `${apiUrl}${url}`;
  }
  
  // For data URLs or other URLs, return as is
  return url;
};

/**
 * Creates an avatar URL from a user's avatar path
 * 
 * @param {string} avatarPath - The user's avatar path
 * @return {string} The properly formatted avatar URL
 */
export const getAvatarUrl = (avatarPath) => {
  if (!avatarPath) return '';
  
  // If avatar is already a full URL or data URL, return it as is
  if (avatarPath.startsWith('http') || avatarPath.startsWith('data:')) {
    return avatarPath;
  }
  
  // If avatar doesn't start with /, add it
  const normalizedPath = avatarPath.startsWith('/') ? avatarPath : `/${avatarPath}`;
  
  // If it's an uploads path, use the formatUploadUrl function
  if (normalizedPath.includes('/uploads/')) {
    return formatUploadUrl(normalizedPath);
  }
  
  // For paths that don't include /uploads/, add it with the avatars subfolder
  const uploadPath = `/uploads/avatars${normalizedPath}`;
  return formatUploadUrl(uploadPath);
};