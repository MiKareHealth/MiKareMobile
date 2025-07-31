import { useSubscriptionContext } from '../contexts/SubscriptionContext';

/**
 * Hook to access user's subscription status from SubscriptionContext
 */
export function useSubscription() {
  return useSubscriptionContext();
}