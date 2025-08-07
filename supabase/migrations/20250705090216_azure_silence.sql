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

-- Create function to get leaderboard with pagination
CREATE OR REPLACE FUNCTION get_paginated_leaderboard(
  p_period text DEFAULT 'all-time',
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS jsonb AS $$
DECLARE
  leaderboard_data jsonb;
  total_count integer;
  order_column text;
BEGIN
  -- Determine which column to order by based on period
  CASE p_period
    WHEN 'weekly' THEN order_column := 'weekly_earnings';
    WHEN 'monthly' THEN order_column := 'monthly_earnings';
    ELSE order_column := 'total_earned';
  END CASE;

  -- Get total count for pagination info
  EXECUTE format('SELECT COUNT(*) FROM users WHERE %I > 0', order_column) INTO total_count;

  -- Get leaderboard data using the appropriate column
  EXECUTE format('
    SELECT jsonb_agg(
      jsonb_build_object(
        ''rank'', row_number() OVER (ORDER BY %I DESC),
        ''username'', username,
        ''avatar'', avatar,
        ''total_earned'', %I,
        ''account_age'', account_age,
        ''is_active'', is_node_active,
        ''weekly_earnings'', weekly_earnings,
        ''user_id'', id
      )
    )
    FROM (
      SELECT *
      FROM users
      WHERE %I > 0
      ORDER BY %I DESC
      LIMIT %L
      OFFSET %L
    ) ranked_users',
    order_column, order_column, order_column, order_column, p_limit, p_offset
  ) INTO leaderboard_data;

  -- Get statistics
  RETURN jsonb_build_object(
    'leaderboard', COALESCE(leaderboard_data, '[]'::jsonb),
    'total_count', total_count,
    'period', p_period,
    'limit', p_limit,
    'offset', p_offset,
    'page', (p_offset / p_limit) + 1,
    'total_pages', CEIL(total_count::numeric / p_limit)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_current_leaderboard_stats() TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION get_paginated_leaderboard(text, integer, integer) TO authenticated, anon, public;

-- Add comments for documentation
COMMENT ON FUNCTION get_current_leaderboard_stats() IS 'Get current leaderboard statistics for frontend display';
COMMENT ON FUNCTION get_paginated_leaderboard(text, integer, integer) IS 'Get paginated leaderboard data with total count for pagination';