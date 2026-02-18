const { google } = require('googleapis');
const { getDatabase } = require('../db/connection');

const db = getDatabase();

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function syncClaimsFromSheet(userId, spreadsheetId, tabName) {
  try {
    console.log(`\n=== Starting Claims Sync FROM Sheet ===`);
    console.log(`User ID: ${userId}, Sheet: ${spreadsheetId}, Tab: ${tabName}`);
    
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${tabName}!A:G`,
    });

    const rows = response.data.values || [];
    console.log(`Total rows fetched from sheet: ${rows.length}`);
    
    if (rows.length === 0) {
      console.log('No data found in sheet');
      return { imported: 0 };
    }
    if (rows.length === 1) {
      console.log('Only header row found, no data to import');
      return { imported: 0 };
    }

    const headers = rows[0];
    console.log('Headers:', headers);
    
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      console.log(`\n--- Processing Row ${i} ---`);
      console.log('Raw row data:', row);
      
      if (!row || row.length === 0 || !row[0] || row[0].trim() === '') {
        console.log(`Skipping row ${i}: Empty or no customer name`);
        skipped++;
        continue;
      }

      const claimTypeMap = {
        'accidental damage': 'own_damage',
        'own damage accident': 'own_damage',
        'own damage': 'own_damage',
        'third party': 'third_party',
        'theft': 'theft',
        'total loss': 'total_loss'
      };
      
      const statusMap = {
        'filed': 'filed',
        'under process': 'in_progress',
        'in progress': 'in_progress',
        'survey done': 'survey_done',
        'approved': 'approved',
        'rejected': 'rejected',
        'settled': 'settled'
      };
      
      const rawClaimType = (row[3] || 'own_damage').trim().toLowerCase();
      const mappedClaimType = claimTypeMap[rawClaimType] || 'own_damage';
      
      const rawStatus = (row[5] || 'filed').trim().toLowerCase();
      const mappedStatus = statusMap[rawStatus] || 'filed';
      
      const claimData = {
        customer_name: (row[0] || '').trim(),
        vehicle_number: (row[1] || '').trim(),
        insurance_company: (row[2] || '').trim(),
        claim_type: mappedClaimType,
        created_at: row[4] || new Date().toISOString(),
        claim_status: mappedStatus,
        claim_amount: parseFloat(row[6]) || 0,
      };

      console.log('Parsed claim data:', claimData);

      // Find customer by exact name match or vehicle number
      let customer = await new Promise((resolve, reject) => {
        db.get(
          'SELECT id, name, mobile_number FROM insurance_customers WHERE user_id = ? AND (LOWER(TRIM(name)) = LOWER(TRIM(?)) OR LOWER(TRIM(registration_no)) = LOWER(TRIM(?)))',
          [userId, claimData.customer_name, claimData.vehicle_number],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (!customer) {
        console.log(`❌ Customer "${claimData.customer_name}" not found - skipping claim`);
        skipped++;
        continue;
      }
      
      console.log(`✓ Found customer: ${customer.name} (ID: ${customer.id})`);

      // Check if claim exists (match by customer and vehicle)
      const existing = await new Promise((resolve, reject) => {
        db.get(
          'SELECT id FROM insurance_claims WHERE user_id = ? AND customer_id = ? AND vehicle_number = ?',
          [userId, customer.id, claimData.vehicle_number],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (existing) {
        console.log(`Updating existing claim ID: ${existing.id}`);
        // Update existing claim
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE insurance_claims SET 
              insurance_company = ?, claim_type = ?, 
              claim_amount = ?, claim_status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
            [
              claimData.insurance_company,
              claimData.claim_type,
              claimData.claim_amount,
              claimData.claim_status,
              existing.id,
            ],
            (err) => {
              if (err) {
                console.error('Error updating claim:', err);
                reject(err);
              } else {
                console.log(`✓ Updated claim ID: ${existing.id}`);
                resolve();
              }
            }
          );
        });
        updated++;
      } else {
        // Insert new claim
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO insurance_claims 
              (user_id, customer_id, insurance_company, vehicle_number, 
               claim_type, claim_amount, claim_status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              userId,
              customer.id,
              claimData.insurance_company,
              claimData.vehicle_number,
              claimData.claim_type,
              claimData.claim_amount,
              claimData.claim_status,
              claimData.created_at,
            ],
            function(err) {
              if (err) {
                console.error('Error inserting claim:', err);
                reject(err);
              } else {
                console.log(`✓ Inserted new claim ID: ${this.lastID} for ${claimData.customer_name}`);
                resolve();
              }
            }
          );
        });
      }
      imported++;
    }

    console.log(`\n=== Sync Complete ===`);
    console.log(`Total rows processed: ${rows.length - 1}`);
    console.log(`Successfully imported: ${imported}`);
    console.log(`Successfully updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    return { imported, updated, skipped };
  } catch (error) {
    console.error('Claims sync from sheet error:', error);
    throw error;
  }
}

async function syncClaimsToSheet(userId, spreadsheetId, tabName) {
  try {
    console.log(`Syncing claims to sheet - User: ${userId}, Sheet: ${spreadsheetId}, Tab: ${tabName}`);
    const sheets = google.sheets({ version: 'v4', auth });

    // Get all claims for user
    const claims = await new Promise((resolve, reject) => {
      db.all(
        `SELECT c.*, ic.name as customer_name, ic.mobile_number
         FROM insurance_claims c
         JOIN insurance_customers ic ON c.customer_id = ic.id
         WHERE c.user_id = ?
         ORDER BY c.created_at DESC`,
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    console.log(`Found ${claims.length} claims to export`);

    const headers = [
      'Customer',
      'Vehicle',
      'Company',
      'Claim Type',
      'Submitted On',
      'Status',
      'Amount',
    ];

    const rows = [
      headers,
      ...claims.map((claim) => [
        claim.customer_name || '',
        claim.vehicle_number || '',
        claim.insurance_company || '',
        claim.claim_type || '',
        claim.created_at ? new Date(claim.created_at).toLocaleDateString() : '',
        claim.claim_status || '',
        claim.claim_amount || 0,
      ]),
    ];

    console.log(`Clearing sheet range ${tabName}!A:G`);
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${tabName}!A:G`,
    });

    console.log(`Writing ${rows.length} rows to sheet`);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tabName}!A1`,
      valueInputOption: 'RAW',
      resource: { values: rows },
    });

    console.log(`Successfully exported ${claims.length} claims`);
    return { exported: claims.length };
  } catch (error) {
    console.error('Claims sync to sheet error:', error);
    throw error;
  }
}

module.exports = {
  syncClaimsFromSheet,
  syncClaimsToSheet,
};
