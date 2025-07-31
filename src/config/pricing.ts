export type PlanKey = 'free' | 'single' | 'family';

export interface Plan {
  title: string;
  description: string;
  priceDisplay: string;       // e.g. "A$15.00/month"
  stripePriceId: string;      // e.g. PRICE_ID_AUD_SINGLE from env
  maxPatients: number;        // maximum number of patients allowed
}

export interface RegionPricing {
  currency: string;           // e.g. 'AUD'
  plans: Record<PlanKey, Plan>;
}

export const PRICING: Record<'AUD' | 'GBP' | 'USD', RegionPricing> = {
  AUD: {
    currency: 'AUD',
    plans: {
      free: {
        title: 'Free Plan',
        description: 'Limited features',
        priceDisplay: 'Free',
        stripePriceId: '',
        maxPatients: 0,
      },
      single: {
        title: 'Individual',
        description: 'Unlimited AI tracking',
        priceDisplay: 'A$15.00/month',
        stripePriceId: import.meta.env.VITE_PRICE_ID_AUD_SINGLE!,
        maxPatients: 1,
      },
      family: {
        title: 'Family',
        description: 'Up to 5 profiles',
        priceDisplay: 'A$25.00/month',
        stripePriceId: import.meta.env.VITE_PRICE_ID_AUD_FAMILY!,
        maxPatients: 5,
      },
    },
  },
  GBP: {
    currency: 'GBP',
    plans: {
      free: {
        title: 'Free Plan',
        description: 'Limited features',
        priceDisplay: 'Free',
        stripePriceId: '',
        maxPatients: 0,
      },
      single: {
        title: 'Individual',
        description: 'Unlimited AI tracking',
        priceDisplay: '£8.00/month',
        stripePriceId: import.meta.env.VITE_PRICE_ID_GBP_SINGLE!,
        maxPatients: 1,
      },
      family: {
        title: 'Family',
        description: 'Up to 5 profiles',
        priceDisplay: '£14.00/month',
        stripePriceId: import.meta.env.VITE_PRICE_ID_GBP_FAMILY!,
        maxPatients: 5,
      },
    },
  },
  USD: {
    currency: 'USD',
    plans: {
      free: {
        title: 'Free Plan',
        description: 'Limited features',
        priceDisplay: 'Free',
        stripePriceId: '',
        maxPatients: 0,
      },
      single: {
        title: 'Individual',
        description: 'Unlimited AI tracking',
        priceDisplay: '$10.00/month',
        stripePriceId: import.meta.env.VITE_PRICE_ID_USD_SINGLE!,
        maxPatients: 1,
      },
      family: {
        title: 'Family',
        description: 'Up to 5 profiles',
        priceDisplay: '$18.00/month',
        stripePriceId: import.meta.env.VITE_PRICE_ID_USD_FAMILY!,
        maxPatients: 5,
      },
    },
  },
};