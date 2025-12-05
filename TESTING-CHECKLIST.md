# Testing Checklist - Production Deployment

## 🔍 Pre-Deployment Tests (Local)

### Google Sheets Sync
- [ ] Test sync from sheet (Import customers)
- [ ] Test sync to sheet (Export customers)
- [ ] Verify KMG sheet sync works
- [ ] Verify Joban sheet sync works
- [ ] Check column mapping is correct
- [ ] Verify date formats are preserved

### Customer Management
- [ ] Add new customer (KMG client)
- [ ] Add new customer (Joban client)
- [ ] Edit existing customer
- [ ] Delete customer
- [ ] Verify client-specific fields show correctly
- [ ] Check form validation works

### Authentication
- [ ] Login as admin
- [ ] Login as KMG client
- [ ] Login as Joban client
- [ ] Verify role-based routing
- [ ] Test logout functionality

---

## 🚀 Post-Deployment Tests (Production)

### Basic Functionality
- [ ] Access production URL: https://hr-agent-dashboard-production-01fd.up.railway.app
- [ ] Login page loads correctly
- [ ] Dashboard loads after login
- [ ] All navigation links work
- [ ] No console errors

### Google Sheets Integration
- [ ] Click "Sync from Sheets" button
- [ ] Verify customers import successfully
- [ ] Add new customer via form
- [ ] Check "Sync to Sheets" works
- [ ] Verify customer appears in Google Sheet
- [ ] Check console for sync success message

### Client-Specific Features

#### KMG Insurance Client
- [ ] Login as KMG user
- [ ] Add customer form shows KMG fields:
  - [ ] Current Policy No (not "Policy No")
  - [ ] Registration No (not "REGN no")
  - [ ] Renewal Date (not "Date of Expiry")
  - [ ] OD Expiry Date field visible
  - [ ] Reason field visible
  - [ ] No Joban-specific fields visible
- [ ] Edit customer shows same fields
- [ ] Sync to KMG sheet works

#### Joban Putra Insurance Client
- [ ] Login as Joban user
- [ ] Add customer form shows Joban fields:
  - [ ] Policy No (not "Current Policy No")
  - [ ] REGN no (not "Registration No")
  - [ ] Date of Expiry (not "Renewal Date")
  - [ ] Last Year Premium field visible
  - [ ] Cheque Hold field visible
  - [ ] Payment Date field visible
  - [ ] Cheque No field visible
  - [ ] Cheque Bounce field visible
  - [ ] Owner Alert Sent field visible
  - [ ] No OD Expiry Date field
  - [ ] No Reason field
- [ ] Edit customer shows same fields
- [ ] Sync to Joban sheet works

---

## 📱 Mobile Device Testing

### iPhone (iOS Safari)
- [ ] Login page responsive
- [ ] Dashboard displays correctly
- [ ] Add customer modal fits screen
- [ ] Form inputs don't zoom on focus
- [ ] Buttons are touch-friendly (44px min)
- [ ] Tables scroll horizontally
- [ ] Navigation menu works
- [ ] No layout overflow issues

### Android (Chrome)
- [ ] Login page responsive
- [ ] Dashboard displays correctly
- [ ] Add customer modal fits screen
- [ ] Form inputs work properly
- [ ] Buttons are touch-friendly
- [ ] Tables scroll horizontally
- [ ] Navigation menu works
- [ ] No layout overflow issues

### Tablet (iPad/Android Tablet)
- [ ] Layout adapts to tablet size
- [ ] Forms are properly sized
- [ ] Tables display correctly
- [ ] Navigation is accessible
- [ ] All features work

---

## 🖥️ Desktop Browser Testing

### Chrome
- [ ] All features work
- [ ] No console errors
- [ ] Sync functionality works
- [ ] Forms submit correctly

### Firefox
- [ ] All features work
- [ ] No console errors
- [ ] Sync functionality works
- [ ] Forms submit correctly

### Safari
- [ ] All features work
- [ ] No console errors
- [ ] Sync functionality works
- [ ] Forms submit correctly

### Edge
- [ ] All features work
- [ ] No console errors
- [ ] Sync functionality works
- [ ] Forms submit correctly

---

## 🔗 n8n Webhook Testing

### Message Logging Webhook
- [ ] Send test webhook from n8n
- [ ] Verify message appears in Messages section
- [ ] Check customer name displays correctly
- [ ] Verify status is logged
- [ ] Test with KMG client_key
- [ ] Test with Joban client_key
- [ ] Verify cross-client isolation works

### Webhook Payload Test
```bash
curl -X POST https://hr-agent-dashboard-production-01fd.up.railway.app/api/insurance/log-message \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "Test Customer",
    "mobile": "9876543210",
    "message_type": "reminder_30",
    "channel": "whatsapp",
    "message_content": "Test message",
    "status": "sent",
    "client_key": "kmg"
  }'
```
- [ ] Webhook returns success response
- [ ] Message appears in dashboard
- [ ] Customer name is correct

---

## 🔐 Security Testing

### Authentication
- [ ] Cannot access dashboard without login
- [ ] JWT token expires correctly
- [ ] Logout clears session
- [ ] Protected routes redirect to login

### Authorization
- [ ] Admin can access admin routes
- [ ] Client cannot access admin routes
- [ ] KMG client sees only KMG data
- [ ] Joban client sees only Joban data

### Data Isolation
- [ ] KMG customers not visible to Joban
- [ ] Joban customers not visible to KMG
- [ ] Webhook with wrong client_key fails
- [ ] Cross-client data access prevented

---

## 📊 Performance Testing

### Load Time
- [ ] Dashboard loads in < 3 seconds
- [ ] Customer list loads in < 2 seconds
- [ ] Sync operations complete in < 5 seconds
- [ ] No memory leaks after extended use

### Mobile Performance
- [ ] Smooth scrolling on mobile
- [ ] No lag when opening modals
- [ ] Forms respond quickly
- [ ] Navigation is smooth

---

## 🐛 Error Handling

### Network Errors
- [ ] Graceful handling of offline state
- [ ] Error messages are user-friendly
- [ ] Retry mechanism works
- [ ] No app crashes

### Validation Errors
- [ ] Required fields show error
- [ ] Invalid data formats rejected
- [ ] Error messages are clear
- [ ] Form doesn't submit with errors

### API Errors
- [ ] 404 errors handled gracefully
- [ ] 500 errors show user message
- [ ] Auth errors redirect to login
- [ ] Sync errors show helpful message

---

## 📝 Data Integrity

### Customer Data
- [ ] All fields save correctly
- [ ] Dates format properly (DD/MM/YYYY)
- [ ] Numbers save without corruption
- [ ] Special characters handled
- [ ] Empty fields handled correctly

### Sync Accuracy
- [ ] All customers sync to sheet
- [ ] Column order matches sheet
- [ ] No data loss during sync
- [ ] Updates reflect in sheet
- [ ] Deletes remove from sheet

---

## ✅ Final Verification

### Production Checklist
- [ ] All environment variables set in Railway
- [ ] GOOGLE_PRIVATE_KEY formatted correctly
- [ ] Service account has sheet access
- [ ] n8n webhooks updated to production URL
- [ ] CORS configured for production domain
- [ ] Database migrations completed
- [ ] No hardcoded localhost URLs
- [ ] All API endpoints use production URL

### Documentation
- [ ] RAILWAY-DEPLOYMENT.md reviewed
- [ ] N8N-WEBHOOK-SETUP.md reviewed
- [ ] All team members have access
- [ ] Support contacts documented

---

## 🚨 Rollback Plan

If critical issues found:
1. [ ] Document the issue
2. [ ] Check Railway logs
3. [ ] Revert to previous deployment if needed
4. [ ] Fix issue locally
5. [ ] Re-test before re-deploying

---

## 📞 Support Escalation

If tests fail:
1. Check Railway logs: `railway logs --tail`
2. Check browser console for errors
3. Verify environment variables
4. Test Google Sheets API manually
5. Review this checklist for missed steps

---

## ✨ Success Criteria

All tests must pass before marking deployment as successful:
- ✅ All core features work on production
- ✅ Mobile responsive on all devices
- ✅ Google Sheets sync works for both clients
- ✅ n8n webhooks log messages correctly
- ✅ Client-specific fields display correctly
- ✅ No console errors or warnings
- ✅ Performance is acceptable
- ✅ Security measures in place
