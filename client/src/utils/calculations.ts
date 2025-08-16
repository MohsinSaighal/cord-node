import { UserData } from '../types';
import { AntiCheatStatus, applyAntiCheatEfficiency } from './antiCheat';

export const calculateMultiplier = (account_age: number): number => {
  // More realistic multiplier calculation
  // 0-1 year: 1.0x
  // 1-2 years: 1.2x
  // 2-3 years: 1.5x
  // 3-4 years: 2.0x
  // 4-5 years: 2.5x
  // 5-6 years: 3.5x
  // 6-7 years: 5.0x
  // 7-8 years: 7.0x
  // 8+ years: 10.0x
  
  if (account_age < 1) return 1.0;
  if (account_age < 2) return 1.2;
  if (account_age < 3) return 1.5;
  if (account_age < 4) return 2.0;
  if (account_age < 5) return 2.5;
  if (account_age < 6) return 3.5;
  if (account_age < 7) return 5.0;
  if (account_age < 8) return 7.0;
  return 10.0;
};

export const calculateMiningRate = (user: UserData, antiCheatStatus?: AntiCheatStatus | null): number => {
  // Base rate: 0.5 CORD per minute, affected by multiplier
  const baseRate = 0.5; // CORD per minute
  const standardRate = baseRate * user.multiplier;
  
  // Apply anti-cheat efficiency reduction if applicable
  return applyAntiCheatEfficiency(standardRate, antiCheatStatus);
};

export const calculateHashRate = (user: UserData): number => {
  // Simulate hash rate based on account age and random variance
  const baseHashRate = 100 + (user.account_age * 15);
  const variance = 0.8 + (Math.random() * 0.4); // ±20% variance
  return baseHashRate * variance;
};

export const calculateNodeUptime = (startTime: number): number => {
  return Math.floor((Date.now() - startTime) / 1000);
};

// Removed calculateOfflineEarnings function since we no longer support offline earnings
export const calculateDailyReset = (): Date => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
};

export const calculateWeeklyReset = (): Date => {
  const now = new Date();
  const nextWeek = new Date(now);
  const daysUntilMonday = (7 - now.getDay() + 1) % 7 || 7;
  nextWeek.setDate(nextWeek.getDate() + daysUntilMonday);
  nextWeek.setHours(0, 0, 0, 0);
  return nextWeek;
};

export const isNewDay = (last_login_time: number): boolean => {
  const lastLogin = new Date(last_login_time);
  const now = new Date();
  
  // Check if it's a new day (different calendar date)
  const lastLoginDateString = lastLogin.toDateString();
  const currentDateString = now.toDateString();
  
  const isNewDay = lastLoginDateString !== currentDateString;
  
  console.log('🗓️ Date check:', {
    lastLogin: lastLoginDateString,
    current: currentDateString,
    isNewDay
  });
  
  return isNewDay;
};

// Restored calculateOfflineEarnings function
export const calculateOfflineEarnings = (user: UserData, offlineTime: number): number => {
  if (!user.is_node_active || offlineTime < 60000) return 0; // Must be offline for at least 1 minute
  
  const offlineMinutes = Math.min(offlineTime / 60000, 480); // Max 8 hours of offline earnings
  const miningRate = calculateMiningRate(user);
  return offlineMinutes * miningRate;
};

export const calculateInitialBalance = (account_age: number, multiplier: number): number => {
  // Give users a starting balance based on their account age
  // Older accounts get more starting CP, with 2x welcome bonus
  const baseAmount = 50;
  const ageBonus = account_age * 25;
  const multiplierBonus = (multiplier - 1) * 100;
  const welcomeBonusMultiplier = 2.0; // Double the welcome bonus
  
  return Math.floor((baseAmount + ageBonus + multiplierBonus) * welcomeBonusMultiplier);
};

// Calculate task progress based on task type and user data
export const calculateTaskProgress = (taskId: string, dbProgress: number, user: UserData): number => {
  switch (taskId) {
    case 'mine-1-hour':
      if (user.nodeStartTime && user.is_node_active) {
        return Math.min(3600, Math.floor((Date.now() - user.nodeStartTime) / 1000));
      }
      return dbProgress;
      
    case 'weekly-mining':
      return Math.min(user.weekly_earnings, 1000);
      
    case 'invite-friends':
      return user.totalReferrals || 0;
      
    case 'early-adopter':
      return user.account_age >= 5 ? 1 : 0;
      
    case 'daily-checkin':
      // Daily check-in logic - check if it's a new day or not claimed yet
      if (isNewDay(user.last_login_time.getTime()) || !user.daily_checkin_claimed) {
        return 1; // Can be claimed
      } else {
        return 0; // Already claimed today
      }
      
    case 'social-media-master':
      // This will be calculated separately in the task loading logic
      return dbProgress;
      
    default:
      // For social tasks and others, use database progress
      return dbProgress;
  }
};