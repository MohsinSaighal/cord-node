import React from "react";
import {
  Home,
  Pickaxe,
  ListTodo,
  Trophy,
  UserPlus,
  Settings,
  Menu,
  X,
  User,
  LogOut,
} from "lucide-react";
import { UserData } from "../../types";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { cn } from "@/lib/utils";
import cordlogo from "../../assets/logo.png";

interface CleanHeaderProps {
  user: UserData;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onLogout: () => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

export const CleanHeader: React.FC<CleanHeaderProps> = ({
  user,
  currentTab,
  setCurrentTab,
  onLogout,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
}) => {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "node", label: "Mining", icon: Pickaxe },
    { id: "tasks", label: "Tasks", icon: ListTodo },
    { id: "leaderboard", label: "Rankings", icon: Trophy },
    { id: "referrals", label: "Referrals", icon: UserPlus },
    { id: "settings", label: "Settings", icon: Settings },
  ];
  console.log("user", user);
  return (
    <header className="fixed top-0 w-full backdrop-blur-lg border-b border-slate-700/50 z-50 bg-slate-900/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
                         <img src={cordlogo} alt="CordNode Logo" className="h-8 w-auto" />
         
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={cn(
                    "flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors",
                    isActive
                      ? "text-white bg-slate-700/50"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Side Controls */}
          <div className="flex items-center space-x-4">
            {/* Wallet Button */}
            <div className="hidden lg:block">
              <WalletMultiButton className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-4 py-2 rounded-full font-medium" />
            </div>

            {/* User Balance */}
            <div className="hidden md:flex items-center space-x-2 bg-slate-800/50 rounded-lg px-3 py-1.5 border border-slate-700/50">
              <span className="text-sm font-semibold text-white">
                {user?.current_balance|| "0.00"} CORD
              </span>
            </div>

            {/* User Profile */}
            <div className="flex items-center space-x-3">
              <div className="hidden md:block text-right">
                <div className="text-sm font-semibold text-white">{user.username}</div>
                <div className="text-xs text-slate-400">
                  Age: {user.account_age}y • {user.multiplier}x
                </div>
              </div>
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-8 h-8 rounded-full border-2 border-slate-600"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600">
                  <User className="w-4 h-4 text-slate-400" />
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-slate-400" />
              ) : (
                <Menu className="w-5 h-5 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-slate-800 border-t border-slate-700/50 py-4">
            {/* Mobile Balance */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-700/50 rounded-lg mx-4 mb-4">
              <span className="text-sm font-semibold text-slate-300">Balance</span>
              <span className="text-sm font-bold text-white">
                {user.current_balance?.toFixed(2) || "0.00"} CORD
              </span>
            </div>

            {/* Mobile Navigation */}
            <div className="space-y-1 px-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors",
                      isActive
                        ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-white"
                        : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              {/* Wallet Button */}
              <div className="px-4 py-3">
                <WalletMultiButton className="w-full justify-center bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg font-medium" />
              </div>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};