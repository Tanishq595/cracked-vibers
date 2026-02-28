/**
 * Vercel serverless: POST /api/synthesize
 * Analyze learning materials with MiniMax M2.5; returns markdown + knowledge graph.
 * Also (optionally) persists the synthesis to Supabase for a given user.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { completeM2 } from "../src/lib/minimax";
import { createClient } from "@supabase/supabase-js";

const SYNTHESIS_SYSTEM = `You are an expert EdTech AI for M.U.S.T.Learn. Your job is to analyze learning materials and produce a unified knowledge synthesis with metacognition (gap analysis) and a prioritized study plan.

Given raw learning materials (from Classroom, Notion, YouTube transcripts, or manual paste), you MUST:

1. Extract and list all distinct TOPICS covered (short labels).
2. Identify precise KNOWLEDGE GAPS: what is missing, unclear, or only partially covered. Be specific (e.g. "Mechanism of X not explained", "No examples for Y").
3. Output a prioritized STUDY PLAN: ordered list of actions (review topic X, practice Y, fill gap Z) with brief rationale.
4. Produce a simple KNOWLEDGE GRAPH as JSON: nodes = topics, edges = "depends_on" or "prerequisite" between topics. Use this exact structure:
   {"nodes":[{"id":"topic_id","label":"Topic name"}],"edges":[{"from":"id1","to":"id2","type":"prerequisite"}]}

Format your response as follows (use these exact section headers in markdown, and make sure Topics is a simple bullet list with one short topic per line):

## Topics
- topic1
- topic2

## Knowledge Gaps
- gap1
- gap2

## Study Plan
1. Action 1 — rationale
2. Action 2 — rationale

## Knowledge Graph
\`\`\`json
{ ... valid JSON only ... }
\`\`\`

Output only the analysis in markdown plus the JSON block. No preamble.`;

const MAX_MATERIAL_CHARS = 16000;

function parseKnowledgeGraphFromMarkdown(md: string): Record<string, unknown> | null {
  const match = md.match(/```json\s*([\s\S]*?)```/);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractTopicsFromMarkdown(
  md: string
): Array<{ id: string; label: string }> {
  const topicsSectionMatch = md.match(
    /##\s*Topics\s*\n([\s\S]*?)(?=\n##\s|$)/i
  );
  if (!topicsSectionMatch) return [];

  const lines = topicsSectionMatch[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-"));

  const seen = new Set<string>();

  return lines
    .map((line) => line.replace(/^-+\s*/, "").trim())
    .filter((label) => !!label)
    .map((label) => {
      const baseId = label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      let id = baseId || "topic";
      let counter = 2;
      while (seen.has(id)) {
        id = `${baseId || "topic"}-${counter++}`;
      }
      seen.add(id);
      return { id, label };
    });
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { materials: rawMaterials, userId, title } = (req.body ??
    {}) as {
    materials?: string;
    userId?: string;
    title?: string;
  };

  const materials =
    typeof rawMaterials === "string"
      ? rawMaterials.trim().slice(0, MAX_MATERIAL_CHARS)
      : "";

  // eslint-disable-next-line no-console
  console.log("[synthesize] POST", { materialsLen: materials.length, hasUserId: !!userId });

  if (!materials) {
    res.status(400).json({ error: "Missing or empty 'materials' in request body." });
    return;
  }

  try {
    const result = await completeM2({
      system: SYNTHESIS_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Analyze these learning materials and produce the full synthesis (Topics, Knowledge Gaps, Study Plan, Knowledge Graph JSON):\n\n${materials}`,
        },
      ],
      maxTokens: 4096,
      temperature: 0.3,
    });

    const topics = extractTopicsFromMarkdown(result);
    const knowledgeGraph = parseKnowledgeGraphFromMarkdown(result);

    // Best-effort persistence: store synthesis for this user if configured.
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    let synthesisId: string | null = null;
    if (supabaseUrl && supabaseServiceKey && typeof userId === "string") {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const recordTitle =
          typeof title === "string" && title.trim().length > 0
            ? title.trim()
            : topics[0]?.label ?? "Untitled synthesis";

        const { data: insertData, error: insertError } = await supabase
          .from("user_syntheses")
          .insert({
            user_id: userId,
            title: recordTitle,
            materials,
            markdown: result,
            topics,
            knowledge_graph: knowledgeGraph,
          })
          .select("id")
          .single();

        if (!insertError && insertData?.id) synthesisId = insertData.id as string;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[synthesize] failed to persist synthesis:", e);
      }
    }

    console.log("[synthesize] done", { topicsCount: topics.length, hasGraph: !!knowledgeGraph });
    res.status(200).json({
      markdown: result,
      knowledgeGraph,
      topics,
      synthesisId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Synthesis failed.";
    // eslint-disable-next-line no-console
    console.error("[synthesize] Error:", message, err);
    res.status(500).json({ error: message });
  }
}
