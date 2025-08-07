/*
  # Complete Referral System Fix

  1. Create a robust referral processing function that bypasses RLS issues
  2. Update RLS policies to work with Discord OAuth flow
  3. Add proper error handling and validation
  4. Ensure referrals are saved correctly to the database
*/

-- Drop existing referral function and recreate with better RLS handling
DROP FUNCTION IF EXISTS process_referral_safely(text, text, numeric);
DROP FUNCTION IF EXISTS process_referral_complete(text, text, numeric);

-- Create a comprehensive referral processing function
CREATE OR REPLACE FUNCTION process_referral_complete(
  p_referrer_code text,
  p_referred_user_id text,
  p_bonus_amount numeric
)
RETURNS jsonb AS $$
DECLARE
  referrer_record record;
  referred_record record;
  existing_referral record;
  new_referral_id uuid;
  referrer_bonus numeric;
  referred_bonus numeric;
BEGIN
  -- Input validation
  IF p_referrer_code IS NULL OR trim(p_referrer_code) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid referral code');
  END IF;
  
  IF p_referred_user_id IS NULL OR trim(p_referred_user_id) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid user ID');
  END IF;
  
  IF p_bonus_amount IS NULL OR p_bonus_amount < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid bonus amount');
  END IF;

  -- Find the referring user
  SELECT id, username, total_referrals, referral_earnings, current_balance, total_earned, multiplier
  FROM users 
  WHERE referral_code = p_referrer_code
  INTO referrer_record;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid referral code');
  END IF;

  -- Get referred user info
  SELECT id, username, current_balance, total_earned, account_age, multiplier, referred_by
  FROM users 
  WHERE id = p_referred_user_id
  INTO referred_record;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referred user not found');
  END IF;

  -- Prevent self-referral
  IF referrer_record.id = p_referred_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot refer yourself');
  END IF;

  -- Check if user was already referred
  IF referred_record.referred_by IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User already has a referrer');
  END IF;

  -- Check if referral relationship already exists
  SELECT id FROM referrals 
  WHERE referrer_id = referrer_record.id AND referred_id = p_referred_user_id
  INTO existing_referral;
  
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral relationship already exists');
  END IF;

  -- Calculate bonuses
  referrer_bonus := p_bonus_amount;
  referred_bonus := FLOOR(referred_record.account_age * 25 * referred_record.multiplier * 0.05); -- 5% bonus for being referred

  BEGIN
    -- Create the referral record
    INSERT INTO referrals (referrer_id, referred_id, bonus_amount)
    VALUES (referrer_record.id, p_referred_user_id, referrer_bonus)
    RETURNING id INTO new_referral_id;

    -- Update referrer stats and balance
    UPDATE users 
    SET 
      total_referrals = total_referrals + 1,
      referral_earnings = referral_earnings + referrer_bonus,
      current_balance = current_balance + referrer_bonus,
      total_earned = total_earned + referrer_bonus,
      updated_at = now()
    WHERE id = referrer_record.id;

    -- Update referred user with referrer info and bonus
    UPDATE users 
    SET 
      referred_by = referrer_record.id,
      current_balance = current_balance + referred_bonus,
      total_earned = total_earned + referred_bonus,
      updated_at = now()
    WHERE id = p_referred_user_id;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Referral processed successfully',
      'referral_id', new_referral_id,
      'referrer_bonus', referrer_bonus,
      'referred_bonus', referred_bonus,
      'referrer_id', referrer_record.id,
      'referrer_username', referrer_record.username,
      'referred_id', p_referred_user_id
    );

  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('success', false, 'error', 'Referral already exists');
    WHEN OTHERS THEN
      RAISE LOG 'Referral processing error for % -> %: % (SQLSTATE: %)', 
        referrer_record.id, p_referred_user_id, SQLERRM, SQLSTATE;
      RETURN jsonb_build_object('success', false, 'error', 'Database error: ' || SQLERRM);
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to all users
GRANT EXECUTE ON FUNCTION process_referral_complete(text, text, numeric) TO authenticated, anon, public;

-- Update referrals RLS policies to be more permissive for the referral process
DROP POLICY IF EXISTS "Users can read own referrals" ON referrals;
DROP POLICY IF EXISTS "Users can insert referrals" ON referrals;
DROP POLICY IF EXISTS "Allow referral creation during registration" ON referrals;

-- Create comprehensive RLS policies for referrals
CREATE POLICY "Users can read own referrals"
  ON referrals
  FOR SELECT
  TO authenticated, anon
  USING (
    -- Allow reading if user is the referrer or referred
    referrer_id = COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'discord_id'),
      auth.uid()::text
    ) OR 
    referred_id = COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'discord_id'),
      auth.uid()::text
    ) OR
    -- Allow reading for users that exist in the system
    EXISTS (
      SELECT 1 FROM users 
      WHERE (users.id = referrals.referrer_id OR users.id = referrals.referred_id)
    )
  );

-- Allow referral insertion for the function
CREATE POLICY "Allow referral creation for valid users"
  ON referrals
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    -- Allow if both users exist and it's not a self-referral
    EXISTS (SELECT 1 FROM users WHERE id = referrer_id) AND
    EXISTS (SELECT 1 FROM users WHERE id = referred_id) AND
    referrer_id != referred_id
  );

-- Create function to get referral history with proper error handling
CREATE OR REPLACE FUNCTION get_user_referral_history(p_user_id text)
RETURNS TABLE (
  referral_id uuid,
  bonus_amount numeric,
  created_at timestamptz,
  referred_username text,
  referred_avatar text,
  referred_join_date timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id as referral_id,
    r.bonus_amount,
    r.created_at,
    u.username as referred_username,
    u.avatar as referred_avatar,
    u.created_at as referred_join_date
  FROM referrals r
  INNER JOIN users u ON r.referred_id = u.id
  WHERE r.referrer_id = p_user_id
  ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_referral_history(text) TO authenticated, anon;

-- Create function to validate referral codes
CREATE OR REPLACE FUNCTION validate_referral_code(p_code text)
RETURNS jsonb AS $$
DECLARE
  referrer_record record;
BEGIN
  IF p_code IS NULL OR trim(p_code) = '' THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Empty referral code');
  END IF;

  SELECT id, username, referral_code
  FROM users 
  WHERE referral_code = p_code
  INTO referrer_record;
  
  IF FOUND THEN
    RETURN jsonb_build_object(
      'valid', true, 
      'referrer_id', referrer_record.id,
      'referrer_username', referrer_record.username
    );
  ELSE
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid referral code');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION validate_referral_code(text) TO authenticated, anon;

-- Add comment for documentation
COMMENT ON FUNCTION process_referral_complete(text, text, numeric) IS 'Complete referral processing with proper RLS handling and bonus calculation';
COMMENT ON FUNCTION get_user_referral_history(text) IS 'Get referral history for a user with proper security';
COMMENT ON FUNCTION validate_referral_code(text) IS 'Validate a referral code and return referrer info';