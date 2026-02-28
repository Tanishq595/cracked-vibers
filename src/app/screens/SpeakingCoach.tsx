import { useState, useEffect } from "react";
import { useLocation } from "react-router";
import { useUser } from "@clerk/clerk-react";
import { Info } from "lucide-react";
import { SpeakingCoach } from "../components/voice/SpeakingCoach";
import type { CoachContext, CoachMode, DebateSide } from "../components/voice/useConversation";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";

type LocationState = {
  topics?: { id: string; label: string }[];
  knowledgeGaps?: string[];
  studyPlan?: string[];
} | null;

export function SpeakingCoachScreen() {
  const { user } = useUser();
  const location = useLocation();
  const state = (location.state ?? null) as LocationState;

  const [mode, setMode] = useState<CoachMode>("explain");
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [debateMotion, setDebateMotion] = useState("");
  const [debateSide, setDebateSide] = useState<DebateSide>("for");

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
    return (state ? { ...base } : null) as CoachContext | null;
  })();

  useEffect(() => {
    if (timerSeconds === null || timerSeconds <= 0) return;
    const t = setInterval(() => {
      setTimerSeconds((s) => (s == null ? null : Math.max(0, s - 1)));
    }, 1000);
    return () => clearInterval(t);
  }, [timerSeconds]);

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Speaking coach</h1>
        <p className="text-sm text-muted-foreground">
          Practice explaining what you&apos;ve learned out loud. The voice coach
          responds, prompts you with follow-up questions, and helps you build
          fluency.
        </p>
      </div>

      {coachContext?.topics && coachContext.topics.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground">Topics for this session:</span>
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

      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm text-muted-foreground">Mode:</span>
        <Popover open={infoOpen} onOpenChange={setInfoOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={() => setInfoOpen((o) => !o)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
              aria-label="What do these modes mean?"
              title="What do these modes mean?"
            >
              <Info className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 sm:w-96 text-left" align="start">
            <p className="font-medium mb-2">What each mode does</p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">Explain topics</span> — The coach explains concepts and answers your questions. Best for learning new material before you speak about it.
              </li>
              <li>
                <span className="font-medium text-foreground">Teach back gaps</span> — You explain a topic in your own words; the coach spots gaps and asks follow-ups so you strengthen weak spots.
              </li>
              <li>
                <span className="font-medium text-foreground">Exam style</span> — Timed, exam-like practice with less hand-holding. Use &quot;Start 3-min timer&quot; for a timed speaking slot.
              </li>
              <li>
                <span className="font-medium text-foreground">Debate</span> — The coach acts as a moderator: you get a motion, choose For or Against, then have prep time and a timed opening. You get argumentation feedback at the end.
              </li>
            </ul>
          </PopoverContent>
        </Popover>
        {(["explain", "gaps", "exam", "debate"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              mode === m
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {m === "explain" ? "Explain topics" : m === "gaps" ? "Teach back gaps" : m === "exam" ? "Exam style" : "Debate"}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setTimerSeconds(3 * 60)}
          className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
        >
          {timerSeconds != null && timerSeconds > 0
            ? `Timer: ${Math.floor(timerSeconds / 60)}:${String(timerSeconds % 60).padStart(2, "0")}`
            : "Start 3‑min timer"}
        </button>
      </div>

      {mode === "debate" && (
        <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
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
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              For
            </button>
            <button
              type="button"
              onClick={() => setDebateSide("against")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                debateSide === "against"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
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

      <p className="text-xs text-muted-foreground text-center">
        Tip: use this after generating a synthesis to orally explain the main
        topics and fill your knowledge gaps.
      </p>
    </div>
  );
}

