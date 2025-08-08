import React, { useState, useEffect } from 'react';
import { 
  Coins, 
  TrendingUp, 
  Users, 
  Clock,
  Award,
  Zap,
  Star,
  Target,
  Play,
  Pause,
  Gift,
  CheckCircle,
  Calendar
} from 'lucide-react';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { GradientText } from '@/components/ui/GradientText';
import { StatsCard } from '@/components/ui/StatsCard';
import { SimpleButton } from '@/components/ui/SimpleButton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useNodeMining } from '@/hooks/useNodeMining';
import { useTasks } from '@/hooks/useTasks';
import { useApi } from '@/hooks/useApi';
import { cn } from '@/lib/utils';
import type { UserData } from '../../types';

interface ModernAppProps {
  user: UserData;
  onUserUpdate: (user: UserData) => void;
}

const FloatingCord: React.FC<{ show: boolean }> = ({ show }) => {
  if (!show) return null;
  
  return (
    <div className="absolute right-4 top-4 pointer-events-none z-10 cord-collect-animation">
      <div className="flex items-center space-x-1 text-green-400 font-bold text-lg">
        <span>+</span>
        <span>0.5</span>
        <span className="text-xs">CORD</span>
      </div>
    </div>
  );
};

const MiningNode: React.FC<{ user: UserData; onUserUpdate: (user: UserData) => void }> = ({ 
  user, 
  onUserUpdate 
}) => {
  const { isActive, earnings, timeActive, efficiency, toggleMining } = useNodeMining(user, onUserUpdate);
  const [showCordAnimation, setShowCordAnimation] = useState(false);

  // Show CORD collection animation every 2 seconds when mining
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setShowCordAnimation(true);
      setTimeout(() => setShowCordAnimation(false), 1000);
    }, 2000);

    return () => clearInterval(interval);
  }, [isActive]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatedCard 
      className="p-8 bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 relative overflow-hidden"
      glow={isActive}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(34, 197, 94, 0.2) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(16, 185, 129, 0.2) 0%, transparent 50%)
          `
        }} />
      </div>

      <FloatingCord show={showCordAnimation} />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <div className={cn(
            "relative p-3 rounded-full transition-all duration-300",
            isActive ? "bg-green-500/20 animate-pulse" : "bg-slate-700/50"
          )}>
            <Zap className={cn(
              "w-6 h-6 transition-colors duration-300",
              isActive ? "text-green-400" : "text-slate-400"
            )} />
            {isActive && (
              <div className="absolute inset-0 rounded-full bg-green-500/30 animate-pulse" />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Mining Node</h2>
            <p className="text-slate-400 text-sm">
              {isActive ? 'Active & Mining' : 'Ready to Mine'}
            </p>
          </div>
        </div>

        <Badge 
          className={cn(
            "px-4 py-2 text-sm font-medium transition-all duration-300",
            isActive 
              ? "bg-green-500/20 text-green-400 border-green-500/30" 
              : "bg-slate-700/50 text-slate-400 border-slate-600/50"
          )}
        >
          {isActive ? 'ONLINE' : 'OFFLINE'}
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="text-center hover-lift">
          <div className="flex items-center justify-center mb-2">
            <TrendingUp className="w-5 h-5 text-green-400 mr-2" />
            <span className="text-sm text-slate-400">Current Rate</span>
          </div>
          <div className="text-2xl font-bold">
            <GradientText from="from-green-400" to="to-emerald-500">
              {(0.5 * efficiency).toFixed(2)}
            </GradientText>
          </div>
          <div className="text-xs text-slate-500">CORD/min</div>
        </div>

        <div className="text-center hover-lift">
          <div className="flex items-center justify-center mb-2">
            <Clock className="w-5 h-5 text-blue-400 mr-2" />
            <span className="text-sm text-slate-400">Active Time</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {formatTime(timeActive)}
          </div>
          <div className="text-xs text-slate-500">Hours:Min:Sec</div>
        </div>

        <div className="text-center hover-lift">
          <div className="flex items-center justify-center mb-2">
            <Award className="w-5 h-5 text-purple-400 mr-2" />
            <span className="text-sm text-slate-400">Session Earned</span>
          </div>
          <div className="text-2xl font-bold">
            <GradientText from="from-purple-400" to="to-pink-500">
              {earnings.toFixed(2)}
            </GradientText>
          </div>
          <div className="text-xs text-slate-500">CORD</div>
        </div>
      </div>

      {/* Efficiency Meter */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-slate-400">Mining Efficiency</span>
          <span className="text-sm font-medium text-white">{Math.round(efficiency * 100)}%</span>
        </div>
        <Progress 
          value={efficiency * 100} 
          className="h-2 bg-slate-700/50"
        />
      </div>

      {/* Mining Control Button */}
      <SimpleButton
        onClick={toggleMining}
        size="lg"
        variant={isActive ? 'danger' : 'primary'}
        className="w-full"
      >
        <div className="flex items-center space-x-3">
          {isActive ? (
            <>
              <Pause className="w-5 h-5" />
              <span>Stop Mining</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              <span>Start Mining</span>
            </>
          )}
        </div>
      </SimpleButton>
    </AnimatedCard>
  );
};

const TaskPanel: React.FC<{ user: UserData; onUserUpdate: (user: UserData) => void }> = ({ 
  user, 
  onUserUpdate 
}) => {
  const { data: tasks, isLoading, completeTask } = useTasks(user.id);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { key: 'all', label: 'All Tasks', count: tasks?.length || 0 },
    { key: 'daily', label: 'Daily', count: tasks?.filter(t => t.type === 'daily').length || 0 },
    { key: 'weekly', label: 'Weekly', count: tasks?.filter(t => t.type === 'weekly').length || 0 },
    { key: 'social', label: 'Social', count: tasks?.filter(t => t.type === 'social').length || 0 },
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

  if (isLoading) {
    return (
      <AnimatedCard className="p-8">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-slate-700/50 rounded-lg" />
            </div>
          ))}
        </div>
      </AnimatedCard>
    );
  }

  return (
    <AnimatedCard className="p-8 bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">
            <GradientText from="from-blue-400" to="to-purple-600">
              Tasks & Rewards
            </GradientText>
          </h2>
          <p className="text-slate-400">Complete tasks to earn CORD tokens</p>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-white">
            {completedTasks}/{filteredTasks.length}
          </div>
          <div className="text-sm text-slate-400">Completed</div>
          <div className="text-lg font-medium text-green-400">
            +{totalRewards} CORD earned
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {filteredTasks.map((task) => {
          const progressPercentage = task.maxProgress > 1 
            ? (task.progress / task.maxProgress) * 100 
            : task.progress >= task.maxProgress ? 100 : 0;
          const canComplete = task.progress >= task.maxProgress && !task.completed;

          return (
            <div
              key={task.id}
              className={cn(
                "relative rounded-xl border p-6 transition-all duration-300 animate-slide-up hover-lift",
                task.completed 
                  ? "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30" 
                  : "bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 hover:border-slate-600/50"
              )}
            >
              {/* Task Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20">
                    {task.id === 'daily-checkin' ? (
                      <Calendar className="w-5 h-5 text-blue-400" />
                    ) : (
                      <Gift className="w-5 h-5 text-blue-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">{task.title}</h3>
                    <p className="text-slate-400 text-sm">{task.description}</p>
                  </div>
                </div>
                
                {task.completed && (
                  <CheckCircle className="w-6 h-6 text-green-400" />
                )}
              </div>

              {/* Progress Bar (if applicable) */}
              {task.maxProgress > 1 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">Progress</span>
                    <span className="text-xs text-slate-300">
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
                <div className="flex items-center space-x-2">
                  <Gift className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-slate-300">Reward:</span>
                  <GradientText className="font-bold">
                    {task.reward} CORD
                  </GradientText>
                </div>

                {task.completed ? (
                  <div className="flex items-center text-green-400 text-sm font-medium">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Completed
                  </div>
                ) : canComplete ? (
                  <SimpleButton
                    onClick={() => handleCompleteTask(task.id)}
                    size="sm"
                    variant="primary"
                  >
                    Claim
                  </SimpleButton>
                ) : task.socialUrl ? (
                  <SimpleButton
                    onClick={() => window.open(task.socialUrl, '_blank')}
                    size="sm"
                    variant="secondary"
                  >
                    Open Link
                  </SimpleButton>
                ) : (
                  <span className="text-xs text-slate-500">
                    {progressPercentage < 100 ? `${Math.round(progressPercentage)}% Complete` : 'In Progress'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AnimatedCard>
  );
};

export const ModernApp: React.FC<ModernAppProps> = ({ user, onUserUpdate }) => {
  const [time, setTime] = useState(new Date());
  const [stats] = useState({
    totalUsers: 1250,
    activeMiners: 89,
    totalMined: 125000,
    userRank: user.rank || 0
  });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Animated background elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-green-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-3/4 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }} />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-12 animate-slide-up">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-5xl font-bold text-white mb-2">
                Welcome back, <GradientText>{user.username}</GradientText>
              </h1>
              <p className="text-slate-400 text-lg">
                {time.toLocaleTimeString()} • {time.toLocaleDateString()}
              </p>
            </div>
            
            <div className="mt-4 md:mt-0 flex items-center space-x-4">
              <Badge className="px-4 py-2 text-sm border-green-500/30 text-green-400">
                Rank #{user.rank || 'Unranked'}
              </Badge>
              {user.hasBadgeOfHonor && (
                <Badge className="px-4 py-2 text-sm border-purple-500/30 text-purple-400">
                  Badge of Honor
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatsCard
            title="Current Balance"
            value={user.currentBalance?.toFixed(2) || '0.00'}
            subtitle="CORD tokens"
            icon={<Coins className="w-6 h-6 text-green-400" />}
            gradient="from-green-400 to-emerald-600"
            delay={0}
            trend={12}
          />
          
          <StatsCard
            title="Total Earned"
            value={user.totalEarned?.toFixed(2) || '0.00'}
            subtitle="All time earnings"
            icon={<TrendingUp className="w-6 h-6 text-blue-400" />}
            gradient="from-blue-400 to-blue-600"
            delay={1}
            trend={8}
          />
          
          <StatsCard
            title="Global Rank"
            value={`#${user.rank || '---'}`}
            subtitle={`of ${stats.totalUsers} miners`}
            icon={<Award className="w-6 h-6 text-purple-400" />}
            gradient="from-purple-400 to-purple-600"
            delay={2}
          />
          
          <StatsCard
            title="Active Miners"
            value={stats.activeMiners}
            subtitle="Currently online"
            icon={<Users className="w-6 h-6 text-orange-400" />}
            gradient="from-orange-400 to-orange-600"
            delay={3}
            trend={5}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Mining Node - Takes 2 columns on large screens */}
          <div className="xl:col-span-2 space-y-8">
            <MiningNode user={user} onUserUpdate={onUserUpdate} />
            <TaskPanel user={user} onUserUpdate={onUserUpdate} />
          </div>
          
          {/* Sidebar */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <AnimatedCard 
              className="p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50"
              delay={3}
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2 text-blue-400" />
                Quick Stats
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    label: 'Mining Rate',
                    value: `${(0.5 * user.multiplier).toFixed(1)}/min`,
                    icon: <Zap className="w-4 h-4" />,
                    color: 'text-green-400'
                  },
                  {
                    label: 'Multiplier',
                    value: `${user.multiplier}x`,
                    icon: <Star className="w-4 h-4" />,
                    color: 'text-yellow-400'
                  },
                  {
                    label: 'Account Age',
                    value: `${user.accountAge}y`,
                    icon: <Clock className="w-4 h-4" />,
                    color: 'text-blue-400'
                  },
                  {
                    label: 'Badge Status',
                    value: user.hasBadgeOfHonor ? 'Honor' : 'None',
                    icon: <Award className="w-4 h-4" />,
                    color: user.hasBadgeOfHonor ? 'text-purple-400' : 'text-slate-400'
                  }
                ].map((action, index) => (
                  <div
                    key={action.label}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg bg-slate-700/30 border border-slate-600/30 hover-lift animate-slide-right"
                    )}
                    style={{ animationDelay: `${400 + (index * 100)}ms` }}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={action.color}>{action.icon}</div>
                      <span className="text-sm text-slate-300">{action.label}</span>
                    </div>
                    <span className={cn("text-sm font-bold", action.color)}>
                      {action.value}
                    </span>
                  </div>
                ))}
              </div>
            </AnimatedCard>
          </div>
        </div>
      </div>
    </div>
  );
};