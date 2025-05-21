/**
 * Database Maintenance Script
 * 
 * This script performs routine maintenance tasks to keep the database clean
 * and prevent it from growing too large, even with heavy usage. It:
 * 
 * 1. Removes old comment responses
 * 2. Archives inactive monitors
 * 3. Enforces user limits
 * 4. Provides system status reports
 * 
 * Run this script on a scheduled basis (e.g., daily via cron job)
 */

const mongoose = require('mongoose');
const CommentResponse = require('../models/CommentResponse');
const CommentMonitor = require('../models/CommentMonitor');
const User = require('../models/User');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connect to the database
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB for maintenance tasks');
  runMaintenance();
}).catch(err => {
  console.error('Error connecting to MongoDB:', err.message);
  process.exit(1);
});

/**
 * Main maintenance function that runs all cleanup tasks
 */
async function runMaintenance() {
  console.log('Starting database maintenance process...');
  console.log('============================================');
  
  try {
    // 1. Clean up old responses - delete all older than 7 days regardless of settings
    await cleanupOldResponses();
    
    // 2. Archive inactive monitors - based on monitor-specific settings
    await archiveInactiveMonitors();
    
    // 3. Enforce response limits per monitor
    await enforceResponseLimits();
    
    // 4. Check for and fix any monitors with invalid settings
    await validateMonitorSettings();
    
    // 5. Generate system status report
    await generateSystemReport();
    
    console.log('============================================');
    console.log('Maintenance process completed successfully');
    
    // Close database connection and exit
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error during maintenance process:', error);
    
    // Close database connection and exit with error
    await mongoose.connection.close();
    process.exit(1);
  }
}

/**
 * Delete old comment responses
 */
async function cleanupOldResponses() {
  console.log('Cleaning up old comment responses...');
  
  // Delete all responses older than 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const result = await CommentResponse.deleteMany({
    createdAt: { $lt: sevenDaysAgo }
  });
  
  console.log(`Deleted ${result.deletedCount} comment responses older than 7 days`);
  
  // Also clean up responses based on each monitor's specific retention limit
  const monitors = await CommentMonitor.find({
    'dataManagement.responseRetentionLimit': { $gt: 0 }
  });
  
  let enforcedLimitDeleteCount = 0;
  
  for (const monitor of monitors) {
    try {
      const limit = Math.min(monitor.dataManagement.responseRetentionLimit || 300, 1000);
      
      // Count total responses for this monitor
      const totalResponses = await CommentResponse.countDocuments({
        monitor: monitor._id
      });
      
      // If over the limit, delete oldest responses
      if (totalResponses > limit) {
        const excessCount = totalResponses - limit;
        
        // Find oldest responses
        const oldestResponses = await CommentResponse.find({
          monitor: monitor._id
        })
          .sort({ createdAt: 1 })
          .limit(excessCount)
          .select('_id');
        
        // Delete them
        if (oldestResponses.length > 0) {
          const ids = oldestResponses.map(r => r._id);
          const deleteResult = await CommentResponse.deleteMany({ _id: { $in: ids } });
          enforcedLimitDeleteCount += deleteResult.deletedCount;
        }
      }
    } catch (error) {
      console.error(`Error cleaning up responses for monitor ${monitor._id}:`, error.message);
    }
  }
  
  console.log(`Deleted ${enforcedLimitDeleteCount} comment responses based on monitor-specific retention limits`);
}

/**
 * Archive inactive monitors
 */
async function archiveInactiveMonitors() {
  console.log('Archiving inactive monitors...');
  
  // Get all monitors
  const monitors = await CommentMonitor.find({ status: 'active' });
  let archivedCount = 0;
  
  for (const monitor of monitors) {
    try {
      // Calculate days of inactivity
      const lastActivity = monitor.stats.lastCommentCheckedTime || monitor.updatedAt;
      const inactiveDays = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24);
      
      // Use the lower of the user setting or system max (14 days)
      const archiveDays = Math.min(monitor.dataManagement?.autoArchiveAfterDays || 7, 14);
      
      if (inactiveDays >= archiveDays) {
        console.log(`Archiving monitor ${monitor._id} after ${inactiveDays.toFixed(1)} days of inactivity`);
        
        monitor.status = 'archived';
        await monitor.save();
        archivedCount++;
      }
    } catch (error) {
      console.error(`Error processing monitor ${monitor._id}:`, error.message);
    }
  }
  
  console.log(`Archived ${archivedCount} inactive monitors`);
}

/**
 * Enforce monitor response limits for each user
 */
async function enforceResponseLimits() {
  console.log('Enforcing response limits...');
  
  // Get all users with active monitors
  const users = await User.find({});
  
  for (const user of users) {
    try {
      // Get user's active monitors
      const monitors = await CommentMonitor.find({
        user: user._id,
        status: 'active'
      });
      
      // Determine max monitors based on membership level
      let maxMonitors = 2; // Default
      
      if (user.membership && user.membership.level) {
        switch (user.membership.level) {
          case 'basic':
            maxMonitors = 3;
            break;
          case 'premium':
            maxMonitors = 5;
            break;
          case 'enterprise':
            maxMonitors = 10;
            break;
        }
      }
      
      // If user has too many active monitors, archive the oldest ones
      if (monitors.length > maxMonitors) {
        console.log(`User ${user._id} has ${monitors.length} monitors, max allowed is ${maxMonitors}`);
        
        // Sort by last activity (oldest first)
        monitors.sort((a, b) => {
          const aLastActivity = a.stats.lastCommentCheckedTime || a.updatedAt;
          const bLastActivity = b.stats.lastCommentCheckedTime || b.updatedAt;
          return new Date(aLastActivity) - new Date(bLastActivity);
        });
        
        // Archive excess monitors
        const excessCount = monitors.length - maxMonitors;
        for (let i = 0; i < excessCount; i++) {
          console.log(`Archiving excess monitor ${monitors[i]._id} for user ${user._id}`);
          monitors[i].status = 'archived';
          await monitors[i].save();
        }
      }
    } catch (error) {
      console.error(`Error enforcing limits for user ${user._id}:`, error.message);
    }
  }
}

/**
 * Validate and fix any monitor settings that don't comply with system limits
 */
async function validateMonitorSettings() {
  console.log('Validating monitor settings...');
  
  const monitors = await CommentMonitor.find();
  let updatedCount = 0;
  
  for (const monitor of monitors) {
    let needsUpdate = false;
    
    // Check and adjust rate limiting settings
    if (monitor.rateLimiting) {
      if (monitor.rateLimiting.maxResponsesPerHour > 30) {
        monitor.rateLimiting.maxResponsesPerHour = 30;
        needsUpdate = true;
      }
      
      if (monitor.rateLimiting.minSecondsBetweenResponses < 10) {
        monitor.rateLimiting.minSecondsBetweenResponses = 10;
        needsUpdate = true;
      }
    }
    
    // Check and adjust data management settings
    if (monitor.dataManagement) {
      if (monitor.dataManagement.responseRetentionLimit > 1000) {
        monitor.dataManagement.responseRetentionLimit = 1000;
        needsUpdate = true;
      }
      
      if (monitor.dataManagement.autoArchiveAfterDays > 14) {
        monitor.dataManagement.autoArchiveAfterDays = 14;
        needsUpdate = true;
      }
    }
    
    // Check and adjust max posts to monitor
    if (monitor.maxPostsToMonitor > 50) {
      monitor.maxPostsToMonitor = 50;
      needsUpdate = true;
    }
    
    // Check expiration date
    const maxExpiryDate = new Date();
    maxExpiryDate.setDate(maxExpiryDate.getDate() + 30);
    
    if (!monitor.expiresAt || monitor.expiresAt > maxExpiryDate) {
      monitor.expiresAt = maxExpiryDate;
      needsUpdate = true;
    }
    
    // Save if changes were made
    if (needsUpdate) {
      await monitor.save();
      updatedCount++;
    }
  }
  
  console.log(`Updated ${updatedCount} monitors with invalid settings`);
}

/**
 * Generate system status report with key metrics
 */
async function generateSystemReport() {
  console.log('Generating system status report...');
  
  // Count users with active monitors
  const activeUserCount = await CommentMonitor.distinct('user', { status: 'active' }).length;
  
  // Count total active monitors
  const activeMonitorCount = await CommentMonitor.countDocuments({ status: 'active' });
  
  // Count responses in the last 24 hours
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const recentResponseCount = await CommentResponse.countDocuments({
    createdAt: { $gte: oneDayAgo }
  });
  
  // Count total stored comments in database
  const totalResponses = await CommentResponse.countDocuments();
  
  // Count total stored monitors in database
  const totalMonitors = await CommentMonitor.countDocuments();
  
  // Report to console
  console.log('System Status Report:');
  console.log('--------------------');
  console.log(`Active users: ${activeUserCount}`);
  console.log(`Active monitors: ${activeMonitorCount}`);
  console.log(`Total monitors: ${totalMonitors}`);
  console.log(`Responses in last 24h: ${recentResponseCount}`);
  console.log(`Total stored responses: ${totalResponses}`);
  console.log(`Response rate: ${(recentResponseCount / 24).toFixed(2)} per hour`);
  
  // Save report to file (would be implemented in a full version)
  // const reportPath = path.join(__dirname, '../logs', `maintenance-report-${new Date().toISOString().split('T')[0]}.log`);
  // fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
}

// Add this script to package.json scripts:
// "maintenance": "node scripts/maintenanceScript.js"