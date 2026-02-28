import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useUser } from "@clerk/clerk-react";
import { ArrowRight, Mic, TrendingUp } from "lucide-react";

type AssessmentListItem = {
  session: {
    id: string;
    topic?: string | null;
    started_at?: string | null;
    ended_at?: string | null;
    total_duration_sec?: number | null;
    status?: string;
    created_at?: string;
  };
  assessment?: {
    id: string;
    session_id: string;
    overall_score?: number | null;
    fluency_score?: number | null;
    pronunciation_score?: number | null;
    grammar_score?: number | null;
    vocabulary_score?: number | null;
    coherence_score?: number | null;
    summary?: string | null;
  } | null;
};

export function SpeakingAssessmentHistory() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [items, setItems] = useState<AssessmentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const clerkUserId = user?.id;
    if (!clerkUserId) return;

    setLoading(true);
    setError(null);

    const controller = new AbortController();

    (async () => {
      try {
        const params = new URLSearchParams({
          userId: clerkUserId,
          limit: "30",
        });
        const res = await fetch(`/api/speaking-assessments-list?${params.toString()}`, {
          method: "GET",
          signal: controller.signal,
        });
        const data = (await res.json()) as { items?: AssessmentListItem[]; error?: string };

        if (!res.ok) {
          throw new Error(data.error || `Request failed with status ${res.status}`);
        }

        setItems(Array.isArray(data.items) ? data.items : []);
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : "Failed to load speaking assessments";
        setError(message);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [user?.id]);

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return "Unknown";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "Unknown";
    return d.toLocaleString();
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds || seconds <= 0) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins <= 0) return `${secs}s`;
    return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  };

  const formatScore = (score?: number | null) => {
    if (score == null) return "—";
    return `${score.toFixed(1)}`;
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-10">
        <p className="text-center text-sm text-muted-foreground">
          Please sign in to view your speaking assessment history.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            <TrendingUp className="h-6 w-6 text-[#ff8c42]" />
            <span>Speaking assessment history</span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Review your past speaking coach sessions, scores, and feedback.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/dashboard/coach")}
          className="hidden sm:inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
        >
          <Mic className="h-4 w-4" />
          Back to coach
        </button>
      </div>

      <div className="rounded-3xl border border-border/70 bg-card/90 shadow-xl shadow-slate-900/5">
        <div className="border-b border-border/60 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#ffb347]/10 text-[#ff8c42] text-xs font-semibold">
              {items.length}
            </span>
            <span>Sessions</span>
          </div>
          {loading && (
            <span className="text-xs text-muted-foreground">Loading…</span>
          )}
        </div>

        <div className="px-3 py-3 sm:px-4 sm:py-4">
          {error && (
            <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <p className="mb-2">No speaking sessions saved yet.</p>
              <button
                type="button"
                onClick={() => navigate("/dashboard/coach")}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ffb347] to-[#ff8c42] px-4 py-2 text-xs font-semibold text-white shadow-md hover:brightness-105"
              >
                <Mic className="h-4 w-4" />
                Start a speaking session
              </button>
            </div>
          )}

          {items.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/40">
              <div className="hidden md:grid grid-cols-6 gap-2 border-b border-border/60 bg-muted/60 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                <div className="col-span-2">Session</div>
                <div>Duration</div>
                <div>Overall</div>
                <div>Fluency / Pron.</div>
                <div></div>
              </div>

              <ul className="divide-y divide-border/60">
                {items.map(({ session, assessment }) => {
                  const overall = assessment?.overall_score ?? null;
                  const fluency = assessment?.fluency_score ?? null;
                  const pron = assessment?.pronunciation_score ?? null;
                  const started = formatDateTime(session.started_at ?? session.created_at);
                  const duration = formatDuration(
                    typeof session.total_duration_sec === "number"
                      ? session.total_duration_sec
                      : null,
                  );
                  const topicLabel =
                    (session.topic ?? "").trim() ||
                    (assessment?.summary
                      ? "Speaking practice session"
                      : "Session");

                  const scoreBadgeClass =
                    overall == null
                      ? "bg-slate-200 text-slate-700"
                      : overall >= 85
                        ? "bg-emerald-100 text-emerald-800"
                        : overall >= 70
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800";

                  return (
                    <li
                      key={session.id}
                      className="group cursor-pointer bg-card/40 hover:bg-card/80 transition-colors"
                      onClick={() =>
                        navigate(`/dashboard/speaking-assessments/${session.id}`)
                      }
                    >
                      <div className="hidden md:grid grid-cols-6 gap-2 px-4 py-3 text-sm">
                        <div className="col-span-2 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium text-foreground">
                              {topicLabel}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {started}
                          </p>
                        </div>
                        <div className="flex items-center text-sm text-foreground">
                          {duration}
                        </div>
                        <div className="flex items-center">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${scoreBadgeClass}`}
                          >
                            {overall == null ? "No score" : `${formatScore(overall)}/100`}
                          </span>
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground">
                          {fluency != null || pron != null
                            ? `${formatScore(fluency)} / ${formatScore(pron)}`
                            : "—"}
                        </div>
                        <div className="flex items-center justify-end">
                          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>
                      </div>

                      {/* Mobile / small-screen layout */}
                      <div className="md:hidden px-4 py-3 space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {topicLabel}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {started}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${scoreBadgeClass}`}
                            >
                              {overall == null ? "No score" : `${formatScore(overall)}/100`}
                            </span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Duration: {duration}</span>
                          {fluency != null || pron != null ? (
                            <span>
                              Fluency / Pron.: {formatScore(fluency)} /{" "}
                              {formatScore(pron)}
                            </span>
                          ) : (
                            <span>No detailed scores</span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

