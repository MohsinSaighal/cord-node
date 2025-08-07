/*
  # Fix Referral History Query Issues

  1. Ensure proper foreign key constraints exist
  2. Add debugging function to check referral data integrity
  3. Create a more reliable view for referral history
*/

-- Ensure foreign key constraints exist with correct names
DO $$
BEGIN
  -- Drop existing constraints if they exist with different names
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name LIKE '%referrals%fkey%'
    AND table_name = 'referrals'
  ) THEN
    -- Get the actual constraint names and drop them
    PERFORM 'ALTER TABLE referrals DROP CONSTRAINT ' || constraint_name
    FROM information_schema.table_constraints 
    WHERE constraint_name LIKE '%referrals%fkey%'
    AND table_name = 'referrals';
  END IF;

  -- Add the foreign key constraints with specific names
  ALTER TABLE referrals 
  ADD CONSTRAINT referrals_referrer_id_fkey 
  FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE;

  ALTER TABLE referrals 
  ADD CONSTRAINT referrals_referred_id_fkey 
  FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE CASCADE;

EXCEPTION
  WHEN duplicate_object THEN
    -- Constraints already exist, continue
    NULL;
END $$;

-- Create a function to debug referral data
CREATE OR REPLACE FUNCTION debug_user_referrals(p_user_id text)
RETURNS TABLE (
  referral_count bigint,
  user_total_referrals integer,
  referral_records jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM referrals WHERE referrer_id = p_user_id) as referral_count,
    (SELECT total_referrals FROM users WHERE id = p_user_id) as user_total_referrals,
    (SELECT jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'referred_id', r.referred_id,
        'bonus_amount', r.bonus_amount,
        'created_at', r.created_at,
        'referred_user_exists', (SELECT EXISTS(SELECT 1 FROM users WHERE id = r.referred_id))
      )
    ) FROM referrals r WHERE r.referrer_id = p_user_id) as referral_records;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION debug_user_referrals(text) TO authenticated, anon;

-- Create a more reliable referral history view
CREATE OR REPLACE VIEW user_referral_details AS
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
LEFT JOIN users referrer ON r.referrer_id = referrer.id
LEFT JOIN users referred ON r.referred_id = referred.id
WHERE referrer.id IS NOT NULL AND referred.id IS NOT NULL
ORDER BY r.created_at DESC;

GRANT SELECT ON user_referral_details TO authenticated, anon;

-- Function to get complete referral history with error handling
CREATE OR REPLACE FUNCTION get_referral_history_safe(p_user_id text)
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

GRANT EXECUTE ON FUNCTION get_referral_history_safe(text) TO authenticated, anon;