# Comment Response System Limits and Optimization

## Overview

This document details the implemented limits, automatic cleanup processes, and system optimization for the Comment Response System. These measures ensure database efficiency, prevent server overload, and maintain system performance even under heavy load from multiple concurrent users.

## System-Wide Limits

### Database Storage Limits

- **Comment Responses TTL**: All comment responses are automatically deleted after 3 days by default, with a maximum of 7 days
- **Automatic Database Cleanup**: Daily maintenance tasks remove old responses regardless of user settings
- **Monitor Expiration**: All monitors automatically expire after 30 days to prevent abandoned monitors from consuming resources

### Rate Limiting

- **Global System Limits**: Maximum 60 responses per minute across all users
- **Per User Limits**: Maximum 50 responses per hour per user across all their monitors
- **Per Monitor Limits**: Maximum 30 responses per hour per monitor (enforced even if user sets higher value)
- **Minimum Delay Between Responses**: Enforced 10-second minimum delay between responses (cannot be bypassed)

### User Quota Limits

- **Basic Users**: Maximum 3 active monitors at a time
- **Premium Users**: Maximum 5 active monitors at a time  
- **Enterprise Users**: Maximum 10 active monitors at a time

## Automatic Cleanup Features

The system includes several automatic cleanup mechanisms to prevent database bloat:

1. **TTL (Time To Live) Indexes**:
   - Comment responses have an `expiresAt` field that triggers automatic MongoDB deletion
   - Default TTL is 3 days, cannot be extended beyond 7 days
   - Uses MongoDB's built-in TTL indexes for efficient cleanup

2. **Daily Maintenance Script**:
   - Runs automatically every day at midnight
   - Deletes all comment responses older than 7 days regardless of user settings
   - Archives inactive monitors (no activity for 7-14 days depending on settings)
   - Enforces response retention limits (per monitor)
   - Validates and corrects any non-compliant monitor settings

3. **Response Retention Limits**:
   - Each monitor has a response retention limit (default: 300, max: 1000)
   - When exceeded, oldest responses are automatically deleted
   - System enforces this limit during regular processing

4. **Automatic Monitor Archiving**:
   - Monitors with no activity for 7 days (configurable) are automatically archived
   - Archived monitors no longer consume processing resources
   - Maximum inactivity period is capped at 14 days regardless of user settings

## Monitor Processing Optimization

The comment monitor processor has been optimized to handle high load efficiently:

1. **Staggered Processing**:
   - Monitors are processed in batches (max 10 at once) 
   - System dynamically adjusts batch size based on current load
   - Enforces minimum intervals between processing to prevent API rate limits

2. **Load-Based Throttling**:
   - System automatically pauses for 5 minutes when load exceeds thresholds
   - Monitors response rate and adjusts processing parameters
   - Prioritizes newer comments when system is under heavy load

3. **Resource-Efficient Processing**:
   - Limits maximum posts monitored per page (default: 20, max: 50)
   - Limits maximum comments processed per post (200)
   - Enforces minimum check frequency of 5 minutes

4. **User Priority System**:
   - Basic users: Lower processing priority, stricter rate limits
   - Premium/Enterprise users: Higher priority, higher quotas
   - All users still subject to system-wide limits for stability

## Adding The Maintenance Script to Cron

The maintenance script can be run manually or automatically via cron. To set up automated maintenance:

```bash
# Run maintenance daily at midnight
0 0 * * * cd /path/to/project && npm run maintenance

# Or using the npm script that uses node-cron
npm run schedule-maintenance
```

## Implementation Locations

The system limits are enforced in several locations:

1. **Model Schemas**:
   - `CommentResponse.js`: TTL indexes, field validation, cleanup methods
   - `CommentMonitor.js`: Field validation, rate limits, pre-save middleware

2. **Processing Logic**:
   - `commentMonitorProcessor.js`: Rate limiting, batch processing, system throttling

3. **Maintenance Tasks**:
   - `maintenanceScript.js`: Database cleanup, monitor archiving, system reporting

## Monitoring System Health

Administrators can check system health through:

1. **Maintenance Reports**: Generated daily and stored in the logs directory
2. **System Metrics**: Available through the admin dashboard
3. **Manual Check**: Run `npm run maintenance` to generate a current report

## Conclusion

These measures ensure that the Comment Response System will remain stable and efficient even with many users creating automations simultaneously. The automatic cleanup processes prevent database bloat while the enforced limits ensure fair resource allocation and system stability.