/**
 * Stripe verification utilities for testing payment flows
 * This file contains helper functions to verify Stripe integration
 */

import { getSupabaseClient } from '../lib/supabaseClient';

export interface StripeVerificationResult {
  success: boolean;
  message: string;
  details?: any;
}

/**
 * Verify that a user's subscription status matches what's in Stripe
 */
export async function verifyUserSubscription(userId: string): Promise<StripeVerificationResult> {
  try {
    const supabase = await getSupabaseClient();

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_plan, subscription_status, trial_started_at, trial_completed')
      .eq('id', userId)
      .single();

    if (profileError) {
      return {
        success: false,
        message: 'Failed to fetch user profile',
        details: profileError
      };
    }

    // Get Stripe customer ID
    const { data: stripeCustomer, error: customerError } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (customerError && customerError.code !== 'PGRST116') { // Not found is ok
      return {
        success: false,
        message: 'Failed to fetch Stripe customer',
        details: customerError
      };
    }

    return {
      success: true,
      message: 'Subscription verified',
      details: {
        profile: {
          subscription_plan: profile.subscription_plan,
          subscription_status: profile.subscription_status,
          trial_started_at: profile.trial_started_at,
          trial_completed: profile.trial_completed
        },
        stripeCustomerId: stripeCustomer?.stripe_customer_id || 'Not found'
      }
    };
  } catch (error) {
    return {
      success: false,
      message: 'Verification failed',
      details: error
    };
  }
}

/**
 * Check if user is stuck on free plan when they should have paid access
 */
export async function checkFreePlanIssues(userId: string): Promise<StripeVerificationResult> {
  try {
    const supabase = await getSupabaseClient();

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_plan, subscription_status')
      .eq('id', userId)
      .single();

    if (!profile) {
      return { success: false, message: 'User not found' };
    }

    // Check if user is on free plan
    const isFreePlan = profile.subscription_plan?.includes('free') || !profile.subscription_plan;

    // Check if they have a Stripe customer ID (means they tried to subscribe)
    const { data: stripeCustomer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (isFreePlan && stripeCustomer) {
      return {
        success: false,
        message: 'User has Stripe customer ID but is on free plan - possible subscription issue',
        details: {
          subscription_plan: profile.subscription_plan,
          subscription_status: profile.subscription_status,
          stripe_customer_id: stripeCustomer.stripe_customer_id
        }
      };
    }

    return {
      success: true,
      message: 'No free plan issues detected',
      details: {
        subscription_plan: profile.subscription_plan,
        has_stripe_customer: !!stripeCustomer
      }
    };
  } catch (error) {
    return {
      success: false,
      message: 'Check failed',
      details: error
    };
  }
}

/**
 * Get all active discount codes
 */
export async function getActiveDiscountCodes(): Promise<any[]> {
  try {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from('discount_codes')
      .select('*')
      .is('deleted_at', null);

    if (error) {
      console.error('Error fetching discount codes:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getActiveDiscountCodes:', error);
    return [];
  }
}

/**
 * Fix user account stuck on free plan
 */
export async function fixFreePlanAccount(userId: string, targetPlan: 'individual' | 'family'): Promise<StripeVerificationResult> {
  try {
    const supabase = await getSupabaseClient();

    const planName = targetPlan === 'individual'
      ? 'MiKare Health - Individual'
      : 'MiKare Health - Family';

    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_plan: planName,
        subscription_status: 'active'
      })
      .eq('id', userId);

    if (error) {
      return {
        success: false,
        message: 'Failed to update subscription',
        details: error
      };
    }

    return {
      success: true,
      message: `Successfully updated to ${planName}`,
      details: { plan: planName }
    };
  } catch (error) {
    return {
      success: false,
      message: 'Fix failed',
      details: error
    };
  }
}
