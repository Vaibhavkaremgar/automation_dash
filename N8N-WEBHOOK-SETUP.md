# n8n Webhook Configuration for Production

## 🔗 Production API Endpoint
**Base URL**: `https://hr-agent-dashboard-production-01fd.up.railway.app`

---

## 📨 Message Logging Webhook

### Endpoint Details
```
Method: POST
URL: https://hr-agent-dashboard-production-01fd.up.railway.app/api/insurance/log-message
Content-Type: application/json
```

### Request Body Schema
```json
{
  "customer_name": "string (required)",
  "mobile": "string (required)",
  "message_type": "string (required)",
  "channel": "string (required)",
  "message_content": "string (optional)",
  "status": "string (required)",
  "client_key": "string (required)"
}
```

### Field Descriptions

| Field | Type | Required | Description | Example Values |
|-------|------|----------|-------------|----------------|
| `customer_name` | string | Yes | Full name of customer | "Rajesh Kumar" |
| `mobile` | string | Yes | Mobile number (10 digits) | "9876543210" |
| `message_type` | string | Yes | Type of message sent | "reminder_30", "reminder_7", "reminder_1", "expired_7", "expired_15", "thank_you", "notification" |
| `channel` | string | Yes | Communication channel | "whatsapp", "sms", "email", "call" |
| `message_content` | string | No | Actual message text sent | "Your policy expires in 30 days" |
| `status` | string | Yes | Delivery status | "sent", "pending", "failed" |
| `client_key` | string | Yes | Client identifier | "kmg" or "joban" |

### Client Keys
- **KMG Insurance**: `"client_key": "kmg"`
- **Joban Putra Insurance**: `"client_key": "joban"`

---

## 🔧 n8n Workflow Configuration

### Workflow 1: WhatsApp Reminder Automation

#### Node 1: Schedule Trigger
```
Type: Schedule Trigger
Cron: 0 9 * * * (Daily at 9 AM)
```

#### Node 2: HTTP Request - Fetch Customers
```
Method: GET
URL: https://hr-agent-dashboard-production-01fd.up.railway.app/api/insurance/customers?vertical=motor
Authentication: None (or add if required)
```

#### Node 3: Filter - 30 Days Expiring
```
Condition: renewal_date is within 30 days
```

#### Node 4: WhatsApp Business API
```
Send WhatsApp message to customer
```

#### Node 5: HTTP Request - Log Message
```
Method: POST
URL: https://hr-agent-dashboard-production-01fd.up.railway.app/api/insurance/log-message
Headers:
  Content-Type: application/json
Body:
{
  "customer_name": "{{ $json.name }}",
  "mobile": "{{ $json.mobile_number }}",
  "message_type": "reminder_30",
  "channel": "whatsapp",
  "message_content": "{{ $node['WhatsApp'].json.message }}",
  "status": "{{ $node['WhatsApp'].json.status === 'success' ? 'sent' : 'failed' }}",
  "client_key": "kmg"
}
```

---

## 📋 Example n8n HTTP Request Node Configuration

### Configuration for Message Logging

```javascript
// n8n HTTP Request Node Settings
{
  "method": "POST",
  "url": "https://hr-agent-dashboard-production-01fd.up.railway.app/api/insurance/log-message",
  "authentication": "none",
  "requestFormat": "json",
  "jsonParameters": true,
  "options": {},
  "bodyParametersJson": {
    "customer_name": "={{ $json.name }}",
    "mobile": "={{ $json.mobile_number }}",
    "message_type": "reminder_30",
    "channel": "whatsapp",
    "message_content": "Your insurance policy expires in 30 days. Please renew soon.",
    "status": "sent",
    "client_key": "kmg"
  }
}
```

---

## 🎯 Message Type Reference

### Reminder Messages
- `reminder_30` - 30 days before expiry
- `reminder_7` - 7 days before expiry
- `reminder_1` - 1 day before expiry

### Expired Messages
- `expired_7` - 7 days after expiry
- `expired_15` - 15 days after expiry

### Other Messages
- `thank_you` - Thank you message after renewal
- `notification` - General notification

---

## ✅ Testing the Webhook

### Using cURL
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

### Expected Response
```json
{
  "success": true,
  "message": "Message logged successfully",
  "id": 123
}
```

### Error Response
```json
{
  "error": "Invalid client_key or customer not found"
}
```

---

## 🔐 Security Considerations

### Client Key Validation
- Each webhook request MUST include correct `client_key`
- KMG messages will only log for KMG customers
- Joban messages will only log for Joban customers
- Cross-contamination is prevented at API level

### Rate Limiting
- Consider implementing rate limiting in n8n
- Recommended: Max 100 requests per minute per client

---

## 🚨 Troubleshooting

### Issue: "Customer not found"
**Cause**: Customer with given mobile number doesn't exist in database
**Solution**: 
1. Verify mobile number format (10 digits, no spaces)
2. Check customer exists in dashboard
3. Ensure correct `client_key` is used

### Issue: "Invalid client_key"
**Cause**: client_key is missing or invalid
**Solution**: Use "kmg" or "joban" only

### Issue: Webhook timeout
**Cause**: Server not responding
**Solution**:
1. Check Railway deployment status
2. Verify production URL is correct
3. Check Railway logs for errors

---

## 📊 Monitoring & Logs

### View Message Logs in Dashboard
1. Login to production dashboard
2. Navigate to: Insurance → Messages
3. View all logged messages with status

### Check Railway Logs
```bash
railway logs --tail
```

### Filter by Client
Messages are automatically filtered by logged-in user's client type

---

## 🔄 Migration from Development to Production

### Steps to Update n8n Workflows

1. **Export Development Workflow**
   - Open n8n workflow
   - Click "..." → Export

2. **Update URLs**
   - Find all `localhost:5000` references
   - Replace with `https://hr-agent-dashboard-production-01fd.up.railway.app`

3. **Update Client Keys**
   - Ensure correct client_key in all HTTP nodes
   - KMG workflows: `"client_key": "kmg"`
   - Joban workflows: `"client_key": "joban"`

4. **Test Workflow**
   - Run workflow manually
   - Check message appears in dashboard
   - Verify customer name displays correctly

5. **Activate Workflow**
   - Enable workflow in n8n
   - Monitor first few executions

---

## 📞 Support Contacts

For webhook integration issues:
1. Check this documentation
2. Review Railway logs
3. Test with cURL command
4. Verify customer exists in database
5. Check n8n execution logs
