import React, { useState } from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import TermsScreen from './TermsScreen';
import AccountDetails from './AccountDetails';
import PeopleDetails from './PeopleDetails';
import SettingsScreen from './SettingsScreen';
import MediaScreen from './MediaScreen';
import LoadingScreen from './LoadingScreen';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { MIKARE_HEART_LOGO } from '../../config/branding';

export default function OnboardingLayout() {
  const { state, nextStep, prevStep, reset, setError, setSubmitting } = useOnboarding();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleCompleteOnboarding = async () => {
    setIsLoading(true);
    setSubmitting(true);
    setError(null);
    
    // Simulate minimum loading time for UX
    const minLoadingTime = new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
      const supabase = await getSupabaseClient();
      // Get the password from session storage
      const password = sessionStorage.getItem('mikare_temp_password');
      
      if (!password) {
        throw new Error('Password not found. Please try signing up again.');
      }
      
      // 1. Sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: state.account.email,
        password: password,
        options: {
          data: {
            full_name: state.account.fullName
          }
        }
      });
      
      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Failed to create account');
      
      const userId = authData.user.id;
      
      // 2. Update user profile with settings
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: state.account.fullName,
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
        email: state.account.email,
        password: password
      });
      
      if (signInError) throw signInError;
      
      // Clean up sensitive data
      sessionStorage.removeItem('mikare_temp_password');
      sessionStorage.removeItem('mikare_onboarding_account');
      sessionStorage.removeItem('onboardingState');
      
      // Wait for minimum loading time
      await minLoadingTime;
      
      // Reset onboarding state
      reset();
      
      // Redirect to dashboard
      navigate('/');
      
    } catch (error) {
      console.error('Onboarding error:', error);
      setError((error as Error).message);
      setSubmitting(false);
      setIsLoading(false);
    }
  };
  
  // If loading screen is showing, render it
  if (isLoading) {
    return <LoadingScreen onLoadingComplete={() => {
      setIsLoading(false);
      // Redirect to dashboard instead of signin
      navigate('/');
    }} />;
  }
  
  // Otherwise render the current step
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="py-6 bg-gradient-to-r from-teal-600 to-teal-700 shadow-md">
        <div className="container mx-auto px-4 flex justify-center">
          <img 
            src={MIKARE_HEART_LOGO}
            alt="MiKare" 
            className="h-12" 
          />
        </div>
      </header>
      
      <main className="flex-1 container mx-auto px-4 py-10">
        <div className="max-w-4xl mx-auto">
          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-teal-700">Onboarding Progress</span>
              <span className="text-sm font-medium text-teal-700">{Math.min(100, (state.stepIndex + 1) * 20)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-gradient-to-r from-teal-500 to-teal-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (state.stepIndex + 1) * 20)}%` }}
              ></div>
            </div>
          </div>
          
          {/* Current step */}
          {state.stepIndex === 0 && <TermsScreen onContinue={() => state.account.termsAccepted && nextStep()} />}
          {state.stepIndex === 1 && <AccountDetails onNext={nextStep} />}
          {state.stepIndex === 2 && <PeopleDetails onNext={nextStep} onBack={prevStep} />}
          {state.stepIndex === 3 && <SettingsScreen onNext={nextStep} onBack={prevStep} />}
          {state.stepIndex === 4 && <MediaScreen onComplete={handleCompleteOnboarding} onBack={prevStep} />}
        </div>
      </main>
    </div>
  );
}