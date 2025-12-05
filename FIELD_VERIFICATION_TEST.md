# Insurance Client Field Verification Test

## Expected Field Mapping

### KMG Insurance Agency Fields (ONLY)
**Unique to KMG:**
1. ✅ OD Expiry Date - `od_expiry_date`
2. ✅ Reason - `reason`

**Common Fields:**
- Name, Mobile, Email
- Vertical, Product, Registration No
- Current Policy No, Company
- Premium Amount, Premium Mode
- Renewal Date (uses OD Expiry Date)
- TP Expiry Date
- Insurance Activated Date
- Status
- New Policy No, New Company
- Policy Doc Link
- Thank You Sent

---

### Joban Putra Insurance Fields (ONLY)
**Unique to Joban:**
1. ✅ Last Year Premium - `last_year_premium`
2. ✅ Cheque Hold - `cheque_hold`
3. ✅ Payment Date - `payment_date`
4. ✅ Cheque No - `cheque_no`
5. ✅ Cheque Bounce - `cheque_bounce`
6. ✅ Owner Alert Sent - `owner_alert_sent`

**Common Fields:**
- Name, Mobile, Email
- Vertical, Product, Registration No
- Current Policy No (maps to policy_no in sheet)
- Company
- Premium Amount (maps to premium_amount in sheet)
- Premium Mode
- Date of Expiry (maps to date_of_expiry in sheet)
- TP Expiry Date
- Activated Date (maps to activated_date in sheet)
- Status
- New Policy No
- New Company (maps to new_policy_company in sheet)
- Policy Doc Link
- Thank You Sent

---

## Current Implementation Check

### Add Customer Modal - Line Order:
1. Name * (required)
2. Mobile * (required)
3. Email
4. Vertical (dropdown)
5. Product
6. Registration No
7. Current Policy No
8. Company
9. Premium Amount
10. Premium Mode
11. **[JOBAN ONLY]** Last Year Premium
12. Renewal Date / Date of Expiry (label changes)
13. **[KMG ONLY]** OD Expiry Date
14. TP Expiry Date
15. Insurance Activated Date / Activated Date (label changes)
16. Status (dropdown)
17. **[JOBAN ONLY]** Cheque Hold
18. **[JOBAN ONLY]** Payment Date
19. **[JOBAN ONLY]** Cheque No
20. **[JOBAN ONLY]** Cheque Bounce
21. New Policy No
22. New Company
23. Policy Doc Link
24. Thank You Sent
25. **[JOBAN ONLY]** Owner Alert Sent
26. **[KMG ONLY]** Reason

---

## Test Cases

### Test Case 1: KMG Client Login
**User Email:** Contains "kmg" (e.g., kmg@example.com)

**Expected Behavior:**
1. Modal title shows: "Add New Customer (KMG Insurance Agency)"
2. Debug line shows: `Client: kmg | isJoban: No`
3. Fields visible:
   - ✅ OD Expiry Date (after Renewal Date)
   - ✅ Reason (at bottom)
4. Fields hidden:
   - ❌ Last Year Premium
   - ❌ Cheque Hold
   - ❌ Payment Date
   - ❌ Cheque No
   - ❌ Cheque Bounce
   - ❌ Owner Alert Sent

### Test Case 2: Joban Client Login
**User Email:** Contains "joban" (e.g., joban@example.com)

**Expected Behavior:**
1. Modal title shows: "Add New Customer (Joban Putra Insurance)"
2. Debug line shows: `Client: joban | isJoban: Yes`
3. Fields visible:
   - ✅ Last Year Premium (after Premium Mode)
   - ✅ Cheque Hold (after Status)
   - ✅ Payment Date (after Cheque Hold)
   - ✅ Cheque No (after Payment Date)
   - ✅ Cheque Bounce (after Cheque No)
   - ✅ Owner Alert Sent (after Thank You Sent)
4. Fields hidden:
   - ❌ OD Expiry Date
   - ❌ Reason

### Test Case 3: Field Labels
**KMG:**
- "Renewal Date"
- "Insurance Activated Date"

**Joban:**
- "Date of Expiry"
- "Activated Date"

---

## Verification Commands

### Check Browser Console:
```javascript
// Should log when page loads:
"Client config loaded: {clientKey: 'kmg' or 'joban', ...}"
```

### Check Modal:
1. Open Add Customer modal
2. Look for debug line at top
3. Count visible fields
4. Verify conditional fields appear/disappear

---

## Current Code Status

**File:** `client/src/pages/InsuranceDashboard.tsx`

**isJoban Definition (Line 47):**
```typescript
const isJoban = clientConfig?.clientKey === 'joban' || clientConfig?.key === 'joban';
```

**Conditional Rendering:**
- `{isJoban && <Input ... />}` - Shows ONLY for Joban
- `{!isJoban && <Input ... />}` - Shows ONLY for KMG
- `{isJoban ? 'Label1' : 'Label2'}` - Different labels

---

## If Fields Still Not Showing

### Debug Steps:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for: "Client config loaded: ..."
4. Check if clientKey is correct
5. Open Add Customer modal
6. Check debug line shows correct client
7. If isJoban is wrong, check user email in database

### Manual Test:
```sql
-- Check user email in database
SELECT id, email, client_type FROM users WHERE client_type = 'insurance';
```

Expected:
- KMG user email should contain "kmg"
- Joban user email should contain "joban"

---

**Status:** ✅ Implementation Complete
**Last Updated:** ${new Date().toLocaleString()}
