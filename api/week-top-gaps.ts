/**
 * POST /api/week-top-gaps
 * Returns top knowledge gaps prioritized by difficulty (unknown flashcards).
 *
 * Body: { userId: string; limit?: number }
 * Returns: { gaps: Array<{ id: string; description: string; topics: Array<{ id: string; label: string }> }> }
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

type Topic = { id: string; label: string };
type GapInstance = {
  id: string;
  description: string;
  topics: Topic[];
  synthesisId: string;
};
type AggregatedGap = {
  id: string;
  description: string;
  topics: Topic[];
  instances: GapInstance[];
  severityScore: number;
};

function stripBasicMarkdown(text: string): string {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .trim();
}

function extractGapsFromMarkdown(markdown: string): string[] {
  if (!markdown) return [];
  const re = /##\s*Knowledge Gaps\s*\n([\s\S]*?)(?=\n##\s|$)/i;
  const match = markdown.match(re);
  if (!match) return [];
  return match[1]
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter((line) => line.length > 0);
}

function inferSeverity(description: string): number {
  const text = description.toLowerCase();
  let score = 1;
  if (
    /don't understand|do not understand|no idea|completely lost|fundamental|core concept|very confused|really confused|stuck/i.test(
      description
    )
  ) {
    score = 3;
  } else if (
    /confus|unsure|need more practice|weak on|review|revisit|not clear|unclear|sometimes forget/.test(
      text
    )
  ) {
    score = 2;
  }
  if (text.includes("?") || /\bwhy\b|\bhow\b/.test(text)) {
    score = Math.min(3, score + 1);
  }
  return score;
}

function aggregateGapInstances(instances: GapInstance[]): AggregatedGap[] {
  const byDescription = new Map<string, AggregatedGap>();

  for (const inst of instances) {
    const key = inst.description.trim().toLowerCase();
    const existing = byDescription.get(key);

    if (!existing) {
      const topicsMap = new Map<string, Topic>();
      for (const t of inst.topics) {
        if (!topicsMap.has(t.id)) topicsMap.set(t.id, t);
      }
      byDescription.set(key, {
        id: key,
        description: inst.description.trim(),
        topics: Array.from(topicsMap.values()),
        instances: [inst],
        severityScore: inferSeverity(inst.description),
      });
    } else {
      existing.instances.push(inst);
      const topicsMap = new Map<string, Topic>();
      for (const t of existing.topics) topicsMap.set(t.id, t);
      for (const t of inst.topics) if (!topicsMap.has(t.id)) topicsMap.set(t.id, t);
      existing.topics = Array.from(topicsMap.values());
      existing.severityScore = Math.max(
        existing.severityScore,
        inferSeverity(inst.description)
      );
    }
  }

  return Array.from(byDescription.values());
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = (req.body ?? {}) as { userId?: string; limit?: number };
  const userId = body.userId;
  if (!userId || typeof userId !== "string") {
    res.status(400).json({ error: "Missing or invalid 'userId'" });
    return;
  }

  const limit = typeof body.limit === "number" && body.limit > 0 ? body.limit : 5;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    res.status(500).json({ error: "Supabase not configured" });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: synData, error: synError } = await supabase
    .from("user_syntheses")
    .select("id, title, markdown, topics, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (synError) {
    console.error("[week-top-gaps] syntheses error:", synError);
    res.status(500).json({ error: "Failed to load syntheses" });
    return;
  }

  const instances: GapInstance[] = [];
  const rows = synData ?? [];
  for (const row of rows) {
    const markdown = (row as { markdown?: string }).markdown ?? "";
    const topics = (Array.isArray((row as { topics?: unknown }).topics)
      ? (row as { topics: Topic[] }).topics
      : []) as Topic[];
    const id = (row as { id: string }).id;
    const gapLines = extractGapsFromMarkdown(markdown);
    for (let i = 0; i < gapLines.length; i++) {
      const description = stripBasicMarkdown(gapLines[i]);
      if (!description) continue;
      instances.push({
        id: `${id}#${i}`,
        description,
        topics,
        synthesisId: id,
      });
    }
  }

  let aggregated = aggregateGapInstances(instances);

  const { data: cardData } = await supabase
    .from("user_card_review")
    .select("synthesis_id, question_snapshot")
    .eq("user_id", userId)
    .eq("known", false);

  const unknownByTopic = new Map<string, number>();
  const unknownBySynthesis = new Map<string, number>();
  const cards = cardData ?? [];
  for (const row of cards) {
    const sid = (row as { synthesis_id?: string | null }).synthesis_id;
    if (sid) {
      unknownBySynthesis.set(sid, (unknownBySynthesis.get(sid) ?? 0) + 1);
    }
    const snap = (row as { question_snapshot?: { topicId?: string } | null })
      .question_snapshot;
    if (snap && typeof snap === "object" && snap.topicId) {
      const tid = String(snap.topicId);
      unknownByTopic.set(tid, (unknownByTopic.get(tid) ?? 0) + 1);
    }
  }

  const scored = aggregated.map((g) => {
    let score = 0;
    for (const t of g.topics) {
      score += unknownByTopic.get(t.id) ?? 0;
    }
    for (const inst of g.instances) {
      score += unknownBySynthesis.get(inst.synthesisId) ?? 0;
    }
    return { gap: g, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.gap.severityScore - a.gap.severityScore;
  });

  const top = scored.slice(0, limit).map(({ gap }) => ({
    id: gap.id,
    description: gap.description,
    topics: gap.topics,
  }));

  res.status(200).json({ gaps: top });
}
