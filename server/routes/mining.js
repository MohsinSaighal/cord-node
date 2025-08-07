const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Start mining session
router.post('/start', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const userId = req.user.id;

    // Check if user already has an active session
    const activeSessionResult = await client.query(
      'SELECT id FROM mining_sessions WHERE user_id = $1 AND end_time IS NULL',
      [userId]
    );

    if (activeSessionResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Mining session already active' });
    }

    // Create new mining session
    const sessionResult = await client.query(`
      INSERT INTO mining_sessions (user_id, start_time, earnings, hash_rate, efficiency)
      VALUES ($1, NOW(), 0, $2, $3)
      RETURNING id, start_time
    `, [userId, 150 + Math.random() * 50, 85 + Math.random() * 15]);

    const session = sessionResult.rows[0];

    // Update user status
    await client.query(
      'UPDATE users SET is_node_active = true, node_start_time = NOW() WHERE id = $1',
      [userId]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      sessionId: session.id,
      startTime: session.start_time,
      message: 'Mining session started successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Start mining error:', error);
    res.status(500).json({ error: 'Failed to start mining session' });
  } finally {
    client.release();
  }
});

// Stop mining session
router.post('/stop', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const userId = req.user.id;

    // Get active session
    const sessionResult = await client.query(
      'SELECT * FROM mining_sessions WHERE user_id = $1 AND end_time IS NULL ORDER BY start_time DESC LIMIT 1',
      [userId]
    );

    if (sessionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No active mining session found' });
    }

    const session = sessionResult.rows[0];

    // End mining session
    await client.query(
      'UPDATE mining_sessions SET end_time = NOW() WHERE id = $1',
      [session.id]
    );

    // Update user status
    await client.query(
      'UPDATE users SET is_node_active = false, node_start_time = NULL WHERE id = $1',
      [userId]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      sessionId: session.id,
      earnings: parseFloat(session.earnings),
      message: 'Mining session stopped successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Stop mining error:', error);
    res.status(500).json({ error: 'Failed to stop mining session' });
  } finally {
    client.release();
  }
});

// Update mining progress
router.post('/update', authenticateToken, [
  body('earnings').isNumeric().withMessage('Earnings must be a number'),
  body('hashRate').optional().isNumeric(),
  body('efficiency').optional().isNumeric()
], async (req, res) => {
  const client = await pool.connect();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    await client.query('BEGIN');
    
    const userId = req.user.id;
    const { earnings, hashRate, efficiency } = req.body;

    // Get active session
    const sessionResult = await client.query(
      'SELECT * FROM mining_sessions WHERE user_id = $1 AND end_time IS NULL ORDER BY start_time DESC LIMIT 1',
      [userId]
    );

    if (sessionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No active mining session found' });
    }

    const session = sessionResult.rows[0];
    const earningsToAdd = earnings - parseFloat(session.earnings);

    if (earningsToAdd <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid earnings update' });
    }

    // Update mining session
    await client.query(`
      UPDATE mining_sessions 
      SET earnings = $1, hash_rate = $2, efficiency = $3
      WHERE id = $4
    `, [earnings, hashRate || session.hash_rate, efficiency || session.efficiency, session.id]);

    // Update user balance
    await client.query(`
      UPDATE users 
      SET current_balance = current_balance + $1,
          total_earned = total_earned + $1,
          weekly_earnings = weekly_earnings + $1,
          monthly_earnings = monthly_earnings + $1
      WHERE id = $2
    `, [earningsToAdd, userId]);

    // Process referral reward (10% to referrer)
    if (req.user.referred_by) {
      const referralReward = earningsToAdd * 0.1;
      await client.query(`
        UPDATE users 
        SET current_balance = current_balance + $1,
            total_earned = total_earned + $1,
            referral_earnings = referral_earnings + $1
        WHERE id = $2
      `, [referralReward, req.user.referred_by]);

      // Log referral earning
      await client.query(`
        INSERT INTO referral_earnings_log (referrer_id, referred_id, earning_type, base_amount, referral_amount)
        VALUES ($1, $2, 'mining', $3, $4)
      `, [req.user.referred_by, userId, earningsToAdd, referralReward]);
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      earningsAdded: earningsToAdd,
      totalSessionEarnings: earnings,
      message: 'Mining progress updated successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update mining error:', error);
    res.status(500).json({ error: 'Failed to update mining progress' });
  } finally {
    client.release();
  }
});

// Get mining stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_sessions,
        COALESCE(SUM(earnings), 0) as total_earnings,
        COALESCE(AVG(efficiency), 0) as avg_efficiency,
        COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time))), 0) as total_mining_time
      FROM mining_sessions 
      WHERE user_id = $1
    `, [userId]);

    const stats = result.rows[0];

    res.json({
      success: true,
      stats: {
        totalSessions: parseInt(stats.total_sessions),
        totalEarnings: parseFloat(stats.total_earnings),
        averageEfficiency: parseFloat(stats.avg_efficiency),
        totalMiningTime: parseInt(stats.total_mining_time) // in seconds
      }
    });

  } catch (error) {
    console.error('Get mining stats error:', error);
    res.status(500).json({ error: 'Failed to get mining stats' });
  }
});

module.exports = router;