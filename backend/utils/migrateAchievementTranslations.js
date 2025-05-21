/**
 * Migration utility to update achievements with translation keys
 * 
 * This module provides functions to add titleKey and descriptionKey fields to existing
 * achievements based on a mapping of common achievement titles and descriptions to their
 * corresponding translation keys.
 */

const mongoose = require('mongoose');
require('dotenv').config();
const Achievement = require('../models/Achievement');

/**
 * Connect to the MongoDB database
 * @returns {Promise<void>}
 */
async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) {
    console.log('Already connected to MongoDB');
    return;
  }
  
  // Use MONGO_URI instead of MONGODB_URI to match the project's environment variable
  const mongoUri = process.env.MONGO_URI;
  
  if (!mongoUri) {
    throw new Error('MongoDB connection string not found. Make sure MONGO_URI is defined in your .env file.');
  }
  
  return mongoose.connect(mongoUri)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => {
      console.error('Failed to connect to MongoDB', err);
      throw err;
    });
}

/**
 * Disconnect from the MongoDB database
 * @returns {Promise<void>}
 */
async function disconnectFromDatabase() {
  if (mongoose.connection.readyState === 0) {
    console.log('Already disconnected from MongoDB');
    return;
  }
  
  return mongoose.disconnect()
    .then(() => console.log('Disconnected from MongoDB'))
    .catch((err) => {
      console.error('Error disconnecting from MongoDB', err);
      throw err;
    });
}

/**
 * Add translation keys to existing achievements
 * @returns {Promise<Object>} Migration results
 */
async function migrateAchievementTranslations() {
  // Map of achievement titles to their translation keys
  const titleKeyMap = {
    'مرحباً بك!': 'achievement_title_welcome',
    'مرحبا بك!': 'achievement_title_welcome',
    'المستكشف': 'achievement_title_explorer',
    'الملف الشخصي المكتمل': 'achievement_title_profile_complete',
    'المثابر': 'achievement_title_persistent',
    'المشارك': 'achievement_title_participant',
    'المنشور الأول': 'achievement_title_first_post',
    'المجدول': 'achievement_title_first_scheduled',
    'ملك المنشورات': 'achievement_title_master_poster',
  };

  // Map of achievement descriptions to their translation keys
  const descriptionKeyMap = {
    'قم بتسجيل الدخول للمرة الأولى': 'achievement_desc_welcome',
    'قم بزيارة جميع أقسام التطبيق': 'achievement_desc_explorer',
    'أكمل معلومات ملفك الشخصي': 'achievement_desc_profile_complete',
    'قم بتسجيل الدخول لمدة 7 أيام متتالية': 'achievement_desc_persistent',
    'قم بإجراء 10 عمليات نشر (يدوية أو مجدولة)': 'achievement_desc_participant',
    'قم بإنشاء أول منشور لك': 'achievement_desc_first_post',
    'قم بجدولة أول منشور لك': 'achievement_desc_first_scheduled',
    'قم بإنشاء 50 منشورًا': 'achievement_desc_master_poster',
  };

  try {
    // Get all achievements
    const achievements = await Achievement.find({});
    console.log(`Found ${achievements.length} achievements to process`);

    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    // Process each achievement
    for (const achievement of achievements) {
      try {
        let changed = false;
        const updates = {};

        // Check if achievement title has a mapping
        if (!achievement.titleKey && titleKeyMap[achievement.title]) {
          updates.titleKey = titleKeyMap[achievement.title];
          changed = true;
        }

        // If no mapping found but no titleKey exists, generate based on type
        if (!achievement.titleKey && !updates.titleKey && achievement.type) {
          updates.titleKey = `achievement_type_${achievement.type}`;
          changed = true;
        }

        // Check if achievement description has a mapping
        if (!achievement.descriptionKey && descriptionKeyMap[achievement.description]) {
          updates.descriptionKey = descriptionKeyMap[achievement.description];
          changed = true;
        }

        // If no mapping found but no descriptionKey exists, generate based on type
        if (!achievement.descriptionKey && !updates.descriptionKey && achievement.type) {
          updates.descriptionKey = `achievement_desc_${achievement.type}`;
          changed = true;
        }

        // Update the achievement if changes were made
        if (changed) {
          await Achievement.updateOne({ _id: achievement._id }, { $set: updates });
          console.log(`Updated achievement: ${achievement.title} - Added keys: ${JSON.stringify(updates)}`);
          updatedCount++;
        } else {
          console.log(`Skipped achievement: ${achievement.title} - Already has keys or no matching keys found`);
          skippedCount++;
        }
      } catch (achievementError) {
        console.error(`Error updating achievement ${achievement._id}:`, achievementError);
        failedCount++;
      }
    }

    console.log(`Migration complete. Updated: ${updatedCount}, Skipped: ${skippedCount}, Failed: ${failedCount}`);

    // Return migration results
    return {
      total: achievements.length,
      updated: updatedCount,
      skipped: skippedCount,
      failed: failedCount
    };
  } catch (error) {
    console.error('Error in migration:', error);
    throw error;
  }
}

// Export the functions for use in scripts
module.exports = {
  connectToDatabase,
  disconnectFromDatabase,
  migrateAchievementTranslations
};

// If this script is run directly, execute the migration
if (require.main === module) {
  (async () => {
    try {
      await connectToDatabase();
      await migrateAchievementTranslations();
    } catch (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    } finally {
      await disconnectFromDatabase();
    }
  })();
}