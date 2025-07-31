import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';

interface SubscriptionContextType {
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
  isFreePlan: boolean;
  isLoading: boolean;
  error: string | null;
  setSubscription: (plan: string, status: string) => void;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  subscriptionPlan: null,
  subscriptionStatus: null,
  isFreePlan: true,
  isLoading: true,
  error: null,
  setSubscription: () => {},
  refreshSubscription: async () => {},
});

export function useSubscriptionContext() {
  return useContext(SubscriptionContext);
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [isFreePlan, setIsFreePlan] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const supabase = await getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        setIsFreePlan(false);
        setSubscriptionPlan(null);
        setSubscriptionStatus(null);
        return;
      }
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('subscription_plan, subscription_status')
        .eq('id', user.id)
        .single();
      if (fetchError) throw fetchError;
      setSubscriptionPlan(data.subscription_plan);
      setSubscriptionStatus(data.subscription_status);
      setIsFreePlan(data.subscription_plan === 'MiKare Health - free plan');
    } catch (err) {
      setError((err as Error).message);
      setIsFreePlan(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();

    // Subscribe to auth changes
    let subscription: any = null;
    const setupAuthListener = async () => {
      try {
        const supabase = await getSupabaseClient();
        const { data } = supabase.auth.onAuthStateChange(() => {
          fetchSubscription();
        });
        if (data?.subscription) {
          subscription = data.subscription;
        }
      } catch (error) {
        console.error('Error setting up auth listener in SubscriptionContext:', error);
      }
    };
    setupAuthListener();
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const setSubscription = (plan: string, status: string) => {
    setSubscriptionPlan(plan);
    setSubscriptionStatus(status);
    setIsFreePlan(plan === 'MiKare Health - free plan');
  };

  const value: SubscriptionContextType = {
    subscriptionPlan,
    subscriptionStatus,
    isFreePlan,
    isLoading,
    error,
    setSubscription,
    refreshSubscription: fetchSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

function getLocaleFromTimezone(timezone: string): string {
  if (timezone.startsWith('Australia/')) return 'en-AU';
  if (timezone.startsWith('Europe/')) return 'en-GB';
  if (timezone.startsWith('America/')) return 'en-US';
  // Add more as needed
  return 'en-GB'; // Default to UK style
} 