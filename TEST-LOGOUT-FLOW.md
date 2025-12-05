# Testing Logout Flow

## What Was Fixed

**Problem**: When clicking logout, the session was NOT being deleted from the database. The frontend only cleared localStorage but didn't call the backend logout API.

**Solution**: Updated `AuthContext.tsx` logout function to call `/api/auth/logout` before clearing local state.

---

## Test Steps

### Test 1: Single Logout
1. Login with a user account
2. Check database: `SELECT COUNT(*) FROM sessions;` → Should show 1
3. Click logout button
4. Check database: `SELECT COUNT(*) FROM sessions;` → Should show 0
5. ✅ Session deleted successfully

### Test 2: Multiple Sessions, Then Logout
1. Login with same user on 3 different tabs
2. Check database: `SELECT COUNT(*) FROM sessions;` → Should show 3
3. Logout from one tab
4. Check database: `SELECT COUNT(*) FROM sessions;` → Should show 2
5. Logout from another tab
6. Check database: `SELECT COUNT(*) FROM sessions;` → Should show 1
7. ✅ Each logout decrements the count

### Test 3: Session Limit After Logout
1. Login with same user on 5 tabs (reaches limit)
2. Check database: Should show 5 sessions
3. Logout from 2 tabs
4. Check database: Should show 3 sessions
5. Try to login on a new tab
6. ✅ Should login WITHOUT warning (only 3 sessions, limit is 5)

### Test 4: Session Limit Warning Still Works
1. Login with same user on 5 tabs (reaches limit)
2. Try to login on 6th tab
3. ✅ Should show warning
4. Click "Continue"
5. ✅ Should login successfully
6. Check database: Should still show 5 sessions (oldest was deleted)

---

## Database Queries for Testing

### Count sessions per user:
```sql
SELECT 
  u.email, 
  COUNT(s.id) as active_sessions,
  u.max_sessions as limit
FROM users u
LEFT JOIN sessions s ON u.id = s.user_id
GROUP BY u.id, u.email, u.max_sessions;
```

### View all sessions with details:
```sql
SELECT 
  u.email,
  s.ip_address,
  datetime(s.created_at, 'localtime') as login_time
FROM sessions s
JOIN users u ON s.user_id = u.id
ORDER BY s.created_at DESC;
```

### Clear all sessions (for testing):
```sql
DELETE FROM sessions;
```

### Clear sessions for specific user:
```sql
DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com');
```

---

## Expected Behavior

### Before Fix:
- Login 5 times → 5 sessions in DB
- Logout from all tabs → 5 sessions STILL in DB ❌
- Try to login again → Warning appears (incorrect) ❌

### After Fix:
- Login 5 times → 5 sessions in DB
- Logout from all tabs → 0 sessions in DB ✅
- Try to login again → No warning, logs in directly ✅

---

## Code Changes Made

### File: `client/src/context/AuthContext.tsx`

**Before:**
```typescript
function logout() {
  persistToken(null)
  setUser(null)
  window.location.href = '/login'
}
```

**After:**
```typescript
async function logout() {
  try {
    // Call backend to delete session
    await api.post('/api/auth/logout')
  } catch (err) {
    console.error('Logout API call failed:', err)
  } finally {
    // Always clear local state
    persistToken(null)
    setUser(null)
    window.location.href = '/login'
  }
}
```

**Key Changes:**
1. Made function `async`
2. Added `await api.post('/api/auth/logout')` to call backend
3. Wrapped in try-catch to handle errors gracefully
4. Always clears local state in `finally` block (even if API call fails)

---

## Backend Logout Endpoint

The backend endpoint at `/api/auth/logout` (already implemented):

```javascript
router.post('/logout', authRequired, async (req, res, next) => {
  try {
    if (config.security.enableSessionLimits && req.token) {
      await sessionManager.deleteSession(req.user.id, req.token)
    }
    res.json({ message: 'Logged out successfully' })
  } catch (error) {
    next(error)
  }
})
```

This deletes the session from the database using the JWT token from the request.

---

## Troubleshooting

### If logout doesn't delete session:
1. Check browser console for errors
2. Check server logs for logout API call
3. Verify `ENABLE_SESSION_LIMITS=true` in `.env`
4. Restart server after changes

### If you get "Session invalidated" error after logout:
- This is normal! The session was deleted, so old tabs can't make API calls
- Just refresh the page or login again

### To manually clean up stuck sessions:
```sql
-- Delete all sessions
DELETE FROM sessions;

-- Or delete sessions older than 24 hours
DELETE FROM sessions WHERE created_at < datetime('now', '-1 day');
```
