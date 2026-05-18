import { useCallback, useEffect, useRef, useState } from "react";
import {
  startRecordingSession,
  saveRecordingChunk,
  finalizeRecordingSession,
  recoverUnfinalizedSessions,
  discardSession,
} from "@/lib/witness-db";

export type RecorderState = "inactive" | "recording" | "paused" | "stopped" | "error";

export interface RecordingResult {
  blob: Blob;
  mimeType: string;
  durationMs: number;
  startedAt: number;
  endedAt: number;
}

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "video/mp4;codecs=avc1,mp4a",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c)) return c;
    } catch {
      /* noop */
    }
  }
  return "";
}

export interface CrashRecoveryItem {
  sessionId: string;
  startedAt: number;
  chunkCount: number;
  mimeType: string;
  totalSizeBytes: number;
}

export function useMediaRecorder(
  stream: MediaStream | null,
  options?: {
    encrypt?: boolean;
    pin?: string | null;
    gps?: { latitude: number; longitude: number; accuracy?: number } | null;
    category?: string | null;
    quality?: "standard" | "high" | null;
    nightMode?: boolean | null;
  },
) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const startedAtRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const totalPausedMsRef = useRef<number>(0);
  const sessionIdRef = useRef<string | null>(null);
  const [state, setState] = useState<RecorderState>("inactive");
  const [lastResult, setLastResult] = useState<RecordingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [recoverable, setRecoverable] = useState<CrashRecoveryItem | null>(null);
  const seqRef = useRef(0);

  // On mount, check for any unfinalized sessions from a previous crash
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const unfinalized = await recoverUnfinalizedSessions();
        if (cancelled) return;
        // Offer the most recent one
        const mostRecent = unfinalized.sort((a, b) => b.startedAt - a.startedAt)[0];
        if (mostRecent) {
          setRecoverable({
            sessionId: mostRecent.sessionId,
            startedAt: mostRecent.startedAt,
            chunkCount: mostRecent.chunkCount,
            mimeType: mostRecent.mimeType,
            totalSizeBytes: mostRecent.totalSizeBytes,
          });
        }
      } catch {
        /* ignore recovery scan errors */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setRecoverable(null);
    if (!stream) {
      setError("No camera stream available.");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setError("MediaRecorder is not supported in this browser.");
      return;
    }

    // If there was a previous session somehow, discard it
    if (sessionIdRef.current) {
      try {
        await discardSession(sessionIdRef.current);
      } catch {
        /* noop */
      }
      sessionIdRef.current = null;
    }

    try {
      const mimeType = pickMimeType();
      const rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      const sessionId = await startRecordingSession({
        mimeType: rec.mimeType || "video/webm",
        encrypt: options?.encrypt ?? false,
        gps: options?.gps ?? null,
        thumbnailDataUrl: null,
        category: options?.category ?? null,
        quality: options?.quality ?? null,
        nightMode: options?.nightMode ?? null,
      });
      sessionIdRef.current = sessionId;
      seqRef.current = 0;

      rec.ondataavailable = async (e) => {
        if (e.data && e.data.size > 0 && sessionIdRef.current) {
          try {
            await saveRecordingChunk(sessionIdRef.current, e.data, options?.pin);
            seqRef.current += 1;
          } catch (err) {
            // If a chunk fails to persist, we keep going but log it.
            // The user may end up with a partial but still usable recording.
            console.error("[witness] chunk persist failed", err);
          }
        }
      };

      rec.onstop = async () => {
        const endedAt = Date.now();
        if (!sessionIdRef.current) {
          setState("stopped");
          return;
        }
        const sessionId = sessionIdRef.current;
        const activeMs = endedAt - startedAtRef.current - totalPausedMsRef.current;
        setIsSaving(true);
        try {
          const meta = await finalizeRecordingSession(sessionId, activeMs, options?.pin);
          const blobResult = await (async () => {
            // Reconstruct a Blob from the saved recording so we can set lastResult
            // for consumers that expect a Blob. This is a slight inefficiency
            // but preserves backward compatibility.
            const dbModule = await import("@/lib/witness-db");
            const result = await dbModule.getRecordingBlob(meta.id, options?.pin);
            return result?.blob ?? new Blob([], { type: meta.mimeType });
          })();
          setLastResult({
            blob: blobResult,
            mimeType: meta.mimeType,
            durationMs: activeMs,
            startedAt: startedAtRef.current,
            endedAt,
          });
          setState("stopped");
        } catch (e: unknown) {
          setError((e as Error)?.message ?? "Failed to finalize recording");
          setState("error");
        } finally {
          setIsSaving(false);
          sessionIdRef.current = null;
        }
      };

      rec.onerror = (ev) => {
        const msg = (ev as unknown as { error?: Error })?.error?.message ?? "Recorder error";
        setError(msg);
        // Try to finalize whatever chunks we already have
        if (sessionIdRef.current) {
          const sid = sessionIdRef.current;
          const activeMs = Date.now() - startedAtRef.current - totalPausedMsRef.current;
          setIsSaving(true);
          finalizeRecordingSession(sid, activeMs, options?.pin)
            .then(() => setState("stopped"))
            .catch(() => setState("error"))
            .finally(() => {
              setIsSaving(false);
              sessionIdRef.current = null;
            });
        } else {
          setState("error");
        }
      };

      startedAtRef.current = Date.now();
      pausedAtRef.current = 0;
      totalPausedMsRef.current = 0;
      rec.start(1000); // 1-second chunks for maximum crash safety
      recorderRef.current = rec;
      setState("recording");
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Failed to start recorder");
      setState("error");
    }
  }, [
    stream,
    options?.encrypt,
    options?.pin,
    options?.gps,
    options?.category,
    options?.quality,
    options?.nightMode,
  ]);

  const stop = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      try {
        rec.stop();
      } catch {
        /* noop */
      }
    }
  }, []);

  const pause = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state === "recording") {
      try {
        rec.pause();
        pausedAtRef.current = Date.now();
        setState("paused");
      } catch {
        /* noop */
      }
    }
  }, []);

  const resume = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state === "paused") {
      try {
        rec.resume();
        if (pausedAtRef.current > 0) {
          totalPausedMsRef.current += Date.now() - pausedAtRef.current;
          pausedAtRef.current = 0;
        }
        setState("recording");
      } catch {
        /* noop */
      }
    }
  }, []);

  /** Dismiss a recoverable session without saving it. */
  const dismissRecovery = useCallback(async () => {
    if (recoverable) {
      try {
        await discardSession(recoverable.sessionId);
      } catch {
        /* noop */
      }
      setRecoverable(null);
    }
  }, [recoverable]);

  /** Recover a crashed session by finalizing it. */
  const recoverSession = useCallback(async () => {
    if (!recoverable) return;
    setIsSaving(true);
    try {
      const activeMs = Date.now() - recoverable.startedAt;
      await finalizeRecordingSession(recoverable.sessionId, activeMs, options?.pin);
      setRecoverable(null);
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Recovery failed");
    } finally {
      setIsSaving(false);
    }
  }, [recoverable, options?.pin]);

  useEffect(() => {
    return () => {
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") {
        try {
          rec.stop();
        } catch {
          /* noop */
        }
      }
    };
  }, []);

  return {
    state,
    start,
    stop,
    pause,
    resume,
    lastResult,
    error,
    isSaving,
    recoverable,
    dismissRecovery,
    recoverSession,
  };
}
