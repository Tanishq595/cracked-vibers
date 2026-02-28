/**
 * POST /api/gaps-addressed
 * Get or update the list of knowledge gap IDs the user has marked as addressed.
 *
 * Body: { userId: string, addressedIds?: string[] }
 * - If addressedIds is omitted: returns current list.
 * - If addressedIds is provided: upserts and returns the saved list.
 *
 * Table: see supabase/user_gap_addressed.sql
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = (req.body ?? {}) as { userId?: string; addressedIds?: string[] };
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
  const addressedIds = Array.isArray(body.addressedIds)
    ? body.addressedIds.filter((id): id is string => typeof id === "string")
    : undefined;

  try {
    if (addressedIds !== undefined) {
      const { error } = await supabase
        .from("user_gap_addressed")
        .upsert(
          {
            user_id: userId,
            addressed_gap_ids: addressedIds,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (error) {
        console.error("[gaps-addressed] Supabase upsert error:", error);
        res.status(500).json({ error: "Failed to save addressed gaps" });
        return;
      }
    }

    const { data, error } = await supabase
      .from("user_gap_addressed")
      .select("addressed_gap_ids")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("[gaps-addressed] Supabase select error:", error);
      res.status(500).json({ error: "Failed to load addressed gaps" });
      return;
    }

    const raw = (data as { addressed_gap_ids?: unknown } | null)?.addressed_gap_ids;
    const list = Array.isArray(raw)
      ? (raw as unknown[]).filter((id): id is string => typeof id === "string")
      : [];

    res.status(200).json({ addressedIds: list });
  } catch (err) {
    console.error("[gaps-addressed]", err);
    res.status(500).json({ error: "Failed to get or update addressed gaps" });
  }
}
