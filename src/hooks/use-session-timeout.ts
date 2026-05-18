// useSessionTimeout — auto-locks the vault after 10 minutes of inactivity.
import { useEffect, useRef, useCallback } from "react";

const INACTIVITY_MS = 10 * 60 * 1000; // 10 minutes

export function useSessionTimeout(onLock: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onLock();
    }, INACTIVITY_MS);
  }, [onLock]);

  useEffect(() => {
    const events = ["mousemove", "keydown", "touchstart", "click", "scroll"];
    for (const ev of events) window.addEventListener(ev, resetTimer, { passive: true });
    resetTimer();
    return () => {
      for (const ev of events) window.removeEventListener(ev, resetTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer]);
}
