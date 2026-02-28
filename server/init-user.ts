/**
 * Dev-server handler for POST /api/init-user.
 * Syncs the signed-in Clerk user to app_users via Supabase API (no direct Postgres – works when db.* DNS fails).
 */
import { config } from "dotenv";
import { verifyToken } from "@clerk/backend";
import { createClient } from "@supabase/supabase-js";

config();

export async function handleInitUser(authHeader: string | null): Promise<{
  status: number;
  body: object;
}> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secretKey) {
    console.warn("[init-user] CLERK_SECRET_KEY not set – cannot verify token");
    return { status: 500, body: { error: "Server misconfigured" } };
  }
  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn("[init-user] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set");
    return { status: 500, body: { error: "Server misconfigured" } };
  }

  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return { status: 401, body: { error: "Unauthorized" } };
  }

  try {
    const verified = await verifyToken(token, { secretKey });
    const userId = verified.sub;
    if (!userId) {
      return { status: 401, body: { error: "Unauthorized" } };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase
      .from("app_users")
      .upsert({ clerk_user_id: userId }, { onConflict: "clerk_user_id" })
      .select("id, clerk_user_id")
      .single();

    if (error) {
      console.error("[init-user] Supabase error:", error);
      return { status: 500, body: { error: "Failed to init user in database" } };
    }

    return {
      status: 200,
      body: {
        id: data?.id,
        clerkUserId: data?.clerk_user_id,
      },
    };
  } catch (err: unknown) {
    console.error("[init-user] error:", err);
    return { status: 500, body: { error: "Failed to init user in database" } };
  }
}
