// Cache logging is always enabled for monitoring performance
const isDev = import.meta.env.DEV;
const logCache = (...args: any[]) => {
  if (isDev) {
    console.log(...args);
  }
};

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

/**
 * Query cache with TTL support and request deduplication
 * Prevents duplicate requests and caches responses
 */
class QueryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private pendingRequests: Map<string, PendingRequest<any>> = new Map();
  private defaultTTL: number = 10000; // 10 seconds default
  private dedupeCount: number = 0; // Track deduplication count

  /**
   * Generate a cache key from query parameters
   */
  private generateKey(table: string, params: Record<string, any>): string {
    return `${table}:${JSON.stringify(params)}`;
  }

  /**
   * Check if cache entry is still valid
   */
  private isValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Get cached data if available and valid
   */
  get<T>(table: string, params: Record<string, any>): T | null {
    const key = this.generateKey(table, params);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (this.isValid(entry)) {
      logCache(`[QueryCache] Cache HIT for ${key} (age: ${Date.now() - entry.timestamp}ms)`);
      return entry.data as T;
    }

    // Entry expired, remove it
    logCache(`[QueryCache] Cache EXPIRED for ${key}`);
    this.cache.delete(key);
    return null;
  }

  /**
   * Set cached data with custom or default TTL
   */
  set<T>(table: string, params: Record<string, any>, data: T, ttl?: number): void {
    const key = this.generateKey(table, params);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
    };

    this.cache.set(key, entry);
    logCache(`[QueryCache] Cached ${key} (TTL: ${entry.ttl}ms)`);
  }

  /**
   * Execute a query with deduplication and caching
   * If the same query is in-flight, return the existing promise
   * If cached data exists and is valid, return it immediately
   * Otherwise, execute the query and cache the result
   */
  async query<T>(
    table: string,
    params: Record<string, any>,
    queryFn: () => Promise<T>,
    options?: { ttl?: number; skipCache?: boolean }
  ): Promise<T> {
    const key = this.generateKey(table, params);
    const ttl = options?.ttl ?? this.defaultTTL;

    // Check for cached data first (unless skipCache is true)
    if (!options?.skipCache) {
      const cached = this.get<T>(table, params);
      if (cached !== null) {
        return cached;
      }
    }

    // Check if there's already a pending request for this query
    const pending = this.pendingRequests.get(key);
    if (pending) {
      const age = Date.now() - pending.timestamp;
      // Only reuse if request is less than 30 seconds old (prevent hanging requests)
      if (age < 30000) {
        this.dedupeCount++;
        // Only log first deduplication to reduce noise
        if (this.dedupeCount === 1) {
          logCache(`[QueryCache] Request deduplication active (subsequent deduplications will be summarized)`);
        }
        return pending.promise as Promise<T>;
      } else {
        logCache(`[QueryCache] Stale pending request found for ${key}, creating new one`);
        this.pendingRequests.delete(key);
      }
    }

    // Execute the query
    logCache(`[QueryCache] Executing NEW query for ${key}`);
    const promise = queryFn()
      .then((data) => {
        // Cache the result
        this.set(table, params, data, ttl);
        // Remove from pending
        this.pendingRequests.delete(key);
        return data;
      })
      .catch((error) => {
        // Remove from pending on error
        this.pendingRequests.delete(key);
        throw error;
      });

    // Store as pending
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
    });

    return promise;
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(table: string, params: Record<string, any>): void {
    const key = this.generateKey(table, params);
    this.cache.delete(key);
    logCache(`[QueryCache] Invalidated ${key}`);
  }

  /**
   * Invalidate all cache entries for a table
   */
  invalidateTable(table: string): void {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${table}:`)) {
        this.cache.delete(key);
        count++;
      }
    }
    logCache(`[QueryCache] Invalidated ${count} entries for table ${table}`);
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    const count = this.cache.size;
    this.cache.clear();
    this.pendingRequests.clear();
    logCache(`[QueryCache] Cleared all cache (${count} entries)`);
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    entries: number;
    pending: number;
    tables: string[];
    deduplicationCount: number;
  } {
    const tables = new Set<string>();
    for (const key of this.cache.keys()) {
      const table = key.split(':')[0];
      tables.add(table);
    }

    return {
      entries: this.cache.size,
      pending: this.pendingRequests.size,
      tables: Array.from(tables),
      deduplicationCount: this.dedupeCount,
    };
  }

  /**
   * Log deduplication summary (call this to see how many duplicates were prevented)
   */
  logDedupeStats(): void {
    if (this.dedupeCount > 0) {
      logCache(`[QueryCache] Prevented ${this.dedupeCount} duplicate requests via deduplication`);
      this.dedupeCount = 0; // Reset counter
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    let removed = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isValid(entry)) {
        this.cache.delete(key);
        removed++;
      }
    }
    if (removed > 0) {
      logCache(`[QueryCache] Cleaned up ${removed} expired entries`);
    }
  }

  /**
   * Set default TTL
   */
  setDefaultTTL(ttl: number): void {
    this.defaultTTL = ttl;
    logCache(`[QueryCache] Default TTL set to ${ttl}ms`);
  }
}

// Export singleton instance
export const queryCache = new QueryCache();

// Auto cleanup every minute and log deduplication stats
if (typeof window !== 'undefined') {
  setInterval(() => {
    queryCache.cleanup();
    queryCache.logDedupeStats();
  }, 60000);

  // Expose to window for debugging (development only)
  if (isDev) {
    (window as any).queryCache = queryCache;
    console.log('[QueryCache] Exposed to window.queryCache for debugging');
    console.log('[QueryCache] Call queryCache.getStats() to see cache statistics');
  }
}
