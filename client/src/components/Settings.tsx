import React, { useState } from 'react';
import { Settings as SettingsIcon, Bell, Shield, Palette, Save, User, Loader, LogOut, RefreshCw } from 'lucide-react';
import { UserData } from '../types';
import { useSettings } from '../hooks/useSettings';
import { signOut } from '../utils/supabaseAuth';

interface SettingsProps {
  user: UserData;
  onUserUpdate: (user: UserData) => void;
  onLogout: () => void;
}

const Settings: React.FC<SettingsProps> = ({ user, onUserUpdate, onLogout }) => {
  const { settings, setSettings, saveSettings, loading, refreshSettings } = useSettings(user);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleSettingChange = (category: string, setting: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [setting]: value
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const success = await saveSettings(settings);
      
      if (success) {
        // Show success notification
        setHasUnsavedChanges(false);
        showNotification('success', 'Settings Saved', 'Your preferences have been updated successfully!');
      } else {
        showNotification('error', 'Save Failed', 'Failed to save settings. Please try again.');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      showNotification('error', 'Save Failed', 'An error occurred while saving settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshSettings = async () => {
    try {
      await refreshSettings();
      showNotification('success', 'Settings Refreshed', 'Settings have been reloaded from the database.');
    } catch (error) {
      showNotification('error', 'Refresh Failed', 'Failed to refresh settings.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      onLogout();
      showNotification('success', 'Logged Out', 'You have been successfully logged out.');
    } catch (error) {
      console.error('Error logging out:', error);
      showNotification('error', 'Logout Failed', 'Failed to log out. Please try again.');
    }
  };

  const showNotification = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-600/20 border-green-500/30' : 
                   type === 'error' ? 'bg-red-600/20 border-red-500/30' :
                   'bg-blue-600/20 border-blue-500/30';
    const textColor = type === 'success' ? 'text-green-400' : 
                     type === 'error' ? 'text-red-400' :
                     'text-blue-400';
    const icon = type === 'success' ? '✅' : 
                type === 'error' ? '❌' : 'ℹ️';
    
    notification.className = `fixed top-20 right-4 ${bgColor} border rounded-lg p-4 z-50 animate-slide-in max-w-sm`;
    notification.innerHTML = `
      <div class="flex items-center space-x-2">
        <span class="text-lg">${icon}</span>
        <div>
          <div class="text-white font-medium text-sm">${title}</div>
          <div class="${textColor} text-xs">${message}</div>
        </div>
      </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-4" />
            <p className="text-gray-400">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Profile</h1>
       
        {hasUnsavedChanges && (
          <div className="mt-4 p-3 bg-yellow-600/20 border border-yellow-500/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-yellow-400">⚠️</span>
              <div>
                <div className="text-white font-medium text-sm">Unsaved Changes</div>
                <div className="text-yellow-400 text-xs">You have unsaved changes. Don't forget to save your settings!</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Profile Section */}
      <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-800 mb-6 sm:mb-8">
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-4 flex items-center">
          <User className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          Profile Information
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden flex-shrink-0">
              <img 
                src={user.avatar} 
                alt={user.username} 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-white font-medium text-sm sm:text-base">{user.username}#{user.discriminator}</h4>
              <p className="text-gray-400 text-xs sm:text-sm">Discord Account: {user.accountAge} years old</p>
              <p className="text-gray-400 text-xs sm:text-sm">Multiplier: {user.multiplier}x</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400 text-xs sm:text-sm">Total Earned:</span>
              <span className="text-white font-medium text-xs sm:text-sm">{Math.floor(user.totalEarned).toLocaleString()} CORD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-xs sm:text-sm">Current Balance:</span>
              <span className="text-white font-medium text-xs sm:text-sm">{Math.floor(user.currentBalance).toLocaleString()} CORD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-xs sm:text-sm">Referrals:</span>
              <span className="text-white font-medium text-xs sm:text-sm">{user.totalReferrals}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-xs sm:text-sm">Tasks Completed:</span>
              <span className="text-white font-medium text-xs sm:text-sm">{user.tasksCompleted}</span>
            </div>
          </div>
        </div>
      </div>

   

     

      


      {/* Save Button */}
      <div className="flex justify-between">
        {/* Refresh Button */}
        <button
          onClick={handleRefreshSettings}
          className="px-4 sm:px-6 py-3 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 transition-all duration-200 flex items-center space-x-2 text-sm sm:text-base"
        >
          <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
          <span>Refresh</span>
        </button>
        
        <div className="flex space-x-4">
        {/* Logout Button */}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="px-4 sm:px-6 py-3 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 transition-all duration-200 flex items-center space-x-2 text-sm sm:text-base"
        >
          <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
          <span>Logout</span>
        </button>
        
      
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-2xl p-6 sm:p-8 max-w-sm sm:max-w-md w-full border border-yellow-500/30">
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 rounded-full bg-yellow-600/20 flex items-center justify-center">
                <LogOut className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Logout</h3>
              <p className="text-gray-300 mb-6 text-sm sm:text-base">
                Are you sure you want to logout? You'll need to reconnect with Discord to access your account again.
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-3 sm:px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    handleLogout();
                  }}
                  className="flex-1 px-3 sm:px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;