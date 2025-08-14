import React, { useEffect, useState } from "react";
import {
  Coins,
  TrendingUp,
  Users,
  Clock,
  Award,
  Zap,
  Star,
  Target,
  Play,
  Pause,
  Gift,
  CheckCircle,
  Shield,
  UserCheck,
  Settings,
  Home,
  Pickaxe,
  ListTodo,
  Trophy,
  UserPlus,
} from "lucide-react";
import cordlogo from "../../assets/logo.png";
import bgImage from "../../assets/bg.png";
import Coin from "../../assets/coin.png";
import trending from "../../assets/trending.png";
import zap from "../../assets/zap.png";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { SimpleButton } from "@/components/ui/SimpleButton";
import { cn } from "@/lib/utils";
import type { UserData } from "../../types";
import { useNodeMining } from "@/hooks/useNodeMining";
import { useTasks } from "@/hooks/useTasks";
import { BadgeOfHonorPurchase } from "./BadgeOfHonorPurchase";
import {
  getStoredReferralCode,
  clearStoredReferralCode,
} from "../../utils/referral";

interface NewDashboardProps {
  user: UserData;
  onUserUpdate: (user: UserData) => void;
}

const StatCard = ({
  value,
  label,
  change,
  icon,
  gradient,
  textColor = "text-white",
}: {
  value: string | number;
  label: string;
  change?: string;
  icon: React.ElementType | string; // Accepts component or image src
  gradient: string;
  textColor?: string;
}) => {
  return (
    <div
      className={cn(
        "relative p-4 lg:p-6 rounded-2xl backdrop-blur-sm border border-slate-700/50",
        gradient
      )}
    >
      <div className="flex items-center justify-between mb-3 lg:mb-4">
        <div className="p-2 lg:p-3 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
          {typeof icon === "string" ? (
            <img src={icon} alt="icon" className="w-6 h-6" />
          ) : (
            React.createElement(icon, { className: "w-6 h-6 text-white" })
          )}
        </div>
        {change && (
          <div className="text-xs lg:text-sm text-white/90 font-medium bg-white/10 px-2 py-0.5 lg:px-3 lg:py-1 rounded-full">
            {change}
          </div>
        )}
      </div>
      <div className={cn("text-2xl lg:text-3xl font-bold mb-1 lg:mb-2", textColor)}>
        {value}
      </div>
      <div className="text-xs lg:text-sm text-white/80 leading-relaxed">
        {label}
      </div>
    </div>
  );
};

const QuickStatsItem = ({
  icon: Icon,
  label,
  value,
  iconColor = "text-blue-400",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  iconColor?: string;
}) => (
  <div className="bg-slate-600/30 rounded-lg p-2 lg:p-3 border border-slate-500/30">
    <div className="flex items-center space-x-2 lg:space-x-3">
      <div className={cn("p-1.5 lg:p-2 rounded-lg bg-slate-700/40")}>
        <Icon className={cn("w-3 h-3 lg:w-4 lg:h-4", iconColor)} />
      </div>
      <div className="flex-1">
        <div className="text-xs lg:text-sm text-slate-400">{label}</div>
        <div className="text-sm lg:text-base font-semibold text-white">{value}</div>
      </div>
    </div>
  </div>
);

export const NewDashboard: React.FC<NewDashboardProps> = ({
  user,
  onUserUpdate,
}) => {
  const { isActive, earnings, timeActive, efficiency, toggleMining } =
    useNodeMining(user, onUserUpdate);
  const { tasks } = useTasks(user, onUserUpdate);
  const [referralCode, setReferralCode] = useState("");
  const [referralStatus, setReferralStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  // Calculate stats
  const currentTime = new Date();
  const timeString = currentTime.toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const completedTasks = tasks?.filter((task) => task.completed).length || 0;
  const totalCordFromTasks =
    tasks
      ?.filter((task) => task.completed)
      .reduce((sum, task) => sum + task.reward, 0) || 0;

  useEffect(() => {
    const processReferral = async () => {
      console.log("Processing referral for user:", user?.id);
      if (user?.id) {
        const referralCode = getStoredReferralCode();
        console.log("Stored referral code:", referralCode);
        if (referralCode) {
          try {
            const response = await fetch("http://staging.printsup.org/api/referrals/process", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: user.id, referralCode }),
            });
            if (response.ok) {
              console.log("Referral processed successfully");
              clearStoredReferralCode();
            } else {
              console.error("Failed to process referral");
            }
          } catch (error) {
            console.error("Error processing referral:", error);
          }
        }
      }
    };
    processReferral();
  }, [user?.id]);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!referralCode.trim() || !user?.id) return;

      setReferralStatus("loading");
      try {
        const response = await fetch("https://staging.printsup.org/api/referrals/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, referralCode: referralCode.trim() }),
        });
        
        if (response.ok) {
          setReferralStatus("success");
          setReferralCode("");
        } else {
          setReferralStatus("error");
        }
      } catch (error) {
        setReferralStatus("error");
      }
    };

   

 return (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white relative overflow-hidden">
    {/* Background image */}
    <div
      className="fixed inset-0 -z-10 w-full h-full bg-cover bg-center"
      style={{ backgroundImage: `url(${bgImage})` }}
    ></div>
    
    {/* Animated background particles */}
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-20 left-20 w-2 h-2 bg-blue-400/60 rounded-full animate-pulse"></div>
      <div
        className="absolute top-40 right-32 w-1 h-1 bg-cyan-400/40 rounded-full animate-pulse"
        style={{ animationDelay: "1s" }}
      ></div>
      <div
        className="absolute bottom-32 left-40 w-1.5 h-1.5 bg-purple-400/50 rounded-full animate-pulse"
        style={{ animationDelay: "2s" }}
      ></div>
      <div
        className="absolute top-60 left-1/3 w-1 h-1 bg-blue-300/30 rounded-full animate-pulse"
        style={{ animationDelay: "3s" }}
      ></div>
      <div
        className="absolute bottom-40 right-20 w-2 h-2 bg-cyan-300/40 rounded-full animate-pulse"
        style={{ animationDelay: "4s" }}
      ></div>
      <div
        className="absolute top-32 right-1/4 w-1 h-1 bg-purple-300/60 rounded-full animate-pulse"
        style={{ animationDelay: "5s" }}
      ></div>
    </div>

    <div className="relative z-10 max-w-7xl mx-auto p-6 space-y-6 mt-20">
      {/* Welcome Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 lg:gap-8">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-2xl lg:text-4xl font-bold text-white">Welcome Back</div>
            <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-sm font-medium rounded-full border border-emerald-500/30">
              Rank #{user.rank || 145}
            </div>
          </div>
          <div className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            {user.username}
          </div>
          <div className="text-slate-400 text-sm">{timeString}</div>
        </div>

        {/* Quick Stats Panel */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4 lg:p-6 w-full lg:w-auto lg:min-w-[600px]">
          <div className="space-y-4 lg:space-y-6">
            <div className="flex items-center gap-3 lg:gap-4">
              <div className="w-10 lg:w-12 h-10 lg:h-12 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                <Target className="w-5 lg:w-6 h-5 lg:h-6 text-white" />
              </div>
              <div>
                <div className="font-semibold text-base lg:text-lg text-white">Quick Stats</div>
                <div className="text-sm text-slate-400">{user.username}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:gap-4">
              <QuickStatsItem
                icon={TrendingUp}
                label="Mining Rate"
                value={`${(0.5 * (efficiency || 1)).toFixed(6)}/min`}
                iconColor="text-emerald-400"
              />
              <QuickStatsItem
                icon={Zap}
                label="Multiplier"
                value={`${user.multiplier || 1.5}x`}
                iconColor="text-yellow-400"
              />
              <QuickStatsItem
                icon={Clock}
                label="Account Age"
                value={`${user.accountAge}`}
                iconColor="text-blue-400"
              />
              <QuickStatsItem
                icon={Shield}
                label="Badge Status"
                value="No"
                iconColor="text-slate-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Prominent Referral Code Section */}
      <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 backdrop-blur-sm border border-blue-700/30 rounded-2xl p-6 w-full">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-1">Got a Referral Code?</h3>
            <p className="text-sm text-blue-200">
              Enter a referral code to get bonus rewards and boost your mining!
            </p>
          </div>
          <div className="w-full md:w-auto">
            <form 
              onSubmit={handleSubmit} 
              className="flex flex-col sm:flex-row gap-2 w-full"
            >
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                placeholder="Enter code here"
                className="flex-1 px-4 py-2 bg-blue-900/30 border border-blue-700/50 rounded-lg text-white placeholder:text-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={referralStatus === "loading"}
                className={cn(
                  "px-6 py-2 rounded-lg font-medium transition-all duration-200 whitespace-nowrap",
                  referralStatus === "loading" 
                    ? "bg-slate-600 text-slate-300"
                    : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                )}
              >
                {referralStatus === "loading" ? "Processing..." : "Apply Code"}
              </button>
            </form>
            {referralStatus === "success" && (
              <p className="mt-2 text-sm text-emerald-400 text-center sm:text-left">
                Success! Bonus applied to your account.
              </p>
            )}
            {referralStatus === "error" && (
              <p className="mt-2 text-sm text-red-400 text-center sm:text-left">
                Invalid code. Please try again.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <StatCard
            icon={Coin}
            value={(user.currentBalance || 485007).toLocaleString()}
            label="Current Balance in CORD Tokens."
            change="+12.09%"
            gradient="bg-[linear-gradient(135deg,#229162_0%,#38b48f_100%)]"
          />
          <StatCard
            icon={trending}
            value={(user.totalEarned || 20098).toLocaleString()}
            label="Total Earned CORD Tokens."
            change="+12.09%"
            gradient="bg-[linear-gradient(135deg,#2556C2_0%,#4f7be8_100%)]"
          />
          <StatCard
            icon={zap}
            value={`#${user.rank || 145}`}
            label="Your Rank out of 14500 miners."
            change="+12.09%"
            gradient="bg-[linear-gradient(135deg,#874DBE_0%,#b07be8_100%)]"
          />
          <StatCard
            icon={Users}
            value="107"
            label="Active Miners across the platform."
            change="+12.09%"
            gradient="bg-[linear-gradient(135deg,#C57844_0%,#e8b07b_100%)]"
          />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Mining Node Section */}
        <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
          <div className="bg-slate-700/20 rounded-xl p-4 border border-slate-600/30">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-lg text-white">
                    Mining Node
                  </div>
                  <div className="text-sm text-slate-400">
                    {isActive ? "Active & Mining" : "Ready To Mine"}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-slate-700/30 rounded-lg border border-slate-600/50">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400 mr-1" />
                  <span className="text-xs text-slate-400">Current Rate</span>
                </div>
                <div className="text-lg font-bold text-white">
                  {(0.5 * (efficiency || 1)).toFixed(6)}
                </div>
                <div className="text-xs text-slate-500">CORD/Min</div>
              </div>
              <div className="text-center p-4 bg-slate-700/30 rounded-lg border border-slate-600/50">
                <div className="flex items-center justify-center mb-2">
                  <Clock className="w-4 h-4 text-cyan-400 mr-1" />
                  <span className="text-xs text-slate-400">Active Time</span>
                </div>
                <div className="text-lg font-bold text-white">
                  {formatTime(timeActive || 0)}
                </div>
                <div className="text-xs text-slate-500">Hour, Mins, Sec</div>
              </div>
              <div className="text-center p-4 bg-slate-700/30 rounded-lg border border-slate-600/50">
                <div className="flex items-center justify-center mb-2">
                  <CheckCircle className="w-4 h-4 text-cyan-400 mr-1" />
                  <span className="text-xs text-slate-400">
                    Session Earned
                  </span>
                </div>
                <div className="text-lg font-bold text-white">
                  {earnings?.toFixed(6) || "0.000000"}
                </div>
                <div className="text-xs text-slate-500">CORD</div>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">
                  Mining Efficiency
                </span>
                <span className="text-sm font-semibold text-white">
                  {Math.round((efficiency || 1) * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.round((efficiency || 1) * 100)}%` }}
                ></div>
              </div>
            </div>

            <SimpleButton
              onClick={toggleMining}
              className={cn(
                "w-full py-3 text-white font-semibold rounded-xl transition-all duration-300",
                isActive
                  ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                  : "bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
              )}
            >
              {isActive ? "Stop Mining" : "Start Mining"}
            </SimpleButton>
          </div>
        </div>

        {/* Badge of Honor Section */}
        <BadgeOfHonorPurchase user={user} onUserUpdate={onUserUpdate} />
      </div>

      <div className="flex justify-center w-full px-4 lg:px-0">
        <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4 lg:p-6 w-full max-w-2xl mx-auto">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6">
            <div>
              <div className="font-semibold text-lg lg:text-xl text-white">Tasks and Rewards</div>
              <div className="text-xs lg:text-sm text-slate-400">Complete Tasks to earn CORD Tokens.</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
            <div className="bg-slate-700/30 rounded-xl p-6 border border-slate-600/50">
              <div className="text-center">
                <div className="text-sm text-slate-400 mb-1">Tasks</div>
                <div className="text-sm text-slate-400 mb-2">Completed</div>
                <div className="text-3xl font-bold text-white">
                  {completedTasks} - {tasks?.length || 0}
                </div>
              </div>
            </div>
            <div className="bg-slate-700/30 rounded-xl p-6 border border-slate-600/50">
              <div className="text-center">
                <div className="text-sm text-slate-400 mb-1">CORD</div>
                <div className="text-sm text-slate-400 mb-2">Earned</div>
                <div className="text-3xl font-bold text-white">
                  {totalCordFromTasks.toFixed(2)} CORD
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
};
