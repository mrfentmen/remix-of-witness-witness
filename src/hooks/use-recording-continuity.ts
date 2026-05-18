import { useCallback, useRef, useState } from "react";
import type { ContinuityLog, ContinuitySegment } from "@/lib/witness-db";

/** Tracks pause/resume segments during a recording for tamper-evident continuity. */
export function useRecordingContinuity() {
  const startTsRef = useRef<number>(0);
  const segmentsRef = useRef<ContinuitySegment[]>([]);
  const [active, setActive] = useState(false);
  const [paused, setPaused] = useState(false);

  const start = useCallback(() => {
    startTsRef.current = Date.now();
    segmentsRef.current = [{ startTime: 0, endTime: 0 }];
    setActive(true);
    setPaused(false);
  }, []);

  const pause = useCallback(() => {
    if (!segmentsRef.current.length) return;
    const elapsed = Date.now() - startTsRef.current;
    const last = segmentsRef.current[segmentsRef.current.length - 1];
    last.endTime = elapsed;
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    const elapsed = Date.now() - startTsRef.current;
    segmentsRef.current.push({ startTime: elapsed, endTime: elapsed });
    setPaused(false);
  }, []);

  const stop = useCallback((): ContinuityLog | null => {
    if (!active) return null;
    const elapsed = Date.now() - startTsRef.current;
    const segs = segmentsRef.current.map((s) => ({ ...s }));
    const last = segs[segs.length - 1];
    if (last && last.endTime <= last.startTime) last.endTime = elapsed;
    const totalRecordedMs = segs.reduce((s, g) => s + (g.endTime - g.startTime), 0);
    setActive(false);
    setPaused(false);
    segmentsRef.current = [];
    return {
      segments: segs,
      totalRecordedMs,
      totalElapsedMs: elapsed,
      hasGaps: segs.length > 1,
    };
  }, [active]);

  return { active, paused, start, pause, resume, stop };
}
