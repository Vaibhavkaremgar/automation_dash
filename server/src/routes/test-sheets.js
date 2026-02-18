const express = require('express');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const router = express.Router();

router.get('/test-connection', async (req, res) => {
  try {
    // Check if credentials are configured
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      return res.json({
        status: 'error',
        message: 'Google credentials not configured',
        instructions: [
          '1. Go to Google Cloud Console',
          '2. Create a service account',
          '3. Download the JSON key file',
          '4. Add GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY to .env',
          '5. Share your Google Sheet with the service account email'
        ]
      });
    }

    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    // Test with a sample sheet ID (you can change this)
    const testSheetId = req.query.sheetId || '1amZkYzhw2lMmIbw0ftFAw8KJ1SX86zJ2rubWDQgs8CE';
    
    const doc = new GoogleSpreadsheet(testSheetId, serviceAccountAuth);
    await doc.loadInfo();
    
    const sheet = doc.sheetsByIndex[0];
    await sheet.loadHeaderRow();
    const rows = await sheet.getRows({ limit: 5 });

    res.json({
      status: 'success',
      sheetTitle: doc.title,
      worksheetTitle: sheet.title,
      headers: sheet.headerValues,
      sampleRows: rows.map(row => row._rawData),
      totalRows: sheet.rowCount
    });

  } catch (error) {
    res.json({
      status: 'error',
      message: error.message,
      instructions: [
        'Make sure the Google Sheet is shared with your service account email',
        'Check that the sheet ID is correct',
        'Verify your Google credentials in .env file'
      ]
    });
  }
});

module.exports = router;