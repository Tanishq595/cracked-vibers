/**
 * Dev-server handler for GET /api/db-test.
 * Tests Supabase connection (same API as init-user – no direct Postgres).
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config();

export async function handleDbTest(): Promise<{ status: number; body: object }> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      status: 500,
      body: {
        ok: false,
        error: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set",
      },
    };
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase
      .from("app_users")
      .select("id, clerk_user_id")
      .limit(1);

    if (error) {
      return {
        status: 200,
        body: {
          ok: false,
          error: error.message,
          hint: "Table app_users may not exist or RLS may block. Connection to Supabase API succeeded.",
        },
      };
    }

    return {
      status: 200,
      body: {
        ok: true,
        message: "Database connection OK",
        sample: data?.length ? data[0] : null,
        rowCount: data?.length ?? 0,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      status: 500,
      body: { ok: false, error: message },
    };
  }
}
