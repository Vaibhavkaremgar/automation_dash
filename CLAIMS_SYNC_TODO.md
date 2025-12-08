# Claims Sync Implementation Guide

## Current Status
The UI and API endpoints for claims sync are in place, but the actual Google Sheets integration needs to be implemented.

## What's Already Done ✅
1. Frontend buttons for "Sync from Sheet" and "Sync to Sheet"
2. API endpoints created:
   - `POST /api/insurance/claims/sync/from-sheet`
   - `POST /api/insurance/claims/sync/to-sheet`
3. Loading states and error handling
4. Sheet URLs configured for both KMG and Joban

## What Needs Implementation 🔧

### 1. Create Claims Sync Service

Create a new file: `server/src/services/claimsSync.js`

```javascript
const { google } = require('googleapis');
const { getDatabase } = require('../db/connection');

const db = getDatabase();

// Similar to insuranceSync.js but for claims
async function syncClaimsFromSheet(userId, spreadsheetId, tabName) {
  // 1. Get Google Sheets API credentials
  // 2. Read claims data from sheet
  // 3. Parse and validate data
  // 4. Insert/update claims in database
  // 5. Return sync results
}

async function syncClaimsToSheet(userId, spreadsheetId, tabName) {
  // 1. Get claims from database
  // 2. Format data for sheets
  // 3. Write to Google Sheets
  // 4. Return sync results
}

module.exports = {
  syncClaimsFromSheet,
  syncClaimsToSheet
};
```

### 2. Update Insurance Routes

In `server/src/routes/insurance.js`, replace the placeholder code:

```javascript
// Replace this:
router.post('/claims/sync/from-sheet', authRequired, async (req, res) => {
  // TODO: Implement actual sync logic
  res.json({ success: true, imported: 0, message: 'Claims sync from sheet - Coming soon' });
});

// With this:
router.post('/claims/sync/from-sheet', authRequired, async (req, res) => {
  try {
    const { get } = require('../db/connection');
    const claimsSync = require('../services/claimsSync');
    
    const user = await get('SELECT email FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const spreadsheetId = '1EpMAg1gSXPKr83cTugvGexrqv3Yt5Tb85Re2Shah8mw';
    const tabName = 'Claims';
    
    const result = await claimsSync.syncClaimsFromSheet(req.user.id, spreadsheetId, tabName);
    res.json(result);
  } catch (error) {
    console.error('Sync claims from sheet error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### 3. Claims Sheet Structure

Expected columns in Google Sheets (Claims tab):

| Column | Description | Example |
|--------|-------------|---------|
| Customer Name | Name of customer | John Doe |
| Mobile Number | Contact number | 9876543210 |
| Policy Number | Insurance policy # | POL123456 |
| Insurance Company | Company name | HDFC ERGO |
| Vehicle Number | Registration # | MH01AB1234 |
| Claim Type | Type of claim | own_damage |
| Incident Date | Date of incident | 15/12/2024 |
| Description | Claim details | Front bumper damage |
| Claim Amount | Amount claimed | 50000 |
| Claim Status | Current status | filed |

### 4. Claim Status Values

Valid claim statuses:
- `filed` - Claim has been filed
- `survey_done` - Survey completed
- `in_progress` - Processing
- `approved` - Claim approved
- `rejected` - Claim rejected
- `settled` - Claim settled

### 5. Claim Type Values

Valid claim types:
- `own_damage` - Own Damage
- `third_party` - Third Party
- `theft` - Theft
- `total_loss` - Total Loss

## Implementation Steps

### Step 1: Copy Insurance Sync Logic
Use `server/src/services/insuranceSync.js` as a template. The logic is very similar:
1. Authenticate with Google Sheets API
2. Read/write data
3. Handle date formats (DD/MM/YYYY)
4. Map sheet columns to database fields

### Step 2: Handle Customer Matching
When syncing from sheet, match customers by:
1. Mobile number (primary)
2. Name (secondary)
3. Create new customer if not found

### Step 3: Test with Sample Data
1. Add test claims to Google Sheet
2. Run sync from sheet
3. Verify data in database
4. Test sync to sheet
5. Verify data in Google Sheet

### Step 4: Error Handling
Handle common errors:
- Sheet not found
- Invalid data format
- Missing required fields
- Duplicate claims
- Customer not found

## Database Schema

Claims are stored in `insurance_claims` table:

```sql
CREATE TABLE insurance_claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  policy_number TEXT,
  insurance_company TEXT,
  vehicle_number TEXT,
  claim_type TEXT,
  incident_date TEXT,
  description TEXT,
  claim_amount REAL,
  claim_status TEXT DEFAULT 'filed',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (customer_id) REFERENCES insurance_customers(id)
);
```

## Testing Checklist

- [ ] Can read claims from Google Sheet
- [ ] Can write claims to Google Sheet
- [ ] Customer matching works correctly
- [ ] Date formats handled properly
- [ ] Status values validated
- [ ] Error messages are clear
- [ ] Loading states work
- [ ] Success messages display
- [ ] Data integrity maintained

## Google Sheets API Setup

If not already configured:

1. Enable Google Sheets API in Google Cloud Console
2. Create service account
3. Download credentials JSON
4. Share sheet with service account email
5. Add credentials to `.env`:
   ```
   GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
   ```

## Reference Files

Look at these files for implementation guidance:
- `server/src/services/insuranceSync.js` - Customer sync logic
- `server/src/services/sheets.js` - Google Sheets helper functions
- `server/src/routes/insurance.js` - Customer sync endpoints

## Estimated Time

- Claims sync service: 2-3 hours
- Testing and debugging: 1-2 hours
- Total: 3-5 hours

## Priority

Medium - The UI is ready and users can still manually manage claims. This enhancement will improve workflow efficiency.

---

**Note:** All the infrastructure is in place. You just need to implement the actual sync logic by following the pattern used in `insuranceSync.js`.
