import { useState, useEffect } from 'react';
import { UserData, EpochData, UserEpochStats } from '../types';
import { supabase } from '../lib/supabase';

export const useEpochSystem = (user: UserData | null) => {
  const [currentEpoch, setCurrentEpoch] = useState<EpochData | null>(null);
  const [userEpochStats, setUserEpochStats] = useState<UserEpochStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadEpochData();
      
      // Refresh epoch data every minute
      const interval = setInterval(loadEpochData, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadEpochData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      console.log('Loading epoch data for user:', user.id);

      // Get current epoch using the fixed function
      const { data: epochResult, error: epochError } = await supabase
        .rpc('get_current_epoch', {});

      if (epochError) {
        console.error('Error loading current epoch:', epochError);
        setError(`Failed to load epoch data: ${epochError.message}`);
        return;
      }

      console.log('Epoch result:', epochResult);

      if (epochResult && epochResult.success) {
        const epoch = epochResult;
        setCurrentEpoch({
          id: epoch.id,
          epochNumber: epoch.epoch_number,
          name: epoch.name,
          description: epoch.description,
          startDate: new Date(epoch.start_date),
          endDate: new Date(epoch.end_date),
          daysRemaining: epoch.days_remaining,
          progressPercentage: epoch.progress_percentage,
          isActive: epoch.is_active,
          rewardsMultiplier: epoch.rewards_multiplier
        });

        // Ensure user is joined to current epoch
        await joinCurrentEpoch();

        // Get user's epoch stats
        const { data: userStats, error: statsError } = await supabase
          .rpc('get_user_epoch_stats', { p_user_id: user.id });

        if (statsError) {
          console.error('Error loading user epoch stats:', statsError);
          // Don't fail completely if user stats fail, just log it
          console.log('Continuing without user stats...');
          
          // Create basic user stats
          setUserEpochStats({
            epochNumber: epoch.epoch_number,
            epochName: epoch.name,
            epochDescription: epoch.description,
            startDate: new Date(epoch.start_date),
            endDate: new Date(epoch.end_date),
            daysRemaining: epoch.days_remaining,
            progressPercentage: epoch.progress_percentage,
            userEarnings: user.totalEpochEarnings || 0,
            userTasksCompleted: user.tasksCompleted || 0,
            userMiningTime: user.node_start_time ? Math.floor((Date.now() - user.node_start_time) / 1000) : 0,
            userRank: 1,
            totalParticipants: 1,
            rewardsMultiplier: epoch.rewards_multiplier,
            joinedAt: user.epochJoinDate ? new Date(user.epochJoinDate) : new Date()
          });
        } else if (userStats && userStats.success) {
          setUserEpochStats({
            epochNumber: userStats.epoch_number,
            epochName: userStats.epoch_name,
            epochDescription: userStats.epoch_description,
            startDate: new Date(userStats.start_date),
            endDate: new Date(userStats.end_date),
            daysRemaining: userStats.days_remaining,
            progressPercentage: userStats.progress_percentage,
            userEarnings: userStats.user_earnings,
            userTasksCompleted: userStats.user_tasks_completed,
            userMiningTime: userStats.user_mining_time,
            userRank: userStats.user_rank,
            totalParticipants: userStats.total_participants,
            rewardsMultiplier: userStats.rewards_multiplier,
            joinedAt: new Date(userStats.joined_at)
          });
        } else {
          // Create basic user stats if function doesn't return success
          setUserEpochStats({
            epochNumber: epoch.epoch_number,
            epochName: epoch.name,
            epochDescription: epoch.description,
            startDate: new Date(epoch.start_date),
            endDate: new Date(epoch.end_date),
            daysRemaining: epoch.days_remaining,
            progressPercentage: epoch.progress_percentage,
            userEarnings: user.totalEpochEarnings || 0,
            userTasksCompleted: user.tasksCompleted || 0,
            userMiningTime: user.node_start_time ? Math.floor((Date.now() - user.node_start_time) / 1000) : 0,
            userRank: 1,
            totalParticipants: 1,
            rewardsMultiplier: epoch.rewards_multiplier,
            joinedAt: user.epochJoinDate ? new Date(user.epochJoinDate) : new Date()
          });
        }
      } else {
        console.error('No active epoch found or epoch result failed:', epochResult);
        setError(epochResult?.error || 'No active epoch found');
      }
    } catch (error) {
      console.error('Error in loadEpochData:', error);
      setError(`Failed to load epoch data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const joinCurrentEpoch = async () => {
    if (!user) return;

    try {
      const { data: result, error } = await supabase
        .rpc('join_user_to_current_epoch', { p_user_id: user.id });

      if (error) {
        console.error('Error joining current epoch:', error);
      } else if (result && result.success) {
        console.log('User joined epoch:', result.epoch_number);
      }
    } catch (error) {
      console.error('Error in joinCurrentEpoch:', error);
    }
  };

  const updateEpochProgress = async (earnings: number, tasksCompleted: number = 0, miningTime: number = 0) => {
    if (!user || !currentEpoch) return;

    try {
      // Update user epoch progress in the database
      const { error: progressError } = await supabase
        .from('user_epoch_progress')
        .upsert({
          user_id: user.id,
          epoch_id: currentEpoch.id,
          epoch_number: currentEpoch.epochNumber,
          epoch_earnings: earnings,
          epoch_tasks_completed: tasksCompleted,
          epoch_mining_time: miningTime,
          updated_at: new Date().toISOString()
        });

      if (progressError) {
        console.error('Error updating epoch progress:', progressError);
      }

      // Also update the user's total epoch earnings
      const { error: userError } = await supabase
        .from('users')
        .update({
          total_epoch_earnings: earnings,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (userError) {
        console.error('Error updating user epoch earnings:', userError);
      }
    } catch (error) {
      console.error('Error in updateEpochProgress:', error);
    }
  };

  const getEpochTimeRemaining = () => {
    if (!currentEpoch) return null;

    const now = new Date();
    const endDate = currentEpoch.endDate;
    const timeRemaining = endDate.getTime() - now.getTime();

    if (timeRemaining <= 0) return null;

    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

    return { days, hours, minutes };
  };

  return {
    currentEpoch,
    userEpochStats,
    loading,
    error,
    updateEpochProgress,
    getEpochTimeRemaining,
    refreshEpochData: loadEpochData
  };
};