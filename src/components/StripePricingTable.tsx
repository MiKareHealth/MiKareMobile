import React, { useEffect } from 'react';
import { getCurrentRegion } from '../lib/supabaseClient';
import { getSupabaseClient } from '../lib/supabaseClient';
import { normalizeRegion } from '../utils/stripe';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'stripe-pricing-table': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'pricing-table-id': string;
        'publishable-key': string;
        'client-reference-id'?: string;
        'customer-email'?: string;
      };
    }
  }
}

export function useStripePricingTableState() {
  const [showTable, setShowTable] = React.useState(false);
  const openTable = () => setShowTable(true);
  const closeTable = () => setShowTable(false);
  return { showTable, openTable, closeTable };
}

interface StripePricingTableProps {
  region?: string;
  showTable?: boolean;
  userId?: string | null;
  customerEmail?: string | null;
}

const StripePricingTable: React.FC<StripePricingTableProps> = ({
  region,
  showTable = false,
  userId = null,
  customerEmail = null,
}) => {
  const [userEmail, setUserEmail] = React.useState<string | null>(customerEmail);
  const [clientId, setClientId] = React.useState<string | null>(userId);

  // Load Stripe pricing table script when component mounts
  useEffect(() => {
    if (!document.getElementById('stripe-pricing-table')) {
      const script = document.createElement('script');
      script.id = 'stripe-pricing-table';
      script.src = 'https://js.stripe.com/v3/pricing-table.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  // Get user email if not provided
  useEffect(() => {
    const getUserEmail = async () => {
      if (!customerEmail) {
        try {
          const supabase = await getSupabaseClient();
          const { data } = await supabase.auth.getUser();
          if (data.user) {
            setUserEmail(data.user.email);
            setClientId(data.user.id);
          }
        } catch (error) {
          console.error('Error getting user email:', error);
        }
      }
    };
    
    if (showTable) {
      getUserEmail();
    }
  }, [showTable, customerEmail]);

  if (!showTable) return null;

  // Determine region
  const normalizedRegion = normalizeRegion(region || getCurrentRegion() || 'USA');
  
  // Map region to the appropriate pricing table ID
  let tableId: string;
  let stripeKey: string = import.meta.env.VITE_STRIPE_KEY || '';
  
  switch (normalizedRegion) {
    case 'AUD':
      tableId = import.meta.env.VITE_STRIPE_PRICING_TABLE_ID_AUD || '';
      break;
    case 'GBP':
      tableId = import.meta.env.VITE_STRIPE_PRICING_TABLE_ID_GBP || '';
      break;
    default:
      tableId = import.meta.env.VITE_STRIPE_PRICING_TABLE_ID_USD || '';
  }

  if (!tableId || !stripeKey) {
    return (
      <div className="text-red-600 font-medium p-4 bg-red-50 rounded-lg">
        Stripe configuration error: Missing pricing table ID or publishable key for region {normalizedRegion}.
      </div>
    );
  }

  // Props to pass to the stripe-pricing-table element
  const tableProps: Record<string, string> = {
    'pricing-table-id': tableId,
    'publishable-key': stripeKey,
  };

  // Only add these props if we have values
  if (clientId) tableProps['client-reference-id'] = clientId;
  if (userEmail) tableProps['customer-email'] = userEmail;

  return (
    <div className="my-8">
      <stripe-pricing-table {...tableProps}></stripe-pricing-table>
    </div>
  );
};

export default StripePricingTable;