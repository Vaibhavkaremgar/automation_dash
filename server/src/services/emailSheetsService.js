const { google } = require('googleapis')

class EmailSheetsService {
  constructor() {
    this.sheets = null
    this.initializeSheets()
  }

  async initializeSheets() {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          type: 'service_account',
          project_id: process.env.GOOGLE_PROJECT_ID,
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      })

      this.sheets = google.sheets({ version: 'v4', auth })
    } catch (error) {
      console.error('Failed to initialize Google Sheets for emails:', error)
    }
  }

  async syncEmailsFromSheets() {
    if (!this.sheets) {
      throw new Error('Google Sheets not configured for email sync')
    }

    try {
      const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
      const emailTab = process.env.GOOGLE_SHEETS_EMAIL_TAB || 'email_logs'

      // First, check if the sheet tab exists
      try {
        const sheetInfo = await this.sheets.spreadsheets.get({
          spreadsheetId,
          fields: 'sheets.properties.title'
        })
        
        const sheetExists = sheetInfo.data.sheets.some(
          sheet => sheet.properties.title === emailTab
        )
        
        if (!sheetExists) {
          throw new Error(`Sheet tab '${emailTab}' not found. Please create it first with columns: candidate_email, candidate_name, email_type, job_title, sent_date, gmail_message_id`)
        }
      } catch (sheetError) {
        throw new Error(`Cannot access sheet '${emailTab}': ${sheetError.message}`)
      }

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${emailTab}!A:F`
      })

      const rows = response.data.values || []
      if (rows.length <= 1) {
        return { emails: [], message: 'No email data found in sheet (only headers or empty)' }
      }

      // Skip header row and map data
      const emails = rows.slice(1).map((row, index) => ({
        sheet_row: index + 2,
        candidate_email: row[0] || '',
        candidate_name: row[1] || '',
        email_type: row[2] || '',
        job_title: row[3] || '',
        sent_date: row[4] || '',
        gmail_message_id: row[5] || ''
      })).filter(email => email.candidate_email) // Only valid emails

      return { emails, message: `Found ${emails.length} emails in sheet` }
    } catch (error) {
      console.error('Error syncing emails from sheets:', error)
      throw error
    }
  }

  async syncEmailsToDatabase(emails) {
    const db = require('../db/connection').getDatabase()
    let imported = 0
    let updated = 0
    let deleted = 0

    try {
      // Get all existing workflow emails (those without candidate_id from dashboard)
      const existingEmails = await new Promise((resolve, reject) => {
        db.all(
          'SELECT id, recipient_email, sent_at, gmail_message_id FROM email_logs WHERE candidate_id IS NULL',
          (err, rows) => {
            if (err) reject(err)
            else resolve(rows || [])
          }
        )
      })

      // Create a map of sheet emails for quick lookup
      const sheetEmailMap = new Map()
      emails.forEach(email => {
        const key = `${email.candidate_email}_${email.sent_date}`
        sheetEmailMap.set(key, email)
      })

      // Delete emails that are no longer in the sheet
      for (const existing of existingEmails) {
        const key = `${existing.recipient_email}_${existing.sent_at}`
        if (!sheetEmailMap.has(key)) {
          await new Promise((resolve, reject) => {
            db.run('DELETE FROM email_logs WHERE id = ?', [existing.id], (err) => {
              if (err) reject(err)
              else resolve()
            })
          })
          deleted++
        }
      }

      // Add or update emails from sheet
      for (const email of emails) {
        try {
          const existing = await new Promise((resolve, reject) => {
            db.get(
              'SELECT id FROM email_logs WHERE recipient_email = ? AND sent_at = ?',
              [email.candidate_email, email.sent_date],
              (err, row) => {
                if (err) reject(err)
                else resolve(row)
              }
            )
          })

          if (existing) {
            // Update existing email
            await new Promise((resolve, reject) => {
              db.run(
                `UPDATE email_logs SET 
                 candidate_name = ?, subject = ?, template_type = ?, gmail_message_id = ?, job_title = ?
                 WHERE id = ?`,
                [
                  email.candidate_name,
                  `${email.email_type} - ${email.job_title}`,
                  email.email_type,
                  email.gmail_message_id,
                  email.job_title,
                  existing.id
                ],
                (err) => {
                  if (err) reject(err)
                  else resolve()
                }
              )
            })
            updated++
          } else {
            // Insert new email
            await new Promise((resolve, reject) => {
              db.run(
                `INSERT INTO email_logs 
                 (user_id, recipient_email, candidate_name, subject, template_type, status, sent_at, gmail_message_id, job_title) 
                 VALUES (?, ?, ?, ?, ?, 'sent', ?, ?, ?)`,
                [
                  1, // Default to admin user
                  email.candidate_email,
                  email.candidate_name,
                  `${email.email_type} - ${email.job_title}`,
                  email.email_type,
                  email.sent_date,
                  email.gmail_message_id,
                  email.job_title
                ],
                function(err) {
                  if (err) reject(err)
                  else resolve(this.lastID)
                }
              )
            })
            imported++
          }
        } catch (error) {
          console.error(`Error syncing email for ${email.candidate_email}:`, error)
        }
      }

      return { imported, updated, deleted }
    } catch (error) {
      console.error('Error in syncEmailsToDatabase:', error)
      throw error
    }
  }
}

module.exports = new EmailSheetsService()