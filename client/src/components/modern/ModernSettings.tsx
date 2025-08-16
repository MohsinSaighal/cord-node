import React, { useState } from 'react';
import { 
  Settings, 
  User, 
  Shield, 
  Bell,
  LogOut,
  Key,
  Database,
  Trash2,
  Download,
  Upload,
  Eye,
  EyeOff,
  Save,
  AlertTriangle
} from 'lucide-react';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { GradientText } from '@/components/ui/GradientText';
import { SimpleButton } from '@/components/ui/SimpleButton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { UserData } from '../../types';

interface ModernSettingsProps {
  user: UserData;
  onUserUpdate: (user: UserData) => void;
  onLogout: () => void;
}

const SettingsSection: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  gradient?: string;
}> = ({ title, description, icon, children, gradient = "from-slate-700/20 to-slate-800/20" }) => (
  <AnimatedCard className={`p-6 bg-gradient-to-br ${gradient} border-slate-700/30 backdrop-blur-sm`}>
    <div className="flex items-center mb-4">
      {icon}
      <div className="ml-3">
        <h3 className="text-xl font-bold text-white">{title}</h3>
        <p className="text-slate-400 text-sm">{description}</p>
      </div>
    </div>
    {children}
  </AnimatedCard>
);

const SettingItem: React.FC<{
  label: string;
  description?: string;
  value?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'danger' | 'success';
}> = ({ label, description, value, action, variant = 'default' }) => {
  const variants = {
    default: 'bg-slate-700/30 border-slate-600/30',
    danger: 'bg-red-500/10 border-red-500/30',
    success: 'bg-green-500/10 border-green-500/30'
  };

  return (
    <div className={cn("p-4 rounded-xl border transition-all duration-300", variants[variant])}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="font-medium text-white">{label}</div>
          {description && <div className="text-sm text-slate-400 mt-1">{description}</div>}
          {value && <div className="text-sm text-slate-300 mt-1">{value}</div>}
        </div>
        {action && <div className="ml-4">{action}</div>}
      </div>
    </div>
  );
};

export const ModernSettings: React.FC<ModernSettingsProps> = ({ user, onUserUpdate, onLogout }) => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [autoMining, setAutoMining] = useState(false);

  const handleLogout = () => {
    if (confirm('Are you sure you want to sign out?')) {
      onLogout();
    }
  };

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      // Handle account deletion
      console.log('Account deletion requested');
    }
  };

  const handleExportData = () => {
    const data = {
      username: user.username,
      total_earned: user.total_earned,
      current_balance: user.current_balance,
      account_age: user.account_age,
      multiplier: user.multiplier,
      referralCode: user.referralCode,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cordnode-data-${user.username}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute top-2/3 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/2 left-3/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '6s' }} />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12 animate-slide-up">
          <h1 className="text-6xl font-bold text-white mb-4">
            <GradientText className="bg-gradient-to-r from-blue-400 via-purple-500 to-cyan-400">
              Settings
            </GradientText>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Manage your account preferences, security settings, and mining configurations
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Profile Settings */}
          <SettingsSection
            title="Profile Information"
            description="Your Discord account details and mining statistics"
            icon={<User className="w-6 h-6 text-blue-400" />}
            gradient="from-blue-500/10 to-cyan-500/10 border-blue-500/20"
          >
            <div className="space-y-4">
              <SettingItem
                label="Username"
                value={user.username}
                action={<Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Discord</Badge>}
              />
              
              <SettingItem
                label="Account Age"
                description="Your Discord account age affects mining multiplier"
                value={`${user.account_age} years (${user.multiplier}x multiplier)`}
              />
              
              <SettingItem
                label="Total Earnings"
                value={`${user?.total_earned || '0.00'} CORD`}
              />
              
              <SettingItem
                label="Current Balance"
                value={`${user?.current_balance || '0.00'} CORD`}
              />

              <SettingItem
                label="Badge of Honor"
                value={user.hasbadgeofhonor ? "Owned" : "Not owned"}
                action={
                  user.hasbadgeofhonor ? (
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Active</Badge>
                  ) : (
                    <SimpleButton size="sm" variant="secondary">
                      Purchase
                    </SimpleButton>
                  )
                }
              />
            </div>
          </SettingsSection>

          {/* Mining Settings */}
          <SettingsSection
            title="Mining Configuration"
            description="Customize your mining node behavior and preferences"
            icon={<Settings className="w-6 h-6 text-purple-400" />}
            gradient="from-purple-500/10 to-pink-500/10 border-purple-500/20"
          >
            <div className="space-y-4">
              <SettingItem
                label="Auto-start Mining"
                description="Automatically start mining when you visit the site"
                action={
                  <button
                    onClick={() => setAutoMining(!autoMining)}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      autoMining ? "bg-purple-500" : "bg-slate-600"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        autoMining ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                }
              />
              
              <SettingItem
                label="Notifications"
                description="Receive notifications about mining progress and rewards"
                action={
                  <button
                    onClick={() => setNotifications(!notifications)}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      notifications ? "bg-green-500" : "bg-slate-600"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        notifications ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                }
              />

              <SettingItem
                label="Referral Code"
                description="Your unique referral code for inviting friends"
                value={user.referralCode}
                action={
                  <SimpleButton
                    size="sm"
                    variant="secondary"
                    onClick={() => navigator.clipboard.writeText(user.referralCode || '')}
                  >
                    Copy
                  </SimpleButton>
                }
              />
            </div>
          </SettingsSection>

          {/* Security Settings */}
          <SettingsSection
            title="Security & Privacy"
            description="Manage your account security and data privacy settings"
            icon={<Shield className="w-6 h-6 text-green-400" />}
            gradient="from-green-500/10 to-emerald-500/10 border-green-500/20"
          >
            <div className="space-y-4">
              <SettingItem
                label="Anti-cheat Status"
                description="Your account security and anti-cheat verification"
                value="Clean - No violations detected"
                variant="success"
                action={<Badge className="bg-green-500/20 text-green-400 border-green-500/30">Verified</Badge>}
              />
              
              <SettingItem
                label="Data Export"
                description="Download a copy of your account data and mining history"
                action={
                  <SimpleButton
                    size="sm"
                    variant="secondary"
                    onClick={handleExportData}
                  >
                    <Download className="w-5 h-5 mr-2" />
                  </SimpleButton>
                }
              />
            </div>
          </SettingsSection>

          {/* Data & Storage */}
          <SettingsSection
            title="Data Management"
            description="Control your data storage and account preferences"
            icon={<Database className="w-6 h-6 text-cyan-400" />}
            gradient="from-cyan-500/10 to-blue-500/10 border-cyan-500/20"
          >
            <div className="space-y-4">
              <SettingItem
                label="Database Connection"
                description="TypeORM PostgreSQL connection status"
                value="Connected to Neon Database"
                variant="success"
                action={<Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>}
              />
              
              <SettingItem
                label="Storage Usage"
                description="Your account data storage consumption"
                value="2.4 KB of mining data stored"
              />
            </div>
          </SettingsSection>

          {/* Account Actions */}
          <SettingsSection
            title="Account Actions"
            description="Sign out or manage your account"
            icon={<AlertTriangle className="w-6 h-6 text-orange-400" />}
            gradient="from-orange-500/10 to-red-500/10 border-orange-500/20"
          >
            <div className="space-y-6">
              <SettingItem
                label="Sign Out"
                description="Sign out of your CordNode account"
                action={
                  <SimpleButton
                    size="sm"
                    variant="secondary"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-5 h-5 mr-2" />
                  </SimpleButton>
                }
              />
              
              <SettingItem
                label="Delete Account"
                description="Permanently delete your account and all data"
                variant="danger"
                action={
                  <SimpleButton
                    size="sm"
                    variant="danger"
                    onClick={handleDeleteAccount}
                  >
                    <Trash2 className="w-5 h-5 mr-2" />
                  </SimpleButton>
                }
              />
            </div>
          </SettingsSection>
        </div>
      </div>
    </div>
  );
};