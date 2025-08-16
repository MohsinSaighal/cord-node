export interface UserData {
  id: string;
  username: string;
  discriminator: string;
  avatar: string;
  account_age: number; // in years
  join_date: Date;
  multiplier: number;
  compensationClaimed: boolean;
  hasbadgeofhonor: boolean;
  total_earned: number;
  current_balance: number;
  isNodeActive: boolean;
  tasksCompleted: number;
  rank: number;
  nodeStartTime?: number;
  last_login_time: Date;
  daily_checkin_claimed: boolean;
  weekly_earnings: number;
  monthly_earnings: number;
  referralCode?: string;
  referredBy?: string;
  referralEarnings: number;
  totalReferrals: number;
  currentEpochId?: string;
  epochJoinDate?: number;
  totalEpochEarnings: number;
  lastSavedBalance?: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  reward: number;
  type: "daily" | "weekly" | "social" | "achievement";
  completed: boolean;
  progress: number;
  maxProgress: number;
  expiresAt?: Date;
  claimedAt?: Date;
  socialUrl?: string;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  avatar: string;
  total_earned: number;
  account_age: number;
  isActive: boolean;
  weekly_earnings: number;
}

export interface NodeStats {
  isActive: boolean;
  uptime: number;
  hashRate: number;
  dailyEarnings: number;
  totalEarnings: number;
  efficiency: number;
  startTime?: number;
}

export interface EpochData {
  id: string;
  epochNumber: number;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  daysRemaining: number;
  progressPercentage: number;
  isActive: boolean;
  rewardsMultiplier: number;
}

export interface UserEpochStats {
  epochNumber: number;
  epochName: string;
  epochDescription: string;
  startDate: Date;
  endDate: Date;
  daysRemaining: number;
  progressPercentage: number;
  userEarnings: number;
  userTasksCompleted: number;
  userMiningTime: number;
  userRank: number;
  totalParticipants: number;
  rewardsMultiplier: number;
  joinedAt: Date;
}

export interface AppState {
  users: UserData[];
  globalStats: {
    totalMiners: number;
    activeMiners: number;
    total_earned: number;
  };
}

export interface ReferralData {
  code: string;
  referredUsers: string[];
  totalEarnings: number;
}
