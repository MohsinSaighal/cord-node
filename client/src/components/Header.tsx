import React from "react";
import {
  Menu,
  X,
  Home,
  Server,
  CheckSquare,
  Trophy,
  LogOut,
  User,
  Users,
  Settings,
} from "lucide-react";
import { UserData } from "../types";
// Wallet components temporarily removed during migration

interface HeaderProps {
  user: UserData;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onLogout: () => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({
  user,
  currentTab,
  setCurrentTab,
  onLogout,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
}) => {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "node", label: "Node", icon: Server },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "leaderboard", label: "Leaderboard", icon: Trophy },
    { id: "referrals", label: "Referrals", icon: Users },
    { id: "settings", label: "Profile", icon: Settings },
  ];

  return (
    <header className="fixed top-0 w-full bg-black/90 backdrop-blur-md border-b border-gray-800 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10">
              <img
                src="https://i.ibb.co/5gZ6p5Vf/CordNode.png"
                alt="CordNode"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent">
              CordNode
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex space-x-6 xl:space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                    currentTab === item.id
                      ? "bg-gradient-to-r from-cyan-500/20 to-purple-600/20 text-cyan-400"
                      : "text-gray-300 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="hidden sm:flex items-center space-x-3">
              <div className="text-right">
                <div className="text-xs sm:text-sm font-medium text-white">
                  {user.username}#{user.discriminator}
                </div>
                <div className="text-xs text-gray-400">
                  {user.accountAge}y •{" "}
                  {Math.floor(user.currentBalance).toLocaleString()} CORD
                </div>
              </div>
              <div className="w-8 h-8 rounded-full overflow-hidden">
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Mobile User Avatar */}
            <div className="sm:hidden w-8 h-8 rounded-full overflow-hidden">
              <img
                src={user.avatar}
                alt={user.username}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Desktop Logout */}
            <button
              onClick={onLogout}
              className="hidden lg:block p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
           {/* Wallet button temporarily disabled during migration */}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-black/95 backdrop-blur-md border-t border-gray-800">
          <div className="px-3 py-2">
            {/* Mobile User Info */}
            <div className="flex items-center space-x-3 p-3 border-b border-gray-800 mb-2">
              <div className="w-10 h-10 rounded-full overflow-hidden">
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">
                  {user.username}#{user.discriminator}
                </div>
                <div className="text-xs text-gray-400">
                  {user.accountAge} years •{" "}
                  {Math.floor(user.currentBalance).toLocaleString()} CORD
                </div>
              </div>
            </div>

            {/* Mobile Navigation */}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                      currentTab === item.id
                        ? "bg-gradient-to-r from-cyan-500/20 to-purple-600/20 text-cyan-400"
                        : "text-gray-300 hover:text-white hover:bg-gray-800"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm">{item.label}</span>
                  </button>
                );
              })}
              {/* Wallet button temporarily disabled during migration */}

              <button
                onClick={onLogout}
                className="w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm">Logout</span>
              </button>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
