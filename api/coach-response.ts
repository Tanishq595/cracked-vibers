/**
 * Vercel serverless: POST /api/coach-response
 * Generates a single coach reply using MiniMax from full conversation context.
 *
 * Body: {
 *   conversationHistory: { role: 'user'|'coach'; content: string }[];
 *   messageIndex: number;
 *   topics?: { id: string; label: string }[];
 *   knowledgeGaps?: string[];
 *   studyPlan?: string[];
 *   mode?: "explain" | "gaps" | "exam";
 * }
 * (Still accepts userTranscript for backward compatibility.)
 * Returns: { message: string }
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { completeM2 } from "../src/lib/minimax";

const FALLBACKS = [
  "Keep going — explain that a bit more in your own words.",
  "Good. What's one thing that still feels unclear?",
  "Nice. Try connecting that to something you already know.",
  "You're doing great. One more round when you're ready.",
];

function buildSystemPrompt(
  mode: string,
  topicLabels: string[],
  gaps: string[],
  plan: string[]
): string {
  const modeDesc =
    mode === "gaps"
      ? "Focus on filling knowledge gaps; ask the user to teach back specific gap items."
      : mode === "exam"
      ? "Act like an examiner: ask for clear definitions, relationships, or applications."
      : "Help the user explain and solidify their understanding of key topics.";
  let context = `You are a friendly speaking coach for a learning app. ${modeDesc}\n`;
  if (topicLabels.length > 0) {
    context += `Key topics for this session: ${topicLabels.join(", ")}.\n`;
  }
  if (gaps.length > 0) {
    context += `Knowledge gaps to address: ${gaps.slice(0, 3).join("; ")}.\n`;
  }
  if (plan.length > 0) {
    context += `Study plan tip: ${plan[0]}.\n`;
  }
  context +=
    "Reply in 1–2 short sentences only. Be encouraging and specific. Do not repeat the user's words back; give a follow-up prompt or brief feedback.";
  return context;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = (req.body ?? {}) as {
    conversationHistory?: { role: string; content: string }[];
    userTranscript?: string;
    messageIndex?: number;
    topics?: { id: string; label: string }[];
    knowledgeGaps?: string[];
    studyPlan?: string[];
    mode?: string;
  };

  const rawHistory = Array.isArray(body.conversationHistory) ? body.conversationHistory : [];
  const conversationHistory = rawHistory
    .filter((t) => t && (t.role === "user" || t.role === "coach") && typeof t.content === "string")
    .map((t) => ({ role: t.role as "user" | "coach", content: (t.content as string).trim() }));

  const userTranscript = typeof body.userTranscript === "string" ? body.userTranscript.trim() : "";
  const messageIndex = typeof body.messageIndex === "number" ? body.messageIndex : 0;
  const topics = Array.isArray(body.topics) ? body.topics : [];
  const topicLabels = topics.map((t) => t.label).filter(Boolean);
  const knowledgeGaps = Array.isArray(body.knowledgeGaps) ? body.knowledgeGaps : [];
  const studyPlan = Array.isArray(body.studyPlan) ? body.studyPlan : [];
  const mode = typeof body.mode === "string" ? body.mode : "explain";

  const systemPrompt = buildSystemPrompt(mode, topicLabels, knowledgeGaps, studyPlan);

  let userContent: string;
  if (conversationHistory.length > 0) {
    const thread = conversationHistory
      .map((t) => (t.role === "user" ? `User: ${t.content}` : `Coach: ${t.content}`))
      .join("\n\n");
    userContent = `Full conversation so far:\n\n${thread}\n\nGenerate the next coach reply only (1–2 short sentences). Be encouraging and context-aware. Do not repeat the user's words; give follow-up or feedback.`;
  } else if (messageIndex === 0) {
    userContent = "The session just started. Say a brief, friendly opening (1–2 sentences) to get the user to start explaining.";
  } else if (userTranscript) {
    userContent = `The user has said so far: "${userTranscript.slice(-800)}". This is coach turn #${messageIndex + 1}. Reply with one short follow-up or feedback (1–2 sentences).`;
  } else {
    userContent = `No speech from the user yet. This is coach turn #${messageIndex + 1}. Give a short prompt to encourage them to speak (1–2 sentences).`;
  }

  try {
    const message = await completeM2({
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
      maxTokens: 150,
      temperature: 0.6,
    });

    const trimmed = (message || "").trim();
    if (trimmed) {
      res.status(200).json({ message: trimmed });
      return;
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[coach-response] MiniMax error:", err);
  }

  const fallback = FALLBACKS[messageIndex % FALLBACKS.length];
  res.status(200).json({ message: fallback });
}
