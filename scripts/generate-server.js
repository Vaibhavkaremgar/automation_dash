const fs = require('fs');
const path = require('path');

const serverRoot = path.join(__dirname, '..', 'server', 'src');

// This script generates all the remaining backend files
// Run this after npm install in the server directory

const files = {
  // Services
  'services/tools.js': `const { getDatabase } = require('../db/connection');
const walletService = require('./wallet');

class ToolsService {
  getPricing() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM tool_pricing WHERE is_active = 1').all();
  }
  
  getPricingByTool(toolName) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM tool_pricing WHERE tool_name = ? AND is_active = 1').get(toolName);
  }
  
  updatePricing(toolName, pricePerUnitCents, unitType, description) {
    const db = getDatabase();
    const stmt = db.prepare(\`
      UPDATE tool_pricing 
      SET price_per_unit_cents = ?, unit_type = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE tool_name = ?
    \`);
    stmt.run(pricePerUnitCents, unitType, description, toolName);
    return this.getPricingByTool(toolName);
  }
  
  computeCost(toolName, units) {
    const pricing = this.getPricingByTool(toolName);
    if (!pricing) throw new Error(\`Pricing not found for tool: \${toolName}\`);
    
    let cost = 0;
    if (toolName === 'elevenlabs') {
      cost = Math.ceil(units / 1000) * pricing.price_per_unit_cents;
    } else {
      cost = units * pricing.price_per_unit_cents;
    }
    return Math.round(cost);
  }
  
  logUsage(userId, toolName, units, metadata = null) {
    const db = getDatabase();
    const costCents = this.computeCost(toolName, units);
    
    if (!walletService.hasSufficientBalance(userId, costCents)) {
      throw new Error('Insufficient balance');
    }
    
    walletService.deductFunds(userId, costCents, \`\${toolName} usage\`);
    
    const stmt = db.prepare(\`
      INSERT INTO tool_usage (user_id, tool_name, units_consumed, credits_used_cents, metadata)
      VALUES (?, ?, ?, ?, ?)
    \`);
    stmt.run(userId, toolName, units, costCents, metadata ? JSON.stringify(metadata) : null);
    
    return { costCents, newBalance: walletService.getBalance(userId) };
  }
  
  getUsage(userId, fromDate = null, toDate = null) {
    const db = getDatabase();
    let query = 'SELECT * FROM tool_usage WHERE user_id = ?';
    const params = [userId];
    
    if (fromDate) {
      query += ' AND created_at >= ?';
      params.push(fromDate);
    }
    if (toDate) {
      query += ' AND created_at <= ?';
      params.push(toDate);
    }
    
    query += ' ORDER BY created_at DESC';
    return db.prepare(query).all(...params);
  }
}

module.exports = new ToolsService();`,

  'services/sheets.js': `const { google } = require('googleapis');
const config = require('../config/env');
const { getDatabase } = require('../db/connection');

class SheetsService {
  constructor() {
    if (config.google.clientEmail && config.google.privateKey) {
      this.auth = new google.auth.JWT(
        config.google.clientEmail,
        null,
        config.google.privateKey,
        ['https://www.googleapis.com/auth/spreadsheets.readonly']
      );
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    }
  }
  
  async syncCandidates(userId = null) {
    if (!this.sheets) {
      throw new Error('Google Sheets API not configured');
    }
    
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: config.google.spreadsheetId,
      range: \`\${config.google.sheetTab}!A:F\`,
    });
    
    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return { synced: 0, skipped: 0 };
    }
    
    const headers = rows[0];
    const data = rows.slice(1);
    
    const db = getDatabase();
    let synced = 0;
    let skipped = 0;
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowId = \`row_\${i + 2}\`;
      
      const candidate = {
        name: row[0] || null,
        match_score: row[1] || null,
        matching_skills: row[2] || null,
        missing_skills: row[3] || null,
        email: row[4] || null,
        summary: row[5] || null,
      };
      
      if (!candidate.email) {
        skipped++;
        continue;
      }
      
      try {
        const stmt = db.prepare(\`
          INSERT INTO candidates (user_id, name, email, match_score, matching_skills, missing_skills, summary, sheet_row_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(sheet_row_id) DO UPDATE SET
            name = excluded.name,
            email = excluded.email,
            match_score = excluded.match_score,
            matching_skills = excluded.matching_skills,
            missing_skills = excluded.missing_skills,
            summary = excluded.summary,
            updated_at = CURRENT_TIMESTAMP
        \`);
        
        stmt.run(
          userId || 1,
          candidate.name,
          candidate.email,
          candidate.match_score,
          candidate.matching_skills,
          candidate.missing_skills,
          candidate.summary,
          rowId
        );
        synced++;
      } catch (err) {
        console.error('Error syncing row:', err);
        skipped++;
      }
    }
    
    return { synced, skipped };
  }
}

module.exports = new SheetsService();`,

  'services/stripe.js': `const Stripe = require('stripe');
const config = require('../config/env');
const walletService = require('./wallet');

class StripeService {
  constructor() {
    if (config.stripe.secretKey) {
      this.stripe = new Stripe(config.stripe.secretKey);
    }
  }
  
  async createCheckoutSession(userId, amountCents) {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }
    
    if (amountCents < config.wallet.minRechargeCents) {
      throw new Error(\`Minimum recharge amount is \\$\${config.wallet.minRechargeCents / 100}\`);
    }
    
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: config.stripe.currency,
          product_data: {
            name: 'HireHero Wallet Recharge',
            description: \`Add \\$\${(amountCents / 100).toFixed(2)} to your wallet\`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: \`\${config.frontendUrl}/wallet?success=true\`,
      cancel_url: \`\${config.frontendUrl}/wallet?canceled=true\`,
      metadata: {
        userId: userId.toString(),
        amountCents: amountCents.toString(),
      },
    });
    
    return session;
  }
  
  async handleWebhook(rawBody, signature) {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }
    
    const event = this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      config.stripe.webhookSecret
    );
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = parseInt(session.metadata.userId, 10);
      const amountCents = parseInt(session.metadata.amountCents, 10);
      
      walletService.addFunds(
        userId,
        amountCents,
        'Stripe payment',
        session.payment_intent
      );
      
      return { success: true, userId, amountCents };
    }
    
    return { success: false };
  }
}

module.exports = new StripeService();`,

  'routes/auth.js': `const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDatabase } = require('../db/connection');
const config = require('../config/env');
const { authRequired } = require('../middleware/auth');
const walletService = require('../services/wallet');

const router = express.Router();

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    const db = getDatabase();
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND status = ?').get(email, 'active');
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );
    
    const wallet = walletService.getOrCreateWallet(user.id);
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        balance: wallet.balance_cents,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authRequired, (req, res, next) => {
  try {
    const db = getDatabase();
    const user = db.prepare('SELECT id, email, name, role, status FROM users WHERE id = ?').get(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const wallet = walletService.getOrCreateWallet(user.id);
    
    res.json({
      ...user,
      balance: wallet.balance_cents,
      isLowBalance: walletService.isLowBalance(user.id),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;`,

  'routes/admin.js': `const express = require('express');
const bcrypt = require('bcryptjs');
const { getDatabase } = require('../db/connection');
const { authRequired, requireRole } = require('../middleware/auth');
const walletService = require('../services/wallet');
const toolsService = require('../services/tools');

const router = express.Router();

router.use(authRequired, requireRole('admin'));

router.get('/users', (req, res, next) => {
  try {
    const db = getDatabase();
    const users = db.prepare(\`
      SELECT u.*, w.balance_cents 
      FROM users u 
      LEFT JOIN wallets w ON u.id = w.user_id 
      WHERE u.role = 'client'
      ORDER BY u.created_at DESC
    \`).all();
    
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

router.post('/users', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    const db = getDatabase();
    const passwordHash = await bcrypt.hash(password, 10);
    
    const stmt = db.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)');
    const result = stmt.run(email, passwordHash, name || null, 'client');
    
    walletService.getOrCreateWallet(result.lastInsertRowid);
    
    res.status(201).json({ 
      id: result.lastInsertRowid,
      email,
      name,
      role: 'client'
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/users/:id', async (req, res, next) => {
  try {
    const { name, status, password } = req.body;
    const userId = parseInt(req.params.id, 10);
    
    const db = getDatabase();
    
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, userId);
    }
    
    if (name !== undefined) {
      db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, userId);
    }
    
    if (status) {
      db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, userId);
    }
    
    const user = db.prepare('SELECT id, email, name, role, status FROM users WHERE id = ?').get(userId);
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.get('/users/:id/wallet', (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const wallet = walletService.getOrCreateWallet(userId);
    const transactions = walletService.getTransactions(userId, 20);
    
    res.json({ wallet, transactions });
  } catch (error) {
    next(error);
  }
});

router.get('/transactions', (req, res, next) => {
  try {
    const transactions = walletService.getAllTransactions(100, 0);
    res.json({ transactions });
  } catch (error) {
    next(error);
  }
});

router.put('/tools/pricing', (req, res, next) => {
  try {
    const { tool_name, price_per_unit_cents, unit_type, description } = req.body;
    
    if (!tool_name || !price_per_unit_cents || !unit_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const pricing = toolsService.updatePricing(tool_name, price_per_unit_cents, unit_type, description);
    res.json(pricing);
  } catch (error) {
    next(error);
  }
});

module.exports = router;`,

  'routes/wallet.js': `const express = require('express');
const { authRequired } = require('../middleware/auth');
const walletService = require('../services/wallet');

const router = express.Router();

router.use(authRequired);

router.get('/', (req, res, next) => {
  try {
    const wallet = walletService.getOrCreateWallet(req.user.id);
    const isLow = walletService.isLowBalance(req.user.id);
    
    res.json({ 
      ...wallet,
      balance_dollars: (wallet.balance_cents / 100).toFixed(2),
      is_low_balance: isLow
    });
  } catch (error) {
    next(error);
  }
});

router.get('/transactions', (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit || '50', 10);
    const offset = parseInt(req.query.offset || '0', 10);
    
    const transactions = walletService.getTransactions(req.user.id, limit, offset);
    
    res.json({ transactions });
  } catch (error) {
    next(error);
  }
});

module.exports = router;`,

  'routes/billing.js': `const express = require('express');
const { authRequired } = require('../middleware/auth');
const stripeService = require('../services/stripe');

const router = express.Router();

router.post('/create-checkout-session', authRequired, async (req, res, next) => {
  try {
    const { amount_cents } = req.body;
    
    if (!amount_cents || amount_cents < 500) {
      return res.status(400).json({ error: 'Minimum amount is $5' });
    }
    
    const session = await stripeService.createCheckoutSession(req.user.id, amount_cents);
    
    res.json({ checkoutUrl: session.url });
  } catch (error) {
    next(error);
  }
});

router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    const sig = req.headers['stripe-signature'];
    const result = await stripeService.handleWebhook(req.body, sig);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;`,

  'routes/tools.js': `const express = require('express');
const { authRequired } = require('../middleware/auth');
const toolsService = require('../services/tools');

const router = express.Router();

router.use(authRequired);

router.get('/pricing', (req, res, next) => {
  try {
    const pricing = toolsService.getPricing();
    res.json({ pricing });
  } catch (error) {
    next(error);
  }
});

router.get('/usage', (req, res, next) => {
  try {
    const from = req.query.from || null;
    const to = req.query.to || null;
    
    const usage = toolsService.getUsage(req.user.id, from, to);
    res.json({ usage });
  } catch (error) {
    next(error);
  }
});

router.post('/vapi/start', (req, res, next) => {
  try {
    res.json({ message: 'VAPI session started', sessionId: Date.now() });
  } catch (error) {
    next(error);
  }
});

router.post('/vapi/stop', (req, res, next) => {
  try {
    const { minutes } = req.body;
    
    if (!minutes || minutes < 0) {
      return res.status(400).json({ error: 'Invalid minutes' });
    }
    
    const result = toolsService.logUsage(req.user.id, 'vapi', minutes, { sessionId: req.body.sessionId });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/elevenlabs/tts', (req, res, next) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text required' });
    }
    
    const charCount = text.length;
    const result = toolsService.logUsage(req.user.id, 'elevenlabs', charCount, { text: text.substring(0, 100) });
    
    res.json({ ...result, charCount, audioUrl: 'https://placeholder-audio-url.com/tts.mp3' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;`,

  'routes/jobs.js': `const express = require('express');
const { authRequired } = require('../middleware/auth');
const { getDatabase } = require('../db/connection');

const router = express.Router();

router.use(authRequired);

router.get('/', (req, res, next) => {
  try {
    const db = getDatabase();
    const jobs = db.prepare('SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    
    res.json({ jobs });
  } catch (error) {
    next(error);
  }
});

router.post('/', (req, res, next) => {
  try {
    const { title, description, requirements } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title required' });
    }
    
    const db = getDatabase();
    const stmt = db.prepare('INSERT INTO jobs (user_id, title, description, requirements) VALUES (?, ?, ?, ?)');
    const result = stmt.run(req.user.id, title, description || null, requirements || null);
    
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(job);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    const { title, description, requirements, status } = req.body;
    
    const db = getDatabase();
    const job = db.prepare('SELECT * FROM jobs WHERE id = ? AND user_id = ?').get(jobId, req.user.id);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    const stmt = db.prepare(\`
      UPDATE jobs 
      SET title = ?, description = ?, requirements = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    \`);
    
    stmt.run(
      title !== undefined ? title : job.title,
      description !== undefined ? description : job.description,
      requirements !== undefined ? requirements : job.requirements,
      status !== undefined ? status : job.status,
      jobId
    );
    
    const updated = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM jobs WHERE id = ? AND user_id = ?');
    const result = stmt.run(jobId, req.user.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json({ message: 'Job deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;`,

  'routes/candidates.js': `const express = require('express');
const { authRequired, requireRole } = require('../middleware/auth');
const { getDatabase } = require('../db/connection');
const sheetsService = require('../services/sheets');

const router = express.Router();

router.use(authRequired);

router.post('/sync', async (req, res, next) => {
  try {
    const userId = req.user.role === 'admin' ? null : req.user.id;
    const result = await sheetsService.syncCandidates(userId);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/', (req, res, next) => {
  try {
    const db = getDatabase();
    const { status, jobId, search } = req.query;
    
    let query = 'SELECT * FROM candidates WHERE user_id = ?';
    const params = [req.user.id];
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    if (jobId) {
      query += ' AND job_id = ?';
      params.push(parseInt(jobId, 10));
    }
    
    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(\`%\${search}%\`, \`%\${search}%\`);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const candidates = db.prepare(query).all(...params);
    res.json({ candidates });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', (req, res, next) => {
  try {
    const candidateId = parseInt(req.params.id, 10);
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status required' });
    }
    
    const db = getDatabase();
    const stmt = db.prepare('UPDATE candidates SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?');
    const result = stmt.run(status, candidateId, req.user.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    
    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId);
    res.json(candidate);
  } catch (error) {
    next(error);
  }
});

module.exports = router;`,

  'routes/resumes.js': `const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const { authRequired } = require('../middleware/auth');
const config = require('../config/env');
const toolsService = require('../services/tools');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxSizeMB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files allowed'));
    }
  },
});

router.post('/upload', authRequired, upload.single('resume'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Resume file required' });
    }
    
    const { jobId, jobTitle } = req.body;
    
    if (!config.n8n.webhookUrl) {
      return res.status(503).json({ error: 'n8n webhook not configured. Please add N8N_WEBHOOK_URL to .env file' });
    }
    
    const form = new FormData();
    form.append('resume', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    form.append('userId', req.user.id);
    if (jobId) form.append('jobId', jobId);
    if (jobTitle) form.append('jobTitle', jobTitle);
    
    const headers = { ...form.getHeaders() };
    if (config.n8n.authHeader) {
      headers['Authorization'] = config.n8n.authHeader;
    }
    
    const response = await axios.post(config.n8n.webhookUrl, form, { headers });
    
    toolsService.logUsage(req.user.id, 'n8n', 1, { filename: req.file.originalname });
    
    res.json({
      message: 'Resume uploaded and sent to n8n',
      n8nResponse: response.data,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;`,

  'routes/email.js': `const express = require('express');
const { authRequired } = require('../middleware/auth');
const { getDatabase } = require('../db/connection');

const router = express.Router();

router.use(authRequired);

router.get('/history', (req, res, next) => {
  try {
    const db = getDatabase();
    const { candidateId } = req.query;
    
    let query = 'SELECT * FROM email_logs WHERE user_id = ?';
    const params = [req.user.id];
    
    if (candidateId) {
      query += ' AND candidate_id = ?';
      params.push(parseInt(candidateId, 10));
    }
    
    query += ' ORDER BY sent_at DESC';
    
    const emails = db.prepare(query).all(...params);
    res.json({ emails });
  } catch (error) {
    next(error);
  }
});

router.post('/send', (req, res, next) => {
  try {
    const { candidateId, email_type, subject, body } = req.body;
    
    if (!email_type || !subject || !body) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const db = getDatabase();
    
    let candidateEmail = null;
    if (candidateId) {
      const candidate = db.prepare('SELECT email FROM candidates WHERE id = ? AND user_id = ?').get(candidateId, req.user.id);
      if (candidate) candidateEmail = candidate.email;
    }
    
    const stmt = db.prepare(\`
      INSERT INTO email_logs (user_id, candidate_id, candidate_email, email_type, subject, body)
      VALUES (?, ?, ?, ?, ?, ?)
    \`);
    
    const result = stmt.run(req.user.id, candidateId || null, candidateEmail, email_type, subject, body);
    
    res.status(201).json({
      id: result.lastInsertRowid,
      message: 'Email logged (stub - not actually sent)',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;`,

  'routes/analytics.js': `const express = require('express');
const { authRequired, requireRole } = require('../middleware/auth');
const { getDatabase } = require('../db/connection');

const router = express.Router();

router.use(authRequired);

router.get('/admin', requireRole('admin'), (req, res, next) => {
  try {
    const db = getDatabase();
    
    const clients = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('client');
    const revenue = db.prepare('SELECT SUM(amount_cents) as total FROM transactions WHERE type = ?').get('recharge');
    const candidates = db.prepare('SELECT COUNT(*) as count FROM candidates').get();
    const jobs = db.prepare('SELECT COUNT(*) as count FROM jobs').get();
    
    const toolUsage = db.prepare(\`
      SELECT tool_name, SUM(units_consumed) as total_units, SUM(credits_used_cents) as total_cost
      FROM tool_usage
      GROUP BY tool_name
    \`).all();
    
    res.json({
      total_clients: clients.count,
      total_revenue_cents: revenue.total || 0,
      total_candidates: candidates.count,
      total_jobs: jobs.count,
      tool_usage: toolUsage,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/client', (req, res, next) => {
  try {
    const db = getDatabase();
    const userId = req.user.id;
    
    const jobs = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE user_id = ?').get(userId);
    const candidates = db.prepare('SELECT COUNT(*) as count FROM candidates WHERE user_id = ?').get(userId);
    
    const candidatesByStatus = db.prepare(\`
      SELECT status, COUNT(*) as count
      FROM candidates
      WHERE user_id = ?
      GROUP BY status
    \`).all(userId);
    
    const toolUsage = db.prepare(\`
      SELECT tool_name, SUM(units_consumed) as total_units, SUM(credits_used_cents) as total_cost
      FROM tool_usage
      WHERE user_id = ?
      GROUP BY tool_name
    \`).all(userId);
    
    res.json({
      my_jobs_count: jobs.count,
      my_candidates_count: candidates.count,
      candidates_by_status: candidatesByStatus,
      my_tool_usage: toolUsage,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;`,

  'index.js': `const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config/env');
const { runMigrations } = require('./db/connection');
const { errorHandler, notFoundHandler } = require('./middleware/error');

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

const app = express();

app.use(helmet());
app.use(cors({ origin: config.frontendUrl }));
app.use(morgan('dev'));

app.use('/api/billing/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

runMigrations();

app.get('/', (req, res) => {
  res.json({ message: 'HireHero API', version: '1.0.0' });
});

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

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(\`🚀 HireHero server running on http://localhost:\${config.port}\`);
});

module.exports = app;`,
};

Object.entries(files).forEach(([relativePath, content]) => {
  const filePath = path.join(serverRoot, relativePath);
  const dir = path.dirname(filePath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(filePath, content);
  console.log(\`✓ Created \${relativePath}\`);
});

console.log('\\n✅ All server files generated successfully!');
console.log('Next steps:');
console.log('1. cd server');
console.log('2. npm install');
console.log('3. Copy .env.sample to .env and configure');
console.log('4. node scripts/seed-admin.js');
console.log('5. npm run dev');
