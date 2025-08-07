/*
  # Test Referral Count Updates

  1. Add function to test referral count updates
  2. Add function to simulate referral activity
  3. Add function to check referral trigger functionality
*/

-- Function to test referral count updates
CREATE OR REPLACE FUNCTION test_referral_count_update()
RETURNS jsonb AS $$
DECLARE
  test_referrer_id text;
  test_referred_id text;
  initial_count integer;
  new_count integer;
  referral_id uuid;
  verification_before jsonb;
  verification_after jsonb;
BEGIN
  -- Find a user to test with (or create one if needed)
  SELECT id FROM users ORDER BY created_at DESC LIMIT 1 INTO test_referrer_id;
  
  IF test_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No users found for testing');
  END IF;
  
  -- Create a temporary test user as the referred user
  INSERT INTO users (
    id, 
    username, 
    discriminator, 
    avatar, 
    account_age, 
    join_date, 
    multiplier
  ) VALUES (
    'test_referred_' || floor(random() * 1000000)::text,
    'TestUser' || floor(random() * 1000)::text,
    '0000',
    'https://cdn.discordapp.com/embed/avatars/0.png',
    1.0,
    now(),
    1.0
  ) RETURNING id INTO test_referred_id;

  -- Verify referral count before
  SELECT verify_user_referral_count(test_referrer_id) INTO verification_before;
  
  -- Get initial count
  SELECT total_referrals FROM users WHERE id = test_referrer_id INTO initial_count;
  
  -- Create a test referral
  INSERT INTO referrals (referrer_id, referred_id, bonus_amount)
  VALUES (test_referrer_id, test_referred_id, 10)
  RETURNING id INTO referral_id;
  
  -- Get new count after trigger should have run
  SELECT total_referrals FROM users WHERE id = test_referrer_id INTO new_count;
  
  -- Verify referral count after
  SELECT verify_user_referral_count(test_referrer_id) INTO verification_after;
  
  -- Clean up test data
  DELETE FROM referrals WHERE id = referral_id;
  DELETE FROM users WHERE id = test_referred_id;
  
  -- Return test results
  RETURN jsonb_build_object(
    'success', true,
    'test_referrer_id', test_referrer_id,
    'initial_count', initial_count,
    'new_count', new_count,
    'count_increased', new_count > initial_count,
    'verification_before', verification_before,
    'verification_after', verification_after,
    'trigger_working', new_count = initial_count + 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to simulate referral activity
CREATE OR REPLACE FUNCTION simulate_referral_earnings(
  p_referrer_id text,
  p_referred_id text,
  p_amount numeric DEFAULT 100,
  p_type text DEFAULT 'test'
)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  verification_before jsonb;
  verification_after jsonb;
BEGIN
  -- Verify referral earnings before
  SELECT jsonb_build_object(
    'referral_earnings', referral_earnings,
    'lifetime_referral_earnings', lifetime_referral_earnings
  ) FROM users WHERE id = p_referrer_id INTO verification_before;
  
  -- Distribute referral reward
  SELECT distribute_referral_reward(
    p_referred_id,
    p_amount,
    p_type,
    'test_' || floor(random() * 1000000)::text
  ) INTO result;
  
  -- Verify referral earnings after
  SELECT jsonb_build_object(
    'referral_earnings', referral_earnings,
    'lifetime_referral_earnings', lifetime_referral_earnings
  ) FROM users WHERE id = p_referrer_id INTO verification_after;
  
  -- Return test results
  RETURN jsonb_build_object(
    'success', (result ->> 'success')::boolean,
    'referrer_id', p_referrer_id,
    'referred_id', p_referred_id,
    'amount', p_amount,
    'type', p_type,
    'distribution_result', result,
    'verification_before', verification_before,
    'verification_after', verification_after,
    'earnings_increased', 
      (verification_after ->> 'referral_earnings')::numeric > 
      (verification_before ->> 'referral_earnings')::numeric
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if the referral trigger is working
CREATE OR REPLACE FUNCTION check_referral_trigger_functionality()
RETURNS jsonb AS $$
DECLARE
  test_referrer_id text;
  test_referred_id text;
  initial_count integer;
  after_insert_count integer;
  after_delete_count integer;
  referral_id uuid;
BEGIN
  -- Find a user to test with (or create one if needed)
  SELECT id FROM users ORDER BY created_at DESC LIMIT 1 INTO test_referrer_id;
  
  IF test_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No users found for testing');
  END IF;
  
  -- Create a temporary test user as the referred user
  INSERT INTO users (
    id, 
    username, 
    discriminator, 
    avatar, 
    account_age, 
    join_date, 
    multiplier
  ) VALUES (
    'test_referred_' || floor(random() * 1000000)::text,
    'TestUser' || floor(random() * 1000)::text,
    '0000',
    'https://cdn.discordapp.com/embed/avatars/0.png',
    1.0,
    now(),
    1.0
  ) RETURNING id INTO test_referred_id;

  -- Get initial count
  SELECT total_referrals FROM users WHERE id = test_referrer_id INTO initial_count;
  
  -- Create a test referral
  INSERT INTO referrals (referrer_id, referred_id, bonus_amount)
  VALUES (test_referrer_id, test_referred_id, 10)
  RETURNING id INTO referral_id;
  
  -- Get count after insert
  SELECT total_referrals FROM users WHERE id = test_referrer_id INTO after_insert_count;
  
  -- Delete the test referral
  DELETE FROM referrals WHERE id = referral_id;
  
  -- Get count after delete
  SELECT total_referrals FROM users WHERE id = test_referrer_id INTO after_delete_count;
  
  -- Clean up test user
  DELETE FROM users WHERE id = test_referred_id;
  
  -- Return test results
  RETURN jsonb_build_object(
    'success', true,
    'test_referrer_id', test_referrer_id,
    'initial_count', initial_count,
    'after_insert_count', after_insert_count,
    'after_delete_count', after_delete_count,
    'insert_trigger_working', after_insert_count = initial_count + 1,
    'delete_trigger_working', after_delete_count = initial_count,
    'trigger_functionality', CASE
      WHEN after_insert_count = initial_count + 1 AND after_delete_count = initial_count THEN 'WORKING CORRECTLY'
      WHEN after_insert_count = initial_count + 1 THEN 'INSERT WORKS, DELETE FAILS'
      WHEN after_delete_count = initial_count THEN 'DELETE WORKS, INSERT FAILS'
      ELSE 'NOT WORKING'
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION test_referral_count_update() TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION simulate_referral_earnings(text, text, numeric, text) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION check_referral_trigger_functionality() TO authenticated, anon, public;

-- Add comments for documentation
COMMENT ON FUNCTION test_referral_count_update() IS 'Test if referral count updates correctly when a new referral is added';
COMMENT ON FUNCTION simulate_referral_earnings(text, text, numeric, text) IS 'Simulate referral earnings to test the distribution system';
COMMENT ON FUNCTION check_referral_trigger_functionality() IS 'Check if the referral trigger correctly updates counts on insert and delete';