import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserData, LeaderboardEntry } from "../types";

const API_BASE = "/api";

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