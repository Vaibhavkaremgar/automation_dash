const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config/env');
const { runMigrations } = require('./db/connection');
const { errorHandler, notFoundHandler } = require('./middleware/error');

// Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const walletRoutes = require('./routes/wallet');
const billingRoutes = require('./routes/billing');
const toolsRoutes = require('./routes/tools');
const jobsRoutes = require('./routes/jobs');
const candidatesRoutes = require('./routes/candidates');
const resumesRoutes = require('./routes/resumes');
const emailRoutes = require('./routes/email');
const analyticsRoutes = require('./routes/analytics');
const clientAnalyticsRoutes = require('./routes/client-analytics');

const adminCandidatesRoutes = require('./routes/admin-candidates');
const voiceRoutes = require('./routes/voice');
const applicationsRoutes = require('./routes/applications');
const resumeParserRoutes = require('./routes/resume-parser');
const insuranceRoutes = require('./routes/insurance');
const insuranceConfigRoutes = require('./routes/insuranceConfig');
const messageWebhooksRoutes = require('./routes/messageWebhooks');
const profilesRoutes = require('./routes/profiles');
const backupRoutes = require('./routes/backup');
const leadsRoutes = require('./routes/leads');
const docUploaderRoutes = require('./routes/docUploader');


const app = express();

app.use(cors({
  origin: config.nodeEnv === 'production' 
    ? ['https://vbautomations.up.railway.app', config.frontendUrl].filter(Boolean)
    // Local Development
    // ? ['http://localhost:5173', config.frontendUrl].filter(Boolean)
    : ['http://localhost:5173', config.frontendUrl].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-profile-id'],
  exposedHeaders: ['Content-Type', 'Authorization']
}));


app.use(morgan('combined'));

// Stripe webhook needs raw body
app.use('/api/billing/stripe/webhook', express.raw({ type: 'application/json' }));
app.use('/api/billing/razorpay/webhook', express.raw({ type: 'application/json' }));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database and run migrations
async function initializeDatabase() {
  try {
    console.log('⏳ Initializing database...');
    await runMigrations();
    console.log('✅ Database migrations completed');
    
    // Seed admin user
    await seedAdminUser();
    console.log('✅ Database initialization complete');
  } catch (err) {
    console.error('❌ Failed to initialize database:', err);
    console.error('   Stack:', err.stack);
    
    // Don't exit immediately - let Railway retry
    console.error('⚠️ Server will continue but database may not be ready');
    // process.exit(1); // Commented out to prevent crash loop
  }
}

async function seedAdminUser() {
  const bcrypt = require('bcryptjs');
  const { get, run } = require('./db/connection');
  
  const users = [
    {
      email: 'vaibhavkar0009@gmail.com',
      password: 'Vaibhav@121',
      name: 'Admin',
      role: 'admin',
      client_type: 'hr',
      google_sheet_url: 'https://docs.google.com/spreadsheets/d/1amZkYzhw2lMmIbw0ftFAw8KJ1SX86zJ2rubWDQgs8CE/edit'
    },
    {
      email: 'kmginsurance@gmail.com',
      password: 'kmg123',
      name: 'KMG Insurance',
      role: 'client',
      client_type: 'insurance',
      google_sheet_url: 'https://docs.google.com/spreadsheets/d/1eg0JT8a1SR7PcwS3EnuVQlFUUwTRPdEfQtfLynpJfNg/edit'
    },
    {
      email: 'jobanputra@gmail.com',
      password: 'joban123',
      name: 'Joban Putra Insurance Shoppe',
      role: 'client',
      client_type: 'insurance',
      google_sheet_url: 'https://docs.google.com/spreadsheets/d/1CE5TFC5bFx7WixVLoVOzdiMntwgRISO9YVR_cWZhku4/edit'
    }
  ];
  
  for (const user of users) {
    try {
      const existing = await get('SELECT * FROM users WHERE email = ?', [user.email]);
      
      if (existing) {
        console.log(`✅ ${user.name} exists (ID: ${existing.id})`);
        // Update password if needed
        const isValid = await bcrypt.compare(user.password, existing.password_hash);
        if (!isValid) {
          const passwordHash = await bcrypt.hash(user.password, 10);
          await run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, existing.id]);
          console.log(`✅ Updated password for ${user.name}`);
        }
        
        const wallet = await get('SELECT * FROM wallets WHERE user_id = ?', [existing.id]);
        if (!wallet) {
          await run('INSERT INTO wallets (user_id, balance_cents) VALUES (?, ?)', [existing.id, 1000000]);
          console.log(`✅ Wallet created for ${user.name}`);
        }
        continue;
      }
      
      const passwordHash = await bcrypt.hash(user.password, 10);
      
      const result = await run(
        'INSERT INTO users (email, password_hash, name, role, client_type, google_sheet_url, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [user.email, passwordHash, user.name, user.role, user.client_type, user.google_sheet_url, 'active']
      );
      
      await run('INSERT INTO wallets (user_id, balance_cents) VALUES (?, ?)', [result.lastID, 1000000]);
      console.log(`✅ ${user.name} created (ID: ${result.lastID})`);
    } catch (err) {
      console.log(`⚠️ Error with ${user.name}: ${err.message}`);
    }
  }
}

initializeDatabase();

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Viral Bug Automations API', 
    version: '1.0.0',
    status: 'running' 
  });
});

app.use('/uploads', express.static('uploads'));

// Serve static files from client build
if (config.nodeEnv === 'production') {
  const path = require('path');
  app.use(express.static(path.join(__dirname, '../../client/dist')));
}

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/tools', toolsRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/candidates', candidatesRoutes);
app.use('/api/resumes', resumesRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/client-analytics', clientAnalyticsRoutes);
app.use('/api/admin/candidates', adminCandidatesRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/resume-parser', resumeParserRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/insurance-config', insuranceConfigRoutes);
app.use('/api/policies', require('./routes/policies'));
app.use('/api/webhooks', messageWebhooksRoutes);
app.use('/api/profiles', profilesRoutes);
app.use('/api/reset-passwords', require('./routes/reset-passwords'));
app.use('/api/backup', require('./routes/backup'));
app.use('/api/leads', leadsRoutes);
app.use('/api/doc-uploader', docUploaderRoutes);

// Serve index.html for all non-API routes in production
if (config.nodeEnv === 'production') {
  const path = require('path');
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
  console.log(`🚀 Viral Bug Automations server running on port ${config.port}`);
  console.log(`📝 Environment: ${config.nodeEnv}`);
  console.log(`🔗 Frontend URL: ${config.frontendUrl}`);
  
  // Backup scheduler disabled - no action needed
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

module.exports = app;