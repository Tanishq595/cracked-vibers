/**
 * Vercel serverless: POST /api/chat
 * AI assistant with tool calling: fetches user data (library, syntheses, search) and replies in text.
 * Requires Authorization: Bearer <Clerk token>. No navigation; all answers in chat.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyToken } from "@clerk/backend";
import {
  completeM2WithTools,
  type M2Message,
  type M2ContentBlock,
  type M2Tool,
} from "../src/lib/minimax";

const CHAT_SYSTEM = `You are the M.U.S.T.Learn AI assistant: friendly, concise, and focused on learning.

You can use tools to read the user's data:
- list_my_files: list their uploaded files (library). Use when they ask about "my files", "uploads", "library", "what I uploaded".
- list_my_syntheses: list their past syntheses (titles and topics). Use when they ask about "my syntheses", "what I've synthesized", "past syntheses".
- get_synthesis_content: get the full content (markdown, topics, gaps) of one synthesis by id. Use after list_my_syntheses when they want to see content of a specific one, or when they ask to "show" or "read" a synthesis.
- search_my_library: search inside the text of their uploaded documents. Use when they ask to "search my files", "find in my documents", "look for X in my library".

After calling a tool, summarize the results in a short, helpful reply. Do not navigate the user; just answer in text. Keep replies conversational and not too long.`;

const APP_TOOLS: M2Tool[] = [
  {
    name: "list_my_files",
    description: "List the user's uploaded files (library). Returns file names, sizes, and dates.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "list_my_syntheses",
    description: "List the user's past syntheses (title, topics, created date).",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_synthesis_content",
    description: "Get the full content of one synthesis (markdown, topics, knowledge graph) by its id. Use the id from list_my_syntheses.",
    input_schema: {
      type: "object",
      properties: {
        synthesis_id: {
          type: "string",
          description: "The synthesis id (from list_my_syntheses).",
        },
      },
      required: ["synthesis_id"],
    },
  },
  {
    name: "search_my_library",
    description: "Search inside the user's uploaded documents (PDF and text). Returns matching file names and text snippets.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (what to look for in their documents).",
        },
      },
      required: ["query"],
    },
  },
];

const API_BASE =
  process.env.VERCEL_URL !== undefined
    ? `https://${process.env.VERCEL_URL}`
    : process.env.API_BASE_URL ?? "http://localhost:3000";

async function executeTool(
  userId: string,
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  const start = Date.now();
  try {
    if (name === "list_my_files") {
      const res = await fetch(`${API_BASE}/api/storage-list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefix: `uploads/${userId}` }),
      });
      const data = await res.json();
      if (!res.ok) return `Error: ${data.error ?? "Failed to list files"}`;
      const items = Array.isArray(data.items) ? data.items : [];
      if (items.length === 0) return "The user has no uploaded files yet.";
      const lines = items.slice(0, 30).map((o: { key?: string; size?: number; lastModified?: string }) => {
        const key = o.key ?? "";
        const name = key.split("/").pop() ?? key;
        const size = typeof o.size === "number" ? `${(o.size / 1024).toFixed(1)} KB` : "?";
        const date = o.lastModified ? new Date(o.lastModified).toLocaleDateString() : "";
        return `- ${name} (${size}${date ? `, ${date}` : ""})`;
      });
      return `Uploaded files (${items.length} total):\n${lines.join("\n")}`;
    }

    if (name === "list_my_syntheses") {
      const res = await fetch(`${API_BASE}/api/syntheses-list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) return `Error: ${data.error ?? "Failed to list syntheses"}`;
      const items = Array.isArray(data.items) ? data.items : [];
      if (items.length === 0) return "The user has no syntheses yet.";
      const lines = items.map(
        (o: { id?: string; title?: string; topicLabels?: string[]; createdAt?: string }) =>
          `- id: ${o.id}, title: ${o.title ?? "Untitled"}${(o.topicLabels ?? []).length ? `, topics: ${(o.topicLabels as string[]).join(", ")}` : ""}${o.createdAt ? `, created: ${o.createdAt}` : ""}`
      );
      return `Syntheses (${items.length} total):\n${lines.join("\n")}`;
    }

    if (name === "get_synthesis_content") {
      const synthesisId = typeof args.synthesis_id === "string" ? args.synthesis_id : "";
      if (!synthesisId) return "Error: synthesis_id is required.";
      const res = await fetch(`${API_BASE}/api/synthesis-get`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, synthesisId }),
      });
      const data = await res.json();
      if (!res.ok) return `Error: ${data.error ?? "Failed to get synthesis"}`;
      const title = data.title ?? "Untitled";
      const markdown = (data.markdown ?? "").slice(0, 8000);
      const topics = Array.isArray(data.topics) ? data.topics : [];
      const topicStr = topics.map((t: { label?: string }) => t?.label).filter(Boolean).join(", ");
      return `Synthesis: ${title}\nTopics: ${topicStr || "—"}\n\nContent (markdown):\n${markdown}${(data.markdown ?? "").length > 8000 ? "\n...[truncated]" : ""}`;
    }

    if (name === "search_my_library") {
      const query = typeof args.query === "string" ? args.query.trim() : "";
      if (!query) return "Error: query is required.";
      const res = await fetch(`${API_BASE}/api/search-library`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, query }),
      });
      const data = await res.json();
      if (!res.ok) return `Error: ${data.error ?? "Search failed"}`;
      const results = Array.isArray(data.results) ? data.results : [];
      if (results.length === 0) return `No matches found for "${query}" in the user's library.`;
      const lines = results.slice(0, 15).map((r: { title?: string; snippet?: string }) => `- ${r.title ?? "File"}: "${(r.snippet ?? "").slice(0, 200)}..."`);
      return `Found ${results.length} match(es):\n${lines.join("\n")}`;
    }

    return `Unknown tool: ${name}`;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // eslint-disable-next-line no-console
    console.error("[chat] executeTool error", { tool: name, error: msg, ms: Date.now() - start });
    return `Tool error: ${msg}`;
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
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
    res.status(401).json({ error: "Authorization required" });
    return;
  }

  let userId: string;
  try {
    const payload = await verifyToken(token, { secretKey });
    userId = payload.sub;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  } catch {
    res.status(401).json({ error: "Unauthorized" });
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
      m &&
      typeof m === "object" &&
      "role" in m &&
      "content" in m &&
      (typeof (m as Msg).content === "string" || Array.isArray((m as { content: unknown }).content))
  );
  if (!valid) {
    res.status(400).json({ error: "Each message must have role and content (string or array)" });
    return;
  }

  const toM2 = (m: { role: string; content: string | M2ContentBlock[] }): M2Message => ({
    role: (m.role === "user" || m.role === "assistant" ? m.role : "user") as "user" | "assistant",
    content: m.content,
  });

  let currentMessages: M2Message[] = messages.map((m: Msg) =>
    toM2({
      role: m.role,
      content: typeof m.content === "string" ? m.content : (m.content as M2ContentBlock[]),
    })
  );

  const maxRounds = 3;
  let lastContent = "";

  // eslint-disable-next-line no-console
  console.log("[chat] start", { userId: userId.slice(0, 12) + "...", messageCount: currentMessages.length });

  try {
    for (let round = 0; round < maxRounds; round++) {
      // eslint-disable-next-line no-console
      console.log("[chat] round", { round: round + 1, maxRounds, messageCount: currentMessages.length });

      const { content, toolCalls, rawAssistantContent } = await completeM2WithTools({
        system: CHAT_SYSTEM,
        messages: currentMessages,
        tools: APP_TOOLS,
        maxTokens: 1024,
        temperature: 0.7,
      });

      lastContent = content;

      // eslint-disable-next-line no-console
      console.log("[chat] model response", { round: round + 1, contentLength: content?.length ?? 0, toolCallCount: toolCalls.length });

      if (toolCalls.length === 0) {
        // eslint-disable-next-line no-console
        console.log("[chat] done (no tools)", { round: round + 1 });
        res.status(200).json({ content: lastContent || "" });
        return;
      }

      for (const tc of toolCalls) {
        // eslint-disable-next-line no-console
        console.log("[chat] tool call", { tool: tc.name, id: tc.id?.slice(0, 8) });
      }

      const toolResultBlocks: M2ContentBlock[] = toolCalls.map((tc) => ({
        type: "tool_result",
        tool_use_id: tc.id,
        content: "",
      }));

      const results = await Promise.all(
        toolCalls.map((tc) => executeTool(userId, tc.name, tc.arguments))
      );

      toolCalls.forEach((tc, i) => {
        const block = toolResultBlocks[i];
        if (block.type === "tool_result") block.content = results[i] ?? "";
        // eslint-disable-next-line no-console
        console.log("[chat] tool result", { tool: tc.name, resultLength: (results[i] ?? "").length });
      });

      currentMessages = [
        ...currentMessages,
        { role: "assistant" as const, content: rawAssistantContent },
        { role: "user" as const, content: toolResultBlocks },
      ];
    }

    // eslint-disable-next-line no-console
    console.log("[chat] done (max rounds)", { finalContentLength: lastContent?.length ?? 0 });
    res.status(200).json({ content: lastContent || "" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Chat failed";
    // eslint-disable-next-line no-console
    console.error("[chat] error", { userId: userId.slice(0, 12) + "...", error: message });
    res.status(500).json({ error: message });
  }
}
