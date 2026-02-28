/**
 * Vercel serverless: POST /api/speaking-session-complete
 *
 * Saves a full speaking coach session (conversation turns) and
 * generates an assessment summary + scores using MiniMax M2.5.
 *
 * Body:
 * {
 *   userId: string; // Clerk user id
 *   topic?: string | null; // optional: primary topic label
 *   topics?: string[];     // optional: all topic labels
 *   coachMode?: "explain" | "gaps" | "exam" | "debate";
 *   startedAt?: string;    // ISO timestamp
 *   endedAt?: string;      // ISO timestamp
 *   totalDurationSec?: number;
 *   sttProvider?: string;        // e.g. 'browser-speech-api', 'elevenlabs'
 *   transcriptLanguage?: string; // e.g. 'en-US'
 *   audioUrl?: string | null;
 *   conversationTurns: Array<{ role: "user" | "coach" | "system"; text: string }>;
 * }
 *
 * Response:
 * {
 *   session: { id: string; ... };
 *   assessment?: { ... } | null;
 * }
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { completeM2 } from "../src/lib/minimax";

type Turn = {
  role: "user" | "coach" | "system";
  text: string;
  startTimeMs?: number | null;
  endTimeMs?: number | null;
  audioUrl?: string | null;
};

type AssessmentJson = {
  overall_score?: number;
  fluency_score?: number;
  pronunciation_score?: number;
  grammar_score?: number;
  vocabulary_score?: number;
  coherence_score?: number;
  summary?: string;
  strengths?: string[] | string;
  suggestions?: string[] | string;
};

function buildFullTranscript(turns: Turn[]): string {
  return turns
    .map((t) => {
      const speaker =
        t.role === "user" ? "User" : t.role === "coach" ? "Coach" : "System";
      return `${speaker}: ${t.text}`;
    })
    .join("\n\n");
}

function normalizeListField(value: string[] | string | undefined | null): string | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value
      .map((v) => `${v}`.trim())
      .filter(Boolean)
      .join("\n");
  }
  return `${value}`.trim() || null;
}

function extractJsonObject(text: string): AssessmentJson | null {
  if (!text) return null;

  // Prefer a ```json ``` fenced block if present.
  const fenceMatch = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/);
  const candidate = fenceMatch ? fenceMatch[1] : text;

  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  const jsonStr = candidate.slice(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(jsonStr) as AssessmentJson;
  } catch {
    return null;
  }
}

const ASSESSMENT_SYSTEM_PROMPT = `You are a speaking coach assessor.
Analyze English speaking practice sessions and return a JSON object with detailed scores and feedback.

Return ONLY a single JSON object (no markdown, no extra text) with exactly these keys:
- overall_score (number, 0-100)
- fluency_score (number, 0-100)
- pronunciation_score (number, 0-100)
- grammar_score (number, 0-100)
- vocabulary_score (number, 0-100)
- coherence_score (number, 0-100)
- summary (string, 2-4 sentences of overall feedback)
- strengths (array of 2-4 short strings describing what the learner did well)
- suggestions (array of 2-4 short strings describing specific ways to improve)

The scores should reflect the learner's spoken English as shown in the transcript. Be encouraging but honest.`;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const {
    userId,
    topic,
    topics,
    coachMode,
    startedAt,
    endedAt,
    totalDurationSec,
    sttProvider,
    transcriptLanguage,
    audioUrl,
    conversationTurns,
  } = (req.body ?? {}) as {
    userId?: string;
    topic?: string | null;
    topics?: string[];
    coachMode?: string;
    startedAt?: string;
    endedAt?: string;
    totalDurationSec?: number;
    sttProvider?: string;
    transcriptLanguage?: string;
    audioUrl?: string | null;
    conversationTurns?: Turn[];
  };

  if (!userId || typeof userId !== "string") {
    res.status(400).json({ error: "Missing or invalid 'userId'" });
    return;
  }

  const turns: Turn[] = Array.isArray(conversationTurns)
    ? conversationTurns
        .filter(
          (t): t is Turn =>
            !!t &&
            typeof t.text === "string" &&
            (t.role === "user" || t.role === "coach" || t.role === "system")
        )
        .map((t) => ({
          role: t.role,
          text: t.text.trim(),
          startTimeMs: t.startTimeMs ?? null,
          endTimeMs: t.endTimeMs ?? null,
          audioUrl: t.audioUrl ?? null,
        }))
    : [];

  if (turns.length === 0) {
    res.status(400).json({ error: "Missing or empty 'conversationTurns'" });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    res.status(500).json({ error: "Supabase not configured" });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Resolve app user (UUID) from Clerk user id so we can satisfy `user_id UUID` column.
    // If the row does not exist yet (e.g. /api/init-user never ran), create it on the fly.
    let appUserId: string | null = null;
    {
      const { data, error } = await supabase
        .from("app_users")
        .select("id")
        .eq("clerk_user_id", userId)
        .maybeSingle();

      if (error) {
        // eslint-disable-next-line no-console
        console.error("[speaking-session-complete] app_users initial lookup error:", error);
      } else if (data?.id) {
        appUserId = data.id as string;
      }
    }

    if (!appUserId) {
      const { data: inserted, error: insertError } = await supabase
        .from("app_users")
        .insert({ clerk_user_id: userId })
        .select("id")
        .single();

      if (insertError || !inserted?.id) {
        // eslint-disable-next-line no-console
        console.error("[speaking-session-complete] app_users insert error:", insertError);
        res.status(500).json({ error: "Failed to init user in database" });
        return;
      }
      appUserId = inserted.id as string;
    }

    const now = new Date();
    const started =
      typeof startedAt === "string" && startedAt
        ? new Date(startedAt)
        : now;
    const ended =
      typeof endedAt === "string" && endedAt
        ? new Date(endedAt)
        : now;

    const durationSec =
      typeof totalDurationSec === "number" && Number.isFinite(totalDurationSec)
        ? Math.max(0, Math.round(totalDurationSec))
        : Math.max(0, Math.round((ended.getTime() - started.getTime()) / 1000));

    const fullTranscript = buildFullTranscript(turns);
    const topicList = Array.isArray(topics) ? topics : [];
    const primaryTopic =
      typeof topic === "string" && topic.trim()
        ? topic.trim()
        : topicList[0] ?? null;

    // 1) Insert speaking_sessions row
    const { data: sessionRows, error: insertSessionError } = await supabase
      .from("speaking_sessions")
      .insert({
        user_id: appUserId,
        topic: primaryTopic,
        started_at: started.toISOString(),
        ended_at: ended.toISOString(),
        total_duration_sec: durationSec,
        stt_provider: sttProvider ?? "browser-speech-api",
        transcript_language: transcriptLanguage ?? "en-US",
        full_transcript: fullTranscript,
        audio_url: audioUrl ?? null,
        status: "completed",
      })
      .select("id, user_id, topic, started_at, ended_at, total_duration_sec, status")
      .single();

    if (insertSessionError || !sessionRows) {
      // eslint-disable-next-line no-console
      console.error(
        "[speaking-session-complete] insert speaking_sessions error:",
        insertSessionError
      );
      res.status(500).json({ error: "Failed to save speaking session" });
      return;
    }

    const sessionId = sessionRows.id as string;

    // 2) Insert per-turn rows (best-effort; don't fail the whole request if this part fails)
    try {
      const turnPayloads = turns.map((t, idx) => ({
        session_id: sessionId,
        sequence_number: idx + 1,
        speaker: t.role,
        start_time_ms: t.startTimeMs ?? null,
        end_time_ms: t.endTimeMs ?? null,
        text: t.text,
        audio_url: t.audioUrl ?? null,
      }));
      const { error: turnsError } = await supabase
        .from("speaking_session_turns")
        .insert(turnPayloads);
      if (turnsError) {
        // eslint-disable-next-line no-console
        console.error(
          "[speaking-session-complete] insert speaking_session_turns error:",
          turnsError
        );
      }
    } catch (turnsErr) {
      // eslint-disable-next-line no-console
      console.error("[speaking-session-complete] unexpected turns insert error:", turnsErr);
    }

    // 3) Call MiniMax M2.5 to generate assessment
    let assessmentRecord: Record<string, unknown> | null = null;
    try {
      const topicsText =
        topicList.length > 0 ? `Topics: ${topicList.join(", ")}\n` : "";
      const modeText = coachMode ? `Mode: ${coachMode}\n` : "";

      const userPrompt = `${topicsText}${modeText}Here is the full transcript of a speaking practice session between the learner (User) and the coach (Coach). Analyze ONLY the learner's speaking performance.\n\nTranscript:\n\n${fullTranscript}\n\nReturn ONLY the assessment JSON object described in the system prompt.`;

      const raw = await completeM2({
        system: ASSESSMENT_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
        maxTokens: 800,
        temperature: 0.3,
      });

      const parsed = extractJsonObject(raw);
      if (parsed) {
        const strengths = normalizeListField(parsed.strengths);
        const suggestions = normalizeListField(parsed.suggestions);

        const { data: insertAssessmentData, error: insertAssessmentError } =
          await supabase
            .from("speaking_session_assessments")
            .insert({
              session_id: sessionId,
              model_name: "minimax-m2",
              overall_score: parsed.overall_score ?? null,
              fluency_score: parsed.fluency_score ?? null,
              pronunciation_score: parsed.pronunciation_score ?? null,
              grammar_score: parsed.grammar_score ?? null,
              vocabulary_score: parsed.vocabulary_score ?? null,
              coherence_score: parsed.coherence_score ?? null,
              summary: parsed.summary ?? null,
              strengths,
              suggestions,
              raw_model_response: parsed,
            })
            .select(
              "id, session_id, model_name, overall_score, fluency_score, pronunciation_score, grammar_score, vocabulary_score, coherence_score, summary, strengths, suggestions, created_at"
            )
            .single();

        if (insertAssessmentError) {
          // eslint-disable-next-line no-console
          console.error(
            "[speaking-session-complete] insert assessment error:",
            insertAssessmentError
          );
        } else if (insertAssessmentData) {
          assessmentRecord = insertAssessmentData;
        }
      } else {
        // eslint-disable-next-line no-console
        console.warn(
          "[speaking-session-complete] MiniMax assessment returned non-JSON or unparsable output"
        );
      }
    } catch (assessmentErr) {
      // eslint-disable-next-line no-console
      console.error(
        "[speaking-session-complete] MiniMax assessment error:",
        assessmentErr
      );
    }

    res.status(200).json({
      session: sessionRows,
      assessment: assessmentRecord,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[speaking-session-complete] unexpected error:", err);
    res.status(500).json({ error: "Failed to complete speaking session" });
  }
}

