/**
 * Vercel serverless: POST /api/coach-response
 * Generates a single coach reply using MiniMax from full conversation context.
 * Uses the AI Moderator summary (prompts/ai-moderator-spec-summary.txt) as the canonical behavior specification.
 * For mode "exam", uses prompts/exam-scopes.txt and optional examType (HKDSE | IELTS | TOEFL | ISO).
 *
 * Body: { conversationHistory, messageIndex, topics, knowledgeGaps, studyPlan, mode?, examType?, debateMotion?, debateSide? }
 * Returns: { message: string }
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { completeM2 } from "../src/lib/minimax";

const SPEC_FILENAME = "ai-moderator-spec-summary.txt";
const EXAM_SCOPES_FILENAME = "exam-scopes.txt";

const EXAM_TYPES = ["HKDSE", "IELTS", "TOEFL", "ISO"] as const;
type ExamType = (typeof EXAM_TYPES)[number];

function loadSpec(): string {
  const candidates = [
    join(process.cwd(), "prompts", SPEC_FILENAME),
    join(__dirname, "..", "prompts", SPEC_FILENAME),
  ];
  for (const path of candidates) {
    try {
      if (!existsSync(path)) continue;
      return readFileSync(path, "utf-8");
    } catch {
      continue;
    }
  }
  return "";
}

function loadExamScopes(): string {
  const candidates = [
    join(process.cwd(), "prompts", EXAM_SCOPES_FILENAME),
    join(__dirname, "..", "prompts", EXAM_SCOPES_FILENAME),
  ];
  for (const path of candidates) {
    try {
      if (!existsSync(path)) continue;
      return readFileSync(path, "utf-8");
    } catch {
      continue;
    }
  }
  return "";
}

function getExamScopeSection(fullText: string, examType: string): string {
  const begin = `--- BEGIN_${examType} ---`;
  const end = `--- END_${examType} ---`;
  const startIdx = fullText.indexOf(begin);
  const endIdx = fullText.indexOf(end);
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return "";
  return fullText.slice(startIdx + begin.length, endIdx).trim();
}

const FALLBACKS = [
  "Keep going — explain that a bit more in your own words.",
  "Good. What's one thing that still feels unclear?",
  "Nice. Try connecting that to something you already know.",
  "You're doing great. One more round when you're ready.",
];

const DEBATE_FALLBACKS = [
  "Welcome to debate. State the motion and the side you're arguing. You have one minute to prepare.",
  "Time. You have three minutes for your opening. Begin.",
  "Thirty seconds remaining.",
  "Time's up. Thank you. Focus on one strength and one area to improve in your argumentation next time.",
];

function buildSystemPrompt(
  mode: string,
  topicLabels: string[],
  gaps: string[],
  plan: string[],
  debateMotion?: string,
  debateSide?: string,
  specText?: string,
  examType?: string | null,
  examScopesFull?: string
): string {
  const preamble = specText
    ? `You are an AI Moderator / speaking coach. The following document is your canonical behavior specification. Apply its principles, directives, and tone in all interactions (adapted to a single-learner context where relevant).\n\n---\n\n${specText}\n\n---\n\nCurrent session (follow the spec above; then apply this):\n`
    : "";

  if (mode === "debate") {
    const motion = (debateMotion || "This house believes that practice makes perfect.").trim();
    const side = debateSide === "against" ? "against" : "for";
    const debateBlock = `Mode: DEBATE. Motion: "${motion}". The user is arguing ${side} the motion.
Your role: neutral moderator. State the motion and side at the start; give clear time instructions (prep, speaking time, 30-second warning, time's up). In the final message, give brief argumentation feedback: one strength and one specific suggestion. Reply in 1–3 short sentences. Be clear and concise.`;
    return preamble + debateBlock;
  }

  if (mode === "exam" && examScopesFull) {
    const strictRule =
      "STRICT SCOPE: Do not answer anything beyond the scope above. If the user asks about a different exam, or off-topic, politely say you only assist with this exam type and redirect them back.";
    if (examType && EXAM_TYPES.includes(examType as ExamType)) {
      const section = getExamScopeSection(examScopesFull, examType);
      if (section) {
        let context = preamble + `Mode: EXAM STYLE. The user has chosen ${examType}. You must respond ONLY as the ${examType} coach.\n\n`;
        context += section + "\n\n" + strictRule + "\n\n";
        context += "Reply in 1–3 short sentences when speaking (conversation); you may give longer structured feedback when the user asks for it. Be encouraging and exam-focused.";
        return context;
      }
    }
    const autoDetect =
      "First, from the user's words and context, determine which exam type they are referring to: HKDSE, IELTS, TOEFL, or ISO. Then respond ONLY as the coach for that one exam type using the corresponding section below. Do not answer beyond that exam's scope. If unclear, ask which exam they are preparing for (HKDSE / IELTS / TOEFL / ISO).";
    let context = preamble + `Mode: EXAM STYLE. ${autoDetect}\n\n`;
    context += examScopesFull + "\n\n" + strictRule + "\n\n";
    context += "Reply in 1–3 short sentences when speaking; you may give longer structured feedback when the user asks for it. Be encouraging and exam-focused.";
    return context;
  }

  const modeDesc =
    mode === "gaps"
      ? "Focus on filling knowledge gaps; ask the user to teach back specific gap items."
      : mode === "exam"
      ? "Act like an examiner within HKDSE/IELTS/TOEFL/ISO scope; ask for clear definitions, strategies, or practice. Stay within the chosen exam's scope only."
      : "Help the user explain and solidify their understanding of key topics.";
  let context = preamble + `Mode: ${mode.toUpperCase()}. ${modeDesc}\n`;
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
    examType?: string | null;
    debateMotion?: string;
    debateSide?: string;
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
  const examType =
    body.examType === null || body.examType === ""
      ? undefined
      : EXAM_TYPES.includes((body.examType as string) as ExamType)
        ? (body.examType as ExamType)
        : undefined;
  const debateMotion = typeof body.debateMotion === "string" ? body.debateMotion.trim() : undefined;
  const debateSide = body.debateSide === "against" || body.debateSide === "for" ? body.debateSide : undefined;

  // eslint-disable-next-line no-console
  console.log("[coach-response] POST", { messageIndex, mode, examType, historyLen: conversationHistory.length });

  const specText = loadSpec();
  const examScopesFull = mode === "exam" ? loadExamScopes() : undefined;
  const systemPrompt = buildSystemPrompt(
    mode,
    topicLabels,
    knowledgeGaps,
    studyPlan,
    debateMotion,
    debateSide,
    specText,
    examType ?? undefined,
    examScopesFull
  );

  let userContent: string;
  if (mode === "debate") {
    if (messageIndex === 0) {
      userContent =
        "The debate is starting. Give the moderator intro: state the motion, say which side the user is arguing (for/against), and tell them they have one minute to prepare. When you say 'Time', they will give their opening. Keep it to 2–3 short sentences.";
    } else if (messageIndex === 1) {
      userContent =
        "Prep time is over. Say: 'Time. You have three minutes for your opening. Begin.' Keep it brief.";
    } else if (messageIndex === 2) {
      userContent =
        "About 2.5 minutes have passed. Say: 'Thirty seconds remaining.' Only that or similar.";
    } else if (messageIndex === 3) {
      const thread = conversationHistory
        .map((t) => (t.role === "user" ? `User: ${t.content}` : `Moderator: ${t.content}`))
        .join("\n\n");
      userContent = `The speaking time is over. Conversation:\n\n${thread}\n\nGive the closing: "Time's up. Thank you." Then in 2–3 sentences give brief argumentation feedback: one strength (e.g. clear claim, use of evidence) and one specific suggestion for improvement (e.g. add a counter-argument, stronger evidence). Stay encouraging.`;
    } else {
      userContent =
        "Debate round is ending. Thank the user and give one short line of encouragement.";
    }
  } else if (conversationHistory.length > 0) {
    const thread = conversationHistory
      .map((t) => (t.role === "user" ? `User: ${t.content}` : `Coach: ${t.content}`))
      .join("\n\n");
    userContent = `Full conversation so far:\n\n${thread}\n\nGenerate the next coach reply only (1–2 short sentences). Be encouraging and context-aware. Do not repeat the user's words; give follow-up or feedback.`;
  } else if (messageIndex === 0) {
    // First message: always give a clear, mode-specific opening so the user is not confused or lost.
    if (mode === "explain") {
      userContent = `This is the first message. The user is in EXPLAIN TOPICS mode. Give a brief opening (2–3 sentences) that: (1) welcomes them and names the mode, (2) says you will explain concepts and answer their questions about their topics, (3) invites them to ask about a topic or to start by explaining one. Be friendly and clear so they know what to expect.`;
    } else if (mode === "gaps") {
      userContent = topicLabels.length > 0 || knowledgeGaps.length > 0
        ? `This is the first message. The user is in TEACH BACK GAPS mode. Give a brief opening (2–3 sentences) that: (1) welcomes them and names the mode, (2) says you will have them explain things in their own words so you can spot and fill gaps together, (3) invites them to start by teaching back the first topic or gap. Be friendly and clear so they know what to expect.`
        : `This is the first message. The user is in TEACH BACK GAPS mode. Give a brief opening (2–3 sentences) that: (1) welcomes them and names the mode, (2) says you will have them explain what they've learned in their own words so you can spot gaps and ask follow-ups, (3) invites them to start whenever ready. Be friendly and clear so they know what to expect.`;
    } else if (mode === "exam") {
      const examHint = examType
        ? `The user has chosen ${examType}. Mention that you will only help within ${examType} scope.`
        : "You will help with one of: HKDSE, IELTS, TOEFL, or ISO. Ask which exam they are preparing for if not clear, and say you will only answer within that exam's scope.";
      userContent = `This is the first message. The user is in EXAM STYLE mode. Give a brief opening (2–3 sentences) that: (1) welcomes them and names the mode, (2) ${examHint} (3) invites them to say which exam or ask a practice question. Be friendly and clear so they know what to expect.`;
    } else {
      userContent = "The session just started. Say a brief, friendly opening (2–3 sentences) that names the current mode and tells the user what to expect, so they are not confused or lost.";
    }
  } else if (userTranscript) {
    userContent = `The user has said so far: "${userTranscript.slice(-800)}". This is coach turn #${messageIndex + 1}. Reply with one short follow-up or feedback (1–2 sentences).`;
  } else {
    userContent = `No speech from the user yet. This is coach turn #${messageIndex + 1}. Give a short prompt to encourage them to speak (1–2 sentences).`;
  }

  // First message (welcome) needs more tokens so the full sentence is spoken and not cut off
  const maxTokens = messageIndex === 0 ? 280 : 150;

  try {
    const message = await completeM2({
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
      maxTokens,
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

  const fallback =
    mode === "debate"
      ? DEBATE_FALLBACKS[messageIndex % DEBATE_FALLBACKS.length]
      : FALLBACKS[messageIndex % FALLBACKS.length];
  res.status(200).json({ message: fallback });
}
