/**
 * GET /api/youtube-data
 * Returns YouTube connection status and playlists. Requires Authorization: Bearer <Clerk token>.
 * Refreshes access token if expired.
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

async function refreshAccessToken(
  refreshToken: string
): Promise<{ access_token: string; expires_in: number } | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  const access_token = typeof data.access_token === "string" ? data.access_token : "";
  const expires_in = typeof data.expires_in === "number" ? data.expires_in : 3600;
  return access_token ? { access_token, expires_in } : null;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "GET") {
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
  const { data: row, error: fetchError } = await supabase
    .from("youtube_connections")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .single();

  if (fetchError || !row) {
    res.status(200).json({ connected: false });
    return;
  }

  let accessToken = typeof row.access_token === "string" ? row.access_token : "";
  const refreshToken = typeof row.refresh_token === "string" ? row.refresh_token : "";
  if (!refreshToken) {
    res.status(200).json({ connected: false });
    return;
  }

  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  const now = Date.now();
  if (!accessToken || expiresAt < now + 5 * 60 * 1000) {
    const refreshed = await refreshAccessToken(refreshToken);
    if (!refreshed) {
      res.status(200).json({ connected: false, error: "Token refresh failed" });
      return;
    }
    accessToken = refreshed.access_token;
    const newExpiresAt = new Date(now + refreshed.expires_in * 1000).toISOString();
    await supabase
      .from("youtube_connections")
      .update({
        access_token: accessToken,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
  }

  const channelRes = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  let channelTitle = "";
  let channelId = "";
  if (channelRes.ok) {
    const channelData = (await channelRes.json()) as {
      items?: Array<{ id?: string; snippet?: { title?: string } }>;
    };
    const item = channelData.items?.[0];
    if (item) {
      channelId = item.id ?? "";
      channelTitle = item.snippet?.title ?? "";
    }
  }

  const playlistsRes = await fetch(
    "https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const playlists: Array<{
    id: string;
    title: string;
    videoCount: number;
    thumbnailUrl: string;
  }> = [];
  if (playlistsRes.ok) {
    const listData = await playlistsRes.json() as Record<string, unknown>;
    const arr = Array.isArray(listData.items) ? listData.items : [];
    arr.forEach(function (item: Record<string, unknown>) {
      const snip = item.snippet as Record<string, unknown> | undefined;
      const thumbs = snip && (snip.thumbnails as Record<string, { url?: string } | undefined>);
      const thumb = (thumbs && thumbs.medium && thumbs.medium.url) || (thumbs && thumbs.default && thumbs.default.url) || "";
      const details = item.contentDetails as { itemCount?: number } | undefined;
      playlists.push({
        id: (item.id as string) || "",
        title: (snip && (snip.title as string)) || "Untitled",
        videoCount: (details && details.itemCount) || 0,
        thumbnailUrl: thumb,
      });
    });
  }

  res.status(200).json({
    connected: true,
    channelId,
    channelTitle,
    playlists,
  });
}
