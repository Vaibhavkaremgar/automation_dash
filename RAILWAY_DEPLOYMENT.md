# Railway Deployment Guide

## Critical Issues Fixed

### 1. ✅ Database Column Missing
- **Error**: `SQLITE_ERROR: no such column: customer_id`
- **Fix**: Added migration 007 to add `customer_id` and `sent_via` columns to `renewal_reminders` table

### 2. ✅ Wrong Spreadsheet IDs
- **Error**: Showing encrypted ID `QPO7azjvkPSSXEZyH9lhOK9HDLRbjisX5SdWAxJtGJxD`
- **Fix**: Added fallback values in `insuranceClients.js` config

### 3. ✅ Password Issues
- **Note**: Passwords are NOT being changed. The seed function only creates users if they DON'T exist
- **All passwords remain**: `Vaibhav@121` for admin, `kmg123` for KMG, `joban123` for Joban

## Railway Environment Variables

Add these to your Railway project:

```env
# Server
NODE_ENV=production
PORT=5000

# Database (Railway will provide persistent volume)
DB_PATH=./data/hirehero.db

# Frontend URL (Your Railway frontend URL)
FRONTEND_URL=https://your-frontend-url.railway.app

# JWT Secret
JWT_SECRET=af36f5a0060d60295b1a6cbce9ef88a734d07caa0d3db9107bb6d07e83094e505cfab3cf85385bcb340d33d31cbac2d7653b762935f55af4a7012ad7931c1e9f

# Google Sheets API
GOOGLE_PROJECT_ID=n8n-local-integration-477807
GOOGLE_CLIENT_EMAIL=dash-one@n8n-local-integration-477807.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDVvxlDUSGaM0EU\njcSUTHTTfrKbP/W3o6ag8nvQRzADvu4sxbZ3+2eMvfbsDUI4S9r3PJHFUAcchyJk\n5KJKwbkv39tnQH+iIlZTeE/nb9rVF9QQWiV+qdP0vxW2eR3FeuxRxPkfylBQowMz\nutE9AFOiMwwaoEcQODogVEZhMPgLcj4tvot9yGsjLd0nZJsRP5DCt6qhrtUorn6u\nGzuMgT2kqLUHxQbzjrYvOGi9q5rK/Du8jBE4LWkCC1eJFIdy0oLw1Qm5+VOlkTnU\nLwyRKjOV2K6MACYvaLLrozWdA5qrULh4NDbMp7meGryu+TlY+X9wVF+B7ylyTeNa\nN+9JI/vhAgMBAAECggEAXOXa8X5797xp/yhkdT3LkrYgo0gHn+JBA/ePp2ShMieT\n9aKSnRAHn8xaWpqimrwhNU4+Xr7a8GOtJ6OVA5+xwGRvQ69tKYb59Po35DMhrXbX\nRKohXK0sAVXhdnaqYU99EUbmLZJtGLbYp+18jiIrtzWvf40EhcCiRrXKBujVDYe0\nm7t0weMKgfr7MngEm6Awl946yJC3lPrIF6FT0EOCaludffm05CfxU7z+9YLn/V2P\nH5wwwaa5AbxbF54EYW+krC3G2qrHlr0du7tt4h+Thi4Be/w/+jpIKViSYJfRH2hx\nSsVYNp6/aZRgS9nW3xAYq6MBej5gnTGlFI/i1hdirwKBgQDxtliunmUGXRYoo4vP\nq2CSf9/ztGVaPrlxszg+7yNrf+kZ0kdyTgdOC90YtkpjU9X87HvCv2avnM+Y69Ci\npgALACe2OpmsUc7JpupoX8BnYTKCqUqJdgHj9qDx8pOXQW2OTUcif7ZAuoZM2Fpf\npRvipHgWfJfrQBz7qEXiDgGBrwKBgQDiYZD44Stsh6s9jy7PayqnYsgo+SDWLD4Q\n2HN/9suYM4hrPbHKia/ItFMhz0n6o5V9fuOKSmL7c1vVAwXDF6BP2QkUtK2h+94L\nRhO9DWsF7lxgdFkMczSlEaVbXDmmSA6mU2aaAXuzvwiN1k4CRzyS8ZpCx/u8gzHJ\nsmnF0LSPbwKBgQC1DYNL+TVvGNb6Rdb6DULfOY3E/IFWodlCg55D9diwMzWls870\nneH24ggQ9Kqv0CJfu7vQWpJORMVzpF+5FWK+2rTkWOy3GOguQCshV2fFiBbPrIM6\nh/xOh3RzBuLqz4WCq/v2qXcY8R6b/QtkzUYf9FZHcbhR7MpI7vi5pQgX3QKBgEfq\n3vdx8S2lXA1Oc3yJex96DkSWAIyJuZ34ZZj9emh71pbbHqRNYX7NaquPAt2RImif\n6wF/6Dohx8bAExCLbO5w8KWXUKHpNf024gZpQNq9grNRwwhlgQ//rxx7DAV7VswY\nKrw6RGYyBjGpJ1cp8mBsSKl2hs64jxSYjWm+h94ZAoGAL6mEFXrgZi4Cj7R/fN+Q\nvyBDndv3zVDY7poriPIp+uHyezgxMtwOhG0vTN2myhVS4bZt1rdpZGxheWGju6tU\nKF2CQLWJpwh9zc5SF4+f+TUwtS557TrCevx4wVC+zZKu0rLtPyYHAY+3+rsPGXlQ\n66OaMDXRxaDYVGFdpYzw3VQ=\n-----END PRIVATE KEY-----\n"

# Google Sheets IDs
KMG_INSURANCE_SHEETS_SPREADSHEET_ID=1EpMAg1gSXPKr83cTugvGexrqv3Yt5Tb85Re2Shah8mw
KMG_INSURANCE_SHEETS_TAB=updating_input
JOBAN_INSURANCE_SHEETS_SPREADSHEET_ID=1oX5MGRMo6oz87ivTXeMOy6vtIDPJXXawz_lGqmOvUEo
JOBAN_INSURANCE_SHEETS_TAB=Sheet1

# Voice API
VOICE_API_KEY=0cbc12c8-db94-41b9-a289-efead1815ff5
VOICE_ORG_ID=b34f0285-61e1-4729-bb48-2f30d94ae988
VOICE_BASE_URL=https://api.vapi.ai

# Razorpay
RAZORPAY_KEY_ID=rzp_test_ReMGjXR9MRhVgk
RAZORPAY_KEY_SECRET=mPYbsRQEudzf5ig8YOQfZk1d
RAZORPAY_WEBHOOK_SECRET=F7xsFkRM@kpuS6N

# Security
ENABLE_IP_RESTRICTIONS=false
ENABLE_SESSION_LIMITS=false
BYPASS_IP_FOR_LOCALHOST=true
```

## Railway Setup Steps

### 1. Create New Project
1. Go to Railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository

### 2. Add Persistent Volume
**CRITICAL**: Railway needs persistent storage for SQLite database

1. Go to your service settings
2. Click "Volumes" tab
3. Click "Add Volume"
4. Mount path: `/app/data`
5. Size: 1GB (minimum)

### 3. Set Environment Variables
Copy all variables from above into Railway's environment variables section.

**IMPORTANT**: Make sure `GOOGLE_PRIVATE_KEY` is properly formatted with `\n` for newlines.

### 4. Deploy
Railway will automatically deploy when you push to your repository.

## Verification Steps

### 1. Check Logs
```
Railway Dashboard → Your Service → Logs
```

Look for:
- ✅ Connected to SQLite database
- ✅ Database migrations completed successfully
- ✅ Insurance company names migration completed
- ✅ Client message tables migration completed
- ✅ Renewal reminders table fixed
- ✅ Admin exists
- ✅ KMG Insurance exists
- ✅ Joban Putra Insurance Shoppe exists

### 2. Test Login
```
POST https://your-backend-url.railway.app/api/auth/login
{
  "email": "vaibhavkar0009@gmail.com",
  "password": "Vaibhav@121"
}
```

Should return:
```json
{
  "token": "...",
  "user": {
    "id": 1,
    "email": "vaibhavkar0009@gmail.com",
    "name": "Admin",
    "role": "admin",
    "client_type": "hr"
  }
}
```

### 3. Test Sync
```
POST https://your-backend-url.railway.app/api/insurance/sync/from-sheet
Headers: Authorization: Bearer <token>
```

Should import customers from Google Sheets.

## Common Issues & Solutions

### Issue 1: "SQLITE_ERROR: no such column"
**Solution**: Database not migrated properly
```bash
# Railway will run migrations on startup
# Check logs for migration errors
# If needed, delete volume and redeploy
```

### Issue 2: Wrong Spreadsheet ID
**Solution**: Check environment variables
```bash
# Verify in Railway dashboard:
KMG_INSURANCE_SHEETS_SPREADSHEET_ID=1EpMAg1gSXPKr83cTugvGexrqv3Yt5Tb85Re2Shah8mw
JOBAN_INSURANCE_SHEETS_SPREADSHEET_ID=1oX5MGRMo6oz87ivTXeMOy6vtIDPJXXawz_lGqmOvUEo
```

### Issue 3: Login Fails
**Solution**: Database not seeded
```bash
# Check logs for "Admin exists" message
# If not, database needs to be recreated
# Delete volume and redeploy
```

### Issue 4: CORS Errors
**Solution**: Update FRONTEND_URL
```bash
FRONTEND_URL=https://your-actual-frontend-url.railway.app
```

## Database Backup

### Export from Local
```bash
# Copy your local database to Railway
# Option 1: Use Railway CLI
railway run node -e "require('fs').copyFileSync('data/hirehero.db', '/app/data/hirehero.db')"

# Option 2: Manual upload via Railway dashboard
```

### Download from Railway
```bash
# Use Railway CLI
railway run cat /app/data/hirehero.db > backup.db
```

## Monitoring

### Health Check
```
GET https://your-backend-url.railway.app/
```

Should return:
```json
{
  "message": "Viral Bug Automations API",
  "version": "1.0.0",
  "status": "running"
}
```

### Check Users
```
GET https://your-backend-url.railway.app/api/debug/users
```

## Rollback Plan

If deployment fails:
1. Check Railway logs for errors
2. Verify all environment variables are set
3. Ensure persistent volume is attached
4. Delete volume and redeploy (will recreate database)
5. Re-import data from Google Sheets

## Success Checklist

- [ ] Railway project created
- [ ] Persistent volume attached to `/app/data`
- [ ] All environment variables set
- [ ] Deployment successful (check logs)
- [ ] Database migrations completed
- [ ] Users seeded (Admin, KMG, Joban)
- [ ] Login works with all 3 accounts
- [ ] Google Sheets sync works
- [ ] Dashboard shows data
- [ ] No console errors

---

**Last Updated**: December 3, 2025
**Status**: Ready for deployment
