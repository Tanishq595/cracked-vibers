/**
 * GET /api/notion-auth
 * Returns the Notion OAuth URL. Client redirects user there.
 * Requires Authorization: Bearer <Clerk token>.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '@clerk/backend';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  const clientId = process.env.NOTION_CLIENT_ID;
  const baseUrl = process.env.VITE_API_URL || 'http://localhost:3000';
  const redirectUri = `${baseUrl.replace(/\/$/, '')}/api/notion-auth/callback`;

  if (!secretKey || !clientId) {
    res.status(500).json({
      error: 'Notion OAuth not configured (CLERK_SECRET_KEY, NOTION_CLIENT_ID)',
    });
    return;
  }

  const authHeader = req.headers.authorization;
  const token =
    typeof authHeader === 'string'
      ? authHeader.replace(/^Bearer\s+/i, '').trim()
      : '';
  if (!token) {
    res.status(401).json({ error: 'Authorization required' });
    return;
  }

  let userId: string;
  try {
    const payload = await verifyToken(token, { secretKey });
    userId = payload.sub ?? '';
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const returnTo =
    typeof req.query?.returnTo === 'string' ? req.query.returnTo.trim() || '/dashboard' : '/dashboard';
  const state = Buffer.from(
    JSON.stringify({ userId, returnTo }),
    'utf8'
  ).toString('base64url');

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    owner: 'user',
    redirect_uri: redirectUri,
    state,
  });
  const url = `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
  res.status(200).json({ url });
}
