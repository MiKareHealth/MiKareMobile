import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { createPartFromUri, GoogleGenAI } from 'https://cdn.jsdelivr.net/npm/@google/genai/+esm';
import { corsHeaders } from '../_shared/cors.ts';
import { error as logError } from '../utils/logger';

// Initialize Supabase client (uses the SERVICE_ROLE key)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Initialize Google Gemini AI client
const ai = new GoogleGenAI({ apiKey: Deno.env.get('GEMINI_API_KEY')! });

serve(async (req) => {
  // Preflight CORS handling
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { bucket, path } = await req.json();
    if (!bucket || !path) {
      return new Response(
        JSON.stringify({ error: 'Missing bucket or path' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Generate a signed URL valid for 60 seconds
    const { data: urlData, error: urlError } =
      await supabase.storage.from(bucket).createSignedUrl(path, 60);
    if (urlError || !urlData?.signedUrl) {
      logError('Signed URL error:', urlError);
      return new Response(
        JSON.stringify({ error: 'Unable to generate download URL' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Fetch the file content
    const resp = await fetch(urlData.signedUrl);
    if (!resp.ok) {
      return new Response(
        JSON.stringify({ error: 'Unable to fetch file' }),
        { status: 502, headers: corsHeaders }
      );
    }
    const buf = await resp.arrayBuffer();

    // Enforce 20MB upload limit
    const sizeMB = buf.byteLength / (1024 * 1024);
    if (sizeMB > 20) {
      return new Response(
        JSON.stringify({ error: 'File exceeds 20MB limit' }),
        { status: 413, headers: corsHeaders }
      );
    }

    // Determine MIME type from extension
    const ext = path.split('.').pop()!.toLowerCase();
    let mimeType = 'application/octet-stream';
    switch (ext) {
      case 'pdf': mimeType = 'application/pdf'; break;
      case 'docx': mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'; break;
      case 'jpg':
      case 'jpeg': mimeType = 'image/jpeg'; break;
      case 'png': mimeType = 'image/png'; break;
    }
    const fileBlob = new Blob([buf], { type: mimeType });

    // Upload file to Gemini and wait for processing
    const file = await ai.files.upload({ file: fileBlob, config: { displayName: path } });
    let getFile = await ai.files.get({ name: file.name });
    while (getFile.state === 'PROCESSING') {
      await new Promise((r) => setTimeout(r, 5000));
      getFile = await ai.files.get({ name: file.name });
    }
    if (getFile.state === 'FAILED') {
      return new Response(
        JSON.stringify({ error: 'unable to process document for summary' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Generate the summary
    const parts: any[] = ['Summarize this document:'];
    if (file.uri && file.mimeType) {
      parts.push(createPartFromUri(file.uri, file.mimeType));
    }
    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: parts,
      maxOutputTokens: 30000,
    });

    return new Response(
      JSON.stringify({ summary: result.text }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    logError('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'unable to process document for summary' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
