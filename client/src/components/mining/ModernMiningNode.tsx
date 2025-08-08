import React, { useState, useEffect } from 'react';
import { Play, Pause, Zap, TrendingUp, Clock, Award } from 'lucide-react';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { GradientText } from '@/components/ui/GradientText';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useNodeMining } from '@/hooks/useNodeMining';
import { cn } from '@/lib/utils';

interface ModernMiningNodeProps {
  user: any;
  onUserUpdate: (user: any) => void;
}

const FloatingCord: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1000);
    return () => clearTimeout(timer);
  }, [onComplete]);

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

export const ModernMiningNode: React.FC<ModernMiningNodeProps> = ({ user, onUserUpdate }) => {
  const { isActive, earnings, timeActive, efficiency, toggleMining } = useNodeMining(user, onUserUpdate);
  const [showCordAnimation, setShowCordAnimation] = useState(false);
  const [cordAnimationKey, setCordAnimationKey] = useState(0);

  // Show CORD collection animation every 2 seconds when mining
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setShowCordAnimation(true);
      setCordAnimationKey(prev => prev + 1);
    }, 2000);

    return () => clearInterval(interval);
  }, [isActive]);

  const handleCordAnimationComplete = () => {
    setShowCordAnimation(false);
  };

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

      {/* Floating CORD Animation */}
      {showCordAnimation && (
        <FloatingCord key={cordAnimationKey} onComplete={handleCordAnimationComplete} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <div className={cn(
            "relative p-3 rounded-full",
            isActive ? "bg-green-500/20" : "bg-slate-700/50"
          )}>
            <Zap className={cn(
              "w-6 h-6 transition-colors duration-300",
              isActive ? "text-green-400 animate-pulse" : "text-slate-400"
            )} />
            {isActive && (
              <motion.div
                className="absolute inset-0 rounded-full bg-green-500/30"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">
              Mining Node
            </h2>
            <p className="text-slate-400 text-sm">
              {isActive ? 'Active & Mining' : 'Ready to Mine'}
            </p>
          </div>
        </div>

        <Badge 
          variant={isActive ? "default" : "secondary"}
          className={cn(
            "px-4 py-2 text-sm font-medium",
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
        <motion.div 
          className="text-center"
          whileHover={{ scale: 1.05 }}
        >
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
        </motion.div>

        <motion.div 
          className="text-center"
          whileHover={{ scale: 1.05 }}
        >
          <div className="flex items-center justify-center mb-2">
            <Clock className="w-5 h-5 text-blue-400 mr-2" />
            <span className="text-sm text-slate-400">Active Time</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {formatTime(timeActive)}
          </div>
          <div className="text-xs text-slate-500">Hours:Min:Sec</div>
        </motion.div>

        <motion.div 
          className="text-center"
          whileHover={{ scale: 1.05 }}
        >
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
        </motion.div>
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
          style={{
            background: 'linear-gradient(90deg, rgba(34, 197, 94, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)'
          }}
        />
      </div>

      {/* Mining Control Button */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Button
          onClick={toggleMining}
          size="lg"
          className={cn(
            "w-full h-14 text-lg font-bold relative overflow-hidden transition-all duration-300",
            isActive
              ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
              : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
          )}
        >
          <motion.div
            className="flex items-center space-x-3"
            animate={isActive ? { 
              x: [0, 2, 0, -2, 0], 
              transition: { duration: 0.5, repeat: Infinity, repeatDelay: 2 } 
            } : {}}
          >
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
          </motion.div>
          
          {/* Button glow effect when active */}
          {isActive && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-red-500/30 to-red-600/30"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </Button>
      </motion.div>

      {/* Mining particles effect when active */}
      {isActive && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-green-400 rounded-full opacity-60"
              style={{
                left: `${20 + (i * 12)}%`,
                top: '50%',
              }}
              animate={{
                y: [-10, -30, -10],
                opacity: [0.6, 1, 0.6],
                scale: [1, 1.2, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.2
              }}
            />
          ))}
        </div>
      )}
    </AnimatedCard>
  );
};