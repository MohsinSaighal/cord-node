/*
  # Fix Tasks System - Complete Overhaul

  1. Fix the complete_user_task function with better error handling
  2. Ensure proper task validation and completion logic
  3. Add debugging and logging capabilities
  4. Fix any RLS policy issues that might prevent task completion
*/

-- Drop existing function to recreate with fixes
DROP FUNCTION IF EXISTS complete_user_task(text, text, numeric);

-- Create a robust task completion function
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
BEGIN
  -- Comprehensive input validation
  IF p_user_id IS NULL OR trim(p_user_id) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid user ID provided');
  END IF;
  
  IF p_task_id IS NULL OR trim(p_task_id) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid task ID provided');
  END IF;
  
  IF p_reward_amount IS NULL OR p_reward_amount < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid reward amount provided');
  END IF;

  -- Get user data with explicit locking to prevent race conditions
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

  -- Check for existing completion with explicit locking
  SELECT id, user_id, task_id, completed, claimed_at, progress
  FROM user_tasks 
  WHERE user_id = p_user_id AND task_id = p_task_id
  FOR UPDATE
  INTO existing_completion;
  
  -- If task is already completed, return error
  IF FOUND AND existing_completion.completed THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Task already completed',
      'completed_at', existing_completion.claimed_at,
      'existing_progress', existing_completion.progress
    );
  END IF;

  -- Log the attempt for debugging
  RAISE LOG 'Attempting to complete task % for user % (%) with reward %', 
    p_task_id, p_user_id, user_record.username, final_reward;

  -- Perform the completion in a safe transaction block
  BEGIN
    -- Insert or update task completion
    IF FOUND THEN
      -- Update existing incomplete record
      UPDATE user_tasks 
      SET 
        completed = true,
        progress = task_record.max_progress,
        claimed_at = now(),
        updated_at = now()
      WHERE id = existing_completion.id AND completed = false
      RETURNING id INTO completion_id;
      
      -- Verify the update worked
      IF completion_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Failed to update task completion - task may have been completed concurrently');
      END IF;
    ELSE
      -- Insert new completion record
      INSERT INTO user_tasks (user_id, task_id, completed, progress, claimed_at)
      VALUES (p_user_id, p_task_id, true, task_record.max_progress, now())
      RETURNING id INTO completion_id;
      
      IF completion_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Failed to create task completion record');
      END IF;
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

    -- Verify user update succeeded
    IF new_balance IS NULL THEN
      RAISE EXCEPTION 'Failed to update user balance and statistics';
    END IF;

    -- Log successful completion
    RAISE LOG 'Successfully completed task % for user % (%). Reward: % CORD, New balance: %', 
      p_task_id, p_user_id, user_record.username, final_reward, new_balance;

    -- Return comprehensive success response
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
      'completed_at', now()
    );

  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'Task completion already exists (unique constraint violation)',
        'hint', 'This task may have been completed in another session'
      );
    WHEN OTHERS THEN
      -- Comprehensive error logging
      RAISE LOG 'Task completion failed for user % task %: % (SQLSTATE: %, Detail: %)', 
        p_user_id, p_task_id, SQLERRM, SQLSTATE, COALESCE(PG_EXCEPTION_DETAIL, 'No additional details');
      
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'Database operation failed: ' || SQLERRM,
        'sqlstate', SQLSTATE,
        'detail', COALESCE(PG_EXCEPTION_DETAIL, 'No additional details available')
      );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to validate task completion eligibility
CREATE OR REPLACE FUNCTION can_complete_task(
  p_user_id text,
  p_task_id text
)
RETURNS jsonb AS $$
DECLARE
  task_record record;
  user_record record;
  existing_completion record;
  user_progress integer;
BEGIN
  -- Get task information
  SELECT id, title, type, max_progress, is_active
  FROM tasks 
  WHERE id = p_task_id 
  INTO task_record;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('can_complete', false, 'reason', 'Task not found');
  END IF;
  
  IF NOT task_record.is_active THEN
    RETURN jsonb_build_object('can_complete', false, 'reason', 'Task is not active');
  END IF;

  -- Get user information
  SELECT id, account_age, weekly_earnings, total_referrals, is_node_active, node_start_time, daily_checkin_claimed, last_login_time
  FROM users 
  WHERE id = p_user_id 
  INTO user_record;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('can_complete', false, 'reason', 'User not found');
  END IF;

  -- Check if already completed
  SELECT completed FROM user_tasks 
  WHERE user_id = p_user_id AND task_id = p_task_id
  INTO existing_completion;
  
  IF FOUND AND existing_completion.completed THEN
    RETURN jsonb_build_object('can_complete', false, 'reason', 'Task already completed');
  END IF;

  -- Task-specific validation logic
  CASE task_record.id
    WHEN 'daily-checkin' THEN
      -- Check if daily check-in is available
      IF user_record.daily_checkin_claimed AND 
         EXTRACT(days FROM now() - to_timestamp(user_record.last_login_time / 1000)) < 1 THEN
        RETURN jsonb_build_object('can_complete', false, 'reason', 'Daily check-in already claimed today');
      END IF;
      
    WHEN 'mine-1-hour' THEN
      -- Check mining time
      IF NOT user_record.is_node_active OR user_record.node_start_time IS NULL THEN
        RETURN jsonb_build_object('can_complete', false, 'reason', 'Node is not active');
      END IF;
      
      user_progress := EXTRACT(epoch FROM now() - to_timestamp(user_record.node_start_time / 1000))::integer;
      IF user_progress < task_record.max_progress THEN
        RETURN jsonb_build_object(
          'can_complete', false, 
          'reason', 'Mining time requirement not met',
          'current_progress', user_progress,
          'required_progress', task_record.max_progress
        );
      END IF;
      
    WHEN 'weekly-mining' THEN
      -- Check weekly earnings
      IF user_record.weekly_earnings < task_record.max_progress THEN
        RETURN jsonb_build_object(
          'can_complete', false, 
          'reason', 'Weekly earnings requirement not met',
          'current_progress', user_record.weekly_earnings,
          'required_progress', task_record.max_progress
        );
      END IF;
      
    WHEN 'invite-friends' THEN
      -- Check referral count
      IF user_record.total_referrals < task_record.max_progress THEN
        RETURN jsonb_build_object(
          'can_complete', false, 
          'reason', 'Referral requirement not met',
          'current_progress', user_record.total_referrals,
          'required_progress', task_record.max_progress
        );
      END IF;
      
    WHEN 'early-adopter' THEN
      -- Check account age
      IF user_record.account_age < 5 THEN
        RETURN jsonb_build_object(
          'can_complete', false, 
          'reason', 'Account age requirement not met (need 5+ years)',
          'current_age', user_record.account_age
        );
      END IF;
      
    WHEN 'social-media-master' THEN
      -- Check completed social tasks
      SELECT COUNT(*) FROM user_tasks ut
      JOIN tasks t ON ut.task_id = t.id
      WHERE ut.user_id = p_user_id AND ut.completed = true AND t.type = 'social' AND t.is_active = true
      INTO user_progress;
      
      IF user_progress < task_record.max_progress THEN
        RETURN jsonb_build_object(
          'can_complete', false, 
          'reason', 'Social media tasks requirement not met',
          'current_progress', user_progress,
          'required_progress', task_record.max_progress
        );
      END IF;
      
    ELSE
      -- For social tasks and other tasks, they can generally be completed
      NULL;
  END CASE;

  -- If we get here, the task can be completed
  RETURN jsonb_build_object(
    'can_complete', true, 
    'task_id', p_task_id,
    'task_title', task_record.title,
    'task_type', task_record.type
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get detailed task progress for a user
CREATE OR REPLACE FUNCTION get_user_task_progress(p_user_id text)
RETURNS jsonb AS $$
DECLARE
  task_progress jsonb;
  user_record record;
BEGIN
  -- Get user data
  SELECT * FROM users WHERE id = p_user_id INTO user_record;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Build task progress object
  SELECT jsonb_agg(
    jsonb_build_object(
      'task_id', t.id,
      'title', t.title,
      'description', t.description,
      'type', t.type,
      'reward', t.reward * user_record.multiplier,
      'max_progress', t.max_progress,
      'completed', COALESCE(ut.completed, false),
      'progress', COALESCE(ut.progress, 0),
      'claimed_at', ut.claimed_at,
      'can_complete', (can_complete_task(p_user_id, t.id) ->> 'can_complete')::boolean,
      'completion_reason', can_complete_task(p_user_id, t.id) ->> 'reason'
    )
  )
  FROM tasks t
  LEFT JOIN user_tasks ut ON t.id = ut.task_id AND ut.user_id = p_user_id
  WHERE t.is_active = true
  ORDER BY t.type, t.id
  INTO task_progress;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'tasks', task_progress
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION complete_user_task(text, text, numeric) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION can_complete_task(text, text) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION get_user_task_progress(text) TO authenticated, anon, public;

-- Add comprehensive indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_tasks_user_task_status ON user_tasks(user_id, task_id, completed);
CREATE INDEX IF NOT EXISTS idx_user_tasks_claimed_at ON user_tasks(claimed_at) WHERE claimed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_active_type ON tasks(is_active, type) WHERE is_active = true;

-- Add comments for documentation
COMMENT ON FUNCTION complete_user_task(text, text, numeric) IS 'Complete a task for a user with comprehensive validation, error handling, and logging';
COMMENT ON FUNCTION can_complete_task(text, text) IS 'Check if a user can complete a specific task based on requirements';
COMMENT ON FUNCTION get_user_task_progress(text) IS 'Get detailed task progress information for a user including completion eligibility';