import { useState, useEffect } from "react";
import { useLocation } from "react-router";
import { useUser } from "@clerk/clerk-react";
import { SpeakingCoach } from "../components/voice/SpeakingCoach";
import type { CoachContext, CoachMode } from "../components/voice/useConversation";

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

  const coachContext: CoachContext | null = state
    ? {
        topics: state.topics ?? [],
        knowledgeGaps: state.knowledgeGaps ?? [],
        studyPlan: state.studyPlan ?? [],
      }
    : null;

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
        {(["explain", "gaps", "exam"] as const).map((m) => (
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
            {m === "explain" ? "Explain topics" : m === "gaps" ? "Teach back gaps" : "Exam style"}
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

