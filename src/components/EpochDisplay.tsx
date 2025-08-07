import React from 'react';
import { Calendar, Clock, Trophy, Users, Zap, TrendingUp, RefreshCw, AlertTriangle } from 'lucide-react';
import { useEpochSystem } from '../hooks/useEpochSystem';
import { UserData } from '../types';

interface EpochDisplayProps {
  user: UserData;
}

const EpochDisplay: React.FC<EpochDisplayProps> = ({ user }) => {
  const { currentEpoch, userEpochStats, loading, error, getEpochTimeRemaining, refreshEpochData } = useEpochSystem(user);

  if (loading) {
    return (
      <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-800 mb-6 sm:mb-8">
        <div className="animate-pulse">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gray-700 rounded-lg"></div>
            <div>
              <div className="h-6 bg-gray-700 rounded w-32 mb-2"></div>
              <div className="h-4 bg-gray-700 rounded w-48"></div>
            </div>
          </div>
          <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
          <div className="h-3 bg-gray-700 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (error || !currentEpoch || !userEpochStats) {
    return (
      <div className="bg-red-600/20 border border-red-500/30 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <div className="text-white font-medium">Epoch System Unavailable</div>
              <div className="text-red-400 text-sm">{error || 'Failed to load epoch data'}</div>
            </div>
          </div>
          <button
            onClick={refreshEpochData}
            className="flex items-center space-x-1 text-red-300 hover:text-red-200 text-sm underline"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  const timeRemaining = getEpochTimeRemaining();
  const isAlpha = currentEpoch.epochNumber === 0;

  return (
    <div className="bg-gradient-to-r from-purple-600/20 to-cyan-500/20 border border-purple-500/30 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-lg ${isAlpha ? 'bg-gradient-to-r from-yellow-400 to-orange-600' : 'bg-gradient-to-r from-purple-400 to-cyan-600'}`}>
            {isAlpha ? (
              <Zap className="w-6 h-6 text-white" />
            ) : (
              <Calendar className="w-6 h-6 text-white" />
            )}
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">{currentEpoch.name}</h2>
            <p className="text-gray-300 text-sm sm:text-base">{currentEpoch.description}</p>
          </div>
        </div>
        
        {timeRemaining && (
          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-bold text-white">
              {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m
            </div>
            <div className="text-gray-400 text-sm">Time Remaining</div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-300 font-medium">Epoch Progress</span>
          <span className="text-white font-bold">{currentEpoch.progressPercentage.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${
              isAlpha 
                ? 'bg-gradient-to-r from-yellow-400 to-orange-600' 
                : 'bg-gradient-to-r from-purple-400 to-cyan-600'
            }`}
            style={{ width: `${Math.min(100, currentEpoch.progressPercentage)}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{currentEpoch.startDate.toLocaleDateString()}</span>
          <span>{currentEpoch.endDate.toLocaleDateString()}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white">
            #{userEpochStats.userRank || 1}
          </div>
          <div className="text-gray-400 text-xs sm:text-sm">Your Rank</div>
          <div className="text-gray-500 text-xs">of {userEpochStats.totalParticipants || 1}</div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white">
            {Math.floor(userEpochStats.userEarnings || 0).toLocaleString()}
          </div>
          <div className="text-gray-400 text-xs sm:text-sm">Epoch Earnings</div>
          <div className="text-gray-500 text-xs">CORD</div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white">
            {userEpochStats.userTasksCompleted || 0}
          </div>
          <div className="text-gray-400 text-xs sm:text-sm">Tasks Done</div>
          <div className="text-gray-500 text-xs">this epoch</div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <Clock className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white">
            {Math.floor((userEpochStats.userMiningTime || 0) / 3600)}h
          </div>
          <div className="text-gray-400 text-xs sm:text-sm">Mining Time</div>
          <div className="text-gray-500 text-xs">this epoch</div>
        </div>
      </div>

      {/* Rewards Multiplier */}
      {(userEpochStats.rewardsMultiplier || 1) > 1 && (
        <div className="mt-4 p-3 bg-gradient-to-r from-green-600/20 to-blue-600/20 border border-green-500/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-green-400" />
              <span className="text-green-400 font-medium text-sm">Epoch Bonus Active</span>
            </div>
            <div className="text-green-400 font-bold">
              {(userEpochStats.rewardsMultiplier || 1).toFixed(1)}x rewards
            </div>
          </div>
          <p className="text-green-300 text-xs mt-1">
            All earnings in this epoch are multiplied by {(userEpochStats.rewardsMultiplier || 1).toFixed(1)}x!
          </p>
        </div>
      )}

      {/* Alpha Stage Special Message */}
      {isAlpha && (
        <div className="mt-4 p-3 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-lg">
          <div className="flex items-center space-x-2 mb-1">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 font-medium text-sm">Alpha Stage Active</span>
          </div>
          <p className="text-yellow-300 text-xs">
            Welcome to the Alpha Stage! You're among the first to experience CordNode. 
            Enjoy this exclusive early access period before Epoch 1 begins!
          </p>
        </div>
      )}
    </div>
  );
};

export default EpochDisplay;