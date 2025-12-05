# Railway Deployment Guide

## Backend URL
```
https://automationdash-production.up.railway.app
```

## Frontend URL
```
https://automations-frontend-production-01fd.up.railway.app
```

## Deploy Steps

### 1. Commit Changes
```bash
git add .
git commit -m "Update API URLs for production"
git push origin main
```

### 2. Railway Backend Environment Variables

Set these in Railway Dashboard → Backend Service → Variables:

```
NODE_ENV=production
PORT=8080
DB_PATH=./data/hirehero.db

FRONTEND_URL=https://automations-frontend-production-01fd.up.railway.app

JWT_SECRET=af36f5a0060d60295b1a6cbce9ef88a734d07caa0d3db9107bb6d07e83094e505cfab3cf85385bcb340d33d31cbac2d7653b762935f55af4a7012ad7931c1e9f

GOOGLE_PROJECT_ID=n8n-local-integration-477807
GOOGLE_CLIENT_EMAIL=dash-one@n8n-local-integration-477807.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=<paste from server/.env>

GOOGLE_SHEETS_SPREADSHEET_ID=1amZkYzhw2lMmIbw0ftFAw8KJ1SX86zJ2rubWDQgs8CE
GOOGLE_SHEETS_TAB=output
GOOGLE_SHEETS_EMAIL_TAB=email_logs

N8N_WEBHOOK_URL=https://unhearing-unreproved-westin.ngrok-free.dev/webhook/Hr_agent

VOICE_API_KEY=0cbc12c8-db94-41b9-a289-efead1815ff5
VOICE_ORG_ID=b34f0285-61e1-4729-bb48-2f30d94ae988
VOICE_BASE_URL=https://api.vapi.ai

RAZORPAY_KEY_ID=rzp_test_ReMGjXR9MRhVgk
RAZORPAY_KEY_SECRET=mPYbsRQEudzf5ig8YOQfZk1d
RAZORPAY_WEBHOOK_SECRET=F7xsFkRM@kpuS6N

LOW_BALANCE_THRESHOLD=0.2
MIN_RECHARGE_CENTS=500
MAX_UPLOAD_MB=10

ENABLE_IP_RESTRICTIONS=false
ENABLE_SESSION_LIMITS=false
BYPASS_IP_FOR_LOCALHOST=true

KMG_INSURANCE_SHEETS_SPREADSHEET_ID=1EpMAg1gSXPKr83cTugvGexrqv3Yt5Tb85Re2Shah8mw
KMG_INSURANCE_SHEETS_TAB=updating_input

JOBAN_INSURANCE_SHEETS_SPREADSHEET_ID=1oX5MGRMo6oz87ivTXeMOy6vtIDPJXXawz_lGqmOvUEo
JOBAN_INSURANCE_SHEETS_TAB=Sheet1
```

### 3. Add Persistent Volume (CRITICAL)

Railway → Backend Service → Settings → Volumes:
- Mount Path: `/app/data`
- This persists your database across deployments

### 4. Backend Build Settings

Railway → Backend Service → Settings:
- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `node src/index.js`

### 5. Frontend Build Settings

Railway → Frontend Service → Settings:
- Root Directory: `client`
- Build Command: `npm install && npm run build`
- Start Command: (leave default)

### 6. Verify Deployment

Check backend logs for:
```
✅ Admin exists
✅ KMG Insurance exists
✅ Joban Putra Insurance Shoppe exists
🚀 Server running
```

### 7. Test Login

Go to: https://automations-frontend-production-01fd.up.railway.app

**Admin:**
- Email: vaibhavkar0009@gmail.com
- Password: Vaibhav@121

**KMG:**
- Email: kvreddy1809@gmail.com
- Password: kmg123

**Joban:**
- Email: jobanputra@gmail.com
- Password: joban123

## Troubleshooting

### 401 Errors
- Check CORS origins in backend include frontend URL
- Verify JWT_SECRET is set in Railway
- Check backend logs for errors

### Database Reset
- Ensure persistent volume is mounted at `/app/data`
- Check Railway logs for database path

### Users Not Created
- Check backend logs for seed messages
- Verify database migrations ran successfully
