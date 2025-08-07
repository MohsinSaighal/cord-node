/*
  # Double Welcome Bonus for New Users and Referrers

  1. Updates
    - Double the welcome bonus calculation for new users
    - Increase referrer bonus to match the doubled welcome bonus
    - Update the referral processing function to use the new bonus calculation

  2. Security
    - Maintain existing RLS policies
    - Ensure proper validation for bonus calculation
*/

-- Update the process_referral_complete function to double welcome bonus
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
  new_referral_count integer;
  welcome_bonus_multiplier numeric := 2.0; -- Double the welcome bonus
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

  -- Find the referring user with lock to prevent race conditions
  SELECT id, username, total_referrals, referral_earnings, current_balance, total_earned, multiplier
  FROM users 
  WHERE referral_code = p_referrer_code
  FOR UPDATE
  INTO referrer_record;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid referral code');
  END IF;

  -- Get referred user info with lock
  SELECT id, username, current_balance, total_earned, account_age, multiplier, referred_by
  FROM users 
  WHERE id = p_referred_user_id
  FOR UPDATE
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

  -- Calculate bonuses with doubled welcome bonus
  -- Base welcome bonus is account_age * 25 * multiplier
  -- Now we multiply that by welcome_bonus_multiplier (2.0)
  referrer_bonus := FLOOR(referred_record.account_age * 25 * referred_record.multiplier * 0.1 * welcome_bonus_multiplier);
  referred_bonus := FLOOR(referred_record.account_age * 25 * referred_record.multiplier * 0.05 * welcome_bonus_multiplier);

  BEGIN
    -- Create the referral record
    INSERT INTO referrals (referrer_id, referred_id, bonus_amount)
    VALUES (referrer_record.id, p_referred_user_id, referrer_bonus)
    RETURNING id INTO new_referral_id;

    -- Calculate new referral count AFTER inserting the referral
    SELECT COUNT(*) FROM referrals WHERE referrer_id = referrer_record.id INTO new_referral_count;

    -- Update referrer stats and balance with the correct total_referrals count
    UPDATE users 
    SET 
      total_referrals = new_referral_count,
      referral_earnings = referral_earnings + referrer_bonus,
      current_balance = current_balance + referrer_bonus,
      total_earned = total_earned + referrer_bonus,
      updated_at = now()
    WHERE id = referrer_record.id;

    -- Verify the update worked
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Failed to update referrer stats';
    END IF;

    -- Update referred user with referrer info and bonus
    UPDATE users 
    SET 
      referred_by = referrer_record.id,
      current_balance = current_balance + referred_bonus,
      total_earned = total_earned + referred_bonus,
      updated_at = now()
    WHERE id = p_referred_user_id;

    -- Verify the update worked
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Failed to update referred user stats';
    END IF;

    -- Log the successful referral
    RAISE LOG 'Referral processed successfully with DOUBLED bonus: % (%) referred % (%) for % CORD bonus. Referrer now has % total referrals.',
      referrer_record.username, referrer_record.id, referred_record.username, p_referred_user_id, 
      referrer_bonus, new_referral_count;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Referral processed successfully with doubled bonus',
      'referral_id', new_referral_id,
      'referrer_bonus', referrer_bonus,
      'referred_bonus', referred_bonus,
      'referrer_id', referrer_record.id,
      'referrer_username', referrer_record.username,
      'referred_id', p_referred_user_id,
      'referred_username', referred_record.username,
      'new_total_referrals', new_referral_count,
      'welcome_bonus_multiplier', welcome_bonus_multiplier
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

-- Update the calculateInitialBalance function to double the welcome bonus
CREATE OR REPLACE FUNCTION calculate_initial_balance(account_age numeric, multiplier numeric)
RETURNS numeric AS $$
DECLARE
  welcome_bonus_multiplier numeric := 2.0; -- Double the welcome bonus
  base_amount numeric := 50;
  age_bonus numeric := account_age * 25;
  multiplier_bonus numeric := (multiplier - 1) * 100;
BEGIN
  -- Apply the welcome bonus multiplier to the total
  RETURN FLOOR((base_amount + age_bonus + multiplier_bonus) * welcome_bonus_multiplier);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the create_user_manually function to use the new bonus calculation
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

  -- Calculate multiplier
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
  
  -- Calculate starting balance with doubled welcome bonus
  base_balance := calculate_initial_balance(p_account_age, multiplier);
  
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
    'message', 'User created successfully with doubled welcome bonus',
    'user_id', new_user_id,
    'multiplier', multiplier,
    'starting_balance', base_balance,
    'welcome_bonus_multiplier', 2.0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION process_referral_complete(text, text, numeric) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION calculate_initial_balance(numeric, numeric) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION create_user_manually(text, text, text, text, numeric, timestamptz) TO authenticated, anon, public;

-- Add comments for documentation
COMMENT ON FUNCTION process_referral_complete(text, text, numeric) IS 'Process referral with doubled welcome bonus for both referrer and referred user';
COMMENT ON FUNCTION calculate_initial_balance(numeric, numeric) IS 'Calculate initial balance for new users with doubled welcome bonus';
COMMENT ON FUNCTION create_user_manually(text, text, text, text, numeric, timestamptz) IS 'Manually create a user with doubled welcome bonus';