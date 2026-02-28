/**
 * POST /api/streak-record
 * Records "today" (UTC date) as a login day for the user. Idempotent: safe to call every session.
 *
 * Body: { userId: string }
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

function todayUTC(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
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
  const loginDate = todayUTC();

  const { error } = await supabase
    .from("user_login_days")
    .upsert(
      { user_id: userId, login_date: loginDate },
      { onConflict: "user_id,login_date" }
    );

  if (error) {
    console.error("[streak-record] Supabase error:", error);
    res.status(500).json({ error: "Failed to record login day" });
    return;
  }

  res.status(200).json({ ok: true, loginDate });
}
