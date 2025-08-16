// Supabase removed during migration - using new API
import { UserData } from "../types";
import { calculateMultiplier, calculateInitialBalance } from "./calculations";
import {
  getDiscordAuthUrl,
  exchangeCodeForToken,
  getDiscordUser,
  getAvatarUrl,
  calculateAccountAge,
  setOAuthState,
} from "./discord";
// import { processReferralInDatabase } from "./supabaseReferrals";
import { getStoredReferralCode, clearStoredReferralCode } from "./referral";

// Function to log authentication attempts
const logAuthAttempt = async (
  userId: string,
  method: string,
  status: string,
  details?: any
) => {
  try {
    // TODO: Implement auth attempt logging with new API
    console.log('Auth attempt:', { userId, method, status, details });
  } catch (error) {
    console.error("Failed to log auth attempt:", error);
    // Non-critical, continue even if logging fails
  }
};

// Generate referral code
const generateReferralCode = (length = 8, userId?: string): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";

  // Get cryptographically secure random bytes
  const randomValues = new Uint32Array(length);
  if (
    typeof window !== "undefined" &&
    window.crypto &&
    window.crypto.getRandomValues
  ) {
    window.crypto.getRandomValues(randomValues);
  } else {
    // Fallback for Node.js or environments without window.crypto
    const crypto = require("crypto");
    const buffer = crypto.randomBytes(length * 4);
    for (let i = 0; i < length; i++) {
      randomValues[i] = buffer.readUInt32LE(i * 4);
    }
  }

  // Optionally mix in userId
  let seed = userId
    ? userId.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
    : 0;

  for (let i = 0; i < length; i++) {
    let idx = (randomValues[i] + seed + i * 997) % chars.length;
    code += chars[idx];
  }
  return code;
};

// Store user session data in localStorage for persistence
const storeUserSession = (userData: UserData): void => {
  localStorage.setItem(
    "cordnode_user_session",
    JSON.stringify({
      ...JSON.parse(JSON.stringify(userData)), // Deep clone to avoid reference issues
      join_date: userData.join_date, // Convert Date to string for storage
      lastsavedbalance: userData.current_balance, // Track last saved balance
    })
  );
  localStorage.setItem("cordnode_session_timestamp", Date.now().toString());
};

// Get stored user session
const getStoredUserSession = (): UserData | null => {
  try {
    const stored = localStorage.getItem("cordnode_user_session");
    const timestamp = localStorage.getItem("cordnode_session_timestamp");

    if (!stored || !timestamp) return null;

    // Check if session is expired (older than 7 days)
    const age = Date.now() - parseInt(timestamp);
    if (age > 7 * 24 * 60 * 60 * 1000) {
      clearUserSession();
      return null;
    }

    const userData = JSON.parse(stored);
    // Convert string back to Date
    userData.join_date = new Date(userData.join_date);

    // Ensure we don't lose balance between sessions
    if (
      userData.lastsavedbalance &&
      userData.current_balance < userData.lastsavedbalance
    ) {
      userData.current_balance = userData.lastsavedbalance;
      userData.total_earned = Math.max(
        userData.total_earned,
        userData.lastsavedbalance
      );
    }

    return userData;
  } catch (error) {
    console.error("Error getting stored session:", error);
    clearUserSession();
    return null;
  }
};

// Clear stored user session
const clearUserSession = (): void => {
  localStorage.removeItem("cordnode_user_session");
  localStorage.removeItem("cordnode_session_timestamp");
};

// Import the new API client
import { apiClient } from '../hooks/useApi';

// Create or update user in database using new TypeORM API
export const createOrUpdateUser = async (
  discordUser: any,
  referralCode?: string
): Promise<UserData> => {
  // Log the start of user creation/update
  await logAuthAttempt(discordUser.id, "discord_oauth", "start", {
    username: discordUser.username,
    hasReferralCode: !!referralCode,
  });

  const account_age = calculateAccountAge(discordUser.created_timestamp);
  const multiplier = calculateMultiplier(account_age);
  const baseBalance = calculateInitialBalance(account_age, multiplier) || 0;
  const userReferralCode = generateReferralCode();

  console.log("Creating/updating user:", {
    id: discordUser.id,
    username: discordUser.username,
    account_age,
    multiplier,
    baseBalance,
    referralCode,
  });

  try {
    // First, try to get existing user
    let existingUser = null;
    try {
      existingUser = await apiClient.getUser(discordUser.id);
    } catch (error) {
      console.log("User not found, will create new one");
    }

    let userData: UserData;

    if (existingUser) {
      console.log("User exists, updating login time");
      await logAuthAttempt(discordUser.id, "discord_oauth", "existing_user", {
        username: existingUser.username,
      });

      // For existing users, update the login time
      const updatedUser = {
        ...existingUser,
        last_login_time: new Date(Date.now()),
      };
      
      userData = await apiClient.updateUser(discordUser.id, updatedUser);
    } else {
      console.log("Creating new user");
      await logAuthAttempt(discordUser.id, "discord_oauth", "new_user", {
        username: discordUser.username,
        account_age,
      });

      // Create new user data
      const newUserData = {
        id: discordUser.id,
        username: discordUser.username,
        discriminator: discordUser.discriminator,
        avatar: getAvatarUrl(discordUser.id, discordUser.avatar),
        account_age,
        join_date: new Date(discordUser.created_timestamp),
        multiplier,
        total_earned: baseBalance,
        current_balance: baseBalance,
        referralCode: userReferralCode,
        rank: Math.floor(Math.random() * 1000) + 1,
        last_login_time: new Date(Date.now()),
        is_node_active: false,
        tasksCompleted: 0,
        daily_checkin_claimed: false,
        weekly_earnings: 0,
        monthly_earnings: 0,
        referralEarnings: 0,
        totalReferrals: 0,
        referredBy: referralCode || undefined,
        hasbadgeofhonor: false,
        node_start_time: undefined,
        currentEpochId: undefined,
        epochJoinDate: undefined,
        totalEpochEarnings: 0,
        compensationClaimed: false,
      };

      userData = await apiClient.createUser(newUserData);

      // Process referral if provided
      if (referralCode && referralCode.trim()) {
        console.log("Processing referral with code:", referralCode.trim());
        await logAuthAttempt(discordUser.id, "referral_processing", "start", {
          referralCode: referralCode.trim(),
        });

        try {
          // TODO: Implement referral processing with new API
          console.log("Referral processing not yet implemented with new API");
        } catch (referralError) {
          console.error("Error processing referral:", referralError);
          await logAuthAttempt(discordUser.id, "referral_processing", "error", {
            error:
              referralError instanceof Error
                ? referralError.message
                : "Unknown error",
          });
        }
      }

      await logAuthAttempt(discordUser.id, "discord_oauth", "success", {
        username: userData.username,
      });
    }

    // Store session for persistence across page refreshes
    storeUserSession(userData);
    await logAuthAttempt(discordUser.id, "discord_oauth", "success", {
      username: userData.username,
    });

    return userData;
  } catch (error) {
    console.error("Error in createOrUpdateUser:", error);
    await logAuthAttempt(discordUser.id, "discord_oauth", "error_final", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
};

// Update user data in database using new TypeORM API
export const updateUserInDatabase = async (
  userData: UserData
): Promise<void> => {
  try {
    await apiClient.updateUser(userData.id, userData);
    
    // Update stored session
    storeUserSession(userData);
  } catch (error) {
    console.error("Error in updateUserInDatabase:", error);
    throw error;
  }
};

// Get user from database using new TypeORM API
export const getUserFromDatabase = async (
  userId: string
): Promise<UserData | null> => {
  if (!userId) return null;

  try {
    const userData = await apiClient.getUser(userId);
    
    if (userData) {
      // Update stored session
      storeUserSession(userData);
    }

    return userData;
  } catch (error) {
    console.error("Error in getUserFromDatabase:", error);
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
    const urlParams = new URLSearchParams(authUrl.split("?")[1]);
    const state = urlParams.get("state");

    if (state) {
      setOAuthState(state);
    }

    return authUrl;
  } catch (error) {
    console.error("Error in signInWithDiscord:", error);
    throw new Error("Failed to generate Discord authorization URL");
  }
};

// Handle OAuth callback with better error handling
export const handleOAuthCallback = async (
  code: string,
  referralCode?: string
): Promise<UserData> => {
  try {
    console.log(
      "Starting OAuth callback with code:",
      code.substring(0, 5) + "..."
    );

    if (!code) {
      throw new Error("No authorization code provided");
    }

    // Get stored referral code if not provided
    if (!referralCode) {
      referralCode = getStoredReferralCode() || undefined;
      if (referralCode) {
        console.log("Using stored referral code:", referralCode);
      }
    }

    // Exchange code for access token
    let accessToken: string;
    try {
      console.log("Exchanging code for token...");
      accessToken = await exchangeCodeForToken(code);
      console.log("Got access token");
    } catch (tokenError) {
      console.error("Token exchange failed:", tokenError);
      throw new Error(
        `Failed to exchange authorization code: ${
          tokenError instanceof Error ? tokenError.message : "Unknown error"
        }`
      );
    }

    // Get user data from Discord
    let discordUser: any;
    try {
      console.log("Getting Discord user data...");
      discordUser = await getDiscordUser(accessToken);
      console.log("Got Discord user:", discordUser);
    } catch (userError) {
      console.error("Failed to get Discord user:", userError);
      throw new Error(
        `Failed to get Discord user data: ${
          userError instanceof Error ? userError.message : "Unknown error"
        }`
      );
    }

    // Create or update user in database
    let userData: UserData;
    try {
      console.log("Creating or updating user in database...");
      userData = await createOrUpdateUser(discordUser, referralCode);
      console.log("Created/updated user:", userData);
    } catch (dbError) {
      console.error("Database operation failed:", dbError);
      throw new Error(
        `Database error: ${
          dbError instanceof Error ? dbError.message : "Unknown error"
        }`
      );
    }


    return userData;
  } catch (error) {
    console.error(
      "OAuth callback error:",
      error instanceof Error ? error.message : error
    );

    // Try to diagnose the issue
    try {
      if (error instanceof Error && error.message.includes("Database error")) {
        console.log("Attempting to diagnose database issue...");
        // This is a non-critical operation, so we don't throw if it fails
        const { data: diagResult } = await supabase.rpc(
          "diagnose_discord_login",
          {
            p_discord_id: "unknown", // We don't have the ID yet if we're at this point
          }
        );
        console.log("Diagnosis result:", diagResult);
      }
    } catch (diagError) {
      console.error("Error during diagnosis:", diagError);
    }

    throw error;
  }
};

// Sign out
export const signOut = async (): Promise<void> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Sign out error:", error);

    // Clear local session
    clearUserSession();
  } catch (error) {
    console.error("Error in signOut:", error);
    // Always clear local session even if Supabase signout fails
    clearUserSession();
  }
};

// Get current session
export const getCurrentSession = async () => {
  try {
    // First check for stored local session
    const storedSession = getStoredUserSession();
    if (storedSession) {
      console.log("Found stored session for user:", storedSession.username);
      return {
        user: {
          user_metadata: {
            discord_id: storedSession.id,
          },
        },
      };
    }

    // Fallback to Supabase session
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
  } catch (error) {
    console.error("Error getting current session:", error);
    return null;
  }
};
