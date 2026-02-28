/**
 * GET /api/notion-query-database?databaseId=xxx&page_size=50&start_cursor=optional
 * Queries a Notion database and returns schema + rows. Requires Authorization: Bearer <Clerk token>.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getNotionToken, notionHeaders, notionPropToValue } from './notion-helpers';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const token = await getNotionToken(req as unknown as { method?: string; headers: Record<string, string | string[] | undefined>; query?: Record<string, string | string[] | undefined> });
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const databaseId = typeof req.query?.databaseId === 'string' ? req.query.databaseId.trim() : '';
  if (!databaseId) {
    res.status(400).json({ error: 'databaseId is required' });
    return;
  }

  const pageSize = Math.min(
    Math.max(1, parseInt(String(req.query?.page_size || '50'), 10) || 50),
    100
  );
  const startCursor = typeof req.query?.start_cursor === 'string' ? req.query.start_cursor : undefined;

  const headers = notionHeaders(token.accessToken);

  // Fetch database schema (title + property names/types)
  const dbRes = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
    method: 'GET',
    headers,
  });

  if (!dbRes.ok) {
    const errText = await dbRes.text();
    if (dbRes.status === 404) {
      res.status(404).json({ error: 'Database not found or not shared with integration' });
      return;
    }
    if (dbRes.status === 401) {
      res.status(200).json({ error: 'Notion token invalid', connected: false });
      return;
    }
    console.error('[notion-query-database] database fetch failed', dbRes.status, errText);
    res.status(502).json({ error: 'Failed to fetch database' });
    return;
  }

  const dbData = (await dbRes.json()) as {
    id?: string;
    title?: Array<{ plain_text?: string }>;
    properties?: Record<string, { type?: string; name?: string }>;
  };
  const dbTitle =
    dbData.title?.map((t) => t.plain_text).filter(Boolean).join('') || 'Untitled';
  const propertyNames = dbData.properties ? Object.keys(dbData.properties) : [];

  // Query database rows
  const queryBody: { page_size: number; start_cursor?: string } = { page_size: pageSize };
  if (startCursor) queryBody.start_cursor = startCursor;

  const queryRes = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify(queryBody),
  });

  if (!queryRes.ok) {
    const errText = await queryRes.text();
    console.error('[notion-query-database] query failed', queryRes.status, errText);
    res.status(502).json({ error: 'Failed to query database' });
    return;
  }

  const queryData = (await queryRes.json()) as {
    results?: Array<{
      id?: string;
      url?: string;
      properties?: Record<string, unknown>;
    }>;
    next_cursor?: string | null;
    has_more?: boolean;
  };

  const results = (queryData.results ?? []).map((page) => {
    const props: Record<string, string | number | boolean | null> = {};
    const raw = page.properties ?? {};
    for (const key of propertyNames) {
      props[key] = notionPropToValue(raw[key]) as string | number | boolean | null;
    }
    return {
      id: page.id,
      url: page.url,
      properties: props,
    };
  });

  res.status(200).json({
    database: {
      id: databaseId,
      title: dbTitle,
      propertyNames,
    },
    results,
    next_cursor: queryData.next_cursor ?? null,
    has_more: queryData.has_more ?? false,
  });
}
