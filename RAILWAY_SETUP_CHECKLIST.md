# Railway Deployment Checklist ✅

## URLs Configuration Complete ✅

### Frontend URL
```
https://enthusiastic-cat-production-f806.up.railway.app
```

### Backend URL
```
https://automationdash-production.up.railway.app
```

## Files Updated ✅

- [x] `server/.env` - FRONTEND_URL updated
- [x] `server/src/index.js` - CORS configuration updated
- [x] `client/.env.local` - VITE_API_URL updated
- [x] `client/.env.production` - VITE_API_URL updated
- [x] `client/src/lib/api.ts` - Default baseURL updated

## Railway Environment Variables to Set

### Backend Service (automationdash-production)

Copy these from your `server/.env` file to Railway environment variables:

```bash
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://enthusiastic-cat-production-f806.up.railway.app

# Database
DB_PATH=../data/hirehero.db

# JWT
JWT_SECRET=<your-jwt-secret>

# Google Sheets
GOOGLE_PROJECT_ID=<your-project-id>
GOOGLE_CLIENT_EMAIL=<your-client-email>
GOOGLE_PRIVATE_KEY=<your-private-key>
GOOGLE_SHEETS_SPREADSHEET_ID=<your-spreadsheet-id>
GOOGLE_SHEETS_TAB=output
GOOGLE_SHEETS_EMAIL_TAB=email_logs

# n8n Webhook
N8N_WEBHOOK_URL=<your-webhook-url>

# Payment Gateways
RAZORPAY_KEY_ID=<your-key-id>
RAZORPAY_KEY_SECRET=<your-key-secret>
RAZORPAY_WEBHOOK_SECRET=<your-webhook-secret>

# Voice API
VOICE_API_KEY=<your-voice-api-key>
VOICE_ORG_ID=<your-org-id>
VOICE_BASE_URL=https://api.vapi.ai

# Insurance Sheets
KMG_GENERAL_INSURANCE_SHEETS_SPREADSHEET_ID=<your-spreadsheet-id>
KMG_GENERAL_INSURANCE_SHEETS_TAB=kmg_general_ins
KMG_LIFE_INSURANCE_SHEETS_SPREADSHEET_ID=<your-spreadsheet-id>
KMG_LIFE_INSURANCE_SHEETS_TAB=kmg_Life_ins
KMG_CLAIMS_SHEETS_SPREADSHEET_ID=<your-spreadsheet-id>
KMG_CLAIMS_SHEETS_TAB=kmg_claims

JOBAN_GENERAL_INSURANCE_SHEETS_SPREADSHEET_ID=<your-spreadsheet-id>
JOBAN_GENERAL_INSURANCE_SHEETS_TAB=general_ins
JOBAN_LIFE_INSURANCE_SHEETS_SPREADSHEET_ID=<your-spreadsheet-id>
JOBAN_LIFE_INSURANCE_SHEETS_TAB=Life_ins
JOBAN_CLAIMS_SHEETS_SPREADSHEET_ID=<your-spreadsheet-id>
JOBAN_CLAIMS_SHEETS_TAB=joban_claims

# Security
ENABLE_IP_RESTRICTIONS=false
ENABLE_SESSION_LIMITS=false
BYPASS_IP_FOR_LOCALHOST=true
```

### Frontend Service (enthusiastic-cat-production)

```bash
VITE_API_URL=https://automationdash-production.up.railway.app
```

## Deployment Steps

### 1. Commit Changes
```bash
git add .
git commit -m "Configure Railway production URLs"
git push
```

### 2. Railway Backend Setup
1. Go to Railway dashboard
2. Select your backend service (automationdash-production)
3. Go to **Variables** tab
4. Add all environment variables listed above
5. Click **Deploy** or wait for auto-deploy

### 3. Railway Frontend Setup
1. Select your frontend service (enthusiastic-cat-production)
2. Go to **Variables** tab
3. Add `VITE_API_URL` variable
4. Go to **Settings** tab
5. Set **Build Command**: `npm run build`
6. Set **Start Command**: `npm run start` or use a static server
7. Click **Deploy**

### 4. Database Persistence (Important!)
1. Go to backend service settings
2. Add a **Volume** for database persistence
3. Mount path: `/app/data`
4. This ensures your SQLite database persists across deployments

### 5. Custom Domain (Optional)
If you want custom domains:
1. Go to service **Settings**
2. Click **Generate Domain** or add custom domain
3. Update the URLs in environment variables accordingly

## Testing Checklist

After deployment, test these features:

- [ ] Frontend loads at: https://enthusiastic-cat-production-f806.up.railway.app
- [ ] Backend health check: https://automationdash-production.up.railway.app/
- [ ] Login with admin credentials
- [ ] Login with insurance client credentials
- [ ] Check browser console for CORS errors
- [ ] Test wallet functionality
- [ ] Test resume upload
- [ ] Test Google Sheets integration
- [ ] Test voice interview feature
- [ ] Test insurance dashboard
- [ ] Test claims management

## Common Issues & Solutions

### Issue: CORS Error
**Solution:** 
- Verify `FRONTEND_URL` is set correctly in backend Railway variables
- Check backend logs for CORS configuration
- Ensure both services are deployed and running

### Issue: API Connection Failed
**Solution:**
- Check backend service is running
- Verify `VITE_API_URL` in frontend variables
- Test backend health endpoint directly

### Issue: Database Not Persisting
**Solution:**
- Add a Railway volume to backend service
- Mount at `/app/data` or update `DB_PATH` accordingly
- Redeploy after adding volume

### Issue: Environment Variables Not Loading
**Solution:**
- Ensure variables are set in Railway dashboard (not just in .env files)
- Redeploy after adding/changing variables
- Check Railway logs for any errors

### Issue: Build Fails
**Solution:**
- Check Railway build logs
- Ensure all dependencies are in package.json
- Verify Node.js version compatibility

## Monitoring

### Backend Logs
```bash
# View in Railway dashboard
# Or use Railway CLI
railway logs --service=automationdash-production
```

### Frontend Logs
```bash
railway logs --service=enthusiastic-cat-production
```

## Rollback Plan

If something goes wrong:
1. Go to Railway dashboard
2. Select the service
3. Go to **Deployments** tab
4. Click on a previous successful deployment
5. Click **Redeploy**

## Support Resources

- Railway Docs: https://docs.railway.app/
- Railway Discord: https://discord.gg/railway
- Project README: See README.md in root directory

---

**Last Updated:** $(date)
**Status:** Ready for deployment ✅
