import React, { useState, useEffect, useMemo } from "react";
import Header from "./components/Header";
import { ModernApp } from "./components/modern/ModernApp";
import { ModernNodeManager } from "./components/modern/ModernNodeManager";
import { ModernTasks } from "./components/modern/ModernTasks";
import { ModernLeaderboard } from "./components/modern/ModernLeaderboard";
import { ModernReferralSystem } from "./components/modern/ModernReferralSystem";
import { ModernSettings } from "./components/modern/ModernSettings";
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
import { getStoredSession, getUserFromDatabase, updateUserInDatabase } from "./utils/supabaseAuth";
// Solana wallet adapters temporarily removed during migration
function App() {
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
        storeReferralCode(referralCode);
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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
          {/* Animated background elements */}
          <div className="fixed inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-float" />
            <div className="absolute top-3/4 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
            <div className="absolute top-1/2 left-3/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }} />
          </div>

          <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
            <div className="max-w-2xl w-full animate-slide-up">
              {/* Main Card */}
              <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-lg border border-slate-700/50 rounded-3xl p-8 sm:p-12 shadow-2xl hover-lift">
                
                {/* Logo Section */}
                <div className="text-center mb-10">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg mb-6 animate-pulse">
                    <span className="text-3xl font-bold text-white">C</span>
                  </div>
                  
                  <h1 className="text-5xl sm:text-6xl font-bold text-white mb-4">
                    <span className="bg-gradient-to-r from-green-400 via-emerald-500 to-blue-500 bg-clip-text text-transparent">
                      CordNode
                    </span>
                  </h1>
                  
                  <p className="text-xl text-slate-300 leading-relaxed max-w-lg mx-auto">
                    Transform your Discord legacy into valuable rewards. The longer your account history, the greater your mining potential.
                  </p>
                </div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-3 gap-6 mb-10">
                  <div className="text-center p-4 rounded-xl bg-slate-800/50 border border-slate-700/30 hover-lift">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <span className="text-white text-xl">⚡</span>
                    </div>
                    <h3 className="font-bold text-white mb-2">Mine CORD Tokens</h3>
                    <p className="text-sm text-slate-400">Earn rewards based on your Discord account age</p>
                  </div>
                  
                  <div className="text-center p-4 rounded-xl bg-slate-800/50 border border-slate-700/30 hover-lift">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <span className="text-white text-xl">🎯</span>
                    </div>
                    <h3 className="font-bold text-white mb-2">Complete Tasks</h3>
                    <p className="text-sm text-slate-400">Daily challenges and social activities</p>
                  </div>
                  
                  <div className="text-center p-4 rounded-xl bg-slate-800/50 border border-slate-700/30 hover-lift">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <span className="text-white text-xl">🏆</span>
                    </div>
                    <h3 className="font-bold text-white mb-2">Climb Rankings</h3>
                    <p className="text-sm text-slate-400">Compete with miners worldwide</p>
                  </div>
                </div>

                {/* Stats Preview */}
                <div className="bg-gradient-to-r from-slate-800/30 to-slate-700/30 rounded-2xl p-6 mb-8 border border-slate-600/20">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-400">1,250+</div>
                      <div className="text-sm text-slate-400">Active Miners</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-400">125K+</div>
                      <div className="text-sm text-slate-400">CORD Mined</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-400">89</div>
                      <div className="text-sm text-slate-400">Online Now</div>
                    </div>
                  </div>
                </div>

                {/* Connect Button */}
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="w-full bg-gradient-to-r from-green-500 via-emerald-500 to-blue-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-green-600 hover:via-emerald-600 hover:to-blue-600 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-green-500/25"
                >
                  <div className="flex items-center justify-center space-x-3">
                    <span>🎮</span>
                    <span>Connect Discord & Start Mining</span>
                    <span>⚡</span>
                  </div>
                </button>
                
                <p className="text-center text-slate-500 text-sm mt-4">
                  Secure OAuth connection • No password required • Start earning instantly
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    switch (currentTab) {
      case "dashboard":
        return <ModernApp user={user} onUserUpdate={handleUserUpdate} />;
      case "node":
        return <ModernNodeManager user={user} onUserUpdate={handleUserUpdate} />;
      case "tasks":
        return <ModernTasks user={user} onUserUpdate={handleUserUpdate} />;
      case "leaderboard":
        return <ModernLeaderboard currentUser={user} />;
      case "referrals":
        return <ModernReferralSystem user={user} onUserUpdate={handleUserUpdate} />;
      case "settings":
        return (
          <ModernSettings
            user={user}
            onUserUpdate={handleUserUpdate}
            onLogout={handleLogout}
          />
        );
      default:
        return <ModernApp user={user} onUserUpdate={handleUserUpdate} />;
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
  );
}

export default App;
