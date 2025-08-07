const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get referral stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(`
      SELECT 
        COUNT(r.id) as total_referrals,
        COALESCE(SUM(r.bonus_amount), 0) as total_bonus,
        u.referral_earnings,
        u.referral_code
      FROM users u
      LEFT JOIN referrals r ON r.referrer_id = u.id
      WHERE u.id = $1
      GROUP BY u.id, u.referral_earnings, u.referral_code
    `, [userId]);

    const stats = result.rows[0] || {
      total_referrals: 0,
      total_bonus: 0,
      referral_earnings: 0,
      referral_code: req.user.referral_code
    };

    res.json({
      success: true,
      stats: {
        totalReferrals: parseInt(stats.total_referrals),
        totalBonus: parseFloat(stats.total_bonus),
        referralEarnings: parseFloat(stats.referral_earnings),
        referralCode: stats.referral_code
      }
    });

  } catch (error) {
    console.error('Get referral stats error:', error);
    res.status(500).json({ error: 'Failed to get referral stats' });
  }
});

// Get referral history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(`
      SELECT 
        r.id,
        r.bonus_amount,
        r.created_at,
        u.username as referred_username,
        u.avatar as referred_avatar,
        u.join_date as referred_join_date
      FROM referrals r
      JOIN users u ON r.referred_id = u.id
      WHERE r.referrer_id = $1
      ORDER BY r.created_at DESC
    `, [userId]);

    const history = result.rows.map(row => ({
      id: row.id,
      bonusAmount: parseFloat(row.bonus_amount),
      createdAt: row.created_at,
      referred: {
        username: row.referred_username,
        avatar: row.referred_avatar,
        joinDate: row.referred_join_date
      }
    }));

    res.json({
      success: true,
      history
    });

  } catch (error) {
    console.error('Get referral history error:', error);
    res.status(500).json({ error: 'Failed to get referral history' });
  }
});

// Get referral earnings log
router.get('/earnings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'all' } = req.query;

    let dateFilter = '';
    if (period === 'day') {
      dateFilter = "AND created_at >= NOW() - INTERVAL '1 day'";
    } else if (period === 'week') {
      dateFilter = "AND created_at >= NOW() - INTERVAL '1 week'";
    } else if (period === 'month') {
      dateFilter = "AND created_at >= NOW() - INTERVAL '1 month'";
    }

    const result = await pool.query(`
      SELECT 
        earning_type,
        SUM(referral_amount) as total_amount,
        COUNT(*) as count
      FROM referral_earnings_log
      WHERE referrer_id = $1 ${dateFilter}
      GROUP BY earning_type
      ORDER BY total_amount DESC
    `, [userId]);

    const earnings = result.rows.map(row => ({
      type: row.earning_type,
      amount: parseFloat(row.total_amount),
      count: parseInt(row.count)
    }));

    res.json({
      success: true,
      earnings
    });

  } catch (error) {
    console.error('Get referral earnings error:', error);
    res.status(500).json({ error: 'Failed to get referral earnings' });
  }
});

module.exports = router;