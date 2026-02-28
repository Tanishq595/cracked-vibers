/**
 * Vercel serverless: POST /api/syntheses-list
 * Lists recent syntheses for a user.
 *
 * Body: { userId: string }
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

  const { userId } = (req.body ?? {}) as { userId?: string };
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
    .from("user_syntheses")
    .select("id, title, topics, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    // eslint-disable-next-line no-console
    console.error("[syntheses-list] Supabase error:", error);
    res.status(500).json({ error: "Failed to load syntheses" });
    return;
  }

  const items =
    data?.map((row) => {
      const topics = (row as { topics?: unknown }).topics as
        | Array<{ label?: string }>
        | null
        | undefined;
      const topicLabels = Array.isArray(topics)
        ? topics
            .map((t) => t?.label)
            .filter((l): l is string => typeof l === "string")
            .slice(0, 3)
        : [];
      return {
        id: (row as { id: string }).id,
        title:
          (row as { title?: string | null }).title ??
          topicLabels[0] ??
          "Untitled synthesis",
        createdAt: (row as { created_at?: string | null }).created_at ?? null,
        topicLabels,
      };
    }) ?? [];

  res.status(200).json({ items });
}

