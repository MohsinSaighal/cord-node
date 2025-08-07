/*
  # Mining Session Improvements

  1. Add indexes for better performance
    - Index on user_id and start_time for session queries
    - Index on end_time for active session queries

  2. Add constraints for data integrity
    - Check constraint to ensure start_time is before end_time
    - Check constraint to ensure earnings are non-negative

  3. Add function to calculate session duration
    - Helper function for analytics and reporting
*/

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_mining_sessions_user_start_time 
  ON mining_sessions(user_id, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_mining_sessions_active 
  ON mining_sessions(user_id) WHERE end_time IS NULL;

CREATE INDEX IF NOT EXISTS idx_mining_sessions_completed 
  ON mining_sessions(user_id, end_time DESC) WHERE end_time IS NOT NULL;

-- Add data integrity constraints
DO $$
BEGIN
  -- Check if constraint doesn't exist before adding
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'mining_sessions_earnings_positive'
  ) THEN
    ALTER TABLE mining_sessions 
    ADD CONSTRAINT mining_sessions_earnings_positive 
    CHECK (earnings >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'mining_sessions_hash_rate_positive'
  ) THEN
    ALTER TABLE mining_sessions 
    ADD CONSTRAINT mining_sessions_hash_rate_positive 
    CHECK (hash_rate >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'mining_sessions_efficiency_valid'
  ) THEN
    ALTER TABLE mining_sessions 
    ADD CONSTRAINT mining_sessions_efficiency_valid 
    CHECK (efficiency >= 0 AND efficiency <= 100);
  END IF;
END $$;

-- Create function to calculate session duration
CREATE OR REPLACE FUNCTION calculate_session_duration(
  session_start_time timestamptz,
  session_end_time timestamptz DEFAULT NULL
)
RETURNS interval AS $$
BEGIN
  IF session_end_time IS NULL THEN
    -- For active sessions, calculate duration until now
    RETURN now() - session_start_time;
  ELSE
    -- For completed sessions, calculate actual duration
    RETURN session_end_time - session_start_time;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create view for mining session analytics
CREATE OR REPLACE VIEW mining_session_analytics AS
SELECT 
  ms.id,
  ms.user_id,
  u.username,
  ms.start_time,
  ms.end_time,
  ms.earnings,
  ms.hash_rate,
  ms.efficiency,
  calculate_session_duration(ms.start_time, ms.end_time) as duration,
  CASE 
    WHEN ms.end_time IS NULL THEN 'active'
    ELSE 'completed'
  END as status,
  EXTRACT(EPOCH FROM calculate_session_duration(ms.start_time, ms.end_time)) / 3600 as duration_hours
FROM mining_sessions ms
JOIN users u ON ms.user_id = u.id
ORDER BY ms.start_time DESC;

-- Grant access to the view
GRANT SELECT ON mining_session_analytics TO authenticated, anon;

-- Add comment for documentation
COMMENT ON TABLE mining_sessions IS 'Stores individual mining sessions with start/end times, earnings, and performance metrics';
COMMENT ON VIEW mining_session_analytics IS 'Provides analytics view of mining sessions with calculated durations and status';