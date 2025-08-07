/*
  # CordNode Database Schema

  1. New Tables
    - `users`
      - `id` (text, primary key) - Discord user ID
      - `username` (text) - Discord username
      - `discriminator` (text) - Discord discriminator
      - `avatar` (text) - Avatar URL
      - `account_age` (numeric) - Account age in years
      - `join_date` (timestamptz) - Discord account creation date
      - `multiplier` (numeric) - Earning multiplier
      - `total_earned` (numeric) - Total CORD earned
      - `current_balance` (numeric) - Current CORD balance
      - `is_node_active` (boolean) - Mining node status
      - `node_start_time` (timestamptz) - When node was started
      - `tasks_completed` (integer) - Number of tasks completed
      - `rank` (integer) - User rank
      - `last_login_time` (timestamptz) - Last login timestamp
      - `daily_checkin_claimed` (boolean) - Daily check-in status
      - `weekly_earnings` (numeric) - Weekly earnings
      - `monthly_earnings` (numeric) - Monthly earnings
      - `referral_code` (text) - User's referral code
      - `referred_by` (text) - ID of referring user
      - `referral_earnings` (numeric) - Earnings from referrals
      - `total_referrals` (integer) - Number of successful referrals
      - `created_at` (timestamptz) - Record creation time
      - `updated_at` (timestamptz) - Last update time

    - `tasks`
      - `id` (text, primary key) - Task ID
      - `title` (text) - Task title
      - `description` (text) - Task description
      - `reward` (numeric) - Task reward amount
      - `type` (text) - Task type (daily, weekly, social, achievement)
      - `max_progress` (integer) - Maximum progress value
      - `expires_at` (timestamptz) - Task expiration time
      - `social_url` (text) - URL for social tasks
      - `is_active` (boolean) - Whether task is active
      - `created_at` (timestamptz) - Task creation time

    - `user_tasks`
      - `id` (uuid, primary key)
      - `user_id` (text) - Reference to users table
      - `task_id` (text) - Reference to tasks table
      - `completed` (boolean) - Completion status
      - `progress` (integer) - Current progress
      - `claimed_at` (timestamptz) - When reward was claimed
      - `created_at` (timestamptz) - Record creation time
      - `updated_at` (timestamptz) - Last update time

    - `user_settings`
      - `id` (uuid, primary key)
      - `user_id` (text) - Reference to users table
      - `notifications` (jsonb) - Notification preferences
      - `privacy` (jsonb) - Privacy settings
      - `mining` (jsonb) - Mining configuration
      - `display` (jsonb) - Display preferences
      - `created_at` (timestamptz) - Record creation time
      - `updated_at` (timestamptz) - Last update time

    - `mining_sessions`
      - `id` (uuid, primary key)
      - `user_id` (text) - Reference to users table
      - `start_time` (timestamptz) - Session start time
      - `end_time` (timestamptz) - Session end time
      - `earnings` (numeric) - Earnings from session
      - `hash_rate` (numeric) - Average hash rate
      - `efficiency` (numeric) - Average efficiency
      - `created_at` (timestamptz) - Record creation time

    - `referrals`
      - `id` (uuid, primary key)
      - `referrer_id` (text) - ID of referring user
      - `referred_id` (text) - ID of referred user
      - `bonus_amount` (numeric) - Bonus amount earned
      - `created_at` (timestamptz) - Referral creation time

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data
    - Add policies for public leaderboard access

  3. Indexes
    - Add indexes for frequently queried columns
    - Add composite indexes for complex queries
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  username text NOT NULL,
  discriminator text NOT NULL,
  avatar text NOT NULL,
  account_age numeric NOT NULL DEFAULT 0,
  join_date timestamptz NOT NULL,
  multiplier numeric NOT NULL DEFAULT 1,
  total_earned numeric NOT NULL DEFAULT 0,
  current_balance numeric NOT NULL DEFAULT 0,
  is_node_active boolean NOT NULL DEFAULT false,
  node_start_time timestamptz,
  tasks_completed integer NOT NULL DEFAULT 0,
  rank integer NOT NULL DEFAULT 0,
  last_login_time timestamptz NOT NULL DEFAULT now(),
  daily_checkin_claimed boolean NOT NULL DEFAULT false,
  weekly_earnings numeric NOT NULL DEFAULT 0,
  monthly_earnings numeric NOT NULL DEFAULT 0,
  referral_code text UNIQUE,
  referred_by text,
  referral_earnings numeric NOT NULL DEFAULT 0,
  total_referrals integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  reward numeric NOT NULL DEFAULT 0,
  type text NOT NULL CHECK (type IN ('daily', 'weekly', 'social', 'achievement')),
  max_progress integer NOT NULL DEFAULT 1,
  expires_at timestamptz,
  social_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create user_tasks table
CREATE TABLE IF NOT EXISTS user_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id text NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  progress integer NOT NULL DEFAULT 0,
  claimed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, task_id)
);

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  notifications jsonb NOT NULL DEFAULT '{"mining": true, "tasks": true, "referrals": true, "system": false}',
  privacy jsonb NOT NULL DEFAULT '{"showProfile": true, "showEarnings": false, "showActivity": true}',
  mining jsonb NOT NULL DEFAULT '{"autoStart": false, "intensity": "medium", "offlineEarnings": "8h"}',
  display jsonb NOT NULL DEFAULT '{"theme": "dark", "language": "en", "currency": "CORD"}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create mining_sessions table
CREATE TABLE IF NOT EXISTS mining_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  earnings numeric NOT NULL DEFAULT 0,
  hash_rate numeric NOT NULL DEFAULT 0,
  efficiency numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bonus_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(referrer_id, referred_id)
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mining_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id);

CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = id);

CREATE POLICY "Public leaderboard access"
  ON users
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Tasks policies
CREATE POLICY "Anyone can read active tasks"
  ON tasks
  FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- User tasks policies
CREATE POLICY "Users can read own tasks"
  ON user_tasks
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own tasks"
  ON user_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own tasks"
  ON user_tasks
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id);

-- User settings policies
CREATE POLICY "Users can read own settings"
  ON user_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id);

-- Mining sessions policies
CREATE POLICY "Users can read own mining sessions"
  ON mining_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own mining sessions"
  ON mining_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own mining sessions"
  ON mining_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id);

-- Referrals policies
CREATE POLICY "Users can read own referrals"
  ON referrals
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = referrer_id OR auth.uid()::text = referred_id);

CREATE POLICY "Users can insert referrals"
  ON referrals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = referred_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_total_earned ON users(total_earned DESC);
CREATE INDEX IF NOT EXISTS idx_users_weekly_earnings ON users(weekly_earnings DESC);
CREATE INDEX IF NOT EXISTS idx_users_monthly_earnings ON users(monthly_earnings DESC);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_tasks_user_id ON user_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_task_id ON user_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_mining_sessions_user_id ON mining_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_tasks_updated_at BEFORE UPDATE ON user_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();