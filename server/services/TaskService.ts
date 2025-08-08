import { AppDataSource } from "../data-source";
import { Task } from "../entities/Task";
import { UserTask } from "../entities/UserTask";
import { User } from "../entities/User";
import { Repository } from "typeorm";

export class TaskService {
  private taskRepository: Repository<Task>;
  private userTaskRepository: Repository<UserTask>;
  private userRepository: Repository<User>;

  constructor() {
    this.taskRepository = AppDataSource.getRepository(Task);
    this.userTaskRepository = AppDataSource.getRepository(UserTask);
    this.userRepository = AppDataSource.getRepository(User);
  }

  async getAllTasks(): Promise<Task[]> {
    return await this.taskRepository.find({
      order: { type: "ASC", id: "ASC" },
    });
  }

  async getUserTasks(userId: string): Promise<UserTask[]> {
    return await this.userTaskRepository.find({
      where: { userId },
      order: { createdAt: "ASC" },
    });
  }

  async getTasksWithUserProgress(userId: string): Promise<any[]> {
    // Get all active tasks
    const tasks = await this.getAllTasks();
    
    // Get user's task progress
    const userTasks = await this.getUserTasks(userId);
    const userTasksMap = new Map();
    userTasks.forEach(ut => {
      userTasksMap.set(ut.taskId, ut);
    });

    // Combine tasks with user progress
    return tasks.map(task => {
      const userTask = userTasksMap.get(task.id);
      return {
        id: task.id,
        title: task.title,
        description: task.description,
        reward: task.reward,
        type: task.type,
        completed: userTask?.completed || false,
        progress: userTask?.progress || 0,
        maxProgress: task.maxProgress,
        socialUrl: task.socialUrl,
        expiresAt: task.expiresAt,
        claimedAt: userTask?.claimedAt,
      };
    });
  }

  async completeTask(userId: string, taskId: string, rewardAmount: number): Promise<{
    success: boolean;
    error?: string;
    newBalance?: number;
    reward?: number;
  }> {
    try {
      // Check if task already completed
      const existingUserTask = await this.userTaskRepository.findOne({
        where: { userId, taskId },
      });

      if (existingUserTask?.completed) {
        return {
          success: false,
          error: "Task already completed",
        };
      }

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

      // Calculate reward with multiplier
      const finalReward = rewardAmount * user.multiplier;

      // Create or update user task
      if (existingUserTask) {
        existingUserTask.completed = true;
        existingUserTask.claimedAt = new Date();
        existingUserTask.reward = finalReward;
        await this.userTaskRepository.save(existingUserTask);
      } else {
        const newUserTask = this.userTaskRepository.create({
          userId,
          taskId,
          completed: true,
          claimedAt: new Date(),
          reward: finalReward,
        });
        await this.userTaskRepository.save(newUserTask);
      }

      // Update user balance
      user.currentBalance += finalReward;
      user.totalEarned += finalReward;
      user.tasksCompleted += 1;
      

      
      await this.userRepository.save(user);

      return {
        success: true,
        newBalance: user.currentBalance,
        reward: finalReward,
      };
    } catch (error) {
      console.error("Error completing task:", error);
      return {
        success: false,
        error: "Database error occurred",
      };
    }
  }

  // Static task definitions (you can later move these to database if needed)
  async seedTasks(): Promise<void> {
    const existingTasks = await this.taskRepository.count();
    if (existingTasks > 0) return; // Already seeded

    const defaultTasks = [
      {
        id: "daily-checkin",
        title: "Daily Check-in",
        description: "Claim your daily login bonus",
        reward: 50,
        type: "daily" as const,
        maxProgress: 1,
      },
      {
        id: "mine-1-hour",
        title: "Mine for 1 Hour",
        description: "Keep your mining node active for 1 hour",
        reward: 100,
        type: "daily" as const,
        maxProgress: 3600, // seconds
      },
      {
        id: "weekly-mining",
        title: "Weekly Mining Goal",
        description: "Earn 1000 CORD this week",
        reward: 200,
        type: "weekly" as const,
        maxProgress: 1000,
      },
      {
        id: "invite-friends",
        title: "Invite 3 Friends",
        description: "Refer 3 friends to CordNode",
        reward: 500,
        type: "achievement" as const,
        maxProgress: 3,
      },
      {
        id: "early-adopter",
        title: "Early Adopter",
        description: "Account older than 5 years",
        reward: 1000,
        type: "achievement" as const,
        maxProgress: 1,
      },
      {
        id: "follow-twitter",
        title: "Follow on Twitter",
        description: "Follow @CordNode on Twitter",
        reward: 100,
        type: "social" as const,
        maxProgress: 1,
        socialUrl: "https://twitter.com/cordnode",
      },
      {
        id: "join-discord",
        title: "Join Discord",
        description: "Join our Discord community",
        reward: 100,
        type: "social" as const,
        maxProgress: 1,
        socialUrl: "https://discord.gg/cordnode",
      },
      {
        id: "social-media-master",
        title: "Social Media Master",
        description: "Complete all social media tasks",
        reward: 300,
        type: "achievement" as const,
        maxProgress: 2, // number of social tasks
      },
    ];

    for (const taskData of defaultTasks) {
      const task = this.taskRepository.create(taskData);
      await this.taskRepository.save(task);
    }

    console.log("Default tasks seeded successfully");
  }
}