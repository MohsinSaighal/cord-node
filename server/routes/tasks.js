const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all tasks with user progress
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(`
      SELECT 
        t.*,
        ut.completed,
        ut.progress,
        ut.claimed_at
      FROM tasks t
      LEFT JOIN user_tasks ut ON t.id = ut.task_id AND ut.user_id = $1
      WHERE t.is_active = true
      ORDER BY t.type, t.title
    `, [userId]);

    const tasks = result.rows.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      reward: parseFloat(task.reward) * req.user.multiplier,
      type: task.type,
      completed: task.completed || false,
      progress: task.progress || 0,
      maxProgress: task.max_progress,
      socialUrl: task.social_url,
      expiresAt: task.expires_at,
      claimedAt: task.claimed_at
    }));

    res.json({
      success: true,
      tasks
    });

  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

// Complete a task
router.post('/:taskId/complete', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { taskId } = req.params;
    const userId = req.user.id;

    // Get task details
    const taskResult = await client.query(
      'SELECT * FROM tasks WHERE id = $1 AND is_active = true',
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskResult.rows[0];

    // Check if task is already completed
    const userTaskResult = await client.query(
      'SELECT * FROM user_tasks WHERE user_id = $1 AND task_id = $2',
      [userId, taskId]
    );

    if (userTaskResult.rows.length > 0 && userTaskResult.rows[0].completed) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Task already completed' });
    }

    // Calculate reward
    const baseReward = parseFloat(task.reward);
    const totalReward = baseReward * req.user.multiplier;

    // Update or insert user task
    if (userTaskResult.rows.length > 0) {
      await client.query(`
        UPDATE user_tasks 
        SET completed = true, progress = $1, claimed_at = NOW(), updated_at = NOW()
        WHERE user_id = $2 AND task_id = $3
      `, [task.max_progress, userId, taskId]);
    } else {
      await client.query(`
        INSERT INTO user_tasks (user_id, task_id, completed, progress, claimed_at)
        VALUES ($1, $2, true, $3, NOW())
      `, [userId, taskId, task.max_progress]);
    }

    // Update user balance and stats
    await client.query(`
      UPDATE users 
      SET current_balance = current_balance + $1,
          total_earned = total_earned + $1,
          tasks_completed = tasks_completed + 1,
          weekly_earnings = weekly_earnings + $1,
          monthly_earnings = monthly_earnings + $1,
          updated_at = NOW()
      WHERE id = $2
    `, [totalReward, userId]);

    // Handle daily check-in special case
    if (taskId === 'daily-checkin') {
      await client.query(
        'UPDATE users SET daily_checkin_claimed = true, last_login_time = NOW() WHERE id = $1',
        [userId]
      );
    }

    // Process referral reward (10% to referrer)
    if (req.user.referred_by) {
      const referralReward = totalReward * 0.1;
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
        VALUES ($1, $2, 'task_completion', $3, $4)
      `, [req.user.referred_by, userId, totalReward, referralReward]);
    }

    await client.query('COMMIT');

    // Get updated user data
    const updatedUserResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    const updatedUser = updatedUserResult.rows[0];

    res.json({
      success: true,
      reward: totalReward,
      user: formatUserResponse(updatedUser),
      message: `Task completed! Earned ${totalReward} CORD`
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Complete task error:', error);
    res.status(500).json({ error: 'Failed to complete task' });
  } finally {
    client.release();
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