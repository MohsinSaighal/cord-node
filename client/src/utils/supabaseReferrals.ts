import { supabase } from '../lib/supabase';
import { UserData } from '../types';

// Enhanced referral processing with 10% ongoing rewards
export const processReferralInDatabase = async (newUser: UserData, referralCode: string): Promise<UserData> => {
  try {
    console.log('Processing referral for new user:', newUser.id, 'with code:', referralCode);
    
    // Check if supabase is available
    if (!supabase) {
      console.error('Supabase client is not available');
      throw new Error('Database connection not available');
    }
    
    // Calculate referral bonuses
    const newUserWelcomeBonus = Math.floor(newUser.account_age * 25 * newUser.multiplier);
    console.log("new welcome bonus", newUserWelcomeBonus);
    const referrerBonus = Math.floor(newUserWelcomeBonus * 0.2); // 20% of new user's welcome bonus

    console.log('Calculated bonuses:', {
      newUserWelcomeBonus,
      referrerBonus
    });

    // Use the complete referral processing function
    try {
      const { data: result, error: functionError } = await supabase
        .rpc('process_referral_complete', {
          p_referrer_code: referralCode,
          p_referred_user_id: newUser.id,
          p_bonus_amount: referrerBonus
        });

      if (functionError) {
        console.error('Referral function error:', functionError);
        throw new Error(`Referral processing failed: ${functionError.message}`);
      }

      if (!result || !result.success) {
        const errorMsg = result?.error || 'Unknown error';
        console.error('Referral processing failed:', errorMsg);
        throw new Error(errorMsg);
      }

      console.log('Referral processed successfully via function:', result);

      // Update new user with referral info and bonus
      const updatedNewUser = {
        ...newUser,
        referredBy: result.referrer_id,
        current_balance: newUser.current_balance + (result.referred_bonus || 0),
        total_earned: newUser.total_earned + (result.referred_bonus || 0)
      };

      console.log('Referral processed successfully:', {
        referrer: result.referrer_id,
        referred: newUser.id,
        referrerBonus: result.referrer_bonus,
        referredBonus: result.referred_bonus
      });

      // Show success notification
      setTimeout(() => {
        const notification = document.createElement('div');
        notification.className = 'fixed top-20 right-4 bg-green-600/20 border border-green-500/30 rounded-lg p-4 z-50 animate-slide-in max-w-sm';
        notification.innerHTML = `
          <div class="flex items-center space-x-2">
            <span class="text-green-400">🎉</span>
            <div>
              <div class="text-white font-medium text-sm">Referral Success!</div>
              <div class="text-green-400 text-xs">+${result.referred_bonus || 0} CORD referral bonus!</div>
            </div>
          </div>
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
      }, 2000);

      return updatedNewUser;
    } catch (processingError) {
      console.error('Error in referral processing:', processingError);
      throw processingError;
    }
  } catch (error) {
    console.error('Error processing referral:', error);
    
    // Show error notification with more specific message
    setTimeout(() => {
      const notification = document.createElement('div');
      notification.className = 'fixed top-20 right-4 bg-red-600/20 border border-red-500/30 rounded-lg p-4 z-50 animate-slide-in max-w-sm';
      
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        if (error.message.includes('already been referred')) {
          errorMessage = 'Account already referred by someone else';
        } else if (error.message.includes('relationship already exists')) {
          errorMessage = 'Referral already processed';
        } else if (error.message.includes('own referral code')) {
          errorMessage = 'Cannot refer yourself';
        } else if (error.message.includes('Invalid referral code')) {
          errorMessage = 'Invalid referral code';
        } else {
          errorMessage = error.message;
        }
      }
      
      notification.innerHTML = `
        <div class="flex items-center space-x-2">
          <span class="text-red-400">❌</span>
          <div>
            <div class="text-white font-medium text-sm">Referral Failed</div>
            <div class="text-red-400 text-xs">${errorMessage}</div>
          </div>
        </div>
      `;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 5000);
    }, 1000);
    
    return newUser; // Return original user data if referral fails
  }
};

// Get enhanced referral statistics with ongoing earnings
export const getEnhancedReferralStats = async (userId: string) => {
  try {
    console.log('Loading enhanced referral stats for user:', userId);
    
    if (!supabase) {
      console.error('Supabase client is not available');
      throw new Error('Database connection not available');
    }

    const { data: stats, error } = await supabase
      .rpc('get_enhanced_referral_stats', { p_user_id: userId });

    if (error) {
      console.error('Error loading enhanced referral stats:', error);
      throw error;
    }

    return stats;
  } catch (error) {
    console.error('Error getting enhanced referral stats:', error);
    return null;
  }
};

// Get referral earnings summary for a specific period
export const getReferralEarningsSummary = async (userId: string, period: string = 'all') => {
  try {
    const { data: summary, error } = await supabase
      .rpc('get_referral_earnings_summary', { 
        p_user_id: userId, 
        p_period: period 
      });

    if (error) {
      console.error('Error loading referral earnings summary:', error);
      throw error;
    }

    return summary;
  } catch (error) {
    console.error('Error getting referral earnings summary:', error);
    return null;
  }
};

// Distribute referral reward (called when user earns)
export const distributeReferralReward = async (
  userId: string, 
  earningAmount: number, 
  earningType: string = 'general',
  transactionId?: string
) => {
  try {
    const { data: result, error } = await supabase
      .rpc('distribute_referral_reward', {
        p_user_id: userId,
        p_earning_amount: earningAmount,
        p_earning_type: earningType,
        p_transaction_id: transactionId
      });

    if (error) {
      console.error('Error distributing referral reward:', error);
      throw error;
    }

    return result;
  } catch (error) {
    console.error('Error in distributeReferralReward:', error);
    return { success: false, error: error.message };
  }
};
export const getReferralStats = async (userId: string) => {
  try {
    console.log('Loading referral stats for user:', userId);
    
    // Check if supabase is available
    if (!supabase) {
      console.error('Supabase client is not available');
      throw new Error('Database connection not available');
    }

    // Use the safe function we created in the migration
    try {
      const { data: referralHistory, error } = await supabase
        .rpc('get_user_referral_history', { p_user_id: userId });

      if (error) {
        console.error('Error with referral history function:', error);
        throw error; // Will be caught by outer try-catch
      }

      if (!referralHistory || referralHistory.length === 0) {
        console.log('No referrals found for user:', userId);
        return [];
      }

      // Transform the function result to match expected format
      const transformedHistory = referralHistory.map((item: any) => ({
        id: item.referral_id,
        bonus_amount: item.bonus_amount,
        created_at: item.created_at,
        referred: {
          username: item.referred_username,
          avatar: item.referred_avatar,
          created_at: item.referred_join_date
        }
      }));

      console.log('Processed referral history:', transformedHistory.length, 'items');
      return transformedHistory;
    } catch (functionError) {
      console.log('Referral history function failed, trying fallback query...', functionError);
      
      // Fallback to direct query if function fails
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('referrals')
        .select(`
          id,
          bonus_amount,
          created_at,
          referred_id
        `)
        .eq('referrer_id', userId)
        .order('created_at', { ascending: false });

      if (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        throw new Error(`Failed to load referral data: ${fallbackError.message}`);
      }

      if (!fallbackData || fallbackData.length === 0) {
        console.log('No referrals found for user:', userId);
        return [];
      }

      // Get user data for each referred user
      const processedHistory = [];
      for (const referral of fallbackData) {
        try {
          const { data: referredUser, error: userError } = await supabase
            .from('users')
            .select('username, avatar, created_at')
            .eq('id', referral.referred_id)
            .single();

          if (userError) {
            console.error('Error getting referred user data:', userError);
            continue;
          }

          if (referredUser) {
            processedHistory.push({
              id: referral.id,
              bonus_amount: referral.bonus_amount,
              created_at: referral.created_at,
              referred: {
                username: referredUser.username,
                avatar: referredUser.avatar,
                created_at: referredUser.created_at
              }
            });
          }
        } catch (userFetchError) {
          console.error('Error fetching user data for referral:', userFetchError);
          continue;
        }
      }

      return processedHistory;
    }
  } catch (error) {
    console.error('Error getting referral stats:', error);
    
    // Return empty array instead of throwing to prevent UI crashes
    return [];
  }
};

// Function to validate referral code
export const validateReferralCode = async (referralCode: string): Promise<boolean> => {
  try {
    if (!supabase) {
      console.error('Supabase client is not available');
      return false;
    }

    const { data: result, error } = await supabase
      .rpc('validate_referral_code', { p_code: referralCode });

    if (error) {
      console.error('Error validating referral code:', error);
      return false;
    }

    return result && result.valid;
  } catch (error) {
    console.error('Error validating referral code:', error);
    return false;
  }
};

// Function to get referral leaderboard
export const getReferralLeaderboard = async (limit: number = 10) => {
  try {
    if (!supabase) {
      console.error('Supabase client is not available');
      return [];
    }

    const { data: topReferrers, error } = await supabase
      .from('users')
      .select('id, username, avatar, total_referrals, referral_earnings')
      .gt('total_referrals', 0)
      .order('total_referrals', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting referral leaderboard:', error);
      return [];
    }

    return topReferrers || [];
  } catch (error) {
    console.error('Error getting referral leaderboard:', error);
    return [];
  }
};