/**
 * YouTube watch history (when user plays a video in the in-app iframe).
 * GET (with auth): list history. Query: ?limit=50 (optional).
 * POST (with auth): record one watch. Body: { video_id: string, video_url?: string, title?: string }
 * DELETE (with auth): clear all watch history for the user.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyToken } from "@clerk/backend";
import { createClient } from "@supabase/supabase-js";

function getUserId(req: VercelRequest): Promise<string | null> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return Promise.resolve(null);
  const authHeader = req.headers.authorization;
  const token =
    typeof authHeader === "string"
      ? authHeader.replace(/^Bearer\s+/i, "").trim()
      : "";
  if (!token) return Promise.resolve(null);
  return verifyToken(token, { secretKey })
    .then((p) => p.sub ?? null)
    .catch(() => null);
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "GET" && req.method !== "POST" && req.method !== "DELETE") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const userId = await getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authorization required" });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    res.status(500).json({ error: "Database not configured" });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (req.method === "GET") {
    const limit = Math.min(
      Math.max(1, parseInt(String(req.query?.limit || "50"), 10) || 50),
      100
    );
    const { data, error } = await supabase
      .from("youtube_watch_history")
      .select("id, video_id, video_url, title, watched_at")
      .eq("user_id", userId)
      .order("watched_at", { ascending: false })
      .limit(limit);

    if (error) {
      // eslint-disable-next-line no-console
      console.error("[youtube-watch-history] list error:", error);
      res.status(500).json({ error: "Failed to load watch history" });
      return;
    }

    const items = (data ?? []).map((row) => ({
      id: row.id,
      video_id: row.video_id,
      video_url: row.video_url ?? (row.video_id ? `https://www.youtube.com/watch?v=${row.video_id}` : null),
      title: row.title ?? null,
      watched_at: row.watched_at,
    }));
    res.status(200).json({ history: items });
    return;
  }

  if (req.method === "DELETE") {
    const { error } = await supabase
      .from("youtube_watch_history")
      .delete()
      .eq("user_id", userId);

    if (error) {
      // eslint-disable-next-line no-console
      console.error("[youtube-watch-history] delete error:", error);
      res.status(500).json({ error: "Failed to clear watch history" });
      return;
    }
    res.status(200).json({ ok: true });
    return;
  }

  // POST: record one watch
  const body = (req.body ?? {}) as {
    video_id?: string;
    video_url?: string;
    title?: string;
  };
  const videoId = typeof body.video_id === "string" ? body.video_id.trim() : "";
  if (!videoId) {
    res.status(400).json({ error: "video_id required" });
    return;
  }

  const videoUrl =
    typeof body.video_url === "string"
      ? body.video_url.trim()
      : `https://www.youtube.com/watch?v=${videoId}`;
  const title = typeof body.title === "string" ? body.title.trim() || null : null;

  const { error } = await supabase.from("youtube_watch_history").insert({
    user_id: userId,
    video_id: videoId,
    video_url: videoUrl,
    title,
    watched_at: new Date().toISOString(),
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error("[youtube-watch-history] insert error:", error);
    res.status(500).json({ error: "Failed to save watch history" });
    return;
  }

  res.status(200).json({ ok: true });
}
