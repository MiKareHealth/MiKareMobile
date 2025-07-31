import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@12.6.0?target=deno';

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Get request body
    const body = await req.json();
    console.log('Request body:', body);
    
    const { priceId, userId, userEmail, plan, region, trialDays } = body;
    
    // Validate required fields
    if (!priceId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Price ID and user ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Stripe with secret key from environment
    const stripeSecretKey = Deno.env.get('STRIPE_API_KEY');
    if (!stripeSecretKey) {
      console.error('⚠️ Environment variable error: STRIPE_API_KEY not set');
      return new Response(
        JSON.stringify({ error: 'STRIPE_API_KEY environment variable is not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20', // Use a more recent Stripe API version for better trial support
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('⚠️ Environment variable error: Supabase variables not set');
      return new Response(
        JSON.stringify({ error: 'Supabase environment variables are not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Initializing Supabase client with:', { url: supabaseUrl.substring(0, 15) + '...' });
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Check if user exists in Stripe already (by looking up customer ID)
    let customerId;
    try {
      console.log('Looking up existing Stripe customer for user:', userId);
      const { data: customerData, error: lookupError } = await supabase
        .from('stripe_customers')
        .select('customer_id')
        .eq('user_id', userId)
        .single();
      
      if (lookupError && !lookupError.message.includes('No rows found')) {
        console.error('Database lookup error:', lookupError);
        throw lookupError;
      }
      
      customerId = customerData?.customer_id;
      console.log('Existing customer ID:', customerId || 'Not found, will create new');
    } catch (err) {
      console.error('Error looking up customer:', err);
      // Continue anyway, we'll create a new customer if needed
    }

    // If no customer exists, create one
    if (!customerId) {
      try {
        console.log('Creating new Stripe customer for:', userEmail);
        const customer = await stripe.customers.create({
          email: userEmail,
          metadata: {
            user_id: userId,
            region: region || 'USD', // Store region for webhook reference
            plan: plan || '' // Store plan for reference
          }
        });
        
        customerId = customer.id;
        console.log('Created new customer with ID:', customerId);
        
        // Store the customer ID in the database
        console.log('Storing customer ID in database');
        const { error: insertError } = await supabase
          .from('stripe_customers')
          .insert({
            user_id: userId,
            customer_id: customerId
          });
          
        if (insertError) {
          console.error('Error storing customer ID:', insertError);
          // Continue anyway, we have the customer ID
        }
      } catch (err) {
        console.error('Error creating Stripe customer:', err);
        throw err;
      }
    }

    // Get the frontend URL for success/cancel redirects
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://login.mikare.health';
    console.log('Frontend URL for redirects:', frontendUrl);

    // Create a Checkout Session
    console.log('Creating Checkout Session with:', { 
      customerId, 
      priceId,
      region,
      plan,
      trialDays
    });
    
    console.log('Creating checkout session with trial days:', trialDays || 7);
    
    // First, let's verify the price configuration
    try {
      const price = await stripe.prices.retrieve(priceId);
      console.log('Price configuration:', {
        id: price.id,
        active: price.active,
        type: price.type,
        recurring: price.recurring,
        unit_amount: price.unit_amount,
        currency: price.currency
      });
    } catch (priceError) {
      console.error('Error retrieving price:', priceError);
    }
    
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: customerId,
      client_reference_id: userId,
      payment_method_collection: 'always', // Always collect payment method upfront
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      success_url: `${frontendUrl}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/subscription-cancel`,
      subscription_data: {
        trial_period_days: trialDays || 7, // Default to 7 days if not specified
        metadata: { 
          plan: plan, 
          user_id: userId, 
          region: region || 'USD',
          // trial_days: trialDays || 7
        }
      },
      allow_promotion_codes: true
    });

    console.log('Successfully created checkout session:', { 
      id: session.id, 
      url: session.url ? 'URL present' : 'No URL',
      mode: session.mode,
      subscription_data: session.subscription_data
    });

    // Return the checkout URL
    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error details:', err);
    
    return new Response(
      JSON.stringify({ 
        error: err.message || 'Failed to create checkout session',
        stack: err.stack || 'No stack trace available'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});