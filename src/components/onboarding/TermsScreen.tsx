import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';

interface TermsScreenProps {
  onContinue: () => void;
}

export default function TermsScreen({ onContinue }: TermsScreenProps) {
  const { state, updateAccount } = useOnboarding();
  const [accepted, setAccepted] = useState<boolean>(!!state.account.termsAccepted);
  const [error, setError] = useState<string | null>(null);
  
  // Synchronize with context state when it changes
  useEffect(() => {
    setAccepted(!!state.account.termsAccepted);
  }, [state.account.termsAccepted]);

  // Handle checkbox change - simple and direct approach
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    
    // Update local state first for responsive UI
    setAccepted(isChecked);
    
    // Then update context
    updateAccount({ termsAccepted: isChecked });
    
    // Clear error if accepting terms
    if (isChecked) {
      setError(null);
    }
  };
  
  // Handle continue button click
  const handleContinue = () => {
    if (!accepted) {
      setError("You must accept the terms and conditions to continue");
      return;
    }
    
    // Double-check that context state is updated
    if (!state.account.termsAccepted) {
      updateAccount({ termsAccepted: true });
      
      // Continue with a small delay
      setTimeout(onContinue, 50);
    } else {
      // Continue immediately
      onContinue();
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-6 animate-fade-down">
      <h2 className="text-3xl font-semibold font-heading text-heading-h2 mb-6 text-center">
        Terms and Conditions
      </h2>
      
      <div className="bg-white shadow-sm rounded-xl p-6">
        <div className="w-full max-h-64 overflow-y-auto mb-6 border border-gray-200 rounded-md p-4 bg-gray-50">
          <div className="text-sm text-gray-600">
            <h3 className="font-medium text-gray-900 mb-2">Terms and Conditions</h3>

            <p className="mb-4">
              MiKare is a platform designed to help individuals and families manage their health journey, including tracking
              symptoms, medications, appointments, and relevant information. The platform may provide suggestions or prompts,
              but these are not medical advice. You should always consult a qualified healthcare professional before making
              any medical decisions.
            </p>

            <p className="mb-4">
              Your data remains your property. You have the right to export or permanently delete your data at any time.
              We will never sell your personal or health information, and we only use your data to provide you with the
              services offered by MiKare.
            </p>

            <p className="mb-4">
              If your subscription ends, your account will be placed into read-only mode for 30 days. During this period, you
              may export your data. After the 30-day grace period, your data will be permanently deleted from our systems.
            </p>

            <p className="mb-4">
              You are responsible for the accuracy of the information you enter. Misuse of the platform or attempts to
              interfere with its operation may result in suspension or termination of your account.
            </p>

            <p className="mb-4">
              MiKare is a software-as-a-service (SaaS) platform and is provided "as is" without warranty. While we make every
              effort to provide a secure and reliable service, we are not liable for any losses or damages arising from the
              use of the platform, including outages, data loss, or actions taken based on automated suggestions.
            </p>

            <p>
              By creating an account, you agree to these terms and our privacy practices. If you do not agree, please do not
              use the MiKare platform.
            </p>
          </div>
        </div>
        
        <div className="mb-6">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="accept-terms"
                name="accept-terms"
                type="checkbox"
                checked={accepted}
                onChange={handleCheckboxChange}
                className="h-5 w-5 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
            </div>
            <label htmlFor="accept-terms" className="ml-3 text-sm font-medium text-gray-700">
              I accept the Terms and Conditions
            </label>
          </div>
          
          {error && (
            <div className="rounded-md bg-red-50 p-4 mt-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3 text-sm text-red-600">{error}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
