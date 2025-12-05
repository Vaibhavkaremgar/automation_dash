# ✅ COMPLETE FIX - Joban Fields Issue

## What Was Fixed

1. ✅ Added `company_name` to auth responses
2. ✅ Backend now uses `company_name` to determine client type
3. ✅ Created automatic migration to set company_name
4. ✅ Added debug box in Add Customer modal
5. ✅ Sheet names already linked via .env variables

## Files Changed

### Backend:
- `server/src/routes/auth.js` - Returns company_name in login/me
- `server/src/routes/insuranceConfig.js` - Uses company_name instead of email
- `server/src/config/insuranceClients.js` - Updated getClientConfig
- `server/migrations/004-set-insurance-company-names.js` - NEW migration
- `server/run-migration.js` - NEW migration runner
- `server/package.json` - Added migrate-insurance script

### Frontend:
- `client/src/pages/InsuranceDashboard.tsx` - Added debug box and better logging

## How It Works Now

```
User Login
    ↓
Backend checks company_name in database
    ↓
If company_name contains "joban" → clientKey = "joban"
If company_name contains "kmg" → clientKey = "kmg"
    ↓
Frontend receives clientKey
    ↓
isJoban = (clientKey === "joban")
    ↓
Conditional rendering:
  {isJoban && <JobanField />}
  {!isJoban && <KMGField />}
```

## Field Mapping

### Joban Putra Insurance Fields:
1. Name ✅
2. Mobile Number ✅
3. Email ✅
4. Product ✅
5. Vertical ✅
6. Policy No ✅ (labeled as "Policy No")
7. Company ✅
8. REGN no ✅ (labeled as "REGN no")
9. **Last Year Premium** ✅ (Joban ONLY)
10. Premium Amount ✅
11. Premium Mode ✅
12. Date of Expiry ✅ (labeled as "Date of Expiry")
13. TP Expiry Date ✅
14. Activated Date ✅ (labeled as "Activated Date")
15. Status ✅
16. ThankYouSent ✅
17. **Cheque Hold** ✅ (Joban ONLY)
18. **Payment Date** ✅ (Joban ONLY)
19. **Cheque No** ✅ (Joban ONLY)
20. **Cheque Bounce** ✅ (Joban ONLY)
21. New Policy No ✅
22. New Policy Company ✅ (labeled as "New Policy Company")
23. Policy doc link ✅
24. **Owner Alert Sent** ✅ (Joban ONLY)

### KMG Insurance Fields:
1. Name ✅
2. Mobile Number ✅
3. Email ✅
4. Product ✅
5. Vertical ✅
6. Current Policy No ✅ (labeled as "Current Policy No")
7. Company ✅
8. Registration No ✅ (labeled as "Registration No")
9. Premium Amount ✅
10. Premium Mode ✅
11. Renewal Date ✅ (labeled as "Renewal Date")
12. **OD Expiry Date** ✅ (KMG ONLY)
13. TP Expiry Date ✅
14. Insurance Activated Date ✅ (labeled as "Insurance Activated Date")
15. Status ✅
16. ThankYouSent ✅
17. New Policy No ✅
18. New Company ✅ (labeled as "New Company")
19. Policy doc link ✅
20. **Reason** ✅ (KMG ONLY)

## To Apply the Fix

### Option 1: Run Migration (RECOMMENDED)
```bash
cd server
npm run migrate-insurance
```

### Option 2: Manual SQL
```sql
UPDATE users SET company_name = 'Joban Putra Insurance' WHERE email LIKE '%joban%';
UPDATE users SET company_name = 'KMG Insurance' WHERE email LIKE '%kmg%';
```

## Verification Steps

1. Run migration
2. Restart server
3. Logout and login
4. Open Add Customer modal
5. Check debug box shows correct client
6. Verify correct fields appear

## Git Commands

```bash
git add .
git commit -m "fix: Complete insurance client field detection system

- Add company_name to auth responses
- Use company_name for client detection
- Add automatic migration for company_name
- Add debug box in Add Customer modal
- Ensure correct fields show for Joban vs KMG"
git push origin main
```

---

**Status:** ✅ COMPLETE
**Time to Apply:** 2 minutes
**Date:** ${new Date().toLocaleString()}
