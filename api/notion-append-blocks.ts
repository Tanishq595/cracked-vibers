/**
 * POST /api/notion-append-blocks
 * Body: { blockId: string, children: Array<{ type: 'paragraph'|'heading_2'|'bulleted_list_item', content: string }> }
 * Appends blocks to a page (blockId is the page id). Requires Authorization: Bearer <Clerk token>.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getNotionToken, notionHeaders } from './notion-helpers';

function buildBlock(
  type: 'paragraph' | 'heading_2' | 'heading_3' | 'bulleted_list_item' | 'numbered_list_item',
  content: string
): Record<string, unknown> {
  const richText = content.trim()
    ? [{ type: 'text' as const, text: { content: content.trim() } }]
    : [];
  switch (type) {
    case 'paragraph':
      return { object: 'block', type: 'paragraph', paragraph: { rich_text: richText } };
    case 'heading_2':
      return { object: 'block', type: 'heading_2', heading_2: { rich_text: richText } };
    case 'heading_3':
      return { object: 'block', type: 'heading_3', heading_3: { rich_text: richText } };
    case 'bulleted_list_item':
      return { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: richText } };
    case 'numbered_list_item':
      return { object: 'block', type: 'numbered_list_item', numbered_list_item: { rich_text: richText } };
    default:
      return { object: 'block', type: 'paragraph', paragraph: { rich_text: richText } };
  }
}

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

  const body = (req.body ?? {}) as {
    blockId?: string;
    children?: Array<{ type?: string; content?: string }>;
  };
  const blockId = typeof body.blockId === 'string' ? body.blockId.trim() : '';
  const rawChildren = Array.isArray(body.children) ? body.children : [];

  if (!blockId) {
    res.status(400).json({ error: 'blockId is required' });
    return;
  }
  if (rawChildren.length === 0) {
    res.status(400).json({ error: 'children array is required and must not be empty' });
    return;
  }

  const allowedTypes = ['paragraph', 'heading_2', 'heading_3', 'bulleted_list_item', 'numbered_list_item'];
  const children = rawChildren.slice(0, 100).map((c) => {
    const type = allowedTypes.includes(String(c.type)) ? (c.type as 'paragraph' | 'heading_2' | 'heading_3' | 'bulleted_list_item' | 'numbered_list_item') : 'paragraph';
    const content = typeof c.content === 'string' ? c.content : '';
    return buildBlock(type, content);
  });

  if (children.length === 0) {
    res.status(400).json({ error: 'children array must not be empty' });
    return;
  }

  const headers = notionHeaders(token.accessToken);

  const appendRes = await fetch(`https://api.notion.com/v1/blocks/${blockId}/children`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ children }),
  });

  if (!appendRes.ok) {
    const errBody = await appendRes.text();
    if (appendRes.status === 401) {
      res.status(200).json({ error: 'Notion token invalid', connected: false });
      return;
    }
    if (appendRes.status === 404) {
      res.status(404).json({ error: 'Block/page not found or not shared with integration' });
      return;
    }
    console.error('[notion-append-blocks] append failed', appendRes.status, errBody);
    res.status(502).json({ error: 'Failed to append blocks' });
    return;
  }

  const data = (await appendRes.json()) as { results?: Array<{ id?: string }> };
  res.status(200).json({ results: data.results ?? [], count: children.length });
}
