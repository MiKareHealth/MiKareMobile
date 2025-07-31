import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseRegions } from '../config/supabaseRegions';
import { Region } from './regionDetection';

// Add this function to load region from localStorage
const loadRegionFromStorage = (): Region => {
  const stored = localStorage.getItem('mikare_selected_region');
  if (stored === 'AU' || stored === 'UK' || stored === 'USA') return stored as Region;
  return 'USA';
};

// Global variable to store the current Supabase client
let currentClient: SupabaseClient | null = null;
let currentRegion: Region | null = loadRegionFromStorage();

// Global supabase instance that components can import directly
export let supabase: SupabaseClient | null = null;

/**
 * Initialize Supabase client for specific region
 */
const createRegionClient = (region: Region): SupabaseClient => {
  const config = supabaseRegions[region];
  
  if (!config.url || !config.anonKey) {
    throw new Error(`Supabase configuration for region ${region} is incomplete`);
  }

  return createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  });
};

/**
 * Set the global supabase instance
 */
export const setGlobalSupabaseInstance = (client: SupabaseClient): void => {
  supabase = client;
};

/**
 * Get or create Supabase client for the detected/selected region
 */
export const getSupabaseClient = async (): Promise<SupabaseClient> => {
  if (!currentClient) {
    // Get the current region
    const region = getCurrentRegion() || 'USA'; // Fallback to USA if null
    
    // Create new client for the region
    currentClient = createRegionClient(region);
    
    // Set the global instance
    setGlobalSupabaseInstance(currentClient);
  } else {
    // Verify we're using the correct region
    const newRegion = getCurrentRegion() || 'USA'; // Fallback to USA if null
    
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
export const switchToRegion = async (region: Region): Promise<SupabaseClient> => {
  // Get the region config
  const config = supabaseRegions[region];
  
  if (!config.url || !config.anonKey) {
    throw new Error(`Supabase configuration for region ${region} is incomplete`);
  }
  
  // Create new client for the region
  currentClient = createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  });
  
  // Update current region
  currentRegion = region;
  localStorage.setItem('mikare_selected_region', region);
  
  // Set the global instance
  setGlobalSupabaseInstance(currentClient);
  
  return currentClient;
};

/**
 * Get current region
 */
export const getCurrentRegion = (): Region | null => {
  if (currentRegion) return currentRegion;
  const stored = localStorage.getItem('mikare_selected_region');
  if (stored === 'AU' || stored === 'UK' || stored === 'USA') return stored as Region;
  return null;
};

/**
 * Get current client instance (for direct access)
 */
export const getCurrentClient = (): SupabaseClient | null => {
  return currentClient;
};

/**
 * Initialize the Supabase client on app start
 */
export const initializeSupabase = async (): Promise<SupabaseClient> => {
  return await getSupabaseClient();
};