/**
 * POST /api/card-review-due
 * Returns cards due for review (next_review_at <= today) for the user.
 *
 * Body: { userId: string }
 * Returns: { items: Array<{ questionId, synthesisId, known, next_review_at, question_snapshot }> }
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = (req.body ?? {}) as { userId?: string };
  const userId = body.userId;
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
  const today = todayUTC();

  const { data, error } = await supabase
    .from("user_card_review")
    .select("question_id, synthesis_id, known, next_review_at, question_snapshot")
    .eq("user_id", userId)
    .lte("next_review_at", today)
    .order("next_review_at", { ascending: true })
    .limit(100);

  if (error) {
    console.error("[card-review-due] Supabase error:", error);
    res.status(500).json({ error: "Failed to load due cards" });
    return;
  }

  const items = (data ?? []).map((row) => ({
    questionId: (row as { question_id: string }).question_id,
    synthesisId: (row as { synthesis_id: string | null }).synthesis_id ?? null,
    known: (row as { known: boolean }).known,
    nextReviewAt: (row as { next_review_at: string }).next_review_at,
    questionSnapshot: (row as { question_snapshot: unknown }).question_snapshot ?? null,
  }));

  res.status(200).json({ items });
}
