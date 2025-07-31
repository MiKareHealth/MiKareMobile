import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';

interface AccountDetailsProps {
  onNext: () => void;
}

export default function AccountDetails({ onNext }: AccountDetailsProps) {
  const { state, updateAccount } = useOnboarding();
  const [formData, setFormData] = useState({
    fullName: state.account.fullName || '',
    email: state.account.email || ''
  });
  
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
  }>({});

  // Load account data from sessionStorage on mount
  useEffect(() => {
    try {
      const savedAccount = sessionStorage.getItem('mikare_onboarding_account');
      if (savedAccount) {
        const parsedAccount = JSON.parse(savedAccount);
        
        // Initialize form state from either context or session storage
        setFormData({
          fullName: state.account.fullName || parsedAccount.fullName || '',
          email: state.account.email || parsedAccount.email || ''
        });
        
        // Update context if needed
        if (!state.account.fullName && !state.account.email) {
          updateAccount({
            fullName: parsedAccount.fullName || '',
            email: parsedAccount.email || ''
          });
        }
      }
    } catch (err) {
      console.error('Failed to load account details from sessionStorage:', err);
    }
  }, [state.account.fullName, state.account.email, updateAccount]);

  // Save to sessionStorage whenever form data changes
  useEffect(() => {
    try {
      sessionStorage.setItem('mikare_onboarding_account', JSON.stringify(formData));
    } catch (err) {
      console.error('Failed to save account to sessionStorage:', err);
    }
  }, [formData]);

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Update local form state
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name as keyof typeof errors];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Update context with form data
      updateAccount({
        fullName: formData.fullName,
        email: formData.email
      });
      
      // Save to sessionStorage for redundancy
      try {
        sessionStorage.setItem('mikare_onboarding_account', JSON.stringify(formData));
      } catch (err) {
        console.error('Failed to save account to sessionStorage:', err);
      }
      
      // Proceed to next step
      onNext();
    }
  };

  return (
    <div className="max-w-lg mx-auto px-6 py-6 animate-fade-down">
      <h2 className="text-3xl font-semibold font-heading text-heading-h2 mb-6 text-center">
        Account Confirmation
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
            Full Name
          </label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            className={`mt-1 block w-full rounded-md border ${
              errors.fullName ? 'border-red-300' : 'border-gray-300'
            } px-4 py-3 text-base focus:outline-none focus:ring-2 ${
              errors.fullName ? 'focus:ring-red-500' : 'focus:ring-teal-500'
            }`}
          />
          {errors.fullName && (
            <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`mt-1 block w-full rounded-md border ${
              errors.email ? 'border-red-300' : 'border-gray-300'
            } px-4 py-3 text-base focus:outline-none focus:ring-2 ${
              errors.email ? 'focus:ring-red-500' : 'focus:ring-teal-500'
            }`}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>
        
        {state.error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3 text-sm text-red-600">
                {state.error}
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-8">
          <button
            type="submit"
            className="w-full flex justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
          >
            Next
          </button>
        </div>
      </form>
    </div>
  );
}