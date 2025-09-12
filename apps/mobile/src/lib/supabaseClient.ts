import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// Supabase regions configuration
export const supabaseRegions = {
  AU: {
    url: process.env.EXPO_PUBLIC_SUPABASE_AU_URL!,
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_AU_ANON_KEY!,
  },
  UK: {
    url: process.env.EXPO_PUBLIC_SUPABASE_UK_URL!,
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_UK_ANON_KEY!,
  },
  USA: {
    url: process.env.EXPO_PUBLIC_SUPABASE_USA_URL!,
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_USA_ANON_KEY!,
  },
};

// Storage adapter for React Native
export const storage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('Error getting item from storage:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('Error setting item in storage:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('Error removing item from storage:', error);
    }
  },
};

// Get current region
export const getCurrentRegion = async (): Promise<string> => {
  try {
    const storedRegion = await storage.getItem('mikare_selected_region');
    console.log('getCurrentRegion - stored region:', storedRegion);
    console.log('getCurrentRegion - available regions:', Object.keys(supabaseRegions));
    
    if (storedRegion && supabaseRegions[storedRegion as keyof typeof supabaseRegions]) {
      console.log('getCurrentRegion - returning stored region:', storedRegion);
      return storedRegion;
    }
    
    // If stored region is lowercase, convert to uppercase
    if (storedRegion) {
      const upperRegion = storedRegion.toUpperCase();
      console.log('getCurrentRegion - converting lowercase region to uppercase:', storedRegion, '->', upperRegion);
      if (supabaseRegions[upperRegion as keyof typeof supabaseRegions]) {
        // Update the stored region to uppercase
        await storage.setItem('mikare_selected_region', upperRegion);
        return upperRegion;
      }
    }
    
    // Default to AU if no region is stored or invalid
    console.log('getCurrentRegion - no valid stored region, defaulting to AU');
    return 'AU';
  } catch (error) {
    console.error('Error getting current region:', error);
    return 'AU';
  }
};

// Global variable to store the current Supabase client
let currentClient: any = null;
let currentRegion: string | null = null;

// Global supabase instance that components can import directly
export let supabase: any = null;

/**
 * Initialize Supabase client for specific region
 */
const createRegionClient = (region: string) => {
  const config = supabaseRegions[region as keyof typeof supabaseRegions];
  if (!config?.url || !config?.anonKey) {
    throw new Error(`Supabase configuration for region ${region} is incomplete`);
  }
  
  return createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
};

/**
 * Set the global supabase instance
 */
export const setGlobalSupabaseInstance = (client: any) => {
  supabase = client;
};

/**
 * Get or create Supabase client for the detected/selected region
 */
export const getSupabaseClient = async () => {
  if (!currentClient) {
    // Get the current region
    const region = await getCurrentRegion();
    // Create new client for the region
    currentClient = createRegionClient(region);
    currentRegion = region;
    // Set the global instance
    setGlobalSupabaseInstance(currentClient);
  } else {
    // Verify we're using the correct region
    const newRegion = await getCurrentRegion();
    // If region has changed, create new client
    if (currentRegion !== newRegion) {
      currentClient = createRegionClient(newRegion);
      currentRegion = newRegion;
      setGlobalSupabaseInstance(currentClient);
    }
  }
  return currentClient;
};

/**
 * Switch to a specific region
 */
export const switchToRegion = async (region: string) => {
  console.log('switchToRegion called with region:', region);
  console.log('switchToRegion - available regions:', Object.keys(supabaseRegions));
  
  // Get the region config
  const config = supabaseRegions[region as keyof typeof supabaseRegions];
  if (!config?.url || !config?.anonKey) {
    console.error('Invalid region config for:', region);
    console.error('Available regions:', Object.keys(supabaseRegions));
    console.error('Region config:', config);
    throw new Error(`Supabase configuration for region ${region} is incomplete`);
  }
  
  console.log('Creating new Supabase client for region:', region);
  
  // Create new client for the region
  currentClient = createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  
  // Update current region
  currentRegion = region;
  await storage.setItem('mikare_selected_region', region);
  console.log('Region switched and stored:', region);
  
  // Set the global instance
  setGlobalSupabaseInstance(currentClient);
  return currentClient;
};

/**
 * Get current client instance (for direct access)
 */
export const getCurrentClient = () => {
  return currentClient;
};

/**
 * Initialize the Supabase client on app start
 */
export const initializeSupabase = async () => {
  return await getSupabaseClient();
};
