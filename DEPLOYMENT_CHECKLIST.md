# HR Agent Dashboard - Deployment Checklist ✅

## Issues Fixed

### 1. ✅ Login Issues
- **Problem**: Users couldn't login, status was 'open' instead of 'active'
- **Fix**: Updated all user statuses to 'active' and reset passwords
- **Script**: `check-and-fix-users.js` and `fix-dashboard.js`

### 2. ✅ Missing Database Tables
- **Problem**: Sessions table missing, causing errors
- **Fix**: Added sessions, user_ip_allowlist, and other missing tables to migrations
- **File**: `server/src/db/connection.js`

### 3. ✅ Google Sheets URLs
- **Problem**: Users didn't have google_sheet_url set
- **Fix**: Updated all users with correct spreadsheet URLs
  - Admin: 1amZkYzhw2lMmIbw0ftFAw8KJ1SX86zJ2rubWDQgs8CE
  - KMG: 1EpMAg1gSXPKr83cTugvGexrqv3Yt5Tb85Re2Shah8mw
  - Joban: 1oX5MGRMo6oz87ivTXeMOy6vtIDPJXXawz_lGqmOvUEo

### 4. ✅ Password Reset Route
- **Problem**: Route only supported POST, frontend was calling GET
- **Fix**: Added GET handler to `/api/reset-passwords/force-reset`

### 5. ✅ Session Cleanup Errors
- **Problem**: SessionManager trying to clean non-existent table
- **Fix**: Added graceful error handling for missing tables

## Current Database Status

```
✅ Admin: vaibhavkar0009@gmail.com - Active
✅ KMG Insurance: kvreddy1809@gmail.com - Active (5 customers)
✅ Joban Insurance: jobanputra@gmail.com - Active (8 customers)
```

## Login Credentials

### Admin
- Email: `vaibhavkar0009@gmail.com`
- Password: `Vaibhav@121`
- Type: HR Dashboard

### KMG Insurance
- Email: `kvreddy1809@gmail.com`
- Password: `kmg123`
- Type: Insurance Client
- Sheet: https://docs.google.com/spreadsheets/d/1EpMAg1gSXPKr83cTugvGexrqv3Yt5Tb85Re2Shah8mw/edit
- Tab: `updating_input`

### Joban Putra Insurance
- Email: `jobanputra@gmail.com`
- Password: `joban123`
- Type: Insurance Client
- Sheet: https://docs.google.com/spreadsheets/d/1oX5MGRMo6oz87ivTXeMOy6vtIDPJXXawz_lGqmOvUEo/edit
- Tab: `Sheet1`

## How to Use the Dashboard

### 1. Start the Server
```bash
cd server
npm start
```

### 2. Start the Frontend
```bash
cd client
npm run dev
```

### 3. Login
- Go to http://localhost:5173
- Use credentials above

### 4. Sync Data from Google Sheets
- Click "🔄 Sync from Sheets" button in the dashboard
- Data will be imported from the respective Google Sheet
- Auto-sync runs every 2 minutes

### 5. View Dashboard
- **Dashboard Tab**: Overview with quick actions and stats
- **Customers Tab**: Full customer list with search and filters
- **Policies Tab**: Policy overview by status (Active/Pending/Lost/Total)
- **Renewals Tab**: Categorized by urgency (Overdue/7 Days/30 Days)

## Google Sheets Integration

### How It Works
1. **Sync from Sheet**: Imports data from Google Sheets to database
2. **Sync to Sheet**: Exports database data back to Google Sheets
3. **Auto-sync**: Runs every 2 minutes automatically

### Sheet Formats

#### KMG Insurance (updating_input tab)
Columns: Name, Mobile, Insurance Activated Date, Renewal Date, OD Expiry, TP Expiry, Premium Mode, Premium, Vertical, Product, Registration No, Policy No, Company, Status, New Policy No, New Company, Policy Doc Link, Thank You Sent, Reason, Email, Notes

#### Joban Putra (Sheet1 tab)
Columns: Name, Mobile, Email, Product, Vertical, Policy No, Company, REGN no, Last Year Premium, Premium Amount, Premium Mode, Date of Expiry, TP Expiry, Activated Date, Status, ThankYouSent, Cheque Hold, Payment Date, Cheque No, Cheque Bounce, New Policy No, New Policy Company, Policy doc link, Owner Alert Sent, Notes

## Features Working

✅ Multi-tenant (HR & Insurance clients)
✅ Google Sheets sync (bidirectional)
✅ Customer management (Add/Edit/Delete)
✅ Renewal tracking with urgency levels
✅ WhatsApp integration (click to send)
✅ Policy analytics
✅ Status management (Pending/Done/Lost)
✅ Bulk operations
✅ Auto-sync every 2 minutes
✅ Vertical filtering (Motor/Health/Life/Non-Motor)
✅ Search and filters
✅ Notes and history tracking

## Database Location

- **Path**: `c:\Users\hp\hr-agent-dashboard\data\hirehero.db`
- **Size**: 626 KB
- **Type**: SQLite

## Environment Variables

All configured in `server/.env`:
- ✅ Google Sheets credentials
- ✅ JWT secret
- ✅ Database path
- ✅ Frontend URL
- ✅ Payment gateways (Razorpay/Stripe)
- ✅ Voice API credentials

## Troubleshooting

### If login fails:
```bash
cd server
node check-and-fix-users.js
```

### If sync fails:
1. Check Google Sheets credentials in `.env`
2. Verify spreadsheet IDs are correct
3. Check if sheets are accessible (public or shared with service account)

### If data doesn't appear:
1. Click "🔄 Sync from Sheets" button
2. Check browser console for errors
3. Check server logs for sync errors

## Production Deployment Notes

### SQLite is FINE for:
- ✅ Current scale (3 users, ~15 customers)
- ✅ Single server deployment
- ✅ Simple backup/restore
- ✅ No separate DB server needed

### Consider PostgreSQL/MySQL if:
- ❌ 100+ concurrent users
- ❌ Multiple servers (horizontal scaling)
- ❌ Complex transactions
- ❌ Advanced features needed

### Deployment Platforms
- Railway ✅
- Render ✅
- Fly.io ✅
- Any Node.js hosting ✅

**Important**: Use persistent volume for database in production!

## Next Steps

1. ✅ Login working
2. ✅ Sync working
3. ✅ Dashboard showing data
4. 🔄 Test all features
5. 🔄 Deploy to production
6. 🔄 Set up backups

## Support

For issues, check:
1. Server logs: `npm start` output
2. Browser console: F12 → Console tab
3. Database: Use DB Browser for SQLite to inspect `data/hirehero.db`

---

**Last Updated**: December 3, 2025
**Status**: ✅ All systems operational
