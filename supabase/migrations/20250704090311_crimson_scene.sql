/*
  # Fix Task Completion Database Function

  1. Create a more robust task completion function
  2. Add better error handling and logging
  3. Ensure atomic operations for task completion
  4. Add proper validation and constraints
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS complete_user_task(text, text, numeric);

-- Create a bulletproof task completion function
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
      current_balance = current_balance + p_reward_amount,
      total_earned = total_earned + p_reward_amount,
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
      'reward', p_reward_amount,
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

-- Ensure proper constraints exist
DO $$
BEGIN
  -- Ensure unique constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_tasks_user_id_task_id_key'
    AND table_name = 'user_tasks'
  ) THEN
    ALTER TABLE user_tasks ADD CONSTRAINT user_tasks_user_id_task_id_key UNIQUE (user_id, task_id);
  END IF;
END $$;

-- Create function to check task completion status
CREATE OR REPLACE FUNCTION check_task_completion(p_user_id text, p_task_id text)
RETURNS jsonb AS $$
DECLARE
  completion_record record;
BEGIN
  SELECT completed, progress, claimed_at
  FROM user_tasks
  WHERE user_id = p_user_id AND task_id = p_task_id
  INTO completion_record;
  
  IF FOUND THEN
    RETURN jsonb_build_object(
      'exists', true,
      'completed', completion_record.completed,
      'progress', completion_record.progress,
      'claimed_at', completion_record.claimed_at
    );
  ELSE
    RETURN jsonb_build_object(
      'exists', false,
      'completed', false,
      'progress', 0,
      'claimed_at', null
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_task_completion(text, text) TO authenticated, anon;