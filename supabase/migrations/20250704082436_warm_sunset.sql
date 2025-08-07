/*
  # Update Social Tasks with Correct Links

  1. Update existing social tasks with correct URLs
  2. Remove unwanted social tasks (Reddit, GitHub, YouTube)
  3. Keep only Telegram, Twitter/X, and Discord
*/

-- Update existing social tasks with correct URLs
UPDATE tasks SET 
  social_url = 'https://t.me/cordnode',
  description = 'Join our official Telegram channel for updates and community discussions'
WHERE id = 'telegram-join';

UPDATE tasks SET 
  social_url = 'https://x.com/CordNodeAI?t=wBanNrlWtUVffZ3isqAkfA&s=09',
  title = 'Follow on X (Twitter)',
  description = 'Follow @CordNodeAI on X (Twitter) for the latest updates and announcements'
WHERE id = 'twitter-follow';

UPDATE tasks SET 
  social_url = 'https://x.com/CordNodeAI?t=wBanNrlWtUVffZ3isqAkfA&s=09',
  title = 'Retweet Our Post',
  description = 'Retweet our pinned post to help spread the word about CordNode'
WHERE id = 'twitter-retweet';

UPDATE tasks SET 
  social_url = 'https://discord.gg/DPF4qafd7t',
  description = 'Join our Discord server to connect with the CordNode community'
WHERE id = 'discord-join';

-- Remove unwanted social tasks
UPDATE tasks SET is_active = false WHERE id IN ('youtube-subscribe', 'reddit-join', 'github-star');

-- Update social media master task to require only 4 tasks (the remaining ones)
UPDATE tasks SET 
  max_progress = 4,
  description = 'Complete all 4 social media tasks to unlock this massive bonus'
WHERE id = 'social-media-master';

-- Clean up any user task records for the removed tasks
DELETE FROM user_tasks WHERE task_id IN ('youtube-subscribe', 'reddit-join', 'github-star');