import { supabase } from "../lib/supabase";
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
import { processReferralInDatabase } from "./supabaseReferrals";
import { getStoredReferralCode, clearStoredReferralCode } from "./referral";

// Function to log authentication attempts
const logAuthAttempt = async (
  userId: string,
  method: string,
  status: string,
  details?: any
) => {
  try {
    await supabase.rpc("log_auth_attempt", {
      p_user_id: userId,
      p_auth_method: method,
      p_status: status,
      p_details: details ? JSON.stringify(details) : null,
    });
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
      joinDate: userData.joinDate.toISOString(), // Convert Date to string for storage
      lastSavedBalance: userData.currentBalance, // Track last saved balance
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
    userData.joinDate = new Date(userData.joinDate);

    // Ensure we don't lose balance between sessions
    if (
      userData.lastSavedBalance &&
      userData.currentBalance < userData.lastSavedBalance
    ) {
      userData.currentBalance = userData.lastSavedBalance;
      userData.totalEarned = Math.max(
        userData.totalEarned,
        userData.lastSavedBalance
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

// Create or update user in database
export const createOrUpdateUser = async (
  discordUser: any,
  referralCode?: string
): Promise<UserData> => {
  // Log the start of user creation/update
  await logAuthAttempt(discordUser.id, "discord_oauth", "start", {
    username: discordUser.username,
    hasReferralCode: !!referralCode,
  });

  const accountAge = calculateAccountAge(discordUser.created_timestamp);
  const multiplier = calculateMultiplier(accountAge);
  const baseBalance = calculateInitialBalance(accountAge, multiplier) || 0;
  const userReferralCode = generateReferralCode();

  console.log("Creating/updating user:", {
    id: discordUser.id,
    username: discordUser.username,
    accountAge,
    multiplier,
    baseBalance,
    referralCode,
  });

  try {
    // First, try to get existing user
    let existingUser = null;
    let checkError = null;

    try {
      const { data: existingUsers, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", discordUser.id);

      if (existingUsers && existingUsers.length > 0) {
        existingUser = existingUsers[0];
      }
      checkError = error;
    } catch (error) {
      console.error("Error checking existing user:", error);
      checkError = error;
    }

    if (checkError) {
      console.error("Error checking existing user:", checkError);
      await logAuthAttempt(discordUser.id, "discord_oauth", "error_check", {
        error: checkError.message,
      });

      // Try alternative method to check if user exists
      try {
        const { data: checkResult } = await supabase.rpc("check_user_exists", {
          p_user_id: discordUser.id,
        });

        if (checkResult && checkResult.exists) {
          console.log("User exists according to check_user_exists function");
          existingUser = checkResult.user_data;
        }
      } catch (funcError) {
        console.error("Error with check_user_exists function:", funcError);
      }

      if (!existingUser) {
        throw new Error(`Database error: ${checkError.message}`);
      }
    }

    let userData: UserData;

    if (existingUser) {
      console.log("User exists, updating login time");
      await logAuthAttempt(discordUser.id, "discord_oauth", "existing_user", {
        username: existingUser.username,
      });

      // For existing users, just update the login time and return existing data
      const { error: updateError } = await supabase
        .from("users")
        .update({
          last_login_time: new Date().toISOString(),
        })
        .eq("id", discordUser.id);

      if (updateError) {
        console.error("Error updating login time:", updateError);
        // Don't throw error, just log it and continue with existing data
      }

      userData = {
        id: existingUser.id,
        username: existingUser.username,
        discriminator: existingUser.discriminator,
        avatar: existingUser.avatar,
        accountAge: existingUser.account_age,
        joinDate: new Date(existingUser.join_date),
        multiplier: existingUser.multiplier,
        totalEarned: existingUser.total_earned,
        currentBalance: existingUser.current_balance,
              hasBadgeOfHonor: existingUser.hasBadgeOfHonor || false,

        isNodeActive: existingUser.is_node_active,
        nodeStartTime: existingUser.node_start_time
          ? new Date(existingUser.node_start_time).getTime()
          : undefined,
        tasksCompleted: existingUser.tasks_completed,
        rank: existingUser.rank,
        lastLoginTime: Date.now(), // Use current time
        dailyCheckInClaimed: existingUser.daily_checkin_claimed,
        weeklyEarnings: existingUser.weekly_earnings,
        monthlyEarnings: existingUser.monthly_earnings,
        referralCode: existingUser.referral_code,
        referredBy: existingUser.referred_by || undefined,
        referralEarnings: existingUser.referral_earnings,
        totalReferrals: existingUser.total_referrals,
        currentEpochId: existingUser.current_epoch_id || undefined,
        epochJoinDate: existingUser.epoch_join_date
          ? new Date(existingUser.epoch_join_date).getTime()
          : undefined,
        totalEpochEarnings: existingUser.total_epoch_earnings || 0,
        compensationClaimed: existingUser.compensation_claimed || false,
      };
    } else {
      console.log("Creating new user");
      await logAuthAttempt(discordUser.id, "discord_oauth", "new_user", {
        username: discordUser.username,
        accountAge,
      });

      // Create new user first (without referral processing)
      const newUserData = {
        id: discordUser.id,
        username: discordUser.username,
        discriminator: discordUser.discriminator,
        avatar: getAvatarUrl(discordUser.id, discordUser.avatar),
        account_age: accountAge,
        join_date: new Date(discordUser.created_timestamp).toISOString(),
        multiplier,
        total_earned: baseBalance,
        current_balance: baseBalance,
        referral_code: userReferralCode,
        rank: Math.floor(Math.random() * 1000) + 1,
        last_login_time: new Date().toISOString(),
        is_node_active: false,
        tasks_completed: 0,
        daily_checkin_claimed: false,
        weekly_earnings: 0,
        monthly_earnings: 0,
        referral_earnings: 0,
        total_referrals: 0,
      };

      const { data: newUsers, error: insertError } = await supabase
        .from("users")
        .insert(newUserData)
        .select();

      if (insertError) {
        console.error("Error creating user:", insertError);
        await logAuthAttempt(discordUser.id, "discord_oauth", "error_insert", {
          error: insertError.message,
        });

        // Try alternative method to create user
        try {
          console.log("Attempting to create user manually via function");
          const { data: createResult, error: createFuncError } =
            await supabase.rpc("create_user_manually", {
              p_user_id: discordUser.id,
              p_username: discordUser.username,
              p_discriminator: discordUser.discriminator,
              p_avatar: getAvatarUrl(discordUser.id, discordUser.avatar),
              p_account_age: accountAge,
              p_join_date: new Date(
                discordUser.created_timestamp
              ).toISOString(),
              p_referral_code: userReferralCode,
              p_referred_by: referralCode,
              p_total_earned: baseBalance,
            });

          if (createFuncError) {
            console.error("Error with manual user creation:", createFuncError);
            throw new Error(
              `Failed to create user: ${createFuncError.message}`
            );
          }

          if (createResult && createResult.success) {
            console.log("User created manually via function:", createResult);

            // Get the newly created user
            const { data: newUsers, error: fetchError } = await supabase
              .from("users")
              .select("*")
              .eq("id", discordUser.id);

            if (fetchError || !newUsers || newUsers.length === 0) {
              console.error("Error fetching newly created user:", fetchError);
              throw new Error("User created but could not be retrieved");
            }

            const newUser = newUsers[0];
            userData = {
              id: newUser.id,
              username: newUser.username,
              discriminator: newUser.discriminator,
              avatar: newUser.avatar,
              hasBadgeOfHonor:newUser.hasBadgeOfHonor,
              accountAge: newUser.account_age,
              joinDate: new Date(newUser.join_date),
              multiplier: newUser.multiplier,
              totalEarned: newUser.total_earned,
              currentBalance: newUser.current_balance,
              isNodeActive: newUser.is_node_active,
              nodeStartTime: newUser.node_start_time
                ? new Date(newUser.node_start_time).getTime()
                : undefined,
              tasksCompleted: newUser.tasks_completed,
              rank: newUser.rank,
              lastLoginTime: new Date(newUser.last_login_time).getTime(),
              dailyCheckInClaimed: newUser.daily_checkin_claimed,
              weeklyEarnings: newUser.weekly_earnings,
              monthlyEarnings: newUser.monthly_earnings,
              referralCode: newUser.referral_code || userReferralCode,
              referredBy: newUser.referred_by || undefined,
              referralEarnings: newUser.referral_earnings,
              totalReferrals: newUser.total_referrals,
              currentEpochId: newUser.current_epoch_id || undefined,
              epochJoinDate: newUser.epoch_join_date
                ? new Date(newUser.epoch_join_date).getTime()
                : undefined,
              totalEpochEarnings: newUser.total_epoch_earnings || 0,
              compensationClaimed: newUser.compensation_claimed || false,
            };

            // Skip the rest of the function since we already have the user data
            storeUserSession(userData);
            return userData;
          }
        } catch (manualCreateError) {
          console.error("Error in manual user creation:", manualCreateError);
        }

        throw new Error(`Failed to create user: ${insertError.message}`);
      }

      if (!newUsers || newUsers.length === 0) {
        throw new Error("No user returned after creation");
      }

      const newUser = newUsers[0];
      userData = {
        id: newUser.id,
        username: newUser.username,
        discriminator: newUser.discriminator,
        avatar: newUser.avatar,
        accountAge: newUser.account_age,
        joinDate: new Date(newUser.join_date),
        multiplier: newUser.multiplier,
        totalEarned: newUser.total_earned,
        currentBalance: newUser.current_balance,
        hasBadgeOfHonor: newUser.hasBadgeOfHonor,
        isNodeActive: newUser.is_node_active,
        nodeStartTime: newUser.node_start_time
          ? new Date(newUser.node_start_time).getTime()
          : undefined,
        tasksCompleted: newUser.tasks_completed,
        rank: newUser.rank,
        lastLoginTime: new Date(newUser.last_login_time).getTime(),
        dailyCheckInClaimed: newUser.daily_checkin_claimed,
        weeklyEarnings: newUser.weekly_earnings,
        monthlyEarnings: newUser.monthly_earnings,
        referralCode: newUser.referral_code || userReferralCode,
        referredBy: newUser.referred_by || undefined,
        referralEarnings: newUser.referral_earnings,
        totalReferrals: newUser.total_referrals,
        currentEpochId: newUser.current_epoch_id || undefined,
        epochJoinDate: newUser.epoch_join_date
          ? new Date(newUser.epoch_join_date).getTime()
          : undefined,
        totalEpochEarnings: newUser.total_epoch_earnings || 0,
        compensationClaimed: newUser.compensation_claimed || false,
      };

      // Create default user settings (don't fail if this fails)
      try {
        await supabase.from("user_settings").insert({
          user_id: discordUser.id,
        });
      } catch (settingsError) {
        console.error(
          "Error creating user settings (non-critical):",
          settingsError
        );
      }

      // Process referral AFTER user is created
      if (referralCode && referralCode.trim()) {
        console.log("Processing referral with code:", referralCode.trim());
        await logAuthAttempt(discordUser.id, "referral_processing", "start", {
          referralCode: referralCode.trim(),
        });

        try {
          // Process the referral now that user exists
          await processReferralInDatabase(userData, referralCode.trim());

          // Refresh user data to get updated referral info
          const { data: updatedUser } = await supabase
            .from("users")
            .select("*")
            .eq("id", discordUser.id)
            .single();

          if (updatedUser) {
            userData.referredBy = updatedUser.referred_by;
            userData.referralEarnings = updatedUser.referral_earnings;
          }
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

      storeUserSession(userData);
      await logAuthAttempt(discordUser.id, "discord_oauth", "success", {
        username: userData.username,
      });

      return userData;
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

// Update user data in database
export const updateUserInDatabase = async (
  userData: UserData
): Promise<void> => {
  try {
    const { error } = await supabase
      .from("users")
      .update({
        username: userData.username,
        discriminator: userData.discriminator,
        avatar: userData.avatar,
        account_age: userData.accountAge,
        join_date: userData.joinDate.toISOString(),
        multiplier: userData.multiplier,
        total_earned: userData.totalEarned || 0,
        current_balance: userData.currentBalance,
        is_node_active: userData.isNodeActive,
        node_start_time: userData.nodeStartTime
          ? new Date(userData.nodeStartTime).toISOString()
          : null,
        tasks_completed: userData.tasksCompleted,
        rank: userData.rank,
        last_login_time: new Date(userData.lastLoginTime).toISOString(),
        daily_checkin_claimed: userData.dailyCheckInClaimed,
        weekly_earnings: userData.weeklyEarnings,
        monthly_earnings: userData.monthlyEarnings,
        referral_earnings: userData.referralEarnings,
        total_referrals: userData.totalReferrals,
        referred_by: userData.referredBy || null,
        current_epoch_id: userData.currentEpochId || null,
        epoch_join_date: userData.epochJoinDate
          ? new Date(userData.epochJoinDate).toISOString()
          : null,
        total_epoch_earnings: userData.totalEpochEarnings,
        compensation_claimed: userData.compensationClaimed,
        hasBadgeOfHonor: userData.hasBadgeOfHonor,
      })
      .eq("id", userData.id);

    if (error) {
      console.error("Error updating user in database:", error);
      throw new Error(`Failed to update user: ${error.message}`);
    }

    // Update stored session
    storeUserSession(userData);
  } catch (error) {
    console.error("Error in updateUserInDatabase:", error);
    throw error;
  }
};

// Get user from database
export const getUserFromDatabase = async (
  userId: string
): Promise<UserData | null> => {
  if (!userId) return null;

  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId);

    if (error) {
      console.error("Error getting user from database:", error);
      return null;
    }

    if (!users || users.length === 0) return null;

    const user = users[0];
    console.log(">>>>>>>>>>>>>>>", user);

    const userData = {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      accountAge: user.account_age,
      joinDate: new Date(user.join_date),
      multiplier: user.multiplier,
      totalEarned: user.total_earned,
      currentBalance: user.current_balance,
      isNodeActive: user.is_node_active,
      nodeStartTime: user.node_start_time
        ? new Date(user.node_start_time).getTime()
        : undefined,
      tasksCompleted: user.tasks_completed,
      rank: user.rank,
      lastLoginTime: new Date(user.last_login_time).getTime(),
      dailyCheckInClaimed: user.daily_checkin_claimed,
      weeklyEarnings: user.weekly_earnings,
      hasBadgeOfHonor: user.hasBadgeOfHonor,
      monthlyEarnings: user.monthly_earnings,
      referralCode: user.referral_code || undefined,
      referredBy: user.referred_by || undefined,
      referralEarnings: user.referral_earnings,
      totalReferrals: user.total_referrals,
      currentEpochId: user.current_epoch_id || undefined,
      epochJoinDate: user.epoch_join_date
        ? new Date(user.epoch_join_date).getTime()
        : undefined,
      totalEpochEarnings: user.total_epoch_earnings || 0,
      compensationClaimed: user.compensation_claimed,
    };

    // Update stored session
    storeUserSession(userData);

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

    // Clear stored referral code after successful use
    if (referralCode) {
      clearStoredReferralCode();
    }

    // Create a Supabase auth session using anonymous auth with metadata
    try {
      console.log("Creating Supabase auth session...");
      const { data: authData, error: authError } =
        await supabase.auth.signInAnonymously({
          options: {
            data: {
              discord_id: discordUser.id,
              username: discordUser.username,
            },
          },
        });

      if (authError) {
        console.error("Auth error:", authError);
        // Continue anyway, we have the user data and local session
      } else if (authData) {
        console.log("Supabase auth session created successfully");
      } else {
        console.log("Supabase auth session created but no data returned");
      }
    } catch (authError) {
      console.error("Error creating auth session:", authError);
      // Continue anyway, we have the user data and local session
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
