# 🔧 Deployment Fix - Updated URLs

## ✅ Changes Made

### 1. Environment Files Updated
- `client/.env.local`: `https://automationdash.up.railway.app`
- `client/.env.production`: `https://automationdash.up.railway.app`
- `server/src/index.js`: CORS updated to `https://automations-frontend-production-01fd.up.railway.app`

### 2. Branding Updated
- Removed all "HireHero" references
- Changed to "Automation Dashboard"

### 3. Mobile Responsive Fixed
- Added word-wrap to prevent text overlap
- Improved button sizing
- Fixed flex wrapping

### 4. Wallet Locked
- Added `pointer-events-none` to WalletBadge
- Wallet is display-only, not clickable

### 5. Message Tables Cleaned
- Deleted `kmg_message_logs` table
- Deleted `joban_message_logs` table
- Using single `message_logs` table with proper filtering

---

## 🚨 CRITICAL: Rebuild Frontend

The error "backend is running at https://hr-agent-dashboard-production.up.railway.app" means the **built files** still have the old URL.

### Fix Steps:

1. **Delete old build:**
```bash
cd client
rmdir /s /q dist
```

2. **Rebuild with new environment:**
```bash
npm run build
```

3. **Verify .env.production is correct:**
```
VITE_API_URL=https://automationdash.up.railway.app
```

4. **Deploy to Railway:**
```bash
git add .
git commit -m "Update URLs and fix mobile responsive"
git push
```

---

## 📋 Webhook URL for n8n

**Joban Putra Message Logging:**
```
POST https://automationdash.up.railway.app/api/insurance/log-message
```

**Payload:**
```json
{
  "customer_name": "Customer Name",
  "mobile": "9876543210",
  "message_type": "reminder_30",
  "channel": "whatsapp",
  "message_content": "Your policy expires in 30 days",
  "status": "sent",
  "client_key": "joban"
}
```

**KMG Message Logging:**
Same URL, use `"client_key": "kmg"`

---

## ✅ Verification Checklist

After rebuild and deploy:

- [ ] Frontend loads at: `https://automations-frontend-production-01fd.up.railway.app`
- [ ] Login works (no old URL error)
- [ ] Backend API calls go to: `https://automationdash.up.railway.app`
- [ ] Mobile text doesn't overlap
- [ ] Wallet badge is not clickable
- [ ] n8n webhook logs messages correctly
- [ ] No "HireHero" text visible anywhere

---

## 🔍 If Login Still Fails

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Hard refresh** (Ctrl+F5)
3. **Check Railway logs** for backend errors
4. **Verify environment variables** in Railway dashboard
5. **Test API directly**: `https://automationdash.up.railway.app/`

---

## 📝 Summary

**Old URLs:**
- Backend: `https://hr-agent-dashboard-production.up.railway.app`
- Frontend: `https://hr-agent-dashboard-production-01fd.up.railway.app`

**New URLs:**
- Backend: `https://automationdash.up.railway.app`
- Frontend: `https://automations-frontend-production-01fd.up.railway.app`

**Action Required:** Rebuild frontend with `npm run build` to apply new environment variables!
