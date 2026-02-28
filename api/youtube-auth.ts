/**
 * GET /api/youtube-auth
 * Returns the Google OAuth URL for YouTube. Client redirects user there.
 * Requires Authorization: Bearer <Clerk token>.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyToken } from "@clerk/backend";

const SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!secretKey || !clientId) {
    res.status(500).json({ error: "Server misconfigured (Clerk or Google OAuth not set)" });
    return;
  }

  const authHeader = req.headers.authorization;
  const token =
    typeof authHeader === "string"
      ? authHeader.replace(/^Bearer\s+/i, "").trim()
      : "";
  if (!token) {
    res.status(401).json({ error: "Authorization required" });
    return;
  }

  let userId: string;
  try {
    const payload = await verifyToken(token, { secretKey });
    userId = payload.sub ?? "";
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "";
  if (!redirectUri) {
    res.status(500).json({ error: "GOOGLE_REDIRECT_URI not set" });
    return;
  }

  const state = Buffer.from(JSON.stringify({ userId }), "utf8").toString("base64url");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.status(200).json({ url });
}
