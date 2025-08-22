import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { tokens } from '../styles/tokens';
import { getSupabaseClient, switchToRegion, getCurrentRegion } from '../lib/supabaseClient';
import { log, error as logError } from '../utils/logger';
import RegionSelector from '../components/RegionSelector';
import { Region, setUserRegion } from '../lib/regionDetection';
import { SIGNIN_IMAGE, SIGNIN_VIDEO, MIKARE_LOGO } from '../config/branding';
import { clearLockoutOnNavigation, clearLockout, getLockoutState } from '../utils/securityUtils';

export default function SignUp() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [selectedRegion, setSelectedRegion] = useState<Region>('USA');
  
  // Password strength state variables
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak');
  const [hasMinLength, setHasMinLength] = useState(false);
  const [hasLowercase, setHasLowercase] = useState(false);
  const [hasUppercase, setHasUppercase] = useState(false);
  const [hasNumber, setHasNumber] = useState(false);
  const [hasSpecial, setHasSpecial] = useState(false);
  
  // Media loading states
  const [imageLoaded, setImageLoaded] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Set initial region from current region or fallback
  useEffect(() => {
    const detectedRegion = getCurrentRegion() || 'USA';
    setSelectedRegion(detectedRegion);
    
    // Ensure the detected region is stored in localStorage for consistency
    if (!localStorage.getItem('mikare_selected_region')) {
      setUserRegion(detectedRegion);
    }
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

  // Check Supabase availability on component mount
  useEffect(() => {
    const checkSupabaseStatus = async () => {
      try {
        // Simple health check - try to get the current session
        const client = await getSupabaseClient();
        const { data, error } = await client.auth.getSession();
        
        if (error && (error.message.includes('Database error') || error.status === 500)) {
          logError('Supabase service unavailable:', error);
          setSupabaseStatus('unavailable');
        } else {
          setSupabaseStatus('available');
        }
      } catch (err) {
        logError('Error checking Supabase status:', err);
        setSupabaseStatus('unavailable');
      }
    };
    
    checkSupabaseStatus();
  }, []);

  // Clear lockout state when navigating away from auth pages
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Clear lockout when leaving the page entirely
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

  // Refresh lockout state when page becomes visible
  useEffect(() => {
    const refreshLockoutState = () => {
      // Refresh the lockout state
      const currentState = getLockoutState();
      // Update any lockout-related UI if needed
    };

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

  // Password validation effect
  useEffect(() => {
    if (password) {
      // Check individual criteria
      setHasMinLength(password.length >= 8);
      setHasLowercase(/[a-z]/.test(password));
      setHasUppercase(/[A-Z]/.test(password));
      setHasNumber(/[0-9]/.test(password));
      setHasSpecial(/[^A-Za-z0-9]/.test(password));
      
      // Calculate overall strength
      const criteriaCount = [hasMinLength, hasLowercase, hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;
      
      if (criteriaCount <= 2) {
        setPasswordStrength('weak');
      } else if (criteriaCount <= 4) {
        setPasswordStrength('medium');
      } else {
        setPasswordStrength('strong');
      }
    } else {
      setHasMinLength(false);
      setHasLowercase(false);
      setHasUppercase(false);
      setHasNumber(false);
      setHasSpecial(false);
      setPasswordStrength('weak');
    }
  }, [password, hasMinLength, hasLowercase, hasUppercase, hasNumber, hasSpecial]);

  const handleRegionChange = (region: Region) => {
    log('Region changed to:', region);
    setSelectedRegion(region);
    setUserRegion(region);
    // Don't call switchToRegion here to avoid triggering authentication
    setError(null); // Clear any previous errors when region changes
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Check if Supabase is available first
      if (supabaseStatus === 'unavailable') {
        throw new Error('Authentication service is currently unavailable. Please try again later.');
      }
      
      log("Creating account in region:", selectedRegion);
      
      // Enhanced debug logs
      log('Email value before storage:', email);
      log('Full name value before storage:', fullName);
      log('Selected region:', selectedRegion);
      
      // Store the user's information in sessionStorage for the onboarding flow
      const accountData = {
        fullName,
        email,
        region: selectedRegion
      };
      
      log('Storing account data:', accountData);
      sessionStorage.setItem('mikare_onboarding_account', JSON.stringify(accountData));
      
      // Also store the password temporarily for the actual signup during onboarding
      sessionStorage.setItem('mikare_temp_password', password);
      
      // Verify the data was stored correctly
      const storedData = sessionStorage.getItem('mikare_onboarding_account');
      log('Verified stored data:', storedData ? JSON.parse(storedData) : null);
      
      // Redirect to onboarding page
      navigate('/onboarding');
      
    } catch (err) {
      logError('Sign up error:', err);
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
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
          
          {/* Right side - Sign Up Form - Full width on mobile/tablet, half width on large screens */}
          <div className="w-full lg:w-1/2 p-8">
            <div className="text-center mb-6">
              <img
                src={MIKARE_LOGO}
                alt="MiKare Logo"
                className="h-16 mx-auto mb-4"
              />
              <h2 className="text-3xl font-bold font-heading text-heading-h2">
                Create your account
              </h2>
              <p className="mt-2 text-sm text-text-secondary">
                Your data will be securely stored in the {selectedRegion === 'AU' ? 'Australia' : selectedRegion === 'UK' ? 'United Kingdom' : 'United States'} region
              </p>
            </div>
            
            {supabaseStatus === 'unavailable' && (
              <div className="mb-6 rounded-md bg-amber-50 p-4 border border-amber-200">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-amber-400 mr-2" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">Service Status Alert</p>
                    <p className="mt-1">The authentication service is currently experiencing issues. You may not be able to sign up at this time. Please try again later.</p>
                  </div>
                </div>
              </div>
            )}
            
            <form className="space-y-6" onSubmit={handleSignUp}>
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-text-primary mb-1">
                  Full Name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 px-4 py-3"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 px-4 py-3"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => {
                      // Only hide strength indicator if password is empty
                      if (!password) {
                        setPasswordFocused(false);
                      }
                    }}
                    className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 px-4 py-3"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-500 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Eye className="h-5 w-5" aria-hidden="true" />
                    )}
                  </button>
                </div>
                
                {/* Password strength indicator and requirements */}
                {(passwordFocused || password) && (
                  <div className="mt-3 animate-fade-down">
                    {/* Strength bar */}
                    <div className="flex items-center mb-2">
                      <div className="flex-grow h-2 bg-background-subtle rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            passwordStrength === 'weak' ? 'w-1/3 bg-red-500' : 
                            passwordStrength === 'medium' ? 'w-2/3 bg-yellow-500' : 
                            'w-full bg-green-500'
                          }`}
                        ></div>
                      </div>
                      <span className={`ml-2 text-xs font-medium ${
                        passwordStrength === 'weak' ? 'text-red-500' : 
                        passwordStrength === 'medium' ? 'text-yellow-500' : 
                        'text-green-500'
                      }`}>
                        {passwordStrength === 'weak' ? 'Weak' : 
                         passwordStrength === 'medium' ? 'Medium' : 
                         'Strong'}
                      </span>
                    </div>
                    
                    {/* Requirements checklist */}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center">
                        <div className={`w-4 h-4 flex items-center justify-center rounded-full mr-2 ${
                          hasMinLength ? 'bg-primary-light text-primary' : 'bg-background-subtle text-text-tertiary'
                        }`}>
                          {hasMinLength ? '✓' : ''}
                        </div>
                        <span className={hasMinLength ? 'text-primary' : 'text-text-secondary'}>
                          At least 8 characters
                        </span>
                      </div>
                      
                      <div className="flex items-center">
                        <div className={`w-4 h-4 flex items-center justify-center rounded-full mr-2 ${
                          hasUppercase ? 'bg-primary-light text-primary' : 'bg-background-subtle text-text-tertiary'
                        }`}>
                          {hasUppercase ? '✓' : ''}
                        </div>
                        <span className={hasUppercase ? 'text-primary' : 'text-text-secondary'}>
                          Uppercase letter
                        </span>
                      </div>
                      
                      <div className="flex items-center">
                        <div className={`w-4 h-4 flex items-center justify-center rounded-full mr-2 ${
                          hasLowercase ? 'bg-primary-light text-primary' : 'bg-background-subtle text-text-tertiary'
                        }`}>
                          {hasLowercase ? '✓' : ''}
                        </div>
                        <span className={hasLowercase ? 'text-primary' : 'text-text-secondary'}>
                          Lowercase letter
                        </span>
                      </div>
                      
                      <div className="flex items-center">
                        <div className={`w-4 h-4 flex items-center justify-center rounded-full mr-2 ${
                          hasNumber ? 'bg-primary-light text-primary' : 'bg-background-subtle text-text-tertiary'
                        }`}>
                          {hasNumber ? '✓' : ''}
                        </div>
                        <span className={hasNumber ? 'text-primary' : 'text-text-secondary'}>
                          Number
                        </span>
                      </div>
                      
                      <div className="flex items-center">
                        <div className={`w-4 h-4 flex items-center justify-center rounded-full mr-2 ${
                          hasSpecial ? 'bg-primary-light text-primary' : 'bg-background-subtle text-text-tertiary'
                        }`}>
                          {hasSpecial ? '✓' : ''}
                        </div>
                        <span className={hasSpecial ? 'text-primary' : 'text-text-secondary'}>
                          Special character
                        </span>
                      </div>
                    </div>
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

              {error && (
                <div className="rounded-md bg-red-50 p-4 border border-red-100">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                    <div className="text-sm text-red-600">{error}</div>
                  </div>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading || supabaseStatus === 'unavailable'}
                  className="w-full bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold py-3 px-4 rounded-md shadow-md hover:shadow-lg transition-all duration-200 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating account...' : 'Continue to Onboarding'}
                </button>
                
                <div className="text-sm text-center mt-4">
                  Already have an account?{' '}
                  <Link 
                    to="/signin" 
                    className="font-medium text-teal-600 hover:text-teal-700 transition-colors"
                    onClick={() => {
                      // Don't clear lockout when navigating to signin
                      // The warning should persist between sign-in and sign-up
                    }}
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}