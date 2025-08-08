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
        endTime: null, // Active session
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

  async endMiningSession(sessionId: string, finalEarnings: number): Promise<void> {
    await this.miningSessionRepository.update(sessionId, {
      endTime: new Date(),
      earnings: finalEarnings,
    });
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
      // Get user
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        return {
          success: false,
          error: "User not found",
        };
      }

      // Get current session
      const session = await this.miningSessionRepository.findOne({
        where: { id: sessionId },
      });

      if (!session) {
        return {
          success: false,
          error: "Mining session not found",
        };
      }

      // Update user balance
      user.currentBalance += earningsToAdd;
      user.totalEarned += earningsToAdd;
      user.weeklyEarnings += earningsToAdd;
      user.monthlyEarnings += earningsToAdd;
      await this.userRepository.save(user);

      // Update session earnings - ensure proper number handling
      const currentEarnings = parseFloat(session.earnings.toString());
      session.earnings = currentEarnings + earningsToAdd;
      await this.miningSessionRepository.save(session);

      return {
        success: true,
        newBalance: user.currentBalance,
      };
    } catch (error) {
      console.error("Error saving mining progress:", error);
      return {
        success: false,
        error: "Database error occurred",
      };
    }
  }
}