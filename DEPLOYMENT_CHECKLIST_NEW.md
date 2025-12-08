# Deployment Checklist - Dashboard Updates

## Pre-Deployment Checks ✅

### 1. Code Review
- [ ] All files saved and committed
- [ ] No console.log statements in production code
- [ ] No hardcoded credentials
- [ ] Environment variables properly configured

### 2. Database Verification
- [ ] `user_profiles` table exists
- [ ] `activity_logs` table exists
- [ ] `message_logs` table exists
- [ ] `insurance_claims` table exists
- [ ] All foreign keys properly set

### 3. Dependencies
- [ ] No new npm packages added (all existing)
- [ ] package.json unchanged
- [ ] package-lock.json unchanged

### 4. Environment Variables
```bash
# Verify these are set in production:
VITE_API_URL=https://automationdash-production.up.railway.app
JWT_SECRET=<your-secret>
GOOGLE_SERVICE_ACCOUNT_EMAIL=<email>
GOOGLE_PRIVATE_KEY=<key>
```

---

## Deployment Steps 🚀

### Step 1: Backup Current Database
```bash
# On Railway or your server
cd data
cp hirehero.db hirehero.db.backup-$(date +%Y%m%d)
```

### Step 2: Deploy Backend
```bash
cd server
git add .
git commit -m "feat: Add profile management, auto-sync, claims sync UI, 12-month reports"
git push origin main
```

### Step 3: Deploy Frontend
```bash
cd client
npm run build
# Deploy build folder to your hosting
```

### Step 4: Verify Deployment
- [ ] Backend API responding
- [ ] Frontend loads correctly
- [ ] Login works
- [ ] Database connection active

---

## Post-Deployment Testing 🧪

### Test 1: Logo & Branding
```
1. Login to dashboard
2. Check sidebar
3. Verify VB Automation logo with cube
4. Verify client logo below
5. Check menu items (no emoji)
```
**Expected:** ✅ VB logo at top, client logo below, clean menu

### Test 2: Profile Management
```
1. Go to /profiles
2. Create new profile
3. Edit profile
4. Delete profile
5. Logout and login
6. Verify profiles persist
```
**Expected:** ✅ All profile operations work, data persists

### Test 3: Auto-Sync
```
1. Clear browser cache
2. Login
3. Open browser console
4. Check for auto-sync message
5. Verify customer list loads
```
**Expected:** ✅ Silent auto-sync on login, no alert

### Test 4: Messages Persistence
```
1. Send test message
2. Logout
3. Login again
4. Check message history
5. Verify message still there
```
**Expected:** ✅ Messages persist for 30 days

### Test 5: Claims Sync
```
1. Go to Claims Management
2. Click "Sync from Sheet"
3. Click "Sync to Sheet"
4. Check for errors
```
**Expected:** ⚠️ Buttons work, placeholder message (full sync TODO)

### Test 6: Reports
```
1. Go to Reports
2. Check each tab
3. Verify 12-month data
4. Check charts render
```
**Expected:** ✅ 12 months of data, charts display correctly

### Test 7: Admin Dashboard
```
1. Login as admin
2. Go to Client Management
3. Verify no IP restriction button at top
4. Check individual client IP management
```
**Expected:** ✅ Clean interface, per-client IP management works

---

## Rollback Plan 🔄

If issues occur:

### Quick Rollback
```bash
# Restore database backup
cd data
cp hirehero.db.backup-YYYYMMDD hirehero.db

# Revert code
git revert HEAD
git push origin main
```

### Partial Rollback
If only one feature has issues:
1. Identify problematic file
2. Revert specific file: `git checkout HEAD~1 -- path/to/file`
3. Commit and push

---

## Monitoring 📊

### What to Monitor

1. **Error Logs**
   - Check Railway logs
   - Look for 500 errors
   - Check database errors

2. **User Activity**
   - Profile creation rate
   - Sync frequency
   - Message volume

3. **Performance**
   - API response times
   - Database query speed
   - Frontend load time

### Monitoring Commands
```bash
# Railway logs
railway logs

# Check database size
ls -lh data/hirehero.db

# Check active connections
# (depends on your setup)
```

---

## Known Issues & Limitations ⚠️

### 1. Claims Sync
- **Status:** UI ready, backend placeholder
- **Impact:** Buttons show but don't sync yet
- **Fix:** Implement as per `CLAIMS_SYNC_TODO.md`
- **Priority:** Medium

### 2. Profile Activity
- **Status:** Basic implementation
- **Impact:** Only tracks customer creation
- **Enhancement:** Can add more action types
- **Priority:** Low

### 3. Auto-Sync
- **Status:** Works per session
- **Impact:** Syncs once per browser session
- **Note:** This is intentional behavior
- **Priority:** N/A

---

## Success Criteria ✅

Deployment is successful if:

- [ ] All users can login
- [ ] Profiles can be created/edited/deleted
- [ ] Auto-sync works on login
- [ ] Messages persist after logout
- [ ] Claims UI is accessible
- [ ] Reports show 12 months
- [ ] Admin dashboard is clean
- [ ] No critical errors in logs
- [ ] Performance is acceptable
- [ ] Data integrity maintained

---

## Communication Plan 📢

### Before Deployment
```
Subject: Dashboard Update - New Features Coming

Hi Team,

We're deploying dashboard updates with these new features:
- Profile management
- Auto-sync on login
- Claims sync interface
- 12-month reports
- Improved branding

Deployment window: [DATE/TIME]
Expected downtime: 5-10 minutes

Please save your work before this time.

Thanks!
```

### After Deployment
```
Subject: Dashboard Update - Live Now!

Hi Team,

The dashboard has been updated successfully! 

New features:
✅ Profile management - Create multiple profiles
✅ Auto-sync - Customer list syncs on login
✅ Claims sync - New sync buttons (UI ready)
✅ Better reports - 12-month analysis
✅ New branding - VB Automation logo

Please test and report any issues.

Quick Start Guide: See QUICK_START_GUIDE.md

Thanks!
```

---

## Emergency Contacts 🆘

If critical issues occur:

1. **Database Issues**
   - Restore from backup
   - Check connection strings
   - Verify permissions

2. **API Issues**
   - Check Railway logs
   - Verify environment variables
   - Restart service if needed

3. **Frontend Issues**
   - Clear CDN cache
   - Verify build deployed
   - Check API URL

---

## Post-Deployment Tasks 📝

### Immediate (Day 1)
- [ ] Monitor error logs
- [ ] Check user feedback
- [ ] Verify all features working
- [ ] Document any issues

### Short-term (Week 1)
- [ ] Collect user feedback
- [ ] Fix any bugs found
- [ ] Optimize performance
- [ ] Update documentation

### Long-term (Month 1)
- [ ] Implement claims sync logic
- [ ] Add more activity tracking
- [ ] Enhance profile features
- [ ] Performance optimization

---

## Metrics to Track 📈

### Usage Metrics
- Number of profiles created
- Auto-sync success rate
- Claims page visits
- Report generation frequency

### Performance Metrics
- API response time
- Database query time
- Frontend load time
- Error rate

### Business Metrics
- User satisfaction
- Feature adoption rate
- Support tickets
- Bug reports

---

## Documentation Updates 📚

After deployment, update:
- [ ] README.md
- [ ] API documentation
- [ ] User guide
- [ ] Admin guide
- [ ] Changelog

---

## Final Checklist ✅

Before marking deployment complete:

- [ ] All tests passed
- [ ] No critical errors
- [ ] Users notified
- [ ] Documentation updated
- [ ] Backup created
- [ ] Monitoring active
- [ ] Rollback plan ready
- [ ] Team briefed

---

**Deployment Date:** _____________
**Deployed By:** _____________
**Status:** _____________
**Notes:** _____________

---

## Appendix: File Changes

### Modified Files (8)
1. `client/src/components/layout/Sidebar.tsx`
2. `client/src/pages/ProfileSelection.tsx`
3. `client/src/pages/InsuranceDashboard.tsx`
4. `client/src/pages/ClaimsManagement.tsx`
5. `client/src/pages/ReportsPage.tsx`
6. `client/src/pages/admin/AdminUsers.tsx`
7. `client/src/lib/api.ts`
8. `server/src/routes/insurance.js`

### New Files (4)
1. `client/src/components/dashboard/ProfileActivity.tsx`
2. `FIXES_IMPLEMENTED.md`
3. `CLAIMS_SYNC_TODO.md`
4. `QUICK_START_GUIDE.md`

### Total Changes
- 8 files modified
- 4 files created
- 0 files deleted
- 0 dependencies added

---

**Ready to Deploy! 🚀**
