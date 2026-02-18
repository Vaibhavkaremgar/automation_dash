const axios = require('axios');
const config = require('../config/env');
const walletService = require('./wallet');
const { getDatabase } = require('../db/connection');

class VoiceService {
  constructor() {
    this.apiKey = config.voice.apiKey;
    this.orgId = config.voice.orgId;
    this.baseUrl = config.voice.baseUrl;
    
    if (!this.apiKey || !this.orgId) {
      console.warn('⚠️ Voice service not configured - missing credentials');
    }
  }

  // Sync interview data from external workflow
  async syncInterviewData(callId) {
    if (!this.apiKey) {
      console.warn('Voice service not configured - cannot sync interview data');
      return null;
    }

    try {
      // Get call details from voice platform API
      const response = await axios.get(`${this.baseUrl}/call/${callId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      const callData = response.data;
      
      return {
        callId: callData.id,
        status: callData.status,
        startTime: callData.startedAt,
        endTime: callData.endedAt,
        duration: callData.endedAt ? 
          Math.ceil((new Date(callData.endedAt) - new Date(callData.startedAt)) / 1000) : 0,
        transcript: callData.transcript || '',
        cost: callData.endedAt ? 
          Math.ceil(((new Date(callData.endedAt) - new Date(callData.startedAt)) / 1000 / 60) * 500) : 0,
        analysis: callData.analysis || null
      };
    } catch (error) {
      console.error('Failed to sync interview data:', error);
      return null;
    }
  }

  // Get interview status
  async getInterviewStatus(interviewId) {
    const db = getDatabase();
    
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM voice_interviews WHERE id = ?',
        [interviewId],
        (err, interview) => {
          if (err) reject(err);
          else if (!interview) reject(new Error('Interview not found'));
          else resolve(interview);
        }
      );
    });
  }

  // Store interview data from external workflow
  async storeInterviewData(candidateId, jobId, userId, callId, interviewData) {
    const db = getDatabase();
    
    try {
      // Check if interview already exists
      const existing = await new Promise((resolve, reject) => {
        db.get(
          'SELECT * FROM voice_interviews WHERE call_id = ?',
          [callId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (existing) {
        // Update existing interview
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE voice_interviews 
             SET status = ?, end_time = ?, duration_seconds = ?, cost_cents = ?, 
                 transcript = ?, overall_score = ?, recommendation = ?, updated_at = CURRENT_TIMESTAMP
             WHERE call_id = ?`,
            [
              interviewData.status === 'ended' ? 'completed' : interviewData.status,
              interviewData.endTime,
              interviewData.duration,
              interviewData.cost,
              interviewData.transcript,
              this.calculateScore(interviewData.transcript),
              this.generateRecommendation(interviewData.transcript),
              callId
            ],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
        return existing.id;
      } else {
        // Create new interview record
        const interviewId = await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO voice_interviews 
             (candidate_id, job_id, user_id, call_id, status, start_time, end_time, 
              duration_seconds, cost_cents, transcript, overall_score, recommendation) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              candidateId,
              jobId,
              userId,
              callId,
              interviewData.status === 'ended' ? 'completed' : interviewData.status,
              interviewData.startTime,
              interviewData.endTime,
              interviewData.duration,
              interviewData.cost,
              interviewData.transcript,
              this.calculateScore(interviewData.transcript),
              this.generateRecommendation(interviewData.transcript)
            ],
            function(err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });
        return interviewId;
      }
    } catch (error) {
      console.error('Failed to store interview data:', error);
      throw error;
    }
  }

  // Generate interview prompt based on job data
  generateInterviewPrompt(jobData) {
    return `You are Sarah, a professional HR interviewer conducting a phone interview for the ${jobData.title} position at our company.

Job Details:
- Position: ${jobData.title}
- Department: ${jobData.department || 'Not specified'}
- Description: ${jobData.description || 'General role'}

Interview Guidelines:
1. Be professional, friendly, and conversational
2. Ask 3-5 relevant questions about their experience and skills
3. Keep the interview between 5-10 minutes
4. Focus on technical skills, communication, and cultural fit
5. End by thanking them and mentioning next steps

Sample Questions:
- Can you tell me about your relevant experience for this role?
- What interests you most about this position?
- How do you handle challenging situations at work?
- Do you have any questions about the role or company?

Remember to be encouraging and professional throughout the conversation.`;
  }

  // Simple scoring algorithm (can be enhanced with AI)
  calculateScore(transcript) {
    if (!transcript) return 0;
    
    const positiveWords = ['experience', 'skilled', 'passionate', 'motivated', 'team', 'leadership', 'problem-solving'];
    const words = transcript.toLowerCase().split(' ');
    const matches = words.filter(word => positiveWords.some(pos => word.includes(pos)));
    
    return Math.min(Math.max(matches.length * 15, 30), 100);
  }

  // Generate recommendation based on score
  generateRecommendation(transcript) {
    const score = this.calculateScore(transcript);
    
    if (score >= 80) return 'hire';
    if (score >= 60) return 'shortlist';
    return 'reject';
  }

  // Log call events
  async logCallEvent(interviewId, eventType, eventData) {
    const db = getDatabase();
    
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO call_events (interview_id, event_type, event_data) VALUES (?, ?, ?)',
        [interviewId, eventType, JSON.stringify(eventData)],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // Get user's interview history
  async getUserInterviews(userId, limit = 10) {
    const db = getDatabase();
    
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT vi.*, c.name as candidate_name, j.title as job_title 
         FROM voice_interviews vi
         LEFT JOIN candidates c ON vi.candidate_id = c.id
         LEFT JOIN jobs j ON vi.job_id = j.id
         WHERE vi.user_id = ?
         ORDER BY vi.created_at DESC
         LIMIT ?`,
        [userId, limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }
}

module.exports = new VoiceService();