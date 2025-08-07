/*
  # Fix Tasks System Issues

  1. Updates
    - Fix the social-media-master task progress calculation
    - Add better error handling for task completion
    - Ensure task progress is calculated correctly
    - Fix any issues with task completion validation

  2. Security
    - Maintain existing RLS policies
    - Add proper error handling and logging
*/

-- Function to fix social-media-master task progress for all users
CREATE OR REPLACE FUNCTION fix_all_social_master_tasks()
RETURNS jsonb AS $$
DECLARE
  user_record record;
  fixed_count integer := 0;
  users_processed integer := 0;
  social_tasks_count integer;
BEGIN
  -- Get count of social tasks
  SELECT COUNT(*) FROM tasks WHERE type = 'social' AND is_active = true INTO social_tasks_count;
  
  -- Process each user
  FOR user_record IN SELECT id FROM users LOOP
    BEGIN
      -- Fix social-media-master task for this user
      PERFORM fix_social_master_task_progress(user_record.id);
      fixed_count := fixed_count + 1;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE LOG 'Error fixing social master task for user %: %', user_record.id, SQLERRM;
        -- Continue with next user
    END;
    
    users_processed := users_processed + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'users_processed', users_processed,
    'users_fixed', fixed_count,
    'social_tasks_count', social_tasks_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to debug task completion issues
CREATE OR REPLACE FUNCTION debug_task_completion(
  p_user_id text,
  p_task_id text
)
RETURNS jsonb AS $$
DECLARE
  task_record record;
  user_record record;
  user_task_record record;
  social_tasks_completed integer;
  can_complete_result jsonb;
BEGIN
  -- Get task data
  SELECT * FROM tasks WHERE id = p_task_id INTO task_record;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Task not found',
      'task_id', p_task_id
    );
  END IF;
  
  -- Get user data
  SELECT * FROM users WHERE id = p_user_id INTO user_record;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found',
      'user_id', p_user_id
    );
  END IF;
  
  -- Get user task record
  SELECT * FROM user_tasks 
  WHERE user_id = p_user_id AND task_id = p_task_id
  INTO user_task_record;
  
  -- For social-media-master, get completed social tasks
  IF p_task_id = 'social-media-master' THEN
    SELECT COUNT(*) FROM user_tasks ut
    JOIN tasks t ON ut.task_id = t.id
    WHERE ut.user_id = p_user_id 
    AND ut.completed = true 
    AND t.type = 'social'
    AND t.is_active = true
    INTO social_tasks_completed;
  END IF;
  
  -- Check if task can be completed
  SELECT can_complete_task(p_user_id, p_task_id) INTO can_complete_result;
  
  -- Return comprehensive debug info
  RETURN jsonb_build_object(
    'success', true,
    'task_id', p_task_id,
    'task_info', jsonb_build_object(
      'id', task_record.id,
      'title', task_record.title,
      'type', task_record.type,
      'reward', task_record.reward,
      'max_progress', task_record.max_progress,
      'is_active', task_record.is_active
    ),
    'user_info', jsonb_build_object(
      'id', user_record.id,
      'username', user_record.username,
      'account_age', user_record.account_age,
      'multiplier', user_record.multiplier,
      'total_referrals', user_record.total_referrals,
      'is_node_active', user_record.is_node_active,
      'node_start_time', user_record.node_start_time,
      'daily_checkin_claimed', user_record.daily_checkin_claimed,
      'last_login_time', user_record.last_login_time,
      'weekly_earnings', user_record.weekly_earnings
    ),
    'task_completion', CASE 
      WHEN user_task_record IS NULL THEN jsonb_build_object(
        'exists', false,
        'completed', false,
        'progress', 0
      )
      ELSE jsonb_build_object(
        'exists', true,
        'completed', user_task_record.completed,
        'progress', user_task_record.progress,
        'claimed_at', user_task_record.claimed_at,
        'created_at', user_task_record.created_at,
        'updated_at', user_task_record.updated_at
      )
    END,
    'social_tasks_completed', CASE 
      WHEN p_task_id = 'social-media-master' THEN social_tasks_completed
      ELSE NULL
    END,
    'can_complete', can_complete_result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset a specific task for a user (for debugging)
CREATE OR REPLACE FUNCTION reset_user_task(
  p_user_id text,
  p_task_id text
)
RETURNS jsonb AS $$
DECLARE
  task_exists boolean;
  task_type text;
BEGIN
  -- Check if task exists
  SELECT EXISTS(SELECT 1 FROM tasks WHERE id = p_task_id), type
  FROM tasks WHERE id = p_task_id
  INTO task_exists, task_type;
  
  IF NOT task_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found');
  END IF;
  
  -- Delete the user_task record
  DELETE FROM user_tasks 
  WHERE user_id = p_user_id AND task_id = p_task_id;
  
  -- For daily check-in, also reset the flag in users table
  IF p_task_id = 'daily-checkin' THEN
    UPDATE users 
    SET daily_checkin_claimed = false
    WHERE id = p_user_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Task reset successfully',
    'user_id', p_user_id,
    'task_id', p_task_id,
    'task_type', task_type
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all tasks with completion status for a user
CREATE OR REPLACE FUNCTION get_all_user_tasks(p_user_id text)
RETURNS jsonb AS $$
DECLARE
  user_record record;
  tasks_data jsonb;
BEGIN
  -- Check if user exists
  SELECT * FROM users WHERE id = p_user_id INTO user_record;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Get all tasks with completion status
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'title', t.title,
      'description', t.description,
      'type', t.type,
      'reward', t.reward * user_record.multiplier,
      'max_progress', t.max_progress,
      'completed', COALESCE(ut.completed, false),
      'progress', COALESCE(ut.progress, 0),
      'claimed_at', ut.claimed_at,
      'social_url', t.social_url,
      'can_complete', (can_complete_task(p_user_id, t.id) ->> 'can_complete')::boolean
    )
  )
  FROM tasks t
  LEFT JOIN user_tasks ut ON t.id = ut.task_id AND ut.user_id = p_user_id
  WHERE t.is_active = true
  ORDER BY t.type, t.id
  INTO tasks_data;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'username', user_record.username,
    'multiplier', user_record.multiplier,
    'tasks', COALESCE(tasks_data, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION fix_all_social_master_tasks() TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION debug_task_completion(text, text) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION reset_user_task(text, text) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION get_all_user_tasks(text) TO authenticated, anon, public;

-- Add comments for documentation
COMMENT ON FUNCTION fix_all_social_master_tasks() IS 'Fix social-media-master task progress for all users';
COMMENT ON FUNCTION debug_task_completion(text, text) IS 'Get comprehensive debug information for task completion issues';
COMMENT ON FUNCTION reset_user_task(text, text) IS 'Reset a specific task for a user (for debugging)';
COMMENT ON FUNCTION get_all_user_tasks(text) IS 'Get all tasks with completion status for a user';

-- Run the fix for all users
SELECT fix_all_social_master_tasks();