/**
 * GET /api/notion-data
 * Returns Notion connection status and pages shared with the integration.
 * Requires Authorization: Bearer <Clerk token>.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '@clerk/backend';
import { createClient } from '@supabase/supabase-js';

const NOTION_VERSION = '2022-06-28';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    res.status(500).json({ error: 'Server not configured' });
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

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    res.status(500).json({ error: 'Database not configured' });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: row, error: fetchError } = await supabase
    .from('notion_connections')
    .select('access_token')
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError || !row?.access_token) {
    res.status(200).json({ connected: false });
    return;
  }

  const accessToken = row.access_token as string;
  const searchRes = await fetch('https://api.notion.com/v1/search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION,
    },
    body: JSON.stringify({ page_size: 20 }),
  });

  if (!searchRes.ok) {
    // Token may be revoked or expired
    if (searchRes.status === 401) {
      res.status(200).json({ connected: false });
      return;
    }
    const errText = await searchRes.text();
    console.error('[notion-data] search failed', searchRes.status, errText);
    res.status(200).json({ connected: true, pages: [] });
    return;
  }

  const searchData = (await searchRes.json()) as {
    results?: Array<{
      id?: string;
      object?: string;
      created_time?: string;
      last_edited_time?: string;
      url?: string;
      title?: Array<{ plain_text?: string }>;
      properties?: Record<string, { title?: Array<{ plain_text?: string }>; type?: string }>;
    }>;
  };

  function getTitle(item: (typeof searchData.results)[0]): string {
    if (!item) return 'Untitled';
    // Databases often have top-level title in the API response
    const topLevel = (item as { title?: Array<{ plain_text?: string }> }).title;
    if (topLevel?.length) {
      const t = topLevel.map((x) => x.plain_text).filter(Boolean).join('').trim();
      if (t) return t;
    }
    // Pages (and some responses) store title inside properties – find the title-type property
    const props = item.properties;
    if (props && typeof props === 'object') {
      for (const key of Object.keys(props)) {
        const val = props[key];
        if (val && typeof val === 'object' && Array.isArray(val.title)) {
          const t = val.title.map((x: { plain_text?: string }) => x.plain_text).filter(Boolean).join('').trim();
          if (t) return t;
        }
      }
    }
    return 'Untitled';
  }

  const results = Array.isArray(searchData?.results) ? searchData.results : [];
  const pages = results
    .filter((r) => r.object === 'page' || r.object === 'database')
    .map((r) => ({
      id: r.id,
      objectType: (r.object === 'database' ? 'database' : 'page') as 'page' | 'database',
      title: getTitle(r),
      url: r.url,
      last_edited_time: r.last_edited_time,
    }));

  res.status(200).json({ connected: true, pages });
}
