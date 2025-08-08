import { Repository } from "typeorm";
import { BadgePurchase, BadgePurchaseStatus } from "../entities/BadgePurchase";
import { User } from "../entities/User";
import { AppDataSource } from "../data-source";

export class BadgePurchaseService {
  private badgePurchaseRepository: Repository<BadgePurchase>;
  private userRepository: Repository<User>;

  constructor() {
    this.badgePurchaseRepository = AppDataSource.getRepository(BadgePurchase);
    this.userRepository = AppDataSource.getRepository(User);
  }

  async createBadgePurchase(data: {
    userId: string;
    walletAddress: string;
    transactionHash: string;
    amountSol: number;
    amountUsd: number;
  }): Promise<BadgePurchase> {
    // Check if transaction hash already exists
    const existingPurchase = await this.badgePurchaseRepository.findOne({
      where: { transactionHash: data.transactionHash }
    });

    if (existingPurchase) {
      throw new Error("Transaction hash already exists");
    }

    const badgePurchase = this.badgePurchaseRepository.create({
      userId: data.userId,
      walletAddress: data.walletAddress,
      transactionHash: data.transactionHash,
      amountSol: data.amountSol,
      amountUsd: data.amountUsd,
      status: 'pending'
    });

    return await this.badgePurchaseRepository.save(badgePurchase);
  }

  async updatePurchaseStatus(
    transactionHash: string, 
    status: BadgePurchaseStatus
  ): Promise<BadgePurchase | null> {
    const purchase = await this.badgePurchaseRepository.findOne({
      where: { transactionHash }
    });

    if (!purchase) {
      return null;
    }

    purchase.status = status;

    // If completed, update user's badge status
    if (status === 'completed') {
      const user = await this.userRepository.findOne({
        where: { id: purchase.userId }
      });

      if (user) {
        user.hasBadgeOfHonor = true;
        await this.userRepository.save(user);
      }
    }

    return await this.badgePurchaseRepository.save(purchase);
  }

  async getUserPurchases(userId: string): Promise<BadgePurchase[]> {
    return await this.badgePurchaseRepository.find({
      where: { userId },
      order: { purchaseDate: "DESC" }
    });
  }

  async getPurchaseByTransaction(transactionHash: string): Promise<BadgePurchase | null> {
    return await this.badgePurchaseRepository.findOne({
      where: { transactionHash },
      relations: ["user"]
    });
  }

  async getAllPurchases(limit: number = 50): Promise<BadgePurchase[]> {
    return await this.badgePurchaseRepository.find({
      relations: ["user"],
      order: { purchaseDate: "DESC" },
      take: limit
    });
  }
}