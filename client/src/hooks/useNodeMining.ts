import { useState, useEffect, useCallback, useRef } from 'react';
import { UserData, NodeStats } from '../types';
import { apiClient } from './useApi';
import { calculateMiningRate, calculateHashRate, calculateNodeUptime } from '../utils/calculations';
import { useAntiCheat } from './useAntiCheat';

export const useNodeMining = (user: UserData, onUserUpdate: (user: UserData) => void) => {
  const { antiCheatStatus } = useAntiCheat(user);
  const [nodeStats, setNodeStats] = useState<NodeStats>({
    isActive: user.isNodeActive,
    uptime: user.nodeStartTime ? calculateNodeUptime(user.nodeStartTime) : 0,
    hashRate: 0,
    dailyEarnings: 0,
    totalEarnings: user.total_earned,
    efficiency: 85,
    startTime: user.nodeStartTime
  });

  const [isStarting, setIsStarting] = useState(false);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  
  // Use refs to track intervals and prevent memory leaks
  const miningIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedEarningsRef = useRef(0);

  // Load existing mining session on mount
  useEffect(() => {
    if (user.isNodeActive && user.nodeStartTime) {
      loadCurrentSession();
    }
  }, [user.id]);

  const loadCurrentSession = async () => {
    try {
      console.log('Loading current session for user:', user.id);
      
      const session = await apiClient.getCurrentMiningSession(user.id);

      if (session) {
        setCurrentSession(session.id);
        
        setNodeStats(prev => ({
          ...prev,
          dailyEarnings: session.earnings || 0,
          isActive: true,
          startTime: user.nodeStartTime
        }));
        
        console.log('Restored mining session:', session.id, 'with earnings:', session.earnings);
        startMiningProcess();
      }
    } catch (error) {
      console.error('Error loading current session:', error);
    }
  };

  const startMiningProcess = useCallback(() => {
    console.log('Starting mining process...');
    
    // Clear any existing intervals
    if (miningIntervalRef.current) clearInterval(miningIntervalRef.current);
    if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);

    // Reset accumulated earnings
    accumulatedEarningsRef.current = 0;

    // Start mining interval (update UI every second)
    miningIntervalRef.current = setInterval(() => {
      const miningRate = calculateMiningRate(user, antiCheatStatus);
      const hashRate = calculateHashRate(user);
      const efficiency = 85 + Math.random() * 15;
      const earningsPerSecond = miningRate / 60;
      
      // Accumulate earnings
      accumulatedEarningsRef.current += earningsPerSecond;

      setNodeStats(prev => {
        const uptime = prev.startTime ? calculateNodeUptime(prev.startTime) : 0;
        return {
          ...prev,
          uptime,
          hashRate,
          efficiency,
          dailyEarnings: prev.dailyEarnings + earningsPerSecond
        };
      });
    }, 1000);

    // Start save interval (save to database every 10 seconds)
    saveIntervalRef.current = setInterval(async () => {
      if (accumulatedEarningsRef.current > 0) {
        await saveMiningProgress(accumulatedEarningsRef.current);
        accumulatedEarningsRef.current = 0; // Reset after saving
      }
    }, 10000);

    console.log('Mining process started with intervals');
  }, [user]);

  const saveMiningProgress = useCallback(async (earningsToAdd: number) => {
    if (!currentSession || earningsToAdd <= 0) return;

    try {
      console.log('Saving mining progress:', earningsToAdd.toFixed(4), 'CORD');

      // Save mining progress via API
      const result = await apiClient.saveMiningProgress(user.id, currentSession, earningsToAdd);
      
      if (result.success) {
        // Update user balance
        const updatedUser = {
          ...user,
          current_balance: result.newBalance || user.current_balance + earningsToAdd,
          total_earned: user.total_earned + earningsToAdd,
          weekly_earnings: user.weekly_earnings + earningsToAdd,
          monthly_earnings: user.monthly_earnings + earningsToAdd,
          lastSavedBalance: result.newBalance || user.current_balance + earningsToAdd
        };
        
        onUserUpdate(updatedUser);
        
        // Update mining session stats
        await apiClient.updateMiningSession(currentSession, {
          earnings: nodeStats.dailyEarnings,
          hashRate: nodeStats.hashRate,
          efficiency: nodeStats.efficiency
        });
        
        console.log('Mining progress saved successfully');
      } else {
        console.error('Error saving mining progress:', result.error);
      }
    } catch (error) {
      console.error('Error saving mining progress:', error);
    }
  }, [currentSession, user, onUserUpdate, nodeStats]);

  const startNode = useCallback(async () => {
    console.log('Starting mining node for user:', user.id);
    setIsStarting(true);
    
    try {
      // Simulate startup delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const startTime = Date.now();
      
      // Create new mining session
      console.log('Creating new mining session...');
      const session = await apiClient.startMining(user.id);
      
      if (!session) {
        throw new Error('Failed to create mining session');
      }

      const sessionId = session.id;
      setCurrentSession(sessionId);
      console.log('Created mining session:', sessionId);

      // Update user status
      const updatedUser = {
        ...user,
        isNodeActive: true,
        nodeStartTime: startTime
      };
      
      await apiClient.updateUser(user.id, updatedUser);
      onUserUpdate(updatedUser);
      
      // Update local state
      setNodeStats(prev => ({
        ...prev,
        isActive: true,
        startTime,
        uptime: 0,
        dailyEarnings: 0
      }));

      // Start the mining process
      startMiningProcess();

      // Show success notification
      const baseRate = 0.5 * user.multiplier;
      const actualRate = calculateMiningRate(user, antiCheatStatus);
      const efficiencyText = antiCheatStatus && antiCheatStatus.penaltyLevel > 0 
        ? ` (${(antiCheatStatus.efficiencyMultiplier * 100).toFixed(0)}% efficiency due to shared IP)`
        : '';
      
      showNotification('success', 'Mining Node Started!', `Earning ${actualRate.toFixed(2)} CORD/min${efficiencyText}`);

    } catch (error) {
      console.error('Error starting node:', error);
      showNotification('error', 'Failed to Start Node', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsStarting(false);
    }
  }, [user, onUserUpdate, startMiningProcess]);

  const stopNode = useCallback(async () => {
    console.log('Stopping mining node for user:', user.id);
    
    try {
      // Clear intervals
      if (miningIntervalRef.current) {
        clearInterval(miningIntervalRef.current);
        miningIntervalRef.current = null;
      }
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }

      // Save any remaining earnings and get final total
      let finalEarnings = nodeStats.dailyEarnings;
      if (accumulatedEarningsRef.current > 0) {
        await saveMiningProgress(accumulatedEarningsRef.current);
        finalEarnings += accumulatedEarningsRef.current; // Add the final accumulated amount
        accumulatedEarningsRef.current = 0;
      }
      
      // Update user status
      const updatedUser = {
        ...user,
        isNodeActive: false,
        nodeStartTime: undefined
      };
      
      await apiClient.updateUser(user.id, updatedUser);
      onUserUpdate(updatedUser);

      // End mining session
      if (currentSession) {
        try {
          await apiClient.endMiningSession(currentSession, finalEarnings);
          console.log('Mining session ended:', currentSession);
        } catch (error) {
          console.error('Error ending mining session:', error);
        }
        
        setCurrentSession(null);
      }
      
      // Update local state
      setNodeStats(prev => ({
        ...prev,
        isActive: false,
        startTime: undefined,
        uptime: 0
      }));

      showNotification('info', 'Mining Node Stopped', `Session earned: ${finalEarnings.toFixed(2)} CORD`);

    } catch (error) {
      console.error('Error stopping node:', error);
      showNotification('error', 'Error Stopping Node', 'Please try again');
    }
  }, [user, onUserUpdate, currentSession, nodeStats, saveMiningProgress]);

  // Function to force save any pending mining progress (for logout)
  const forceSaveMiningProgress = useCallback(async () => {
    if (currentSession && nodeStats.isActive && accumulatedEarningsRef.current > 0) {
      console.log('Force saving mining progress before logout:', accumulatedEarningsRef.current.toFixed(4));
      await saveMiningProgress(accumulatedEarningsRef.current);
      accumulatedEarningsRef.current = 0;
    }
  }, [currentSession, nodeStats.isActive, saveMiningProgress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (miningIntervalRef.current) clearInterval(miningIntervalRef.current);
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
    };
  }, []);

  // Auto-save on visibility change
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden && currentSession && nodeStats.isActive && accumulatedEarningsRef.current > 0) {
        await saveMiningProgress(accumulatedEarningsRef.current);
        accumulatedEarningsRef.current = 0;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentSession, nodeStats.isActive, saveMiningProgress]);

  const showNotification = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-600/20 border-green-500/30' : 
                   type === 'error' ? 'bg-red-600/20 border-red-500/30' : 
                   'bg-blue-600/20 border-blue-500/30';
    const textColor = type === 'success' ? 'text-green-400' : 
                     type === 'error' ? 'text-red-400' : 
                     'text-blue-400';
    const icon = type === 'success' ? '⚡' : type === 'error' ? '❌' : '🛑';
    
    notification.className = `fixed top-20 right-4 ${bgColor} border rounded-lg p-4 z-50 animate-slide-in max-w-sm`;
    notification.innerHTML = `
      <div class="flex items-center space-x-2">
        <span class="text-lg">${icon}</span>
        <div>
          <div class="text-white font-medium">${title}</div>
          <div class="${textColor} text-sm">${message}</div>
        </div>
      </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
  };

  const toggleMining = useCallback(() => {
    if (nodeStats.isActive) {
      stopNode();
    } else {
      startNode();
    }
  }, [nodeStats.isActive, startNode, stopNode]);

  return {
    isActive: nodeStats.isActive,
    earnings: nodeStats.dailyEarnings,
    timeActive: nodeStats.uptime,
    efficiency: nodeStats.efficiency / 100,
    toggleMining,
    isStarting,
    nodeStats,
    currentSession,
    startNode,
    stopNode,
    forceSaveMiningProgress
  };
};