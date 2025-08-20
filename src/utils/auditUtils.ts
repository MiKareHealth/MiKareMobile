import { getSupabaseClient, getCurrentRegion } from '../lib/supabaseClient';
import { log, error as logError } from './logger';

// Direct console logging for debugging audit events
const auditLog = (...args: any[]) => {
  console.log('[AUDIT]', ...args);
};

const auditError = (...args: any[]) => {
  console.error('[AUDIT ERROR]', ...args);
};

export type AuditEventType = 'login' | 'logout' | 'password_change' | 'patient_add' | 'patient_delete' | 'profile_update' | 'subscription_update';

export interface AuditEvent {
  user_id: string;
  event_type: AuditEventType;
  ip?: string;
  user_agent?: string;
  region?: string;
  success?: boolean;
  context?: Record<string, any>;
}

/**
 * Mask IP address for privacy (e.g., 203.0.113.xxx)
 * Returns null if IP should not be stored due to INET type constraints
 */
export const maskIP = (ip: string): string | null => {
  if (!ip) return null;
  
  // For INET type compatibility, we need to return null instead of masked IP
  // The database INET type doesn't accept "xxx" patterns
  // We'll store the original IP and handle masking in the UI display layer
  
  // Handle IPv4
  const ipv4Match = ip.match(/^(\d{1,3}\.){3}\d{1,3}$/);
  if (ipv4Match) {
    // Return the original IP - we'll mask it in the UI
    return ip;
  }
  
  // Handle IPv6
  const ipv6Match = ip.match(/^([0-9a-fA-F:]+)::([0-9a-fA-F:]+)$/);
  if (ipv6Match) {
    // Return the original IP - we'll mask it in the UI
    return ip;
  }
  
  // If it's not a valid IP format, return null
  return null;
};

/**
 * Truncate user agent string to reasonable length
 */
export const truncateUserAgent = (userAgent: string, maxLength: number = 60): string => {
  if (!userAgent) return '';
  return userAgent.length > maxLength ? `${userAgent.substring(0, maxLength)}...` : userAgent;
};

/**
 * Mask IP address for display in UI (e.g., 203.0.113.xxx)
 */
export const maskIPForDisplay = (ip: string | null): string => {
  if (!ip) return '—';
  
  // Handle IPv4
  const ipv4Match = ip.match(/^(\d{1,3}\.){3}\d{1,3}$/);
  if (ipv4Match) {
    const parts = ip.split('.');
    return `${parts.slice(0, 3).join('.')}.xxx`;
  }
  
  // Handle IPv6 (simplified)
  const ipv6Match = ip.match(/^([0-9a-fA-F:]+)::([0-9a-fA-F:]+)$/);
  if (ipv6Match) {
    return `${ipv6Match[1]}::xxx`;
  }
  
  // Fallback: truncate to first 8 characters
  return ip.length > 8 ? `${ip.substring(0, 8)}...` : ip;
};

/**
 * Get client IP address (best effort)
 */
export const getClientIP = async (): Promise<string | undefined> => {
  try {
    // Try to get IP from a public service
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.ip;
    }
  } catch (err) {
    logError('Failed to get client IP:', err);
  }
  
  return undefined;
};

/**
 * Check if audit_events table exists and is accessible
 */
export const checkAuditTableExists = async (): Promise<boolean> => {
  try {
    auditLog('🔍 Checking if audit_events table exists...');
    const supabase = await getSupabaseClient();
    
    // Try to query the audit_events table
    const { data, error } = await supabase
      .from('audit_events')
      .select('id')
      .limit(1);
    
    if (error) {
      auditError('Audit table check failed:', error);
      return false;
    }
    
    auditLog('✅ Audit table exists and is accessible');
    return true;
  } catch (err) {
    auditError('Error checking audit table:', err);
    return false;
  }
};

/**
 * Test audit table access and insert a test record
 */
export const testAuditTable = async (): Promise<void> => {
  try {
    auditLog('🧪 Testing audit table access...');
    const supabase = await getSupabaseClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      auditError('No authenticated user found for test');
      return;
    }
    
    auditLog('🧪 Current user:', user.id);
    
    // Try to insert a test audit event
    const testData = {
      user_id: user.id,
      event_type: 'login' as AuditEventType,
      user_agent: 'Test audit event',
      region: getCurrentRegion() || 'USA',
      success: true,
      context: { test: true }
    };
    
    auditLog('🧪 Test data:', JSON.stringify(testData, null, 2));
    
    const { data, error } = await supabase
      .from('audit_events')
      .insert(testData)
      .select();
    
    if (error) {
      auditError('🧪 Test insert failed:', error);
    } else {
      auditLog('🧪 Test insert successful! ID:', data?.[0]?.id);
    }
  } catch (err) {
    auditError('🧪 Test failed with exception:', err);
  }
};

/**
 * Insert audit event into database
 */
export const insertAuditEvent = async (event: AuditEvent, supabaseClient?: any): Promise<void> => {
  try {
    auditLog('=== AUDIT EVENT START ===');
    auditLog('Event type:', event.event_type);
    auditLog('User ID:', event.user_id);
    auditLog('Supabase client provided:', !!supabaseClient);
    
    // Use provided client or get the current one
    const supabase = supabaseClient || await getSupabaseClient();
    auditLog('Supabase client obtained:', !!supabase);
    
    // Get current region if not provided
    const region = event.region || getCurrentRegion() || 'USA';
    auditLog('Region:', region);
    
    // Prepare the audit event data
    const auditData = {
      user_id: event.user_id,
      event_type: event.event_type,
      ip: event.ip ? maskIP(event.ip) : null,
      user_agent: event.user_agent ? truncateUserAgent(event.user_agent) : null,
      region: region,
      success: event.success ?? true,
      context: event.context || {}
    };
    
    auditLog('Audit data prepared:', JSON.stringify(auditData, null, 2));
    
    auditLog('Attempting to insert into audit_events table...');
    const { data, error } = await supabase
      .from('audit_events')
      .insert(auditData)
      .select();
    
    if (error) {
      auditError('Failed to insert audit event:', error);
      auditError('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
    } else {
      auditLog('✅ Audit event inserted successfully!');
      auditLog('Event type:', event.event_type);
      auditLog('Inserted ID:', data?.[0]?.id);
      auditLog('=== AUDIT EVENT END ===');
    }
  } catch (err) {
    auditError('Exception during audit event insertion:', err);
    auditError('=== AUDIT EVENT FAILED ===');
    // Don't throw - audit is best-effort
  }
};

/**
 * Log login event
 */
export const logLoginEvent = async (userId: string, supabaseClient?: any): Promise<void> => {
  auditLog('🔄 LOGIN EVENT TRIGGERED');
  auditLog('User ID:', userId);
  auditLog('Supabase client provided:', !!supabaseClient);
  
  const userAgent = navigator.userAgent;
  const ip = await getClientIP();
  
  auditLog('User Agent:', userAgent);
  auditLog('IP Address:', ip);
  
  await insertAuditEvent({
    user_id: userId,
    event_type: 'login',
    user_agent: userAgent,
    ip: ip,
    success: true
  }, supabaseClient);
};

/**
 * Log logout event
 */
export const logLogoutEvent = async (userId: string, supabaseClient?: any): Promise<void> => {
  auditLog('🔄 LOGOUT EVENT TRIGGERED');
  auditLog('User ID:', userId);
  auditLog('Supabase client provided:', !!supabaseClient);
  
  const userAgent = navigator.userAgent;
  const ip = await getClientIP();
  
  auditLog('User Agent:', userAgent);
  auditLog('IP Address:', ip);
  
  await insertAuditEvent({
    user_id: userId,
    event_type: 'logout',
    user_agent: userAgent,
    ip: ip,
    success: true
  }, supabaseClient);
};

/**
 * Log password change event
 */
export const logPasswordChangeEvent = async (userId: string, supabaseClient?: any): Promise<void> => {
  auditLog('🔄 PASSWORD CHANGE EVENT TRIGGERED');
  auditLog('User ID:', userId);
  auditLog('Supabase client provided:', !!supabaseClient);
  
  const userAgent = navigator.userAgent;
  const ip = await getClientIP();
  
  auditLog('User Agent:', userAgent);
  auditLog('IP Address:', ip);
  
  await insertAuditEvent({
    user_id: userId,
    event_type: 'password_change',
    user_agent: userAgent,
    ip: ip,
    success: true
  }, supabaseClient);
};
