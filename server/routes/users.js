const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Update user profile
router.put('/profile', authenticateToken, [
  body('weeklyEarnings').optional().isNumeric(),
  body('monthlyEarnings').optional().isNumeric(),
  body('currentBalance').optional().isNumeric(),
  body('totalEarned').optional().isNumeric(),
  body('isNodeActive').optional().isBoolean(),
  body('nodeStartTime').optional().isNumeric(),
  body('dailyCheckInClaimed').optional().isBoolean(),
  body('tasksCompleted').optional().isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const updates = req.body;
    
    // Build dynamic update query
    const allowedFields = [
      'weekly_earnings', 'monthly_earnings', 'current_balance', 'total_earned',
      'is_node_active', 'node_start_time', 'daily_checkin_claimed', 'tasks_completed'
    ];
    
    const setClause = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbField)) {
        setClause.push(`${dbField} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });

    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Add updated_at timestamp
    setClause.push(`updated_at = NOW()`);
    values.push(userId);

    const query = `
      UPDATE users 
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: formatUserResponse(result.rows[0])
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// Get user stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(`
      SELECT 
        u.*,
        COUNT(r.id) as total_referrals_count,
        COALESCE(SUM(r.bonus_amount), 0) as total_referral_earnings
      FROM users u
      LEFT JOIN referrals r ON r.referrer_id = u.id
      WHERE u.id = $1
      GROUP BY u.id
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      stats: {
        ...formatUserResponse(result.rows[0]),
        totalReferrals: parseInt(result.rows[0].total_referrals_count),
        referralEarnings: parseFloat(result.rows[0].total_referral_earnings)
      }
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to get user stats' });
  }
});

function formatUserResponse(user) {
  return {
    id: user.id,
    username: user.username,
    discriminator: user.discriminator,
    avatar: user.avatar,
    accountAge: user.account_age,
    joinDate: user.join_date,
    multiplier: user.multiplier,
    totalEarned: parseFloat(user.total_earned),
    currentBalance: parseFloat(user.current_balance),
    isNodeActive: user.is_node_active,
    nodeStartTime: user.node_start_time ? new Date(user.node_start_time).getTime() : undefined,
    tasksCompleted: user.tasks_completed,
    rank: user.rank,
    lastLoginTime: user.last_login_time ? new Date(user.last_login_time).getTime() : Date.now(),
    dailyCheckInClaimed: user.daily_checkin_claimed,
    weeklyEarnings: parseFloat(user.weekly_earnings || 0),
    monthlyEarnings: parseFloat(user.monthly_earnings || 0),
    referralCode: user.referral_code,
    referredBy: user.referred_by,
    referralEarnings: parseFloat(user.referral_earnings || 0),
    totalReferrals: user.total_referrals || 0,
    compensationClaimed: user.compensation_claimed || false,
    hasBadgeOfHonor: user.hasBadgeOfHonor || false
  };
}

module.exports = router;