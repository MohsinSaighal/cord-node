/*
  # Anti-Cheat System Implementation

  1. New Tables
    - `user_ip_tracking` - Track IP addresses for users
    - `ip_analysis` - Store IP analysis results and penalties

  2. Functions
    - Function to detect and apply IP-based penalties
    - Function to update mining efficiency based on IP sharing
    - Function to get IP statistics

  3. Security
    - Enable RLS on new tables
    - Add policies for user access
    - Add indexes for performance

  4. Anti-Cheat Logic
    - Track user IP addresses during login and mining
    - Detect multiple accounts from same IP
    - Apply progressive penalties to mining efficiency
    - Allow legitimate household sharing with reduced penalties
*/

-- Create user IP tracking table
CREATE TABLE IF NOT EXISTS user_ip_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address inet NOT NULL,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  session_count integer NOT NULL DEFAULT 1,
  is_vpn boolean DEFAULT false,
  is_proxy boolean DEFAULT false,
  country_code text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create IP analysis table
CREATE TABLE IF NOT EXISTS ip_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL UNIQUE,
  user_count integer NOT NULL DEFAULT 0,
  active_user_count integer NOT NULL DEFAULT 0,
  penalty_level integer NOT NULL DEFAULT 0,
  efficiency_multiplier numeric NOT NULL DEFAULT 1.0,
  is_flagged boolean NOT NULL DEFAULT false,
  risk_score numeric NOT NULL DEFAULT 0,
  last_analysis timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_ip_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_ip_tracking
CREATE POLICY "Users can read own IP tracking"
  ON user_ip_tracking
  FOR SELECT
  TO authenticated, anon
  USING (
    user_id = COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'discord_id'),
      auth.uid()::text
    )
  );

CREATE POLICY "System can insert IP tracking"
  ON user_ip_tracking
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "System can update IP tracking"
  ON user_ip_tracking
  FOR UPDATE
  TO authenticated, anon
  USING (true);

-- RLS Policies for ip_analysis (read-only for users)
CREATE POLICY "Users can read IP analysis"
  ON ip_analysis
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "System can manage IP analysis"
  ON ip_analysis
  FOR ALL
  TO authenticated, anon
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_ip_tracking_user_id ON user_ip_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ip_tracking_ip_address ON user_ip_tracking(ip_address);
CREATE INDEX IF NOT EXISTS idx_user_ip_tracking_last_seen ON user_ip_tracking(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_ip_analysis_ip_address ON ip_analysis(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_analysis_user_count ON ip_analysis(user_count DESC);
CREATE INDEX IF NOT EXISTS idx_ip_analysis_penalty_level ON ip_analysis(penalty_level DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_user_ip_tracking_updated_at BEFORE UPDATE ON user_ip_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ip_analysis_updated_at BEFORE UPDATE ON ip_analysis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to track user IP and detect multi-accounting
CREATE OR REPLACE FUNCTION track_user_ip(
  p_user_id text,
  p_ip_address inet,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  existing_tracking record;
  ip_stats record;
  penalty_info record;
  is_new_ip boolean := false;
BEGIN
  -- Input validation
  IF p_user_id IS NULL OR p_ip_address IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid parameters');
  END IF;

  -- Check if this IP is already tracked for this user
  SELECT * FROM user_ip_tracking 
  WHERE user_id = p_user_id AND ip_address = p_ip_address
  INTO existing_tracking;

  IF FOUND THEN
    -- Update existing tracking
    UPDATE user_ip_tracking 
    SET 
      last_seen = now(),
      session_count = session_count + 1,
      updated_at = now()
    WHERE id = existing_tracking.id;
  ELSE
    -- Insert new IP tracking
    INSERT INTO user_ip_tracking (user_id, ip_address, first_seen, last_seen)
    VALUES (p_user_id, p_ip_address, now(), now());
    is_new_ip := true;
  END IF;

  -- Analyze IP for multi-accounting
  PERFORM analyze_ip_for_multi_accounting(p_ip_address);

  -- Get current IP analysis
  SELECT * FROM ip_analysis WHERE ip_address = p_ip_address INTO ip_stats;

  -- Get penalty information
  SELECT 
    penalty_level,
    efficiency_multiplier,
    is_flagged,
    risk_score
  FROM ip_analysis 
  WHERE ip_address = p_ip_address
  INTO penalty_info;

  RETURN jsonb_build_object(
    'success', true,
    'is_new_ip', is_new_ip,
    'user_count', COALESCE(ip_stats.user_count, 1),
    'penalty_level', COALESCE(penalty_info.penalty_level, 0),
    'efficiency_multiplier', COALESCE(penalty_info.efficiency_multiplier, 1.0),
    'is_flagged', COALESCE(penalty_info.is_flagged, false),
    'risk_score', COALESCE(penalty_info.risk_score, 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to analyze IP for multi-accounting patterns
CREATE OR REPLACE FUNCTION analyze_ip_for_multi_accounting(p_ip_address inet)
RETURNS void AS $$
DECLARE
  user_count integer;
  active_user_count integer;
  penalty_level integer := 0;
  efficiency_multiplier numeric := 1.0;
  risk_score numeric := 0;
  is_flagged boolean := false;
BEGIN
  -- Count total users from this IP
  SELECT COUNT(DISTINCT user_id) 
  FROM user_ip_tracking 
  WHERE ip_address = p_ip_address
  INTO user_count;

  -- Count active users (seen in last 24 hours)
  SELECT COUNT(DISTINCT user_id) 
  FROM user_ip_tracking 
  WHERE ip_address = p_ip_address 
  AND last_seen > now() - interval '24 hours'
  INTO active_user_count;

  -- Calculate risk score and penalties
  IF user_count >= 10 THEN
    -- Severe multi-accounting (10+ accounts)
    penalty_level := 4;
    efficiency_multiplier := 0.1; -- 90% reduction
    risk_score := 100;
    is_flagged := true;
  ELSIF user_count >= 6 THEN
    -- High multi-accounting (6-9 accounts)
    penalty_level := 3;
    efficiency_multiplier := 0.3; -- 70% reduction
    risk_score := 80;
    is_flagged := true;
  ELSIF user_count >= 4 THEN
    -- Moderate multi-accounting (4-5 accounts)
    penalty_level := 2;
    efficiency_multiplier := 0.5; -- 50% reduction
    risk_score := 60;
    is_flagged := true;
  ELSIF user_count >= 3 THEN
    -- Light multi-accounting (3 accounts - could be family)
    penalty_level := 1;
    efficiency_multiplier := 0.75; -- 25% reduction
    risk_score := 30;
    is_flagged := false;
  ELSIF user_count = 2 THEN
    -- Two accounts (likely legitimate household)
    penalty_level := 0;
    efficiency_multiplier := 0.9; -- 10% reduction
    risk_score := 10;
    is_flagged := false;
  ELSE
    -- Single account
    penalty_level := 0;
    efficiency_multiplier := 1.0;
    risk_score := 0;
    is_flagged := false;
  END IF;

  -- Additional penalties for high activity from same IP
  IF active_user_count >= 5 THEN
    efficiency_multiplier := efficiency_multiplier * 0.5; -- Additional 50% reduction
    risk_score := LEAST(100, risk_score + 20);
    is_flagged := true;
  ELSIF active_user_count >= 3 THEN
    efficiency_multiplier := efficiency_multiplier * 0.8; -- Additional 20% reduction
    risk_score := LEAST(100, risk_score + 10);
  END IF;

  -- Upsert IP analysis
  INSERT INTO ip_analysis (
    ip_address, 
    user_count, 
    active_user_count, 
    penalty_level, 
    efficiency_multiplier, 
    is_flagged, 
    risk_score,
    last_analysis
  )
  VALUES (
    p_ip_address, 
    user_count, 
    active_user_count, 
    penalty_level, 
    efficiency_multiplier, 
    is_flagged, 
    risk_score,
    now()
  )
  ON CONFLICT (ip_address) 
  DO UPDATE SET
    user_count = EXCLUDED.user_count,
    active_user_count = EXCLUDED.active_user_count,
    penalty_level = EXCLUDED.penalty_level,
    efficiency_multiplier = EXCLUDED.efficiency_multiplier,
    is_flagged = EXCLUDED.is_flagged,
    risk_score = EXCLUDED.risk_score,
    last_analysis = now(),
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's current anti-cheat status
CREATE OR REPLACE FUNCTION get_user_anticheat_status(p_user_id text, p_ip_address inet)
RETURNS jsonb AS $$
DECLARE
  ip_analysis_record record;
  user_ip_count integer;
  other_users_count integer;
BEGIN
  -- Get IP analysis
  SELECT * FROM ip_analysis WHERE ip_address = p_ip_address INTO ip_analysis_record;

  -- Count IPs used by this user
  SELECT COUNT(DISTINCT ip_address) 
  FROM user_ip_tracking 
  WHERE user_id = p_user_id
  INTO user_ip_count;

  -- Count other users on this IP
  SELECT COUNT(DISTINCT user_id) 
  FROM user_ip_tracking 
  WHERE ip_address = p_ip_address AND user_id != p_user_id
  INTO other_users_count;

  RETURN jsonb_build_object(
    'efficiency_multiplier', COALESCE(ip_analysis_record.efficiency_multiplier, 1.0),
    'penalty_level', COALESCE(ip_analysis_record.penalty_level, 0),
    'is_flagged', COALESCE(ip_analysis_record.is_flagged, false),
    'risk_score', COALESCE(ip_analysis_record.risk_score, 0),
    'total_users_on_ip', COALESCE(ip_analysis_record.user_count, 1),
    'other_users_on_ip', other_users_count,
    'user_ip_count', user_ip_count,
    'warning_message', CASE 
      WHEN COALESCE(ip_analysis_record.penalty_level, 0) >= 3 THEN 'Severe multi-accounting detected - mining heavily restricted'
      WHEN COALESCE(ip_analysis_record.penalty_level, 0) = 2 THEN 'Multiple accounts detected - mining efficiency reduced'
      WHEN COALESCE(ip_analysis_record.penalty_level, 0) = 1 THEN 'Shared IP detected - slight efficiency reduction'
      WHEN other_users_count > 0 THEN 'Shared household detected - minor efficiency adjustment'
      ELSE NULL
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get anti-cheat statistics (admin view)
CREATE OR REPLACE FUNCTION get_anticheat_statistics()
RETURNS jsonb AS $$
DECLARE
  total_flagged_ips integer;
  total_affected_users integer;
  penalty_distribution jsonb;
BEGIN
  -- Count flagged IPs
  SELECT COUNT(*) FROM ip_analysis WHERE is_flagged = true INTO total_flagged_ips;

  -- Count affected users
  SELECT COUNT(DISTINCT uit.user_id) 
  FROM user_ip_tracking uit
  JOIN ip_analysis ia ON uit.ip_address = ia.ip_address
  WHERE ia.penalty_level > 0
  INTO total_affected_users;

  -- Get penalty level distribution
  SELECT jsonb_object_agg(penalty_level::text, count)
  FROM (
    SELECT penalty_level, COUNT(*) as count
    FROM ip_analysis
    GROUP BY penalty_level
  ) penalty_counts
  INTO penalty_distribution;

  RETURN jsonb_build_object(
    'total_flagged_ips', total_flagged_ips,
    'total_affected_users', total_affected_users,
    'penalty_distribution', penalty_distribution,
    'last_updated', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION track_user_ip(text, inet, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION analyze_ip_for_multi_accounting(inet) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_anticheat_status(text, inet) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_anticheat_statistics() TO authenticated, anon;

-- Add comments for documentation
COMMENT ON TABLE user_ip_tracking IS 'Tracks IP addresses used by users for anti-cheat detection';
COMMENT ON TABLE ip_analysis IS 'Stores analysis results and penalties for IP addresses with multiple users';
COMMENT ON FUNCTION track_user_ip(text, inet, text) IS 'Track user IP address and update anti-cheat analysis';
COMMENT ON FUNCTION analyze_ip_for_multi_accounting(inet) IS 'Analyze IP address for multi-accounting patterns and apply penalties';
COMMENT ON FUNCTION get_user_anticheat_status(text, inet) IS 'Get current anti-cheat status and penalties for a user';
COMMENT ON FUNCTION get_anticheat_statistics() IS 'Get overall anti-cheat system statistics';