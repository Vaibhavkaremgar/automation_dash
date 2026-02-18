let sgMail = null

// Initialize SendGrid only if API key is provided
if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY.startsWith('SG.')) {
  sgMail = require('@sendgrid/mail')
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

const EMAIL_TEMPLATES = {
  interview: {
    subject: 'Interview Invitation - {{jobTitle}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0891b2;">Interview Invitation</h2>
        <p>Dear {{candidateName}},</p>
        <p>We are pleased to invite you for an interview for the position of <strong>{{jobTitle}}</strong>.</p>
        <p>We were impressed with your qualifications and would like to discuss this opportunity further.</p>
        <p>We will contact you shortly to schedule the interview.</p>
        <p>Best regards,<br>{{companyName}} Hiring Team</p>
      </div>
    `
  },
  rejection: {
    subject: 'Application Update - {{jobTitle}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0891b2;">Application Update</h2>
        <p>Dear {{candidateName}},</p>
        <p>Thank you for your interest in the <strong>{{jobTitle}}</strong> position.</p>
        <p>After careful consideration, we have decided to move forward with other candidates whose experience more closely matches our current needs.</p>
        <p>We appreciate the time you invested in the application process and encourage you to apply for future opportunities.</p>
        <p>Best regards,<br>{{companyName}} Hiring Team</p>
      </div>
    `
  },
  selection: {
    subject: 'Congratulations! Job Offer - {{jobTitle}}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Congratulations!</h2>
        <p>Dear {{candidateName}},</p>
        <p>We are delighted to offer you the position of <strong>{{jobTitle}}</strong>!</p>
        <p>Your skills and experience make you an excellent fit for our team.</p>
        <p>We will contact you shortly with the detailed offer letter and next steps.</p>
        <p>Welcome to the team!<br>{{companyName}} Hiring Team</p>
      </div>
    `
  }
}

class EmailService {
  async sendEmail({ to, templateType, variables, userId, candidateId, jobId }) {
    try {
      if (!sgMail) {
        console.warn('SendGrid not configured - email will be logged but not sent')
        // Log email as 'simulated' instead of failing
        const db = require('../db/database')
        const template = EMAIL_TEMPLATES[templateType]
        if (!template) {
          throw new Error(`Template ${templateType} not found`)
        }
        
        let subject = template.subject
        Object.entries(variables).forEach(([key, value]) => {
          const placeholder = `{{${key}}}`
          subject = subject.replace(new RegExp(placeholder, 'g'), value)
        })
        
        await db.run(`
          INSERT INTO email_logs (user_id, candidate_id, job_id, recipient_email, subject, template_type, status, sent_at)
          VALUES (?, ?, ?, ?, ?, ?, 'simulated', datetime('now'))
        `, [userId, candidateId, jobId, to, subject, templateType])
        
        return { success: true, messageId: 'simulated-' + Date.now() }
      }

      const template = EMAIL_TEMPLATES[templateType]
      if (!template) {
        throw new Error(`Template ${templateType} not found`)
      }

      // Replace variables in template
      let subject = template.subject
      let html = template.html
      
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`
        subject = subject.replace(new RegExp(placeholder, 'g'), value)
        html = html.replace(new RegExp(placeholder, 'g'), value)
      })

      const msg = {
        to,
        from: {
          email: process.env.FROM_EMAIL || 'noreply@hirehero.com',
          name: process.env.FROM_NAME || 'HireHero'
        },
        subject,
        html
      }

      const result = await sgMail.send(msg)
      
      // Log email in database
      const db = require('../db/database')
      await db.run(`
        INSERT INTO email_logs (user_id, candidate_id, job_id, recipient_email, subject, template_type, status, sent_at)
        VALUES (?, ?, ?, ?, ?, ?, 'sent', datetime('now'))
      `, [userId, candidateId, jobId, to, subject, templateType])

      return { success: true, messageId: result[0].headers['x-message-id'] }
    } catch (error) {
      console.error('Email send error:', error)
      
      // Log failed email
      const db = require('../db/database')
      await db.run(`
        INSERT INTO email_logs (user_id, candidate_id, job_id, recipient_email, subject, template_type, status, error_message, sent_at)
        VALUES (?, ?, ?, ?, ?, ?, 'failed', ?, datetime('now'))
      `, [userId, candidateId, jobId, to, variables.jobTitle || 'Unknown', templateType, error.message])

      throw error
    }
  }

  getTemplates() {
    return Object.keys(EMAIL_TEMPLATES).map(key => ({
      type: key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      subject: EMAIL_TEMPLATES[key].subject
    }))
  }
}

module.exports = new EmailService()