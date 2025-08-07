import { useState, useEffect } from 'react';
import { LeaderboardEntry, UserData } from '../types';
import { getAppState, saveAppState } from '../utils/storage';

export const useLeaderboard = (currentUser: UserData | null) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'all-time'>('all-time');

  useEffect(() => {
    const generateLeaderboard = (): LeaderboardEntry[] => {
      const appState = getAppState();
      
      // Add current user to app state if not exists
      if (currentUser) {
        const existingUserIndex = appState.users.findIndex(u => u.id === currentUser.id);
        if (existingUserIndex >= 0) {
          appState.users[existingUserIndex] = currentUser;
        } else {
          appState.users.push(currentUser);
        }
        saveAppState(appState);
      }

      // Generate additional demo users if needed
      while (appState.users.length < 20) {
        const accountAge = Math.floor(Math.random() * 8) + 2;
        const baseEarnings = 5000 + Math.random() * 15000;
        const weeklyEarnings = Math.random() * 2000;
        
        const demoUser: UserData = {
          id: Math.random().toString(36).substr(2, 9),
          username: `User${Math.floor(Math.random() * 9999)}`,
          discriminator: Math.floor(Math.random() * 9999).toString().padStart(4, '0'),
          avatar: `https://images.pexels.com/photos/${Math.floor(Math.random() * 1000000)}/pexels-photo-${Math.floor(Math.random() * 1000000)}.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1`,
          accountAge,
          joinDate: new Date(Date.now() - accountAge * 365 * 24 * 60 * 60 * 1000),
          multiplier: Math.min(10, 1 + (accountAge * 0.5)),
          totalEarned: baseEarnings,
          currentBalance: baseEarnings * 0.8,
          isNodeActive: Math.random() > 0.3,
          tasksCompleted: Math.floor(Math.random() * 50),
          rank: 0,
          lastLoginTime: Date.now() - Math.random() * 86400000,
          dailyCheckInClaimed: Math.random() > 0.5,
          weeklyEarnings,
          monthlyEarnings: weeklyEarnings * 4
        };
        
        appState.users.push(demoUser);
      }

      // Convert to leaderboard entries and sort
      const entries: LeaderboardEntry[] = appState.users.map(user => ({
        rank: 0,
        username: user.username,
        avatar: user.avatar,
        totalEarned: selectedPeriod === 'weekly' ? user.weeklyEarnings : 
                    selectedPeriod === 'monthly' ? user.monthlyEarnings : user.totalEarned,
        accountAge: user.accountAge,
        isActive: user.isNodeActive,
        weeklyEarnings: user.weeklyEarnings
      }));

      // Sort by earnings and assign ranks
      return entries
        .sort((a, b) => b.totalEarned - a.totalEarned)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
    };

    setLeaderboard(generateLeaderboard());
  }, [currentUser, selectedPeriod]);

  return {
    leaderboard,
    selectedPeriod,
    setSelectedPeriod
  };
};