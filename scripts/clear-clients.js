const path = require('path');
const { getDatabase } = require('../server/src/db/connection');

const db = getDatabase();

async function clearClients() {
  try {
    console.log('🧹 Clearing all client data...');
    
    // Get all client IDs first
    const clients = await new Promise((resolve, reject) => {
      db.all('SELECT id, email FROM users WHERE role = "client"', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`📋 Found ${clients.length} clients to remove:`);
    clients.forEach(client => console.log(`  - ${client.email} (ID: ${client.id})`));
    
    if (clients.length === 0) {
      console.log('✅ No clients found to remove');
      return;
    }
    
    // Delete related data for each client
    for (const client of clients) {
      const userId = client.id;
      
      // Delete in order to respect foreign key constraints
      await new Promise((resolve, reject) => {
        db.run('DELETE FROM email_logs WHERE user_id = ?', [userId], (err) => {
          if (err) reject(err); else resolve();
        });
      });
      
      await new Promise((resolve, reject) => {
        db.run('DELETE FROM candidates WHERE user_id = ?', [userId], (err) => {
          if (err) reject(err); else resolve();
        });
      });
      
      await new Promise((resolve, reject) => {
        db.run('DELETE FROM jobs WHERE user_id = ?', [userId], (err) => {
          if (err) reject(err); else resolve();
        });
      });
      
      await new Promise((resolve, reject) => {
        db.run('DELETE FROM tool_usage WHERE user_id = ?', [userId], (err) => {
          if (err) reject(err); else resolve();
        });
      });
      
      await new Promise((resolve, reject) => {
        db.run('DELETE FROM transactions WHERE user_id = ?', [userId], (err) => {
          if (err) reject(err); else resolve();
        });
      });
      
      await new Promise((resolve, reject) => {
        db.run('DELETE FROM wallets WHERE user_id = ?', [userId], (err) => {
          if (err) reject(err); else resolve();
        });
      });
      
      // Delete notifications if table exists
      await new Promise((resolve, reject) => {
        db.run('DELETE FROM notifications WHERE user_id = ?', [userId], (err) => {
          // Ignore error if table doesn't exist
          resolve();
        });
      });
      
      console.log(`🗑️  Cleared data for ${client.email}`);
    }
    
    // Finally delete the client users
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM users WHERE role = "client"', [], function(err) {
        if (err) reject(err);
        else {
          console.log(`✅ Deleted ${this.changes} client users`);
          resolve();
        }
      });
    });
    
    console.log('🎉 All client data cleared successfully!');
    
  } catch (error) {
    console.error('❌ Error clearing clients:', error);
  } finally {
    console.log('📊 Database operations completed');
  }
}

clearClients();