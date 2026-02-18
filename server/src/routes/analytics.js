const { getDatabase } = require('../db/connection');
const db = getDatabase();
const express = require('express');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

// All analytics require authentication
router.use(authRequired);

// Utility Promisified SQLite helpers
function dbAll(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function dbGet(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row || {});
    });
  });
}

/**
 * CLIENT ANALYTICS
 */
router.get('/client', async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Analytics request for user:', userId);

    // ---- Fetch Candidates ----
    const candidates = await dbAll(
      `SELECT * FROM candidates WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    // ---- Fetch Email Logs ----
    const emailLogs = await dbAll(
      `SELECT recipient_email, sent_at, status 
       FROM email_logs 
       WHERE user_id = ?`,
      [userId]
    );

    const totalCandidates = candidates.length;

    // ---- Candidate Score ----
    const candidatesWithScore = candidates.filter(c => c.match_score > 0);
    const avgMatchScore = candidatesWithScore.length
      ? Math.round(
          candidatesWithScore.reduce((sum, c) => sum + c.match_score, 0) /
            candidatesWithScore.length
        )
      : 0;

    // ---- Interview Response Rate ----
    const candidatesWithInterview = candidates.filter(
      c => c.interview_date && c.interview_date.trim() !== ''
    ).length;

    const responseRate = totalCandidates
      ? Math.round((candidatesWithInterview / totalCandidates) * 100)
      : 0;

    // ---- Time to Shortlist ----
    const processedCandidates = candidates.filter(
      c => c.updated_at && c.created_at
    );

    let avgTimeToShortlist = 0;
    if (processedCandidates.length > 0) {
      const totalDays = processedCandidates.reduce((sum, c) => {
        const created = new Date(c.created_at);
        const updated = new Date(c.updated_at);
        return (
          sum +
          Math.max(
            0,
            Math.ceil((updated - created) / (1000 * 60 * 60 * 24))
          )
        );
      }, 0);

      avgTimeToShortlist = Math.round(
        totalDays / processedCandidates.length
      );
    }

    // ---- Success Rate ----
    const successfulCandidates = candidates.filter(c =>
      c.status &&
      (
        c.status.toLowerCase().includes('shortlist') ||
        c.status.toLowerCase().includes('selected') ||
        c.status.toLowerCase().includes('hired') ||
        c.status.toLowerCase().includes('review')
      )
    );

    const successRate = totalCandidates
      ? Math.round((successfulCandidates.length / totalCandidates) * 100)
      : 0;

    // ---- Wallet Balance ----
    const wallet = await dbGet(
      `SELECT balance_cents FROM wallets WHERE user_id = ?`,
      [userId]
    );

    // ---- Total Jobs ----
    const jobsRow = await dbGet(
      `SELECT COUNT(*) AS count FROM jobs WHERE user_id = ?`,
      [userId]
    );
    const jobsCount = jobsRow.count || 0;

    // ---- Recent Transactions ----
    const transactions = await dbAll(
      `SELECT amount_cents, type, description, created_at
       FROM transactions 
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId]
    );

    const totalSpent = transactions
      .filter(t => t.amount_cents < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount_cents), 0);

    // ---- Monthly trends (last 6 months) ----
    const monthlyTrends = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const monthCandidates = candidates.filter(c => {
        const created = new Date(c.created_at);
        return created >= monthStart && created < nextMonth;
      });

      const monthEmails = emailLogs.filter(e => {
        const sent = new Date(e.sent_at);
        return sent >= monthStart && sent < nextMonth;
      });

      const monthSuccessful = monthCandidates.filter(c =>
        (c.match_score >= 70) ||
        (c.interview_date && c.interview_date.trim() !== '') ||
        (c.status && c.status.toLowerCase().includes('shortlist'))
      ).length;

      monthlyTrends.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        candidates: monthCandidates.length,
        emails: monthEmails.length,
        shortlisted: monthSuccessful
      });
    }

    res.json({
      jobs: { total: jobsCount },
      candidates: {
        total: totalCandidates,
        shortlisted: successfulCandidates.length,
        avgMatchScore: { value: avgMatchScore },
        responseRate: { value: responseRate },
        timeToShortlist: { value: avgTimeToShortlist },
        successRate: { value: successRate }
      },
      wallet: {
        balance: wallet.balance_cents || 0,
        totalSpent,
        recentTransactions: transactions.slice(0, 5)
      },
      emails: {
        sent: emailLogs.filter(e => e.status === 'sent').length,
        failed: emailLogs.filter(e => e.status === 'failed').length
      },
      trends: { monthly: monthlyTrends }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

/**
 * ADMIN ANALYTICS
 */
router.get('/admin', requireRole('admin'), async (req, res) => {
  try {
    const clientsRow = await dbGet(`SELECT COUNT(*) AS count FROM users WHERE role = 'client'`);
    const candidatesRow = await dbGet(`SELECT COUNT(*) AS count FROM candidates`);
    const jobsRow = await dbGet(`SELECT COUNT(*) AS count FROM jobs`);
    const revenueRow = await dbGet(
      `SELECT SUM(amount_cents) AS total FROM transactions WHERE type = 'recharge'`
    );

    res.json({
      total_clients: clientsRow.count || 0,
      total_candidates: candidatesRow.count || 0,
      total_jobs: jobsRow.count || 0,
      total_revenue_cents: revenueRow.total || 0
    });

  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({ error: 'Failed to load admin analytics' });
  }
});

module.exports = router;
