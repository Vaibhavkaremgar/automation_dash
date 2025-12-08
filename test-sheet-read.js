const { google } = require('googleapis');

const SPREADSHEET_ID = '1oX5MGRMo6oz87ivTXeMOy6vtIDPJXXawz_lGqmOvUEo';
const TAB_NAME = 'Sheet1';

async function testSheetRead() {
  console.log('\n🧪 Testing Google Sheets Read\n');
  
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  
  console.log('Client Email:', clientEmail ? '✅ Set' : '❌ Missing');
  console.log('Private Key:', privateKey ? (privateKey.includes('BEGIN PRIVATE KEY') ? '✅ Valid' : '❌ Invalid') : '❌ Missing');
  
  if (!privateKey || !clientEmail) {
    console.log('\n❌ Missing credentials. Set GOOGLE_PRIVATE_KEY and GOOGLE_CLIENT_EMAIL');
    return;
  }
  
  try {
    const auth = new google.auth.JWT(
      clientEmail,
      null,
      privateKey,
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    
    const sheets = google.sheets({ version: 'v4', auth });
    
    console.log(`\nReading from: ${SPREADSHEET_ID}`);
    console.log(`Tab: ${TAB_NAME}\n`);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${TAB_NAME}!A:Y`,
    });
    
    const rows = response.data.values || [];
    console.log(`✅ Successfully read ${rows.length} rows`);
    
    if (rows.length > 0) {
      console.log('\nFirst row (headers):', rows[0].slice(0, 5).join(', '), '...');
      if (rows.length > 1) {
        console.log('Second row (data):', rows[1].slice(0, 3).join(', '), '...');
      }
    } else {
      console.log('\n⚠️  Sheet is empty!');
    }
    
  } catch (error) {
    console.error('\n❌ Error reading sheet:', error.message);
    if (error.code) console.error('Error code:', error.code);
  }
}

testSheetRead();
