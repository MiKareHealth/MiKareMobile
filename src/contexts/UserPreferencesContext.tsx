import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';
import { formatDate as formatDateUtil, formatDateTime as formatDateTimeUtil } from '../utils/timeUtils';

interface UserPreferences {
  timezone: string;
  timeFormat: '12h' | '24h';
  isLoading: boolean;
}

interface UserPreferencesContextType {
  preferences: UserPreferences;
  formatDate: (date: string | Date) => string;
  formatDateTime: (date: string | Date) => string;
  refreshPreferences: () => Promise<void>;
}

const defaultPreferences: UserPreferences = {
  timezone: 'UTC',
  timeFormat: '12h',
  isLoading: true,
};

const UserPreferencesContext = createContext<UserPreferencesContextType>({
  preferences: defaultPreferences,
  formatDate: (date) => formatDateUtil(date),
  formatDateTime: (date) => formatDateTimeUtil(date),
  refreshPreferences: async () => {},
});

export function useUserPreferences() {
  return useContext(UserPreferencesContext);
}

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [supabaseClient, setSupabaseClient] = useState<any>(null);

  // Move fetchPreferences to top-level so it can be called externally
  const fetchPreferences = async () => {
    if (!supabaseClient) return;
    try {
      // Get the current user
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        // Get user preferences from profiles table
        const { data, error } = await supabaseClient
          .from('profiles')
          .select('timezone, time_format')
          .eq('id', user.id)
          .single();
        if (error) {
          console.error('Error fetching user preferences:', error);
          setPreferences({ ...defaultPreferences, isLoading: false });
          return;
        }
        setPreferences({
          timezone: data?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          timeFormat: (data?.time_format as '12h' | '24h') || '12h',
          isLoading: false,
        });
      } else {
        setPreferences({ ...defaultPreferences, isLoading: false });
      }
    } catch (error) {
      console.error('Error in fetchPreferences:', error);
      setPreferences(prev => ({ ...prev, isLoading: false }));
    }
  };

  useEffect(() => {
    // Initialize Supabase client
    const initializeClient = async () => {
      try {
        const client = await getSupabaseClient();
        setSupabaseClient(client);
      } catch (error) {
        console.error('Error initializing Supabase client in UserPreferencesContext:', error);
        setPreferences(prev => ({ ...prev, isLoading: false }));
      }
    };
    initializeClient();
  }, []);

  useEffect(() => {
    if (!supabaseClient) return;
    fetchPreferences();
    // Subscribe to auth changes
    let subscription: any = null;
    const setupAuthListener = async () => {
      try {
        const { data } = supabaseClient.auth.onAuthStateChange(() => {
          fetchPreferences();
        });
        if (data?.subscription) {
          subscription = data.subscription;
        }
      } catch (error) {
        console.error('Error setting up auth listener:', error);
      }
    };
    setupAuthListener();
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [supabaseClient]);

  // Format a date according to user preferences using our utility function
  const formatDate = (date: string | Date): string => {
    return formatDateUtil(date, preferences.timezone);
  };

  // Format a date with time according to user preferences using our utility function
  const formatDateTime = (date: string | Date): string => {
    return formatDateTimeUtil(date, preferences.timezone, preferences.timeFormat);
  };

  const value = {
    preferences,
    formatDate,
    formatDateTime,
    refreshPreferences: fetchPreferences,
  };

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
}