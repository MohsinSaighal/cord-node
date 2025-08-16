import { useState, useEffect, useCallback } from 'react';
import { UserData, Task } from '../types';
import { apiClient } from './useApi';
import { isNewDay, calculateTaskProgress } from '../utils/calculations';

export const useTasks = (user: UserData, onUserUpdate: (user: UserData) => void) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingTasks, setProcessingTasks] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load tasks and user progress
  useEffect(() => {
    if (user?.id) {
      console.log('🔄 User available, loading tasks for:', user.id);
      loadTasks();
      
      // Refresh tasks every 30 seconds
      const interval = setInterval(loadTasks, 30000);
      return () => clearInterval(interval);
    } else {
      console.log('⚠️ No user available, setting empty tasks');
      setLoading(false);
      setTasks([]);
    }
  }, [user?.id]);

  const loadTasks = useCallback(async () => {
    if (!user?.id) {
      console.log('⚠️ No user available for loading tasks');
      setTasks([]);
      setLoading(false);
      setLoadError(null);
      return;
    }

    try {
      console.log('🔄 Loading tasks for user:', user.id);
      setLoading(true);
      setLoadError(null);
      
      // Get tasks with user progress from API
      const tasksWithProgress = await apiClient.getUserTasks(user.id);

      console.log('✅ Loaded tasks from API:', tasksWithProgress.length);

      // Process tasks with dynamic progress calculation
      const processedTasks = tasksWithProgress.map(task => {
        let progress = task.progress;
        let completed = task.completed;

        // For non-completed tasks, calculate dynamic progress
        if (!completed) {
          progress = calculateTaskProgress(task.id, task.progress, user);
          
          // Check if task should be auto-completed based on progress
          if (progress >= task.maxProgress) {
            completed = true;
          }
        }

        return {
          id: task.id,
          title: task.title,
          description: task.description,
          reward: task.reward * user.multiplier,
          type: task.type as 'daily' | 'weekly' | 'social' | 'achievement',
          completed,
          progress,
          maxProgress: task.maxProgress,
          socialUrl: task.socialUrl || undefined,
          expiresAt: task.expiresAt ? new Date(task.expiresAt) : undefined,
          claimedAt: task.claimedAt ? new Date(task.claimedAt) : undefined
        };
      });

      console.log('✅ Processed tasks with progress:', processedTasks.length);
      setTasks(processedTasks);
      setLoadError(null);
      
    } catch (error) {
      console.error('❌ Error loading tasks:', error);
      setLoadError('Failed to load tasks. Please refresh the page.');
      showNotification('error', 'Loading Error', 'Failed to load tasks. Please refresh the page.');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const calculateTaskProgress = (taskId: string, dbProgress: number, user: UserData): number => {
    switch (taskId) {
      case 'mine-1-hour':
        if (user.nodeStartTime && user.isNodeActive) {
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
        if (isNewDay(user.last_login_time) || !user.daily_checkin_claimed) {
          return 1; // Can be claimed
        } else {
          return 0; // Already claimed today
        }
        
      case 'social-media-master':
        // This will be calculated based on completed social tasks
        return dbProgress;

      default:
        // For social tasks and others, use database progress
        return dbProgress;
    }
  };

  const completeTask = useCallback(async (taskId: string) => {
    if (!user?.id) {
      console.error('❌ No user available for task completion');
      showNotification('error', 'User Error', 'Please refresh the page and try again.');
      return;
    }

    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        console.error('❌ Task not found:', taskId);
        showNotification('error', 'Task Error', 'Task not found');
        setProcessingTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
        return;
      }

      console.log('🎯 Starting task completion for:', {
        id: taskId,
        type: task.type,
        completed: task.completed,
        progress: task.progress,
        maxProgress: task.maxProgress
      });

      // CRITICAL: Check if task is already completed
      if (task.completed) {
        console.log('⚠️ Task already completed:', taskId);
        showNotification('info', 'Already Completed', 'This task has already been completed');
        setProcessingTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
        return;
      }

      // CRITICAL: Check if task is already being processed
      if (processingTasks.has(taskId)) {
        console.log('⚠️ Task already being processed:', taskId);
        return; // Silent return to prevent spam
      }

      // Add to processing set immediately to prevent double-clicks
      setProcessingTasks(prev => new Set(prev).add(taskId));

      // Calculate the base reward (the function will apply multiplier)
      const baseReward = task.reward / (user.multiplier || 1);
      console.log('💰 Attempting to complete task with base reward:', baseReward);
      
      // For social tasks, we can complete them immediately without additional checks
      if (task.type === 'social') {
        console.log('🔄 Social task detected, completing immediately');
      }

      // Use the API to complete the task
      console.log('🔄 Calling API to complete task...');
      const result = await apiClient.completeTask(user.id, taskId, baseReward);

      console.log('📊 API result:', result);

      if (!result.success) {
        const errorMsg = result.error || 'Unknown error';
        console.error('❌ Task completion failed:', errorMsg);

        if (errorMsg.includes('already completed')) {
          showNotification('warning', 'Already Completed', 'This task has already been completed');
          // Force refresh tasks to sync with database
          setTimeout(() => loadTasks(), 500);
        } else {
          showNotification('error', 'Completion Failed', errorMsg);
        }
        
        return;
      }

      console.log('✅ Task completed successfully via API:', result);

      // Update local user state with the new balance from API
      const updatedUser = {
        ...user,
        current_balance: result.newBalance || user.current_balance,
        total_earned: user.total_earned + (result.reward || 0),
        tasksCompleted: user.tasksCompleted + 1
      };

      // Special handling for daily check-in
      if (taskId === 'daily-checkin') {
        updatedUser.daily_checkin_claimed = true;
        
        console.log('✅ Daily check-in completed, updating user data');
      }

      onUserUpdate(updatedUser);

      // Show success notification
      const taskTypeText = task.type === 'social' ? 'Social Task' : 
                          task.type === 'achievement' ? 'Achievement' : 
                          task.type === 'daily' ? 'Daily Task' :
                          task.type === 'weekly' ? 'Weekly Task' : 
                          'Task';
      
      const notificationMessage = `+${Math.floor(result.reward || 0)} CORD earned from "${task.title}"!`;
      
      showNotification('success', `${taskTypeText} Completed!`, notificationMessage);

      // Update the local tasks state immediately to reflect completion
      console.log('🔄 Updating local task state for:', taskId);
      setTasks(prevTasks => {
        try {
          // First, mark the completed task
          let updatedTasks = prevTasks.map(t => 
            t.id === taskId ? { ...t, completed: true, progress: t.maxProgress, claimedAt: new Date() } : t
          );

          // If we completed a social task, update social-media-master progress
          if (task.type === 'social') {
            // Count completed social tasks including the one we just completed
            const socialTasksCompleted = updatedTasks.filter(t => 
              t.type === 'social' && t.completed
            ).length;
            
            // Update social-media-master task progress
            updatedTasks = updatedTasks.map(t => 
              t.id === 'social-media-master' ? { ...t, progress: socialTasksCompleted } : t
            );
          }
          
          return updatedTasks;
        } catch (error) {
          console.error('Error updating local task state:', error);
          return prevTasks;
        }
      });

      // Reload tasks after a delay to ensure database consistency
      setTimeout(() => {
        console.log('🔄 Reloading all tasks to sync with database...');
        try {
          loadTasks();
        } catch (reloadError) {
          console.error('Error reloading tasks:', reloadError);
        }
      }, 1000);

    } catch (error) {
      console.error('❌ Error completing task:', error);
      
      let errorMessage = 'Please try again in a moment';
      if (error instanceof Error) {
        if (error.message.includes('already completed')) {
          errorMessage = 'This task has already been completed';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Check your connection and try again.';
        } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
          errorMessage = 'Permission error. Please refresh the page and try again.';
        } else if (error.message.includes('Database function failed')) {
          errorMessage = 'Database error occurred. Please try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      showNotification('error', 'Completion Failed', errorMessage);
      
      // Always refresh tasks on error to sync with database state
      setTimeout(() => {
        try {
          console.log('🔄 Reloading tasks after error...');
          loadTasks();
        } catch (reloadError) {
          console.error('Error reloading tasks after error:', reloadError);
        }
      }, 1000);
    } finally {
      // Remove from processing set
      setProcessingTasks(prev => {
        const newSet = new Set(prev);
        if (newSet.has(taskId)) newSet.delete(taskId);
        return newSet;
      });
    }
  }, [tasks, user, onUserUpdate, processingTasks, loadTasks]);

  const showNotification = (type: 'success' | 'warning' | 'error' | 'info', title: string, message: string) => {
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-600/20 border-green-500/30' : 
                   type === 'warning' ? 'bg-yellow-600/20 border-yellow-500/30' :
                   type === 'error' ? 'bg-red-600/20 border-red-500/30' :
                  'bg-blue-600/20 border-blue-500/30';
    const textColor = type === 'success' ? 'text-green-400' : 
                     type === 'warning' ? 'text-yellow-400' :
                     type === 'error' ? 'text-red-400' :
                    'text-blue-400';
    const icon = type === 'success' ? '🎉' : 
                type === 'warning' ? '⚠️' : 
                type === 'error' ? '❌' : 'ℹ️';
    
    notification.className = `fixed top-20 right-4 ${bgColor} border rounded-lg p-4 z-50 animate-slide-in max-w-sm`;
    notification.innerHTML = `
      <div class="flex items-center space-x-2">
        <span class="text-lg">${icon}</span>
        <div>
          <div class="text-white font-medium text-sm">${title}</div>
          <div class="${textColor} text-xs">${message}</div>
        </div>
      </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
  };

  return {
    tasks,
    loading,
    error: loadError,
    completeTask,
    refreshTasks: loadTasks,
    validatingTasks: processingTasks
  };
};