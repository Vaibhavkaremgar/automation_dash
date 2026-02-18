# Railway Deployment Fix

## Problem
Backend crashes with SIGTERM due to database path issues and missing persistent volume.

## Solution

### 1. Configure Persistent Volume in Railway

**CRITICAL**: Railway needs a persistent volume for SQLite database.

1. Go to your Railway project dashboard
2. Click on your backend service
3. Go to **"Variables"** tab
4. Add volume mount:
   - Click **"+ New Volume"**
   - Mount Path: `/data`
   - Size: `1GB` (or more if needed)

### 2. Update Environment Variable

In Railway dashboard, update:
```
DB_PATH=/data/hirehero.db
```

### 3. Redeploy

After adding the volume and updating DB_PATH, trigger a new deployment.

## Verification

Check deployment logs for:
```
✅ Created database directory: /data
✅ Connected to SQLite database
   Path: /data/hirehero.db
✅ WAL mode enabled for better concurrency
✅ Database migrations completed
✅ Database initialization complete
```

## Alternative: Use Railway's PostgreSQL

For better production reliability, consider migrating to Railway's PostgreSQL addon instead of SQLite.

## Local Development

For local development, the code automatically falls back to:
```
DB_PATH=./data/hirehero.db
```

This works without any volume configuration.
