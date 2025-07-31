import React, { useState } from 'react';
import { PRICING, PlanKey } from '../config/pricing';
import { tokens } from '../styles/tokens';
import { handleSubscription } from '../utils/stripe';
import { Loader } from 'lucide-react';

interface SubscriptionPlanProps {
  region: 'AUD' | 'GBP' | 'USD';
  onSubscribe: (planKey: PlanKey) => void;
}

const PLAN_DESCRIPTIONS: Record<PlanKey, string> = {
  free: '',
  single:
    `Manage one individual's complete health journey with unlimited AI-powered appointment recordings, summaries, symptom and mood tracking, and secure document storage. Designed for solo profiles who want personalized, continuous care insights and seamless data sharing with their healthcare providers.`,
  family:
    `Manage up to five profiles—perfect for households, caregivers, or multigenerational families—with unlimited AI-powered appointment recordings, summaries, symptom and mood tracking, and secure document storage. Keep every loved one's health journey organized and shareable, all under one account for seamless, collaborative care.`,
};

export const SubscriptionPlan: React.FC<SubscriptionPlanProps> = ({ region, onSubscribe }) => {
  const [loading, setLoading] = useState<PlanKey | null>(null);
  const plans = PRICING[region].plans;
  const paidPlans: PlanKey[] = ['single', 'family'];

  const handleSubscribeClick = async (planKey: PlanKey) => {
    try {
      setLoading(planKey);
      await handleSubscription(planKey);
      // onSubscribe is called as a callback, but we're redirecting to Stripe
      // so this might not be executed
      onSubscribe(planKey); 
    } catch (error) {
      console.error('Subscription error:', error);
      alert(`Subscription error: ${(error as Error).message}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {paidPlans.map((planKey) => {
        const plan = plans[planKey];
        return (
          <div
            key={planKey}
            className={`${tokens.components.card.base} ${tokens.components.card.hover} flex flex-col justify-between border border-border-default`}
          >
            <div>
              <h2 className={`${tokens.typography.sizes.section} mb-2`}>MiKare Health - {plan.title} plan</h2>
              <p className={tokens.typography.sizes.body + ' mb-6'}>
                {PLAN_DESCRIPTIONS[planKey]}
              </p>
              <div className="text-2xl font-bold text-primary mb-4">
                {plan.priceDisplay}
              </div>
            </div>
            <button
              className={tokens.components.button.primary}
              onClick={() => handleSubscribeClick(planKey)}
              disabled={loading !== null}
            >
              {loading === planKey ? (
                <span className="flex items-center justify-center">
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </span>
              ) : (
                'Subscribe'
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default SubscriptionPlan;