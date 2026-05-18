import { useEffect, useRef, useState } from "react";

export type SceneEvent =
  | { kind: "motion"; magnitude: number; ts: number }
  | { kind: "sound"; level: number; ts: number };

/**
 * Lightweight motion detector: samples the supplied <video> at ~5 Hz, diffs
 * downscaled luma, and reports motion events when the delta crosses a
 * threshold. Sound events come from `audioLevel` (0..100) crossing a
 * threshold. Returns the most recent event for UI hints.
 */
export function useSceneDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  audioLevel: number,
  enabled: boolean,
) {
  const [last, setLast] = useState<SceneEvent | null>(null);
  const prevRef = useRef<Uint8ClampedArray | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = 48;
    canvas.height = 27;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const id = window.setInterval(() => {
      try {
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const cur = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const prev = prevRef.current;
        if (prev && prev.length === cur.length) {
          let diff = 0;
          for (let i = 0; i < cur.length; i += 4) {
            diff += Math.abs(cur[i] - prev[i]);
          }
          const mag = diff / (cur.length / 4);
          if (mag > 18) {
            setLast({ kind: "motion", magnitude: Math.round(mag), ts: Date.now() });
          }
        }
        prevRef.current = new Uint8ClampedArray(cur);
      } catch {
        /* noop */
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [enabled, videoRef]);

  useEffect(() => {
    if (!enabled) return;
    if (audioLevel > 70) {
      setLast({ kind: "sound", level: audioLevel, ts: Date.now() });
    }
  }, [audioLevel, enabled]);

  return last;
}
