// Supabase client removed during migration to TypeORM
// This file is temporarily disabled during Supabase to TypeORM migration

export const supabase = {
  // Temporary mock object to prevent import errors during migration
  from: () => ({
    select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) })
  }),
  rpc: () => Promise.resolve({ data: null, error: null })
};

// Make supabase available globally for debugging
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).supabase = supabase;
}

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          discriminator: string;
          avatar: string;
          account_age: number;
          join_date: string;
          multiplier: number;
          total_earned: number;
          current_balance: number;
          is_node_active: boolean;
          node_start_time: string | null;
          tasks_completed: number;
          rank: number;
          last_login_time: string;
          daily_checkin_claimed: boolean;
          weekly_earnings: number;
          monthly_earnings: number;
          referral_code: string | null;
          referred_by: string | null;
          referral_earnings: number;
          total_referrals: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          discriminator: string;
          avatar: string;
          account_age: number;
          join_date: string;
          multiplier: number;
          total_earned?: number;
          current_balance?: number;
          is_node_active?: boolean;
          node_start_time?: string | null;
          tasks_completed?: number;
          rank?: number;
          last_login_time?: string;
          daily_checkin_claimed?: boolean;
          weekly_earnings?: number;
          monthly_earnings?: number;
          referral_code?: string | null;
          referred_by?: string | null;
          referral_earnings?: number;
          total_referrals?: number;
        };
        Update: {
          username?: string;
          discriminator?: string;
          avatar?: string;
          account_age?: number;
          join_date?: string;
          multiplier?: number;
          total_earned?: number;
          current_balance?: number;
          is_node_active?: boolean;
          node_start_time?: string | null;
          tasks_completed?: number;
          rank?: number;
          last_login_time?: string;
          daily_checkin_claimed?: boolean;
          weekly_earnings?: number;
          monthly_earnings?: number;
          referral_code?: string | null;
          referred_by?: string | null;
          referral_earnings?: number;
          total_referrals?: number;
        };
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string;
          reward: number;
          type: 'daily' | 'weekly' | 'social' | 'achievement';
          max_progress: number;
          expires_at: string | null;
          social_url: string | null;
          is_active: boolean;
          created_at: string;
        };
      };
      user_tasks: {
        Row: {
          id: string;
          user_id: string;
          task_id: string;
          completed: boolean;
          progress: number;
          claimed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          task_id: string;
          completed?: boolean;
          progress?: number;
          claimed_at?: string | null;
        };
        Update: {
          completed?: boolean;
          progress?: number;
          claimed_at?: string | null;
        };
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          notifications: any;
          privacy: any;
          mining: any;
          display: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          notifications?: any;
          privacy?: any;
          mining?: any;
          display?: any;
        };
        Update: {
          notifications?: any;
          privacy?: any;
          mining?: any;
          display?: any;
        };
      };
      mining_sessions: {
        Row: {
          id: string;
          user_id: string;
          start_time: string;
          end_time: string | null;
          earnings: number;
          hash_rate: number;
          efficiency: number;
          created_at: string;
        };
        Insert: {
          user_id: string;
          start_time: string;
          end_time?: string | null;
          earnings?: number;
          hash_rate?: number;
          efficiency?: number;
        };
        Update: {
          end_time?: string | null;
          earnings?: number;
          hash_rate?: number;
          efficiency?: number;
        };
      };
      referrals: {
        Row: {
          id: string;
          referrer_id: string;
          referred_id: string;
          bonus_amount: number;
          created_at: string;
        };
        Insert: {
          referrer_id: string;
          referred_id: string;
          bonus_amount: number;
        };
      };
    };
  };
}