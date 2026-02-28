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
    return "Disconnected";
  };

  return (
    <div className="flex justify-center items-center gap-x-4">
      <Card className="rounded-3xl">
        <CardContent>
          <CardHeader>
            <CardTitle className="text-center text-base">
              {getConnectionStatus()}
            </CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-y-4 text-center">
            <div
              className={cn(
                "my-10 mx-12 h-40 w-40 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 shadow-[0_0_40px_rgba(56,189,248,0.6)] transition-transform",
                conversationActive && conversation.isSpeaking && !isStopping
                  ? "animate-pulse"
                  : conversationActive && !isStopping
                  ? "animate-[pulse_3s_ease-in-out_infinite]"
                  : "opacity-70",
              )}
            />

            {error && (
              <div className="mb-2 rounded-md bg-red-50 p-2 text-xs text-red-700">
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
                    <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">You said:</p>
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
                )
              )}

              {(userTranscript || userInterimTranscript) && conversationActive && micOn && (
                <div className="rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm dark:border-slate-600 dark:bg-slate-800">
                  <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">You said (live):</p>
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

            <Button
              variant="outline"
              className="rounded-full"
              size="lg"
              disabled={isStarting || conversationActive}
              onClick={startConversation}
            >
              {isStarting ? "Starting…" : "Start voice practice"}
            </Button>

            <Button
              variant={isStopping ? "destructive" : "outline"}
              className="rounded-full"
              size="lg"
              onClick={stopConversation}
              disabled={!conversationActive && !isStopping}
            >
              {isStopping ? "Stopping…" : "End practice"}
            </Button>

            {conversationActive && (
              <Button
                variant={micOn ? "outline" : "secondary"}
                className="rounded-full"
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

            {sessionSummary && (
              <div className="rounded-lg bg-emerald-50 p-3 text-left text-sm text-emerald-800">
                {sessionSummary}
              </div>
            )}

            <div className="mt-2 text-xs text-zinc-500">
              Status: {conversation.status} • Active:{" "}
              {conversationActive.toString()} • Speaking:{" "}
              {conversation.isSpeaking.toString()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

