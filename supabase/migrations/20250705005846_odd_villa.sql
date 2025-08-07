/*
  # Add Epoch System

  1. New Tables
    - `epochs` - Store epoch information and stages
    - `user_epoch_progress` - Track user progress within epochs

  2. New Columns
    - Add epoch-related fields to users table

  3. Functions
    - Function to get current epoch
    - Function to calculate epoch progress
    - Function to handle epoch transitions

  4. Initial Data
    - Create alpha epoch and first few numbered epochs
*/

-- Create epochs table
CREATE TABLE IF NOT EXISTS epochs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  epoch_number integer UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  rewards_multiplier numeric NOT NULL DEFAULT 1.0,
  special_features jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user epoch progress table
CREATE TABLE IF NOT EXISTS user_epoch_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  epoch_id uuid NOT NULL REFERENCES epochs(id) ON DELETE CASCADE,
  epoch_number integer NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  epoch_earnings numeric NOT NULL DEFAULT 0,
  epoch_tasks_completed integer NOT NULL DEFAULT 0,
  epoch_mining_time integer NOT NULL DEFAULT 0, -- in seconds
  epoch_rank integer DEFAULT NULL,
  bonus_earned numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, epoch_id)
);

-- Add epoch fields to users table
DO $$
BEGIN
  -- Add current_epoch_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'current_epoch_id'
  ) THEN
    ALTER TABLE users ADD COLUMN current_epoch_id uuid REFERENCES epochs(id);
  END IF;

  -- Add epoch_join_date if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'epoch_join_date'
  ) THEN
    ALTER TABLE users ADD COLUMN epoch_join_date timestamptz DEFAULT now();
  END IF;

  -- Add total_epoch_earnings if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'total_epoch_earnings'
  ) THEN
    ALTER TABLE users ADD COLUMN total_epoch_earnings numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE epochs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_epoch_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for epochs (public read)
CREATE POLICY "Anyone can read epochs"
  ON epochs
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- RLS Policies for user_epoch_progress
CREATE POLICY "Users can read own epoch progress"
  ON user_epoch_progress
  FOR SELECT
  TO authenticated, anon
  USING (
    user_id = COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'discord_id'),
      auth.uid()::text
    )
  );

CREATE POLICY "Users can insert own epoch progress"
  ON user_epoch_progress
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    user_id = COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'discord_id'),
      auth.uid()::text,
      user_id
    )
  );

CREATE POLICY "Users can update own epoch progress"
  ON user_epoch_progress
  FOR UPDATE
  TO authenticated, anon
  USING (
    user_id = COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'discord_id'),
      auth.uid()::text
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_epochs_number ON epochs(epoch_number);
CREATE INDEX IF NOT EXISTS idx_epochs_active ON epochs(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_epochs_dates ON epochs(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_user_epoch_progress_user_id ON user_epoch_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_epoch_progress_epoch ON user_epoch_progress(epoch_id, epoch_number);
CREATE INDEX IF NOT EXISTS idx_user_epoch_progress_earnings ON user_epoch_progress(epoch_number, epoch_earnings DESC);

-- Create triggers for updated_at
CREATE TRIGGER update_epochs_updated_at BEFORE UPDATE ON epochs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_epoch_progress_updated_at BEFORE UPDATE ON user_epoch_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get current active epoch
CREATE OR REPLACE FUNCTION get_current_epoch()
RETURNS TABLE (
  id uuid,
  epoch_number integer,
  name text,
  description text,
  start_date timestamptz,
  end_date timestamptz,
  days_remaining integer,
  progress_percentage numeric
) AS $$
DECLARE
  current_epoch record;
BEGIN
  -- Get the currently active epoch
  SELECT * FROM epochs 
  WHERE is_active = true 
  AND now() BETWEEN start_date AND end_date
  ORDER BY epoch_number DESC
  LIMIT 1
  INTO current_epoch;

  IF FOUND THEN
    RETURN QUERY
    SELECT 
      current_epoch.id,
      current_epoch.epoch_number,
      current_epoch.name,
      current_epoch.description,
      current_epoch.start_date,
      current_epoch.end_date,
      GREATEST(0, EXTRACT(days FROM current_epoch.end_date - now())::integer) as days_remaining,
      LEAST(100, GREATEST(0, 
        EXTRACT(epoch FROM now() - current_epoch.start_date) / 
        EXTRACT(epoch FROM current_epoch.end_date - current_epoch.start_date) * 100
      ))::numeric as progress_percentage;
  ELSE
    -- No active epoch found, return null
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to transition to next epoch
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

  -- Deactivate current epoch if it exists and has ended
  IF FOUND AND now() > current_epoch.end_date THEN
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
        'Epoch ' || next_epoch_number,
        'Epoch ' || next_epoch_number || ' - New challenges and rewards await!',
        now(),
        now() + interval '15 days',
        true,
        1.0 + (next_epoch_number * 0.1) -- Increase rewards by 10% each epoch
      ) RETURNING id INTO next_epoch_id;
    ELSE
      -- Activate existing next epoch
      UPDATE epochs 
      SET is_active = true, start_date = now(), updated_at = now()
      WHERE id = next_epoch_id;
    END IF;

    -- Update all users to new epoch
    UPDATE users 
    SET 
      current_epoch_id = next_epoch_id,
      epoch_join_date = now(),
      updated_at = now()
    WHERE current_epoch_id = current_epoch.id OR current_epoch_id IS NULL;
    
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
      'message', 'No epoch transition needed'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to join user to current epoch
CREATE OR REPLACE FUNCTION join_user_to_current_epoch(p_user_id text)
RETURNS jsonb AS $$
DECLARE
  current_epoch record;
  existing_progress record;
BEGIN
  -- Get current active epoch
  SELECT * FROM epochs 
  WHERE is_active = true 
  ORDER BY epoch_number DESC 
  LIMIT 1
  INTO current_epoch;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active epoch found');
  END IF;

  -- Check if user already has progress in this epoch
  SELECT * FROM user_epoch_progress 
  WHERE user_id = p_user_id AND epoch_id = current_epoch.id
  INTO existing_progress;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true, 
      'message', 'User already in current epoch',
      'epoch_number', current_epoch.epoch_number
    );
  END IF;

  -- Add user to current epoch
  INSERT INTO user_epoch_progress (user_id, epoch_id, epoch_number)
  VALUES (p_user_id, current_epoch.id, current_epoch.epoch_number);

  -- Update user's current epoch
  UPDATE users 
  SET 
    current_epoch_id = current_epoch.id,
    epoch_join_date = now(),
    updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User joined current epoch',
    'epoch_number', current_epoch.epoch_number,
    'epoch_name', current_epoch.name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's epoch stats
CREATE OR REPLACE FUNCTION get_user_epoch_stats(p_user_id text)
RETURNS jsonb AS $$
DECLARE
  current_epoch record;
  user_progress record;
  epoch_rank integer;
  total_participants integer;
BEGIN
  -- Get current epoch
  SELECT * FROM epochs 
  WHERE is_active = true 
  ORDER BY epoch_number DESC 
  LIMIT 1
  INTO current_epoch;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active epoch');
  END IF;

  -- Get user's progress in current epoch
  SELECT * FROM user_epoch_progress 
  WHERE user_id = p_user_id AND epoch_id = current_epoch.id
  INTO user_progress;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not in current epoch');
  END IF;

  -- Calculate user's rank in current epoch
  SELECT COUNT(*) + 1 FROM user_epoch_progress 
  WHERE epoch_id = current_epoch.id AND epoch_earnings > user_progress.epoch_earnings
  INTO epoch_rank;

  -- Get total participants
  SELECT COUNT(*) FROM user_epoch_progress 
  WHERE epoch_id = current_epoch.id
  INTO total_participants;

  RETURN jsonb_build_object(
    'success', true,
    'epoch_number', current_epoch.epoch_number,
    'epoch_name', current_epoch.name,
    'epoch_description', current_epoch.description,
    'start_date', current_epoch.start_date,
    'end_date', current_epoch.end_date,
    'days_remaining', GREATEST(0, EXTRACT(days FROM current_epoch.end_date - now())::integer),
    'progress_percentage', LEAST(100, GREATEST(0, 
      EXTRACT(epoch FROM now() - current_epoch.start_date) / 
      EXTRACT(epoch FROM current_epoch.end_date - current_epoch.start_date) * 100
    ))::numeric,
    'user_earnings', user_progress.epoch_earnings,
    'user_tasks_completed', user_progress.epoch_tasks_completed,
    'user_mining_time', user_progress.epoch_mining_time,
    'user_rank', epoch_rank,
    'total_participants', total_participants,
    'rewards_multiplier', current_epoch.rewards_multiplier,
    'joined_at', user_progress.joined_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_current_epoch() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION transition_to_next_epoch() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION join_user_to_current_epoch(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_epoch_stats(text) TO authenticated, anon;

-- Insert initial epochs
INSERT INTO epochs (epoch_number, name, description, start_date, end_date, is_active, rewards_multiplier) VALUES
  (0, 'Alpha Stage', 'Welcome to the Alpha Stage! This is where it all begins. Test the waters and earn your first rewards.', now() - interval '1 day', now() + interval '14 days', true, 1.0),
  (1, 'Epoch 1', 'The first official epoch begins! New features and increased rewards await.', now() + interval '14 days', now() + interval '29 days', false, 1.1),
  (2, 'Epoch 2', 'Building momentum in Epoch 2. Enhanced mining capabilities and exclusive tasks.', now() + interval '29 days', now() + interval '44 days', false, 1.2),
  (3, 'Epoch 3', 'Epoch 3 brings advanced features and community challenges.', now() + interval '44 days', now() + interval '59 days', false, 1.3)
ON CONFLICT (epoch_number) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  rewards_multiplier = EXCLUDED.rewards_multiplier;

-- Add comments for documentation
COMMENT ON TABLE epochs IS 'Stores epoch information with 15-day cycles starting from Alpha stage';
COMMENT ON TABLE user_epoch_progress IS 'Tracks user progress and earnings within each epoch';
COMMENT ON FUNCTION get_current_epoch() IS 'Get information about the currently active epoch';
COMMENT ON FUNCTION join_user_to_current_epoch(text) IS 'Add a user to the current active epoch';
COMMENT ON FUNCTION get_user_epoch_stats(text) IS 'Get detailed epoch statistics for a specific user';