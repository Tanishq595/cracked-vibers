/**
 * Vercel serverless: POST /api/chat
 * AI chatbot using MiniMax M2.5 (MINIMAX_API_KEY_M25).
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { completeM2 } from "../src/lib/minimax";

const CHAT_SYSTEM = `You are the M.U.S.T.Learn AI assistant: friendly, concise, and focused on learning. Help with study plans, gap analysis, knowledge graph questions, and general learning advice. Keep replies conversational and not too long.`;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const messages = Array.isArray(req.body?.messages) ? req.body.messages : null;
  if (!messages || messages.length === 0) {
    res.status(400).json({ error: "Missing or empty 'messages' array" });
    return;
  }

  type Msg = { role: string; content: string };
  const valid = messages.every(
    (m: unknown) =>
      m && typeof m === "object" && "role" in m && "content" in m && typeof (m as Msg).content === "string"
  );
  if (!valid) {
    res.status(400).json({ error: "Each message must have role and content (string)" });
    return;
  }

  const m2Messages = messages.map((m: Msg) => ({
    role: (m.role === "user" || m.role === "assistant" ? m.role : "user") as "user" | "assistant",
    content: m.content,
  }));

  try {
    const content = await completeM2({
      system: CHAT_SYSTEM,
      messages: m2Messages,
      maxTokens: 1024,
      temperature: 0.7,
    });
    res.status(200).json({ content: content || "" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Chat failed";
    res.status(500).json({ error: message });
  }
}
