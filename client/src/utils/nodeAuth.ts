import apiClient from './api';
import { UserData } from '../types';
import { calculateMultiplier, calculateInitialBalance } from './calculations';
import {
  getDiscordAuthUrl,
  exchangeCodeForToken,
  getDiscordUser,
  getAvatarUrl,
  calculateAccountAge,
  setOAuthState,
} from './discord';
import { getStoredReferralCode, clearStoredReferralCode } from './referral';

// Store user session data in localStorage for persistence
const storeUserSession = (userData: UserData): void => {
  localStorage.setItem(
    'cordnode_user_session',
    JSON.stringify({
      ...JSON.parse(JSON.stringify(userData)),
      join_date: userData.join_date,
      lastSavedBalance: userData.current_balance,
    })
  );
  localStorage.setItem('cordnode_session_timestamp', Date.now().toString());
};

// Get stored user session
const getStoredUserSession = (): UserData | null => {
  try {
    const stored = localStorage.getItem('cordnode_user_session');
    const timestamp = localStorage.getItem('cordnode_session_timestamp');

    if (!stored || !timestamp) return null;

    // Check if session is expired (older than 7 days)
    const age = Date.now() - parseInt(timestamp);
    if (age > 7 * 24 * 60 * 60 * 1000) {
      clearUserSession();
      return null;
    }

    const userData = JSON.parse(stored);
    userData.join_date = new Date(userData.join_date);

    if (
      userData.lastSavedBalance &&
      userData.current_balance < userData.lastSavedBalance
    ) {
      userData.current_balance = userData.lastSavedBalance;
      userData.total_earned = Math.max(
        userData.total_earned,
        userData.lastSavedBalance
      );
    }

    return userData;
  } catch (error) {
    console.error('Error getting stored session:', error);
    clearUserSession();
    return null;
  }
};

// Clear stored user session
const clearUserSession = (): void => {
  localStorage.removeItem('cordnode_user_session');
  localStorage.removeItem('cordnode_session_timestamp');
};

// Update user data in backend
export const updateUserInDatabase = async (userData: UserData): Promise<void> => {
  try {
    await apiClient.updateUserProfile({
      weekly_earnings: userData.weekly_earnings,
      monthly_earnings: userData.monthly_earnings,
      current_balance: userData.current_balance,
      total_earned: userData.total_earned,
      is_node_active: userData.is_node_active,
      nodeStartTime: userData.nodeStartTime,
      daily_checkin_claimed: userData.daily_checkin_claimed,
      tasksCompleted: userData.tasksCompleted,
    });

    storeUserSession(userData);
  } catch (error) {
    console.error('Error updating user in database:', error);
    throw error;
  }
};

// Get user from backend
export const getUserFromDatabase = async (userId: string): Promise<UserData | null> => {
  try {
    const response = await apiClient.getUserStats();
    if (response.success) {
      const user = response.stats;
      const userData = {
        id: user.id,
        username: user.username,
        discriminator: user.discriminator,
        avatar: user.avatar,
        account_age: user.account_age,
        join_date: new Date(user.join_date),
        multiplier: user.multiplier,
        total_earned: user.total_earned,
        current_balance: user.current_balance,
        is_node_active: user.is_node_active,
        nodeStartTime: user.nodeStartTime,
        tasksCompleted: user.tasksCompleted,
        rank: user.rank,
        last_login_time: user.last_login_time,
        daily_checkin_claimed: user.daily_checkin_claimed,
        weekly_earnings: user.weekly_earnings,
        monthly_earnings: user.monthly_earnings,
        referralCode: user.referralCode,
        referredBy: user.referredBy,
        referralEarnings: user.referralEarnings,
        totalReferrals: user.totalReferrals,
        compensationClaimed: user.compensationClaimed,
        hasbadgeofhonor: user.hasbadgeofhonor,
      };

      storeUserSession(userData);
      return userData;
    }
    return null;
  } catch (error) {
    console.error('Error getting user from database:', error);
    return null;
  }
};

// Get stored session (for page refresh persistence)
export const getStoredSession = (): UserData | null => {
  return getStoredUserSession();
};

// Sign in with Discord
export const signInWithDiscord = async (): Promise<string> => {
  try {
    const authUrl = getDiscordAuthUrl();
    const urlParams = new URLSearchParams(authUrl.split('?')[1]);
    const state = urlParams.get('state');

    if (state) {
      setOAuthState(state);
    }

    return authUrl;
  } catch (error) {
    console.error('Error in signInWithDiscord:', error);
    throw new Error('Failed to generate Discord authorization URL');
  }
};

// Handle OAuth callback
export const handleOAuthCallback = async (
  code: string,
  referralCode?: string
): Promise<UserData> => {
  try {
    console.log('Starting OAuth callback with code:', code.substring(0, 5) + '...');

    if (!code) {
      throw new Error('No authorization code provided');
    }

    // Get stored referral code if not provided
    if (!referralCode) {
      referralCode = getStoredReferralCode() || undefined;
      if (referralCode) {
        console.log('Using stored referral code:', referralCode);
      }
    }

    // Call backend to handle Discord OAuth
    const response = await apiClient.discordCallback(code, referralCode);
    
    if (!response.success) {
      throw new Error(response.error || 'Authentication failed');
    }

    // Set the JWT token
    apiClient.setToken(response.token);

    // Convert backend user data to frontend format
    const user = response.user;
    const userData: UserData = {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      account_age: user.account_age,
      join_date: new Date(user.join_date),
      multiplier: user.multiplier,
      total_earned: user.total_earned,
      current_balance: user.current_balance,
      is_node_active: user.is_node_active,
      nodeStartTime: user.nodeStartTime,
      tasksCompleted: user.tasksCompleted,
      rank: user.rank,
      last_login_time: user.last_login_time,
      daily_checkin_claimed: user.daily_checkin_claimed,
      weekly_earnings: user.weekly_earnings,
      monthly_earnings: user.monthly_earnings,
      referralCode: user.referralCode,
      referredBy: user.referredBy,
      referralEarnings: user.referralEarnings,
      totalReferrals: user.totalReferrals,
      compensationClaimed: user.compensationClaimed,
      hasbadgeofhonor: user.hasbadgeofhonor,
    };

 

    storeUserSession(userData);
    return userData;
  } catch (error) {
    console.error('OAuth callback error:', error);
    throw error;
  }
};

// Sign out
export const signOut = async (finalUserData?: UserData): Promise<void> => {
  try {
    // Save final user data before logout if provided
    if (finalUserData) {
      console.log('Saving final user data before logout:', {
        balance: finalUserData.current_balance,
        total_earned: finalUserData.total_earned
      });
      
      // Store the final state in localStorage as backup
      storeUserSession(finalUserData);
      
      // Try to save to database
      try {
        await apiClient.updateUser(finalUserData.id, finalUserData);
        console.log('Successfully saved user data to database before logout');
      } catch (updateError) {
        console.error('Failed to save user data to database before logout:', updateError);
        // Keep in localStorage as fallback
      }
    }
    
    await apiClient.logout();
    clearUserSession();
  } catch (error) {
    console.error('Error in signOut:', error);
    clearUserSession();
  }
};

// Get current session
export const getCurrentSession = async () => {
  try {
    const storedSession = getStoredUserSession();
    if (storedSession) {
      console.log('Found stored session for user:', storedSession.username);
      return {
        user: {
          user_metadata: {
            discord_id: storedSession.id,
          },
        },
      };
    }

    // Try to get current user from backend
    const response = await apiClient.getCurrentUser();
    if (response.success) {
      return {
        user: {
          user_metadata: {
            discord_id: response.user.id,
          },
        },
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting current session:', error);
    return null;
  }
};