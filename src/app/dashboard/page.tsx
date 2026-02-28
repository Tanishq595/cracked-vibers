"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { cn } from "@/app/components/ui/utils";

const PLACEHOLDER = `Paste learning materials here (e.g. notes, transcript, textbook excerpt)...

Example:
- Photosynthesis: light → chloroplasts → glucose + O2. Requires CO2 and H2O.
- Cell division: mitosis (somatic) and meiosis (gametes). Chromosomes duplicate in S phase.
- We didn't cover the Calvin cycle in detail.`;

function extractStudyPlanSection(markdown: string): string {
  const match = markdown.match(/##\s*Study Plan\s*\n([\s\S]*?)(?=\n##\s|$)/i);
  return match ? match[1].trim() : "";
}

export default function DashboardPage() {
  const [materials, setMaterials] = useState("");
  const [synthesis, setSynthesis] = useState<{
    markdown: string;
    knowledgeGraph: Record<string, unknown> | null;
  } | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [synthLoading, setSynthLoading] = useState(false);
  const [narrateLoading, setNarrateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSynthesize() {
    setError(null);
    setSynthesis(null);
    setAudioUrl(null);
    setSynthLoading(true);
    try {
      const res = await fetch("/api/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materials }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Synthesis failed");
      setSynthesis({
        markdown: data.markdown ?? "",
        knowledgeGraph: data.knowledgeGraph ?? null,
      });

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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSynthLoading(false);
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
              <div className="prose prose-zinc dark:prose-invert max-w-none prose-headings:font-semibold prose-p:leading-relaxed">
                <ReactMarkdown>{synthesis.markdown}</ReactMarkdown>
              </div>
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
