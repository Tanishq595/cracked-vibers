import { useEffect, useRef } from "react";

/**
 * Tracks study time: on mount starts a session, on visibility hidden / page hide sends the session to the API.
 * Call from a component that is mounted when the user is "studying" (e.g. Layout so any dashboard route).
 */
export function useStudySession(userId: string | null) {
  const startedAtRef = useRef<string | null>(null);

  const flushSession = () => {
    if (!userId || !startedAtRef.current) return;
    const startedAt = startedAtRef.current;
    startedAtRef.current = null;
    const endedAt = new Date().toISOString();
    fetch("/api/study-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        startedAt,
        endedAt,
        source: "app",
      }),
    }).catch(() => {});
  };

  useEffect(() => {
    if (!userId) return;
    startedAtRef.current = new Date().toISOString();

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushSession();
      } else {
        startedAtRef.current = new Date().toISOString();
      }
    };

    const onPageHide = () => {
      flushSession();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      flushSession();
    };
  }, [userId]);
}
