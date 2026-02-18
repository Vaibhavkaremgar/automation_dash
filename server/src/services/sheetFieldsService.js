const { google } = require('googleapis');
const config = require('../config/env');

async function getSheetHeaders(spreadsheetId, tabName) {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: config.google.clientEmail,
        private_key: config.google.privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${tabName}!1:1`,
    });

    const headers = response.data.values ? response.data.values[0] : [];
    return headers;
  } catch (error) {
    console.error('Error fetching sheet headers:', error);
    throw error;
  }
}

module.exports = { getSheetHeaders };
