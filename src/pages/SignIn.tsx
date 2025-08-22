import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Lock, CheckCircle } from 'lucide-react';
import { tokens, theme } from '../styles/tokens';
import { themeClasses } from '../styles/themeUtils';
import { getSupabaseClient, switchToRegion, getCurrentRegion } from '../lib/supabaseClient';
import { log, error as logError, warn } from '../utils/logger';
import RegionSelector from '../components/RegionSelector';
import { Region, setUserRegion } from '../lib/regionDetection';
import { SIGNIN_IMAGE, SIGNIN_VIDEO, MIKARE_LOGO } from '../config/branding';
import { logLoginEvent } from '../utils/auditUtils';
import { logPasswordResetAttemptEvent } from '../utils/auditUtils';
import { getLockoutState, incrementFailedAttempts, clearLockout, clearLockoutOnNavigation, formatLockoutTime } from '../utils/securityUtils';

// Forgot Password Modal Component
const ForgotPasswordModal = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSuccess: () => void; 
}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const client = await getSupabaseClient();
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        // Log failed password reset attempt
        logPasswordResetAttemptEvent(email, false, client).catch((err) => {
          logError('Failed to log password reset attempt audit event:', err);
        });
        setMessage({ type: 'error', text: 'Failed to send reset email. Please try again.' });
      } else {
        // Log successful password reset attempt
        logPasswordResetAttemptEvent(email, true, client).catch((err) => {
          logError('Failed to log password reset attempt audit event:', err);
        });
        setMessage({ type: 'success', text: 'If that account exists, you\'ll receive a reset link.' });
        onSuccess();
      }
    } catch (err) {
      // Log failed password reset attempt
      logPasswordResetAttemptEvent(email, false).catch((err) => {
        logError('Failed to log password reset attempt audit event:', err);
      });
      setMessage({ type: 'error', text: 'An unexpected error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Reset Password</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <input
              ref={emailInputRef}
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-teal-500 focus:ring-2 focus:ring-teal-300"
              placeholder="Enter your email address"
              data-testid="reset-email"
            />
          </div>
          
          {message && (
            <div className={`rounded-md p-3 ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-700' 
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {message.text}
            </div>
          )}
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !email}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showDemoButton, setShowDemoButton] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<Region>('USA');
  
  // New state for attempt tracking and lockout
  const [lockoutState, setLockoutState] = useState(getLockoutState());
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  
  // Query parameter banners
  const [resetBanner, setResetBanner] = useState<{ type: 'success' | 'error' | 'expired'; message: string } | null>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  
  // Media loading states
  const [imageLoaded, setImageLoaded] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Handle query parameter banners
  useEffect(() => {
    const resetParam = searchParams.get('reset');
    
    if (resetParam === 'success') {
      setResetBanner({
        type: 'success',
        message: 'Your password was updated. Please sign in.'
      });
      // Clear the query parameter
      navigate('/signin', { replace: true });
    } else if (resetParam === 'error' || resetParam === 'expired') {
      setResetBanner({
        type: resetParam === 'expired' ? 'expired' : 'error',
        message: resetParam === 'expired' 
          ? 'Reset link has expired. Request a new link.'
          : 'Reset link invalid or expired. Request a new link.'
      });
      // Clear the query parameter
      navigate('/signin', { replace: true });
    }
  }, [searchParams, navigate]);

  // Focus banner when it appears for screen readers
  useEffect(() => {
    if (resetBanner && bannerRef.current) {
      bannerRef.current.focus();
    }
  }, [resetBanner]);

  // Load lockout state from localStorage on mount and refresh when page becomes visible
  useEffect(() => {
    const refreshLockoutState = () => {
      setLockoutState(getLockoutState());
    };

    // Refresh lockout state on mount
    refreshLockoutState();

    // Refresh lockout state when page becomes visible (user navigates back)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshLockoutState();
      }
    };

    // Refresh lockout state when window gains focus (user switches back to tab)
    const handleFocus = () => {
      refreshLockoutState();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Periodically refresh lockout state to update remaining time display
  useEffect(() => {
    if (lockoutState.isLocked) {
      const interval = setInterval(() => {
        const currentState = getLockoutState();
        setLockoutState(currentState);
        
        // If lockout has expired, clear the interval
        if (!currentState.isLocked) {
          clearInterval(interval);
        }
      }, 1000); // Update every second

      return () => clearInterval(interval);
    }
  }, [lockoutState.isLocked]);

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
    
    // Get the detected/selected region and ensure it's stored in localStorage
    const detectedRegion = getCurrentRegion() || 'USA';
    setSelectedRegion(detectedRegion);
    
    // Ensure the detected region is stored in localStorage for consistency
    if (!localStorage.getItem('mikare_selected_region')) {
      setUserRegion(detectedRegion);
    }
  }, []);

  // Add keyboard shortcut listener for Ctrl+Q
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'q') {
        e.preventDefault(); // Prevent default browser behavior
        setShowDemoButton(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Video loading management
  useEffect(() => {
    const videoElement = videoRef.current;
    
    if (videoElement && imageLoaded) {
      const handleLoadedData = () => {
        log('Video loaded successfully');
        setVideoLoaded(true);
      };

      const handleError = (errorEvent: Event) => {
        logError('Error loading video:', errorEvent);
        setVideoError(true);
      };

      videoElement.addEventListener('loadeddata', handleLoadedData);
      videoElement.addEventListener('error', handleError);
      
      // Start loading the video after image is loaded
      videoElement.load();
      
      // Clean up event listeners
      return () => {
        videoElement.removeEventListener('loadeddata', handleLoadedData);
        videoElement.removeEventListener('error', handleError);
      };
    }
  }, [imageLoaded]);

  const handleRegionChange = (region: Region) => {
    log('Region changed to:', region);
    setSelectedRegion(region);
    setUserRegion(region);
    // Only store the region but don't initialize a client
    // This prevents unintended login attempts
    setError(null); // Clear any previous errors when region changes
  };

  const incrementAttempts = () => {
    const newState = incrementFailedAttempts();
    setLockoutState(newState);
  };

  const resetAttempts = () => {
    clearLockout();
    setLockoutState(getLockoutState());
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (lockoutState.isLocked) {
      const remainingTime = formatLockoutTime(lockoutState.remainingLockoutTime);
      setError(`Account temporarily locked. Please try again in ${remainingTime} or reset your password.`);
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Now initialize the client for the selected region
      await switchToRegion(selectedRegion);
      
      // Get the client after the region switch
      const client = await getSupabaseClient();
      log("Attempting sign in with email:", email, "in region:", selectedRegion);
      
      const { data, error: signInError } = await client.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        logError("Supabase auth error details:", {
          message: signInError.message,
          status: signInError.status,
          name: signInError.name,
          error: signInError
        });
        
        // Increment attempts on any auth error
        incrementAttempts();
        
        // Provide neutral error message without revealing specific details
        if (lockoutState.attempts + 1 >= 3) {
          setError('Too many failed attempts. Account will be temporarily locked.');
        } else if (lockoutState.attempts + 1 === 2) {
          setError('Invalid email or password. Warning: one more failed attempt before account lockout.');
        } else {
          setError('Invalid email or password. Please try again.');
        }
        
        return;
      }
      
      log("Sign in successful, user data:", data);

      // Reset attempts on successful login
      resetAttempts();

      // Log login audit event (non-blocking) - use the same client instance
      console.log('🔍 SIGNIN: About to log login audit event for user:', data.user.id);
      console.log('🔍 SIGNIN: Client instance:', !!client);
      logLoginEvent(data.user.id, client).catch((err) => {
        console.error('🔍 SIGNIN: Failed to log login audit event:', err);
        logError('Failed to log login audit event:', err);
      });

      // Update user metadata with region if not present
      if (data.user && (!data.user.user_metadata.region || data.user.user_metadata.region !== selectedRegion)) {
        const { error: updateError } = await client.auth.updateUser({
          data: { region: selectedRegion }
        });
        
        if (updateError) {
          logError("Failed to update user metadata:", updateError);
        } else {
          log("Updated user metadata with region:", selectedRegion);
        }
      }

      // Save email in localStorage if remember me is checked
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      // Initialize session timeout tracking
      localStorage.setItem('sessionStart', Date.now().toString());
      
      // Get user's preferred session length if available
      if (data.user) {
        try {
          const { data: profileData } = await client
            .from('profiles')
            .select('preferred_session_length')
            .eq('id', data.user.id)
            .single();
            
          const sessionLength = profileData?.preferred_session_length || 30;
          localStorage.setItem('sessionLength', sessionLength.toString());
        } catch (err) {
          logError('Failed to get preferred session length:', err);
          localStorage.setItem('sessionLength', '30'); // Default to 30 minutes
        }
      } else {
        localStorage.setItem('sessionLength', '30'); // Default to 30 minutes
      }

      // Navigate to home page on success
      navigate('/');
    } catch (err) {
      logError('Sign in error:', err);
      incrementAttempts();
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    setDemoLoading(true);
    setError(null);

    try {
        // Switch to the selected region
        await switchToRegion(selectedRegion);

        // Get client after region switch
        const client = await getSupabaseClient();
        log("Attempting demo sign in in region:", selectedRegion);
        
        // Attempt demo login
        const { data, error: demoError } = await client.auth.signInWithPassword({
            email: 'demo@example.com',
            password: 'demo123'
        });
        
        if (demoError) {
            logError("Demo login error details:", {
                message: demoError.message,
                status: demoError.status,
                name: demoError.name,
                error: demoError
            });
            throw demoError;
        }
        
        log("Demo sign in successful, user data:", data);
        
        if (!data.session) {
            warn("Auth succeeded but no session was returned");
        }

        // Log demo login audit event (non-blocking) - use the same client instance
        console.log('🔍 DEMO SIGNIN: About to log demo login audit event for user:', data.user.id);
        console.log('🔍 DEMO SIGNIN: Client instance:', !!client);
        logLoginEvent(data.user.id, client).catch((err) => {
            console.error('🔍 DEMO SIGNIN: Failed to log demo login audit event:', err);
            logError('Failed to log demo login audit event:', err);
        });

        // Save demo email in localStorage if remember me is checked
        if (rememberMe) {
            localStorage.setItem('rememberedEmail', 'demo@example.com');
        } else {
            localStorage.removeItem('rememberedEmail');
        }
        
        // Initialize session timeout tracking
        localStorage.setItem('sessionStart', Date.now().toString());
        localStorage.setItem('sessionLength', '30'); // Default to 30 minutes for demo

        // Navigate to home page on success
        navigate('/');
    } catch (err) {
        logError('Demo sign in error:', err);
        setError((err as Error).message);
    } finally {
        setDemoLoading(false);
    }
  };

  const handleForgotPasswordSuccess = () => {
    setResetEmailSent(true);
    setTimeout(() => {
      setShowForgotPassword(false);
      setResetEmailSent(false);
    }, 3000);
  };

  // Clear lockout state when navigating away from auth pages
  useEffect(() => {
    const handleBeforeUnload = () => {
      clearLockout();
    };
    
    const handlePopState = () => {
      const currentPath = window.location.pathname;
      clearLockoutOnNavigation(currentPath);
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return (
    <>
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 sm:px-6 lg:px-8 animate-fade-down">
        <div className="card max-w-5xl w-full overflow-hidden shadow-md border border-gray-200">
          <div className="flex flex-col lg:flex-row">
            {/* Left side - Media - Hidden on mobile and tablet, only show on large screens */}
            <div className="hidden lg:block lg:w-1/2 flex items-center justify-center relative">
              {/* Main image - shows first */}
              <img
                src={SIGNIN_IMAGE}
                alt="MiKare Healthcare"
                className="w-full h-full object-cover object-center"
                onLoad={() => setImageLoaded(true)}
              />
              
              {/* Video - shows after image loads and video is ready */}
              {imageLoaded && (
                <video 
                  ref={videoRef}
                  src={SIGNIN_VIDEO}
                  muted
                  playsInline
                  loop
                  autoPlay
                  className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ${
                    videoLoaded && !videoError ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              )}
            </div>
            
            {/* Right side - Sign In Form - Full width on mobile/tablet, half width on large screens */}
            <div className="w-full lg:w-1/2 p-8">
              <div className="text-center mb-6">
                <img
                  src={MIKARE_LOGO}
                  alt="Mikare Logo"
                  className="h-16 mx-auto mb-4"
                />
                <h2 className="text-3xl font-bold font-heading text-heading-h2">
                  Sign in to your account
                </h2>
                <p className="mt-2 text-sm text-text-secondary">
                  Your data will be securely stored in the {selectedRegion === 'AU' ? 'Australia' : selectedRegion === 'UK' ? 'United Kingdom' : 'United States'} region
                </p>
              </div>
              
              <form className="space-y-6" onSubmit={handleSignIn}>
                {/* Reset Banner */}
                {resetBanner && (
                  <div
                    ref={bannerRef}
                    tabIndex={-1}
                    className={`rounded-md p-4 border shadow-sm ${
                      resetBanner.type === 'success'
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : resetBanner.type === 'expired'
                        ? 'bg-amber-50 border-amber-200 text-amber-700'
                        : 'bg-red-50 border-red-200 text-red-700'
                    }`}
                    role="alert"
                    aria-live="polite"
                  >
                    <div className="flex">
                      {resetBanner.type === 'success' ? (
                        <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                      )}
                      <div className="text-sm">
                        {resetBanner.message}
                        {resetBanner.type === 'expired' && (
                          <button
                            type="button"
                            onClick={() => setShowForgotPassword(true)}
                            className="ml-2 underline hover:no-underline"
                          >
                            Request new link
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1">
                    Email address
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 px-4 py-3 text-base transition-colors duration-200"
                      aria-label="Email address"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-1">
                    Password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={lockoutState.isLocked}
                      className={`block w-full rounded-md border-2 shadow-sm px-4 py-3 text-base transition-colors duration-200 ${
                        lockoutState.isLocked 
                          ? 'border-red-300 bg-gray-100 cursor-not-allowed' 
                          : 'border-gray-300 focus:border-teal-500 focus:ring-teal-500'
                      }`}
                      aria-label="Password"
                      data-testid="password-input"
                    />
                    {!lockoutState.isLocked && (
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-500 transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" aria-hidden="true" />
                        ) : (
                          <Eye className="h-5 w-5" aria-hidden="true" />
                        )}
                      </button>
                    )}
                    {lockoutState.isLocked && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <Lock className="h-5 w-5 text-red-400" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  
                  {/* Attempt warning */}
                  {lockoutState.attempts === 2 && !lockoutState.isLocked && (
                    <div className="mt-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-2">
                      <AlertCircle className="h-4 w-4 inline mr-1" />
                      Warning: one more failed attempt before account lockout.
                    </div>
                  )}
                  
                  {/* Lockout message */}
                  {lockoutState.isLocked && (
                    <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
                      <Lock className="h-4 w-4 inline mr-1" />
                      Account temporarily locked. Please try again in {formatLockoutTime(lockoutState.remainingLockoutTime)} or reset your password.
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="region" className="block text-sm font-medium text-text-primary mb-1">
                    Data Region
                  </label>
                  <div className="mt-1">
                    <RegionSelector 
                      onRegionChange={handleRegionChange}
                      currentRegion={selectedRegion}
                      className="w-full" 
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <button
                      id="remember-me-toggle"
                      type="button"
                      role="switch"
                      aria-checked={rememberMe}
                      onClick={() => setRememberMe(!rememberMe)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 ${
                        rememberMe 
                          ? 'border-teal-700 bg-gradient-to-r from-teal-500 to-teal-600 shadow-sm' 
                          : 'border-gray-300 bg-gray-200 shadow-inner'
                      } transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2`}
                    >
                      <span className="sr-only">Remember me</span>
                      <span
                        aria-hidden="true"
                        className={`${
                          rememberMe ? 'translate-x-5' : 'translate-x-0'
                        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                      />
                    </button>
                    <label htmlFor="remember-me-toggle" className="ml-2 block text-sm font-medium text-text-primary">
                      Remember me
                    </label>
                  </div>
                  
                  {/* Forgot Password Link */}
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>

                {error && (
                  <div className="rounded-md bg-red-50 p-4 border border-red-200 shadow-sm">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                      <div className="text-sm text-red-700">{error}</div>
                    </div>
                  </div>
                )}

                {resetEmailSent && (
                  <div className="rounded-md bg-green-50 p-4 border border-green-200 shadow-sm">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-green-400 mr-2" />
                      <div className="text-sm text-green-700">Check your inbox for a password reset link.</div>
                    </div>
                  </div>
                )}

                <div>
                  <button
                    type="submit"
                    disabled={loading || lockoutState.isLocked}
                    className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold py-3 px-4 rounded-md shadow-md hover:shadow-lg transition-all duration-200 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Signing in...' : lockoutState.isLocked ? 'Account Locked' : 'Sign in'}
                  </button>
                  <div className="mt-4">
                    {showDemoButton && (
                      <button
                        type="button"
                        onClick={handleDemoSignIn}
                        disabled={demoLoading}
                        className="w-full bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 text-gray-800 font-semibold py-3 px-4 rounded-md shadow-md hover:shadow-lg transition-all duration-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {demoLoading ? 'Loading demo...' : 'Try Demo Account'}
                      </button>
                    )}
                    <div className="text-sm text-center mt-4">
                      Don't have an account?{' '}
                      <Link 
                        to="/signup" 
                        className="font-medium text-teal-600 hover:text-teal-700 transition-colors"
                        onClick={() => {
                          // Don't clear lockout when navigating to signup
                          // The warning should persist between sign-in and sign-up
                        }}
                      >
                        Sign up
                      </Link>
                    </div>
                    <div className="text-xs text-center mt-2 text-gray-400">
                      version 1.2.40
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      
      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        onSuccess={handleForgotPasswordSuccess}
      />
    </>
  );
}