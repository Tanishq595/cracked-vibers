/**
 * GET /api/notion-auth/callback?code=...&state=...
 * Notion redirects here after user authorizes. Exchange code for token, store in DB, redirect to app.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

type ResWithRedirect = VercelResponse & { redirect?: (url: string) => void };

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
  const stateRaw =
    (typeof req.query?.state === 'string' ? req.query.state : undefined) ??
    (Array.isArray(req.query?.state) ? req.query.state?.[0] : undefined);

  const baseUrl = process.env.VITE_API_URL || 'http://localhost:3000';
  const redirectUri = `${baseUrl.replace(/\/$/, '')}/api/notion-auth/callback`;
  let returnTo = '/dashboard';
  let userId = '';

  if (stateRaw) {
    try {
      const parsed = JSON.parse(
        Buffer.from(stateRaw, 'base64url').toString('utf8')
      ) as { returnTo?: string; userId?: string };
      if (typeof parsed.returnTo === 'string' && parsed.returnTo.startsWith('/')) {
        returnTo = parsed.returnTo;
      }
      if (typeof parsed.userId === 'string') userId = parsed.userId;
    } catch {
      // keep defaults
    }
  }

  const base = baseUrl.replace(/\/$/, '');
  const successUrl = `${base}${returnTo.startsWith('/') ? returnTo : `/${returnTo}`}?notion=connected`;
  const errorUrl = `${base}${returnTo.startsWith('/') ? returnTo : `/${returnTo}`}?notion=error`;

  if (!code || !userId) {
    redirect(res, errorUrl);
    return;
  }

  const clientId = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    redirect(res, errorUrl);
    return;
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const tokenRes = await fetch('https://api.notion.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error('[notion-callback] token exchange failed', tokenRes.status, errText);
    redirect(res, errorUrl);
    return;
  }

  const data = (await tokenRes.json()) as {
    access_token?: string;
    workspace_id?: string;
    workspace_name?: string;
  };
  const accessToken = typeof data.access_token === 'string' ? data.access_token : '';
  if (!accessToken) {
    redirect(res, errorUrl);
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    redirect(res, errorUrl);
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { error } = await supabase
    .from('notion_connections')
    .upsert(
      {
        user_id: userId,
        access_token: accessToken,
        workspace_id: data.workspace_id ?? null,
        workspace_name: data.workspace_name ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    if (error.code === 'PGRST205') {
      console.error('[notion-callback] Table notion_connections not found. Run supabase/notion-connections-table.sql in Supabase SQL Editor.');
    } else {
      console.error('[notion-callback] DB upsert error', error);
    }
    redirect(res, errorUrl);
    return;
  }

  redirect(res, successUrl);
}
