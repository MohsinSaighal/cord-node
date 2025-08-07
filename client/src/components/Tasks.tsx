import React from 'react';
import { CheckCircle, Clock, Gift, Star, Target, Calendar, Trophy, Twitter, MessageCircle, Users2, ExternalLink, Loader, AlertTriangle, RefreshCw, Info, X, Bug } from 'lucide-react';
import { UserData } from '../types';
import { useSupabaseTasks } from '../hooks/useSupabaseTasks';
import { supabase } from '../lib/supabase';
import TaskDebug from './TaskDebug';

interface TasksProps {
  user: UserData;
  onUserUpdate: (user: UserData) => void;
}

const Tasks: React.FC<TasksProps> = ({ user, onUserUpdate }) => {
  const { tasks, loading, error, completeTask, validatingTasks, refreshTasks } = useSupabaseTasks(user, onUserUpdate);
  const [selectedCategory, setSelectedCategory] = React.useState<'all' | 'daily' | 'weekly' | 'social' | 'achievement'>('all');
  const [showTaskInfo, setShowTaskInfo] = React.useState(false);
  const [showClaimButtons, setShowClaimButtons] = React.useState<Record<string, boolean>>({});
  const [socialLinksVisited, setSocialLinksVisited] = React.useState<Record<string, boolean>>({});
  const [showDebug, setShowDebug] = React.useState(false);
  const [taskDebugInfo, setTaskDebugInfo] = React.useState<any>(null);

  // Filter tasks based on selected category
  const filteredTasks = tasks.filter(task => 
    selectedCategory === 'all' || task.type === selectedCategory
  );

  // Debug function to check task completion status
  const checkTaskStatus = async (taskId: string) => {
    const { data } = await supabase.rpc('check_task_completion', { p_user_id: user.id, p_task_id: taskId });
    console.log('Task status:', data);
  };

  const categories = [
    { id: 'all', label: 'All Tasks', icon: Target },
    { id: 'daily', label: 'Daily', icon: Calendar },
    { id: 'weekly', label: 'Weekly', icon: Clock },
    { id: 'social', label: 'Social', icon: Users2 },
    { id: 'achievement', label: 'Achievement', icon: Trophy }
  ];

  const showNotification = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 ${
      type === 'success' ? 'bg-green-600 text-white' :
      type === 'error' ? 'bg-red-600 text-white' :
      'bg-blue-600 text-white'
    }`;
    
    notification.innerHTML = `
      <div class="flex items-start">
        <div class="flex-1">
          <h4 class="font-semibold">${title}</h4>
          <p class="text-sm opacity-90">${message}</p>
        </div>
        <button class="ml-2 opacity-70 hover:opacity-100" onclick="this.parentElement.parentElement.remove()">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
          </svg>
        </button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  };

  // Function to handle social task click
  const handleSocialTaskClick = async (task: any) => {
    if (task.completed) {
      console.log('⚠️ Task already completed, ignoring click');
      showNotification('info', 'Already Completed', 'This task has already been completed');
      return;
    }
  
    if (task.type === 'social' && task.socialUrl) {
      console.log('🔗 Opening social URL:', task.socialUrl);
      
      // Open the URL in a new tab without checking if it was blocked
      window.open(task.socialUrl, '_blank', 'noopener,noreferrer');
      
      // Show claim button for this task
      setShowClaimButtons(prev => ({
        ...prev,
        [task.id]: true
      }));
      
      // Mark this social link as visited
      setSocialLinksVisited(prev => ({
        ...prev,
        [task.id]: true
      }));
      
      // Show notification that they can now claim the reward
      showNotification('info', 'Link Visited', 'You can now claim your reward for this task');
    }
  };

  // Store social links visited state in localStorage
  React.useEffect(() => {
    // Load from localStorage on mount
    const savedVisits = localStorage.getItem('socialLinksVisited');
    if (savedVisits) {
      try {
        setSocialLinksVisited(JSON.parse(savedVisits));
      } catch (e) {
        console.error('Error parsing saved social links:', e);
      }
    }
    
    // Also load claim buttons state
    const savedClaimButtons = localStorage.getItem('socialClaimButtons');
    if (savedClaimButtons) {
      try {
        setShowClaimButtons(JSON.parse(savedClaimButtons));
      } catch (e) {
        console.error('Error parsing saved claim buttons:', e);
      }
    }
  }, []);

  // Save to localStorage when state changes
  React.useEffect(() => {
    localStorage.setItem('socialLinksVisited', JSON.stringify(socialLinksVisited));
  }, [socialLinksVisited]);
  
  React.useEffect(() => {
    localStorage.setItem('socialClaimButtons', JSON.stringify(showClaimButtons));
  }, [showClaimButtons]);

  const handleTaskAction = async (task: any) => {
    console.log('🎯 Task clicked:', {
      id: task.id,
      type: task.type,
      completed: task.completed,
      progress: task.progress,
      maxProgress: task.maxProgress,
      user: user?.username
    });

    // Don't allow clicking completed tasks
    if (task.completed) {
      console.log('⚠️ Task already completed, ignoring click');
      showNotification('info', 'Already Completed', 'This task has already been completed');
      checkTaskStatus(task.id);
      return;
    }

    if (!user) {
      console.log('⚠️ No user available for task completion');
      showNotification('error', 'User Error', 'Please refresh the page and try again');
      checkTaskStatus(task.id);
      return;
    }

    if (validatingTasks.has(task.id)) {
      console.log('⚠️ Task already being validated, ignoring click');
      return;
    }

    // Check if task can be completed
    const canComplete = canCompleteTask(task);
    if (!canComplete) {
      console.log('❌ Task cannot be completed yet:', {
        taskId: task.id,
        progress: task.progress,
        required: task.maxProgress,
        accountAge: user.accountAge
      });
      checkTaskStatus(task.id);
      
      // Show user-friendly message
      if (task.type === 'achievement' && task.id === 'early-adopter') {
        showNotification('info', 'Account Too New', 'This achievement requires a Discord account that is at least 5 years old.');
      } else {
        showNotification('info', 'Task Not Ready', 'This task cannot be completed yet. Check the requirements.');
      }
      return;
    }

    // Calculate the base reward (the function will apply multiplier)
    const baseReward = task.reward / (user.multiplier || 1);
    console.log('💰 Attempting to complete task with base reward:', baseReward);

    try {
      console.log('✅ Starting task completion process for:', task.id);
      const updatedUser = await completeTask(task.id);
      
      
      // If this was a social task, remove the claim button
      if (task.type === 'social') {
        setShowClaimButtons(prev => ({
          ...prev,
          [task.id]: false
        }));
      }
      
      checkTaskStatus(task.id);
      console.log('🎉 Task completion process finished for:', task.id);
    } catch (error) {
      console.error('❌ Error in task action:', error);
      showNotification('error', 'Task Error', 'Failed to complete task. Please try again.');
    }
  };

  // Format progress display for different task types
  const formatProgress = (task: any) => {
    if (task.id === 'mine-1-hour') {
      const hours = Math.floor(task.progress / 3600);
      const minutes = Math.floor((task.progress % 3600) / 60);
      const seconds = task.progress % 60;
      return `${hours}h ${minutes}m ${seconds}s / 1 hour`;
    }
    return `${task.progress} / ${task.maxProgress}`;
  };

  // Check if a task can be completed
  const canCompleteTask = (task: any) => {
    if (!user) {
      return false;
    }

    // Already completed tasks can't be completed again
    if (task.completed) {
      return false;
    }
    
    // Social tasks can always be completed if not already done
    if (task.type === 'social') {
      return true;
    }

    // Social master achievement requires 4 social tasks completed
    if (task.id === 'social-master') {
      const completedSocialTasks = tasks.filter(t => t.type === 'social' && t.completed).length;
      return completedSocialTasks >= 4;
    }
    
    // Achievement tasks have specific requirements
    if (task.type === 'achievement') {
      // Early adopter achievement requires 5+ year Discord account
      if (task.id === 'early-adopter') {
        return (user?.accountAge || 0) >= 5;
      }
      if (task.id === 'social-master') {
        const completedSocialTasks = tasks.filter(t => t.type === 'social' && t.completed).length;
        return completedSocialTasks >= 4;
      }
      return true;
    }
    
    // Daily check-in has special logic
    if (task.id === 'daily-checkin') {
      return task.progress >= task.maxProgress;
    }
    
    // Check if task progress meets requirements
    // Other tasks need to meet progress requirements
    return task.progress >= task.maxProgress;
  };

  const getTaskIcon = (task: any) => {
    switch (task.type) {
      case 'daily':
        return Calendar;
      case 'weekly':
        return Clock;
      case 'social':
        if (task.id.includes('twitter')) return Twitter;
        if (task.id.includes('discord')) return MessageCircle;
        return Users2;
      case 'achievement':
        return Trophy;
      default:
        return Target;
    }
  };

  const getTaskColor = (task: any) => {
    if (task.completed) return 'from-green-600 to-green-700';
    
    switch (task.type) {
      case 'daily':
        return 'from-blue-600 to-blue-700';
      case 'weekly':
        return 'from-purple-600 to-purple-700';
      case 'social':
        return 'from-pink-600 to-pink-700';
      case 'achievement':
        return 'from-yellow-600 to-yellow-700';
      default:
        return 'from-gray-600 to-gray-700';
    }
  };

  // Calculate completion stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const dailyTasksCompleted = tasks.filter(t => t.type === 'daily' && t.completed).length;
  const weeklyTasksCompleted = tasks.filter(t => t.type === 'weekly' && t.completed).length;
  const socialTasksCompleted = tasks.filter(t => t.type === 'social' && t.completed).length;
  const achievementTasksCompleted = tasks.filter(t => t.type === 'achievement' && t.completed).length;
  
  // Calculate totals for each category
  // Calculate totals for each category
  const totalDailyTasks = tasks.filter(t => t.type === 'daily').length;
  const totalWeeklyTasks = tasks.filter(t => t.type === 'weekly').length;
  const totalSocialTasks = tasks.filter(t => t.type === 'social').length;
  const totalAchievementTasks = tasks.filter(t => t.type === 'achievement').length;

  // If there's an error loading tasks, show error message
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Tasks</h1>
          <p className="text-gray-400 text-sm sm:text-base">
            There was an error loading your tasks.
          </p>
        </div>
        <div className="bg-red-600/20 border border-red-500/30 rounded-xl p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Error Loading Tasks</h3>
          <p className="text-red-300 mb-4">{error}</p>
          <button onClick={refreshTasks} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center mx-auto"><RefreshCw className="w-4 h-4 mr-2" /> Try Again</button>
        </div>
        
        {/* Debug button in error state */}
        <div className="mt-4 text-center">
          <button 
            onClick={() => setShowDebug(!showDebug)} 
            className="text-gray-400 hover:text-gray-300 text-sm underline"
          >
            {showDebug ? 'Hide Debug Tools' : 'Show Debug Tools'}
          </button>
          
          {showDebug && <TaskDebug userId={user.id} />}
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Tasks</h1>
          <p className="text-gray-400 text-sm sm:text-base">
            Loading your tasks...
          </p>
        </div>
        <div className="flex justify-center items-center py-12">
          <Loader className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Tasks</h1>
            <p className="text-gray-400 text-sm sm:text-base">
              Complete tasks to earn CORD and unlock achievements
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowTaskInfo(!showTaskInfo)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              title="Task Information">
              <Info className="w-4 h-4" />
            </button>
            {import.meta.env.DEV && (
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                title="Debug Tools">
                <Bug className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={refreshTasks}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              title="Refresh Tasks"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Task Information Panel */}
      {showTaskInfo && (
        <div className="mb-6 sm:mb-8 bg-blue-600/10 border border-blue-500/20 rounded-xl p-4 sm:p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Info className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Task Information</h3>
            </div>
            <button
              onClick={() => setShowTaskInfo(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-3 text-sm">
            <div>
              <h4 className="text-blue-300 font-medium mb-1">Daily Tasks</h4>
              <p className="text-gray-300">Reset every 24 hours. Complete them regularly for consistent rewards.</p>
            </div>
            <div>
              <h4 className="text-purple-300 font-medium mb-1">Weekly Tasks</h4>
              <p className="text-gray-300">Reset every Monday. Larger rewards for weekly commitment.</p>
            </div>
            <div>
              <h4 className="text-pink-300 font-medium mb-1">Social Tasks</h4>
              <p className="text-gray-300">Connect with our community on social platforms for bonus rewards.</p>
            </div>
            <div>
              <h4 className="text-yellow-300 font-medium mb-1">Achievements</h4>
              <p className="text-gray-300">Special one-time rewards for reaching milestones and completing challenges.</p>
            </div>
          </div>
        </div>
      )}

      {/* Debug Tools (only in development) */}
      {import.meta.env.DEV && showDebug && (
        <TaskDebug userId={user.id} />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 border border-blue-500/30 rounded-xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-6 h-6 text-blue-400" />
            <span className="text-xs sm:text-sm text-blue-300 font-medium">Daily</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white mb-1">
            {dailyTasksCompleted}/{totalDailyTasks}
          </div>
          <p className="text-xs sm:text-sm text-gray-400">Tasks completed</p>
        </div>

        <div className="bg-gradient-to-br from-purple-600/20 to-purple-700/20 border border-purple-500/30 rounded-xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-6 h-6 text-purple-400" />
            <span className="text-xs sm:text-sm text-purple-300 font-medium">Weekly</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white mb-1">
            {weeklyTasksCompleted}/{totalWeeklyTasks}
          </div>
          <p className="text-xs sm:text-sm text-gray-400">Tasks completed</p>
        </div>

        <div className="bg-gradient-to-br from-pink-600/20 to-pink-700/20 border border-pink-500/30 rounded-xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <Users2 className="w-6 h-6 text-pink-400" />
            <span className="text-xs sm:text-sm text-pink-300 font-medium">Social</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white mb-1">
            {socialTasksCompleted}/{totalSocialTasks}
          </div>
          <p className="text-xs sm:text-sm text-gray-400">Tasks completed</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-700/20 border border-yellow-500/30 rounded-xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <span className="text-xs sm:text-sm text-yellow-300 font-medium">Achievements</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white mb-1">
            {achievementTasksCompleted}/{totalAchievementTasks}
          </div>
          <p className="text-xs sm:text-sm text-gray-400">Unlocked</p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {categories.map((category) => {
            const Icon = category.icon;
            const isActive = selectedCategory === category.id;
            
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id as any)}
                className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all text-sm sm:text-base ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{category.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tasks Grid */}
      <div className="grid gap-4 sm:gap-6">
        {filteredTasks.map((task) => {
          const Icon = getTaskIcon(task);
          const isCompleted = task.completed;
          const canComplete = canCompleteTask(task);
          const isProcessing = validatingTasks.has(task.id);
          
          return (
            <div
              key={task.id}
              className={`bg-gray-800/50 border rounded-xl p-4 sm:p-6 transition-all hover:bg-gray-800/70 ${
                isCompleted 
                  ? 'border-green-500/30 bg-green-600/10' 
                  : canComplete 
                    ? 'border-blue-500/30 hover:border-blue-400/50' 
                    : 'border-gray-700/50'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start space-x-3 mb-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${getTaskColor(task)}`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-semibold text-white truncate">
                          {task.title}
                        </h3>
                        {isCompleted && (
                          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                        {task.description}
                      </p>
                      
                      {/* Progress bar for incomplete tasks */}
                      {!isCompleted && task.maxProgress > 1 && (
                        <div className="mb-2">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-gray-400">Progress</span>
                            <span className="text-xs text-gray-400">
                              {formatProgress(task)}
                            </span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full bg-gradient-to-r ${getTaskColor(task)}`}
                              style={{
                                width: `${Math.min((task.progress / task.maxProgress) * 100, 100)}%`
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Task not ready warning */}
                    {!canComplete && !task.completed && !isProcessing && (
                      <div className="mb-3 p-3 bg-yellow-600/10 border border-yellow-500/20 rounded-lg">
                        <div className="flex items-start space-x-2 mb-1">
                          <AlertTriangle className="w-4 h-4 text-yellow-400" />
                          <span className="text-yellow-300 text-sm font-medium flex-1">
                            {task.type === 'achievement' && task.id === 'early-adopter' && (user?.accountAge || 0) < 5 
                              ? 'Achievement Locked' 
                              : 'Task Not Ready'}
                          </span>
                        </div>
                        <p className="text-yellow-200/80 text-xs">
                          {task.type === 'achievement' && task.id === 'early-adopter' && (user?.accountAge || 0) < 5 
                            ? `Requires a Discord account that's at least 5 years old. Your account is ${user?.accountAge || 0} years old.`
                            : 'Complete the required actions to unlock the reward.'}
                          {task.id === 'social-media-master' && (
                            <span className="block mt-1">
                              You need to complete all social media tasks first. 
                              Current progress: {task.progress}/{task.maxProgress} tasks completed.
                            </span>
                          )}
                          {task.id === 'mine-1-hour' && (
                            <span className="block mt-1">
                              You need to mine for 1 hour continuously.
                              Current progress: {formatProgress(task)}
                            </span>
                          )}
                          {task.id === 'weekly-mining' && (
                            <span className="block mt-1">
                              You need to earn 1000 CORD from mining this week.
                              Current progress: {task.progress}/{task.maxProgress} CORD
                            </span>
                          )}
                          {task.id === 'invite-friends' && (
                            <span className="block mt-1">
                              You need to invite 3 friends using your referral code.
                              Current progress: {task.progress}/{task.maxProgress} friends
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    {/* Reward display */}
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <Gift className="w-4 h-4 text-yellow-400" />
                        <span className="text-gray-300">Reward:</span>
                        <span className="text-yellow-400 font-medium">
                          {task.reward} CORD
                        </span>
                      </div>
                      
                      {task.xpReward && (
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-blue-400" />
                          <span className="text-blue-400 font-medium">
                            {task.xpReward} XP
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action button */}
                <div className="flex-shrink-0 min-w-[120px] text-right">
                  {isCompleted ? (
                    <div className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600/20 border border-green-500/30 rounded-lg w-full">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-green-300 font-medium text-sm">
                        {task.type === 'social' ? 'Completed ✓' : 'Completed'}
                      </span>
                    </div>
                  ) : task.type === 'social' && showClaimButtons[task.id] ? (
                    <button
                      onClick={() => handleTaskAction(task)} 
                      disabled={isProcessing}
                      className="px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl w-full"
                    >
                      {isProcessing ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          <span>Claiming...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>Claim Reward</span>
                        </>
                      )}
                    </button>
                  ) : task.type === 'social' ? (
                    <button 
                      onClick={() => handleSocialTaskClick(task)}
                      disabled={isProcessing}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center justify-center space-x-2 ${
                        socialLinksVisited[task.id] 
                          ? 'bg-green-600 hover:bg-green-700' 
                          : 'bg-blue-600 hover:bg-blue-700'
                      } text-white shadow-lg hover:shadow-xl w-full`}
                    >
                      {socialLinksVisited[task.id] ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>Claim Reward</span>
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-4 h-4" />
                          <span>Visit Link</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleTaskAction(task)}
                      disabled={isProcessing || !canComplete}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center space-x-2 ${
                        isProcessing
                          ? 'bg-gray-600 text-gray-300 cursor-not-allowed w-full'
                          : canComplete
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isProcessing ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : canComplete ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>Complete</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4" />
                          <span>Not Ready</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <Target className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No tasks found</h3>
          <p className="text-gray-500">
            {selectedCategory === 'all' 
              ? 'No tasks are available at the moment.' 
              : `No ${selectedCategory} tasks are available.`}
          </p>
        </div>
      )}
    </div>
  );
};

export default Tasks;