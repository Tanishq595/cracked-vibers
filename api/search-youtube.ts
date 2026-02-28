/**
 * POST /api/search-youtube
 * Search YouTube (public) using the user's OAuth token. Auth required.
 * Body: { query: string }
 * Returns: { results: { title, url, description, videoId, thumbnailUrl }[] }
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

async function getAccessToken(userId: string): Promise<string | null> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!supabaseUrl || !supabaseServiceKey || !clientId || !clientSecret) return null;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: row } = await supabase
    .from("youtube_connections")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .single();

  if (!row || typeof row.refresh_token !== "string") return null;
  let accessToken = typeof row.access_token === "string" ? row.access_token : "";
  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  const now = Date.now();

  if (!accessToken || expiresAt < now + 5 * 60 * 1000) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: row.refresh_token,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    accessToken = typeof data.access_token === "string" ? data.access_token : "";
    if (!accessToken) return null;
    const newExpiresAt = new Date(now + (typeof data.expires_in === "number" ? data.expires_in : 3600) * 1000).toISOString();
    await supabase
      .from("youtube_connections")
      .update({ access_token: accessToken, expires_at: newExpiresAt, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
  }
  return accessToken;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const userId = await getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authorization required" });
    return;
  }

  const query = typeof req.body?.query === "string" ? req.body.query.trim() : "";
  if (!query) {
    res.status(400).json({ error: "Missing or empty 'query' in body" });
    return;
  }

  const accessToken = await getAccessToken(userId);
  if (!accessToken) {
    res.status(200).json({ results: [] });
    return;
  }

  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    q: query,
    maxResults: "15",
  });
  const searchRes = await fetch(
    "https://www.googleapis.com/youtube/v3/search?" + params.toString(),
    { headers: { Authorization: "Bearer " + accessToken } }
  );

  if (!searchRes.ok) {
    res.status(200).json({ results: [] });
    return;
  }

  const searchData = (await searchRes.json()) as {
    items?: Array<{
      id?: { videoId?: string };
      snippet?: {
        title?: string;
        description?: string;
        thumbnails?: { default?: { url?: string }; medium?: { url?: string }; high?: { url?: string } };
      };
    }>;
  };

  const results = (searchData.items || []).map((item) => {
    const videoId = item.id?.videoId || "";
    const snip = item.snippet || {};
    const thumb = snip.thumbnails?.medium?.url || snip.thumbnails?.high?.url || snip.thumbnails?.default?.url || "";
    return {
      title: snip.title || "Video",
      url: videoId ? "https://www.youtube.com/watch?v=" + videoId : "",
      description: snip.description || "",
      videoId,
      thumbnailUrl: thumb,
    };
  });

  res.status(200).json({ results });
}
