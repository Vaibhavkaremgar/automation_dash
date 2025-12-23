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

  async syncFromSheet(userId, spreadsheetId, tabName = 'updating_input', tabType = 'general') {
    this.initAuth();
    console.log(`🔄 Syncing insurance customers for user ${userId} from sheet ${spreadsheetId}, tab ${tabName}`);

    // Get user email to determine client config
    const user = await get('SELECT email FROM users WHERE id = ?', [userId]);
    const clientConfig = getClientConfig(user?.email);
    console.log(`📋 Using config for client: ${clientConfig.name}`);

    // Get schema for this tab type
    const schema = clientConfig.tabs[tabType]?.schema;
    if (!schema) {
      throw new Error(`No schema found for tab type: ${tabType}`);
    }

    let rows;
    if (this.sheets) {
      try {
        console.log('📡 Attempting Google Sheets API read...');
        const range = tabType === 'life' ? `${tabName}!A:AB` : `${tabName}!A:AD`;
        const response = await this.sheets.spreadsheets.values.get({
          spreadsheetId,
          range: range,
        });
        rows = response.data.values;
        console.log(`✅ Got ${rows?.length || 0} rows from Google Sheets API`);
      } catch (e) {
        console.error('❌ Google Sheets API failed:', e.message);
        console.log('🔄 Trying CSV fallback...');
        rows = null;
      }
    } else {
      console.log('⚠️  Google Sheets API not initialized, using CSV fallback');
    }

    // Fallback: public CSV
    if (!rows) {
      try {
        const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
        console.log('🔄 Trying CSV fallback URL:', url);
        const resp = await axios.get(url, { timeout: 10000 });
        const csvRows = parseCsv(resp.data);
        rows = csvRows;
        console.log(`✅ Got ${rows?.length || 0} rows from CSV fallback`);
      } catch (e) {
        console.error('❌ CSV fallback failed:', e.message);
        throw new Error(`Google Sheets not accessible: ${e.message}`);
      }
    }

    // STEP 1: DELETE ALL EXISTING DATA FOR THIS USER (ONLY FOR THIS TAB TYPE)
    console.log(`🗑️  Deleting existing ${tabType} customers for user ${userId}...`);
    if (tabType === 'life') {
      await run('DELETE FROM insurance_customers WHERE user_id = ? AND vertical = ?', [userId, 'life']);
    } else {
      await run('DELETE FROM insurance_customers WHERE user_id = ? AND vertical IN (?, ?, ?, ?)', [userId, 'motor', 'health', 'non-motor', '2-wheeler']);
    }
    console.log(`✅ Existing ${tabType} data cleared`);
    
    if (!rows || rows.length <= 1) {
      console.log('⚠️  No data in sheet or only header row - all data deleted');
      return { imported: 0, updated: 0 };
    }
    
    console.log(`📊 Sheet has ${rows.length} total rows (including header)`);
    console.log(`📊 First row (header):`, rows[0]);
    console.log(`📊 Second row (first data):`, rows[1]);
    console.log(`📊 Processing ${rows.length - 1} data rows`);
    
    // Build column index map from header row
    const headerRow = rows[0];
    const columnMap = {};
    headerRow.forEach((colName, index) => {
      columnMap[colName] = index;
    });
    console.log('📋 Column mapping:', columnMap);
    
    // Helper function to get value by column name
    const getCell = (row, fieldName) => {
      const colName = schema[fieldName];
      if (!colName) return '';
      const colIndex = columnMap[colName];
      return colIndex !== undefined ? (row[colIndex] || '') : '';
    };
    
    const data = rows.slice(1); // Skip header
    let imported = 0;
    let skipped = 0;
    
    // STEP 2: INSERT ALL ROWS FROM SHEET
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      // Skip completely empty rows
      if (!row || row.every(cell => !cell || cell.trim() === '')) {
        skipped++;
        continue;
      }
      
      let customer;
      
      if (tabType === 'life') {
        let rawStatus = (getCell(row, 'status') || 'due').toLowerCase().trim();
        if (rawStatus === 'due' || rawStatus === 'pending') rawStatus = 'due';
        else if (rawStatus === 'renewed' || rawStatus === 'done') rawStatus = 'renewed';
        else if (rawStatus === 'not renewed' || rawStatus === 'lost') rawStatus = 'not renewed';
        else if (rawStatus === 'inprocess' || rawStatus === 'in process') rawStatus = 'inprocess';
        
        customer = {
          name: getCell(row, 'name'),
          mobile_number: getCell(row, 'mobile_number'),
          email: getCell(row, 'email'),
          current_policy_no: getCell(row, 'current_policy_no'),
          company: getCell(row, 'company'),
          premium: parseFloat(getCell(row, 'premium')) || 0,
          premium_mode: getCell(row, 'premium_mode'),
          renewal_date: this.formatDate(getCell(row, 'renewal_date')),
          payment_date: this.formatDate(getCell(row, 'payment_date')),
          status: rawStatus,
          thank_you_sent: getCell(row, 'thank_you_sent'),
          vertical: 'life',
          notes: getCell(row, 'notes'),
          registration_no: '',
          od_expiry_date: '',
          tp_expiry_date: '',
          insurance_activated_date: '',
          product: '',
          new_policy_no: '',
          new_company: '',
          policy_doc_link: '',
          reason: ''
        };
      } else {
        let rawStatus = (getCell(row, 'status') || 'due').toLowerCase().trim();
        if (rawStatus === 'due' || rawStatus === 'pending') rawStatus = 'due';
        else if (rawStatus === 'renewed' || rawStatus === 'done') rawStatus = 'renewed';
        else if (rawStatus === 'not renewed' || rawStatus === 'lost') rawStatus = 'not renewed';
        else if (rawStatus === 'inprocess' || rawStatus === 'in process') rawStatus = 'inprocess';
        
        const originalType = getCell(row, 'vertical');
        const sheetVertical = originalType.toLowerCase().trim();
        let vertical = 'non-motor';
        if (sheetVertical === 'motor') vertical = 'motor';
        else if (sheetVertical === 'health') vertical = 'health';
        else if (sheetVertical === 'non-motor') vertical = 'non-motor';
        else if (sheetVertical.includes('motor') && !sheetVertical.includes('non')) vertical = 'motor';
        else if (sheetVertical.includes('health')) vertical = 'health';
        else vertical = 'non-motor';
        
        const modifiedExpiry = this.formatDate(getCell(row, 'renewal_date'));
        const dateOfExpiry = this.formatDate(getCell(row, 'od_expiry_date'));
        const finalRenewalDate = modifiedExpiry && modifiedExpiry.trim() !== '' ? modifiedExpiry : dateOfExpiry;
        
        customer = {
          name: getCell(row, 'name'),
          mobile_number: getCell(row, 'mobile_number'),
          email: getCell(row, 'email'),
          current_policy_no: getCell(row, 'current_policy_no'),
          company: getCell(row, 'company'),
          registration_no: getCell(row, 'registration_no'),
          premium: parseFloat(getCell(row, 'premium')) || 0,
          premium_mode: getCell(row, 'premium_mode'),
          last_year_premium: getCell(row, 'last_year_premium'),
          renewal_date: finalRenewalDate,
          od_expiry_date: dateOfExpiry,
          tp_expiry_date: this.formatDate(getCell(row, 'tp_expiry_date')),
          payment_date: this.formatDate(getCell(row, 'payment_date')),
          status: rawStatus,
          thank_you_sent: getCell(row, 'thank_you_sent'),
          new_policy_no: getCell(row, 'new_policy_no'),
          new_company: getCell(row, 'new_company'),
          veh_type: getCell(row, 'veh_type'),
          vertical: vertical,
          product: originalType,
          notes: getCell(row, 'notes'),
          modified_expiry_date: modifiedExpiry,
          insurance_activated_date: '',
          policy_doc_link: '',
          reason: ''
        };
      }
      
      // Skip rows without name or mobile
      if (!customer.name || !customer.mobile_number) {
        console.log(`⚠️  Skipping row ${i + 2}: missing ${!customer.name ? 'NAME' : ''} ${!customer.name && !customer.mobile_number ? 'and' : ''} ${!customer.mobile_number ? 'MOBILE NO' : ''} (name='${customer.name}', mobile='${customer.mobile_number}')`);
        skipped++;
        continue;
      }
      
      try {
        await run(`
          INSERT INTO insurance_customers (user_id, name, mobile_number, insurance_activated_date, renewal_date, od_expiry_date, tp_expiry_date, premium_mode, premium, vertical, product, registration_no, current_policy_no, company, status, new_policy_no, new_company, policy_doc_link, thank_you_sent, reason, email, notes, veh_type, modified_expiry_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [userId, customer.name, customer.mobile_number, customer.insurance_activated_date, customer.renewal_date, customer.od_expiry_date, customer.tp_expiry_date, customer.premium_mode, customer.premium, customer.vertical, customer.product, customer.registration_no, customer.current_policy_no, customer.company, customer.status, customer.new_policy_no, customer.new_company, customer.policy_doc_link, customer.thank_you_sent, customer.reason, customer.email, customer.notes || '', customer.veh_type || '', customer.modified_expiry_date || '']);
        imported++;
        if (imported <= 3) {
          console.log(`✅ Imported row ${i + 2}: ${customer.name} (${customer.vertical})`);
        }
      } catch (err) {
        console.error(`❌ Error inserting customer row ${i + 2}:`, err.message);
        console.error('Customer data:', customer);
        skipped++;
      }
    }
    
    console.log(`✅ Sync completed: ${imported} imported, ${skipped} skipped`);
    console.log(`📊 Summary: Total rows in sheet: ${rows.length - 1}, Imported: ${imported}, Skipped: ${skipped}`);
    if (skipped > 0) {
      console.log(`⚠️  ${skipped} rows were skipped due to missing NAME or MOBILE NO fields`);
    }
    return { imported, updated: 0 };
  }

  async syncToSheet(userId, spreadsheetId, tabName = 'updating_input', verticalFilter = null) {
    this.initAuth();
    if (!this.sheets) {
      throw new Error('Google Sheets not configured');
    }

    try {
      console.log(`🔄 Syncing TO sheet - User: ${userId}, Tab: ${tabName}, Filter:`, verticalFilter);
      const user = await get('SELECT email FROM users WHERE id = ?', [userId]);
      const clientConfig = getClientConfig(user?.email);
      console.log(`📋 Client: ${clientConfig.name}`);
      
      let query = 'SELECT * FROM insurance_customers WHERE user_id = ?';
      const params = [userId];
      
      if (verticalFilter && verticalFilter.length > 0) {
        const placeholders = verticalFilter.map(() => '?').join(',');
        query += ` AND vertical IN (${placeholders})`;
        params.push(...verticalFilter);
      }
      
      const customers = await all(query + ' ORDER BY id', params);
      console.log(`📊 Found ${customers.length} customers to sync`);
      
      let values;
      
      const isLifeTab = verticalFilter && verticalFilter.includes('life') && !verticalFilter.includes('motor');
      
      if (isLifeTab) {
        // Life Insurance format: STATUS, THANKYOU MESSAGE SENT, PAYMENT DATE, DATE OF EXPIRY, POLICY NO, NAME, EMAIL ID, MOBILE NO, PREMIUM, INSURER, AG, POL, PT, PPT, MD, BR, SUMM, PAYMENT TYPE, PHONE CALL, SORT, COM, I MAGIC, TRUE, _PREVSTATUS, _PREVRANK, _FAMEARLIEST, REMARKS
        values = customers.map(customer => [
          customer.status || 'due',
          customer.thank_you_sent || '',
          customer.payment_date || '',
          customer.renewal_date || '',
          customer.current_policy_no || '',
          customer.name || '',
          customer.email || '',
          customer.mobile_number || '',
          customer.premium || '',
          customer.company || '',
          '', '', '', '', // AG, POL, PT, PPT
          customer.premium_mode || '',
          '', '', '', '', '', '', '', '', '', '', '', // BR, SUMM, PAYMENT TYPE, PHONE CALL, SORT, COM, I MAGIC, TRUE, _PREVSTATUS, _PREVRANK, _FAMEARLIEST
          customer.notes || ''
        ]);
      } else {
        // General Insurance format: S NO, NAME, POLICY NO, G CODE, LAST YEAR PREMIUM, DATE OF EXPIRY, MODIFIED EXPIRY DATE, COMPANY, TYPE, DEPOSITED/PAYMENT DATE, CHQ NO & DATE, BANK NAME, CUSTOMER ID, AGENT CODE, AMOUNT, NEW POLICY NO, NEW POLICY COMPANY, VEH TYPE, VEH Model, VEH NO, TP Expiry Date, Premium mode, EMAIL ID, MOBILE NO, STATUS, Thankyou message sent, REMARKS
        values = customers.map((customer, index) => [
          index + 1, // S NO
          customer.name || '',
          customer.current_policy_no || '',
          '', // G CODE
          customer.last_year_premium || '',
          customer.od_expiry_date || '',
          customer.modified_expiry_date || '',
          customer.company || '',
          customer.vertical || '',
          customer.payment_date || '',
          '', '', '', '', // CHQ NO & DATE, BANK NAME, CUSTOMER ID, AGENT CODE
          customer.premium || '',
          customer.new_policy_no || '',
          customer.new_company || '',
          customer.veh_type || '',
          customer.product || customer.vertical || '', // Use product (original TYPE) or fallback to vertical
          customer.registration_no || '',
          customer.tp_expiry_date || '',
          customer.premium_mode || '',
          customer.email || '',
          customer.mobile_number || '',
          customer.status || 'due',
          customer.thank_you_sent || '',
          customer.notes || ''
        ]);
      }

      if (values.length > 0) {
        console.log(`📝 Writing ${values.length} rows to sheet`);
        const clearRange = isLifeTab ? `${tabName}!A2:AB1000` : `${tabName}!A2:AD1000`;
        
        await this.sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: clearRange
        });
        console.log(`✅ Cleared range: ${clearRange}`);
        
        await this.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${tabName}!A2`,
          valueInputOption: 'RAW',
          resource: { values }
        });
        console.log(`✅ Updated sheet successfully`);
      } else {
        console.log('⚠️  No customers to sync');
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
    // Handle YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    }
    // Convert other formats to DD/MM/YYYY
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr; // Return as-is if can't parse
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
}

module.exports = new InsuranceSyncService();