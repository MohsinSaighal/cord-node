const express = require('express');
const pool = require('../config/database');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get leaderboard
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { period = 'all-time', limit = 100 } = req.query;

    let orderBy = 'total_earned';
    let selectField = 'total_earned';

    switch (period) {
      case 'weekly':
        orderBy = 'weekly_earnings';
        selectField = 'weekly_earnings';
        break;
      case 'monthly':
        orderBy = 'monthly_earnings';
        selectField = 'monthly_earnings';
        break;
      case 'daily':
        // For daily, we'll use a calculated field based on recent activity
        orderBy = 'total_earned';
        selectField = 'total_earned';
        break;
      default:
        orderBy = 'total_earned';
        selectField = 'total_earned';
    }

    const result = await pool.query(`
      SELECT 
        id,
        username,
        avatar,
        account_age,
        ${selectField} as earnings,
        weekly_earnings,
        monthly_earnings,
        is_node_active,
        created_at,
        ROW_NUMBER() OVER (ORDER BY ${orderBy} DESC) as rank
      FROM users
      WHERE ${selectField} > 0
      ORDER BY ${orderBy} DESC
      LIMIT $1
    `, [parseInt(limit)]);

    const leaderboard = result.rows.map(row => ({
      rank: parseInt(row.rank),
      username: row.username,
      avatar: row.avatar,
      totalEarned: parseFloat(row.earnings),
      accountAge: row.account_age,
      isActive: row.is_node_active,
      weeklyEarnings: parseFloat(row.weekly_earnings || 0)
    }));

    res.json({
      success: true,
      leaderboard,
      period
    });

  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Get leaderboard stats
router.get('/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_miners,
        COUNT(CASE WHEN is_node_active = true THEN 1 END) as active_miners,
        COALESCE(MAX(total_earned), 0) as top_earner_amount
      FROM users
    `);

    const stats = result.rows[0];

    res.json({
      success: true,
      stats: {
        totalMiners: parseInt(stats.total_miners),
        activeMiners: parseInt(stats.active_miners),
        topEarnerAmount: parseFloat(stats.top_earner_amount)
      }
    });

  } catch (error) {
    console.error('Get leaderboard stats error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard stats' });
  }
});

module.exports = router;