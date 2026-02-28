import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import ReactMarkdown from "react-markdown";
import { useLocation, useNavigate } from "react-router";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { FileText, Loader2 } from "lucide-react";

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
  const location = useLocation() as {
    state?: { materialsFromLibrary?: string } | null;
  };
  const navigate = useNavigate();

  type LibraryItem = {
    key: string;
    size: number;
    lastModified: string | null;
  };

  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [librarySelectedKeys, setLibrarySelectedKeys] = useState<string[]>([]);
  const [libraryAdding, setLibraryAdding] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    void loadHistory(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    const fromLibrary = location.state?.materialsFromLibrary;
    if (fromLibrary && !materials.trim()) {
      setMaterials(fromLibrary);
    }
    // We deliberately don't clear location.state here; react-router v7 keeps it per navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

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

  async function loadLibrary() {
    if (!user?.id) {
      setLibraryError("Sign in to access your library.");
      return;
    }
    setLibraryError(null);
    setLibraryLoading(true);
    try {
      const prefix = `uploads/${user.id}`;
      const res = await fetch("/api/storage-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefix }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load files");

      const items: LibraryItem[] = Array.isArray(data.items) ? data.items : [];
      items.sort((a, b) => {
        const da = a.lastModified ? Date.parse(a.lastModified) : 0;
        const db = b.lastModified ? Date.parse(b.lastModified) : 0;
        return db - da;
      });
      setLibraryItems(items);
      setLibrarySelectedKeys((prev) =>
        prev.filter((k) => items.some((it) => it.key === k))
      );
    } catch (e) {
      setLibraryError(
        e instanceof Error ? e.message : "Failed to load library files"
      );
    } finally {
      setLibraryLoading(false);
    }
  }

  function toggleLibrarySelected(key: string) {
    setLibrarySelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function importFromLibrary() {
    if (!librarySelectedKeys.length) return;
    setLibraryAdding(true);
    try {
      const selected = libraryItems.filter((it) =>
        librarySelectedKeys.includes(it.key)
      );
      const parts: string[] = [];
      for (const item of selected) {
        const name = item.key.split("/").pop() || item.key;
        const res = await fetch("/api/storage-download-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ objectKey: item.key }),
        });
        const data = await res.json();
        if (!res.ok || !data.url) continue;
        const fileRes = await fetch(data.url as string);
        const text = await fileRes.text();
        if (text && text.trim().length > 0) {
          parts.push(`# Source: ${name}\n\n${text}`);
        }
      }
      const combined = parts.join("\n\n---\n\n");
      if (!combined.trim()) {
        setLibraryError("Could not read selected files as text.");
        return;
      }
      setMaterials((prev) =>
        prev.trim().length ? `${prev.trim()}\n\n---\n\n${combined}` : combined
      );
    } catch (e) {
      setLibraryError(
        e instanceof Error ? e.message : "Failed to import from library"
      );
    } finally {
      setLibraryAdding(false);
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
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Learning materials</CardTitle>
              <CardDescription>
                Combined text from Classroom, Notion, YouTube, or manual paste
              </CardDescription>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <button
                  type="button"
                  onClick={() => void loadLibrary()}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:border-[#ffb347] hover:bg-[#ffb347]/5"
                >
                  <FileText className="w-4 h-4" />
                  Import from Library
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Select files to import</DialogTitle>
                </DialogHeader>
                <div className="mt-2 space-y-3">
                  {libraryError && (
                    <p className="text-xs text-red-600">{libraryError}</p>
                  )}
                  {libraryLoading && (
                    <p className="flex items-center gap-2 text-xs text-zinc-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading files…
                    </p>
                  )}
                  {!libraryLoading && libraryItems.length === 0 && !libraryError && (
                    <p className="text-xs text-zinc-500">
                      No files in your library yet. Upload from the Library page
                      first.
                    </p>
                  )}
                  {!libraryLoading && libraryItems.length > 0 && (
                    <ul className="max-h-64 space-y-2 overflow-auto text-sm">
                      {libraryItems.map((item) => {
                        const name = item.key.split("/").pop() || item.key;
                        const last =
                          item.lastModified &&
                          !Number.isNaN(Date.parse(item.lastModified))
                            ? new Date(item.lastModified).toLocaleString()
                            : "Unknown";
                        return (
                          <li
                            key={item.key}
                            className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 hover:border-[#ffb347] hover:bg-[#ffb347]/5 dark:border-slate-700"
                          >
                            <input
                              type="checkbox"
                              checked={librarySelectedKeys.includes(item.key)}
                              onChange={() => toggleLibrarySelected(item.key)}
                              className="h-4 w-4 rounded border-slate-300 text-[#ffb347] focus:ring-[#ffb347]"
                            />
                            <FileText className="w-4 h-4 text-slate-500" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-foreground">
                                {name}
                              </p>
                              <p className="truncate text-[11px] text-zinc-500">
                                {last}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      onClick={importFromLibrary}
                      disabled={
                        !librarySelectedKeys.length || libraryAdding || libraryLoading
                      }
                    >
                      {libraryAdding ? "Adding…" : "Add selected to editor"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
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

          {topics.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  const baseMd = stripKnowledgeGraphSection(synthesis.markdown);
                  const gaps = sectionLines(extractSection(baseMd, "Knowledge Gaps"));
                  const plan = sectionLines(extractSection(baseMd, "Study Plan"));
                  navigate("/dashboard/coach", {
                    state: { topics, knowledgeGaps: gaps, studyPlan: plan },
                  });
                }}
              >
                Practice with Speaking Coach
              </Button>
            </div>
          )}

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
