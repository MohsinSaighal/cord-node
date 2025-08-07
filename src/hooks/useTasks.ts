import { useState, useEffect, useCallback } from 'react';
import { UserData, Task } from '../types';
import { calculateDailyReset, calculateWeeklyReset, isNewDay } from '../utils/calculations';
import { saveUserData } from '../utils/storage';

export const useTasks = (user: UserData, onUserUpdate: (user: UserData) => void) => {
  const [tasks, setTasks] = useState<Task[]>([]);

  // Initialize tasks
  useEffect(() => {
    const initializeTasks = (): Task[] => {
      const now = new Date();
      
      return [
        {
          id: 'daily-checkin',
          title: 'Daily Check-in',
          description: 'Log in to CordNode and claim your daily bonus',
          reward: 10 * user.multiplier,
          type: 'daily',
          completed: user.dailyCheckInClaimed && !isNewDay(user.lastLoginTime),
          progress: user.dailyCheckInClaimed && !isNewDay(user.lastLoginTime) ? 1 : 0,
          maxProgress: 1,
          expiresAt: calculateDailyReset()
        },
        {
          id: 'mine-1-hour',
          title: 'Mine for 1 Hour',
          description: 'Keep your node active for at least 1 hour',
          reward: 25 * user.multiplier,
          type: 'daily',
          completed: false,
          progress: user.nodeStartTime ? Math.min(3600, Math.floor((Date.now() - user.nodeStartTime) / 1000)) : 0,
          maxProgress: 3600,
          expiresAt: calculateDailyReset()
        },
        {
          id: 'twitter-follow',
          title: 'Follow on Twitter',
          description: 'Follow @CordNode on Twitter for updates',
          reward: 50 * user.multiplier,
          type: 'social',
          completed: false,
          progress: 0,
          maxProgress: 1,
          socialUrl: 'https://twitter.com/intent/follow?screen_name=cordnode'
        },
        {
          id: 'twitter-retweet',
          title: 'Retweet Announcement',
          description: 'Retweet our latest announcement',
          reward: 30 * user.multiplier,
          type: 'social',
          completed: false,
          progress: 0,
          maxProgress: 1,
          socialUrl: 'https://twitter.com/intent/retweet?tweet_id=1234567890'
        },
        {
          id: 'telegram-join',
          title: 'Join Telegram Channel',
          description: 'Join our official Telegram channel',
          reward: 40 * user.multiplier,
          type: 'social',
          completed: false,
          progress: 0,
          maxProgress: 1,
          socialUrl: 'https://t.me/cordnode_official'
        },
        {
          id: 'discord-join',
          title: 'Join Discord Server',
          description: 'Join our community Discord server',
          reward: 60 * user.multiplier,
          type: 'social',
          completed: false,
          progress: 0,
          maxProgress: 1,
          socialUrl: 'https://discord.gg/cordnode'
        },
        {
          id: 'invite-friends',
          title: 'Invite Friends',
          description: 'Invite 3 friends to join CordNode',
          reward: 100 * user.multiplier,
          type: 'weekly',
          completed: false,
          progress: user.totalReferrals || 0,
          maxProgress: 3,
          expiresAt: calculateWeeklyReset()
        },
        {
          id: 'efficiency-master',
          title: 'Node Efficiency Master',
          description: 'Maintain 90%+ efficiency for 24 hours',
          reward: 200 * user.multiplier,
          type: 'achievement',
          completed: false,
          progress: 0,
          maxProgress: 86400
        },
        {
          id: 'early-adopter',
          title: 'Early Adopter',
          description: 'Join CordNode community (Discord account 5+ years)',
          reward: 500 * user.multiplier,
          type: 'achievement',
          completed: user.accountAge >= 5,
          progress: user.accountAge >= 5 ? 1 : 0,
          maxProgress: 1
        },
        {
          id: 'weekly-mining',
          title: 'Weekly Mining Goal',
          description: 'Earn 1000 CORD from mining this week',
          reward: 150 * user.multiplier,
          type: 'weekly',
          completed: user.weeklyEarnings >= 1000,
          progress: Math.min(user.weeklyEarnings, 1000),
          maxProgress: 1000,
          expiresAt: calculateWeeklyReset()
        },
        {
          id: 'social-media-master',
          title: 'Social Media Master',
          description: 'Complete all social media tasks',
          reward: 300 * user.multiplier,
          type: 'achievement',
          completed: false,
          progress: 0,
          maxProgress: 4
        }
      ];
    };

    setTasks(initializeTasks());
  }, [user]);

  // Update task progress
  useEffect(() => {
    const interval = setInterval(() => {
      setTasks(prevTasks => 
        prevTasks.map(task => {
          if (task.completed) return task;
          
          switch (task.id) {
            case 'mine-1-hour':
              if (user.nodeStartTime && user.isNodeActive) {
                const progress = Math.min(3600, Math.floor((Date.now() - user.nodeStartTime) / 1000));
                return { ...task, progress, completed: progress >= 3600 };
              }
              return task;
            
            case 'weekly-mining':
              const progress = Math.min(user.weeklyEarnings, 1000);
              return { ...task, progress, completed: progress >= 1000 };
            
            case 'invite-friends':
              const referralProgress = user.totalReferrals || 0;
              return { ...task, progress: referralProgress, completed: referralProgress >= 3 };
            
            case 'social-media-master':
              const socialTasksCompleted = prevTasks.filter(t => 
                t.type === 'social' && t.completed && t.id !== 'social-media-master'
              ).length;
              return { ...task, progress: socialTasksCompleted, completed: socialTasksCompleted >= 4 };
            
            default:
              return task;
          }
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [user]);

  const completeTask = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.completed) return;

    // Special handling for daily check-in
    if (taskId === 'daily-checkin') {
      const updatedUser = {
        ...user,
        currentBalance: user.currentBalance + task.reward,
        totalEarned: user.totalEarned + task.reward,
        dailyCheckInClaimed: true,
        lastLoginTime: Date.now()
      };
      onUserUpdate(updatedUser);
      saveUserData(updatedUser);
    } else {
      // Regular task completion
      const updatedUser = {
        ...user,
        currentBalance: user.currentBalance + task.reward,
        totalEarned: user.totalEarned + task.reward,
        tasksCompleted: user.tasksCompleted + 1
      };
      onUserUpdate(updatedUser);
      saveUserData(updatedUser);
    }

    setTasks(prevTasks =>
      prevTasks.map(t =>
        t.id === taskId
          ? { ...t, completed: true, progress: t.maxProgress, claimedAt: new Date() }
          : t
      )
    );
  }, [tasks, user, onUserUpdate]);

  return {
    tasks,
    completeTask
  };
};