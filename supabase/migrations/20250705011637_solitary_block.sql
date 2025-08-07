/*
  # Fix Tasks Statistics and Database Integration

  1. Ensure all default tasks are properly inserted
  2. Fix task completion tracking
  3. Add proper indexes for performance
  4. Update task rewards to be more balanced
*/

-- Ensure all default tasks exist with correct data
INSERT INTO tasks (id, title, description, reward, type, max_progress, social_url, is_active) VALUES
  ('daily-checkin', 'Daily Check-in', 'Log in to CordNode daily and claim your bonus - streak bonuses coming soon!', 15, 'daily', 1, NULL, true),
  ('mine-1-hour', 'Mine for 1 Hour', 'Keep your mining node active for 1 hour straight to earn this reward', 35, 'daily', 3600, NULL, true),
  ('twitter-follow', 'Follow on X (Twitter)', 'Follow @CordNodeAI on X (Twitter) for the latest updates and announcements', 75, 'social', 1, 'https://x.com/CordNodeAI?t=wBanNrlWtUVffZ3isqAkfA&s=09', true),
  ('twitter-retweet', 'Retweet Our Post', 'Retweet our pinned post to help spread the word about CordNode', 50, 'social', 1, 'https://x.com/CordNodeAI?t=wBanNrlWtUVffZ3isqAkfA&s=09', true),
  ('telegram-join', 'Join Telegram Channel', 'Join our official Telegram channel for updates and community discussions', 60, 'social', 1, 'https://t.me/cordnode', true),
  ('discord-join', 'Join Discord Server', 'Join our Discord server to connect with the CordNode community', 80, 'social', 1, 'https://discord.gg/DPF4qafd7t', true),
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

-- Create indexes for better task query performance
CREATE INDEX IF NOT EXISTS idx_tasks_type_active ON tasks(type, is_active);
CREATE INDEX IF NOT EXISTS idx_user_tasks_user_completed ON user_tasks(user_id, completed);
CREATE INDEX IF NOT EXISTS idx_user_tasks_task_completed ON user_tasks(task_id, completed);

-- Function to get task statistics for a user
CREATE OR REPLACE FUNCTION get_user_task_stats(p_user_id text)
RETURNS jsonb AS $$
DECLARE
  total_tasks integer;
  completed_tasks integer;
  daily_completed integer;
  weekly_completed integer;
  social_completed integer;
  achievement_completed integer;
  total_cord_earned numeric;
BEGIN
  -- Get total active tasks
  SELECT COUNT(*) FROM tasks WHERE is_active = true INTO total_tasks;
  
  -- Get completed tasks count
  SELECT COUNT(*) FROM user_tasks ut
  JOIN tasks t ON ut.task_id = t.id
  WHERE ut.user_id = p_user_id AND ut.completed = true AND t.is_active = true
  INTO completed_tasks;
  
  -- Get completed tasks by type
  SELECT COUNT(*) FROM user_tasks ut
  JOIN tasks t ON ut.task_id = t.id
  WHERE ut.user_id = p_user_id AND ut.completed = true AND t.type = 'daily' AND t.is_active = true
  INTO daily_completed;
  
  SELECT COUNT(*) FROM user_tasks ut
  JOIN tasks t ON ut.task_id = t.id
  WHERE ut.user_id = p_user_id AND ut.completed = true AND t.type = 'weekly' AND t.is_active = true
  INTO weekly_completed;
  
  SELECT COUNT(*) FROM user_tasks ut
  JOIN tasks t ON ut.task_id = t.id
  WHERE ut.user_id = p_user_id AND ut.completed = true AND t.type = 'social' AND t.is_active = true
  INTO social_completed;
  
  SELECT COUNT(*) FROM user_tasks ut
  JOIN tasks t ON ut.task_id = t.id
  WHERE ut.user_id = p_user_id AND ut.completed = true AND t.type = 'achievement' AND t.is_active = true
  INTO achievement_completed;
  
  -- Calculate total CORD earned from tasks
  SELECT COALESCE(SUM(t.reward), 0) FROM user_tasks ut
  JOIN tasks t ON ut.task_id = t.id
  JOIN users u ON ut.user_id = u.id
  WHERE ut.user_id = p_user_id AND ut.completed = true AND t.is_active = true
  INTO total_cord_earned;
  
  RETURN jsonb_build_object(
    'total_tasks', total_tasks,
    'completed_tasks', completed_tasks,
    'daily_completed', daily_completed,
    'weekly_completed', weekly_completed,
    'social_completed', social_completed,
    'achievement_completed', achievement_completed,
    'total_cord_earned', total_cord_earned,
    'completion_percentage', CASE WHEN total_tasks > 0 THEN (completed_tasks::numeric / total_tasks::numeric * 100) ELSE 0 END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_task_stats(text) TO authenticated, anon;

-- Update the complete_user_task function to handle multipliers correctly
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
  actual_reward numeric;
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

  -- Calculate actual reward with user's multiplier
  actual_reward := task_record.reward * user_record.multiplier;

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

  -- Start transaction-like operations
  BEGIN
    -- Insert or update the task completion
    IF FOUND THEN
      -- Update existing record
      UPDATE user_tasks 
      SET 
        completed = true,
        progress = task_record.max_progress,
        claimed_at = now(),
        updated_at = now()
      WHERE user_id = p_user_id AND task_id = p_task_id AND completed = false;
      
      -- Check if update actually happened (row wasn't already completed)
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
      current_balance = current_balance + actual_reward,
      total_earned = total_earned + actual_reward,
      tasks_completed = tasks_completed + 1,
      updated_at = now()
    WHERE id = p_user_id
    RETURNING current_balance INTO new_balance;

    -- Verify the update succeeded
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Failed to update user balance';
    END IF;

    -- Return success
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Task completed successfully',
      'task_id', p_task_id,
      'task_title', task_record.title,
      'reward', actual_reward,
      'new_balance', new_balance,
      'user_id', p_user_id
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
        'error', 'Database operation failed',
        'details', SQLERRM
      );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION complete_user_task(text, text, numeric) TO authenticated, anon;

-- Add comment for documentation
COMMENT ON FUNCTION get_user_task_stats(text) IS 'Get comprehensive task statistics for a user';
COMMENT ON FUNCTION complete_user_task(text, text, numeric) IS 'Complete a task for a user with proper reward calculation including multipliers';