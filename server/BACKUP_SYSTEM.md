# Database Backup System

## Overview
Automatic SQLite database backup to Google Drive with production-safe error handling.

## Features
✅ Automatic backups every 6 hours
✅ Initial backup 5 minutes after server start
✅ Backup triggered after WhatsApp message logs
✅ Manual backup endpoint for testing
✅ Non-blocking operations
✅ Graceful error handling (no crashes)
✅ Database existence check on startup

## Files Modified

### 1. `src/services/backupScheduler.js` (NEW)
- Backup scheduler service
- Runs every 6 hours via setInterval
- Safe error handling (swallows errors, logs warnings)
- Startup DB existence check

### 2. `src/index.js` (MODIFIED)
- Imports and initializes backup scheduler on server start
- Adds graceful shutdown handlers (SIGTERM, SIGINT)
- Non-blocking initialization

### 3. `src/routes/messageWebhooks.js` (MODIFIED)
- Triggers backup after successful n8n message log
- Non-blocking call with error suppression

### 4. `src/routes/backup.js` (NEW)
- Admin-only manual backup endpoint
- For testing and emergency backups

## Environment Variables Required
```env
DB_PATH=../data/hirehero.db
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_DRIVE_BACKUP_FOLDER_ID=your-folder-id
```

## Backup Schedule
- **Every 6 hours**: Automatic scheduled backup
- **5 minutes after startup**: Initial backup
- **After message logs**: Triggered on successful WhatsApp message

## Manual Backup (Testing)

### Via API (Admin only)
```bash
POST /api/backup/trigger
Authorization: Bearer <admin-jwt-token>
```

### Response
```json
{
  "success": true,
  "message": "Backup triggered successfully"
}
```

### Via Code
```javascript
const { manualBackup } = require('./services/backupScheduler');
await manualBackup();
```

## Backup File Naming
```
hirehero_2024-01-15T10-30-45-123Z.db
```
Format: `hirehero_<ISO-timestamp>.db`

## Error Handling
- ❌ Backup fails → Error logged, app continues
- ❌ DB file missing → Warning logged, app continues
- ❌ Google Drive error → Error logged, app continues
- ✅ No crashes, no blocking operations

## Logs
```
✅ Backup system initialized
🔄 Running scheduled backup...
✅ SQLite backup uploaded to Drive: hirehero_2024-01-15T10-30-45-123Z.db
❌ Backup failed: <error message>
⚠️ WARNING: Database file not found at /path/to/db
```

## Production Deployment (Railway)

### Important Notes
1. **No persistent volumes on free tier** → Database resets on redeploy
2. **Backups preserve data** → Can be restored manually if needed
3. **Non-blocking** → Server starts immediately, backup runs in background
4. **Safe** → Backup failures don't crash the app

### Deployment Checklist
- [x] All env vars set in Railway
- [x] GOOGLE_DRIVE_BACKUP_FOLDER_ID configured
- [x] Service account has Drive write access
- [x] No code changes needed after deployment

## Monitoring
Check Railway logs for:
- `✅ Backup system initialized` - System ready
- `🔄 Running scheduled backup...` - Backup started
- `✅ SQLite backup uploaded to Drive` - Backup successful
- `❌ Backup failed` - Backup error (non-critical)

## Troubleshooting

### Backup not running
1. Check Railway logs for initialization message
2. Verify GOOGLE_DRIVE_BACKUP_FOLDER_ID is set
3. Check service account permissions

### Backup fails
1. Check Google Drive folder permissions
2. Verify service account credentials
3. Check DB_PATH is correct
4. Review error logs (app continues running)

### Manual test
```bash
curl -X POST https://your-app.railway.app/api/backup/trigger \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"
```

## Future Enhancements (Optional)
- Backup retention policy (delete old backups)
- Backup restore endpoint
- Backup status dashboard
- Email notifications on backup failure
- Backup to multiple destinations
