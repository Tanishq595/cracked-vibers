import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import ReactMarkdown from "react-markdown";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { cn } from "../components/ui/utils";
import { KnowledgeGraph } from "../components/KnowledgeGraph";

const PLACEHOLDER = `Paste learning materials here (e.g. notes, transcript, textbook excerpt)...

Example:
- Photosynthesis: light → chloroplasts → glucose + O2. Requires CO2 and H2O.
- Cell division: mitosis (somatic) and meiosis (gametes). Chromosomes duplicate in S phase.
- We didn't cover the Calvin cycle in detail.`;

function extractSection(markdown: string, header: string): string {
  const re = new RegExp(
    `##\\s*${header.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`,
    "i"
  );
  const match = markdown.match(re);
  return match ? match[1].trim() : "";
}

function extractStudyPlanSection(markdown: string): string {
  return extractSection(markdown, "Study Plan");
}

function stripKnowledgeGraphSection(markdown: string): string {
  const match = markdown.match(/##\s*Knowledge Graph\s*\n[\s\S]*$/i);
  if (!match) return markdown;
  return markdown.slice(0, match.index).trimEnd();
}

function sectionLines(section: string): string[] {
  return section
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter((line) => line.length > 0);
}

export function Synthesize() {
  type Topic = { id: string; label: string };

  type Question = {
    id: string;
    topicId: string;
    prompt: string;
    type: "mcq" | "short";
    options?: string[];
    correctAnswer: string;
    explanation: string;
  };

  type AnswerRecord = {
    questionId: string;
    topicId: string;
    topicLabel: string;
    correct: boolean;
  };

  const { user } = useUser();
  const [materials, setMaterials] = useState("");
  const [synthesis, setSynthesis] = useState<{
    markdown: string;
    knowledgeGraph: Record<string, unknown> | null;
  } | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [synthLoading, setSynthLoading] = useState(false);
  const [narrateLoading, setNarrateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practiceError, setPracticeError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [history, setHistory] = useState<
    { id: string; title: string; createdAt: string | null; topicLabels: string[] }[]
  >([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    void loadHistory(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function handleSynthesize() {
    setError(null);
    setSynthesis(null);
    setTopics([]);
    setAudioUrl(null);
    setQuestions(null);
    setAnswers([]);
    setCurrentIndex(0);
    setCurrentAnswer("");
    setPracticeError(null);
    setSessionComplete(false);
    setSynthLoading(true);
    try {
      const res = await fetch("/api/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materials,
          userId: user?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Synthesis failed");
      setSynthesis({
        markdown: data.markdown ?? "",
        knowledgeGraph: data.knowledgeGraph ?? null,
      });
      setTopics(Array.isArray(data.topics) ? data.topics : []);

      const studyPlanText = extractStudyPlanSection(data.markdown ?? "");
      if (studyPlanText) {
        setNarrateLoading(true);
        try {
          const narrateRes = await fetch("/api/narrate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: studyPlanText.slice(0, 5000) }),
          });
          const narrateData = await narrateRes.json();
          if (narrateRes.ok && narrateData.audioUrl) setAudioUrl(narrateData.audioUrl);
        } catch {
          // Non-blocking: show synthesis even if narration fails
        } finally {
          setNarrateLoading(false);
        }
      }
      if (user?.id) {
        void loadHistory(user.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSynthLoading(false);
    }
  }

  async function loadHistory(userId: string) {
    setHistoryError(null);
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/syntheses-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load history");
      setHistory(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setHistoryError(e instanceof Error ? e.message : "Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function loadSynthesisById(synthesisId: string) {
    if (!user?.id) return;
    setError(null);
    setSynthLoading(true);
    try {
      const res = await fetch("/api/synthesis-get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, synthesisId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load synthesis");

      setMaterials(typeof data.materials === "string" ? data.materials : "");
      setSynthesis({
        markdown: data.markdown ?? "",
        knowledgeGraph: (data.knowledgeGraph ?? null) as Record<string, unknown> | null,
      });
      setTopics(Array.isArray(data.topics) ? data.topics : []);
      setQuestions(null);
      setAnswers([]);
      setCurrentIndex(0);
      setCurrentAnswer("");
      setPracticeError(null);
      setSessionComplete(false);
      setAudioUrl(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load synthesis");
    } finally {
      setSynthLoading(false);
    }
  }

  async function startPractice() {
    if (!synthesis || !topics.length) return;
    setPracticeError(null);
    setPracticeLoading(true);
    setQuestions(null);
    setAnswers([]);
    setCurrentIndex(0);
    setCurrentAnswer("");
    setSessionComplete(false);

    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topics: topics,
          count: 3,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate questions");
      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error("No questions generated");
      }
      setQuestions(data.questions);
      setCurrentIndex(0);
      setCurrentAnswer("");
    } catch (e) {
      setPracticeError(e instanceof Error ? e.message : "Failed to start practice");
    } finally {
      setPracticeLoading(false);
    }
  }

  function handleSubmitAnswer() {
    if (!questions || !questions[currentIndex]) return;
    const q = questions[currentIndex];
    const normalizedUser = currentAnswer.trim().toLowerCase();
    const normalizedCorrect = q.correctAnswer.trim().toLowerCase();
    const isCorrect =
      normalizedUser.length > 0 &&
      (normalizedUser === normalizedCorrect ||
        normalizedCorrect.includes(normalizedUser) ||
        normalizedUser.includes(normalizedCorrect));

    const topicLabel =
      topics.find((t) => t.id === q.topicId)?.label ?? q.topicId;

    const record: AnswerRecord = {
      questionId: q.id,
      topicId: q.topicId,
      topicLabel,
      correct: isCorrect,
    };

    setAnswers((prev) => [...prev, record]);

    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      setSessionComplete(true);
      void finalizeSession([...answers, record]);
    } else {
      setCurrentIndex(nextIndex);
      setCurrentAnswer("");
    }
  }

  async function finalizeSession(allAnswers: AnswerRecord[]) {
    if (!user?.id || !allAnswers.length) return;
    try {
      await fetch("/api/mastery-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          results: allAnswers.map((a) => ({
            topicId: a.topicId,
            topicLabel: a.topicLabel,
            correct: a.correct,
          })),
        }),
      });
    } catch {
      // Non-blocking: mastery is a nice-to-have for demo
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          M.U.S.T.Learn
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Paste materials → get unified synthesis, gap analysis, and a study plan. Listen to the plan.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Learning materials</CardTitle>
          <CardDescription>
            Combined text from Classroom, Notion, YouTube, or manual paste
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder={PLACEHOLDER}
            value={materials}
            onChange={(e) => setMaterials(e.target.value)}
            className="min-h-[180px] resize-y font-mono text-sm"
            disabled={synthLoading}
          />
          <Button
            onClick={handleSynthesize}
            disabled={synthLoading || !materials.trim()}
            className="w-full sm:w-auto"
          >
            {synthLoading ? (
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                  )}
                />
                Synthesizing…
              </span>
            ) : (
              "Synthesize Learning Materials"
            )}
          </Button>
        </CardContent>
      </Card>

      {user?.id && (
        <Card>
          <CardHeader>
            <CardTitle>Previous syntheses</CardTitle>
            <CardDescription>
              Your recent analyses, saved so you can revisit topics and plans.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {historyError && (
              <p className="text-xs text-red-600">{historyError}</p>
            )}
            {historyLoading && (
              <p className="text-xs text-zinc-500">Loading history…</p>
            )}
            {!historyLoading && history.length === 0 && !historyError && (
              <p className="text-xs text-zinc-500">
                No syntheses yet. Run your first synthesis above.
              </p>
            )}
            {!historyLoading && history.length > 0 && (
              <ul className="space-y-2 text-sm">
                {history.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => void loadSynthesisById(item.id)}
                      className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left hover:border-[#ffb347] hover:bg-[#ffb347]/5 dark:border-slate-700"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {item.title}
                        </p>
                        {item.topicLabels?.length > 0 && (
                          <p className="mt-0.5 truncate text-xs text-zinc-500">
                            {item.topicLabels.join(" • ")}
                          </p>
                        )}
                      </div>
                      {item.createdAt && (
                        <span className="ml-3 shrink-0 text-xs text-zinc-400">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200"
          role="alert"
        >
          {error}
        </div>
      )}

      {synthesis && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Synthesis &amp; study plan</CardTitle>
              <CardDescription>
                Topics, knowledge gaps, and prioritized plan (markdown)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topics.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {topics.map((topic) => (
                    <span
                      key={topic.id}
                      className="rounded-full border border-[#ffb347]/40 bg-[#ffb347]/10 px-3 py-1 text-xs font-medium text-[#b4690e]"
                    >
                      {topic.label}
                    </span>
                  ))}
                </div>
              )}
              {(() => {
                const baseMd = stripKnowledgeGraphSection(synthesis.markdown);
                const topicsMd = extractSection(baseMd, "Topics");
                const gapsMd = extractSection(baseMd, "Knowledge Gaps");
                const planMd = extractSection(baseMd, "Study Plan");
                const hasStructured = topicsMd || gapsMd || planMd;

                if (!hasStructured) {
                  return (
                    <div className="prose prose-zinc dark:prose-invert max-w-none prose-headings:font-semibold prose-p:leading-relaxed">
                      <ReactMarkdown>{baseMd}</ReactMarkdown>
                    </div>
                  );
                }

                const topicLines = sectionLines(topicsMd);
                const gapLines = sectionLines(gapsMd);
                const planLines = sectionLines(planMd);

                return (
                  <div className="grid gap-6 md:grid-cols-3">
                    {topicLines.length > 0 && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                        <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                          Topics
                        </h3>
                        <ul className="list-disc space-y-1.5 pl-4 text-sm text-slate-800 dark:text-slate-200">
                          {topicLines.map((line, idx) => (
                            <li key={idx}>{line}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {gapLines.length > 0 && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-700 dark:bg-amber-900/20">
                        <h3 className="mb-2 text-sm font-semibold text-amber-900 dark:text-amber-100">
                          Knowledge gaps
                        </h3>
                        <ul className="list-disc space-y-1.5 pl-4 text-sm text-amber-900 dark:text-amber-50">
                          {gapLines.map((line, idx) => (
                            <li key={idx}>{line}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {planLines.length > 0 && (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-700 dark:bg-emerald-900/20">
                        <h3 className="mb-2 text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                          Study plan
                        </h3>
                        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-emerald-900 dark:text-emerald-50">
                          {planLines.map((line, idx) => (
                            <li key={idx}>{line}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {synthesis.knowledgeGraph && (
            <Card>
              <CardHeader>
                <CardTitle>Knowledge graph</CardTitle>
                <CardDescription>
                  Visual map of topics and prerequisite relationships derived
                  from your materials.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <KnowledgeGraph
                  data={synthesis.knowledgeGraph as {
                    nodes?: { id: string; label: string }[];
                    edges?: { from: string; to: string; type?: string }[];
                  }}
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Practice key topics</CardTitle>
              <CardDescription>
                Short adaptive quiz based on the topics we extracted.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {practiceError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {practiceError}
                </div>
              )}
              {!questions && !practiceLoading && (
                <Button
                  onClick={startPractice}
                  disabled={practiceLoading || topics.length === 0}
                >
                  {topics.length === 0
                    ? "No topics detected"
                    : "Start 3-question session"}
                </Button>
              )}
              {practiceLoading && (
                <p className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <span
                    className={cn(
                      "size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                    )}
                  />
                  Generating questions…
                </p>
              )}
              {questions && questions[currentIndex] && (
                <div className="space-y-3">
                  <p className="text-xs text-zinc-500">
                    Question {currentIndex + 1} of {questions.length}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {questions[currentIndex].prompt}
                  </p>
                  {questions[currentIndex].type === "mcq" &&
                    Array.isArray(questions[currentIndex].options) && (
                      <div className="space-y-2">
                        {questions[currentIndex].options!.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setCurrentAnswer(opt)}
                            className={cn(
                              "w-full rounded-lg border px-3 py-2 text-left text-sm",
                              currentAnswer === opt
                                ? "border-[#ffb347] bg-[#ffb347]/10"
                                : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                            )}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  {questions[currentIndex].type === "short" && (
                    <Textarea
                      value={currentAnswer}
                      onChange={(e) => setCurrentAnswer(e.target.value)}
                      placeholder="Type your answer…"
                      className="min-h-[80px] text-sm"
                    />
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-zinc-500 max-w-sm">
                      After you answer, we&apos;ll show a short explanation and
                      update your mastery.
                    </p>
                    <Button
                      size="sm"
                      onClick={handleSubmitAnswer}
                      disabled={!currentAnswer.trim()}
                    >
                      {currentIndex + 1 === (questions?.length ?? 0)
                        ? "Finish session"
                        : "Next"}
                    </Button>
                  </div>
                  {sessionComplete && (
                    <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                      Session complete. Your mastery has been updated in the
                      background.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {(narrateLoading || audioUrl) && (
            <Card>
              <CardHeader>
                <CardTitle>Listen to study plan</CardTitle>
                <CardDescription>
                  AI narration of the study plan (MiniMax TTS)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {narrateLoading && (
                  <p className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <span
                      className={cn(
                        "size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                      )}
                    />
                    Generating audio…
                  </p>
                )}
                {audioUrl && !narrateLoading && (
                  <audio
                    controls
                    src={audioUrl}
                    className="w-full max-w-md"
                    preload="metadata"
                  >
                    Your browser does not support the audio element.
                  </audio>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
