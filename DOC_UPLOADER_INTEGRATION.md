# Doc Uploader Integration Guide

## Overview

The Doc Uploader feature integrates an external document management software with the HR Agent Dashboard. Users can upload, download, and manage documents through a separate application while viewing recent activity in the dashboard.

## Setup Instructions

### 1. Environment Variables

Add these variables to your `.env` files:

**Backend (.env):**
```
# External Doc Uploader Configuration
DOC_UPLOADER_URL=http://localhost:3001
DOC_UPLOADER_API_URL=http://localhost:3001/api
```

**Frontend (.env or .env.local):**
```
REACT_APP_DOC_UPLOADER_URL=http://localhost:3001
REACT_APP_DOC_API_URL=http://localhost:3001/api
```

### 2. Production Deployment

For production, update the URLs to your deployed doc uploader service:

```
# Production
DOC_UPLOADER_URL=https://docs.yourdomain.com
DOC_UPLOADER_API_URL=https://docs.yourdomain.com/api
```

## Features

### Dashboard Integration

The Doc Uploader section in the insurance dashboard sidebar includes:

1. **Quick Access Button** - "Open Doc Uploader" button redirects to external app
2. **Statistics Cards** - Display:
   - Total Uploads
   - Total Downloads
   - Processing Queue
   - Last Sync Time

3. **Recent Activity Feed** - Shows latest 10 document transactions with:
   - File name
   - Upload/Download type
   - File size
   - Status (completed, processing, failed)
   - Timestamp

### Auto-Sync

The dashboard automatically syncs with the external service every 30 seconds to display the latest updates.

## API Endpoints

### Backend Routes

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

#### GET `/api/doc-uploader/activity`
Fetch recent document activities from external service.

**Query Parameters:**
- `limit` (optional, default: 10) - Number of activities to fetch

**Response:**
```json
{
  "activities": [
    {
      "id": "doc-123",
      "fileName": "document.pdf",
      "type": "upload",
      "timestamp": "2024-01-15T10:30:00Z",
      "status": "completed",
      "fileSize": "2.5 MB",
      "uploadedBy": "user@example.com"
    }
  ],
  "stats": {
    "totalUploads": 45,
    "totalDownloads": 120,
    "processingQueue": 2,
    "lastSync": "2024-01-15T10:35:00Z"
  }
}
```

#### GET `/api/doc-uploader/stats`
Fetch document statistics.

**Response:**
```json
{
  "totalUploads": 45,
  "totalDownloads": 120,
  "processingQueue": 2,
  "lastSync": "2024-01-15T10:35:00Z"
}
```

#### POST `/api/doc-uploader/redirect-token`
Generate a secure redirect token for accessing the external doc uploader.

**Response:**
```json
{
  "redirectUrl": "http://localhost:3001?email=user@example.com&token=jwt_token&clientId=123",
  "expiresIn": 3600
}
```

#### GET `/api/doc-uploader/documents`
List documents from external service.

**Query Parameters:**
- `page` (optional, default: 1)
- `limit` (optional, default: 20)

**Response:**
```json
{
  "documents": [
    {
      "id": "doc-123",
      "fileName": "document.pdf",
      "fileSize": "2.5 MB",
      "uploadedAt": "2024-01-15T10:30:00Z",
      "status": "completed"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

## External Service Requirements

Your external doc uploader service should implement these API endpoints:

### Required Endpoints

#### GET `/api/documents/activity`
Return recent document activities for a client.

**Headers:**
- `Authorization: Bearer <token>`
- `X-Client-Email: <email>`

**Query Parameters:**
- `limit` - Number of activities to return
- `clientEmail` - Email of the client

**Response Format:**
```json
{
  "activities": [...],
  "stats": {...}
}
```

#### GET `/api/documents/stats`
Return document statistics for a client.

**Headers:**
- `Authorization: Bearer <token>`
- `X-Client-Email: <email>`

**Response Format:**
```json
{
  "totalUploads": 0,
  "totalDownloads": 0,
  "processingQueue": 0,
  "lastSync": "2024-01-15T10:35:00Z"
}
```

## Frontend Configuration

The frontend configuration is in `client/src/config/docUploaderConfig.ts`:

```typescript
export const DOC_UPLOADER_CONFIG = {
  APP_URL: process.env.REACT_APP_DOC_UPLOADER_URL || 'http://localhost:3001',
  API_ENDPOINT: process.env.REACT_APP_DOC_API_URL || 'http://localhost:3001/api',
  SYNC_INTERVAL: 30000, // 30 seconds
  MAX_ACTIVITIES: 10,
  // ... more config
}
```

## Authentication Flow

1. User clicks "Open Doc Uploader" button
2. Frontend requests redirect token from backend
3. Backend generates JWT-authenticated redirect URL
4. User is redirected to external app with token
5. External app validates token and authenticates user
6. User can upload/download documents
7. Dashboard syncs activity every 30 seconds

## Error Handling

If the external service is unavailable:
- Dashboard displays empty activity list
- Stats show zeros
- User can still click "Open Doc Uploader" (will fail gracefully)
- No errors are shown to user (graceful degradation)

## Troubleshooting

### Activities not showing
1. Check if external service is running
2. Verify `DOC_UPLOADER_API_URL` is correct
3. Check browser console for CORS errors
4. Verify JWT token is valid

### Redirect not working
1. Verify `DOC_UPLOADER_URL` is correct
2. Check if external service accepts query parameters
3. Verify token is being passed correctly

### CORS Issues
Add CORS headers to external service:
```
Access-Control-Allow-Origin: http://localhost:5000
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Authorization, X-Client-Email, Content-Type
```

## Future Enhancements

- Real-time WebSocket updates instead of polling
- Document preview in dashboard
- Direct upload from dashboard
- Document sharing and permissions
- Advanced search and filtering
- Document versioning
