/**
 * POST /api/knowledge-graph-merge
 * Analyzes one new synthesis with Minimax, extracts topics/subtopics and edges,
 * merges into the user's stored graph. Existing nodes/edges are never sent to the AI.
 *
 * Body: { userId: string, synthesisId: string }
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { completeM2 } from "../src/lib/minimax";

const MERGE_SYSTEM = `You are a knowledge-graph designer. You receive (1) one new learning synthesis (title, topics, content summary) and (2) the current list of graph nodes (id and label). Your task is to output ONLY valid JSON with NEW nodes and NEW edges. Do not modify or repeat existing nodes.

Rules:
- New nodes must have unique "id" strings. Use a prefix like "syn-<short>-<slug>" where short is a short id for this synthesis (e.g. first 8 chars of synthesis id or "s1") and slug is a topic slug (e.g. "react-hooks", "use-state").
- New edges: "from" and "to" must be either new node ids you define, or EXISTING node ids from the list provided. Use only existing ids exactly as given.
- You may split the synthesis into topics and subtopics (e.g. main topic "React" with subtopics "useState", "useEffect").
- Edge types: "prerequisite", "part_of", "related", or "depends_on".

Output format (no markdown, no code fences, only this JSON):
{"newNodes":[{"id":"string","label":"string"}],"newEdges":[{"from":"string","to":"string","type":"string"}]}`;

function slug(id: string): string {
  return id.replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase() || "s";
}

function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) return codeBlock[1].trim();
  return trimmed;
}

/** Merge one synthesis into the user's graph. Used by merge handler and backfill. */
export async function mergeOneSynthesis(
  supabase: SupabaseClient,
  userId: string,
  synthesisId: string
): Promise<{ nodesCount: number; edgesCount: number }> {
  const { data: synRow, error: synError } = await supabase
    .from("user_syntheses")
    .select("id, title, topics, markdown")
    .eq("user_id", userId)
    .eq("id", synthesisId)
    .limit(1)
    .maybeSingle();

  if (synError || !synRow) {
    throw new Error("Synthesis not found");
  }

  const title = (synRow as { title?: string }).title ?? "Untitled";
  const topics = (synRow as { topics?: Array<{ id?: string; label?: string }> }).topics ?? [];
  const markdown = (synRow as { markdown?: string }).markdown ?? "";
  const summary = typeof markdown === "string" ? markdown.slice(0, 2500).trim() : "";
  const topicList = topics
    .map((t) => (typeof t === "object" && t && "label" in t ? (t as { label: string }).label : String(t)))
    .filter(Boolean);

  const { data: graphRow } = await supabase
    .from("user_knowledge_graph")
    .select("nodes, edges")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  const existingNodes = Array.isArray(graphRow?.nodes) ? (graphRow!.nodes as Array<{ id: string; label: string }>) : [];
  const existingEdges = Array.isArray(graphRow?.edges) ? (graphRow!.edges as Array<{ from: string; to: string; type?: string }>) : [];
  const existingIdSet = new Set(existingNodes.map((n) => n.id));

  const shortId = slug(synthesisId);
  const userMessage = `New synthesis to add to the graph:
Title: ${title}
Topics: ${topicList.join(", ") || "none"}
Content summary:
${summary}

Existing graph nodes (you may use these ids in "from"/"to" for new edges):
${JSON.stringify(existingNodes.map((n) => ({ id: n.id, label: n.label })))}

Output newNodes and newEdges for this synthesis only. Use "syn-${shortId}-<slug>" for new node ids.`;

  const raw = await completeM2({
    system: MERGE_SYSTEM,
    messages: [{ role: "user", content: userMessage }],
    maxTokens: 2048,
    temperature: 0.3,
  });

  let parsed: { newNodes?: Array<{ id?: string; label?: string }>; newEdges?: Array<{ from?: string; to?: string; type?: string }> };
  try {
    parsed = JSON.parse(extractJson(raw)) as typeof parsed;
  } catch {
    throw new Error("Invalid AI response");
  }

  const newNodes = (Array.isArray(parsed.newNodes) ? parsed.newNodes : [])
    .filter((n) => n && typeof n.id === "string" && typeof n.label === "string")
    .map((n) => ({ id: (n.id as string).trim(), label: String((n as { label: string }).label).trim() }))
    .filter((n) => n.id.length > 0 && n.label.length > 0);

  const newEdges = (Array.isArray(parsed.newEdges) ? parsed.newEdges : [])
    .filter((e) => e && typeof e.from === "string" && typeof e.to === "string")
    .map((e) => ({
      from: (e.from as string).trim(),
      to: (e.to as string).trim(),
      type: typeof e.type === "string" ? e.type : "related",
    }));

  const mergedIdSet = new Set([...existingIdSet]);
  const addedNodes: Array<{ id: string; label: string }> = [];
  for (const n of newNodes) {
    if (!mergedIdSet.has(n.id)) {
      mergedIdSet.add(n.id);
      addedNodes.push(n);
    }
  }

  const allNodes = [...existingNodes, ...addedNodes];
  const allIdSet = new Set(allNodes.map((n) => n.id));
  const validNewEdges = newEdges.filter((e) => allIdSet.has(e.from) && allIdSet.has(e.to));
  const mergedEdges = [...existingEdges];
  const seenEdge = new Set(existingEdges.map((e) => `${e.from}\t${e.to}`));
  for (const e of validNewEdges) {
    const key = `${e.from}\t${e.to}`;
    if (!seenEdge.has(key)) {
      seenEdge.add(key);
      mergedEdges.push(e);
    }
  }

  const { error: upsertError } = await supabase.from("user_knowledge_graph").upsert(
    {
      user_id: userId,
      nodes: allNodes,
      edges: mergedEdges,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (upsertError) {
    console.error("[knowledge-graph-merge] Upsert error:", upsertError);
    throw new Error("Failed to save graph");
  }

  return { nodesCount: allNodes.length, edgesCount: mergedEdges.length };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = (req.body ?? {}) as { userId?: string; synthesisId?: string };
  const userId = body.userId;
  const synthesisId = body.synthesisId;
  if (!userId || typeof userId !== "string") {
    res.status(400).json({ error: "Missing or invalid 'userId'" });
    return;
  }
  if (!synthesisId || typeof synthesisId !== "string") {
    res.status(400).json({ error: "Missing or invalid 'synthesisId'" });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    res.status(500).json({ error: "Supabase not configured" });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const result = await mergeOneSynthesis(supabase, userId, synthesisId);
    res.status(200).json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to merge";
    if (msg === "Synthesis not found") res.status(404).json({ error: msg });
    else if (msg === "Invalid AI response") res.status(500).json({ error: msg });
    else {
      console.error("[knowledge-graph-merge]", err);
      res.status(500).json({ error: "Failed to analyze synthesis" });
    }
  }
}
