/**
 * Header Effects Utility
 * 
 * Adds dynamic effects to the header as the user scrolls
 */

/**
 * Initialize header scroll effects
 * This adds a scrolled class to the header when the user scrolls down
 */
export const initHeaderScrollEffects = () => {
  if (typeof window === 'undefined') return;
  
  const applyHeaderScrollClass = () => {
    const header = document.querySelector('.app-header');
    if (!header) return;

    if (window.scrollY > 10) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  // Apply initially in case page loads scrolled down
  applyHeaderScrollClass();
  
  // Add scroll event listener
  window.addEventListener('scroll', applyHeaderScrollClass);
  
  // Return clean-up function for React useEffect
  return () => {
    window.removeEventListener('scroll', applyHeaderScrollClass);
  };
};

/**
 * Clean up header scroll effects
 * This removes event listeners to prevent memory leaks
 */
export const cleanupHeaderScrollEffects = () => {
  if (typeof window === 'undefined') return;
  
  window.removeEventListener('scroll', () => {
    const header = document.querySelector('.app-header');
    if (!header) return;
    
    if (window.scrollY > 10) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
};