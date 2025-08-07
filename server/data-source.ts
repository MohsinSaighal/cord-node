import "reflect-metadata";
import { DataSource } from "typeorm";
import {
  User,
  Task,
  Epoch,
  UserEpochStats,
  ReferralData,
  NodeStats,
} from "./entities";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: process.env.NODE_ENV === "development", // Auto-sync in development
  logging: process.env.NODE_ENV === "development",
  entities: [User, Task, Epoch, UserEpochStats, ReferralData, NodeStats],
  migrations: ["server/migrations/*.ts"],
  subscribers: ["server/subscribers/*.ts"],
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export async function initializeDatabase() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    console.log("Database connection established successfully");
  }
  return AppDataSource;
}