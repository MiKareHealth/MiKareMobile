import { createClient } from '@supabase/supabase-js';
import { supabaseRegions } from '../config/supabaseRegions';
import { getCurrentRegion } from './regionDetection';
import { storage } from '../storage.native';
// Global variable to store the current Supabase client
let currentClient = null;
let currentRegion = null;
// Global supabase instance that components can import directly
export let supabase = null;
/**
 * Initialize Supabase client for specific region
 */
const createRegionClient = (region) => {
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
export const setGlobalSupabaseInstance = (client) => {
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
    }
    else {
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
export const switchToRegion = async (region) => {
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
    await storage.setItem('mikare_selected_region', region);
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
