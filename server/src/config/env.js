require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  
  // Database
  dbPath: process.env.DB_PATH || './data/hirehero.db',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
  jwtExpiresIn: '7d',
  
  // Google Sheets
  google: {
    projectId: process.env.GOOGLE_PROJECT_ID,
    clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
    privateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    // Default to provided sheet ID if env not set
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '1amZkYzhw2lMmIbw0ftFAw8KJ1SX86zJ2rubWDQgs8CE',
    sheetTab: process.env.GOOGLE_SHEETS_TAB || 'output',
  },
  
  // n8n
  n8n: {
    webhookUrl: process.env.N8N_WEBHOOK_URL,
    bulkWebhookUrl: process.env.N8N_BULK_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL,
    authHeader: process.env.N8N_AUTH_HEADER,
  },
  
  // Stripe
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    currency: process.env.STRIPE_CURRENCY || 'usd',
  },
  
  // Razorpay
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
  },
  
  // ElevenLabs
  elevenLabs: {
    apiKey: process.env.ELEVENLABS_API_KEY,
  },
  
  // Voice Assistant
  voice: {
    apiKey: process.env.VOICE_API_KEY,
    orgId: process.env.VOICE_ORG_ID,
    baseUrl: process.env.VOICE_BASE_URL || 'https://api.vapi.ai',
  },
  
  // Wallet
  wallet: {
    lowBalanceThreshold: parseFloat(process.env.LOW_BALANCE_THRESHOLD || '0.2'),
    minRechargeCents: parseInt(process.env.MIN_RECHARGE_CENTS || '500', 10),
  },
  
  // File Upload
  upload: {
    maxSizeMB: parseInt(process.env.MAX_UPLOAD_MB || '10', 10),
  },
  
  // Session & IP Security Features
  security: {
    enableIpRestrictions: process.env.ENABLE_IP_RESTRICTIONS === 'true',
    enableSessionLimits: process.env.ENABLE_SESSION_LIMITS === 'true',
    bypassIpForLocalhost: process.env.BYPASS_IP_FOR_LOCALHOST !== 'false',
  },
};

module.exports = config;
