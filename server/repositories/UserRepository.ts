import { Repository } from "typeorm";
import { AppDataSource } from "../data-source";
import { User } from "../entities/User";

export class UserRepository {
  private repository: Repository<User>;

  constructor() {
    this.repository = AppDataSource.getRepository(User);
  }

  async findById(id: string): Promise<User | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ["userTasks", "epochStats", "referrals"],
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return await this.repository.findOne({
      where: { username },
      relations: ["userTasks", "epochStats", "referrals"],
    });
  }

  async findByReferralCode(referralCode: string): Promise<User | null> {
    return await this.repository.findOne({
      where: { referralCode },
    });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.repository.create(userData);
    return await this.repository.save(user);
  }

  async update(id: string, userData: Partial<User>): Promise<User | null> {
    // 1. Define all non-relation fields from your entity
    const updatableFields = [
      "username",
      "discriminator",
      "avatar",
      "account_age",
      "join_date",
      "multiplier",
      "compensationClaimed",
      "hasbadgeofhonor",
      "total_earned",
      "current_balance",
      "is_node_active",
      "tasksCompleted",
      "rank",
      "nodeStartTime",
      "last_login_time",
      "daily_checkin_claimed",
      "weekly_earnings",
      "monthly_earnings",
      "referralCode",
      "referredBy",
      "referralEarnings",
      "totalReferrals",
      "currentEpochId",
      "epochJoinDate",
      "totalEpochEarnings",
      "lastSavedBalance",
    ];
const numericFields = [
      "total_earned",
      "current_balance",
      "weekly_earnings",
      "monthly_earnings",
      "referralEarnings",
      "totalEpochEarnings",
      "lastSavedBalance",
    ];

    const filteredData: Partial<User> = {};
    Object.keys(userData).forEach((key) => {
      if (updatableFields.includes(key)) {
        if (numericFields.includes(key)) {
          // Convert to number and round if needed
          const numValue = Number(String(userData[key]).replace(/[^\d.-]/g, ""));
          if (!isNaN(numValue)) {
            // Round if storing as bigint, or keep as is for decimal
            filteredData[key] = Math.round(numValue); // or just numValue if using decimal
          } else {
            console.warn(`Invalid number value for ${key}:`, userData[key]);
          }
        } else {
          filteredData[key] = userData[key];
        }
      }
    });

    try {
      await this.repository
        .createQueryBuilder()
        .update(User)
        .set(filteredData)
        .where("id = :id", { id })
        .execute();

      return this.repository.findOne({ where: { id } });
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected !== 0;
  }

  async findTopUsers(limit: number = 10): Promise<User[]> {
    return await this.repository.find({
      order: { total_earned: "DESC" },
      take: limit,
    });
  }

  async findAll(): Promise<User[]> {
    return await this.repository.find();
  }

  async updateBalance(id: string, newBalance: number): Promise<void> {
    await this.repository.update(id, {
      current_balance: newBalance,
    });
  }

  async getUserStats() {
    const [totalUsers] = await Promise.all([this.repository.count()]);

    const totalEarningsResult = await this.repository
      .createQueryBuilder("user")
      .select("SUM(user.total_earned)", "sum")
      .getRawOne();

    return {
      totalMiners: totalUsers,
      total_earned: parseFloat(totalEarningsResult.sum) || 0,
    };
  }
}
