const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const config = require('../config/env');

// Use DB_PATH from env - support both absolute and relative paths
const dbPath = path.isAbsolute(config.dbPath) 
  ? config.dbPath 
  : path.resolve(__dirname, '../../', config.dbPath);
const dbDir = path.dirname(dbPath);

// Ensure data directory exists
try {
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`✅ Created database directory: ${dbDir}`);
  }
} catch (err) {
  console.error(`❌ Failed to create database directory: ${err.message}`);
  console.error(`   Path: ${dbDir}`);
  console.error(`   Tip: Ensure Railway volume is mounted at /data`);
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
    console.error(`   Path: ${dbPath}`);
    console.error(`   Directory: ${dbDir}`);
  } else {
    console.log('✅ Connected to SQLite database');
    console.log(`   Path: ${dbPath}`);
    
    // Enable WAL mode for better concurrent access
    db.run('PRAGMA journal_mode = WAL', (err) => {
      if (err) {
        console.error('⚠️ Could not enable WAL mode:', err.message);
      } else {
        console.log('✅ WAL mode enabled for better concurrency');
      }
    });
    
    // Set busy timeout to 5 seconds (handles concurrent writes)
    db.run('PRAGMA busy_timeout = 5000');
  }
});

// Enable foreign keys
// db.run('PRAGMA foreign_keys = ON'); // DISABLED to prevent constraint errors

// Helper function: promisify db.run
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        console.error('SQL Error (run):', err.message);
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

// Helper function: promisify db.get
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        console.error('SQL Error (get):', err.message);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

// Helper function: promisify db.all
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('SQL Error (all):', err.message);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

function getDatabase() {
  return db;
}

// Run schema + seed migrations safely
async function runMigrations() {
  try {
    // Create users table
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT,
        role TEXT DEFAULT 'client',
        status TEXT DEFAULT 'active',
        temp_password INTEGER DEFAULT 0,
        must_change_password INTEGER DEFAULT 0,
        google_sheet_url TEXT,
        client_type TEXT DEFAULT 'hr',
        company_name TEXT,
        max_sessions INTEGER DEFAULT 5,
        can_change_password INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Create message_logs table
    await run(`
      CREATE TABLE IF NOT EXISTS message_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT,
        customer_mobile TEXT,
        message_type TEXT,
        message_content TEXT,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create renewal_reminders table
    await run(`
      CREATE TABLE IF NOT EXISTS renewal_reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        customer_name TEXT,
        policy_number TEXT,
        reminder_type TEXT,
        reminder_date TEXT,
        sent_via TEXT,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES insurance_customers(id) ON DELETE SET NULL
      )
    `);



    // Create wallets table
    await run(`
      CREATE TABLE IF NOT EXISTS wallets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        balance_cents INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create transactions table
    await run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        description TEXT,
        stripe_payment_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create notifications table
    await run(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        data TEXT,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create jobs table
    await run(`
      CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        requirements TEXT,
        department TEXT,
        status TEXT DEFAULT 'open',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create candidates table
    await run(`
      CREATE TABLE IF NOT EXISTS candidates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        job_id INTEGER,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        mobile TEXT,
        resume_text TEXT,
        summary TEXT,
        match_score INTEGER,
        matching_skills TEXT,
        missing_skills TEXT,
        status TEXT DEFAULT 'applied',
        interview_date TEXT,
        transcript TEXT,
        job_description TEXT,
        sheet_row_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
      )
    `);

    // Create email_logs table
    await run(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        candidate_id INTEGER,
        candidate_email TEXT,
        candidate_name TEXT,
        email_type TEXT,
        gmail_message_id TEXT,
        meet_link TEXT,
        job_title TEXT,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'sent',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE SET NULL
      )
    `);

    // Create tool_pricing table
    await run(`
      CREATE TABLE IF NOT EXISTS tool_pricing (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tool_name TEXT UNIQUE NOT NULL,
        price_per_unit_cents INTEGER NOT NULL,
        unit_type TEXT NOT NULL,
        description TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create tool_usage table
    await run(`
      CREATE TABLE IF NOT EXISTS tool_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        tool_name TEXT NOT NULL,
        units_consumed REAL NOT NULL,
        credits_used_cents INTEGER NOT NULL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create client_analytics_cache table
    await run(`
      CREATE TABLE IF NOT EXISTS client_analytics_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        total_resumes INTEGER DEFAULT 0,
        interviews_scheduled INTEGER DEFAULT 0,
        interviews_today INTEGER DEFAULT 0,
        weekly_resumes INTEGER DEFAULT 0,
        weekly_interviews INTEGER DEFAULT 0,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create voice_interviews table
    await run(`
      CREATE TABLE IF NOT EXISTS voice_interviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        candidate_id INTEGER NOT NULL,
        session_id TEXT,
        duration_minutes INTEGER,
        transcript TEXT,
        status TEXT DEFAULT 'scheduled',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
      )
    `);

    // Create insurance_customers table
    await run(`
      CREATE TABLE IF NOT EXISTS insurance_customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        mobile_number TEXT NOT NULL,
        insurance_activated_date TEXT,
        renewal_date TEXT,
        od_expiry_date TEXT,
        tp_expiry_date TEXT,
        premium_mode TEXT,
        premium REAL DEFAULT 0,
        vertical TEXT DEFAULT 'motor',
        product TEXT,
        registration_no TEXT,
        current_policy_no TEXT,
        company TEXT,
        status TEXT DEFAULT 'pending',
        new_policy_no TEXT,
        new_company TEXT,
        policy_doc_link TEXT,
        thank_you_sent TEXT,
        reason TEXT,
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Check and add new columns if they don't exist
    const checkColumn = async (columnName) => {
      try {
        const result = await get(`PRAGMA table_info(insurance_customers)`);
        return false;
      } catch (e) {
        return false;
      }
    };
    
    try {
      const cols = await all(`PRAGMA table_info(insurance_customers)`);
      const colNames = cols.map(c => c.name);
      
      if (!colNames.includes('insurance_activated_date')) {
        await run(`ALTER TABLE insurance_customers ADD COLUMN insurance_activated_date TEXT`);
      }
      if (!colNames.includes('od_expiry_date')) {
        await run(`ALTER TABLE insurance_customers ADD COLUMN od_expiry_date TEXT`);
      }
      if (!colNames.includes('tp_expiry_date')) {
        await run(`ALTER TABLE insurance_customers ADD COLUMN tp_expiry_date TEXT`);
      }
      if (!colNames.includes('last_year_premium')) {
        await run(`ALTER TABLE insurance_customers ADD COLUMN last_year_premium REAL`);
      }
      if (!colNames.includes('cheque_hold')) {
        await run(`ALTER TABLE insurance_customers ADD COLUMN cheque_hold TEXT`);
      }
      if (!colNames.includes('payment_date')) {
        await run(`ALTER TABLE insurance_customers ADD COLUMN payment_date TEXT`);
      }
      if (!colNames.includes('cheque_no')) {
        await run(`ALTER TABLE insurance_customers ADD COLUMN cheque_no TEXT`);
      }
      if (!colNames.includes('cheque_bounce')) {
        await run(`ALTER TABLE insurance_customers ADD COLUMN cheque_bounce TEXT`);
      }
      if (!colNames.includes('owner_alert_sent')) {
        await run(`ALTER TABLE insurance_customers ADD COLUMN owner_alert_sent TEXT`);
      }
      if (!colNames.includes('notes')) {
        await run(`ALTER TABLE insurance_customers ADD COLUMN notes TEXT`);
      }
      if (!colNames.includes('veh_type')) {
        await run(`ALTER TABLE insurance_customers ADD COLUMN veh_type TEXT`);
      }
      if (!colNames.includes('modified_expiry_date')) {
        await run(`ALTER TABLE insurance_customers ADD COLUMN modified_expiry_date TEXT`);
      }
      if (!colNames.includes('product_type')) {
        await run(`ALTER TABLE insurance_customers ADD COLUMN product_type TEXT`);
      }
      if (!colNames.includes('product_model')) {
        await run(`ALTER TABLE insurance_customers ADD COLUMN product_model TEXT`);
      }
      if (!colNames.includes('bank_name')) {
        await run(`ALTER TABLE insurance_customers ADD COLUMN bank_name TEXT`);
      }
      if (!colNames.includes('customer_id')) {
        await run(`ALTER TABLE insurance_customers ADD COLUMN customer_id TEXT`);
      }
      if (!colNames.includes('agent_code')) {
        await run(`ALTER TABLE insurance_customers ADD COLUMN agent_code TEXT`);
      }
      if (!colNames.includes('pancard')) {
        await run(`ALTER TABLE insurance_customers ADD COLUMN pancard TEXT`);
      }
      if (!colNames.includes('aadhar_card')) {
        await run(`ALTER TABLE insurance_customers ADD COLUMN aadhar_card TEXT`);
      }
      if (!colNames.includes('others_doc')) {
        await run(`ALTER TABLE insurance_customers ADD COLUMN others_doc TEXT`);
      }
      if (!colNames.includes('g_code')) {
        await run(`ALTER TABLE insurance_customers ADD COLUMN g_code TEXT`);
      }
      if (!colNames.includes('paid_by')) {
        await run(`ALTER TABLE insurance_customers ADD COLUMN paid_by TEXT`);
      }
      if (!colNames.includes('policy_start_date')) {
        await run(`ALTER TABLE insurance_customers ADD COLUMN policy_start_date TEXT`);
      }
      if (!colNames.includes('s_no')) {
        await run(`ALTER TABLE insurance_customers ADD COLUMN s_no TEXT`);
      }
      if (!colNames.includes('sheet_row_number')) {
        await run(`ALTER TABLE insurance_customers ADD COLUMN sheet_row_number INTEGER`);
        console.log('✅ Added sheet_row_number column for stable ID mapping');
      }
      if (!colNames.includes('amount')) {
        await run(`ALTER TABLE insurance_customers ADD COLUMN amount REAL`);
      }
      if (!colNames.includes('dob')) {
        await run(`ALTER TABLE insurance_customers ADD COLUMN dob TEXT`);
      }
      if (!colNames.includes('gst_no')) {
        await run(`ALTER TABLE insurance_customers ADD COLUMN gst_no TEXT`);
      }
    } catch (e) {
      console.log('Column migration check:', e.message);
    }
    
    // Add is_admin column to users table
    try {
      const userCols = await all(`PRAGMA table_info(users)`);
      const userColNames = userCols.map(c => c.name);
      
      if (!userColNames.includes('is_admin')) {
        await run(`ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0`);
        console.log('✅ Added is_admin column to users table');
      }
    } catch (e) {
      console.log('User column migration check:', e.message);
    }

    // Create insurance_policies table
    await run(`
      CREATE TABLE IF NOT EXISTS insurance_policies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        policy_number TEXT UNIQUE,
        policy_type TEXT,
        customer_name TEXT,
        customer_email TEXT,
        customer_phone TEXT,
        premium_amount REAL,
        status TEXT DEFAULT 'active',
        start_date TEXT,
        end_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create insurance_claims table
    await run(`
      CREATE TABLE IF NOT EXISTS insurance_claims (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        customer_id INTEGER NOT NULL,
        policy_number TEXT,
        insurance_company TEXT,
        vehicle_number TEXT,
        claim_type TEXT,
        incident_date TEXT,
        description TEXT,
        claim_amount REAL,
        claim_status TEXT DEFAULT 'filed',
        claimant TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES insurance_customers(id) ON DELETE CASCADE
      )
    `);
    
    // Add claimant column if it doesn't exist
    try {
      const claimCols = await all(`PRAGMA table_info(insurance_claims)`);
      const claimColNames = claimCols.map(c => c.name);
      
      if (!claimColNames.includes('claimant')) {
        await run(`ALTER TABLE insurance_claims ADD COLUMN claimant TEXT`);
      }
      if (!claimColNames.includes('user_id')) {
        await run(`ALTER TABLE insurance_claims ADD COLUMN user_id INTEGER`);
      }
      if (!claimColNames.includes('customer_id')) {
        await run(`ALTER TABLE insurance_claims ADD COLUMN customer_id INTEGER`);
      }
    } catch (e) {
      console.log('Claims column migration check:', e.message);
    }

    // Create insurance_leads table
    await run(`
      CREATE TABLE IF NOT EXISTS insurance_leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        s_no TEXT,
        name TEXT NOT NULL,
        mobile_number TEXT NOT NULL,
        email TEXT,
        interested_in TEXT,
        policy_expiry_date TEXT,
        follow_up_date TEXT,
        lead_status TEXT DEFAULT 'new',
        priority TEXT DEFAULT 'warm',
        notes TEXT,
        referral_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create sessions table
    await run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create user_ip_allowlist table
    await run(`
      CREATE TABLE IF NOT EXISTS user_ip_allowlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        ip_address TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Seed default tool pricing
    const existingTools = await get('SELECT COUNT(*) as count FROM tool_pricing');
    if (existingTools.count === 0) {
      await run(`INSERT INTO tool_pricing (tool_name, price_per_unit_cents, unit_type, description, is_active) VALUES (?, ?, ?, ?, ?)`, 
        ['vapi', 510, 'minute', 'Voice calls (₹5 to provider + ₹0.10 margin)', 1]);
      await run(`INSERT INTO tool_pricing (tool_name, price_per_unit_cents, unit_type, description, is_active) VALUES (?, ?, ?, ?, ?)`, 
        ['elevenlabs', 30, '1k_chars', 'Text-to-speech', 1]);
      await run(`INSERT INTO tool_pricing (tool_name, price_per_unit_cents, unit_type, description, is_active) VALUES (?, ?, ?, ?, ?)`, 
        ['n8n', 10, 'execution', 'Workflow execution', 1]);
    }

    console.log('✅ Database migrations completed successfully');
    
    // Add indexes for performance
    await run('CREATE INDEX IF NOT EXISTS idx_insurance_customers_user_vertical ON insurance_customers(user_id, vertical)');
    await run('CREATE INDEX IF NOT EXISTS idx_insurance_customers_status ON insurance_customers(status)');
    await run('CREATE INDEX IF NOT EXISTS idx_insurance_customers_renewal_date ON insurance_customers(renewal_date)');
    await run('CREATE INDEX IF NOT EXISTS idx_insurance_customers_sheet_row ON insurance_customers(user_id, sheet_row_number)');
    console.log('✅ Database indexes created');
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    throw error;
  }
}

// Gracefully close DB connection
function closeDatabase() {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err.message);
        reject(err);
      } else {
        console.log('🛑 Database connection closed');
        resolve();
      }
    });
  });
}

module.exports = {
  getDatabase,
  runMigrations,
  closeDatabase,
  run,
  get,
  all,
};
