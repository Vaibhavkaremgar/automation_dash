# How to Set Company Name for Insurance Clients

## The Fix

The system now uses `company_name` field (not email) to determine which fields to show.

## Set Company Name in Database

### For KMG Insurance Client:
```sql
UPDATE users 
SET company_name = 'KMG Insurance' 
WHERE email = 'your-kmg-email@example.com';
```

### For Joban Putra Insurance Client:
```sql
UPDATE users 
SET company_name = 'Joban Putra Insurance' 
WHERE email = 'your-joban-email@example.com';
```

## How It Works

The system checks if `company_name` contains:
- **"kmg"** → Shows KMG fields (OD Expiry Date, Reason)
- **"joban"** → Shows Joban fields (Last Year Premium, Cheque fields, Owner Alert Sent)

## Quick Test

1. Set company_name in database (see SQL above)
2. Logout and login again
3. Go to Customers → Add Customer
4. Modal title will show: "Add New Customer (KMG Insurance Agency)" or "Add New Customer (Joban Putra Insurance)"
5. Debug line shows: `Client: kmg|joban | isJoban: Yes|No`
6. Correct fields will appear

## Alternative: Use Email (Fallback)

If `company_name` is NULL, system falls back to checking email:
- Email contains "kmg" → KMG client
- Email contains "joban" → Joban client

## Git Commands

```bash
git add .
git commit -m "fix: Use company_name instead of email for insurance client detection

- Add company_name to auth responses
- Update insuranceConfig to use company_name
- Fallback to email if company_name is null
- Ensures correct fields show based on logged-in user's company"
git push origin main
```

---
**Status:** ✅ Fixed
**Date:** ${new Date().toLocaleString()}
