/**
 * Chat conversation storage in DB.
 * GET (with auth): list messages. Query: ?session_id=uuid (optional) — filter by session; omit for legacy (session_id IS NULL).
 * POST (with auth): append messages. Body: { session_id?: string, messages: [{ role, content }] }
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyToken } from "@clerk/backend";
import { createClient } from "@supabase/supabase-js";

function getUserId(req: VercelRequest): Promise<string | null> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return Promise.resolve(null);
  const authHeader = req.headers.authorization;
  const token =
    typeof authHeader === "string"
      ? authHeader.replace(/^Bearer\s+/i, "").trim()
      : "";
  if (!token) return Promise.resolve(null);
  return verifyToken(token, { secretKey })
    .then((p) => p.sub ?? null)
    .catch(() => null);
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const userId = await getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authorization required" });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    res.status(500).json({ error: "Database not configured" });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (req.method === "GET") {
    const sessionId = typeof req.query?.session_id === "string" ? req.query.session_id.trim() || null : null;
    let q = supabase
      .from("chat_messages")
      .select("role, content, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (sessionId) {
      q = q.eq("session_id", sessionId);
    } else {
      q = q.is("session_id", null);
    }
    const { data, error } = await q;

    if (error) {
      // eslint-disable-next-line no-console
      console.error("[chat-messages] list error:", error);
      res.status(500).json({ error: "Failed to load chat history" });
      return;
    }

    const items = (data ?? []).map((row) => ({
      role: row.role as "user" | "assistant",
      content: typeof row.content === "string" ? row.content : "",
    }));
    res.status(200).json({ messages: items });
    return;
  }

  // POST: append messages
  const body = req.body as {
    session_id?: string | null;
    messages?: Array<{ role?: string; content?: string }>;
  } | undefined;
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const sessionId = typeof body?.session_id === "string" ? body.session_id.trim() || null : null;
  if (messages.length === 0) {
    res.status(200).json({ ok: true });
    return;
  }

  const rows = messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({
      user_id: userId,
      session_id: sessionId,
      role: m.role as "user" | "assistant",
      content: String(m.content),
    }));

  if (rows.length === 0) {
    res.status(200).json({ ok: true });
    return;
  }

  const { error } = await supabase.from("chat_messages").insert(rows);

  if (error) {
    // eslint-disable-next-line no-console
    console.error("[chat-messages] insert error:", error);
    res.status(500).json({ error: "Failed to save chat messages" });
    return;
  }

  res.status(200).json({ ok: true });
}
