import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { cn } from "../ui/utils";
import { useConversation, type CoachContext, type CoachMode } from "./useConversation";

async function requestMicrophonePermission(): Promise<boolean> {
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    return true;
  } catch {
    console.error("Microphone permission denied");
    return false;
  }
}

export interface SpeakingCoachProps {
  coachContext?: CoachContext | null;
  coachMode?: CoachMode;
  userId?: string | null;
  onSessionEnd?: (topicsPracticed: string[]) => void;
}

export function SpeakingCoach({
  coachContext,
  coachMode = "explain",
  userId,
  onSessionEnd,
}: SpeakingCoachProps = {}) {
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationActive, setConversationActive] = useState(false);
  const [agentTranscript, setAgentTranscript] = useState("");
  const [userTranscript, setUserTranscript] = useState("");
  const [userInterimTranscript, setUserInterimTranscript] = useState("");
  const [conversationTurns, setConversationTurns] = useState<
    { role: "user" | "coach"; text: string }[]
  >([]);
  const [sessionSummary, setSessionSummary] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(true);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<{ start(): void; stop(): void } | null>(null);
  const userTranscriptRef = useRef("");
  const conversationTurnsRef = useRef<{ role: "user" | "coach"; text: string }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    userTranscriptRef.current = userTranscript;
  }, [userTranscript]);
  useEffect(() => {
    conversationTurnsRef.current = conversationTurns;
  }, [conversationTurns]);

  // Dynamic coach responses: pass full conversation context to the API
  const getCoachMessage = useCallback(async (messageIndex: number): Promise<string | undefined> => {
    try {
      const currentUser = userTranscriptRef.current.trim();
      const history = conversationTurnsRef.current;
      const conversationHistory = [
        ...history.map((t) => ({ role: t.role, content: t.text })),
        ...(currentUser ? [{ role: "user" as const, content: currentUser }] : []),
      ];

      const res = await fetch("/api/coach-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationHistory,
          userTranscript: currentUser,
          messageIndex,
          topics: coachContext?.topics,
          knowledgeGaps: coachContext?.knowledgeGaps,
          studyPlan: coachContext?.studyPlan,
          mode: coachMode,
          ...(coachMode === "debate" && {
            debateMotion: coachContext?.debateMotion,
            debateSide: coachContext?.debateSide,
          }),
        }),
      });
      const data = (await res.json()) as { message?: string };
      return data.message;
    } catch {
      return undefined;
    }
  }, [coachContext?.topics, coachContext?.knowledgeGaps, coachContext?.studyPlan, coachMode]);

  // Play coach message with ElevenLabs TTS when API is configured
  const playCoachMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    try {
      const prev = ttsAudioRef.current;
      if (prev) {
        prev.pause();
        prev.currentTime = 0;
      }
      const res = await fetch("/api/tts-eleven", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { audioBase64?: string; contentType?: string };
      if (!data.audioBase64) return;
      const contentType = data.contentType || "audio/mpeg";
      const audio = new Audio(`data:${contentType};base64,${data.audioBase64}`);
      ttsAudioRef.current = audio;
      audio.play().catch(() => {});
      audio.onended = () => {
        if (ttsAudioRef.current === audio) ttsAudioRef.current = null;
      };
    } catch {
      // TTS optional; ignore errors
    }
  }, []);

  // Browser speech recognition for real-time "You said" transcript
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let final = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      if (final) {
        setUserTranscript((prev) => (prev ? `${prev} ${final}` : final).trim());
      }
      setUserInterimTranscript(interim);
    };

    recognition.onerror = (event: any) => {
      if (event.error !== "aborted" && event.error !== "no-speech") {
        console.error("Speech recognition error", event.error);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {}
      recognitionRef.current = null;
    };
  }, []);

  const conversation = useConversation({
    coachContext,
    coachMode,
    getCoachMessage,
    onConnect: () => {
      setError(null);
      setSessionSummary(null);
      setIsStarting(false);
      setConversationActive(true);
      setAgentTranscript("");
      setUserTranscript("");
      setUserInterimTranscript("");
      setConversationTurns([]);
      setMicOn(true);
    },
    onDisconnect: () => {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsStarting(false);
      setIsStopping(false);
      setConversationActive(false);
      setMicOn(true);
    },
    onError: () => {
      setError("An error occurred during the conversation");
      setIsStarting(false);
      setIsStopping(false);
      setConversationActive(false);
    },
    onMessage: (message) => {
      if (typeof message === "string") {
        const userText = userTranscriptRef.current.trim();
        setAgentTranscript(message);
        playCoachMessage(message);
        setConversationTurns((prev) => {
          const next = [...prev];
          if (userText) next.push({ role: "user", text: userText });
          next.push({ role: "coach", text: message });
          return next;
        });
        setUserTranscript("");
        setUserInterimTranscript("");
      }
    },
  });

  // Request next coach reply only after user has spoken (non-debate): debounce ~2s after final transcript
  useEffect(() => {
    if (
      coachMode === "debate" ||
      !conversationActive ||
      conversation.status !== "connected" ||
      !userTranscript.trim()
    ) {
      return;
    }
    const t = setTimeout(() => {
      if (!userTranscriptRef.current.trim()) return;
      conversation.requestCoachReply();
    }, 2000);
    return () => clearTimeout(t);
  }, [
    userTranscript,
    conversationActive,
    conversation.status,
    coachMode,
    conversation.requestCoachReply,
  ]);

  async function startConversation() {
    if (isStarting || conversationActive) return;
    setIsStarting(true);
    setError(null);

    try {
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        setError("Microphone access is required for voice practice.");
        setIsStarting(false);
        return;
      }

      setConversationTurns([]);
      setUserTranscript("");
      setUserInterimTranscript("");
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.warn("Speech recognition start failed", e);
      }

      // In this hackathon version we pass a mock URL; the hook is a simulation.
      await conversation.startSession({ signedUrl: "mock-signed-url" });
    } catch (err) {
      console.error("Failed to start conversation:", err);
      setError(
        err instanceof Error ? err.message : "Failed to start conversation",
      );
      setIsStarting(false);
      setConversationActive(false);
    }
  }

  const topicLabels = coachContext?.topics?.map((t) => t.label) ?? [];

  const stopConversation = useCallback(async () => {
    if (isStopping) return;
    setIsStopping(true);
    setError(null);

    try {
      await conversation.endSession();
      setConversationActive(false);
      if (topicLabels.length > 0) {
        if (userId) {
          try {
            await fetch("/api/oral-session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId, topics: topicLabels }),
            });
          } catch (e) {
            console.error("Failed to save oral session:", e);
          }
        }
        onSessionEnd?.(topicLabels);
        setSessionSummary(`Session saved. Topics practiced: ${topicLabels.join(", ")}.`);
      }
    } catch (err) {
      console.error("Failed to stop conversation:", err);
      setError("Failed to stop conversation properly");
      setConversationActive(false);
    } finally {
      setIsStopping(false);
    }
  }, [conversation, isStopping, topicLabels, userId, onSessionEnd]);

  const forceStop = useCallback(() => {
    setConversationActive(false);
    setIsStarting(false);
    setIsStopping(false);
    setError(null);
  }, []);

  const toggleMic = useCallback(() => {
    if (!recognitionRef.current) return;
    if (micOn) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setUserInterimTranscript("");
      setMicOn(false);
    } else {
      try {
        recognitionRef.current.start();
        setMicOn(true);
      } catch (e) {
        console.warn("Speech recognition start failed", e);
      }
    }
  }, [micOn]);

  const getConnectionStatus = () => {
    if (isStopping) return "Stopping conversation…";
    if (isStarting) return "Starting conversation…";
    if (conversationActive && conversation.status === "connected") {
      return conversation.isSpeaking ? "Coach is speaking" : "Coach is listening";
    }
    return "Ready to start practice";
  };

  // Canvas-based orange voice wavering UI
  useEffect(() => {
    if (typeof window === "undefined") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameId: number;

    const render = (time: number) => {
      const { width, height } = canvas;

      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      // Base radius for layout
      const radius = Math.min(width, height) * 0.22;
      // Circle breathing: smoothly smaller and bigger over time
      const circleScale = 0.92 + 0.12 * Math.sin(time / 520);
      const circleRadius = radius * circleScale;

      // Core orange circle
      const gradient = ctx.createRadialGradient(
        cx,
        cy,
        circleRadius * 0.3,
        cx,
        cy,
        circleRadius * 1.2,
      );
      gradient.addColorStop(0, "#ffe2b3");
      gradient.addColorStop(0.5, "#ffb347");
      gradient.addColorStop(1, "rgba(255,140,66,0.1)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, circleRadius, 0, Math.PI * 2);
      ctx.fill();

      // Rays – single unified wavering effect (more space around circle, room to extend)
      const rayCount = 24;
      const baseInner = radius * 1.25; // start a bit further from the circle
      const baseOuter = radius * 1.9; // more room for extension
      const amp = 1.0;

      for (let i = 0; i < rayCount; i++) {
        const angle = (Math.PI * 2 * i) / rayCount;
        const phase = time / 260 + i * 0.5;
        const extra = (Math.sin(phase) * 0.5 + 0.5) * (radius * 0.45) * amp;

        const inner = baseInner;
        const outer = baseOuter + extra;

        const x1 = cx + inner * Math.cos(angle);
        const y1 = cy + inner * Math.sin(angle);
        const x2 = cx + outer * Math.cos(angle);
        const y2 = cy + outer * Math.sin(angle);

        ctx.strokeStyle = "rgba(255,179,71,0.95)";
        ctx.lineWidth = radius * 0.16;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      frameId = window.requestAnimationFrame(render);
    };

    frameId = window.requestAnimationFrame(render);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [conversationActive, conversation.isSpeaking, isStopping]);

  return (
    <div className="flex items-center justify-center gap-x-4 px-3 sm:px-0">
      <Card className="w-full max-w-2xl rounded-3xl border border-border/70 bg-card/95 shadow-lg shadow-slate-900/10">
        <CardHeader className="pb-3 pt-6">
          <CardTitle className="text-center text-base font-semibold tracking-tight">
            {getConnectionStatus()}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-6 pt-0">
          <div className="flex flex-col gap-y-4 text-center">
            <div className="mx-auto mt-4 mb-4 flex h-32 w-32 items-center justify-center sm:mt-8 sm:mb-6 sm:h-40 sm:w-40">
              <canvas
                ref={canvasRef}
                width={200}
                height={200}
                className="h-full w-full"
              />
            </div>

            {error && (
              <div className="mb-1 rounded-md bg-red-50 p-2 text-xs text-red-700">
                {error}
                <button
                  onClick={forceStop}
                  className="ml-2 underline hover:text-red-900"
                >
                  Force stop
                </button>
              </div>
            )}

            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto text-left">
              {conversationTurns.map((turn, idx) =>
                turn.role === "user" ? (
                  <div
                    key={`u-${idx}`}
                    className="rounded-lg bg-slate-100 p-3 text-sm dark:bg-slate-800"
                  >
                    <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">
                      You said:
                    </p>
                    <p className="text-slate-900 dark:text-slate-100">{turn.text}</p>
                  </div>
                ) : (
                  <div
                    key={`c-${idx}`}
                    className="rounded-lg bg-emerald-50 p-3 text-sm dark:bg-emerald-900/20"
                  >
                    <p className="mb-1 text-xs text-emerald-700 dark:text-emerald-400">
                      Coach says:
                    </p>
                    <p className="text-emerald-900 dark:text-emerald-100">{turn.text}</p>
                  </div>
                ),
              )}

              {(userTranscript || userInterimTranscript) && conversationActive && micOn && (
                <div className="rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm dark:border-slate-600 dark:bg-slate-800">
                  <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">
                    You said (live):
                  </p>
                  <p className="text-slate-900 dark:text-slate-100">
                    {userTranscript}
                    {userInterimTranscript && (
                      <span className="text-slate-500 dark:text-slate-400">
                        {userTranscript ? " " : ""}
                        {userInterimTranscript}
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
              <Button
                variant="default"
                className="rounded-full px-6 bg-gradient-to-r from-[#ffb347] to-[#ff8c42] text-white shadow-md hover:brightness-105 disabled:opacity-60"
                size="lg"
                disabled={isStarting || conversationActive}
                onClick={startConversation}
              >
                {isStarting ? "Starting…" : "Start voice practice"}
              </Button>

              <Button
                variant={isStopping ? "destructive" : "outline"}
                className="rounded-full px-6"
                size="lg"
                onClick={stopConversation}
                disabled={!conversationActive && !isStopping}
              >
                {isStopping ? "Stopping…" : "End practice"}
              </Button>

              {conversationActive && (
                <Button
                  variant={micOn ? "outline" : "secondary"}
                  className="rounded-full px-5"
                  size="lg"
                  onClick={toggleMic}
                  title={micOn ? "Mute microphone" : "Unmute microphone"}
                >
                  {micOn ? (
                    <>
                      <Mic className="mr-2 h-4 w-4" />
                      Mic on
                    </>
                  ) : (
                    <>
                      <MicOff className="mr-2 h-4 w-4" />
                      Mic off
                    </>
                  )}
                </Button>
              )}
            </div>

            {sessionSummary && (
              <div className="mt-1 rounded-lg bg-emerald-50 p-3 text-left text-sm text-emerald-800">
                {sessionSummary}
              </div>
            )}

            <div className="mt-2 text-xs text-zinc-500">
              Connection: {conversation.status} • Mic:{" "}
              {micOn ? "On" : "Off"} • Coach speaking:{" "}
              {conversation.isSpeaking ? "Yes" : "No"}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

