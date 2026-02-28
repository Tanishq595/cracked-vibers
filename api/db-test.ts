/**
 * Vercel serverless: GET /api/db-test
 * Tests Supabase connection.
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

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    res.status(500).json({
      ok: false,
      error: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set",
    });
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase
      .from("app_users")
      .select("id, clerk_user_id")
      .limit(1);

    if (error) {
      res.status(200).json({
        ok: false,
        error: error.message,
        hint:
          "Table app_users may not exist or RLS may block. Connection to Supabase API succeeded.",
      });
      return;
    }

    res.status(200).json({
      ok: true,
      message: "Database connection OK",
      sample: data?.length ? data[0] : null,
      rowCount: data?.length ?? 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: message });
  }
}
