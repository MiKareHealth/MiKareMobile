import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabaseClient';
import { formatDate as formatDateUtil, formatDateTime as formatDateTimeUtil } from '../utils/timeUtils';
import { error as logError } from '../utils/logger';

interface UserPreferences {
  timezone: string;
  timeFormat: '12h' | '24h';
  sessionTimeout: number;
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
  sessionTimeout: 30,
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
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
          .select('timezone, time_format, preferred_session_length')
          .eq('id', user.id)
          .single();
        if (error) {
          logError('Error fetching user preferences:', error);
          setPreferences({ ...defaultPreferences, isLoading: false });
          return;
        }
        setPreferences({
          timezone: data?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          timeFormat: (data?.time_format as '12h' | '24h') || '12h',
          sessionTimeout: data?.preferred_session_length || 30,
          isLoading: false,
        });
      } else {
        setPreferences({ ...defaultPreferences, isLoading: false });
      }
    } catch (error) {
      logError('Error in fetchPreferences:', error);
      setPreferences(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Debounced version of fetchPreferences to prevent excessive calls
  const debouncedFetchPreferences = () => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    fetchTimeoutRef.current = setTimeout(() => {
      fetchPreferences();
    }, 300); // 300ms debounce
  };

  useEffect(() => {
    // Initialize Supabase client
    const initializeClient = async () => {
      try {
        const client = await getSupabaseClient();
        setSupabaseClient(client);
      } catch (error) {
        logError('Error initializing Supabase client in UserPreferencesContext:', error);
        setPreferences(prev => ({ ...prev, isLoading: false }));
      }
    };
    initializeClient();
  }, []);

  useEffect(() => {
    if (!supabaseClient) return;
    fetchPreferences();
    // Subscribe to auth changes with debouncing
    let subscription: any = null;
    const setupAuthListener = async () => {
      try {
        const { data } = supabaseClient.auth.onAuthStateChange(() => {
          debouncedFetchPreferences(); // Use debounced version
        });
        if (data?.subscription) {
          subscription = data.subscription;
        }
      } catch (error) {
        logError('Error setting up auth listener:', error);
      }
    };
    setupAuthListener();
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
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