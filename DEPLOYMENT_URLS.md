# Railway Deployment URLs

## Production URLs

### Frontend (Client)
- **URL:** https://enthusiastic-cat-production-f806.up.railway.app
- **Description:** React + TypeScript + Vite frontend application

### Backend (Server)
- **URL:** https://automationdash-production.up.railway.app
- **Description:** Node.js + Express API server

## Files Updated

The following files have been updated with the production URLs:

### Backend Configuration
1. **server/.env**
   - `FRONTEND_URL` updated to: `https://enthusiastic-cat-production-f806.up.railway.app`

2. **server/src/index.js**
   - CORS configuration updated to allow both localhost (for development) and production frontend URL

### Frontend Configuration
1. **client/.env.local**
   - `VITE_API_URL` updated to: `https://automationdash-production.up.railway.app`

2. **client/.env.production**
   - `VITE_API_URL` updated to: `https://automationdash-production.up.railway.app`

3. **client/src/lib/api.ts**
   - Default baseURL fallback updated to: `https://automationdash-production.up.railway.app`

## CORS Configuration

The backend now accepts requests from:
- **Development:** http://localhost:5173
- **Production:** https://enthusiastic-cat-production-f806.up.railway.app
- **Environment Variable:** Any URL specified in `FRONTEND_URL` env variable

## Next Steps

### 1. Rebuild and Redeploy
After these changes, you need to:

```bash
# Frontend
cd client
npm run build

# Backend - restart the server
cd server
npm start
```

### 2. Railway Deployment
Push these changes to your Railway deployment:

```bash
git add .
git commit -m "Update URLs for Railway deployment"
git push
```

Railway will automatically detect the changes and redeploy both services.

### 3. Environment Variables on Railway
Make sure the following environment variables are set in your Railway backend service:

- `NODE_ENV=production`
- `FRONTEND_URL=https://enthusiastic-cat-production-f806.up.railway.app`
- `PORT=5000` (or let Railway auto-assign)
- All other environment variables from your `.env` file

### 4. Test the Deployment
1. Visit: https://enthusiastic-cat-production-f806.up.railway.app
2. Try logging in with the credentials from README.md
3. Check browser console for any CORS errors
4. Verify API calls are going to: https://automationdash-production.up.railway.app

## Troubleshooting

### CORS Errors
If you see CORS errors in the browser console:
1. Check that `FRONTEND_URL` is correctly set in Railway backend environment variables
2. Verify the backend service is running
3. Check Railway logs for any startup errors

### API Connection Issues
If the frontend can't connect to the backend:
1. Verify both services are deployed and running on Railway
2. Check that the backend URL is correct in frontend environment variables
3. Test the backend health endpoint: https://automationdash-production.up.railway.app/

### Database Issues
Make sure Railway has persistent storage configured for the SQLite database:
- The database should be stored in a volume mounted at `/data`
- Check Railway volume configuration

## Security Notes

1. **HTTPS:** Both URLs use HTTPS in production
2. **Environment Variables:** Never commit sensitive data (API keys, secrets) to git
3. **CORS:** Only specified origins can access the API
4. **JWT:** Ensure `JWT_SECRET` is set to a strong random value in production

## Support

For issues with Railway deployment:
- Railway Docs: https://docs.railway.app/
- Railway Discord: https://discord.gg/railway
