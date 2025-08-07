import { useState, useEffect, useCallback } from 'react';
import { UserData } from '../types';
import { trackUserIP, AntiCheatStatus, shouldShowAntiCheatWarning } from '../utils/antiCheat';

export const useAntiCheat = (user: UserData | null) => {
  const [antiCheatStatus, setAntiCheatStatus] = useState<AntiCheatStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<number | null>(null);

  // Track IP and get anti-cheat status
  const checkAntiCheat = useCallback(async () => {
    if (!user) return;

    // Don't check too frequently (max once per 5 minutes)
    const now = Date.now();
    if (lastChecked && (now - lastChecked) < 5 * 60 * 1000) {
      return;
    }

    setLoading(true);
    try {
      const status = await trackUserIP(user.id, navigator.userAgent);
      setAntiCheatStatus(status);
      setLastChecked(now);

      // Show warning if penalties are applied
      if (status && shouldShowAntiCheatWarning(status)) {
        // showAntiCheatNotification(status);
      }
    } catch (error) {
      console.error('Error checking anti-cheat status:', error);
    } finally {
      setLoading(false);
    }
  }, [user, lastChecked]);

  // Initial check when user logs in
  useEffect(() => {
    if (user && !lastChecked) {
      checkAntiCheat();
    }
  }, [user, checkAntiCheat, lastChecked]);

  // Periodic checks (every 30 minutes)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      checkAntiCheat();
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, [user, checkAntiCheat]);

  // Show anti-cheat notification
  const showAntiCheatNotification = (status: AntiCheatStatus) => {
    if (!status.warningMessage) return;

    const notification = document.createElement('div');
    const bgColor = status.penaltyLevel >= 3 ? 'bg-red-600/20 border-red-500/30' : 
                   status.penaltyLevel >= 1 ? 'bg-yellow-600/20 border-yellow-500/30' :
                   'bg-blue-600/20 border-blue-500/30';
    const textColor = status.penaltyLevel >= 3 ? 'text-red-400' : 
                     status.penaltyLevel >= 1 ? 'text-yellow-400' :
                     'text-blue-400';
    const icon = status.penaltyLevel >= 3 ? '🚫' : 
                status.penaltyLevel >= 1 ? '⚠️' : 'ℹ️';
    
    notification.className = `fixed top-20 right-4 ${bgColor} border rounded-lg p-4 z-50 animate-slide-in max-w-sm`;
    notification.innerHTML = `
      <div class="flex items-start space-x-2">
        <span class="text-lg flex-shrink-0">${icon}</span>
        <div class="min-w-0 flex-1">
          <div class="text-white font-medium text-sm">Anti-Cheat System</div>
          <div class="${textColor} text-xs">${status.warningMessage}</div>
          <div class="text-gray-400 text-xs mt-1">
            Mining efficiency: ${(status.efficiencyMultiplier * 100).toFixed(0)}%
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 8000);
  };

  return {
    antiCheatStatus,
    loading,
    checkAntiCheat,
    lastChecked
  };
};