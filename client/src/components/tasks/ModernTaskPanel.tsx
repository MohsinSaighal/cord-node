import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  Clock, 
  Gift, 
  Calendar, 
  Twitter, 
  MessageSquare,
  Users,
  Star,
  Zap,
  Trophy
} from 'lucide-react';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { GradientText } from '@/components/ui/GradientText';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description: string;
  reward: number;
  type: 'daily' | 'weekly' | 'social' | 'achievement';
  completed: boolean;
  progress: number;
  maxProgress: number;
  socialUrl?: string;
  expiresAt?: string;
  claimedAt?: string;
}

interface ModernTaskPanelProps {
  tasks: Task[];
  onCompleteTask: (taskId: string) => Promise<void>;
  isLoading?: boolean;
}

const TaskIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'daily':
      return <Calendar className="w-5 h-5" />;
    case 'weekly':
      return <Clock className="w-5 h-5" />;
    case 'social':
      return <MessageSquare className="w-5 h-5" />;
    case 'achievement':
      return <Trophy className="w-5 h-5" />;
    default:
      return <Star className="w-5 h-5" />;
  }
};

const TaskTypeColors = {
  daily: 'from-blue-400 to-blue-600',
  weekly: 'from-purple-400 to-purple-600',
  social: 'from-pink-400 to-pink-600',
  achievement: 'from-yellow-400 to-yellow-600'
};

const TaskCard: React.FC<{ 
  task: Task; 
  onComplete: () => Promise<void>; 
  delay: number;
}> = ({ task, onComplete, delay }) => {
  const [isCompleting, setIsCompleting] = useState(false);
  const progressPercentage = (task.progress / task.maxProgress) * 100;
  const canComplete = task.progress >= task.maxProgress && !task.completed;
  const isSpecialTask = task.id === 'daily-checkin';

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      await onComplete();
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.5 }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        "relative rounded-xl border p-6 transition-all duration-300",
        task.completed 
          ? "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30" 
          : "bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 hover:border-slate-600/50"
      )}
    >
      {/* Completed Overlay */}
      {task.completed && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-4 right-4 z-10"
        >
          <CheckCircle className="w-6 h-6 text-green-400" />
        </motion.div>
      )}

      {/* Task Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={cn(
            "p-2 rounded-lg bg-gradient-to-br",
            `from-${task.type === 'daily' ? 'blue' : task.type === 'weekly' ? 'purple' : task.type === 'social' ? 'pink' : 'yellow'}-500/20`,
            `to-${task.type === 'daily' ? 'blue' : task.type === 'weekly' ? 'purple' : task.type === 'social' ? 'pink' : 'yellow'}-600/20`
          )}>
            <TaskIcon type={task.type} />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg">{task.title}</h3>
            <p className="text-slate-400 text-sm">{task.description}</p>
          </div>
        </div>
        
        <Badge 
          variant="secondary"
          className={cn(
            "px-3 py-1 text-xs font-medium capitalize",
            task.type === 'daily' && "bg-blue-500/20 text-blue-400 border-blue-500/30",
            task.type === 'weekly' && "bg-purple-500/20 text-purple-400 border-purple-500/30",
            task.type === 'social' && "bg-pink-500/20 text-pink-400 border-pink-500/30",
            task.type === 'achievement' && "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
          )}
        >
          {task.type}
        </Badge>
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

        <AnimatePresence mode="wait">
          {task.completed ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center text-green-400 text-sm font-medium"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Completed
            </motion.div>
          ) : canComplete ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Button
                onClick={handleComplete}
                disabled={isCompleting}
                size="sm"
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium"
              >
                {isCompleting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Zap className="w-4 h-4" />
                  </motion.div>
                ) : (
                  'Claim'
                )}
              </Button>
            </motion.div>
          ) : task.socialUrl ? (
            <Button
              onClick={() => window.open(task.socialUrl, '_blank')}
              size="sm"
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Open Link
            </Button>
          ) : (
            <span className="text-xs text-slate-500">
              {progressPercentage < 100 ? `${Math.round(progressPercentage)}% Complete` : 'In Progress'}
            </span>
          )}
        </AnimatePresence>
      </div>

      {/* Special Daily Check-in Highlight */}
      {isSpecialTask && !task.completed && (
        <motion.div
          className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 pointer-events-none"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
};

export const ModernTaskPanel: React.FC<ModernTaskPanelProps> = ({ 
  tasks, 
  onCompleteTask, 
  isLoading = false 
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { key: 'all', label: 'All Tasks', count: tasks.length },
    { key: 'daily', label: 'Daily', count: tasks.filter(t => t.type === 'daily').length },
    { key: 'weekly', label: 'Weekly', count: tasks.filter(t => t.type === 'weekly').length },
    { key: 'social', label: 'Social', count: tasks.filter(t => t.type === 'social').length },
    { key: 'achievement', label: 'Achievements', count: tasks.filter(t => t.type === 'achievement').length },
  ];

  const filteredTasks = selectedCategory === 'all' 
    ? tasks 
    : tasks.filter(task => task.type === selectedCategory);

  const completedTasks = tasks.filter(t => t.completed).length;
  const totalRewards = tasks.reduce((sum, t) => sum + (t.completed ? t.reward : 0), 0);

  if (isLoading) {
    return (
      <AnimatedCard className="p-8">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
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
            {completedTasks}/{tasks.length}
          </div>
          <div className="text-sm text-slate-400">Completed</div>
          <div className="text-lg font-medium text-green-400">
            +{totalRewards} CORD earned
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((category, index) => (
          <motion.button
            key={category.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => setSelectedCategory(category.key)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300",
              "flex items-center space-x-2",
              selectedCategory === category.key
                ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                : "bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border border-slate-600/50"
            )}
          >
            <span>{category.label}</span>
            <Badge 
              variant="secondary" 
              className="bg-white/20 text-white text-xs px-2 py-0.5"
            >
              {category.count}
            </Badge>
          </motion.button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        <AnimatePresence mode="wait">
          {filteredTasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-slate-400"
            >
              <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No tasks available in this category</p>
            </motion.div>
          ) : (
            filteredTasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={() => onCompleteTask(task.id)}
                delay={index}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </AnimatedCard>
  );
};