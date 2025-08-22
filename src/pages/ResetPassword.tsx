import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, CheckCircle, Lock } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabaseClient';
import { log, error as logError } from '../utils/logger';
import { MIKARE_LOGO } from '../config/branding';
import { logPasswordChangeEvent } from '../utils/auditUtils';
import { addSecurityHeaders, generateSecureToken, validateCSRFToken } from '../utils/securityUtils';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string>('');
  
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const errorBannerRef = useRef<HTMLDivElement>(null);

  // Get token from URL params
  const token = searchParams.get('token');

  useEffect(() => {
    // Add security headers
    addSecurityHeaders();
    
    // Generate secure CSRF token on component mount
    setCsrfToken(generateSecureToken());
  }, []);

  useEffect(() => {
    // Focus error banner when it appears for screen readers
    if (error && errorBannerRef.current) {
      errorBannerRef.current.focus();
    }
  }, [error]);

  useEffect(() => {
    // Validate token on mount
    if (token) {
      validateToken();
    } else {
      setTokenValid(false);
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [token]);

  const validateToken = async () => {
    try {
      const client = await getSupabaseClient();
      
      // Properly validate the reset token using verifyOtp
      const { data, error } = await client.auth.verifyOtp({
        token_hash: token!,
        type: 'recovery'
      });
      
      if (error || !data.user) {
        setTokenValid(false);
        setError('Reset link invalid or expired. Request a new link.');
        return;
      }

      setTokenValid(true);
      setEmail(data.user.email || null);
      
      // Focus password input for better UX
      if (passwordInputRef.current) {
        passwordInputRef.current.focus();
      }
    } catch (err) {
      logError('Token validation error:', err);
      setTokenValid(false);
      setError('Unable to validate reset link. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tokenValid || !token) {
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }

    // Validate CSRF token
    const formData = new FormData(e.target as HTMLFormElement);
    const submittedToken = formData.get('csrf_token') as string;
    
    if (!validateCSRFToken(submittedToken, csrfToken)) {
      setError('Security validation failed. Please refresh the page and try again.');
      return;
    }

    // Validate password requirements
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const client = await getSupabaseClient();
      
      // Update the user's password using the reset token
      const { error } = await client.auth.updateUser({
        password: password
      });

      if (error) {
        if (error.message.includes('expired') || error.message.includes('invalid')) {
          setError('Reset link has expired. Please request a new link.');
        } else {
          setError('Failed to update password. Please try again.');
        }
        return;
      }

      // Log password change audit event (non-blocking) - use the same client instance
      const { data: { user } } = await client.auth.getUser();
      if (user) {
        logPasswordChangeEvent(user.id, client).catch((err) => {
          logError('Failed to log password change audit event:', err);
        });
      }

      // Invalidate all existing sessions for security
      try {
        await client.auth.signOut();
        log('All sessions invalidated after password change');
      } catch (err) {
        logError('Failed to invalidate sessions after password change:', err);
      }

      setSuccess(true);
      
      // Redirect to signin after 3 seconds
      setTimeout(() => {
        navigate('/signin?reset=success');
      }, 3000);

    } catch (err) {
      logError('Password reset error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendLink = () => {
    navigate('/signin?reset=expired');
  };

  if (tokenValid === null) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <img
              src={MIKARE_LOGO}
              alt="Mikare Logo"
              className="h-16 mx-auto mb-4"
            />
            <h2 className="text-2xl font-bold text-gray-900">
              Validating reset link...
            </h2>
          </div>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <img
              src={MIKARE_LOGO}
              alt="Mikare Logo"
              className="h-16 mx-auto mb-4"
            />
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Password Updated Successfully
            </h2>
            <p className="text-gray-600">
              Your password has been updated. Redirecting to sign in...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <img
              src={MIKARE_LOGO}
              alt="Mikare Logo"
              className="h-16 mx-auto mb-4"
            />
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Invalid Reset Link
            </h2>
            <div 
              className="rounded-md bg-red-50 p-4 border border-red-200 mb-6"
              role="alert"
              aria-live="polite"
            >
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <div className="text-sm text-red-700">
                  {error || 'This reset link is invalid or has expired.'}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <button
                onClick={handleResendLink}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-4 rounded-md transition-colors"
              >
                Request New Reset Link
              </button>
              <Link
                to="/signin"
                className="block w-full text-center text-teal-600 hover:text-teal-700 font-medium"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img
            src={MIKARE_LOGO}
            alt="Mikare Logo"
            className="h-16 mx-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-gray-900">
            Reset Your Password
          </h2>
          <p className="text-gray-600">
            Enter your new password below.
          </p>
          {email && (
            <p className="text-sm text-gray-500 mt-2">
              Resetting password for: {email}
            </p>
          )}
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* CSRF Protection */}
          <input type="hidden" name="csrf_token" value={csrfToken} />
          
          {error && (
            <div
              ref={errorBannerRef}
              tabIndex={-1}
              className="rounded-md bg-red-50 p-4 border border-red-200"
              role="alert"
              aria-live="polite"
            >
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <div className="text-sm text-red-700">
                  {error}
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                ref={passwordInputRef}
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-4 py-3 focus:border-teal-500 focus:ring-teal-500"
                placeholder="Enter new password"
                minLength={8}
                data-testid="new-password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                aria-label={showPassword ? "Hide password" : "Show password"}
                data-testid="password-toggle"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Password must be at least 8 characters long
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-4 py-3 focus:border-teal-500 focus:ring-teal-500"
                placeholder="Confirm new password"
                data-testid="confirm-password-input"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                data-testid="confirm-password-toggle"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating Password...' : 'Update Password'}
            </button>
          </div>

          <div className="text-center">
            <Link
              to="/signin"
              className="text-teal-600 hover:text-teal-700 font-medium"
            >
              Back to Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
} 