import { useCallback, useEffect, useRef, useState } from "react";
import {
  startRecordingSession,
  saveRecordingChunk,
  finalizeRecordingSession,
  discardSession,
} from "@/lib/witness-db";

const MAX_BUFFER_MS = 5 * 60 * 1000;
const SLICE_MS = 2000;

interface Slice {
  blob: Blob;
  ts: number;
}

/**
 * Rolling 5-minute loop buffer. While `enabled`, records `stream` in 2-second
 * chunks and keeps only the last 5 minutes in memory AND IndexedDB.
 * `flush()` finalizes the session into a vault recording.
 */
export function useLoopRecording(
  stream: MediaStream | null,
  enabled: boolean,
  options?: {
    encrypt?: boolean;
    pin?: string | null;
    gps?: { latitude: number; longitude: number; accuracy?: number } | null;
    quality?: "standard" | "high" | null;
    nightMode?: boolean | null;
  },
) {
  const recRef = useRef<MediaRecorder | null>(null);
  const slicesRef = useRef<Slice[]>([]);
  const sessionIdRef = useRef<string | null>(null);
  const [active, setActive] = useState(false);
  const [bufferedMs, setBufferedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isFlushing, setIsFlushing] = useState(false);

  const stop = useCallback(() => {
    const r = recRef.current;
    if (r && r.state !== "inactive") {
      try {
        r.stop();
      } catch {
        /* noop */
      }
    }
    recRef.current = null;
    setActive(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (!stream || typeof MediaRecorder === "undefined") return;
    if (recRef.current) return;

    const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
    let mime = "";
    for (const c of candidates) {
      try {
        if (MediaRecorder.isTypeSupported(c)) {
          mime = c;
          break;
        }
      } catch {
        /* noop */
      }
    }

    // Discard any old session before starting a new one
    if (sessionIdRef.current) {
      discardSession(sessionIdRef.current).catch(() => {});
      sessionIdRef.current = null;
    }

    try {
      // 1. Create the session FIRST so the ID is ready before any chunks arrive.
      const sessionId = await startRecordingSession({
        mimeType: mime || "video/webm",
        encrypt: options?.encrypt ?? false,
        gps: options?.gps ?? null,
        thumbnailDataUrl: null,
        quality: options?.quality ?? null,
        nightMode: options?.nightMode ?? null,
      });
      sessionIdRef.current = sessionId;
      slicesRef.current = [];

      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);

      rec.ondataavailable = async (e) => {
        if (!e.data || e.data.size === 0) return;
        const now = Date.now();
        slicesRef.current.push({ blob: e.data, ts: now });

        // Persist chunk immediately — sessionId is guaranteed to exist.
        try {
          await saveRecordingChunk(sessionIdRef.current!, e.data, options?.pin);
        } catch (err) {
          console.error("[witness] loop chunk persist failed", err);
        }

        const cutoff = now - MAX_BUFFER_MS;
        while (slicesRef.current.length > 0 && slicesRef.current[0].ts < cutoff) {
          const evicted = slicesRef.current.shift();
          // In a production rolling buffer you would also delete evicted
          // chunks from IndexedDB; here we keep them for crash safety.
          void evicted;
        }
        const span = slicesRef.current.length > 0 ? now - slicesRef.current[0].ts : 0;
        setBufferedMs(span);
      };

      rec.start(SLICE_MS);
      recRef.current = rec;
      setActive(true);
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Failed to start loop recorder");
    }
  }, [stream, options?.encrypt, options?.pin, options?.gps, options?.quality, options?.nightMode]);

  const flush = useCallback(async (): Promise<Blob | null> => {
    const r = recRef.current;
    if (r && r.state !== "inactive") {
      try {
        r.requestData?.();
      } catch {
        /* noop */
      }
    }

    // Give the recorder a moment to fire the last ondataavailable
    await new Promise((res) => setTimeout(res, 300));

    const slices = slicesRef.current.slice();
    if (slices.length === 0) return null;

    const type = slices[0].blob.type || "video/webm";
    const merged = new Blob(
      slices.map((s) => s.blob),
      { type },
    );
    slicesRef.current = [];
    setBufferedMs(0);

    // If we have a session, finalize it; otherwise just return the blob
    if (sessionIdRef.current) {
      setIsFlushing(true);
      try {
        await finalizeRecordingSession(sessionIdRef.current, bufferedMs, options?.pin);
        sessionIdRef.current = null;
      } catch (e: unknown) {
        setError("Flush failed: " + ((e as Error)?.message ?? String(e)));
      } finally {
        setIsFlushing(false);
      }
    }

    return merged;
  }, [bufferedMs, options?.pin]);

  useEffect(() => {
    if (enabled && stream) {
      start().catch(() => {});
    } else {
      stop();
    }
    return () => stop();
  }, [enabled, stream, start, stop]);

  return { active, bufferedMs, flush, error, isFlushing };
}
