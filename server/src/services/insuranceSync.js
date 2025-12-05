const { google } = require('googleapis');
const axios = require('axios');
const config = require('../config/env');
const { get, run, all } = require('../db/connection');
const { getClientConfig } = require('../config/insuranceClients');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i+1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) { row.push(cur); cur = ''; continue; }
    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (cur.length || row.length) { row.push(cur); rows.push(row); row = []; cur=''; }
      continue;
    }
    cur += ch;
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

class InsuranceSyncService {
  constructor() {
    this.sheets = null;
  }

  initAuth() {
    if (this.sheets) return;
    
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    
    const hasCreds = !!(clientEmail && privateKey && privateKey.includes('BEGIN PRIVATE KEY'));
    
    if (hasCreds) {
      try {
        this.auth = new google.auth.JWT(
          clientEmail,
          null,
          privateKey,
          ['https://www.googleapis.com/auth/spreadsheets']
        );
        this.sheets = google.sheets({ version: 'v4', auth: this.auth });
        console.log('✅ Google Sheets API initialized successfully');
      } catch (e) {
        console.error('❌ Google auth init failed:', e?.message || e);
        this.sheets = null;
      }
    } else {
      console.error('❌ Google Sheets credentials missing or invalid');
      console.log('Client Email:', clientEmail ? 'Present' : 'Missing');
      console.log('Private Key:', privateKey ? (privateKey.includes('BEGIN PRIVATE KEY') ? 'Valid' : 'Invalid format') : 'Missing');
    }
  }

  async syncFromSheet(userId, spreadsheetId, tabName = 'updating_input') {
    this.initAuth();
    console.log(`Syncing insurance customers for user ${userId} from sheet ${spreadsheetId}, tab ${tabName}`);

    // Get user email to determine client config
    const user = await get('SELECT email FROM users WHERE id = ?', [userId]);
    const clientConfig = getClientConfig(user?.email);
    console.log(`Using config for client: ${clientConfig.name}`);

    let rows;
    if (this.sheets) {
      try {
        const response = await this.sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${tabName}!A:Y`,
        });
        rows = response.data.values;
        console.log(`Got ${rows?.length || 0} rows from Google Sheets API`);
      } catch (e) {
        console.log('Google Sheets API failed, trying CSV fallback:', e.message);
        rows = null;
      }
    }

    // Fallback: public CSV
    if (!rows) {
      try {
        const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
        console.log('Trying CSV fallback URL:', url);
        const resp = await axios.get(url, { timeout: 10000 });
        const csvRows = parseCsv(resp.data);
        rows = csvRows;
        console.log(`Got ${rows?.length || 0} rows from CSV fallback`);
      } catch (e) {
        console.error('CSV fallback failed:', e.message);
        throw new Error('Google Sheets not accessible');
      }
    }

    if (!rows || rows.length <= 1) {
      console.log('No data in sheet or only header row');
      return { imported: 0, updated: 0 };
    }
    
    console.log(`Processing ${rows.length - 1} data rows (excluding header)`);
    console.log('First data row sample:', rows[1]?.slice(0, 15));
    
    const data = rows.slice(1);
    let imported = 0;
    
    await run('DELETE FROM insurance_customers WHERE user_id = ?', [userId]);
    console.log(`Deleted existing customers for user ${userId}`);
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      let customer;
      
      if (clientConfig.key === 'joban') {
        // Joban Putra columns (0-based index):
        // A=0:Name, B=1:Mobile, C=2:Email, D=3:Product, E=4:Vertical, F=5:Policy No, G=6:Company, H=7:REGN no, I=8:Last Year Premium, J=9:Premium Amount, K=10:Premium Mode, L=11:Date of Expiry, M=12:TP Expiry, N=13:Activated Date, O=14:Status, P=15:ThankYouSent, Q=16:Cheque Hold, R=17:Payment Date, S=18:Cheque No, T=19:Cheque Bounce, U=20:New Policy No, V=21:New Policy Company, W=22:Policy doc link, X=23:Owner Alert Sent, Y=24:Notes
        const sheetVertical = (row[4] || '').toLowerCase().trim();
        let vertical = 'motor';
        if (sheetVertical.includes('life')) vertical = 'life';
        else if (sheetVertical.includes('health')) vertical = 'health';
        else if (sheetVertical.includes('non') && sheetVertical.includes('motor')) vertical = 'non-motor';
        else if (sheetVertical.includes('motor')) vertical = 'motor';
        
        customer = {
          name: row[0] || '',
          mobile_number: row[1] || '',
          email: row[2] || '',
          product: row[3] || '',
          vertical: vertical,
          current_policy_no: row[5] || '',
          company: row[6] || '',
          registration_no: row[7] || '',
          premium: parseFloat(row[9]) || 0,
          premium_mode: row[10] || '',
          renewal_date: row[11] || '',
          tp_expiry_date: row[12] || '',
          insurance_activated_date: row[13] || '',
          status: (row[14] || 'pending').toLowerCase(),
          thank_you_sent: row[15] || '',
          od_expiry_date: '',
          new_policy_no: row[20] || '',
          new_company: row[21] || '',
          policy_doc_link: row[22] || '',
          reason: '',
          notes: row[24] || ''
        };
        
        console.log('Parsed Joban customer:', customer.name, 'Premium:', customer.premium, 'Status:', customer.status, 'Renewal:', customer.renewal_date);
      } else {
        // KMG format (original)
        const sheetVertical = (row[8] || '').toLowerCase().trim();
        let vertical = 'motor';
        if (sheetVertical.includes('life')) vertical = 'life';
        else if (sheetVertical.includes('health')) vertical = 'health';
        else if (sheetVertical.includes('non') && sheetVertical.includes('motor')) vertical = 'non-motor';
        else if (sheetVertical.includes('motor')) vertical = 'motor';
        
        customer = {
          name: row[0] || '',
          mobile_number: row[1] || '',
          insurance_activated_date: row[2] || '',
          renewal_date: row[3] || '',
          od_expiry_date: row[4] || '',
          tp_expiry_date: row[5] || '',
          premium_mode: row[6] || '',
          premium: parseFloat(row[7]) || 0,
          vertical: vertical,
          product: row[9] || '',
          registration_no: row[10] || '',
          current_policy_no: row[11] || '',
          company: row[12] || '',
          status: (row[13] || 'pending').toLowerCase(),
          new_policy_no: row[14] || '',
          new_company: row[15] || '',
          policy_doc_link: row[16] || '',
          thank_you_sent: row[17] || '',
          reason: row[18] || '',
          email: row[19] || '',
          notes: row[20] || ''
        };
      }
      
      if (!customer.name || !customer.mobile_number) {
        console.log(`Skipping row ${i}: missing name or mobile`);
        continue;
      }
      
      try {
        await run(`
          INSERT OR IGNORE INTO insurance_customers (user_id, name, mobile_number, insurance_activated_date, renewal_date, od_expiry_date, tp_expiry_date, premium_mode, premium, vertical, product, registration_no, current_policy_no, company, status, new_policy_no, new_company, policy_doc_link, thank_you_sent, reason, email, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [userId, customer.name, customer.mobile_number, customer.insurance_activated_date, customer.renewal_date, customer.od_expiry_date, customer.tp_expiry_date, customer.premium_mode, customer.premium, customer.vertical, customer.product, customer.registration_no, customer.current_policy_no, customer.company, customer.status, customer.new_policy_no, customer.new_company, customer.policy_doc_link, customer.thank_you_sent, customer.reason, customer.email, customer.notes || '']);
        imported++;
      } catch (err) {
        console.error('Error inserting customer:', err);
      }
    }
    
    console.log(`Sync completed: ${imported} imported`);
    return { imported, updated: 0 };
  }

  async syncToSheet(userId, spreadsheetId, tabName = 'updating_input') {
    this.initAuth();
    if (!this.sheets) {
      throw new Error('Google Sheets not configured');
    }

    try {
      const user = await get('SELECT email FROM users WHERE id = ?', [userId]);
      const clientConfig = getClientConfig(user?.email);
      const customers = await all('SELECT * FROM insurance_customers WHERE user_id = ? ORDER BY id', [userId]);
      
      let values;
      if (clientConfig.key === 'joban') {
        // Joban Putra format
        values = customers.map(customer => [
          customer.name || '',
          customer.mobile_number || '',
          customer.email || '',
          customer.product || '',
          customer.vertical ? customer.vertical.charAt(0).toUpperCase() + customer.vertical.slice(1) : '',
          customer.current_policy_no || '',
          customer.company || '',
          customer.registration_no || '',
          '', // Last Year Premium
          customer.premium || '',
          customer.premium_mode || '',
          customer.renewal_date || '',
          customer.tp_expiry_date || '',
          customer.insurance_activated_date || '',
          customer.status || '',
          customer.thank_you_sent || '',
          '', // Cheque Hold
          '', // Payment Date
          '', // Cheque No
          '', // Cheque Bounce
          customer.new_policy_no || '',
          customer.new_company || '',
          customer.policy_doc_link || '',
          '', // Owner Alert Sent
          customer.notes || ''
        ]);
      } else {
        // KMG format
        values = customers.map(customer => [
          customer.name || '',
          customer.mobile_number || '',
          customer.insurance_activated_date || '',
          customer.renewal_date || '',
          customer.od_expiry_date || '',
          customer.tp_expiry_date || '',
          customer.premium_mode || '',
          customer.premium || '',
          customer.vertical ? customer.vertical.charAt(0).toUpperCase() + customer.vertical.slice(1) : '',
          customer.product || '',
          customer.registration_no || '',
          customer.current_policy_no || '',
          customer.company || '',
          customer.status || '',
          customer.new_policy_no || '',
          customer.new_company || '',
          customer.policy_doc_link || '',
          customer.thank_you_sent || '',
          customer.reason || '',
          customer.email || '',
          customer.notes || ''
        ]);
      }

      if (values.length > 0) {
        await this.sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: `${tabName}!A2:Y1000`
        });
        
        await this.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${tabName}!A2`,
          valueInputOption: 'RAW',
          resource: { values }
        });
      }

      return { success: true, exported: customers.length };
    } catch (error) {
      console.error('Sync to sheet failed:', error);
      throw error;
    }
  }

  formatDate(dateStr) {
    if (!dateStr) return '';
    // If already in DD/MM/YYYY format, return as is
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      return dateStr;
    }
    // Convert other formats to DD/MM/YYYY
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
}

module.exports = new InsuranceSyncService();