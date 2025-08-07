/*
  # Fix Referral Count Discrepancy

  1. Updates
    - Fix the total_referrals count for all users to match actual referral records
    - Add a function to sync referral counts
    - Ensure the trigger properly updates total_referrals
    - Fix any existing data inconsistencies
*/

-- Function to fix all users' referral counts
CREATE OR REPLACE FUNCTION fix_all_referral_counts()
RETURNS jsonb AS $$
DECLARE
  updated_users integer;
  users_with_discrepancies integer;
BEGIN
  -- First, count users with discrepancies
  SELECT COUNT(*) 
  FROM users u
  WHERE u.total_referrals != (
    SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id
  )
  INTO users_with_discrepancies;

  -- Update all users' total_referrals to match actual referral count
  UPDATE users u
  SET 
    total_referrals = (
      SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id
    ),
    updated_at = now()
  WHERE u.total_referrals != (
    SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id
  );
  
  GET DIAGNOSTICS updated_users = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Referral counts fixed for all users',
    'users_with_discrepancies', users_with_discrepancies,
    'users_updated', updated_users
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger function works correctly
CREATE OR REPLACE FUNCTION update_referrer_total_count()
RETURNS TRIGGER AS $$
DECLARE
  referral_count integer;
BEGIN
  -- Determine which referrer_id to update
  IF TG_OP = 'DELETE' THEN
    -- For DELETE, use the old referrer_id
    SELECT COUNT(*) FROM referrals WHERE referrer_id = OLD.referrer_id INTO referral_count;
    
    -- Update the referrer's total_referrals count
    UPDATE users 
    SET 
      total_referrals = referral_count, 
      updated_at = now()
    WHERE id = OLD.referrer_id;
    
    RETURN OLD;
  ELSE
    -- For INSERT or UPDATE, use the new referrer_id
    SELECT COUNT(*) FROM referrals WHERE referrer_id = NEW.referrer_id INTO referral_count;
    
    -- Update the referrer's total_referrals count
    UPDATE users 
    SET 
      total_referrals = referral_count, 
      updated_at = now()
    WHERE id = NEW.referrer_id;
    
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger to ensure it's using the updated function
DROP TRIGGER IF EXISTS trigger_update_referrer_count ON referrals;
CREATE TRIGGER trigger_update_referrer_count
  AFTER INSERT OR DELETE OR UPDATE ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_referrer_total_count();

-- Create a function to get detailed referral count information
CREATE OR REPLACE FUNCTION get_detailed_referral_counts(p_user_id text)
RETURNS jsonb AS $$
DECLARE
  user_record record;
  actual_count integer;
  referral_details jsonb;
BEGIN
  -- Get user data
  SELECT id, username, total_referrals 
  FROM users 
  WHERE id = p_user_id
  INTO user_record;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Count actual referrals
  SELECT COUNT(*) 
  FROM referrals 
  WHERE referrer_id = p_user_id
  INTO actual_count;

  -- Get detailed referral information
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'referred_id', r.referred_id,
      'referred_username', u.username,
      'bonus_amount', r.bonus_amount,
      'created_at', r.created_at
    )
  )
  FROM referrals r
  JOIN users u ON r.referred_id = u.id
  WHERE r.referrer_id = p_user_id
  ORDER BY r.created_at DESC
  INTO referral_details;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'username', user_record.username,
    'stored_count', user_record.total_referrals,
    'actual_count', actual_count,
    'is_accurate', user_record.total_referrals = actual_count,
    'difference', user_record.total_referrals - actual_count,
    'referrals', COALESCE(referral_details, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the fix for all users
SELECT fix_all_referral_counts();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION fix_all_referral_counts() TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION get_detailed_referral_counts(text) TO authenticated, anon, public;

-- Add comments for documentation
COMMENT ON FUNCTION fix_all_referral_counts() IS 'Fix total_referrals count for all users to match actual referral records';
COMMENT ON FUNCTION get_detailed_referral_counts(text) IS 'Get detailed information about a user''s referrals and count accuracy';