# Fix: Joban Fields Not Showing

## Problem
The Joban-specific fields were not showing in the Add/Edit Customer modals because:
1. Backend returns `clientKey` but frontend was checking for `key`
2. No debug information to verify client type

## Solution Applied

### 1. Fixed Client Key Check
**File**: `client/src/pages/InsuranceDashboard.tsx`
```typescript
// Before:
const isJoban = clientConfig?.key === 'joban';

// After:
const isJoban = clientConfig?.clientKey === 'joban' || clientConfig?.key === 'joban';
```

### 2. Added Debug Information
- Added console log when client config loads
- Added debug display in modal showing client type and isJoban status
- This helps verify the correct client is detected

### 3. Backend Response
**File**: `server/src/routes/insuranceConfig.js`
Returns:
```json
{
  "clientKey": "joban" or "kmg",
  "clientName": "Joban Putra Insurance" or "KMG Insurance Agency",
  "schema": {...},
  "spreadsheetId": "...",
  "tabName": "..."
}
```

## How to Verify

1. Login as Joban client (email contains "joban")
2. Click "Add Customer"
3. Check modal title shows client name
4. Check debug line shows: `Client: joban | isJoban: Yes`
5. Verify these fields appear:
   - Last Year Premium
   - Cheque Hold
   - Payment Date
   - Cheque No
   - Cheque Bounce
   - Owner Alert Sent
6. Verify these fields DON'T appear:
   - OD Expiry Date
   - Reason

## Git Commands

```bash
git add .
git commit -m "fix: Joban-specific fields not showing in customer forms

- Fix clientKey check (backend returns clientKey not key)
- Add debug logging for client config
- Add debug display in modal to show client type
- Ensure conditional fields render correctly based on client"
git push origin main
```

## Root Cause
The backend API returns `clientKey` in the response, but the frontend was checking for `key` property. This mismatch caused `isJoban` to always be `false`, hiding all Joban-specific fields.

---
**Status:** ✅ Fixed
**Date:** ${new Date().toLocaleDateString()}
