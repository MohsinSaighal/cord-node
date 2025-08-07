/*
  # Fix user registration RLS policy

  1. Security Changes
    - Add policy to allow anonymous users to insert new user records during registration
    - This is necessary for Discord OAuth flow where users need to create their profile
      before being fully authenticated with Supabase
    - The policy is restrictive and only allows insertion, not reading or updating

  2. Notes
    - This policy works alongside the existing authenticated user policies
    - Anonymous users can only insert, they cannot read or update user data
    - Once authenticated, users follow the existing policies for their own data
*/

-- Allow anonymous users to insert new user records during registration
CREATE POLICY "Allow anon to create user profile during registration"
  ON users
  FOR INSERT
  TO anon
  WITH CHECK (true);