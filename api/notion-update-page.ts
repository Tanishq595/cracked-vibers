/**
 * POST /api/notion-update-page
 * Body: { pageId: string, title?: string }
 * Updates a page's title. Requires Authorization: Bearer <Clerk token>.
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

  const body = (req.body ?? {}) as { pageId?: string; title?: string };
  const pageId = typeof body.pageId === 'string' ? body.pageId.trim() : '';
  const title = typeof body.title === 'string' ? body.title.trim() : undefined;

  if (!pageId) {
    res.status(400).json({ error: 'pageId is required' });
    return;
  }
  if (title === undefined || title === '') {
    res.status(400).json({ error: 'title is required for update' });
    return;
  }

  const headers = notionHeaders(token.accessToken);

  const patchRes = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      properties: {
        title: { title: [{ text: { content: title } }] },
      },
    }),
  });

  if (!patchRes.ok) {
    const errBody = await patchRes.text();
    let errJson: { message?: string; code?: string } = {};
    try {
      errJson = JSON.parse(errBody) as { message?: string; code?: string };
    } catch {
      // ignore
    }
    if (patchRes.status === 401) {
      res.status(200).json({ error: 'Notion token invalid', connected: false });
      return;
    }
    if (patchRes.status === 404) {
      res.status(404).json({ error: 'Page not found or not shared with integration' });
      return;
    }
    // Notion pages in a database use their database's title property name, not "title"
    if (patchRes.status === 400 && errJson.code === 'validation_error') {
      res.status(400).json({ error: 'This page may be in a database; title update might require the database property name' });
      return;
    }
    console.error('[notion-update-page] patch failed', patchRes.status, errBody);
    res.status(patchRes.status >= 500 ? 502 : 400).json({
      error: errJson.message ?? 'Failed to update page',
    });
    return;
  }

  const page = (await patchRes.json()) as { id?: string; url?: string };
  res.status(200).json({ id: page.id, url: page.url });
}
