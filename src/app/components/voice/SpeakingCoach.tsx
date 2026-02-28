import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { cn } from "../ui/utils";
import { useConversation, type CoachContext, type CoachMode } from "./useConversation";
import { ChatbotGLB } from "../ChatbotGLB";

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
  const [coachAudioPlaying, setCoachAudioPlaying] = useState(false);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<{ start(): void; stop(): void } | null>(null);
  const userTranscriptRef = useRef("");
  const conversationTurnsRef = useRef<{ role: "user" | "coach"; text: string }[]>([]);
  const sessionStartRef = useRef<Date | null>(null);
  const lastRequestedTextRef = useRef<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const conversationActiveRef = useRef(false);
  const micOnRef = useRef(true);

  useEffect(() => {
    userTranscriptRef.current = userTranscript;
  }, [userTranscript]);
  useEffect(() => {
    conversationActiveRef.current = conversationActive;
  }, [conversationActive]);
  useEffect(() => {
    micOnRef.current = micOn;
  }, [micOn]);
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
          ...(coachMode === "exam" && {
            examType: coachContext?.examType && coachContext.examType !== "" ? coachContext.examType : null,
          }),
        }),
      });
      const data = (await res.json()) as { message?: string };
      return data.message;
    } catch {
      return undefined;
    }
  }, [coachContext?.topics, coachContext?.knowledgeGaps, coachContext?.studyPlan, coachContext?.examType, coachMode]);

  // Play coach message with ElevenLabs TTS when API is configured
  // and sync the bot video with the spoken audio.
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
      if (!res.ok) {
        setCoachAudioPlaying(false);
        return;
      }
      const data = (await res.json()) as { audioBase64?: string; contentType?: string };
      if (!data.audioBase64) {
        setCoachAudioPlaying(false);
        return;
      }
      const contentType = data.contentType || "audio/mpeg";
      const audio = new Audio(`data:${contentType};base64,${data.audioBase64}`);
      ttsAudioRef.current = audio;

      // Disable mic while coach is speaking (avoid picking up TTS and talking over)
      setCoachAudioPlaying(true);
      try {
        recognitionRef.current?.stop();
      } catch {}

      // Start bot video when the coach starts speaking
      const video = videoRef.current;
      if (video) {
        try {
          video.currentTime = 0;
          // Ignore autoplay failures (browser policy)
          void video.play();
        } catch {
          // ignore
        }
      }

      void audio.play();
      audio.onended = () => {
        if (ttsAudioRef.current === audio) ttsAudioRef.current = null;
        const v = videoRef.current;
        if (v) {
          v.pause();
          v.currentTime = 0;
        }
        setCoachAudioPlaying(false);
        // Re-enable mic when coach finishes speaking (if session still active and mic was on)
        if (conversationActiveRef.current && micOnRef.current) {
          try {
            recognitionRef.current?.start();
          } catch (e) {
            console.warn("Speech recognition start after coach finished failed", e);
          }
        }
      };
    } catch {
      setCoachAudioPlaying(false);
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
      sessionStartRef.current = new Date();
      lastRequestedTextRef.current = null;
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

      // Stop and reset bot video when conversation disconnects
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
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
      const latest = userTranscriptRef.current.trim();
      if (!latest) return;
      if (latest === lastRequestedTextRef.current) return;
      lastRequestedTextRef.current = latest;
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

  const stopConversation = useCallback(
    async () => {
      if (isStopping) return;
      setIsStopping(true);
      setError(null);

      // Capture session data before ending (for backend save)
      const turnsToSave = conversationTurnsRef.current;
      const startedAt = sessionStartRef.current ?? new Date();
      const endedAt = new Date();
      const totalDurationSec = Math.max(
        0,
        Math.round((endedAt.getTime() - startedAt.getTime()) / 1000),
      );

      try {
        await conversation.endSession();
        setConversationActive(false);

        // Save session + transcript to Supabase when we have turns and userId
        let assessmentSummary: string | null = null;
        if (turnsToSave.length > 0 && userId) {
          try {
            const res = await fetch("/api/speaking-session-complete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId,
                topic: topicLabels[0] ?? null,
                topics: topicLabels,
                coachMode,
                startedAt: startedAt.toISOString(),
                endedAt: endedAt.toISOString(),
                totalDurationSec,
                sttProvider: "browser-speech-api",
                transcriptLanguage: "en-US",
                conversationTurns: turnsToSave.map((t) => ({
                  role: t.role,
                  text: t.text,
                })),
              }),
            });

            if (res.ok) {
              const data = (await res.json()) as {
                session?: unknown;
                assessment?: { summary?: string } | null;
              };
              if (data.assessment?.summary) {
                assessmentSummary = data.assessment.summary;
                setSessionSummary(assessmentSummary);
              }
            } else {
              const errText = await res.text();
              let errMessage: string | null = null;
              try {
                const parsed = JSON.parse(errText) as { error?: string };
                if (typeof parsed.error === "string") errMessage = parsed.error;
              } catch {
                // ignore
              }
              console.error(
                "Failed to complete speaking session:",
                res.status,
                errText,
              );
              if (errMessage) setError(errMessage);
            }
          } catch (e) {
            console.error("Error while completing speaking session:", e);
          }
        }

        if (topicLabels.length > 0) {
          onSessionEnd?.(topicLabels);
          if (!assessmentSummary) {
            setSessionSummary(
              `Topics practiced: ${topicLabels.join(", ")}.`,
            );
          }
        }
      } catch (err) {
        console.error("Failed to stop conversation:", err);
        setError("Failed to stop conversation properly");
        setConversationActive(false);
      } finally {
        setIsStopping(false);
      }
    },
    [
      conversation,
      isStopping,
      onSessionEnd,
      topicLabels,
      sessionSummary,
      coachMode,
      userId,
    ],
  );

  const forceStop = useCallback(() => {
    setConversationActive(false);
    setIsStarting(false);
    setIsStopping(false);
    setError(null);

    // Stop and reset bot video on force stop
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
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

  const coachIsThinking = conversationActive && conversation.status === "connected" && conversation.isSpeaking && !coachAudioPlaying;

  const getConnectionStatus = () => {
    if (isStopping) return "Stopping conversation…";
    if (isStarting) return "Starting conversation…";
    if (conversationActive && conversation.status === "connected") {
      if (coachIsThinking) return "Coach is thinking…";
      return conversation.isSpeaking ? "Coach is speaking" : "Coach is listening";
    }
    return "Ready to start practice";
  };

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
            <div className="mx-auto mt-4 mb-4 flex h-40 w-36 flex-col items-center justify-center sm:mt-8 sm:mb-6 sm:h-52 sm:w-44">
              <div className="relative flex h-full w-full items-center justify-center">
                <video
                  ref={videoRef}
                  src="/bot/Bear_talking.mp4"
                  loop
                  muted
                  playsInline
                  className="h-full w-full rounded-lg object-cover"
                />
                {coachIsThinking && (
                  <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-black/50 px-3 py-1.5" aria-label="Coach is thinking">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-white" style={{ animationDelay: "0ms", animationDuration: "0.6s" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-white" style={{ animationDelay: "150ms", animationDuration: "0.6s" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-white" style={{ animationDelay: "300ms", animationDuration: "0.6s" }} />
                  </div>
                )}
              </div>
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
                  disabled={coachAudioPlaying}
                  title={
                    coachAudioPlaying
                      ? "Mic paused while coach is speaking"
                      : micOn
                        ? "Mute microphone"
                        : "Unmute microphone"
                  }
                >
                  {coachAudioPlaying ? (
                    <>
                      <MicOff className="mr-2 h-4 w-4 opacity-60" />
                      Mic paused
                    </>
                  ) : micOn ? (
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

