import { useState, useEffect } from "react";
import { useLocation } from "react-router";
import { useUser } from "@clerk/clerk-react";
import { Info } from "lucide-react";
import { SpeakingCoach } from "../components/voice/SpeakingCoach";
import type { CoachContext, CoachMode, DebateSide, ExamType } from "../components/voice/useConversation";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";

type LocationState = {
  topics?: { id: string; label: string }[];
  knowledgeGaps?: string[];
  studyPlan?: string[];
  mode?: CoachMode;
} | null;

export function SpeakingCoachScreen() {
  const { user } = useUser();
  const location = useLocation();
  const state = (location.state ?? null) as LocationState;

  const initialMode: CoachMode = state?.mode ?? "explain";
  const [mode, setMode] = useState<CoachMode>(initialMode);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [debateMotion, setDebateMotion] = useState("");
  const [debateSide, setDebateSide] = useState<DebateSide>("for");
  const [examType, setExamType] = useState<ExamType>("");

  const coachContext: CoachContext | null = (() => {
    const base = state
      ? {
          topics: state.topics ?? [],
          knowledgeGaps: state.knowledgeGaps ?? [],
          studyPlan: state.studyPlan ?? [],
        }
      : {};
    if (mode === "debate") {
      return {
        ...base,
        debateMotion: debateMotion.trim() || undefined,
        debateSide,
      } as CoachContext;
    }
    if (mode === "exam") {
      return { ...base, examType: examType || undefined } as CoachContext;
    }
    return (state ? { ...base } : null) as CoachContext | null;
  })();

  useEffect(() => {
    if (!timerRunning || timerSeconds === null || timerSeconds <= 0) return;
    const t = setInterval(() => {
      setTimerSeconds((s) => (s == null ? null : Math.max(0, s - 1)));
    }, 1000);
    return () => clearInterval(t);
  }, [timerRunning, timerSeconds]);

  useEffect(() => {
    if (timerSeconds === 0) {
      setTimerRunning(false);
    }
  }, [timerSeconds]);

  return (
    <div className="min-h-[calc(100vh-64px)] min-w-0 overflow-x-hidden bg-gradient-to-b from-background via-background to-muted/40">
      <div className="mx-auto max-w-7xl space-y-6 py-10 px-4 sm:px-6 lg:px-8 min-w-0">
        <div className="space-y-2">
          <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-foreground">
            <span aria-hidden="true">💬</span>
            <span>Speaking coach</span>
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Practice explaining what you&apos;ve learned out loud—like a class
            presentation or oral exam. The coach listens, responds, and helps you
            build confident fluency.
          </p>
        </div>

        {coachContext?.topics && coachContext.topics.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Topics for this session:
            </span>
            {coachContext.topics.map((t) => (
              <span
                key={t.id}
                className="rounded-full border border-[#ffb347]/40 bg-[#ffb347]/10 px-3 py-1 text-xs font-medium text-[#b4690e]"
              >
                {t.label}
              </span>
            ))}
          </div>
        )}

        <div className="min-w-0 overflow-hidden rounded-3xl border border-border/60 bg-card/90 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
          <div className="flex flex-wrap items-stretch gap-4 border-b border-border/60 bg-muted/40 px-3 py-3 sm:gap-6 sm:px-6">
            {/* MODE column */}
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2 basis-full sm:basis-auto sm:min-w-[140px]">
              <div className="flex items-center gap-2 text-center">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Mode
                </span>

                <Popover open={infoOpen} onOpenChange={setInfoOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setInfoOpen((o) => !o)}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-muted-foreground/30 bg-background/70 text-muted-foreground hover:border-muted-foreground/60 hover:text-foreground"
                      aria-label="What do these modes mean?"
                      title="What do these modes mean?"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 text-left sm:w-96" align="start">
                    <p className="mb-2 font-medium">What each mode does</p>
                    <ul className="space-y-3 text-sm text-muted-foreground">
                      <li>
                        <span className="font-medium text-foreground">Explain topics</span> — The
                        coach explains concepts and answers your questions. Best for learning
                        new material before you speak about it.
                      </li>
                      <li>
                        <span className="font-medium text-foreground">Teach back gaps</span> — You
                        explain a topic in your own words; the coach spots gaps and asks
                        follow-ups so you strengthen weak spots.
                      </li>
                      <li>
                        <span className="font-medium text-foreground">Exam style</span> — Coach
                        scopes to one exam only: HKDSE, IELTS, TOEFL, or ISO. Choose the exam or
                        leave Auto to detect from your words. The AI will not answer beyond that
                        exam&apos;s scope. Use the timer for timed practice.
                      </li>
                      <li>
                        <span className="font-medium text-foreground">Debate</span> — The coach acts
                        as a moderator: you get a motion, choose For or Against, then have prep
                        time and a timed opening. You get argumentation feedback at the end.
                      </li>
                    </ul>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="w-full min-w-0">
                <div className="flex flex-wrap items-center justify-center gap-1 rounded-full bg-background/80 p-1 shadow-sm">
                  {(["explain", "gaps", "exam", "debate"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
                        mode === m
                          ? "bg-gradient-to-r from-[#ffb347] to-[#ff8c42] text-white shadow-sm"
                          : "text-muted-foreground hover:bg-[#ffb347]/10 hover:text-[#b4690e]"
                      }`}
                    >
                      {m === "explain"
                        ? "Explain topics"
                        : m === "gaps"
                        ? "Teach back gaps"
                        : m === "exam"
                        ? "Exam style"
                        : "Debate"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* EXAM TYPE (only when Exam style is selected) */}
            {mode === "exam" && (
              <div className="flex min-w-0 flex-1 flex-col items-center gap-2 basis-full sm:basis-auto sm:min-w-[140px]">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground text-center">
                  Exam
                </span>
                <div className="flex flex-wrap items-center justify-center gap-1 rounded-full bg-background/80 p-1 shadow-sm">
                  {(["", "HKDSE", "IELTS", "TOEFL", "ISO"] as const).map((e) => (
                    <button
                      key={e || "auto"}
                      type="button"
                      onClick={() => setExamType(e)}
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                        examType === e
                          ? "bg-gradient-to-r from-[#ffb347] to-[#ff8c42] text-white shadow-sm"
                          : "text-muted-foreground hover:bg-[#ffb347]/10 hover:text-[#b4690e]"
                      }`}
                    >
                      {e === "" ? "Auto" : e}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TIMER column */}
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2 basis-full sm:basis-auto sm:min-w-[140px]">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground text-center">
                Timer
              </span>

              <div className="w-full min-w-0">
                <div className="flex flex-wrap items-center justify-center gap-1 rounded-full bg-background/80 p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setTimerSeconds(3 * 60);
                      setTimerRunning(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-4 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted sm:text-sm"
                  >
                    <span className="text-[13px] sm:text-sm">⏱</span>
                    {timerSeconds != null && timerSeconds > 0
                      ? `Timer: ${Math.floor(timerSeconds / 60)}:${String(
                          timerSeconds % 60,
                        ).padStart(2, "0")}`
                      : "Start 3‑min timer"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTimerRunning((running) => !running)}
                    disabled={timerSeconds == null || timerSeconds <= 0}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:px-4 sm:text-sm disabled:cursor-not-allowed disabled:opacity-40 ${
                      timerRunning
                        ? "border border-[#c97f7f]/80 bg-[#c97f7f] text-white hover:bg-[#c97f7f]/90"
                        : "border border-[#CCFFCC]/80 bg-[#CCFFCC] text-[#174117] hover:bg-[#CCFFCC]/90"
                    }`}
                  >
                    <span className="text-[11px] sm:text-xs">
                      {timerRunning ? "■" : "▶"}
                    </span>
                    {timerRunning ? "Stop" : "Continue"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTimerSeconds(null);
                      setTimerRunning(false);
                    }}
                    disabled={timerSeconds == null || timerSeconds <= 0}
                    className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:text-sm"
                  >
                    ⟲ Reset
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 px-4 py-6 sm:px-6 sm:py-8">
            {mode === "debate" && (
              <div className="space-y-3 rounded-2xl border border-border bg-muted/40 p-4">
                <label className="block text-sm font-medium text-foreground">
                  Motion (topic to argue)
                </label>
                <input
                  type="text"
                  value={debateMotion}
                  onChange={(e) => setDebateMotion(e.target.value)}
                  placeholder="e.g. This house believes that practice makes perfect."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-muted-foreground">Your side:</span>
                  <button
                    type="button"
                    onClick={() => setDebateSide("for")}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      debateSide === "for"
                        ? "bg-gradient-to-r from-[#ffb347] to-[#ff8c42] text-white shadow-sm"
                        : "bg-muted text-[#b4690e] hover:bg-[#ffb347]/10"
                    }`}
                  >
                    For
                  </button>
                  <button
                    type="button"
                    onClick={() => setDebateSide("against")}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      debateSide === "against"
                        ? "bg-gradient-to-r from-[#ffb347] to-[#ff8c42] text-white shadow-sm"
                        : "bg-muted text-[#b4690e] hover:bg-[#ffb347]/10"
                    }`}
                  >
                    Against
                  </button>
                </div>
              </div>
            )}

            <SpeakingCoach
              coachContext={coachContext ?? undefined}
              coachMode={mode}
              userId={user?.id ?? undefined}
            />

            <p className="text-center text-xs text-muted-foreground">
              Tip: use this after generating a synthesis to practice explaining the main
              topics out loud and fill your knowledge gaps.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

