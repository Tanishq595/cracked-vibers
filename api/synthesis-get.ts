/**
 * Vercel serverless: POST /api/synthesis-get
 * Returns a single saved synthesis for a user.
 *
 * Body: { userId: string; synthesisId: string }
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

  const { userId, synthesisId } = (req.body ?? {}) as {
    userId?: string;
    synthesisId?: string;
  };

  if (!userId || typeof userId !== "string") {
    res.status(400).json({ error: "Missing or invalid 'userId'" });
    return;
  }
  if (!synthesisId || typeof synthesisId !== "string") {
    res.status(400).json({ error: "Missing or invalid 'synthesisId'" });
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
    .select("id, title, materials, markdown, topics, knowledge_graph, created_at")
    .eq("user_id", userId)
    .eq("id", synthesisId)
    .limit(1)
    .maybeSingle();

  if (error) {
    // eslint-disable-next-line no-console
    console.error("[synthesis-get] Supabase error:", error);
    res.status(500).json({ error: "Failed to load synthesis" });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.status(200).json({
    id: data.id,
    title: data.title,
    materials: data.materials,
    markdown: data.markdown,
    topics: data.topics,
    knowledgeGraph: data.knowledge_graph,
    createdAt: data.created_at,
  });
}

