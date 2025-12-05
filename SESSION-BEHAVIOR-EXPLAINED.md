# Session Management - How It Works

## Fixed Issues

### 1. Sessions Not Being Invalidated
**Problem**: Old browser tabs weren't getting logged out when session limit was reached.

**Root Cause**: Middleware execution order was wrong. Session/IP checks ran BEFORE JWT authentication, so they didn't have access to `req.user` or `req.token`.

**Solution**: Integrated session and IP checks directly into the `authRequired` middleware, ensuring they run AFTER JWT validation.

**Flow Now**:
1. User makes API request with JWT token
2. `authRequired` middleware validates JWT → sets `req.user` and `req.token`
3. Session check runs → validates session exists in database
4. IP check runs → validates IP is allowed
5. If any check fails → immediate 401/403 response
6. If all pass → request proceeds to route handler

### 2. Session Limit Warning
**Added**: User now gets a warning before oldest session is logged out.

**Flow**:
1. User at max sessions (5) tries to login
2. Backend returns 409 status with warning message
3. Frontend shows yellow alert: "You have reached the maximum of 5 active sessions. Logging in will automatically log out your oldest session."
4. User clicks "Continue" → oldest session deleted, new session created
5. User clicks "Cancel" → stays on login page

---

## How Sessions Work Across Browsers/Tabs

### Your Question:
> "If 20 users login within the browser logged in with a mail and in that browser if they try to login to our dash will they be able to login as the browser account is same and how will that differ?"

### Answer:

**Sessions are PER USER ACCOUNT, not per browser or device.**

Each user account (email) has its own session limit (default: 5 sessions).

### Example Scenarios:

#### Scenario 1: Same User, Multiple Tabs (Same Browser)
- User: john@company.com
- Opens 5 tabs in Chrome, logs in on each tab
- Each tab gets a DIFFERENT JWT token and session
- Result: 5 sessions for john@company.com
- 6th login → Oldest session logged out

#### Scenario 2: Same User, Multiple Browsers
- User: john@company.com
- Logs in on Chrome (1 session)
- Logs in on Firefox (1 session)
- Logs in on Edge (1 session)
- Logs in on Safari (1 session)
- Logs in on Mobile Chrome (1 session)
- Result: 5 sessions for john@company.com
- 6th login → Oldest session logged out

#### Scenario 3: Same User, Multiple Devices
- User: john@company.com
- Logs in on Laptop Chrome (1 session)
- Logs in on Desktop Chrome (1 session)
- Logs in on Phone (1 session)
- Logs in on Tablet (1 session)
- Logs in on Work Computer (1 session)
- Result: 5 sessions for john@company.com
- 6th login → Oldest session logged out

#### Scenario 4: Different Users, Same Browser
- User 1: john@company.com logs in → 1 session for john
- User 2: jane@company.com logs in → 1 session for jane
- User 3: bob@company.com logs in → 1 session for bob
- Result: Each user has their OWN session count
- john can have 5 sessions, jane can have 5 sessions, bob can have 5 sessions
- **They don't interfere with each other**

#### Scenario 5: 20 Users, Same Browser (Your Question)
- 20 different users login on the same browser (different tabs or same tab)
- Each user gets their own session
- Each user has their own 5-session limit
- User 1 can have 5 sessions, User 2 can have 5 sessions, etc.
- **Total possible sessions: 20 users × 5 sessions = 100 sessions**

---

## Key Points

### 1. Sessions Are User-Specific
- Each user account has its own session counter
- User A's sessions don't affect User B's sessions
- Browser/device doesn't matter - only the user account matters

### 2. What Counts as a "Session"
- Each login creates a NEW session
- Each session has a unique JWT token
- Session is stored in database with:
  - User ID
  - JWT token
  - IP address
  - Created timestamp

### 3. Session Limits
- Default: 5 sessions per user
- Admin users: 9999 sessions (effectively unlimited)
- Configurable per user in database (`max_sessions` column)

### 4. Session Eviction (Netflix-Style)
- When user reaches limit and logs in again
- System deletes the OLDEST session (by created_at timestamp)
- New session is created
- Old browser tab with deleted session gets 401 error on next API call

### 5. Browser Storage
- JWT token stored in localStorage (per browser)
- Different browsers = different localStorage
- Different browser profiles = different localStorage
- Incognito/Private mode = separate localStorage

---

## Testing the Fix

### Test 1: Session Limit Works
1. Login with same user on 5 different tabs
2. Try to login on 6th tab
3. Should see warning message
4. Click "Continue"
5. 6th tab logs in successfully
6. 1st tab (oldest) should get logged out on next API call

### Test 2: Different Users Don't Interfere
1. Login with user1@test.com on 5 tabs
2. Login with user2@test.com on 5 tabs
3. Both should work fine (10 total sessions, 5 per user)

### Test 3: Admin Bypass
1. Login with admin account on 20 tabs
2. All should work (admin has 9999 session limit)

---

## Database Queries for Monitoring

### Check session count per user:
```sql
SELECT 
  u.email, 
  COUNT(s.id) as session_count,
  u.max_sessions
FROM users u
LEFT JOIN sessions s ON u.id = s.user_id
GROUP BY u.id, u.email, u.max_sessions;
```

### See all active sessions:
```sql
SELECT 
  u.email,
  s.ip_address,
  datetime(s.created_at, 'localtime') as login_time
FROM sessions s
JOIN users u ON s.user_id = u.id
ORDER BY s.created_at DESC;
```

### Find users at session limit:
```sql
SELECT 
  u.email,
  COUNT(s.id) as current_sessions,
  u.max_sessions
FROM users u
JOIN sessions s ON u.id = s.user_id
GROUP BY u.id, u.email, u.max_sessions
HAVING COUNT(s.id) >= u.max_sessions;
```

---

## Configuration

### Enable/Disable Features (.env):
```bash
# Session limits (currently ENABLED)
ENABLE_SESSION_LIMITS=true

# IP restrictions (currently DISABLED)
ENABLE_IP_RESTRICTIONS=false

# Localhost bypass for IP checks
BYPASS_IP_FOR_LOCALHOST=true
```

### Change User Session Limit:
```sql
-- Set specific user to 10 sessions
UPDATE users SET max_sessions = 10 WHERE email = 'user@example.com';

-- Set all non-admin users to 3 sessions
UPDATE users SET max_sessions = 3 WHERE role != 'admin';
```
