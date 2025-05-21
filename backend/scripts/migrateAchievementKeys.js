#!/usr/bin/env node

/**
 * Achievement Translation Keys Migration Script
 * 
 * This script runs the migration to add translation keys to all existing achievements.
 * It connects to the database, runs the migration, and handles errors properly.
 * 
 * Usage:
 * node ./scripts/migrateAchievementKeys.js
 */

console.log('Starting Achievement Translation Keys Migration...');
console.log('----------------------------------------------');

// Load the migration utility
const migrationUtil = require('../utils/migrateAchievementTranslations');

// Run the migration with proper error handling
(async () => {
  try {
    console.log('Connecting to database...');
    await migrationUtil.connectToDatabase();
    
    console.log('Running migration...');
    const results = await migrationUtil.migrateAchievementTranslations();
    
    console.log('Migration summary:');
    console.log(`- Found: ${results.total} achievements`);
    console.log(`- Updated: ${results.updated} achievements`);
    console.log(`- Already had keys: ${results.skipped} achievements`);
    console.log(`- Failed: ${results.failed} achievements`);
    
    console.log('----------------------------------------------');
    console.log('Migration completed successfully!');
    
    // Exit with success code
    process.exit(0);
  } catch (error) {
    console.error('Error during migration:');
    console.error(error);
    
    // Exit with error code
    process.exit(1);
  }
})();