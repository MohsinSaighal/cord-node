/*
  # Update Twitter Retweet Task URL

  1. Update the twitter-retweet task with the new specific post URL
  2. Update the description to reflect the specific post
*/

-- Update the twitter-retweet task with the new specific post URL
UPDATE tasks 
SET 
  social_url = 'https://x.com/CordNodeAI/status/1941351024419275242?t=lw9VUnYVrPUBTcFU0IYXCg&s=19',
  description = 'Retweet our specific post to help spread the word about CordNode'
WHERE id = 'twitter-retweet';

-- Verify the update was successful
DO $$
DECLARE
  task_record record;
BEGIN
  SELECT id, title, description, social_url 
  FROM tasks 
  WHERE id = 'twitter-retweet'
  INTO task_record;
  
  IF FOUND THEN
    RAISE NOTICE 'Task updated successfully: % - %', task_record.title, task_record.social_url;
  ELSE
    RAISE NOTICE 'Task twitter-retweet not found';
  END IF;
END $$;