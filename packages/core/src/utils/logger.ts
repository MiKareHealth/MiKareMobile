/**
 * Logger utility that controls console output based on environment variable
 * Default behavior: no logging (false)
 * Set EXPO_PUBLIC_CONSOLE=true in .env to enable logging
 */

// Get the console logging setting from environment variable
const getConsoleSetting = (): boolean => {
  // Use EXPO_PUBLIC_ prefix for Expo/React Native
  const consoleSetting = process.env.EXPO_PUBLIC_CONSOLE || 
                        (typeof window !== 'undefined' ? (window as any).ENV?.EXPO_PUBLIC_CONSOLE : undefined);
  
  // If the variable is not set or is null/undefined, default to false
  if (consoleSetting === undefined || consoleSetting === null || consoleSetting === '') {
    return false;
  }
  
  // Convert string to boolean
  return consoleSetting === 'true';
};

const shouldLog = getConsoleSetting();

// Logger functions that only log when EXPO_PUBLIC_CONSOLE is set to 'true'
export const logger = {
  log: (...args: any[]) => {
    if (shouldLog) {
      console.log(...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (shouldLog) {
      console.warn(...args);
    }
  },
  
  error: (...args: any[]) => {
    if (shouldLog) {
      console.error(...args);
    }
  },
  
  info: (...args: any[]) => {
    if (shouldLog) {
      console.info(...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (shouldLog) {
      console.debug(...args);
    }
  }
};

// Export individual functions for convenience
export const log = logger.log;
export const warn = logger.warn;
export const error = logger.error;
export const info = logger.info;
export const debug = logger.debug;
