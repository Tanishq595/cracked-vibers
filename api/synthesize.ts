/**
 * Vercel serverless: POST /api/synthesize
 * Analyze learning materials with MiniMax M2.5; returns markdown + knowledge graph.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { completeM2 } from "../src/lib/minimax";

const SYNTHESIS_SYSTEM = `You are an expert EdTech AI for M.U.S.T.Learn. Your job is to analyze learning materials and produce a unified knowledge synthesis with metacognition (gap analysis) and a prioritized study plan.

Given raw learning materials (from Classroom, Notion, YouTube transcripts, or manual paste), you MUST:

1. Extract and list all distinct TOPICS covered (short labels).
2. Identify precise KNOWLEDGE GAPS: what is missing, unclear, or only partially covered. Be specific (e.g. "Mechanism of X not explained", "No examples for Y").
3. Output a prioritized STUDY PLAN: ordered list of actions (review topic X, practice Y, fill gap Z) with brief rationale.
4. Produce a simple KNOWLEDGE GRAPH as JSON: nodes = topics, edges = "depends_on" or "prerequisite" between topics. Use this exact structure:
   {"nodes":[{"id":"topic_id","label":"Topic name"}],"edges":[{"from":"id1","to":"id2","type":"prerequisite"}]}

Format your response as follows (use these exact section headers in markdown):

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

function parseKnowledgeGraphFromMarkdown(md: string): Record<string, unknown> | null {
  const match = md.match(/```json\s*([\s\S]*?)```/);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim()) as Record<string, unknown>;
  } catch {
    return null;
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

  const materials =
    typeof (req.body as { materials?: string })?.materials === "string"
      ? (req.body as { materials: string }).materials.trim()
      : "";

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

    res.status(200).json({
      markdown: result,
      knowledgeGraph: parseKnowledgeGraphFromMarkdown(result),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Synthesis failed.";
    res.status(500).json({ error: message });
  }
}
