# HR Agent Dashboard

Full-stack HR automation dashboard with insurance client support.

## Features

- ✅ Multi-tenant (HR & Insurance clients)
- ✅ Admin dashboard for client management
- ✅ Google Sheets integration
- ✅ Wallet & billing system
- ✅ Voice interview integration
- ✅ Resume parsing & candidate management
- ✅ IP restrictions (optional)
- ✅ Session limits (optional)

## Tech Stack

**Frontend:** React + TypeScript + Vite + TailwindCSS  
**Backend:** Node.js + Express + SQLite  
**Auth:** JWT with localStorage persistence

## Local Development

### 1. Backend Setup
```bash
cd server
npm install
npm start
```

Server runs on http://localhost:5000

### 2. Frontend Setup
```bash
cd client
npm install
npm run dev
```

Frontend runs on http://localhost:5173

### 3. Login Credentials

**Admin:**
- Email: vaibhavkar0009@gmail.com
- Password: Vaibhav@121

**KMG Insurance:**
- Email: kmginsurance@gmail.com
- Password: kmg123

**Joban Insurance:**
- Email: jobanputra@gmail.com
- Password: joban123

## Security Features

### IP Restrictions
Enable in `.env`:
```
ENABLE_IP_RESTRICTIONS=true
```

Admins can manage allowed IPs per client in the admin panel.

### Session Limits
Enable in `.env`:
```
ENABLE_SESSION_LIMITS=true
```

Limits concurrent logins per user (default: 5 sessions).

## Environment Variables

Copy `server/.env.sample` to `server/.env` and configure:

- Database path
- JWT secret
- Google Sheets credentials
- Payment gateway keys (Razorpay/Stripe)
- Voice API credentials
- Security settings

## Database

SQLite database located at `data/hirehero.db`

Auto-creates tables and seeds default users on first run.

## Deployment

Ready for deployment to:
- Railway
- Render
- Fly.io
- Any Node.js hosting

**Important:** Use persistent volume for database in production.

## Project Structure

```
├── client/          # React frontend
├── server/          # Express backend
├── data/            # SQLite database
└── README.md
```

## License

Proprietary
