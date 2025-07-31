import { GoogleGenAI } from "npm:@google/generative-ai@0.2.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Handle CORS preflight requests
async function handleCors(request: Request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 200,
    });
  }
  return null;
}

Deno.serve(async (req) => {
  // Handle CORS
  const corsResponse = await handleCors(req);
  if (corsResponse) return corsResponse;
  
  try {
    // Get the API key from environment variables
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured");
    }
    
    // Create a new instance of the Google Generative AI client
    const ai = new GoogleGenAI({ apiKey });

    // Get form data from the request
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    
    if (!audioFile) {
      throw new Error("No audio file provided");
    }

    // Check file size (20MB limit)
    if (audioFile.size > 20 * 1024 * 1024) {
      throw new Error("Audio file exceeds maximum size of 20MB");
    }

    // Get file type
    const mimeType = audioFile.type;
    if (!['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/aiff', 'audio/aac', 'audio/ogg', 'audio/flac'].includes(mimeType)) {
      throw new Error("Unsupported audio file format. Supported formats: WAV, MP3, AIFF, AAC, OGG, FLAC");
    }
    
    // Read file content into an ArrayBuffer
    const audioArrayBuffer = await audioFile.arrayBuffer();
    
    // Create a temporary file in Deno's filesystem
    const tempFilePath = `/tmp/audio-${Date.now()}.${audioFile.name.split('.').pop()}`;
    await Deno.writeFile(tempFilePath, new Uint8Array(audioArrayBuffer));
    
    // Upload the file to Google's Generative AI API
    const uploadedFile = await ai.files.upload({
      file: tempFilePath,
      config: { mimeType },
    });
    
    // Request transcription
    const transcriptionResponse = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        { role: "user", parts: [
          { fileData: { fileUri: uploadedFile.uri, mimeType } },
          { text: "Generate a detailed transcript of the speech in this audio." }
        ]}
      ],
    });

    const result = transcriptionResponse.response;
    const transcription = result.text();

    // Delete the temporary file
    try {
      await Deno.remove(tempFilePath);
    } catch (error) {
      console.error("Error deleting temporary file:", error);
    }

    // Return the transcription
    return new Response(
      JSON.stringify({ text: transcription }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error.message);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "An error occurred during audio transcription" 
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});