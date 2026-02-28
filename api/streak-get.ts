/**
 * POST /api/streak-get
 * Returns current streak (consecutive days including today) and all login dates for the user.
 *
 * Body: { userId: string }
 * Returns: { streakDays: number, loginDates: string[] } (dates as YYYY-MM-DD, sorted desc)
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function previousDay(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Count consecutive calendar days ending at today. */
function computeStreak(loginDates: string[]): number {
  const set = new Set(loginDates);
  let streak = 0;
  let date = todayUTC();
  while (set.has(date)) {
    streak++;
    date = previousDay(date);
  }
  return streak;
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

  const { data, error } = await supabase
    .from("user_login_days")
    .select("login_date")
    .eq("user_id", userId)
    .order("login_date", { ascending: false });

  if (error) {
    console.error("[streak-get] Supabase error:", error);
    res.status(500).json({ error: "Failed to load streak" });
    return;
  }

  const loginDates = (data ?? [])
    .map((row) => (row as { login_date: string }).login_date)
    .filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d));

  const streakDays = computeStreak(loginDates);

  res.status(200).json({ streakDays, loginDates });
}
