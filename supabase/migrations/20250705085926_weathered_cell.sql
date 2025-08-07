/*
  # Fix Total Miners Display and Statistics

  1. Create functions to get accurate miner statistics
  2. Fix timestamp comparisons by properly handling data types
  3. Add performance indexes
  4. Create views for easy access to statistics
  5. Add helper functions for user activity tracking
*/

-- Create function to get accurate miner statistics
CREATE OR REPLACE FUNCTION get_miner_statistics()
RETURNS jsonb AS $$
DECLARE
  total_miners integer;
  active_miners integer;
  currently_mining integer;
  total_earned_sum numeric;
  top_earner_amount numeric;
  miners_last_24h integer;
  miners_this_week integer;
  last_24h_timestamp timestamptz;
  last_week_timestamp timestamptz;
BEGIN
  -- Calculate timestamps for comparisons
  last_24h_timestamp := now() - interval '24 hours';
  last_week_timestamp := now() - interval '7 days';

  -- Get total number of miners (all users)
  SELECT COUNT(*) FROM users INTO total_miners;
  
  -- Get currently mining users
  SELECT COUNT(*) FROM users WHERE is_node_active = true INTO currently_mining;
  
  -- Get active miners (users who have mined recently OR currently have active nodes)
  SELECT COUNT(DISTINCT u.id) 
  FROM users u
  LEFT JOIN mining_sessions ms ON u.id = ms.user_id
  WHERE u.is_node_active = true 
     OR ms.start_time > last_24h_timestamp
  INTO active_miners;
  
  -- Get total CORD earned across all users
  SELECT COALESCE(SUM(total_earned), 0) FROM users INTO total_earned_sum;
  
  -- Get top earner amount
  SELECT COALESCE(MAX(total_earned), 0) FROM users INTO top_earner_amount;
  
  -- Get miners who were active in last 24 hours
  -- last_login_time is already timestamptz, so compare directly
  SELECT COUNT(DISTINCT u.id)
  FROM users u
  LEFT JOIN mining_sessions ms ON u.id = ms.user_id
  WHERE ms.start_time > last_24h_timestamp
     OR u.last_login_time > last_24h_timestamp
  INTO miners_last_24h;
  
  -- Get miners who were active this week
  SELECT COUNT(DISTINCT u.id)
  FROM users u
  LEFT JOIN mining_sessions ms ON u.id = ms.user_id
  WHERE ms.start_time > last_week_timestamp
     OR u.last_login_time > last_week_timestamp
  INTO miners_this_week;
  
  RETURN jsonb_build_object(
    'total_miners', total_miners,
    'active_miners', active_miners,
    'currently_mining', currently_mining,
    'total_earned_sum', total_earned_sum,
    'top_earner_amount', top_earner_amount,
    'miners_last_24h', miners_last_24h,
    'miners_this_week', miners_this_week,
    'last_updated', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get leaderboard with accurate statistics
CREATE OR REPLACE FUNCTION get_leaderboard_with_stats(
  p_period text DEFAULT 'all-time',
  p_limit integer DEFAULT 20
)
RETURNS jsonb AS $$
DECLARE
  leaderboard_data jsonb;
  stats_data jsonb;
BEGIN
  -- Get leaderboard data using a safer approach
  IF p_period = 'weekly' THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'rank', row_number() OVER (ORDER BY weekly_earnings DESC),
        'username', username,
        'avatar', avatar,
        'total_earned', weekly_earnings,
        'account_age', account_age,
        'is_active', is_node_active,
        'weekly_earnings', weekly_earnings,
        'user_id', id
      )
    )
    FROM (
      SELECT *
      FROM users
      ORDER BY weekly_earnings DESC
      LIMIT p_limit
    ) ranked_users
    INTO leaderboard_data;
  ELSIF p_period = 'monthly' THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'rank', row_number() OVER (ORDER BY monthly_earnings DESC),
        'username', username,
        'avatar', avatar,
        'total_earned', monthly_earnings,
        'account_age', account_age,
        'is_active', is_node_active,
        'weekly_earnings', weekly_earnings,
        'user_id', id
      )
    )
    FROM (
      SELECT *
      FROM users
      ORDER BY monthly_earnings DESC
      LIMIT p_limit
    ) ranked_users
    INTO leaderboard_data;
  ELSE
    SELECT jsonb_agg(
      jsonb_build_object(
        'rank', row_number() OVER (ORDER BY total_earned DESC),
        'username', username,
        'avatar', avatar,
        'total_earned', total_earned,
        'account_age', account_age,
        'is_active', is_node_active,
        'weekly_earnings', weekly_earnings,
        'user_id', id
      )
    )
    FROM (
      SELECT *
      FROM users
      ORDER BY total_earned DESC
      LIMIT p_limit
    ) ranked_users
    INTO leaderboard_data;
  END IF;

  -- Get statistics
  SELECT get_miner_statistics() INTO stats_data;

  -- Combine leaderboard and stats
  RETURN jsonb_build_object(
    'leaderboard', COALESCE(leaderboard_data, '[]'::jsonb),
    'statistics', stats_data,
    'period', p_period,
    'limit', p_limit
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create simple indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_node_active_simple ON users(is_node_active);
CREATE INDEX IF NOT EXISTS idx_users_last_login_desc ON users(last_login_time);
CREATE INDEX IF NOT EXISTS idx_users_total_earned_desc ON users(total_earned);
CREATE INDEX IF NOT EXISTS idx_users_weekly_earnings_desc ON users(weekly_earnings);
CREATE INDEX IF NOT EXISTS idx_users_monthly_earnings_desc ON users(monthly_earnings);
CREATE INDEX IF NOT EXISTS idx_mining_sessions_start_time_desc ON mining_sessions(start_time);

-- Create a view for easy access to miner statistics
CREATE OR REPLACE VIEW miner_statistics_view AS
SELECT 
  (SELECT COUNT(*) FROM users) as total_miners,
  (SELECT COUNT(*) FROM users WHERE is_node_active = true) as currently_mining,
  (SELECT COUNT(DISTINCT u.id) 
   FROM users u 
   LEFT JOIN mining_sessions ms ON u.id = ms.user_id 
   WHERE u.is_node_active = true 
      OR ms.start_time > now() - interval '24 hours') as active_last_24h,
  (SELECT COUNT(DISTINCT u.id) 
   FROM users u 
   LEFT JOIN mining_sessions ms ON u.id = ms.user_id 
   WHERE ms.start_time > now() - interval '7 days'
      OR u.last_login_time > now() - interval '7 days') as active_this_week,
  (SELECT COALESCE(SUM(total_earned), 0) FROM users) as total_cord_earned,
  (SELECT COALESCE(MAX(total_earned), 0) FROM users) as top_earner_amount,
  now() as last_updated;

-- Create a function to refresh user activity status
CREATE OR REPLACE FUNCTION refresh_user_activity_status()
RETURNS jsonb AS $$
DECLARE
  updated_count integer;
BEGIN
  -- Update users who should be marked as active based on recent mining
  UPDATE users 
  SET 
    is_node_active = true,
    updated_at = now()
  WHERE id IN (
    SELECT DISTINCT ms.user_id 
    FROM mining_sessions ms 
    WHERE ms.end_time IS NULL 
    AND ms.start_time > now() - interval '1 hour'
  ) AND is_node_active = false;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User activity status refreshed',
    'updated_users', updated_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get simple leaderboard data
CREATE OR REPLACE FUNCTION get_simple_leaderboard(
  p_period text DEFAULT 'all-time',
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  rank bigint,
  username text,
  avatar text,
  total_earned numeric,
  account_age numeric,
  is_active boolean,
  weekly_earnings numeric,
  user_id text
) AS $$
BEGIN
  IF p_period = 'weekly' THEN
    RETURN QUERY
    SELECT 
      row_number() OVER (ORDER BY u.weekly_earnings DESC) as rank,
      u.username,
      u.avatar,
      u.weekly_earnings as total_earned,
      u.account_age,
      u.is_node_active as is_active,
      u.weekly_earnings,
      u.id as user_id
    FROM users u
    ORDER BY u.weekly_earnings DESC
    LIMIT p_limit;
  ELSIF p_period = 'monthly' THEN
    RETURN QUERY
    SELECT 
      row_number() OVER (ORDER BY u.monthly_earnings DESC) as rank,
      u.username,
      u.avatar,
      u.monthly_earnings as total_earned,
      u.account_age,
      u.is_node_active as is_active,
      u.weekly_earnings,
      u.id as user_id
    FROM users u
    ORDER BY u.monthly_earnings DESC
    LIMIT p_limit;
  ELSE
    RETURN QUERY
    SELECT 
      row_number() OVER (ORDER BY u.total_earned DESC) as rank,
      u.username,
      u.avatar,
      u.total_earned,
      u.account_age,
      u.is_node_active as is_active,
      u.weekly_earnings,
      u.id as user_id
    FROM users u
    ORDER BY u.total_earned DESC
    LIMIT p_limit;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user activity status
CREATE OR REPLACE FUNCTION get_user_activity_status(p_user_id text)
RETURNS jsonb AS $$
DECLARE
  user_record record;
  last_mining_session record;
  is_recently_active boolean;
BEGIN
  -- Get user data
  SELECT * FROM users WHERE id = p_user_id INTO user_record;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;

  -- Get last mining session
  SELECT * FROM mining_sessions 
  WHERE user_id = p_user_id 
  ORDER BY start_time DESC 
  LIMIT 1 
  INTO last_mining_session;

  -- Check if user was recently active (last 24 hours)
  -- last_login_time is already timestamptz, so compare directly
  is_recently_active := (
    user_record.is_node_active OR
    user_record.last_login_time > now() - interval '24 hours' OR
    (last_mining_session.start_time IS NOT NULL AND last_mining_session.start_time > now() - interval '24 hours')
  );

  RETURN jsonb_build_object(
    'user_id', p_user_id,
    'is_node_active', user_record.is_node_active,
    'last_login', user_record.last_login_time,
    'last_mining_session', last_mining_session.start_time,
    'is_recently_active', is_recently_active,
    'total_earned', user_record.total_earned,
    'weekly_earnings', user_record.weekly_earnings,
    'monthly_earnings', user_record.monthly_earnings
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get current leaderboard statistics for frontend
CREATE OR REPLACE FUNCTION get_current_leaderboard_stats()
RETURNS jsonb AS $$
DECLARE
  total_miners integer;
  active_miners integer;
  top_earner numeric;
BEGIN
  -- Get basic statistics
  SELECT COUNT(*) FROM users INTO total_miners;
  SELECT COUNT(*) FROM users WHERE is_node_active = true INTO active_miners;
  SELECT COALESCE(MAX(total_earned), 0) FROM users INTO top_earner;
  
  RETURN jsonb_build_object(
    'totalMiners', total_miners,
    'activeMiners', active_miners,
    'topEarner', top_earner,
    'lastUpdated', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_miner_statistics() TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION get_leaderboard_with_stats(text, integer) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION get_simple_leaderboard(text, integer) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION refresh_user_activity_status() TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION get_user_activity_status(text) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION get_current_leaderboard_stats() TO authenticated, anon, public;
GRANT SELECT ON miner_statistics_view TO authenticated, anon, public;

-- Add comments for documentation
COMMENT ON FUNCTION get_miner_statistics() IS 'Get comprehensive statistics about miners including total, active, and earnings data';
COMMENT ON FUNCTION get_leaderboard_with_stats(text, integer) IS 'Get leaderboard data with accurate miner statistics';
COMMENT ON FUNCTION get_simple_leaderboard(text, integer) IS 'Get simple leaderboard data without complex JSON aggregation';
COMMENT ON FUNCTION get_user_activity_status(text) IS 'Get detailed activity status for a specific user';
COMMENT ON FUNCTION get_current_leaderboard_stats() IS 'Get current leaderboard statistics for frontend display';
COMMENT ON VIEW miner_statistics_view IS 'Real-time view of miner statistics for dashboard display';
COMMENT ON FUNCTION refresh_user_activity_status() IS 'Refresh user activity status based on recent mining sessions';

-- Log completion
DO $$
DECLARE
  current_stats jsonb;
BEGIN
  SELECT get_current_leaderboard_stats() INTO current_stats;
  RAISE NOTICE 'Total miners display fix completed. Current stats: %', current_stats;
END $$;