/*
  # Update task rewards and add new social tasks

  1. Update existing tasks with better rewards
  2. Add new social media tasks
  3. Ensure all tasks are properly configured
*/

-- Update existing tasks with better rewards and descriptions
UPDATE tasks SET 
  reward = 15,
  description = 'Log in to CordNode daily and claim your bonus - streak bonuses coming soon!'
WHERE id = 'daily-checkin';

UPDATE tasks SET 
  reward = 35,
  description = 'Keep your mining node active for 1 hour straight to earn this reward'
WHERE id = 'mine-1-hour';

UPDATE tasks SET 
  reward = 75,
  description = 'Follow @CordNode on Twitter for the latest updates and announcements'
WHERE id = 'twitter-follow';

UPDATE tasks SET 
  reward = 50,
  description = 'Retweet our pinned announcement to help spread the word'
WHERE id = 'twitter-retweet';

UPDATE tasks SET 
  reward = 60,
  description = 'Join our Telegram channel for exclusive updates and community discussions'
WHERE id = 'telegram-join';

UPDATE tasks SET 
  reward = 80,
  description = 'Join our Discord server to connect with the CordNode community'
WHERE id = 'discord-join';

UPDATE tasks SET 
  reward = 150,
  description = 'Successfully refer 3 friends to join CordNode and start earning'
WHERE id = 'invite-friends';

UPDATE tasks SET 
  reward = 300,
  description = 'Maintain 90%+ node efficiency for 24 consecutive hours'
WHERE id = 'efficiency-master';

UPDATE tasks SET 
  reward = 750,
  description = 'Exclusive reward for Discord veterans (5+ year accounts)'
WHERE id = 'early-adopter';

UPDATE tasks SET 
  reward = 200,
  description = 'Earn 1000 CORD from mining activities this week'
WHERE id = 'weekly-mining';

UPDATE tasks SET 
  reward = 500,
  description = 'Complete all available social media tasks to unlock this bonus'
WHERE id = 'social-media-master';

-- Insert additional social media tasks
INSERT INTO tasks (id, title, description, reward, type, max_progress, social_url, is_active) VALUES
  ('youtube-subscribe', 'Subscribe to YouTube', 'Subscribe to our YouTube channel for tutorials and updates', 65, 'social', 1, 'https://youtube.com/@cordnode', true),
  ('reddit-join', 'Join Reddit Community', 'Join our Reddit community for discussions and support', 45, 'social', 1, 'https://reddit.com/r/cordnode', true),
  ('github-star', 'Star on GitHub', 'Star our GitHub repository to show your support', 40, 'social', 1, 'https://github.com/cordnode/cordnode', true)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  reward = EXCLUDED.reward,
  social_url = EXCLUDED.social_url,
  is_active = true;

-- Update social media master task to require more tasks
UPDATE tasks SET 
  max_progress = 7,
  description = 'Complete all 7 social media tasks to unlock this massive bonus'
WHERE id = 'social-media-master';