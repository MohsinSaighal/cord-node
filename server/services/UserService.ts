import { UserRepository } from "../repositories/UserRepository";
import { User } from "../entities/User";
import { generateReferralCode } from "../utils/referralUtils";
import { ReferralService } from "./ReferralService";

export class UserService {
  private userRepository: UserRepository;
  private referralService: ReferralService;

  constructor() {
    this.userRepository = new UserRepository();
    this.referralService = new ReferralService();
  }

  async createUser(userData: {
    username: string;
    discriminator: string;
    avatar?: string;
    account_age: number;
    join_date: Date;
    referredBy?: string;
  }): Promise<User> {
    const referralCode = generateReferralCode();
    
    const user = await this.userRepository.create({
      ...userData,
      referralCode,
      multiplier: this.calculateMultiplier(userData.account_age),
      join_date: userData.join_date || new Date(),
      last_login_time: Date.now(),
    });

    // Process referral if user joined through referral code
    if (userData.referredBy) {
      await this.referralService.processNewUserReferral(user.id, userData.referredBy);
    }

    return user;
  }

  async getUserById(id: string): Promise<User | null> {
    return await this.userRepository.findById(id);
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return await this.userRepository.findByUsername(username);
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User | null> {
    return await this.userRepository.update(id, userData);
  }

  async getLeaderboard(limit: number = 10): Promise<User[]> {
    return await this.userRepository.findTopUsers(limit);
  }

  async getGlobalStats() {
    return await this.userRepository.getUserStats();
  }

  async updateUserBalance(id: string, newBalance: number): Promise<void> {
    await this.userRepository.updateBalance(id, newBalance);
  }

  private calculateMultiplier(account_age: number): number {
    // Base multiplier starts at 1.0
    let multiplier = 1.0;
    
    // Add 0.1 for each year of account age, capped at 2.0
    multiplier += Math.min(account_age * 0.1, 1.0);
    
    return Math.round(multiplier * 100) / 100; // Round to 2 decimal places
  }

  async activateNode(userId: string): Promise<User | null> {
    const user = await this.userRepository.findById(userId);
    if (!user) return null;

    return await this.userRepository.update(userId, {
      isNodeActive: true,
      nodeStartTime: Date.now(),
    });
  }

  async deactivateNode(userId: string): Promise<User | null> {
    return await this.userRepository.update(userId, {
      isNodeActive: false,
      nodeStartTime: null,
    });
  }
}