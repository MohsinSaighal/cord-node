import { useState, useEffect, useCallback } from 'react';
import { UserData, NodeStats } from '../types';
import { calculateMiningRate, calculateHashRate, calculateNodeUptime } from '../utils/calculations';
import { saveUserData } from '../utils/storage';

export const useNodeMining = (user: UserData, onUserUpdate: (user: UserData) => void) => {
  const [nodeStats, setNodeStats] = useState<NodeStats>({
    isActive: user.isNodeActive,
    uptime: user.nodeStartTime ? calculateNodeUptime(user.nodeStartTime) : 0,
    hashRate: 0,
    dailyEarnings: 0,
    totalEarnings: user.totalEarned,
    efficiency: 85,
    startTime: user.nodeStartTime
  });

  const [isStarting, setIsStarting] = useState(false);

  // Update mining earnings
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (nodeStats.isActive && nodeStats.startTime) {
      interval = setInterval(() => {
        const miningRate = calculateMiningRate(user);
        const hashRate = calculateHashRate(user);
        const efficiency = 85 + Math.random() * 15;
        const uptime = calculateNodeUptime(nodeStats.startTime!);
        
        // Calculate earnings per second (mining rate is per minute)
        const earningsPerSecond = miningRate / 60;
        
        setNodeStats(prev => ({
          ...prev,
          uptime,
          hashRate,
          efficiency,
          dailyEarnings: prev.dailyEarnings + earningsPerSecond
        }));

        // Update user balance every 10 seconds
        if (uptime % 10 === 0) {
          const updatedUser = {
            ...user,
            currentBalance: user.currentBalance + (earningsPerSecond * 10),
            totalEarned: user.totalEarned + (earningsPerSecond * 10)
          };
          onUserUpdate(updatedUser);
          saveUserData(updatedUser);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [nodeStats.isActive, nodeStats.startTime, user, onUserUpdate]);

  const startNode = useCallback(async () => {
    setIsStarting(true);
    
    // Simulate node startup time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const startTime = Date.now();
    const updatedUser = {
      ...user,
      isNodeActive: true,
      nodeStartTime: startTime
    };
    
    setNodeStats(prev => ({
      ...prev,
      isActive: true,
      startTime,
      uptime: 0,
      dailyEarnings: 0
    }));
    
    onUserUpdate(updatedUser);
    saveUserData(updatedUser);
    setIsStarting(false);
  }, [user, onUserUpdate]);

  const stopNode = useCallback(() => {
    const updatedUser = {
      ...user,
      isNodeActive: false,
      nodeStartTime: undefined
    };
    
    setNodeStats(prev => ({
      ...prev,
      isActive: false,
      startTime: undefined
    }));
    
    onUserUpdate(updatedUser);
    saveUserData(updatedUser);
  }, [user, onUserUpdate]);

  return {
    nodeStats,
    isStarting,
    startNode,
    stopNode
  };
};