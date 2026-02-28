/**
 * Vercel serverless: GET /api/me
 * Returns current user info from Clerk token.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyToken } from "@clerk/backend";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    res.status(500).json({ error: "Server misconfigured" });
    return;
  }

  const authHeader = req.headers.authorization;
  const token =
    typeof authHeader === "string"
      ? authHeader.replace(/^Bearer\s+/i, "").trim()
      : "";
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const payload = await verifyToken(token, { secretKey });
    const userId = payload.sub;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    // Clerk session tokens include sid; org is in payload if present
    const sessionId = typeof payload.sid === "string" ? payload.sid : undefined;
    const orgId =
      typeof (payload as { org_id?: string }).org_id === "string"
        ? (payload as { org_id: string }).org_id
        : undefined;

    res.status(200).json({ userId, sessionId, orgId });
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}
