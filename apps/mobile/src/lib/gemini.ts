import { getSupabaseClient } from './supabaseClient';

interface GeminiResponse {
  text: string;
  error?: string;
}

export async function queryGemini(prompt: string, context?: string): Promise<string> {
  try {
    const supabase = await getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('No valid authentication session found');
    }

    // Get current region and build API URL
    const { getCurrentRegion, supabaseRegions } = await import('./supabaseClient');
    const currentRegion = await getCurrentRegion();
    const regionConfig = supabaseRegions[currentRegion as keyof typeof supabaseRegions];
    const apiUrl = `${regionConfig.url}/functions/v1/gemini`;
    
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
    
    return data.text;
  } catch (error: any) {
    console.error('Gemini API error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw new Error(`Failed to query Gemini AI: ${error.message}`);
  }
}
