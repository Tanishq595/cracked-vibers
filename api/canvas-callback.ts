/**
 * GET /api/canvas/callback?code=...&state=...
 * Canvas redirects here after user authorizes. Exchange code for token, store it, redirect to app.
 * When run from Vite, res has .redirect(url). Otherwise use res.status(302).setHeader(...).end().
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

type ResWithRedirect = VercelResponse & { redirect?: (url: string) => void };

const SUPABASE_OAUTH_STATE_TABLE = 'oauth_state';
const SUPABASE_CANVAS_TABLE = 'canvas_connections';

function getCanvasOrigin(): string {
  const raw = process.env.CANVAS_BASE_URL?.trim();
  if (!raw) throw new Error('CANVAS_BASE_URL not set');
  const base = raw.replace(/\/$/, '');
  return base.startsWith('http') ? base : `https://${base}`;
}

function redirect(res: ResWithRedirect, url: string): void {
  if (typeof res.redirect === 'function') {
    res.redirect(url);
  } else {
    res.status(302);
    res.setHeader?.('Location', url);
    (res as unknown as { end: () => void }).end?.();
  }
}

export default async function handler(
  req: VercelRequest,
  res: ResWithRedirect
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const code =
    (typeof req.query?.code === 'string' ? req.query.code : undefined) ??
    (Array.isArray(req.query?.code) ? req.query.code[0] : undefined);
  const state =
    (typeof req.query?.state === 'string' ? req.query.state : undefined) ??
    (Array.isArray(req.query?.state) ? req.query.state[0] : undefined);
  const error =
    (typeof req.query?.error === 'string' ? req.query.error : undefined) ??
    (Array.isArray(req.query?.error) ? req.query.error[0] : undefined);

  const appOrigin =
    process.env.CANVAS_APP_ORIGIN ||
    process.env.VITE_API_URL ||
    'http://localhost:3000';
  const dashboardPath = '/dashboard';
  const redirectTo = `${appOrigin.replace(/\/$/, '')}${dashboardPath}?canvas=connected`;

  if (error) {
    console.error('[canvas-callback] OAuth error:', error, req.query?.error_description);
    redirect(
      res,
      `${appOrigin}${dashboardPath}?canvas=error&message=${encodeURIComponent(error)}`
    );
    return;
  }

  if (!code || !state) {
    redirect(
      res,
      `${appOrigin}${dashboardPath}?canvas=error&message=missing_code_or_state`
    );
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('[canvas-callback] Supabase not configured');
    redirect(res, redirectTo + '&canvas=error');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: stateRow, error: stateError } = await supabase
    .from(SUPABASE_OAUTH_STATE_TABLE)
    .select('clerk_user_id')
    .eq('state', state)
    .single();

  if (stateError || !stateRow?.clerk_user_id) {
    console.error('[canvas-callback] Invalid or expired state:', stateError);
    redirect(res, redirectTo + '&canvas=error&message=invalid_state');
    return;
  }

  const clerkUserId = stateRow.clerk_user_id as string;
  await supabase.from(SUPABASE_OAUTH_STATE_TABLE).delete().eq('state', state);

  const clientId = process.env.CANVAS_CLIENT_ID;
  const clientSecret = process.env.CANVAS_CLIENT_SECRET;
  const redirectUri =
    process.env.CANVAS_REDIRECT_URI ||
    (process.env.VITE_API_URL || 'http://localhost:3000') + '/api/canvas/callback';

  if (!clientId || !clientSecret) {
    console.error('[canvas-callback] Canvas OAuth credentials not set');
    redirect(res, redirectTo + '&canvas=error');
    return;
  }

  const canvasOrigin = getCanvasOrigin();
  const tokenUrl = `${canvasOrigin}/login/oauth2/token`;

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  });

  let tokenRes: Response;
  try {
    tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
  } catch (err) {
    console.error('[canvas-callback] Token request failed:', err);
    redirect(res, redirectTo + '&canvas=error');
    return;
  }

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    console.error('[canvas-callback] Token exchange failed:', tokenRes.status, text);
    redirect(res, redirectTo + '&canvas=error');
    return;
  }

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const accessToken = tokenData.access_token;
  if (!accessToken) {
    console.error('[canvas-callback] No access_token in response');
    redirect(res, redirectTo + '&canvas=error');
    return;
  }

  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    : null;

  const row = {
    clerk_user_id: clerkUserId,
    access_token: accessToken,
    refresh_token: tokenData.refresh_token ?? null,
    expires_at: expiresAt,
    canvas_base_url: canvasOrigin,
  };
  const { error: upsertError } = await supabase
    .from(SUPABASE_CANVAS_TABLE)
    .upsert(row, { onConflict: 'clerk_user_id' });

  if (upsertError) {
    console.error('[canvas-callback] Failed to store token:', upsertError);
    redirect(res, redirectTo + '&canvas=error');
    return;
  }

  redirect(res, redirectTo);
}
