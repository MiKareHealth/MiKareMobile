// supabase/functions/stripe-webhook/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@12.6.0?target=deno';

// Plan‐key → UI plan name mapping
const PLAN_NAME: Record<string,string> = {
  single: 'MiKare Health - Individual plan',
  family: 'MiKare Health - Family plan',
  free:   'MiKare Health - free plan',
};

// Helper function to safely get plan key with logging
const getPlanKeyFromPriceId = (priceId: string, eventType: string, userId: string): 'single' | 'family' | 'free' => {
  const consoleEnabled = Deno.env.get('VITE_CONSOLE') === 'true';
  
  // Get price IDs from environment variables
  const priceIdSingle = Deno.env.get('PRICE_ID_SINGLE');
  const priceIdFamily = Deno.env.get('PRICE_ID_FAMILY');
  
  if (!priceIdSingle || !priceIdFamily) {
    const error = `Environment variables PRICE_ID_SINGLE or PRICE_ID_FAMILY not set`;
    if (consoleEnabled) {
      console.error(`❌ CRITICAL: ${error}`);
    }
    throw new Error(error);
  }
  
  // Create dynamic mapping from environment variables
  const PRICE_ID_TO_PLAN_KEY: Record<string, 'single' | 'family' | 'free'> = {
    [priceIdSingle]: 'single',
    [priceIdFamily]: 'family',
  };
  
  const planKey = PRICE_ID_TO_PLAN_KEY[priceId];
  if (!planKey) {
    if (consoleEnabled) {
      console.error(`❌ CRITICAL: Unknown price_id ${priceId} for event ${eventType}, user ${userId}`);
      console.error(`Available price IDs: ${Object.keys(PRICE_ID_TO_PLAN_KEY).join(', ')}`);
    }
    // Don't default to free - this is likely an error
    throw new Error(`Unknown price_id: ${priceId}`);
  }
  
  if (consoleEnabled) {
    console.log(`✅ Mapped price_id ${priceId} to plan ${planKey} for user ${userId}`);
  }
  return planKey;
};

// CORS headers (only needed if you call this from a browser; safe to leave)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, stripe-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Load secrets & config
  const stripeApiKey         = Deno.env.get('STRIPE_API_KEY')!;
  const webhookSigningSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
  const supabaseUrl          = Deno.env.get('SUPABASE_URL')!;
  const supabaseSvcKey       = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const instanceRegion       = Deno.env.get('REGION');  // e.g. "AUD","GBP","USD"

  // Initialize clients
  const stripe = new Stripe(stripeApiKey, { apiVersion: '2024-06-20' });
  const cryptoProvider = Stripe.createSubtleCryptoProvider();
  const supabase = createClient(supabaseUrl, supabaseSvcKey);

  try {
    // 1) Read raw body & signature
    const sig = req.headers.get('stripe-signature')!;
    const body = await req.text();

    // 2) Async‐verify the event
    const event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      webhookSigningSecret,
      undefined,
      cryptoProvider
    );

    // 3) Extract common fields
    const obj: any = event.data.object;
    let userId = obj.client_reference_id || obj.metadata?.user_id;
    // Remove planKey/planName from metadata here
    const eventRegion = obj.metadata?.region;
    const planName = PLAN_NAME.free; // Default to free
    
    const consoleEnabled = Deno.env.get('VITE_CONSOLE') === 'true';
    if (consoleEnabled) {
      console.log(`📨 Webhook received: ${event.type} for user ${userId}, region ${eventRegion}`);
    }

    // 4) Route by region (ignore if not for this instance)
    if (instanceRegion && eventRegion !== instanceRegion) {
      if (consoleEnabled) {
        console.log(`Ignoring ${event.type} for region ${eventRegion}`);
      }
      return new Response(JSON.stringify({ ignored: true }), { status: 200, headers: corsHeaders });
    }

    // 5) If no userId yet, look it up from stripe_customers
    if (!userId && obj.customer) {
      const { data: rec } = await supabase
        .from('stripe_customers')
        .select('user_id')
        .eq('customer_id', obj.customer)
        .maybeSingle();
      userId = rec?.user_id;
    }
    if (!userId) {
      throw new Error(`Could not resolve userId for webhook ${event.id}`);
    }

    // 6) Helper to update profile
    const updateProfile = (plan: string, status: 'active'|'inactive', trialStartedAt?: string, trialCompleted?: boolean) => {
      const updateData: any = { 
        subscription_plan: plan, 
        subscription_status: status 
      };
      
      if (trialStartedAt) {
        updateData.trial_started_at = trialStartedAt;
      }
      
      if (trialCompleted !== undefined) {
        updateData.trial_completed = trialCompleted;
      }
      
      return supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);
    };

    // 7) Handle event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        // Fetch the real Subscription
        const sub = await stripe.subscriptions.retrieve(session.subscription!);
        // Determine planKey from price_id
        const priceId = sub.items.data[0].price.id;
        let planKey: 'single'|'family'|'free';
        try {
          planKey = getPlanKeyFromPriceId(priceId, event.type, userId);
        } catch (error) {
          console.error(`Failed to process checkout.session.completed for user ${userId}:`, error);
          // Don't update profile if we can't determine the plan
          return new Response(JSON.stringify({ error: 'Unknown price_id' }), { status: 400, headers: corsHeaders });
        }
        const planName = PLAN_NAME[planKey];
        // Upsert into stripe_subscriptions
        await supabase
          .from('stripe_subscriptions')
          .upsert({
            customer_id: sub.customer,
            subscription_id: sub.id,
            price_id: priceId,
            current_period_start: sub.current_period_start,
            current_period_end: sub.current_period_end,
            cancel_at_period_end: sub.cancel_at_period_end,
            status: sub.status,
          }, { onConflict: 'customer_id' });
        // Update profiles table with correct plan name and trial info
        const trialStartedAt = new Date().toISOString();
        await updateProfile(planName, 'active', trialStartedAt, false);
      } break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        {
          // Upsert stripe_subscriptions
          const subscription = obj;
          const priceId = subscription.items.data[0].price.id;
          let planKey: 'single'|'family'|'free';
          try {
            planKey = getPlanKeyFromPriceId(priceId, event.type, userId);
          } catch (error) {
            console.error(`Failed to process ${event.type} for user ${userId}:`, error);
            // Don't update profile if we can't determine the plan
            return new Response(JSON.stringify({ error: 'Unknown price_id' }), { status: 400, headers: corsHeaders });
          }
          const planName = PLAN_NAME[planKey];
          await supabase
            .from('stripe_subscriptions')
            .upsert({
              customer_id: subscription.customer,
              subscription_id: subscription.id,
              price_id: priceId,
              current_period_start: subscription.current_period_start,
              current_period_end: subscription.current_period_end,
              cancel_at_period_end: subscription.cancel_at_period_end,
              status: subscription.status,
            }, { onConflict: 'customer_id' });
          // Mark profile active with correct plan name
          await updateProfile(planName, 'active');
        }
        break;

      case 'customer.subscription.trial_will_end':
        {
          // Trial is ending soon - send notification if needed
          if (consoleEnabled) {
            console.log(`Trial ending soon for user ${userId}`);
          }
          // You could send an email notification here
        }
        break;

      case 'customer.subscription.trial_ended':
        {
          // Trial has ended - mark as completed
          if (consoleEnabled) {
            console.log(`Trial ended for user ${userId}`);
          }
          // Use price_id from subscription to determine plan
          const priceId = obj.items?.data?.[0]?.price?.id;
          let planKey: 'single'|'family'|'free';
          try {
            planKey = getPlanKeyFromPriceId(priceId, event.type, userId);
          } catch (error) {
            console.error(`Failed to process ${event.type} for user ${userId}:`, error);
            // Don't update profile if we can't determine the plan
            return new Response(JSON.stringify({ error: 'Unknown price_id' }), { status: 400, headers: corsHeaders });
          }
          const planName = PLAN_NAME[planKey];
          await updateProfile(planName, 'active', undefined, true);
        }
        break;

      case 'invoice.paid':
      case 'invoice.payment_succeeded':
        {
          const invoice: Stripe.Invoice = obj;

          // Insert an order record
          await supabase.from('stripe_orders').insert({
            checkout_session_id: invoice.checkout_session?.toString() ?? null,
            payment_intent_id:   invoice.payment_intent?.toString() ?? null,
            customer_id:         invoice.customer?.toString() ?? null,
            amount_subtotal:     invoice.amount_subtotal,
            amount_total:        invoice.amount_paid,
            currency:            invoice.currency,
            payment_status:      invoice.payment_status,
            status:              'paid',
          });

          // Also ensure subscription & profile are up to date
          const sub = await stripe.subscriptions.retrieve(invoice.subscription!);
          const priceId = sub.items.data[0].price.id;
          let planKey: 'single'|'family'|'free';
          try {
            planKey = getPlanKeyFromPriceId(priceId, event.type, userId);
          } catch (error) {
            console.error(`Failed to process ${event.type} for user ${userId}:`, error);
            // For invoice.paid events, we should preserve the existing subscription rather than failing
            console.log(`Preserving existing subscription for user ${userId} due to unknown price_id`);
            return new Response(JSON.stringify({ received: true, warning: 'Unknown price_id, preserving existing subscription' }), { status: 200, headers: corsHeaders });
          }
          const planName = PLAN_NAME[planKey];
          await supabase
            .from('stripe_subscriptions')
            .upsert({
              customer_id: sub.customer,
              subscription_id: sub.id,
              price_id: priceId,
              current_period_start: sub.current_period_start,
              current_period_end: sub.current_period_end,
              cancel_at_period_end: sub.cancel_at_period_end,
              status: sub.status,
            }, { onConflict: 'customer_id' });
          await updateProfile(planName, 'active');
        }
        break;

      case 'customer.subscription.deleted':
      case 'customer.subscription.paused':
      case 'customer.subscription.cancelled':
      case 'invoice.payment_failed':
      case 'invoice.marked_uncollectible':
      case 'payment_intent.canceled':
      case 'payment_intent.payment_failed':
        {
          // Mark subscription record inactive
          await supabase
            .from('stripe_subscriptions')
            .update({ status: 'canceled' })
            .eq('subscription_id', obj.id);

          // Reset user to free
          await updateProfile(PLAN_NAME.free, 'inactive');
        }
        break;

      default:
        if (consoleEnabled) {
          console.log(`Unhandled event type: ${event.type}`);
        }
    }

    // 8) ACK to Stripe
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: corsHeaders });
  } catch (err: any) {
    const consoleEnabled = Deno.env.get('VITE_CONSOLE') === 'true';
    if (consoleEnabled) {
      console.error('❌ Webhook error:', err);
    }
    return new Response(err.message, {
      status: 400,
      headers: { 'Content-Type': 'text/plain', ...corsHeaders },
    });
  }
});
