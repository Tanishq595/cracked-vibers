/**
 * Vercel serverless: POST /api/storage-download-url
 * Returns a presigned URL for downloading from Supabase S3-compatible storage.
 *
 * Expects JSON body:
 *   { "objectKey": "bucket/path/filename.ext" }
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    });

    const url = await getSignedUrl(client, command, { expiresIn: 60 * 5 });

    res.status(200).json({ url });
  } catch (error) {
    console.error("[storage-download-url] error:", error);
    res.status(500).json({ error: "Failed to create download URL" });
  }
}

