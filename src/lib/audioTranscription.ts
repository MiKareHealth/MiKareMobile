import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_API_KEY || '');

/**
 * Transcribes audio using Google's Generative AI
 * @param audioBlob The audio blob to transcribe
 * @returns A promise that resolves to the transcription text
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  try {
    // Create a model instance
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Generate content with the audio file
    const result = await model.generateContent([
      {
        inlineData: {
          data: await blobToBase64(audioBlob),
          mimeType: "audio/mpeg"
        }
      },
      "Generate a transcript of the speech in this audio recording. Format it as plain text."
    ]);
    
    const response = await result.response;
    const text = response.text();
    
    if (!text) {
      throw new Error("No transcription was generated");
    }
    
    return text;
  } catch (error) {
    console.error("Transcription error:", error);
    throw new Error(`Transcription failed: ${(error as Error).message}`);
  }
}

/**
 * Converts a Blob to a base64 string
 * @param blob The blob to convert
 * @returns A promise that resolves to the base64 string
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:audio/mpeg;base64,")
      const base64 = base64String.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}