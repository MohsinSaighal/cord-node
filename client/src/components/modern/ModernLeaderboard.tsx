import React, { useState, useEffect } from "react";
import {
  Trophy,
  Crown,
  Medal,
  Award,
  TrendingUp,
  Users,
  Zap,
  Star,
  Search,
  Filter,
} from "lucide-react";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { GradientText } from "@/components/ui/GradientText";
import { StatsCard } from "@/components/ui/StatsCard";
import { SimpleButton } from "@/components/ui/SimpleButton";
import { Badge } from "@/components/ui/badge";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { cn } from "@/lib/utils";
import type { UserData } from "../../types";

interface ModernLeaderboardProps {
  currentUser?: UserData;
}

const PeriodSelector: React.FC<{
  periods: Array<{ id: string; label: string }>;
  selected: string;
  onChange: (period: string) => void;
}> = ({ periods, selected, onChange }) => {
  return (
    <div className="flex flex-wrap gap-2 sm:gap-3 mb-6 sm:mb-8">
      {periods.map((period) => {
        const isActive = selected === period.id;

        return (
          <SimpleButton
            key={period.id}
            onClick={() => onChange(period.id)}
            variant={isActive ? "primary" : "secondary"}
            size="sm"
            className={cn(
              "text-xs sm:text-sm transition-all duration-300",
              isActive
                ? "bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg shadow-cyan-500/25"
                : "bg-slate-800/50 text-slate-300 border border-slate-700/50 hover:bg-slate-700/50"
            )}
          >
            {period.label}
          </SimpleButton>
        );
      })}
    </div>
  );
};

const LeaderboardEntry: React.FC<{
  user: any;
  rank: number;
  currentUser?: UserData;
}> = ({ user, rank, currentUser }) => {
  const isCurrentUser = currentUser?.username === user.username;

  const getRankDisplay = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-lg">
            <Crown className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
          </div>
        );
      case 2:
        return (
          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full shadow-lg">
            <Medal className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
          </div>
        );
      case 3:
        return (
          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-amber-500 to-amber-700 rounded-full shadow-lg">
            <Award className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-slate-700/50 rounded-full border border-slate-600/50">
            <span className="text-slate-300 font-bold text-sm sm:text-base md:text-lg">
              #{rank}
            </span>
          </div>
        );
    }
  };

  const getRankGradient = (rank: number) => {
    switch (rank) {
      case 1:
        return "from-yellow-500/20 to-yellow-600/20 border-yellow-500/30";
      case 2:
        return "from-gray-400/20 to-gray-500/20 border-gray-400/30";
      case 3:
        return "from-amber-500/20 to-amber-600/20 border-amber-500/30";
      default:
        return "from-slate-700/20 to-slate-800/20 border-slate-700/30";
    }
  };

  return (
    <AnimatedCard
      className={cn(
        "p-4 sm:p-5 md:p-6 transition-all duration-300 border backdrop-blur-sm",
        `bg-gradient-to-r ${getRankGradient(rank)}`,
        isCurrentUser
          ? "ring-1 sm:ring-2 ring-cyan-500/50 bg-gradient-to-r from-cyan-500/10 to-purple-600/10"
          : "hover:border-slate-600/50",
        rank <= 3 ? "hover-lift" : ""
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
        <div className="flex items-center space-x-3 sm:space-x-4">
          {getRankDisplay(rank)}

          <div className="flex items-center space-x-2 sm:space-x-3">
            {user.avatar && (
              <img
                src={user.avatar}
                alt={user.username}
                className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full border-2 border-slate-600/50"
              />
            )}

            <div>
              <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                <h3
                  className={cn(
                    "font-bold text-sm sm:text-base md:text-lg",
                    isCurrentUser ? "text-cyan-400" : "text-white"
                  )}
                >
                  {user.username}
                </h3>
                {isCurrentUser && (
                  <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-xs">
                    You
                  </Badge>
                )}
                {user.hasbadgeofhonor && (
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                    <Star className="w-3 h-3 mr-1" />
                    Honor
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-slate-400">
                <span>Account: {user.account_age} years</span>
                <span className="hidden sm:inline">•</span>
                <span>Multiplier: {user.multiplier}x</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-lg sm:text-xl md:text-2xl font-bold">
            <GradientText
              className={cn(
                rank <= 3
                  ? "bg-gradient-to-r from-yellow-400 to-orange-500"
                  : "bg-gradient-to-r from-cyan-400 to-purple-500"
              )}
            >
              {Number(user.total_earned).toFixed(0) || "0"} CORD
            </GradientText>
          </div>

          <div className="flex items-center justify-end space-x-2 text-xs sm:text-sm">
            {user.isActive && (
              <>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-400">Mining</span>
              </>
            )}
          </div>
        </div>
      </div>
    </AnimatedCard>
  );
};

export const ModernLeaderboard: React.FC<ModernLeaderboardProps> = ({
  currentUser,
}) => {
  const { leaderboard, selectedPeriod, setSelectedPeriod, loading } =
    useLeaderboard(currentUser || null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredLeaderboard, setFilteredLeaderboard] = useState(leaderboard);

  const periods = [
    { id: "all", label: "All Time" },
    { id: "monthly", label: "Monthly" },
    { id: "weekly", label: "Weekly" },
    { id: "daily", label: "Daily" },
  ];

  useEffect(() => {
    let filtered = leaderboard;

    if (searchTerm) {
      filtered = leaderboard.filter((entry) =>
        entry.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredLeaderboard(filtered);
  }, [leaderboard, searchTerm]);

  const totalMiners = leaderboard.length;
  const activeMiners = leaderboard.filter((user) => user.isActive).length;
  const total_earned = leaderboard.reduce(
    (sum, user) => sum + (user.total_earned || 0),
    0
  );
  const currentUserRank = currentUser
    ? leaderboard.findIndex((u) => u.username === currentUser.username) + 1
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900/20 to-cyan-900/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mb-3 sm:mb-4"></div>
          <p className="text-slate-300 text-sm sm:text-lg">
            Loading leaderboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900/20 to-cyan-900/20">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/5 left-1/6 w-40 sm:w-60 md:w-80 h-40 sm:h-60 md:h-80 bg-cyan-500/10 rounded-full blur-3xl animate-float" />
        <div
          className="absolute top-2/3 right-1/5 w-48 sm:w-72 md:w-96 h-48 sm:h-72 md:h-96 bg-blue-500/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "3s" }}
        />
        <div
          className="absolute top-1/2 left-3/4 w-36 sm:w-56 md:w-72 h-36 sm:h-56 md:h-72 bg-indigo-500/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "6s" }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-3 sm:px-24 py-24 sm:py-24">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12 animate-slide-up">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-white mb-3 sm:mb-4">
            <GradientText className="bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600">
              Global Leaderboard
            </GradientText>
          </h1>
          <p className="text-sm sm:text-base md:text-xl text-slate-300 max-w-2xl mx-auto">
            Compete with miners worldwide and climb the rankings to earn
            recognition and rewards
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-8 sm:mb-12">
          <StatsCard
            title="Total Miners"
            value={totalMiners.toLocaleString()}
            subtitle="Registered users"
            icon={<Users className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />}
            gradient="from-cyan-400 to-blue-600"
            delay={0}
          />

          <StatsCard
            title="Active Now"
            value={activeMiners}
            subtitle="Currently mining"
            icon={<Zap className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />}
            gradient="from-green-400 to-emerald-600"
            delay={1}
            trend={12}
          />

          <StatsCard
            title="Total Mined"
            value={`${(total_earned / 1000).toFixed(1)}K`}
            subtitle="CORD earned globally"
            icon={
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            }
            gradient="from-purple-400 to-pink-600"
            delay={2}
          />

          <StatsCard
            title="Your Rank"
            value={currentUserRank ? `#${currentUserRank}` : "Unranked"}
            subtitle="Current position"
            icon={<Trophy className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />}
            gradient="from-orange-400 to-yellow-600"
            delay={3}
            trend={currentUserRank && currentUserRank <= 10 ? 5 : undefined}
          />
        </div>

        {/* Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
          <PeriodSelector
            periods={periods}
            selected={selectedPeriod}
            onChange={setSelectedPeriod}
          />

          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search miners..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg sm:rounded-xl text-sm sm:text-base text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500/50 focus:bg-slate-800/70 transition-all duration-300"
            />
          </div>
        </div>

        {/* Leaderboard */}
        <div className="space-y-3 sm:space-y-4">
          {filteredLeaderboard.map((user, index) => (
            <LeaderboardEntry
              key={user.id || user.username}
              user={user}
              rank={index + 1}
              currentUser={currentUser}
            />
          ))}
        </div>

        {filteredLeaderboard.length === 0 && (
          <div className="text-center py-8 sm:py-12">
            <Trophy className="w-12 h-12 sm:w-16 sm:h-16 text-slate-500 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-lg sm:text-xl font-bold text-slate-300 mb-1 sm:mb-2">
              No miners found
            </h3>
            <p className="text-sm sm:text-base text-slate-500">
              Try adjusting your search or time period
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
