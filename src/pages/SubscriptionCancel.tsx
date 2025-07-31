import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { tokens } from '../styles/tokens';
import { X } from 'lucide-react';

export default function SubscriptionCancel() {
  const navigate = useNavigate();
  
  return (
    <Layout title="Subscription Cancelled">
      <div className="max-w-2xl mx-auto">
        <div className={`${tokens.components.card.base} text-center p-8`}>
          <div className="mx-auto bg-amber-100 rounded-full w-16 h-16 flex items-center justify-center mb-6">
            <X className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className={`${tokens.typography.sizes.h2} mb-4`}>Subscription Cancelled</h2>
          <p className="text-gray-600 mb-6">
            Your subscription process was cancelled. No charges have been made to your account.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/')}
              className={tokens.components.button.primary}
            >
              Return to Dashboard
            </button>
            <button
              onClick={() => navigate('/settings')}
              className={tokens.components.button.secondary}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}