# Joban Putra Insurance - Column Names

## General Insurance (Motor, Health, Non-Motor)
**Sheet Tab:** `general_ins`
**Spreadsheet ID:** `1CE5TFC5bFx7WixVLoVOzdiMntwgRISO9YVR_cWZhku4`

### Column Names (as they appear in Google Sheets):

1. **NAME** - Customer name
2. **MOBILE NO** - Mobile number
3. **EMAIL ID** - Email address
4. **POLICY NO** - Current policy number
5. **COMPANY** - Insurance company name
6. **VEH NO** - Vehicle registration number
7. **AMOUNT** - Premium amount
8. **Premium mode** - Payment mode
9. **LAST YEAR PREMIUM** - Previous year premium
10. **MODIFIED EXPIRY DATE** - Modified renewal date
11. **DATE OF EXPIRY** - Original expiry date (OD)
12. **TP Expiry Date** - Third party expiry date
13. **DEPOSITED/ PAYMENT DATE** - Payment date
14. **STATUS** - Policy status (DUE/Renewed/Not Renewed/In Process)
15. **Thankyou message sent yes/no** - Thank you message status
16. **NEW POLICY NO** - New policy number (after renewal)
17. **NEW POLICY COMPANY** - New insurance company
18. **Product Type** - Type of product/vehicle
19. **Product Model** - Model of product/vehicle
20. **TYPE** - Vertical type (motor/health/non-motor)
21. **REMARKS** - Notes/remarks
22. **CHQ NO & DATE** - Cheque number and date
23. **BANK NAME** - Bank name
24. **CUSTOMER ID** - Customer ID
25. **AGENT CODE** - Agent code
26. **PANCARD** - PAN card number
27. **AADHAR CARD** - Aadhar card number
28. **OTHERS - VI/DL/PP** - Other documents (Voter ID/Driving License/Passport)
29. **G CODE** - G Code

**Total: 29 columns**

---

## Life Insurance
**Sheet Tab:** `Life_ins`
**Spreadsheet ID:** `1CE5TFC5bFx7WixVLoVOzdiMntwgRISO9YVR_cWZhku4`

### Column Names (as they appear in Google Sheets):

1. **NAME** - Customer name
2. **MOBILE NO** - Mobile number
3. **EMAIL ID** - Email address
4. **POLICY NO** - Policy number
5. **INSURER** - Insurance company name
6. **PREMIUM** - Premium amount
7. **MD** - Mode (payment mode)
8. **DATE OF EXPIRY** - Expiry/renewal date
9. **PAYMENT DATE** - Payment date
10. **STATUS** - Policy status (DUE/Renewed/Not Renewed/In Process)
11. **THANKYOU MESSAGE SENT** - Thank you message status
12. **REMARKS** - Notes/remarks

**Total: 12 columns**

---

## Database Field Mapping

### General Insurance
```javascript
{
  name: 'NAME',
  mobile_number: 'MOBILE NO',
  email: 'EMAIL ID',
  current_policy_no: 'POLICY NO',
  company: 'COMPANY',
  registration_no: 'VEH NO',
  premium: 'AMOUNT',
  premium_mode: 'Premium mode',
  last_year_premium: 'LAST YEAR PREMIUM',
  renewal_date: 'MODIFIED EXPIRY DATE',
  od_expiry_date: 'DATE OF EXPIRY',
  tp_expiry_date: 'TP Expiry Date',
  payment_date: 'DEPOSITED/ PAYMENT DATE',
  status: 'STATUS',
  thank_you_sent: 'Thankyou message sent yes/no',
  new_policy_no: 'NEW POLICY NO',
  new_company: 'NEW POLICY COMPANY',
  product_type: 'Product Type',
  product_model: 'Product Model',
  vertical: 'TYPE',
  notes: 'REMARKS',
  cheque_no: 'CHQ NO & DATE',
  bank_name: 'BANK NAME',
  customer_id: 'CUSTOMER ID',
  agent_code: 'AGENT CODE',
  pancard: 'PANCARD',
  aadhar_card: 'AADHAR CARD',
  others_doc: 'OTHERS - VI/DL/PP',
  g_code: 'G CODE'
}
```

### Life Insurance
```javascript
{
  name: 'NAME',
  mobile_number: 'MOBILE NO',
  email: 'EMAIL ID',
  current_policy_no: 'POLICY NO',
  company: 'INSURER',
  premium: 'PREMIUM',
  premium_mode: 'MD',
  renewal_date: 'DATE OF EXPIRY',
  payment_date: 'PAYMENT DATE',
  status: 'STATUS',
  thank_you_sent: 'THANKYOU MESSAGE SENT',
  notes: 'REMARKS'
}
```

---

## Notes

- **General Insurance** has 29 columns (comprehensive)
- **Life Insurance** has 12 columns (simplified)
- Both use the same spreadsheet but different tabs
- Column names are **case-sensitive** in Google Sheets
- The dynamic form will automatically generate fields for all these columns
- Required fields: NAME, MOBILE NO
- Date fields: MODIFIED EXPIRY DATE, DATE OF EXPIRY, TP Expiry Date, DEPOSITED/ PAYMENT DATE, PAYMENT DATE
- Number fields: AMOUNT, PREMIUM, LAST YEAR PREMIUM
- Textarea fields: REMARKS
- Dropdown field: STATUS

---

## Comparison with KMG

Joban and KMG have **identical column structures** for both General and Life insurance. The only differences are:
- Different spreadsheet IDs
- Different tab names
- Same column names and schema

This makes the system very consistent across clients!
