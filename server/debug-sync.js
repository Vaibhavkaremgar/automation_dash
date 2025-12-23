const { google } = require('googleapis');
const axios = require('axios');

async function debugSync() {
  console.log('🔍 DEBUG: Testing Joban sync...');
  
  const spreadsheetId = '1CE5TFC5bFx7WixVLoVOzdiMntwgRISO9YVR_cWZhku4';
  const tabName = 'general_ins';
  
  // Test Google Sheets API
  try {
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    
    const auth = new google.auth.JWT(
      clientEmail,
      null,
      privateKey,
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    
    const sheets = google.sheets({ version: 'v4', auth });
    
    console.log('📡 Testing Google Sheets API...');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${tabName}!A1:AD5`,
    });
    
    const rows = response.data.values;
    console.log('✅ Got rows from API:', rows?.length);
    console.log('📋 Header row:', rows[0]);
    console.log('📋 First data row:', rows[1]);
    
    // Find Product Type column
    const headerRow = rows[0];
    const productTypeIndex = headerRow.findIndex(col => col === 'Product Type');
    console.log('🔍 Product Type column index:', productTypeIndex);
    console.log('🔍 Product Type column name:', headerRow[productTypeIndex]);
    
    // Check first few data rows for Product Type values
    for (let i = 1; i < Math.min(5, rows.length); i++) {
      const row = rows[i];
      const productType = row[productTypeIndex];
      console.log(`📊 Row ${i} Product Type:`, `"${productType}"`);
    }
    
  } catch (error) {
    console.error('❌ Google Sheets API failed:', error.message);
    
    // Try CSV fallback
    console.log('🔄 Trying CSV fallback...');
    try {
      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
      console.log('🔗 CSV URL:', url);
      
      const resp = await axios.get(url, { timeout: 10000 });
      const lines = resp.data.split('\n').slice(0, 5);
      console.log('✅ Got CSV data:');
      lines.forEach((line, i) => {
        console.log(`Row ${i}:`, line);
      });
      
    } catch (csvError) {
      console.error('❌ CSV fallback failed:', csvError.message);
    }
  }
}

debugSync().then(() => process.exit(0)).catch(err => {
  console.error('Debug failed:', err);
  process.exit(1);
});