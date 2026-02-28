/**
 * GET /api/google-calendar-auth/callback?code=...
 * Google redirects here after user authorizes. Exchange code for tokens, store in cookie, redirect to app.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { OAuth2Client } from 'google-auth-library';

type ResWithRedirect = VercelResponse & { redirect?: (url: string) => void };

const COOKIE_NAME = 'gcal_tokens';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function redirect(res: ResWithRedirect, url: string, cookies?: string[]): void {
  const setHeader = (res as unknown as { setHeader?: (name: string, value: string | string[]) => void }).setHeader;
  if (cookies?.length && setHeader) {
    cookies.forEach((c) => setHeader('Set-Cookie', c));
  }
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

  const baseUrl = process.env.VITE_API_URL || 'http://localhost:3000';
  const base = baseUrl.replace(/\/$/, '');
  const successUrl = `${base}/dashboard?google_calendar=connected`;
  const errorUrl = `${base}/dashboard?google_calendar=error`;

  if (!code) {
    redirect(res, errorUrl);
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${baseUrl.replace(/\/$/, '')}/api/google-calendar-auth/callback`;

  if (!clientId || !clientSecret) {
    redirect(res, errorUrl);
    return;
  }

  const oauth2Client = new OAuth2Client({
    clientId,
    clientSecret,
    redirectUri,
  });

  try {
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.access_token) {
      redirect(res, errorUrl);
      return;
    }

    const payload = JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expiry_date: tokens.expiry_date ?? null,
    });
    const cookieValue = Buffer.from(payload, 'utf8').toString('base64url');
    const isProd = process.env.NODE_ENV === 'production';
    const cookie = [
      `${COOKIE_NAME}=${cookieValue}`,
      'Path=/',
      `Max-Age=${COOKIE_MAX_AGE}`,
      'HttpOnly',
      'SameSite=Lax',
      ...(isProd ? ['Secure'] : []),
    ].join('; ');

    redirect(res, successUrl, [cookie]);
  } catch (err) {
    console.error('[google-calendar-auth/callback]', err);
    redirect(res, errorUrl);
  }
}
