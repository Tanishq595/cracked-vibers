/**
 * Vercel serverless: POST /api/storage-list
 * Lists objects in Supabase S3-compatible storage.
 *
 * Expects JSON body:
 *   { "prefix": "uploads/userId" } // optional; defaults to "uploads"
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

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
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const bucket = process.env.SUPABASE_S3_BUCKET;
  if (!bucket) {
    res.status(500).json({ error: "SUPABASE_S3_BUCKET not set" });
    return;
  }

  const { prefix } = (req.body ?? {}) as { prefix?: string };
  const safePrefix =
    typeof prefix === "string" && prefix.trim().length > 0
      ? prefix.trim()
      : "uploads";

  console.log("[storage-list] request", { prefix: safePrefix });
  try {
    const client = getS3Client();
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: safePrefix,
    });

    const data = await client.send(command);
    const items =
      data.Contents?.map((obj) => ({
        key: obj.Key ?? "",
        size: obj.Size ?? 0,
        lastModified: obj.LastModified?.toISOString() ?? null,
      })) ?? [];

    console.log("[storage-list] done", { itemCount: items.length });
    res.status(200).json({ items });
  } catch (error) {
    console.error("[storage-list] error", error);
    res.status(500).json({ error: "Failed to list objects" });
  }
}

