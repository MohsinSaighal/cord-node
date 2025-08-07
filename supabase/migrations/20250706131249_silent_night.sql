/*
  # Verify Referral Count Accuracy

  1. Add functions to verify referral counts
  2. Add function to fix any inconsistencies
  3. Add diagnostic tools for referral system
*/

-- Function to verify referral counts for a specific user
CREATE OR REPLACE FUNCTION verify_user_referral_count(p_user_id text)
RETURNS jsonb AS $$
DECLARE
  user_record record;
  actual_count integer;
  is_accurate boolean;
BEGIN
  -- Get user's current total_referrals
  SELECT id, username, total_referrals 
  FROM users 
  WHERE id = p_user_id
  INTO user_record;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Count actual referrals in the referrals table
  SELECT COUNT(*) 
  FROM referrals 
  WHERE referrer_id = p_user_id
  INTO actual_count;

  -- Check if the counts match
  is_accurate := user_record.total_referrals = actual_count;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'username', user_record.username,
    'stored_count', user_record.total_referrals,
    'actual_count', actual_count,
    'is_accurate', is_accurate,
    'difference', user_record.total_referrals - actual_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify all users' referral counts
CREATE OR REPLACE FUNCTION verify_all_referral_counts()
RETURNS jsonb AS $$
DECLARE
  total_users integer;
  accurate_users integer;
  inaccurate_users integer;
  users_with_referrals integer;
  max_difference integer;
BEGIN
  -- Count total users
  SELECT COUNT(*) FROM users INTO total_users;
  
  -- Count users with accurate referral counts
  SELECT COUNT(*) 
  FROM users u
  WHERE u.total_referrals = (
    SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id
  )
  INTO accurate_users;
  
  -- Count users with inaccurate referral counts
  SELECT COUNT(*) 
  FROM users u
  WHERE u.total_referrals != (
    SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id
  )
  INTO inaccurate_users;
  
  -- Count users who have referrals
  SELECT COUNT(DISTINCT referrer_id) FROM referrals INTO users_with_referrals;
  
  -- Find maximum difference
  SELECT MAX(ABS(u.total_referrals - subq.actual_count))
  FROM users u
  JOIN (
    SELECT referrer_id, COUNT(*) as actual_count
    FROM referrals
    GROUP BY referrer_id
  ) subq ON u.id = subq.referrer_id
  WHERE u.total_referrals != subq.actual_count
  INTO max_difference;

  RETURN jsonb_build_object(
    'total_users', total_users,
    'accurate_users', accurate_users,
    'inaccurate_users', inaccurate_users,
    'users_with_referrals', users_with_referrals,
    'max_difference', max_difference,
    'accuracy_percentage', CASE 
      WHEN total_users > 0 THEN 
        ROUND((accurate_users::numeric / total_users::numeric) * 100, 2)
      ELSE 0
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to fix a specific user's referral count
CREATE OR REPLACE FUNCTION fix_user_referral_count(p_user_id text)
RETURNS jsonb AS $$
DECLARE
  user_record record;
  actual_count integer;
  old_count integer;
BEGIN
  -- Get user's current total_referrals
  SELECT id, username, total_referrals 
  FROM users 
  WHERE id = p_user_id
  INTO user_record;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Store old count for reporting
  old_count := user_record.total_referrals;

  -- Count actual referrals
  SELECT COUNT(*) 
  FROM referrals 
  WHERE referrer_id = p_user_id
  INTO actual_count;

  -- Update user's total_referrals to match actual count
  UPDATE users 
  SET 
    total_referrals = actual_count,
    updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'username', user_record.username,
    'old_count', old_count,
    'new_count', actual_count,
    'difference', actual_count - old_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to list users with inaccurate referral counts
CREATE OR REPLACE FUNCTION list_users_with_inaccurate_referral_counts(p_limit integer DEFAULT 100)
RETURNS TABLE (
  user_id text,
  username text,
  stored_count integer,
  actual_count bigint,
  difference integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.username,
    u.total_referrals as stored_count,
    COUNT(r.id) as actual_count,
    u.total_referrals - COUNT(r.id)::integer as difference
  FROM users u
  LEFT JOIN referrals r ON u.id = r.referrer_id
  GROUP BY u.id, u.username, u.total_referrals
  HAVING u.total_referrals != COUNT(r.id)
  ORDER BY ABS(u.total_referrals - COUNT(r.id)) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION verify_user_referral_count(text) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION verify_all_referral_counts() TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION fix_user_referral_count(text) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION list_users_with_inaccurate_referral_counts(integer) TO authenticated, anon, public;

-- Add comments for documentation
COMMENT ON FUNCTION verify_user_referral_count(text) IS 'Verify if a user''s total_referrals count matches the actual number of referrals';
COMMENT ON FUNCTION verify_all_referral_counts() IS 'Verify referral count accuracy across all users';
COMMENT ON FUNCTION fix_user_referral_count(text) IS 'Fix a user''s total_referrals count to match the actual number of referrals';
COMMENT ON FUNCTION list_users_with_inaccurate_referral_counts(integer) IS 'List users whose total_referrals count does not match their actual referrals';

-- Run verification to check current state
DO $$
DECLARE
  verification_result jsonb;
  inaccurate_users jsonb;
BEGIN
  SELECT verify_all_referral_counts() INTO verification_result;
  RAISE NOTICE 'Referral count verification complete: %', verification_result;
END $$;