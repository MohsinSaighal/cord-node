/*
  # Fix Mining Sessions RLS Policy

  1. Security Changes
    - Update mining_sessions RLS policies to work with anonymous auth + Discord metadata
    - Allow users to access their mining sessions based on Discord ID stored in auth metadata
    - Maintain security while enabling proper functionality

  2. Policy Updates
    - Update existing policies to check auth.jwt() -> 'user_metadata' -> 'discord_id'
    - This allows anonymous auth users with Discord metadata to access their data
*/

-- Drop existing mining sessions policies
DROP POLICY IF EXISTS "Users can read own mining sessions" ON mining_sessions;
DROP POLICY IF EXISTS "Users can insert own mining sessions" ON mining_sessions;
DROP POLICY IF EXISTS "Users can update own mining sessions" ON mining_sessions;

-- Create new policies that work with Discord metadata in anonymous auth
CREATE POLICY "Users can read own mining sessions"
  ON mining_sessions
  FOR SELECT
  TO authenticated, anon
  USING (
    user_id = COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'discord_id'),
      auth.uid()::text
    )
  );

CREATE POLICY "Users can insert own mining sessions"
  ON mining_sessions
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    user_id = COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'discord_id'),
      auth.uid()::text
    )
  );

CREATE POLICY "Users can update own mining sessions"
  ON mining_sessions
  FOR UPDATE
  TO authenticated, anon
  USING (
    user_id = COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'discord_id'),
      auth.uid()::text
    )
  );

-- Also update other table policies to be consistent
-- Update users policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated, anon
  USING (
    id = COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'discord_id'),
      auth.uid()::text
    )
  );

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated, anon
  USING (
    id = COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'discord_id'),
      auth.uid()::text
    )
  );

CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    id = COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'discord_id'),
      auth.uid()::text
    )
  );

-- Update user_tasks policies
DROP POLICY IF EXISTS "Users can read own tasks" ON user_tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON user_tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON user_tasks;

CREATE POLICY "Users can read own tasks"
  ON user_tasks
  FOR SELECT
  TO authenticated, anon
  USING (
    user_id = COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'discord_id'),
      auth.uid()::text
    )
  );

CREATE POLICY "Users can insert own tasks"
  ON user_tasks
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    user_id = COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'discord_id'),
      auth.uid()::text
    )
  );

CREATE POLICY "Users can update own tasks"
  ON user_tasks
  FOR UPDATE
  TO authenticated, anon
  USING (
    user_id = COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'discord_id'),
      auth.uid()::text
    )
  );

-- Update user_settings policies
DROP POLICY IF EXISTS "Users can read own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;

CREATE POLICY "Users can read own settings"
  ON user_settings
  FOR SELECT
  TO authenticated, anon
  USING (
    user_id = COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'discord_id'),
      auth.uid()::text
    )
  );

CREATE POLICY "Users can insert own settings"
  ON user_settings
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    user_id = COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'discord_id'),
      auth.uid()::text
    )
  );

CREATE POLICY "Users can update own settings"
  ON user_settings
  FOR UPDATE
  TO authenticated, anon
  USING (
    user_id = COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'discord_id'),
      auth.uid()::text
    )
  );

-- Update referrals policies
DROP POLICY IF EXISTS "Users can read own referrals" ON referrals;
DROP POLICY IF EXISTS "Users can insert referrals" ON referrals;

CREATE POLICY "Users can read own referrals"
  ON referrals
  FOR SELECT
  TO authenticated, anon
  USING (
    referrer_id = COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'discord_id'),
      auth.uid()::text
    ) OR 
    referred_id = COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'discord_id'),
      auth.uid()::text
    )
  );

CREATE POLICY "Users can insert referrals"
  ON referrals
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    referred_id = COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'discord_id'),
      auth.uid()::text
    )
  );