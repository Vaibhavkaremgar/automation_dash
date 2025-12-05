# Google Sheet URL Fix Summary

## Issue
- Joban Putra insurance client was not syncing properly from their Google Sheet
- Hardcoded insurance sheet configuration in .env was causing confusion

## Changes Made

### 1. Removed Hardcoded Insurance Sheet Config
**File: `server/.env`**
- Removed `INSURANCE_SHEETS_SPREADSHEET_ID` variable
- Removed `INSURANCE_SHEETS_TAB` variable
- Each client now uses their own `google_sheet_url` from the database

### 2. Fixed User Data in Auth Responses
**File: `server/src/routes/auth.js`**
- Added `google_sheet_url` to `/me` endpoint query
- Added `google_sheet_url` to login response
- Now the frontend receives the user's sheet URL and can use it for syncing

## Current Client Configuration

### KMG Insurance (ID: 14)
- Email: kvreddy1809@gmail.com
- Name: KMG Insurance
- Sheet: https://docs.google.com/spreadsheets/d/1EpMAg1gSXPKr83cTugvGexrqv3Yt5Tb85Re2Shah8mw/edit?usp=sharing

### Joban Putra Insurance Shoppe (ID: 16)
- Email: jobanputra@gmail.com
- Name: Joban Putra Insurance Shoppe
- Sheet: https://docs.google.com/spreadsheets/d/1oX5MGRMo6oz87ivTXeMOy6vtIDPJXXawz_lGqmOvUEo/edit?usp=sharing

## How Sync Works Now

1. User logs in → receives `google_sheet_url` in auth response
2. Frontend stores user data including `google_sheet_url`
3. When syncing:
   - Frontend calls `/api/insurance/sync/from-sheet` or `/api/insurance/sync/to-sheet`
   - Backend extracts spreadsheet ID from `req.user.google_sheet_url`
   - Each client syncs with their own unique sheet

## Testing Steps

1. **Restart the server** to load the updated .env file
2. **Log out and log back in** as Joban Putra to get the updated user data with `google_sheet_url`
3. **Try syncing from sheet** - it should now work with Joban Putra's sheet
4. **Verify data** - check that Joban Putra's customers appear in their dashboard

## Important Notes

- The Google Sheet must be shared with the service account email: `dash-one@n8n-local-integration-477807.iam.gserviceaccount.com`
- The sheet must have a tab named `updating_input` with the correct column structure
- Each client's data is completely isolated - they only see and sync their own sheet
