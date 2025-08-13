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
  Shield,
  UserCheck,
  Settings
} from 'lucide-react';
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useNodeMining } from '@/hooks/useNodeMining';
import { useTasks } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import type { UserData } from '../../types';

interface NewDashboardProps {
  user: UserData;
  onUserUpdate: (user: UserData) => void;
}

const StatCard = ({ 
  value, 
  label, 
  change, 
  icon: Icon, 
  color = "emerald",
  bgClass = ""
}: { 
  value: string | number; 
  label: string; 
  change?: string; 
  icon: React.ElementType;
  color?: string;
  bgClass?: string;
}) => {
  const colorClasses = {
    emerald: "from-emerald-500 to-emerald-600",
    blue: "from-blue-500 to-blue-600", 
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600"
  };

  return (
    <div className={cn(
      "relative p-6 rounded-2xl border border-gray-700/50 backdrop-blur-sm",
      bgClass || `bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]}`
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm">
          <Icon className="w-6 h-6 text-white" />
        </div>
        {change && (
          <div className="text-white/80 text-sm font-medium bg-white/10 px-2 py-1 rounded">
            {change}
          </div>
        )}
      </div>
      <div className="text-3xl font-bold text-white mb-2">{value}</div>
      <div className="text-white/70 text-sm">{label}</div>
    </div>
  );
};

const QuickStatsItem = ({ 
  icon: Icon, 
  label, 
  value, 
  color = "text-blue-400" 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string; 
  color?: string; 
}) => (
  <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-800/50 backdrop-blur-sm border border-gray-700/50">
    <div className={cn("p-2 rounded-lg bg-gray-700/50", color.replace('text-', 'bg-').replace('-400', '-500/20'))}>
      <Icon className={cn("w-4 h-4", color)} />
    </div>
    <div className="flex-1">
      <div className="text-sm text-gray-400">{label}</div>
      <div className="font-semibold text-white">{value}</div>
    </div>
  </div>
);

export const NewDashboard: React.FC<NewDashboardProps> = ({ user, onUserUpdate }) => {
  const { isActive, earnings, timeActive, efficiency, toggleMining } = useNodeMining(user, onUserUpdate);
  const { tasks } = useTasks(user);
  
  // Calculate stats
  const currentTime = new Date();
  const timeString = currentTime.toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    month: 'numeric',
    day: 'numeric',
    year: 'numeric'
  });

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const completedTasks = tasks?.filter(task => task.completed).length || 0;
  const totalCordFromTasks = tasks?.filter(task => task.completed).reduce((sum, task) => sum + task.reward, 0) || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white">
      {/* Animated background particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-40 right-20 w-60 h-60 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="text-4xl font-bold">Welcome Back</div>
              <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-sm font-medium rounded-full border border-emerald-500/30">
                Rank #{user.rank || 145}
              </div>
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              {user.username}
            </div>
            <div className="text-gray-400 text-sm">{timeString}</div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-4 py-2 bg-gray-800/50 rounded-lg border border-gray-700/50 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-white" />
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">User Name</div>
                <div className="text-sm font-semibold">Age: 3.7y, Multiplier: {user.multiplier || 1.5}x</div>
              </div>
            </div>
            <WalletMultiButton />
          </div>
        </div>

        {/* Quick Stats Section */}
        <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-semibold text-lg">Quick Stats</div>
              <div className="text-sm text-gray-400">{user.username}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickStatsItem 
              icon={TrendingUp} 
              label="Mining Rate" 
              value="0.7/min" 
              color="text-emerald-400"
            />
            <QuickStatsItem 
              icon={Zap} 
              label="Multiplier" 
              value={`${user.multiplier || 1.5}x`}
              color="text-yellow-400"
            />
            <QuickStatsItem 
              icon={Clock} 
              label="Account Age" 
              value="3.7 Years"
              color="text-blue-400"
            />
            <QuickStatsItem 
              icon={Shield} 
              label="Badge Status" 
              value="No"
              color="text-gray-400"
            />
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            icon={Coins}
            value={(user.currentBalance || 485007).toLocaleString()}
            label="Current Balance in CORD Tokens."
            change="+12.09%"
            color="emerald"
          />
          <StatCard 
            icon={TrendingUp}
            value={(user.totalEarned || 20098).toLocaleString()}
            label="Total Earned CORD Tokens."
            change="+12.09%"
            color="blue"
          />
          <StatCard 
            icon={Award}
            value={`#${user.rank || 145}`}
            label="Your Rank out of 14500 miners."
            change="+12.09%"
            color="purple"
          />
          <StatCard 
            icon={Users}
            value="107"
            label="Active Miners across the platform."
            change="+12.09%"
            color="orange"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Mining Node Section */}
          <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-lg">Mining Node</div>
                  <div className="text-sm text-gray-400">{isActive ? 'Active & Mining' : 'Ready To Mine'}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-gray-700/30 rounded-lg border border-gray-600/50">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400 mr-1" />
                  <span className="text-xs text-gray-400">Current Rate</span>
                </div>
                <div className="text-lg font-bold">{(0.5 * (efficiency || 1)).toFixed(6)}</div>
                <div className="text-xs text-gray-500">CORD/Min</div>
              </div>
              <div className="text-center p-4 bg-gray-700/30 rounded-lg border border-gray-600/50">
                <div className="flex items-center justify-center mb-2">
                  <Clock className="w-4 h-4 text-cyan-400 mr-1" />
                  <span className="text-xs text-gray-400">Active Time</span>
                </div>
                <div className="text-lg font-bold">{formatTime(timeActive || 0)}</div>
                <div className="text-xs text-gray-500">Hour, Mins, Sec</div>
              </div>
              <div className="text-center p-4 bg-gray-700/30 rounded-lg border border-gray-600/50">
                <div className="flex items-center justify-center mb-2">
                  <CheckCircle className="w-4 h-4 text-cyan-400 mr-1" />
                  <span className="text-xs text-gray-400">Session Earned</span>
                </div>
                <div className="text-lg font-bold">{earnings?.toFixed(6) || '0.000000'}</div>
                <div className="text-xs text-gray-500">CORD</div>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Mining Efficiency</span>
                <span className="text-sm font-semibold">{Math.round((efficiency || 1) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${Math.round((efficiency || 1) * 100)}%` }}
                ></div>
              </div>
            </div>

            <button 
              onClick={toggleMining}
              className={cn(
                "w-full py-3 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02]",
                isActive 
                  ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                  : "bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
              )}
            >
              {isActive ? 'Stop Mining' : 'Start Mining'}
            </button>
          </div>

          {/* Badge of Honor Section */}
          <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-lg">Badge Of Honor</div>
                  <div className="text-sm text-gray-400">Unlock premium benefits and stand out from the crowd.</div>
                </div>
              </div>
              <div className="px-3 py-1 bg-purple-500/20 text-purple-400 text-sm font-medium rounded-full border border-purple-500/30">
                Premium
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="text-lg font-semibold mb-3">Advantages</div>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm">5% Mining Bonus</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm">Priority Support</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm">Exclusive Badge Display</span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="text-2xl font-bold mb-1">0.02 SOL</div>
              <div className="text-sm text-gray-400">~ 2.509 USD</div>
            </div>

            <button className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02]">
              Connect Wallet
            </button>
          </div>
        </div>

        {/* Tasks and Rewards Section */}
        <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="font-semibold text-xl">Tasks and Rewards</div>
              <div className="text-sm text-gray-400">Complete Tasks to earn CORD Tokens.</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-700/30 rounded-xl p-4 border border-gray-600/50">
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-1">Tasks</div>
                <div className="text-sm text-gray-400 mb-1">Completed</div>
                <div className="text-2xl font-bold">{completedTasks} - {tasks?.length || 0}</div>
              </div>
            </div>
            <div className="bg-gray-700/30 rounded-xl p-4 border border-gray-600/50">
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-1">CORD</div>
                <div className="text-sm text-gray-400 mb-1">Earned</div>
                <div className="text-2xl font-bold">{totalCordFromTasks.toFixed(2)} CORD</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};