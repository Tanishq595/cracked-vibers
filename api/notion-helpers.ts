/**
 * Shared helpers for Notion API routes: resolve Clerk user and get Notion access token from Supabase.
 */
import { verifyToken } from '@clerk/backend';
import { createClient } from '@supabase/supabase-js';

const NOTION_VERSION = '2022-06-28';

export type NotionReq = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
};

/**
 * Returns { userId, accessToken } if auth succeeds, null otherwise.
 */
export async function getNotionToken(
  req: NotionReq
): Promise<{ userId: string; accessToken: string } | null> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return null;

  const authHeader = req.headers.authorization;
  const token =
    typeof authHeader === 'string'
      ? authHeader.replace(/^Bearer\s+/i, '').trim()
      : '';
  if (!token) return null;

  let userId: string;
  try {
    const payload = await verifyToken(token, { secretKey });
    userId = payload.sub ?? '';
    if (!userId) return null;
  } catch {
    return null;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return null;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: row, error } = await supabase
    .from('notion_connections')
    .select('access_token')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !row?.access_token) return null;
  return { userId, accessToken: row.access_token as string };
}

export function notionHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION,
  };
}

/**
 * Extract a simple display value from a Notion property value.
 */
export function notionPropToValue(prop: unknown): string | number | boolean | null {
  if (prop == null) return null;
  const p = prop as Record<string, unknown>;
  if (p.title && Array.isArray(p.title)) {
    return (p.title as Array<{ plain_text?: string }>)
      .map((t) => t.plain_text ?? '')
      .join('')
      .trim() || '';
  }
  if (p.rich_text && Array.isArray(p.rich_text)) {
    return (p.rich_text as Array<{ plain_text?: string }>)
      .map((t) => t.plain_text ?? '')
      .join('')
      .trim() || '';
  }
  if (typeof p.number === 'number') return p.number;
  if (typeof p.checkbox === 'boolean') return p.checkbox;
  if (p.select && typeof (p.select as { name?: string }).name === 'string') {
    return (p.select as { name: string }).name;
  }
  if (p.multi_select && Array.isArray(p.multi_select)) {
    return (p.multi_select as Array<{ name?: string }>)
      .map((s) => s.name ?? '')
      .filter(Boolean)
      .join(', ');
  }
  if (p.date && typeof (p.date as { start?: string }).start === 'string') {
    return (p.date as { start: string }).start;
  }
  if (p.url && typeof p.url === 'string') return p.url;
  if (p.email && typeof p.email === 'string') return p.email;
  return null;
}
