export interface UserData {
  id: string;
  username: string;
  discriminator: string;
  avatar: string;
  accountAge: number; // in years
  joinDate: Date;
  multiplier: number;
  compensationClaimed: boolean;
  hasBadgeOfHonor: boolean;
  totalEarned: number;
  currentBalance: number;
  isNodeActive: boolean;
  tasksCompleted: number;
  rank: number;
  nodeStartTime?: number;
  lastLoginTime: number;
  dailyCheckInClaimed: boolean;
  weeklyEarnings: number;
  monthlyEarnings: number;
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
  totalEarned: number;
  accountAge: number;
  isActive: boolean;
  weeklyEarnings: number;
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
    totalEarned: number;
  };
}

export interface ReferralData {
  code: string;
  referredUsers: string[];
  totalEarnings: number;
}
