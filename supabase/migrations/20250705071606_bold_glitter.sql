/*
  # Fix Total Referrals Count Update

  1. Update the referral processing function to properly increment total_referrals
  2. Add a trigger to automatically update total_referrals when referrals are added
  3. Fix any existing data inconsistencies
*/

-- Drop and recreate the referral processing function with proper total_referrals handling
DROP FUNCTION IF EXISTS process_referral_complete(text, text, numeric);

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
  current_referral_count integer;
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

    -- Get current referral count for verification
    SELECT COUNT(*) FROM referrals WHERE referrer_id = referrer_record.id INTO current_referral_count;

    -- Update referrer stats and balance with explicit total_referrals calculation
    UPDATE users 
    SET 
      total_referrals = current_referral_count, -- Use the actual count from referrals table
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

    -- Log the successful referral
    RAISE LOG 'Referral processed: % referred % for % CORD bonus. Referrer now has % total referrals.',
      referrer_record.username, referred_record.username, referrer_bonus, current_referral_count;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Referral processed successfully',
      'referral_id', new_referral_id,
      'referrer_bonus', referrer_bonus,
      'referred_bonus', referred_bonus,
      'referrer_id', referrer_record.id,
      'referrer_username', referrer_record.username,
      'referred_id', p_referred_user_id,
      'total_referrals', current_referral_count
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

-- Create a trigger function to automatically update total_referrals when referrals are added/removed
CREATE OR REPLACE FUNCTION update_referrer_total_count()
RETURNS TRIGGER AS $$
DECLARE
  referral_count integer;
BEGIN
  -- Handle INSERT and UPDATE
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Count total referrals for the referrer
    SELECT COUNT(*) FROM referrals WHERE referrer_id = NEW.referrer_id INTO referral_count;
    
    -- Update the referrer's total_referrals count
    UPDATE users 
    SET total_referrals = referral_count, updated_at = now()
    WHERE id = NEW.referrer_id;
    
    RETURN NEW;
  END IF;
  
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    -- Count total referrals for the referrer
    SELECT COUNT(*) FROM referrals WHERE referrer_id = OLD.referrer_id INTO referral_count;
    
    -- Update the referrer's total_referrals count
    UPDATE users 
    SET total_referrals = referral_count, updated_at = now()
    WHERE id = OLD.referrer_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_update_referrer_count ON referrals;
CREATE TRIGGER trigger_update_referrer_count
  AFTER INSERT OR UPDATE OR DELETE ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_referrer_total_count();

-- Fix any existing data inconsistencies by updating all users' total_referrals counts
UPDATE users 
SET total_referrals = (
  SELECT COUNT(*) 
  FROM referrals 
  WHERE referrals.referrer_id = users.id
),
updated_at = now()
WHERE id IN (
  SELECT DISTINCT referrer_id FROM referrals
);

-- Create a function to manually sync referral counts (for maintenance)
CREATE OR REPLACE FUNCTION sync_referral_counts()
RETURNS jsonb AS $$
DECLARE
  updated_users integer;
BEGIN
  -- Update all users' total_referrals to match actual referral count
  UPDATE users 
  SET total_referrals = (
    SELECT COUNT(*) 
    FROM referrals 
    WHERE referrals.referrer_id = users.id
  ),
  updated_at = now();
  
  GET DIAGNOSTICS updated_users = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Referral counts synchronized',
    'updated_users', updated_users
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION process_referral_complete(text, text, numeric) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION sync_referral_counts() TO authenticated, anon, public;

-- Add comments for documentation
COMMENT ON FUNCTION process_referral_complete(text, text, numeric) IS 'Process referral with proper total_referrals count update';
COMMENT ON FUNCTION update_referrer_total_count() IS 'Trigger function to automatically update total_referrals when referrals change';
COMMENT ON FUNCTION sync_referral_counts() IS 'Manually synchronize all users total_referrals counts with actual referral data';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Referral count fix migration completed successfully';
END $$;