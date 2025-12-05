# Joban Insurance Fields Update

## Changes Made

### Frontend (Client)
- **InsuranceDashboard.tsx**: Updated Add/Edit Customer modals to show different fields based on client type (KMG vs Joban)
- Added conditional rendering using `isJoban` flag
- Added Joban-specific fields to customer state

### Backend (Server)
- **connection.js**: Added Joban-specific columns to insurance_customers table:
  - `last_year_premium`
  - `cheque_hold`
  - `payment_date`
  - `cheque_no`
  - `cheque_bounce`
  - `owner_alert_sent`

- **routes/insurance.js**: Updated POST and PUT endpoints to handle Joban fields

### Layout Updates
- **Topbar.tsx**: Removed WalletBadge
- **AppLayout.tsx**: Removed LowBalanceBanner

## Field Differences

### KMG Fields (Only)
- OD Expiry Date
- Reason

### Joban Fields (Only)
- Last Year Premium
- Cheque Hold
- Payment Date
- Cheque No
- Cheque Bounce
- Owner Alert Sent

### Common Fields
- Name, Mobile, Email
- Vertical, Product, Registration No
- Current Policy No, Company
- Premium Amount, Premium Mode
- Date of Expiry / Renewal Date
- TP Expiry Date
- Activated Date
- Status
- New Policy No, New Company
- Policy Doc Link
- Thank You Sent

## Git Commands to Push

```bash
# Check status
git status

# Add all changes
git add .

# Commit with message
git commit -m "feat: Add Joban-specific fields and remove wallet UI for insurance clients

- Add conditional field rendering based on client type (KMG vs Joban)
- Add Joban-specific fields: last_year_premium, cheque_hold, payment_date, cheque_no, cheque_bounce, owner_alert_sent
- Update database schema to support Joban fields
- Update insurance routes to handle new fields
- Remove WalletBadge and LowBalanceBanner from insurance client UI
- Improve form organization with client-specific field groups"

# Push to remote
git push origin main

# Or if your branch is different
git push origin <your-branch-name>
```

## Testing Checklist

- [ ] KMG client sees KMG-specific fields (OD Expiry, Reason)
- [ ] Joban client sees Joban-specific fields (Last Year Premium, Cheque fields, Owner Alert)
- [ ] Both clients can create customers successfully
- [ ] Both clients can edit customers successfully
- [ ] Data syncs correctly to respective Google Sheets
- [ ] No wallet/balance UI visible for insurance clients

---
**Date:** ${new Date().toLocaleDateString()}
**Status:** ✅ Ready to Deploy
