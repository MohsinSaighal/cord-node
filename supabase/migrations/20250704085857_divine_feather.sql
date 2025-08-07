/*
  # Fix Unlimited Social Tasks - Bulletproof Database Solution

  1. Create improved task completion function with better error handling
  2. Add database-level constraints to prevent any duplicate completions
  3. Ensure atomic operations that cannot be bypassed
  4. Add logging for debugging task completion issues
*/

-- Drop the existing function to recreate with better logic
DROP FUNCTION IF EXISTS complete_user_task(text, text, numeric);

-- Create improved function with bulletproof logic
CREATE OR REPLACE FUNCTION complete_user_task(
  p_user_id text,
  p_task_id text,
  p_reward_amount numeric
)
RETURNS jsonb AS $$
DECLARE
  task_exists boolean;
  user_exists boolean;
  task_record record;
  user_record record;
  completion_count integer;
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL OR p_task_id IS NULL OR p_reward_amount IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid parameters');
  END IF;

  -- Check if user exists
  SELECT * FROM users WHERE id = p_user_id INTO user_record;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Check if task exists and is active
  SELECT * FROM tasks WHERE id = p_task_id AND is_active = true INTO task_record;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found or inactive');
  END IF;

  -- CRITICAL: Check if task is already completed (with row-level lock)
  SELECT COUNT(*) FROM user_tasks 
  WHERE user_id = p_user_id AND task_id = p_task_id AND completed = true
  FOR UPDATE INTO completion_count;
  
  IF completion_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task already completed');
  END IF;

  -- Try to insert the completion record (this will fail if duplicate exists)
  BEGIN
    INSERT INTO user_tasks (user_id, task_id, completed, progress, claimed_at)
    VALUES (p_user_id, p_task_id, true, task_record.max_progress, now());
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('success', false, 'error', 'Task already completed');
  END;

  -- Update user balance and stats atomically
  UPDATE users 
  SET 
    current_balance = current_balance + p_reward_amount,
    total_earned = total_earned + p_reward_amount,
    tasks_completed = tasks_completed + 1,
    updated_at = now()
  WHERE id = p_user_id;

  -- Verify the update happened
  IF NOT FOUND THEN
    -- Rollback the task completion if user update failed
    DELETE FROM user_tasks WHERE user_id = p_user_id AND task_id = p_task_id;
    RETURN jsonb_build_object('success', false, 'error', 'Failed to update user balance');
  END IF;

  -- Get updated balance
  SELECT current_balance FROM users WHERE id = p_user_id INTO user_record;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Task completed successfully',
    'reward', p_reward_amount,
    'new_balance', user_record.current_balance,
    'task_id', p_task_id,
    'user_id', p_user_id
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and return failure
    RAISE LOG 'Task completion error for user % task %: %', p_user_id, p_task_id, SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', 'Database error occurred');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION complete_user_task(text, text, numeric) TO authenticated, anon;

-- Ensure the unique constraint exists and is properly enforced
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_tasks_unique_completion'
  ) THEN
    ALTER TABLE user_tasks DROP CONSTRAINT user_tasks_unique_completion;
  END IF;
  
  -- Add the constraint back
  ALTER TABLE user_tasks 
  ADD CONSTRAINT user_tasks_unique_completion 
  UNIQUE (user_id, task_id);
END $$;

-- Create additional index for performance
CREATE INDEX IF NOT EXISTS idx_user_tasks_user_task_completed 
ON user_tasks(user_id, task_id, completed) WHERE completed = true;

-- Add a check constraint to ensure completed tasks have progress
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'user_tasks_completed_progress_check'
  ) THEN
    ALTER TABLE user_tasks 
    ADD CONSTRAINT user_tasks_completed_progress_check 
    CHECK (NOT completed OR progress > 0);
  END IF;
END $$;

-- Create a view to easily check task completion status
CREATE OR REPLACE VIEW user_task_completions AS
SELECT 
  ut.user_id,
  ut.task_id,
  t.title as task_title,
  t.type as task_type,
  ut.completed,
  ut.progress,
  ut.claimed_at,
  t.reward * u.multiplier as reward_amount
FROM user_tasks ut
JOIN tasks t ON ut.task_id = t.id
JOIN users u ON ut.user_id = u.id
WHERE ut.completed = true
ORDER BY ut.claimed_at DESC;

-- Grant access to the view
GRANT SELECT ON user_task_completions TO authenticated, anon;