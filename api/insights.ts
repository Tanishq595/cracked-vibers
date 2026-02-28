/**
 * POST /api/insights
 * Returns 1–3 AI-generated insight cards based on the user's syntheses (Minimax M2.5).
 * If the user has no syntheses, returns { cards: [] } so the client can show "Begin your journey".
 *
 * Body: { userId: string }
 * Returns: { cards: Array<{ title: string, subtitle: string, progress: number, synthesisId?: string }> }
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { completeM2 } from "../src/lib/minimax";

const INSIGHTS_SYSTEM = `You are an assistant that outputs only valid JSON. No markdown, no code fences, no explanation.
Given a list of the user's learning syntheses (each has id, title, topicLabels), produce 1–3 motivational insight cards.
Output exactly this JSON shape:
{ "cards": [ { "title": "string", "subtitle": "string", "progress": number } ] }
- title: Short congratulatory headline (e.g. "You're crushing Derivatives! 🚀", "Cell Biology needs love ❤️", "French Revolution mastered! 🎉"). One sentence, friendly tone.
- subtitle: One line of context or next step (e.g. "Next up: Integration", "3 videos watched, 2 to go", "Ready for the exam").
- progress: Number 0–100 for how much they've progressed on that topic.
Produce one card per synthesis, up to a maximum of 3 cards. Order by most recent / most relevant. Base the message on the synthesis title and topics only.`;

function parseCardsJson(raw: string): { title: string; subtitle: string; progress: number }[] {
  const trimmed = raw.replace(/^```\w*\n?|\n?```$/g, "").trim();
  let parsed: { cards?: Array<{ title?: string; subtitle?: string; progress?: number }> };
  try {
    parsed = JSON.parse(trimmed) as typeof parsed;
  } catch {
    return [];
  }
  const cards = Array.isArray(parsed.cards) ? parsed.cards : [];
  return cards
    .slice(0, 3)
    .map((c) => ({
      title: typeof c.title === "string" && c.title.length > 0 ? c.title : "Keep going!",
      subtitle: typeof c.subtitle === "string" ? c.subtitle : "",
      progress: typeof c.progress === "number" && c.progress >= 0 && c.progress <= 100 ? c.progress : 50,
    }));
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = (req.body ?? {}) as { userId?: string };
  const userId = body.userId;
  if (!userId || typeof userId !== "string") {
    res.status(400).json({ error: "Missing or invalid 'userId'" });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    res.status(500).json({ error: "Supabase not configured" });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: synData, error: synError } = await supabase
    .from("user_syntheses")
    .select("id, title, topics, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (synError) {
    console.error("[insights] Supabase syntheses error:", synError);
    res.status(500).json({ error: "Failed to load syntheses" });
    return;
  }

  const syntheses =
    synData?.map((row) => {
      const topics = (row as { topics?: unknown }).topics as Array<{ label?: string }> | null | undefined;
      const topicLabels = Array.isArray(topics)
        ? topics.map((t) => t?.label).filter((l): l is string => typeof l === "string")
        : [];
      return {
        id: (row as { id: string }).id,
        title: (row as { title?: string | null }).title ?? topicLabels[0] ?? "Untitled",
        topicLabels,
      };
    }) ?? [];

  if (syntheses.length === 0) {
    res.status(200).json({ cards: [] });
    return;
  }

  const summary = syntheses
    .map((s) => `id: ${s.id}, title: ${s.title}, topics: ${s.topicLabels.join(", ") || "none"}`)
    .join("\n");

  const userMessage = `User's syntheses (most recent first):\n${summary}\n\nOutput 1–3 insight cards as JSON.`;

  let raw: string;
  try {
    raw = await completeM2({
      system: INSIGHTS_SYSTEM,
      messages: [{ role: "user", content: userMessage }],
      maxTokens: 1024,
      temperature: 0.5,
    });
  } catch (err) {
    console.error("[insights] Minimax error:", err);
    res.status(500).json({ error: "Failed to generate insights" });
    return;
  }

  const parsedCards = parseCardsJson(raw);
  const cards = parsedCards.map((card, i) => ({
    ...card,
    synthesisId: syntheses[i]?.id,
  }));

  res.status(200).json({ cards });
}
