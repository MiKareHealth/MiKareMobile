import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import TermsScreen from './TermsScreen';
import PeopleDetails from './PeopleDetails';
import SettingsScreen from './SettingsScreen';
import MediaScreen from './MediaScreen';
import LoadingScreen from './LoadingScreen';
import { getSupabaseClient, getCurrentRegion, switchToRegion } from '../../lib/supabaseClient';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const { state, nextStep, prevStep, reset, setError, setSubmitting } = useOnboarding();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleExit = () => {
    // Clear session storage
    sessionStorage.removeItem('mikare_temp_password');
    sessionStorage.removeItem('mikare_onboarding_account');
    sessionStorage.removeItem('mikare_onboarding_profiles');
    sessionStorage.removeItem('mikare_onboarding_settings');
    sessionStorage.removeItem('onboardingState');
    
    // Reset onboarding state
    reset();
    
    // Close modal
    onClose();
  };

  const handleCompleteOnboarding = async () => {
    setIsLoading(true);
    setSubmitting(true);
    setError(null);
    
    // Simulate minimum loading time for UX
    const minLoadingTime = new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
      // Get the password and account data from session storage
      const password = sessionStorage.getItem('mikare_temp_password');
      const accountData = sessionStorage.getItem('mikare_onboarding_account');
      
      if (!password || !accountData) {
        throw new Error('Account information not found. Please try signing up again.');
      }
      
      const account = JSON.parse(accountData);
      
      // Enhanced debug logs
      console.log('Account data from session storage:', account);
      console.log('Email being used for signup:', account.email);
      console.log('Region being used:', account.region);
      console.log('Full account data:', JSON.stringify(account, null, 2));
      
      // Ensure we're using the correct region's Supabase client
      let supabase = await getSupabaseClient();
      
      // Verify we're in the correct region
      const currentRegion = getCurrentRegion();
      console.log('Current region before switch:', currentRegion);
      console.log('Target region:', account.region);
      
      if (currentRegion !== account.region) {
        console.log('Switching to region:', account.region);
        // Switch to the correct region and wait for it to complete
        supabase = await switchToRegion(account.region);
        // Wait a moment to ensure the switch is complete
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log('Region switch completed');
      }
      
      // 1. Sign up the user
      console.log('Attempting to sign up user with email:', account.email, 'in region:', account.region);
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: account.email,
        password: password,
        options: {
          data: {
            full_name: account.fullName,
            region: account.region // Store the region in user metadata
          }
        }
      });
      
      if (signUpError) {
        console.error('Sign up error details:', {
          message: signUpError.message,
          status: signUpError.status,
          name: signUpError.name,
          email: account.email,
          region: account.region
        });
        throw signUpError;
      }
      if (!authData.user) {
        console.error('No user data returned from signup');
        throw new Error('Failed to create account');
      }
      
      console.log('User created successfully:', authData.user.id);
      
      const userId = authData.user.id;
      
      // 2. Update user profile with settings
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: account.fullName,
          timezone: state.settings.timezone,
          time_format: state.settings.timeFormat,
          preferred_session_length: state.settings.sessionTimeout,
          onboard_complete: true,
          subscription_plan: 'MiKare Health - free plan',
          subscription_status: 'inactive'
        })
        .eq('id', userId);
        
      if (profileError) throw profileError;
      
      // 3. Create patients for each profile
      for (const profile of state.profiles) {
        if (!profile.fullName) continue; // Skip empty profiles
        
        const { error: patientError } = await supabase
          .from('patients')
          .insert([{
            user_id: userId,
            full_name: profile.fullName,
            relationship: profile.relationship || 'Not specified',
            dob: profile.dob || new Date().toISOString().split('T')[0],
            gender: profile.gender || 'Other',
            country: 'Not specified',  // Default values for required fields
            address: 'Not specified',
            phone_number: 'Not specified'
          }]);
          
        if (patientError) throw patientError;
      }
      
      // 4. Sign in the user automatically
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: password
      });
      
      if (signInError) throw signInError;
      
      // Wait for minimum loading time
      await minLoadingTime;
      
      // Clear session storage
      sessionStorage.removeItem('mikare_temp_password');
      sessionStorage.removeItem('mikare_onboarding_account');
      
      // Navigate to dashboard
      navigate('/');
      
    } catch (err) {
      console.error('Onboarding error:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
      setSubmitting(false);
    }
  };
  
  // If loading screen is showing, render it
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
        <div className="relative w-full max-w-4xl mx-auto">
          <LoadingScreen onLoadingComplete={() => {
            setIsLoading(false);
            // Redirect to dashboard instead of signin
            navigate('/');
          }} />
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl h-[90vh] mx-auto bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Close button - positioned above everything else */}
        <div className="absolute top-2 right-2 z-[200]">
          <button 
            onClick={handleExit}
            className="p-2 rounded-full bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-colors shadow-lg"
            aria-label="Close onboarding"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Progress bar */}
        <div className="sticky top-0 left-0 right-0 z-50 pt-6 px-6 pb-2 bg-white border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-teal-700">Onboarding Progress</span>
            <span className="text-sm font-medium text-teal-700">{Math.min(100, (state.stepIndex + 1) * 25)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-gradient-to-r from-teal-500 to-teal-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (state.stepIndex + 1) * 25)}%` }}
            ></div>
          </div>
        </div>
        
        {/* Onboarding content */}
        <div className="px-6 py-6 overflow-y-auto" style={{ height: 'calc(90vh - 140px)' }}>
          {state.stepIndex === 0 && <TermsScreen onContinue={() => state.account.termsAccepted && nextStep()} />}
          {state.stepIndex === 1 && <PeopleDetails onNext={nextStep} onBack={prevStep} />}
          {state.stepIndex === 2 && <SettingsScreen onNext={nextStep} onBack={prevStep} />}
          {state.stepIndex === 3 && <MediaScreen onComplete={handleCompleteOnboarding} onBack={prevStep} />}
        </div>
        
        {/* Footer for navigation buttons - only show if not on first or last screen */}
        {state.stepIndex !== 0 && state.stepIndex !== 3 && (
          <div className="sticky bottom-0 left-0 right-0 px-6 py-4 bg-white border-t shadow-lg">
            <div className="flex justify-between">
              <button
                type="button"
                onClick={prevStep}
                className="px-6 py-3 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                Back
              </button>
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                Next
              </button>
            </div>
          </div>
        )}
        
        {/* Custom footer for Terms screen */}
        {state.stepIndex === 0 && (
          <div className="sticky bottom-0 left-0 right-0 px-6 py-4 bg-white border-t shadow-lg">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => state.account.termsAccepted && nextStep()}
                disabled={!state.account.termsAccepted}
                className="px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}
        
        {/* Custom footer for Media screen */}
        {state.stepIndex === 3 && (
          <div className="sticky bottom-0 left-0 right-0 px-6 py-4 bg-white border-t shadow-lg">
            <div className="flex justify-between">
              <button
                type="button"
                onClick={prevStep}
                className="px-6 py-3 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCompleteOnboarding}
                disabled={state.submitting}
                className="px-8 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {state.submitting ? 'Preparing Your Account...' : 'Get Started'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
