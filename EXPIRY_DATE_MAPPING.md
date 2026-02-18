# Expiry Date Column Mapping

## 📋 Summary

The system uses different columns for expiry dates depending on the client and insurance type.

---

## 🏢 KMG Insurance

### General Insurance (Motor, Health, Non-Motor)
- **Primary Expiry Date**: `MODIFIED EXPIRY DATE` → stored as `renewal_date`
- **Original Expiry Date**: `DATE OF EXPIRY` → stored as `od_expiry_date`
- **TP Expiry Date**: `TP Expiry Date` → stored as `tp_expiry_date`

**Logic**: System first checks `MODIFIED EXPIRY DATE`, if not available falls back to `DATE OF EXPIRY`

### Life Insurance
- **Expiry Date**: `DATE OF EXPIRY` → stored as `renewal_date`

---

## 🏢 Joban Putra Insurance

### General Insurance (Motor, Health, Non-Motor)
- **Primary Expiry Date**: `MODIFIED EXPIRY DATE` → stored as `renewal_date`
- **Original Expiry Date**: `DATE OF EXPIRY` → stored as `od_expiry_date`
- **TP Expiry Date**: `TP Expiry Date` → stored as `tp_expiry_date`

**Logic**: System first checks `MODIFIED EXPIRY DATE`, if not available falls back to `DATE OF EXPIRY`

### Life Insurance
- **Expiry Date**: `DATE OF EXPIRY` → stored as `renewal_date`

---

## 🔍 How the System Picks Expiry Date

The frontend code in `InsuranceDashboard.tsx` uses this logic:

```javascript
const getDisplayDate = (customer: Customer) => {
  if (customer.vertical === 'motor') {
    return customer.od_expiry_date || customer.renewal_date;
  }
  return customer.renewal_date;
}
```

### For Motor Insurance:
1. First tries `od_expiry_date` (DATE OF EXPIRY)
2. Falls back to `renewal_date` (MODIFIED EXPIRY DATE)

### For Life/Health/Other Insurance:
- Uses `renewal_date` directly

---

## 📊 Column Priority

**General Insurance:**
1. `MODIFIED EXPIRY DATE` (if you manually adjusted the date)
2. `DATE OF EXPIRY` (original policy expiry)
3. `TP Expiry Date` (third-party expiry, stored separately)

**Life Insurance:**
- `DATE OF EXPIRY` (only one expiry date field)

---

## 💡 Important Notes

1. **Date Format**: All dates should be in `DD/MM/YYYY` format in Google Sheets
2. **Modified Expiry**: Use this column when you want to override the original expiry date
3. **Motor Insurance**: The system prioritizes the OD expiry date for display
4. **Renewals Calculation**: Days until expiry are calculated from the display date

---

## 🔧 Configuration File Location

`server/src/config/insuranceClients.js`

This file contains all the column mappings for both KMG and Joban clients.
