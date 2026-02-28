/**
 * GET /api/google-classroom-data
 * Returns Classroom connection status, courses, and per-course coursework, announcements, materials. Uses gc_tokens cookie.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCourses, getAnnouncements, getCoursework, getCourseWorkMaterials } from '../src/lib/googleClassroom';

const COOKIE_NAME = 'gc_tokens';

function getTokenFromCookie(req: VercelRequest): string | null {
  const cookieHeader = req.headers.cookie;
  if (typeof cookieHeader !== 'string') return null;
  const match = cookieHeader.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  const value = match.slice(COOKIE_NAME.length + 1).trim();
  if (!value) return null;
  try {
    const payload = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as { access_token?: string };
    return typeof payload.access_token === 'string' ? payload.access_token : null;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const accessToken = getTokenFromCookie(req);
  if (!accessToken) {
    res.status(200).json({ connected: false });
    return;
  }

  try {
    const courses = await getCourses(accessToken);
    const courseList = Array.isArray(courses)
      ? courses.filter((c) => c && (c.courseState === 'ACTIVE' || c.courseState === 'ARCHIVED'))
      : [];

    const list = await Promise.all(
      courseList.map(async (c) => {
        const id = c.id ?? '';
        const base = {
          id,
          name: c.name ?? 'Course',
          section: c.section ?? '',
          courseState: c.courseState ?? 'ACTIVE',
          alternateLink: c.alternateLink ?? (id ? `https://classroom.google.com/c/${id}` : ''),
        };
        const [coursework, announcements, materials] = await Promise.all([
          getCoursework(id, accessToken).catch(() => []),
          getAnnouncements(id, accessToken).catch(() => []),
          getCourseWorkMaterials(id, accessToken).catch(() => []),
        ]);

        return {
          ...base,
          coursework: Array.isArray(coursework)
            ? coursework.map((w) => ({
                id: w.id ?? '',
                title: w.title ?? '',
                dueDate: (w as { dueDate?: { year?: number; month?: number; day?: number } }).dueDate,
                dueTime: (w as { dueTime?: { hours?: number; minutes?: number } }).dueTime,
                maxPoints: (w as { maxPoints?: number }).maxPoints,
                state: (w as { state?: string }).state,
                alternateLink: (w as { alternateLink?: string }).alternateLink,
              }))
            : [],
          announcements: Array.isArray(announcements)
            ? announcements.map((a) => ({
                id: (a as { id?: string }).id ?? '',
                text: (a as { text?: string }).text ?? '',
                creationTime: (a as { creationTime?: string }).creationTime,
                alternateLink: (a as { alternateLink?: string }).alternateLink,
              }))
            : [],
          materials: Array.isArray(materials)
            ? materials.map((m) => ({
                id: (m as { id?: string }).id ?? '',
                title: (m as { title?: string }).title ?? '',
                state: (m as { state?: string }).state,
                alternateLink: (m as { alternateLink?: string }).alternateLink,
              }))
            : [],
        };
      })
    );

    res.status(200).json({ connected: true, courses: list });
  } catch (err) {
    console.error('[google-classroom-data]', err);
    res.status(200).json({ connected: false, error: 'Failed to load courses' });
  }
}
