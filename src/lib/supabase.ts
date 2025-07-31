import { getSupabaseClient, getCurrentClient, supabase as globalSupabase } from './supabaseClient';

// For cases where we need the actual client instance
export const getSupabase = getSupabaseClient;

// Re-export the region switching functionality
export { switchToRegion, getCurrentRegion, initializeSupabase, setGlobalSupabaseInstance } from './supabaseClient';

// Export the global supabase instance directly
export const supabase = globalSupabase;

// Export a function to get the current supabase instance (with fallback)
export const getSupabaseInstance = () => {
  const client = getCurrentClient();
  if (!client) {
    throw new Error('Supabase client not initialized. Make sure to call initializeSupabase() first.');
  }
  return client;
};