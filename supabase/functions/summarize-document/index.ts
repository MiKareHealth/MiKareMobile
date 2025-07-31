// functions/summarize-document/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Summarize plain text via Gemini
 */
async function summarizeWithGemini(apiKey: string, text: string): Promise<string> {
  const res = await fetch(
    `${GEMINI_API_BASE}/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Summarize for a medical record:\n\n${text}` }] }],
        generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 15,000 },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        ],
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(`Gemini error ${res.status}: ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  return (
    data.candidates?.[0]?.text ||
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    ""
  );
}

/**
 * Summarize PDF via inline base64 in a single call
 */
async function summarizeWithGeminiFile(
  apiKey: string,
  base64Data: string,
  mimeType: string
): Promise<string> {
  const parts = [
    { text: "Summarize this document for a medical record system." },
    { inlineData: { mimeType, data: base64Data } },
  ];
  const res = await fetch(
    `${GEMINI_API_BASE}/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 1024 },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        ],
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(`Gemini error ${res.status}: ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  return (
    data.candidates?.[0]?.text ||
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    ""
  );
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Log the incoming request body for debugging
  let body: { document_id?: string };
  try {
    body = await req.json();
    console.log("Received payload:", body);
    if (!body.document_id) throw new Error();
  } catch {
    return new Response(
      JSON.stringify({ error: "Request must include { document_id: string }" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Validate API key
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) {
    return new Response(JSON.stringify({ error: "GEMINI_API_KEY not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Init Supabase with service role
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) {
    return new Response(
      JSON.stringify({ error: "Supabase env vars (URL/key) not set" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1) Fetch document record
  const { data: doc, error: docErr } = await supabase
    .from("patient_documents")
    .select("id, file_url, file_type")
    .eq("id", body.document_id)
    .single();
  if (docErr || !doc) {
    return new Response(
      JSON.stringify({ error: "Document not found: " + docErr?.message }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 2) Extract storage path and download bytes
  const url = new URL(doc.file_url);
  let path: string | null = null;
  for (const prefix of ["/storage/v1/object/public/", "/storage/v1/object/"]) {
    if (url.pathname.includes(prefix)) {
      const [, bucketAndKey] = url.pathname.split(prefix);
      const [, ...keyParts] = bucketAndKey.split("/");
      path = keyParts.join("/");
      break;
    }
  }
  if (!path) {
    return new Response(
      JSON.stringify({ error: "Unable to parse file path from URL" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  const { data: signed, error: signErr } = await supabase
    .storage
    .from("patient-documents")
    .createSignedUrl(path, 60);
  if (signErr || !signed.signedUrl) {
    return new Response(
      JSON.stringify({ error: "Signed URL error: " + signErr?.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  const fileRes = await fetch(signed.signedUrl);
  if (!fileRes.ok) {
    return new Response(
      JSON.stringify({ error: `Download failed ${fileRes.status}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  const buffer = await fileRes.arrayBuffer();

  // 3) Summarize
  let summary: string;
  try {
    if (doc.file_type === "text/plain") {
      const text = new TextDecoder().decode(buffer);
      try {
        summary = await summarizeWithGemini(geminiKey, text);
      } catch (err) {
        console.error("Gemini API error (plain text):", err);
        throw err;
      }
    } else if (doc.file_type === "application/pdf") {
      // base64-encode PDF bytes
      const uint8 = new Uint8Array(buffer);
      const b64 = btoa(String.fromCharCode(...uint8));
      try {
        summary = await summarizeWithGeminiFile(geminiKey, b64, doc.file_type);
      } catch (err) {
        console.error("Gemini API error (PDF):", err);
        throw err;
      }
    } else {
      throw new Error("Unsupported file type for summarization");
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Summarization failed: " + (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 4) Persist summary
  const { error: updErr } = await supabase
    .from("patient_documents")
    .update({ summary })
    .eq("id", body.document_id);
  if (updErr) {
    return new Response(
      JSON.stringify({ error: "DB update failed: " + updErr.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 5) Return
  return new Response(JSON.stringify({ summary }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
