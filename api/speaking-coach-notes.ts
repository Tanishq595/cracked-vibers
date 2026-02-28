/**
 * GET /api/speaking-coach-notes — list current user's notes (Clerk Bearer).
 * POST /api/speaking-coach-notes — save a note. Body: { content: string, source?: string, sessionId?: string }.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyToken } from "@clerk/backend";
import { createClient } from "@supabase/supabase-js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    res.status(500).json({ error: "Server not configured" });
    return;
  }

  const authHeader = req.headers.authorization;
  const token =
    typeof authHeader === "string"
      ? authHeader.replace(/^Bearer\s+/i, "").trim()
      : "";
  if (!token) {
    res.status(401).json({ error: "Authorization required" });
    return;
  }

  let userId: string;
  try {
    const payload = await verifyToken(token, { secretKey });
    userId = payload.sub ?? "";
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  } catch (err) {
    console.log("[speaking-coach-notes] auth failed", err);
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  console.log("[speaking-coach-notes]", req.method, "userId=" + userId.slice(0, 8) + "...");

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    res.status(500).json({ error: "Database not configured" });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("speaking_coach_notes")
      .select("id, content, source, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[speaking-coach-notes] list error", error);
      res.status(500).json({ error: "Failed to load notes" });
      return;
    }
    const notes = data ?? [];
    console.log("[speaking-coach-notes] GET ok, count=" + notes.length);
    res.status(200).json({ notes });
    return;
  }

  if (req.method === "POST") {
    const body = (req.body ?? {}) as {
      content?: string;
      source?: string;
      sessionId?: string;
    };
    const content = typeof body.content === "string" ? body.content.trim() : "";
    console.log("[speaking-coach-notes] POST body contentLength=" + (content?.length ?? 0));
    if (!content) {
      res.status(400).json({ error: "content is required" });
      return;
    }
    const source =
      typeof body.source === "string" && ["user", "coach"].includes(body.source)
        ? body.source
        : null;
    const sessionId =
      typeof body.sessionId === "string" && body.sessionId.trim()
        ? body.sessionId.trim()
        : null;

    const { data, error } = await supabase
      .from("speaking_coach_notes")
      .insert({
        user_id: userId,
        content,
        source,
        session_id: sessionId || null,
      })
      .select("id, content, source, created_at")
      .single();

    if (error) {
      if (error.code === "PGRST204" || error.message?.includes("relation")) {
        console.log("[speaking-coach-notes] POST table not found (run SQL)");
        res.status(503).json({
          error: "Notes table not found. Run supabase/speaking-coach-notes-table.sql in SQL Editor.",
        });
        return;
      }
      console.error("[speaking-coach-notes] insert error", error);
      res.status(500).json({ error: "Failed to save note" });
      return;
    }
    console.log("[speaking-coach-notes] POST ok id=" + (data?.id ?? ""));
    res.status(200).json({ note: data });
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
