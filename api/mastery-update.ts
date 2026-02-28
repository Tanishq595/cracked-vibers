/**
 * Vercel serverless: POST /api/mastery-update
 * Updates topic mastery for a user after a practice session.
 *
 * Body:
 * {
 *   userId: string;
 *   results: Array<{ topicId: string; topicLabel: string; correct: boolean }>;
 * }
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

type ResultItem = {
  topicId: string;
  topicLabel: string;
  correct: boolean;
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { userId, results } = (req.body ?? {}) as {
    userId?: string;
    results?: ResultItem[];
  };

  if (!userId || typeof userId !== "string") {
    res.status(400).json({ error: "Missing or invalid 'userId'" });
    return;
  }
  if (!Array.isArray(results) || results.length === 0) {
    res.status(400).json({ error: "Missing or empty 'results' array" });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    res.status(500).json({ error: "Supabase not configured" });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    for (const r of results) {
      if (!r || !r.topicId || typeof r.correct !== "boolean") continue;

      const { data: existingRows, error: selectError } = await supabase
        .from("user_topic_mastery")
        .select(
          "id, mastery_score, total_correct, total_attempts"
        )
        .eq("user_id", userId)
        .eq("topic_id", r.topicId)
        .limit(1);

      if (selectError) {
        // eslint-disable-next-line no-console
        console.error("[mastery-update] select error:", selectError);
        continue;
      }

      const existing = existingRows?.[0] as
        | {
            id: string;
            mastery_score: number | null;
            total_correct: number | null;
            total_attempts: number | null;
          }
        | undefined;

      const prevCorrect = existing?.total_correct ?? 0;
      const prevAttempts = existing?.total_attempts ?? 0;

      const newAttempts = prevAttempts + 1;
      const newCorrect = prevCorrect + (r.correct ? 1 : 0);
      const successRate = newAttempts > 0 ? newCorrect / newAttempts : 0;

      const newScoreRaw = 10 + 90 * successRate;
      const newScore = Math.max(0, Math.min(100, newScoreRaw));

      const upsertPayload = {
        user_id: userId,
        topic_id: r.topicId,
        topic_label: r.topicLabel ?? r.topicId,
        mastery_score: newScore,
        total_correct: newCorrect,
        total_attempts: newAttempts,
        last_practiced_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from("user_topic_mastery")
        .upsert(upsertPayload, {
          onConflict: "user_id,topic_id",
        });

      if (upsertError) {
        // eslint-disable-next-line no-console
        console.error("[mastery-update] upsert error:", upsertError);
      }
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[mastery-update] error:", err);
    res.status(500).json({ error: "Failed to update mastery" });
  }
}

