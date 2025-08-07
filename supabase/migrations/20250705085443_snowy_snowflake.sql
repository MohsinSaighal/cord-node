/*
  # Fix Total Referrals Synchronization

  1. Updates
    - Fix the process_referral_complete function to properly update total_referrals
    - Add trigger to automatically sync referral counts
    - Create function to manually sync all referral counts
    - Ensure referral counts are always accurate

  2. Security
    - Maintain existing RLS policies
    - Add proper error handling and logging
*/

-- Drop and recreate the referral processing function with better total_referrals handling
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
  new_referral_count integer;
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

  -- Calculate bonuses
  referrer_bonus := p_bonus_amount;
  referred_bonus := FLOOR(referred_record.account_age * 25 * referred_record.multiplier * 0.05); -- 5% bonus for being referred

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
    RAISE LOG 'Referral processed successfully: % (%) referred % (%) for % CORD bonus. Referrer now has % total referrals.',
      referrer_record.username, referrer_record.id, referred_record.username, p_referred_user_id, 
      referrer_bonus, new_referral_count;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Referral processed successfully',
      'referral_id', new_referral_id,
      'referrer_bonus', referrer_bonus,
      'referred_bonus', referred_bonus,
      'referrer_id', referrer_record.id,
      'referrer_username', referrer_record.username,
      'referred_id', p_referred_user_id,
      'referred_username', referred_record.username,
      'new_total_referrals', new_referral_count
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

-- Create a trigger function to automatically update total_referrals when referrals change
CREATE OR REPLACE FUNCTION update_referrer_total_count()
RETURNS TRIGGER AS $$
DECLARE
  referral_count integer;
  affected_referrer_id text;
BEGIN
  -- Determine which referrer_id to update
  IF TG_OP = 'DELETE' THEN
    affected_referrer_id := OLD.referrer_id;
  ELSE
    affected_referrer_id := NEW.referrer_id;
  END IF;

  -- Count total referrals for the affected referrer
  SELECT COUNT(*) FROM referrals WHERE referrer_id = affected_referrer_id INTO referral_count;
  
  -- Update the referrer's total_referrals count
  UPDATE users 
  SET 
    total_referrals = referral_count, 
    updated_at = now()
  WHERE id = affected_referrer_id;
  
  -- Log the update for debugging
  RAISE LOG 'Updated total_referrals for user % to % (operation: %)', 
    affected_referrer_id, referral_count, TG_OP;
  
  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS trigger_update_referrer_count ON referrals;
CREATE TRIGGER trigger_update_referrer_count
  AFTER INSERT OR UPDATE OR DELETE ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_referrer_total_count();

-- Create a function to manually sync all referral counts (for maintenance)
CREATE OR REPLACE FUNCTION sync_all_referral_counts()
RETURNS jsonb AS $$
DECLARE
  updated_users integer;
  total_users integer;
  users_with_referrals integer;
BEGIN
  -- Get total user count for reporting
  SELECT COUNT(*) FROM users INTO total_users;
  
  -- Count users who actually have referrals
  SELECT COUNT(DISTINCT referrer_id) FROM referrals INTO users_with_referrals;
  
  -- Update all users' total_referrals to match actual referral count
  UPDATE users 
  SET 
    total_referrals = COALESCE((
      SELECT COUNT(*) 
      FROM referrals 
      WHERE referrals.referrer_id = users.id
    ), 0),
    updated_at = now();
  
  GET DIAGNOSTICS updated_users = ROW_COUNT;
  
  -- Log the sync operation
  RAISE LOG 'Referral count sync completed: % total users, % users with referrals, % users updated',
    total_users, users_with_referrals, updated_users;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'All referral counts synchronized successfully',
    'total_users', total_users,
    'users_with_referrals', users_with_referrals,
    'updated_users', updated_users
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get referral statistics for debugging
CREATE OR REPLACE FUNCTION get_referral_stats()
RETURNS jsonb AS $$
DECLARE
  total_referrals integer;
  total_users_with_referrals integer;
  avg_referrals_per_user numeric;
  max_referrals integer;
  inconsistent_counts integer;
BEGIN
  -- Get total referrals
  SELECT COUNT(*) FROM referrals INTO total_referrals;
  
  -- Get users with referrals
  SELECT COUNT(DISTINCT referrer_id) FROM referrals INTO total_users_with_referrals;
  
  -- Calculate average referrals per user (who has referrals)
  SELECT AVG(referral_count)::numeric(10,2) FROM (
    SELECT COUNT(*) as referral_count 
    FROM referrals 
    GROUP BY referrer_id
  ) subq INTO avg_referrals_per_user;
  
  -- Get max referrals by any user
  SELECT MAX(referral_count) FROM (
    SELECT COUNT(*) as referral_count 
    FROM referrals 
    GROUP BY referrer_id
  ) subq INTO max_referrals;
  
  -- Check for inconsistent counts
  SELECT COUNT(*) FROM users u
  WHERE u.total_referrals != COALESCE((
    SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id
  ), 0) INTO inconsistent_counts;
  
  RETURN jsonb_build_object(
    'total_referrals', total_referrals,
    'total_users_with_referrals', total_users_with_referrals,
    'avg_referrals_per_user', avg_referrals_per_user,
    'max_referrals', max_referrals,
    'inconsistent_counts', inconsistent_counts,
    'data_integrity', CASE WHEN inconsistent_counts = 0 THEN 'GOOD' ELSE 'NEEDS_SYNC' END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix any existing data inconsistencies by syncing all referral counts
SELECT sync_all_referral_counts();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION process_referral_complete(text, text, numeric) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION sync_all_referral_counts() TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION get_referral_stats() TO authenticated, anon, public;

-- Add comments for documentation
COMMENT ON FUNCTION process_referral_complete(text, text, numeric) IS 'Process referral with proper total_referrals count update and race condition protection';
COMMENT ON FUNCTION update_referrer_total_count() IS 'Trigger function to automatically update total_referrals when referrals change';
COMMENT ON FUNCTION sync_all_referral_counts() IS 'Manually synchronize all users total_referrals counts with actual referral data';
COMMENT ON FUNCTION get_referral_stats() IS 'Get referral system statistics and data integrity status';

-- Verify the fix worked
DO $$
DECLARE
  stats_result jsonb;
BEGIN
  SELECT get_referral_stats() INTO stats_result;
  RAISE NOTICE 'Referral sync completed. Stats: %', stats_result;
END $$;