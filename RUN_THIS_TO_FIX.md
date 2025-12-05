# 🔧 RUN THIS TO FIX JOBAN FIELDS

## Step 1: Run Migration (Automatic Fix)

Open terminal in the `server` folder and run:

```bash
cd server
npm run migrate-insurance
```

This will:
- ✅ Automatically detect users with "joban" in email → Set company_name to "Joban Putra Insurance"
- ✅ Automatically detect users with "kmg" in email → Set company_name to "KMG Insurance"
- ✅ Show you the results

## Step 2: Restart Server

```bash
# Stop your server (Ctrl+C)
# Then start again:
npm run dev
```

## Step 3: Test

1. **Logout** from dashboard
2. **Login** as Joban user
3. Open browser console (F12)
4. Look for: `🔍 CLIENT CONFIG LOADED: {clientKey: "joban", ...}`
5. Go to **Customers** → **Add Customer**
6. You'll see **BLUE DEBUG BOX** showing:
   ```
   Client Key: joban
   Client Name: Joban Putra Insurance
   isJoban: YES ✅
   ```
7. Scroll down and verify fields:
   - ✅ Last Year Premium
   - ✅ Cheque Hold
   - ✅ Payment Date
   - ✅ Cheque No
   - ✅ Cheque Bounce
   - ✅ Owner Alert Sent
   - ❌ NO OD Expiry Date
   - ❌ NO Reason

## Step 4: Git Push

```bash
git add .
git commit -m "fix: Auto-set company_name for insurance clients and add debug info"
git push origin main
```

## What the Migration Does

The migration script (`server/migrations/004-set-insurance-company-names.js`) runs this SQL:

```sql
-- For Joban users
UPDATE users 
SET company_name = 'Joban Putra Insurance' 
WHERE client_type = 'insurance' 
AND (email LIKE '%joban%' OR email LIKE '%jobanputra%');

-- For KMG users
UPDATE users 
SET company_name = 'KMG Insurance' 
WHERE client_type = 'insurance' 
AND (email LIKE '%kmg%');
```

## If Migration Fails

Manually run in your database:

```sql
-- Check current state
SELECT id, email, company_name FROM users WHERE client_type = 'insurance';

-- Fix manually (replace with actual emails)
UPDATE users SET company_name = 'Joban Putra Insurance' WHERE email = 'joban@example.com';
UPDATE users SET company_name = 'KMG Insurance' WHERE email = 'kmg@example.com';
```

## Sheet Names Are Already Linked

The system automatically uses the correct sheet based on company_name:
- **Joban Putra Insurance** → Uses `JOBAN_INSURANCE_SHEETS_SPREADSHEET_ID` and `JOBAN_INSURANCE_SHEETS_TAB` from .env
- **KMG Insurance** → Uses `KMG_INSURANCE_SHEETS_SPREADSHEET_ID` and `KMG_INSURANCE_SHEETS_TAB` from .env

Check your `.env` file:
```
KMG_INSURANCE_SHEETS_SPREADSHEET_ID=1EpMAg1gSXPKr83cTugvGexrqv3Yt5Tb85Re2Shah8mw
KMG_INSURANCE_SHEETS_TAB=updating_input

JOBAN_INSURANCE_SHEETS_SPREADSHEET_ID=1oX5MGRMo6oz87ivTXeMOy6vtIDPJXXawz_lGqmOvUEo
JOBAN_INSURANCE_SHEETS_TAB=Sheet1
```

---

**Time to fix:** 2 minutes
**Status:** Ready to run
