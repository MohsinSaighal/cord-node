import React, { useState, useEffect } from "react";
import badgeImage from "../assets/Badge.gif";
import {
  Clock,
  Zap,
  Gift,
  TrendingUp,
  DollarSign,
  Activity,
  Loader,
  X,
  Users,
  Award,
} from "lucide-react";

import { UserData } from "../types";

import { isNewDay } from "../utils/calculations";
import { useAntiCheat } from "../hooks/useAntiCheat";
import { calculateMiningRate } from "../utils/calculations";
import EpochDisplay from "./EpochDisplay";
import { apiClient } from "../hooks/useApi";
// Solana and Supabase imports removed during migration
interface DashboardProps {
  user: UserData;
  onUserUpdate: (user: UserData) => void;
}

interface Notification {
  id: string;
  type: "success" | "info" | "warning";
  title: string;
  message: string;
  timestamp: number;
}

interface EarningsData {
  timestamps: number[];
  values: number[];
}

const Dashboard: React.FC<DashboardProps> = ({ user, onUserUpdate }) => {
  const { antiCheatStatus } = useAntiCheat(user);
  // Wallet functionality temporarily disabled during migration
  console.log("user", user);
  const [stats, setStats] = useState({
    dailyEarnings: 0,
    weeklyEarnings: user.weeklyEarnings,
    monthlyEarnings: user.monthlyEarnings,
    nodeUptime: 0,
    hashRate: 0,
    efficiency: 0,
  });
  const [hasVerifiedPurchase, setHasVerifiedPurchase] = useState(false);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [earningsHistory, setEarningsHistory] = useState<EarningsData>({
    timestamps: [],
    values: [],
  });
  // Wallet functionality temporarily disabled during migration

  const [currentBalance, setCurrentBalance] = useState(user.currentBalance);
  const [totalEarned, setTotalEarned] = useState(user.totalEarned);
  const [cordPerSecond, setCordPerSecond] = useState(0);
  const [sessionStartBalance, setSessionStartBalance] = useState(
    user.currentBalance || 0
  );
  const [isPaying, setIsPaying] = useState(false);
  const [solPrice, setSolPrice] = useState<number | null>(null);

  // Fetch SOL price on mount
  useEffect(() => {
    const fetchSolPrice = async () => {
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
        );
        const data = await response.json();
        setSolPrice(data.solana.usd);
      } catch (error) {
        console.error("Failed to fetch SOL price:", error);
        setSolPrice(50); // Fallback price
      }
    };

    fetchSolPrice();
  }, []);
  const verifyBadgePurchase = async () => {
    try {
      // TODO: Implement badge purchase verification with new API
      // For now, check if user has badge of honor
      setHasVerifiedPurchase(user.hasBadgeOfHonor || false);
    } catch (error) {
      console.error("Error verifying badge purchase:", error);
    }
  };
  const addNotification = (
    type: "success" | "info" | "warning",
    title: string,
    message: string
  ) => {
    const notification: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      title,
      message,
      timestamp: Date.now(),
    };

    setNotifications((prev) => [notification, ...prev.slice(0, 4)]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    }, 5000);
  };

  const handlePhantomPayment = async () => {
    try {
      setIsPaying(true);
      addNotification("info", "Payment System", "Wallet payment temporarily disabled during migration");
      
      // TODO: Implement new payment system
      // For now, just simulate the badge purchase
      const updatedUser = {
        ...user,
        currentBalance: user.currentBalance + 10000,
        totalEarned: user.totalEarned + 10000,
        tasksCompleted: user.tasksCompleted + 1,
        hasBadgeOfHonor: true,
      };
      
      // Update user via new API
      await apiClient.updateUser(user.id, updatedUser);
      setCurrentBalance(updatedUser.currentBalance);
      setTotalEarned(updatedUser.totalEarned);
      onUserUpdate(updatedUser);
      setHasVerifiedPurchase(true);

      addNotification(
        "success",
        "Badge Granted",
        "Badge of Honor granted during migration testing"
      );
    } catch (error: any) {
      console.error("Payment error:", error);
      addNotification("warning", "Error", "Failed to update user data");
    } finally {
      setIsPaying(false);
    }
  };
  useEffect(() => {
    const initializeUser = async () => {
      if (isNewDay(user.lastLoginTime)) {
        const updatedUser = {
          ...user,
          dailyCheckInClaimed: false,
          lastLoginTime: Date.now(),
        };
        onUserUpdate(updatedUser);
        // Update via new API
        try {
          await apiClient.updateUser(user.id, updatedUser);
        } catch (error) {
          console.error("Error updating user via API:", error);
        }
      }
    };

    initializeUser();
    setSessionStartBalance(user.currentBalance);

    // Add this line to verify badge purchase on load
    verifyBadgePurchase();
  }, []);
  console.log("hasVerifiedPurchase", hasVerifiedPurchase);
  useEffect(() => {
    const interval = setInterval(() => {
      if (user.isNodeActive && user.nodeStartTime) {
        const miningRate = calculateMiningRate(user, antiCheatStatus);
        const earningsPerSecond = miningRate / 60;

        setCordPerSecond(earningsPerSecond);

        setCurrentBalance((prev) => {
          const newBalance = prev + earningsPerSecond;
          const now = Date.now();
          if (now % 10000 < 1000) {
            setEarningsHistory((prevHistory) => {
              const newTimestamps = [...prevHistory.timestamps, now];
              const newValues = [...prevHistory.values, newBalance];
              if (newTimestamps.length > 20) {
                return {
                  timestamps: newTimestamps.slice(-20),
                  values: newValues.slice(-20),
                };
              }
              return {
                timestamps: newTimestamps,
                values: newValues,
              };
            });
          }
          return newBalance;
        });

        setTotalEarned((prev) => prev + earningsPerSecond);

        setStats((prev) => ({
          ...prev,
          dailyEarnings: prev.dailyEarnings + earningsPerSecond,
          weeklyEarnings: prev.weeklyEarnings + earningsPerSecond,
          monthlyEarnings: prev.monthlyEarnings + earningsPerSecond,
          nodeUptime: user.nodeStartTime
            ? Math.floor((Date.now() - user.nodeStartTime) / 1000)
            : 0,
          hashRate: 150 + Math.random() * 50,
          efficiency: 85 + Math.random() * 15,
        }));

        if (Math.floor(Date.now() / 1000) % 30 === 0) {
          const updatedUser = {
            ...user,
            currentBalance: currentBalance,
            totalEarned: totalEarned,
            weeklyEarnings: stats.weeklyEarnings,
            monthlyEarnings: stats.monthlyEarnings,
            lastSavedBalance: currentBalance,
            hasBadgeOfHonor: user.hasBadgeOfHonor,
          };
          
          const updateUserData = async () => {
            try {
              onUserUpdate(updatedUser);
              await apiClient.updateUser(user.id, updatedUser);
            } catch (error) {
              console.error("Error updating user data:", error);
            }
          };
          
          updateUserData();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [
    user.isNodeActive,
    user.nodeStartTime,
    user.multiplier,
    currentBalance,
    totalEarned,
    stats,
    antiCheatStatus,
  ]);

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const sessionEarnings = currentBalance - sessionStartBalance;

  const cards = [
    {
      title: "Current Balance",
      value: `${Math.floor(currentBalance).toLocaleString()} CORD`,
      icon: DollarSign,
      color: "from-green-400 to-green-600",
      change:
        sessionEarnings > 0
          ? `+${sessionEarnings.toFixed(2)} this session`
          : "No earnings yet",
    },
    {
      title: "CORD per Second",
      value: user.isNodeActive
        ? `${cordPerSecond.toFixed(4)} CORD/s`
        : "0.0000 CORD/s",
      icon: Zap,
      color: "from-yellow-400 to-yellow-600",
      change: user.isNodeActive
        ? antiCheatStatus && antiCheatStatus.penaltyLevel > 0
          ? `${(antiCheatStatus.efficiencyMultiplier * 100).toFixed(
            0
          )}% efficiency`
          : "Mining Active"
        : "Node Inactive",
    },
    {
      title: "Account Age",
      value: `${user.accountAge} years`,
      icon: Clock,
      color: "from-purple-400 to-purple-600",
      change: `${user.multiplier}x multiplier`,
    },
    {
      title: "Node Efficiency",
      value: `${stats.efficiency.toFixed(1)}%`,
      icon: Activity,
      color: "from-cyan-400 to-cyan-600",
      change: user.isNodeActive ? "Active" : "Inactive",
    },
  ];

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return "✅";
      case "warning":
        return "⚠️";
      default:
        return "ℹ️";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "success":
        return "border-green-500/30 bg-green-600/20";
      case "warning":
        return "border-yellow-500/30 bg-yellow-600/20";
      default:
        return "border-blue-500/30 bg-blue-600/20";
    }
  };

  const getEarningsChartBars = () => {
    if (earningsHistory.values.length < 2) {
      return Array.from({ length: 20 }, (_, i) => {
        const height = user.isNodeActive
          ? Math.max(
            30,
            Math.min(100, 50 + Math.sin(i * 0.5) * 30 + Math.random() * 20)
          )
          : Math.random() * 20;
        return height;
      });
    }

    const maxValue = Math.max(...earningsHistory.values);
    const minValue = Math.min(...earningsHistory.values);
    const range = maxValue - minValue || 1;

    return earningsHistory.values.map((value) => {
      const normalizedValue = ((value - minValue) / range) * 70 + 30;
      return Math.max(30, Math.min(100, normalizedValue));
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
      {notifications.length > 0 && (
        <div className="fixed top-16 sm:top-20 right-2 sm:right-4 z-40 space-y-2 max-w-xs sm:max-w-sm">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-3 sm:p-4 rounded-lg border backdrop-blur-sm ${getNotificationColor(
                notification.type
              )} animate-slide-in`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-2 sm:space-x-3">
                  <span className="text-base sm:text-lg">
                    {getNotificationIcon(notification.type)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-white font-medium text-xs sm:text-sm">
                      {notification.title}
                    </h4>
                    <p className="text-gray-300 text-xs break-words">
                      {notification.message}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => dismissNotification(notification.id)}
                  className="text-gray-400 hover:text-white ml-2"
                >
                  <X className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          Welcome back, {user.username}!
        </h1>
        <p className="text-gray-400 text-sm sm:text-base">
          Your account has been active for {user.accountAge} years, giving you a{" "}
          {user.multiplier}x earning multiplier.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-800"
            >
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div
                  className={`p-2 sm:p-3 rounded-lg bg-gradient-to-r ${card.color}`}
                >
                  <Icon className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <span className="text-xs sm:text-sm text-green-400">
                  {card.change}
                </span>
              </div>
              <h3 className="text-gray-400 text-xs sm:text-sm font-medium mb-1">
                {card.title}
              </h3>
              <p className="text-lg sm:text-2xl font-bold text-white break-words">
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      <EpochDisplay user={user} />

      {/* <div className="bg-gradient-to-r from-purple-500/20 to-blue-600/20 border border-purple-500/30 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-white">
              Unlock Premium Features
            </h3>
            <p className="text-gray-300 text-sm">
              Pay 0.02 SOL to access exclusive benefits!
            </p>
          </div>
          <WalletMultiButton />

          <button
            onClick={handlePhantomPayment}
            disabled={isPaying}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-400 to-blue-600 text-white font-medium hover:from-purple-500 hover:to-blue-700 transition-colors ${
              isPaying ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isPaying ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Gift className="w-4 h-4" />
                <span>Pay 0.02 SOL</span>
              </>
            )}
          </button>
        </div>
      </div> */}
      {!user.hasBadgeOfHonor && !hasVerifiedPurchase && (
        <div className="bg-gradient-to-r from-purple-500/20 to-blue-600/20 border border-purple-500/30 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-white">
                Purchase Cord Badge of Honor
              </h3>
              <p className="text-gray-300 text-sm">
                Pay 0.02 SOL to access exclusive benefits!
              </p>
            </div>

            <button
              onClick={handlePhantomPayment}
              disabled={isPaying}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-400 to-blue-600 text-white font-medium hover:from-purple-500 hover:to-blue-700 transition-colors ${isPaying ? "opacity-50 cursor-not-allowed" : ""
                }`}
            >
              {isPaying ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Gift className="w-4 h-4" />
                  <span>Pay 0.02 SOL</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-cyan-500/20 to-purple-600/20 border border-cyan-500/30 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
        <div className="text-center">
          <h3 className="text-base sm:text-lg text-gray-300 mb-2">
            Total Balance
          </h3>
          <div className="flex items-center justify-center">
            <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent break-words">
              {Math.floor(currentBalance).toLocaleString()} CORD
            </div>
            {(user.hasBadgeOfHonor || hasVerifiedPurchase) && (
              <img
                src={badgeImage}
                alt="Badge of Honor"
                className="w-12 h-12 ml-5"
                title="Badge of Honor Owner"
              />
            )}
          </div>
          <p className="text-gray-400 mt-2 text-sm sm:text-base">
            Total Earned: {Math.floor(totalEarned).toLocaleString()} CORD
          </p>
          {user.isNodeActive && (
            <div className="mt-3 flex items-center justify-center space-x-2 text-sm text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Live earnings: +{cordPerSecond.toFixed(4)} CORD/s</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-800">
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-4 flex items-center">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Live Earnings Chart
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm sm:text-base">
                Current Rate
              </span>
              <span className="text-white font-semibold text-sm sm:text-base">
                {user.isNodeActive
                  ? `${cordPerSecond.toFixed(4)} CORD/s`
                  : "0 CORD/s"}
              </span>
            </div>
            <div className="h-48 sm:h-64 flex items-end space-x-1 sm:space-x-2">
              {getEarningsChartBars().map((height, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-t transition-all duration-500 ${user.isNodeActive
                      ? "bg-gradient-to-t from-cyan-500 to-purple-600"
                      : "bg-gradient-to-t from-gray-600 to-gray-500 opacity-50"
                    }`}
                  style={{ height: `${height}%` }}
                ></div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <span className="text-gray-400 text-xs sm:text-sm">
                {user.isNodeActive
                  ? "Real-time earnings data"
                  : "Node inactive - start mining to see live data"}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-800">
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-4 flex items-center">
            <Award className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Earnings Overview
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm sm:text-base">
                This Session
              </span>
              <span className="text-white font-semibold text-sm sm:text-base">
                +{sessionEarnings.toFixed(2)} CORD
              </span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-cyan-400 to-purple-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, (sessionEarnings / 100) * 100)}%`,
                }}
              ></div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-white">
                  {Math.floor(stats.weeklyEarnings)}
                </div>
                <div className="text-xs sm:text-sm text-gray-400">
                  This Week
                </div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-white">
                  {Math.floor(stats.monthlyEarnings)}
                </div>
                <div className="text-xs sm:text-sm text-gray-400">
                  This Month
                </div>
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4 mt-4">
              <div className="flex items-center space-x-2 mb-2">
                <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" />
                <span className="text-yellow-400 font-medium text-sm sm:text-base">
                  Earning Rate
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                <div>
                  <span className="text-gray-400">Per Second:</span>
                  <span className="text-white ml-1">
                    {cordPerSecond.toFixed(4)} CORD
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Per Minute:</span>
                  <span className="text-white ml-1">
                    {(cordPerSecond * 60).toFixed(2)} CORD
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Per Hour:</span>
                  <span className="text-white ml-1">
                    {(cordPerSecond * 3600).toFixed(0)} CORD
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Per Day:</span>
                  <span className="text-white ml-1">
                    {(cordPerSecond * 86400).toFixed(0)} CORD
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 sm:mt-8 bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-800">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-4 flex items-center">
          <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          Recent Activity
        </h3>
        <div className="space-y-3">
          {[
            {
              action: user.isNodeActive
                ? "Node is currently mining CORD"
                : "Node stopped mining",
              time: "2 minutes ago",
              type: user.isNodeActive ? "success" : "warning",
              amount: user.isNodeActive
                ? `+${(sessionEarnings * 0.1).toFixed(2)} CORD`
                : null,
            },
            {
              action: "Task completed: Daily Check-in",
              time: "1 hour ago",
              type: "info",
              amount: `+${Math.floor(15 * user.multiplier)} CORD`,
            },
            {
              action: `Earned from mining`,
              time: "3 hours ago",
              type: "success",
              amount: `+${(stats.dailyEarnings * 0.3).toFixed(1)} CORD`,
            },
            {
              action: `Joined leaderboard rank #${user.rank}`,
              time: "1 day ago",
              type: "info",
              amount: null,
            },
          ].map((activity, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
            >
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${activity.type === "success"
                      ? "bg-green-400"
                      : activity.type === "warning"
                        ? "bg-yellow-400"
                        : "bg-blue-400"
                    }`}
                ></div>
                <div className="min-w-0 flex-1">
                  <span className="text-white text-sm sm:text-base block truncate">
                    {activity.action}
                  </span>
                  {activity.amount && (
                    <span className="text-green-400 font-medium text-xs sm:text-sm">
                      {activity.amount}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-gray-400 text-xs sm:text-sm ml-2 flex-shrink-0">
                {activity.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
