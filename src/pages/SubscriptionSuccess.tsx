import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  const [showSuccess, setShowSuccess] = useState(false);
  
  useEffect(() => {
    // Show success message briefly, then redirect
    setShowSuccess(true);
    
    const timer = setTimeout(() => {
      navigate('/', { replace: true });
    }, 3000); // Redirect after 3 seconds
    
    return () => clearTimeout(timer);
  }, [navigate, sessionId]);
  
  if (!showSuccess) {
    return null;
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white shadow-lg rounded-xl p-8 max-w-md mx-4 text-center">
        <div className="mx-auto bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mb-6">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Thank You!</h2>
        <p className="text-gray-600 mb-6">
          Your subscription has been activated successfully. Welcome to MiKare!
        </p>
        <div className="flex justify-center">
          <button
            onClick={() => navigate('/', { replace: true })}
            className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-6 rounded-md transition-colors"
          >
            Return to MiKare
          </button>
        </div>
      </div>
    </div>
  );
}