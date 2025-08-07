import React, { useState, useEffect, useMemo } from "react";
import Header from "./components/Header";
import Dashboard from "./components/Dashboard";
import NodeManager from "./components/NodeManager";
import Tasks from "./components/Tasks";
import Leaderboard from "./components/Leaderboard";
import ReferralSystem from "./components/ReferralSystem";
import Settings from "./components/Settings";
import AuthModal from "./components/AuthModal";
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
} from "./utils/referral";
import { useAntiCheat } from "./hooks/useAntiCheat";

function App() {
  const { user, loading, setUser, setLoading, updateUser, logout } = useUserStore();
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

  // You can also provide a custom RPC endpoint
  const endpoint = "https://solana-mainnet.g.alchemy.com/v2/NsnP2tXE9zCuu7hjj4zpABQ--AraC4pB";

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      // Add other wallet adapters here
    ],
  []);

  const initializeApp = async () => {
    try {
      // Check for referral code in URL first
      const referralCode = getReferralCodeFromUrl();
      if (referralCode) {
        console.log("Found referral code in URL:", referralCode);
        storeReferralCode(referralCode);
        clearReferralFromUrl();
      }

      // First check for stored local session (for page refresh persistence)
      const storedSession = getStoredSession();
      if (storedSession) {
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

          console.log("ss", freshUserData);

          setUser({
            ...freshUserData,
            compensationClaimed: freshUserData.compensationClaimed,
            hasBadgeOfHonor: freshUserData.hasBadgeOfHonor,
          });
        } else {
          // If we can't get fresh data, use stored session
          setUser({
            ...storedSession,
            compensationClaimed: storedSession.compensationClaimed,
            hasBadgeOfHonor: storedSession.hasBadgeOfHonor,
          });
        }
      } else {
        // Check for Supabase session (OAuth callback)
        if (storedSession && storedSession.id) {
          if (session?.user?.user_metadata?.discord_id) {
            // Get user data from database
            const userData = await getUserFromDatabase(
              session.user.user_metadata.discord_id
            );
            if (userData) {
              // Reset daily tasks if new day
              if (isNewDay(userData.lastLoginTime)) {
                userData.dailyCheckInClaimed = false;
                userData.lastLoginTime = Date.now();
                await updateUserInDatabase(userData);
              }

              setUser(userData);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error initializing app:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData: UserData, isNew: boolean = false) => {
    setUser(userData);
    setShowAuthModal(false);

    // Only show welcome popup if we have valid user data
    if (userData && userData.id) {
      setIsNewUser(isNew);
      setShowWelcomePopup(true);

      // Initialize anti-cheat tracking for new login
      setTimeout(() => {
        checkAntiCheat();
      }, 2000);
    } else {
      console.error("Invalid user data received during login");
    }
  };

  const handleLogout = async () => {
    try {
      logout();
    } catch (error) {
      console.error("Error signing out:", error);
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
        <div className="min-h-screen bg-black flex items-center justify-center px-4">
          <div className="text-center max-w-md mx-auto">
            <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-6 sm:mb-8">
              <img
                src="https://i.ibb.co/5gZ6p5Vf/CordNode.png"
                alt="CordNode Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent mb-4">
              Welcome to CordNode
            </h1>
            <p className="text-gray-300 text-base sm:text-lg mb-6 sm:mb-8">
              Earn rewards based on your Discord account age. The longer you've
              been on Discord, the more you earn!
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white px-6 sm:px-8 py-3 rounded-lg font-semibold hover:from-cyan-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 text-sm sm:text-base"
            >
              Connect Discord
            </button>
          </div>
        </div>
      );
    }

    switch (currentTab) {
      case "dashboard":
        return <Dashboard user={user} onUserUpdate={handleUserUpdate} />;
      case "node":
        return <NodeManager user={user} onUserUpdate={handleUserUpdate} />;
      case "tasks":
        return <Tasks user={user} onUserUpdate={handleUserUpdate} />;
      case "leaderboard":
        return <Leaderboard currentUser={user} />;
      case "referrals":
        return <ReferralSystem user={user} onUserUpdate={handleUserUpdate} />;
      case "settings":
        return (
          <Settings
            user={user}
            onUserUpdate={handleUserUpdate}
            onLogout={handleLogout}
          />
        );
      default:
        return <Dashboard user={user} onUserUpdate={handleUserUpdate} />;
    }
  };

  return (
    <QueryProvider>
      <div className="min-h-screen bg-black text-white">
            {user && (
              <Header
                user={user}
                currentTab={currentTab}
                setCurrentTab={setCurrentTab}
                onLogout={handleLogout}
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
              />
            )}

            <main className={user ? "pt-14 sm:pt-20" : ""}>
              {renderContent()}
            </main>

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
  );
}

export default App;
