import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Trophy, 
  Users2, 
  Target,
  Gift,
  CheckCircle,
  ExternalLink,
  Zap,
  Star,
  Award,
  Sparkles
} from 'lucide-react';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { GradientText } from '@/components/ui/GradientText';
import { StatsCard } from '@/components/ui/StatsCard';
import { SimpleButton } from '@/components/ui/SimpleButton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTasks } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import type { UserData } from '../../types';

interface ModernTasksProps {
  user: UserData;
  onUserUpdate: (user: UserData) => void;
}

const TaskCategoryFilter: React.FC<{
  categories: Array<{ id: string; label: string; icon: React.ElementType; count: number; }>;
  selected: string;
  onChange: (category: string) => void;
}> = ({ categories, selected, onChange }) => {
  return (
    <div className="flex flex-wrap gap-3 mb-8">
      {categories.map((category) => {
        const Icon = category.icon;
        const isActive = selected === category.id;
        
        return (
          <button
            key={category.id}
            onClick={() => onChange(category.id)}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 hover-lift",
              isActive 
                ? "bg-gradient-to-r from-cyan-500/20 to-purple-600/20 text-white border border-cyan-500/30" 
                : "bg-slate-800/50 text-slate-300 border border-slate-700/30 hover:bg-slate-700/50"
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{category.label}</span>
            <Badge className={cn(
              "ml-2 px-2 py-1 text-xs",
              isActive ? "bg-cyan-500/30 text-cyan-200" : "bg-slate-600/50 text-slate-300"
            )}>
              {category.count}
            </Badge>
          </button>
        );
      })}
    </div>
  );
};

const TaskCard: React.FC<{
  task: any;
  onComplete: (taskId: string) => void;
  onSocialClick: (url: string) => void;
}> = ({ task, onComplete, onSocialClick }) => {
  const progressPercentage = task.maxProgress > 1 
    ? (task.progress / task.maxProgress) * 100 
    : task.progress >= task.maxProgress ? 100 : 0;
  const canComplete = task.progress >= task.maxProgress && !task.completed;

  const getTaskTypeGradient = (type: string) => {
    switch (type) {
      case 'daily': return 'from-orange-500/20 to-yellow-500/20';
      case 'weekly': return 'from-purple-500/20 to-pink-500/20';
      case 'social': return 'from-blue-500/20 to-cyan-500/20';
      case 'achievement': return 'from-green-500/20 to-emerald-500/20';
      default: return 'from-slate-600/20 to-slate-700/20';
    }
  };

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case 'daily': return <Calendar className="w-5 h-5 text-orange-400" />;
      case 'weekly': return <Clock className="w-5 h-5 text-purple-400" />;
      case 'social': return <Users2 className="w-5 h-5 text-cyan-400" />;
      case 'achievement': return <Trophy className="w-5 h-5 text-green-400" />;
      default: return <Target className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <AnimatedCard className={cn(
      "relative p-6 transition-all duration-300 border overflow-hidden",
      task.completed 
        ? "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30" 
        : `bg-gradient-to-br ${getTaskTypeGradient(task.type)} border-slate-700/30 hover:border-slate-600/50`
    )}>
      {/* Background sparkles for completed tasks */}
      {task.completed && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <Sparkles
              key={i}
              className="absolute w-4 h-4 text-green-400/30 animate-float"
              style={{
                left: `${10 + (i * 12)}%`,
                top: `${20 + (i % 3) * 30}%`,
                animationDelay: `${i * 0.5}s`
              }}
            />
          ))}
        </div>
      )}
      
      {/* Task Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={cn(
            "p-3 rounded-xl transition-all duration-300",
            task.completed ? "bg-green-500/20" : getTaskTypeGradient(task.type)
          )}>
            {getTaskTypeIcon(task.type)}
          </div>
          
          <div>
            <h3 className="font-bold text-white text-lg mb-1">{task.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{task.description}</p>
          </div>
        </div>
        
        {task.completed && (
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-6 h-6 text-green-400 animate-pulse" />
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              Completed
            </Badge>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {task.maxProgress > 1 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Progress</span>
            <span className="text-xs text-slate-300 font-medium">
              {task.progress}/{task.maxProgress}
            </span>
          </div>
          <Progress 
            value={progressPercentage} 
            className="h-2 bg-slate-700/50"
          />
        </div>
      )}

      {/* Reward & Action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Gift className="w-5 h-5 text-purple-400" />
          <span className="text-slate-300">Reward:</span>
          <GradientText className="font-bold text-lg bg-gradient-to-r from-purple-400 to-pink-500">
            {task.reward} CORD
          </GradientText>
        </div>

        <div className="flex items-center space-x-2">
          {task.completed ? (
            <div className="flex items-center text-green-400 font-medium">
              <CheckCircle className="w-4 h-4 mr-1" />
              <span>Claimed</span>
            </div>
          ) : canComplete ? (
            <SimpleButton
              onClick={() => onComplete(task.id)}
              size="sm"
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 px-6"
            >
              <Award className="w-4 h-4 mr-2" />
              Claim Reward
            </SimpleButton>
          ) : task.socialUrl ? (
            <SimpleButton
              onClick={() => onSocialClick(task.socialUrl)}
              size="sm"
              variant="secondary"
              className="bg-gradient-to-r from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-300"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Visit Link
            </SimpleButton>
          ) : (
            <span className="text-xs text-slate-500 flex items-center">
              <Zap className="w-3 h-3 mr-1" />
              {Math.round(progressPercentage)}% Complete
            </span>
          )}
        </div>
      </div>
    </AnimatedCard>
  );
};

export const ModernTasks: React.FC<ModernTasksProps> = ({ user, onUserUpdate }) => {
  const { tasks, loading, completeTask } = useTasks(user, onUserUpdate);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All Tasks', icon: Target, count: tasks?.length || 0 },
    { id: 'daily', label: 'Daily', icon: Calendar, count: tasks?.filter(t => t.type === 'daily').length || 0 },
    { id: 'weekly', label: 'Weekly', icon: Clock, count: tasks?.filter(t => t.type === 'weekly').length || 0 },
    { id: 'social', label: 'Social', icon: Users2, count: tasks?.filter(t => t.type === 'social').length || 0 },
    { id: 'achievement', label: 'Achievement', icon: Trophy, count: tasks?.filter(t => t.type === 'achievement').length || 0 },
  ];

  const filteredTasks = selectedCategory === 'all' 
    ? tasks || []
    : (tasks || []).filter(task => task.type === selectedCategory);

  const completedTasks = (tasks || []).filter(t => t.completed).length;
  const totalRewards = (tasks || []).reduce((sum, t) => sum + (t.completed ? t.reward : 0), 0);

  const handleCompleteTask = async (taskId: string) => {
    const result = await completeTask(taskId);
    if (result.success && result.newBalance !== undefined) {
      onUserUpdate({
        ...user,
        currentBalance: result.newBalance,
        totalEarned: user.totalEarned + (result.reward || 0)
      });
    }
  };

  const handleSocialClick = (url: string) => {
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-pink-900/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-300 text-lg">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-pink-900/20">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/6 left-1/5 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute top-2/3 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-2/3 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }} />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12 animate-slide-up">
          <h1 className="text-6xl font-bold text-white mb-4">
            <GradientText className="bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-400">
              Task Center
            </GradientText>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Complete challenges and earn CORD rewards. Daily tasks, social activities, and achievements await.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <StatsCard
            title="Completed Tasks"
            value={completedTasks}
            subtitle={`of ${tasks?.length || 0} total`}
            icon={<CheckCircle className="w-6 h-6" />}
            gradient="from-green-400 to-emerald-600"
            delay={0}
            trend={completedTasks > 0 ? 15 : undefined}
          />
          
          <StatsCard
            title="Total Rewards"
            value={`${totalRewards} CORD`}
            subtitle="Earned from tasks"
            icon={<Award className="w-6 h-6" />}
            gradient="from-purple-400 to-pink-600"
            delay={1}
          />
          
          <StatsCard
            title="Daily Progress"
            value={`${Math.round((completedTasks / (tasks?.length || 1)) * 100)}%`}
            subtitle="Tasks completed"
            icon={<Target className="w-6 h-6" />}
            gradient="from-cyan-400 to-blue-600"
            delay={2}
          />
          
          <StatsCard
            title="Streak"
            value="3 days"
            subtitle="Daily task streak"
            icon={<Star className="w-6 h-6" />}
            gradient="from-orange-400 to-yellow-600"
            delay={3}
            trend={8}
          />
        </div>

        {/* Task Category Filter */}
        <TaskCategoryFilter
          categories={categories}
          selected={selectedCategory}
          onChange={setSelectedCategory}
        />

        {/* Tasks Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredTasks.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={handleCompleteTask}
              onSocialClick={handleSocialClick}
            />
          ))}
        </div>

        {filteredTasks.length === 0 && (
          <div className="text-center py-12">
            <Target className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-300 mb-2">No tasks available</h3>
            <p className="text-slate-500">Check back later for new challenges!</p>
          </div>
        )}
      </div>
    </div>
  );
};