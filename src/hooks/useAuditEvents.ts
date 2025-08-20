import { useState, useEffect } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';
import { error as logError } from '../utils/logger';
import type { AuditEvent } from '../types/database';

export const useAuditEvents = (limit: number = 5) => {
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAuditEvents = async () => {
      try {
        setLoading(true);
        setError(null);

        const supabase = await getSupabaseClient();
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          throw new Error('User not authenticated');
        }

        // Fetch recent login events
        const { data, error: fetchError } = await supabase
          .from('audit_events')
          .select('*')
          .eq('user_id', user.id)
          .eq('event_type', 'login')
          .order('event_at', { ascending: false })
          .limit(limit);

        if (fetchError) {
          throw fetchError;
        }

        setAuditEvents(data || []);
      } catch (err) {
        logError('Error fetching audit events:', err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchAuditEvents();
  }, [limit]);

  const refresh = () => {
    setLoading(true);
    setError(null);
    // Re-fetch will be triggered by the useEffect
  };

  return {
    auditEvents,
    loading,
    error,
    refresh
  };
};
