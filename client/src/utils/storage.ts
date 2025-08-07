import { UserData, AppState } from '../types';

const STORAGE_KEYS = {
  USER_DATA: 'cordnode-user',
  APP_STATE: 'cordnode-app-state',
  LAST_UPDATE: 'cordnode-last-update'
};

export const saveUserData = (userData: UserData): void => {
  localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
  updateLastActivity();
};

export const getUserData = (): UserData | null => {
  const stored = localStorage.getItem(STORAGE_KEYS.USER_DATA);
  if (!stored) return null;
  
  const userData = JSON.parse(stored);
  // Convert date strings back to Date objects
  userData.joinDate = new Date(userData.joinDate);
  
  // Ensure all new fields are defined with default values
  if (userData.weeklyEarnings === undefined || userData.weeklyEarnings === null) {
    userData.weeklyEarnings = 0;
  }
  if (userData.monthlyEarnings === undefined || userData.monthlyEarnings === null) {
    userData.monthlyEarnings = 0;
  }
  if (userData.referralEarnings === undefined || userData.referralEarnings === null) {
    userData.referralEarnings = 0;
  }
  if (userData.totalReferrals === undefined || userData.totalReferrals === null) {
    userData.totalReferrals = 0;
  }
  if (!userData.referralCode) {
    // Generate referral code if missing
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const userHash = userData.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    let code = '';
    
    for (let i = 0; i < 6; i++) {
      code += chars[(userHash + i) % chars.length];
    }
    
    userData.referralCode = code;
  }
  
  return userData;
};

export const saveAppState = (appState: AppState): void => {
  localStorage.setItem(STORAGE_KEYS.APP_STATE, JSON.stringify(appState));
};

export const getAppState = (): AppState => {
  const stored = localStorage.getItem(STORAGE_KEYS.APP_STATE);
  if (!stored) {
    return {
      users: [],
      globalStats: {
        totalMiners: 0,
        activeMiners: 0,
        totalEarned: 0
      }
    };
  }
  return JSON.parse(stored);
};

export const updateLastActivity = (): void => {
  localStorage.setItem(STORAGE_KEYS.LAST_UPDATE, Date.now().toString());
};

export const getLastActivity = (): number => {
  const stored = localStorage.getItem(STORAGE_KEYS.LAST_UPDATE);
  return stored ? parseInt(stored) : Date.now();
};

export const clearUserData = (): void => {
  localStorage.removeItem(STORAGE_KEYS.USER_DATA);
};