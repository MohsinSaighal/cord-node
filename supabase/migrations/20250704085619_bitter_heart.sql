/*
  # Fix Social Tasks to be One-Time Only

  1. Add database constraints to prevent duplicate task completions
  2. Create function to safely complete tasks with atomic operations
  3. Add unique constraint on user_tasks to prevent duplicates
  4. Update RLS policies to be more restrictive

  This ensures social tasks can only be completed once per user at the database level.
*/

-- Create function to safely complete a task (atomic operation)
CREATE OR REPLACE FUNCTION complete_user_task(
  p_user_id text,
  p_task_id text,
  p_reward_amount numeric
)
RETURNS jsonb AS $$
DECLARE
  task_exists boolean;
  user_exists boolean;
  already_completed boolean;
  updated_user record;
BEGIN
  -- Check if user exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = p_user_id) INTO user_exists;
  IF NOT user_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Check if task exists and is active
  SELECT EXISTS(SELECT 1 FROM tasks WHERE id = p_task_id AND is_active = true) INTO task_exists;
  IF NOT task_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found or inactive');
  END IF;

  -- Check if task is already completed
  SELECT EXISTS(
    SELECT 1 FROM user_tasks 
    WHERE user_id = p_user_id AND task_id = p_task_id AND completed = true
  ) INTO already_completed;
  
  IF already_completed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task already completed');
  END IF;

  -- Insert or update user_tasks record (this will fail if duplicate due to unique constraint)
  INSERT INTO user_tasks (user_id, task_id, completed, progress, claimed_at)
  VALUES (p_user_id, p_task_id, true, 1, now())
  ON CONFLICT (user_id, task_id) 
  DO UPDATE SET 
    completed = true,
    progress = 1,
    claimed_at = now(),
    updated_at = now()
  WHERE user_tasks.completed = false; -- Only update if not already completed

  -- Check if the update actually happened (row was not already completed)
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task already completed');
  END IF;

  -- Update user balance and stats
  UPDATE users 
  SET 
    current_balance = current_balance + p_reward_amount,
    total_earned = total_earned + p_reward_amount,
    tasks_completed = tasks_completed + 1,
    updated_at = now()
  WHERE id = p_user_id
  RETURNING * INTO updated_user;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Task completed successfully',
    'reward', p_reward_amount,
    'new_balance', updated_user.current_balance
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task already completed');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Database error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION complete_user_task(text, text, numeric) TO authenticated, anon;

-- Add additional constraint to ensure task completion uniqueness
DO $$
BEGIN
  -- Check if constraint doesn't exist before adding
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_tasks_unique_completion'
  ) THEN
    ALTER TABLE user_tasks 
    ADD CONSTRAINT user_tasks_unique_completion 
    UNIQUE (user_id, task_id);
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_tasks_completion_status 
ON user_tasks(user_id, task_id, completed);

-- Update RLS policies to be more restrictive for task completion
DROP POLICY IF EXISTS "Users can insert own tasks" ON user_tasks;

CREATE POLICY "Users can insert own tasks"
  ON user_tasks
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    user_id = COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'discord_id'),
      auth.uid()::text,
      user_id
    ) AND
    NOT EXISTS (
      SELECT 1 FROM user_tasks ut 
      WHERE ut.user_id = user_tasks.user_id 
      AND ut.task_id = user_tasks.task_id 
      AND ut.completed = true
    )
  );