import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingProvider } from '../contexts/OnboardingContext';
import OnboardingModal from '../components/onboarding/OnboardingModal';
import { supabase } from '../lib/supabase';
import { getSupabaseClient } from '../lib/supabaseClient';
import { error as logError } from '../utils/logger';
import { User, Camera, AlertCircle } from 'lucide-react';
import { MIKARE_HEART_LOGO } from '../config/branding';

export default function Onboarding() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check if we have onboarding data in sessionStorage (coming from signup)
      const hasOnboardingData = sessionStorage.getItem('mikare_onboarding_account') || 
                               sessionStorage.getItem('mikare_temp_password');
      
      if (session) {
        // User is authenticated
        // Check if user has completed onboarding
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboard_complete')
          .eq('id', session.user.id)
          .single();
          
        if (profile?.onboard_complete) {
          // If onboarding is complete, redirect to dashboard
          navigate('/');
        }
        // Otherwise, continue with onboarding
      } else if (!hasOnboardingData) {
        // If not authenticated AND no onboarding data, redirect to sign in
        // This means they didn't come from the signup page
        navigate('/signin');
      }
      // If they have onboarding data but aren't authenticated, let them continue
      // with the onboarding process
    };
    
    checkAuth();
  }, [navigate]);

  const handleCloseModal = () => {
    setShowModal(false);
    navigate('/signin'); // Redirect to sign in when modal is closed
  };

  const handleCompleteOnboarding = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const supabase = await getSupabaseClient();
      
      // Get the password and account data from session storage
      const password = sessionStorage.getItem('mikare_temp_password');
      const accountData = sessionStorage.getItem('mikare_onboarding_account');
      
      if (!password || !accountData) {
        throw new Error('Account information not found. Please try signing up again.');
      }
      
      const account = JSON.parse(accountData);
      
      // Create user account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: account.email,
        password: password,
        options: {
          data: {
            full_name: account.fullName,
            region: account.region
          }
        }
      });
      
      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Failed to create account');
      
      // Update user profile with settings
      // @ts-ignore: supabase may be null at runtime, but we check above
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: account.fullName,
          timezone: account.timezone || 'UTC',
          time_format: account.timeFormat || '24h',
          preferred_session_length: account.sessionTimeout || 30,
          onboard_complete: true,
          subscription_plan: 'MiKare Health - free plan',
          subscription_status: 'inactive',
          region: account.region || 'USD'
        })
        .eq('id', authData.user.id);
        
      if (profileError) throw profileError;
      
      // Clear temporary data
      sessionStorage.removeItem('mikare_temp_password');
      sessionStorage.removeItem('mikare_onboarding_account');
      sessionStorage.removeItem('mikare_onboarding_settings');
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      logError('Error completing onboarding:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <OnboardingProvider>
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
        
        <main className="flex-1 container mx-auto px-4 py-10 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-semibold text-teal-700 mb-6">Welcome to MiKare</h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Your personal health companion that helps you manage your health journey with ease and control.
            </p>
            <button 
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-medium rounded-md shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
            >
              Continue Setup
            </button>
          </div>
        </main>
      </div>
      
      <OnboardingModal isOpen={showModal} onClose={handleCloseModal} />
    </OnboardingProvider>
  );
}