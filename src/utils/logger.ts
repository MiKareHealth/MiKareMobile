/**
 * Logger utility that controls console output based on VITE_CONSOLE environment variable
 * Default behavior: no logging (false)
 * Set VITE_CONSOLE=true in .env to enable logging
 */

// Get the console logging setting from environment variable
const getConsoleSetting = (): boolean => {
  const consoleSetting = import.meta.env.VITE_CONSOLE;
  
  // If the variable is not set or is null/undefined, default to false
  if (consoleSetting === undefined || consoleSetting === null || consoleSetting === '') {
    return false;
  }
  
  // Convert string to boolean
  return consoleSetting === 'true';
};

const shouldLog = getConsoleSetting();

// Logger functions that only log when VITE_CONSOLE is set to 'true'
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