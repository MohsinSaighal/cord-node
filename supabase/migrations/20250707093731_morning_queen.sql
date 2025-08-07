/*
  # Update Discord Server Link

  1. Updates
    - Change the Discord server link to the new URL
    - Ensure the task description remains the same
*/

-- Update the discord-join task with the new Discord server link
UPDATE tasks 
SET 
  social_url = 'https://discord.gg/Y5RMZPcNSy'
WHERE id = 'discord-join';

-- Verify the update was successful
DO $$
DECLARE
  task_record record;
BEGIN
  SELECT id, title, social_url 
  FROM tasks 
  WHERE id = 'discord-join'
  INTO task_record;
  
  IF FOUND THEN
    RAISE NOTICE 'Discord task updated successfully: % - %', task_record.title, task_record.social_url;
  ELSE
    RAISE NOTICE 'Discord task not found';
  END IF;
END $$;