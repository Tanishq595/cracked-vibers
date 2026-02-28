/**
 * GET /api/youtube-callback
 * OAuth callback: exchange code for tokens, store in DB, redirect to app.
 * No auth; user arrives here from Google.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const code = typeof req.query?.code === "string" ? req.query.code.trim() : "";
  const state = typeof req.query?.state === "string" ? req.query.state.trim() : "";
  const error = typeof req.query?.error === "string" ? req.query.error : "";

  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "";
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:3000";

  if (!redirectUri || !clientId || !clientSecret) {
    res.redirect(302, `${frontendOrigin}/onboarding?youtube=error&message=config`);
    return;
  }

  if (error) {
    res.redirect(302, `${frontendOrigin}/onboarding?youtube=error&message=${encodeURIComponent(error)}`);
    return;
  }

  if (!code || !state) {
    res.redirect(302, `${frontendOrigin}/onboarding?youtube=error&message=missing`);
    return;
  }

  let userId: string;
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as { userId?: string };
    userId = typeof parsed.userId === "string" ? parsed.userId : "";
  } catch {
    res.redirect(302, `${frontendOrigin}/onboarding?youtube=error&message=state`);
    return;
  }
  if (!userId) {
    res.redirect(302, `${frontendOrigin}/onboarding?youtube=error&message=state`);
    return;
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    // eslint-disable-next-line no-console
    console.error("[youtube-callback] token exchange failed", tokenRes.status, errText);
    res.redirect(302, `${frontendOrigin}/onboarding?youtube=error&message=exchange`);
    return;
  }

  const tokens = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  const refreshToken = typeof tokens.refresh_token === "string" ? tokens.refresh_token : "";
  if (!refreshToken) {
    res.redirect(302, `${frontendOrigin}/onboarding?youtube=error&message=norefresh`);
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    res.redirect(302, `${frontendOrigin}/onboarding?youtube=error&message=db`);
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  const { error: upsertError } = await supabase
    .from("youtube_connections")
    .upsert(
      {
        user_id: userId,
        refresh_token: refreshToken,
        access_token: tokens.access_token ?? null,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (upsertError) {
    // eslint-disable-next-line no-console
    console.error("[youtube-callback] upsert error", upsertError);
    res.redirect(302, `${frontendOrigin}/onboarding?youtube=error&message=db`);
    return;
  }

  res.redirect(302, `${frontendOrigin}/onboarding?youtube=connected`);
}
