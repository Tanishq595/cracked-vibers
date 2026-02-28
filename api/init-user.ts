/**
 * Vercel serverless: POST /api/init-user
 * Syncs the signed-in Clerk user to app_users via Supabase.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyToken } from "@clerk/backend";
import { createClient } from "@supabase/supabase-js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secretKey) {
    console.warn("[init-user] CLERK_SECRET_KEY not set – cannot verify token");
    res.status(500).json({ error: "Server misconfigured" });
    return;
  }
  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn(
      "[init-user] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set"
    );
    res.status(500).json({ error: "Server misconfigured" });
    return;
  }

  const authHeader = req.headers.authorization;
  const token =
    typeof authHeader === "string"
      ? authHeader.replace(/^Bearer\s+/i, "").trim()
      : "";
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const verified = await verifyToken(token, { secretKey });
    const userId = verified.sub;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase
      .from("app_users")
      .upsert({ clerk_user_id: userId }, { onConflict: "clerk_user_id" })
      .select("id, clerk_user_id")
      .single();

    if (error) {
      console.error("[init-user] Supabase error:", error);
      res.status(500).json({ error: "Failed to init user in database" });
      return;
    }

    res.status(200).json({
      id: data?.id,
      clerkUserId: data?.clerk_user_id,
    });
  } catch (err: unknown) {
    console.error("[init-user] error:", err);
    res.status(500).json({ error: "Failed to init user in database" });
  }
}
