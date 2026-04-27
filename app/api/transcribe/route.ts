/* /api/transcribe */
import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

// Initialize with the API key from your environment variables
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("file");

    // 1. Validation
    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    if (!(audioFile instanceof File)) {
      return NextResponse.json({ error: "Invalid file format" }, { status: 400 });
    }

    // 2. Transcription Request
    // Note: We hardcode the model here for security so the client can't change it.
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-large-v3-turbo",
      response_format: "json", // Ensures we get a clean JSON response
    });

    // 3. Return the transcription text
    // The transcription object looks like: { text: "Hello world" }
    return NextResponse.json({ 
      text: transcription.text, 
      success: true 
    });

  } catch (error: any) {
    console.error("Groq API Error:", error);

    // This prevents the "Unexpected end of JSON" error on the frontend
    // by ensuring we ALWAYS send back valid JSON even when things break.
    return NextResponse.json(
      { 
        error: error.message || "Failed to transcribe audio",
        success: false 
      }, 
      { status: 500 }
    );
  }
}