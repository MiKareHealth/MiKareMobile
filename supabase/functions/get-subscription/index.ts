import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@12.6.0?target=deno';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

// Plan name mapping
const PLAN_NAME: Record<string, string> = {
  single: 'MiKare Health - Individual plan',
  family: 'MiKare Health - Family plan',
  free: 'MiKare Health - free plan',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('session_id');
    
    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'session_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Stripe
    const stripeSecretKey = Deno.env.get('STRIPE_API_KEY');
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'STRIPE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // 1) Retrieve the Checkout Session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    // 2) Retrieve the Subscription
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    
    // 3) Return planKey & status
    const planKey = subscription.metadata.plan || 'free';
    const planName = PLAN_NAME[planKey] ?? PLAN_NAME.free;
    
    return new Response(
      JSON.stringify({
        status: subscription.status,
        planKey: planKey,
        planName: planName,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('get-subscription error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}); 