/**
 * Vercel serverless: POST /api/narrate
 * Text-to-speech via MiniMax T2A (MINIMAX_API_KEY_SPEECH).
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { textToSpeechAsync } from "../src/lib/minimax";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const text =
    typeof (req.body as { text?: string })?.text === "string"
      ? (req.body as { text: string }).text.trim()
      : "";

  if (!text) {
    res.status(400).json({ error: "Missing or empty 'text' in request body." });
    return;
  }

  try {
    const audioUrl = await textToSpeechAsync(text);
    res.status(200).json({ audioUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Narration failed.";
    res.status(500).json({ error: message });
  }
}
