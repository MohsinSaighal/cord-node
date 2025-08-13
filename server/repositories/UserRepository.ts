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
      "accountAge",
      "joinDate",
      "multiplier",
      "compensationClaimed",
      "hasBadgeOfHonor",
      "totalEarned",
      "currentBalance",
      "isNodeActive",
      "tasksCompleted",
      "rank",
      "nodeStartTime",
      "lastLoginTime",
      "dailyCheckInClaimed",
      "weeklyEarnings",
      "monthlyEarnings",
      "referralCode",
      "referredBy",
      "referralEarnings",
      "totalReferrals",
      "currentEpochId",
      "epochJoinDate",
      "totalEpochEarnings",
      "lastSavedBalance",
    ];

    // 2. Create filtered update data
    const filteredData: Partial<User> = {};
    Object.keys(userData).forEach((key) => {
      if (updatableFields.includes(key)) {
        filteredData[key] = userData[key];
      }
    });

    // 3. Perform update using query builder for maximum safety
    await this.repository
      .createQueryBuilder()
      .update(User)
      .set(filteredData)
      .where("id = :id", { id })
      .execute();

    // 4. Return the updated user without problematic relations
    return this.repository.findOne({ where: { id } });
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected !== 0;
  }

  async findTopUsers(limit: number = 10): Promise<User[]> {
    return await this.repository.find({
      order: { totalEarned: "DESC" },
      take: limit,
    });
  }

  async findActiveMiners(): Promise<User[]> {
    return await this.repository.find({
      where: { isNodeActive: true },
    });
  }

  async updateBalance(id: string, newBalance: number): Promise<void> {
    await this.repository.update(id, {
      currentBalance: newBalance,
      lastSavedBalance: newBalance,
    });
  }

  async getUserStats() {
    const [totalUsers, activeUsers] = await Promise.all([
      this.repository.count(),
      this.repository.count({ where: { isNodeActive: true } }),
    ]);

    const totalEarningsResult = await this.repository
      .createQueryBuilder("user")
      .select("SUM(user.totalEarned)", "sum")
      .getRawOne();

    return {
      totalMiners: totalUsers,
      activeMiners: activeUsers,
      totalEarned: parseFloat(totalEarningsResult.sum) || 0,
    };
  }
}
