/**
 * Vercel serverless: POST /api/tts-eleven
 * Text-to-speech via ElevenLabs. Keeps ELEVENLABS_API_KEY server-side only.
 *
 * Body: { text: string; voiceId?: string }
 * Returns: { audioBase64: string; contentType: string } or { error }
 *
 * Env: ELEVENLABS_API_KEY (required), ELEVENLABS_VOICE_ID (optional default voice)
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel – override with ELEVENLABS_VOICE_ID

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey || !apiKey.startsWith("sk_")) {
    res.status(500).json({ error: "ElevenLabs API key not configured (ELEVENLABS_API_KEY)" });
    return;
  }

  const body = (req.body ?? {}) as { text?: string; voiceId?: string };
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    res.status(400).json({ error: "Missing or empty 'text' in request body" });
    return;
  }

  const voiceId = typeof body.voiceId === "string" && body.voiceId.trim()
    ? body.voiceId.trim()
    : (process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID);

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({ text }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      // eslint-disable-next-line no-console
      console.error("[tts-eleven] ElevenLabs error:", response.status, errText);
      res.status(response.status).json({
        error: `ElevenLabs TTS failed: ${response.status}`,
        details: errText.slice(0, 200),
      });
      return;
    }

    const audioBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "audio/mpeg";
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");

    res.status(200).json({ audioBase64, contentType });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[tts-eleven] error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "ElevenLabs TTS failed",
    });
  }
}
