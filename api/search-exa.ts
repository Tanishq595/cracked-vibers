/**
 * Vercel serverless: POST /api/search-exa
 * Universal web search via Exa AI (EXA_API_KEY).
 * Body: { query: string }
 * Returns: { results: { title, url, description? }[], error?: string }
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

const EXA_SEARCH_URL = "https://api.exa.ai/search";
const LOG = "[search-exa]";

interface ExaResult {
  title?: string;
  url?: string;
  publishedDate?: string | null;
  author?: string | null;
  highlights?: string[];
  summary?: string;
  text?: string;
}

interface ExaSearchResponse {
  results?: ExaResult[];
  requestId?: string;
  error?: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    console.warn(LOG, "EXA_API_KEY not set");
    res.status(500).json({
      error: "Exa search is not configured. Set EXA_API_KEY in environment.",
    });
    return;
  }

  const query =
    typeof req.body?.query === "string" ? req.body.query.trim() : "";
  console.log(LOG, "request", { query: query.slice(0, 80) });
  if (!query) {
    console.warn(LOG, "missing query");
    res.status(400).json({ error: "Missing or empty 'query' in body" });
    return;
  }

  try {
    const exaRes = await fetch(EXA_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        query,
        type: "auto",
        numResults: 12,
        contents: {
          highlights: { maxCharacters: 500 },
          summary: { query },
        },
      }),
    });

    const data = (await exaRes.json()) as ExaSearchResponse & {
      message?: string;
      statusCode?: number;
    };

    if (!exaRes.ok) {
      console.warn(LOG, "exa error", exaRes.status, data.message ?? data.error);
      res.status(exaRes.status).json({
        error: data.message ?? data.error ?? "Exa search failed",
      });
      return;
    }

    const results = (data.results ?? []).map((r) => ({
      title: r.title ?? "Untitled",
      url: r.url ?? "#",
      description:
        r.summary ??
        (Array.isArray(r.highlights) && r.highlights.length > 0
          ? r.highlights.slice(0, 2).join(" ")
          : r.text?.slice(0, 300)),
    }));

    console.log(LOG, "done", { resultsCount: results.length, requestId: data.requestId });
    res.status(200).json({ results, requestId: data.requestId });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Search failed";
    console.error(LOG, "error", e);
    res.status(500).json({ error: message });
  }
}
