/**
 * POST /api/week-stats
 * Returns "This Week" stats: study time, topics mastered, gaps closed.
 *
 * Body: { userId: string }
 * Returns: {
 *   studyTimeMinutes: number;
 *   studyTimeLastWeekMinutes: number;
 *   topicsMasteredThisWeek: number;
 *   gapsClosedThisWeek: number;
 *   topicsGoal: number;
 * }
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const TOPICS_GOAL = 10;

function getWeekBoundsUTC(): {
  thisWeekStart: string;
  thisWeekEnd: string;
  lastWeekStart: string;
  lastWeekEnd: string;
} {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0
  const thisMonday = new Date(now);
  thisMonday.setUTCDate(now.getUTCDate() - diff);
  thisMonday.setUTCHours(0, 0, 0, 0);
  const thisWeekStart = thisMonday.toISOString();
  const nextMonday = new Date(thisMonday);
  nextMonday.setUTCDate(thisMonday.getUTCDate() + 7);
  const thisWeekEnd = nextMonday.toISOString();
  const lastWeekStart = new Date(thisMonday);
  lastWeekStart.setUTCDate(thisMonday.getUTCDate() - 7);
  const lastWeekEnd = thisMonday.toISOString();
  return {
    thisWeekStart,
    thisWeekEnd,
    lastWeekStart: lastWeekStart.toISOString(),
    lastWeekEnd,
  };
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
  const { thisWeekStart, thisWeekEnd, lastWeekStart, lastWeekEnd } =
    getWeekBoundsUTC();

  let studyTimeMinutes = 0;
  let studyTimeLastWeekMinutes = 0;
  let topicsMasteredThisWeek = 0;
  let gapsClosedThisWeek = 0;

  const [sessionsRes, lastWeekSessionsRes, synthesesRes, eventsRes] =
    await Promise.all([
      supabase
        .from("user_study_sessions")
        .select("duration_seconds")
        .eq("user_id", userId)
        .gte("started_at", thisWeekStart)
        .lt("started_at", thisWeekEnd),
      supabase
        .from("user_study_sessions")
        .select("duration_seconds")
        .eq("user_id", userId)
        .gte("started_at", lastWeekStart)
        .lt("started_at", lastWeekEnd),
      supabase
        .from("user_syntheses")
        .select("id")
        .eq("user_id", userId)
        .gte("created_at", thisWeekStart)
        .lt("created_at", thisWeekEnd),
      supabase
        .from("user_gap_addressed_events")
        .select("id")
        .eq("user_id", userId)
        .gte("addressed_at", thisWeekStart)
        .lt("addressed_at", thisWeekEnd),
    ]);

  if (sessionsRes.data && Array.isArray(sessionsRes.data)) {
    studyTimeMinutes =
      sessionsRes.data.reduce(
        (sum, row) =>
          sum + (Number((row as { duration_seconds?: number }).duration_seconds) || 0),
        0
      ) / 60;
  }
  if (lastWeekSessionsRes.data && Array.isArray(lastWeekSessionsRes.data)) {
    studyTimeLastWeekMinutes =
      lastWeekSessionsRes.data.reduce(
        (sum, row) =>
          sum +
          (Number((row as { duration_seconds?: number }).duration_seconds) ||
            0),
        0
      ) / 60;
  }

  if (synthesesRes.data && Array.isArray(synthesesRes.data)) {
    topicsMasteredThisWeek = synthesesRes.data.length;
  }
  if (eventsRes.data && Array.isArray(eventsRes.data)) {
    gapsClosedThisWeek = eventsRes.data.length;
  }

  res.status(200).json({
    studyTimeMinutes: Math.round(studyTimeMinutes * 10) / 10,
    studyTimeLastWeekMinutes: Math.round(studyTimeLastWeekMinutes * 10) / 10,
    topicsMasteredThisWeek,
    gapsClosedThisWeek,
    topicsGoal: TOPICS_GOAL,
  });
}
