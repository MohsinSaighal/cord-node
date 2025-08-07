/*
  # Insert Default Tasks

  1. Insert default tasks for the application
    - Daily tasks (check-in, mining)
    - Weekly tasks (referrals, earnings goals)
    - Social media tasks (one-time only)
    - Achievement tasks (account age, efficiency)

  2. Tasks are designed to be reusable and reset based on their type
*/

-- Insert default tasks
INSERT INTO tasks (id, title, description, reward, type, max_progress, social_url) VALUES
  ('daily-checkin', 'Daily Check-in', 'Log in to CordNode and claim your daily bonus', 10, 'daily', 1, NULL),
  ('mine-1-hour', 'Mine for 1 Hour', 'Keep your node active for at least 1 hour', 25, 'daily', 3600, NULL),
  ('twitter-follow', 'Follow on Twitter', 'Follow @CordNode on Twitter for updates', 50, 'social', 1, 'https://twitter.com/intent/follow?screen_name=cordnode'),
  ('twitter-retweet', 'Retweet Announcement', 'Retweet our latest announcement', 30, 'social', 1, 'https://twitter.com/intent/retweet?tweet_id=1234567890'),
  ('telegram-join', 'Join Telegram Channel', 'Join our official Telegram channel', 40, 'social', 1, 'https://t.me/cordnode_official'),
  ('discord-join', 'Join Discord Server', 'Join our community Discord server', 60, 'social', 1, 'https://discord.gg/cordnode'),
  ('invite-friends', 'Invite Friends', 'Invite 3 friends to join CordNode', 100, 'weekly', 3, NULL),
  ('efficiency-master', 'Node Efficiency Master', 'Maintain 90%+ efficiency for 24 hours', 200, 'achievement', 86400, NULL),
  ('early-adopter', 'Early Adopter', 'Join CordNode community (Discord account 5+ years)', 500, 'achievement', 1, NULL),
  ('weekly-mining', 'Weekly Mining Goal', 'Earn 1000 CORD from mining this week', 150, 'weekly', 1000, NULL),
  ('social-media-master', 'Social Media Master', 'Complete all social media tasks', 300, 'achievement', 4, NULL)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  reward = EXCLUDED.reward,
  type = EXCLUDED.type,
  max_progress = EXCLUDED.max_progress,
  social_url = EXCLUDED.social_url,
  is_active = true;