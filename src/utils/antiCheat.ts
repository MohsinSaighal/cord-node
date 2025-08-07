import { supabase } from '../lib/supabase';

export interface AntiCheatStatus {
  efficiencyMultiplier: number;
  penaltyLevel: number;
  isFlagged: boolean;
  riskScore: number;
  totalUsersOnIp: number;
  otherUsersOnIp: number;
  userIpCount: number;
  warningMessage?: string;
}

export interface AntiCheatStats {
  totalFlaggedIps: number;
  totalAffectedUsers: number;
  penaltyDistribution: Record<string, number>;
  lastUpdated: string;
}

// Get user's IP address (client-side approximation)
export const getUserIP = async (): Promise<string | null> => {
  try {
    // Try multiple IP detection services
    const services = [
      'https://api.ipify.org?format=json',
      'https://ipapi.co/json/',
      'https://httpbin.org/ip'
    ];

    for (const service of services) {
      try {
        const response = await fetch(service);
        const data = await response.json();
        
        // Different services return IP in different formats
        const ip = data.ip || data.query || data.origin;
        if (ip && typeof ip === 'string') {
          return ip;
        }
      } catch (error) {
        console.warn(`Failed to get IP from ${service}:`, error);
        continue;
      }
    }

    // Fallback: use a simple method
    return await getIPFallback();
  } catch (error) {
    console.error('Error getting user IP:', error);
    return null;
  }
};

// Fallback IP detection method
const getIPFallback = async (): Promise<string | null> => {
  try {
    // Create a WebRTC connection to get local IP
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    return new Promise((resolve) => {
      let resolved = false;
      
      pc.onicecandidate = (event) => {
        if (event.candidate && !resolved) {
          const candidate = event.candidate.candidate;
          const ipMatch = candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
          if (ipMatch && ipMatch[1] && !ipMatch[1].startsWith('192.168.') && !ipMatch[1].startsWith('10.')) {
            resolved = true;
            resolve(ipMatch[1]);
            pc.close();
          }
        }
      };

      // Create a data channel to trigger ICE gathering
      pc.createDataChannel('test');
      pc.createOffer().then(offer => pc.setLocalDescription(offer));

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(null);
          pc.close();
        }
      }, 5000);
    });
  } catch (error) {
    console.error('WebRTC IP detection failed:', error);
    return null;
  }
};

// Track user IP and get anti-cheat status
export const trackUserIP = async (userId: string, userAgent?: string): Promise<AntiCheatStatus | null> => {
  try {
    const ip = await getUserIP();
    if (!ip) {
      console.warn('Could not detect user IP for anti-cheat tracking');
      return null;
    }

    console.log('Tracking IP for anti-cheat:', ip);

    const { data: result, error } = await supabase
      .rpc('track_user_ip', {
        p_user_id: userId,
        p_ip_address: ip,
        p_user_agent: userAgent || navigator.userAgent
      });

    if (error) {
      console.error('Error tracking user IP:', error);
      return null;
    }

    if (!result || !result.success) {
      console.error('IP tracking failed:', result?.error);
      return null;
    }

    // Get detailed anti-cheat status
    const { data: status, error: statusError } = await supabase
      .rpc('get_user_anticheat_status', {
        p_user_id: userId,
        p_ip_address: ip
      });

    if (statusError) {
      console.error('Error getting anti-cheat status:', statusError);
      return null;
    }

    return {
      efficiencyMultiplier: status.efficiency_multiplier || 1.0,
      penaltyLevel: status.penalty_level || 0,
      isFlagged: status.is_flagged || false,
      riskScore: status.risk_score || 0,
      totalUsersOnIp: status.total_users_on_ip || 1,
      otherUsersOnIp: status.other_users_on_ip || 0,
      userIpCount: status.user_ip_count || 1,
      warningMessage: status.warning_message
    };
  } catch (error) {
    console.error('Error in trackUserIP:', error);
    return null;
  }
};

// Get anti-cheat statistics (for admin/debugging)
export const getAntiCheatStats = async (): Promise<AntiCheatStats | null> => {
  try {
    const { data: stats, error } = await supabase
      .rpc('get_anticheat_statistics');

    if (error) {
      console.error('Error getting anti-cheat stats:', error);
      return null;
    }

    return {
      totalFlaggedIps: stats.total_flagged_ips || 0,
      totalAffectedUsers: stats.total_affected_users || 0,
      penaltyDistribution: stats.penalty_distribution || {},
      lastUpdated: stats.last_updated
    };
  } catch (error) {
    console.error('Error getting anti-cheat stats:', error);
    return null;
  }
};

// Apply anti-cheat efficiency to mining rate
export const applyAntiCheatEfficiency = (baseMiningRate: number, antiCheatStatus: AntiCheatStatus | null): number => {
  if (!antiCheatStatus) {
    return baseMiningRate;
  }

  const adjustedRate = baseMiningRate * antiCheatStatus.efficiencyMultiplier;
  
  // Log penalty application for transparency
  if (antiCheatStatus.penaltyLevel > 0) {
    console.log(`Anti-cheat penalty applied: ${(antiCheatStatus.efficiencyMultiplier * 100).toFixed(1)}% efficiency (Level ${antiCheatStatus.penaltyLevel})`);
  }

  return adjustedRate;
};

// Get penalty level description
export const getPenaltyDescription = (penaltyLevel: number): string => {
  switch (penaltyLevel) {
    case 0:
      return 'No penalties';
    case 1:
      return 'Light penalty (25% reduction) - Shared household detected';
    case 2:
      return 'Moderate penalty (50% reduction) - Multiple accounts detected';
    case 3:
      return 'High penalty (70% reduction) - Significant multi-accounting';
    case 4:
      return 'Severe penalty (90% reduction) - Extreme multi-accounting';
    default:
      return 'Unknown penalty level';
  }
};

// Check if user should see anti-cheat warning
export const shouldShowAntiCheatWarning = (antiCheatStatus: AntiCheatStatus | null): boolean => {
  if (!antiCheatStatus) return false;
  return antiCheatStatus.penaltyLevel > 0 || antiCheatStatus.otherUsersOnIp > 0;
};