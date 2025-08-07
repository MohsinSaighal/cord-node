import { UserData } from '../types';
import { AntiCheatStatus, applyAntiCheatEfficiency } from './antiCheat';

export const calculateMultiplier = (accountAge: number): number => {
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
  
  if (accountAge < 1) return 1.0;
  if (accountAge < 2) return 1.2;
  if (accountAge < 3) return 1.5;
  if (accountAge < 4) return 2.0;
  if (accountAge < 5) return 2.5;
  if (accountAge < 6) return 3.5;
  if (accountAge < 7) return 5.0;
  if (accountAge < 8) return 7.0;
  return 10.0;
};

export const calculateMiningRate = (user: UserData, antiCheatStatus?: AntiCheatStatus | null): number => {
  // Base rate: 0.5 CP per minute, affected by multiplier and efficiency
  const baseRate = 1; // CP per minute
  const efficiency = 0.85 + (Math.random() * 0.15); // 85-100% efficiency
  const standardRate = baseRate * user.multiplier * efficiency;
  
  // Apply anti-cheat efficiency reduction if applicable
  return applyAntiCheatEfficiency(standardRate, antiCheatStatus);
};

export const calculateHashRate = (user: UserData): number => {
  // Simulate hash rate based on account age and random variance
  const baseHashRate = 100 + (user.accountAge * 15);
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

export const isNewDay = (lastLoginTime: number): boolean => {
  const lastLogin = new Date(lastLoginTime);
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
  if (!user.isNodeActive || offlineTime < 60000) return 0; // Must be offline for at least 1 minute
  
  const offlineMinutes = Math.min(offlineTime / 60000, 480); // Max 8 hours of offline earnings
  const miningRate = calculateMiningRate(user);
  return offlineMinutes * miningRate;
};

export const calculateInitialBalance = (accountAge: number, multiplier: number): number => {
  // Give users a starting balance based on their account age
  // Older accounts get more starting CP, with 2x welcome bonus
  const baseAmount = 50;
  const ageBonus = accountAge * 25;
  const multiplierBonus = (multiplier - 1) * 100;
  const welcomeBonusMultiplier = 2.0; // Double the welcome bonus
  
  return Math.floor((baseAmount + ageBonus + multiplierBonus) * welcomeBonusMultiplier);
};

// Calculate task progress based on task type and user data
export const calculateTaskProgress = (taskId: string, dbProgress: number, user: UserData): number => {
  switch (taskId) {
    case 'mine-1-hour':
      if (user.nodeStartTime && user.isNodeActive) {
        return Math.min(3600, Math.floor((Date.now() - user.nodeStartTime) / 1000));
      }
      return dbProgress;
      
    case 'weekly-mining':
      return Math.min(user.weeklyEarnings, 1000);
      
    case 'invite-friends':
      return user.totalReferrals || 0;
      
    case 'early-adopter':
      return user.accountAge >= 5 ? 1 : 0;
      
    case 'daily-checkin':
      // Daily check-in logic - check if it's a new day or not claimed yet
      if (isNewDay(user.lastLoginTime) || !user.dailyCheckInClaimed) {
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