/**
 * Region detection utility for multi-region Supabase setup
 */

export type Region = 'AU' | 'UK' | 'USA';

// Cache for region detection to avoid repeated calculations
let cachedRegion: Region | null = null;
let lastStorageCheck = 0;

/**
 * Detect user's region based on various factors
 * Priority: localStorage > IP geolocation > timezone fallback
 */
export const detectUserRegion = async (): Promise<Region> => {
  // First check if user has manually selected a region
  const savedRegion = localStorage.getItem('mikare_selected_region') as Region;
  if (savedRegion && ['AU', 'UK', 'USA'].includes(savedRegion)) {
    return savedRegion;
  }

  // Try to detect region from timezone
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Australia timezones
    if (timezone.includes('Australia/')) {
      return 'AU';
    }
    
    // UK/Europe timezones  
    if (timezone.includes('Europe/London') || timezone.includes('Europe/Dublin')) {
      return 'UK';
    }
    
    // US timezones
    if (timezone.includes('America/')) {
      return 'USA';
    }
    
    // European timezones default to UK
    if (timezone.includes('Europe/')) {
      return 'UK';
    }
  } catch (error) {
    console.warn('Failed to detect timezone:', error);
  }

  // Try IP-based geolocation as fallback
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch('https://ipapi.co/json/', {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      const countryCode = data.country_code;
      
      if (countryCode === 'AU') return 'AU';
      if (countryCode === 'GB' || countryCode === 'UK') return 'UK';
      if (countryCode === 'US') return 'USA';
      
      // European countries default to UK
      const europeanCountries = ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI', 'IE'];
      if (europeanCountries.includes(countryCode)) {
        return 'UK';
      }
    }
  } catch (error) {
    console.warn('Failed to detect region via IP:', error);
  }

  // Default to USA if detection fails
  return 'USA';
};

/**
 * Get the current region with caching
 */
export const getCurrentRegion = (): Region => {
  const now = Date.now();
  
  // Check if we have a cached result and localStorage hasn't changed recently
  if (cachedRegion && (now - lastStorageCheck) < 1000) {
    return cachedRegion;
  }
  
  lastStorageCheck = now;
  
  // First check if user has manually selected a region
  const savedRegion = localStorage.getItem('mikare_selected_region') as Region;
  if (savedRegion && ['AU', 'UK', 'USA'].includes(savedRegion)) {
    cachedRegion = savedRegion;
    console.log('Using saved region from localStorage:', savedRegion);
    return savedRegion;
  }

  // Try to detect region from timezone
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log('Detecting region from timezone:', timezone);
    
    // Australia timezones
    if (timezone.includes('Australia/')) {
      cachedRegion = 'AU';
      console.log('Detected AU region from timezone');
      return 'AU';
    }
    
    // UK/Europe timezones  
    if (timezone.includes('Europe/London') || timezone.includes('Europe/Dublin')) {
      cachedRegion = 'UK';
      console.log('Detected UK region from timezone');
      return 'UK';
    }
    
    // US timezones
    if (timezone.includes('America/')) {
      cachedRegion = 'USA';
      console.log('Detected USA region from timezone');
      return 'USA';
    }
    
    // European timezones default to UK
    if (timezone.includes('Europe/')) {
      cachedRegion = 'UK';
      console.log('Detected UK region from European timezone');
      return 'UK';
    }
  } catch (error) {
    console.warn('Failed to detect timezone:', error);
  }

  // Default to USA if detection fails
  cachedRegion = 'USA';
  console.log('Defaulting to USA region');
  return 'USA';
};

/**
 * Set user's preferred region
 */
export const setUserRegion = (region: Region): void => {
  console.log('Setting user region to:', region);
  localStorage.setItem('mikare_selected_region', region);
  cachedRegion = region; // Update cache immediately
};

/**
 * Clear user's region selection
 */
export const clearUserRegion = (): void => {
  console.log('Clearing user region selection');
  localStorage.removeItem('mikare_selected_region');
  cachedRegion = null; // Clear cache
};

/**
 * Get region display name
 */
export const getRegionDisplayName = (region: Region): string => {
  switch (region) {
    case 'AU':
      return 'Australia';
    case 'UK':
      return 'United Kingdom';
    case 'USA':
      return 'United States';
    default:
      return region;
  }
};

/**
 * Get region flag emoji
 */
export const getRegionFlag = (region: Region): string => {
  switch (region) {
    case 'AU':
      return '🇦🇺';
    case 'UK':
      return '🇬🇧';
    case 'USA':
      return '🇺🇸';
    default:
      return '🌍';
  }
};