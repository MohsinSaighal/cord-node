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
import { UserData } from "../../types";

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
    { id: "node", label: "Mining", icon: Server },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "leaderboard", label: "Rankings", icon: Trophy },
    { id: "referrals", label: "Referrals", icon: Users },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <header className="fixed top-0 w-full backdrop-blur-lg border-b z-50 shadow-lg" style={{ background: 'rgba(30, 30, 45, 0.95)', borderColor: 'var(--brand-primary)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'var(--gradient-brand)' }}>
              <span className="text-xl font-bold text-white">C</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-xl font-bold text-[#FFFFFF]">
                CordNode
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`
                    flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200
                    ${isActive
                      ? "text-white shadow-lg"
                      : "text-[#CCCCCC] hover:text-[#FFFFFF]"
                    }
                  `}
                  style={isActive ? { background: 'var(--gradient-brand)' } : { backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => !isActive && (e.currentTarget.style.backgroundColor = 'rgba(106, 90, 205, 0.1)')}
                  onMouseLeave={(e) => !isActive && (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Profile & Mobile Menu */}
          <div className="flex items-center space-x-4">
            {/* User Balance - Desktop */}
            <div className="hidden md:flex items-center space-x-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl px-4 py-2 border border-slate-200">
              <div className="text-right">
                <div className="text-sm font-bold bg-gradient-to-r from-sky-600 to-teal-600 bg-clip-text text-transparent">
                  {user.currentBalance?.toFixed(2) || '0.00'} CORD
                </div>
                <div className="text-xs text-slate-500">Balance</div>
              </div>
            </div>

            {/* User Avatar */}
            <div className="flex items-center space-x-3">
              {user.avatar && (
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-10 h-10 rounded-full border-2 border-white shadow-md"
                />
              )}
              <div className="hidden md:block">
                <div className="text-sm font-semibold text-slate-800">{user.username}</div>
                <div className="text-xs text-slate-500">
                  {user.accountAge}y • {user.multiplier}x
                </div>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-slate-600" />
              ) : (
                <Menu className="w-5 h-5 text-slate-600" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-slate-200 py-4">
            {/* Mobile Balance */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl mx-4 mb-4">
              <span className="text-sm font-semibold text-slate-700">Balance</span>
              <span className="text-sm font-bold bg-gradient-to-r from-sky-600 to-teal-600 bg-clip-text text-transparent">
                {user.currentBalance?.toFixed(2) || '0.00'} CORD
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
                    className={`
                      w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all duration-200
                      ${isActive
                        ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-lg"
                        : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              
              {/* Logout Button */}
              <button
                onClick={onLogout}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200"
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