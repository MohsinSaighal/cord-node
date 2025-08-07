import { UserData } from "../types";
import { apiClient } from "../hooks/useApi";

// Replace Supabase auth with our TypeORM API-based authentication
export class AuthService {
  private static readonly STORAGE_KEY = "cordnode-session";

  static getStoredSession(): UserData | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  static storeSession(user: UserData): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
  }

  static clearSession(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  static async createUser(userData: {
    username: string;
    discriminator: string;
    avatar?: string;
    accountAge: number;
    joinDate: Date;
    referredBy?: string;
  }): Promise<UserData> {
    const user = await apiClient.createUser(userData);
    this.storeSession(user);
    return user;
  }

  static async getUserFromDatabase(id: string): Promise<UserData | null> {
    try {
      const user = await apiClient.getUser(id);
      if (user) {
        this.storeSession(user);
      }
      return user;
    } catch {
      return null;
    }
  }

  static async updateUserInDatabase(userData: UserData): Promise<UserData> {
    const updated = await apiClient.updateUser(userData.id, userData);
    this.storeSession(updated);
    return updated;
  }

  static signOut(): void {
    this.clearSession();
  }

  // Mock Discord OAuth for now - replace with actual OAuth implementation
  static async signInWithDiscord(): Promise<UserData> {
    // This would normally handle Discord OAuth
    // For now, return a mock response or implement your Discord OAuth flow
    throw new Error("Discord OAuth not implemented - replace with actual OAuth flow");
  }
}