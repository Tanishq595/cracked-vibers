import { NextResponse } from "next/server";
import { textToSpeechAsync } from "@/lib/minimax";

/** Keys stay server-side only. T2A query is rate-limited (e.g. 10 req/s); polling uses 1 request per 2s. */

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = typeof body?.text === "string" ? body.text.trim() : "";

    if (!text) {
      return NextResponse.json(
        { error: "Missing or empty 'text' in request body." },
        { status: 400 }
      );
    }

    const audioUrl = await textToSpeechAsync(text);
    return NextResponse.json({ audioUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Narration failed.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
