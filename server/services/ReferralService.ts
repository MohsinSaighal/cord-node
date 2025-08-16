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

  async processNewUserReferral(newUserId: string, referralCode: string) {
    try {
      const newUser = await this.userRepository.findOne({
        where: { id: newUserId }
      });

      if (!newUser) {
        throw {
          statusCode: 404,
          message: "New user not found"
        };
      }

      if (newUser.referred_by) {
        throw {
          statusCode: 400,
          message: "You have already used a referral code"
        };
      }

      const referrer = await this.userRepository.findOne({
        where: { referralCode }
      });

      if (!referrer) {
        throw {
          statusCode: 400,
          message: "Invalid referral code"
        };
      }

      // Calculate bonuses
      const newUserWelcomeBonus = Math.floor(newUser.account_age * 25 * newUser.multiplier * 2);
      const referrerBonus = Math.floor(newUserWelcomeBonus * 0.1);

      // Update referrer stats and balance
      referrer.current_balance += referrerBonus;
      referrer.total_earned += referrerBonus;
      referrer.referral_earnings += referrerBonus;
      referrer.total_referrals += 1;
      await this.userRepository.save(referrer);

      // Update new user with referral info and bonus
      newUser.referred_by = referrer.id;
      newUser.current_balance += newUserWelcomeBonus;
      newUser.total_earned += newUserWelcomeBonus;
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
        referredBonus: newUserWelcomeBonus
      };

    } catch (error:any) {
      console.log('Error processing new user referral:', error);
      // Rethrow our custom errors
      if (error.statusCode) {
        throw error;
      }
      // Handle unexpected errors
      throw {
        statusCode: 500,
        message: "Failed to process referral"
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

      if (!user || !user.referred_by) {
        return { success: true }; // No referrer, but not an error
      }

      // Get the referrer
      const referrer = await this.userRepository.findOne({
        where: { id: user.referred_by }
      });

      if (!referrer) {
        return { success: true }; // Referrer no longer exists
      }

      // Calculate 10% commission for referrer
      const referrerBonus = earningAmount * 0.1;

      // Update referrer balance
      referrer.current_balance += referrerBonus;
      referrer.total_earned += referrerBonus;
      referrer.referral_earnings += referrerBonus;
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
          account_age: ref.referredUser.account_age,
          total_earned: ref.referredUser.total_earned
        }
      }));

      return {
        totalReferrals: user.total_referrals,
        totalEarnings: user.referral_earnings,
        referralHistory: formattedHistory
      };

    } catch (error) {
      console.error('Error getting referral stats:', error);
      return { totalReferrals: 0, totalEarnings: 0, referralHistory: [] };
    }
  }
}