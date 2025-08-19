import { getSupabaseClient, getCurrentRegion } from '../lib/supabaseClient';
import type { PlanKey } from '../config/pricing';
import { PRICING } from '../config/pricing';
import { error as logError } from './logger';

// Type for checkout session creation params
interface CreateCheckoutSessionParams {
  planKey: PlanKey;
  userId: string;
  userEmail: string;
  trialDays?: number; // Optional trial days
}

/**
 * Creates a Stripe checkout session for subscription
 */
export async function createCheckoutSession({
  planKey,
  userId,
  userEmail,
  trialDays = 7,
}: CreateCheckoutSessionParams) {
  try {
    // Use the already-selected, region-aware client
    const region = normalizeRegion(getCurrentRegion() || 'USD');
    const plan = PRICING[region].plans[planKey];
    if (!plan?.stripePriceId) throw new Error(`No price ID found for ${planKey} in ${region}`);
    const supabase = await getSupabaseClient();

    // Invoke the Edge Function, passing both planKey and region
    const { data, error } = await supabase.functions.invoke('checkout', {
      body: {
        priceId: plan.stripePriceId,
        userId,
        userEmail,
        plan: planKey,
        region,
        trialDays // Pass the trialDays parameter
      },
    });

    if (error) {
      logError('Supabase function error:', error);
      throw new Error('Failed to create checkout session');
    }
    
    if (!data?.url) {
      throw new Error('No checkout URL returned');
    }

    return data;
  } catch (error) {
    logError('Error creating checkout session:', error);
    throw error;
  }
}

/**
 * Normalizes a region string to AUD, GBP, or USD
 */
export function normalizeRegion(region?: string): 'AUD' | 'GBP' | 'USD' {
  if (region === 'AUD' || region === 'AU') return 'AUD';
  if (region === 'GBP' || region === 'UK') return 'GBP';
  return 'USD'; // Default to USD
}

/**
 * Handles subscription through Stripe
 */
export async function handleSubscription(planKey: PlanKey) {
  try {
    // Use the already-selected, region-aware client
    const region = normalizeRegion(getCurrentRegion() || 'USD');
    const supabase = await getSupabaseClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) throw userError;
    if (!user) throw new Error('You must be signed in to subscribe');
    
    // Get user email from auth
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();
      
    if (profileError && !profileError.message.includes('No rows found')) {
      throw profileError;
    }
      
    const userEmail = user.email || profileData?.username || '';
    
    // Create checkout session
    const { url } = await createCheckoutSession({
      planKey,
      userId: user.id,
      userEmail,
      trialDays: 7 // Pass the trial days parameter
    });
    
    // Redirect to checkout
    if (url) {
      window.location.href = url;
    } else {
      throw new Error('No checkout URL returned');
    }
  } catch (error) {
    logError('Subscription error:', error);
    throw error;
  }
}