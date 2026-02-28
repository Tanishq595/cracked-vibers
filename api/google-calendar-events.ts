/**
 * GET /api/google-calendar-events
 * Returns upcoming calendar events. Uses gcal_tokens cookie.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCalendarEvents } from '../src/lib/googleCalendar';

const COOKIE_NAME = 'gcal_tokens';

function getTokenFromCookie(req: VercelRequest): string | null {
  const cookieHeader = req.headers.cookie;
  if (typeof cookieHeader !== 'string') return null;
  const match = cookieHeader
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  const value = match.slice(COOKIE_NAME.length + 1).trim();
  if (!value) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8')
    ) as { access_token?: string };
    return typeof payload.access_token === 'string' ? payload.access_token : null;
  } catch {
    return null;
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const accessToken = getTokenFromCookie(req);
  if (!accessToken) {
    res.status(200).json({ connected: false, events: [] });
    return;
  }

  const calendarId =
    (typeof req.query?.calendarId === 'string' ? req.query.calendarId : undefined) ?? 'primary';
  const maxResults = Math.min(
    Math.max(1, parseInt(String(req.query?.maxResults || '10'), 10) || 10),
    100
  );

  try {
    const events = await getCalendarEvents(accessToken, {
      calendarId,
      maxResults,
    });
    res.status(200).json({ connected: true, events });
  } catch (error) {
    console.error('[google-calendar-events]', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
}
