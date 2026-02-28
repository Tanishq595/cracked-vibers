/**
 * Vercel serverless: POST /api/mastery-get
 * Returns topic mastery for a user.
 *
 * Body: { userId: string }
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

  const { userId } = (req.body ?? {}) as { userId?: string };
  if (!userId || typeof userId !== "string") {
    res.status(400).json({ error: "Missing or invalid 'userId'" });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    res.status(500).json({ error: "Supabase not configured" });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from("user_topic_mastery")
    .select("topic_id, topic_label, mastery_score, last_practiced_at, total_correct, total_attempts")
    .eq("user_id", userId);

  if (error) {
    // eslint-disable-next-line no-console
    console.error("[mastery-get] Supabase error:", error);
    res.status(500).json({ error: "Failed to load mastery" });
    return;
  }

  res.status(200).json({
    items:
      data?.map((row) => ({
        topicId: row.topic_id as string,
        topicLabel: row.topic_label as string,
        masteryScore: row.mastery_score as number | null,
        lastPracticedAt: row.last_practiced_at as string | null,
        totalCorrect: row.total_correct as number | null,
        totalAttempts: row.total_attempts as number | null,
      })) ?? [],
  });
}

