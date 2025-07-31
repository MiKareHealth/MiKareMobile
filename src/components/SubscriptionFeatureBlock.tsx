import React, { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription';
import { usePatients } from '../contexts/PatientsContext';

interface SubscriptionFeatureBlockProps {
  children: ReactNode;
  isBlocked?: boolean;
  forceBlock?: boolean;
  featureName?: string;
  upgradeLink?: boolean;
  blockContent?: boolean;
}

/**
 * A component that wraps features that might be blocked based on subscription plans.
 * Automatically checks subscription status or accepts an override via props.
 * 
 * @param children - The content to render
 * @param isBlocked - Explicitly set whether the feature is blocked (overrides hook)
 * @param forceBlock - Force block regardless of subscription status
 * @param featureName - Name of the feature for display in tooltips
 * @param upgradeLink - Whether to include a link to upgrade
 * @param blockContent - Whether to completely block content (default: false, shows content in view-only mode)
 */
export default function SubscriptionFeatureBlock({
  children,
  isBlocked: isBlockedProp,
  forceBlock = false,
  featureName = 'This feature',
  upgradeLink = true,
  blockContent = false
}: SubscriptionFeatureBlockProps) {
  // Use the subscription hook to determine if user is on free plan
  const { isFreePlan } = useSubscription();
  
  // Feature is blocked if explicitly passed as blocked or if on free plan and not explicitly unblocked
  const isBlocked = forceBlock || (isBlockedProp !== undefined ? isBlockedProp : isFreePlan);
  
  // If not blocked or it's just a button/control, render normally
  if (!isBlocked) {
    return <>{children}</>;
  }
  
  // If this is content that should be blocked entirely, render nothing
  if (blockContent) {
    return null;
  }
  
  // For interactive elements like buttons, render with disabled state
  if (React.isValidElement(children) && 
      (children.type === 'button' || 
       (typeof children.type === 'function' && children.props.onClick))) {
    return (
      <div className="relative group">
        {/* Wrapper with grayed-out effect */}
        <div className="opacity-40 pointer-events-none filter grayscale">
          {children}
        </div>
        
        {/* Small lock icon indicator */}
        <div className="absolute top-1 right-1 bg-gray-200 rounded-full p-1">
          <Lock className="h-3 w-3 text-gray-500" />
        </div>
      </div>
    );
  }
  
  // Otherwise, render the content (for display-only sections)
  return <>{children}</>;
}