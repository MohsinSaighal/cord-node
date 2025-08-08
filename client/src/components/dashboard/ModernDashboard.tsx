import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Coins, 
  TrendingUp, 
  Users, 
  Clock,
  Award,
  Zap,
  Star,
  Target
} from 'lucide-react';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { GradientText } from '@/components/ui/GradientText';
import { ModernMiningNode } from '@/components/mining/ModernMiningNode';
import { ModernTaskPanel } from '@/components/tasks/ModernTaskPanel';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DashboardStats {
  totalUsers: number;
  activeMiners: number;
  totalMined: number;
  userRank: number;
}

interface ModernDashboardProps {
  user: any;
  onUserUpdate: (user: any) => void;
  stats: DashboardStats;
  tasks: any[];
  onCompleteTask: (taskId: string) => Promise<void>;
}

const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  gradient: string;
  delay: number;
  trend?: number;
}> = ({ title, value, subtitle, icon, gradient, delay, trend }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.6 }}
      whileHover={{ scale: 1.05, y: -4 }}
      className={cn(
        "relative rounded-xl p-6 overflow-hidden",
        "bg-gradient-to-br from-slate-800/80 to-slate-900/80",
        "border border-slate-700/50 backdrop-blur-sm",
        "hover:border-slate-600/50 transition-all duration-300"
      )}
    >
      {/* Background glow effect */}
      <div className={cn(
        "absolute inset-0 opacity-20 bg-gradient-to-br",
        gradient
      )} />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={cn(
            "p-3 rounded-lg bg-gradient-to-br",
            gradient.replace('to-', 'to-').replace('from-', 'from-') + '/20'
          )}>
            {icon}
          </div>
          
          {trend && (
            <div className={cn(
              "flex items-center text-xs px-2 py-1 rounded-full",
              trend > 0 ? "text-green-400 bg-green-500/20" : "text-red-400 bg-red-500/20"
            )}>
              <TrendingUp className={cn(
                "w-3 h-3 mr-1",
                trend < 0 && "rotate-180"
              )} />
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <div className="text-3xl font-bold text-white">
            <GradientText className={cn("bg-gradient-to-r", gradient)}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </GradientText>
          </div>
          <div className="text-slate-400 text-sm font-medium">{title}</div>
          {subtitle && (
            <div className="text-slate-500 text-xs">{subtitle}</div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const QuickActions: React.FC<{ user: any }> = ({ user }) => {
  const actions = [
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
  ];

  return (
    <AnimatedCard 
      className="p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50"
      delay={0.3}
    >
      <h3 className="text-lg font-bold text-white mb-4 flex items-center">
        <Target className="w-5 h-5 mr-2 text-blue-400" />
        Quick Stats
      </h3>
      
      <div className="grid grid-cols-2 gap-4">
        {actions.map((action, index) => (
          <motion.div
            key={action.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + (index * 0.1) }}
            className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30 border border-slate-600/30"
          >
            <div className="flex items-center space-x-2">
              <div className={action.color}>{action.icon}</div>
              <span className="text-sm text-slate-300">{action.label}</span>
            </div>
            <span className={cn("text-sm font-bold", action.color)}>
              {action.value}
            </span>
          </motion.div>
        ))}
      </div>
    </AnimatedCard>
  );
};

export const ModernDashboard: React.FC<ModernDashboardProps> = ({
  user,
  onUserUpdate,
  stats,
  tasks,
  onCompleteTask
}) => {
  const [time, setTime] = useState(new Date());

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
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
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
              <Badge 
                variant="outline" 
                className="px-4 py-2 text-sm border-green-500/30 text-green-400"
              >
                Rank #{user.rank || 'Unranked'}
              </Badge>
              {user.hasBadgeOfHonor && (
                <Badge 
                  variant="outline" 
                  className="px-4 py-2 text-sm border-purple-500/30 text-purple-400"
                >
                  Badge of Honor
                </Badge>
              )}
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard
            title="Current Balance"
            value={user.currentBalance?.toFixed(2) || '0.00'}
            subtitle="CORD tokens"
            icon={<Coins className="w-6 h-6 text-green-400" />}
            gradient="from-green-400 to-emerald-600"
            delay={0}
            trend={12}
          />
          
          <StatCard
            title="Total Earned"
            value={user.totalEarned?.toFixed(2) || '0.00'}
            subtitle="All time earnings"
            icon={<TrendingUp className="w-6 h-6 text-blue-400" />}
            gradient="from-blue-400 to-blue-600"
            delay={1}
            trend={8}
          />
          
          <StatCard
            title="Global Rank"
            value={`#${user.rank || '---'}`}
            subtitle={`of ${stats.totalUsers} miners`}
            icon={<Award className="w-6 h-6 text-purple-400" />}
            gradient="from-purple-400 to-purple-600"
            delay={2}
          />
          
          <StatCard
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
            <ModernMiningNode user={user} onUserUpdate={onUserUpdate} />
            <ModernTaskPanel 
              tasks={tasks} 
              onCompleteTask={onCompleteTask}
            />
          </div>
          
          {/* Sidebar */}
          <div className="space-y-8">
            <QuickActions user={user} />
            
            {/* Recent Activity */}
            <AnimatedCard 
              className="p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50"
              delay={0.5}
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-green-400" />
                Recent Activity
              </h3>
              
              <div className="space-y-3">
                {[
                  { action: 'Mining session started', time: '2 min ago', color: 'text-green-400' },
                  { action: 'Daily check-in claimed', time: '1 hour ago', color: 'text-blue-400' },
                  { action: 'Task completed', time: '3 hours ago', color: 'text-purple-400' }
                ].map((activity, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + (index * 0.1) }}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30"
                  >
                    <span className="text-sm text-slate-300">{activity.action}</span>
                    <span className={cn("text-xs font-medium", activity.color)}>
                      {activity.time}
                    </span>
                  </motion.div>
                ))}
              </div>
            </AnimatedCard>
          </div>
        </div>
      </div>
    </div>
  );
};