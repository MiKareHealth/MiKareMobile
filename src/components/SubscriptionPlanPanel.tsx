import React, { useState, useEffect } from 'react';
import { PlanKey, PRICING } from '../config/pricing';
import { tokens } from '../styles/tokens';
import { normalizeRegion } from '../utils/stripe';
import { handleSubscription } from '../utils/stripe';
import { ChevronDown, ChevronUp, Loader } from 'lucide-react';

interface SubscriptionPlanPanelProps {
  currentPlanKey: PlanKey;
  region: 'AUD' | 'GBP' | 'USD';
  onSubscribe: (planKey: PlanKey) => void;
  initialExpanded?: boolean;
}

const PLAN_SUMMARY: Record<PlanKey, { title: string; description: string }> = {
  free: {
    title: 'Free Plan Limitations',
    description:
      "You're currently on the free plan with limited features. Upgrade to unlock more patients, storage, and AI features.",
  },
  single: {
    title: 'Current Plan: Individual',
    description:
      'Manage one profile with unlimited AI-powered features. Upgrade to Family for more profiles.',
  },
  family: {
    title: 'Current Plan: Family',
    description:
      'Manage up to five profiles with unlimited AI-powered features. You are on the highest plan.',
  },
};

const SubscriptionPlanPanel: React.FC<SubscriptionPlanPanelProps> = ({ 
  currentPlanKey, 
  region, 
  onSubscribe,
  initialExpanded = false
}) => {
  const [loading, setLoading] = useState<PlanKey | null>(null);
  const [showPlans, setShowPlans] = useState(initialExpanded);
  const summary = PLAN_SUMMARY[currentPlanKey];
  const isOnTopPlan = currentPlanKey === 'family'; 
  
  // Determine if we should show the free plan message
  const showFreePlanBlock = currentPlanKey === 'free';
  
  // Get all available plans for this region
  const normalizedRegion = normalizeRegion(region);
  const plans = PRICING[normalizedRegion].plans;
  
  // Define which plans to show (exclude free and current plan)
  const plansToShow: PlanKey[] = ['single', 'family'].filter(plan => 
    plan !== currentPlanKey && plan !== 'free'
  );
  
  // Log debug information
  useEffect(() => {
    console.log('SubscriptionPlanPanel initialized:', {
      currentPlanKey,
      region: normalizedRegion,
      showPlans,
      plansToShow,
      initialExpanded
    });
  }, []);
  
  const handleSubscribeClick = async (planKey: PlanKey) => {
    try {
      console.log('Subscribing to plan:', planKey);
      setLoading(planKey);
      await handleSubscription(planKey);
      onSubscribe(planKey);
    } catch (error) {
      console.error('Subscription error:', error);
      alert(`Subscription error: ${(error as Error).message}`);
    } finally {
      setLoading(null);
    }
  };

  const toggleShowPlans = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent any form submission
    e.stopPropagation(); // Prevent event bubbling
    console.log('Toggling plans visibility from', showPlans, 'to', !showPlans);
    setShowPlans(prev => !prev);
  };

  return (
    <div className={`bg-white shadow-sm rounded-xl p-6 mb-4 ${!showFreePlanBlock ? 'hidden' : ''}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold mb-1">{summary.title}</h3>
          <p className="text-gray-600">{summary.description}</p>
        </div>
        
        <button
          type="button"
          onClick={toggleShowPlans}
          className={`flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md 
            ${showPlans 
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
              : 'bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white'
            } transition-colors duration-200`}
        >
          {showPlans ? (
            <>
              <ChevronUp className="h-4 w-4 mr-2" />
              Hide Plans
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-2" />
              View Plans
            </>
          )}
        </button>
      </div>
      
      {showPlans && !isOnTopPlan && plansToShow.length > 0 && (
        <div className="mt-6 animate-fade-down">
          <div className="space-y-4">
            <h4 className="text-base font-medium text-gray-700">Available Plans</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plansToShow.map(planKey => {
                const plan = plans[planKey];
                return (
                  <div 
                    key={planKey}
                    className="p-4 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex flex-col h-full justify-between">
                      <div>
                        <h5 className="text-lg font-medium text-teal-600 mb-1">{plan.title}</h5>
                        <p className="text-sm text-gray-600 mb-3">{plan.description}</p>
                        <div className="text-xl font-bold text-teal-600 mb-2">
                          {plan.priceDisplay}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-md shadow-sm transition-colors"
                        onClick={() => handleSubscribeClick(planKey)}
                        disabled={loading !== null}
                      >
                        {loading === planKey ? (
                          <span className="flex items-center justify-center">
                            <Loader className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </span>
                        ) : (
                          `Subscribe to ${plan.title}`
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      
      {showPlans && isOnTopPlan && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">
            You're currently on the highest available plan with full access to all features.
          </p>
        </div>
      )}
    </div>
  );
};

export default SubscriptionPlanPanel;