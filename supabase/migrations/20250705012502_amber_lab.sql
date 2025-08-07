/*
  # Fix Tasks System Completely

  1. Ensure all default tasks exist with correct data
  2. Fix the complete_user_task function to handle all edge cases
  3. Add proper error handling and validation
  4. Ensure tasks work correctly with user multipliers
*/

-- Ensure all default tasks exist with correct data
INSERT INTO tasks (id, title, description, reward, type, max_progress, social_url, is_active) VALUES
  ('daily-checkin', 'Daily Check-in', 'Log in to CordNode daily and claim your bonus - streak bonuses coming soon!', 15, 'daily', 1, NULL, true),
  ('mine-1-hour', 'Mine for 1 Hour', 'Keep your mining node active for 1 hour straight to earn this reward', 35, 'daily', 3600, NULL, true),
  ('twitter-follow', 'Follow on X (Twitter)', 'Follow @CordNodeAI on X (Twitter) for the latest updates and announcements', 75, 'social', 1, 'https://x.com/CordNodeAI?t=wBanNrlWtUVffZ3isqAkfA&s=09', true),
  ('twitter-retweet', 'Retweet Our Post', 'Retweet our pinned post to help spread the word about CordNode', 50, 'social', 1, 'https://x.com/CordNodeAI?t=wBanNrlWtUVffZ3isqAkfA&s=09', true),
  ('telegram-join', 'Join Telegram Channel', 'Join our official Telegram channel for updates and community discussions', 60, 'social', 1, 'https://t.me/cordnode', true),
  ('discord-join', 'Join Discord Server', 'Join our Discord server to connect with the CordNode community', 80, 'social', 1, 'https://discord.gg/Y5RMZPcNSy', true),
  ('invite-friends', 'Invite Friends', 'Successfully refer 3 friends to join CordNode and start earning', 150, 'weekly', 3, NULL, true),
  ('weekly-mining', 'Weekly Mining Goal', 'Earn 1000 CORD from mining activities this week', 200, 'weekly', 1000, NULL, true),
  ('efficiency-master', 'Node Efficiency Master', 'Maintain 90%+ node efficiency for 24 consecutive hours', 300, 'achievement', 86400, NULL, true),
  ('early-adopter', 'Early Adopter', 'Exclusive reward for Discord veterans (5+ year accounts)', 750, 'achievement', 1, NULL, true),
  ('social-media-master', 'Social Media Master', 'Complete all 4 social media tasks to unlock this massive bonus', 500, 'achievement', 4, NULL, true)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  reward = EXCLUDED.reward,
  type = EXCLUDED.type,
  max_progress = EXCLUDED.max_progress,
  social_url = EXCLUDED.social_url,
  is_active = EXCLUDED.is_active;

-- Drop and recreate the complete_user_task function with better error handling
DROP FUNCTION IF EXISTS complete_user_task(text, text, numeric);

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
  base_reward numeric;
  final_reward numeric;
BEGIN
  -- Input validation
  IF p_user_id IS NULL OR trim(p_user_id) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid user ID');
  END IF;
  
  IF p_task_id IS NULL OR trim(p_task_id) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid task ID');
  END IF;
  
  IF p_reward_amount IS NULL OR p_reward_amount < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid reward amount');
  END IF;

  -- Check if user exists and get current data
  SELECT id, current_balance, total_earned, tasks_completed, multiplier
  FROM users 
  WHERE id = p_user_id 
  INTO user_record;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Check if task exists and is active
  SELECT id, title, reward, type, max_progress, is_active
  FROM tasks 
  WHERE id = p_task_id 
  INTO task_record;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found');
  END IF;
  
  IF NOT task_record.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task is not active');
  END IF;

  -- Calculate the final reward (base reward * user multiplier)
  base_reward := task_record.reward;
  final_reward := base_reward * user_record.multiplier;

  -- Check if task is already completed
  SELECT user_id, task_id, completed, claimed_at
  FROM user_tasks 
  WHERE user_id = p_user_id AND task_id = p_task_id
  INTO existing_completion;
  
  IF FOUND AND existing_completion.completed THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Task already completed',
      'completed_at', existing_completion.claimed_at
    );
  END IF;

  -- Start atomic transaction
  BEGIN
    -- Insert or update the task completion
    IF FOUND THEN
      -- Update existing record (should not happen if we checked completed above)
      UPDATE user_tasks 
      SET 
        completed = true,
        progress = task_record.max_progress,
        claimed_at = now(),
        updated_at = now()
      WHERE user_id = p_user_id AND task_id = p_task_id AND completed = false;
      
      -- Check if update actually happened
      IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Task was already completed');
      END IF;
    ELSE
      -- Insert new completion record
      INSERT INTO user_tasks (user_id, task_id, completed, progress, claimed_at)
      VALUES (p_user_id, p_task_id, true, task_record.max_progress, now());
    END IF;

    -- Update user balance and stats
    UPDATE users 
    SET 
      current_balance = current_balance + final_reward,
      total_earned = total_earned + final_reward,
      tasks_completed = tasks_completed + 1,
      updated_at = now()
    WHERE id = p_user_id
    RETURNING current_balance INTO new_balance;

    -- Verify the update succeeded
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Failed to update user balance';
    END IF;

    -- Log the successful completion
    RAISE LOG 'Task % completed by user % for % CORD (base: %, multiplier: %)', 
      p_task_id, p_user_id, final_reward, base_reward, user_record.multiplier;

    -- Return success with detailed information
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Task completed successfully',
      'task_id', p_task_id,
      'task_title', task_record.title,
      'task_type', task_record.type,
      'base_reward', base_reward,
      'multiplier', user_record.multiplier,
      'reward', final_reward,
      'new_balance', new_balance,
      'user_id', p_user_id,
      'completed_at', now()
    );

  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('success', false, 'error', 'Task already completed');
    WHEN OTHERS THEN
      -- Log the actual error for debugging
      RAISE LOG 'Task completion error for user % task %: % (SQLSTATE: %)', 
        p_user_id, p_task_id, SQLERRM, SQLSTATE;
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'Database operation failed: ' || SQLERRM,
        'sqlstate', SQLSTATE
      );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION complete_user_task(text, text, numeric) TO authenticated, anon, public;

-- Function to reset daily tasks (can be called manually or via cron)
CREATE OR REPLACE FUNCTION reset_daily_tasks()
RETURNS jsonb AS $$
DECLARE
  affected_rows integer;
BEGIN
  -- Reset daily check-in for all users
  UPDATE users 
  SET 
    daily_checkin_claimed = false,
    updated_at = now()
  WHERE daily_checkin_claimed = true;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  -- Delete completed daily task records (so they can be completed again)
  DELETE FROM user_tasks 
  WHERE task_id IN (
    SELECT id FROM tasks WHERE type = 'daily'
  ) AND completed = true;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Daily tasks reset successfully',
    'users_reset', affected_rows
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset weekly tasks (can be called manually or via cron)
CREATE OR REPLACE FUNCTION reset_weekly_tasks()
RETURNS jsonb AS $$
DECLARE
  affected_rows integer;
BEGIN
  -- Reset weekly earnings for all users
  UPDATE users 
  SET 
    weekly_earnings = 0,
    updated_at = now();
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  -- Delete completed weekly task records (so they can be completed again)
  DELETE FROM user_tasks 
  WHERE task_id IN (
    SELECT id FROM tasks WHERE type = 'weekly'
  ) AND completed = true;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Weekly tasks reset successfully',
    'users_reset', affected_rows
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions for reset functions
GRANT EXECUTE ON FUNCTION reset_daily_tasks() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION reset_weekly_tasks() TO authenticated, anon;

-- Add comments for documentation
COMMENT ON FUNCTION complete_user_task(text, text, numeric) IS 'Complete a task for a user with proper reward calculation including multipliers and comprehensive error handling';
COMMENT ON FUNCTION reset_daily_tasks() IS 'Reset all daily tasks so they can be completed again';
COMMENT ON FUNCTION reset_weekly_tasks() IS 'Reset all weekly tasks so they can be completed again';

-- Ensure proper indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_tasks_type_active ON tasks(type, is_active);
CREATE INDEX IF NOT EXISTS idx_user_tasks_user_completed ON user_tasks(user_id, completed);
CREATE INDEX IF NOT EXISTS idx_user_tasks_task_completed ON user_tasks(task_id, completed);
CREATE INDEX IF NOT EXISTS idx_user_tasks_user_task_completed ON user_tasks(user_id, task_id, completed) WHERE completed = true;