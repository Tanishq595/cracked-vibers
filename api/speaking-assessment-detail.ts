/**
 * Vercel serverless: GET /api/speaking-assessment-detail
 *
 * Returns a single speaking session, its assessment (if any),
 * and the full turn-by-turn transcript for the current user.
 *
 * Query params:
 *   userId: string     (Clerk user id, required)
 *   sessionId: string  (UUID of speaking_sessions.id, required)
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
  const sessionId =
    typeof req.query.sessionId === "string" ? req.query.sessionId : null;

  if (!userId) {
    res.status(400).json({ error: "Missing 'userId' query parameter" });
    return;
  }
  if (!sessionId) {
    res.status(400).json({ error: "Missing 'sessionId' query parameter" });
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
    // 1) Resolve app user id (UUID) from Clerk user id
    const { data: appUser, error: userError } = await supabase
      .from("app_users")
      .select("id")
      .eq("clerk_user_id", userId)
      .maybeSingle();

    if (userError) {
      // eslint-disable-next-line no-console
      console.error(
        "[speaking-assessment-detail] app_users lookup error:",
        userError
      );
      res.status(500).json({ error: "Failed to resolve user" });
      return;
    }
    if (!appUser?.id) {
      res.status(400).json({ error: "User not initialized in database" });
      return;
    }

    // 2) Fetch session (and ensure it belongs to this user)
    const {
      data: sessionRows,
      error: sessionError,
    } = await supabase
      .from("speaking_sessions")
      .select(
        "id, user_id, topic, started_at, ended_at, total_duration_sec, stt_provider, transcript_language, full_transcript, audio_url, status, created_at, updated_at"
      )
      .eq("id", sessionId)
      .eq("user_id", appUser.id)
      .limit(1);

    if (sessionError) {
      // eslint-disable-next-line no-console
      console.error(
        "[speaking-assessment-detail] speaking_sessions query error:",
        sessionError
      );
      res.status(500).json({ error: "Failed to fetch session" });
      return;
    }

    const session = sessionRows?.[0];
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    // 3) Fetch assessment (if any)
    const {
      data: assessmentRows,
      error: assessmentError,
    } = await supabase
      .from("speaking_session_assessments")
      .select(
        "id, session_id, model_name, overall_score, fluency_score, pronunciation_score, grammar_score, vocabulary_score, coherence_score, summary, strengths, suggestions, created_at"
      )
      .eq("session_id", session.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (assessmentError) {
      // eslint-disable-next-line no-console
      console.error(
        "[speaking-assessment-detail] assessment query error:",
        assessmentError
      );
    }

    const assessment = assessmentRows?.[0] ?? null;

    // 4) Fetch turns
    const {
      data: turnsRows,
      error: turnsError,
    } = await supabase
      .from("speaking_session_turns")
      .select(
        "id, session_id, sequence_number, speaker, start_time_ms, end_time_ms, text, audio_url, created_at"
      )
      .eq("session_id", session.id)
      .order("sequence_number", { ascending: true });

    if (turnsError) {
      // eslint-disable-next-line no-console
      console.error(
        "[speaking-assessment-detail] speaking_session_turns query error:",
        turnsError
      );
    }

    res.status(200).json({
      session,
      assessment,
      turns: turnsRows ?? [],
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[speaking-assessment-detail] unexpected error:", err);
    res.status(500).json({ error: "Failed to fetch speaking assessment detail" });
  }
}

