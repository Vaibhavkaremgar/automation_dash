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
    this.lastSyncTime = {};
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
          premium: parseFloat((getCell(row, 'premium') || '0').replace(/,/g, '')) || 0,
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
          s_no: getCell(row, 's_no'),
          name: getCell(row, 'name'),
          mobile_number: getCell(row, 'mobile_number'),
          email: getCell(row, 'email'),
          current_policy_no: getCell(row, 'current_policy_no'),
          company: getCell(row, 'company'),
          registration_no: getCell(row, 'registration_no'),
          premium: parseFloat((getCell(row, 'premium') || '0').replace(/,/g, '')) || 0,
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
          product_type: getCell(row, 'product_type'),
          product_model: getCell(row, 'product_model'),
          vertical: vertical,
          product: originalType,
          notes: getCell(row, 'notes'),
          modified_expiry_date: modifiedExpiry,
          cheque_no: getCell(row, 'cheque_no'),
          bank_name: getCell(row, 'bank_name'),
          customer_id: getCell(row, 'customer_id'),
          agent_code: getCell(row, 'agent_code'),
          pancard: getCell(row, 'pancard'),
          aadhar_card: getCell(row, 'aadhar_card'),
          others_doc: getCell(row, 'others_doc'),
          g_code: getCell(row, 'g_code'),
          insurance_activated_date: '',
          policy_doc_link: '',
          reason: ''
        };
      }
      
      const hasAnyData = customer.name || customer.mobile_number || customer.email || customer.company || customer.registration_no;
      if (!hasAnyData) {
        console.log(`⚠️  Skipping row ${i + 2}: completely empty`);
        skipped++;
        continue;
      }
      
      try {
        await run(`
          INSERT INTO insurance_customers (user_id, name, mobile_number, insurance_activated_date, renewal_date, od_expiry_date, tp_expiry_date, premium_mode, premium, last_year_premium, vertical, product, registration_no, current_policy_no, company, status, new_policy_no, new_company, policy_doc_link, thank_you_sent, reason, email, payment_date, notes, product_type, product_model, modified_expiry_date, cheque_no, bank_name, customer_id, agent_code, pancard, aadhar_card, others_doc, g_code, s_no, sheet_row_number)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [userId, customer.name, customer.mobile_number, customer.insurance_activated_date || '', customer.renewal_date, customer.od_expiry_date || '', customer.tp_expiry_date || '', customer.premium_mode || '', customer.premium, customer.last_year_premium || '', customer.vertical, customer.product || '', customer.registration_no || '', customer.current_policy_no || '', customer.company || '', customer.status, customer.new_policy_no || '', customer.new_company || '', customer.policy_doc_link || '', customer.thank_you_sent || '', customer.reason || '', customer.email || '', customer.payment_date || '', customer.notes || '', customer.product_type || '', customer.product_model || '', customer.modified_expiry_date || '', customer.cheque_no || '', customer.bank_name || '', customer.customer_id || '', customer.agent_code || '', customer.pancard || '', customer.aadhar_card || '', customer.others_doc || '', customer.g_code || '', customer.s_no || '', i + 2]);
        imported++;
        if (imported <= 2) {
          console.log(`✅ Imported row ${i + 2}: ${customer.name} (${customer.vertical})`);
        }
      } catch (err) {
        console.error(`❌ Error inserting customer row ${i + 2}:`, err.message);
        console.error('Customer data:', customer);
        skipped++;
      }
    }
    
    // Store sync time
    this.lastSyncTime[`${userId}_${tabName}`] = new Date().toISOString();
    
    console.log(`✅ Sync completed: ${imported} imported, ${skipped} skipped`);
    return { imported, updated: 0 };
  }

  async syncToSheet(userId, spreadsheetId, tabName = 'updating_input', verticalFilter = null) {
    this.initAuth();
    if (!this.sheets) {
      throw new Error('Google Sheets not configured');
    }

    try {
      console.log(`🔄 Syncing TO sheet - User: ${userId}, Tab: ${tabName}`);
      const user = await get('SELECT email FROM users WHERE id = ?', [userId]);
      const clientConfig = getClientConfig(user?.email);
      
      let query = 'SELECT * FROM insurance_customers WHERE user_id = ?';
      const params = [userId];
      
      if (verticalFilter && verticalFilter.length > 0) {
        const placeholders = verticalFilter.map(() => '?').join(',');
        query += ` AND vertical IN (${placeholders})`;
        params.push(...verticalFilter);
      }
      
      const customers = await all(query + ' ORDER BY id', params);
      console.log(`📊 Found ${customers.length} customers to sync`);
      
      if (customers.length === 0) {
        console.log('✅ No customers to sync');
        return { success: true, exported: 0, updated: 0, added: 0 };
      }
      
      const isLifeTab = verticalFilter && verticalFilter.includes('life') && !verticalFilter.includes('motor');
      const schema = isLifeTab ? clientConfig.tabs.life.schema : clientConfig.tabs.general.schema;
      
      // Read current sheet
      const sheetResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${tabName}!A:ZZ`
      });
      const sheetData = sheetResponse.data.values || [];
      const headers = sheetData[0] || [];
      const existingRows = sheetData.slice(1);
      
      const nameColIndex = headers.findIndex(h => h === schema.name);
      const mobileColIndex = headers.findIndex(h => h === schema.mobile_number);
      
      const reverseSchema = {};
      Object.entries(schema).forEach(([field, colName]) => {
        reverseSchema[colName] = field;
      });
      
      // Map existing rows by mobile AND store row number
      const sheetRowMap = new Map();
      existingRows.forEach((row, index) => {
        const mobile = row[mobileColIndex] || '';
        if (mobile) {
          sheetRowMap.set(mobile.trim(), { row, rowNumber: index + 2, sheetIndex: index });
        }
      });
      
      let updated = 0;
      let added = 0;
      
      // Batch updates
      const batchUpdates = [];
      const appendRows = [];
      
      for (const customer of customers) {
        const customerKey = customer.mobile_number ? customer.mobile_number.trim() : null;
        if (!customerKey) continue;
        
        // Try to find by sheet_row_number first (exact match), then by mobile
        let existingEntry = null;
        if (customer.sheet_row_number && customer.sheet_row_number >= 2) {
          const sheetIndex = customer.sheet_row_number - 2;
          if (sheetIndex >= 0 && sheetIndex < existingRows.length) {
            existingEntry = { row: existingRows[sheetIndex], rowNumber: customer.sheet_row_number, sheetIndex };
          }
        }
        if (!existingEntry) {
          existingEntry = sheetRowMap.get(customerKey);
        }
        
        const rowData = headers.map((header) => {
          const fieldName = reverseSchema[header];
          
          // Preserve S.NO from existing sheet or database
          if (header === 'S NO') {
            return customer.s_no || (existingEntry ? existingEntry.row[headers.indexOf(header)] : '');
          }
          
          if (!fieldName) return existingEntry ? (existingEntry.row[headers.indexOf(header)] || '') : '';
          
          const fieldMap = {
            name: customer.name,
            mobile_number: customer.mobile_number,
            email: customer.email,
            current_policy_no: customer.current_policy_no,
            company: customer.company,
            registration_no: customer.registration_no,
            premium: customer.premium,
            premium_mode: customer.premium_mode,
            last_year_premium: customer.last_year_premium,
            renewal_date: customer.modified_expiry_date || customer.od_expiry_date,
            od_expiry_date: customer.od_expiry_date,
            tp_expiry_date: customer.tp_expiry_date,
            payment_date: customer.payment_date,
            status: customer.status,
            thank_you_sent: customer.thank_you_sent,
            new_policy_no: customer.new_policy_no,
            new_company: customer.new_company,
            product_type: customer.product_type,
            product_model: customer.product_model,
            vertical: customer.vertical,
            notes: customer.notes,
            cheque_no: customer.cheque_no,
            bank_name: customer.bank_name,
            customer_id: customer.customer_id,
            agent_code: customer.agent_code,
            pancard: customer.pancard,
            aadhar_card: customer.aadhar_card,
            others_doc: customer.others_doc,
            g_code: customer.g_code,
            paid_by: customer.paid_by,
            policy_start_date: customer.policy_start_date,
            s_no: customer.s_no
          };
          
          const dbValue = fieldMap[fieldName];
          return dbValue !== null && dbValue !== undefined ? dbValue : '';
        });
        
        if (existingEntry) {
          const endCol = headers.length > 26 
            ? String.fromCharCode(64 + Math.floor((headers.length - 1) / 26)) + String.fromCharCode(65 + ((headers.length - 1) % 26))
            : String.fromCharCode(64 + headers.length);
          
          batchUpdates.push({
            range: `${tabName}!A${existingEntry.rowNumber}:${endCol}${existingEntry.rowNumber}`,
            values: [rowData]
          });
          updated++;
        } else {
          appendRows.push(rowData);
          added++;
        }
      }
      
      // Execute batch update
      if (batchUpdates.length > 0) {
        await this.sheets.spreadsheets.values.batchUpdate({
          spreadsheetId,
          resource: {
            valueInputOption: 'RAW',
            data: batchUpdates
          }
        });
      }
      
      // Append new rows
      if (appendRows.length > 0) {
        await this.sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${tabName}!A:A`,
          valueInputOption: 'RAW',
          resource: { values: appendRows }
        });
      }
      
      console.log(`✅ Sync complete: ${updated} updated, ${added} added`);
      return { success: true, exported: customers.length, updated, added };
    } catch (error) {
      console.error('Sync to sheet failed:', error);
      throw error;
    }
  }

  formatDate(dateStr) {
    if (!dateStr) return '';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      return dateStr;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
}

module.exports = new InsuranceSyncService();
