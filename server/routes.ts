import type { Express } from "express";
import { createServer, type Server } from "http";
import { UserService } from "./services/UserService";
import { TaskService } from "./services/TaskService";
import { MiningService } from "./services/MiningService";
import { SettingsService } from "./services/SettingsService";
import { BadgePurchaseService } from "./services/BadgePurchaseService";

export async function registerRoutes(app: Express): Promise<Server> {
  const userService = new UserService();
  const taskService = new TaskService();
  const miningService = new MiningService();
  const settingsService = new SettingsService();
  const badgePurchaseService = new BadgePurchaseService();

  // Seed default tasks
  await taskService.seedTasks();

  // User routes
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await userService.getUserById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/users/username/:username", async (req, res) => {
    try {
      const user = await userService.getUserByUsername(req.params.username);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const user = await userService.createUser(req.body);
      res.status(201).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const user = await userService.updateUser(req.params.id, req.body);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.log("error",error)
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.get("/api/leaderboard", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const leaderboard = await userService.getLeaderboard(limit);
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ error: "Failed to get leaderboard" });
    }
  });

  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await userService.getGlobalStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  app.post("/api/users/:id/activate-node", async (req, res) => {
    try {
      const user = await userService.activateNode(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to activate node" });
    }
  });

  app.post("/api/users/:id/deactivate-node", async (req, res) => {
    try {
      const user = await userService.deactivateNode(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to deactivate node" });
    }
  });

  // Task routes
  app.get("/api/tasks", async (req, res) => {
    try {
      const tasks = await taskService.getAllTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to get tasks" });
    }
  });

  app.get("/api/users/:userId/tasks", async (req, res) => {
    try {
      const tasks = await taskService.getTasksWithUserProgress(req.params.userId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to get user tasks" });
    }
  });

  app.post("/api/users/:userId/tasks/:taskId/complete", async (req, res) => {
    try {
      const { rewardAmount } = req.body;
      const result = await taskService.completeTask(
        req.params.userId,
        req.params.taskId,
        rewardAmount || 0
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to complete task" });
    }
  });

  // Mining routes
  app.post("/api/users/:userId/mining/start", async (req, res) => {
    try {
      const session = await miningService.createMiningSession(req.params.userId);
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to start mining session" });
    }
  });

  app.get("/api/users/:userId/mining/current", async (req, res) => {
    try {
      const session = await miningService.getCurrentSession(req.params.userId);
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to get current session" });
    }
  });

  app.put("/api/mining/:sessionId", async (req, res) => {
    try {
      const session = await miningService.updateMiningSession(
        req.params.sessionId,
        req.body
      );
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to update mining session" });
    }
  });

  app.post("/api/mining/:sessionId/end", async (req, res) => {
    try {
      const { finalEarnings } = req.body;
      await miningService.endMiningSession(req.params.sessionId, finalEarnings);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to end mining session" });
    }
  });

  app.post("/api/users/:userId/mining/:sessionId/save", async (req, res) => {
    try {
      const { earningsToAdd } = req.body;
      const result = await miningService.saveMiningProgress(
        req.params.userId,
        req.params.sessionId,
        earningsToAdd
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to save mining progress" });
    }
  });

  app.get("/api/users/:userId/mining/history", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const sessions = await miningService.getUserMiningSessions(req.params.userId, limit);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to get mining history" });
    }
  });

  // Settings routes
  app.get("/api/users/:userId/settings", async (req, res) => {
    try {
      const settings = await settingsService.getOrCreateSettings(req.params.userId);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to get user settings" });
    }
  });

  app.put("/api/users/:userId/settings", async (req, res) => {
    try {
      const settings = await settingsService.updateUserSettings(
        req.params.userId,
        req.body
      );
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user settings" });
    }
  });

  // Badge purchase routes
  app.post("/api/badge-purchases", async (req, res) => {
    try {
      const { userId, walletAddress, transactionHash, amountSol, amountUsd } = req.body;
      
      // Validate required fields
      if (!userId || !walletAddress || !transactionHash || !amountSol || !amountUsd) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const purchase = await badgePurchaseService.createBadgePurchase({
        userId,
        walletAddress,
        transactionHash,
        amountSol: parseFloat(amountSol),
        amountUsd: parseFloat(amountUsd)
      });

      res.status(201).json(purchase);
    } catch (error) {
      if (error instanceof Error && error.message === "Transaction hash already exists") {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to create badge purchase" });
    }
  });

  app.put("/api/badge-purchases/:transactionHash/status", async (req, res) => {
    try {
      const { status } = req.body;
      
      if (!['pending', 'completed', 'failed'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const purchase = await badgePurchaseService.updatePurchaseStatus(
        req.params.transactionHash,
        status
      );

      if (!purchase) {
        return res.status(404).json({ error: "Purchase not found" });
      }

      res.json(purchase);
    } catch (error) {
      res.status(500).json({ error: "Failed to update purchase status" });
    }
  });

  app.get("/api/users/:userId/badge-purchases", async (req, res) => {
    try {
      const purchases = await badgePurchaseService.getUserPurchases(req.params.userId);
      res.json(purchases);
    } catch (error) {
      res.status(500).json({ error: "Failed to get user purchases" });
    }
  });

  app.get("/api/badge-purchases/:transactionHash", async (req, res) => {
    try {
      const purchase = await badgePurchaseService.getPurchaseByTransaction(
        req.params.transactionHash
      );
      
      if (!purchase) {
        return res.status(404).json({ error: "Purchase not found" });
      }

      res.json(purchase);
    } catch (error) {
      res.status(500).json({ error: "Failed to get purchase" });
    }
  });

  app.get("/api/badge-purchases", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const purchases = await badgePurchaseService.getAllPurchases(limit);
      res.json(purchases);
    } catch (error) {
      res.status(500).json({ error: "Failed to get purchases" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
