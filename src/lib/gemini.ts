import { getSupabaseClient } from './supabaseClient';
import { getCurrentRegion } from './regionDetection';
import { supabaseRegions } from '../config/supabaseRegions';
import { log, error as logError } from '../utils/logger';

interface GeminiResponse {
  text: string;
  error?: string;
}

export async function queryGemini(prompt: string, context?: string): Promise<string> {
  const region = getCurrentRegion() || 'USA';
  const regionConfig = supabaseRegions[region];
  const apiUrl = `${regionConfig.url}/functions/v1/gemini`;
  
  try {
    const supabase = await getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('No valid authentication session found');
    }

    log('Querying Gemini API...');
    
    // Basic rate limiting - if too many AI requests are made in quick succession
    const now = Date.now();
    const lastRequestTime = parseInt(localStorage.getItem('lastGeminiRequest') || '0');
    if (now - lastRequestTime < 2000) { // 2 second minimum between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    localStorage.setItem('lastGeminiRequest', Date.now().toString());
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, context }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    let data: GeminiResponse;
    try {
      data = await response.json();
    } catch (error) {
      throw new Error('Invalid response format from Gemini API');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    if (!data.text) {
      throw new Error('No text response received from Gemini API');
    }

    log('Gemini API response received successfully');
    
    return data.text;
  } catch (error: any) {
    logError('Detailed Gemini query error:', {
      error: error.message,
      prompt,
      contextLength: context?.length,
    });
    throw new Error(`Failed to query Gemini AI: ${error.message}`);
  }
}