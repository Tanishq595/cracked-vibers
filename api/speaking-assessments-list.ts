/**
 * Vercel serverless: GET /api/speaking-assessments-list
 *
 * Returns recent speaking sessions + their assessments for the current user.
 *
 * Query params:
 *   userId: string (Clerk user id, required)
 *   limit?: number (optional, default 20, max 100)
 *
 * Response:
 * {
 *   items: Array<{
 *     session: {...};
 *     assessment: {...} | null;
 *   }>
 * }
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const userId = typeof req.query.userId === "string" ? req.query.userId : null;
  if (!userId) {
    res.status(400).json({ error: "Missing 'userId' query parameter" });
    return;
  }

  const rawLimit =
    typeof req.query.limit === "string" ? Number(req.query.limit) : NaN;
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(100, Math.round(rawLimit))
      : 20;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    res.status(500).json({ error: "Supabase not configured" });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1) Resolve app user id (UUID) from Clerk user id
    const { data: appUser, error: userError } = await supabase
      .from("app_users")
      .select("id")
      .eq("clerk_user_id", userId)
      .maybeSingle();

    if (userError) {
      // eslint-disable-next-line no-console
      console.error("[speaking-assessments-list] app_users lookup error:", userError);
      res.status(500).json({ error: "Failed to resolve user" });
      return;
    }
    if (!appUser?.id) {
      res.status(400).json({ error: "User not initialized in database" });
      return;
    }

    // 2) Fetch recent sessions for this user
    const {
      data: sessionRows,
      error: sessionsError,
    } = await supabase
      .from("speaking_sessions")
      .select(
        "id, topic, started_at, ended_at, total_duration_sec, status, created_at"
      )
      .eq("user_id", appUser.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (sessionsError) {
      // eslint-disable-next-line no-console
      console.error(
        "[speaking-assessments-list] speaking_sessions query error:",
        sessionsError
      );
      res.status(500).json({ error: "Failed to fetch sessions" });
      return;
    }

    const sessions = sessionRows ?? [];
    if (sessions.length === 0) {
      res.status(200).json({ items: [] });
      return;
    }

    const sessionIds = sessions.map((s) => s.id as string);

    // 3) Fetch assessments for these sessions
    const {
      data: assessmentRows,
      error: assessmentsError,
    } = await supabase
      .from("speaking_session_assessments")
      .select(
        "id, session_id, model_name, overall_score, fluency_score, pronunciation_score, grammar_score, vocabulary_score, coherence_score, summary, created_at"
      )
      .in("session_id", sessionIds);

    if (assessmentsError) {
      // eslint-disable-next-line no-console
      console.error(
        "[speaking-assessments-list] assessments query error:",
        assessmentsError
      );
    }

    const bySessionId = new Map<string, unknown>();
    for (const a of assessmentRows ?? []) {
      const sid = (a as { session_id?: string }).session_id;
      if (sid && !bySessionId.has(sid)) {
        bySessionId.set(sid, a);
      }
    }

    const items = sessions.map((s) => ({
      session: s,
      assessment: bySessionId.get(s.id as string) ?? null,
    }));

    res.status(200).json({ items });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[speaking-assessments-list] unexpected error:", err);
    res.status(500).json({ error: "Failed to fetch speaking assessments" });
  }
}

