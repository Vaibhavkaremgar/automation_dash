# Client Name and Sheet URL Fixes

## Summary
Fixed the issue where insurance clients were using the same hardcoded Google Sheet URL instead of their individual sheet URLs. Also made client name mandatory and displayed it in the sidebar.

## Changes Made

### 1. Backend Changes (Server)

#### `server/src/routes/admin.js`
- **Made client name mandatory**: Added validation to require the `name` field when creating a new client
- Returns error if name is not provided or empty

#### `server/src/routes/insurance.js`
- **Updated sync endpoints**: Modified `/sync/from-sheet` and `/sync/to-sheet` endpoints to automatically extract the spreadsheet ID from the user's `google_sheet_url` field
- If no spreadsheet ID is provided in the request body, it now extracts it from the authenticated user's `google_sheet_url`
- Each client now uses their own unique Google Sheet URL for syncing

### 2. Frontend Changes (Client)

#### `client/src/pages/admin/AdminUsers.tsx`
- **Made name field mandatory in UI**: 
  - Changed placeholder from "Name (optional)" to "Client Name *"
  - Added validation message when name is empty
  - Disabled the "Create Client" button when name is not provided
  - Added client-side validation to alert if name is missing

#### `client/src/components/layout/Sidebar.tsx`
- **Display actual client name**: 
  - Changed sidebar to display the client's actual name from `user.name` instead of hardcoded company names
  - Falls back to "Insurance Agency" or "HR Agency" if name is not available
  - Format: 🏢 [Client Name]

#### `client/src/pages/InsuranceDashboard.tsx`
- **Removed hardcoded spreadsheet ID**: 
  - Removed the `SPREADSHEET_ID` constant that was hardcoded to a specific sheet
  - Updated all sync API calls to not include `spreadsheetId` parameter
  - The backend now automatically uses the user's own `google_sheet_url`
  - All 6 sync operations now use the client's individual sheet

## How It Works Now

### Creating a New Client
1. Admin must provide:
   - Email (required)
   - **Client Name (required)** ← NEW
   - Google Sheet URL (optional but recommended)
   - Client Type (HR or Insurance)

2. The client name is stored in the database and displayed in the sidebar

### Google Sheets Syncing
1. When a client syncs data (from or to Google Sheets):
   - The system extracts the spreadsheet ID from their `google_sheet_url` field
   - Each client syncs with their own unique Google Sheet
   - No more sharing of data between clients

### Sidebar Display
- Shows the actual client name (e.g., "🏢 Joban Putra" or "🏢 KMG Insurance")
- Falls back to generic names only if client name is not set

## Testing Checklist

- [x] Client name is required when creating a new client
- [x] Client name appears in the sidebar
- [x] Each insurance client uses their own Google Sheet URL
- [x] Sync from sheet uses client's specific sheet
- [x] Sync to sheet uses client's specific sheet
- [x] Multiple insurance clients don't interfere with each other's data

## Migration Notes

For existing clients without names:
- They can still log in and use the system
- Admin should update their names via the "Edit" button in Admin Users page
- Sidebar will show generic "Insurance Agency" or "HR Agency" until name is set

For existing clients without Google Sheet URLs:
- They will get an error message when trying to sync
- Admin should add their Google Sheet URL via the "Edit" button in Admin Users page
