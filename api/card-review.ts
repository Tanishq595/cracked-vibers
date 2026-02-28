/**
 * POST /api/card-review
 * Saves a flashcard as Known (review in 10 days) or Unknown (review in 1 day).
 * Upserts by (user_id, question_id).
 *
 * Body: {
 *   userId: string;
 *   questionId: string;
 *   synthesisId: string | null;
 *   known: boolean;
 *   questionSnapshot?: { prompt, correctAnswer, explanation, type, options?, topicId, difficulty? };
 * }
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

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
    questionId?: string;
    synthesisId?: string | null;
    known?: boolean;
    questionSnapshot?: Record<string, unknown>;
  };

  const userId = body.userId;
  const questionId = body.questionId;
  if (!userId || typeof userId !== "string") {
    res.status(400).json({ error: "Missing or invalid 'userId'" });
    return;
  }
  if (!questionId || typeof questionId !== "string") {
    res.status(400).json({ error: "Missing or invalid 'questionId'" });
    return;
  }

  const known = body.known === true;
  const today = todayUTC();
  const nextReviewAt = known ? addDays(today, 10) : addDays(today, 1);

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    res.status(500).json({ error: "Supabase not configured" });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const row = {
    user_id: userId,
    question_id: questionId,
    synthesis_id: typeof body.synthesisId === "string" ? body.synthesisId : null,
    known,
    next_review_at: nextReviewAt,
    question_snapshot:
      body.questionSnapshot && typeof body.questionSnapshot === "object"
        ? body.questionSnapshot
        : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("user_card_review").upsert(row, {
    onConflict: "user_id,question_id",
  });

  if (error) {
    console.error("[card-review] Supabase error:", error);
    res.status(500).json({ error: "Failed to save card review" });
    return;
  }

  res.status(200).json({ ok: true, nextReviewAt });
}
