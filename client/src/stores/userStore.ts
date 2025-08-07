import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserData } from "../types";

interface UserStore {
  user: UserData | null;
  loading: boolean;
  setUser: (user: UserData | null) => void;
  setLoading: (loading: boolean) => void;
  updateUser: (userData: Partial<UserData>) => void;
  logout: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      user: null,
      loading: true,
      setUser: (user) => set({ user }),
      setLoading: (loading) => set({ loading }),
      updateUser: (userData) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...userData } });
        }
      },
      logout: () => set({ user: null }),
    }),
    {
      name: "cordnode-user-storage",
      partialize: (state) => ({ user: state.user }),
    }
  )
);