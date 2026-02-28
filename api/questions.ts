/**
 * Vercel serverless: POST /api/questions
 * Generates practice questions for topics using MiniMax M2.5.
 *
 * Body:
 * {
 *   userId?: string;
 *   topics: Array<{ id: string; label: string }>;
 *   count?: number; // default 3–5
 * }
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { completeM2 } from "../src/lib/minimax";

type Topic = { id: string; label: string };

type Question = {
  id: string;
  topicId: string;
  prompt: string;
  type: "mcq" | "short";
  options?: string[];
  correctAnswer: string;
  explanation: string;
};

const QUESTIONS_SYSTEM = `You are an assessment designer for M.U.S.T.Learn.
You create SHORT, high-quality practice questions that improve learning.

Constraints:
- Focus on conceptual understanding, not trivial recall.
- Mix multiple-choice and short-answer questions.
- For MCQ, include 4 options with only ONE clearly best answer.
- For short-answer, answers should be 1–2 sentences or a formula.
- Explanations MUST be simple and student-friendly.

You MUST respond with STRICT JSON only (no markdown, no prose), in this TypeScript-like shape:
{
  "questions": [
    {
      "id": "string",
      "topicId": "string",
      "prompt": "string",
      "type": "mcq" | "short",
      "options": ["A", "B", "C", "D"], // required for mcq, omit for short
      "correctAnswer": "string",
      "explanation": "string"
    }
  ]
}`;

function parseQuestions(jsonText: string): Question[] {
  try {
    const parsed = JSON.parse(jsonText) as { questions?: Question[] };
    if (!parsed || !Array.isArray(parsed.questions)) return [];
    return parsed.questions.filter(
      (q) =>
        q &&
        typeof q.id === "string" &&
        typeof q.topicId === "string" &&
        typeof q.prompt === "string" &&
        (q.type === "mcq" || q.type === "short") &&
        typeof q.correctAnswer === "string" &&
        typeof q.explanation === "string"
    );
  } catch {
    return [];
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

  const { topics, count } = (req.body ?? {}) as {
    topics?: Topic[];
    count?: number;
  };

  if (!Array.isArray(topics) || topics.length === 0) {
    res.status(400).json({ error: "Missing or empty 'topics' array" });
    return;
  }

  const maxQuestions = Math.min(Math.max(count ?? 3, 1), 8);

  const trimmedTopics = topics.slice(0, 5);
  const topicSummary = trimmedTopics
    .map((t) => `- id: ${t.id}, label: ${t.label}`)
    .join("\n");

  const userContent = `Create ${maxQuestions} diverse questions across these topics:\n${topicSummary}\n\nReturn ONLY valid JSON as specified.`;

  try {
    const result = await completeM2({
      system: QUESTIONS_SYSTEM,
      messages: [
        {
          role: "user",
          content: userContent,
        },
      ],
      maxTokens: 1024,
      temperature: 0.6,
    });

    const questions = parseQuestions(result);
    if (!questions.length) {
      res.status(500).json({ error: "Failed to parse questions" });
      return;
    }

    res.status(200).json({ questions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Question generation failed.";
    res.status(500).json({ error: message });
  }
}

