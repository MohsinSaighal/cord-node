import { useState, useEffect, useCallback } from 'react';
import { UserData } from '../types';
import { supabase } from '../lib/supabase';

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

export const useSupabaseSettings = (user: UserData) => {
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
      
      const { data: settingsData, error } = await supabase
        .from('user_settings') 
        .select('*')
        .eq('user_id', user.id);

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (settingsData && settingsData.length > 0) {
        const data = settingsData[0];
        console.log('Loaded settings from database:', data);
        setSettings({
          notifications: data.notifications || settings.notifications,
          privacy: data.privacy || settings.privacy,
          mining: data.mining || settings.mining,
          display: data.display || settings.display
        });
      } else {
        console.log('No settings found in database, using defaults');
        // Create default settings in database
        await createDefaultSettings();
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultSettings = async () => {
    try {
      console.log('Creating default settings for user:', user.id);
      const { error } = await supabase
        .from('user_settings')
        .insert({
          user_id: user.id,
          notifications: settings.notifications,
          privacy: settings.privacy,
          mining: settings.mining,
          display: settings.display
        });

      if (error) {
        console.error('Error creating default settings:', error);
      } else {
        console.log('Default settings created successfully');
      }
    } catch (error) {
      console.error('Error in createDefaultSettings:', error);
    }
  };

  const saveSettings = useCallback(async (newSettings: Settings): Promise<boolean> => {
    try {
      console.log('Saving settings to database:', newSettings);
      
      // First try to update existing settings
      const { error } = await supabase
        .from('user_settings')
        .update({
          notifications: newSettings.notifications,
          privacy: newSettings.privacy,
          mining: newSettings.mining,
          display: newSettings.display,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        console.log('Update failed, trying insert:', error);
        // If update fails, try insert (user might not have settings yet)
        const { error: insertError } = await supabase
          .from('user_settings')
          .insert({
            user_id: user.id,
            notifications: newSettings.notifications,
            privacy: newSettings.privacy,
            mining: newSettings.mining,
            display: newSettings.display
          });

        if (insertError) {
          console.error('Insert also failed:', insertError);
          throw insertError;
        }
      }

      // Verify the save by reading back
      const { data: verifyData, error: verifyError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (verifyError) {
        console.error('Error verifying saved settings:', verifyError);
        throw verifyError;
      }

      console.log('Settings saved and verified:', verifyData);
      setSettings(newSettings);
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    }
  }, [user.id, supabase]);

  return {
    settings,
    setSettings,
    saveSettings,
    loading,
    refreshSettings: loadSettings
  };
};