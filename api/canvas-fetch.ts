/**
 * GET /api/canvas/fetch?type=courses|assignments|announcements|modules&courseId=xxx
 * Fetches from Canvas LMS. Uses the user's OAuth token if Authorization header is sent;
 * otherwise falls back to CANVAS_PERSONAL_TOKEN (if set).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '@clerk/backend';
import { createClient } from '@supabase/supabase-js';
import * as canvasApi from '../src/lib/canvas';

const CANVAS_CONNECTIONS_TABLE = 'canvas_connections';

async function getUserCanvasToken(
  authHeader: string | string[] | undefined
): Promise<{ accessToken: string; baseUrl: string } | null> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secretKey || !supabaseUrl || !supabaseKey) return null;

  const token =
    typeof authHeader === 'string'
      ? authHeader.replace(/^Bearer\s+/i, '').trim()
      : Array.isArray(authHeader)
        ? authHeader[0]?.replace(/^Bearer\s+/i, '').trim()
        : '';
  if (!token) return null;

  let clerkUserId: string;
  try {
    const verified = await verifyToken(token, { secretKey });
    clerkUserId = verified.sub;
    if (!clerkUserId) return null;
  } catch {
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: row } = await supabase
    .from(CANVAS_CONNECTIONS_TABLE)
    .select('access_token, canvas_base_url')
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (!row?.access_token || !row?.canvas_base_url) return null;
  return { accessToken: row.access_token as string, baseUrl: row.canvas_base_url as string };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const type =
    (typeof req.query?.type === 'string' ? req.query.type : undefined) ??
    (Array.isArray(req.query?.type) ? req.query.type[0] : undefined);
  const courseId =
    (typeof req.query?.courseId === 'string' ? req.query.courseId : undefined) ??
    (Array.isArray(req.query?.courseId) ? req.query.courseId[0] : undefined);

  if (!type) {
    res.status(400).json({ error: 'Missing query parameter: type' });
    return;
  }

  try {
    const userToken = await getUserCanvasToken(req.headers.authorization);
    let data: unknown;

    if (userToken) {
      switch (type) {
        case 'courses':
          data = await canvasApi.getUserCoursesWithToken(
            userToken.accessToken,
            userToken.baseUrl
          );
          break;
        case 'assignments':
          if (!courseId) {
            res.status(400).json({ error: 'courseId required for type=assignments' });
            return;
          }
          data = await canvasApi.getCourseAssignmentsWithToken(
            userToken.accessToken,
            userToken.baseUrl,
            courseId
          );
          break;
        case 'announcements':
          if (!courseId) {
            res.status(400).json({ error: 'courseId required for type=announcements' });
            return;
          }
          data = await canvasApi.getCourseAnnouncementsWithToken(
            userToken.accessToken,
            userToken.baseUrl,
            courseId
          );
          break;
        case 'modules':
          if (!courseId) {
            res.status(400).json({ error: 'courseId required for type=modules' });
            return;
          }
          data = await canvasApi.getCourseModulesWithToken(
            userToken.accessToken,
            userToken.baseUrl,
            courseId
          );
          break;
        default:
          res.status(400).json({
            error: 'Invalid type. Use: courses, assignments, announcements, modules',
          });
          return;
      }
    } else {
      switch (type) {
        case 'courses':
          data = await canvasApi.getUserCourses();
          break;
        case 'assignments':
          if (!courseId) {
            res.status(400).json({ error: 'courseId required for type=assignments' });
            return;
          }
          data = await canvasApi.getCourseAssignments(courseId);
          break;
        case 'announcements':
          if (!courseId) {
            res.status(400).json({ error: 'courseId required for type=announcements' });
            return;
          }
          data = await canvasApi.getCourseAnnouncements(courseId);
          break;
        case 'modules':
          if (!courseId) {
            res.status(400).json({ error: 'courseId required for type=modules' });
            return;
          }
          data = await canvasApi.getCourseModules(courseId);
          break;
        default:
          res.status(400).json({
            error: 'Invalid type. Use: courses, assignments, announcements, modules',
          });
          return;
      }
    }

    res.status(200).json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch from Canvas';
    console.error('Canvas API error:', err);
    res.status(500).json({ error: message });
  }
}
