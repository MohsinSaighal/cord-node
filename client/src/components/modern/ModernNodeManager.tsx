import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Play, 
  Square, 
  TrendingUp, 
  Clock, 
  Award,
  Server,
  Database,
  Activity,
  Settings,
  Shield
} from 'lucide-react';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { GradientText } from '@/components/ui/GradientText';
import { StatsCard } from '@/components/ui/StatsCard';
import { SimpleButton } from '@/components/ui/SimpleButton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useNodeMining } from '@/hooks/useNodeMining';
import { useAntiCheat } from '@/hooks/useAntiCheat';
import { cn } from '@/lib/utils';
import type { UserData } from '../../types';

interface ModernNodeManagerProps {
  user: UserData;
  onUserUpdate: (user: UserData) => void;
}

const FloatingParticles: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-cyan-400 rounded-full opacity-30 animate-float"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 6}s`,
            animationDuration: `${4 + Math.random() * 4}s`
          }}
        />
      ))}
    </div>
  );
};

const MiningStatusPanel: React.FC<{ 
  isActive: boolean;
  uptime: number;
  earnings: number;
  efficiency: number;
  onToggle: () => void;
  loading: boolean;
}> = ({ isActive, uptime, earnings, efficiency, onToggle, loading }) => {
  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatedCard className="relative overflow-hidden p-8 bg-gradient-to-br from-slate-800/40 to-slate-900/60 border-slate-700/30 backdrop-blur-xl">
      <FloatingParticles />
      
      {/* Status Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className={cn(
            "relative p-4 rounded-2xl transition-all duration-300",
            isActive 
              ? "bg-gradient-to-br from-cyan-500/20 to-purple-600/20 animate-pulse" 
              : "bg-slate-700/30"
          )}>
            <Zap className={cn(
              "w-8 h-8 transition-colors duration-300",
              isActive ? "text-cyan-400" : "text-slate-400"
            )} />
            {isActive && (
              <div className="absolute inset-0 rounded-2xl bg-cyan-500/20 animate-pulse" />
            )}
          </div>
          
          <div>
            <h2 className="text-3xl font-bold text-white mb-1">Mining Node</h2>
            <div className="flex items-center space-x-3">
              <Badge className={cn(
                "px-3 py-1 text-sm font-medium",
                isActive 
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" 
                  : "bg-slate-700/50 text-slate-300 border-slate-600/50"
              )}>
                {isActive ? 'ONLINE' : 'OFFLINE'}
              </Badge>
              
              <div className="flex items-center space-x-1 text-purple-400 text-sm">
                <Database className="w-4 h-4" />
                <span>TypeORM Connected</span>
              </div>
            </div>
          </div>
        </div>
        
        <SimpleButton
          onClick={onToggle}
          loading={loading}
          variant={isActive ? 'danger' : 'primary'}
          size="lg"
          className={cn(
            "px-8 py-4 text-lg font-bold transition-all duration-300",
            isActive 
              ? "bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700" 
              : "bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
          )}
        >
          <div className="flex items-center space-x-2">
            {isActive ? <Square className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            <span>{isActive ? 'Stop Node' : 'Start Mining'}</span>
          </div>
        </SimpleButton>
      </div>

      {/* Mining Stats */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="text-center p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border border-cyan-500/20 hover-lift">
          <div className="flex items-center justify-center mb-3">
            <Activity className="w-6 h-6 text-cyan-400 mr-2" />
            <span className="text-slate-300 text-sm">Current Rate</span>
          </div>
          <div className="text-3xl font-bold mb-1">
            <GradientText className="bg-gradient-to-r from-cyan-400 to-blue-500">
              {(0.5 * efficiency).toFixed(2)}
            </GradientText>
          </div>
          <div className="text-xs text-slate-400">CORD per minute</div>
        </div>

        <div className="text-center p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-600/10 border border-purple-500/20 hover-lift">
          <div className="flex items-center justify-center mb-3">
            <Clock className="w-6 h-6 text-purple-400 mr-2" />
            <span className="text-slate-300 text-sm">Uptime</span>
          </div>
          <div className="text-3xl font-bold mb-1 text-white">
            {formatUptime(uptime)}
          </div>
          <div className="text-xs text-slate-400">Hours:Minutes:Seconds</div>
        </div>

        <div className="text-center p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-yellow-600/10 border border-orange-500/20 hover-lift">
          <div className="flex items-center justify-center mb-3">
            <Award className="w-6 h-6 text-orange-400 mr-2" />
            <span className="text-slate-300 text-sm">Session Earned</span>
          </div>
          <div className="text-3xl font-bold mb-1">
            <GradientText className="bg-gradient-to-r from-orange-400 to-yellow-500">
              {earnings.toFixed(2)}
            </GradientText>
          </div>
          <div className="text-xs text-slate-400">CORD tokens</div>
        </div>
      </div>

      {/* Efficiency Meter */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-slate-300 font-medium">Mining Efficiency</span>
          <span className="text-cyan-400 font-bold">{Math.round(efficiency * 100)}%</span>
        </div>
        <Progress 
          value={efficiency * 100} 
          className="h-3 bg-slate-700/50"
        />
      </div>
    </AnimatedCard>
  );
};

export const ModernNodeManager: React.FC<ModernNodeManagerProps> = ({ user, onUserUpdate }) => {
  const { nodeStats, isStarting, startNode, stopNode, currentSession } = useNodeMining(user, onUserUpdate);
  const { antiCheatStatus, loading: antiCheatLoading } = useAntiCheat(user);
  const [uptime, setUptime] = useState(0);
  const [sessionEarnings, setSessionEarnings] = useState(0);

  useEffect(() => {
    if (nodeStats.isActive && currentSession) {
      const interval = setInterval(() => {
        const now = Date.now();
        const sessionStart = new Date(currentSession.startTime).getTime();
        setUptime(Math.floor((now - sessionStart) / 1000));
        
        // Calculate session earnings
        const minutes = (now - sessionStart) / (1000 * 60);
        setSessionEarnings(minutes * 0.5 * user.multiplier);
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setUptime(0);
      setSessionEarnings(0);
    }
  }, [nodeStats.isActive, currentSession, user.multiplier]);

  const handleToggleNode = async () => {
    if (nodeStats.isActive) {
      await stopNode();
    } else {
      await startNode();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 pt-20">
      {/* Clean background elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl animate-float" />
        <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/2 left-3/4 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '6s' }} />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-12 text-center animate-slide-up">
          <h1 className="text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-sky-600 to-teal-600 bg-clip-text text-transparent">
              Mining Control
            </span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Control your mining operations with real-time database persistence and advanced monitoring
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatsCard
            title="Node Status"
            value={nodeStats.isActive ? "Active" : "Inactive"}
            subtitle="Current mining state"
            icon={<Server className="w-6 h-6" />}
            gradient="from-cyan-400 to-cyan-600"
            delay={0}
          />
          
          <StatsCard
            title="Total Uptime"
            value={`${Math.floor(nodeStats.totalUptime / 3600)}h ${Math.floor((nodeStats.totalUptime % 3600) / 60)}m`}
            subtitle="All-time running"
            icon={<Clock className="w-6 h-6" />}
            gradient="from-purple-400 to-purple-600"
            delay={1}
          />
          
          <StatsCard
            title="Security Level"
            value={antiCheatStatus?.penaltyLevel || "Clean"}
            subtitle="Anti-cheat status"
            icon={<Shield className="w-6 h-6" />}
            gradient="from-green-400 to-green-600"
            delay={2}
          />
        </div>

        {/* Main Mining Control */}
        <MiningStatusPanel
          isActive={nodeStats.isActive}
          uptime={uptime}
          earnings={sessionEarnings}
          efficiency={user.multiplier || 1}
          onToggle={handleToggleNode}
          loading={isStarting}
        />

        {/* Additional Info Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
          {/* Performance Metrics */}
          <AnimatedCard className="p-6 bg-gradient-to-br from-slate-800/30 to-slate-900/50 border-slate-700/30" delay={3}>
            <div className="flex items-center mb-6">
              <TrendingUp className="w-6 h-6 text-green-400 mr-3" />
              <h3 className="text-xl font-bold text-white">Performance Metrics</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg bg-slate-700/30">
                <span className="text-slate-300">Average Rate</span>
                <span className="text-green-400 font-bold">{(0.5 * user.multiplier).toFixed(2)} CORD/min</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-slate-700/30">
                <span className="text-slate-300">Multiplier</span>
                <span className="text-purple-400 font-bold">{user.multiplier}x</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-slate-700/30">
                <span className="text-slate-300">Account Age Bonus</span>
                <span className="text-cyan-400 font-bold">{user.accountAge} years</span>
              </div>
            </div>
          </AnimatedCard>

          {/* System Status */}
          <AnimatedCard className="p-6 bg-gradient-to-br from-slate-800/30 to-slate-900/50 border-slate-700/30" delay={4}>
            <div className="flex items-center mb-6">
              <Settings className="w-6 h-6 text-orange-400 mr-3" />
              <h3 className="text-xl font-bold text-white">System Status</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg bg-slate-700/30">
                <span className="text-slate-300">Database</span>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Connected</Badge>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-slate-700/30">
                <span className="text-slate-300">Anti-Cheat</span>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Active</Badge>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-slate-700/30">
                <span className="text-slate-300">API Status</span>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Online</Badge>
              </div>
            </div>
          </AnimatedCard>
        </div>
      </div>
    </div>
  );
};