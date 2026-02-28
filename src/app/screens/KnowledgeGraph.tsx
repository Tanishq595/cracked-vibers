import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { useUser } from "@clerk/clerk-react";
import { KnowledgeGraph as KnowledgeGraphComponent } from "../components/KnowledgeGraph";
import { AIChatAssistant } from "../components/AIChatAssistant";

type GraphData = {
  nodes: Array<{ id: string; label: string }>;
  edges: Array<{ from: string; to: string; type?: string }>;
};

export function KnowledgeGraph() {
  const { user } = useUser();
  const userId = user?.id ?? null;
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const backfillTriggered = useRef(false);

  useEffect(() => {
    if (!userId) {
      setGraphData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchGraph = () =>
      fetch("/api/knowledge-graph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
        .then((r) => r.json())
        .then((d) => ({
          nodes: Array.isArray(d?.nodes) ? d.nodes : [],
          edges: Array.isArray(d?.edges) ? d.edges : [],
        }));

    fetchGraph()
      .then((payload) => {
        if (cancelled) return;
        setGraphData(payload);
        if (payload.nodes.length > 0) {
          setLoading(false);
          return;
        }
        if (backfillTriggered.current) {
          setLoading(false);
          return;
        }
        backfillTriggered.current = true;
        setLoading(true);
        fetch("/api/knowledge-graph-backfill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        })
          .then((r) => r.json())
          .then((backfill) => {
            if (cancelled) return;
            if (backfill?.ok && backfill?.merged > 0) {
              return fetchGraph().then((p) => {
                if (!cancelled) setGraphData(p);
              });
            }
          })
          .catch(() => {})
          .finally(() => {
            if (!cancelled) setLoading(false);
          });
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to load graph");
          setGraphData(null);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [userId]);

  return (
    <>
      <AIChatAssistant />
      <div className="max-w-[1400px] mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-4xl font-bold mb-2 text-slate-900 dark:text-foreground">Knowledge Graph</h1>
            <p className="text-slate-600 dark:text-muted-foreground font-medium">
              Topics and connections from your syntheses. Drag nodes to explore.
            </p>
          </div>
        </motion.div>

        {loading && (
          <div className="rounded-2xl border-2 border-slate-200 dark:border-border p-12 text-center text-muted-foreground">
            Loading graph…
          </div>
        )}

        {error && (
          <div className="rounded-2xl border-2 border-red-200 dark:border-red-900/50 p-12 text-center text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && graphData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl bg-card border-2 border-slate-200 dark:border-border p-6 overflow-hidden shadow-sm"
          >
            <div className="w-full h-[600px]">
              <KnowledgeGraphComponent data={graphData} />
            </div>
          </motion.div>
        )}

        {!loading && !error && graphData && graphData.nodes.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No graph yet. Create a synthesis on the Synthesize page to build your knowledge graph.
          </p>
        )}

        {!loading && !error && graphData && graphData.nodes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 gap-4"
          >
            <div className="p-4 rounded-xl border-2 border-slate-200 dark:border-border text-center bg-card">
              <div className="text-2xl font-bold text-foreground">{graphData.nodes.length}</div>
              <div className="text-xs text-muted-foreground font-semibold">Topics</div>
            </div>
            <div className="p-4 rounded-xl border-2 border-slate-200 dark:border-border text-center bg-card">
              <div className="text-2xl font-bold text-foreground">{graphData.edges.length}</div>
              <div className="text-xs text-muted-foreground font-semibold">Connections</div>
            </div>
          </motion.div>
        )}
      </div>
    </>
  );
}
