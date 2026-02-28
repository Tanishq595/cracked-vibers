import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  AlertCircle,
  ArrowRight,
  Brain,
  CheckCircle2,
  Clock,
  Filter,
  ListChecks,
  Search as SearchIcon,
  Sparkles,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../components/ui/chart";
import * as Recharts from "recharts";
import type { ChartConfig } from "../components/ui/chart";
import { toast } from "sonner";

type Topic = { id: string; label: string };

type SynthesisListItem = {
  id: string;
  title: string;
  createdAt?: string | null;
  topicLabels?: string[];
};

type SynthesisDetail = {
  id: string;
  title: string;
  createdAt: string | null;
  markdown: string;
  topics: Topic[];
};

type GapInstance = {
  id: string;
  description: string;
  topics: Topic[];
  synthesisId: string;
  synthesisTitle: string;
  createdAt: string | null;
};

export type AggregatedGap = {
  id: string;
  description: string;
  topics: Topic[];
  instances: GapInstance[];
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  count: number;
  severityScore: number;
};

type UseUserGapsState = {
  gaps: AggregatedGap[];
  loading: boolean;
  error: string | null;
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
      description,
    )
  ) {
    score = 3;
  } else if (
    /confus|unsure|need more practice|weak on|review|revisit|not clear|unclear|sometimes forget/.test(
      text,
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
    const createdAtTime = inst.createdAt ? Date.parse(inst.createdAt) : 0;

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
        firstSeenAt: inst.createdAt ?? null,
        lastSeenAt: inst.createdAt ?? null,
        count: 1,
        severityScore: inferSeverity(inst.description),
      });
    } else {
      existing.instances.push(inst);
      existing.count += 1;
      if (inst.createdAt) {
        const first = existing.firstSeenAt ? Date.parse(existing.firstSeenAt) : Number.POSITIVE_INFINITY;
        const last = existing.lastSeenAt ? Date.parse(existing.lastSeenAt) : 0;
        existing.firstSeenAt = createdAtTime < first ? inst.createdAt : existing.firstSeenAt;
        existing.lastSeenAt = createdAtTime > last ? inst.createdAt : existing.lastSeenAt;
      }
      const topicsMap = new Map<string, Topic>();
      for (const t of existing.topics) topicsMap.set(t.id, t);
      for (const t of inst.topics) if (!topicsMap.has(t.id)) topicsMap.set(t.id, t);
      existing.topics = Array.from(topicsMap.values());
      existing.severityScore = Math.max(existing.severityScore, inferSeverity(inst.description));
    }
  }

  const aggregated = Array.from(byDescription.values());
  aggregated.sort((a, b) => {
    const aTime = a.lastSeenAt ? Date.parse(a.lastSeenAt) : 0;
    const bTime = b.lastSeenAt ? Date.parse(b.lastSeenAt) : 0;
    if (b.severityScore !== a.severityScore) {
      return b.severityScore - a.severityScore;
    }
    return bTime - aTime;
  });
  return aggregated;
}

function useUserGaps(limit?: number): UseUserGapsState {
  const { user } = useUser();
  const [state, setState] = useState<UseUserGapsState>({
    gaps: [],
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    async function load() {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const listRes = await fetch("/api/syntheses-list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user?.id }),
        });
        const listJson = await listRes.json();
        if (!listRes.ok) {
          throw new Error(listJson.error ?? "Failed to load syntheses");
        }
        const items: SynthesisListItem[] = Array.isArray(listJson.items) ? listJson.items : [];
        if (items.length === 0) {
          if (!cancelled) {
            setState({ gaps: [], loading: false, error: null });
          }
          return;
        }

        const details = await Promise.all(
          items.map(async (item) => {
            try {
              const res = await fetch("/api/synthesis-get", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user?.id, synthesisId: item.id }),
              });
              const json = await res.json();
              if (!res.ok) {
                throw new Error(json.error ?? "Failed to load synthesis");
              }
              const detail: SynthesisDetail = {
                id: item.id,
                title: item.title ?? json.title ?? "Untitled synthesis",
                createdAt: (item.createdAt as string | null | undefined) ?? (json.createdAt as string | null | undefined) ?? null,
                markdown: typeof json.markdown === "string" ? json.markdown : "",
                topics: Array.isArray(json.topics) ? (json.topics as Topic[]) : [],
              };
              return detail;
            } catch {
              return null;
            }
          }),
        );

        const validDetails = details.filter((d): d is SynthesisDetail => !!d && !!d.markdown);
        const instances: GapInstance[] = [];
        for (const d of validDetails) {
          const gapLines = extractGapsFromMarkdown(d.markdown);
          for (let i = 0; i < gapLines.length; i++) {
            const descriptionRaw = gapLines[i];
            const description = stripBasicMarkdown(descriptionRaw);
            if (!description) continue;
            instances.push({
              id: `${d.id}#${i}`,
              description,
              topics: d.topics,
              synthesisId: d.id,
              synthesisTitle: d.title,
              createdAt: d.createdAt,
            });
          }
        }

        let aggregated = aggregateGapInstances(instances);
        if (typeof limit === "number" && limit > 0) {
          aggregated = aggregated.slice(0, limit);
        }

        if (!cancelled) {
          setState({ gaps: aggregated, loading: false, error: null });
        }
      } catch (e) {
        if (!cancelled) {
          setState({
            gaps: [],
            loading: false,
            error: e instanceof Error ? e.message : "Failed to load gaps",
          });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, limit]);

  return state;
}

export function useTopGaps(count = 3) {
  const { gaps, loading, error } = useUserGaps(count);
  const topGaps = useMemo(() => gaps.slice(0, count), [gaps, count]);
  return { gaps: topGaps, loading, error };
}

const chartConfig = {
  gaps: {
    label: "Gaps",
    color: "hsl(35, 100%, 60%)",
  },
} satisfies ChartConfig;

export function GapAnalysis() {
  const navigate = useNavigate();
  const { gaps, loading, error } = useUserGaps();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState<string>("all");
  const [addressedIds, setAddressedIds] = useState<Set<string>>(new Set());
  const [addressedOrder, setAddressedOrder] = useState<"unaddressed-first" | "addressed-first">(
    "unaddressed-first",
  );

  const allTopics = useMemo(() => {
    const map = new Map<string, string>();
    for (const gap of gaps) {
      for (const t of gap.topics) {
        if (!map.has(t.id)) map.set(t.id, t.label);
      }
    }
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [gaps]);

  const filteredGaps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base = gaps.filter((gap) => {
      const inTopic =
        selectedTopicId === "all" || gap.topics.some((t) => t.id === selectedTopicId);
      if (!inTopic) return false;
      if (!q) return true;
      const haystack =
        gap.description.toLowerCase() +
        " " +
        gap.topics.map((t) => t.label.toLowerCase()).join(" ");
      return haystack.includes(q);
    });

    // Order by addressed vs non-addressed, then keep existing severity/recency ordering.
    const ordered = [...base].sort((a, b) => {
      const aAddressed = addressedIds.has(a.id);
      const bAddressed = addressedIds.has(b.id);
      if (aAddressed === bAddressed) return 0;
      if (addressedOrder === "addressed-first") {
        return aAddressed ? -1 : 1;
      }
      // unaddressed-first
      return aAddressed ? 1 : -1;
    });
    return ordered;
  }, [gaps, searchQuery, selectedTopicId, addressedIds, addressedOrder]);

  const chartData = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    for (const gap of gaps) {
      for (const t of gap.topics) {
        const key = t.id || t.label;
        const existing = counts.get(key);
        if (existing) {
          existing.count += gap.count;
        } else {
          counts.set(key, { label: t.label, count: gap.count });
        }
      }
    }
    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [gaps]);

  const handleGenerateQuestions = (gap: AggregatedGap) => {
    const topics = gap.topics.length
      ? gap.topics
      : [{ id: "gap", label: gap.description.slice(0, 60) }];
    navigate("/dashboard/synthesize", {
      state: {
        fromGaps: true,
        gapDescription: gap.description,
        topicsFromGaps: topics,
      },
    });
  };

  const handleStartTeachBack = (gap: AggregatedGap) => {
    const topics = gap.topics.length
      ? gap.topics
      : [{ id: "gap", label: gap.description.slice(0, 60) }];
    const knowledgeGaps = [gap.description];
    navigate("/dashboard/coach", {
      state: {
        mode: "gaps",
        topics,
        knowledgeGaps,
        studyPlan: [],
      },
    });
  };

  const handleMarkAddressed = (gapId: string) => {
    setAddressedIds((prev) => new Set([...Array.from(prev), gapId]));
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Knowledge gaps
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Your syntheses&apos; <span className="font-semibold">Knowledge Gaps</span> sections,
            stitched together so you can deliberately close weak spots.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 dark:border-amber-700 dark:bg-amber-900/20">
          <Brain className="h-6 w-6 text-amber-500" />
          <div className="space-y-0.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-200">
              Metacognition
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-100/90">
              Spot, track, and teach back what&apos;s still fuzzy.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-card px-4 py-3 shadow-sm dark:border-slate-800">
        <div className="relative flex-1 min-w-[220px]">
          <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search gaps by keyword or topic…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            className="h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={selectedTopicId}
            onChange={(e) => setSelectedTopicId(e.target.value)}
          >
            <option value="all">All topics</option>
            {allTopics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSearchQuery("");
            setSelectedTopicId("all");
          }}
        >
          Clear filters
        </Button>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-card py-12 text-sm text-muted-foreground dark:border-slate-800">
          <span className="flex h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          <p>Surfacing your knowledge gaps…</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-100">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Couldn&apos;t load gaps</p>
            <p className="text-xs opacity-90">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && gaps.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/40">
          <Sparkles className="h-8 w-8 text-amber-400" />
          <div className="space-y-1">
            <p className="text-base font-semibold text-foreground">
              No gaps found yet.
            </p>
            <p className="text-sm text-muted-foreground">
              Synthesize materials first to identify gaps.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/dashboard/synthesize")}
          >
            Go to Synthesize
          </Button>
        </div>
      )}

      {!loading && !error && gaps.length > 0 && (
        <>
          {chartData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-slate-200 bg-card p-4 shadow-sm dark:border-slate-800"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-amber-500" />
                  <h2 className="text-sm font-semibold text-foreground">
                    Gaps by topic
                  </h2>
                </div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Highest concentration of open gaps
                </p>
              </div>
              <ChartContainer config={chartConfig} className="h-60">
                <Recharts.BarChart data={chartData}>
                  <Recharts.CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <Recharts.XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <Recharts.YAxis tickLine={false} axisLine={false} tickMargin={8} />
                  <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "var(--muted)" }} />
                  <Recharts.Bar
                    dataKey="count"
                    fill="var(--color-gaps)"
                    radius={[6, 6, 0, 0]}
                  />
                </Recharts.BarChart>
              </ChartContainer>
            </motion.div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">
                {filteredGaps.length} active gap
                {filteredGaps.length === 1 ? "" : "s"} surfaced from your syntheses
              </p>
              <div className="flex items-center gap-3">
                <select
                  className="h-8 rounded-full border border-input bg-background px-3 text-[11px] font-medium text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={addressedOrder}
                  onChange={(e) =>
                    setAddressedOrder(
                      e.target.value === "addressed-first" ? "addressed-first" : "unaddressed-first",
                    )
                  }
                >
                  <option value="unaddressed-first">Open gaps first</option>
                  <option value="addressed-first">Addressed first</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Sorted by severity and recency.
                </p>
              </div>
            </div>

            {filteredGaps.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-card px-4 py-3 text-sm text-muted-foreground dark:border-slate-800">
                No gaps match the current filters. Try clearing the search or topic
                filter.
              </p>
            ) : (
              <Accordion
                type="multiple"
                className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-card dark:divide-slate-800 dark:border-slate-800"
              >
                {filteredGaps.map((gap) => {
                  const isAddressed = addressedIds.has(gap.id);
                  return (
                    <AccordionItem key={gap.id} value={gap.id}>
                      <AccordionTrigger className="px-4">
                        <div className="flex flex-1 flex-col gap-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-amber-100 px-2 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                              {gap.severityScore >= 3
                                ? "High"
                                : gap.severityScore === 2
                                ? "Medium"
                                : "Low"}
                            </span>
                            <span
                              className={`text-sm font-semibold ${
                                isAddressed
                                  ? "text-muted-foreground line-through"
                                  : "text-foreground"
                              }`}
                            >
                              {gap.description}
                            </span>
                          </div>
                          <div
                            className={`flex flex-wrap items-center gap-2 text-xs ${
                              isAddressed ? "text-muted-foreground/70" : "text-muted-foreground"
                            }`}
                          >
                            {gap.topics.slice(0, 4).map((t) => (
                              <Badge
                                key={t.id}
                                variant="outline"
                                className="border-amber-200 bg-amber-50/70 text-[11px] font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-100"
                              >
                                {t.label}
                              </Badge>
                            ))}
                            {gap.topics.length > 4 && (
                              <span className="text-[11px] text-muted-foreground">
                                +{gap.topics.length - 4} more
                              </span>
                            )}
                            <span className="ml-auto inline-flex items-center gap-1 text-[11px]">
                              <Clock className="h-3 w-3" />
                              {gap.lastSeenAt
                                ? new Date(gap.lastSeenAt).toLocaleDateString()
                                : "Unknown"}
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-3 text-sm">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="mt-0.5 h-4 w-4 text-amber-500" />
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Where this shows up
                              </p>
                              <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                                {gap.instances.slice(0, 4).map((inst) => (
                                  <li
                                    key={inst.id}
                                    className="flex items-center justify-between gap-2"
                                  >
                                    <span className="truncate">{inst.synthesisTitle}</span>
                                    {inst.createdAt && (
                                      <span className="shrink-0 text-[11px] text-slate-400">
                                        {new Date(inst.createdAt).toLocaleDateString()}
                                      </span>
                                    )}
                                  </li>
                                ))}
                                {gap.instances.length > 4 && (
                                  <li className="text-[11px] text-muted-foreground">
                                    +{gap.instances.length - 4} more syntheses
                                  </li>
                                )}
                              </ul>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleGenerateQuestions(gap)}
                              className="inline-flex items-center gap-1"
                            >
                              <Sparkles className="h-4 w-4" />
                              Generate practice questions
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStartTeachBack(gap)}
                              className="inline-flex items-center gap-1"
                            >
                              <Brain className="h-4 w-4" />
                              Start teach‑back coach
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleMarkAddressed(gap.id)}
                              disabled={isAddressed}
                              className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              {isAddressed ? "Addressed" : "Mark as addressed"}
                            </Button>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </div>
        </>
      )}
    </div>
  );
}