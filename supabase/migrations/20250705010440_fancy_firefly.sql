/*
  # Fix Epoch System Database Functions

  1. Drop and recreate functions with correct return types
  2. Ensure Alpha epoch exists and is active
  3. Fix function permissions and error handling
*/

-- Drop existing functions to avoid return type conflicts
DROP FUNCTION IF EXISTS get_current_epoch();
DROP FUNCTION IF EXISTS transition_to_next_epoch();
DROP FUNCTION IF EXISTS join_user_to_current_epoch(text);
DROP FUNCTION IF EXISTS get_user_epoch_stats(text);

-- Create the get_current_epoch function with correct return type
CREATE OR REPLACE FUNCTION get_current_epoch()
RETURNS jsonb AS $$
DECLARE
  current_epoch record;
  days_remaining integer;
  progress_percentage numeric;
BEGIN
  -- Get the currently active epoch
  SELECT * FROM epochs 
  WHERE is_active = true 
  AND now() BETWEEN start_date AND end_date
  ORDER BY epoch_number DESC
  LIMIT 1
  INTO current_epoch;

  IF FOUND THEN
    -- Calculate days remaining
    days_remaining := GREATEST(0, EXTRACT(days FROM current_epoch.end_date - now())::integer);
    
    -- Calculate progress percentage
    progress_percentage := LEAST(100, GREATEST(0, 
      EXTRACT(epoch FROM now() - current_epoch.start_date) / 
      EXTRACT(epoch FROM current_epoch.end_date - current_epoch.start_date) * 100
    ))::numeric;

    RETURN jsonb_build_object(
      'success', true,
      'id', current_epoch.id,
      'epoch_number', current_epoch.epoch_number,
      'name', current_epoch.name,
      'description', current_epoch.description,
      'start_date', current_epoch.start_date,
      'end_date', current_epoch.end_date,
      'days_remaining', days_remaining,
      'progress_percentage', progress_percentage,
      'is_active', current_epoch.is_active,
      'rewards_multiplier', current_epoch.rewards_multiplier
    );
  ELSE
    -- No active epoch found, check if we need to create one
    SELECT * FROM epochs 
    ORDER BY epoch_number DESC 
    LIMIT 1
    INTO current_epoch;

    IF FOUND AND now() > current_epoch.end_date THEN
      -- Current epoch has ended, create next one
      PERFORM transition_to_next_epoch();
      
      -- Try to get the new current epoch
      SELECT * FROM epochs 
      WHERE is_active = true 
      ORDER BY epoch_number DESC 
      LIMIT 1
      INTO current_epoch;

      IF FOUND THEN
        days_remaining := GREATEST(0, EXTRACT(days FROM current_epoch.end_date - now())::integer);
        progress_percentage := LEAST(100, GREATEST(0, 
          EXTRACT(epoch FROM now() - current_epoch.start_date) / 
          EXTRACT(epoch FROM current_epoch.end_date - current_epoch.start_date) * 100
        ))::numeric;

        RETURN jsonb_build_object(
          'success', true,
          'id', current_epoch.id,
          'epoch_number', current_epoch.epoch_number,
          'name', current_epoch.name,
          'description', current_epoch.description,
          'start_date', current_epoch.start_date,
          'end_date', current_epoch.end_date,
          'days_remaining', days_remaining,
          'progress_percentage', progress_percentage,
          'is_active', current_epoch.is_active,
          'rewards_multiplier', current_epoch.rewards_multiplier
        );
      END IF;
    END IF;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'No active epoch found'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the transition function
CREATE OR REPLACE FUNCTION transition_to_next_epoch()
RETURNS jsonb AS $$
DECLARE
  current_epoch record;
  next_epoch_number integer;
  next_epoch_id uuid;
  affected_users integer;
BEGIN
  -- Get current active epoch
  SELECT * FROM epochs 
  WHERE is_active = true 
  ORDER BY epoch_number DESC 
  LIMIT 1
  INTO current_epoch;

  -- If no active epoch, start with Alpha (epoch 0)
  IF NOT FOUND THEN
    -- Check if Alpha epoch exists
    SELECT * FROM epochs WHERE epoch_number = 0 INTO current_epoch;
    
    IF NOT FOUND THEN
      -- Create Alpha epoch
      INSERT INTO epochs (
        epoch_number, 
        name, 
        description, 
        start_date, 
        end_date, 
        is_active,
        rewards_multiplier
      ) VALUES (
        0,
        'Alpha Stage',
        'Welcome to the Alpha Stage! This is where it all begins. Test the waters and earn your first rewards.',
        now(),
        now() + interval '15 days',
        true,
        1.0
      ) RETURNING id INTO next_epoch_id;

      RETURN jsonb_build_object(
        'success', true,
        'message', 'Created Alpha epoch',
        'new_epoch', 0,
        'epoch_id', next_epoch_id
      );
    ELSE
      -- Activate existing Alpha epoch
      UPDATE epochs 
      SET is_active = true, start_date = now(), end_date = now() + interval '15 days', updated_at = now()
      WHERE epoch_number = 0
      RETURNING id INTO next_epoch_id;

      RETURN jsonb_build_object(
        'success', true,
        'message', 'Activated Alpha epoch',
        'new_epoch', 0,
        'epoch_id', next_epoch_id
      );
    END IF;
  END IF;

  -- Deactivate current epoch if it has ended
  IF now() > current_epoch.end_date THEN
    UPDATE epochs 
    SET is_active = false, updated_at = now()
    WHERE id = current_epoch.id;
    
    -- Calculate next epoch number
    next_epoch_number := current_epoch.epoch_number + 1;
    
    -- Check if next epoch already exists
    SELECT id FROM epochs WHERE epoch_number = next_epoch_number INTO next_epoch_id;
    
    IF NOT FOUND THEN
      -- Create next epoch (15 days from now)
      INSERT INTO epochs (
        epoch_number, 
        name, 
        description, 
        start_date, 
        end_date, 
        is_active,
        rewards_multiplier
      ) VALUES (
        next_epoch_number,
        CASE 
          WHEN next_epoch_number = 1 THEN 'Epoch 1'
          WHEN next_epoch_number = 2 THEN 'Epoch 2'
          WHEN next_epoch_number = 3 THEN 'Epoch 3'
          ELSE 'Epoch ' || next_epoch_number
        END,
        'Epoch ' || next_epoch_number || ' - New challenges and rewards await!',
        now(),
        now() + interval '15 days',
        true,
        1.0 + (next_epoch_number * 0.1) -- Increase rewards by 10% each epoch
      ) RETURNING id INTO next_epoch_id;
    ELSE
      -- Activate existing next epoch
      UPDATE epochs 
      SET is_active = true, start_date = now(), end_date = now() + interval '15 days', updated_at = now()
      WHERE id = next_epoch_id;
    END IF;

    -- Update all users to new epoch
    UPDATE users 
    SET 
      current_epoch_id = next_epoch_id,
      epoch_join_date = now(),
      updated_at = now();
    
    GET DIAGNOSTICS affected_users = ROW_COUNT;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Transitioned to next epoch',
      'previous_epoch', current_epoch.epoch_number,
      'new_epoch', next_epoch_number,
      'affected_users', affected_users
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Current epoch is still active'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to join user to current epoch
CREATE OR REPLACE FUNCTION join_user_to_current_epoch(p_user_id text)
RETURNS jsonb AS $$
DECLARE
  current_epoch_record record;
  existing_progress record;
  new_progress_id uuid;
BEGIN
  -- Get current active epoch
  SELECT * FROM epochs WHERE is_active = true ORDER BY epoch_number DESC LIMIT 1 INTO current_epoch_record;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active epoch found');
  END IF;

  -- Check if user already has progress for this epoch
  SELECT * FROM user_epoch_progress 
  WHERE user_id = p_user_id AND epoch_id = current_epoch_record.id 
  INTO existing_progress;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true, 
      'message', 'User already joined to current epoch',
      'epoch_number', current_epoch_record.epoch_number,
      'progress_id', existing_progress.id
    );
  END IF;

  -- Create new progress record
  INSERT INTO user_epoch_progress (
    user_id, 
    epoch_id, 
    epoch_number, 
    joined_at
  ) VALUES (
    p_user_id, 
    current_epoch_record.id, 
    current_epoch_record.epoch_number, 
    now()
  ) RETURNING id INTO new_progress_id;

  -- Update user's current epoch
  UPDATE users 
  SET 
    current_epoch_id = current_epoch_record.id,
    epoch_join_date = now(),
    total_epoch_earnings = 0,
    updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User joined to current epoch',
    'epoch_number', current_epoch_record.epoch_number,
    'progress_id', new_progress_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user epoch stats
CREATE OR REPLACE FUNCTION get_user_epoch_stats(p_user_id text)
RETURNS jsonb AS $$
DECLARE
  current_epoch_record record;
  user_progress record;
  user_rank integer;
BEGIN
  -- Get current active epoch
  SELECT * FROM epochs WHERE is_active = true ORDER BY epoch_number DESC LIMIT 1 INTO current_epoch_record;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active epoch found');
  END IF;

  -- Get user's progress for current epoch
  SELECT * FROM user_epoch_progress 
  WHERE user_id = p_user_id AND epoch_id = current_epoch_record.id 
  INTO user_progress;

  IF NOT FOUND THEN
    -- User hasn't joined current epoch yet, create progress
    PERFORM join_user_to_current_epoch(p_user_id);
    
    -- Get the newly created progress
    SELECT * FROM user_epoch_progress 
    WHERE user_id = p_user_id AND epoch_id = current_epoch_record.id 
    INTO user_progress;
  END IF;

  -- Calculate user's rank in current epoch
  SELECT COUNT(*) + 1 FROM user_epoch_progress 
  WHERE epoch_id = current_epoch_record.id 
  AND epoch_earnings > COALESCE(user_progress.epoch_earnings, 0)
  INTO user_rank;

  RETURN jsonb_build_object(
    'success', true,
    'epoch_number', current_epoch_record.epoch_number,
    'epoch_name', current_epoch_record.name,
    'user_rank', user_rank,
    'epoch_earnings', COALESCE(user_progress.epoch_earnings, 0),
    'epoch_tasks_completed', COALESCE(user_progress.epoch_tasks_completed, 0),
    'epoch_mining_time', COALESCE(user_progress.epoch_mining_time, 0),
    'bonus_earned', COALESCE(user_progress.bonus_earned, 0),
    'joined_at', user_progress.joined_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure we have an active epoch
DO $$
DECLARE
  active_epoch_count integer;
  alpha_epoch_id uuid;
BEGIN
  -- Check if there's an active epoch
  SELECT COUNT(*) FROM epochs WHERE is_active = true INTO active_epoch_count;
  
  IF active_epoch_count = 0 THEN
    -- No active epoch, create Alpha stage
    INSERT INTO epochs (
      epoch_number, 
      name, 
      description, 
      start_date, 
      end_date, 
      is_active,
      rewards_multiplier
    ) VALUES (
      0,
      'Alpha Stage',
      'Welcome to the Alpha Stage! This is where it all begins. Test the waters and earn your first rewards.',
      now(),
      now() + interval '15 days',
      true,
      1.0
    ) ON CONFLICT (epoch_number) DO UPDATE SET
      is_active = true,
      start_date = now(),
      end_date = now() + interval '15 days',
      updated_at = now()
    RETURNING id INTO alpha_epoch_id;

    -- Update all existing users to join the Alpha epoch
    UPDATE users 
    SET 
      current_epoch_id = alpha_epoch_id,
      epoch_join_date = now(),
      total_epoch_earnings = 0,
      updated_at = now()
    WHERE current_epoch_id IS NULL;
  END IF;
END $$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_current_epoch() TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION transition_to_next_epoch() TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION join_user_to_current_epoch(text) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION get_user_epoch_stats(text) TO authenticated, anon, public;