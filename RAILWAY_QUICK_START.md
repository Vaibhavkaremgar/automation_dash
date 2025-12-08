# 🚂 Railway Quick Start (45 Minutes)

## What You Need
- GitHub repo URL
- Railway account (sign up at railway.app)
- Credit card (required, but $5 free credit included)

---

## 🚀 Step-by-Step

### 1. Push Code (5 min)
```bash
cd c:\Users\hp\hr-agent-dashboard
git init
git add .
git commit -m "Deploy to Railway"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### 2. Railway Setup (3 min)
1. Go to https://railway.app
2. Login with GitHub
3. Add credit card (gets $5 free credit)

### 3. Deploy Backend (15 min)

**Create Project:**
1. Dashboard → "New Project" → "Deploy from GitHub repo"
2. Select your repo → "Deploy Now"

**Configure:**
1. Click service → "Settings"
2. Root Directory: `server`
3. Start Command: `npm start`

**Add Volume:**
1. "Variables" tab → "Volumes" → "New Volume"
2. Mount Path: `/app/data`

**Environment Variables:**
Copy-paste all these (click "New Variable" for each):

```
NODE_ENV=production
PORT=8080
DB_PATH=/app/data/hirehero.db
FRONTEND_URL=https://YOUR-FRONTEND.up.railway.app

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

**Copy Backend URL** from Settings tab

### 4. Deploy Frontend (15 min)

**Add Service:**
1. Same project → "New" → "GitHub Repo" → Select same repo

**Configure:**
1. Click service → "Settings"
2. Root Directory: `client`
3. Build Command: `npm install && npm run build`
4. Start Command: `npx serve -s dist -l $PORT`

**Environment Variable:**
```
VITE_API_URL=https://automationdash-production.up.railway.app
```

**Copy Frontend URL** from Settings tab

### 5. Update Backend CORS (3 min)

1. Go to backend service → "Variables"
2. Update `FRONTEND_URL` to your frontend URL
3. Wait for redeploy

### 6. Test (5 min)

Visit frontend URL and login:
- Email: `vaibhavkar0009@gmail.com`
- Password: `Vaibhav@121`

---

## ✅ Checklist

- [ ] Code pushed to GitHub
- [ ] Backend deployed with volume
- [ ] All env vars added
- [ ] Frontend deployed
- [ ] CORS updated
- [ ] Login works

---

## 💰 Cost

$5/month (includes $5 free credit = free first month)

---

## 🎉 Done!

Your dashboard is live on Railway!
