/**
 * Edge function to proxy requests to Google Gemini for AI content generation.
 * 
 * Environment variables required:
 *   - GOOGLE_API_KEY: your Google Cloud API key with access to Gemini.
 */ const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
Deno.serve(async (req)=>{
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  // Fail fast if no API key
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({
      error: "GEMINI_API_KEY environment variable is not set"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  // Parse and validate request body
  let body;
  try {
    body = await req.json();
    if (!body.prompt) throw new Error();
  } catch  {
    return new Response(JSON.stringify({
      error: "Invalid request: JSON body with a non-empty `prompt` field is required"
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  // Determine region from ?region= query parameter (AU, UK, or USA), default to USA
  const url = new URL(req.url);
  const regionParam = (url.searchParams.get("region") || "").toUpperCase();
  const region = [
    "AU",
    "UK",
    "USA"
  ].includes(regionParam) ? regionParam : "AU";
  // Construct the full prompt
  const fullPrompt = body.context ? `Context: ${body.context}\n\nPrompt: ${body.prompt}` : body.prompt;
  try {
    // Call Gemini API
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: fullPrompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    });
    if (!resp.ok) {
      const errorData = await resp.json().catch(()=>null);
      console.error("Gemini API error response:", errorData);
      throw new Error(`Gemini API responded with ${resp.status} ${resp.statusText}`);
    }
    const data = await resp.json();
    const text = data.candidates?.[0]?.text || data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Gemini API returned no text");
    }
    return new Response(JSON.stringify({
      text
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (err) {
    console.error("Function error:", err);
    return new Response(JSON.stringify({
      error: err.message || "Internal server error"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
