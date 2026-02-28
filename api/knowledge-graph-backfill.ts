/**
 * POST /api/knowledge-graph-backfill
 * Builds the user's knowledge graph from all existing syntheses (for users who had
 * syntheses before the graph feature). Merges each synthesis in created_at order.
 *
 * Body: { userId: string }
 * Returns: { ok: true, merged: number }
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { mergeOneSynthesis } from "./knowledge-graph-merge";

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

  const { data: syntheses, error: listError } = await supabase
    .from("user_syntheses")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (listError) {
    console.error("[knowledge-graph-backfill] list error:", listError);
    res.status(500).json({ error: "Failed to list syntheses" });
    return;
  }

  const ids = (syntheses ?? [])
    .map((row) => (row as { id: string }).id)
    .filter((id): id is string => typeof id === "string");

  let merged = 0;
  for (const synthesisId of ids) {
    try {
      await mergeOneSynthesis(supabase, userId, synthesisId);
      merged += 1;
    } catch (err) {
      console.error("[knowledge-graph-backfill] merge failed for", synthesisId, err);
    }
  }

  res.status(200).json({ ok: true, merged });
}
