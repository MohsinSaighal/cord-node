// Legacy file - TypeORM is now used instead
// This file is kept for compatibility during migration

import "reflect-metadata";
import { AppDataSource, initializeDatabase } from "./data-source";

// Initialize database connection
export const db = initializeDatabase();
