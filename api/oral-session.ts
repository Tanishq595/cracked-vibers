/**
 * Vercel serverless: POST /api/oral-session
 * Saves an oral practice session for analytics.
 *
 * SQL for the table (run in Supabase SQL editor):
 * CREATE TABLE IF NOT EXISTS oral_practice_sessions (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id TEXT NOT NULL,
 *   topics JSONB NOT NULL DEFAULT '[]',
 *   created_at TIMESTAMPTZ NOT NULL DEFAULT now()
 * );
 * CREATE INDEX IF NOT EXISTS idx_oral_sessions_user_id ON oral_practice_sessions(user_id);
 *
 * Body:
 * { userId: string; topics: string[] }
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

  const { userId, topics } = (req.body ?? {}) as {
    userId?: string;
    topics?: string[];
  };

  if (!userId || typeof userId !== "string") {
    res.status(400).json({ error: "Missing or invalid 'userId'" });
    return;
  }
  const topicList = Array.isArray(topics) ? topics : [];

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    res.status(500).json({ error: "Supabase not configured" });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { error } = await supabase.from("oral_practice_sessions").insert({
      user_id: userId,
      topics: topicList,
    });

    if (error) {
      // eslint-disable-next-line no-console
      console.error("[oral-session] insert error:", error);
      res.status(500).json({ error: "Failed to save session" });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[oral-session] error:", err);
    res.status(500).json({ error: "Failed to save session" });
  }
}
