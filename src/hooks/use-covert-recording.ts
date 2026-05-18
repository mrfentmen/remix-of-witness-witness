import { useCallback, useEffect, useRef } from "react";
import { haptic } from "@/lib/haptics";

const TAPS_TO_START = 5;
const TAPS_TO_STOP = 3;
const TAP_WINDOW_MS = 1500;
const CORNER_PCT = 0.18;

interface CornerTapHandlers {
  onStart: () => void;
  onStop: () => void;
}

/**
 * Registers global tap listeners for covert capture: 5 taps in the top-left
 * corner start covert recording (single haptic), 3 taps in the top-right
 * corner stop and save (triple haptic). No visible UI is shown.
 */
export function useCovertCornerTaps({ onStart, onStop }: CornerTapHandlers) {
  const leftTapsRef = useRef<number[]>([]);
  const rightTapsRef = useRef<number[]>([]);

  const handler = useCallback(
    (e: PointerEvent | TouchEvent) => {
      let x = 0;
      let y = 0;
      if (e instanceof PointerEvent) {
        x = e.clientX;
        y = e.clientY;
      } else if (e.touches && e.touches[0]) {
        x = e.touches[0].clientX;
        y = e.touches[0].clientY;
      } else {
        return;
      }
      const w = window.innerWidth;
      const h = window.innerHeight;
      const inTop = y < h * CORNER_PCT;
      if (!inTop) return;
      const now = Date.now();
      if (x < w * CORNER_PCT) {
        const taps = leftTapsRef.current.filter((t) => now - t < TAP_WINDOW_MS);
        taps.push(now);
        leftTapsRef.current = taps;
        if (taps.length >= TAPS_TO_START) {
          leftTapsRef.current = [];
          haptic(40);
          onStart();
        }
      } else if (x > w * (1 - CORNER_PCT)) {
        const taps = rightTapsRef.current.filter((t) => now - t < TAP_WINDOW_MS);
        taps.push(now);
        rightTapsRef.current = taps;
        if (taps.length >= TAPS_TO_STOP) {
          rightTapsRef.current = [];
          haptic([30, 60, 30, 60, 30]);
          onStop();
        }
      }
    },
    [onStart, onStop],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fn = (e: Event) => handler(e as PointerEvent | TouchEvent);
    window.addEventListener("pointerdown", fn, true);
    return () => {
      window.removeEventListener("pointerdown", fn, true);
    };
  }, [handler]);
}
