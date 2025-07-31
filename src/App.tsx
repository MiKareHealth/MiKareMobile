import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { getSupabaseClient, getCurrentRegion, initializeSupabase, setGlobalSupabaseInstance } from './lib/supabaseClient';
import { log, error } from './utils/logger';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import AddPatient from './pages/AddPatient';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import PatientDetails from './pages/PatientDetails/index';
import ResetPassword from './pages/ResetPassword';
import { UserPreferencesProvider } from './contexts/UserPreferencesContext';
import { SessionProvider } from './contexts/SessionTimeoutContext';
import { OnboardingProvider } from './contexts/OnboardingContext';
import { SplashProvider } from './contexts/SplashContext';
import FirstTimeSplash from './components/FirstTimeSplash';
import { useSplash } from './contexts/SplashContext';
import { MIKARE_HEART_LOGO } from './config/branding';
import { PatientsProvider } from './contexts/PatientsContext';
import SubscriptionSuccess from './pages/SubscriptionSuccess';
import SubscriptionCancel from './pages/SubscriptionCancel';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabaseClient, setSupabaseClient] = useState<any>(null);
  const { setShowSplash } = useSplash();

  useEffect(() => {
    // Initialize Supabase client and check session
    const initializeAndCheckSession = async () => {
      try {
        log("Initializing Supabase client for authentication...");
        const client = await getSupabaseClient();
        setSupabaseClient(client);
        
        log("Checking for existing session...");
        const { data, error: sessionError } = await client.auth.getSession();
        
        if (sessionError) {
          error("Error getting session:", sessionError);
          setUser(null);
          setLoading(false);
          return;
        }
        
        if (data?.session) {
          log("Found existing session for user:", data.session.user.email);
          setUser(data.session.user);
          
          // Initialize session timeout tracking
          const { data: profileData, error: profileError } = await client
            .from('profiles')
            .select('preferred_session_length')
            .eq('id', data.session.user.id)
            .single();
            
            let sessionLength = 30; // Default
            
            if (profileError) {
              console.error('Error fetching profile for session length:', profileError);
              
              // If no profile exists, try to create one
              if (profileError.code === 'PGRST116') {
                try {
                  const { error: insertError } = await client
                    .from('profiles')
                    .insert({
                      id: data.session.user.id,
                      username: data.session.user.email,
                      full_name: data.session.user.user_metadata?.full_name || '',
                      avatar_url: data.session.user.user_metadata?.avatar_url || '',
                      preferred_session_length: 30
                    });
                  
                  if (insertError) {
                    console.error('Error creating profile:', insertError);
                  }
                } catch (createError) {
                  console.error('Error creating profile:', createError);
                }
              }
            } else if (profileData) {
              sessionLength = profileData.preferred_session_length || 30;
            }
            
            const region = getCurrentRegion() || 'USA'; // Get from supabaseClient, not from profiles
            
            // Store session information in localStorage
            localStorage.setItem('sessionStart', Date.now().toString());
            localStorage.setItem('sessionLength', sessionLength.toString());
            localStorage.setItem('region', region); // Store the region
          } else {
            log("No active session found");
            setUser(null);
            // Clear session data on page load if no session is found
            localStorage.removeItem('sessionStart');
            localStorage.removeItem('sessionLength');
            localStorage.removeItem('region');
          }
          
          setLoading(false);
        } catch (err) {
          error("Unexpected error during initialization:", err);
          setUser(null);
          setLoading(false);
        }
    };

    initializeAndCheckSession();
  }, []);

  useEffect(() => {
    if (!supabaseClient) return;

    // Set up auth state change listener
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(async (event: string, session: any) => {
      log('Auth state changed:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        log('User signed in:', session.user.email);
        setUser(session.user);
        
        // Update last login timestamp (non-blocking)
        supabaseClient
          .from('profiles')
          .update({ last_login: new Date().toISOString() })
          .eq('id', session.user.id)
          .then(() => {
            log('Last login timestamp updated');
          })
          .catch((err: any) => {
            error('Failed to update last login timestamp (non-blocking):', err);
          });
          
        // Set session start time
        localStorage.setItem('sessionStart', Date.now().toString());
        
        // Get user's preferred session length and region
        supabaseClient
          .from('profiles')
          .select('preferred_session_length')
          .eq('id', session.user.id)
          .single()
          .then(({ data, error }: any) => {
            let sessionLength = 30; // Default
            
            if (error) {
              console.error('Error fetching profile data:', error);
              
              // If no profile exists, try to create one
              if (error.code === 'PGRST116') {
                supabaseClient
                  .from('profiles')
                  .insert({
                    id: session.user.id,
                    username: session.user.email,
                    full_name: session.user.user_metadata?.full_name || '',
                    avatar_url: session.user.user_metadata?.avatar_url || '',
                    preferred_session_length: 30
                  })
                  .then(({ error: insertError }: any) => {
                    if (insertError) {
                      console.error('Error creating profile:', insertError);
                    }
                  })
                  .catch((createError: any) => {
                    console.error('Error creating profile:', createError);
                  });
              }
            } else if (data) {
              sessionLength = data.preferred_session_length || 30;
            }
            
            const region = getCurrentRegion() || 'USA'; // Get from supabaseClient, not from profiles
            localStorage.setItem('sessionLength', sessionLength.toString());
            localStorage.setItem('region', region); // Store the region
          })
      } else if (event === 'SIGNED_OUT') {
        // Just clear the user - don't call signOut() again to avoid loops
        log('User signed out');
        setUser(null);
        
        // Clear session tracking
        localStorage.removeItem('sessionStart');
        localStorage.removeItem('sessionLength');
        localStorage.removeItem('region'); // Clear the region
      } else if (event === 'TOKEN_REFRESHED') {
        log('Token refreshed');
      } else if (event === 'USER_UPDATED') {
        log('User updated');
        setUser(session?.user || null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabaseClient]);

  // Handle visibility change to reset session when page is closed
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Reset session when page is closed
        localStorage.removeItem('sessionStart');
        localStorage.removeItem('sessionLength');
        localStorage.removeItem('region');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Show a loading spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing secure connection...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  const { showSplash, setShowSplash, tutorialPages } = useSplash();

  return (
    <>
      <Router>
        <Routes>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/subscription-success" element={<SubscriptionSuccess />} />
          <Route path="/subscription-cancel" element={<SubscriptionCancel />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <SessionProvider>
                  <Dashboard />
                </SessionProvider>
              </PrivateRoute>
            }
          />
          <Route
            path="/add-patient"
            element={
              <PrivateRoute>
                <SessionProvider>
                  <AddPatient />
                </SessionProvider>
              </PrivateRoute>
            }
          />
          <Route
            path="/patient/:id"
            element={
              <PrivateRoute>
                <SessionProvider>
                  <PatientDetails />
                </SessionProvider>
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <SessionProvider>
                  <Profile />
                </SessionProvider>
              </PrivateRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <SessionProvider>
                  <Settings />
                </SessionProvider>
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>

      {/* First-time splash modal */}
      {showSplash && (
        <FirstTimeSplash 
          pages={tutorialPages}
          onClose={() => setShowSplash(false)}
        />
      )}
    </>
  );
}

function App() {
  const [regionInitialized, setRegionInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [forceRender, setForceRender] = useState(false);
  const [pendingInit, setPendingInit] = useState(true);

  useEffect(() => {
    let didFinish = false;
    // Initialize the multi-region Supabase system first
    const initializeRegionSystem = async () => {
      try {
        log("Initializing multi-region Supabase system...");
        const client = await initializeSupabase();
        // Ensure the global instance is set
        setGlobalSupabaseInstance(client);
        const currentRegion = getCurrentRegion() || 'USA';
        log("Region system initialized successfully. Current region:", currentRegion);
        
        // Ensure the detected region is stored in localStorage for consistency
        if (!localStorage.getItem('mikare_selected_region')) {
          localStorage.setItem('mikare_selected_region', currentRegion);
        }
        
        didFinish = true;
        setRegionInitialized(true);
        setPendingInit(false);
      } catch (err) {
        console.error("Failed to initialize region system:", err);
        setInitError((err as Error).message);
        // Continue anyway with fallback to allow manual region selection
        didFinish = true;
        setRegionInitialized(true);
        setPendingInit(false);
      }
    };

    initializeRegionSystem();

    // Cap loading at 2 seconds
    const timeout = setTimeout(() => {
      if (!didFinish) {
        setForceRender(true);
        setPendingInit(true); // still pending
      }
    }, 2000);

    return () => clearTimeout(timeout);
  }, []);

  // Show initialization loading (block UI) only for the first 2 seconds
  if (!regionInitialized && !forceRender) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <img 
            src={MIKARE_HEART_LOGO}
            alt="MiKare" 
            className="h-16 mx-auto mb-6" 
          />
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Initializing secure connection...</p>
          <p className="text-sm text-gray-500 mt-2">Detecting optimal data region</p>
          {initError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-left">
              <p className="text-sm text-red-800 font-medium">Initialization Warning:</p>
              <p className="text-xs text-red-600 mt-1">{initError}</p>
              <p className="text-xs text-red-600 mt-2">Continuing with fallback configuration...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <PatientsProvider>
      <UserPreferencesProvider>
        <OnboardingProvider>
          <SplashProvider>
            {/* Show a non-blocking banner if region is still initializing in background */}
            {pendingInit && (
              <div className="fixed top-0 left-0 w-full z-50 flex justify-center animate-fade-down">
                <div className="bg-white shadow-md rounded-b-xl px-6 py-3 flex items-center gap-3 border-b border-teal-100">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-teal-600"></div>
                  <span className="text-gray-700 text-sm font-medium">Finalizing secure connection...</span>
                </div>
              </div>
            )}
            <AppContent />
          </SplashProvider>
        </OnboardingProvider>
      </UserPreferencesProvider>
    </PatientsProvider>
  );
}

export default App;