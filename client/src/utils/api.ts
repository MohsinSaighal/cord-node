const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth endpoints
  async discordCallback(code: string, referralCode?: string) {
    return this.request('/auth/discord/callback', {
      method: 'POST',
      body: JSON.stringify({ code, referralCode }),
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async logout() {
    const result = await this.request('/auth/logout', { method: 'POST' });
    this.clearToken();
    return result;
  }

  // User endpoints
  async updateUserProfile(updates: any) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async getUserStats() {
    return this.request('/users/stats');
  }

  // Task endpoints
  async getTasks() {
    return this.request('/tasks');
  }

  async completeTask(taskId: string) {
    return this.request(`/tasks/${taskId}/complete`, {
      method: 'POST',
    });
  }

  // Mining endpoints
  async startMining() {
    return this.request('/mining/start', {
      method: 'POST',
    });
  }

  async stopMining() {
    return this.request('/mining/stop', {
      method: 'POST',
    });
  }

  async updateMiningProgress(earnings: number, hashRate?: number, efficiency?: number) {
    return this.request('/mining/update', {
      method: 'POST',
      body: JSON.stringify({ earnings, hashRate, efficiency }),
    });
  }

  async getMiningStats() {
    return this.request('/mining/stats');
  }

  // Referral endpoints
  async getReferralStats() {
    return this.request('/referrals/stats');
  }

  async getReferralHistory() {
    return this.request('/referrals/history');
  }

  async getReferralEarnings(period = 'all') {
    return this.request(`/referrals/earnings?period=${period}`);
  }

  // Leaderboard endpoints
  async getLeaderboard(period = 'all-time', limit = 100) {
    return this.request(`/leaderboard?period=${period}&limit=${limit}`);
  }

  async getLeaderboardStats() {
    return this.request('/leaderboard/stats');
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;