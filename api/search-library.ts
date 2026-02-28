/**
 * Vercel serverless: POST /api/search-library
 * Search inside the user's library documents (text content).
 * Supports plain text and PDF (via unpdf).
 * Body: { query: string, userId: string }
 * Returns: { results: { key, title, snippet }[], error?: string }
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

function getS3Client() {
  const endpoint = process.env.SUPABASE_S3_ENDPOINT;
  const region = process.env.SUPABASE_S3_REGION;
  const accessKeyId = process.env.SUPABASE_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.SUPABASE_S3_SECRET_ACCESS_KEY;
  if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
    throw new Error("S3 storage env vars not fully configured");
  }
  return new S3Client({
    forcePathStyle: true,
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

/** Extract searchable text from a file buffer. PDFs are parsed (unpdf, dynamic import); other files read as UTF-8. */
async function getTextFromBuffer(buffer: Buffer, key: string): Promise<string> {
  const lower = key.toLowerCase();
  if (lower.endsWith(".pdf")) {
    try {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text } = await extractText(pdf, { mergePages: true });
      const out = (text ?? "").slice(0, MAX_BYTES_PER_FILE);
      if (out.length > 0) console.log("[search-library] pdf parsed", { key: key.split("/").pop(), chars: out.length });
      return out;
    } catch (err) {
      console.warn("[search-library] pdf parse failed", key.split("/").pop(), err instanceof Error ? err.message : String(err));
      return "";
    }
  }
  return buffer.toString("utf-8").slice(0, MAX_BYTES_PER_FILE);
}

const MAX_FILES = 100;
const MAX_BYTES_PER_FILE = 10 * 1024 * 1024; // 10 MB per file (no strict limit on AWS)

const LOG = "[search-library]";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const bucket = process.env.SUPABASE_S3_BUCKET;
  if (!bucket) {
    console.warn(LOG, "Storage not configured");
    res.status(500).json({ error: "Storage not configured" });
    return;
  }

  const query = typeof req.body?.query === "string" ? req.body.query.trim() : "";
  const userId = typeof req.body?.userId === "string" ? req.body.userId.trim() : "";
  console.log(LOG, "request", { query: query.slice(0, 80), userId: userId ? `${userId.slice(0, 8)}…` : "" });

  if (!query || !userId) {
    console.warn(LOG, "missing query or userId");
    res.status(400).json({ error: "query and userId are required" });
    return;
  }

  const results: { key: string; title: string; snippet: string }[] = [];
  const qLower = query.toLowerCase().trim();
  let debugLogged = false;
  // Normalize: remove dots and trailing punctuation, collapse spaces; merge "m u s t" -> "must"
  const normalizeForMatch = (s: string) =>
    s
      .toLowerCase()
      .replace(/\./g, "")
      .replace(/[?!,;:]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const mergeSingleLetterRuns = (s: string): string => {
    const parts = s.split(" ");
    const out: string[] = [];
    let i = 0;
    while (i < parts.length) {
      if (parts[i].length === 1) {
        let run = "";
        while (i < parts.length && parts[i].length === 1) run += parts[i++];
        out.push(run);
      } else {
        out.push(parts[i++]);
      }
    }
    return out.join(" ");
  };
  const normalizedQuery = mergeSingleLetterRuns(normalizeForMatch(query));
  const queryVariants = [qLower, normalizedQuery].filter((v, i, a) => a.indexOf(v) === i);
  // All 2-word phrases from normalized query for fuzzy match (e.g. "team details", "must learn")
  const twoWordPhrases: string[] = [];
  const words = normalizedQuery.split(" ").filter((w) => w.length > 0);
  for (let i = 0; i < words.length - 1; i++) {
    const phrase = `${words[i]} ${words[i + 1]}`;
    if (phrase.length >= 4 && !twoWordPhrases.includes(phrase)) twoWordPhrases.push(phrase);
  }

  try {
    const client = getS3Client();
    const listRes = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: `uploads/${userId}/`,
      })
    );
    const items = (listRes.Contents ?? [])
      .filter((o) => o.Key && (o.Size ?? 0) > 0)
      .slice(0, MAX_FILES)
      .map((o) => ({ key: o.Key!, size: o.Size ?? 0 }));

    console.log(LOG, "listing", { fileCount: items.length });

    for (const { key } of items) {
      try {
        const getRes = await client.send(
          new GetObjectCommand({ Bucket: bucket, Key: key })
        );
        const body = getRes.Body;
        if (!body) continue;
        const buffer = await streamToBuffer(body as Readable);
        const text = await getTextFromBuffer(buffer, key);
        if (!text.trim()) continue;
        const textLower = text.toLowerCase();
        let idx = -1;
        let matchedVariant = "";
        for (const v of queryVariants) {
          const i = textLower.indexOf(v);
          if (i !== -1) {
            idx = i;
            matchedVariant = v;
            break;
          }
        }
        // If no exact variant, try normalized text match (e.g. "must learn" in doc vs "m.u.s.t learn" in query)
        if (idx === -1 && normalizedQuery.length >= 3) {
          const textNorm = mergeSingleLetterRuns(normalizeForMatch(text));
          if (!debugLogged) {
            console.log(LOG, "debug sample", {
              normalizedQuery,
              textNormSample: textNorm.slice(0, 400),
              twoWordPhrases,
            });
            debugLogged = true;
          }
          const toTry = [normalizedQuery, ...twoWordPhrases];
          for (const needle of toTry) {
            const i = textNorm.indexOf(needle);
            if (i !== -1) {
              // needle is in textNorm; find same phrase in original text for snippet
              const posInText = textLower.indexOf(needle);
              idx = posInText !== -1 ? posInText : Math.min(i, text.length - 1);
              matchedVariant = needle;
              break;
            }
          }
        }
        if (idx === -1) continue;
        const start = Math.max(0, idx - 50);
        const end = Math.min(text.length, idx + (matchedVariant || query).length + 80);
        let snippet = text.slice(start, end).replace(/\s+/g, " ").trim();
        if (start > 0) snippet = "…" + snippet;
        if (end < text.length) snippet = snippet + "…";
        const title = key.split("/").pop() || key;
        results.push({ key, title, snippet });
        console.log(LOG, "match", { key: title, snippetLen: snippet.length });
      } catch (err) {
        console.warn(LOG, "skip file", key, err instanceof Error ? err.message : String(err));
      }
    }

    console.log(LOG, "done", { resultsCount: results.length });
    res.status(200).json({ results });
  } catch (e) {
    console.error(LOG, "error", e);
    res.status(500).json({
      error: e instanceof Error ? e.message : "Search failed",
    });
  }
}
