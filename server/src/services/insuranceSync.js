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

    // SAFETY GUARD: Prevent accidental DELETE ALL operations
    const SYNC_MODE = 'UPDATE_OR_INSERT'; // NEVER change this to 'DELETE_ALL'
    if (SYNC_MODE !== 'UPDATE_OR_INSERT') {
      throw new Error('SAFETY VIOLATION: DELETE_ALL sync mode is permanently disabled');
    }

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

    // STEP 1: SMART SYNC - UPDATE existing, INSERT new (NO DELETE ALL)
    console.log(`🔄 Smart syncing ${tabType} customers for user ${userId}...`);
    
    // Get existing customers from DB to build lookup map
    let existingQuery = 'SELECT * FROM insurance_customers WHERE user_id = ?';
    const existingParams = [userId];
    if (tabType === 'life') {
      existingQuery += ' AND vertical = ?';
      existingParams.push('life');
    } else {
      existingQuery += ' AND vertical IN (?, ?, ?, ?)';
      existingParams.push('motor', 'health', 'non-motor', '2-wheeler');
    }
    
    const existingCustomers = await all(existingQuery, existingParams);
    console.log(`📊 Found ${existingCustomers.length} existing ${tabType} customers in DB`);
    
    // Build lookup map by sheet_row_number (most reliable)
    const dbRowMap = new Map();
    existingCustomers.forEach(c => {
      if (c.sheet_row_number) {
        dbRowMap.set(`row:${c.sheet_row_number}`, c);
      }
      // Also index by policy number as fallback
      if (c.current_policy_no) {
        dbRowMap.set(`policy:${c.current_policy_no.trim()}`, c);
      }
      // Also index by registration number for vehicles
      if (c.registration_no) {
        dbRowMap.set(`reg:${c.registration_no.trim()}`, c);
      }
    });
    console.log(`🔑 Built DB lookup map with ${dbRowMap.size} keys`);
    
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
    let updated = 0;
    let skipped = 0;
    
    // Track which DB customers were seen in sheet (for deletion detection)
    const seenDbIds = new Set();
    
    // STEP 2: UPDATE existing or INSERT new rows from sheet
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      // Skip completely empty rows
      if (!row || row.every(cell => !cell || cell.trim() === '')) {
        skipped++;
        continue;
      }
      
      let customer;
      
      if (tabType === 'life') {
        const originalStatus = (getCell(row, 'status') || 'due').trim();
        
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
          status: originalStatus,
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
        const originalStatus = (getCell(row, 'status') || 'due').trim();
        
        const originalType = getCell(row, 'vertical');
        const sheetVertical = originalType.toLowerCase().trim().replace(/[\s-_]/g, '');
        let vertical = 'non-motor';
        if (sheetVertical === 'motor') vertical = 'motor';
        else if (sheetVertical === 'health') vertical = 'health';
        else if (sheetVertical === 'nonmotor') vertical = 'non-motor';
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
          status: originalStatus,
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
          dob: getCell(row, 'dob'),
          gst_no: getCell(row, 'gst_no'),
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
      
      // Try to find existing customer in DB
      const sheetRowNumber = i + 2;
      let existingCustomer = dbRowMap.get(`row:${sheetRowNumber}`);
      
      // Fallback: try by policy number
      if (!existingCustomer && customer.current_policy_no) {
        existingCustomer = dbRowMap.get(`policy:${customer.current_policy_no.trim()}`);
      }
      
      // Fallback: try by registration number
      if (!existingCustomer && customer.registration_no) {
        existingCustomer = dbRowMap.get(`reg:${customer.registration_no.trim()}`);
      }
      
      try {
        if (existingCustomer) {
          // UPDATE existing customer (preserves ID)
          seenDbIds.add(existingCustomer.id);
          
          await run(`
            UPDATE insurance_customers 
            SET name = ?, mobile_number = ?, insurance_activated_date = ?, renewal_date = ?, od_expiry_date = ?, tp_expiry_date = ?, premium_mode = ?, premium = ?, last_year_premium = ?, vertical = ?, product = ?, registration_no = ?, current_policy_no = ?, company = ?, status = ?, new_policy_no = ?, new_company = ?, policy_doc_link = ?, thank_you_sent = ?, reason = ?, email = ?, payment_date = ?, notes = ?, product_type = ?, product_model = ?, modified_expiry_date = ?, cheque_no = ?, bank_name = ?, customer_id = ?, agent_code = ?, pancard = ?, aadhar_card = ?, others_doc = ?, g_code = ?, dob = ?, gst_no = ?, s_no = ?, sheet_row_number = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [customer.name, customer.mobile_number, customer.insurance_activated_date || '', customer.renewal_date, customer.od_expiry_date || '', customer.tp_expiry_date || '', customer.premium_mode || '', customer.premium, customer.last_year_premium || '', customer.vertical, customer.product || '', customer.registration_no || '', customer.current_policy_no || '', customer.company || '', customer.status, customer.new_policy_no || '', customer.new_company || '', customer.policy_doc_link || '', customer.thank_you_sent || '', customer.reason || '', customer.email || '', customer.payment_date || '', customer.notes || '', customer.product_type || '', customer.product_model || '', customer.modified_expiry_date || '', customer.cheque_no || '', customer.bank_name || '', customer.customer_id || '', customer.agent_code || '', customer.pancard || '', customer.aadhar_card || '', customer.others_doc || '', customer.g_code || '', customer.dob || '', customer.gst_no || '', customer.s_no || '', sheetRowNumber, existingCustomer.id]);
          updated++;
          if (updated <= 2) {
            console.log(`✅ Updated row ${sheetRowNumber}: ${customer.name} (ID: ${existingCustomer.id})`);
          }
        } else {
          // INSERT new customer
          await run(`
            INSERT INTO insurance_customers (user_id, name, mobile_number, insurance_activated_date, renewal_date, od_expiry_date, tp_expiry_date, premium_mode, premium, last_year_premium, vertical, product, registration_no, current_policy_no, company, status, new_policy_no, new_company, policy_doc_link, thank_you_sent, reason, email, payment_date, notes, product_type, product_model, modified_expiry_date, cheque_no, bank_name, customer_id, agent_code, pancard, aadhar_card, others_doc, g_code, dob, gst_no, s_no, sheet_row_number)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [userId, customer.name, customer.mobile_number, customer.insurance_activated_date || '', customer.renewal_date, customer.od_expiry_date || '', customer.tp_expiry_date || '', customer.premium_mode || '', customer.premium, customer.last_year_premium || '', customer.vertical, customer.product || '', customer.registration_no || '', customer.current_policy_no || '', customer.company || '', customer.status, customer.new_policy_no || '', customer.new_company || '', customer.policy_doc_link || '', customer.thank_you_sent || '', customer.reason || '', customer.email || '', customer.payment_date || '', customer.notes || '', customer.product_type || '', customer.product_model || '', customer.modified_expiry_date || '', customer.cheque_no || '', customer.bank_name || '', customer.customer_id || '', customer.agent_code || '', customer.pancard || '', customer.aadhar_card || '', customer.others_doc || '', customer.g_code || '', customer.dob || '', customer.gst_no || '', customer.s_no || '', sheetRowNumber]);
          imported++;
          if (imported <= 2) {
            console.log(`✅ Inserted row ${sheetRowNumber}: ${customer.name}`);
          }
        }
      } catch (err) {
        console.error(`❌ Error syncing customer row ${i + 2}:`, err.message);
        console.error('Customer data:', customer);
        skipped++;
      }
    }
    
    // STEP 3: Delete customers that are no longer in sheet
    let deleted = 0;
    // SAFETY: Only delete if explicitly removed from sheet (not bulk delete)
    for (const existingCustomer of existingCustomers) {
      if (!seenDbIds.has(existingCustomer.id)) {
        // GUARD: Prevent accidental mass deletion
        if (deleted >= 50) {
          console.error(`⚠️ SAFETY STOP: Attempted to delete ${deleted} customers. Manual review required.`);
          break;
        }
        console.log(`🗑️ Deleting customer not in sheet: ${existingCustomer.name} (ID: ${existingCustomer.id})`);
        await run('DELETE FROM insurance_customers WHERE id = ?', [existingCustomer.id]);
        deleted++;
      }
    }
    
    // Store sync time
    this.lastSyncTime[`${userId}_${tabName}`] = new Date().toISOString();
    
    console.log(`✅ Smart sync completed: ${imported} new, ${updated} updated, ${deleted} deleted, ${skipped} skipped`);
    return { imported, updated, deleted };
  }

  async syncToSheet(userId, spreadsheetId, tabName = 'updating_input', verticalFilter = null, deletedCustomers = []) {
    this.initAuth();
    if (!this.sheets) {
      throw new Error('Google Sheets not configured');
    }

    try {
      console.log(`🔄 SMART SYNC TO SHEET - User: ${userId}, Tab: ${tabName}`);
      console.log(`📋 Strategy: Delete specific rows, update modified rows, preserve all other sheet data`);
      
      const user = await get('SELECT email FROM users WHERE id = ?', [userId]);
      const clientConfig = getClientConfig(user?.email);
      
      // Get customers from DB with updated_at timestamp
      let query = 'SELECT * FROM insurance_customers WHERE user_id = ?';
      const params = [userId];
      
      if (verticalFilter && verticalFilter.length > 0) {
        const placeholders = verticalFilter.map(() => '?').join(',');
        query += ` AND vertical IN (${placeholders})`;
        params.push(...verticalFilter);
      }
      
      const customers = await all(query + ' ORDER BY id', params);
      console.log(`📊 Found ${customers.length} customers in DB`);
      console.log(`🗑️ Deleted customers to remove: ${deletedCustomers.length}`);
      
      const isLifeTab = verticalFilter && verticalFilter.includes('life') && !verticalFilter.includes('motor');
      const schema = isLifeTab ? clientConfig.tabs.life.schema : clientConfig.tabs.general.schema;
      
      // STEP 1: Get sheet metadata to find the correct sheetId (gid)
      const spreadsheetMetadata = await this.sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets.properties'
      });
      
      const targetSheet = spreadsheetMetadata.data.sheets.find(
        sheet => sheet.properties.title === tabName
      );
      
      if (!targetSheet) {
        throw new Error(`Sheet tab "${tabName}" not found in spreadsheet`);
      }
      
      const sheetId = targetSheet.properties.sheetId;
      console.log(`📋 Found sheet "${tabName}" with ID: ${sheetId}`);
      
      // STEP 2: Read current sheet data
      console.log(`📖 Reading existing sheet data...`);
      const sheetResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${tabName}!A:ZZ`
      });
      const sheetData = sheetResponse.data.values || [];
      const headers = sheetData[0] || [];
      const existingRows = sheetData.slice(1);
      console.log(`📊 Sheet has ${existingRows.length} existing rows`);
      
      // Build column index map
      const policyColIndex = headers.findIndex(h => h === schema.current_policy_no);
      const nameColIndex = headers.findIndex(h => h === schema.name);
      const mobileColIndex = headers.findIndex(h => h === schema.mobile_number);
      const productTypeColIndex = headers.findIndex(h => h === schema.product_type);
      
      const reverseSchema = {};
      Object.entries(schema).forEach(([field, colName]) => {
        reverseSchema[colName] = field;
      });
      
      // STEP 3: Build lookup map
      const sheetRowMap = new Map();
      existingRows.forEach((row, index) => {
        const policyNo = row[policyColIndex] ? row[policyColIndex].trim() : '';
        const name = row[nameColIndex] ? row[nameColIndex].trim().toLowerCase() : '';
        const mobile = row[mobileColIndex] ? row[mobileColIndex].trim() : '';
        const productType = productTypeColIndex !== -1 ? (row[productTypeColIndex] ? row[productTypeColIndex].trim() : '') : '';
        
        const rowInfo = { row, rowNumber: index + 2, sheetIndex: index };
        
        // Primary: Policy Number + Product Type
        if (policyNo && productType) {
          sheetRowMap.set(`policy_product:${policyNo}:${productType}`, rowInfo);
        }
        
        // Fallback: Name + Mobile + Product Type
        if (name && mobile && productType) {
          sheetRowMap.set(`name_mobile_product:${name}:${mobile}:${productType}`, rowInfo);
        }
      });
      
      console.log(`🔑 Built lookup map with ${sheetRowMap.size} unique keys`);
      
      // STEP 4: Handle deletions FIRST (before updates/adds)
      let deleted = 0;
      if (deletedCustomers.length > 0) {
        console.log(`🗑️ Processing ${deletedCustomers.length} deletions...`);
        
        const rowsToDelete = [];
        
        for (const delCustomer of deletedCustomers) {
          let matchedRow = null;
          
          // Try Policy Number first
          if (delCustomer.current_policy_no) {
            const key = `policy:${delCustomer.current_policy_no.trim()}`;
            matchedRow = sheetRowMap.get(key);
          }
          
          // Fallback to Registration Number
          if (!matchedRow && delCustomer.registration_no) {
            const regColIndex = headers.findIndex(h => h === schema.registration_no);
            if (regColIndex !== -1) {
              const regKey = `reg:${delCustomer.registration_no.trim()}`;
              if (!sheetRowMap.has(regKey)) {
                existingRows.forEach((row, index) => {
                  const regNo = row[regColIndex] ? row[regColIndex].trim() : '';
                  if (regNo) {
                    sheetRowMap.set(`reg:${regNo}`, { row, rowNumber: index + 2, sheetIndex: index });
                  }
                });
              }
              matchedRow = sheetRowMap.get(regKey);
            }
          }
          
          if (matchedRow) {
            rowsToDelete.push(matchedRow);
            console.log(`✓ Found row ${matchedRow.rowNumber} for deletion: ${delCustomer.name}`);
          } else {
            console.log(`⚠️ No match found for deleted customer: ${delCustomer.name}`);
          }
        }
        
        if (rowsToDelete.length > 0) {
          // Sort by row number descending
          rowsToDelete.sort((a, b) => b.rowNumber - a.rowNumber);
          
          const snoColIndex = headers.findIndex(h => 
            h.toUpperCase().replace(/[\s\.]/g, '') === 'SNO' || 
            h.toUpperCase().replace(/[\s\.]/g, '') === 'SERIALNO'
          );
          
          // Find highest row number to determine consecutive last rows
          const maxRowNumber = existingRows.length + 1; // +1 for header
          const rowNumbers = rowsToDelete.map(r => r.rowNumber).sort((a, b) => b - a);
          
          // Identify consecutive last rows (e.g., if max is 440 and we have 435,436,437,438,439,440)
          let consecutiveLastRows = [];
          for (let i = 0; i < rowNumbers.length; i++) {
            if (rowNumbers[i] === maxRowNumber - i) {
              consecutiveLastRows.push(rowNumbers[i]);
            } else {
              break;
            }
          }
          
          const deleteRequests = [];
          const clearRequests = [];
          
          for (const rowInfo of rowsToDelete) {
            if (consecutiveLastRows.includes(rowInfo.rowNumber)) {
              // Delete entire row if it's part of consecutive last rows
              console.log(`🗑️ Deleting last row ${rowInfo.rowNumber}`);
              deleteRequests.push({
                deleteDimension: {
                  range: {
                    sheetId: sheetId,
                    dimension: 'ROWS',
                    startIndex: rowInfo.rowNumber - 1,
                    endIndex: rowInfo.rowNumber
                  }
                }
              });
            } else {
              // Clear row data but keep structure for middle rows
              console.log(`🧹 Clearing middle row ${rowInfo.rowNumber}`);
              const clearedRow = headers.map((header, colIndex) => {
                if (colIndex === snoColIndex && snoColIndex !== -1) {
                  return rowInfo.row[colIndex] || '';
                }
                return '';
              });
              
              const endCol = this.getColumnLetter(headers.length);
              clearRequests.push({
                range: `${tabName}!A${rowInfo.rowNumber}:${endCol}${rowInfo.rowNumber}`,
                values: [clearedRow]
              });
            }
          }
          
          // Execute deletions (for last rows)
          if (deleteRequests.length > 0) {
            await this.sheets.spreadsheets.batchUpdate({
              spreadsheetId,
              resource: { requests: deleteRequests }
            });
            console.log(`✅ Deleted ${deleteRequests.length} last row(s)`);
          }
          
          // Execute clears (for middle rows)
          if (clearRequests.length > 0) {
            await this.sheets.spreadsheets.values.batchUpdate({
              spreadsheetId,
              resource: {
                valueInputOption: 'RAW',
                data: clearRequests
              }
            });
            console.log(`✅ Cleared ${clearRequests.length} middle row(s)`);
          }
          
          deleted = rowsToDelete.length;
          
          // Rebuild sheet data and lookup map
          const updatedSheetResponse = await this.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${tabName}!A:ZZ`
          });
          const updatedSheetData = updatedSheetResponse.data.values || [];
          const updatedExistingRows = updatedSheetData.slice(1);
          
          sheetRowMap.clear();
          updatedExistingRows.forEach((row, index) => {
            const policyNo = row[policyColIndex] ? row[policyColIndex].trim() : '';
            const name = row[nameColIndex] ? row[nameColIndex].trim().toLowerCase() : '';
            const mobile = row[mobileColIndex] ? row[mobileColIndex].trim() : '';
            const productType = productTypeColIndex !== -1 ? (row[productTypeColIndex] ? row[productTypeColIndex].trim() : '') : '';
            
            const rowInfo = { row, rowNumber: index + 2, sheetIndex: index };
            
            if (policyNo && productType) {
              sheetRowMap.set(`policy_product:${policyNo}:${productType}`, rowInfo);
            }
            
            if (name && mobile && productType) {
              sheetRowMap.set(`name_mobile_product:${name}:${mobile}:${productType}`, rowInfo);
            }
          });
          
          console.log(`🔄 Rebuilt lookup map after deletion`);
        }
      }
      
      let updated = 0;
      let added = 0;
      const batchUpdates = [];
      const appendRows = [];
      
      // STEP 5: Process each customer from DB
      for (const customer of customers) {
        // Try to find matching row in sheet - MULTIPLE MATCHING STRATEGIES
        let existingEntry = null;
        
        // Strategy 1: Match by Policy Number + Product Type (most reliable for multiple policies)
        if (customer.current_policy_no && customer.current_policy_no.trim() && customer.product_type) {
          const key = `policy_product:${customer.current_policy_no.trim()}:${customer.product_type.trim()}`;
          existingEntry = sheetRowMap.get(key);
          if (existingEntry) {
            console.log(`✓ Matched by policy+product: ${customer.current_policy_no} (${customer.product_type})`);
          }
        }
        
        // Strategy 2: Match by Name + Mobile + Product Type (for customers with same name/mobile but different vehicles)
        if (!existingEntry && customer.name && customer.mobile_number && customer.product_type) {
          const key = `name_mobile_product:${customer.name.trim().toLowerCase()}:${customer.mobile_number.trim()}:${customer.product_type.trim()}`;
          existingEntry = sheetRowMap.get(key);
          if (existingEntry) {
            console.log(`✓ Matched by name+mobile+product: ${customer.name} (${customer.product_type})`);
          }
        }
        
        // Strategy 3: Match by Customer ID
        if (!existingEntry && customer.customer_id && customer.customer_id.trim()) {
          // Build customer_id lookup if not exists
          const custIdColIndex = headers.findIndex(h => h === schema.customer_id);
          if (custIdColIndex !== -1) {
            existingRows.forEach((row, index) => {
              const custId = row[custIdColIndex] ? row[custIdColIndex].trim() : '';
              if (custId) {
                sheetRowMap.set(`custid:${custId}`, { row, rowNumber: index + 2, sheetIndex: index });
              }
            });
            const key = `custid:${customer.customer_id.trim()}`;
            existingEntry = sheetRowMap.get(key);
            if (existingEntry) {
              console.log(`✓ Matched by customer_id: ${customer.customer_id}`);
            }
          }
        }
        
        // Strategy 4: Match by G Code
        if (!existingEntry && customer.g_code && customer.g_code.trim()) {
          const gCodeColIndex = headers.findIndex(h => h === schema.g_code);
          if (gCodeColIndex !== -1) {
            existingRows.forEach((row, index) => {
              const gCode = row[gCodeColIndex] ? row[gCodeColIndex].trim() : '';
              if (gCode) {
                sheetRowMap.set(`gcode:${gCode}`, { row, rowNumber: index + 2, sheetIndex: index });
              }
            });
            const key = `gcode:${customer.g_code.trim()}`;
            existingEntry = sheetRowMap.get(key);
            if (existingEntry) {
              console.log(`✓ Matched by g_code: ${customer.g_code}`);
            }
          }
        }
        
        // Strategy 5: Match by Registration Number (for vehicles)
        if (!existingEntry && customer.registration_no && customer.registration_no.trim()) {
          const regKey = `reg:${customer.registration_no.trim()}`;
          if (!sheetRowMap.has(regKey)) {
            existingRows.forEach((row, index) => {
              const regColIndex = headers.findIndex(h => h === schema.registration_no);
              if (regColIndex !== -1) {
                const regNo = row[regColIndex] ? row[regColIndex].trim() : '';
                if (regNo) {
                  sheetRowMap.set(`reg:${regNo}`, { row, rowNumber: index + 2, sheetIndex: index });
                }
              }
            });
          }
          existingEntry = sheetRowMap.get(regKey);
          if (existingEntry) {
            console.log(`✓ Matched by registration: ${customer.registration_no}`);
          }
        }
        
        // If no match found, this is a NEW customer (will be added as new row)
        if (!existingEntry) {
          console.log(`⚠️ No match found for: ${customer.name} - will add as NEW row`);
        }
        
        // Calculate S.NO for new rows (find max S.NO + 1)
        let nextSNo = '';
        if (!existingEntry) {
          const snoColIndex = headers.findIndex(h => 
            h.toUpperCase().replace(/[\s\.]/g, '') === 'SNO' || 
            h.toUpperCase().replace(/[\s\.]/g, '') === 'SERIALNO'
          );
          
          if (snoColIndex !== -1) {
            // Find max S.NO from existing rows
            let maxSNo = 0;
            existingRows.forEach(row => {
              const snoValue = row[snoColIndex];
              if (snoValue) {
                const num = parseInt(String(snoValue).trim());
                if (!isNaN(num) && num > maxSNo) {
                  maxSNo = num;
                }
              }
            });
            nextSNo = String(maxSNo + 1);
            console.log(`🔢 Assigning S.NO ${nextSNo} to new customer: ${customer.name}`);
          }
        }
        
        // Build row data - PRESERVE existing sheet values for unmapped columns
        const rowData = headers.map((header, colIndex) => {
          const fieldName = reverseSchema[header];
          
          // Handle S.NO: preserve for existing, assign next for new
          if (header === 'S NO' || header === 'S.NO' || header === 'S_NO') {
            if (existingEntry) {
              return existingEntry.row[colIndex] || '';
            } else {
              return nextSNo;
            }
          }
          
          // If column not in schema, PRESERVE existing sheet value
          if (!fieldName) {
            return existingEntry ? (existingEntry.row[colIndex] || '') : '';
          }
          
          // Map DB fields to sheet columns - COMPLETE MAPPING
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
            renewal_date: customer.modified_expiry_date || customer.renewal_date || customer.od_expiry_date,
            od_expiry_date: customer.od_expiry_date,
            tp_expiry_date: customer.tp_expiry_date,
            payment_date: customer.payment_date,
            status: customer.status === 'INPROCESS' ? 'IN PROCESS' : customer.status,
            thank_you_sent: customer.thank_you_sent,
            new_policy_no: customer.new_policy_no,
            new_company: customer.new_company,
            product_type: customer.product_type,
            product_model: customer.product_model,
            vertical: customer.product || customer.vertical,
            product: customer.product,
            notes: customer.notes,
            cheque_no: customer.cheque_no,
            chq_no_date: customer.cheque_no,
            bank_name: customer.bank_name,
            customer_id: customer.customer_id,
            agent_code: customer.agent_code,
            pancard: customer.pancard,
            aadhar_card: customer.aadhar_card,
            others_doc: customer.others_doc,
            g_code: customer.g_code,
            dob: customer.dob,
            gst_no: customer.gst_no,
            paid_by: customer.paid_by,
            policy_start_date: customer.policy_start_date,
            insurance_activated_date: customer.insurance_activated_date,
            policy_doc_link: customer.policy_doc_link,
            reason: customer.reason,
            cheque_hold: customer.cheque_hold,
            cheque_bounce: customer.cheque_bounce,
            owner_alert_sent: customer.owner_alert_sent,
            veh_type: customer.veh_type,
            modified_expiry_date: customer.modified_expiry_date,
            s_no: customer.s_no
          };
          
          const dbValue = fieldMap[fieldName];
          
          // Always write email field even if empty (don't preserve old value)
          if (fieldName === 'email') {
            return dbValue || '';
          }
          
          // If DB has value, use it; otherwise preserve sheet value
          if (dbValue !== null && dbValue !== undefined && dbValue !== '') {
            return String(dbValue);
          } else if (existingEntry) {
            return existingEntry.row[colIndex] || '';
          }
          return '';
        });
        
        if (existingEntry) {
          // Check if row actually changed
          const hasChanges = rowData.some((newVal, idx) => {
            const oldVal = existingEntry.row[idx] || '';
            return String(newVal).trim() !== String(oldVal).trim();
          });
          
          if (hasChanges) {
            const endCol = this.getColumnLetter(headers.length);
            batchUpdates.push({
              range: `${tabName}!A${existingEntry.rowNumber}:${endCol}${existingEntry.rowNumber}`,
              values: [rowData]
            });
            updated++;
          }
        } else {
          // ADD new row
          appendRows.push(rowData);
          added++;
        }
      }
      
      // Check if there are any changes
      if (batchUpdates.length === 0 && appendRows.length === 0 && deleted === 0) {
        console.log('ℹ️ No changes detected - sheet is already up to date');
        return { success: true, exported: 0, updated: 0, added: 0, deleted: 0, message: 'No changes to sync' };
      }
      
      // STEP 6: Execute batch update (only changed rows)
      if (batchUpdates.length > 0) {
        console.log(`📝 Updating ${batchUpdates.length} changed rows...`);
        await this.sheets.spreadsheets.values.batchUpdate({
          spreadsheetId,
          resource: {
            valueInputOption: 'RAW',
            data: batchUpdates
          }
        });
        console.log(`✅ Updated ${updated} rows`);
      }
      
      // STEP 7: Append new rows
      if (appendRows.length > 0) {
        console.log(`➕ Adding ${appendRows.length} new rows...`);
        await this.sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${tabName}!A:A`,
          valueInputOption: 'RAW',
          resource: { values: appendRows }
        });
        console.log(`✅ Added ${added} new rows`);
      }
      
      console.log(`✅ SMART SYNC COMPLETE: ${deleted} deleted, ${updated} updated, ${added} added`);
      return { success: true, exported: customers.length, deleted, updated, added };
    } catch (error) {
      console.error('❌ Sync to sheet failed:', error);
      throw error;
    }
  }

  getColumnLetter(columnNumber) {
    let letter = '';
    while (columnNumber > 0) {
      const remainder = (columnNumber - 1) % 26;
      letter = String.fromCharCode(65 + remainder) + letter;
      columnNumber = Math.floor((columnNumber - 1) / 26);
    }
    return letter;
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

  async syncLeadsFromSheet(userId, spreadsheetId, tabName) {
    this.initAuth();
    const user = await get('SELECT email FROM users WHERE id = ?', [userId]);
    const clientConfig = getClientConfig(user?.email);
    const schema = clientConfig.tabs.leads.schema;

    const response = await this.sheets.spreadsheets.values.get({ spreadsheetId, range: `${tabName}!A:ZZ` });
    const rows = response.data.values || [];
    if (rows.length <= 1) return { imported: 0 };

    await run('DELETE FROM insurance_leads WHERE user_id = ?', [userId]);
    
    const headers = rows[0];
    const columnMap = {};
    headers.forEach((col, idx) => { columnMap[col] = idx; });
    
    const getCell = (row, field) => {
      const colName = schema[field];
      const idx = columnMap[colName];
      return idx !== undefined ? (row[idx] || '') : '';
    };

    let imported = 0;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every(c => !c || c.trim() === '')) continue;

      await run(`INSERT INTO insurance_leads (user_id, s_no, name, mobile_number, email, interested_in, policy_expiry_date, follow_up_date, lead_status, priority, notes, referral_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, getCell(row, 's_no'), getCell(row, 'name'), getCell(row, 'mobile_number'), getCell(row, 'email'), getCell(row, 'interested_in'), this.formatDate(getCell(row, 'policy_expiry_date')), this.formatDate(getCell(row, 'follow_up_date')), getCell(row, 'lead_status') || 'new', getCell(row, 'priority') || 'warm', getCell(row, 'notes'), getCell(row, 'referral_by')]);
      imported++;
    }
    return { imported };
  }

  async syncLeadsToSheet(userId, spreadsheetId, tabName, deletedLeads = []) {
    this.initAuth();
    const user = await get('SELECT email FROM users WHERE id = ?', [userId]);
    const clientConfig = getClientConfig(user?.email);
    const schema = clientConfig.tabs.leads.schema;

    const leads = await all('SELECT * FROM insurance_leads WHERE user_id = ? ORDER BY id', [userId]);
    
    const sheetResponse = await this.sheets.spreadsheets.values.get({ spreadsheetId, range: `${tabName}!A:ZZ` });
    const sheetData = sheetResponse.data.values || [];
    const headers = sheetData[0] || [];
    const existingRows = sheetData.slice(1);

    const mobileColIndex = headers.findIndex(h => h === schema.mobile_number);
    const reverseSchema = {};
    Object.entries(schema).forEach(([field, colName]) => { reverseSchema[colName] = field; });

    const sheetRowMap = new Map();
    existingRows.forEach((row, index) => {
      const mobile = row[mobileColIndex] ? row[mobileColIndex].trim() : '';
      if (mobile) sheetRowMap.set(`mobile:${mobile}`, { row, rowNumber: index + 2 });
    });

    let deleted = 0, updated = 0, added = 0;
    const batchUpdates = [];
    const appendRows = [];
    const rowsToDelete = [];

    // Handle deletions
    if (deletedLeads && deletedLeads.length > 0) {
      for (const deletedLead of deletedLeads) {
        const mobile = deletedLead.mobile_number?.trim();
        if (mobile) {
          const existingEntry = sheetRowMap.get(`mobile:${mobile}`);
          if (existingEntry) {
            rowsToDelete.push(existingEntry.rowNumber);
            sheetRowMap.delete(`mobile:${mobile}`);
          }
        }
      }
    }

    for (const lead of leads) {
      const existingEntry = sheetRowMap.get(`mobile:${lead.mobile_number.trim()}`);

      const rowData = headers.map((header, colIndex) => {
        const fieldName = reverseSchema[header];
        if (!fieldName) return existingEntry ? (existingEntry.row[colIndex] || '') : '';

        const fieldMap = {
          name: lead.name,
          mobile_number: lead.mobile_number,
          email: lead.email,
          interested_in: lead.interested_in,
          policy_expiry_date: lead.policy_expiry_date,
          follow_up_date: lead.follow_up_date,
          lead_status: lead.lead_status,
          priority: lead.priority,
          notes: lead.notes,
          referral_by: lead.referral_by
        };
        const dbValue = fieldMap[fieldName];
        return (dbValue !== null && dbValue !== undefined && dbValue !== '') ? String(dbValue) : (existingEntry ? (existingEntry.row[colIndex] || '') : '');
      });

      if (existingEntry) {
        const endCol = this.getColumnLetter(headers.length);
        batchUpdates.push({ range: `${tabName}!A${existingEntry.rowNumber}:${endCol}${existingEntry.rowNumber}`, values: [rowData] });
        updated++;
      } else {
        appendRows.push(rowData);
        added++;
      }
    }

    // Delete rows (from bottom to top to avoid row number shifts)
    if (rowsToDelete.length > 0) {
      rowsToDelete.sort((a, b) => b - a);
      for (const rowNumber of rowsToDelete) {
        const endCol = this.getColumnLetter(headers.length);
        await this.sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: `${tabName}!A${rowNumber}:${endCol}${rowNumber}`
        });
        deleted++;
      }
    }

    if (batchUpdates.length > 0) {
      await this.sheets.spreadsheets.values.batchUpdate({ spreadsheetId, resource: { valueInputOption: 'RAW', data: batchUpdates } });
    }
    if (appendRows.length > 0) {
      await this.sheets.spreadsheets.values.append({ spreadsheetId, range: `${tabName}!A:A`, valueInputOption: 'RAW', resource: { values: appendRows } });
    }

    return { success: true, deleted, updated, added };
  }
}

module.exports = new InsuranceSyncService();
