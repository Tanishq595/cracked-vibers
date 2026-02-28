import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { cn } from "../components/ui/utils";
import { AIChatAssistant } from "../components/AIChatAssistant";
import { KnowledgeGraph } from "../components/KnowledgeGraph";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { FileText, Folder, Loader2, BookOpen, Layers, ChevronLeft, ChevronRight, Check, X, Video } from "lucide-react";

const STORAGE_KEY_PREFIX = "mustlearn_qsets_";

type Topic = { id: string; label: string };

type Question = {
  id: string;
  topicId: string;
  prompt: string;
  type: "mcq" | "short";
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty?: "easy" | "medium" | "hard";
};

type QuestionSet = {
  id: string;
  name: string;
  questions: Question[];
  topics: Topic[];
  createdAt: string;
  flashcardKnown: Record<string, boolean>;
};

function loadSavedSets(userId: string): QuestionSet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + userId);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QuestionSet[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSets(userId: string, sets: QuestionSet[]) {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + userId, JSON.stringify(sets));
  } catch {
    // ignore
  }
}

const PLACEHOLDER = `Optional: paste extra materials to combine with library files...`;
const MAX_MATERIAL_CHARS = 16000;

function stripMarkdownBold(text: string): string {
  if (!text || typeof text !== "string") return "";
  return text.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
}

function QuestionCard({
  question,
  topicLabel,
}: {
  question: Question;
  topicLabel: string;
}) {
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const isCorrect =
    submitted &&
    selectedAnswer.trim().length > 0 &&
    (selectedAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase() ||
      question.correctAnswer.trim().toLowerCase().includes(selectedAnswer.trim().toLowerCase()) ||
      selectedAnswer.trim().toLowerCase().includes(question.correctAnswer.trim().toLowerCase()));

  const options = question.type === "mcq" && Array.isArray(question.options) ? question.options : [];

  return (
    <div
      className={cn(
        "rounded-xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden",
        "bg-slate-50/80 dark:bg-slate-900/40"
      )}
    >
      <div className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-foreground flex-1">{stripMarkdownBold(question.prompt)}</p>
          <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
            {question.type === "mcq" ? "MCQ" : "Short"} · {(question.difficulty ?? "medium")} · {topicLabel}
          </span>
        </div>

        {!submitted ? (
          <>
            {question.type === "mcq" && options.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Choose one:</p>
                <ul className="space-y-2">
                  {options.map((opt) => (
                    <li key={opt}>
                      <button
                        type="button"
                        onClick={() => setSelectedAnswer(opt)}
                        className={cn(
                          "w-full rounded-lg border-2 px-4 py-3 text-left text-sm transition-colors",
                          selectedAnswer === opt
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-100"
                            : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 bg-white dark:bg-slate-800"
                        )}
                      >
                        {stripMarkdownBold(opt)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Your answer:</label>
                <textarea
                  value={selectedAnswer}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  placeholder="Type your answer…"
                  className="w-full min-h-[80px] rounded-lg border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm resize-y"
                  disabled={submitted}
                />
              </div>
            )}
            <Button
              size="sm"
              onClick={() => setSubmitted(true)}
              disabled={!selectedAnswer.trim()}
              className="mt-2"
            >
              Submit answer
            </Button>
          </>
        ) : (
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold text-muted-foreground">Your answer</p>
            <p
              className={cn(
                "text-sm font-medium rounded-lg px-3 py-2",
                isCorrect
                  ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200"
                  : "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200"
              )}
            >
              {selectedAnswer.trim() || "(none)"} {isCorrect ? "✓ Correct" : "✗"}
            </p>
            <p className="text-xs font-semibold text-muted-foreground">Correct answer</p>
            <p className="text-sm font-medium text-foreground rounded-lg px-3 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-100">
              {stripMarkdownBold(question.correctAnswer)}
            </p>
            <p className="text-xs font-semibold text-muted-foreground mt-2">Explanation</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{stripMarkdownBold(question.explanation)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

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

type LibraryItem = {
  key: string;
  size: number;
  lastModified: string | null;
};

const FOLDER_STORAGE_KEY = "mustlearn_library_folders_";
type LibraryFolder = { id: string; name: string };
type FolderState = { folders: LibraryFolder[]; fileToFolder: Record<string, string> };

function loadFolderState(userId: string): FolderState {
  try {
    const raw = localStorage.getItem(FOLDER_STORAGE_KEY + userId);
    if (!raw) return { folders: [], fileToFolder: {} };
    const parsed = JSON.parse(raw) as FolderState;
    return {
      folders: Array.isArray(parsed.folders) ? parsed.folders : [],
      fileToFolder:
        parsed.fileToFolder && typeof parsed.fileToFolder === "object"
          ? parsed.fileToFolder
          : {},
    };
  } catch {
    return { folders: [], fileToFolder: {} };
  }
}

export function Synthesize() {
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
  const [history, setHistory] = useState<
    { id: string; title: string; createdAt: string | null; topicLabels: string[] }[]
  >([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const location = useLocation() as {
    state?: { materialsFromLibrary?: string } | null;
  };
  const navigate = useNavigate();

  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [librarySelectedKeys, setLibrarySelectedKeys] = useState<string[]>([]);
  const [libraryAdding, setLibraryAdding] = useState(false);
  const [libraryFolders, setLibraryFolders] = useState<LibraryFolder[]>([]);
  const [libraryFileToFolder, setLibraryFileToFolder] = useState<Record<string, string>>({});
  const [libraryDialogOpen, setLibraryDialogOpen] = useState(false);
  const [pendingLibrarySelectedKeys, setPendingLibrarySelectedKeys] = useState<string[]>([]);

  const [currentSet, setCurrentSet] = useState<QuestionSet | null>(null);
  const [savedSets, setSavedSets] = useState<QuestionSet[]>([]);
  const [setName, setSetName] = useState("");
  const [questionBankFilterTopic, setQuestionBankFilterTopic] = useState<string>("all");
  const [questionBankFilterType, setQuestionBankFilterType] = useState<string>("all");
  const [questionBankFilterDifficulty, setQuestionBankFilterDifficulty] = useState<string>("all");
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);

  const [videoTaskId, setVideoTaskId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [materialsTruncated, setMaterialsTruncated] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    void loadHistory(user.id);
    setSavedSets(loadSavedSets(user.id));
    const folderState = loadFolderState(user.id);
    setLibraryFolders(folderState.folders);
    setLibraryFileToFolder(folderState.fileToFolder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    const fromLibrary = location.state?.materialsFromLibrary;
    if (fromLibrary && !materials.trim()) {
      setMaterials(fromLibrary);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const getCombinedMaterials = useCallback(async (): Promise<string> => {
    const parts: string[] = [];
    if (librarySelectedKeys.length > 0) {
      const selected = libraryItems.filter((it) => librarySelectedKeys.includes(it.key));
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
        if (text?.trim()) parts.push(`# Source: ${name}\n\n${text}`);
      }
    }
    const fromLibrary = parts.join("\n\n---\n\n");
    const extra = materials.trim();
    let combined = "";
    if (fromLibrary && extra) combined = `${fromLibrary}\n\n---\n\n${extra}`;
    else if (fromLibrary) combined = fromLibrary;
    else combined = extra;

    if (!combined) {
      setMaterialsTruncated(false);
      return combined;
    }

    if (combined.length > MAX_MATERIAL_CHARS) {
      setMaterialsTruncated(true);
      return combined.slice(0, MAX_MATERIAL_CHARS);
    }

    setMaterialsTruncated(false);
    return combined;
  }, [libraryItems, librarySelectedKeys, materials, setMaterialsTruncated]);

  async function handleGenerateQuestionBank() {
    const combined = await getCombinedMaterials();
    if (!combined.trim()) {
      setError("Select at least one file from Library or paste materials.");
      return;
    }
    setError(null);
    setSynthesis(null);
    setTopics([]);
    setAudioUrl(null);
    setCurrentSet(null);
    setVideoUrl(null);
    setVideoTaskId(null);
    setVideoError(null);
    setSynthLoading(true);
    try {
      const res = await fetch("/api/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materials: combined,
          userId: user?.id,
          title: setName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Synthesis failed");
      const extractedTopics = Array.isArray(data.topics) ? data.topics : [];
      setSynthesis({
        markdown: data.markdown ?? "",
        knowledgeGraph: data.knowledgeGraph ?? null,
      });
      setTopics(extractedTopics);

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
          // no-op
        } finally {
          setNarrateLoading(false);
        }
      }

      if (extractedTopics.length === 0) throw new Error("No topics extracted. Try different materials.");
      const qRes = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topics: extractedTopics,
          count: 10,
        }),
      });
      const qData = await qRes.json();
      if (!qRes.ok) throw new Error(qData.error ?? "Failed to generate questions");
      const generatedQuestions = Array.isArray(qData.questions) ? qData.questions : [];
      if (generatedQuestions.length === 0) throw new Error("No questions generated");

      const setId = `set-${Date.now()}`;
      const set: QuestionSet = {
        id: setId,
        name: setName.trim() || `Question set ${new Date().toLocaleDateString()}`,
        questions: generatedQuestions,
        topics: extractedTopics,
        createdAt: new Date().toISOString(),
        flashcardKnown: {},
      };
      setCurrentSet(set);
      if (user?.id) {
        const next = [set, ...savedSets.filter((s) => s.id !== set.id)].slice(0, 20);
        setSavedSets(next);
        saveSets(user.id, next);
      }
      setFlashcardIndex(0);
      setFlashcardFlipped(false);
      void loadHistory(user?.id ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSynthLoading(false);
    }
  }

  function loadSet(set: QuestionSet) {
    setCurrentSet(set);
    setFlashcardIndex(0);
    setFlashcardFlipped(false);
  }

  function setFlashcardKnown(questionId: string, known: boolean) {
    if (!currentSet || !user?.id) return;
    const nextKnown = { ...currentSet.flashcardKnown, [questionId]: known };
    const updated: QuestionSet = { ...currentSet, flashcardKnown: nextKnown };
    setCurrentSet(updated);
    const next = savedSets.map((s) => (s.id === updated.id ? updated : s));
    setSavedSets(next);
    saveSets(user.id, next);
  }

  function buildVideoPromptFromSynthesis(): string {
    if (!synthesis?.markdown) return "";
    const baseMd = stripKnowledgeGraphSection(synthesis.markdown);
    const topicsMd = extractSection(baseMd, "Topics");
    const planMd = extractSection(baseMd, "Study Plan");
    const topicLines = sectionLines(topicsMd);
    const planLines = sectionLines(planMd);
    const topicList = topicLines.slice(0, 8).join(", ");
    const planList = planLines.slice(0, 5).join(". ");
    const raw = `Educational explainer video. Topics: ${topicList}. Study plan: ${planList}. Clean, modern, professional style.`;
    return raw.slice(0, 2000);
  }

  async function handleGenerateVideo() {
    setVideoError(null);
    setVideoUrl(null);
    setVideoLoading(true);
    try {
      let markdown = synthesis?.markdown ?? "";
      let extractedTopics = topics;

      if (!markdown || extractedTopics.length === 0) {
        const combined = await getCombinedMaterials();
        if (!combined.trim()) {
          setVideoError("Select at least one file from Library or paste materials.");
          return;
        }
        const res = await fetch("/api/synthesize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            materials: combined,
            userId: user?.id,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Synthesis failed");
        markdown = data.markdown ?? "";
        extractedTopics = Array.isArray(data.topics) ? data.topics : [];
        setSynthesis({
          markdown,
          knowledgeGraph: data.knowledgeGraph ?? null,
        });
        setTopics(extractedTopics);
      }

      const baseMd = stripKnowledgeGraphSection(markdown);
      const topicsMd = extractSection(baseMd, "Topics");
      const planMd = extractSection(baseMd, "Study Plan");
      const topicLines = sectionLines(topicsMd);
      const planLines = sectionLines(planMd);
      const topicList = topicLines.slice(0, 8).join(", ");
      const planList = planLines.slice(0, 5).join(". ");
      const prompt = `Educational explainer video. Topics: ${topicList}. Study plan: ${planList}. Clean, modern, professional style.`.slice(0, 2000);

      if (!prompt.trim()) {
        setVideoError("No synthesis content to turn into a video.");
        return;
      }

      const createRes = await fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const createData = (await createRes.json()) as { task_id?: string; error?: string };
      if (!createRes.ok) {
        throw new Error(createData.error ?? "Failed to start video generation");
      }
      const taskId = createData.task_id;
      if (!taskId) {
        throw new Error("No task ID returned");
      }
      setVideoTaskId(taskId);

      const maxAttempts = 80;
      const intervalMs = 3000;
      for (let i = 0; i < maxAttempts; i++) {
        const queryRes = await fetch(`/api/video?task_id=${encodeURIComponent(taskId)}`);
        const queryData = (await queryRes.json()) as {
          status?: string;
          video_url?: string;
          error?: string;
        };
        if (queryData.status === "success" && queryData.video_url) {
          setVideoUrl(queryData.video_url);
          setVideoTaskId(null);
          return;
        }
        if (queryData.status === "fail") {
          throw new Error(queryData.error ?? "Video generation failed");
        }
        await new Promise((r) => setTimeout(r, intervalMs));
      }
      throw new Error("Video generation timed out");
    } catch (e) {
      setVideoError(e instanceof Error ? e.message : "Failed to generate video");
      setVideoUrl(null);
      setVideoTaskId(null);
    } finally {
      setVideoLoading(false);
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
      setAudioUrl(null);
      setVideoUrl(null);
      setVideoTaskId(null);
      setVideoError(null);
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
      const folderState = loadFolderState(user.id);
      setLibraryFolders(folderState.folders);
      setLibraryFileToFolder(folderState.fileToFolder);
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

  function togglePendingLibrarySelected(key: string) {
    setPendingLibrarySelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function applyLibrarySelectionAndClose() {
    setLibrarySelectedKeys(pendingLibrarySelectedKeys);
    setLibraryDialogOpen(false);
  }

  const libraryItemsByFolder = useMemo(() => {
    const uncategorized: LibraryItem[] = [];
    const byFolder: Record<string, LibraryItem[]> = {};
    for (const f of libraryFolders) byFolder[f.id] = [];
    for (const item of libraryItems) {
      const folderId = libraryFileToFolder[item.key];
      if (!folderId) uncategorized.push(item);
      else if (byFolder[folderId]) byFolder[folderId].push(item);
      else uncategorized.push(item);
    }
    return { uncategorized, byFolder };
  }, [libraryItems, libraryFolders, libraryFileToFolder]);

  const filteredQuestions = currentSet
    ? currentSet.questions.filter((q) => {
        if (questionBankFilterTopic !== "all" && q.topicId !== questionBankFilterTopic) return false;
        if (questionBankFilterType !== "all" && q.type !== questionBankFilterType) return false;
        if (questionBankFilterDifficulty !== "all" && (q.difficulty ?? "medium") !== questionBankFilterDifficulty)
          return false;
        return true;
      })
    : [];
  const flashcardList = currentSet ? currentSet.questions : [];
  const currentFlashcard = flashcardList[flashcardIndex];

  return (
    <>
      <AIChatAssistant />
      <div className="mx-auto max-w-4xl space-y-8 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          M.U.S.T.Learn
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Choose materials from your library → generate a topic-sorted question bank and flashcards. Browse, filter, and practice.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle>Learning materials</CardTitle>
              <CardDescription>
                Select one or more files from your library. We’ll combine their content to generate questions and flashcards.
              </CardDescription>
            </div>
            <Dialog
                open={libraryDialogOpen}
                onOpenChange={(open) => {
                  setLibraryDialogOpen(open);
                  if (open) setPendingLibrarySelectedKeys([...librarySelectedKeys]);
                }}
              >
                <DialogTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      void loadLibrary();
                      setPendingLibrarySelectedKeys([...librarySelectedKeys]);
                      setLibraryDialogOpen(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:border-[#ffb347] hover:bg-[#ffb347]/5 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <FileText className="w-4 h-4" />
                    Choose from Library
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Select materials</DialogTitle>
                  </DialogHeader>
                <div className="mt-1 space-y-4">
                  {libraryError && (
                    <p className="text-sm text-red-600">{libraryError}</p>
                  )}
                  {libraryLoading && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading files…
                    </p>
                  )}
                  {!libraryLoading && libraryItems.length === 0 && !libraryError && (
                    <p className="text-sm text-muted-foreground">
                      No files in your library yet. Upload from the Library page first.
                    </p>
                  )}
                  {!libraryLoading && libraryItems.length > 0 && (
                    <div className="max-h-[320px] space-y-4 overflow-y-auto pr-1 text-sm">
                      {libraryItemsByFolder.uncategorized.length > 0 && (
                        <section>
                          <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            <Folder className="w-4 h-4" />
                            Uncategorized
                          </h3>
                          <ul className="space-y-1.5">
                            {libraryItemsByFolder.uncategorized.map((item) => {
                              const name = item.key.split("/").pop() || item.key;
                              const last =
                                item.lastModified &&
                                !Number.isNaN(Date.parse(item.lastModified))
                                  ? new Date(item.lastModified).toLocaleString()
                                  : "Unknown";
                              const isSelected = pendingLibrarySelectedKeys.includes(item.key);
                              return (
                                <li key={item.key}>
                                  <button
                                    type="button"
                                    onClick={() => togglePendingLibrarySelected(item.key)}
                                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                                      isSelected
                                        ? "border-[#ffb347] bg-[#ffb347]/15 dark:bg-[#ffb347]/20"
                                        : "border-slate-200 hover:border-[#ffb347]/50 hover:bg-[#ffb347]/5 dark:border-slate-700"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => togglePendingLibrarySelected(item.key)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="h-4 w-4 rounded border-slate-300 text-[#ffb347] focus:ring-[#ffb347]"
                                    />
                                    <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                      <p className="break-all font-medium text-foreground" title={name}>{name}</p>
                                      <p className="truncate text-[11px] text-muted-foreground">{last}</p>
                                    </div>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </section>
                      )}
                      {libraryFolders.map((folder) => {
                        const items = libraryItemsByFolder.byFolder[folder.id] ?? [];
                        if (items.length === 0) return null;
                        return (
                          <section key={folder.id}>
                            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              <Folder className="w-4 h-4" />
                              {folder.name}
                            </h3>
                            <ul className="space-y-1.5">
                              {items.map((item) => {
                                const name = item.key.split("/").pop() || item.key;
                                const last =
                                  item.lastModified &&
                                  !Number.isNaN(Date.parse(item.lastModified))
                                    ? new Date(item.lastModified).toLocaleString()
                                    : "Unknown";
                                const isSelected = pendingLibrarySelectedKeys.includes(item.key);
                                return (
                                  <li key={item.key}>
                                    <button
                                      type="button"
                                      onClick={() => togglePendingLibrarySelected(item.key)}
                                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                                        isSelected
                                          ? "border-[#ffb347] bg-[#ffb347]/15 dark:bg-[#ffb347]/20"
                                          : "border-slate-200 hover:border-[#ffb347]/50 hover:bg-[#ffb347]/5 dark:border-slate-700"
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => togglePendingLibrarySelected(item.key)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="h-4 w-4 rounded border-slate-300 text-[#ffb347] focus:ring-[#ffb347]"
                                      />
                                      <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                                      <div className="min-w-0 flex-1 overflow-hidden">
                                        <p className="break-all font-medium text-foreground" title={name}>{name}</p>
                                        <p className="truncate text-[11px] text-muted-foreground">{last}</p>
                                      </div>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </section>
                        );
                      })}
                    </div>
                  )}
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button type="button" variant="outline" onClick={() => setLibraryDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={applyLibrarySelectionAndClose}>
                    Done
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {librarySelectedKeys.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Attached files</Label>
              <div className="flex flex-wrap gap-2">
                {librarySelectedKeys.map((key) => {
                  const item = libraryItems.find((it) => it.key === key);
                  const name = item ? item.key.split("/").pop() || item.key : key.split("/").pop() || key;
                  return (
                    <span
                      key={key}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200"
                    >
                      <FileText className="w-4 h-4 shrink-0 text-slate-500" />
                      <span className="truncate max-w-[200px]">{name}</span>
                      <button
                        type="button"
                        onClick={() => setLibrarySelectedKeys((prev) => prev.filter((k) => k !== key))}
                        className="shrink-0 rounded p-0.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                        title="Remove"
                        aria-label="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="set-name" className="text-xs text-muted-foreground">
              Optional: name this set
            </Label>
            <Input
              id="set-name"
              placeholder="e.g. Biology Ch. 1–3"
              value={setName}
              onChange={(e) => setSetName(e.target.value)}
              className="max-w-sm"
              disabled={synthLoading}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Or paste extra materials to combine</Label>
            <Textarea
              placeholder={PLACEHOLDER}
              value={materials}
              onChange={(e) => setMaterials(e.target.value)}
              className="min-h-[100px] resize-y font-mono text-sm"
              disabled={synthLoading}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => void handleGenerateQuestionBank()}
              disabled={synthLoading || videoLoading || (librarySelectedKeys.length === 0 && !materials.trim())}
              className="w-full sm:w-auto"
            >
              {synthLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating…
                </span>
              ) : (
                "Generate question bank & flashcards"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleGenerateVideo()}
              disabled={synthLoading || videoLoading || (librarySelectedKeys.length === 0 && !materials.trim())}
              className="inline-flex items-center gap-2"
            >
              {videoLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating video…
                </>
              ) : (
                <>
                  <Video className="w-4 h-4" />
                  Generate video
                </>
              )}
            </Button>
          </div>
          {materialsTruncated && (
            <p className="text-xs text-amber-600 dark:text-amber-300">
              Very long materials were truncated to fit the AI context window. Try focusing on a few chapters or files at a time for deeper analysis.
            </p>
          )}
        </CardContent>
      </Card>

      {savedSets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Saved question sets</CardTitle>
            <CardDescription>Load a set to browse the question bank or practice flashcards.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {savedSets.map((set) => (
                <li key={set.id}>
                  <button
                    type="button"
                    onClick={() => loadSet(set)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      currentSet?.id === set.id
                        ? "border-[#ffb347] bg-[#ffb347]/10"
                        : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                    )}
                  >
                    <span className="font-medium text-foreground">{set.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {set.questions.length} questions · {new Date(set.createdAt).toLocaleDateString()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {currentSet && (
        <Card>
          <CardHeader>
            <CardTitle>{currentSet.name}</CardTitle>
            <CardDescription>
              Topic-sorted question bank and flashcards from your materials.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="question-bank" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="question-bank" className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Question bank
                </TabsTrigger>
                <TabsTrigger value="flashcards" className="flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Flashcards
                </TabsTrigger>
              </TabsList>
              <TabsContent value="question-bank" className="mt-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Select value={questionBankFilterTopic} onValueChange={setQuestionBankFilterTopic}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Topic" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All topics</SelectItem>
                      {currentSet.topics.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={questionBankFilterType} onValueChange={setQuestionBankFilterType}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="mcq">MCQ</SelectItem>
                      <SelectItem value="short">Short answer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={questionBankFilterDifficulty} onValueChange={setQuestionBankFilterDifficulty}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {filteredQuestions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No questions match the filters.</p>
                  ) : (
                    filteredQuestions.map((q) => {
                      const topicLabel = currentSet.topics.find((t) => t.id === q.topicId)?.label ?? q.topicId;
                      return (
                        <QuestionCard key={q.id} question={q} topicLabel={topicLabel} />
                      );
                    })
                  )}
                </div>
              </TabsContent>
              <TabsContent value="flashcards" className="mt-4 space-y-4">
                {flashcardList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No cards in this set.</p>
                ) : (
                  <>
                    <div
                      className="cursor-pointer min-h-[220px] w-full"
                      style={{ perspective: "1000px" }}
                      onClick={() => setFlashcardFlipped((f) => !f)}
                    >
                      <div
                        className="relative w-full h-full min-h-[220px] transition-transform duration-500"
                        style={{
                          transformStyle: "preserve-3d",
                          transform: flashcardFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                        }}
                      >
                        <div
                          className="absolute inset-0 rounded-2xl border-2 border-emerald-300 dark:border-emerald-600 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/80 dark:to-emerald-900/90 shadow-lg flex flex-col items-center justify-center gap-4 p-8"
                          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
                        >
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600 dark:text-emerald-400">
                            Question
                          </span>
                          <p className="text-lg font-semibold text-emerald-900 dark:text-emerald-100 text-center leading-snug max-w-xl">
                            {stripMarkdownBold(currentFlashcard.prompt)}
                          </p>
                          <span className="text-xs text-emerald-500 dark:text-emerald-500/80">Tap card to reveal answer</span>
                        </div>
                        <div
                          className="absolute inset-0 rounded-2xl border-2 border-emerald-400 dark:border-emerald-500 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/90 dark:to-emerald-800/90 shadow-lg flex flex-col justify-center p-8"
                          style={{
                            backfaceVisibility: "hidden",
                            WebkitBackfaceVisibility: "hidden",
                            transform: "rotateY(180deg)",
                          }}
                        >
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
                            Answer
                          </span>
                          <p className="text-base font-semibold text-emerald-900 dark:text-emerald-100 leading-snug mb-4">
                            {stripMarkdownBold(currentFlashcard.correctAnswer)}
                          </p>
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600/90 dark:text-emerald-400/90 mb-1">
                            Explanation
                          </span>
                          <p className="text-sm text-emerald-800/95 dark:text-emerald-200/95 leading-relaxed">
                            {stripMarkdownBold(currentFlashcard.explanation)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFlashcardIndex((i) => (i <= 0 ? flashcardList.length - 1 : i - 1));
                          setFlashcardFlipped(false);
                        }}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {flashcardIndex + 1} / {flashcardList.length}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFlashcardIndex((i) => (i >= flashcardList.length - 1 ? 0 : i + 1));
                          setFlashcardFlipped(false);
                        }}
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Mark this card:</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                        onClick={() => setFlashcardKnown(currentFlashcard.id, true)}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Known
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-amber-600 border-amber-200 hover:bg-amber-50"
                        onClick={() => setFlashcardKnown(currentFlashcard.id, false)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Unknown
                      </Button>
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

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
            <div className="flex flex-wrap items-center gap-2">
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

          {(videoLoading || videoUrl || videoError) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  Generated video
                </CardTitle>
                <CardDescription>
                  AI-generated video from your synthesis (MiniMax Hailuo). Generation can take a few minutes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {videoLoading && (
                  <div className="flex flex-col items-center justify-center gap-3 py-8 text-muted-foreground">
                    <Loader2 className="w-10 h-10 animate-spin" />
                    <p className="text-sm">Creating your video… This may take 2–5 minutes.</p>
                  </div>
                )}
                {videoError && !videoLoading && (
                  <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-800 dark:text-red-200">
                    {videoError}
                  </div>
                )}
                {videoUrl && !videoLoading && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-black">
                    <video
                      src={videoUrl}
                      controls
                      className="w-full aspect-video"
                      playsInline
                      preload="metadata"
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                )}
              </CardContent>
            </Card>
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
    </>
  );
}
