import { getSupabaseClient } from './supabaseClient';
import type { ConciergeEvent, ConciergePrefs, ConciergeIntent, ConciergeResult } from '../types/database';
import { log, error as logError } from '../utils/logger';

export async function logConciergeEvent(
  intent: ConciergeIntent,
  confidence: number,
  route: string,
  result: ConciergeResult,
  meta: Record<string, any> = {}
): Promise<void> {
  try {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      logError('Cannot log concierge event: no authenticated user');
      return;
    }

    const { error } = await supabase
      .from('concierge_events')
      .insert({
        user_id: user.id,
        intent,
        confidence,
        route,
        result,
        meta
      });

    if (error) {
      logError('Failed to log concierge event:', error);
    } else {
      log('Concierge event logged successfully:', { intent, confidence, route, result });
    }
  } catch (err) {
    logError('Error logging concierge event:', err);
  }
}

export async function getConciergePrefs(): Promise<ConciergePrefs | null> {
  try {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    const { data, error } = await supabase
      .from('concierge_prefs')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      logError('Failed to get concierge prefs:', error);
      return null;
    }

    return data;
  } catch (err) {
    logError('Error getting concierge prefs:', err);
    return null;
  }
}

export async function updateConciergePrefs(prefs: Partial<ConciergePrefs>): Promise<void> {
  try {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      logError('Cannot update concierge prefs: no authenticated user');
      return;
    }

    const { error } = await supabase
      .from('concierge_prefs')
      .upsert({
        user_id: user.id,
        ...prefs,
        updated_at: new Date().toISOString()
      });

    if (error) {
      logError('Failed to update concierge prefs:', error);
    } else {
      log('Concierge prefs updated successfully');
    }
  } catch (err) {
    logError('Error updating concierge prefs:', err);
  }
}

export async function getRecentConciergeEvents(limit: number = 10): Promise<ConciergeEvent[]> {
  try {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return [];

    const { data, error } = await supabase
      .from('concierge_events')
      .select('*')
      .eq('user_id', user.id)
      .order('occurred_at', { ascending: false })
      .limit(limit);

    if (error) {
      logError('Failed to get recent concierge events:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    logError('Error getting recent concierge events:', err);
    return [];
  }
}
