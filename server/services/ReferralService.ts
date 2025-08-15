import { Repository } from "typeorm";
import { User } from "../entities/User";
import { ReferralData } from "../entities/ReferralData";
import { AppDataSource } from "../data-source";

export class ReferralService {
  private userRepository: Repository<User>;
  private referralDataRepository: Repository<ReferralData>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.referralDataRepository = AppDataSource.getRepository(ReferralData);
  }

  async processNewUserReferral(newUserId: string, referralCode: string): Promise<{
    success: boolean;
    referrerBonus?: number;
    referredBonus?: number;
    error?: string;
    statusCode?: string;
    httpStatus: number;
  }> {
    try {
      // First check if user has already used a referral code
      const newUser = await this.userRepository.findOne({
        where: { id: newUserId }
      });

      if (!newUser) {
        return {
          success: false,
          error: "New user not found",
          statusCode: "USER_NOT_FOUND",
          httpStatus: 404
        };
      }

      // Check if user already has a referrer
      if (newUser.referredBy) {
        return {
          success: false,
          error: "You have already used a referral code",
          statusCode: "REFERRAL_ALREADY_USED",
          httpStatus: 400
        };
      }

      // Find the referrer by referral code
      const referrer = await this.userRepository.findOne({
        where: { referralCode }
      });

      if (!referrer) {
        return {
          success: false,
          error: "Invalid referral code",
          statusCode: "INVALID_REFERRAL_CODE",
          httpStatus: 400
        };
      }

      // Calculate bonuses
      const newUserWelcomeBonus = Math.floor(newUser.accountAge * 25 * newUser.multiplier * 2);
      const referrerBonus = Math.floor(newUserWelcomeBonus * 0.1);

      // Update referrer stats and balance
      referrer.currentBalance += referrerBonus;
      referrer.totalEarned += referrerBonus;
      referrer.referralEarnings += referrerBonus;
      referrer.totalReferrals += 1;
      await this.userRepository.save(referrer);

      // Update new user with referral info and bonus
      newUser.referredBy = referrer.id;
      newUser.currentBalance += newUserWelcomeBonus;
      newUser.totalEarned += newUserWelcomeBonus;
      await this.userRepository.save(newUser);

      // Create referral data record
      const referralData = this.referralDataRepository.create({
        code: referralCode,
        referrerId: referrer.id,
        referredUserId: newUser.id,
        totalEarnings: referrerBonus,
        totalReferrals: 1
      });
      await this.referralDataRepository.save(referralData);

      return {
        success: true,
        referrerBonus,
        referredBonus: newUserWelcomeBonus,
        statusCode: "SUCCESS",
        httpStatus: 200
      };

    } catch (error) {
      console.error('Error processing referral:', error);
      return {
        success: false,
        error: "Failed to process referral",
        statusCode: "PROCESSING_ERROR",
        httpStatus: 500
      };
    }
  }

  async distributeReferralReward(userId: string, earningAmount: number): Promise<{
    success: boolean;
    referrerBonus?: number;
    error?: string;
  }> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId }
      });

      if (!user || !user.referredBy) {
        return { success: true }; // No referrer, but not an error
      }

      // Get the referrer
      const referrer = await this.userRepository.findOne({
        where: { id: user.referredBy }
      });

      if (!referrer) {
        return { success: true }; // Referrer no longer exists
      }

      // Calculate 10% commission for referrer
      const referrerBonus = earningAmount * 0.1;

      // Update referrer balance
      referrer.currentBalance += referrerBonus;
      referrer.totalEarned += referrerBonus;
      referrer.referralEarnings += referrerBonus;
      await this.userRepository.save(referrer);

      // Update referral data
      await this.referralDataRepository
        .createQueryBuilder()
        .update(ReferralData)
        .set({
          totalEarnings: () => `"totalEarnings" + ${referrerBonus}`
        })
        .where("referrerId = :referrerId AND referredUserId = :referredUserId", {
          referrerId: referrer.id,
          referredUserId: userId
        })
        .execute();

      return {
        success: true,
        referrerBonus
      };

    } catch (error) {
      console.error('Error distributing referral reward:', error);
      return {
        success: false,
        error: "Failed to distribute referral reward"
      };
    }
  }

  async getReferralStats(userId: string): Promise<{
    totalReferrals: number;
    totalEarnings: number;
    referralHistory: any[];
  }> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId }
      });

      if (!user) {
        return { totalReferrals: 0, totalEarnings: 0, referralHistory: [] };
      }

      // Get referral history
      const referralHistory = await this.referralDataRepository
        .createQueryBuilder("referral")
        .leftJoinAndSelect("referral.referredUser", "referredUser")
        .where("referral.referrerId = :userId", { userId })
        .orderBy("referral.createdAt", "DESC")
        .getMany();

      const formattedHistory = referralHistory.map(ref => ({
        id: ref.id,
        referredUsername: ref.referredUser.username,
        totalEarnings: ref.totalEarnings,
        createdAt: ref.createdAt,
        referredUser: {
          username: ref.referredUser.username,
          accountAge: ref.referredUser.accountAge,
          totalEarned: ref.referredUser.totalEarned
        }
      }));

      return {
        totalReferrals: user.totalReferrals,
        totalEarnings: user.referralEarnings,
        referralHistory: formattedHistory
      };

    } catch (error) {
      console.error('Error getting referral stats:', error);
      return { totalReferrals: 0, totalEarnings: 0, referralHistory: [] };
    }
  }
}