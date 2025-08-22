import { log, error as logError } from './logger';

/**
 * Add security headers to the document
 */
export const addSecurityHeaders = (): void => {
  try {
    // Add security meta tags to the document head
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';";
    document.head.appendChild(meta);

    // Add X-Frame-Options header (handled by server, but adding meta as fallback)
    const frameOptions = document.createElement('meta');
    frameOptions.httpEquiv = 'X-Frame-Options';
    frameOptions.content = 'DENY';
    document.head.appendChild(frameOptions);

    // Add X-Content-Type-Options header
    const contentTypeOptions = document.createElement('meta');
    contentTypeOptions.httpEquiv = 'X-Content-Type-Options';
    contentTypeOptions.content = 'nosniff';
    document.head.appendChild(contentTypeOptions);

    // Add Referrer-Policy header
    const referrerPolicy = document.createElement('meta');
    referrerPolicy.name = 'referrer';
    referrerPolicy.content = 'strict-origin-when-cross-origin';
    document.head.appendChild(referrerPolicy);

    log('Security headers added successfully');
  } catch (err) {
    logError('Failed to add security headers:', err);
  }
};

/**
 * Enhanced lockout functionality with exponential backoff
 */
export interface LockoutConfig {
  maxAttempts: number;
  baseLockoutMinutes: number;
  maxLockoutMinutes: number;
  resetAfterMinutes: number;
}

export const DEFAULT_LOCKOUT_CONFIG: LockoutConfig = {
  maxAttempts: 3,
  baseLockoutMinutes: 5,
  maxLockoutMinutes: 60,
  resetAfterMinutes: 15
};

export interface LockoutState {
  attempts: number;
  lockoutUntil: number | null;
  isLocked: boolean;
  remainingLockoutTime: number;
}

/**
 * Get current lockout state
 */
export const getLockoutState = (config: LockoutConfig = DEFAULT_LOCKOUT_CONFIG): LockoutState => {
  const storedAttempts = localStorage.getItem('mikare_login_attempts');
  const attemptTime = localStorage.getItem('mikare_attempt_time');
  const lockoutUntil = localStorage.getItem('mikare_lockout_until');
  
  const now = Date.now();
  
  if (!storedAttempts || !attemptTime) {
    return {
      attempts: 0,
      lockoutUntil: null,
      isLocked: false,
      remainingLockoutTime: 0
    };
  }
  
  const attempts = parseInt(storedAttempts, 10);
  const time = parseInt(attemptTime, 10);
  const lockoutTime = lockoutUntil ? parseInt(lockoutUntil, 10) : null;
  
  // Check if attempts have expired
  if (now - time > config.resetAfterMinutes * 60 * 1000) {
    clearLockout();
    return {
      attempts: 0,
      lockoutUntil: null,
      isLocked: false,
      remainingLockoutTime: 0
    };
  }
  
  // Check if currently locked out
  if (lockoutTime && now < lockoutTime) {
    return {
      attempts,
      lockoutUntil: lockoutTime,
      isLocked: true,
      remainingLockoutTime: lockoutTime - now
    };
  }
  
  // Lockout expired but attempts still count
  return {
    attempts,
    lockoutUntil: null,
    isLocked: false,
    remainingLockoutTime: 0
  };
};

/**
 * Increment failed attempts and apply lockout if needed
 */
export const incrementFailedAttempts = (config: LockoutConfig = DEFAULT_LOCKOUT_CONFIG): LockoutState => {
  const currentState = getLockoutState(config);
  const newAttempts = currentState.attempts + 1;
  
  localStorage.setItem('mikare_login_attempts', newAttempts.toString());
  localStorage.setItem('mikare_attempt_time', Date.now().toString());
  
  // Apply lockout if max attempts reached
  if (newAttempts >= config.maxAttempts) {
    const lockoutMinutes = Math.min(
      config.baseLockoutMinutes * Math.pow(2, newAttempts - config.maxAttempts),
      config.maxLockoutMinutes
    );
    
    const lockoutUntil = Date.now() + (lockoutMinutes * 60 * 1000);
    localStorage.setItem('mikare_lockout_until', lockoutUntil.toString());
    
    return {
      attempts: newAttempts,
      lockoutUntil,
      isLocked: true,
      remainingLockoutTime: lockoutMinutes * 60 * 1000
    };
  }
  
  return {
    attempts: newAttempts,
    lockoutUntil: null,
    isLocked: false,
    remainingLockoutTime: 0
  };
};

/**
 * Clear lockout state
 */
export const clearLockout = (): void => {
  localStorage.removeItem('mikare_login_attempts');
  localStorage.removeItem('mikare_attempt_time');
  localStorage.removeItem('mikare_lockout_until');
};

/**
 * Clear lockout state when navigating away from auth pages
 */
export const clearLockoutOnNavigation = (currentPath: string): void => {
  // Only clear lockout if navigating to a page that's not sign-in or sign-up
  if (currentPath !== '/signin' && currentPath !== '/signup') {
    clearLockout();
  }
};

/**
 * Check if current path is an auth page
 */
export const isAuthPage = (path: string): boolean => {
  return path === '/signin' || path === '/signup';
};

/**
 * Format remaining lockout time for display
 */
export const formatLockoutTime = (milliseconds: number): string => {
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = Math.floor((milliseconds % 60000) / 1000);
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

/**
 * Validate CSRF token
 */
export const validateCSRFToken = (token: string, storedToken: string): boolean => {
  return token === storedToken && token.length > 0;
};

/**
 * Generate a secure random token
 */
export const generateSecureToken = (length: number = 32): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};
