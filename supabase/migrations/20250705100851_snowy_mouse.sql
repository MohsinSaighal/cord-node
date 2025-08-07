/*
  # Fix Discord Login Issues

  1. Update Discord OAuth Policies
    - Ensure anonymous users can properly authenticate
    - Fix permissions for user creation and updates
    - Add more permissive policies for the initial login flow

  2. Add Debug Functions
    - Create functions to help diagnose login issues
    - Add logging for authentication attempts
*/

-- Create a function to log authentication attempts for debugging
CREATE OR REPLACE FUNCTION log_auth_attempt(
  p_user_id text,
  p_auth_method text,
  p_status text,
  p_details jsonb DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Log to Postgres logs for debugging
  RAISE LOG 'Auth attempt: User %, Method %, Status %, Details %', 
    p_user_id, p_auth_method, p_status, p_details;
END;
$$ LANGUAGE plpgsql;

-- Make the RLS policies more permissive for Discord OAuth flow
DROP POLICY IF EXISTS "Allow anon to create user profile during registration" ON users;

CREATE POLICY "Allow anon to create user profile during registration"
  ON users
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create a more permissive policy for user updates during login
CREATE POLICY "Allow user updates during login"
  ON users
  FOR UPDATE
  TO anon
  USING (true);

-- Create a function to check if a user exists
CREATE OR REPLACE FUNCTION check_user_exists(p_user_id text)
RETURNS jsonb AS $$
DECLARE
  user_exists boolean;
  user_data jsonb;
BEGIN
  SELECT EXISTS(SELECT 1 FROM users WHERE id = p_user_id) INTO user_exists;
  
  IF user_exists THEN
    SELECT jsonb_build_object(
      'id', id,
      'username', username,
      'avatar', avatar,
      'account_age', account_age,
      'last_login_time', last_login_time
    ) FROM users WHERE id = p_user_id INTO user_data;
    
    RETURN jsonb_build_object(
      'exists', true,
      'user_data', user_data
    );
  ELSE
    RETURN jsonb_build_object(
      'exists', false
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to manually create a user if needed
CREATE OR REPLACE FUNCTION create_user_manually(
  p_user_id text,
  p_username text,
  p_discriminator text,
  p_avatar text,
  p_account_age numeric,
  p_join_date timestamptz
)
RETURNS jsonb AS $$
DECLARE
  user_exists boolean;
  multiplier numeric;
  base_balance numeric;
  referral_code text;
  new_user_id text;
BEGIN
  -- Check if user already exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = p_user_id) INTO user_exists;
  
  IF user_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User already exists',
      'user_id', p_user_id
    );
  END IF;

  -- Calculate multiplier and starting balance
  multiplier := CASE
    WHEN p_account_age < 1 THEN 1.0
    WHEN p_account_age < 2 THEN 1.2
    WHEN p_account_age < 3 THEN 1.5
    WHEN p_account_age < 4 THEN 2.0
    WHEN p_account_age < 5 THEN 2.5
    WHEN p_account_age < 6 THEN 3.5
    WHEN p_account_age < 7 THEN 5.0
    WHEN p_account_age < 8 THEN 7.0
    ELSE 10.0
  END;
  
  base_balance := 50 + (p_account_age * 25) + ((multiplier - 1) * 100);
  
  -- Generate referral code
  SELECT SUBSTRING(MD5(p_user_id || now()::text) FROM 1 FOR 6) INTO referral_code;
  referral_code := UPPER(referral_code);
  
  -- Create the user
  INSERT INTO users (
    id,
    username,
    discriminator,
    avatar,
    account_age,
    join_date,
    multiplier,
    total_earned,
    current_balance,
    referral_code,
    rank,
    last_login_time
  ) VALUES (
    p_user_id,
    p_username,
    p_discriminator,
    p_avatar,
    p_account_age,
    p_join_date,
    multiplier,
    base_balance,
    base_balance,
    referral_code,
    1000,
    now()
  ) RETURNING id INTO new_user_id;
  
  -- Create default user settings
  INSERT INTO user_settings (user_id)
  VALUES (new_user_id);
  
  -- Join user to current epoch
  PERFORM join_user_to_current_epoch(new_user_id);
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User created successfully',
    'user_id', new_user_id,
    'multiplier', multiplier,
    'starting_balance', base_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to diagnose Discord login issues
CREATE OR REPLACE FUNCTION diagnose_discord_login(p_discord_id text)
RETURNS jsonb AS $$
DECLARE
  user_exists boolean;
  user_data jsonb;
  auth_policies jsonb;
BEGIN
  -- Check if user exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = p_discord_id) INTO user_exists;
  
  IF user_exists THEN
    SELECT jsonb_build_object(
      'id', id,
      'username', username,
      'avatar', avatar,
      'account_age', account_age,
      'last_login_time', last_login_time,
      'created_at', created_at
    ) FROM users WHERE id = p_discord_id INTO user_data;
  END IF;
  
  -- Get RLS policies for users table
  SELECT jsonb_agg(
    jsonb_build_object(
      'name', policyname,
      'permissive', permissive,
      'roles', roles,
      'cmd', cmd,
      'qual', qual,
      'with_check', with_check
    )
  ) FROM pg_policies WHERE tablename = 'users' INTO auth_policies;
  
  RETURN jsonb_build_object(
    'user_exists', user_exists,
    'user_data', user_data,
    'auth_policies', auth_policies,
    'timestamp', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION log_auth_attempt(text, text, text, jsonb) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION check_user_exists(text) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION create_user_manually(text, text, text, text, numeric, timestamptz) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION diagnose_discord_login(text) TO authenticated, anon, public;

-- Add comments for documentation
COMMENT ON FUNCTION log_auth_attempt(text, text, text, jsonb) IS 'Log authentication attempts for debugging';
COMMENT ON FUNCTION check_user_exists(text) IS 'Check if a user exists in the database';
COMMENT ON FUNCTION create_user_manually(text, text, text, text, numeric, timestamptz) IS 'Manually create a user if the normal flow fails';
COMMENT ON FUNCTION diagnose_discord_login(text) IS 'Diagnose Discord login issues for a specific user';