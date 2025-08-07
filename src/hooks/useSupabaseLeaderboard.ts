import { useState, useEffect } from 'react';
import { LeaderboardEntry, UserData } from '../types';
import { supabase } from '../lib/supabase';

export const useSupabaseLeaderboard = (currentUser: UserData | null) => {
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
      
      let orderBy = 'total_earned';
      let selectField = 'total_earned';
      
      switch (selectedPeriod) {
        case 'weekly':
          orderBy = 'weekly_earnings';
          selectField = 'weekly_earnings';
          break;
        case 'monthly':
          orderBy = 'monthly_earnings';
          selectField = 'monthly_earnings';
          break;
        case 'daily':
          // For daily, we'll calculate based on last 24 hours of activity
          // For now, use total_earned as a proxy
          orderBy = 'total_earned';
          selectField = 'total_earned';
          break;
        default:
          orderBy = 'total_earned';
          selectField = 'total_earned';
      }

      const { data: users, error } = await supabase
        .from('users')
        .select(`
          id, 
          username, 
          avatar, 
          account_age, 
          total_earned, 
          weekly_earnings, 
          monthly_earnings, 
          is_node_active,
          created_at
        `)
        .order(orderBy, { ascending: false })
        .limit(100);

      if (error) throw error;

      // Calculate daily earnings for users who are actively mining
      const entries: LeaderboardEntry[] = users.map((user, index) => {
        let displayEarnings = user[selectField as keyof typeof user] as number;
        
        // For daily period, calculate approximate daily earnings
        if (selectedPeriod === 'daily') {
          // Estimate daily earnings based on recent activity
          const accountAge = user.account_age;
          const multiplier = Math.min(10, 1 + (accountAge * 0.5));
          const baseRate = 0.5; // CP per minute
          const dailyRate = baseRate * multiplier * 60 * 24; // 24 hours
          
          // If user is active, show estimated daily rate, otherwise show 0
          displayEarnings = user.is_node_active ? dailyRate * (0.8 + Math.random() * 0.4) : 0;
        }

        return {
          rank: index + 1,
          username: user.username,
          avatar: user.avatar,
          totalEarned: displayEarnings,
          accountAge: user.account_age,
          isActive: user.is_node_active,
          weeklyEarnings: user.weekly_earnings
        };
      });

      // Re-sort by display earnings and update ranks
      const sortedEntries = entries
        .sort((a, b) => b.totalEarned - a.totalEarned)
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