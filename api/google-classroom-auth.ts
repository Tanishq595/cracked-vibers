/**
 * GET /api/google-classroom-auth
 * Redirects the user to Google OAuth for Classroom access.
 * Used by Vite dev server — register in vite.config.ts.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { OAuth2Client } from 'google-auth-library';

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

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const baseUrl = process.env.VITE_API_URL || 'http://localhost:3000';
  const redirectUri = `${baseUrl.replace(/\/$/, '')}/api/google-classroom-auth/callback`;
  // Add this exact redirectUri to Google Cloud Console → APIs & Services → Credentials → your OAuth client → Authorized redirect URIs (e.g. http://localhost:3000/api/google-classroom-auth/callback)

  if (!clientId || !clientSecret) {
    res.status(500).json({
      error: 'Google Classroom OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env',
    });
    return;
  }

  const returnTo = typeof req.query?.returnTo === 'string' ? req.query.returnTo.trim() || '/dashboard' : '/dashboard';
  const state = Buffer.from(JSON.stringify({ returnTo }), 'utf8').toString('base64url');

  const oauth2Client = new OAuth2Client({
    clientId,
    clientSecret,
    redirectUri,
  });

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/classroom.courses.readonly',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    prompt: 'consent',
    state,
  });

  redirect(res, authUrl);
}
