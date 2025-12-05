# Session Management & IP Allowlisting - Implementation Guide

## ✅ Implementation Complete

The following features have been successfully implemented:

### 1. **Concurrent Session Limits (Netflix-style)**
- Default: 5 sessions per user
- Admin: 9999 sessions (unlimited)
- Oldest session automatically evicted when limit reached

### 2. **IP Allowlisting**
- Per-user IP restrictions
- Empty allowlist = allow all IPs (safe default)
- Admin users bypass IP restrictions
- Localhost bypass for development

---

## 📁 Files Modified/Created

### Backend

**New Files:**
- `server/migrations/001-add-session-features.js` - Database migration
- `server/src/services/sessionManager.js` - Session management service
- `server/src/middleware/sessionCheck.js` - Session validation middleware
- `server/src/middleware/ipAllowlist.js` - IP allowlist middleware

**Modified Files:**
- `server/src/config/env.js` - Added feature flags
- `server/src/middleware/auth.js` - Store token for session validation
- `server/src/routes/auth.js` - Updated login/logout with session management
- `server/src/index.js` - Applied middlewares to protected routes
- `server/.env` - Added feature flag configuration

### Frontend

**New Files:**
- `client/src/pages/AccessDenied.tsx` - IP restriction error page

**Modified Files:**
- `client/src/lib/api.ts` - Added error handling for 401/403
- `client/src/App.tsx` - Added AccessDenied route

---

## 🗄️ Database Changes

### New Tables

**1. user_ip_allowlist**
```sql
CREATE TABLE user_ip_allowlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  ip_address TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**2. sessions**
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Modified Tables

**users table:**
- Added `max_sessions INTEGER DEFAULT 5`
- Admin users set to `max_sessions = 9999`

### Performance Improvements
- Enabled WAL mode: `PRAGMA journal_mode=WAL`
- Set synchronous mode: `PRAGMA synchronous=NORMAL`

---

## ⚙️ Environment Variables

Add to `server/.env`:

```env
# Session & IP Security Features
ENABLE_IP_RESTRICTIONS=false
ENABLE_SESSION_LIMITS=false
BYPASS_IP_FOR_LOCALHOST=true
```

### Feature Flags Explained

| Flag | Default | Description |
|------|---------|-------------|
| `ENABLE_IP_RESTRICTIONS` | `false` | Enable IP allowlist checking |
| `ENABLE_SESSION_LIMITS` | `false` | Enable concurrent session limits |
| `BYPASS_IP_FOR_LOCALHOST` | `true` | Skip IP checks for localhost (dev mode) |

---

## 🚀 Deployment Steps

### 1. Run Migration
```bash
cd server
node migrations/001-add-session-features.js
```

### 2. Update Environment
```bash
# Edit server/.env
ENABLE_IP_RESTRICTIONS=false  # Start disabled
ENABLE_SESSION_LIMITS=false   # Start disabled
BYPASS_IP_FOR_LOCALHOST=true  # Keep enabled for dev
```

### 3. Restart Server
```bash
cd server
npm run dev
```

### 4. Test Features

**Test Session Limits:**
1. Set `ENABLE_SESSION_LIMITS=true`
2. Login from 6 different browsers/devices
3. First session should be automatically logged out

**Test IP Restrictions:**
1. Add IP to allowlist for a test user:
```sql
INSERT INTO user_ip_allowlist (user_id, ip_address) 
VALUES (9, '192.168.1.100');
```
2. Set `ENABLE_IP_RESTRICTIONS=true`
3. Try logging in from different IP - should get 403 error

---

## 🔧 Managing IP Allowlists

### Add Allowed IP for User
```sql
INSERT INTO user_ip_allowlist (user_id, ip_address) 
VALUES (USER_ID, 'IP_ADDRESS');
```

### View User's Allowed IPs
```sql
SELECT * FROM user_ip_allowlist WHERE user_id = USER_ID;
```

### Remove IP from Allowlist
```sql
DELETE FROM user_ip_allowlist 
WHERE user_id = USER_ID AND ip_address = 'IP_ADDRESS';
```

### Clear All IPs for User (Allow All)
```sql
DELETE FROM user_ip_allowlist WHERE user_id = USER_ID;
```

---

## 📊 Monitoring Sessions

### View Active Sessions
```sql
SELECT s.*, u.email, u.name 
FROM sessions s 
JOIN users u ON s.user_id = u.id 
ORDER BY s.created_at DESC;
```

### Count Sessions Per User
```sql
SELECT u.email, u.name, COUNT(s.id) as session_count
FROM users u
LEFT JOIN sessions s ON u.id = s.user_id
GROUP BY u.id
ORDER BY session_count DESC;
```

### Clear All Sessions for User
```sql
DELETE FROM sessions WHERE user_id = USER_ID;
```

---

## 🛡️ Security Behavior

### Session Limits
- **Enabled:** Users limited to `max_sessions` concurrent logins
- **Disabled:** Unlimited concurrent sessions (current behavior)
- **Admin:** Always unlimited (9999 sessions)

### IP Restrictions
- **Enabled + Empty Allowlist:** Allow all IPs
- **Enabled + Has Allowlist:** Only allow listed IPs
- **Disabled:** Allow all IPs
- **Admin:** Always bypass IP checks
- **Localhost:** Bypass if `BYPASS_IP_FOR_LOCALHOST=true`

---

## 🔄 Rollback Plan

If issues occur:

### 1. Disable Features
```env
ENABLE_IP_RESTRICTIONS=false
ENABLE_SESSION_LIMITS=false
```

### 2. Clear Sessions (if needed)
```sql
DELETE FROM sessions;
```

### 3. Restart Server
```bash
npm run dev
```

---

## 📝 User Experience

### Session Limit Reached
**User sees:**
> "You have been logged out because your account is being used on too many devices."

**Action:** Oldest session is automatically terminated

### IP Not Allowed
**User sees:**
> "Access to this dashboard is restricted to your company network. Please connect from an allowed location or contact your administrator."

**Action:** Redirected to `/access-denied` page

---

## 🧪 Testing Checklist

- [ ] Migration runs successfully
- [ ] Admin users have `max_sessions = 9999`
- [ ] Session limits work when enabled
- [ ] IP restrictions work when enabled
- [ ] Admin bypasses IP restrictions
- [ ] Localhost bypasses IP restrictions (dev mode)
- [ ] Empty IP allowlist allows all IPs
- [ ] 401 error shows session invalidation message
- [ ] 403 error redirects to access denied page
- [ ] Logout clears session from database
- [ ] Features can be disabled via env flags

---

## 🎯 Recommended Rollout

### Phase 1: Testing (Week 1)
```env
ENABLE_IP_RESTRICTIONS=false
ENABLE_SESSION_LIMITS=false
```
- Deploy code
- Test in staging
- Verify no breaking changes

### Phase 2: Session Limits (Week 2)
```env
ENABLE_IP_RESTRICTIONS=false
ENABLE_SESSION_LIMITS=true
```
- Enable session limits
- Monitor for issues
- Adjust `max_sessions` if needed

### Phase 3: IP Restrictions (Week 3+)
```env
ENABLE_IP_RESTRICTIONS=true
ENABLE_SESSION_LIMITS=true
```
- Configure IP allowlists for users
- Enable IP restrictions
- Provide admin UI for IP management

---

## 🆘 Troubleshooting

### Users Can't Login
1. Check if `ENABLE_SESSION_LIMITS=true`
2. Check user's `max_sessions` value
3. Clear old sessions: `DELETE FROM sessions WHERE user_id = X`

### IP Restriction Blocking Users
1. Check if `ENABLE_IP_RESTRICTIONS=true`
2. Verify user's IP allowlist
3. Temporarily disable: `ENABLE_IP_RESTRICTIONS=false`
4. Add user's IP to allowlist

### Admin Can't Access
1. Verify `role = 'admin'` in database
2. Check `max_sessions = 9999` for admin
3. Admin should bypass all IP restrictions

---

## 📞 Support

For issues or questions:
1. Check feature flags in `.env`
2. Review database tables
3. Check server logs
4. Disable features if critical issue

---

**Implementation Date:** $(date)
**Status:** ✅ Ready for Testing
