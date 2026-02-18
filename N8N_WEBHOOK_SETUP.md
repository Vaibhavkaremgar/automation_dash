# n8n Webhook Setup for Message Logging

## Overview
This guide explains how to configure your n8n workflow to log messages to the dashboard with proper client segregation.

## API Endpoint
```
POST https://automationdash-production.up.railway.app/api/insurance/log-message
```

## Authentication
Use API Key authentication in your n8n HTTP Request node.

### Headers Required:
```
X-API-Key: n8n_webhook_secret_key_12345
```

OR

```
Authorization: Bearer n8n_webhook_secret_key_12345
```

## Request Body (JSON)

### Required Fields:
- `customer_id` (number): The customer ID from the database
- `client_key` (string): Must be either "joban" or "kmg"

### Optional Fields:
- `customer_name` (string): Customer name for fallback display
- `message_type` (string): Type of message (default: "renewal_reminder")
- `channel` (string): Communication channel (default: "whatsapp")
- `message_content` (string): The actual message content
- `status` (string): Message status (default: "sent")
- `sent_at` (string): ISO timestamp (default: current time)

### Example Request Body:
```json
{
  "customer_id": 123,
  "client_key": "joban",
  "customer_name": "John Doe",
  "message_type": "renewal_reminder",
  "channel": "whatsapp",
  "message_content": "Your insurance is expiring soon",
  "status": "sent",
  "sent_at": "2024-01-15T10:30:00Z"
}
```

## n8n HTTP Request Node Configuration

1. **Method**: POST
2. **URL**: `https://automationdash-production.up.railway.app/api/insurance/log-message`
3. **Authentication**: Generic Credential Type
   - Header Auth Name: `X-API-Key`
   - Header Auth Value: `n8n_webhook_secret_key_12345`
4. **Body Content Type**: JSON
5. **Specify Body**: Using Fields Below
6. **Body Parameters**:
   - `customer_id`: `{{ $json.customer_id }}`
   - `client_key`: `joban` (or `kmg` depending on workflow)
   - `customer_name`: `{{ $json.customer_name }}`
   - `message_type`: `renewal_reminder`
   - `channel`: `whatsapp`
   - `message_content`: `{{ $json.message }}`
   - `status`: `sent`

## Client Key Values

- **`joban`**: For Joban Putra Insurance messages
- **`kmg`**: For KMG Insurance Agency messages

## Important Notes

1. **Client Segregation**: Messages are automatically filtered by client_key
   - Joban users will ONLY see messages with `client_key: "joban"`
   - KMG users will ONLY see messages with `client_key: "kmg"`

2. **Security**: The API key must be kept secret and only used in n8n workflows

3. **Error Responses**:
   - `401 Unauthorized`: Invalid or missing API key
   - `400 Bad Request`: Missing required fields or invalid client_key
   - `500 Internal Server Error`: Database or server error

## Testing

You can test the endpoint using curl:

```bash
curl -X POST https://automationdash-production.up.railway.app/api/insurance/log-message \
  -H "X-API-Key: n8n_webhook_secret_key_12345" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 123,
    "client_key": "joban",
    "customer_name": "Test Customer",
    "message_type": "renewal_reminder",
    "channel": "whatsapp",
    "message_content": "Test message",
    "status": "sent"
  }'
```

## Success Response

```json
{
  "success": true,
  "id": 456
}
```

## Deployment Checklist

- [ ] Update `.env` file on Railway with `N8N_API_KEY=n8n_webhook_secret_key_12345`
- [ ] Restart the Railway deployment
- [ ] Update n8n HTTP Request node with API key
- [ ] Add `client_key` field to n8n workflow (joban or kmg)
- [ ] Test the webhook with sample data
- [ ] Verify messages appear in correct client dashboard
