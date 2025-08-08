import React, { useState } from 'react';
import { Settings, Activity, Zap, TrendingUp, Server, AlertCircle, Play, Square, Bell, Database, Clock, CheckCircle } from 'lucide-react';
import { UserData } from '../types';
import { useNodeMining } from '../hooks/useNodeMining';
import { useAntiCheat } from '../hooks/useAntiCheat';
import { getPenaltyDescription } from '../utils/antiCheat';

interface NodeManagerProps {
  user: UserData;
  onUserUpdate: (user: UserData) => void;
}

const NodeManager: React.FC<NodeManagerProps> = ({ user, onUserUpdate }) => {
  const { nodeStats, isStarting, startNode, stopNode, currentSession } = useNodeMining(user, onUserUpdate);
  const { antiCheatStatus, loading: antiCheatLoading } = useAntiCheat(user);

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartNode = async () => {
    await startNode();
  };

  const handleStopNode = async () => {
    await stopNode();
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Node Manager</h1>
        <p className="text-gray-400 text-sm sm:text-base">
          Manage your mining node with real-time database persistence
        </p>
      </div>

      {/* Node Control Panel */}
      <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-800 mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-lg relative ${nodeStats.isActive ? 'bg-green-600' : 'bg-gray-600'}`}>
              <Server className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              {nodeStats.isActive && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              )}
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-white">Mining Node</h3>
              <div className="flex items-center space-x-2 text-sm sm:text-base">
                <span className="text-gray-400">Status:</span>
                <span className={nodeStats.isActive ? 'text-green-400' : 'text-red-400'}>
                  {nodeStats.isActive ? 'Active & Mining' : 'Inactive'}
                </span>
                {currentSession && (
                  <div className="flex items-center space-x-1 text-blue-400">
                    <Database className="w-3 h-3" />
                    <span className="text-xs">DB Connected</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={nodeStats.isActive ? handleStopNode : handleStartNode}
            disabled={isStarting}
            className={`w-full sm:w-auto px-4 sm:px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2 ${
              nodeStats.isActive 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white'
            } ${isStarting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isStarting ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Starting...</span>
              </>
            ) : nodeStats.isActive ? (
              <>
                <Square className="w-4 h-4" />
                <span>Stop Node</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Start Node</span>
              </>
            )}
          </button>
        </div>

        {/* Anti-Cheat Status */}
        {/* {antiCheatStatus && antiCheatStatus.penaltyLevel > 0 && (
          <div className={`border rounded-lg p-4 mb-6 ${
            antiCheatStatus.penaltyLevel >= 3 ? 'bg-red-600/20 border-red-500/30' :
            antiCheatStatus.penaltyLevel >= 2 ? 'bg-orange-600/20 border-orange-500/30' :
            'bg-yellow-600/20 border-yellow-500/30'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className={`w-4 h-4 ${
                  antiCheatStatus.penaltyLevel >= 3 ? 'text-red-400' :
                  antiCheatStatus.penaltyLevel >= 2 ? 'text-orange-400' :
                  'text-yellow-400'
                }`} />
                <span className={`font-medium text-sm ${
                  antiCheatStatus.penaltyLevel >= 3 ? 'text-red-400' :
                  antiCheatStatus.penaltyLevel >= 2 ? 'text-orange-400' :
                  'text-yellow-400'
                }`}>
                  Anti-Cheat System Active
                </span>
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium ${
                  antiCheatStatus.penaltyLevel >= 3 ? 'text-red-400' :
                  antiCheatStatus.penaltyLevel >= 2 ? 'text-orange-400' :
                  'text-yellow-400'
                }`}>
                  {(antiCheatStatus.efficiencyMultiplier * 100).toFixed(0)}% Efficiency
                </div>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-300">
              {getPenaltyDescription(antiCheatStatus.penaltyLevel)}
            </div>
            {antiCheatStatus.otherUsersOnIp > 0 && (
              <div className="mt-1 text-xs text-gray-400">
                {antiCheatStatus.otherUsersOnIp + 1} accounts detected from this IP address
              </div>
            )}
          </div>
        )} */}

        {/* Real-time Earnings Display */}
        {nodeStats.isActive && (
          <div className="bg-gradient-to-r from-green-500/20 to-green-400/20 border border-green-500/30 rounded-lg p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
              <div>
                <h4 className="text-green-400 font-medium text-sm sm:text-base flex items-center space-x-2">
                  <Zap className="w-4 h-4" />
                  <span>Currently Earning</span>
                </h4>
                <p className="text-white text-xl sm:text-2xl font-bold">
                  {(1 * user.multiplier).toFixed(2)} CORD/min
                </p>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-green-400 text-xs sm:text-sm">Session Earnings</div>
                <div className="text-white font-semibold text-sm sm:text-base">
                  {nodeStats.dailyEarnings.toFixed(4)} CORD
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Node Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-xs sm:text-sm">Uptime</span>
              <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-cyan-400" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-white">{formatUptime(nodeStats.uptime)}</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-xs sm:text-sm">Hash Rate</span>
              <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-white">{nodeStats.hashRate.toFixed(1)} H/s</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-xs sm:text-sm">Session Earnings</span>
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-white">{nodeStats.dailyEarnings.toFixed(4)} CORD</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-xs sm:text-sm">Efficiency</span>
              <Settings className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-white">{nodeStats.efficiency.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-800">
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">Hash Rate History</h3>
          <div className="h-48 sm:h-64 flex items-end space-x-1 sm:space-x-2">
            {Array.from({ length: 20 }, (_, i) => {
              const height = nodeStats.isActive ? 
                Math.max(30, Math.min(100, 50 + Math.sin(i * 0.5) * 30 + Math.random() * 20)) :
                Math.random() * 20;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-t transition-all duration-500 ${
                    nodeStats.isActive 
                      ? 'bg-gradient-to-t from-cyan-500 to-purple-600' 
                      : 'bg-gradient-to-t from-gray-600 to-gray-500 opacity-50'
                  }`}
                  style={{ height: `${height}%` }}
                ></div>
              );
            })}
          </div>
          <div className="mt-4 text-center">
            <span className="text-gray-400 text-xs sm:text-sm">
              {nodeStats.isActive ? 'Real-time mining data' : 'Node inactive'}
            </span>
          </div>
        </div>

        <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-800">
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">Earnings Projection</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm sm:text-base">Hourly Rate</span>
              <span className="text-white font-semibold text-sm sm:text-base">
                {(30 * user.multiplier * (antiCheatStatus?.efficiencyMultiplier || 1)).toFixed(1)} CORD/h
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm sm:text-base">Daily Projection</span>
              <span className="text-white font-semibold text-sm sm:text-base">
                {(720 * user.multiplier * (antiCheatStatus?.efficiencyMultiplier || 1)).toFixed(0)} CORD
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm sm:text-base">Weekly Projection</span>
              <span className="text-white font-semibold text-sm sm:text-base">
                {(5040 * user.multiplier * (antiCheatStatus?.efficiencyMultiplier || 1)).toFixed(0)} CORD
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm sm:text-base">Monthly Projection</span>
              <span className="text-white font-semibold text-sm sm:text-base">
                {(21600 * user.multiplier * (antiCheatStatus?.efficiencyMultiplier || 1)).toFixed(0)} CORD
              </span>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 sm:p-4 mt-4">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                <span className="text-blue-400 font-medium text-sm sm:text-base">Multiplier Bonus</span>
              </div>
              <p className="text-gray-300 text-xs sm:text-sm">
                {(0.5 * user.multiplier * (antiCheatStatus?.efficiencyMultiplier || 1)).toFixed(2)} CORD/min
                {/* {antiCheatStatus && antiCheatStatus.penaltyLevel > 0 && (
                  <span className="block mt-1 text-yellow-400">
                    Anti-cheat system is reducing efficiency to {(antiCheatStatus.efficiencyMultiplier * 100).toFixed(0)}% due to shared IP usage.
                  </span>
                )} */}
              </p>
              {antiCheatStatus && antiCheatStatus.penaltyLevel > 0 && (
                <p className="text-yellow-400 text-xs">
                  Base rate: {(0.5 * user.multiplier).toFixed(2)} CORD/min • 
                  Efficiency: {(antiCheatStatus.efficiencyMultiplier * 100).toFixed(0)}%
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Node Configuration */}
      {/* <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-800">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">Node Configuration</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Mining Intensity</label>
            <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm sm:text-base">
              <option value="low">Low (Conservative)</option>
              <option value="medium" defaultValue="medium">Medium (Balanced)</option>
              <option value="high">High (Aggressive)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Auto-Start</label>
            <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm sm:text-base">
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Save Frequency</label>
            <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm sm:text-base">
              <option value="10s">Every 10 seconds (Active)</option>
              <option value="30s">Every 30 seconds</option>
              <option value="60s">Every minute</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Offline Earnings</label>
            <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm sm:text-base">
              <option value="8h">8 Hours Max</option>
              <option value="4h">4 Hours Max</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>
      </div> */}
    </div>
  );
};

export default NodeManager;