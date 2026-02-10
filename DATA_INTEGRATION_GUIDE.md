# Doc Uploader - Data Integration & Operations Guide

## Current Setup

**External Service URL:** https://document-system-production-1a7e.up.railway.app/

The Doc Uploader dashboard is now integrated with the external document management system.

## How to Pull Data from External Software

### Option 1: Direct API Integration (Recommended)

If the external service has a public API, you can:

1. **Check API Documentation** - Contact the external service provider for their API endpoints
2. **Add Backend Proxy Routes** - Create routes in `server/src/routes/docUploader.js` to forward requests
3. **Fetch in Frontend** - Call the backend endpoints from the dashboard

Example backend route:
```javascript
router.get('/search', authRequired, async (req, res) => {
  const { query } = req.query
  // Forward to external API
  const response = await axios.get(`${EXTERNAL_API}/search?q=${query}`)
  res.json(response.data)
})
```

### Option 2: Iframe Integration

Embed the external service directly in the dashboard:
```jsx
<iframe 
  src="https://document-system-production-1a7e.up.railway.app/"
  className="w-full h-screen border-0"
/>
```

### Option 3: Webhook Integration

The external service can send updates to your backend:
```javascript
// Receive updates from external service
router.post('/webhook/document-update', (req, res) => {
  const { documentId, status, fileName } = req.body
  // Store in your database
  res.json({ success: true })
})
```

## Search & Operations Available

### Current Dashboard Features:

1. **Search Bar** - Ready to implement search functionality
   - Frontend has search input field
   - Backend endpoint `/api/doc-uploader/documents` supports search parameter
   - Can filter by document name

2. **Statistics Display**
   - Total Uploads
   - Total Downloads
   - Processing Queue
   - Last Sync Time

3. **Recent Activity Feed**
   - Shows latest document transactions
   - Displays upload/download status
   - Shows timestamps

### To Add Search Functionality:

**Step 1: Update Backend Route** (`server/src/routes/docUploader.js`)
```javascript
router.get('/documents', authRequired, async (req, res) => {
  const { page = 1, limit = 20, search = '' } = req.query
  
  // If external API supports search:
  const response = await axios.get(`${EXTERNAL_API}/documents`, {
    params: { page, limit, search }
  })
  
  res.json(response.data)
})
```

**Step 2: Update Frontend** (`client/src/pages/DocUploader.tsx`)
```typescript
const handleSearch = async (e: React.FormEvent) => {
  e.preventDefault()
  const response = await fetch(`/api/doc-uploader/documents?search=${searchQuery}`)
  const data = await response.json()
  setActivities(data.documents)
}
```

## What Operations Can Be Performed

### From Dashboard (Currently Available):
- ✅ View recent activity
- ✅ Search documents (ready to implement)
- ✅ Open external app in new tab
- ✅ View statistics

### From External App (Direct):
- Upload documents
- Download documents
- Delete documents
- Share documents
- Organize in folders
- (Check external app for full features)

## Integration Checklist

To fully integrate with the external service:

- [ ] Get API documentation from external service provider
- [ ] Identify available endpoints (search, list, upload, download, etc.)
- [ ] Add backend routes for each operation
- [ ] Update frontend to call new endpoints
- [ ] Add error handling
- [ ] Test all operations
- [ ] Add authentication/authorization checks

## Backend Endpoints Ready to Use

```
GET  /api/doc-uploader/activity    - Fetch recent activities
GET  /api/doc-uploader/stats       - Fetch statistics
GET  /api/doc-uploader/documents   - List/search documents
POST /api/doc-uploader/redirect-token - Get redirect URL
```

## Next Steps

1. **Contact External Service Provider** - Ask for API documentation
2. **Identify Required Endpoints** - List what operations you need
3. **Implement Backend Routes** - Add proxy routes for each operation
4. **Update Frontend UI** - Add buttons/forms for operations
5. **Test Integration** - Verify all operations work correctly

## Example: Adding Download Functionality

**Backend:**
```javascript
router.post('/download', authRequired, async (req, res) => {
  const { documentId } = req.body
  const response = await axios.get(`${EXTERNAL_API}/documents/${documentId}/download`)
  res.json({ downloadUrl: response.data.url })
})
```

**Frontend:**
```typescript
const handleDownload = async (documentId: string) => {
  const response = await fetch('/api/doc-uploader/download', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ documentId })
  })
  const data = await response.json()
  window.open(data.downloadUrl)
}
```

## Notes

- The external service is deployed at: https://document-system-production-1a7e.up.railway.app/
- All backend requests require JWT authentication
- Frontend automatically syncs every 30 seconds
- Search functionality is ready to implement once API is available
- Mock data is returned if external service is unavailable (graceful degradation)
