import { getSupabaseClient } from './supabaseClient';
import { User } from '@supabase/supabase-js';

/**
 * Cached user state to prevent excessive auth.getUser() calls
 * This is a simple in-memory cache that prevents duplicate requests
 * across multiple contexts/components
 */
let cachedUser: User | null = null;
let lastUserFetch: number = 0;
let pendingRequest: Promise<User | null> | null = null;
const USER_CACHE_TTL = 5000; // 5 seconds - auth state doesn't change often

/**
 * Get the current authenticated user with caching AND request deduplication
 * This prevents multiple components from making duplicate auth.getUser() calls
 *
 * @param forceRefresh - Skip cache and force a fresh fetch
 */
export async function getCachedUser(forceRefresh = false): Promise<User | null> {
  const now = Date.now();

  // Return cached user if available and not expired
  if (!forceRefresh && cachedUser && (now - lastUserFetch) < USER_CACHE_TTL) {
    return cachedUser;
  }

  // If there's already a pending request, return that promise (deduplication!)
  if (pendingRequest) {
    return pendingRequest;
  }

  // Create a new request and cache the promise
  pendingRequest = (async () => {
    try {
      const supabase = await getSupabaseClient();
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        console.error('[CachedAuth] Error fetching user:', error);
        cachedUser = null;
        return null;
      }

      cachedUser = user;
      lastUserFetch = Date.now();
      return user;
    } finally {
      // Clear pending request after it completes
      pendingRequest = null;
    }
  })();

  return pendingRequest;
}

/**
 * Clear the cached user (call this on sign out or sign in)
 */
export function clearCachedUser(): void {
  cachedUser = null;
  lastUserFetch = 0;
}

/**
 * Get the cached user without making a request
 * Returns null if no user is cached
 */
export function getCachedUserSync(): User | null {
  const now = Date.now();

  // Only return if cache is still valid
  if (cachedUser && (now - lastUserFetch) < USER_CACHE_TTL) {
    return cachedUser;
  }

  return null;
}
