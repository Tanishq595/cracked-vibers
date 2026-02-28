/**
 * POST /api/canvas/auth-url
 * Returns the Canvas OAuth login URL and stores state for the callback.
 * Requires Authorization: Bearer <Clerk token>.
 * Response: { url: "https://<canvas>/login/oauth2/auth?..." }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '@clerk/backend';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

const SUPABASE_OAUTH_STATE_TABLE = 'oauth_state';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    res.status(500).json({ error: 'Server misconfigured (Clerk)' });
    return;
  }

  // Prefer token from body (form POST or JSON) so we never rely on Authorization header
  let token = '';
  if (req.body && typeof req.body === 'object' && 'token' in req.body) {
    const t = (req.body as { token?: unknown }).token;
    token = typeof t === 'string' ? t : '';
  }
  if (!token) {
    const rawAuth =
      req.headers.authorization ??
      req.headers.Authorization ??
      (req.headers as Record<string, string | string[] | undefined>)['authorization'] ??
      (req.headers as Record<string, string | string[] | undefined>)['Authorization'];
    const authStr = typeof rawAuth === 'string' ? rawAuth : Array.isArray(rawAuth) ? rawAuth[0] : '';
    token = authStr.replace(/^Bearer\s+/i, '').trim();
  }
  if (!token) {
    res.status(401).json({
      error: 'Unauthorized. Sign in first, then connect Canvas.',
      hint: 'No Authorization header received. Ensure you are signed in and the request includes Bearer <token>.',
    });
    return;
  }

  let clerkUserId: string;
  try {
    const verified = await verifyToken(token, { secretKey });
    clerkUserId = verified.sub;
    if (!clerkUserId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
  } catch (err) {
    console.warn('[canvas-auth-url] Token verification failed:', err instanceof Error ? err.message : err);
    res.status(401).json({
      error: 'Invalid or expired session. Try signing out and back in, then connect Canvas again.',
    });
    return;
  }

  const clientId = process.env.CANVAS_CLIENT_ID;
  const baseUrl = process.env.CANVAS_BASE_URL?.trim();
  const redirectUri = process.env.CANVAS_REDIRECT_URI?.trim();

  if (!clientId || !baseUrl) {
    res.status(500).json({
      error:
        'Canvas OAuth not configured. Set CANVAS_CLIENT_ID and CANVAS_BASE_URL.',
    });
    return;
  }

  const canvasBase = baseUrl.replace(/\/$/, '');
  const canvasOrigin = canvasBase.startsWith('http')
    ? canvasBase
    : `https://${canvasBase}`;
  const finalRedirectUri =
    redirectUri ||
    (process.env.VITE_API_URL || 'http://localhost:3000') + '/api/canvas/callback';

  const state = randomBytes(24).toString('hex');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase.from(SUPABASE_OAUTH_STATE_TABLE).insert({
        state,
        clerk_user_id: clerkUserId,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error('[canvas-auth-url] Failed to store state:', e);
      res.status(500).json({
        error:
          'Could not start Canvas login. Ensure oauth_state table exists (see README).',
      });
      return;
    }
  }

  const authUrl =
    `${canvasOrigin}/login/oauth2/auth?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(finalRedirectUri)}` +
    `&state=${encodeURIComponent(state)}`;

  // Redirect so form POST works without fetch (avoids auth header issues)
  if (typeof (res as { redirect?: (u: string) => void }).redirect === 'function') {
    (res as { redirect: (u: string) => void }).redirect(authUrl);
    return;
  }
  res.status(200).json({ url: authUrl });
}
