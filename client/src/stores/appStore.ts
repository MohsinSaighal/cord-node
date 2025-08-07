import { create } from "zustand";

interface AppStore {
  currentTab: string;
  showAuthModal: boolean;
  showWelcomePopup: boolean;
  isNewUser: boolean;
  isMobileMenuOpen: boolean;
  setCurrentTab: (tab: string) => void;
  setShowAuthModal: (show: boolean) => void;
  setShowWelcomePopup: (show: boolean) => void;
  setIsNewUser: (isNew: boolean) => void;
  setIsMobileMenuOpen: (open: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  currentTab: "dashboard",
  showAuthModal: false,
  showWelcomePopup: false,
  isNewUser: false,
  isMobileMenuOpen: false,
  setCurrentTab: (tab) => set({ currentTab: tab }),
  setShowAuthModal: (show) => set({ showAuthModal: show }),
  setShowWelcomePopup: (show) => set({ showWelcomePopup: show }),
  setIsNewUser: (isNew) => set({ isNewUser: isNew }),
  setIsMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
}));