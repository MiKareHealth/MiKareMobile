import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@12.6.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_API_KEY');
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'STRIPE_API_KEY not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const body = await req.json();
    const { priceId } = body;

    if (!priceId) {
      return new Response(
        JSON.stringify({ error: 'Price ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Retrieve the price to check its configuration
    const price = await stripe.prices.retrieve(priceId);
    
    console.log('Price details:', {
      id: price.id,
      active: price.active,
      type: price.type,
      recurring: price.recurring,
      unit_amount: price.unit_amount,
      currency: price.currency
    });

    return new Response(
      JSON.stringify({ 
        price: {
          id: price.id,
          active: price.active,
          type: price.type,
          recurring: price.recurring,
          unit_amount: price.unit_amount,
          currency: price.currency
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}); 