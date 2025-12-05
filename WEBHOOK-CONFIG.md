# Webhook Configuration for Insurance Clients

## 🔗 Webhook URLs

Both KMG and Joban Putra use the SAME webhook URL but with DIFFERENT `client_key` values.

### Base URL
```
http://host.docker.internal:5000/api/insurance/log-message
```

---

## 📋 KMG Insurance Workflow

**HTTP Node Configuration:**
- **URL:** `http://host.docker.internal:5000/api/insurance/log-message`
- **Method:** POST
- **Body (JSON):**
```json
{
  "customer_id": {{ $json.customer_id }},
  "message_type": "reminder_7",
  "channel": "whatsapp",
  "message_content": "{{ $json.message }}",
  "status": "sent",
  "sent_at": "{{ $now }}",
  "client_key": "kmg"
}
```

---

## 📋 Joban Putra Insurance Workflow

**HTTP Node Configuration:**
- **URL:** `http://host.docker.internal:5000/api/insurance/log-message`
- **Method:** POST
- **Body (JSON):**
```json
{
  "customer_id": {{ $json.customer_id }},
  "message_type": "reminder_7",
  "channel": "whatsapp",
  "message_content": "{{ $json.message }}",
  "status": "sent",
  "sent_at": "{{ $now }}",
  "client_key": "joban"
}
```

---

## 🔒 Client Isolation

The system validates that:
1. The `customer_id` belongs to the correct client
2. The `client_key` matches the customer's client type
3. If validation fails, the webhook is rejected with error

**Example:**
- If KMG workflow sends `client_key: "kmg"` with a Joban Putra customer ID → ❌ REJECTED
- If Joban workflow sends `client_key: "joban"` with a Joban customer ID → ✅ ACCEPTED

---

## 🧹 Auto-Cleanup

Messages and reminders older than 30 days are automatically deleted daily.

---

## 📝 Required Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| customer_id | number | Yes | Customer ID from database |
| message_type | string | No | Type of message (e.g., "reminder_7") |
| channel | string | Yes | Channel used (e.g., "whatsapp", "sms") |
| message_content | string | No | The message text sent |
| status | string | No | Status (e.g., "sent", "failed") |
| sent_at | string | No | ISO timestamp |
| client_key | string | Yes | "kmg" or "joban" |

---

## ✅ Testing

Test your webhook with curl:

**KMG Test:**
```bash
curl -X POST http://localhost:5000/api/insurance/log-message \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "channel": "whatsapp",
    "message_content": "Test message",
    "status": "sent",
    "client_key": "kmg"
  }'
```

**Joban Putra Test:**
```bash
curl -X POST http://localhost:5000/api/insurance/log-message \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1123,
    "channel": "whatsapp",
    "message_content": "Test message",
    "status": "sent",
    "client_key": "joban"
  }'
```
