import { useState, useEffect, useCallback } from 'react';
import { UserData } from '../types';
import { apiClient } from './useApi';

interface Settings {
  notifications: {
    mining: boolean;
    tasks: boolean;
    referrals: boolean;
    system: boolean;
  };
  privacy: {
    showProfile: boolean;
    showEarnings: boolean;
    showActivity: boolean;
  };
  mining: {
    autoStart: boolean;
    intensity: string;
    offlineEarnings: string;
  };
  display: {
    theme: string;
    language: string;
    currency: string;
  };
}

export const useSettings = (user: UserData) => {
  const [settings, setSettings] = useState<Settings>({
    notifications: {
      mining: true,
      tasks: true,
      referrals: true,
      system: false
    },
    privacy: {
      showProfile: true,
      showEarnings: false,
      showActivity: true
    },
    mining: {
      autoStart: false,
      intensity: 'medium',
      offlineEarnings: '8h'
    },
    display: {
      theme: 'dark',
      language: 'en',
      currency: 'CORD'
    }
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) loadSettings();
  }, [user.id]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      const settingsData = await apiClient.getUserSettings(user.id);
      
      if (settingsData) {
        console.log('Loaded settings from API:', settingsData);
        setSettings({
          notifications: settingsData.notifications || settings.notifications,
          privacy: settingsData.privacy || settings.privacy,
          mining: settingsData.mining || settings.mining,
          display: settingsData.display || settings.display
        });
      } else {
        console.log('No settings found, using defaults');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };


  const saveSettings = useCallback(async (newSettings: Settings): Promise<boolean> => {
    try {
      console.log('Saving settings via API:', newSettings);
      
      const savedSettings = await apiClient.updateUserSettings(user.id, newSettings);
      
      if (savedSettings) {
        console.log('Settings saved successfully:', savedSettings);
        setSettings(newSettings);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    }
  }, [user.id]);

  return {
    settings,
    setSettings,
    saveSettings,
    loading,
    refreshSettings: loadSettings
  };
};