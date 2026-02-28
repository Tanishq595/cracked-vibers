/**
 * Google Calendar API helpers. Use with an OAuth access token (e.g. from gcal_tokens cookie).
 */
import { google } from 'googleapis';

export async function getCalendarEvents(accessToken: string, options?: {
  calendarId?: string;
  timeMin?: string;
  maxResults?: number;
}) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const calendarId = options?.calendarId ?? 'primary';
  const res = await calendar.events.list({
    calendarId,
    timeMin: options?.timeMin ?? new Date().toISOString(),
    maxResults: options?.maxResults ?? 10,
    singleEvents: true,
    orderBy: 'startTime',
  });
  return res.data.items ?? [];
}
