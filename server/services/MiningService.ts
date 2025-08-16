import { AppDataSource } from "../data-source";
import { MiningSession } from "../entities/MiningSession";
import { User } from "../entities/User";
import { Repository } from "typeorm";

export class MiningService {
  private miningSessionRepository: Repository<MiningSession>;
  private userRepository: Repository<User>;

  constructor() {
    this.miningSessionRepository = AppDataSource.getRepository(MiningSession);
    this.userRepository = AppDataSource.getRepository(User);
  }

  async createMiningSession(userId: string): Promise<MiningSession> {
    const session = this.miningSessionRepository.create({
      userId,
      startTime: new Date(),
      earnings: 0,
      hashRate: 150 + Math.random() * 50, // Random hash rate
      efficiency: 85 + Math.random() * 15, // Random efficiency
    });

    return await this.miningSessionRepository.save(session);
  }

  async getCurrentSession(userId: string): Promise<MiningSession | null> {
    return await this.miningSessionRepository.findOne({
      where: {
        userId,
      },
      order: { startTime: "DESC" },
    });
  }

  async updateMiningSession(
    sessionId: string,
    updates: Partial<MiningSession>
  ): Promise<MiningSession | null> {
    await this.miningSessionRepository.update(sessionId, updates);
    return await this.miningSessionRepository.findOne({
      where: { id: sessionId },
    });
  }

  async endMiningSession(
    sessionId: string,
    finalEarnings: number
  ): Promise<void> {
    try {
      // Get the session to find the user
      const session = await this.miningSessionRepository.findOne({
        where: { id: sessionId },
      });

      if (!session) {
        throw new Error("Mining session not found");
      }

      // Improved decimal formatter that handles string inputs
      const formatDecimal = (value: number | string): number => {
        const num = typeof value === "string" ? parseFloat(value) : value;
        return parseFloat(num.toFixed(8));
      };

      // Format all numbers consistently
      const currentSessionEarnings = formatDecimal(session.earnings);
      const finalEarningsFormatted = formatDecimal(finalEarnings);

      // Calculate remaining earnings
      const remainingEarnings = formatDecimal(
        finalEarningsFormatted - currentSessionEarnings
      );

      // If there are remaining earnings, add them to user balance
      if (remainingEarnings > 0) {
        const user = await this.userRepository.findOne({
          where: { id: session.userId },
        });

        if (!user) {
          throw new Error("User not found");
        }

        try {
          // Safely convert all balance values before arithmetic
          const currentBalance = formatDecimal(user.current_balance);
          const totalEarned = formatDecimal(user.total_earned);
          const weeklyEarnings = formatDecimal(user.weekly_earnings);
          const monthlyEarnings = formatDecimal(user.monthly_earnings);

          // Update user balances with formatted values
          user.current_balance = formatDecimal(
            currentBalance + remainingEarnings
          );
          user.total_earned = formatDecimal(totalEarned + remainingEarnings);
          user.weekly_earnings = formatDecimal(
            weeklyEarnings + remainingEarnings
          );
          user.monthly_earnings = formatDecimal(
            monthlyEarnings + remainingEarnings
          );

          await this.userRepository.save(user);
        } catch (userSaveError) {
          console.error("Failed to update user balances:", userSaveError);
          throw new Error("Failed to update user balances");
        }
      }

      // Update session with end time and final earnings
      try {
        await this.miningSessionRepository.update(sessionId, {
          endTime: new Date(),
          earnings: finalEarningsFormatted,
        });
      } catch (sessionUpdateError) {
        console.error("Failed to update mining session:", sessionUpdateError);
        throw new Error("Failed to update mining session");
      }
    } catch (error) {
      console.error("Error in endMiningSession:", error);
      throw error;
    }
  }
  async getUserMiningSessions(
    userId: string,
    limit: number = 10
  ): Promise<MiningSession[]> {
    return await this.miningSessionRepository.find({
      where: { userId },
      order: { startTime: "DESC" },
      take: limit,
    });
  }

  async saveMiningProgress(
    userId: string,
    sessionId: string,
    earningsToAdd: number
  ): Promise<{
    success: boolean;
    newBalance?: number;
    error?: string;
  }> {
    try {
      console.debug("[saveMiningProgress] Starting with params:", {
        userId,
        sessionId,
        earningsToAdd,
        earningsToAddType: typeof earningsToAdd,
      });

      // Get user
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        console.error("[saveMiningProgress] User not found:", userId);
        return {
          success: false,
          error: "User not found",
        };
      }

      console.debug("[saveMiningProgress] Found user:", {
        id: user.id,
        current_balance: user.current_balance,
        total_earned: user.total_earned,
        weekly_earnings: user.weekly_earnings,
        monthly_earnings: user.monthly_earnings,
        current_balanceType: typeof user.current_balance,
        total_earnedType: typeof user.total_earned,
        weekly_earningsType: typeof user.weekly_earnings,
        monthly_earningsType: typeof user.monthly_earnings,
      });

      // Get current session
      const session = await this.miningSessionRepository.findOne({
        where: { id: sessionId },
      });

      if (!session) {
        console.error("[saveMiningProgress] Session not found:", sessionId);
        return {
          success: false,
          error: "Mining session not found",
        };
      }

      console.debug("[saveMiningProgress] Found session:", {
        id: session.id,
        earnings: session.earnings,
        earningsType: typeof session.earnings,
      });

      // Convert all values to proper numbers with detailed logging
      const earnings = Number(earningsToAdd);
      console.debug("[saveMiningProgress] earningsToAdd conversion:", {
        input: earningsToAdd,
        output: earnings,
        isValid: !isNaN(earnings),
      });

      const currentBalance = Number(user.current_balance);
      console.debug("[saveMiningProgress] current_balance conversion:", {
        input: user.current_balance,
        output: currentBalance,
        isValid: !isNaN(currentBalance),
      });

      const totalEarned = Number(user.total_earned);
      console.debug("[saveMiningProgress] total_earned conversion:", {
        input: user.total_earned,
        output: totalEarned,
        isValid: !isNaN(totalEarned),
      });

      const weekly_earnings = Number(user.weekly_earnings);
      console.debug("[saveMiningProgress] weekly_earnings conversion:", {
        input: user.weekly_earnings,
        output: weekly_earnings,
        isValid: !isNaN(weekly_earnings),
      });

      const monthly_earnings = Number(user.monthly_earnings);
      console.debug("[saveMiningProgress] monthly_earnings conversion:", {
        input: user.monthly_earnings,
        output: monthly_earnings,
        isValid: !isNaN(monthly_earnings),
      });

      const sessionEarnings = Number(session.earnings);
      console.debug("[saveMiningProgress] session.earnings conversion:", {
        input: session.earnings,
        output: sessionEarnings,
        isValid: !isNaN(sessionEarnings),
      });

      if (isNaN(earnings)) {
        console.error(
          "[saveMiningProgress] Invalid earnings value:",
          earningsToAdd
        );
        return {
          success: false,
          error: "Invalid earnings value",
        };
      }

      // Calculate new values
      const newBalance = currentBalance + earnings;
      const newTotalEarned = totalEarned + earnings;
      const newWeeklyEarnings = weekly_earnings + earnings;
      const newMonthlyEarnings = monthly_earnings + earnings;
      const newSessionEarnings = sessionEarnings + earnings;

      console.debug("[saveMiningProgress] Calculated new values:", {
        newBalance,
        newTotalEarned,
        newWeeklyEarnings,
        newMonthlyEarnings,
        newSessionEarnings,
        allValid: ![
          newBalance,
          newTotalEarned,
          newWeeklyEarnings,
          newMonthlyEarnings,
          newSessionEarnings,
        ].some(isNaN),
      });

      // Prepare update data with string representations for debugging
      const userUpdateData = {
        current_balance: newBalance,
        total_earned: newTotalEarned,
        weekly_earnings: newWeeklyEarnings,
        monthly_earnings: newMonthlyEarnings,
      };

      const sessionUpdateData = {
        earnings: newSessionEarnings,
      };

      console.debug("[saveMiningProgress] Prepared update data:", {
        userUpdateData,
        sessionUpdateData,
        userUpdateDataString: JSON.stringify(userUpdateData),
        sessionUpdateDataString: JSON.stringify(sessionUpdateData),
      });

      // Update user balance
      await this.userRepository.update(userId, userUpdateData);
      console.debug("[saveMiningProgress] User update successful");

      // Update session earnings
      await this.miningSessionRepository.update(sessionId, sessionUpdateData);
      console.debug("[saveMiningProgress] Session update successful");

      return {
        success: true,
        newBalance: newBalance,
      };
    } catch (error) {
      console.error("[saveMiningProgress] Error saving mining progress:", {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        ...(error instanceof Error && "driverError" in error
          ? { driverError: error.driverError }
          : {}),
      });

      return {
        success: false,
        error: "Database error occurred",
      };
    }
  }
}
