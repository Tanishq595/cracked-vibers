/**
 * POST /api/study-session
 * Records a study session for "This Week" study time.
 *
 * Body: {
 *   userId: string;
 *   startedAt: string;  // ISO timestamp
 *   endedAt?: string;   // ISO timestamp (or use durationSeconds)
 *   durationSeconds?: number;
 *   source?: 'app' | 'synthesize';
 * }
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = (req.body ?? {}) as {
    userId?: string;
    startedAt?: string;
    endedAt?: string;
    durationSeconds?: number;
    source?: string;
  };

  const userId = body.userId;
  if (!userId || typeof userId !== "string") {
    res.status(400).json({ error: "Missing or invalid 'userId'" });
    return;
  }

  const startedAt = body.startedAt;
  if (!startedAt || typeof startedAt !== "string") {
    res.status(400).json({ error: "Missing or invalid 'startedAt'" });
    return;
  }

  let durationSeconds: number | null = null;
  if (typeof body.durationSeconds === "number" && body.durationSeconds >= 0) {
    durationSeconds = Math.floor(body.durationSeconds);
  } else if (body.endedAt && typeof body.endedAt === "string") {
    const start = Date.parse(startedAt);
    const end = Date.parse(body.endedAt);
    if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
      durationSeconds = Math.floor((end - start) / 1000);
    }
  }

  if (durationSeconds === null || durationSeconds <= 0) {
    res.status(400).json({ error: "Provide either durationSeconds or endedAt" });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    res.status(500).json({ error: "Supabase not configured" });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const source =
    body.source === "synthesize" || body.source === "app" ? body.source : "app";

  const { error } = await supabase.from("user_study_sessions").insert({
    user_id: userId,
    started_at: startedAt,
    ended_at: body.endedAt || null,
    duration_seconds: durationSeconds,
    source,
  });

  if (error) {
    console.error("[study-session] Supabase error:", error);
    res.status(500).json({ error: "Failed to record study session" });
    return;
  }

  res.status(200).json({ ok: true, durationSeconds });
}
