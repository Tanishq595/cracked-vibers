/**
 * Vercel serverless: POST /api/music
 * Generate music from lyrics + prompt via MiniMax music-2.5 (MINIMAX_API_KEY_MUSIC).
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createMusicTask } from "../src/lib/minimax";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = req.body as { lyrics?: string; prompt?: string };
  const lyrics = typeof body?.lyrics === "string" ? body.lyrics.trim() : "";
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : undefined;

  if (!lyrics) {
    res.status(400).json({ error: "Missing or empty 'lyrics' in request body." });
    return;
  }

  try {
    const result = await createMusicTask({ lyrics, prompt });
    if (result.audioUrl) {
      res.status(200).json({ audioUrl: result.audioUrl });
    } else {
      res.status(200).json({
        message: "Music generation started; URL may be in a different response shape.",
        audioUrl: null,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Music generation failed.";
    res.status(500).json({ error: message });
  }
}
