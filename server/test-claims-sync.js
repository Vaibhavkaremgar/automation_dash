require('dotenv').config();
const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function testClaimsSync() {
  try {
    console.log('\n=== Testing Claims Sync ===\n');
    
    // Test both sheets
    const sheets = [
      {
        name: 'KMG Claims',
        id: process.env.KMG_CLAIMS_SHEETS_SPREADSHEET_ID,
        tab: process.env.KMG_CLAIMS_SHEETS_TAB
      },
      {
        name: 'Joban Claims',
        id: process.env.JOBAN_CLAIMS_SHEETS_SPREADSHEET_ID,
        tab: process.env.JOBAN_CLAIMS_SHEETS_TAB
      }
    ];

    const sheetsApi = google.sheets({ version: 'v4', auth });

    for (const sheet of sheets) {
      console.log(`\n--- ${sheet.name} ---`);
      console.log(`Spreadsheet ID: ${sheet.id}`);
      console.log(`Tab: ${sheet.tab}`);
      console.log(`Range: ${sheet.tab}!A:G\n`);

      try {
        const response = await sheetsApi.spreadsheets.values.get({
          spreadsheetId: sheet.id,
          range: `${sheet.tab}!A:G`,
        });

        const rows = response.data.values || [];
        console.log(`Total rows fetched: ${rows.length}`);
        
        if (rows.length === 0) {
          console.log('❌ No data found in sheet');
          continue;
        }

        console.log('\nHeaders:', rows[0]);
        console.log(`\nData rows: ${rows.length - 1}`);
        
        for (let i = 1; i < rows.length; i++) {
          console.log(`\nRow ${i}:`, rows[i]);
          console.log(`  - Customer: "${rows[i][0] || ''}"`);
          console.log(`  - Vehicle: "${rows[i][1] || ''}"`);
          console.log(`  - Company: "${rows[i][2] || ''}"`);
          console.log(`  - Claim Type: "${rows[i][3] || ''}"`);
          console.log(`  - Date: "${rows[i][4] || ''}"`);
          console.log(`  - Status: "${rows[i][5] || ''}"`);
          console.log(`  - Amount: "${rows[i][6] || ''}"`);
        }
      } catch (error) {
        console.error(`❌ Error fetching ${sheet.name}:`, error.message);
      }
    }

    console.log('\n=== Test Complete ===\n');
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

testClaimsSync();
