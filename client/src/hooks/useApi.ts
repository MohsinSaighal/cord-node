import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserData, LeaderboardEntry, Task } from "../types";

const API_BASE = "https://staging.printsup.org/api"; // Update to your API base URL

// API functions
export const apiClient = {
  async getUser(id: string): Promise<UserData> {
    const response = await fetch(`${API_BASE}/users/${id}`);
    if (!response.ok) throw new Error("Failed to fetch user");
    return response.json();
  },

  async getUserByUsername(username: string): Promise<UserData> {
    const response = await fetch(`${API_BASE}/users/username/${username}`);
    if (!response.ok) throw new Error("Failed to fetch user");
    return response.json();
  },

  async createUser(userData: Partial<UserData>): Promise<UserData> {
    const response = await fetch(`${API_BASE}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    if (!response.ok) throw new Error("Failed to create user");
    return response.json();
  },

  async updateUser(id: string, userData: Partial<UserData>): Promise<UserData> {
    const response = await fetch(`${API_BASE}/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    if (!response.ok) throw new Error("Failed to update user");
    return response.json();
  },

  async getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
    const response = await fetch(`${API_BASE}/leaderboard?limit=${limit}`);
    if (!response.ok) throw new Error("Failed to fetch leaderboard");
    return response.json();
  },

  async getGlobalStats(): Promise<{
    totalMiners: number;
    activeMiners: number;
    totalEarned: number;
  }> {
    const response = await fetch(`${API_BASE}/stats`);
    if (!response.ok) throw new Error("Failed to fetch stats");
    return response.json();
  },

  async activateNode(userId: string): Promise<UserData> {
    const response = await fetch(`${API_BASE}/users/${userId}/activate-node`, {
      method: "POST",
    });
    if (!response.ok) throw new Error("Failed to activate node");
    return response.json();
  },

  async deactivateNode(userId: string): Promise<UserData> {
    const response = await fetch(`${API_BASE}/users/${userId}/deactivate-node`, {
      method: "POST",
    });
    if (!response.ok) throw new Error("Failed to deactivate node");
    return response.json();
  },

  // Task APIs
  async getAllTasks(): Promise<Task[]> {
    const response = await fetch(`${API_BASE}/tasks`);
    if (!response.ok) throw new Error("Failed to fetch tasks");
    return response.json();
  },

  async getUserTasks(userId: string): Promise<any[]> {
    const response = await fetch(`${API_BASE}/users/${userId}/tasks`);
    if (!response.ok) throw new Error("Failed to fetch user tasks");
    return response.json();
  },

  async completeTask(userId: string, taskId: string, rewardAmount: number): Promise<any> {
    const response = await fetch(`${API_BASE}/users/${userId}/tasks/${taskId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rewardAmount }),
    });
    if (!response.ok) throw new Error("Failed to complete task");
    return response.json();
  },

  // Mining APIs
  async startMining(userId: string): Promise<any> {
    const response = await fetch(`${API_BASE}/users/${userId}/mining/start`, {
      method: "POST",
    });
    if (!response.ok) throw new Error("Failed to start mining");
    return response.json();
  },

  async getCurrentMiningSession(userId: string): Promise<any> {
    const response = await fetch(`${API_BASE}/users/${userId}/mining/current`);
    if (!response.ok) throw new Error("Failed to get current session");
    return response.json();
  },

  async updateMiningSession(sessionId: string, updates: any): Promise<any> {
    const response = await fetch(`${API_BASE}/mining/${sessionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error("Failed to update mining session");
    return response.json();
  },

  async endMiningSession(sessionId: string, finalEarnings: number): Promise<any> {
    const response = await fetch(`${API_BASE}/mining/${sessionId}/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ finalEarnings }),
    });
    if (!response.ok) throw new Error("Failed to end mining session");
    return response.json();
  },

  async saveMiningProgress(userId: string, sessionId: string, earningsToAdd: number): Promise<any> {
    const response = await fetch(`${API_BASE}/users/${userId}/mining/${sessionId}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ earningsToAdd }),
    });
    if (!response.ok) throw new Error("Failed to save mining progress");
    return response.json();
  },

  async getMiningHistory(userId: string, limit: number = 10): Promise<any[]> {
    const response = await fetch(`${API_BASE}/users/${userId}/mining/history?limit=${limit}`);
    if (!response.ok) throw new Error("Failed to get mining history");
    return response.json();
  },

  // Settings APIs
  async getUserSettings(userId: string): Promise<any> {
    const response = await fetch(`${API_BASE}/users/${userId}/settings`);
    if (!response.ok) throw new Error("Failed to get user settings");
    return response.json();
  },

  async updateUserSettings(userId: string, settings: any): Promise<any> {
    const response = await fetch(`${API_BASE}/users/${userId}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (!response.ok) throw new Error("Failed to update user settings");
    return response.json();
  },
};

// Custom hooks
export function useUser(id: string | null) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: () => apiClient.getUser(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useLeaderboard(limit: number = 10) {
  return useQuery({
    queryKey: ["leaderboard", limit],
    queryFn: () => apiClient.getLeaderboard(limit),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useGlobalStats() {
  return useQuery({
    queryKey: ["globalStats"],
    queryFn: apiClient.getGlobalStats,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, userData }: { id: string; userData: Partial<UserData> }) =>
      apiClient.updateUser(id, userData),
    onSuccess: (data) => {
      queryClient.setQueryData(["user", data.id], data);
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["globalStats"] });
    },
  });
}

export function useActivateNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => apiClient.activateNode(userId),
    onSuccess: (data) => {
      queryClient.setQueryData(["user", data.id], data);
      queryClient.invalidateQueries({ queryKey: ["globalStats"] });
    },
  });
}

export function useDeactivateNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => apiClient.deactivateNode(userId),
    onSuccess: (data) => {
      queryClient.setQueryData(["user", data.id], data);
      queryClient.invalidateQueries({ queryKey: ["globalStats"] });
    },
  });
}

// Task hooks
export function useTasks(userId: string | null) {
  return useQuery({
    queryKey: ["tasks", userId],
    queryFn: () => apiClient.getUserTasks(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, taskId, rewardAmount }: { userId: string; taskId: string; rewardAmount: number }) =>
      apiClient.completeTask(userId, taskId, rewardAmount),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["user", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}

// Mining hooks
export function useStartMining() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => apiClient.startMining(userId),
    onSuccess: (data, userId) => {
      queryClient.invalidateQueries({ queryKey: ["mining", userId] });
      queryClient.invalidateQueries({ queryKey: ["user", userId] });
    },
  });
}

export function useCurrentMiningSession(userId: string | null) {
  return useQuery({
    queryKey: ["mining", userId],
    queryFn: () => apiClient.getCurrentMiningSession(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 10 * 1000, // Refetch every 10 seconds
  });
}

export function useSaveMiningProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, sessionId, earningsToAdd }: { userId: string; sessionId: string; earningsToAdd: number }) =>
      apiClient.saveMiningProgress(userId, sessionId, earningsToAdd),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user", variables.userId] });
    },
  });
}

// Settings hooks
export function useUserSettings(userId: string | null) {
  return useQuery({
    queryKey: ["settings", userId],
    queryFn: () => apiClient.getUserSettings(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateUserSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, settings }: { userId: string; settings: any }) =>
      apiClient.updateUserSettings(userId, settings),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(["settings", variables.userId], data);
    },
  });
}
