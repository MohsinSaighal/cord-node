/*
  # Fix Referral History and Database Recording

  1. Ensure foreign key constraints exist
  2. Add performance indexes for referral queries
  3. Create view for easier referral history access
  4. Add function to get user referral stats
  5. Fix any missing constraints or indexes
*/

-- Ensure foreign key constraints exist and are properly named
DO $$
BEGIN
  -- Check if foreign key constraints exist, if not add them
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'referrals_referrer_id_fkey'
    AND table_name = 'referrals'
  ) THEN
    ALTER TABLE referrals 
    ADD CONSTRAINT referrals_referrer_id_fkey 
    FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'referrals_referred_id_fkey'
    AND table_name = 'referrals'
  ) THEN
    ALTER TABLE referrals 
    ADD CONSTRAINT referrals_referred_id_fkey 
    FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create additional indexes for better performance
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_created 
ON referrals(referrer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_referrals_referred_created 
ON referrals(referred_id, created_at DESC);

-- Create a view for easier referral history queries
CREATE OR REPLACE VIEW referral_history AS
SELECT 
  r.id,
  r.referrer_id,
  r.referred_id,
  r.bonus_amount,
  r.created_at,
  referrer.username as referrer_username,
  referrer.avatar as referrer_avatar,
  referred.username as referred_username,
  referred.avatar as referred_avatar,
  referred.created_at as referred_join_date
FROM referrals r
JOIN users referrer ON r.referrer_id = referrer.id
JOIN users referred ON r.referred_id = referred.id
ORDER BY r.created_at DESC;

-- Grant access to the view
GRANT SELECT ON referral_history TO authenticated, anon;

-- Function to get referral stats for a user
CREATE OR REPLACE FUNCTION get_user_referral_stats(p_user_id text)
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
  JOIN users u ON r.referred_id = u.id
  WHERE r.referrer_id = p_user_id
  ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_referral_stats(text) TO authenticated, anon;

-- Add comment for documentation
COMMENT ON VIEW referral_history IS 'Complete referral history with user details for easy querying';
COMMENT ON FUNCTION get_user_referral_stats(text) IS 'Get referral statistics and history for a specific user';

-- Ensure referrals table has proper RLS policies (the view will inherit security from base tables)
-- No need to add RLS policy to the view itself as it's not a table