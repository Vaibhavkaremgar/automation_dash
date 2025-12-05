# FIX JOBAN FIELDS - STEP BY STEP

## The Problem
You're seeing KMG fields in Joban dashboard because `company_name` in database is not set correctly.

## STEP 1: Check Database

Run this SQL:
```sql
SELECT id, email, company_name, client_type FROM users WHERE client_type = 'insurance';
```

You'll see something like:
```
id | email              | company_name | client_type
1  | joban@example.com  | NULL         | insurance
2  | kmg@example.com    | NULL         | insurance
```

## STEP 2: Fix Company Name

**For Joban user:**
```sql
UPDATE users 
SET company_name = 'Joban Putra Insurance' 
WHERE email = 'YOUR_JOBAN_EMAIL_HERE';
```

**For KMG user:**
```sql
UPDATE users 
SET company_name = 'KMG Insurance' 
WHERE email = 'YOUR_KMG_EMAIL_HERE';
```

## STEP 3: Verify

```sql
SELECT id, email, company_name FROM users WHERE client_type = 'insurance';
```

Should show:
```
id | email              | company_name
1  | joban@example.com  | Joban Putra Insurance
2  | kmg@example.com    | KMG Insurance
```

## STEP 4: Test

1. **Logout** from dashboard
2. **Login** as Joban user
3. Open browser console (F12)
4. Look for: `🔍 CLIENT CONFIG LOADED:`
5. Should show: `clientKey: "joban"`
6. Go to **Customers** → Click **Add Customer**
7. You'll see blue DEBUG box showing:
   - Client Key: **joban**
   - Client Name: **Joban Putra Insurance**
   - isJoban: **YES ✅**
8. Scroll down - you'll see:
   - ✅ Last Year Premium
   - ✅ Cheque Hold
   - ✅ Payment Date
   - ✅ Cheque No
   - ✅ Cheque Bounce
   - ✅ Owner Alert Sent
   - ❌ NO OD Expiry Date
   - ❌ NO Reason

## STEP 5: Git Push

```bash
git add .
git commit -m "fix: Add debug info and use company_name for client detection"
git push origin main
```

## If Still Not Working

### Check Console Logs:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for `🔍 CLIENT CONFIG LOADED:`
4. Check what `clientKey` shows

### If clientKey is wrong:
- Double-check company_name in database
- Make sure it contains "joban" or "kmg"
- Logout and login again

### Quick Test SQL:
```sql
-- This should return 'joban' for Joban user
SELECT 
  CASE 
    WHEN LOWER(company_name) LIKE '%joban%' THEN 'joban'
    WHEN LOWER(company_name) LIKE '%kmg%' THEN 'kmg'
    ELSE 'unknown'
  END as detected_client
FROM users 
WHERE email = 'YOUR_EMAIL_HERE';
```

---

**Status:** Ready to fix
**Time:** 2 minutes
