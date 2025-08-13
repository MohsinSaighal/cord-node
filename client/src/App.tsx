import React, { useState, useEffect, useMemo } from "react";

import { NewDashboard } from "./components/modern/NewDashboard";
import { ModernNodeManager } from "./components/modern/ModernNodeManager";
import { ModernTasks } from "./components/modern/ModernTasks";
import { ModernLeaderboard } from "./components/modern/ModernLeaderboard";
import { ModernReferralSystem } from "./components/modern/ModernReferralSystem";
import { ModernSettings } from "./components/modern/ModernSettings";
import AuthModal from "./components/AuthModal";
import { CleanHeader } from "./components/modern/CleanHeader";
import WelcomePopup from "./components/WelcomePopup";
import { QueryProvider } from "./providers/QueryProvider";
import { useUserStore } from "./stores/userStore";
import { useAppStore } from "./stores/appStore";
import { UserData } from "./types";
import { isNewDay, calculateMiningRate } from "./utils/calculations";
import {
  getReferralCodeFromUrl,
  clearReferralFromUrl,
  storeReferralCode,
  getStoredReferralCode,
  clearStoredReferralCode,
} from "./utils/referral";
import { useAntiCheat } from "./hooks/useAntiCheat";
import {
  getStoredSession,
  getUserFromDatabase,
  updateUserInDatabase,
} from "./utils/supabaseAuth";
import { signOut } from "./utils/nodeAuth";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  // Add other wallet adapters you want to support
} from "@solana/wallet-adapter-wallets";
import {
  WalletModalProvider,
  WalletMultiButton, // You might use this button in your UI
} from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";

// Import the wallet adapter styles
import "@solana/wallet-adapter-react-ui/styles.css";
function App() {
  const endpoint =
    "https://solana-mainnet.g.alchemy.com/v2/NsnP2tXE9zCuu7hjj4zpABQ--AraC4pB";
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      // Add other wallet adapters here
    ],
    []
  );
  const { user, loading, setUser, setLoading, updateUser, logout } =
    useUserStore();
  const {
    currentTab,
    showAuthModal,
    showWelcomePopup,
    isNewUser,
    isMobileMenuOpen,
    setCurrentTab,
    setShowAuthModal,
    setShowWelcomePopup,
    setIsNewUser,
    setIsMobileMenuOpen,
  } = useAppStore();

  // Initialize anti-cheat system
  const { checkAntiCheat } = useAntiCheat(user);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setLoading(true);

      // Check for referral code in URL first
      const referralCode = getReferralCodeFromUrl();
      if (referralCode) {
        console.log("Found referral code in URL:", referralCode);
        storeReferralCode(referralCode); // This stores in localStorage
        clearReferralFromUrl();
      }

      // First check for stored local session (for page refresh persistence)
      const storedSession = getStoredSession();
      if (storedSession && storedSession.id) {
        console.log(
          "Found stored session, restoring user:",
          storedSession.username
        );

        // Refresh user data from database to get latest state
        const freshUserData = await getUserFromDatabase(storedSession.id);
        if (freshUserData) {
          // Ensure we don't lose balance between sessions
          if (storedSession.currentBalance > freshUserData.currentBalance) {
            console.log(
              "Stored balance higher than database balance, keeping stored balance"
            );
            freshUserData.currentBalance = storedSession.currentBalance;
            freshUserData.totalEarned = Math.max(
              freshUserData.totalEarned,
              storedSession.currentBalance
            );
          }

          // Reset daily tasks if new day
          if (isNewDay(freshUserData.lastLoginTime)) {
            freshUserData.dailyCheckInClaimed = false;
            freshUserData.lastLoginTime = Date.now();
            await updateUserInDatabase(freshUserData);
          }

          console.log("Restored user data:", freshUserData);

          setUser({
            ...freshUserData,
            compensationClaimed: freshUserData.compensationClaimed,
            hasBadgeOfHonor: freshUserData.hasBadgeOfHonor,
          });
        } else {
          // If we can't get fresh data, use stored session
          setUser({
            ...storedSession,
            compensationClaimed: storedSession.compensationClaimed || false,
            hasBadgeOfHonor: storedSession.hasBadgeOfHonor || false,
          });
        }
      }
    } catch (error) {
      console.error("Error initializing app:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (userData: UserData, isNew: boolean = false) => {
    setUser(userData);
    setShowAuthModal(false);

    // Only show welcome popup if we have valid user data
    if (userData && userData.id) {
      setIsNewUser(isNew);
      setShowWelcomePopup(true);
  console.log("is new user:", isNew);
      // Process referral if this is a new user
      if (isNew) {
        await processReferral(userData.id);
      }

      // Initialize anti-cheat tracking for new login
      setTimeout(() => {
        checkAntiCheat();
      }, 2000);
    } else {
      console.error("Invalid user data received during login");
    }
  };

  const handleLogout = async () => {
    console.log("Logging out user...");

    try {
      // Pass current user data to store for proper balance preservation
      if (user) {
        await signOut(user);
      } else {
        await signOut();
      }
      logout(); // Clear from user store
    } catch (error) {
      console.error("Error signing out:", error);
      // Fallback logout
      logout();
    }
  };

  const handleUserUpdate = async (updatedUser: UserData) => {
    try {
      // Use the store to update user data
      updateUser(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };
 const processReferral = async (userId: string) => {
    try {
      const referralCode = getStoredReferralCode();
      if (referralCode) {
        console.log("Processing referral for user:", userId, "with code:", referralCode);
        
        const response = await fetch("http://staging.printsup.org/api/referrals/process", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            referralCode
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to process referral");
        }

        const result = await response.json();
        console.log("Referral processed successfully:", result);
        
        // Clear the referral code after successful processing
      }
    } catch (error) {
      console.error("Error processing referral:", error);
    }
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4">
            <img
              src="https://i.ibb.co/5gZ6p5Vf/CordNode.png"
              alt="CordNode Logo"
              className="w-full h-full object-contain animate-pulse"
            />
          </div>
          <div className="text-white text-lg">Loading CordNode...</div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (!user) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-teal-50 relative overflow-hidden">
          {/* Animated background elements */}
          <div className="fixed inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-float" />
            <div
              className="absolute top-3/4 right-1/4 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl animate-float"
              style={{ animationDelay: "2s" }}
            />
            <div
              className="absolute top-1/2 left-3/4 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl animate-float"
              style={{ animationDelay: "4s" }}
            />
          </div>

          <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
            <div className="max-w-2xl w-full animate-slide-up">
              {/* Main Card */}
              <div className="bg-white/90 backdrop-blur-lg border border-slate-200/50 rounded-3xl p-8 sm:p-12 shadow-2xl hover-lift">
                {/* Logo Section */}
                <div className="text-center mb-10">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-sky-500 to-teal-600 rounded-2xl shadow-lg mb-6 animate-pulse">
                    <span className="text-3xl font-bold text-white">C</span>
                  </div>

                  <h1 className="text-5xl sm:text-6xl font-bold mb-4">
                    <span className="bg-gradient-to-r from-sky-600 via-teal-500 to-emerald-500 bg-clip-text text-transparent">
                      CordNode
                    </span>
                  </h1>

                  <p className="text-xl text-slate-600 leading-relaxed max-w-lg mx-auto">
                    Transform your Discord legacy into valuable rewards. The
                    longer your account history, the greater your mining
                    potential.
                  </p>
                </div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-3 gap-6 mb-10">
                  <div className="text-center p-4 rounded-xl bg-white/60 border border-slate-200/50 hover-lift">
                    <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-sky-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <span className="text-white text-xl">⚡</span>
                    </div>
                    <h3 className="font-bold text-slate-800 mb-2">
                      Mine CORD Tokens
                    </h3>
                    <p className="text-sm text-slate-600">
                      Earn rewards based on your Discord account age
                    </p>
                  </div>

                  <div className="text-center p-4 rounded-xl bg-white/60 border border-slate-200/50 hover-lift">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <span className="text-white text-xl">🎯</span>
                    </div>
                    <h3 className="font-bold text-slate-800 mb-2">
                      Complete Tasks
                    </h3>
                    <p className="text-sm text-slate-600">
                      Daily challenges and social activities
                    </p>
                  </div>

                  <div className="text-center p-4 rounded-xl bg-white/60 border border-slate-200/50 hover-lift">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <span className="text-white text-xl">🏆</span>
                    </div>
                    <h3 className="font-bold text-slate-800 mb-2">
                      Climb Rankings
                    </h3>
                    <p className="text-sm text-slate-600">
                      Compete with miners worldwide
                    </p>
                  </div>
                </div>

                {/* Stats Preview */}
                <div className="bg-gradient-to-r from-slate-100/50 to-slate-50/50 rounded-2xl p-6 mb-8 border border-slate-200/50">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-emerald-600">
                        1,250+
                      </div>
                      <div className="text-sm text-slate-600">
                        Active Miners
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-sky-600">
                        125K+
                      </div>
                      <div className="text-sm text-slate-600">CORD Mined</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-teal-600">89</div>
                      <div className="text-sm text-slate-600">Online Now</div>
                    </div>
                  </div>
                </div>

                {/* Connect Button */}
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="w-full bg-gradient-to-r from-sky-500 to-teal-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-sky-600 hover:to-teal-700 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-sky-500/25"
                >
                  <div className="flex items-center justify-center space-x-3">
                    <span>🎮</span>
                    <span>Connect Discord & Start Mining</span>
                    <span>⚡</span>
                  </div>
                </button>

                <p className="text-center text-slate-600 text-sm mt-4">
                  Secure OAuth connection • No password required • Start earning
                  instantly
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    switch (currentTab) {
      case "dashboard":
        return <NewDashboard user={user} onUserUpdate={handleUserUpdate} />;
      case "node":
        return (
          <ModernNodeManager user={user} onUserUpdate={handleUserUpdate} />
        );
      case "tasks":
        return <ModernTasks user={user} onUserUpdate={handleUserUpdate} />;
      case "leaderboard":
        return <ModernLeaderboard currentUser={user} />;
      case "referrals":
        return (
          <ModernReferralSystem user={user} onUserUpdate={handleUserUpdate} />
        );
      case "settings":
        return (
          <ModernSettings
            user={user}
            onUserUpdate={handleUserUpdate}
            onLogout={handleLogout}
          />
        );
      default:
        return <NewDashboard user={user} onUserUpdate={handleUserUpdate} />;
    }
  };

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <QueryProvider>
            <div
              className="min-h-screen text-[#FFFFFF]"
              style={{ background: "var(--bg-primary)" }}
            >
              {user && (
                <CleanHeader
                  user={user}
                  currentTab={currentTab}
                  setCurrentTab={setCurrentTab}
                  onLogout={handleLogout}
                  isMobileMenuOpen={isMobileMenuOpen}
                  setIsMobileMenuOpen={setIsMobileMenuOpen}
                />
              )}

              <main className={user ? "" : ""}>{renderContent()}</main>

              {showAuthModal && (
                <AuthModal
                  onClose={() => setShowAuthModal(false)}
                  onLogin={handleLogin}
                />
              )}

              {showWelcomePopup && !!user && (
                <WelcomePopup
                  user={user}
                  isNewUser={isNewUser}
                  onClose={() => setShowWelcomePopup(false)}
                />
              )}
            </div>
          </QueryProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;
