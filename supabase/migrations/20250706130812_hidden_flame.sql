/*
  # Enhanced Referral System - 10% Ongoing Rewards

  1. New Columns
    - Add lifetime_referral_earnings to users table
    - Add last_referral_payout to users table

  2. New Tables
    - referral_earnings_log - Track all referral reward distributions

  3. Functions
    - distribute_referral_reward - Distribute 10% of earnings to referrer
    - complete_user_task_with_referral - Task completion with referral rewards
    - add_mining_earnings_with_referral - Mining earnings with referral rewards
    - get_enhanced_referral_stats - Comprehensive referral statistics
    - get_referral_earnings_summary - Period-based earnings analysis

  4. Security
    - Enable RLS on new tables
    - Add policies for user access
    - Grant appropriate permissions
*/

-- Add new columns to track ongoing referral rewards
DO $$
BEGIN
  -- Add lifetime_referral_earnings if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'lifetime_referral_earnings'
  ) THEN
    ALTER TABLE users ADD COLUMN lifetime_referral_earnings numeric NOT NULL DEFAULT 0;
  END IF;

  -- Add last_referral_payout if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'last_referral_payout'
  ) THEN
    ALTER TABLE users ADD COLUMN last_referral_payout timestamptz DEFAULT now();
  END IF;
END $$;

-- Create referral earnings tracking table
CREATE TABLE IF NOT EXISTS referral_earnings_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  earning_type text NOT NULL, -- 'mining', 'task', 'bonus', etc.
  base_amount numeric NOT NULL,
  referral_amount numeric NOT NULL, -- 10% of base_amount
  transaction_id text, -- Reference to the original earning transaction
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on new table
ALTER TABLE referral_earnings_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for referral earnings log
CREATE POLICY "Users can read own referral earnings"
  ON referral_earnings_log
  FOR SELECT
  TO authenticated, anon
  USING (
    referrer_id = COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'discord_id'),
      auth.uid()::text
    ) OR 
    referred_id = COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'discord_id'),
      auth.uid()::text
    )
  );

CREATE POLICY "System can insert referral earnings"
  ON referral_earnings_log
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_referral_earnings_log_referrer ON referral_earnings_log(referrer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_log_referred ON referral_earnings_log(referred_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_log_type ON referral_earnings_log(earning_type);

-- Function to distribute referral rewards (10% of earnings)
CREATE OR REPLACE FUNCTION distribute_referral_reward(
  p_user_id text,
  p_earning_amount numeric,
  p_earning_type text DEFAULT 'general',
  p_transaction_id text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  referrer_id text;
  referral_reward numeric;
  referrer_record record;
  earning_log_id uuid;
BEGIN
  -- Input validation
  IF p_user_id IS NULL OR p_earning_amount IS NULL OR p_earning_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid parameters');
  END IF;

  -- Get the user's referrer
  SELECT referred_by FROM users WHERE id = p_user_id INTO referrer_id;
  
  -- If user has no referrer, no reward to distribute
  IF referrer_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', true, 
      'message', 'No referrer found',
      'referral_reward', 0
    );
  END IF;

  -- Calculate 10% referral reward
  referral_reward := p_earning_amount * 0.10;

  -- Get referrer information
  SELECT id, username, current_balance, referral_earnings, lifetime_referral_earnings
  FROM users 
  WHERE id = referrer_id
  INTO referrer_record;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referrer not found');
  END IF;

  BEGIN
    -- Log the referral earning
    INSERT INTO referral_earnings_log (
      referrer_id, 
      referred_id, 
      earning_type, 
      base_amount, 
      referral_amount,
      transaction_id
    )
    VALUES (
      referrer_id, 
      p_user_id, 
      p_earning_type, 
      p_earning_amount, 
      referral_reward,
      p_transaction_id
    )
    RETURNING id INTO earning_log_id;

    -- Update referrer's balance and earnings
    UPDATE users 
    SET 
      current_balance = current_balance + referral_reward,
      total_earned = total_earned + referral_reward,
      referral_earnings = referral_earnings + referral_reward,
      lifetime_referral_earnings = lifetime_referral_earnings + referral_reward,
      last_referral_payout = now(),
      updated_at = now()
    WHERE id = referrer_id;

    -- Verify the update worked
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Failed to update referrer balance';
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Referral reward distributed successfully',
      'referrer_id', referrer_id,
      'referrer_username', referrer_record.username,
      'referred_id', p_user_id,
      'base_amount', p_earning_amount,
      'referral_reward', referral_reward,
      'earning_type', p_earning_type,
      'log_id', earning_log_id
    );

  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'Failed to distribute referral reward: ' || SQLERRM
      );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced task completion function with referral rewards
CREATE OR REPLACE FUNCTION complete_user_task_with_referral(
  p_user_id text,
  p_task_id text,
  p_reward_amount numeric
)
RETURNS jsonb AS $$
DECLARE
  task_completion_result jsonb;
  referral_result jsonb;
  final_reward numeric;
  user_multiplier numeric;
BEGIN
  -- Get user multiplier
  SELECT multiplier FROM users WHERE id = p_user_id INTO user_multiplier;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Calculate final reward with multiplier
  final_reward := p_reward_amount * user_multiplier;

  -- Complete the task using existing function
  SELECT complete_user_task(p_user_id, p_task_id, p_reward_amount) INTO task_completion_result;

  -- If task completion failed, return the error
  IF NOT (task_completion_result ->> 'success')::boolean THEN
    RETURN task_completion_result;
  END IF;

  -- Distribute referral reward (10% of the final reward)
  SELECT distribute_referral_reward(
    p_user_id, 
    final_reward, 
    'task_completion',
    p_task_id
  ) INTO referral_result;

  -- Add referral information to the response
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Task completed with referral rewards',
    'task_completion', task_completion_result,
    'referral_reward', referral_result,
    'total_reward', final_reward,
    'referral_bonus', CASE 
      WHEN (referral_result ->> 'success')::boolean THEN (referral_result ->> 'referral_reward')::numeric 
      ELSE 0 
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced mining reward function with referral distribution
CREATE OR REPLACE FUNCTION add_mining_earnings_with_referral(
  p_user_id text,
  p_earnings numeric,
  p_session_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  user_record record;
  referral_result jsonb;
  new_balance numeric;
BEGIN
  -- Input validation
  IF p_user_id IS NULL OR p_earnings IS NULL OR p_earnings <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid parameters');
  END IF;

  -- Get user data with lock
  SELECT id, current_balance, total_earned, weekly_earnings, monthly_earnings
  FROM users 
  WHERE id = p_user_id
  FOR UPDATE
  INTO user_record;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  BEGIN
    -- Update user earnings
    UPDATE users 
    SET 
      current_balance = current_balance + p_earnings,
      total_earned = total_earned + p_earnings,
      weekly_earnings = weekly_earnings + p_earnings,
      monthly_earnings = monthly_earnings + p_earnings,
      updated_at = now()
    WHERE id = p_user_id
    RETURNING current_balance INTO new_balance;

    -- Distribute referral reward (10% of mining earnings)
    SELECT distribute_referral_reward(
      p_user_id, 
      p_earnings, 
      'mining',
      p_session_id::text
    ) INTO referral_result;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Mining earnings added with referral rewards',
      'user_id', p_user_id,
      'earnings', p_earnings,
      'new_balance', new_balance,
      'referral_reward', referral_result
    );

  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'Failed to add mining earnings: ' || SQLERRM
      );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get enhanced referral statistics
CREATE OR REPLACE FUNCTION get_enhanced_referral_stats(p_user_id text)
RETURNS jsonb AS $$
DECLARE
  user_stats record;
  referral_history jsonb;
  earnings_breakdown jsonb;
  recent_earnings jsonb;
BEGIN
  -- Get user referral statistics
  SELECT 
    total_referrals,
    referral_earnings,
    lifetime_referral_earnings,
    last_referral_payout
  FROM users 
  WHERE id = p_user_id
  INTO user_stats;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Get referral history with user details
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'referred_username', u.username,
      'referred_avatar', u.avatar,
      'bonus_amount', r.bonus_amount,
      'created_at', r.created_at,
      'referred_total_earned', u.total_earned,
      'lifetime_earnings_from_referral', COALESCE(
        (SELECT SUM(referral_amount) FROM referral_earnings_log WHERE referred_id = u.id AND referrer_id = p_user_id), 
        0
      )
    )
  )
  FROM referrals r
  JOIN users u ON r.referred_id = u.id
  WHERE r.referrer_id = p_user_id
  ORDER BY r.created_at DESC
  INTO referral_history;

  -- Get earnings breakdown by type
  SELECT jsonb_object_agg(earning_type, total_amount)
  FROM (
    SELECT 
      earning_type,
      SUM(referral_amount) as total_amount
    FROM referral_earnings_log
    WHERE referrer_id = p_user_id
    GROUP BY earning_type
  ) breakdown
  INTO earnings_breakdown;

  -- Get recent earnings (last 30 days)
  SELECT jsonb_agg(
    jsonb_build_object(
      'referred_username', u.username,
      'earning_type', rel.earning_type,
      'base_amount', rel.base_amount,
      'referral_amount', rel.referral_amount,
      'created_at', rel.created_at
    )
  )
  FROM referral_earnings_log rel
  JOIN users u ON rel.referred_id = u.id
  WHERE rel.referrer_id = p_user_id
  AND rel.created_at > now() - interval '30 days'
  ORDER BY rel.created_at DESC
  LIMIT 50
  INTO recent_earnings;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'total_referrals', user_stats.total_referrals,
    'referral_earnings', user_stats.referral_earnings,
    'lifetime_referral_earnings', user_stats.lifetime_referral_earnings,
    'last_referral_payout', user_stats.last_referral_payout,
    'referral_history', COALESCE(referral_history, '[]'::jsonb),
    'earnings_breakdown', COALESCE(earnings_breakdown, '{}'::jsonb),
    'recent_earnings', COALESCE(recent_earnings, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get referral earnings summary for a specific period
CREATE OR REPLACE FUNCTION get_referral_earnings_summary(
  p_user_id text,
  p_period text DEFAULT 'all' -- 'day', 'week', 'month', 'all'
)
RETURNS jsonb AS $$
DECLARE
  start_date timestamptz;
  total_earnings numeric;
  earnings_count integer;
  top_earner jsonb;
BEGIN
  -- Determine start date based on period
  CASE p_period
    WHEN 'day' THEN start_date := now() - interval '1 day';
    WHEN 'week' THEN start_date := now() - interval '7 days';
    WHEN 'month' THEN start_date := now() - interval '30 days';
    ELSE start_date := '1970-01-01'::timestamptz;
  END CASE;

  -- Get total earnings and count
  SELECT 
    COALESCE(SUM(referral_amount), 0),
    COUNT(*)
  FROM referral_earnings_log
  WHERE referrer_id = p_user_id
  AND created_at >= start_date
  INTO total_earnings, earnings_count;

  -- Get top earning referral
  SELECT jsonb_build_object(
    'referred_username', u.username,
    'total_earned', SUM(rel.referral_amount)
  )
  FROM referral_earnings_log rel
  JOIN users u ON rel.referred_id = u.id
  WHERE rel.referrer_id = p_user_id
  AND rel.created_at >= start_date
  GROUP BY u.id, u.username
  ORDER BY SUM(rel.referral_amount) DESC
  LIMIT 1
  INTO top_earner;

  RETURN jsonb_build_object(
    'period', p_period,
    'total_earnings', total_earnings,
    'earnings_count', earnings_count,
    'top_earner', COALESCE(top_earner, '{}'::jsonb),
    'start_date', start_date,
    'end_date', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing complete_user_task function to include referral rewards
CREATE OR REPLACE FUNCTION complete_user_task(
  p_user_id text,
  p_task_id text,
  p_reward_amount numeric
)
RETURNS jsonb AS $$
DECLARE
  task_record record;
  user_record record;
  existing_completion record;
  new_balance numeric;
  final_reward numeric;
  completion_id uuid;
  referral_result jsonb;
BEGIN
  -- Input validation
  IF p_user_id IS NULL OR trim(p_user_id) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid user ID provided');
  END IF;
  
  IF p_task_id IS NULL OR trim(p_task_id) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid task ID provided');
  END IF;
  
  IF p_reward_amount IS NULL OR p_reward_amount < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid reward amount provided');
  END IF;

  -- Get user data with explicit locking
  SELECT id, current_balance, total_earned, tasks_completed, multiplier, username
  FROM users 
  WHERE id = p_user_id 
  FOR UPDATE
  INTO user_record;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found in database');
  END IF;

  -- Get task data
  SELECT id, title, reward, type, max_progress, is_active
  FROM tasks 
  WHERE id = p_task_id 
  INTO task_record;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found in database');
  END IF;
  
  IF NOT task_record.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task is not currently active');
  END IF;

  -- Calculate final reward with user multiplier
  final_reward := task_record.reward * user_record.multiplier;

  -- Check for existing completion
  SELECT id, user_id, task_id, completed, claimed_at, progress
  FROM user_tasks 
  WHERE user_id = p_user_id AND task_id = p_task_id
  FOR UPDATE
  INTO existing_completion;
  
  IF FOUND AND existing_completion.completed THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Task already completed',
      'completed_at', existing_completion.claimed_at
    );
  END IF;

  BEGIN
    -- Insert or update task completion
    IF FOUND THEN
      UPDATE user_tasks 
      SET 
        completed = true,
        progress = task_record.max_progress,
        claimed_at = now(),
        updated_at = now()
      WHERE id = existing_completion.id AND completed = false
      RETURNING id INTO completion_id;
      
      IF completion_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Failed to update task completion');
      END IF;
    ELSE
      INSERT INTO user_tasks (user_id, task_id, completed, progress, claimed_at)
      VALUES (p_user_id, p_task_id, true, task_record.max_progress, now())
      RETURNING id INTO completion_id;
    END IF;

    -- Update user balance and statistics
    UPDATE users 
    SET 
      current_balance = current_balance + final_reward,
      total_earned = total_earned + final_reward,
      tasks_completed = tasks_completed + 1,
      updated_at = now()
    WHERE id = p_user_id
    RETURNING current_balance INTO new_balance;

    IF new_balance IS NULL THEN
      RAISE EXCEPTION 'Failed to update user balance and statistics';
    END IF;

    -- Distribute referral reward (10% of the final reward)
    SELECT distribute_referral_reward(
      p_user_id, 
      final_reward, 
      'task_completion',
      p_task_id
    ) INTO referral_result;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Task completed successfully',
      'task_id', p_task_id,
      'task_title', task_record.title,
      'task_type', task_record.type,
      'user_id', p_user_id,
      'username', user_record.username,
      'base_reward', task_record.reward,
      'multiplier', user_record.multiplier,
      'reward', final_reward,
      'new_balance', new_balance,
      'completion_id', completion_id,
      'completed_at', now(),
      'referral_reward_distributed', (referral_result ->> 'success')::boolean,
      'referral_amount', CASE 
        WHEN (referral_result ->> 'success')::boolean THEN (referral_result ->> 'referral_reward')::numeric 
        ELSE 0 
      END
    );

  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'Database operation failed: ' || SQLERRM,
        'sqlstate', SQLSTATE
      );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION distribute_referral_reward(text, numeric, text, text) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION complete_user_task_with_referral(text, text, numeric) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION add_mining_earnings_with_referral(text, numeric, uuid) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION get_enhanced_referral_stats(text) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION get_referral_earnings_summary(text, text) TO authenticated, anon, public;

-- Add comments for documentation
COMMENT ON TABLE referral_earnings_log IS 'Tracks all referral earnings (10% of referred user earnings)';
COMMENT ON FUNCTION distribute_referral_reward(text, numeric, text, text) IS 'Distribute 10% referral reward to referrer when referred user earns';
COMMENT ON FUNCTION get_enhanced_referral_stats(text) IS 'Get comprehensive referral statistics including ongoing earnings';
COMMENT ON FUNCTION get_referral_earnings_summary(text, text) IS 'Get referral earnings summary for a specific time period';