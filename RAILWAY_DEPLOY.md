# 🚂 Railway Deployment Guide

## ⏱️ Timeline: ~45 minutes

## 📋 Prerequisites
- GitHub account
- Railway account (sign up with GitHub)
- Credit card (Railway requires it, but won't charge for hobby plan)

---

## Step 1: Push to GitHub (5 min)

```bash
cd c:\Users\hp\hr-agent-dashboard
git init
git add .
git commit -m "Deploy to Railway"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

---

## Step 2: Create Railway Account (3 min)

1. Go to: https://railway.app
2. Click "Login" → "Login with GitHub"
3. Authorize Railway
4. Add credit card (required, but hobby plan is $5/month with $5 free credit)

---

## Step 3: Deploy Backend (15 min)

### A. Create New Project
1. Dashboard → "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your `hr-agent-dashboard` repository
4. Click "Deploy Now"

### B. Configure Service
1. Click on the deployed service
2. Go to "Settings" tab
3. Set:
   - **Root Directory:** `server`
   - **Start Command:** `npm start`
   - **Build Command:** `npm install`

### C. Add Volume (for database persistence)
1. Click "Variables" tab
2. Scroll to "Volumes" section
3. Click "New Volume"
4. **Mount Path:** `/app/data`
5. Click "Add"

### D. Add Environment Variables

Click "Variables" → "New Variable" for each:

```
NODE_ENV=production
PORT=8080
DB_PATH=/app/data/hirehero.db

JWT_SECRET=af36f5a0060d60295b1a6cbce9ef88a734d07caa0d3db9107bb6d07e83094e505cfab3cf85385bcb340d33d31cbac2d7653b762935f55af4a7012ad7931c1e9f

GOOGLE_PROJECT_ID=n8n-local-integration-477807
GOOGLE_CLIENT_EMAIL=dash-one@n8n-local-integration-477807.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDVvxlDUSGaM0EU
jcSUTHTTfrKbP/W3o6ag8nvQRzADvu4sxbZ3+2eMvfbsDUI4S9r3PJHFUAcchyJk
5KJKwbkv39tnQH+iIlZTeE/nb9rVF9QQWiV+qdP0vxW2eR3FeuxRxPkfylBQowMz
utE9AFOiMwwaoEcQODogVEZhMPgLcj4tvot9yGsjLd0nZJsRP5DCt6qhrtUorn6u
GzuMgT2kqLUHxQbzjrYvOGi9q5rK/Du8jBE4LWkCC1eJFIdy0oLw1Qm5+VOlkTnU
LwyRKjOV2K6MACYvaLLrozWdA5qrULh4NDbMp7meGryu+TlY+X9wVF+B7ylyTeNa
N+9JI/vhAgMBAAECggEAXOXa8X5797xp/yhkdT3LkrYgo0gHn+JBA/ePp2ShMieT
9aKSnRAHn8xaWpqimrwhNU4+Xr7a8GOtJ6OVA5+xwGRvQ69tKYb59Po35DMhrXbX
RKohXK0sAVXhdnaqYU99EUbmLZJtGLbYp+18jiIrtzWvf40EhcCiRrXKBujVDYe0
m7t0weMKgfr7MngEm6Awl946yJC3lPrIF6FT0EOCaludffm05CfxU7z+9YLn/V2P
H5wwwaa5AbxbF54EYW+krC3G2qrHlr0du7tt4h+Thi4Be/w/+jpIKViSYJfRH2hx
SsVYNp6/aZRgS9nW3xAYq6MBej5gnTGlFI/i1hdirwKBgQDxtliunmUGXRYoo4vP
q2CSf9/ztGVaPrlxszg+7yNrf+kZ0kdyTgdOC90YtkpjU9X87HvCv2avnM+Y69Ci
pgALACe2OpmsUc7JpupoX8BnYTKCqUqJdgHj9qDx8pOXQW2OTUcif7ZAuoZM2Fpf
pRvipHgWfJfrQBz7qEXiDgGBrwKBgQDiYZD44Stsh6s9jy7PayqnYsgo+SDWLD4Q
2HN/9suYM4hrPbHKia/ItFMhz0n6o5V9fuOKSmL7c1vVAwXDF6BP2QkUtK2h+94L
RhO9DWsF7lxgdFkMczSlEaVbXDmmSA6mU2aaAXuzvwiN1k4CRzyS8ZpCx/u8gzHJ
smnF0LSPbwKBgQC1DYNL+TVvGNb6Rdb6DULfOY3E/IFWodlCg55D9diwMzWls870
neH24ggQ9Kqv0CJfu7vQWpJORMVzpF+5FWK+2rTkWOy3GOguQCshV2fFiBbPrIM6
h/xOh3RzBuLqz4WCq/v2qXcY8R6b/QtkzUYf9FZHcbhR7MpI7vi5pQgX3QKBgEfq
3vdx8S2lXA1Oc3yJex96DkSWAIyJuZ34ZZj9emh71pbbHqRNYX7NaquPAt2RImif
6wF/6Dohx8bAExCLbO5w8KWXUKHpNf024gZpQNq9grNRwwhlgQ//rxx7DAV7VswY
Krw6RGYyBjGpJ1cp8mBsSKl2hs64jxSYjWm+h94ZAoGAL6mEFXrgZi4Cj7R/fN+Q
vyBDndv3zVDY7poriPIp+uHyezgxMtwOhG0vTN2myhVS4bZt1rdpZGxheWGju6tU
KF2CQLWJpwh9zc5SF4+f+TUwtS557TrCevx4wVC+zZKu0rLtPyYHAY+3+rsPGXlQ
66OaMDXRxaDYVGFdpYzw3VQ=
-----END PRIVATE KEY-----

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

### E. Get Backend URL
1. Go to "Settings" tab
2. Copy the public domain (e.g., `https://hr-backend-production.up.railway.app`)

---

## Step 4: Deploy Frontend (15 min)

### A. Add New Service
1. In same project, click "New"
2. Select "GitHub Repo"
3. Choose same repository
4. Click "Deploy"

### B. Configure Frontend Service
1. Click on the new service
2. Go to "Settings" tab
3. Set:
   - **Root Directory:** `client`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npx serve -s dist -l $PORT`

### C. Add Environment Variable
```
VITE_API_URL=https://hr-backend-production.up.railway.app
```
(Use YOUR actual backend URL from Step 3E)

### D. Install serve package
1. Add to `client/package.json` dependencies:
```json
"serve": "^14.2.0"
```

---

## Step 5: Update Backend CORS (5 min)

1. Go to backend service
2. Click "Variables" tab
3. Add new variable:
```
FRONTEND_URL=https://hr-frontend-production.up.railway.app
```
(Use YOUR actual frontend URL)

4. Service will auto-redeploy

---

## Step 6: Test (5 min)

1. Visit your frontend URL
2. Login:
   - Email: `vaibhavkar0009@gmail.com`
   - Password: `Vaibhav@121`
3. Test features

---

## ✅ Success Checklist

- [ ] Backend deployed and running
- [ ] Frontend deployed and accessible
- [ ] Volume mounted for database
- [ ] All environment variables set
- [ ] Login works
- [ ] Dashboard loads
- [ ] Can add customers
- [ ] Google Sheets sync works

---

## 🐛 Troubleshooting

**Backend not starting?**
- Check "Deployments" tab for logs
- Verify volume is mounted at `/app/data`
- Check all environment variables

**Frontend build fails?**
- Ensure `serve` is in package.json
- Check build logs
- Verify VITE_API_URL is set

**Database errors?**
- Verify DB_PATH=/app/data/hirehero.db
- Check volume is mounted
- Look for migration errors in logs

**CORS errors?**
- Update FRONTEND_URL in backend
- Wait for auto-redeploy
- Hard refresh browser

---

## 💰 Cost

**Hobby Plan:** $5/month
- Includes $5 free credit
- Effectively free for first month
- ~500 hours of usage included

---

## 📝 Important Notes

- Railway requires credit card (even for free tier)
- Services auto-deploy on git push
- Database persists on volume
- First deploy takes 5-10 minutes

---

## 🎉 Done!

Your dashboard is live on Railway!
