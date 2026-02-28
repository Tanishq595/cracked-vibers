/**
 * Vercel serverless: POST /api/storage-delete
 * Deletes an object from Supabase S3-compatible storage.
 *
 * Expects JSON body:
 *   { "objectKey": "bucket/path/filename.ext" }
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

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

  const { objectKey } = req.body as { objectKey?: string };
  if (!objectKey || typeof objectKey !== "string") {
    res.status(400).json({ error: "objectKey is required" });
    return;
  }

  try {
    const client = getS3Client();
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    });
    await client.send(command);
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("[storage-delete] error:", error);
    res.status(500).json({ error: "Failed to delete object" });
  }
}

