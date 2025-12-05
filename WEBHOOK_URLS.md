# Message Webhook URLs for n8n

## Database Tables Created

1. **kmg_message_logs** - For KMG Insurance Agency
2. **joban_message_logs** - For Joban Putra Insurance

## Webhook URLs

### For KMG Insurance (n8n HTTP Request Node)

**URL:** `https://your-railway-app.railway.app/api/webhooks/kmg/log-message`

**Method:** POST

**Body (JSON):**
```json
{
  "customer_id": 123,
  "customer_name": "John Doe",
  "customer_mobile": "9876543210",
  "message_type": "renewal_reminder",
  "channel": "whatsapp",
  "message_content": "Your policy is expiring soon...",
  "status": "sent"
}
```

---

### For Joban Putra Insurance (n8n HTTP Request Node)

**URL:** `https://your-railway-app.railway.app/api/webhooks/joban/log-message`

**Method:** POST

**Body (JSON):**
```json
{
  "customer_id": 456,
  "customer_name": "Jane Smith",
  "customer_mobile": "9876543210",
  "message_type": "renewal_reminder",
  "channel": "whatsapp",
  "message_content": "Your policy is expiring soon...",
  "status": "sent"
}
```

---

## Get Message Logs (Optional)

### KMG Messages
**URL:** `https://your-railway-app.railway.app/api/webhooks/kmg/messages?limit=100`
**Method:** GET

### Joban Messages
**URL:** `https://your-railway-app.railway.app/api/webhooks/joban/messages?limit=100`
**Method:** GET

---

## n8n Setup

### Step 1: Add HTTP Request Node
1. In your n8n workflow, add "HTTP Request" node
2. Set Method: POST
3. Set URL based on client (KMG or Joban)

### Step 2: Configure Body
```json
{
  "customer_id": {{ $json.customer_id }},
  "customer_name": "{{ $json.customer_name }}",
  "customer_mobile": "{{ $json.customer_mobile }}",
  "message_type": "renewal_reminder",
  "channel": "whatsapp",
  "message_content": "{{ $json.message }}",
  "status": "sent"
}
```

### Step 3: Headers
- Content-Type: application/json

---

## Deploy

```bash
git add .
git commit -m "feat: Add client-specific message log tables and webhooks"
git push origin main
```

After deployment, replace `your-railway-app.railway.app` with your actual Railway domain.

---

**Table Names:**
- `kmg_message_logs`
- `joban_message_logs`

**Webhook Endpoints:**
- `/api/webhooks/kmg/log-message`
- `/api/webhooks/joban/log-message`
