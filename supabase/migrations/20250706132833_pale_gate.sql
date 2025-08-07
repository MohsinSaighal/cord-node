/*
  # Fix Tasks System Issues

  1. Updates
    - Fix task completion function to properly handle social-media-master task
    - Add function to check task completion status
    - Ensure task progress is calculated correctly
    - Fix any issues with task completion tracking

  2. Security
    - Maintain existing RLS policies
    - Add proper error handling and logging
*/

-- Function to check if a task is completed
CREATE OR REPLACE FUNCTION check_task_completion(
  p_user_id text,
  p_task_id text
)
RETURNS jsonb AS $$
DECLARE
  task_record record;
  user_task_record record;
  social_tasks_completed integer;
BEGIN
  -- Check if task exists
  SELECT * FROM tasks WHERE id = p_task_id INTO task_record;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'exists', false,
      'error', 'Task not found'
    );
  END IF;

  -- Check if user has a record for this task
  SELECT * FROM user_tasks 
  WHERE user_id = p_user_id AND task_id = p_task_id
  INTO user_task_record;
  
  IF FOUND THEN
    -- For social-media-master, calculate actual progress
    IF p_task_id = 'social-media-master' THEN
      SELECT COUNT(*) FROM user_tasks ut
      JOIN tasks t ON ut.task_id = t.id
      WHERE ut.user_id = p_user_id 
      AND ut.completed = true 
      AND t.type = 'social'
      INTO social_tasks_completed;
      
      RETURN jsonb_build_object(
        'exists', true,
        'task_id', p_task_id,
        'task_type', task_record.type,
        'completed', user_task_record.completed,
        'progress', user_task_record.progress,
        'max_progress', task_record.max_progress,
        'claimed_at', user_task_record.claimed_at,
        'actual_social_tasks_completed', social_tasks_completed
      );
    ELSE
      -- For other tasks, return the stored data
      RETURN jsonb_build_object(
        'exists', true,
        'task_id', p_task_id,
        'task_type', task_record.type,
        'completed', user_task_record.completed,
        'progress', user_task_record.progress,
        'max_progress', task_record.max_progress,
        'claimed_at', user_task_record.claimed_at
      );
    END IF;
  ELSE
    -- Task record doesn't exist for this user
    RETURN jsonb_build_object(
      'exists', false,
      'task_id', p_task_id,
      'task_type', task_record.type,
      'completed', false,
      'progress', 0,
      'max_progress', task_record.max_progress
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all social tasks completion status
CREATE OR REPLACE FUNCTION get_social_tasks_completion(p_user_id text)
RETURNS jsonb AS $$
DECLARE
  social_tasks jsonb;
  social_tasks_completed integer;
  social_tasks_total integer;
BEGIN
  -- Get all social tasks with completion status
  SELECT jsonb_agg(
    jsonb_build_object(
      'task_id', t.id,
      'title', t.title,
      'completed', COALESCE(ut.completed, false),
      'claimed_at', ut.claimed_at
    )
  )
  FROM tasks t
  LEFT JOIN user_tasks ut ON t.id = ut.task_id AND ut.user_id = p_user_id
  WHERE t.type = 'social' AND t.is_active = true
  INTO social_tasks;
  
  -- Count completed social tasks
  SELECT COUNT(*) FROM user_tasks ut
  JOIN tasks t ON ut.task_id = t.id
  WHERE ut.user_id = p_user_id 
  AND ut.completed = true 
  AND t.type = 'social'
  AND t.is_active = true
  INTO social_tasks_completed;
  
  -- Count total social tasks
  SELECT COUNT(*) FROM tasks 
  WHERE type = 'social' AND is_active = true
  INTO social_tasks_total;
  
  RETURN jsonb_build_object(
    'social_tasks', COALESCE(social_tasks, '[]'::jsonb),
    'completed_count', social_tasks_completed,
    'total_count', social_tasks_total,
    'all_completed', social_tasks_completed = social_tasks_total AND social_tasks_total > 0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to fix social-media-master task progress
CREATE OR REPLACE FUNCTION fix_social_master_task_progress(p_user_id text)
RETURNS jsonb AS $$
DECLARE
  social_tasks_completed integer;
  social_master_task record;
  updated_progress integer;
BEGIN
  -- Count completed social tasks
  SELECT COUNT(*) FROM user_tasks ut
  JOIN tasks t ON ut.task_id = t.id
  WHERE ut.user_id = p_user_id 
  AND ut.completed = true 
  AND t.type = 'social'
  AND t.is_active = true
  INTO social_tasks_completed;
  
  -- Get social-media-master task
  SELECT * FROM user_tasks
  WHERE user_id = p_user_id AND task_id = 'social-media-master'
  INTO social_master_task;
  
  IF FOUND THEN
    -- Update progress
    UPDATE user_tasks
    SET 
      progress = social_tasks_completed,
      updated_at = now()
    WHERE user_id = p_user_id AND task_id = 'social-media-master'
    RETURNING progress INTO updated_progress;
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Social media master task progress updated',
      'old_progress', social_master_task.progress,
      'new_progress', updated_progress,
      'completed_social_tasks', social_tasks_completed
    );
  ELSE
    -- Create new record
    INSERT INTO user_tasks (user_id, task_id, completed, progress)
    VALUES (p_user_id, 'social-media-master', false, social_tasks_completed)
    RETURNING progress INTO updated_progress;
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Social media master task created',
      'progress', updated_progress,
      'completed_social_tasks', social_tasks_completed
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user can complete a task
CREATE OR REPLACE FUNCTION can_complete_task(
  p_user_id text,
  p_task_id text
)
RETURNS jsonb AS $$
DECLARE
  task_record record;
  user_record record;
  user_task_record record;
  social_tasks_completed integer;
  mining_time integer;
  is_new_day boolean;
BEGIN
  -- Get task data
  SELECT * FROM tasks WHERE id = p_task_id INTO task_record;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'can_complete', false,
      'reason', 'Task not found'
    );
  END IF;
  
  -- Get user data
  SELECT * FROM users WHERE id = p_user_id INTO user_record;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'can_complete', false,
      'reason', 'User not found'
    );
  END IF;
  
  -- Check if task is already completed
  SELECT * FROM user_tasks 
  WHERE user_id = p_user_id AND task_id = p_task_id
  INTO user_task_record;
  
  IF FOUND AND user_task_record.completed THEN
    RETURN jsonb_build_object(
      'can_complete', false,
      'reason', 'Task already completed',
      'completed_at', user_task_record.claimed_at
    );
  END IF;
  
  -- Task-specific validation
  CASE task_record.id
    WHEN 'daily-checkin' THEN
      -- Check if it's a new day
      is_new_day := (
        user_record.last_login_time < (now() - interval '1 day')::timestamptz OR
        NOT user_record.daily_checkin_claimed
      );
      
      IF NOT is_new_day THEN
        RETURN jsonb_build_object(
          'can_complete', false,
          'reason', 'Daily check-in already claimed today'
        );
      END IF;
      
    WHEN 'mine-1-hour' THEN
      -- Check if user has mined for 1 hour
      IF NOT user_record.is_node_active THEN
        RETURN jsonb_build_object(
          'can_complete', false,
          'reason', 'Node is not active'
        );
      END IF;
      
      IF user_record.node_start_time IS NULL THEN
        RETURN jsonb_build_object(
          'can_complete', false,
          'reason', 'Node start time is not recorded'
        );
      END IF;
      
      mining_time := EXTRACT(EPOCH FROM (now() - user_record.node_start_time))::integer;
      
      IF mining_time < task_record.max_progress THEN
        RETURN jsonb_build_object(
          'can_complete', false,
          'reason', 'Mining time requirement not met',
          'current_time', mining_time,
          'required_time', task_record.max_progress
        );
      END IF;
      
    WHEN 'weekly-mining' THEN
      -- Check if user has earned enough this week
      IF user_record.weekly_earnings < task_record.max_progress THEN
        RETURN jsonb_build_object(
          'can_complete', false,
          'reason', 'Weekly earnings requirement not met',
          'current_earnings', user_record.weekly_earnings,
          'required_earnings', task_record.max_progress
        );
      END IF;
      
    WHEN 'invite-friends' THEN
      -- Check if user has enough referrals
      IF user_record.total_referrals < task_record.max_progress THEN
        RETURN jsonb_build_object(
          'can_complete', false,
          'reason', 'Referral requirement not met',
          'current_referrals', user_record.total_referrals,
          'required_referrals', task_record.max_progress
        );
      END IF;
      
    WHEN 'early-adopter' THEN
      -- Check if account is old enough
      IF user_record.account_age < 5 THEN
        RETURN jsonb_build_object(
          'can_complete', false,
          'reason', 'Account age requirement not met (need 5+ years)',
          'current_age', user_record.account_age
        );
      END IF;
      
    WHEN 'social-media-master' THEN
      -- Check if all social tasks are completed
      SELECT COUNT(*) FROM user_tasks ut
      JOIN tasks t ON ut.task_id = t.id
      WHERE ut.user_id = p_user_id 
      AND ut.completed = true 
      AND t.type = 'social'
      AND t.is_active = true
      INTO social_tasks_completed;
      
      IF social_tasks_completed < task_record.max_progress THEN
        RETURN jsonb_build_object(
          'can_complete', false,
          'reason', 'Not all social tasks completed',
          'completed_tasks', social_tasks_completed,
          'required_tasks', task_record.max_progress
        );
      END IF;
      
    ELSE
      -- For social tasks, they can always be completed if not already done
      NULL;
  END CASE;
  
  -- If we get here, the task can be completed
  RETURN jsonb_build_object(
    'can_complete', true,
    'task_id', task_record.id,
    'task_type', task_record.type,
    'reward', task_record.reward * user_record.multiplier
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_task_completion(text, text) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION get_social_tasks_completion(text) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION fix_social_master_task_progress(text) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION can_complete_task(text, text) TO authenticated, anon, public;

-- Add comments for documentation
COMMENT ON FUNCTION check_task_completion(text, text) IS 'Check if a task is completed by a user';
COMMENT ON FUNCTION get_social_tasks_completion(text) IS 'Get completion status of all social tasks for a user';
COMMENT ON FUNCTION fix_social_master_task_progress(text) IS 'Fix the progress of the social-media-master task based on completed social tasks';
COMMENT ON FUNCTION can_complete_task(text, text) IS 'Check if a user can complete a specific task based on requirements';

-- Fix any existing social-media-master task progress issues
DO $$
DECLARE
  user_record record;
BEGIN
  FOR user_record IN SELECT id FROM users LOOP
    PERFORM fix_social_master_task_progress(user_record.id);
  END LOOP;
END $$;