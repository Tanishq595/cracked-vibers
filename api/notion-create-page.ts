/**
 * POST /api/notion-create-page
 * Body: { parentDatabaseId?: string, parentPageId?: string, title: string }
 * Creates a new page in a database or as a child of a page. Requires Authorization: Bearer <Clerk token>.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getNotionToken, notionHeaders } from './notion-helpers';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const token = await getNotionToken(req as unknown as { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown });
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const body = (req.body ?? {}) as { parentDatabaseId?: string; parentPageId?: string; title?: string };
  const parentDatabaseId = typeof body.parentDatabaseId === 'string' ? body.parentDatabaseId.trim() : '';
  const parentPageId = typeof body.parentPageId === 'string' ? body.parentPageId.trim() : '';
  const title = typeof body.title === 'string' ? body.title.trim() : '';

  if (!title) {
    res.status(400).json({ error: 'title is required' });
    return;
  }
  if (parentDatabaseId && parentPageId) {
    res.status(400).json({ error: 'Provide either parentDatabaseId or parentPageId, not both' });
    return;
  }
  if (!parentDatabaseId && !parentPageId) {
    res.status(400).json({ error: 'parentDatabaseId or parentPageId is required' });
    return;
  }

  const headers = notionHeaders(token.accessToken);

  let parent: { database_id?: string; page_id?: string };
  let properties: Record<string, { title: Array<{ text: { content: string } }> }>;

  if (parentDatabaseId) {
    // Get database schema to find the title property name
    const dbRes = await fetch(`https://api.notion.com/v1/databases/${parentDatabaseId}`, {
      method: 'GET',
      headers,
    });
    if (!dbRes.ok) {
      if (dbRes.status === 404) {
        res.status(404).json({ error: 'Database not found or not shared with integration' });
        return;
      }
      const errText = await dbRes.text();
      console.error('[notion-create-page] database fetch failed', dbRes.status, errText);
      res.status(502).json({ error: 'Failed to fetch database' });
      return;
    }
    const dbData = (await dbRes.json()) as { properties?: Record<string, { type?: string }> };
    const titlePropName = dbData.properties
      ? Object.entries(dbData.properties).find(([, v]) => v.type === 'title')?.[0]
      : null;
    if (!titlePropName) {
      res.status(400).json({ error: 'Database has no title property' });
      return;
    }
    parent = { database_id: parentDatabaseId };
    properties = {
      [titlePropName]: { title: [{ text: { content: title } }] },
    };
  } else {
    parent = { page_id: parentPageId };
    properties = { title: { title: [{ text: { content: title } }] } };
  }

  const createRes = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers,
    body: JSON.stringify({ parent, properties }),
  });

  if (!createRes.ok) {
    const errBody = await createRes.text();
    let errJson: { message?: string } = {};
    try {
      errJson = JSON.parse(errBody) as { message?: string };
    } catch {
      // ignore
    }
    if (createRes.status === 401) {
      res.status(200).json({ error: 'Notion token invalid', connected: false });
      return;
    }
    console.error('[notion-create-page] create failed', createRes.status, errBody);
    res.status(createRes.status >= 500 ? 502 : 400).json({
      error: errJson.message ?? 'Failed to create page',
    });
    return;
  }

  const page = (await createRes.json()) as { id?: string; url?: string };
  res.status(200).json({ id: page.id, url: page.url });
}
