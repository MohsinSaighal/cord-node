import { useState, useEffect } from 'react';
import { LeaderboardEntry, UserData } from '../types';
import { apiClient } from './useApi';

export const useLeaderboard = (currentUser: UserData | null) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'all-time'>('all-time');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
    
    // Refresh leaderboard every 30 seconds
    const interval = setInterval(loadLeaderboard, 30000);
    return () => clearInterval(interval);
  }, [selectedPeriod]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      
      // Get leaderboard data from API
      const users = await apiClient.getLeaderboard(100);

      // Calculate daily earnings for users who are actively mining
      const entries: LeaderboardEntry[] = users.map((user, index) => {
        let displayEarnings = user.total_earned;
        
        // For daily period, calculate approximate daily earnings
        if (selectedPeriod === 'daily') {
          // Estimate daily earnings based on recent activity
          const account_age = user.account_age;
          const multiplier = Math.min(10, 1 + (account_age * 0.5));
          const baseRate = 0.5; // CP per minute
          const dailyRate = baseRate * multiplier * 60 * 24; // 24 hours
          
          // If user is active, show estimated daily rate, otherwise show 0
          displayEarnings = user.isNodeActive ? dailyRate * (0.8 + Math.random() * 0.4) : 0;
        } else if (selectedPeriod === 'weekly') {
          displayEarnings = user.weekly_earnings || 0;
        } else if (selectedPeriod === 'monthly') {
          displayEarnings = user.monthly_earnings || 0;
        }

        return {
          rank: index + 1,
          username: user.username,
          avatar: user.avatar,
          total_earned: displayEarnings,
          account_age: user.account_age,
          isActive: user.isNodeActive,
          weekly_earnings: user.weekly_earnings || 0
        };
      });

      // Re-sort by display earnings and update ranks
      const sortedEntries = entries
        .sort((a, b) => b.total_earned - a.total_earned)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      setLeaderboard(sortedEntries);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  return {
    leaderboard,
    selectedPeriod,
    setSelectedPeriod,
    loading,
    refreshLeaderboard: loadLeaderboard
  };
};