/**
 * Utility for handling achievement notification sounds
 * Provides fallback handling if sound files are missing
 */

// Map of achievement types to sound files
const SOUND_MAPPINGS = {
  default: '/public/sounds/achievement-default.mp3',
  special: '/public/sounds/achievement-default.mp3',  // Fallback to default
  explorer: '/public/sounds/achievement-default.mp3', // Fallback to default
  rare: '/public/sounds/achievement-rare.mp3',
  milestone: '/public/sounds/achievement-milestone.mp3',
};

// Keep track of which sounds we've already tried and failed to load
const failedSounds = new Set();

/**
 * Play achievement unlock sound with proper error handling
 * 
 * @param {string} achievementType - Type of achievement (explorer, rare, etc)
 * @returns {Promise} - Resolves when sound is played or fails silently
 */
export const playAchievementSound = (achievementType = 'default') => {
  return new Promise((resolve) => {
    // Get sound URL based on achievement type, or use default
    const soundUrl = SOUND_MAPPINGS[achievementType] || SOUND_MAPPINGS.default;
    
    // If we already tried and failed with this sound, don't try again
    if (failedSounds.has(soundUrl)) {
      resolve();
      return;
    }
    
    // Check if the sound file exists
    fetch(soundUrl, { method: 'HEAD' })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Sound file not found: ${soundUrl}`);
        }
        
        // Sound file exists, play it
        const audio = new Audio(soundUrl);
        
        // Handle successful playback
        audio.onended = () => {
          resolve();
        };
        
        // Handle errors
        audio.onerror = (err) => {
          failedSounds.add(soundUrl); // Remember this sound failed
          resolve(); // Resolve anyway to continue execution
        };
        
        // Start playing
        audio.play().catch(err => {
          failedSounds.add(soundUrl);
          resolve();
        });
      })
      .catch(err => {
        failedSounds.add(soundUrl);
        resolve();
      });
  });
};

/**
 * Helper function to preload achievement sounds
 * This can be called early in the app lifecycle to check which sounds are available
 */
export const preloadAchievementSounds = () => {
  // Only preload in production to avoid unnecessary requests in development
  if (process.env.NODE_ENV !== 'production') return;
  
  Object.values(SOUND_MAPPINGS).forEach(soundUrl => {
    fetch(soundUrl, { method: 'HEAD' })
      .then(response => {
        if (!response.ok) {
          failedSounds.add(soundUrl);
        }
      })
      .catch(() => {
        failedSounds.add(soundUrl);
      });
  });
};

export default {
  playAchievementSound,
  preloadAchievementSounds
};