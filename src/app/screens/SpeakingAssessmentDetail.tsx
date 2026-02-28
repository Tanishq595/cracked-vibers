import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useUser } from "@clerk/clerk-react";
import { ArrowLeft, Mic, Star, User as UserIcon, Bot } from "lucide-react";

type SessionDetail = {
  id: string;
  topic?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  total_duration_sec?: number | null;
  stt_provider?: string | null;
  transcript_language?: string | null;
  full_transcript?: string | null;
  status?: string | null;
};

type AssessmentDetail = {
  id: string;
  session_id: string;
  model_name?: string | null;
  overall_score?: number | null;
  fluency_score?: number | null;
  pronunciation_score?: number | null;
  grammar_score?: number | null;
  vocabulary_score?: number | null;
  coherence_score?: number | null;
  summary?: string | null;
  strengths?: string | null;
  suggestions?: string | null;
};

type TurnDetail = {
  id: string;
  session_id: string;
  sequence_number: number;
  speaker: "user" | "coach" | "system";
  text: string;
};

export function SpeakingAssessmentDetail() {
  const { user } = useUser();
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [assessment, setAssessment] = useState<AssessmentDetail | null>(null);
  const [turns, setTurns] = useState<TurnDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const clerkUserId = user?.id;
    if (!clerkUserId || !sessionId) return;

    setLoading(true);
    setError(null);

    const controller = new AbortController();

    (async () => {
      try {
        const params = new URLSearchParams({
          userId: clerkUserId,
          sessionId,
        });
        const res = await fetch(`/api/speaking-assessment-detail?${params.toString()}`, {
          method: "GET",
          signal: controller.signal,
        });
        const data = (await res.json()) as {
          session?: SessionDetail;
          assessment?: AssessmentDetail | null;
          turns?: TurnDetail[];
          error?: string;
        };

        if (!res.ok) {
          throw new Error(data.error || `Request failed with status ${res.status}`);
        }

        setSession(data.session ?? null);
        setAssessment(data.assessment ?? null);
        setTurns(Array.isArray(data.turns) ? data.turns : []);
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : "Failed to load assessment detail";
        setError(message);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [sessionId, user?.id]);

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

  const parseList = (value?: string | null): string[] => {
    if (!value) return [];
    return value
      .split(/\r?\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-10">
        <p className="text-center text-sm text-muted-foreground">
          Please sign in to view this speaking assessment.
        </p>
      </div>
    );
  }

  const topicLabel =
    (session?.topic ?? "").trim() ||
    (assessment?.summary ? "Speaking practice session" : "Session");

  const overall = assessment?.overall_score ?? null;
  const fluency = assessment?.fluency_score ?? null;
  const pron = assessment?.pronunciation_score ?? null;
  const grammar = assessment?.grammar_score ?? null;
  const vocab = assessment?.vocabulary_score ?? null;
  const coherence = assessment?.coherence_score ?? null;

  const scoreBadgeClass =
    overall == null
      ? "bg-slate-200 text-slate-700"
      : overall >= 85
        ? "bg-emerald-100 text-emerald-800"
        : overall >= 70
          ? "bg-amber-100 text-amber-800"
          : "bg-red-100 text-red-800";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/dashboard/coach")}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to coach
        </button>
        <button
          type="button"
          onClick={() => navigate("/dashboard/coach")}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
        >
          <Mic className="h-4 w-4" />
          New session
        </button>
      </div>

      <div className="space-y-2">
        <h1 className="flex items-center gap-2 text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          <Star className="h-6 w-6 text-[#ff8c42]" />
          <span>Speaking assessment</span>
        </h1>
        <p className="text-sm text-muted-foreground max-w-xl">
          Detailed feedback for one speaking coach session, including scores and the full
          transcript.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr),minmax(0,3fr)]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-border/70 bg-card/90 shadow-md shadow-slate-900/10 p-4 sm:p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-1">
                  Session
                </p>
                <h2 className="text-lg font-semibold text-foreground leading-snug">
                  {topicLabel}
                </h2>
                {session && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(session.started_at)} ·{" "}
                    Duration: {formatDuration(session.total_duration_sec ?? null)}
                  </p>
                )}
              </div>
              {overall != null && (
                <div className="text-right">
                  <span
                    className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${scoreBadgeClass}`}
                  >
                    Overall {overall.toFixed(1)}/100
                  </span>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {assessment?.model_name ?? "MiniMax M2.5"}
                  </p>
                </div>
              )}
            </div>

            {assessment?.summary && (
              <div className="mt-2 rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                {assessment.summary}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mt-2 text-xs sm:text-sm">
              <div className="rounded-2xl bg-muted/60 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                  Fluency
                </p>
                <p className="font-semibold text-foreground">
                  {fluency != null ? `${fluency.toFixed(1)}/100` : "—"}
                </p>
              </div>
              <div className="rounded-2xl bg-muted/60 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                  Pronunciation
                </p>
                <p className="font-semibold text-foreground">
                  {pron != null ? `${pron.toFixed(1)}/100` : "—"}
                </p>
              </div>
              <div className="rounded-2xl bg-muted/60 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                  Grammar
                </p>
                <p className="font-semibold text-foreground">
                  {grammar != null ? `${grammar.toFixed(1)}/100` : "—"}
                </p>
              </div>
              <div className="rounded-2xl bg-muted/60 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                  Vocabulary
                </p>
                <p className="font-semibold text-foreground">
                  {vocab != null ? `${vocab.toFixed(1)}/100` : "—"}
                </p>
              </div>
              <div className="rounded-2xl bg-muted/60 px-3 py-2 col-span-2">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                  Coherence
                </p>
                <p className="font-semibold text-foreground">
                  {coherence != null ? `${coherence.toFixed(1)}/100` : "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border/70 bg-card/90 shadow-md shadow-slate-900/10 p-4 sm:p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Star className="h-4 w-4 text-[#ff8c42]" />
              Strengths & suggestions
            </h3>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-emerald-50/80 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700 mb-1">
                  Strengths
                </p>
                {parseList(assessment?.strengths).length === 0 ? (
                  <p className="text-xs text-emerald-900/80">
                    No strengths listed. Future assessments will highlight what you did well.
                  </p>
                ) : (
                  <ul className="list-disc list-inside space-y-1 text-xs text-emerald-900">
                    {parseList(assessment?.strengths).map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-2xl bg-amber-50/90 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.18em] text-amber-800 mb-1">
                  Suggestions
                </p>
                {parseList(assessment?.suggestions).length === 0 ? (
                  <p className="text-xs text-amber-900/80">
                    No suggestions listed. Next time, the coach will give more concrete next steps.
                  </p>
                ) : (
                  <ul className="list-disc list-inside space-y-1 text-xs text-amber-900">
                    {parseList(assessment?.suggestions).map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-border/70 bg-card/90 shadow-md shadow-slate-900/10 p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">
              Full transcript
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {turns.length} turns
            </p>
          </div>

          {loading && (
            <p className="text-xs text-muted-foreground">Loading transcript…</p>
          )}

          {!loading && turns.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No detailed turn data saved for this session. Future sessions will store the
              full transcript.
            </p>
          )}

          {turns.length > 0 && (
            <div className="max-h-[520px] overflow-y-auto space-y-2 pr-1">
              {turns.map((turn) => {
                const isUser = turn.speaker === "user";
                const isCoach = turn.speaker === "coach";
                return (
                  <div
                    key={turn.id}
                    className={`rounded-xl px-3 py-2 text-xs sm:text-sm ${
                      isUser
                        ? "bg-slate-100 dark:bg-slate-800"
                        : isCoach
                          ? "bg-emerald-50 dark:bg-emerald-900/20"
                          : "bg-muted/60"
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {isUser ? (
                        <>
                          <UserIcon className="h-3 w-3" />
                          <span>You</span>
                        </>
                      ) : isCoach ? (
                        <>
                          <Bot className="h-3 w-3" />
                          <span>Coach</span>
                        </>
                      ) : (
                        <span>System</span>
                      )}
                    </div>
                    <p className="text-foreground whitespace-pre-wrap">{turn.text}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

